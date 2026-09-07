import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { SEGUNDOS_POR_DIA, SEGUNDOS_POR_HORA, type DeclareRestInput } from "@dnd/shared";
import { condicionVencida } from "../conditions/vencimiento";
import type { Character, CharacterResource, Prisma } from "@prisma/client";
import { MembershipService } from "../../campaigns/membership.service";
import { rollExpression } from "../../dice/dice";
import { GameClockService } from "../../game-clock/game-clock.service";
import { GameEventsService } from "../../game-events/game-events.service";
import { PrismaService } from "../../prisma/prisma.service";
import { abilityModifier } from "../../rules/engine";
import { maxHpDe } from "../common/max-hp";
import { MARCADOR_DE_USOS_SIN_TOPE } from "../resources/resources.service";
import { requireOwnerOrDM, requireVisibleCharacter } from "../../common/character-viewer";

// Tarea 2A.8 — descansos. Ampliada en 2C.3 con las tres reglas que el reloj hace comprobables.
//
// **Corto y largo no son el mismo botón con distinto nombre.** El corto repone lo marcado
// `SHORT_REST` y permite gastar dados de golpe; el largo repone TODO lo consumible (lo del
// corto incluido —el descanso largo nunca deja peor a alguien que el corto—), devuelve los PG
// al máximo, recupera la MITAD de los dados de golpe (no todos, que es el error clásico) y
// baja un nivel de agotamiento.
//
// ## Las tres reglas que faltaban, y por qué no podían existir antes (2C.3)
//
// Las tres salen del SRD (<https://5thsrd.org/adventuring/resting/>) y **las tres necesitan un
// reloj**: sin tiempo de juego, «una vez cada 24 horas» no se puede comprobar contra nada.
//
//  1. **Un solo descanso largo por cada 24 horas.** «A character can't benefit from more than one
//     long rest in a 24-hour period.» Hasta 2C se podía descansar largo tres veces seguidas y
//     curarse entero cada vez — la mesa lo sabía y por eso no usaba el botón.
//  2. **Hay que empezarlo con al menos 1 PG.** «A character must have at least 1 hit point at the
//     start of the rest to gain its benefits.» Un personaje a 0 no descansa: se está muriendo.
//  3. **Si se interrumpe, hay que empezar otra vez** y **no da nada**. La interrupción no la
//     detecta el sistema —no sabe si os atacaron—, así que la declara el DM.

const CLAVE_DADOS_DE_GOLPE = /^hit-dice-d(\d+)$/;

