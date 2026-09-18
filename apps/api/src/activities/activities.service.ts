import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import type { Character, Prisma } from "@prisma/client";
import type {
  Actividad,
  AbilityKey,
  AttackVerdict,
  PendingSaveEffect,
  SrdSpell,
  TraceStep,
  UsarActividadInput,
} from "@dnd/shared";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { CharacterSheetService } from "../characters/character-sheet.service";
import { RollRequestsService } from "../roll-requests/roll-requests.service";
import { EncountersService } from "../encounters/encounters.service";
import { gastarSiEnCombate } from "../encounters/gastar-si-en-combate";
import { ConditionsService } from "../character-state/conditions/conditions.service";
import { TemporaryModifiersService } from "../character-state/temporary-modifiers/temporary-modifiers.service";
import { CONCENTRATION_KEY_PREFIX } from "../character-state/concentration/concentration";
import { SpellbookService } from "../spellbook/spellbook.service";
import { RollsService } from "../rolls/rolls.service";
import { PrismaService } from "../prisma/prisma.service";
import { requireOwnerOrDM, requireVisibleCharacter } from "../common/character-viewer";
import { loVeLaMesa } from "../common/visibility";
import { resolverOrigen, tablaDeEscalas, type ContextoDeDerivacion } from "../rules/engine";
import {
  consumoDeEspacio,
  dadosEscalados,
  ENCANTAMIENTOS,
  findClass,
  segundosDeDuracion,
  UnknownContentError,
} from "../rules/catalog";
import { rollExpression, type DiceRollResult, type Roller } from "../dice/dice";
import { DICE_ROLLER } from "../rolls/rolls.service";
import { parsearClaveDeActividad } from "../rules/catalog/spell-activities";

// Tarea A7 (paso 2) — pegamento, no mecánica. `usar()` conecta la actividad con las puertas que
// el proyecto ya tiene construidas y probadas: `CharacterResource` para los usos,
// `EncountersService.gastar` para la economía del turno, `RollRequestsService` para una
// salvación, `CharacterSheetService.changeHp` para el daño y la curación, y `resolverOrigen` para
// cualquier número. Ver `.superpowers/sdd/2026-09-06-tanda-paso2-y-botin/briefs/A7-brief.md` y
// `A7-report.md` para el porqué de cada decisión que no salía sola del brief.

/**
 * Task 4 (3A.2) — lo que el catálogo devuelve por una clave, ya con lo que `usar()` necesita para
 * escribir `ACTIVITY_USED` sin volver a mirar de dónde salió la actividad: `name` (el nombre del
 * conjuro o del rasgo, en español si lo hay) y `kind` (`"SPELL"` o `"FEATURE"`). `spell` solo
 * viaja con `kind: "SPELL"` — es el conjuro entero, porque `usar()` necesita su `level` para
 * `consumoDeEspacio`/`dadosEscalados` y no solo su actividad de lanzamiento.
 */
export interface ActividadCatalogada {
  actividad: Actividad;
  name: string;
  kind: "SPELL" | "FEATURE";
  spell?: SrdSpell;
}

/**
 * De dónde sale la actividad que se usa. `@Optional()` en el constructor, igual que
 * `ResourcesService` o `StatblocksService` en `CharacterSheetService`: sin proveedor, cualquier
 * clave es "no existe" — nunca una actividad inventada.
 */
