import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  Inject,
} from "@nestjs/common";
import type { Character, InventoryItem } from "@prisma/client";
import {
  CLAVE_AYUDA,
  CLAVE_ESTABLE,
  CLAVE_MUY_CARGADO,
  nivelPorXp,
  normalizeOverride,
  ORDEN_DE_CARACTERISTICAS,
  overrideValueSchema,
  RANGO_DE_ANULACION,
  tableRulesSchema,
  umbralDeNivel,
} from "@dnd/shared";
import type {
  AbilityKey,
  Visibility,
  AttackVerdict,
  ContentRefInput,
  ResolvedItem,
  DamagePreview,
  DamageType,
  DerivationWarning,
  ChangeHpInput,
  ResolveAttackInput,
  RollAttackInput,
  CharacterChoices,
  DeathSaveInput,
  DeathState,
  GameEventPayload,
  SetHpInput,
  Overrides,
  OverridableKey,
  RollSuggestions,
  SetOverrideInput,
  TraceStep,
  UpdateCharacterSheetInput,
} from "@dnd/shared";
import {
  resolverOrigen,
  tablaDeEscalas,
  type ContextoDeDerivacion,
  type Modifier,
} from "../rules/engine";
import { buildAttacks, type Attack } from "../rules/attacks";
import { sintonizacionPendiente } from "../rules/items";
import { CLAVE_FURIA_ACTIVA, SRD_CLASSES } from "../rules/catalog/classes";
import { resolveContentRef } from "../inventory/common/resolve-item";
import {
  filaComoLaVeElViewer,
  identificacionEfectiva,
  nombreVisible,
} from "../inventory/common/identification";
import {
  deriveCharacter,
  findClass,
  findRace,
  findSubrace,
  InvalidChoiceError,
  InvalidEquipmentError,
  UnknownContentError,
  type CharacterBuild,
  type CharacterSheet,
  deriveNpc,
} from "../rules/catalog";
import { rollExpression, type DiceRollResult, type Roller } from "../dice/dice";
import { DICE_ROLLER, RollsService } from "../rolls/rolls.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StatblocksService } from "../statblocks/statblocks.service";
import { CharactersService } from "./characters.service";
import { AbilityRollsService } from "./ability-rolls.service";
import {
  comprobarPermitido,
  desgloseDeTirada,
  oroInicialDe,
  pgDeLosNivelesSiguientes,
  validarCaracteristicas,
} from "../rules/table-rules";
import { ResourcesService } from "../character-state/resources/resources.service";
import {
  effectiveSpeed,
  type EffectiveSpeedResult,
  type EncumbranceLevel,
} from "../character-state/speed/effective-speed";
import { carriedWeightOz } from "../inventory/common/weight";
import { estadoDeSobrecarga } from "../inventory/common/encumbrance";
import { condicionesActivas } from "../character-state/conditions/vencimiento";
import {
  combinarModo,
  modoContraObjetivo,
} from "../character-state/roll-mode/modo-contra-objetivo";
import {
  maxHpConAgotamiento,
  muertoPorAgotamiento,
  nivelDeAgotamiento,
} from "../character-state/common/agotamiento";
import { applyDamageModifiers } from "../character-state/damage/apply-damage-modifiers";
import {
  estaConcentrado,
  concentrationSaveDc,
} from "../character-state/concentration/concentration";
import { rollSuggestionsFor } from "../character-state/roll-mode/suggested-roll-mode";
import { canView, loVeLaMesa, Viewer } from "../common/visibility";
import {
  requireOwnerOrDM,
  requireVisibleCharacter,
  viewerFor,
  viewerForCharacterOwner,
} from "../common/character-viewer";
import {
  conEntityIdVisible,
  entityIdsVisibleFor,
  sinEntityIdEnRespuesta,
} from "../common/entity-link";

// Tareas 2A.6 y 2A.7 — la hoja calculada y los PG mutables.
//
// **Se guarda lo decidido; se calcula lo derivado**, siempre por `deriveCharacter`. Este
// servicio nunca escribe `maxHp`, CA ni ningún modificador en una columna: los lee de la hoja
// que el catálogo deriva en el momento, con las seis características, la raza y la clase que sí
// están en la fila.

/** El personaje tal y como sale de la base, con las columnas que hacen falta para derivar. */
type FilaPersonaje = Character;

/**
 * Tarea 3 de la puerta de efectos (spec §4b.4). La forma que `rolls.service.ts` escribe dentro de
 * `ABILITY_ROLL.pendingDamage` — no se importa de `@dnd/shared` porque el esquema no exporta un
 * tipo propio para ese campo anidado, solo el `ABILITY_ROLL` entero.
 */
type PendingDamage = {
  targetCharacterId: string;
  attackResolvedEventId: string;
  damageType: DamageType;
  amount: number;
  appliedEventId?: string;
};

/**
 * Spec §4b.5. **El mismo mensaje para «no existe» y para «existe pero no te toca ver esto».**
 * Un objetivo que ya se resolvió `NotFoundException` en `damagePreview` (un espectador que no es
 * dueño ni DM) tiene que sonar exactamente igual que una tirada que nunca tuvo daño pendiente: si
 * sonaran distinto, la propia forma del error confirmaría que hay algo que ver detrás.
 */
const SIN_DANO_PENDIENTE = "Esa tirada no tiene daño pendiente.";

type ResultadoConstruccion = { build: CharacterBuild } | { reason: string };

/**
 * Lo que devuelve `hojaOMotivo`: la hoja o el motivo por el que no hay, **y en los dos casos el
 * nivel de agotamiento**.
 *
 * Es una intersección con la unión y no un tercer miembro a propósito: quien solo quiere la hoja
 * sigue estrechando con `"sheet" in resultado` sin enterarse de que hay un campo más, y quien
 * necesita el nivel —la muerte del nivel 6, tarea 2.5.5— lo tiene sin repetir la consulta de
 * condiciones que esa función ya hace.
 */
type HojaDerivada = ({ sheet: CharacterSheet } | { reason: string }) & {
  exhaustion: number;
  /**
   * **El PNJ se ve, sus números no** (D-A-2, 2026-09-06). Marca el único caso en que la fila del
   * personaje NO puede salir entera: un PNJ que el DM reveló cuyo statblock sigue siendo suyo.
   */
  numerosOcultos?: boolean;
  /**
   * **Sigue estable** (Tarea 16, H1b): hay una `CharacterCondition` con la clave reservada
   * `CLAVE_ESTABLE` sobre este personaje. Sale de aquí y no de una consulta propia de
   * `estadoDeMuerte` por el mismo motivo que `exhaustion`: esta función ya pide las condiciones
   * del personaje, y una segunda consulta sería la misma pregunta hecha dos veces.
   */
  stable: boolean;
};

/**
 * De fila persistida a `CharacterBuild`, o al motivo por el que no se puede construir uno.
 *
 * **No lanza.** Una ficha a medias —sin clase todavía, por ejemplo— es un estado legítimo de
 * la mesa (alguien está creando personaje), no un error: por eso esto devuelve un motivo en vez
 * de una excepción, y quien llama decide si esa falta es tolerable (la lectura de la hoja lo es;
 * gestionar los PG no, porque no hay `maxHp` que recortar).
 */
function construirBuild(
  character: FilaPersonaje,
  items: ResolvedItem[] = [],
): ResultadoConstruccion {
  const faltantes: string[] = [];
  const claves = ["str", "dex", "con", "int", "wis", "cha"] as const;
  for (const clave of claves) if (character[clave] == null) faltantes.push(clave);
  if (!character.raceKey) faltantes.push("raza");
  if (!character.classKey) faltantes.push("clase");
  if (faltantes.length > 0) {
    return { reason: `Faltan datos para calcular la hoja: ${faltantes.join(", ")}.` };
  }
  return {
    build: {
      abilities: {
        str: character.str!,
        dex: character.dex!,
        con: character.con!,
        int: character.int!,
        wis: character.wis!,
        cha: character.cha!,
      },
      race: { source: "SRD", key: character.raceKey! },
      subrace: character.subraceKey ? { source: "SRD", key: character.subraceKey } : undefined,
      class: { source: "SRD", key: character.classKey! },
      subclass: character.subclassKey ? { source: "SRD", key: character.subclassKey } : undefined,
      level: character.level,
      choices: (character.choices as CharacterChoices | null) ?? undefined,
      // **El equipo equipado entra por la misma puerta que la raza y la clase** (fase 2B). Va
      // resuelto y no por referencia: comprobar que un objeto de campaña es de ESTA campaña
      // necesita la base, y el resolutor no la toca — así no hay ningún `else` donde se cuele un
      // identificador de otra mesa.
      items,
      // Reglas de la mesa (E-RM-3): el cuarto motivo por el que esta construcción tiene que ir a
      // la par de las otras dos — sin esto, la hoja calcularía unos PG distintos a los del previo
      // de subida de nivel para quien fijó los suyos al nacer.
      hitPointsPerLevel: (character.hitPointsPerLevel as number[] | null) ?? undefined,
    },
  };
}

/**
 * Deriva, o traduce un catálogo que no reconoce una clave a un motivo legible. **Nunca deja
 * pasar un 500**: una clave de raza o clase que ya no existe en el catálogo (dato viejo) es
 * exactamente el caso que `resolveBuild` documenta como "no es un dato inválido, es caduco".
 */
function derivarOMotivo(
  build: CharacterBuild,
  overrides: Modifier[] = [],
  /** Migración 6 (D-CF-16): ver `resolveBuild`. Apagada por defecto. */
  encumbranceVariant = false,
): { sheet: CharacterSheet } | { reason: string } {
  try {
    return { sheet: deriveCharacter(build, overrides, { encumbranceVariant }) };
  } catch (error) {
    if (error instanceof UnknownContentError || error instanceof InvalidEquipmentError) {
      return { reason: `La hoja no se puede calcular: ${error.message}` };
    }
    throw error;
  }
}

function clamp(valor: number, minimo: number, maximo: number): number {
  return Math.max(minimo, Math.min(maximo, valor));
}

/**
 * Las anulaciones guardadas, convertidas en modificadores `override` del motor.
 *
 * **No se aplican aquí a mano.** El motor ya sabe qué es un `override` —va al final, sustituye
 * el total, y **anota el delta en la traza para que la traza siga sumando**—; escribir esa
 * misma regla otra vez en el servicio sería tener dos versiones de ella, una sin las pruebas
 * del motor. Y la traza es justo lo que hace que una anulación no sea magia: el jugador ve
 * «CA 18 — anulación del DM (+3)» en vez de un número sin origen.
 *
 * Una clave guardada que ya no se puede anular (porque la lista se cerró más) **se ignora en
 * silencio aquí y se avisa en `warnings`**: no se borra el dato del DM por un cambio nuestro.
 */
function modificadoresDeAnulacion(character: FilaPersonaje): Modifier[] {
  const guardado = (character.overrides ?? {}) as Record<string, unknown>;
  const salida: Modifier[] = [];
  for (const [clave, valor] of Object.entries(guardado)) {
    // Ronda 1 de revisión (2026-09-11), hallazgo 5 — la forma de `OverrideValue` se comprueba UNA
    // vez, en `@dnd/shared`, no con un par de `typeof` reescritos aquí que pueden discrepar del
    // esquema real (un `value` no entero tenía `typeof "number"` y se colaba). `safeParse` es el
    // único juez de qué es una anulación válida; lo que no pasa se ignora igual que antes — un
    // dato que no puede resolverse en un entero no es una anulación, sea cual sea su forma.
    const analizado = overrideValueSchema.safeParse(valor);
    if (!analizado.success) continue;
    const { value, reason } = normalizeOverride(analizado.data);
    salida.push({
      target: clave,
      op: "override",
      amount: value,
      sourceType: "manual",
      sourceKey: clave,
      labelKey: "override.manual",
      ...(reason ? { reason } : {}),
    });
  }
  return salida;
}

/**
 * Los modificadores temporales **vivos**, convertidos en modificadores `add` del motor (plan 13,
 * ficha M8).
 *
 * **Se suman al derivar y NO tocan la columna del personaje.** Si mutaran la Fuerza, al caducar
 * habría que restar, y cualquier fallo —un proceso que no corre, una excepción a medias— dejaría al
 * personaje cambiado para siempre. Derivando, lo peor que pasa es que un número vuelva a su sitio.
 *
 * **La caducidad se resuelve AQUÍ, al leer**, contra el reloj de campaña y con la misma función que
 * las condiciones (`condicionesActivas`, 2C.4): sin barrido periódico y sin una segunda verdad que
 * pueda discrepar de la primera. Un modificador vencido **sigue en la tabla y deja de sumar**, que
 * es la decisión D-2C-2 aplicada a esto: el jugador ve POR QUÉ perdió el +2.
 *
 * Entran como `add` y no como `override`, así que llegan **antes de los topes** por construcción:
 * el motor aplica primero los `add` y después lo que sustituye o recorta.
 */
export function modificadoresTemporales(
  filas: {
    id: string;
    target: string;
    amount: number;
    reason: string;
    expiresAtClock: number | null;
  }[],
  relojSegundos: number,
): Modifier[] {
  // `condicionesActivas` pide `key`; se le da el `target`, que es lo que hace de clave aquí. La
  // regla de «¿sigue vivo?» vive en un solo sitio, y este es el motivo de pasar por ella.
  const vivos = condicionesActivas(
    filas.map((f) => ({ ...f, key: f.target })),
    relojSegundos,
  );
  return vivos.map((f) => ({
    target: f.target,
    op: "add" as const,
    amount: f.amount,
    sourceType: "temporary" as const,
    // **El id de la fila**, no el `target`: dos pociones de fuerza a la vez son dos pasos
    // distintos en la traza, y con el `target` como clave se leerían como uno repetido.
    sourceKey: f.id,
    // El motor no devuelve prosa en español, así que el motivo viaja **dentro de la clave** y la
    // pantalla lo saca. Es lo mismo que hace `override.manual`, con el motivo añadido.
    labelKey: `temporary:${f.reason}`,
  }));
}

/**
 * En 2A solo hay contenido SRD (2B abrirá `CAMPAIGN`). Extrae la clave o rechaza con 400 —nunca
 * con el 500 que daría dejar pasar una referencia que el catálogo no sabe resolver.
 */
function claveSrd(
  ref: { source: "SRD"; key: string } | { source: "CAMPAIGN"; id: string },
): string {
  if (ref.source !== "SRD")
    throw new BadRequestException("En esta fase solo hay contenido del SRD.");
  return ref.key;
}

