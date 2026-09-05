import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
  Inject,
} from "@nestjs/common";
import type { Character } from "@prisma/client";
import { RANGO_DE_ANULACION } from "@dnd/shared";
import type {
  AbilityKey,
  Visibility,
  AttackVerdict,
  ContentRefInput,
  ResolvedItem,
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
  UpdateCharacterSheetInput,
} from "@dnd/shared";
import type { Modifier } from "../rules/engine";
import { buildAttacks, type Attack } from "../rules/attacks";
import { resolveContentRef } from "../inventory/common/resolve-item";
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
import { rollExpression, type Roller } from "../dice/dice";
import { DICE_ROLLER, RollsService } from "../rolls/rolls.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StatblocksService } from "../statblocks/statblocks.service";
import { CharactersService } from "./characters.service";
import { ResourcesService } from "../character-state/resources/resources.service";
import {
  effectiveSpeed,
  type EffectiveSpeedResult,
} from "../character-state/speed/effective-speed";
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

// Tareas 2A.6 y 2A.7 — la hoja calculada y los PG mutables.
//
// **Se guarda lo decidido; se calcula lo derivado**, siempre por `deriveCharacter`. Este
// servicio nunca escribe `maxHp`, CA ni ningún modificador en una columna: los lee de la hoja
// que el catálogo deriva en el momento, con las seis características, la raza y la clase que sí
// están en la fila.

