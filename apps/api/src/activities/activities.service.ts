import { Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import type { Character, Prisma } from "@prisma/client";
import type { Actividad, AbilityKey, TraceStep, UsarActividadInput } from "@dnd/shared";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { CharacterSheetService } from "../characters/character-sheet.service";
import { RollRequestsService } from "../roll-requests/roll-requests.service";
import { EncountersService } from "../encounters/encounters.service";
import { ConditionsService } from "../character-state/conditions/conditions.service";
import { PrismaService } from "../prisma/prisma.service";
import { requireOwnerOrDM, requireVisibleCharacter } from "../common/character-viewer";
import { loVeLaMesa } from "../common/visibility";
import { resolverOrigen, type ContextoDeDerivacion } from "../rules/engine";
import { findClass, UnknownContentError } from "../rules/catalog";
import { rollExpression, type Roller } from "../dice/dice";
import { DICE_ROLLER } from "../rolls/rolls.service";

// Tarea A7 (paso 2) — pegamento, no mecánica. `usar()` conecta la actividad con las puertas que
// el proyecto ya tiene construidas y probadas: `CharacterResource` para los usos,
// `EncountersService.gastar` para la economía del turno, `RollRequestsService` para una
// salvación, `CharacterSheetService.changeHp` para el daño y la curación, y `resolverOrigen` para
// cualquier número. Ver `.superpowers/sdd/2026-09-06-tanda-paso2-y-botin/briefs/A7-brief.md` y
// `A7-report.md` para el porqué de cada decisión que no salía sola del brief.

/**
 * De dónde sale la actividad que se usa. **Todavía no hay catálogo** (eso es A9 y A11): este
 * servicio no lo construye, solo declara la puerta por la que entrará. `@Optional()` en el
 * constructor, igual que `ResourcesService` o `StatblocksService` en `CharacterSheetService`: sin
 * proveedor, cualquier clave es "no existe" — nunca una actividad inventada.
 */
export interface ActivityCatalog {
  find(key: string): Actividad | undefined;
}
export const ACTIVITY_CATALOG = "ACTIVITY_CATALOG";

/** Un paso de consumo ya aplicado, con lo que hace falta para escribir su `RESOURCE_SPENT`. */
interface PasoDeConsumo {
  key: string;
  label: string;
  amount: number;
  remaining: number;
}

/** El resultado de intentar consumir lo que la actividad declara en `consumption`. */
type ResultadoDeConsumo = { ok: true; pasos: PasoDeConsumo[] } | { ok: false; motivo: string };

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
    private readonly characterSheet: CharacterSheetService,
    private readonly rollRequests: RollRequestsService,
    private readonly encounters: EncountersService,
    private readonly conditions: ConditionsService,
    @Optional() @Inject(ACTIVITY_CATALOG) private readonly catalog?: ActivityCatalog,
    // Mismo patrón que `RollsService`, `CharacterSheetService` y `NpcsService`: inyectable solo
    // en pruebas, `undefined` en producción (cae al tirador real de `rollExpression`).
    @Optional() @Inject(DICE_ROLLER) private readonly roller?: Roller,
  ) {}

  /**
   * Usar una actividad: gasta lo que cuesta, aplica su efecto por las puertas que ya existen y
   * deja su suceso — todo en una sola transacción salvo la economía del turno
   * (`EncountersService.gastar`, doctrina de A2: nunca rechaza y abre su propia transacción, así
   * que no puede anidar con la de aquí).
   *
   * **Vuelta de arreglo 1 — `effects[]` SÍ entra en la transacción.** La primera versión los
   * dejaba fuera «porque `ConditionsService.apply` tiene sus propias reglas de inmunidad»: eso
   * seguía siendo verdad y no era motivo para dejar la condición sin aplicar. `ConditionsService`
   * ganó el mismo `tx?` aditivo que `changeHp` y `create` — no se reimplementa ninguna regla, se
   * llama a la misma puerta con el mismo cliente.
   *
   * **Orden de candados, para no interbloquear con `changeHp` — y esta vez con varios objetivos.**
   * Primero el `CharacterResource` de quien usa la actividad (una fila propia, nunca la de un
   * objetivo), y solo después los personajes objetivo del efecto — que es la fila que `changeHp`
   * bloquea con `FOR UPDATE`. **Los objetivos se recorren en un orden fijo (por `id`), no en el
   * orden que mandó el cliente**: sin este orden, dos peticiones concurrentes con los mismos dos
   * objetivos en orden inverso (`["X","Y"]` y `["Y","X"]`) tomarían esos candados cruzados —
   * interbloqueo de Postgres. `destinatariosOrdenados` es el único sitio que decide ese orden, y
   * lo usan tanto `dados` como `effects[]`.
   */
  async usar(
    userId: string,
    campaignId: string,
    characterId: string,
    actividadKey: string,
    opciones?: UsarActividadInput,
  ): Promise<{ aviso?: string; cd?: number; traza?: TraceStep[] }> {
    await this.membership.requireMember(campaignId, userId);

    // **404 si no se ve, 403 si se ve pero no es tuyo.** `requireVisibleCharacter` ya distingue
    // "no existe" de "existe pero no lo ves" con el mismo 404 en los dos casos (no se filtra por
    // respuesta cuáles personajes hay en la campaña); `requireOwnerOrDM` es el 403 real: el
    // personaje de OTRO jugador se ve en la mesa y no revienta esa distinción.
    const actor = await requireVisibleCharacter(
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
      actor,
      "Solo el dueño del personaje o el DM puede usar su actividad.",
    );

    const actividad = this.catalog?.find(actividadKey);
    if (!actividad) {
      throw new NotFoundException(`No existe la actividad "${actividadKey}" en el catálogo.`);
    }

    // Los objetivos se resuelven ANTES de escribir nada: un objetivo inválido no debe dejar el
    // recurso ya gastado. `canView` decide qué objetivos son legítimos — la misma puerta que
    // gobierna el resto de la aplicación, no una segunda regla de visibilidad para actividades.
    const objetivos: Character[] = [];
    for (const objetivoId of opciones?.objetivos ?? []) {
      objetivos.push(
        await requireVisibleCharacter(this.prisma, this.membership, userId, campaignId, objetivoId),
      );
    }
    const destinatarios = destinatariosOrdenados(objetivos, actor);

    const ctx = await this.contextoDeDerivacion(userId, campaignId, actor);
    const traza: TraceStep[] = [];
    let cd: number | undefined;
    let avisoEfecto: string | undefined;

    const resultado = await this.prisma.transaction(async (tx) => {
      const consumo = await this.consumir(tx, actor.id, actividad.consumption);
      if (!consumo.ok) {
        return { aviso: consumo.motivo, sinRecurso: true as const };
      }
      for (const paso of consumo.pasos) {
        await this.events.record(
          userId,
          campaignId,
          {
            subjectType: "character",
            subjectId: actor.id,
            visibility: actor.visibility,
            payload: {
              type: "RESOURCE_SPENT",
              key: paso.key,
              label: paso.label,
              amount: paso.amount,
              remaining: paso.remaining,
              reason: `Actividad: ${actividadKey}`,
            },
          },
          tx,
        );
      }

      // **I4 (vuelta de arreglo 1) — el nivel del espacio es el del recurso que se gastó de
      // verdad, nunca el que declaró el cliente.** La primera versión metía
      // `opciones.nivelDeEspacio` directamente en el contexto de derivación, así que un cliente
      // podía declarar nivel 9 y pagar un espacio de nivel 1 — Zod valida el rango (1 a 9), no
      // la verdad. `consumption` es fijo por actividad hoy (elegir QUÉ espacio pagar, cuando una
      // actividad ofrezca esa opción, es una tarea futura); lo que sí se corrige aquí es que la
      // fórmula nunca vea un nivel que nadie pagó.
      ctx.nivelDeEspacio = nivelDeEspacioConsumido(consumo.pasos);

      switch (actividad.tipo) {
        case "salvacion": {
          const resuelto = resolverOrigen(actividad.salvacion.cd, ctx);
          traza.push(resuelto.paso);
          cd = resuelto.valor;
          if (objetivos.length > 0) {
            await this.rollRequests.create(
              userId,
              campaignId,
              {
                characterIds: destinatarios.map((o) => o.id),
                key: `save.${actividad.salvacion.ability}`,
                label: `Salvación de ${actividad.salvacion.ability} — ${actividadKey}`,
                dc: resuelto.valor,
                mode: "NORMAL",
                audience: loVeLaMesa(actor.visibility) ? "PUBLIC" : "DM_PRIVATE",
              },
              tx,
            );
          }
          // **I5 (vuelta de arreglo 1).** Una salvación con `dados` promete daño o curación —
          // `siSalva` decide si la mitad o nada— y esta tarea NO lo aplica: hacerlo exige saber
          // quién salvó y quién no, y eso solo se sabe al RESPONDER la petición
          // (`RollRequestsService.answer`), que hoy no llama a nada de daño. Callarlo sería peor
          // que no aplicarlo: la mesa vería un `fireball` que no quema a nadie sin que nadie se
          // lo dijera. El aviso es la mitad de trabajo que sí le toca a esta tarea.
          if (actividad.dados) {
            avisoEfecto =
              "Esta salvación tiene daño o curación asociados que A7 NO aplica solo: repártelos " +
              "a mano al leer quién salvó (siSalva decide si es la mitad o nada). Aplicarlo solo, " +
              "al responder la petición, es tarea de quien construya esa pantalla.";
          }
          break;
        }
        case "dados": {
          const { total, pasos } = this.tirarDados(actividad.dados, ctx);
          traza.push(...pasos);
          const delta = actividad.dados.signo * total;
          for (const destino of destinatarios) {
            await this.characterSheet.changeHp(
              userId,
              campaignId,
              destino.id,
              {
                delta,
                reason: `Actividad: ${actividadKey}`,
                ...(delta < 0 && actividad.dados.tipoDeDano
                  ? { damageType: actividad.dados.tipoDeDano }
                  : {}),
              },
              tx,
            );
          }
          break;
        }
        case "ataque": {
          // **No se resuelve el impacto.** No hay en el proyecto una puerta de "tirada de ataque
          // contra la CA de un objetivo" desligada de un arma equipada (`rollAttack`/
          // `resolveAttack` operan sobre el cuadro de ataques del inventario, no sobre el bono de
          // una actividad). Inventar esa comparación aquí sería construir mecánica nueva, que
          // este encargo tiene prohibido. Se resuelve el bono y su traza; el acierto lo decide
          // quien juegue, con las herramientas que ya existen.
          const resuelto = resolverOrigen(actividad.ataque.bono, ctx);
          traza.push(resuelto.paso);
          break;
        }
        case "prueba": {
          if (actividad.prueba.cd) {
            const resuelto = resolverOrigen(actividad.prueba.cd, ctx);
            traza.push(resuelto.paso);
            cd = resuelto.valor;
          }
          break;
        }
        case "utilidad":
          // Nada mecánico propio: solo `effects[]`, que se aplica abajo para las cinco ramas por
          // igual — `utilidad` no es la única que puede dejar un efecto (una `salvacion` también
          // trae `effects` de la base).
          break;
      }

      // **`effects[]`, dentro de la MISMA transacción (vuelta de arreglo 1).** «Gasté el recurso
      // y la condición no se aplicó» es el estado a medias que esta tarea existe para impedir, y
      // es justo lo que A11 necesita: el bárbaro entra en furia y aparece su estado.
      //
      // **`concedidoPorActividad` solo se pasa cuando el destino es quien usa la actividad
      // (ronda de arreglo 1 de A11, crítico 2).** `raging` se volvió clave reservada para que
      // nadie se la escriba a sí mismo gratis por la puerta genérica de condiciones — y esta
      // puerta, la de usar una actividad de verdad, tiene que poder seguir dándosela a quien
      // gastó su acción adicional y su uso. Pero **nunca** a un objetivo distinto: una actividad
      // futura con `effects` y `objetivos` no puede convertirse en la vía por la que un jugador
      // le aplica una condición reservada a OTRO personaje sin que decida el DM — eso seguiría
      // siendo exactamente el agujero que esta clave existe para cerrar, solo que por esta otra
      // puerta. Hoy la única actividad con `effects` (la Furia) no declara `objetivos`, así que
      // `destinatariosOrdenados` siempre la deja en `[actor]` — pero la condición se escribe
      // explícita, no se confía en que siga siendo así.
      for (const efecto of actividad.effects) {
        for (const destino of destinatarios) {
          await this.conditions.apply(userId, campaignId, destino.id, efecto, tx, {
            concedidoPorActividad: destino.id === actor.id,
          });
        }
      }

      return { aviso: undefined, sinRecurso: false as const };
    });

    if (resultado.sinRecurso) {
      return { aviso: resultado.aviso };
    }

    // **Fuera de la transacción, a propósito.** La economía del turno nunca rechaza
    // (`EncountersService.gastar`, doctrina de la tarea A2) y abre su propia transacción — no
    // puede anidar con la de arriba. Fuera de combate no hay combatiente que marcar y no es un
    // error: se calla.
    await this.gastarActivacion(userId, campaignId, actor, actividad);

    return { aviso: avisoEfecto, cd, traza: traza.length > 0 ? traza : undefined };
  }

  /**
   * Comprueba y descuenta lo que la actividad consume, **en dos pasadas**: primero se comprueba
   * que TODO lo que pide está disponible, y solo entonces se descuenta. Con una sola pasada, una
   * actividad con dos consumos y el segundo sin usos dejaría el primero ya gastado sin que nadie
   * lo pidiera — el mismo defecto que la ficha de `ResourcesService.adjust` ya cerró para un
   * recurso suelto (I8, "gastar lo que no tienes es un 409, no un silencio"), aquí aplicado a una
   * lista.
   *
   * **No pasa por `ResourcesService`**: sus métodos abren su propia transacción y comprueban
   * pertenencia sobre el USUARIO que gasta, no sobre "el personaje que usa la actividad" cuando
   * ese personaje ya se autorizó más arriba. Se toca `CharacterResource` directamente, con el
   * mismo `tx`, y se escribe el mismo `RESOURCE_SPENT` que ya usa esa puerta — la forma del
   * suceso no se reinventa, solo se abre para escribirla desde aquí.
   */
  private async consumir(
    tx: Prisma.TransactionClient,
    actorId: string,
    consumo: Actividad["consumption"],
  ): Promise<ResultadoDeConsumo> {
    if (consumo.length === 0) return { ok: true, pasos: [] };

    const filas: { id: string; label: string; current: number }[] = [];
    for (const item of consumo) {
      // **La fila se BLOQUEA, no solo se lee** (ficha P2-6). Con `findUnique`, dos usos
      // simultáneos de la misma actividad leían el mismo `current` y los dos escribían el mismo
      // número: un descuento perdido y una furia gratis. Es el mismo candado que `changeHp` toma
      // sobre `Character` a un metro de distancia y en este mismo flujo
      // (`character-sheet.service.ts`), aplicado aquí a `CharacterResource`.
      //
      // **Se toma en el mismo orden en que viene `consumption`**, que es orden de datos y no de
      // reloj: dos usos de la MISMA actividad piden los mismos recursos en la misma secuencia,
      // así que no hay dos caminos que puedan cruzarse.
      const bloqueadas = await tx.$queryRaw<
        { id: string; label: string; current: number }[]
      >`SELECT id, label, current FROM "CharacterResource" WHERE "characterId" = ${actorId} AND key = ${item.recurso} FOR UPDATE`;
      const recurso = bloqueadas[0];
      if (!recurso || recurso.current < item.cantidad) {
        return {
          ok: false,
          motivo: `Sin usos de «${recurso?.label ?? item.recurso}» que gastar.`,
        };
      }
      filas.push(recurso);
    }

    const pasos: PasoDeConsumo[] = [];
    for (const [i, item] of consumo.entries()) {
      const fila = filas[i];
      const remaining = fila.current - item.cantidad;
      await tx.characterResource.update({ where: { id: fila.id }, data: { current: remaining } });
      pasos.push({ key: item.recurso, label: fila.label, amount: item.cantidad, remaining });
    }
    return { ok: true, pasos };
  }

  /** Una expresión de dados, tirada: el total y los pasos de traza que lo explican. */
  private tirarDados(
    expresion: Extract<Actividad, { tipo: "dados" }>["dados"],
    ctx: ContextoDeDerivacion,
  ): { total: number; pasos: TraceStep[] } {
    const pasos: TraceStep[] = [];
    let total = 0;
    if (expresion.n !== undefined && expresion.caras !== undefined) {
      const tirada = rollExpression(`${expresion.n}d${expresion.caras}`, this.roller);
      total += tirada.total;
      pasos.push({
        op: "base",
        amount: tirada.total,
        sourceType: "base",
        sourceKey: "dice",
        labelKey: "activity.diceRolled",
      });
    }
    if (expresion.bonus) {
      const resuelto = resolverOrigen(expresion.bonus, ctx);
      total += resuelto.valor;
      pasos.push(resuelto.paso);
    }
    return { total, pasos };
  }

  /**
   * El contexto que `resolverOrigen` necesita, construido desde la fila del personaje que usa la
   * actividad. **Las puntuaciones ausentes entran como `NaN`** en vez de rellenarse con un valor
   * inventado: `resolverOrigen` ya lanza si un origen las necesita y no las encuentra
   * (`Number.isFinite` las rechaza), que es la misma guarda del motor y no una nueva.
   *
   * `cdDeConjuro` solo se deriva si la clase lanza — y solo entonces, porque pedir la hoja
   * derivada cuesta una consulta que la mayoría de actividades no necesita.
   *
   * **`nivelDeEspacio` NO se rellena aquí (I4, vuelta de arreglo 1).** Antes venía de
   * `opciones.nivelDeEspacio`, sin comprobar nada — un cliente podía declarar el nivel que
   * quisiera sin relación con lo que pagó. Se deriva más tarde, dentro de la transacción, de lo
   * que `consumir()` gastó de verdad (`nivelDeEspacioConsumido`).
   */
  private async contextoDeDerivacion(
    userId: string,
    campaignId: string,
    actor: Character,
  ): Promise<ContextoDeDerivacion> {
    const claves = ["str", "dex", "con", "int", "wis", "cha"] as const;
    const abilities = {} as Record<AbilityKey, number>;
    for (const clave of claves) abilities[clave] = actor[clave] ?? NaN;

    let spellcastingAbility: AbilityKey | undefined;
    if (actor.classKey) {
      try {
        spellcastingAbility = findClass({ source: "SRD", key: actor.classKey }).spellcastingAbility;
      } catch (error) {
        // Una clase que el catálogo ya no reconoce es un dato caduco, no un motivo para reventar
        // "usar": se deriva sin característica de lanzamiento, igual que hace el resto de la
        // aplicación con contenido caduco.
        if (!(error instanceof UnknownContentError)) throw error;
      }
    }

    let cdDeConjuro: number | undefined;
    if (spellcastingAbility) {
      const hoja = await this.characterSheet.getSheet(userId, campaignId, actor.id);
      cdDeConjuro = hoja.sheet?.derived.spellSaveDc?.total;
    }

    return {
      abilities,
      level: actor.level,
      spellcastingAbility,
      cdDeConjuro,
      // Las tablas de escala las llena la tarea A10; hasta entonces, un `Origen` de tipo
      // `escala` lanza con su propio mensaje — no se inventa aquí una tabla vacía que parezca
      // una respuesta.
      escalas: new Map(),
    };
  }

  /**
   * La economía del turno, si la actividad la gasta. **Nunca revienta fuera de combate**: sin
   * combatiente activo no hay nada que marcar, y eso no es un error — es la mesa jugando fuera de
   * un encuentro. Con combatiente, la puerta de siempre (`EncountersService.gastar`) decide y
   * avisa; nunca rechaza.
   *
   * Una `activation` por tiempo (minuto/hora, un ritual) no toca la economía del turno: no hay
   * `coste` que gastar, así que esta función no hace nada con ella.
   */
  private async gastarActivacion(
    userId: string,
    campaignId: string,
    actor: Character,
    actividad: Actividad,
  ): Promise<void> {
    if (!("coste" in actividad.activation)) return;

    const combatiente = await this.prisma.combatant.findFirst({
      where: { characterId: actor.id, encounter: { status: "ACTIVE", session: { campaignId } } },
      select: { id: true, encounterId: true, encounter: { select: { sessionId: true } } },
    });
    if (!combatiente) return;

    await this.encounters.gastar(
      userId,
      campaignId,
      combatiente.encounter.sessionId,
      combatiente.encounterId,
      combatiente.id,
      { coste: actividad.activation.coste },
    );
  }
}