@Injectable()
export class CharacterSheetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
    private readonly characters: CharactersService,
    private readonly rolls: RollsService,
    /**
     * Reglas de la mesa (Tarea 4): para comprobar un `attemptId` de DADOS. No hay ciclo de
     * inyección — `AbilityRollsService` depende de `CharactersService`, no de este servicio,
     * y los dos viven en el mismo módulo (`characters.module.ts` la exporta).
     */
    private readonly abilityRolls: AbilityRollsService,
    // Mismo patrón que `RollsService`: inyectable solo en pruebas, `undefined` en producción.
    @Optional() @Inject(DICE_ROLLER) private readonly roller?: Roller,
    /**
     * Opcional porque casi todas las pruebas unitarias de este servicio se montan a mano y no
     * les interesa la siembra. En la aplicación real siempre está: `CharactersModule` importa
     * `CharacterStateModule`, que la exporta.
     */
    @Optional() private readonly resources?: ResourcesService,
    /**
     * Fase 2D. Resuelve el statblock de un PNJ instanciado.
     *
     * **Opcional por el mismo motivo que `resources`**: casi todas las unitarias de este servicio
     * montan el módulo a mano y no instancian PNJ. Si falta y la hoja es la de un PNJ, se dice —
     * `hojaDeStatblock` lo comprueba — en vez de derivar una hoja vacía que parecería correcta.
     */
    @Optional() private readonly statblocks?: StatblocksService,
  ) {}

  /**
   * ¿Se puede apuntar a este personaje? **`canView` o estar en el encuentro activo** (D-OP-11).
   *
   * Las dos mitades hacen falta y ninguna sobra. `canView` sola dejaría fuera al PNJ `DM_ONLY` que
   * el DM acaba de bajar a la mesa, que es justo lo que el spec de 2.5.3 pide que se pueda atacar.
   * El encuentro solo dejaría fuera al objetivo perfectamente visible al que se ataca **fuera** de
   * combate, que es legal.
   *
   * Y **no vale con «está en algún encuentro»**: tiene que ser uno **activo** de esta campaña. Un
   * combatiente de una pelea de hace tres sesiones no está delante de nadie.
   */
  private async sePuedeApuntar(
    userId: string,
    campaignId: string,
    target: { id: string; visibility: Visibility; ownerId: string },
  ): Promise<boolean> {
    const viewer = await viewerFor(this.prisma, this.membership, userId, campaignId);
    if (
      canView(viewer, {
        visibility: target.visibility,
        createdById: target.ownerId,
        grantedUserIds: [],
      })
    ) {
      return true;
    }
    const enCombate = await this.prisma.combatant.findFirst({
      where: {
        characterId: target.id,
        encounter: { status: "ACTIVE", session: { campaignId } },
      },
      select: { id: true },
    });
    return enCombate !== null;
  }

  private canSee(viewer: Viewer, character: FilaPersonaje): boolean {
    return canView(viewer, {
      visibility: character.visibility,
      createdById: character.ownerId,
      grantedUserIds: [],
    });
  }

  /**
   * Las tres casillas y el estado que se deriva de ellas.
   *
   * **El agotamiento 6 mata sin pasar por los PG** (SRD 5.1, nivel 6: *"Death"*; ficha C2C-9,
   * tarea 2.5.5). Va **antes** que la rama de los 0 PG porque no es un caso de esa rama: un
   * personaje con agotamiento 6 y los PG intactos está muerto igual, y hasta 2.5.5 la hoja lo
   * enseñaba en pie con la mitad de los Puntos de Golpe —el nivel 4 sí calculaba, así que el dato
   * estaba a la vista y su consecuencia no.
   */
  private estadoDeMuerte(
    character: FilaPersonaje,
    currentHpCrudo: number | null,
    nivelDeAgotamiento: number,
    /**
     * **Tarea 16 (H1b).** Hasta esta tarea, «estable» se leía de `successes >= 3` — y esos
     * contadores vuelven a cero al estabilizar (`rollDeathSave`), así que un `GET` posterior con
     * `successes: 0, failures: 0` no podía distinguir «está estable» de «acaba de caer a 0 PG y
     * todavía no ha tirado nada». Ahora lo dice la condición reservada `CLAVE_ESTABLE`
     * (`@dnd/shared`), que `hojaOMotivo` ya consulta junto al resto de condiciones vivas —ver su
     * comentario—, y `successes >= 3` deja de mirarse aquí.
     */
    stable: boolean,
  ): DeathState {
    const successes = character.deathSaveSuccesses;
    const failures = character.deathSaveFailures;
    let status: DeathState["status"] = "alive";
    if (muertoPorAgotamiento(nivelDeAgotamiento)) status = "dead";
    else if (currentHpCrudo === 0) {
      if (stable) status = "stable";
      else if (failures >= 3) status = "dead";
      else status = "dying";
    }
    return { successes, failures, status };
  }

  /**
   * La respuesta de lectura, compartida entre el `GET` y el retorno de cada mutación.
   *
   * **Clamp al leer, nunca al recalcular**: `hp.current` es `min(currentHp, maxHp)` con
   * `hp.exceedsMax` si el dato guardado se pasa; la fila no se reescribe aquí.
   */
  /**
   * El equipo **equipado**, ya resuelto. Lo que está en la mochila o guardado en la posada no
   * entra: solo lo puesto cambia un número, y esa es justo la línea que hace que equipar sea un
   * gesto con consecuencia visible.
   *
   * Una fila que no se puede resolver —una clave del SRD que el catálogo dejó de tener— **no
   * rompe la hoja**: sale como aviso, igual que una elección caduca. Un dato viejo no puede
   * volver ilegible un personaje.
   */
  private async equipoEquipado(
    userId: string,
    character: FilaPersonaje,
    /** El cliente de la transacción de quien llama, si hay una (ficha P2-0b). */
    tx?: Prisma.TransactionClient,
  ): Promise<{ items: ResolvedItem[]; warnings: DerivationWarning[] }> {
    const cliente = tx ?? this.prisma;
    const filas = await cliente.inventoryItem.findMany({
      where: { characterId: character.id, location: "EQUIPPED" },
      orderBy: { createdAt: "asc" },
    });
    if (filas.length === 0) return { items: [], warnings: [] };

    const viewer = await viewerFor(this.prisma, this.membership, userId, character.campaignId, tx);
    const items: ResolvedItem[] = [];
    const warnings: DerivationWarning[] = [];
    let ocultos = 0;

    for (const fila of filas) {
      try {
        const ref: ContentRefInput = fila.srdKey
          ? { source: "SRD", key: fila.srdKey }
          : { source: "CAMPAIGN", id: fila.campaignItemId as string };
        const { resolved, campaignItem } = await resolveContentRef(
          this.prisma,
          character.campaignId,
          ref,
          cliente,
        );
        // **La ranura que vale es la de la fila, no la del catálogo.** `findSrdItem` devuelve el
        // objeto con su ranura por defecto —toda arma dice `MAIN_HAND`—, así que dos dagas
        // equipadas, una en cada mano, llegaban al cuadro de ataques con la misma clave: dos
        // filas indistinguibles, `rollAttack` tirando siempre la primera y React repitiendo
        // `key`. Y sin la ranura real no se puede saber si la otra mano está ocupada, que es lo
        // que decide si un arma versátil puede empuñarse a dos manos.
        // HP-9a — **y la sintonización también es de la fila.** El catálogo no sabe quién lo
        // lleva; el motor (`rules/items.ts`, `efectosActivos`) decide con este campo si los
        // `effects` cuentan (SRD 5.1 §Attunement: sin sintonizar, solo lo mundano).
        const conRanura: ResolvedItem = {
          ...resolved,
          slot: fila.slot ?? resolved.slot,
          attuned: fila.attuned,
        };
        // Fix round 2 (R2) — **la MISMA función que usa `InventoryService.list()`**
        // (`filaComoLaVeElViewer`), para que el dueño de un objeto sin identificar cuyo
        // catálogo ya no le alcanza vea el mismo alias en la mochila, aquí, el cuadro de
        // ataques y la traza — antes de este arreglo, la hoja seguía llamando a `redactado()`
        // («Objeto oculto») para esa misma fila mientras el listado ya decía su alias: dos
        // nombres para lo mismo en la misma pantalla.
        const catalogo = campaignItem
          ? {
              visibility: campaignItem.visibility,
              createdById: campaignItem.createdById,
              grantedUserIds: campaignItem.grantedUserIds,
            }
          : null;
        const resultado = filaComoLaVeElViewer(
          conRanura,
          fila,
          catalogo,
          viewer,
          character.ownerId === userId,
        );
        const visto = resultado.visible ? resultado.item : redactado(conRanura, ++ocultos);
        items.push(visto);
        // HP-9a — la hoja dice **por qué** el número no se movió. Solo cuando había algo que
        // dejara de contar: un objeto sintonizable sin `effects` no cambia ningún número, y
        // avisar sería ruido. El predicado es el de la puerta (`rules/items.ts`,
        // `sintonizacionPendiente`), no una copia a mano: aviso y filtro no pueden discrepar.
        // Se usa `visto`, ya redactado o con su alias, para no delatar por el aviso el nombre
        // que la fila acaba de esconder.
        if (sintonizacionPendiente(visto)) {
          warnings.push({
            code: "item_not_attuned",
            key: visto.ref,
            data: { ref: visto.ref, name: visto.name },
          });
        }
      } catch {
        warnings.push({
          code: "item_unresolved",
          // **La clave no se manda si quien mira no puede ver el objeto**: sería el
          // identificador de algo que el listado del inventario le acaba de esconder.
          key: fila.srdKey ?? "objeto",
          data: { rowId: fila.id },
        });
      }
    }
    return { items, warnings };
  }

  /**
   * El cuadro de ataques: qué se tira con cada arma equipada, con su bono **y su traza**.
   *
   * Vive aquí y no en la pantalla porque es una regla del juego —qué característica ataca con
   * qué arma, y si hay competencia— y las reglas del juego se calculan en el servidor. La web
   * pinta lo que le llega; la tirada la pide, no la hace.
   */
  private ataques(
    sheet: CharacterSheet,
    items: ResolvedItem[],
  ): { attacks: Attack[]; warnings: DerivationWarning[] } {
    const abilityMods = {} as Record<AbilityKey, number>;
    for (const clave of ["str", "dex", "con", "int", "wis", "cha"] as AbilityKey[]) {
      abilityMods[clave] = sheet.derived[`abilityMod.${clave}`]?.total ?? 0;
    }
    // **Las de la clase Y las de la raza.** Esto leía solo la clase, y un clérigo enano con
    // hacha de batalla veía «Sin competencia» en rojo sobre su propia arma: el «Entrenamiento de
    // combate enano» era texto sin efecto. Lo encontró la auditoría de mecánica de 2B.
    const weaponProficiencies = sheet.weaponProficiencies;
    return buildAttacks({
      items: items.filter((item) => item.weapon),
      abilityMods,
      proficiencyBonus: sheet.derived.proficiencyBonus.total,
      weaponProficiencies,
    });
  }

  /**
   * **`tx` opcional, el mismo patrón que el resto** (ficha P2-8). Redactar la respuesta lee el
   * equipo equipado y resuelve el visor, exactamente igual que derivar la hoja, así que quien la
   * pide desde dentro de una transacción abierta tiene que pasarle su cliente. Hasta el
   * 2026-09-07 no lo aceptaba: `changeHp` con `tx` cerraba su camino feliz abriendo una conexión
   * más solo para escribir lo que iba a devolver.
   */
  private async buildResponse(
    userId: string,
    character: FilaPersonaje,
    tx?: Prisma.TransactionClient,
  ) {
    const equipo = await this.equipoEquipado(userId, character, tx);
    const resultado = await this.hojaOMotivo(
      await viewerFor(this.prisma, this.membership, userId, character.campaignId, tx),
      character,
      equipo.items,
      tx,
    );
    let sheet: CharacterSheet | null = "sheet" in resultado ? resultado.sheet : null;
    const reason: string | undefined = "reason" in resultado ? resultado.reason : undefined;

    // Los ataques y los avisos del equipo se juntan con los del motor: para quien mira la hoja
    // son la misma cosa —«hay algo que querrías saber»— y dejar que cada pantalla los junte por
    // su cuenta es cómo una de las dos listas acaba sin pintarse.
    let attacks: Attack[] = [];
    if (sheet) {
      const cuadro = this.ataques(sheet, equipo.items);
      attacks = cuadro.attacks;
      sheet = { ...sheet, warnings: [...sheet.warnings, ...equipo.warnings, ...cuadro.warnings] };
    }

    const maxHp = sheet ? sheet.derived.maxHp.total : null;
    const currentHpCrudo = character.currentHp ?? maxHp;
    const currentHpMostrado =
      maxHp !== null && currentHpCrudo !== null ? Math.min(currentHpCrudo, maxHp) : currentHpCrudo;
    const exceedsMax = maxHp !== null && currentHpCrudo !== null ? currentHpCrudo > maxHp : false;

    // **La fila entera NO sale cuando los números son del DM** (D-A-2, 2026-09-06).
    //
    // `npcs.service.ts` copia las características del statblock a la fila de `Character` al
    // instanciar —D-2D-2, «un PNJ en la mesa es una fila de `Character`»— y esto devolvía esa fila
    // **en la misma respuesta que decía que sus números no eran públicos**: con las seis
    // características se reconstruyen los seis modificadores de salvación, los dieciocho de
    // habilidad y la iniciativa. Las dos piezas eran correctas por separado.
    //
    // **Los PG actuales sí se ven, y es la mitad que no hay que pasarse de celo en ocultar:**
    // saber que un enemigo está malherido se ve en la ficción y es información legítima de mesa;
    // su hoja no lo es.
    const personajeQueSale =
      "numerosOcultos" in resultado && resultado.numerosOcultos
        ? {
            ...character,
            str: null,
            dex: null,
            con: null,
            int: null,
            wis: null,
            cha: null,
          }
        : character;

    return {
      character: personajeQueSale,
      sheet,
      attacks,
      /** La bolsa, para que la hoja no tenga que pedirla aparte. */
      money: {
        cp: character.cp,
        sp: character.sp,
        ep: character.ep,
        gp: character.gp,
        pp: character.pp,
      },
      ...(sheet ? {} : { reason }),
      hp: {
        current: currentHpMostrado,
        max: maxHp,
        temp: character.tempHp,
        version: character.version,
        exceedsMax,
      },
      deathSaves: this.estadoDeMuerte(
        character,
        currentHpCrudo,
        resultado.exhaustion,
        resultado.stable,
      ),
    };
  }

  /**
   * La sesión en curso de la campaña, o `null` si no hay ninguna abierta.
   *
   * **Por qué existe.** Un DM dirigiendo una partida de prueba descubrió que el combate entero
   * —daño, curación, salvaciones de muerte— se grababa con `sessionId: null` aunque la sesión
   * estuviera en curso, así que `GET /events?sessionId=…` devolvía dos de diecinueve sucesos: el
   * filtro por sesión existía y salía vacío. El estado mutable **no** sabe en qué sesión ocurre;
   * lo averigua aquí, igual que hace `RollsService` con las tiradas. Sin sesión abierta el
   * suceso queda fuera de sesión, que es un estado legítimo (se juega también sin haber pulsado
   * «empezar»).
   */
  private async sesionActiva(
    campaignId: string,
    tx: Prisma.TransactionClient,
  ): Promise<string | null> {
    const enCurso = await tx.session.findFirst({
      where: { campaignId, status: "IN_PROGRESS" },
      select: { id: true },
    });
    return enCurso?.id ?? null;
  }

  async getSheet(userId: string, campaignId: string, characterId: string) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await viewerFor(this.prisma, this.membership, userId, campaignId);
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, campaignId },
    });
    if (!character || !this.canSee(viewer, character)) {
      throw new NotFoundException("Character not found");
    }
    const respuesta = await this.buildResponse(userId, character);
    // Spec §4 de «PNJ del mundo y la mesa»: la hoja devuelve la fila entera, y el enlace con la
    // ficha del mundo solo viaja a quien puede ver la ficha.
    const enlacesVisibles = await entityIdsVisibleFor(this.prisma, viewer, [character.entityId]);
    respuesta.character = conEntityIdVisible(respuesta.character, enlacesVisibles);
    const derivado = await this.loQueDerivanLasCondiciones(character, respuesta.sheet);

    // Puerta de efectos §5 bis (E-PE-10, D-CF-68/D-CF-69). **Solo en modo `XP`**: con `HITO` —el
    // defecto, para que una campaña que ya existe no cambie (D-CF-53)— la hoja no enseña un
    // marcador que no significa nada. Mismo helper que `updateSheet` para leer la regla. **Y
    // nunca para un PNJ de statblock** (D-CF-69): no acumula XP —`XpService.award` lo rechaza—,
    // así que su hoja no enseña un marcador a cero ni gasta la consulta a la campaña.
    const campaign = character.statblockRef
      ? null
      : await this.prisma.campaign.findUnique({
          where: { id: campaignId },
          select: { tableRules: true },
        });
    const regla = tableRulesSchema.parse(campaign?.tableRules ?? {});
    const xp =
      campaign && regla.progresion === "XP"
        ? {
            actual: character.xp,
            siguiente: umbralDeNivel(character.level + 1),
            nivelPorXp: nivelPorXp(character.xp),
          }
        : undefined;

    return {
      ...respuesta,
      sheet:
        respuesta.sheet && derivado.encumbranceWarnings.length > 0
          ? {
              ...respuesta.sheet,
              warnings: [...respuesta.sheet.warnings, ...derivado.encumbranceWarnings],
            }
          : respuesta.sheet,
      effectiveSpeeds: derivado.effectiveSpeeds,
      rollSuggestions: derivado.rollSuggestions,
      ...(xp ? { xp } : {}),
    };
  }

  /**
   * El modificador de iniciativa: la prueba de Destreza que el motor **ya deriva**
   * (`derived.initiative`, `rules/engine.ts`), no una segunda fórmula escrita a mano.
   *
   * Tarea 2.5.2 — el orden de turnos tira con esto. Sirve igual para un jugador que para un PNJ
   * instanciado: los dos pasan por `construirODenegar`, que ya sabe leer el statblock cuando
   * hace falta.
   */
  async getInitiativeModifier(
    userId: string,
    campaignId: string,
    characterId: string,
  ): Promise<number> {
    await this.membership.requireMember(campaignId, userId);
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, campaignId },
    });
    if (!character) throw new NotFoundException("Character not found");
    const sheet = await this.construirODenegar(userId, character);
    return sheet.derived.initiative.total;
  }

  /**
   * Lo que las condiciones vivas derivan para la hoja: **las velocidades y la sugerencia de modo
   * de tirada** (2.5.5), las dos con su porqué.
   *
   * Van juntas porque salen de la misma lectura —las condiciones del personaje y el reloj de la
   * campaña— y separarlas era pagar dos veces la misma consulta para responder a la misma
   * pregunta: «¿qué te está pasando ahora mismo?».
   *
   * **La sugerencia no abre ninguna puerta nueva**: se calcula sobre las condiciones de un
   * personaje que quien pregunta ya puede ver (`getSheet` comprueba `canSee` antes), y nombra
   * exactamente las mismas claves que ya viajaban en la traza de `effectiveSpeeds`. Un PNJ que no
   * se ve sigue sin verse, con esto y sin esto.
   *
   * **Vive aquí y no en la pantalla.** La primera versión de la hoja calculaba esto en el
   * navegador, copiando letra por letra `effectiveSpeed` porque ningún endpoint la exponía: dos
   * copias de una regla del juego que se separan en cuanto una de las dos se toca. La regla vive
   * una sola vez, igual que la matriz de visibilidad vive una sola vez en `canView`.
   *
   * Solo en la lectura: las mutaciones de PG devuelven el estado que cambian, y el navegador
   * relee la hoja. Añadir esta consulta dentro de sus transacciones sería pagarla en el camino
   * caliente para un dato que ninguna de ellas mueve.
   */
  private async loQueDerivanLasCondiciones(
    character: FilaPersonaje,
    sheet: CharacterSheet | null,
  ): Promise<{
    effectiveSpeeds: Record<string, EffectiveSpeedResult>;
    rollSuggestions: RollSuggestions;
    encumbranceWarnings: DerivationWarning[];
  }> {
    const characterId = character.id;
    const campaignId = character.campaignId;
    // **Solo las que siguen vivas** (2C.4): una condición vencida sigue en la hoja, marcada, pero
    // ya no calcula nada. Filtrar aquí es lo que impide que la caducidad dependa de que alguien
    // haya abierto la pantalla de condiciones.
    const [todas, campana] = await Promise.all([
      this.prisma.characterCondition.findMany({
        where: { characterId },
        select: { key: true, level: true, expiresAtClock: true, expiryEdge: true },
      }),
      this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } }),
    ]);
    const conditions = condicionesActivas(todas, campana.clockSeconds);

    // Migración 6 (D-CF-16, tickets I4/M2B-5) — SRD 5.1, Variant: Encumbrance, con interruptor
    // por campaña (`encumbranceVariant`) apagado por defecto: con él apagado, o sin Fuerza
    // asignada todavía, no se calcula nada — ni un solo paso nuevo en la traza.
    let encumbrance: EncumbranceLevel | null = null;
    if (campana.encumbranceVariant && character.str != null) {
      const pesoLlevadoOz = await this.pesoLlevado(character);
      // SRD 5.1, Variant: Encumbrance: por encima de 5×Fuerza (en libras) → cargado, la velocidad
      // baja 10 pies; por encima de 10×Fuerza → muy cargado, baja 20 pies y hay desventaja en
      // pruebas, ataques y salvaciones de Fuerza, Destreza o Constitución. Fix round 1 (BAJA-1):
      // los umbrales viven en `inventory/common/encumbrance.ts`, y no repetidos a mano aquí —
      // es la misma fórmula que ahora también expone `InventoryService.list()` para el panel de
      // carga. `estadoDeSobrecarga` devuelve `"none"` cuando no llega a ningún umbral; aquí eso
      // se traduce a `null`, que es lo que entiende `effectiveSpeed`.
      const estado = estadoDeSobrecarga(pesoLlevadoOz, character.str);
      encumbrance = estado === "none" ? null : estado;
    }

    const effectiveSpeeds: Record<string, EffectiveSpeedResult> = {};
    // Las velocidades necesitan una base que solo la hoja da; la sugerencia de modo **no**, y por
    // eso sale igual cuando no hay hoja: un personaje a medio crear con la condición «apresado»
    // puesta sigue tirando en la mesa.
    for (const [movimiento, pies] of Object.entries(sheet?.speeds ?? {})) {
      if (typeof pies === "number") {
        effectiveSpeeds[movimiento] = effectiveSpeed(pies, conditions, encumbrance);
      }
    }

    // La desventaja de "muy cargado" se anota como una condición viva más (`CLAVE_MUY_CARGADO`,
    // `@dnd/shared`) en vez de una rama aparte en `rollSuggestionsFor`: es exactamente la misma
    // forma —una clave y, si hiciera falta, un nivel— y así el motor de sugerencias no necesita
    // saber que la sobrecarga existe, solo reconocer una clave más (`suggested-roll-mode.ts`).
    const condicionesParaTiradas =
      encumbrance === "heavily" ? [...conditions, { key: CLAVE_MUY_CARGADO }] : conditions;

    const encumbranceWarnings: DerivationWarning[] =
      encumbrance != null ? [{ code: `encumbrance.${encumbrance}` }] : [];

    return {
      effectiveSpeeds,
      rollSuggestions: rollSuggestionsFor(condicionesParaTiradas),
      encumbranceWarnings,
    };
  }

  /**
   * El peso llevado de verdad (equipado o en la mochila, nunca lo guardado), para la sobrecarga
   * (migración 6). **Misma fórmula que `InventoryService.list()`** (`carriedWeightOz`,
   * `inventory/common/weight.ts`) — vive una sola vez para que la ficha y la pantalla de
   * inventario nunca calculen dos pesos distintos para el mismo personaje.
   *
   * Una fila que ya no se puede resolver —una clave del SRD que el catálogo dejó de tener— no
   * aporta peso ni rompe la hoja: el mismo criterio que `equipoEquipado` con `item_unresolved`.
   */
  private async pesoLlevado(character: FilaPersonaje): Promise<number> {
    const filas = await this.prisma.inventoryItem.findMany({
      where: { characterId: character.id, location: { not: "STORED" } },
    });
    const resueltas: { row: InventoryItem; resolved: ResolvedItem }[] = [];
    for (const fila of filas) {
      try {
        const ref: ContentRefInput = fila.srdKey
          ? { source: "SRD", key: fila.srdKey }
          : { source: "CAMPAIGN", id: fila.campaignItemId as string };
        const { resolved } = await resolveContentRef(this.prisma, character.campaignId, ref);
        resueltas.push({ row: fila, resolved });
      } catch {
        // Objeto ya no resoluble: no pesa nada aquí. `equipoEquipado` ya avisa por su lado
        // (`item_unresolved`) cuando la fila en cuestión está equipada.
      }
    }
    return carriedWeightOz(resueltas, character);
  }

  /**
   * Valida una referencia de catálogo contra el borde: aquí una clave que no existe **sí** es
   * un 400, al contrario que al derivar una fila ya guardada — es la diferencia entre un dato
   * caduco (2A.3) y una entrada que se rechaza antes de guardarse.
   */
  async updateSheet(
    userId: string,
    campaignId: string,
    characterId: string,
    input: UpdateCharacterSheetInput,
  ) {
    await this.membership.requireMember(campaignId, userId);
    const character = await this.characters.requireEditable(userId, campaignId, characterId);

    // Reglas de la mesa (D-CF-53): lo que el DM decidió antes de que nadie hiciera su hoja.
    // `{}` por defecto — una campaña que nunca tocó esta columna no cambia de comportamiento.
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { tableRules: true },
    });
    // E-RM-16: un PNJ instanciado (`statblockRef` no nulo, ver el comentario en
    // `schema.prisma`) es del DM, no nace en la mesa — ve las reglas por defecto siempre, así
    // que MATRIZ/PUNTOS/DADOS, "las seis juntas" y `comprobarPermitido` no le aplican.
    const regla = character.statblockRef
      ? tableRulesSchema.parse({})
      : tableRulesSchema.parse(campaign?.tableRules ?? {});

    const data: Record<string, unknown> = {};
    // El intento de dados que hay que marcar `chosen: true` si la escritura llega a completarse
    // — se fija DENTRO de la misma transacción que el resto, para que un personaje no pueda
    // acabar con las características guardadas y el intento sin marcar (o al revés).
    let intentoAFijar: string | null = null;
    if (input.abilities) {
      const seisEnviadas = ORDEN_DE_CARACTERISTICAS.filter(
        (k) => input.abilities![k] !== undefined,
      );
      // RM-2 (2026-09-17): un `attemptId` solo significa algo con dados. Con MATRIZ, PUNTOS o
      // LIBRE seguía llegando a `requireAttempt` y marcaba `chosen` un intento de una regla
      // anterior — una fila caduca que después bloqueaba al dueño («Las características se
      // fijaron con dados») en una mesa que ya no tira. Ola de arreglos final (menor #6): esta
      // puerta vivía DENTRO del `if (metodo !== "LIBRE")` de abajo, así que LIBRE + `attemptId`
      // se colaba sin el 400 que el plan pedía para «cualquier método que no sea DADOS».
      if (regla.abilities.metodo !== "DADOS" && input.attemptId) {
        throw new BadRequestException(
          "Con esta regla las características no se tiran con dados: manda las seis sin attemptId.",
        );
      }
      if (regla.abilities.metodo !== "LIBRE") {
        // Reglas de la mesa (E-RM-13, ronda 1 de arreglos): con dados y un intento ya elegido,
        // las seis están fijadas — y `OVERRIDABLE_KEYS` **no tiene `ability.*`**, así que
        // «el DM arbitra con `overrides`» era una puerta que no existía: el DM se topaba con el
        // mismo 400 que el dueño. La puerta real es esta misma ruta: sin `attemptId` y sin
        // comprobar contra el intento —es arbitraje, no una tirada más—, pero las seis siguen
        // yendo juntas (la regla de «se fijan juntas» no se releja para nadie).
        //
        // Ola de arreglos 1 (I-1): el intento elegido se busca **siempre** que la regla sea DADOS
        // y lleguen características, con o sin `attemptId`. Hasta este arreglo la comprobación
        // solo corría sin `attemptId`, así que con `intentos ≥ 2` el dueño elegía el 1 y luego
        // mandaba el id del 2: `requireAttempt` lo encontraba libre, los valores encajaban, y las
        // seis se sobrescribían — «quedan fijados» era mentira, y pisaba el arbitraje del DM.
        let arbitrajeDelDM = false;
        if (regla.abilities.metodo === "DADOS") {
          const elegido = await this.prisma.abilityRollAttempt.findFirst({
            where: { characterId, chosen: true },
          });
          if (elegido) {
            const membresia = await this.membership.getMembership(campaignId, userId);
            if (membresia?.role !== "DM") {
              throw new BadRequestException(
                "Las características se fijaron con dados; solo el DM puede cambiarlas.",
              );
            }
            // El arbitraje es corregir las seis, no elegir otro intento: con uno ya elegido, un
            // `attemptId` no tiene ningún significado que el servidor pueda honrar.
            if (input.attemptId) {
              throw new BadRequestException(
                "Ya hay un intento elegido: para corregir las seis, mándalas sin attemptId.",
              );
            }
            arbitrajeDelDM = true;
          }
        }
        if (seisEnviadas.length !== 6) {
          throw new BadRequestException(
            "Con esta regla las seis características se fijan juntas: manda las seis a la vez.",
          );
        }
        if (!arbitrajeDelDM) {
          const seis = Object.fromEntries(
            ORDEN_DE_CARACTERISTICAS.map((k) => [k, input.abilities![k]!]),
          ) as Record<AbilityKey, number>;
          const intento = input.attemptId
            ? await this.abilityRolls.requireAttempt(characterId, input.attemptId)
            : undefined;
          if (intento?.chosen) throw new BadRequestException("Ese intento ya se eligió.");
          validarCaracteristicas(
            regla.abilities,
            seis,
            intento ? { values: intento.values as number[] } : undefined,
          );
          if (intento) intentoAFijar = intento.id;
        }
      }
      for (const clave of ORDEN_DE_CARACTERISTICAS) {
        const valor = input.abilities[clave];
        if (valor !== undefined) data[clave] = valor;
      }
    }

    try {
      if (input.race !== undefined) {
        const raceKey = claveSrd(input.race);
        const raza = findRace(input.race);
        comprobarPermitido(regla.permitidos.razas, raceKey, raza.name, "raza");
        data.raceKey = raceKey;
      }
      if (input.subrace !== undefined) {
        if (input.subrace === null) {
          data.subraceKey = null;
        } else {
          const subraceKey = claveSrd(input.subrace);
          const raceKeyEfectiva = (data.raceKey as string | undefined) ?? character.raceKey;
          if (!raceKeyEfectiva)
            throw new BadRequestException("No se puede fijar una subraza sin raza.");
          findSubrace(findRace({ source: "SRD", key: raceKeyEfectiva }), input.subrace);
          data.subraceKey = subraceKey;
        }
      }
      if (input.class !== undefined) {
        const classKey = claveSrd(input.class);
        const clase = findClass(input.class);
        comprobarPermitido(regla.permitidos.clases, classKey, clase.name, "clase");
        data.classKey = classKey;
        // **Cambiar de clase borra la subclase**, con el mismo motivo que cambiar de raza borra
        // la subraza: un bárbaro que pasa a ser guerrero no puede seguir teniendo "berserker"
        // guardado. Si `input.subclass` también viene en este cuerpo, la rama de abajo lo
        // sobrescribe después con el valor bueno.
        data.subclassKey = null;
      }
      if (input.subclass !== undefined) {
        if (input.subclass === null) {
          data.subclassKey = null;
        } else {
          const subclassKey = claveSrd(input.subclass);
          const classKeyEfectiva = (data.classKey as string | undefined) ?? character.classKey;
          if (!classKeyEfectiva)
            throw new BadRequestException("No se puede fijar una subclase sin clase.");
          const clase = findClass({ source: "SRD", key: classKeyEfectiva });
          const subclase = clase.subclasses.find((s) => s.key === subclassKey);
          if (!subclase)
            throw new BadRequestException("Esa subclase no pertenece a la clase del personaje.");
          comprobarPermitido(regla.permitidos.subclases, subclassKey, subclase.name, "subclase");
          data.subclassKey = subclassKey;
        }
      }
    } catch (error) {
      if (error instanceof UnknownContentError) throw new BadRequestException(error.message);
      throw error;
    }

    // D-CF-66: el nivel lo fija el DM, nunca el dueño desde este endpoint. Solo se comprueba
    // cuando `level` viene en el cuerpo — el resto de campos del dueño siguen funcionando igual.
    if (input.level !== undefined) {
      const membresia = await this.membership.getMembership(campaignId, userId);
      if (membresia?.role !== "DM") {
        throw new ForbiddenException(
          "El nivel lo fija el DM: se sube con «Subir de nivel» cuando el DM lo lance.",
        );
      }
      data.level = input.level;
    }
    if (input.choices !== undefined) data.choices = input.choices;

    // **Se valida ANTES de guardar, contra la ficha que quedaría.**
    //
    // Dos fallos vivos que cerró una auditoría del 2026-09-02, los dos del mismo tipo —media
    // función construida— y los dos visibles solo por HTTP:
    //
    // 1. `InvalidChoiceError` no lo capturaba nadie. `derivarOMotivo` solo traduce
    //    `UnknownContentError` e `InvalidEquipmentError`; el resto sube. Así que mandar dos
    //    veces la misma habilidad en `choices` daba un **500**, no un 400 con su motivo.
    // 2. Una clave de concesión inventada se guardaba en silencio. Al derivar es un aviso a
    //    propósito —un dato caduco no puede volver ilegible un personaje— pero **al escribir es
    //    un error**, y así estaba escrito en `resolve.ts` desde 2A.4 esperando a que alguien lo
    //    llamara. La diferencia entre las dos mitades es justo esta: se rechaza lo que llega en
    //    ESTA petición, y lo que ya estaba guardado sigue siendo un aviso.
    const prospectivo = { ...character, ...data } as FilaPersonaje;
    const { items: equipoActual } = await this.equipoEquipado(userId, prospectivo);
    const construido = construirBuild(prospectivo, equipoActual);
    if ("build" in construido) {
      let hoja: CharacterSheet | null = null;
      try {
        hoja = deriveCharacter(construido.build, modificadoresDeAnulacion(prospectivo));
      } catch (error) {
        if (error instanceof InvalidChoiceError) throw new BadRequestException(error.message);
        // **Lo demás NO se convierte en 400 aquí, y esa distinción la encontró una prueba.**
        // Una referencia de catálogo mala que llegue en ESTA petición ya se rechaza arriba con
        // `findRace`/`findClass`. Si la derivación falla igualmente, es por un dato **ya
        // guardado** —una subraza que quedó huérfana al cambiar de raza—, y rechazar por eso
        // dejaría al personaje imposible de editar, **incluida la edición que lo arreglaría**.
        // Ese caso ya tiene su camino: `buildResponse` lo devuelve como `reason` y la pantalla
        // lo enseña. Un dato viejo no es una entrada inválida.
        if (!(error instanceof UnknownContentError || error instanceof InvalidEquipmentError))
          throw error;
      }
      if (hoja && input.choices) {
        // **`choices` se sustituye entera, no se fusiona** (`data.choices = input.choices`), así
        // que dentro de este `if` todo aviso `stale_choice` viene por fuerza de ESTA petición.
        // La primera versión filtraba además por «¿venía en el cuerpo?», y una mutación demostró
        // que ese filtro no podía ponerse rojo: era código muerto fingiendo ser una salvaguarda.
        const desconocida = hoja.warnings.find((a) => a.code === "stale_choice");
        if (desconocida) {
          throw new BadRequestException(
            `La elección «${desconocida.key}» no corresponde a ninguna concesión de esta ficha.`,
          );
        }
      }
    }

    // Reglas de la mesa (E-RM-2): la primera vez que el personaje tiene clase se resuelven los PG
    // de los niveles 2..N y el oro inicial, una sola vez. Un cambio de clase posterior no los
    // toca — es la lectura literal de `character.classKey === null`: solo pasa por aquí quien
    // hasta este momento NO tenía clase.
    const sucesosDeNacimiento: Array<Parameters<GameEventsService["record"]>[2]> = [];
    if (character.classKey === null && typeof data.classKey === "string") {
      const clase = findClass({ source: "SRD", key: data.classKey });
      const nivel = (data.level as number | undefined) ?? character.level;
      const pg = pgDeLosNivelesSiguientes(
        clase.hitDie,
        nivel,
        regla.pgNivelesSiguientes,
        this.roller,
      );
      if (pg) {
        data.hitPointsPerLevel = pg.valores;
        sucesosDeNacimiento.push(
          ...pg.tiradas.map((t) =>
            this.sucesoDeTirada(characterId, character.visibility, t, "Puntos de golpe al nacer"),
          ),
        );
      }
      const oro = oroInicialDe(regla.oroInicial, clase, this.roller);
      if (oro) {
        data.gp = { increment: oro.gp };
        if (oro.tirada) {
          sucesosDeNacimiento.push(
            this.sucesoDeTirada(characterId, character.visibility, oro.tirada, "Oro inicial"),
          );
        }
        sucesosDeNacimiento.push({
          subjectType: "character",
          subjectId: characterId,
          visibility: character.visibility,
          payload: {
            type: "MONEY_CHANGED",
            gp: oro.gp,
            reason:
              regla.oroInicial.modo === "ORO_TABLA"
                ? "Oro inicial (tabla del SRD)"
                : "Oro inicial (fijado por el DM)",
          },
        });
      }
    }

    // **La escritura entera va en una transacción**: la ficha, el intento de dados que se marca
    // `chosen` y los sucesos de nacimiento son un solo gesto de mesa — a medias sería un personaje
    // con las características guardadas y el intento libre para volver a tirarse, o con oro sin
    // su línea en el registro.
    //
    // Ola de arreglos 1 (M-2): **fijar un intento va bajo el candado de la fila del personaje**
    // (`SELECT … FOR UPDATE`, la misma forma que `level-up.service.ts`), y la marca exige
    // `chosen: false` en el `where`. Sin el candado, dos pestañas eligiendo dos intentos distintos
    // leían «ninguno elegido» fuera de la transacción (Postgres corre en READ COMMITTED) y las dos
    // escribían: dos `chosen: true` para el mismo personaje. El candado pone a la segunda en fila
    // detrás de la primera; la relectura de abajo, ya bajo candado, ve lo que la primera dejó.
    // `AbilityRollsService.roll` toma el mismo candado (M-1), así que tirar y fijar también se
    // serializan entre sí. Los `values` del intento no se releen: una fila de intento no cambia
    // nunca salvo en `chosen`, y eso es justo lo que se vuelve a mirar aquí.
    const actualizado = await this.prisma.transaction(async (tx) => {
      if (intentoAFijar) {
        await tx.$queryRaw`SELECT id FROM "Character" WHERE id = ${characterId} FOR UPDATE`;
        const yaElegido = await tx.abilityRollAttempt.findFirst({
          where: { characterId, chosen: true },
          select: { id: true },
        });
        if (yaElegido) {
          throw new ConflictException({
            code: "ATTEMPT_ALREADY_CHOSEN",
            message: "Ya se eligió un intento para este personaje.",
          });
        }
      }
      const fila = await tx.character.update({ where: { id: characterId }, data });
      if (intentoAFijar) {
        const marcado = await tx.abilityRollAttempt.updateMany({
          where: { id: intentoAFijar, chosen: false },
          data: { chosen: true },
        });
        if (marcado.count !== 1) {
          throw new ConflictException({
            code: "ATTEMPT_ALREADY_CHOSEN",
            message: "Ese intento ya se eligió.",
          });
        }
      }
      for (const suceso of sucesosDeNacimiento) {
        await this.events.record(userId, campaignId, suceso, tx);
      }
      return fila;
    });
    const respuesta = await this.buildResponse(userId, actualizado);
    await this.sembrarRecursos(characterId, respuesta.sheet, actualizado.level);
    // PM-1 (cierre, 2026-09-14): respuesta de mutación, no una de las seis lecturas que redactan
    // el enlace con la ficha del mundo — el campo no viaja.
    return sinEntityIdEnRespuesta(respuesta);
  }

  /**
   * El mismo desglose que ya escribe `AbilityRollsService.roll`, envuelto en un `GameEvent` de
   * tipo `ABILITY_ROLL` con `reason` propio. Se usa aquí para los PG y el oro que nacen con la
   * clase — dos hechos de mesa más, con la misma visibilidad que ya tiene el personaje (no la
   * `OWNER_DM` fija de las seis características: nacer con 8 PG no es un secreto entre dados).
   */
  private sucesoDeTirada(
    characterId: string,
    visibility: Visibility,
    resultado: DiceRollResult,
    reason: string,
  ): Parameters<GameEventsService["record"]>[2] {
    return {
      subjectType: "character",
      subjectId: characterId,
      visibility,
      payload: {
        type: "ABILITY_ROLL",
        ...desgloseDeTirada(resultado),
        natural: "NONE",
        outcome: "NO_DC",
        reason,
      },
    };
  }

  /**
   * Los dados de golpe y los espacios de conjuro que la clase implica.
   *
   * **Esto faltaba y era un agujero real, no una mejora**: `ResourcesService.seedResourcesFor`
   * existía desde 2A.8 con su prueba, y no lo llamaba nadie —lo encontró la revisión de la
   * pantalla de la hoja al ver que el panel de recursos salía vacío para todos los personajes—.
   * Sin esto, un guerrero de nivel 5 no tenía dados de golpe que gastar en un descanso corto y
   * un mago no tenía espacios: dos mecánicas centrales que la interfaz pintaba como «vacío».
   *
   * Se llama **al terminar la ficha, no al crear el personaje**, porque al crearlo todavía no
   * hay clase ni nivel de los que sembrar nada. Es idempotente (`upsert`), así que repetirlo en
   * cada edición sube el tope si el nivel subió y deja en paz lo ya gastado.
   */
  private async sembrarRecursos(
    characterId: string,
    sheet: CharacterSheet | null,
    level: number,
  ): Promise<void> {
    if (!sheet || !this.resources) return;
    await this.resources.seedResourcesFor(characterId, sheet, level);
  }

  /**
   * **La ayuda recibida: mira si está viva, y si lo está la consume** (plan 08, ficha I8).
   *
   * SRD 5.1, acción Ayudar: *«the first attack roll is made with advantage»* — **una sola tirada**,
   * aunque el ayudado tenga varios ataques. Por eso esto no es solo una lectura: la marca se retira
   * al usarla, y el segundo ataque del mismo turno ya no la tiene.
   *
   * **Se llama después de tirar, no antes**, y es deliberado: si la tirada se rechaza —una
   * expresión inválida, un 409 de inspiración—, la ayuda no se ha usado y tiene que seguir ahí. El
   * precio es que el borrado va fuera de la transacción de la tirada; si fallara, quedaría una
   * ayuda de más, que es el lado seguro del error —se ve en la hoja y se quita— frente a perder una
   * ayuda que nadie usó.
   *
   * Las vencidas no cuentan: se filtran contra el reloj como en todas partes (2C.4).
   */
  private async ayudaViva(
    campaignId: string,
    characterId: string,
  ): Promise<{ id: string; note: string | null } | null> {
    const [fila, campana] = await Promise.all([
      this.prisma.characterCondition.findUnique({
        where: { characterId_key: { characterId, key: CLAVE_AYUDA } },
        select: {
          id: true,
          note: true,
          key: true,
          level: true,
          expiresAtClock: true,
          expiryEdge: true,
        },
      }),
      this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } }),
    ]);
    if (!fila) return null;
    if (condicionesActivas([fila], campana.clockSeconds).length === 0) return null;
    return { id: fila.id, note: fila.note };
  }

  /** Retira la marca y lo cuenta, para que el ayudado vea POR QUÉ dejó de tenerla. */
  private async consumirAyuda(
    userId: string,
    campaignId: string,
    characterId: string,
    visibility: Visibility,
    ayuda: { id: string },
  ): Promise<void> {
    await this.prisma.transaction(async (tx) => {
      await tx.characterCondition.delete({ where: { id: ayuda.id } });
      await this.events.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          subjectId: characterId,
          visibility,
          payload: {
            type: "CONDITION_REMOVED",
            key: CLAVE_AYUDA,
            reason: "Se usó en el ataque",
          },
        },
        tx,
      );
    });
  }

  /**
   * Fija una anulación manual sobre un valor derivado. **Solo el DM.**
   *
   * Y esa restricción es la que da sentido a la función: una anulación que el dueño del
   * personaje puede escribir por su cuenta no es una anulación, es un campo libre donde poner
   * la CA que a uno le apetezca. El DM decide, y queda escrito en el log de la partida con el
   * valor anterior al lado, porque un número que cambia sin rastro es exactamente lo que esta
   * aplicación existe para evitar.
   */
  async setOverride(
    userId: string,
    campaignId: string,
    characterId: string,
    target: OverridableKey,
    input: SetOverrideInput,
  ) {
    await this.membership.requireDM(campaignId, userId);
    // **El rango depende de QUÉ se anula, y eso viaja en la URL**, así que ningún esquema del
    // cuerpo puede comprobarlo: es una regla de negocio, como «solo el DM». La tabla vive una sola
    // vez, en `@dnd/shared` (ficha P2).
    const rango = RANGO_DE_ANULACION[target];
    if (input.value < rango.min || input.value > rango.max) {
      throw new BadRequestException(
        `Una anulación de «${target}» va de ${rango.min} a ${rango.max}; llegó ${input.value}.`,
      );
    }
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, campaignId },
    });
    if (!character) throw new NotFoundException("Character not found");

    const actuales = { ...((character.overrides ?? {}) as Overrides) };
    const previous = actuales[target];
    // Ticket J7 (2026-09-11) — toda escritura NUEVA guarda el objeto, con el motivo solo cuando
    // viene no vacío tras recortar espacios. Las filas legadas (un número a secas) no se
    // reescriben por su cuenta: esta es la escritura de esta anulación, no una migración de las
    // demás claves del mapa.
    const motivo = input.reason?.trim();
    actuales[target] = motivo ? { value: input.value, reason: motivo } : { value: input.value };

    const actualizado = await this.prisma.character.update({
      where: { id: characterId },
      data: { overrides: actuales },
    });
    await this.events.record(userId, campaignId, {
      subjectType: "character",
      subjectId: characterId,
      visibility: character.visibility,
      payload: {
        type: "MANUAL_OVERRIDE_SET",
        target,
        value: input.value,
        // El log del evento es siempre un número (`game-event.schema.ts`): `normalizeOverride`
        // es lo que sabe leer una fila legada o ya migrada sin que este sitio reimplemente el
        // `typeof`.
        ...(previous !== undefined ? { previous: normalizeOverride(previous).value } : {}),
        ...(motivo ? { reason: motivo } : {}),
      },
    });
    // PM-1 (cierre, 2026-09-14): respuesta de mutación, no una de las seis lecturas que redactan
    // el enlace con la ficha del mundo — el campo no viaja.
    return sinEntityIdEnRespuesta(await this.buildResponse(userId, actualizado));
  }

  /** Quita una anulación y devuelve el valor al que el catálogo calcule. También solo el DM. */
  async clearOverride(
    userId: string,
    campaignId: string,
    characterId: string,
    target: OverridableKey,
  ) {
    await this.membership.requireDM(campaignId, userId);
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, campaignId },
    });
    if (!character) throw new NotFoundException("Character not found");

    const actuales = { ...((character.overrides ?? {}) as Overrides) };
    // PM-1 (cierre, 2026-09-14): respuesta de mutación, no una de las seis lecturas que redactan
    // el enlace con la ficha del mundo — el campo no viaja, en los dos retornos de este método.
    if (actuales[target] === undefined) {
      return sinEntityIdEnRespuesta(await this.buildResponse(userId, character));
    }
    delete actuales[target];

    const actualizado = await this.prisma.character.update({
      where: { id: characterId },
      data: { overrides: actuales },
    });
    return sinEntityIdEnRespuesta(await this.buildResponse(userId, actualizado));
  }

  /**
   * La hoja derivada, o el 400 honesto de "no se puede sin raza/clase/características": ninguna
   * mutación de PG puede recortar contra un `maxHp` que no existe.
   *
   * **Y deriva con lo mismo que la hoja que se lee: las anulaciones del DM y el agotamiento.**
   *
   * Hasta que una revisión lo cazó, este camino —el que usan `changeHp`, `setHp` y la salvación de
   * muerte, o sea **la curación de la mesa**— derivaba «pelado»: sin `modificadoresDeAnulacion` y
   * sin condiciones. Dos consecuencias, las dos de las que este proyecto llama mentir:
   *
   *  · un personaje con **agotamiento 4** se curaba hasta el máximo entero, y la hoja se lo
   *    enseñaba recortado con el aviso de «tus PG superan el máximo» — que es exactamente el fallo
   *    que 2C.4 decía haber arreglado, con la mitad del sistema sin arreglar;
   *  · una **anulación de `maxHp`** puesta por el DM salía en la hoja y no gobernaba la curación,
   *    así que el número que se ve y el número contra el que se cura eran distintos.
   */
  /**
   * **La única puerta que construye una hoja.** Devuelve la hoja o el motivo por el que no hay.
   *
   * Existir una sola vez no es estética: había **dos** caminos —el de leer (`buildResponse`) y el
   * de mutar (`construirODenegar`)— y cada uno derivaba por su cuenta. 2D lo destapó al añadir la
   * rama de PNJ: parcheado uno, el otro seguía intentando construir un personaje sin raza ni
   * clase y devolvía una hoja vacía con un 200. Es exactamente el fallo que la revisión de 2C
   * describió como «la mitad del sistema sin arreglar», y la respuesta correcta no era añadir la
   * rama dos veces, sino que haya un solo sitio donde añadirla.
   *
   * **El agotamiento se aplica aquí**, por el mismo motivo: leer y mutar tienen que recortar
   * contra el mismo máximo o el tope de la curación miente.
   */
  private async hojaOMotivo(
    viewer: Viewer,
    character: FilaPersonaje,
    items: ResolvedItem[],
    tx?: Prisma.TransactionClient,
  ): Promise<HojaDerivada> {
    // **El nivel de agotamiento se lee ANTES de saber si hay hoja**, y sale con el resultado
    // aunque no la haya. Es lo que 2.5.5 necesitaba para cerrar el nivel 6: un personaje sin
    // raza ni clase no tiene hoja, pero sí puede tener agotamiento 6 puesto, y decir que está
    // vivo porque no hemos podido derivar sus PG sería el mismo tipo de mentira que esta función
    // existe para no repetir en dos caminos.
    const client = tx ?? this.prisma;
    const [condiciones, temporales, campana] = await Promise.all([
      client.characterCondition.findMany({
        where: { characterId: character.id },
        select: { key: true, level: true, expiresAtClock: true, expiryEdge: true },
      }),
      // M8: los modificadores temporales entran por el mismo sitio y con el mismo reloj. Se piden
      // aquí y no dentro de la derivación porque este es el único punto que ya lee el reloj: dos
      // lecturas del reloj en el mismo cálculo podrían dar dos instantes distintos.
      client.temporaryModifier.findMany({
        where: { characterId: character.id },
        select: { id: true, target: true, amount: true, reason: true, expiresAtClock: true },
        orderBy: { createdAt: "asc" },
      }),
      client.campaign.findUniqueOrThrow({ where: { id: character.campaignId } }),
    ]);
    const condicionesVivas = condicionesActivas(condiciones, campana.clockSeconds);
    const nivel = nivelDeAgotamiento(condicionesVivas);
    // Tarea 16 (H1b): «estable» es indefinida (sin `expiresAtClock`), así que basta con que
    // exista entre las vivas — no hay reloj que la caduque sola, solo `changeHp` la retira.
    const stable = condicionesVivas.some((c) => c.key === CLAVE_ESTABLE);
    const extras = modificadoresTemporales(temporales, campana.clockSeconds);

    const base = character.statblockRef
      ? await this.hojaDeStatblock(viewer, character, extras)
      : this.hojaDePersonaje(character, items, extras, campana.encumbranceVariant);
    if (!("sheet" in base)) return { ...base, exhaustion: nivel, stable };
    if (nivel === 0) return { ...base, exhaustion: nivel, stable };
    return {
      exhaustion: nivel,
      stable,
      sheet: {
        ...base.sheet,
        derived: {
          ...base.sheet.derived,
          maxHp: maxHpConAgotamiento(base.sheet.derived.maxHp, nivel),
        },
      },
    };
  }

  /** Lo mismo, pero lanzando: lo que necesitan las mutaciones, que no saben pintar un motivo. */
  private async construirODenegar(
    userId: string,
    character: FilaPersonaje,
    tx?: Prisma.TransactionClient,
  ): Promise<CharacterSheet> {
    // Para calcular los PG máximos da igual quién mira: se usa el equipo **sin redactar**, que
    // es el estado real del personaje. La redacción es de identidad, nunca de número.
    const { items } = await this.equipoEquipado(character.ownerId, character, tx);
    // **Quien muta es el dueño o el DM** (`requireEditable`), y el dueño de un PNJ es el DM, así
    // que este espectador siempre ve la plantilla. Se pasa igualmente en vez de saltarse la
    // comprobación: un atajo aquí sería el hueco por el que entre la próxima fuga.
    const resultado = await this.hojaOMotivo(
      await viewerFor(this.prisma, this.membership, userId, character.campaignId, tx),
      character,
      items,
      tx,
    );
    if (!("sheet" in resultado))
      throw new BadRequestException(`No se pueden gestionar los PG: ${resultado.reason}`);
    return resultado.sheet;
  }

  /**
   * **La hoja sin recortar por visibilidad, para operar con sus números.** Mismo espectador que
   * `caDelObjetivo` —del servidor, no de nadie con sesión: `{ ownerId, role: "DM" }`—, y la misma
   * garantía: nunca se devuelve al cliente ni se guarda, solo entra en una cuenta (máximo de PG,
   * modificadores de daño). Lanza el mismo 400 que `construirODenegar` cuando no hay hoja que
   * derivar. **Quien llame aquí tiene que haber autorizado ya**: esta función no comprueba
   * nada, a propósito, y por eso es privada.
   */
  private async hojaDelServidor(
    character: FilaPersonaje,
    tx?: Prisma.TransactionClient,
  ): Promise<CharacterSheet> {
    const { items } = await this.equipoEquipado(character.ownerId, character, tx);
    const resultado = await this.hojaOMotivo(
      espectadorDelServidor(character),
      character,
      items,
      tx,
    );
    if (!("sheet" in resultado))
      throw new BadRequestException(`No se pueden gestionar los PG: ${resultado.reason}`);
    return resultado.sheet;
  }

  /**
   * La hoja de un PNJ instanciado. Fase 2D.
   *
   * **El agotamiento, las condiciones y las anulaciones del DM le aplican igual**, y eso no es un
   * detalle: es lo que hace que instanciar un PNJ como `Character` valga la pena. Un troll con
   * agotamiento 4 tiene los PG máximos partidos por la misma función que parte los de un jugador.
   */
  private async hojaDeStatblock(
    viewer: Viewer,
    character: FilaPersonaje,
    /** Los temporales vivos (M8): un PNJ jugable también puede llevar un +2 con caducidad. */
    temporales: Modifier[] = [],
  ): Promise<{ sheet: CharacterSheet } | { reason: string; numerosOcultos?: boolean }> {
    if (!this.statblocks) {
      return {
        reason:
          "Este PNJ no se puede derivar: falta el resolutor de statblocks. Es un fallo de cableado, no del dato.",
      };
    }

    // **La visibilidad del PNJ y la de su plantilla son DOS cosas distintas**, y confundirlas era
    // una fuga: el DM enseña el bicho —sube el PNJ a `PLAYERS` para que se vea en la mesa— y su
    // statblock sigue siendo suyo. Antes de la revisión de cierre de 2D, la hoja derivaba sin
    // preguntar por la plantilla, así que ese jugador leía CA, PG máximos, las seis salvaciones,
    // las dieciocho habilidades y **la traza**, que además lleva la nota del libro dentro. Es la
    // tercera de la misma familia: la revisión de 2C encontró las otras dos.
    const resuelto = await this.statblocks.resolverParaHoja(
      character.campaignId,
      character.statblockRef!,
      viewer,
    );

    if ("oculto" in resuelto) {
      // Y el motivo **no miente**: quien mira ya sabe que la criatura existe —está viéndola en la
      // mesa—, así que decirle que sus números no son públicos no le descubre nada. Colapsarlo en
      // «no existe» habría sido más cómodo y habría sido falso.
      // **Y ahora la frase dice lo que de verdad pasa** (D-A-2): los PG actuales SÍ viajan, así
      // que decir «sus números no son públicos» a secas volvería a mentir, solo que menos.
      return {
        reason:
          "De este PNJ solo se ven sus puntos de golpe actuales: el resto de su ficha es del DM.",
        numerosOcultos: true,
      };
    }
    if ("ausente" in resuelto) {
      // Un `ref` que ya no resuelve es un dato caduco —el DM borró su statblock—, no un fallo del
      // servidor: se dice con un motivo legible, igual que hace el catálogo con una clase que ya
      // no existe.
      return {
        reason: `Este PNJ apunta a un statblock que ya no existe (${character.statblockRef}). Vuelve a crearlo o bórralo.`,
      };
    }
    return {
      sheet: deriveNpc(resuelto.statblock, [...modificadoresDeAnulacion(character), ...temporales]),
    };
  }

  private hojaDePersonaje(
    character: FilaPersonaje,
    items: ResolvedItem[],
    /** Los temporales vivos (M8). Van **detrás** de las anulaciones porque el motor ordena por
     * operación, no por posición: los `add` se aplican todos antes que cualquier `override`. */
    temporales: Modifier[] = [],
    /** Migración 6 (D-CF-16): la variante de sobrecarga de la campaña. Apagada por defecto. */
    encumbranceVariant = false,
  ): { sheet: CharacterSheet } | { reason: string } {
    const resuelto = construirBuild(character, items);
    if (!("build" in resuelto)) return { reason: resuelto.reason };
    return derivarOMotivo(
      resuelto.build,
      [...modificadoresDeAnulacion(character), ...temporales],
      encumbranceVariant,
    );
  }

  /**
   * **Tarea A7 (paso 2) — `tx` opcional, aditivo.** Una actividad gasta su recurso, cambia PG y
   * escribe su suceso en una sola transacción, y `PrismaService.transaction` no anida: llamar a
   * este método dentro de la transacción de la actividad con la puerta de siempre abriría una
   * segunda transacción independiente, y la garantía de «a medias no se queda» se rompería justo
   * donde más importa. La solución tiene precedente en este mismo proyecto
   * (`DmTablesService.tirarSobre` acepta `opciones.tx` por la misma razón): el cuerpo se extrae a
   * un método privado que recibe el cliente, y este método público decide con cuál — el suyo
   * propio si no le dan uno, o el que le pasen. **Sin `tx`, el comportamiento no cambia en nada**:
   * sigue abriendo su propia transacción, y ningún llamador existente lo nota.
   *
   * **Vuelta de arreglo 1 (I2): con `tx`, la autorización se comprueba contra ESE cliente, no
   * contra `this.prisma`.** La primera versión llamaba a `this.membership.requireMember` y a
   * `this.characters.requireEditable` **siempre**, aunque llegara un `tx` — las dos usan su
   * propia `PrismaService` por dentro, así que cada llamada pedía una conexión nueva del pool
   * mientras la de quien llama (`ActivitiesService`, con su propia transacción ya abierta) seguía
   * tomada. Con el pool justo, eso es agotamiento y `transaction timeout`, no un interbloqueo de
   * candados pero sí el mismo género de fallo: dos conexiones donde debería bastar una. Con `tx`,
   * la comprobación se hace con una consulta equivalente contra ESE cliente; sin `tx`, el camino
   * de siempre no cambia una coma.
   */
  async changeHp(
    userId: string,
    campaignId: string,
    characterId: string,
    input: ChangeHpInput,
    tx?: Prisma.TransactionClient,
  ) {
    if (tx) {
      await this.autorizarEdicionConCliente(tx, userId, campaignId, characterId);
      return this.changeHpEnTransaccion(tx, userId, campaignId, characterId, input);
    }
    await this.membership.requireMember(campaignId, userId);
    // Comprueba dueño-o-DM antes de bloquear la fila: es una lectura de más, pero evita
    // mantener el candado abierto mientras se resuelve un 403.
    await this.characters.requireEditable(userId, campaignId, characterId);
    return this.prisma.transaction((cliente) =>
      this.changeHpEnTransaccion(cliente, userId, campaignId, characterId, input),
    );
  }

  /**
   * La misma autorización que `MembershipService.requireMember` +
   * `CharactersService.requireEditable`, pero contra el cliente que se le pasa — nunca contra
   * `this.prisma`. Mismos mensajes, mismas excepciones: quien llama no puede notar la diferencia
   * salvo por la conexión que usa.
   */
  private async autorizarEdicionConCliente(
    cliente: Prisma.TransactionClient,
    userId: string,
    campaignId: string,
    characterId: string,
  ): Promise<void> {
    const miembro = await cliente.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
    });
    if (!miembro) throw new ForbiddenException("Not a member of this campaign");
    const character = await cliente.character.findFirst({
      where: { id: characterId, campaignId },
    });
    if (!character) throw new NotFoundException("Character not found");
    if (miembro.role !== "DM" && character.ownerId !== userId) {
      throw new ForbiddenException("Only the DM or the owner can modify this");
    }
  }

  /** El cuerpo de `changeHp`, sin abrir su propia transacción — ver el comentario de arriba. */
  private async changeHpEnTransaccion(
    tx: Prisma.TransactionClient,
    userId: string,
    campaignId: string,
    characterId: string,
    input: ChangeHpInput,
  ) {
    const filas = await tx.$queryRaw<
      FilaPersonaje[]
    >`SELECT * FROM "Character" WHERE id = ${characterId} AND "campaignId" = ${campaignId} FOR UPDATE`;
    const character = filas[0];
    if (!character) throw new NotFoundException("Character not found");

    // **La hoja del OBJETIVO se deriva con un espectador del servidor, no con `userId`.** Ola de
    // arreglos 1 de la puerta de efectos (Critical 1 de la revisión de API, 2026-09-13). Quien
    // llega aquí ya está autorizado —`changeHp` por `requireEditable`, la segunda puerta
    // (`changeHpFromEffect`, spec §3.1) por `canView` + `requireOwnerOrDM` en su llamador— y lo
    // único que se necesita de la hoja son NÚMEROS: el máximo de PG y los modificadores de daño.
    // Derivarla con el actor como espectador rompía la segunda puerta en el caso de mesa más
    // normal: un jugador impacta a un PNJ con statblock de campaña (`DM_ONLY` por defecto,
    // `statblock.schema.ts`) y el DM pulsa «Aplicar», o responde la salvación por el bicho — el
    // actor que firma es el jugador, `resolverParaHoja(viewer)` devolvía `{ oculto }` y salía un
    // 400 «No se pueden gestionar los PG» con la tirada ya escrita. `caDelObjetivo` ya usaba este
    // mismo espectador para la CA por la misma razón: «da igual quién mira, se usa el estado
    // real». `userId` sigue siendo quien FIRMA el suceso y quien ve la respuesta
    // (`buildResponse`, que sí redacta).
    const sheet = await this.hojaDelServidor(character, tx);
    const maxHp = sheet.derived.maxHp.total;
    const before = character.currentHp ?? maxHp;

    // **Un personaje muerto no se cura con puntos de golpe.** A 0 PG y con tres fracasos está
    // muerto (SRD): la magia de curación no lo levanta, hace falta resurrección, que esta
    // fase no modela. Hasta hoy, echarle diez puntos lo devolvía a la vida con el contador a
    // cero y sin aviso — un clérigo deshacía una muerte por accidente y nadie se enteraba. Lo
    // encontró un DM dirigiendo una partida de prueba. Se rechaza con un motivo en vez de
    // resucitar en silencio; bajar los PG de un cadáver (un delta negativo) sigue permitido.
    if (before === 0 && character.deathSaveFailures >= 3 && input.delta > 0) {
      throw new BadRequestException(
        "Este personaje está muerto: los puntos de golpe no lo reviven. Hace falta magia de resurrección, que aún no se modela.",
      );
    }

    let tempHp = character.tempHp;
    let after: number;

    // --- Lo que el daño y la curación le hacen a las salvaciones de muerte -------------
    //
    // Estas tres reglas del SRD vivían en la cabeza de la mesa y no en el código, y la
    // consecuencia era un fallo activo: **curar a un personaje a 0 PG le dejaba los fracasos
    // encima**, sesión tras sesión. Lo encontró una investigación de huecos de mecánica.
    let successes = character.deathSaveSuccesses;
    let failures = character.deathSaveFailures;
    let massive = false;
    // D-CF-14, commit 5 (J5). **Solo se rellena en la transición** —de vivo/moribundo a
    // muerto—, nunca en un segundo golpe sobre un cadáver: `character.deathSaveFailures` es el
    // valor de ANTES de este cambio (la variable local `failures`, más abajo, ya se muta).
    let causaMuerte: "massive_damage" | "death_saves" | null = null;
    // Tarea 16 (H1b). SRD 5.1, «Stabilizing a Creature»: *«The creature stops being stable, and
    // must start making death saving throws again, if it takes any damage.»* Y, simétrico:
    // curar por encima de 0 también la retira, porque «estable» solo describe a alguien a 0 PG.
    let retirarEstable = false;
    // Tarea 2.5.1, pieza C. **Solo se rellena si de verdad se redujo algo** — un delta sin
    // `damageType`, o uno que no toca ninguna resistencia, deja esto vacío y el camino de hoy
    // no cambia en nada, que es lo que hace la pieza reversible.
    let damageTrace: ReturnType<typeof applyDamageModifiers> | null = null;
    // **El delta que se ESCRIBE en el registro, que no siempre es el que llegó.** Lo encontró
    // la revisión de cierre del 2026-09-04: el suceso guardaba `input.delta` —el daño bruto—
    // mientras `from`/`to` ya venían del daño reducido, y eso hacía dos cosas malas a la vez.
    //
    //   1. **Filtraba.** Un jugador que ve «Pierde 25 PG (45 → 33)» deduce que hay una
    //      resistencia, y la plantilla de la que sale puede ser `DM_ONLY`. Es la doctrina del
    //      proyecto —«si no se debe saber, no se envía»— rota por el canal que el propio spec
    //      de 2.5.1 nombra: el suceso del registro.
    //   2. **Mentía.** `linea-de-log.ts` imprime literalmente `Pierde |delta| PG (from → to)`,
    //      así que la línea se contradecía consigo misma.
    //
    // Se registra el daño **realmente aplicado**. Ojo con el precedente que sí se conserva:
    // `delta` ya podía no cuadrar con `to − from` cuando los PG temporales absorben, y eso se
    // queda — aquello es explicable con lo que el jugador ya ve; esto publicaba un número
    // secreto.
    let deltaRegistrado = input.delta;
    // Tarea 2.5.4. **De qué tirada sale este daño**, y comprobada, no solo declarada: un
    // `rollEventId` inventado (o de otra campaña) escribiría una causa falsa en el registro,
    // que es justo lo que esta tarea existe para evitar. `undefined` cuando no se manda.
    let concentrationSave: { requestId: string; dc: number } | undefined;
    if (input.rollEventId) {
      const tiradaCitada = await tx.gameEvent.findFirst({
        // **Y tiene que ser una tirada, no cualquier suceso de la campaña.** La primera versión
        // solo comprobaba `id` + `campaignId`, así que el id de un comentario, de una condición
        // aplicada o de un `ENTITY_REVEALED` pasaba el filtro y quedaba escrito en el registro
        // como «de qué tirada salió este daño». Eso es exactamente la causa falsa que la tarea
        // existe para impedir, solo que más difícil de detectar que un id inventado, porque el
        // id sí existe. Lo encontró la revisión de cierre.
        where: {
          id: input.rollEventId,
          campaignId,
          type: { in: ["ABILITY_ROLL", "DEATH_SAVE"] },
        },
        select: { id: true },
      });
      if (!tiradaCitada) {
        throw new BadRequestException("Esa tirada no existe en esta campaña.");
      }
    }

    // Pulido 2026-09-12 (anexo #15). **El origen puesto a mano**, cuando el daño no cuelga de
    // ninguna tirada: el mismo `requireVisibleCharacter` que ya exige `activities`,
    // `conditions`, `resources`, `rest`, `temporary-modifiers` e `inventory` para citar a
    // alguien sin reimplementar «existe y se ve» una vez más. 404 tanto si no existe como si
    // existe pero este actor no lo ve — no hay diferencia observable entre las dos, y esa es la
    // regla que el helper ya impone en todos los demás sitios.
    if (input.sourceCharacterId) {
      await requireVisibleCharacter(
        this.prisma,
        this.membership,
        userId,
        campaignId,
        input.sourceCharacterId,
        tx,
      );
    }

    if (input.delta < 0) {
      // Al recibir daño se gastan primero los PG temporales: no se suman a los actuales.
      let danio = -input.delta;
      // **La resistencia y la vulnerabilidad se aplican antes de tocar los PG temporales**: son
      // el daño de verdad que llega al personaje, y los PG temporales se gastan sobre ESE
      // número, no sobre el bruto de la tirada (SRD 5.1, «la resistencia y la vulnerabilidad se
      // aplican después del resto de modificadores al daño» — aquí no hay ningún otro
      // modificador antes, así que esta es la primera y única reducción).
      if (input.damageType) {
        // **Dos fuentes, una forma** (paso 1, tarea 8b). Un PNJ los saca de su statblock; **un
        // personaje jugador de sus rasgos**, y hasta el 2026-09-06 no los sacaba de ningún
        // sitio: la condición de aquí exigía `statblockRef`, y `characters.service.ts` filtra
        // `statblockRef: null` a propósito para un PJ. Así que **un enano recibía el veneno
        // entero** y un tiefling ardía con el fuego entero, con la traza convincente al lado.
        //
        // `damageModifiers` es opcional en `@dnd/shared` a propósito (ver el comentario de
        // `damageModifiersSchema`): un statblock guardado antes de aquella tarea no lo tiene.
        const modificadores =
          character.statblockRef && this.statblocks
            ? ((await this.statblocks.resolver(campaignId, character.statblockRef))
                ?.damageModifiers ?? [])
            : sheet.damageModifiers;
        if (modificadores.length > 0) {
          damageTrace = applyDamageModifiers(danio, input.damageType, modificadores);
          danio = damageTrace.total;
          deltaRegistrado = -danio;
        }
      }
      // **Antes de gastar los PG temporales**, con `danio` bruto y no `efectivo`: la regla dice
      // «takes any damage», y el propio SRD trata los temporales como algo que se gasta AL
      // recibir daño, no como algo que impide haberlo recibido.
      if (before === 0 && danio > 0) retirarEstable = true;

      const gastoTemporal = Math.min(tempHp, danio);
      tempHp -= gastoTemporal;
      const efectivo = danio - gastoTemporal;

      // **El sobrante se calcula ANTES de recortar**, o el `clamp` borra la evidencia: si lo
      // que pasa de 0 iguala o supera los PG máximos, el personaje muere en el acto, sin
      // tiradas. Recortar primero y preguntar después es el error que hace desaparecer esa
      // muerte.
      const sobrante = efectivo - before;
      if (before > 0 && sobrante >= maxHp) {
        massive = true;
        failures = 3;
        // `before > 0` ya descarta que este personaje estuviera muerto (eso exige 0 PG): la
        // muerte masiva es siempre una transición fresca.
        causaMuerte = "massive_damage";
      } else if (before === 0 && efectivo > 0) {
        // **Golpear a quien ya está a 0 suma un fracaso, y dos si el golpe fue crítico.** Es
        // el momento más frecuente del juego —el remate al que está en el suelo— y hasta hoy
        // no dejaba ningún rastro.
        failures = Math.min(3, failures + (input.critical ? 2 : 1));
        if (character.deathSaveFailures < 3 && failures >= 3) causaMuerte = "death_saves";
      }

      // **La salvación de concentración** (hueco M17). *«Whenever you take damage while you
      // are concentrating on a spell, you must make a Constitution saving throw to maintain
      // your concentration. The DC equals 10 or half the damage you take, whichever number is
      // higher.»* / *«If you take damage from multiple sources ... you make a separate saving
      // throw for each source of damage»* (SRD 5.1, "Casting a Spell" — inglés, verificado
      // contra dos fuentes que citan el texto CC-BY original). **Basta con pedirla**: se crea
      // la petición de tirada de siempre (2C.5) y el sistema no decide si se pierde — eso lo
      // resuelve quien la responde. Una por golpe, nunca deduplicada: es literalmente lo que
      // pide "por cada fuente de daño".
      //
      // **Con el daño TOMADO, no con el que atravesó los PG temporales**, y las dos cosas que
      // eso cambia las encontró la revisión de cierre.
      //
      //  1. **Los PG temporales no eximen de la salvación.** La regla dice *«whenever you take
      //     damage»*, y el propio SRD describe los temporales como algo que se gasta *cuando
      //     tomas daño* («when you have temporary hit points and take damage»): absorben el
      //     golpe, no lo impiden. Se pedía con `efectivo`, así que un mago con 5 temporales que
      //     encajaba 5 no tiraba nada — y con 12 tiraba contra CD 10 en vez de CD 10 (aquí
      //     coinciden) pero con 30 tiraba contra CD 9→10 en vez de CD 15. La CD sale del mismo
      //     número: *«half the damage you take»*.
      //  2. **A 0 PG no se pide, porque ya no hay nada que mantener.** *«You lose concentration
      //     on a spell if you are incapacitated or if you die»*, y quedar inconsciente es estar
      //     incapacitado: el que cae a 0 pierde la concentración sin tirar, y el que ya estaba a
      //     0 no la tenía. Pedir la salvación ahí es pedirle al jugador que tire para conservar
      //     algo que la regla ya le quitó.
      //
      // `massive` queda fuera por lo mismo, y ahora es redundante —una muerte masiva deja en 0—
      // pero se conserva explícito: dice lo que quiere decir sin depender de la aritmética.
      const resultante = clamp(before - efectivo, 0, maxHp);
      if (danio > 0 && !massive && before > 0 && resultante > 0) {
        const condiciones = await tx.characterCondition.findMany({
          where: { characterId },
          select: { key: true, expiresAtClock: true, expiryEdge: true },
        });
        const campanaActual = await tx.campaign.findUniqueOrThrow({
          where: { id: campaignId },
          select: { clockSeconds: true },
        });
        if (estaConcentrado(condiciones, campanaActual.clockSeconds)) {
          const dc = concentrationSaveDc(danio);
          const peticion = await tx.rollRequest.create({
            data: {
              campaignId,
              characterId,
              requestedById: userId,
              key: "save.con",
              label: `Salvación de concentración (CD ${dc})`,
              dc,
              mode: "NORMAL",
              // Misma regla que el resto del servicio: la audiencia sale de la visibilidad del
              // personaje, no `PUBLIC` fija.
              audience: loVeLaMesa(character.visibility) ? "PUBLIC" : "DM_PRIVATE",
            },
          });
          concentrationSave = { requestId: peticion.id, dc };
        }
      }

      after = resultante;
      // **Round 1 de revisión — una caída fresca nunca es estable.** El guardia de arriba
      // (`before === 0 && danio > 0`) cubre a quien YA estaba a 0; este cubre al que llega a 0
      // por primera vez con este golpe. Sin esto, una fila con un `stable` huérfano —dejado por
      // `setHp` o un descanso que curó sin retirarlo, antes de este mismo arreglo— sobrevivía a
      // la próxima caída y la hoja decía «estable» de alguien que acaba de desplomarse sin haber
      // tirado una sola salvación.
      if (before > 0 && after === 0) retirarEstable = true;
    } else {
      after = clamp(before + input.delta, 0, maxHp);
      // **Recuperar un solo PG estando a 0 borra los dos contadores.** No es una cortesía: el
      // SRD dice que vuelves en ti, y arrastrar fracasos de una caída anterior mataría a
      // alguien por algo que ya sobrevivió.
      if (before === 0 && after > 0) {
        successes = 0;
        failures = 0;
        retirarEstable = true;
      }
    }

    if (retirarEstable) {
      await tx.characterCondition.deleteMany({
        where: { characterId, key: CLAVE_ESTABLE },
      });
    }

    const actualizado = await tx.character.update({
      where: { id: characterId },
      data: {
        currentHp: after,
        tempHp,
        version: character.version + 1,
        deathSaveSuccesses: successes,
        deathSaveFailures: failures,
      },
    });

    const sessionIdHp = await this.sesionActiva(campaignId, tx);
    // Tarea 3 de la puerta de efectos (spec §4b.6, E-PE-4). **Se guarda el evento entero, no solo
    // su id**: `applyPendingDamage` necesita el `id` del `HP_CHANGED` que se acaba de escribir
    // para marcarlo como `appliedEventId` de la tirada de daño — el candado de un solo uso vive
    // sobre ESE id, y `changeHp`/`changeHpFromEffect` de siempre no lo necesitan ni lo pierden:
    // `hpEventId` es un campo más en la respuesta, aditivo.
    const eventoHp = await this.events.record(
      userId,
      campaignId,
      {
        sessionId: sessionIdHp,
        subjectType: "character",
        subjectId: characterId,
        visibility: character.visibility,
        payload: {
          type: "HP_CHANGED",
          delta: deltaRegistrado,
          from: before,
          to: after,
          // **Solo un delta NEGATIVO lleva tipo de daño.** También de la revisión de cierre:
          // sin la comprobación del signo se podía etiquetar una CURACIÓN como de fuego, y
          // entonces la única consulta para la que existe esta columna —«¿de qué murió
          // Elara?»— devolvía curaciones. El comentario de `game-event.schema.ts` ya
          // afirmaba que «una curación no tiene tipo de daño que contar»; el código no lo
          // impedía.
          ...(input.delta < 0 && input.damageType ? { damageType: input.damageType } : {}),
          ...(input.critical ? { critical: true } : {}),
          // Una muerte sin tiradas necesita explicarse en la línea de tiempo, o parece un
          // error de la herramienta.
          ...(massive ? { massive: true } : {}),
          // Tarea 2.5.4 — de qué tirada salió, ya comprobada arriba contra la base.
          ...(input.rollEventId ? { rollEventId: input.rollEventId } : {}),
          // Pulido 2026-09-12 (anexo #15) — de quién viene, ya comprobado arriba: visible y en
          // esta campaña.
          ...(input.sourceCharacterId ? { sourceCharacterId: input.sourceCharacterId } : {}),
          reason: input.reason,
        },
      },
      tx,
    );

    // D-CF-14, commit 5 (J5). `causaMuerte` solo se rellenó en la transición (arriba): la
    // muerte masiva no tira nada, y el remate a tres fracasos cita la MISMA tirada que el daño
    // ya citaba (`input.rollEventId`) — si no vino ninguna, el suceso no inventa una.
    if (causaMuerte) {
      await this.events.record(
        userId,
        campaignId,
        {
          sessionId: sessionIdHp,
          subjectType: "character",
          subjectId: characterId,
          visibility: character.visibility,
          payload: {
            type: "CHARACTER_DIED",
            characterId,
            name: character.name,
            cause: causaMuerte,
            ...(causaMuerte === "death_saves" && input.rollEventId
              ? { rollEventId: input.rollEventId }
              : {}),
          },
        },
        tx,
      );
    }

    const respuesta = await this.buildResponse(userId, actualizado, tx);
    // La traza es lo que responde «−7 por resistencia a contundente»: sin ella, la reducción
    // sería un número sin origen, y esta tarea existe justo para lo contrario.
    //
    // PM-1 (cierre, 2026-09-14): respuesta de mutación, no una de las seis lecturas que redactan
    // el enlace con la ficha del mundo — el campo no viaja.
    return {
      ...sinEntityIdEnRespuesta(respuesta),
      ...(damageTrace ? { damageTrace } : {}),
      ...(concentrationSave ? { concentrationSave } : {}),
      // Tarea 3 de la puerta de efectos — aditivo, ver el comentario de `eventoHp` arriba.
      hpEventId: eventoHp.id,
    };
  }

  /**
   * **La segunda puerta** (spec puerta de efectos §3.1, D-P2-11): «vengo de un efecto ya
   * autorizado». Quien llama —hoy solo `ActivitiesService.usar` y `RollRequestsService.answer`—
   * ya comprobó con `canView` que el actor ve al objetivo y con `requireOwnerOrDM` que puede usar
   * la actividad; aquí NO se vuelve a autorizar. **Exige `tx`**: sin transacción ajena no hay
   * forma de llamarla, y eso es lo que impide que un controlador la pulse. Ningún controlador la
   * importa (`__tests__/puertas-sin-ruta.spec.ts`). El `HP_CHANGED` lo firma `actorUserId`, quien
   * usó la actividad: la crónica dice quién causó el cambio, no quién pulsó.
   */
  async changeHpFromEffect(
    tx: Prisma.TransactionClient,
    actorUserId: string,
    campaignId: string,
    targetCharacterId: string,
    input: ChangeHpInput,
  ) {
    return this.changeHpEnTransaccion(tx, actorUserId, campaignId, targetCharacterId, input);
  }

  /**
   * Tarea 3 de la puerta de efectos (spec §4b.4) — de dónde sale un `pendingDamage`, y con qué se
   * queda escrito. Sin fila, o sin `pendingDamage` en su `payload`, es exactamente el mismo 404
   * que un objetivo que no se ve (`SIN_DANO_PENDIENTE`): un daño tirado al aire, o sobre un fallo,
   * nunca tuvo esta clave (E-PE-5), así que preguntar por su bandeja es indistinguible de
   * preguntar por una tirada que no existe.
   */
  private async pendingDamageDeLaTirada(
    campaignId: string,
    rollEventId: string,
  ): Promise<{ actorUserId: string; pendingDamage: PendingDamage }> {
    const evento = await this.prisma.gameEvent.findFirst({
      where: { id: rollEventId, campaignId, type: "ABILITY_ROLL" },
      select: { actorUserId: true, payload: true },
    });
    const pendingDamage = (evento?.payload as { pendingDamage?: PendingDamage } | undefined)
      ?.pendingDamage;
    if (!evento || !pendingDamage) {
      throw new NotFoundException(SIN_DANO_PENDIENTE);
    }
    return { actorUserId: evento.actorUserId, pendingDamage };
  }

  /**
   * Los modificadores de daño del objetivo, **exactamente igual que la pieza C de
   * `changeHpEnTransaccion`** (tarea 2.5.1): un PNJ con statblock los saca de su plantilla; un
   * personaje jugador, de sus rasgos. Dos fuentes, una forma — la misma regla, no una segunda
   * copia que se desalinee el día que la primera cambie. Sin `userId`: quién pregunta ya se
   * comprobó antes (`requireOwnerOrDM`) y los modificadores no dependen de quién mira.
   */
  private async modificadoresDeDano(campaignId: string, target: FilaPersonaje) {
    if (target.statblockRef && this.statblocks) {
      return (
        (await this.statblocks.resolver(campaignId, target.statblockRef))?.damageModifiers ?? []
      );
    }
    return (await this.hojaDelServidor(target)).damageModifiers;
  }

  /**
   * De qué `TraceStep` sale el modificador que se enseña. **Se lee del ÚLTIMO paso**, no del
   * primero que aparezca: con resistencia y vulnerabilidad a la vez, el SRD las encadena en ese
   * orden (`apply-damage-modifiers.ts`) y lo que queda vigente es lo último aplicado. Solo el
   * `base` (sin modificadores) da `null`.
   */
  private modificadorDeLaTraza(steps: TraceStep[]): DamagePreview["resulting"]["modifier"] {
    const CLAVE_A_MODIFICADOR: Record<string, DamagePreview["resulting"]["modifier"]> = {
      "damage.modifier.immune": "immune",
      "damage.modifier.resist": "resistant",
      "damage.modifier.vulnerable": "vulnerable",
    };
    const ultimo = steps[steps.length - 1];
    return CLAVE_A_MODIFICADOR[ultimo.labelKey] ?? null;
  }

  /**
   * Tarea 3 de la puerta de efectos (spec §4b.4/§4b.5, E-PE-2) — la bandeja de daño, antes de
   * pulsar nada.
   *
   * **404 y no 403** cuando quien pregunta no es dueño ni DM del objetivo (spec §4b.5): un 403
   * confirmaría que la tirada SÍ tiene daño pendiente contra un objetivo real, y con él viajaría
   * si es resistente, vulnerable o inmune — enseñarle eso a quien no puede aplicar el daño es
   * filtrar la misma información por otra puerta. Quien SÍ puede aplicar (dueño o DM) ve el
   * desglose completo; nadie más ve ni que exista.
   */
  async damagePreview(
    userId: string,
    campaignId: string,
    rollEventId: string,
  ): Promise<DamagePreview> {
    await this.membership.requireMember(campaignId, userId);
    const { pendingDamage } = await this.pendingDamageDeLaTirada(campaignId, rollEventId);

    const target = await this.prisma.character.findFirst({
      where: { id: pendingDamage.targetCharacterId, campaignId },
    });
    if (!target) throw new NotFoundException(SIN_DANO_PENDIENTE);
    try {
      await requireOwnerOrDM(this.membership, campaignId, userId, target, SIN_DANO_PENDIENTE);
    } catch (e) {
      // **Solo el 403 se convierte en 404.** Un fallo de base o un error de programación no es
      // «sin daño pendiente»: se propaga, o se escondería detrás de un 404 que parece legítimo.
      if (e instanceof ForbiddenException) throw new NotFoundException(SIN_DANO_PENDIENTE);
      throw e;
    }

    const modificadores = await this.modificadoresDeDano(campaignId, target);
    const trace = applyDamageModifiers(
      pendingDamage.amount,
      pendingDamage.damageType,
      modificadores,
    );
    const absorbedByTemp = Math.min(target.tempHp, trace.total);
    const taken = trace.total - absorbedByTemp;

    return {
      target: { id: target.id, name: target.name },
      amount: pendingDamage.amount,
      damageType: pendingDamage.damageType,
      resulting: {
        taken,
        absorbedByTemp,
        modifier: this.modificadorDeLaTraza(trace.steps),
        reason: trace.notes[0] ?? null,
      },
      canApply: !pendingDamage.appliedEventId,
      appliedEventId: pendingDamage.appliedEventId ?? null,
    };
  }

  /**
   * Tarea 3 de la puerta de efectos (spec §4b.6, E-PE-2/E-PE-4) — el «aplicar» de un solo clic.
   *
   * **Aquí el 403 SÍ se ve** (spec §6): a diferencia de `damagePreview`, quien pulsa este botón ya
   * sabe que la tirada existe y contra quién — es el propio atacante, normalmente—, así que negar
   * con un 403 no le enseña nada que no supiera. Solo dueño o DM del OBJETIVO puede aplicar: el
   * atacante no lo es por defecto, y esa es justo la comprobación que hace de esto «uno solo
   * puede pulsar el botón», no un descuido.
   *
   * **Doble candado contra el doble clic.** La comprobación de `appliedEventId` de aquí es barata
   * y sale antes de abrir la transacción — un rechazo rápido para el caso normal—, pero el que de
   * verdad protege es el `$executeRaw` de abajo, con su `WHERE … IS NULL` dentro de la MISMA
   * transacción que el `HP_CHANGED`: dos peticiones a la vez pueden pasar las dos la comprobación
   * barata, y solo una gana la fila.
   */
  async applyPendingDamage(userId: string, campaignId: string, rollEventId: string) {
    await this.membership.requireMember(campaignId, userId);
    const { actorUserId, pendingDamage } = await this.pendingDamageDeLaTirada(
      campaignId,
      rollEventId,
    );

    const target = await this.prisma.character.findFirst({
      where: { id: pendingDamage.targetCharacterId, campaignId },
    });
    if (!target) throw new NotFoundException(SIN_DANO_PENDIENTE);
    await requireOwnerOrDM(this.membership, campaignId, userId, target);

    if (pendingDamage.appliedEventId) {
      throw new ConflictException("Ese daño ya se aplicó.");
    }

    const resuelto = await this.prisma.gameEvent.findFirst({
      where: { id: pendingDamage.attackResolvedEventId, campaignId, type: "ATTACK_RESOLVED" },
      select: { payload: true },
    });
    const attackName = (resuelto?.payload as { attackName?: string } | undefined)?.attackName;
    // `pendingDamage` garantiza que el `ATTACK_RESOLVED` existe (E-PE-5: sin él no se escribe la
    // clave). Si no aparece, la tirada está rota y la crónica no escribe un «Ataque: ?» para
    // disimularlo: es el mismo 404 que una tirada sin daño pendiente.
    if (!attackName) throw new NotFoundException(SIN_DANO_PENDIENTE);

    return this.prisma.transaction(async (tx) => {
      const resultado = await this.changeHpFromEffect(tx, actorUserId, campaignId, target.id, {
        delta: -pendingDamage.amount,
        damageType: pendingDamage.damageType,
        rollEventId,
        reason: `Ataque: ${attackName}`,
      });
      const hpEventId = resultado.hpEventId;
      // **E-PE-4: el candado real.** `jsonb_set` sobre el propio `payload`, con el `WHERE` que
      // exige que `appliedEventId` siga sin poner — 0 filas afectadas es la otra petición que
      // ganó la carrera, no un fallo de esta.
      const marcado = await tx.$executeRaw`
        UPDATE "GameEvent"
        SET payload = jsonb_set(payload, '{pendingDamage,appliedEventId}', to_jsonb(${hpEventId}::text))
        WHERE id = ${rollEventId} AND payload->'pendingDamage'->>'appliedEventId' IS NULL
      `;
      if (marcado === 0) {
        throw new ConflictException("Ese daño ya se aplicó.");
      }
      return { ...resultado, appliedEventId: hpEventId };
    });
  }

  async setHp(userId: string, campaignId: string, characterId: string, input: SetHpInput) {
    // Solo el DM: es la corrección absoluta, no el gasto de la mesa.
    await this.membership.requireDM(campaignId, userId);
    const existe = await this.prisma.character.findFirst({
      where: { id: characterId, campaignId },
    });
    if (!existe) throw new NotFoundException("Character not found");

    return this.prisma.transaction(async (tx) => {
      const filas = await tx.$queryRaw<
        FilaPersonaje[]
      >`SELECT * FROM "Character" WHERE id = ${characterId} AND "campaignId" = ${campaignId} FOR UPDATE`;
      const character = filas[0];
      if (!character) throw new NotFoundException("Character not found");

      // Concurrencia optimista: una versión vieja es un 409 con el estado actual, no un pisotón.
      if (character.version !== input.expectedVersion) {
        // PM-1 (cierre, 2026-09-14): también el cuerpo de un 409 es una respuesta de mutación.
        throw new ConflictException({
          message: "La versión enviada ya no es la actual.",
          ...sinEntityIdEnRespuesta(await this.buildResponse(userId, character, tx)),
        });
      }

      const sheet = await this.construirODenegar(userId, character, tx);
      const maxHp = sheet.derived.maxHp.total;
      const data: Record<string, unknown> = { version: character.version + 1 };
      const eventosAEscribir: GameEventPayload[] = [];

      if (input.currentHp !== undefined) {
        const antes = character.currentHp ?? maxHp;
        if (antes !== input.currentHp) {
          data.currentHp = input.currentHp;
          eventosAEscribir.push({
            type: "HP_CHANGED",
            delta: input.currentHp - antes,
            from: antes,
            to: input.currentHp,
            reason: input.reason,
          });
          // **Round 1 de revisión — el PATCH del DM es el otro camino que escribe `currentHp` sin
          // pasar por `changeHp`.** Corregir el número a mano —al máximo, a 0, a lo que sea— deja
          // el mismo dato imposible que un descanso sin retirarla: «estable» describe SOLO el
          // instante entre caer a 0 y que algo lo cambie, y aquí algo lo acaba de cambiar. Se
          // retira siempre que el valor escrito sea distinto del que había, sin mirar de qué
          // número a qué número: es la corrección del DM, no una regla de combate que necesite
          // distinguir los casos.
          await tx.characterCondition.deleteMany({
            where: { characterId, key: CLAVE_ESTABLE },
          });
        }
      }
      if (input.tempHp !== undefined) {
        // **Dos fuentes de PG temporales NO se suman** — SRD 5.1: *«they can't be added
        // together»*—, y **cuál se queda lo decide quien los recibe**: *«you decide whether to keep
        // the ones you have or to gain the new ones»*.
        //
        // Sin `tempHpEleccion` gana el mayor, que es lo que este servicio hacía y acierta casi
        // siempre. Con `"los-nuevos"` se coge el nuevo aunque sea menor, que es la mitad de la
        // regla que faltaba: hay efectos que interesa cambiar por otros más pequeños.
        const nuevo =
          input.tempHpEleccion === "los-nuevos"
            ? input.tempHp
            : Math.max(character.tempHp, input.tempHp);
        if (nuevo !== character.tempHp) {
          data.tempHp = nuevo;
          eventosAEscribir.push({
            type: "TEMP_HP_SET",
            from: character.tempHp,
            to: nuevo,
            reason: input.reason,
          });
        }
      }

      const actualizado = await tx.character.update({ where: { id: characterId }, data });
      for (const payload of eventosAEscribir) {
        await this.events.record(
          userId,
          campaignId,
          {
            subjectType: "character",
            subjectId: characterId,
            visibility: character.visibility,
            payload,
          },
          tx,
        );
      }
      // PM-1 (cierre, 2026-09-14): respuesta de mutación, no una de las seis lecturas que
      // redactan el enlace con la ficha del mundo — el campo no viaja.
      return sinEntityIdEnRespuesta(await this.buildResponse(userId, actualizado, tx));
    });
  }

  async rollDeathSave(
    userId: string,
    campaignId: string,
    characterId: string,
    input: DeathSaveInput,
  ) {
    await this.membership.requireMember(campaignId, userId);
    await this.characters.requireEditable(userId, campaignId, characterId);

    return this.prisma.transaction(async (tx) => {
      const filas = await tx.$queryRaw<
        FilaPersonaje[]
      >`SELECT * FROM "Character" WHERE id = ${characterId} AND "campaignId" = ${campaignId} FOR UPDATE`;
      const character = filas[0];
      if (!character) throw new NotFoundException("Character not found");

      const sheet = await this.construirODenegar(userId, character, tx);
      const maxHp = sheet.derived.maxHp.total;
      const currentHp = character.currentHp ?? maxHp;
      if (currentHp !== 0)
        throw new BadRequestException("Solo se puede tirar salvación de muerte a 0 PG.");

      // High #2, revisión final de `ficha/tanda-2-a-5`. SRD 5.1, «Stabilizing a Creature»:
      // *«A stable creature doesn't make death saving throws, even though it has 0 hit
      // points»*. `estadoDeMuerte` ya leía `CLAVE_ESTABLE` para lo que la hoja MUESTRA (Tarea
      // 16), pero esta tirada no la consultaba antes de tirar: un personaje estable podía
      // seguir tirando, sus contadores se acumulaban sobre una fila que la hoja seguía
      // declarando estable, y la tirada y la hoja se contradecían.
      const yaEstable = await tx.characterCondition.findUnique({
        where: { characterId_key: { characterId, key: CLAVE_ESTABLE } },
      });
      if (yaEstable)
        throw new BadRequestException("Un personaje estable no tira salvaciones de muerte.");

      const tirada = rollExpression("1d20", this.roller);
      const dado = tirada.total;

      let successes = character.deathSaveSuccesses;
      let failures = character.deathSaveFailures;
      let nuevoCurrentHp = 0;
      let result: "SUCCESS" | "FAILURE" | "CRIT_SUCCESS" | "CRIT_FAILURE";

      let revivido = false;
      let estabilizado = false;

      if (dado === 20) {
        // Un 20 natural no es "un éxito más": devuelve a la mesa a 1 PG y borra la cuenta.
        result = "CRIT_SUCCESS";
        successes = 0;
        failures = 0;
        nuevoCurrentHp = 1;
        revivido = true;
      } else if (dado === 1) {
        // Un 1 natural cuenta como DOS fracasos.
        result = "CRIT_FAILURE";
        failures = Math.min(3, failures + 2);
      } else if (dado >= 10) {
        result = "SUCCESS";
        successes = Math.min(3, successes + 1);
      } else {
        result = "FAILURE";
        failures = Math.min(3, failures + 1);
      }

      // Tres éxitos estabilizan: los contadores vuelven a cero y el personaje sigue a 0 PG.
      if (!revivido && successes >= 3) {
        estabilizado = true;
        successes = 0;
        failures = 0;
      }

      // Tarea 16 (H1b) — la marca que deja estabilizarse. SRD 5.1, «Stabilizing a Creature»:
      // *«A stable creature doesn't make death saving throws, even though it has 0 hit points»*.
      // Se escribe como la condición reservada `CLAVE_ESTABLE` (`@dnd/shared`) y no como una
      // columna, por lo mismo que reserva `raging` y `helped`: es un estado que dura hasta que
      // algo lo quita, y `CharacterCondition` ya es donde vive eso.
      if (estabilizado) {
        await tx.characterCondition.upsert({
          where: { characterId_key: { characterId, key: CLAVE_ESTABLE } },
          create: { characterId, key: CLAVE_ESTABLE, appliedById: userId },
          // Round 1 de revisión: re-estabilizar (tres éxitos otra vez, tras haber vuelto a caer
          // y a estabilizarse) no tiene por qué cambiar quién la puso la primera vez — a
          // diferencia de `ConditionsService.apply`, que si actualiza `appliedById` porque ahí
          // es el DM aplicando una condición del SRD a mano, y quien la vuelve a aplicar importa.
          update: {},
        });
      } else if (revivido) {
        // Defensivo: un 20 natural siempre revive (código de arriba), así que este personaje no
        // debería llegar aquí ya estable — pero si de algún modo lo estuviera, revivir a 1 PG
        // no es "estar a 0 y estable", y dejar la condición puesta sería un dato imposible.
        await tx.characterCondition.deleteMany({ where: { characterId, key: CLAVE_ESTABLE } });
      }

      const actualizado = await tx.character.update({
        where: { id: characterId },
        data: {
          currentHp: nuevoCurrentHp,
          deathSaveSuccesses: successes,
          deathSaveFailures: failures,
          version: character.version + 1,
        },
      });

      const sessionId = await this.sesionActiva(campaignId, tx);
      const visibilidadTirada = input.visibility ?? character.visibility;
      const deathSaveEvento = await this.events.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          sessionId,
          subjectId: characterId,
          // La visibilidad de la tirada la puede fijar quien tira —igual que en `RollsService`—;
          // por defecto, la de la ficha, para que no haga falta decidirlo cada vez.
          visibility: visibilidadTirada,
          payload: { type: "DEATH_SAVE", roll: dado, result, successes, failures },
        },
        tx,
      );

      // D-CF-14, commit 5 (J5). **Solo en la transición**: `character.deathSaveFailures` es el
      // valor ANTES de esta tirada (la variable local `failures` ya se mutó arriba), así que
      // esto solo dispara cuando el tercer fracaso ACABA de llegar — nunca en una tirada
      // posterior sobre un cadáver que ya tenía tres.
      if (!revivido && !estabilizado && character.deathSaveFailures < 3 && failures >= 3) {
        await this.events.record(
          userId,
          campaignId,
          {
            subjectType: "character",
            sessionId,
            subjectId: characterId,
            visibility: visibilidadTirada,
            payload: {
              type: "CHARACTER_DIED",
              characterId,
              name: character.name,
              cause: "death_saves",
              rollEventId: deathSaveEvento.id,
            },
          },
          tx,
        );
      }

      // **Por qué el `status` de esta respuesta no sale del genérico `estadoDeMuerte`.** Esa
      // función lee la condición reservada `CLAVE_ESTABLE` desde `hojaOMotivo` (Tarea 16), que
      // aquí `buildResponse` volvería a consultar **después** de que el `upsert` de arriba ya
      // la escribiera — daría el mismo resultado, pero sería una segunda vuelta a la base para
      // una respuesta que ya conoce el dato en memoria (`estabilizado`, `revivido`) sin tirar de
      // ella. Antes de esta tarea, además, era la ÚNICA forma de saberlo: los contadores volvían
      // a cero al estabilizar y una lectura posterior no podía distinguir "acaba de
      // estabilizarse" de "recién llegó a 0 PG sin tirar todavía" — el agujero que Tarea 16
      // cierra con la condición.
      const status: DeathState["status"] = revivido
        ? "alive"
        : failures >= 3
          ? "dead"
          : estabilizado
            ? "stable"
            : "dying";

      // PM-1 (cierre, 2026-09-14): respuesta de mutación, no una de las seis lecturas que
      // redactan el enlace con la ficha del mundo — el campo no viaja.
      return {
        ...sinEntityIdEnRespuesta(await this.buildResponse(userId, actualizado, tx)),
        deathSaves: { successes, failures, status },
      };
    });
  }

  /**
   * Fix round 1 (M6), extendido en fix round 2 (R3) — el nombre que oye LA MESA en una tirada
   * de ataque, **sea quien sea quien la pide**, y el `ref` REAL y estable de la fila, para casar
   * el crítico sin depender de ningún visor.
   *
   * `rollAttack`/`resolveAttack` montan el cuadro de ataques con el visor de QUIEN LLAMA
   * (`buildResponse(userId, …)` → `equipoEquipado(userId, …)`): si el DM tira por un jugador
   * (o le pide el daño), `ataque.name`/`ataque.ref` salen del visor del DM —el nombre y el
   * `ref` REALES—, correctos para lo que el DM lee en su propia pantalla pero no para la
   * etiqueta pública de la tirada ni para el suceso `ATTACK_RESOLVED` (registro COMPARTIDO). Y
   * al revés: si es el DUEÑO quien tira un objeto sin identificar, `ataque.ref` ya viene
   * REDACTADO (`SRD:objeto-sin-identificar`, el mismo para CUALQUIER SRD sin identificar) —
   * bueno para el nombre de mesa, inservible para encontrar la fila o para casar un crítico
   * entre dos visores distintos (R3: si el DM tira el ataque y el jugador pide el daño, o al
   * revés, los dos `ref` de visor no coinciden aunque sea la MISMA fila).
   *
   * **Por eso la fila se busca por RANURA, no por `ref`**: la ranura nunca se redacta (solo
   * `MAIN_HAND`/`OFF_HAND` llevan armas, y `claveDeArma` en `rules/attacks.ts` ya compone la
   * `key` como `<ref>:<ranura>` para distinguir dos armas iguales, una en cada mano). Con la
   * fila real en la mano, el `ref` que se guarda (`refReal`) y se compara siempre es
   * `SRD:<srdKey>`/`CAMPAIGN:<campaignItemId>` — el mismo para cualquier visor, cualquier
   * estado de identificación.
   */
  private async datosDeMesaParaAtaque(
    campaignId: string,
    characterId: string,
    character: Pick<Character, "ownerId">,
    ataque: Pick<Attack, "ref" | "name" | "key">,
    tx?: Prisma.TransactionClient,
  ): Promise<{ nombreMesa: string; refReal: string }> {
    const cliente = tx ?? this.prisma;
    const ranura = ataque.key.endsWith(":MAIN_HAND")
      ? "MAIN_HAND"
      : ataque.key.endsWith(":OFF_HAND")
        ? "OFF_HAND"
        : null;
    const fila = await cliente.inventoryItem.findFirst({
      where: {
        characterId,
        location: "EQUIPPED",
        // Con ranura (el caso normal: solo se equipa un arma por mano), se busca por ranura —
        // insensible a qué `ref` vea quien tira. Sin ranura (no debería pasar: toda arma va a
        // una mano), se cae al `ref` del visor como mejor esfuerzo.
        ...(ranura
          ? { slot: ranura }
          : ataque.ref.startsWith("SRD:")
            ? { srdKey: ataque.ref.slice("SRD:".length) }
            : { campaignItemId: ataque.ref.slice("CAMPAIGN:".length) }),
      },
    });
    // No debería pasar —`ataque` sale de lo equipado—, pero un ataque sin fila detrás no puede
    // fingir que la tiene: se cae al nombre y al `ref` que ya trae en vez de reventar una tirada.
    if (!fila) return { nombreMesa: ataque.name, refReal: ataque.ref };
    const ref = fila.srdKey
      ? ({ source: "SRD", key: fila.srdKey } as const)
      : ({ source: "CAMPAIGN", id: fila.campaignItemId as string } as const);
    const { resolved, campaignItem } = await resolveContentRef(
      this.prisma,
      campaignId,
      ref,
      cliente,
    );
    const refReal = fila.srdKey ? `SRD:${fila.srdKey}` : `CAMPAIGN:${fila.campaignItemId}`;
    // Fix round 3 (R8) — la etiqueta de la tirada y `ATTACK_RESOLVED.attackName` son
    // infraestructura COMPARTIDA (el jugador las lee tanto como el DM), así que van con la
    // identificación EFECTIVA de la fila —`row.identified` Y el dueño puede ver el catálogo—,
    // nunca con `row.identified` en crudo.
    const catalogo = campaignItem
      ? {
          visibility: campaignItem.visibility,
          createdById: campaignItem.createdById,
          grantedUserIds: campaignItem.grantedUserIds,
        }
      : null;
    const ownerViewer = await viewerForCharacterOwner(
      this.prisma,
      this.membership,
      campaignId,
      character,
    );
    const filaEfectiva = identificacionEfectiva(fila, catalogo, ownerViewer);
    return { nombreMesa: nombreVisible(resolved, filaEfectiva), refReal };
  }

  /**
   * Tira con un arma equipada: **el servidor compone la expresión**.
   *
   * Es la misma regla que la ventaja de 2A.13 y por el mismo motivo: si el cliente montara la
   * expresión, podría decir que ataca con una daga y mandar `1d12`. Aquí solo llega qué arma y
   * qué mitad —ataque o daño—, y lo que se tira sale del cuadro de ataques que este servicio ya
   * calcula.
   *
   * **El crítico duplica los dados y nunca el modificador** (SRD 5.1): `1d8+3` crítico es
   * `2d8+3`, no `2d8+6`.
   */
  async rollAttack(
    userId: string,
    campaignId: string,
    characterId: string,
    attackKey: string,
    input: RollAttackInput,
  ) {
    await this.membership.requireMember(campaignId, userId);
    // Tirar con un personaje es escribir en su nombre: dueño o DM, igual que gastar sus PG.
    const character = await this.characters.requireEditable(userId, campaignId, characterId);
    const { attacks } = await this.buildResponse(userId, character);
    const ataque = attacks.find((a) => a.key === attackKey);
    if (!ataque) {
      throw new BadRequestException(
        "Ese ataque no está disponible: el arma no está equipada o ya no existe.",
      );
    }
    // Fix round 1 (M6), extendido en fix round 2 (R3) — el nombre de la MESA y el `ref` REAL,
    // ninguno de los dos del visor de quien llama: si el DM tira por un jugador con un arma sin
    // identificar, `ataque.name`/`ataque.ref` de arriba son los reales/redactados de SU vista.
    const { nombreMesa, refReal } = await this.datosDeMesaParaAtaque(
      campaignId,
      characterId,
      character,
      ataque,
    );

    // **La audiencia por defecto sale de la visibilidad del personaje, no es `PUBLIC` fija.**
    // Un PNJ `DM_ONLY` que ataca escribía un suceso a la mesa entera con su nombre dentro —«Ataque
    // con cimitarra»— y con él, el hecho de que ese PNJ existe. Es la misma forma exacta del
    // segundo hallazgo de la revisión de 2C, que era una condición vencida anunciada con `PLAYERS`
    // fijo. Si quien tira lo pide explícitamente, manda lo que pida: el DM sabe lo que hace.
    // Mismo arreglo que en `resolveAttack`: son DOS niveles. Con `=== "PLAYERS"`, un personaje
    // `PUBLIC` —el más abierto— caía en el `else` y su tirada se escondía. Lo cazó la revisión
    // de cierre de 2.5.3, y el defecto vivía aquí desde 2B.
    const audienciaPorDefecto = loVeLaMesa(character.visibility) ? "PUBLIC" : "DM_PRIVATE";

    if (input.part === "ATTACK") {
      // **La ayuda recibida entra aquí, y se combina, no se suma** (I8): ventaja y desventaja se
      // anulan y dos ventajas siguen siendo una. `combinarModo` ya es esa regla.
      const ayuda = await this.ayudaViva(campaignId, characterId);
      const modoConAyuda = ayuda ? combinarModo(input.mode, "ADVANTAGE") : input.mode;
      const tirada = await this.rolls.roll(
        userId,
        campaignId,
        {
          expression: conSigno("1d20", ataque.attackBonus.total),
          label: `Ataque con ${nombreMesa}`,
          characterId,
          mode: modoConAyuda,
          // Pasa tal cual: el gasto y la tirada tienen que ir en la misma transacción, y quien la
          // abre es `RollsService`. Componerlo aquí —gastar y luego pedir la tirada— dejaría el
          // hueco de perder la inspiración sin tirar.
          spendInspiration: input.spendInspiration,
          audience: input.audience ?? audienciaPorDefecto,
        },
        // Fix round 1 (M6), fix round 2 (R3) — `attackRef` es el `ref` REAL de la fila (no el
        // del visor de quien tira), lo que casa el crítico del daño con ESTA tirada (abajo,
        // `esCriticoDesdeLaTirada`) sin importar quién tire cada mitad.
        { attackRef: refReal },
      );
      // **Se consume DESPUÉS de tirar**: si la tirada se hubiera rechazado, la ayuda sigue ahí.
      if (ayuda) {
        await this.consumirAyuda(userId, campaignId, characterId, character.visibility, ayuda);
      }
      return tirada;
    }

    const dano = input.versatile && ataque.versatileDamage ? ataque.versatileDamage : ataque.damage;
    const esCritico = await this.esCriticoDesdeLaTirada(
      campaignId,
      characterId,
      refReal,
      nombreMesa,
      input,
    );
    const dados = esCritico ? duplicarDados(dano.dice) : dano.dice;

    // Paso 2, tarea A11 — el daño de la Furia, con su propia traza.
    //
    // SRD 5.1, «Rage»: *«When you make a melee weapon attack using Strength, you gain the
    // following benefits [...] you deal extra damage»* — solo cuerpo a cuerpo, solo con Fuerza.
    // `ataque.ability` ya dice cuál de las dos usa este arma (`decidirCaracteristica`,
    // `rules/attacks.ts`), y es lo más cerca que este modelo llega a esa condición —**no es
    // idéntica, y hay un caso real donde se separan (menor de la ronda de arreglo 1)**: un hacha
    // de mano o una jabalina (`THROWN`, sin `FINESSE`) siguen resolviendo `ability: "str"` aunque
    // se LANCEN, porque `decidirCaracteristica` no distingue «llevar el arma» de «lanzarla» — y
    // el SRD solo da el bono en un ataque CUERPO A CUERPO, no en uno arrojado. No es arreglable
    // aquí: `rollAttack` no tiene un modo «arrojado» del que depender, y separarlo es trabajo de
    // `rules/attacks.ts`, fuera de esta frontera. Se acepta y se declara, no se esconde detrás de
    // un comentario que diga que la condición es exacta cuando no lo es.
    //
    // La condición que comprueba es la que deja `FURIA.effects` al usar la actividad
    // (`CLAVE_FURIA_ACTIVA`, `rules/catalog/classes.ts`) — la misma puerta genérica que ya
    // aplica cualquier otro efecto (`ActivitiesService.usar`), filtrada contra el reloj de
    // campaña con la misma función que usa el resto de este fichero para cualquier condición
    // (`condicionesActivas`).
    const bonoFuria = await this.bonoDeFuria(campaignId, characterId, character, ataque.ability);

    const peticion = {
      expression: conSigno(dados, dano.modifier + (bonoFuria?.valor ?? 0)),
      label: `Daño de ${nombreMesa}${esCritico ? " (crítico)" : ""}${bonoFuria ? " + Furia" : ""}`,
      characterId,
      // El daño no tiene ventaja: la ventaja es del d20. Mandarla aquí tiraría dos veces el
      // dado de daño y se quedaría con el mejor, que no es una regla de ninguna edición.
      mode: "NORMAL",
      // Y tampoco inspiración: el SRD la gasta en ataque, salvación o prueba, y el daño no es
      // ninguna de las tres. El esquema ya rechaza pedirlo; esto es la otra mitad de esa verdad.
      spendInspiration: false,
      // Low #8, revisión final de `ficha/tanda-2-a-5`: era `?? "PUBLIC"` fijo, distinto del
      // `audienciaPorDefecto` que ya usa el ATAQUE de arriba. Un cliente por API que omitiera
      // `audience` en `part: "DAMAGE"` publicaba el daño de un PNJ `DM_ONLY` a toda la mesa —
      // la web ya manda siempre `audience` (`TirarAtaqueBoton`), así que esto solo se veía por
      // API directa.
      audience: input.audience ?? audienciaPorDefecto,
    } as const;

    // **La tirada de ataque citada tiene que ser DE ESTE ataque.** Sin esto, `attackRollEventId`
    // solo casaba por `rollEventId` en el `ATTACK_RESOLVED` de abajo: nada impedía cobrar el daño
    // de la ballesta citando la tirada de la espada, siempre que las dos fueran del mismo
    // personaje. Mismo `attackRef` que ya usa `esCriticoDesdeLaTirada` (M6/R3) para casar el
    // crítico — el `ref` REAL de la fila, no el del visor de quien pregunta.
    if (input.attackRollEventId) {
      const tiradaDeAtaque = await this.prisma.gameEvent.findFirst({
        where: {
          id: input.attackRollEventId,
          campaignId,
          subjectType: "character",
          subjectId: characterId,
          type: "ABILITY_ROLL",
        },
        select: { attackRef: true },
      });
      // Histórico sin `attackRef` (anterior a la columna, R3): no hay con qué comparar, así que
      // no se rechaza — igual que `esCriticoDesdeLaTirada` cae a otro criterio en ese caso.
      if (tiradaDeAtaque?.attackRef != null && tiradaDeAtaque.attackRef !== refReal) {
        throw new BadRequestException("Esa tirada de ataque no es de este ataque.");
      }
    }

    // Spec §4b.4 (E-PE-5): el daño de un ataque RESUELTO contra un objetivo sabe a quién le toca.
    // Solo si la tirada citada tiene un ATTACK_RESOLVED colgando y el veredicto fue HIT o
    // CRITICAL; un daño tirado al aire, o sobre un fallo, no lleva `pendingDamage`.
    const veredicto = input.attackRollEventId
      ? await this.prisma.gameEvent.findFirst({
          where: {
            campaignId,
            type: "ATTACK_RESOLVED",
            payload: { path: ["rollEventId"], equals: input.attackRollEventId },
          },
          select: { id: true, subjectId: true, payload: true },
        })
      : null;
    const v = (veredicto?.payload as { verdict?: string } | undefined)?.verdict;
    const pendingDamage =
      veredicto && (v === "HIT" || v === "CRITICAL")
        ? {
            targetCharacterId: veredicto.subjectId,
            attackResolvedEventId: veredicto.id,
            damageType: dano.type,
          }
        : undefined;

    try {
      // **D-OP-15: la tirada que se está cobrando queda escrita, con índice único detrás.** El
      // cuarto argumento **solo se pasa cuando hay algo que decir**: un `undefined` explícito
      // cambiaría la forma de todas las llamadas del camino de siempre sin añadir nada.
      const tirada = await (input.attackRollEventId
        ? this.rolls.roll(userId, campaignId, peticion, {
            attackRollEventId: input.attackRollEventId,
            ...(pendingDamage ? { pendingDamage } : {}),
          })
        : this.rolls.roll(userId, campaignId, peticion));
      // **`trace` solo viaja cuando hay algo que explicar** (mismo criterio que el cuarto
      // argumento de arriba): un golpe sin Furia no gana un campo nuevo que nadie mira.
      return bonoFuria ? { ...tirada, trace: [bonoFuria.paso] } : tirada;
    } catch (error) {
      // **El segundo cobro lo rechaza la BASE, no un `if`.** P2002 = violación de restricción
      // única. Comprobarlo en el servicio sería una carrera esperando a ocurrir en cuanto alguien
      // pulse dos veces o tenga dos pestañas abiertas; el servicio solo traduce el choque a un 409
      // que se pueda leer. Misma forma que «como mucho una sesión en curso por campaña».
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        input.attackRollEventId
      ) {
        throw new ConflictException("El daño de esa tirada de ataque ya se había cobrado.");
      }
      throw error;
    }
  }

  /**
   * Tarea 2.5.4, ficha C2.5-2. **Si el golpe fue crítico, verificado contra la tirada real.**
   *
   * Hasta hoy `input.critical` viajaba en el cuerpo de la petición sin atarse a ningún 20 de
   * verdad: cualquiera podía pedir el daño duplicado sin haber sacado un crítico. Con
   * `attackRollEventId` —el `eventId` que `resolveAttack` (2.5.3) ya devuelve en `roll.eventId`—
   * se lee el `natural` que quedó escrito en el suceso de esa tirada, del MISMO personaje y esta
   * MISMA campaña, y se ignora lo que declare `critical`.
   *
   * **Sin `attackRollEventId`, se mantiene `input.critical` como hasta ahora** (ficha C2.5-2,
   * `docs/06-pendientes.md`): quitarlo de raíz rompería al carril que está rehaciendo `apps/web`
   * y todavía puede llamar a este endpoint sin el campo nuevo — la frontera de esta tarea es
   * solo-añadir, y un cambio de comportamiento silencioso ahí sería peor que el hueco que cierra
   * a medias.
   */
  /**
   * Paso 2, tarea A11 — cuánto sube el daño con Fuerza mientras dura la Furia, y su paso de
   * traza. `undefined` cuando no aplica —`ability !== "str"`, sin la condición viva, o una clase
   * que el catálogo ya no reconoce—, nunca un cero silencioso: un cero sumado a la expresión de
   * daño se ve igual que «no hay Furia» y esta función no tiene por qué fingir que sabe la
   * diferencia si `resolverOrigen` no puede resolverla.
   *
   * **`ability !== "str"` no es lo mismo que «arma a distancia o con Destreza» (menor de la
   * ronda de arreglo 1, corregido en la llamada de arriba).** Un hacha de mano o una jabalina
   * LANZADAS (`THROWN`, sin `FINESSE`) siguen resolviendo `ability: "str"` en
   * `decidirCaracteristica` (`rules/attacks.ts`), que no distingue empuñar de lanzar — así que
   * esta función SÍ les da el bono, aunque el SRD solo lo da en un ataque cuerpo a cuerpo. Ver el
   * comentario de la llamada y la ficha `A11-lanzado-cuenta-como-cuerpo-a-cuerpo` en
   * `docs/06-pendientes.md`.
   *
   * **Por qué la comprobación de la condición va ANTES de tocar la tabla de escala.** Pedir la
   * tabla y resolver el origen para descartarlo después sería trabajo de sobra en el camino
   * caliente de un ataque sin Furia —la inmensa mayoría—, y `resolverOrigen` **lanza** si el
   * nivel del personaje no llega al primer tramo: nunca debería intentarse resolver sin haber
   * confirmado antes que hay algo que resolver.
   */
  private async bonoDeFuria(
    campaignId: string,
    characterId: string,
    character: FilaPersonaje,
    ability: AbilityKey,
  ): Promise<{ valor: number; paso: TraceStep } | undefined> {
    if (ability !== "str") return undefined;

    const [condiciones, campana] = await Promise.all([
      this.prisma.characterCondition.findMany({
        where: { characterId, key: CLAVE_FURIA_ACTIVA },
        select: { key: true, level: true, expiresAtClock: true, expiryEdge: true },
      }),
      this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } }),
    ]);
    if (condicionesActivas(condiciones, campana.clockSeconds).length === 0) return undefined;

    const clase = SRD_CLASSES.find((c) => c.key === character.classKey);
    if (!clase?.scales?.["rage-damage"]) return undefined;

    // **`abilities` sin puntuaciones de verdad, a propósito.** `resolverOrigen` con
    // `tipo: "escala"` solo lee `ctx.escalas` y `ctx.level` (ver `engine.ts`): rellenar las seis
    // características con ceros no cambia el resultado, y así se reutiliza la misma función
    // probada de `resolverOrigen` en vez de repetir su lógica de tramos aquí — que es
    // precisamente la lección de esta tanda sobre no separar dos fórmulas de un mismo cálculo.
    const ctx: ContextoDeDerivacion = {
      abilities: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      level: character.level,
      escalas: tablaDeEscalas(clase.scales),
    };
    return resolverOrigen({ tipo: "escala", clave: "rage-damage" }, ctx);
  }

  private async esCriticoDesdeLaTirada(
    campaignId: string,
    characterId: string,
    refDelAtaque: string,
    nombreMesaDelAtaque: string,
    input: RollAttackInput,
  ): Promise<boolean> {
    // **Sin tirada citada no hay crítico.** Aquí se devolvía `input.critical`, el campo que el
    // cuerpo de la petición declaraba; se quitó del esquema el 2026-09-05 y con él la última
    // puerta por la que alguien podía pedir el daño duplicado sin haber sacado un 20.
    if (!input.attackRollEventId) return false;
    const evento = await this.prisma.gameEvent.findFirst({
      where: {
        id: input.attackRollEventId,
        campaignId,
        subjectType: "character",
        subjectId: characterId,
        // **Por la columna, no por dentro del `payload`.** `type` es una columna real e indexada
        // desde el principio; leerla del Json obligaba a traerse el `payload` entero y a filtrar
        // en memoria lo que la base filtra sola. Lo señaló la revisión de cierre.
        type: "ABILITY_ROLL",
      },
      select: { payload: true, attackRef: true },
    });
    if (!evento) {
      throw new BadRequestException("Esa tirada de ataque no existe en esta campaña.");
    }
    // **Y que sea la tirada de ESTE ataque, no un 20 cualquiera.** La primera versión aceptaba
    // cualquier `ABILITY_ROLL` del personaje con un 20 natural: un 20 en una prueba de Sigilo
    // valía como crítico de la cimitarra. **Fix round 1 (M6), corregido en fix round 2 (R3): se
    // casa por `attackRef`, y es el `ref` REAL de la fila —el mismo para cualquier visor—, no el
    // del visor de quien tira.** La primera versión de este arreglo guardaba `ataque.ref` tal
    // cual, que SÍ cambia entre visores (el del DM ve el `ref` real; el del dueño de un objeto
    // sin identificar ve `SRD:objeto-sin-identificar`, igual para cualquier SRD sin
    // identificar): si el DM tiraba el ataque y el jugador pedía el daño —o al revés—, los dos
    // `ref` de visor no casaban aunque fuera la MISMA fila. `datosDeMesaParaAtaque` ahora
    // resuelve el `ref` real por la RANURA de la fila, no por el `ref` de quien pregunta.
    const payload = evento.payload as { natural?: string; reason?: string };
    if (evento.attackRef != null) {
      return evento.attackRef === refDelAtaque && payload.natural === "TWENTY";
    }
    // **Histórico, sin `attackRef` (anterior a la columna).** Fix round 2 (R3): en vez de dar
    // por hecho que una tirada vieja nunca puede ser el crítico de nada, se cae al criterio de
    // antes de fix round 1 (M6) —casar por el nombre que `rollAttack` escribió en `reason`—,
    // que es exactamente correcto para esas filas: ningún objeto sin identificar existía
    // todavía cuando se escribieron, así que el nombre de mesa y el nombre real eran el mismo.
    return payload.reason === `Ataque con ${nombreMesaDelAtaque}` && payload.natural === "TWENTY";
  }

  /**
   * Tarea 2.5.3 — el ataque, comparado en el servidor.
   *
   * El jugador pide «ataco al objetivo X con mi cimitarra». Aquí se deriva el bono (como ya
   * hacía `rollAttack`), se tira con el azar del servidor, se compara con la CA del objetivo
   * —que **nunca sale de este método**— y se propone un veredicto. Ni el impacto ni el daño se
   * aplican solos: el DM confirma o corrige (§4 del spec de la fase 2.5).
   *
   * **A quién se puede apuntar, y por qué la regla cambió el 2026-09-05 (D-OP-11).** Aquí ponía
   * que no hacía falta `canView` sobre el objetivo, porque «atacar es un acto de la ficción» y el
   * spec pedía que un jugador que ataca a un PNJ `DM_ONLY` reciba su veredicto igual. Lo segundo
   * sigue siendo verdad; lo primero **convertía este endpoint en un oráculo**: con un identificador
   * y paciencia, cada ataque es una comparación exacta `total >= CA` con el total conocido, así que
   * veinte o treinta peticiones dan la CA de **cualquier** personaje de la campaña. El atacante
   * conoce su propio bono, así que ni siquiera necesita suerte.
   *
   * La regla que concilia las dos cosas: el objetivo tiene que **pasar `canView` para quien ataca**
   * *o* **ser combatiente del encuentro activo**. El PNJ `DM_ONLY` que el DM acaba de bajar a la
   * mesa cumple lo segundo —está delante—, así que el criterio del spec se conserva entero; un
   * identificador pescado al azar no cumple ninguno.
   *
   * **404 y no 403, y esto es lo importante:** un 403 confirma que el personaje existe. La
   * respuesta es **idéntica** a la de un identificador que nadie ha creado nunca, mismo mensaje
   * incluido, y hay un e2e que compara los dos cuerpos.
   *
   * **Lo que sigue siendo deducible, y se acepta:** contra un objetivo que sí puedes ver, atacarlo
   * repetidamente sigue dando su CA — igual que en una mesa, donde el DM dice «fallas» y con el
   * tiempo se aprende. El SRD lo respalda (*«the GM typically just says the attack missed»*) y no
   * prohíbe atacar a ciegas.
   *
   * **El crítico deja de decidirlo quien pide la tirada** (ficha R2C-2, la duplicación de dados
   * de la DAMAGE de `rollAttack` seguirá arreglándose en 2.5.4). Aquí el veredicto sale de la
   * MISMA tirada que se acaba de hacer —su `natural`, su `total`—, nunca de un campo que el
   * cuerpo de la petición pudiera declarar por su cuenta.
   */
  async resolveAttack(
    userId: string,
    campaignId: string,
    characterId: string,
    attackKey: string,
    input: ResolveAttackInput,
  ) {
    await this.membership.requireMember(campaignId, userId);
    const character = await this.characters.requireEditable(userId, campaignId, characterId);
    const { attacks } = await this.buildResponse(userId, character);
    const ataque = attacks.find((a) => a.key === attackKey);
    if (!ataque) {
      throw new BadRequestException(
        "Ese ataque no está disponible: el arma no está equipada o ya no existe.",
      );
    }
    // Fix round 1 (M6), fix round 2 (R3) — mismo criterio que `rollAttack`: el nombre de mesa y
    // el `ref` real, no los de quien ataca, para la etiqueta pública, el suceso
    // `ATTACK_RESOLVED` y el `attackRef` de la tirada (por si `rollAttack` cobra su daño luego).
    const { nombreMesa, refReal } = await this.datosDeMesaParaAtaque(
      campaignId,
      characterId,
      character,
      ataque,
    );
    if (input.targetCharacterId === characterId) {
      throw new BadRequestException("No se puede atacar al propio personaje.");
    }

    const target = await this.prisma.character.findFirst({
      where: { id: input.targetCharacterId, campaignId, archivedAt: null },
    });
    // **El mismo 404 exacto en los dos casos** (D-OP-11): el que no existe y el que existe pero no
    // puedes ni ver ni tener delante. Si los cuerpos difirieran en una coma, el oráculo seguiría
    // abierto por otra puerta.
    if (!target || !(await this.sePuedeApuntar(userId, campaignId, target))) {
      throw new NotFoundException("Character not found");
    }

    // La CA se calcula ANTES de tirar: si el objetivo no se puede resolver (un PNJ cuyo
    // statblock se borró, por ejemplo), es un 400 honesto y no una tirada que luego no se puede
    // comparar con nada.
    const ac = await this.caDelObjetivo(target);

    // **D-OP-13: el estado del OBJETIVO cambia cómo se tira contra él.** 2.5.5 implementó la
    // desventaja del ciego —«¿cómo tiro yo?»— y dejó fuera la otra mitad de la misma frase del
    // SRD: *"Attack rolls against the creature have advantage"*. Esa mitad no puede vivir en
    // `suggested-roll-mode.ts`, que responde a la pregunta del que tira; vive aquí, que es el
    // único sitio donde se conoce al objetivo.
    //
    // Se filtran las vencidas contra el reloj de campaña, igual que hace la hoja: una condición
    // caducada sigue en la fila y no calcula nada.
    const [condicionesDelObjetivo, campanaDelReloj] = await Promise.all([
      this.prisma.characterCondition.findMany({
        where: { characterId: target.id },
        select: { key: true, level: true, expiresAtClock: true, expiryEdge: true },
      }),
      this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } }),
    ]);
    const contra = modoContraObjetivo(
      condicionesActivas(condicionesDelObjetivo, campanaDelReloj.clockSeconds),
    );
    // **Y se combinan con la regla del SRD, no sumando:** ventaja y desventaja se anulan, y dos
    // del mismo signo siguen siendo una.
    // **Y la ayuda recibida, que es del atacante** (I8). Se combina con lo mismo: el SRD dice que
    // dos fuentes de ventaja siguen siendo ventaja, así que esto NO suma nada.
    const ayuda = await this.ayudaViva(campaignId, characterId);
    const modo = combinarModo(
      combinarModo(input.mode, contra.effect),
      ayuda ? "ADVANTAGE" : "NONE",
    );

    // Misma regla que `rollAttack`: la audiencia por defecto sale de la visibilidad de QUIEN
    // ATACA, nunca `PUBLIC` fija — es la fuga que ya volvió una vez en 2.5.2 (ver el comentario
    // de `rollAttack`, arriba, y el de `EncountersService.start`).
    //
    // **Y son DOS niveles, no uno.** El predicado era `=== "PLAYERS"`, así que un personaje
    // `PUBLIC` —el más abierto de los cinco— caía en el `else` y su tirada se escondía como
    // `DM_PRIVATE`. Peor: con `DM_PRIVATE` el propio jugador no ve su total, así que
    // `revealed` es falso y **no recibe veredicto**, lo que parece un fallo del ataque y es de
    // la audiencia. Lo cazó la revisión de cierre; el defecto venía copiado de `rollAttack` y
    // se arregla en los dos sitios.
    const audienciaPorDefecto = loVeLaMesa(character.visibility) ? "PUBLIC" : "DM_PRIVATE";

    const roll = await this.rolls.roll(
      userId,
      campaignId,
      {
        expression: conSigno("1d20", ataque.attackBonus.total),
        label: `Ataque con ${nombreMesa}`,
        characterId,
        mode: modo,
        spendInspiration: input.spendInspiration,
        audience: input.audience ?? audienciaPorDefecto,
      },
      // Fix round 1 (M6), fix round 2 (R3) — `roll.eventId` puede ser citado más tarde por
      // `rollAttack` (DAMAGE) con `attackRollEventId`: necesita el `ref` REAL de la fila
      // escrito aquí para que el crítico se pueda casar sin depender del nombre ni del visor.
      { attackRef: refReal },
    );
    if (ayuda) {
      await this.consumirAyuda(userId, campaignId, characterId, character.visibility, ayuda);
    }

    // Tirada a ciegas: quien la pidió no ve el total, así que tampoco ve el veredicto — decirle
    // «impacta» sin el número sería la misma fuga por otra puerta (ver `attack.schema.ts`).
    if (!roll.revealed) return { roll };

    // **Tres estados, y el 20/1 natural mandan sobre la CA** (SRD 5.1, "Resolving Attacks",
    // dnd5eapi.co §rule-sections/making-an-attack): «If the d20 roll for an attack is a 20, the
    // attack hits regardless of any modifiers or the target's AC. This is called a critical
    // hit.» / «If the d20 roll for an attack is a 1, the attack misses regardless of any
    // modifiers or the target's AC.» La CA que decide el resto de los casos no aparece en
    // ninguna parte de este cálculo salvo en la comparación misma: lo que sale es la palabra.
    const verdict: AttackVerdict =
      roll.natural === "TWENTY"
        ? "CRITICAL"
        : roll.natural === "ONE"
          ? "MISS"
          : roll.total >= ac
            ? "HIT"
            : "MISS";

    // **La propuesta se escribe, y sin esto el §2.5.3 no estaba hecho.** El paso 5 del spec dice
    // *«el DM confirma o corrige»*, y §4 lo resume en *«el sistema propone; el DM dispone»*. En
    // la primera versión el veredicto **solo existía en la respuesta HTTP del atacante**: no
    // había suceso, ni objetivo, ni veredicto en ninguna parte, así que **no había nada que
    // confirmar ni que corregir**. Lo encontró la revisión de cierre.
    //
    // **La visibilidad es la del OBJETIVO, no la del atacante**, y es la única que no filtra en
    // ninguna de las dos direcciones: un ataque a un PNJ escondido no puede anunciarle a la mesa
    // que ese PNJ existe. El atacante ya tiene su veredicto en la respuesta, así que no pierde
    // nada; el DM lo ve siempre, que es de quien depende el paso 5.
    //
    // Y tiene un segundo efecto que importa: **deja rastro de contra quién se tiró**. Sin él,
    // alguien podía acotar la CA de un objetivo a base de ataques sin que quedara constancia de
    // nada (ver la ficha del oráculo en `docs/06-pendientes.md`).
    await this.events.record(userId, campaignId, {
      subjectType: "character",
      subjectId: target.id,
      visibility: target.visibility,
      payload: {
        type: "ATTACK_RESOLVED",
        attackerId: characterId,
        attackName: nombreMesa,
        verdict,
        rollEventId: roll.eventId,
      },
    });

    return { roll, verdict };
  }

  /**
   * La CA de un objetivo de ataque, **calculada sin que ninguna visibilidad la recorte**.
   *
   * Es la misma idea que ya declaraba `equipoEquipado` para el máximo de PG —«da igual quién
   * mira, se usa el estado real»—, llevada al único sitio donde faltaba: `hojaDeStatblock` se
   * NIEGA entera —sin hoja, sin CA, solo un motivo— a cualquiera que no sea el DM o quien creó
   * el statblock. El atacante casi nunca es ninguno de los dos, y aun así tiene que poder
   * comparar. El espectador que se le pasa a `hojaOMotivo` aquí es del servidor, no de nadie que
   * haya iniciado sesión: nunca se devuelve, nunca se guarda, solo entra en una resta.
   */
  private async caDelObjetivo(target: FilaPersonaje): Promise<number> {
    const { items } = await this.equipoEquipado(target.ownerId, target);
    const resultado = await this.hojaOMotivo(espectadorDelServidor(target), target, items);
    if (!("sheet" in resultado)) {
      // **El motivo NO viaja, y esto lo encontró la revisión de cierre como fuga real.** Los
      // `reason` de `hojaOMotivo` están escritos para que los lea el dueño o el DM sobre su
      // propia ficha, y aquí se le entregaban a un atacante cualquiera. Dos ejemplos de lo que
      // salía: *«Este PNJ apunta a un statblock que ya no existe (CAMPAIGN:<cuid>)»* —que le
      // confirma al jugador que el objetivo es un PNJ **y le da el id del statblock del DM**— y
      // *«Faltan datos para calcular la hoja: raza, clase»*, que es el estado de construcción
      // del personaje de otro.
      //
      // Fuera va una frase que no dice nada del objetivo; el detalle se queda en el servidor.
      throw new BadRequestException("Ese objetivo no se puede resolver ahora mismo.");
    }
    // **Devuelve el NÚMERO, no la hoja.** También de la revisión: se llamaba «la CA del
    // objetivo» y devolvía la hoja entera derivada con ojos de DM —PG máximos, salvaciones,
    // dieciocho habilidades y la traza, que 2D documenta que lleva la nota del libro dentro—.
    // Hoy el único llamante leía `.derived.ac.total`; el tipo es lo que impide que el siguiente
    // lea otra cosa, y un comentario no lo impide.
    return resultado.sheet.derived.ac.total;
  }

  /**
   * La CA del personaje, calculada **dentro de una transacción abierta**, con el `tx` de quien
   * llama (M2B-11). Neutral a propósito — no se llama "AfterWrite": el inventario la pide dos
   * veces en la misma transacción de `update()`, antes y después de escribir el cambio, para
   * poder devolver `{ item, acBefore, ac }` en un solo viaje — la pantalla hacía `fetchAc` →
   * `PATCH` → `fetchAc`, y si el segundo `fetchAc` fallaba, la ficha se quedaba enseñando la CA
   * vieja aunque el servidor ya hubiera escrito el cambio.
   *
   * **Reutiliza `construirODenegar`**, el mismo camino que ya usan `getSheet` y `updateSheet`: no
   * hay una segunda fórmula de CA, solo un segundo llamante. `null` cuando no hay hoja que
   * derivar —un PNJ sin plantilla, por ejemplo—, que es un hueco tan legítimo como el que ya deja
   * `equipoEquipado` con un objeto no resoluble: equipar no tiene por qué fallar por eso.
   *
   * **El `catch` solo atrapa el "no hay hoja"** (`BadRequestException`, lo que lanza
   * `construirODenegar` cuando `hojaOMotivo` no puede derivar). Cualquier otro fallo —una
   * consulta rota, una excepción de Prisma— se propaga: silenciarlo aquí escondería un error real
   * detrás de un `ac: null` que parecería un caso legítimo.
   */
  async armorClassInTransaction(
    userId: string,
    character: FilaPersonaje,
    tx: Prisma.TransactionClient,
  ): Promise<number | null> {
    try {
      const sheet = await this.construirODenegar(userId, character, tx);
      return sheet.derived.ac.total;
    } catch (e) {
      if (e instanceof BadRequestException) return null;
      throw e;
    }
  }
}