/** El personaje tal y como sale de la base, con las columnas que hacen falta para derivar. */
type FilaPersonaje = Character;

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
type HojaDerivada = ({ sheet: CharacterSheet } | { reason: string }) & { exhaustion: number };

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
      level: character.level,
      choices: (character.choices as CharacterChoices | null) ?? undefined,
      // **El equipo equipado entra por la misma puerta que la raza y la clase** (fase 2B). Va
      // resuelto y no por referencia: comprobar que un objeto de campaña es de ESTA campaña
      // necesita la base, y el resolutor no la toca — así no hay ningún `else` donde se cuele un
      // identificador de otra mesa.
      items,
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
): { sheet: CharacterSheet } | { reason: string } {
  try {
    return { sheet: deriveCharacter(build, overrides) };
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
    if (typeof valor !== "number") continue;
    salida.push({
      target: clave,
      op: "override",
      amount: valor,
      sourceType: "manual",
      sourceKey: clave,
      labelKey: "override.manual",
    });
  }
  return salida;
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

  private async viewerFor(userId: string, campaignId: string): Promise<Viewer> {
    const [member, user] = await Promise.all([
      this.membership.getMembership(campaignId, userId),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    return { userId, role: member?.role ?? null, isAdmin: user?.isAdmin ?? false };
  }

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
    const viewer = await this.viewerFor(userId, campaignId);
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
  ): DeathState {
    const successes = character.deathSaveSuccesses;
    const failures = character.deathSaveFailures;
    let status: DeathState["status"] = "alive";
    if (muertoPorAgotamiento(nivelDeAgotamiento)) status = "dead";
    else if (currentHpCrudo === 0) {
      if (failures >= 3) status = "dead";
      else if (successes >= 3) status = "stable";
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
  ): Promise<{ items: ResolvedItem[]; warnings: DerivationWarning[] }> {
    const filas = await this.prisma.inventoryItem.findMany({
      where: { characterId: character.id, location: "EQUIPPED" },
      orderBy: { createdAt: "asc" },
    });
    if (filas.length === 0) return { items: [], warnings: [] };

    const viewer = await this.viewerFor(userId, character.campaignId);
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
        );
        const puedeVerlo =
          !campaignItem ||
          canView(viewer, {
            visibility: campaignItem.visibility,
            createdById: campaignItem.createdById,
            grantedUserIds: campaignItem.grantedUserIds,
          });
        // **La ranura que vale es la de la fila, no la del catálogo.** `findSrdItem` devuelve el
        // objeto con su ranura por defecto —toda arma dice `MAIN_HAND`—, así que dos dagas
        // equipadas, una en cada mano, llegaban al cuadro de ataques con la misma clave: dos
        // filas indistinguibles, `rollAttack` tirando siempre la primera y React repitiendo
        // `key`. Y sin la ranura real no se puede saber si la otra mano está ocupada, que es lo
        // que decide si un arma versátil puede empuñarse a dos manos.
        const conRanura: ResolvedItem = { ...resolved, slot: fila.slot ?? resolved.slot };
        items.push(puedeVerlo ? conRanura : redactado(conRanura, ++ocultos));
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

  private async buildResponse(userId: string, character: FilaPersonaje) {
    const equipo = await this.equipoEquipado(userId, character);
    const resultado = await this.hojaOMotivo(
      await this.viewerFor(userId, character.campaignId),
      character,
      equipo.items,
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

    return {
      character,
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
      deathSaves: this.estadoDeMuerte(character, currentHpCrudo, resultado.exhaustion),
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
    const viewer = await this.viewerFor(userId, campaignId);
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, campaignId },
    });
    if (!character || !this.canSee(viewer, character)) {
      throw new NotFoundException("Character not found");
    }
    const respuesta = await this.buildResponse(userId, character);
    return {
      ...respuesta,
      ...(await this.loQueDerivanLasCondiciones(characterId, campaignId, respuesta.sheet)),
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
    characterId: string,
    campaignId: string,
    sheet: CharacterSheet | null,
  ): Promise<{
    effectiveSpeeds: Record<string, EffectiveSpeedResult>;
    rollSuggestions: RollSuggestions;
  }> {
    // **Solo las que siguen vivas** (2C.4): una condición vencida sigue en la hoja, marcada, pero
    // ya no calcula nada. Filtrar aquí es lo que impide que la caducidad dependa de que alguien
    // haya abierto la pantalla de condiciones.
    const [todas, campana] = await Promise.all([
      this.prisma.characterCondition.findMany({
        where: { characterId },
        select: { key: true, level: true, expiresAtClock: true },
      }),
      this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } }),
    ]);
    const conditions = condicionesActivas(todas, campana.clockSeconds);
    const effectiveSpeeds: Record<string, EffectiveSpeedResult> = {};
    // Las velocidades necesitan una base que solo la hoja da; la sugerencia de modo **no**, y por
    // eso sale igual cuando no hay hoja: un personaje a medio crear con la condición «apresado»
    // puesta sigue tirando en la mesa.
    for (const [movimiento, pies] of Object.entries(sheet?.speeds ?? {})) {
      if (typeof pies === "number") effectiveSpeeds[movimiento] = effectiveSpeed(pies, conditions);
    }
    return { effectiveSpeeds, rollSuggestions: rollSuggestionsFor(conditions) };
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

    const data: Record<string, unknown> = {};
    if (input.abilities) {
      for (const clave of ["str", "dex", "con", "int", "wis", "cha"] as const) {
        const valor = input.abilities[clave];
        if (valor !== undefined) data[clave] = valor;
      }
    }

    try {
      if (input.race !== undefined) {
        const raceKey = claveSrd(input.race);
        findRace(input.race);
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
        findClass(input.class);
        data.classKey = classKey;
      }
    } catch (error) {
      if (error instanceof UnknownContentError) throw new BadRequestException(error.message);
      throw error;
    }

    if (input.level !== undefined) data.level = input.level;
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

    const actualizado = await this.prisma.character.update({
      where: { id: characterId },
      data,
    });
    const respuesta = await this.buildResponse(userId, actualizado);
    await this.sembrarRecursos(characterId, respuesta.sheet, actualizado.level);
    return respuesta;
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
    actuales[target] = input.value;

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
        ...(previous !== undefined ? { previous } : {}),
        ...(input.reason ? { reason: input.reason } : {}),
      },
    });
    return await this.buildResponse(userId, actualizado);
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
    if (actuales[target] === undefined) return await this.buildResponse(userId, character);
    delete actuales[target];

    const actualizado = await this.prisma.character.update({
      where: { id: characterId },
      data: { overrides: actuales },
    });
    return await this.buildResponse(userId, actualizado);
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
    const [condiciones, campana] = await Promise.all([
      client.characterCondition.findMany({
        where: { characterId: character.id },
        select: { key: true, level: true, expiresAtClock: true },
      }),
      client.campaign.findUniqueOrThrow({ where: { id: character.campaignId } }),
    ]);
    const nivel = nivelDeAgotamiento(condicionesActivas(condiciones, campana.clockSeconds));

    const base = character.statblockRef
      ? await this.hojaDeStatblock(viewer, character)
      : this.hojaDePersonaje(character, items);
    if (!("sheet" in base)) return { ...base, exhaustion: nivel };
    if (nivel === 0) return { ...base, exhaustion: nivel };
    return {
      exhaustion: nivel,
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
    const { items } = await this.equipoEquipado(character.ownerId, character);
    // **Quien muta es el dueño o el DM** (`requireEditable`), y el dueño de un PNJ es el DM, así
    // que este espectador siempre ve la plantilla. Se pasa igualmente en vez de saltarse la
    // comprobación: un atajo aquí sería el hueco por el que entre la próxima fuga.
    const resultado = await this.hojaOMotivo(
      await this.viewerFor(userId, character.campaignId),
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
  ): Promise<{ sheet: CharacterSheet } | { reason: string }> {
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
      return {
        reason: "Los números de este PNJ no son públicos: su ficha es del DM.",
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
    return { sheet: deriveNpc(resuelto.statblock, modificadoresDeAnulacion(character)) };
  }

  private hojaDePersonaje(
    character: FilaPersonaje,
    items: ResolvedItem[],
  ): { sheet: CharacterSheet } | { reason: string } {
    const resuelto = construirBuild(character, items);
    if (!("build" in resuelto)) return { reason: resuelto.reason };
    return derivarOMotivo(resuelto.build, modificadoresDeAnulacion(character));
  }

  async changeHp(userId: string, campaignId: string, characterId: string, input: ChangeHpInput) {
    await this.membership.requireMember(campaignId, userId);
    // Comprueba dueño-o-DM antes de bloquear la fila: es una lectura de más, pero evita
    // mantener el candado abierto mientras se resuelve un 403.
    await this.characters.requireEditable(userId, campaignId, characterId);

    return this.prisma.transaction(async (tx) => {
      const filas = await tx.$queryRaw<
        FilaPersonaje[]
      >`SELECT * FROM "Character" WHERE id = ${characterId} AND "campaignId" = ${campaignId} FOR UPDATE`;
      const character = filas[0];
      if (!character) throw new NotFoundException("Character not found");

      const sheet = await this.construirODenegar(userId, character);
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

      if (input.delta < 0) {
        // Al recibir daño se gastan primero los PG temporales: no se suman a los actuales.
        let danio = -input.delta;
        // **La resistencia y la vulnerabilidad se aplican antes de tocar los PG temporales**: son
        // el daño de verdad que llega al personaje, y los PG temporales se gastan sobre ESE
        // número, no sobre el bruto de la tirada (SRD 5.1, «la resistencia y la vulnerabilidad se
        // aplican después del resto de modificadores al daño» — aquí no hay ningún otro
        // modificador antes, así que esta es la primera y única reducción).
        if (input.damageType && character.statblockRef && this.statblocks) {
          const statblock = await this.statblocks.resolver(campaignId, character.statblockRef);
          // `damageModifiers` es opcional en `@dnd/shared` a propósito (ver el comentario de
          // `damageModifiersSchema`): un statblock guardado antes de esta tarea no lo tiene.
          const modificadores = statblock?.damageModifiers ?? [];
          if (modificadores.length > 0) {
            damageTrace = applyDamageModifiers(danio, input.damageType, modificadores);
            danio = damageTrace.total;
            deltaRegistrado = -danio;
          }
        }
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
        } else if (before === 0 && efectivo > 0) {
          // **Golpear a quien ya está a 0 suma un fracaso, y dos si el golpe fue crítico.** Es
          // el momento más frecuente del juego —el remate al que está en el suelo— y hasta hoy
          // no dejaba ningún rastro.
          failures = Math.min(3, failures + (input.critical ? 2 : 1));
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
            select: { key: true, expiresAtClock: true },
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
      } else {
        after = clamp(before + input.delta, 0, maxHp);
        // **Recuperar un solo PG estando a 0 borra los dos contadores.** No es una cortesía: el
        // SRD dice que vuelves en ti, y arrastrar fracasos de una caída anterior mataría a
        // alguien por algo que ya sobrevivió.
        if (before === 0 && after > 0) {
          successes = 0;
          failures = 0;
        }
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

      await this.events.record(
        userId,
        campaignId,
        {
          sessionId: await this.sesionActiva(campaignId, tx),
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
            reason: input.reason,
          },
        },
        tx,
      );

      const respuesta = await this.buildResponse(userId, actualizado);
      // La traza es lo que responde «−7 por resistencia a contundente»: sin ella, la reducción
      // sería un número sin origen, y esta tarea existe justo para lo contrario.
      return {
        ...respuesta,
        ...(damageTrace ? { damageTrace } : {}),
        ...(concentrationSave ? { concentrationSave } : {}),
      };
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
        throw new ConflictException({
          message: "La versión enviada ya no es la actual.",
          ...(await this.buildResponse(userId, character)),
        });
      }

      const sheet = await this.construirODenegar(userId, character);
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
        }
      }
      if (input.tempHp !== undefined) {
        // Dos fuentes no se suman: al fijar PG temporales gana la mayor, no la suma.
        const nuevo = Math.max(character.tempHp, input.tempHp);
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
      return await this.buildResponse(userId, actualizado);
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

      const sheet = await this.construirODenegar(userId, character);
      const maxHp = sheet.derived.maxHp.total;
      const currentHp = character.currentHp ?? maxHp;
      if (currentHp !== 0)
        throw new BadRequestException("Solo se puede tirar salvación de muerte a 0 PG.");

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

      const actualizado = await tx.character.update({
        where: { id: characterId },
        data: {
          currentHp: nuevoCurrentHp,
          deathSaveSuccesses: successes,
          deathSaveFailures: failures,
          version: character.version + 1,
        },
      });

      await this.events.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          sessionId: await this.sesionActiva(campaignId, tx),
          subjectId: characterId,
          // La visibilidad de la tirada la puede fijar quien tira —igual que en `RollsService`—;
          // por defecto, la de la ficha, para que no haga falta decidirlo cada vez.
          visibility: input.visibility ?? character.visibility,
          payload: { type: "DEATH_SAVE", roll: dado, result, successes, failures },
        },
        tx,
      );

      // **Por qué el `status` de esta respuesta no sale del genérico `estadoDeMuerte`.** Al
      // estabilizar o revivir, los contadores vuelven a cero — es lo que pide la especificación
      // ("contadores a cero")—, así que una lectura posterior con esos ceros ya no puede
      // distinguir "acaba de estabilizarse" de "recién llegó a 0 PG sin tirar todavía". El
      // esquema no tiene una columna `stable` (2A.7 no la pide), así que ese matiz solo se
      // conoce **en el instante de esta tirada**, y es aquí donde se informa.
      const status: DeathState["status"] = revivido
        ? "alive"
        : failures >= 3
          ? "dead"
          : estabilizado
            ? "stable"
            : "dying";

      return {
        ...(await this.buildResponse(userId, actualizado)),
        deathSaves: { successes, failures, status },
      };
    });
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
      return this.rolls.roll(userId, campaignId, {
        expression: conSigno("1d20", ataque.attackBonus.total),
        label: `Ataque con ${ataque.name}`,
        characterId,
        mode: input.mode,
        audience: input.audience ?? audienciaPorDefecto,
      });
    }

    const dano = input.versatile && ataque.versatileDamage ? ataque.versatileDamage : ataque.damage;
    const esCritico = await this.esCriticoDesdeLaTirada(
      campaignId,
      characterId,
      ataque.name,
      input,
    );
    const dados = esCritico ? duplicarDados(dano.dice) : dano.dice;
    const peticion = {
      expression: conSigno(dados, dano.modifier),
      label: `Daño de ${ataque.name}${esCritico ? " (crítico)" : ""}`,
      characterId,
      // El daño no tiene ventaja: la ventaja es del d20. Mandarla aquí tiraría dos veces el
      // dado de daño y se quedaría con el mejor, que no es una regla de ninguna edición.
      mode: "NORMAL",
      audience: input.audience ?? "PUBLIC",
    } as const;

    try {
      // **D-OP-15: la tirada que se está cobrando queda escrita, con índice único detrás.** El
      // cuarto argumento **solo se pasa cuando hay algo que decir**: un `undefined` explícito
      // cambiaría la forma de todas las llamadas del camino de siempre sin añadir nada.
      return await (input.attackRollEventId
        ? this.rolls.roll(userId, campaignId, peticion, {
            attackRollEventId: input.attackRollEventId,
          })
        : this.rolls.roll(userId, campaignId, peticion));
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
  private async esCriticoDesdeLaTirada(
    campaignId: string,
    characterId: string,
    nombreDelAtaque: string,
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
      select: { payload: true },
    });
    if (!evento) {
      throw new BadRequestException("Esa tirada de ataque no existe en esta campaña.");
    }
    // **Y que sea la tirada de ESTE ataque, no un 20 cualquiera.** La primera versión aceptaba
    // cualquier `ABILITY_ROLL` del personaje con un 20 natural: un 20 en una prueba de Sigilo
    // valía como crítico de la cimitarra. `RollsService` escribe el rótulo en `reason`, y el que
    // pone `rollAttack` es «Ataque con <nombre>», así que se compara con el del ataque que se
    // está cobrando. Es la revisión de cierre otra vez.
    const payload = evento.payload as { natural?: string; reason?: string };
    return payload.reason === `Ataque con ${nombreDelAtaque}` && payload.natural === "TWENTY";
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
        select: { key: true, level: true, expiresAtClock: true },
      }),
      this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } }),
    ]);
    const contra = modoContraObjetivo(
      condicionesActivas(condicionesDelObjetivo, campanaDelReloj.clockSeconds),
    );
    // **Y se combinan con la regla del SRD, no sumando:** ventaja y desventaja se anulan, y dos
    // del mismo signo siguen siendo una.
    const modo = combinarModo(input.mode, contra.effect);

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

    const roll = await this.rolls.roll(userId, campaignId, {
      expression: conSigno("1d20", ataque.attackBonus.total),
      label: `Ataque con ${ataque.name}`,
      characterId,
      mode: modo,
      audience: input.audience ?? audienciaPorDefecto,
    });

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
        attackName: ataque.name,
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
    const viewerOmnisciente: Viewer = { userId: target.ownerId, role: "DM", isAdmin: false };
    const resultado = await this.hojaOMotivo(viewerOmnisciente, target, items);
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