/**
 * **I1 (vuelta de arreglo 1) — el único sitio que decide en qué orden se recorren los objetivos.**
 * Sin objetivos, el destinatario es quien usa la actividad. Con objetivos, se ordenan por `id` —
 * un orden fijo, no el que mandó el cliente — para que dos peticiones concurrentes con los mismos
 * dos personajes en orden inverso tomen los candados de `changeHp` (`FOR UPDATE` sobre
 * `Character`) en el MISMO orden. Sin esto, `["X","Y"]` y `["Y","X"]` se cruzan: interbloqueo de
 * Postgres, no solo una carrera.
 */
function destinatariosOrdenados(objetivos: Character[], actor: Character): Character[] {
  const base = objetivos.length > 0 ? objetivos : [actor];
  return [...base].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * **I4 (vuelta de arreglo 1) — el nivel del espacio es el del recurso que se gastó, no lo que
 * declaró el cliente.** Busca entre lo que `consumir()` acaba de descontar de verdad una clave
 * `spell-slot-N` y devuelve `N`. Sin coincidencia, `undefined`: la actividad no gastó un espacio
 * de conjuro, así que no hay nivel de espacio que contar — un cero o un valor inventado sería el
 * mismo fallo de `simplifyBonus` que el resto del proyecto evita.
 */
function nivelDeEspacioConsumido(pasos: PasoDeConsumo[]): number | undefined {
  for (const paso of pasos) {
    const coincide = /^spell-slot-(\d+)$/.exec(paso.key);
    if (coincide) return Number(coincide[1]);
  }
  return undefined;
}