/**
 * El espectador del servidor: ve la plantilla entera de un personaje **para calcular con ella**,
 * nunca para enseñarla. Lo usan `caDelObjetivo` y `hojaDelServidor`; un `Viewer` así no sale de
 * este fichero ni se guarda en ningún sitio.
 */
function espectadorDelServidor(character: FilaPersonaje): Viewer {
  return { userId: character.ownerId, role: "DM", isAdmin: false };
}

/** `1d8` + 3 → `1d8+3`; + 0 → `1d8`; − 1 → `1d8-1`. El evaluador no entiende un `+0`. */
function conSigno(dados: string, modificador: number): string {
  if (modificador === 0) return dados;
  return `${dados}${modificador > 0 ? "+" : "-"}${Math.abs(modificador)}`;
}

/**
 * Un crítico **duplica los dados, no el modificador**: `1d8` → `2d8`, `2d6` → `4d6`.
 * Se duplica la cantidad y jamás las caras — `1d16` no es un crítico de nada.
 */
function duplicarDados(dados: string): string {
  const [cantidad, caras] = dados.split("d");
  return `${Number(cantidad) * 2}d${caras}`;
}

/**
 * El mismo objeto **sin decir cuál es**: se conservan sus números y se borra su identidad.
 *
 * Es la respuesta al hallazgo crítico de la revisión de 2B: la hoja leía el equipo sin pasar por
 * `canView`, así que el nombre y el identificador de un objeto que el listado del inventario
 * escondía —uno `DM_ONLY`, o uno `SPECIFIC_PLAYERS` de otro jugador— salían igualmente en el
 * cuadro de ataques, en los pasos de la traza y en los avisos.
 *
 * **No se quita del cálculo, se le quita el nombre**, y la diferencia importa: excluirlo daría
 * una Clase de Armadura distinta a cada persona que mira la misma hoja, y entonces la hoja
 * mentiría a alguien. Que el número siga viéndose ya estaba decidido y declarado (ficha I3 de
 * `docs/06-pendientes.md`): la traza delataría la cifra de todas formas, y media ocultación es
 * peor que ninguna porque parece completa.
 */
function redactado(item: ResolvedItem, indice: number): ResolvedItem {
  return {
    ...item,
    // La referencia tampoco viaja: es el identificador de la fila que se está escondiendo. El
    // índice la mantiene única dentro de esta hoja, que es lo único que necesita el cuadro de
    // ataques para poder pedir su tirada.
    ref: `CAMPAIGN:oculto-${indice}`,
    name: "Objeto oculto",
    description: undefined,
  };
}