export interface ActivityCatalog {
  find(key: string): ActividadCatalogada | undefined;
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
    private readonly temporaryModifiers: TemporaryModifiersService,
    private readonly spellbook: SpellbookService,
    private readonly rolls: RollsService,
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
   *
   * **Puerta de efectos (spec 2026-09-13, §3) — `changeHpFromEffect` y `createFromEffect` la
   * aceptan sin repetir la suya.** Aquí arriba ya se comprobó `canView` sobre cada objetivo
   * (`requireVisibleCharacter`) y `requireOwnerOrDM` sobre el actor: eso ES la autorización de
   * este efecto, y las dos puertas de abajo no la vuelven a pedir — antes llamaban a `create` y
   * `changeHp`, que sí la piden, y con eso un clérigo no podía curar a otro jugador (`create`
   * exige DM y `changeHp` exige dueño-o-DM sobre el objetivo). Las dos puertas nuevas son
   * privadas por transacción: exigen `tx` y ningún controlador las importa.
   */
  async usar(
    userId: string,
    campaignId: string,
    characterId: string,
    actividadKey: string,
    opciones?: UsarActividadInput,
  ): Promise<{
    aviso?: string;
    cd?: number;
    traza?: TraceStep[];
    rollEventIds?: string[];
    fueraDeRegla?: Array<"SIN_ESPACIO" | "NO_PREPARADO">;
    // Task 5 (3A.2) — solo lo trae un `ataque` con exactamente un objetivo: el veredicto de
    // `resolverAtaqueContraCa` (`resolveAttack`, la misma mecánica, comparte esta palabra).
    verdict?: AttackVerdict;
  }> {
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

    // Ola de arreglos de 3A.2 (I-5) — `spell:<key>@N` con N > 0 es una actividad SECUNDARIA del
    // conjuro (el segundo rayo de `scorching-ray`, el derrumbe de `earthquake`), y hoy entraría por
    // el camino completo de lanzar: volvería a gastar un espacio, exigiría `lanzable` y escribiría
    // otro `ACTIVITY_USED` con `spellLevel`. Además `@0` y «sin sufijo» son la MISMA clave
    // (`claveDeConjuro`), así que la actividad real en la posición 0 del catálogo es inalcanzable
    // cuando no es la de lanzar (`hunters-mark`). Hasta que 3B decida qué significa `@N` —índice
    // de catálogo, o índice entre las que no son la de lanzar—, se rechaza con 400: es más honesto
    // que gastar un espacio por una actividad gratuita. La web solo manda `spell:<key>`.
    const claveParseada = parsearClaveDeActividad(actividadKey);
    if (claveParseada.tipo === "spell" && claveParseada.indice > 0) {
      throw new BadRequestException(
        "Las actividades secundarias de un conjuro (spell:<clave>@N) llegan en 3B.",
      );
    }

    const catalogado = this.catalog?.find(actividadKey);
    if (!catalogado) {
      throw new NotFoundException(`No existe la actividad "${actividadKey}" en el catálogo.`);
    }
    const { actividad, kind } = catalogado;
    const esSpell = kind === "SPELL";
    const spell = catalogado.spell;
    // T15 (3A.2) — *Arma mágica*, hoy el único (D-CF-130). No es un `actividad.tipo` más: es un
    // conjuro cuya actividad de lanzamiento es una `utilidad` SINTÉTICA
    // (`actividadDeLanzamiento`, `rules/catalog/spell-activities.ts`) porque el catálogo no le
    // trae ninguna propia — `usar()` necesita saber que ES este conjuro para tomar el `caso
    // "encantar"` de más abajo en vez del `utilidad` genérico (que no hace nada).
    const esEncantamiento = esSpell && spell!.key in ENCANTAMIENTOS;

    // Task 4 (3A.2) — el libro de conjuros decide si esto se puede lanzar. `NO_ES_SUYO` (no está
    // ni preparado ni conocido: no es de la lista de este personaje) es un 400 que rechaza del
    // todo; `NO_PREPARADO` (está en el libro del mago, pero sin preparar hoy) se lanza igual —
    // el DM decide qué hacer con la mesa fuera de regla, no el servidor.
    const fueraDeRegla: Array<"SIN_ESPACIO" | "NO_PREPARADO"> = [];
    if (esSpell) {
      const veredicto = await this.spellbook.lanzable(this.prisma, actor.id, spell!.key);
      if (!veredicto.ok) {
        if (veredicto.motivo === "NO_ES_SUYO") {
          throw new BadRequestException(`${catalogado.name} no es de este personaje.`);
        }
        fueraDeRegla.push("NO_PREPARADO");
      }
    }

    // Los objetivos se resuelven ANTES de escribir nada: un objetivo inválido no debe dejar el
    // recurso ya gastado. `canView` decide qué objetivos son legítimos — la misma puerta que
    // gobierna el resto de la aplicación, no una segunda regla de visibilidad para actividades.
    //
    // Task 5 (3A.2) — un `ataque` (un conjuro o una aptitud con `attack.spell`, como `fire-bolt`)
    // apunta con OTRO criterio: `sePuedeApuntar` (D-OP-11), el mismo que ya usa `resolveAttack`
    // para un arma — `canView` **o** ser combatiente del encuentro activo. Con solo `canView` (la
    // rama de abajo, la de siempre), un mago no podría lanzarlo contra el PNJ `DM_ONLY` que el DM
    // acaba de bajar a la mesa, aunque el arma de al lado sí pudiera. Y solo admite UN objetivo:
    // «ataco a X con mi rayo de fuego» no tiene la forma de «tres aliados suman 1d4», así que
    // pedir más de uno es un 400, no un ataque que se calla a los sobrantes.
    const objetivos: Character[] = [];
    // T15 (3A.2) — el objeto sobre el que actuar, para el `caso "encantar"` de más abajo. Se
    // resuelve AQUÍ, con el resto de objetivos, y por el mismo motivo: un `itemId` inválido no
    // debe dejar el espacio de conjuro ya gastado.
    let filaObjeto: { id: string; characterId: string } | undefined;
    if (esEncantamiento) {
      const itemId = opciones?.itemId;
      if (!itemId) {
        throw new BadRequestException(`${catalogado.name} necesita el objeto sobre el que actuar.`);
      }
      const fila = await this.prisma.inventoryItem.findFirst({ where: { id: itemId } });
      // El mismo 404 que el resto de la aplicación cuando el dato no existe o no es de esta
      // campaña: `requireVisibleCharacter`, más abajo, ya distingue "no existe" de "existe pero
      // no lo ves" con el mismo 404 en los dos casos.
      if (!fila) throw new NotFoundException("Ese objeto no existe.");
      // **"aliado visible"**: el dueño del arma tiene que ser alguien que el lanzador pueda ver
      // en esta campaña — la misma puerta que ya usa cualquier otra actividad con objetivo de
      // criatura. Un arma de un personaje que no se ve no se puede encantar a ciegas.
      const propietario = await requireVisibleCharacter(
        this.prisma,
        this.membership,
        userId,
        campaignId,
        fila.characterId,
      );
      objetivos.push(propietario);
      filaObjeto = fila;
    } else if (actividad.tipo === "ataque") {
      const ids = opciones?.objetivos ?? [];
      if (ids.length > 1) {
        throw new BadRequestException("Un ataque tiene un objetivo.");
      }
      if (ids.length === 1) {
        const objetivoId = ids[0];
        // Mismo 400 que `resolveAttack`: atacarse a uno mismo no es una mecánica que exista.
        if (objetivoId === actor.id) {
          throw new BadRequestException("No se puede atacar al propio personaje.");
        }
        const target = await this.prisma.character.findFirst({
          where: { id: objetivoId, campaignId, archivedAt: null },
        });
        // **El mismo 404 exacto que `resolveAttack`** (D-OP-11): el que no existe y el que existe
        // pero no se puede ni ver ni tener delante comparten mensaje, para no abrir el oráculo
        // por otra puerta.
        if (!target || !(await this.characterSheet.sePuedeApuntar(userId, campaignId, target))) {
          throw new NotFoundException("Character not found");
        }
        objetivos.push(target);
      }
    } else {
      for (const objetivoId of opciones?.objetivos ?? []) {
        objetivos.push(
          await requireVisibleCharacter(
            this.prisma,
            this.membership,
            userId,
            campaignId,
            objetivoId,
          ),
        );
      }
    }
    const destinatarios = destinatariosOrdenados(objetivos, actor);

    const ctx = await this.contextoDeDerivacion(userId, campaignId, actor);
    const traza: TraceStep[] = [];
    let cd: number | undefined;
    // Task 4 (3A.2) — el daño directo de una actividad (`dados`, signo −1) sobre otro personaje
    // no se aplica a sus PG: va a la bandeja del DM (`pendingDamage`, D-CF-128). El `switch` deja
    // aquí el QUÉ tirar; se tira al final de la transacción, cuando ya se sabe que el consumo y
    // el resto del efecto han pasado. **Ola de arreglos (I-4b): dentro de la MISMA transacción.**
    // Hasta esta ola se tiraba DESPUÉS, porque `RollsService.roll` abría la suya propia; ahora
    // acepta este `tx`, y con eso un fallo al tirar (una expresión rara, la base caída) deshace el
    // espacio, el `RESOURCE_SPENT` y el `ACTIVITY_USED` en vez de dejar un 500 con el espacio
    // perdido y un reintento que gasta otro.
    let danoDiferido:
      | {
          escalada: ReturnType<typeof dadosEscalados>;
          bonoValor: number;
          destinatarios: Character[];
        }
      | undefined;

    // Task 5 (3A.2) — el caso `ataque` (T19). `bonoDeAtaque` es lo único que hace falta para
    // llamar a `resolverAtaqueContraCa` (que también acepta el `tx` desde I-4b). `danoDeAtaque`
    // es el daño de la actividad YA escalado —igual que en el caso `dados`—, listo para tirarse
    // solo si el veredicto resulta `HIT`/`CRITICAL`: el crítico dobla los DADOS (nunca el bono,
    // nunca las caras), y eso solo se sabe una vez que hay veredicto.
    let bonoDeAtaque: number | undefined;
    let danoDeAtaque:
      { escalada: ReturnType<typeof dadosEscalados>; bonoValor: number } | undefined;

    // Task 4 (3A.2) — para un conjuro, lo que se gasta es el espacio (por su nivel o por el
    // elegido, T18); para una aptitud, sigue siendo `consumption` tal cual la declara. Se calcula
    // FUERA de la transacción para que un espacio pedido por debajo del nivel del conjuro
    // (`consumoDeEspacio` lanza) se rechace sin haber abierto nada.
    const consumoEfectivo = esSpell
      ? consumoDeEspacio(spell!, opciones?.nivelDeEspacio)
      : actividad.consumption;

    // **Esta transacción espera un cerrojo a propósito** (`consumir` hace `SELECT … FOR UPDATE`
    // sobre el recurso, ficha P2-6) y **la espera cuenta dentro del tope**. Con el tope por
    // defecto de Prisma (5 s), tres usos a la vez sobre un Postgres cargado —la CI corre 57 suites
    // contra una sola base— dejaban a la tercera con un `P2028` y un 500 que no era de nadie:
    // `usos-concurrentes.e2e-spec.ts` lo cazó en GitHub el 2026-09-13 tras pasar aquí en 132 ms.
    // Un tope de 30 s no cambia nada en la mesa y deja de convertir carga en error.
    const resultado = await this.prisma.transaction(
      async (tx) => {
        const consumo = await this.consumir(tx, actor.id, consumoEfectivo);
        if (!consumo.ok) {
          // Task 4 (3A.2) — «un espacio a 0» sigue sin escribir nada: ni recurso, ni suceso. Para
          // un conjuro, la respuesta lo cuenta como fuera de regla (`SIN_ESPACIO`) en vez de solo
          // avisar — es la mesa jugando sin espacios, no un error del cliente.
          return {
            aviso: consumo.motivo,
            sinRecurso: true as const,
            fueraDeReglaSinRecurso: esSpell ? [...fueraDeRegla, "SIN_ESPACIO" as const] : undefined,
          };
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

        // Task 4 (3A.2) — toda actividad usada deja línea, conjuro o aptitud por igual: sin esto,
        // solo la Furia (con su `effects`) dejaba rastro de que alguien la usó.
        await this.events.record(
          userId,
          campaignId,
          {
            subjectType: "character",
            subjectId: actor.id,
            visibility: actor.visibility,
            payload: {
              type: "ACTIVITY_USED",
              actividadKey,
              name: catalogado.name,
              kind,
              ...(esSpell ? { spellLevel: spell!.level } : {}),
              ...(ctx.nivelDeEspacio !== undefined ? { nivelDeEspacio: ctx.nivelDeEspacio } : {}),
              ...(objetivos.length > 0 ? { targetCharacterIds: objetivos.map((o) => o.id) } : {}),
              ...(fueraDeRegla.length > 0 ? { fueraDeRegla } : {}),
            },
          },
          tx,
        );

        switch (actividad.tipo) {
          case "salvacion": {
            const resuelto = resolverOrigen(actividad.salvacion.cd, ctx);
            traza.push(resuelto.paso);
            cd = resuelto.valor;
            // Puerta de efectos §4.2 (tarea 2) — el I5 de la vuelta de arreglo 1 queda cerrado
            // aquí: el daño (o curación) de una salvación con `dados` se tira UNA sola vez, ahora,
            // y no una vez por cada objetivo que responda. SRD 5.1, *Damage Rolls*: «If a spell or
            // other effect deals damage to more than one target at the same time, roll the damage
            // once for all of them» — un solo `fireball` no tira 8d6 dos veces
            // porque haya dos objetivos. El total viaja en `pendingEffect`, guardado en la
            // `RollRequest`, y `RollRequestsService.answer` decide al responder si se aplica
            // entero, mitad (`siSalva: "mitad"`) o nada, según si esa tirada concreta superó la CD.
            let pendingEffect: PendingSaveEffect | undefined;
            if (actividad.dados) {
              const nivelBase = esSpell ? spell!.level : 0;
              const { total, pasos, escalada } = this.tirarDados(actividad.dados, ctx, nivelBase);
              traza.push(...pasos);
              pendingEffect = {
                amount: total,
                signo: escalada.signo,
                // Solo un daño lleva tipo: una curación por salvación (spec §4.4) no tiene «tipo de
                // daño» que guardar, y el esquema lo dice — el dato guardado no lo contradice.
                ...(escalada.signo < 0 && escalada.tipoDeDano
                  ? { tipoDeDano: escalada.tipoDeDano }
                  : {}),
                siSalva: actividad.salvacion.siSalva,
                actividadKey,
                actorCharacterId: actor.id,
              };
            }
            if (objetivos.length > 0) {
              await this.rollRequests.createFromEffect(tx, userId, campaignId, {
                characterIds: destinatarios.map((o) => o.id),
                key: `save.${actividad.salvacion.ability}`,
                label: `Salvación de ${actividad.salvacion.ability} — ${actividadKey}`,
                dc: resuelto.valor,
                mode: "NORMAL",
                audience: loVeLaMesa(actor.visibility) ? "PUBLIC" : "DM_PRIVATE",
                ...(pendingEffect ? { pendingEffect } : {}),
              });
            }
            break;
          }
          case "dados": {
            // Task 4 (3A.2) — el escalado se resuelve ANTES de tirar (T18, cantrips), y el signo
            // de la expresión YA escalada es el que decide el camino: daño a otro no se aplica
            // aquí (D-CF-128), se difiere a la bandeja del DM, fuera de esta transacción.
            const nivelBase = esSpell ? spell!.level : 0;
            const escalada = dadosEscalados(actividad.dados, {
              nivelBase,
              nivelDeEspacio: ctx.nivelDeEspacio,
              nivelDePersonaje: ctx.level,
            });
            let bonoValor = 0;
            if (escalada.bonus) {
              const resuelto = resolverOrigen(escalada.bonus, ctx);
              bonoValor = resuelto.valor;
              traza.push(resuelto.paso);
            }
            const esDanoAOtro =
              escalada.signo === -1 && destinatarios.some((d) => d.id !== actor.id);
            if (esDanoAOtro) {
              // Se tira al final de esta misma transacción (ver `danoDiferido` arriba).
              danoDiferido = { escalada, bonoValor, destinatarios: [...destinatarios] };
              break;
            }
            let dadoTotal = 0;
            if (escalada.n !== undefined && escalada.caras !== undefined) {
              const tirada = rollExpression(`${escalada.n}d${escalada.caras}`, this.roller);
              dadoTotal = tirada.total;
              traza.push({
                op: "base",
                amount: dadoTotal,
                sourceType: "base",
                sourceKey: "dice",
                labelKey: "activity.diceRolled",
              });
            }
            const delta = escalada.signo * (dadoTotal + bonoValor);
            for (const destino of destinatarios) {
              await this.characterSheet.changeHpFromEffect(tx, userId, campaignId, destino.id, {
                delta,
                reason: `Actividad: ${actividadKey}`,
                ...(delta < 0 && escalada.tipoDeDano ? { damageType: escalada.tipoDeDano } : {}),
              });
            }
            break;
          }
          case "ataque": {
            // Task 5 (3A.2, T19) — **ahora sí se resuelve el impacto.** Hasta esta tarea no había
            // en el proyecto una puerta de "tirada de ataque contra la CA" desligada de un arma
            // equipada; `resolverAtaqueContraCa` (extraída de `resolveAttack`) es esa puerta, y
            // este caso la comparte en vez de reinventar la comparación. Aquí, dentro de la
            // transacción, solo se resuelve lo que YA se resolvía —el bono y su traza— más el daño
            // ya escalado (si la actividad lo trae): ninguna de las dos cosas toca la base de
            // datos. La tirada de ataque de verdad, y el daño si impacta, van al final de esta
            // misma transacción (I-4b), junto al daño diferido de `dados`.
            const resuelto = resolverOrigen(actividad.ataque.bono, ctx);
            traza.push(resuelto.paso);
            bonoDeAtaque = resuelto.valor;
            if (actividad.dados) {
              const nivelBase = esSpell ? spell!.level : 0;
              const escaladaAtaque = dadosEscalados(actividad.dados, {
                nivelBase,
                nivelDeEspacio: ctx.nivelDeEspacio,
                nivelDePersonaje: ctx.level,
              });
              let bonoValorAtaque = 0;
              if (escaladaAtaque.bonus) {
                const resueltoBono = resolverOrigen(escaladaAtaque.bonus, ctx);
                bonoValorAtaque = resueltoBono.valor;
                traza.push(resueltoBono.paso);
              }
              danoDeAtaque = { escalada: escaladaAtaque, bonoValor: bonoValorAtaque };
            }
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

        // T15 (3A.2) — `caso "encantar"`: *Arma mágica* como `TemporaryModifier` sobre el objeto,
        // dentro de la MISMA transacción que gastó el espacio (la misma doctrina que `effects[]`,
        // arriba: gastar el recurso y no dejar el encantamiento aplicado sería el estado a medias
        // que esa doctrina existe para impedir). SRD 5.1, *Magic Weapon*: «that weapon becomes a
        // magic weapon with a +1 bonus to attack rolls and damage rolls» — 2.º nivel base, +2 a un
        // espacio de 4.º o superior, +3 a uno de 6.º o superior (`ENCANTAMIENTOS`).
        if (esEncantamiento) {
          const bono = ENCANTAMIENTOS[spell!.key].bonoPorNivel(ctx.nivelDeEspacio ?? spell!.level);
          // «1 hora» del catálogo, en segundos del reloj de campaña — nunca un `3600` a mano:
          // si algún día entra un segundo encantamiento con otra duración (Shillelagh, Arma
          // elemental, 3B), esta cuenta ya vale para él.
          const segundos = segundosDeDuracion(spell!.duration);
          // `destinatarios[0]` y no `objetivos[0]`: es la misma fila —`destinatariosOrdenados`
          // solo reordena— y `destinatarios` es la que ya usa el resto de `usar()` para "a quién
          // le pasa esto".
          const propietario = destinatarios[0];
          for (const target of ["item.weaponAttack", "item.weaponDamage"] as const) {
            await this.temporaryModifiers.grantFromActivity(
              tx,
              campaignId,
              propietario.id,
              userId,
              {
                target,
                amount: bono,
                reason: catalogado.name,
                inventoryItemId: filaObjeto!.id,
                ...(segundos !== undefined ? { durationSeconds: segundos } : {}),
              },
            );
          }
          // **La concentración es de quien LANZA, no de quien lleva el arma** (pueden ser
          // personajes distintos: un mago encanta la espada del guerrero). SRD 5.1,
          // *Concentration*: perderla no borra el encantamiento solo — lo quita el DM
          // (D-CF-130); esta condición solo AVISA de que sigue concentrado.
          if (spell!.duration.concentracion) {
            await this.conditions.apply(
              userId,
              campaignId,
              actor.id,
              {
                key: `${CONCENTRATION_KEY_PREFIX}-${spell!.key}`,
                ...(segundos !== undefined ? { durationSeconds: segundos } : {}),
              },
              tx,
              { concedidoPorActividad: true },
            );
          }
        }

        // Task 4 (3A.2), D-CF-128 — el daño diferido se tira AQUÍ, al final de la transacción
        // (I-4b: antes iba fuera, ver `danoDiferido`). SRD 5.1, *Damage Rolls*: «roll the damage
        // once for all of them» — el azar se tira UNA vez (`tiradaDeDano`, sin pasar por
        // `RollsService`) y cada destinatario recibe su propia tarjeta de la bandeja del DM con
        // ESE MISMO resultado (`interno.resultadoFijo`): N tarjetas, un solo azar.
        let rollEventIds: string[] | undefined;
        if (danoDiferido) {
          const { escalada, bonoValor, destinatarios: destinosDelDano } = danoDiferido;
          const { expresionTexto, resultado: resultadoDado } = this.tiradaDeDano(
            escalada.n,
            escalada.caras,
            bonoValor,
          );
          const etiqueta = `${esSpell ? "Conjuro" : "Actividad"}: ${catalogado.name}`;

          rollEventIds = [];
          for (const destino of destinosDelDano) {
            const respuesta = await this.rolls.roll(
              userId,
              campaignId,
              {
                expression: expresionTexto,
                label: `Daño de ${catalogado.name}`,
                characterId: actor.id,
                mode: "NORMAL",
                audience: loVeLaMesa(actor.visibility) ? "PUBLIC" : "DM_PRIVATE",
              },
              {
                pendingDamage: {
                  targetCharacterId: destino.id,
                  damageType: escalada.tipoDeDano ?? "FORCE",
                  reason: etiqueta,
                },
                resultadoFijo: resultadoDado,
              },
              tx,
            );
            rollEventIds.push(respuesta.eventId);
          }
        }

        // Task 5 (3A.2, T19) — el ataque de conjuro contra la CA, también dentro de la
        // transacción desde I-4b (`resolverAtaqueContraCa` acepta el `tx` y lo propaga a su
        // tirada, a la ayuda consumida y al `ATTACK_RESOLVED`). Solo se resuelve con exactamente
        // un objetivo (`bonoDeAtaque` solo se pone en el caso `ataque`, y la validación de arriba
        // ya garantiza que `objetivos.length` es 0 o 1 para ese tipo) — «sin objetivo, solo traza
        // del bono» sigue siendo el comportamiento de siempre.
        let verdict: AttackVerdict | undefined;
        if (bonoDeAtaque !== undefined && objetivos.length === 1) {
          const target = objetivos[0];
          const resuelto = await this.characterSheet.resolverAtaqueContraCa(
            userId,
            campaignId,
            actor,
            target,
            {
              bono: bonoDeAtaque,
              label: `Ataque de conjuro: ${catalogado.name}`,
              mode: "NORMAL",
              attackName: catalogado.name,
            },
            tx,
          );
          verdict = resuelto.verdict;

          // SRD 5.1, *Attack Rolls*: «Some spells require the caster to make an attack roll to
          // determine whether the spell effect hits the intended target [...] A hit or a miss is
          // determined by the same method as an ordinary attack.» Solo un HIT/CRITICAL cobra
          // daño; un MISS —o una tirada a ciegas, sin veredicto— no tira nada.
          if ((resuelto.verdict === "HIT" || resuelto.verdict === "CRITICAL") && danoDeAtaque) {
            const { escalada, bonoValor } = danoDeAtaque;
            // **El crítico dobla los DADOS, nunca el bono ni las caras** (SRD 5.1; mismo criterio
            // que `duplicarDados` en `character-sheet.service.ts`, rama DAMAGE de `rollAttack`):
            // `1d10` crítico es `2d10`, no `2d10+bono·2` ni `1d20`.
            const n =
              escalada.n !== undefined
                ? resuelto.verdict === "CRITICAL"
                  ? escalada.n * 2
                  : escalada.n
                : undefined;
            const { expresionTexto, resultado: resultadoDado } = this.tiradaDeDano(
              n,
              escalada.caras,
              bonoValor,
            );
            const etiqueta = `${esSpell ? "Conjuro" : "Actividad"}: ${catalogado.name}`;

            const respuestaDano = await this.rolls.roll(
              userId,
              campaignId,
              {
                expression: expresionTexto,
                label: `Daño de ${catalogado.name}`,
                characterId: actor.id,
                mode: "NORMAL",
                audience: loVeLaMesa(actor.visibility) ? "PUBLIC" : "DM_PRIVATE",
              },
              {
                pendingDamage: {
                  targetCharacterId: target.id,
                  damageType: escalada.tipoDeDano ?? "FORCE",
                  reason: etiqueta,
                  attackResolvedEventId: resuelto.attackResolvedEventId,
                },
                resultadoFijo: resultadoDado,
              },
              tx,
            );
            rollEventIds = [...(rollEventIds ?? []), respuestaDano.eventId];
          }
        }

        return { aviso: undefined, sinRecurso: false as const, rollEventIds, verdict };
      },
      { maxWait: 10_000, timeout: 30_000 },
    );

    if (resultado.sinRecurso) {
      return { aviso: resultado.aviso, fueraDeRegla: resultado.fueraDeReglaSinRecurso };
    }

    // **Fuera de la transacción, a propósito.** La economía del turno nunca rechaza
    // (`EncountersService.gastar`, doctrina de la tarea A2) y abre su propia transacción — no
    // puede anidar con la de arriba. Fuera de combate no hay combatiente que marcar y no es un
    // error: se calla. Desde I-4b va DESPUÉS de las tiradas (que ahora viven en la transacción):
    // el orden no cambia nada de lo que se escribe, y así una tirada que revienta no deja la
    // acción gastada.
    await this.gastarActivacion(userId, campaignId, actor, actividad);

    return {
      cd,
      traza: traza.length > 0 ? traza : undefined,
      rollEventIds: resultado.rollEventIds,
      fueraDeRegla: fueraDeRegla.length > 0 ? fueraDeRegla : undefined,
      verdict: resultado.verdict,
    };
  }

  /**
   * Ola de arreglos de 3A.2 (I-4a) — la expresión y el resultado del daño de una actividad, para
   * la tarjeta de la bandeja del DM. **Sin dados no se llama a `rollExpression`**: el catálogo
   * trae `dados` con solo un bono (`earthquake@4`, daño fijo 50; `heal@0`), y un número suelto no
   * es una tirada — con un bono negativo, además, `rollExpression("-2")` lanza. Se construye el
   * `DiceRollResult` a mano: un término constante (`sides: 0`, la misma forma que `evaluarTermino`
   * da a un modificador), total = bono. Con dados, la tirada de siempre (`this.roller`).
   */
  private tiradaDeDano(
    n: number | undefined,
    caras: number | undefined,
    bonoValor: number,
  ): { expresionTexto: string; resultado: DiceRollResult } {
    const dados = n !== undefined && caras !== undefined ? `${n}d${caras}` : undefined;
    if (dados) {
      const expresionTexto = conSigno(dados, bonoValor);
      return { expresionTexto, resultado: rollExpression(expresionTexto, this.roller) };
    }
    const expresionTexto = `${bonoValor}`;
    return {
      expresionTexto,
      resultado: {
        expression: expresionTexto,
        terms: [
          {
            source: `${Math.abs(bonoValor)}`,
            sign: bonoValor < 0 ? -1 : 1,
            sides: 0,
            rolled: [],
            kept: [Math.abs(bonoValor)],
            dropped: [],
            value: Math.abs(bonoValor),
            dice: [],
          },
        ],
        total: bonoValor,
      },
    };
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

    const filas: { id: string; label: string; current: number; max: number | null }[] = [];
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
        { id: string; label: string; current: number; max: number | null }[]
      >`SELECT id, label, current, max FROM "CharacterResource" WHERE "characterId" = ${actorId} AND key = ${item.recurso} FOR UPDATE`;
      const recurso = bloqueadas[0];
      // **`max === null` se mira ANTES que `current`** (ficha A11-usos-sin-tope). Un recurso que
      // el SRD declara *Unlimited* —la Furia a partir de nivel 20— no tiene contador contra el
      // que comparar: preguntarle si «le quedan usos» es la pregunta equivocada. Antes se
      // comparaba igual, así que «sin tope» se gastaba de un contador finito y se acababa.
      if (!recurso || (recurso.max !== null && recurso.current < item.cantidad)) {
        // Ola de arreglos (m-8) — sin FILA (un mago de nivel 3 pidiendo un espacio de nivel 5),
        // `item.recurso` es una clave interna («spell-slot-5») y el aviso llega a pantalla: para
        // un espacio de conjuro se dice el nivel; para cualquier otro recurso sin fila, su clave
        // sigue siendo lo único que hay (y no debería pasar: la siembra crea la fila con el rasgo).
        const nivelDeEspacio = /^spell-slot-(\d+)$/.exec(item.recurso)?.[1];
        return {
          ok: false,
          motivo:
            !recurso && nivelDeEspacio
              ? `No tiene espacios de nivel ${nivelDeEspacio}.`
              : `Sin usos de «${recurso?.label ?? item.recurso}» que gastar.`,
        };
      }
      filas.push(recurso);
    }

    const pasos: PasoDeConsumo[] = [];
    for (const [i, item] of consumo.entries()) {
      const fila = filas[i];
      // Y tampoco se descuenta: restarle a «sin tope» lo dejaría, con el tiempo, en un número.
      if (fila.max === null) {
        pasos.push({
          key: item.recurso,
          label: fila.label,
          amount: item.cantidad,
          remaining: fila.current,
        });
        continue;
      }
      const remaining = fila.current - item.cantidad;
      await tx.characterResource.update({ where: { id: fila.id }, data: { current: remaining } });
      pasos.push({ key: item.recurso, label: fila.label, amount: item.cantidad, remaining });
    }
    return { ok: true, pasos };
  }

  /**
   * Una expresión de dados, tirada: el total y los pasos de traza que lo explican.
   *
   * **Task 4 (3A.2) — escala ANTES de tirar.** `nivelBase` es `spell.level` para un conjuro (T18,
   * la actividad `dados` de este método) y `0` para una aptitud — sin nivel de espacio en el
   * contexto (una aptitud nunca gasta uno), el escalado por espacio da siempre 0 tramos, así que
   * pasar `0` no le inventa ninguna escala que no tuviera. Devuelve también la expresión YA
   * escalada (`escalada`): quien llama la necesita para su `signo`/`tipoDeDano`, que no cambian al
   * escalar pero sí viajan siempre desde la MISMA fuente que produjo los dados que se tiraron.
   */
  private tirarDados(
    expresion: Extract<Actividad, { tipo: "dados" }>["dados"],
    ctx: ContextoDeDerivacion,
    nivelBase: number,
  ): { total: number; pasos: TraceStep[]; escalada: ReturnType<typeof dadosEscalados> } {
    const escalada = dadosEscalados(expresion, {
      nivelBase,
      nivelDeEspacio: ctx.nivelDeEspacio,
      nivelDePersonaje: ctx.level,
    });
    const pasos: TraceStep[] = [];
    let total = 0;
    if (escalada.n !== undefined && escalada.caras !== undefined) {
      const tirada = rollExpression(`${escalada.n}d${escalada.caras}`, this.roller);
      total += tirada.total;
      pasos.push({
        op: "base",
        amount: tirada.total,
        sourceType: "base",
        sourceKey: "dice",
        labelKey: "activity.diceRolled",
      });
    }
    if (escalada.bonus) {
      const resuelto = resolverOrigen(escalada.bonus, ctx);
      total += resuelto.valor;
      pasos.push(resuelto.paso);
    }
    return { total, pasos, escalada };
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
    let clase: ReturnType<typeof findClass> | undefined;
    if (actor.classKey) {
      try {
        clase = findClass({ source: "SRD", key: actor.classKey });
        spellcastingAbility = clase.spellcastingAbility;
      } catch (error) {
        // Una clase que el catálogo ya no reconoce es un dato caduco, no un motivo para reventar
        // "usar": se deriva sin característica de lanzamiento, igual que hace el resto de la
        // aplicación con contenido caduco.
        if (!(error instanceof UnknownContentError)) throw error;
      }
    }

    let cdDeConjuro: number | undefined;
    let ataqueDeConjuro: number | undefined;
    if (spellcastingAbility) {
      const hoja = await this.characterSheet.getSheet(userId, campaignId, actor.id);
      cdDeConjuro = hoja.sheet?.derived.spellSaveDc?.total;
      // Task 4 (3A.2) — hermano de `cdDeConjuro`, mismo patrón: `fire-bolt` (`ataque`) necesita
      // este origen para resolver su bono, y solo un lanzador tiene uno que derivar.
      ataqueDeConjuro = hoja.sheet?.derived["attack.spell"]?.total;
    }

    return {
      abilities,
      level: actor.level,
      spellcastingAbility,
      cdDeConjuro,
      ataqueDeConjuro,
      // C2 (ola de arreglos de 3A.1): la clase del actor, para `nivelDeClase` — Tomar Aliento
      // curaba `1d10 + 0` sin esto. Sin multiclase; una clase que el catálogo no reconoce deja
      // `classKey` vacío y `nivelDeClase` da 0, igual que antes.
      classKey: clase?.key,
      // Las tablas de escala de LA CLASE del actor (m4): antes `new Map()` y cualquier `escala`
      // en unos dados o un bono lanzaba. Mismo mapa que `resolve.ts` usa para los `usos.max`.
      escalas: tablaDeEscalas({ ...(clase?.scales ?? {}) }),
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
   *
   * **Task 4b (3A.3) — extraído a `gastarSiEnCombate`.** `CharacterSheetService.resolveAttack`
   * necesitaba exactamente esto («¿hay combatiente activo? si lo hay, gastar») para que un
   * ataque de arma con objetivo también gastara la acción del turno (D-CF-146, el hueco que
   * medió la Task 4) — sin volver a escribir la misma consulta y la misma llamada a `gastar` una
   * segunda vez.
   */
  private async gastarActivacion(
    userId: string,
    campaignId: string,
    actor: Character,
    actividad: Actividad,
  ): Promise<void> {
    if (!("coste" in actividad.activation)) return;
    await gastarSiEnCombate(
      this.prisma,
      this.encounters,
      userId,
      campaignId,
      actor.id,
      actividad.activation.coste,
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
 * Task 4 (3A.2) — `"8d6"` + `3` → `"8d6+3"`; `"8d6"` + `-2` → `"8d6-2"`; sin modificador, la
 * expresión de dados tal cual. Mismo patrón que `conSigno` de `character-sheet.service.ts`
 * (`rollAttack`), copiado en vez de importado porque esa función no se exporta y no vale la pena
 * abrir esa puerta por una función de una línea.
 */
function conSigno(dados: string, modificador: number): string {
  if (modificador === 0) return dados;
  return `${dados}${modificador > 0 ? "+" : "-"}${Math.abs(modificador)}`;
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