@Injectable()
export class RestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
    private readonly clock: GameClockService,
  ) {}

  async declare(userId: string, campaignId: string, characterId: string, input: DeclareRestInput) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    await requireOwnerOrDM(
      this.membership,
      campaignId,
      userId,
      character,
      "Solo el DM o el dueño puede declarar un descanso.",
    );

    return this.prisma.transaction(async (tx) => {
      const recursos = await tx.characterResource.findMany({ where: { characterId } });

      if (input.kind === "LONG") {
        // **La comprobación de las 24 h va ANTES de avanzar**, porque pregunta cuándo fue el
        // último descanso, no cuándo termina este.
        await this.comprobarDescansoLargo(tx, character, campaignId, input);
      }

      // **Un descanso avanza el reloj de campaña: largo 8 h, corto 1 h** (D-A-1, decisión del
      // autor del 2026-09-06, declarada en `docs/04-convenciones.md`).
      //
      // Hasta hoy este servicio **leía** el reloj y no lo movía nunca, y su propio 409 mandaba
      // «avanza el reloj de la campaña» a mano: ocho horas de descanso no caducaban nada, y la
      // regla de un descanso largo por 24 h bloqueaba de más hasta que el DM lo hiciera. Ahora se
      // cumple sola —tres descansos largos suman las 24 h—, y todo lo que caduca por reloj
      // —condiciones, modificadores temporales— caduca al descansar, que es lo que se quería.
      //
      // Va **dentro de esta misma transacción**, como hace `advanceTurn`: si el descanso se
      // deshace, las ocho horas se van con él.
      await this.clock.avanzar(
        userId,
        campaignId,
        {
          kind: "TIME",
          seconds: input.kind === "LONG" ? 8 * SEGUNDOS_POR_HORA : SEGUNDOS_POR_HORA,
          reason: input.kind === "LONG" ? "Descanso largo" : "Descanso corto",
        },
        tx,
      );

      if (input.kind === "SHORT") {
        await this.reponerPorTipo(tx, recursos, "SHORT_REST");
        if (input.spendHitDice) {
          await this.gastarDadosDeGolpe(tx, character, recursos, input.spendHitDice);
        }
      } else if (input.interrupted) {
        // **Interrumpido: no repone nada.** «The characters must begin the rest again to gain any
        // benefit from it» — no hay medio descanso largo. Queda escrito en la línea de tiempo para
        // que nadie tenga que acordarse de que aquella noche no contó.
      } else {
        // Todo lo del corto, y además lo que solo repone el largo.
        await this.reponerPorTipo(tx, recursos, "SHORT_REST");
        await this.reponerPorTipo(tx, recursos, "LONG_REST");
        // `null` = a PG máximos, la misma convención que ya usa la columna
        // (`schema.prisma`, comentario de `Character.currentHp`): no hace falta calcular el
        // máximo real —eso pertenece a la derivación completa de la hoja, fuera de esta
        // frontera— para saber que "al máximo" es "sin materializar".
        // **Y se borran las salvaciones de muerte.** Un descanso largo devuelve los PG al
        // máximo, así que arrastrar fracasos de una caída anterior mataría a alguien por algo
        // que ya sobrevivió. Es la misma regla que aplica `changeHp` al curar desde 0, y estaba
        // igual de ausente en los dos caminos.
        await tx.character.update({
          where: { id: characterId },
          data: { currentHp: null, deathSaveSuccesses: 0, deathSaveFailures: 0 },
        });
        await this.recuperarMitadDadosDeGolpe(tx, recursos);
        await this.bajarAgotamiento(tx, characterId, campaignId);
        // **La marca del descanso largo va con el reloj de la campaña**, no con la hora del
        // servidor: lo que la regla cuenta son 24 horas *de juego*. Con `Date.now()`, una sesión
        // de cuatro horas reales que cubre tres días de viaje habría bloqueado dos descansos que
        // el juego permite, y una mesa que juega una vez al mes no habría bloqueado ninguno.
        const campana = await tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });
        await tx.character.update({
          where: { id: characterId },
          data: { lastLongRestClock: campana.clockSeconds },
        });
      }

      await this.events.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          subjectId: characterId,
          visibility: character.visibility,
          // El esquema de `REST_DECLARED` no lleva `reason` —a diferencia de casi todo lo
          // demás en `game-event.schema.ts`—, así que no se manda: mandarlo se quedaría
          // callado (Zod recorta lo que no reconoce) y sería un campo que parece guardarse y
          // no se guarda.
          payload: {
            type: "REST_DECLARED",
            rest: input.kind,
            ...(input.interrupted ? { interrupted: true } : {}),
          },
        },
        tx,
      );

      return tx.character.findFirstOrThrow({ where: { id: characterId } });
    });
  }

  /**
   * Las dos condiciones de un descanso largo, comprobadas **antes** de reponer nada.
   *
   * Un descanso interrumpido no las necesita: no da beneficios, así que ni consume el descanso del
   * día ni exige estar en pie. Es exactamente lo que dice la regla — lo que la regla limita es
   * *beneficiarse* de un descanso largo, no tumbarse.
   */
  private async comprobarDescansoLargo(
    tx: Prisma.TransactionClient,
    character: Character,
    campaignId: string,
    input: DeclareRestInput,
  ) {
    if (input.interrupted) return;

    // `currentHp === null` es «a PG máximos» por convención de la columna, así que está vivo.
    if (character.currentHp !== null && character.currentHp < 1) {
      throw new BadRequestException(
        "Hay que empezar un descanso largo con al menos 1 punto de golpe: a 0 no se descansa, se está muriendo.",
      );
    }

    const campana = await tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });
    const ultimo = character.lastLongRestClock;
    if (ultimo !== null && campana.clockSeconds - ultimo < SEGUNDOS_POR_DIA) {
      const horas = Math.floor((SEGUNDOS_POR_DIA - (campana.clockSeconds - ultimo)) / 3600);
      throw new ConflictException(
        `Solo se puede aprovechar un descanso largo cada 24 horas de juego. Faltan ${horas} h; avanza el reloj de la campaña o declara un descanso corto.`,
      );
    }
  }

  private async reponerPorTipo(
    tx: Prisma.TransactionClient,
    recursos: CharacterResource[],
    resetOn: "SHORT_REST" | "LONG_REST",
  ) {
    for (const recurso of recursos) {
      if (recurso.resetOn !== resetOn) continue;
      // **`max === null` se mira ANTES que `current`** (ficha A11-usos-sin-tope). «Sin tope» no es
      // «no lo repongas nunca», que es lo que este método hacía: exigía `max !== null` para tocar
      // la fila, así que la Furia de un bárbaro de nivel 20 —*Unlimited* en el SRD, `max: null` al
      // sembrarla— no se reponía en ningún descanso por mucho que su `resetOn` dijera
      // `LONG_REST`. Un recurso sin tope se repone al marcador, que es lo que este proyecto usa
      // como «no se te van a acabar» mientras `current` sea un `Int` de Postgres (ver
      // `MARCADOR_DE_USOS_SIN_TOPE` y su nota, en `resources.service.ts`).
      const lleno = recurso.max ?? MARCADOR_DE_USOS_SIN_TOPE;
      if (recurso.current !== lleno) {
        await tx.characterResource.update({
          where: { id: recurso.id },
          data: { current: lleno },
        });
      }
    }
  }

  /**
   * Descanso corto: se gastan hasta `cantidadPedida` dados de golpe (nunca más de los que
   * quedan) y se cura la suma de tirarlos más el modificador de Constitución **por dado**.
   */
  private async gastarDadosDeGolpe(
    tx: Prisma.TransactionClient,
    character: Character,
    recursos: CharacterResource[],
    cantidadPedida: number,
  ) {
    const dado = recursos.find((r) => CLAVE_DADOS_DE_GOLPE.test(r.key));
    if (!dado) return; // sin dados de golpe modelados (ficha sin clase), no hay nada que gastar
    const cantidad = Math.min(cantidadPedida, dado.current);
    if (cantidad <= 0) return;

    const caras = Number(CLAVE_DADOS_DE_GOLPE.exec(dado.key)![1]);
    const modCon = abilityModifier(character.con ?? 10);

    // **El mínimo de cero es POR DADO, no por descanso.** El SRD: «for each Hit Die spent in this
    // way, the player rolls the die and adds the character's Constitution modifier to it. The
    // character regains hit points equal to the total **(minimum of 0)**»
    // (<https://5thsrd.org/adventuring/resting/>). Con Constitución 5 —modificador −3— y dos dados
    // de 1 y 8, la regla da 0 + 5 = 5; sumarlo todo y recortar al final daba 3. Lo cazó una
    // revisión contra la fuente; solo aparece con modificador negativo, y por eso nadie lo había
    // visto.
    let curado = 0;
    for (let i = 0; i < cantidad; i++) {
      curado += Math.max(0, rollExpression(`1d${caras}`).total + modCon);
    }

    await tx.characterResource.update({
      where: { id: dado.id },
      data: { current: dado.current - cantidad },
    });

    // Si `currentHp` es `null` (ya al máximo, por convención) la curación no tiene dónde ir:
    // es exactamente lo que pasa en la mesa cuando alguien se cura de sobra.
    if (character.currentHp !== null) {
      // **Y se topa contra los PG máximos.** La primera versión sumaba sin tope, así que dos
      // dados de golpe con suerte dejaban al personaje por encima de su máximo — un número que
      // en la mesa se nota enseguida y que nada más habría corregido, porque el máximo no se
      // guarda: se calcula. El tope se aplica **al escribir una curación**, que no contradice
      // la regla de «recortar al leer, nunca al recalcular»: esa regla existe para que subir de
      // nivel o bajar la Constitución no reescriba filas por debajo, no para dejar que una
      // curación invente puntos que el personaje no tiene.
      // **Con el agotamiento puesto** (2C.4): curar hasta un máximo que la regla parte por la
      // mitad es la misma clase de mentira que enseñarlo en la hoja.
      const [condiciones, campana] = await Promise.all([
        tx.characterCondition.findMany({
          where: { characterId: character.id },
          select: { key: true, level: true, expiresAtClock: true, expiryEdge: true },
        }),
        tx.campaign.findUniqueOrThrow({ where: { id: character.campaignId } }),
      ]);
      const maximo = maxHpDe(character, {
        conditions: condiciones,
        clockSeconds: campana.clockSeconds,
      });
      const nuevo =
        maximo === null
          ? character.currentHp + curado
          : Math.min(maximo, character.currentHp + curado);
      await tx.character.update({
        where: { id: character.id },
        data: { currentHp: nuevo },
      });
    }
  }

  /**
   * Descanso largo: **la mitad de los dados de golpe, redondeando hacia ABAJO, mínimo uno.**
   * "Todos" es el error clásico que esta cuenta existe para no cometer.
   *
   * **Redondeaba hacia arriba, y era una regla mal implementada** que una revisión contra la
   * fuente cazó. El SRD dice «up to a number of dice equal to **half of** the character's total
   * number of them (minimum of one die)» (<https://5thsrd.org/adventuring/resting/>), y la regla
   * general de la 5.ª edición es que **al dividir se redondea hacia abajo**, incluso con un medio
   * exacto. Nivel 5 devuelve **2** dados, no 3.
   *
   * Y la propia cláusula del «mínimo de uno» lo demuestra: con redondeo hacia arriba, un personaje
   * de nivel 1 ya daría 1 sin necesidad de mínimo, y la cláusula sobraría.
   *
   * **La prueba anterior consagraba el error** —se llamaba «MUTACIÓN CLAVE» y afirmaba «2,5 → 3
   * hacia arriba»—, así que se corrigió con ella. Tres carpetas más allá, `agotamiento.ts` ya
   * redondeaba hacia abajo por esta misma regla: las dos mitades del sistema redondeaban distinto.
   */
  private async recuperarMitadDadosDeGolpe(
    tx: Prisma.TransactionClient,
    recursos: CharacterResource[],
  ) {
    for (const recurso of recursos) {
      if (!CLAVE_DADOS_DE_GOLPE.test(recurso.key) || recurso.max === null) continue;
      const recuperados = Math.max(1, Math.floor(recurso.max / 2));
      const nuevo = Math.min(recurso.max, recurso.current + recuperados);
      if (nuevo !== recurso.current) {
        await tx.characterResource.update({ where: { id: recurso.id }, data: { current: nuevo } });
      }
    }
  }

  /**
   * Un nivel de agotamiento menos. En el nivel 1, el descanso lo quita del todo.
   *
   * **Y no baja un agotamiento que ya venció**: desde 2C.4 una condición con hora puede estar
   * caducada, y todo lo que deriva de una condición pasa por `condicionesActivas`. Este camino se
   * quedó fuera, así que un descanso largo «gastaba» un nivel de algo que ya no se aplicaba. Lo
   * cazó una revisión.
   */
  private async bajarAgotamiento(
    tx: Prisma.TransactionClient,
    characterId: string,
    campaignId: string,
  ) {
    const condicion = await tx.characterCondition.findUnique({
      where: { characterId_key: { characterId, key: "exhaustion" } },
    });
    if (!condicion || condicion.level === null) return;
    const campana = await tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });
    if (condicionVencida(condicion, campana.clockSeconds)) return;
    if (condicion.level <= 1) {
      await tx.characterCondition.delete({ where: { id: condicion.id } });
    } else {
      await tx.characterCondition.update({
        where: { id: condicion.id },
        data: { level: condicion.level - 1 },
      });
    }
  }
}
