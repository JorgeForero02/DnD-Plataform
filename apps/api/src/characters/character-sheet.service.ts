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
  ContentRefInput,
  ResolvedItem,
  DerivationWarning,
  ChangeHpInput,
  RollAttackInput,
  CharacterChoices,
  DeathSaveInput,
  DeathState,
  GameEventPayload,
  SetHpInput,
  Overrides,
  OverridableKey,
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
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StatblocksService } from "../statblocks/statblocks.service";
import { CharactersService } from "./characters.service";
import { ResourcesService } from "../character-state/resources/resources.service";
import {
  effectiveSpeed,
  type EffectiveSpeedResult,
} from "../character-state/speed/effective-speed";
import { condicionesActivas } from "../character-state/conditions/vencimiento";
import { maxHpConAgotamiento, nivelDeAgotamiento } from "../character-state/common/agotamiento";
import { canView, Viewer } from "../common/visibility";

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

  private canSee(viewer: Viewer, character: FilaPersonaje): boolean {
    return canView(viewer, {
      visibility: character.visibility,
      createdById: character.ownerId,
      grantedUserIds: [],
    });
  }

  /** `min(currentHp, maxHp)`, con el aviso de que el dato guardado va por delante. */
  private estadoDeMuerte(character: FilaPersonaje, currentHpCrudo: number | null): DeathState {
    const successes = character.deathSaveSuccesses;
    const failures = character.deathSaveFailures;
    let status: DeathState["status"] = "alive";
    if (currentHpCrudo === 0) {
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
      deathSaves: this.estadoDeMuerte(character, currentHpCrudo),
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
      effectiveSpeeds: await this.velocidadesEfectivas(characterId, campaignId, respuesta.sheet),
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
   * Las velocidades **con las condiciones aplicadas**, cada una con su traza.
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
  private async velocidadesEfectivas(
    characterId: string,
    campaignId: string,
    sheet: CharacterSheet | null,
  ): Promise<Record<string, EffectiveSpeedResult>> {
    if (!sheet) return {};
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
    const salida: Record<string, EffectiveSpeedResult> = {};
    for (const [movimiento, pies] of Object.entries(sheet.speeds)) {
      if (typeof pies === "number") salida[movimiento] = effectiveSpeed(pies, conditions);
    }
    return salida;
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
  ): Promise<{ sheet: CharacterSheet } | { reason: string }> {
    const base = character.statblockRef
      ? await this.hojaDeStatblock(viewer, character)
      : this.hojaDePersonaje(character, items);
    if (!("sheet" in base)) return base;

    const client = tx ?? this.prisma;
    const [condiciones, campana] = await Promise.all([
      client.characterCondition.findMany({
        where: { characterId: character.id },
        select: { key: true, level: true, expiresAtClock: true },
      }),
      client.campaign.findUniqueOrThrow({ where: { id: character.campaignId } }),
    ]);
    const nivel = nivelDeAgotamiento(condicionesActivas(condiciones, campana.clockSeconds));
    if (nivel === 0) return base;
    return {
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

      if (input.delta < 0) {
        // Al recibir daño se gastan primero los PG temporales: no se suman a los actuales.
        const danio = -input.delta;
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

        after = clamp(before - efectivo, 0, maxHp);
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
            delta: input.delta,
            from: before,
            to: after,
            ...(input.critical ? { critical: true } : {}),
            // Una muerte sin tiradas necesita explicarse en la línea de tiempo, o parece un
            // error de la herramienta.
            ...(massive ? { massive: true } : {}),
            reason: input.reason,
          },
        },
        tx,
      );

      return await this.buildResponse(userId, actualizado);
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
    const audienciaPorDefecto = character.visibility === "PLAYERS" ? "PUBLIC" : "DM_PRIVATE";

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
    const dados = input.critical ? duplicarDados(dano.dice) : dano.dice;
    return this.rolls.roll(userId, campaignId, {
      expression: conSigno(dados, dano.modifier),
      label: `Daño de ${ataque.name}${input.critical ? " (crítico)" : ""}`,
      characterId,
      // El daño no tiene ventaja: la ventaja es del d20. Mandarla aquí tiraría dos veces el dado
      // de daño y se quedaría con el mejor, que no es una regla de ninguna edición.
      mode: "NORMAL",
      audience: input.audience ?? "PUBLIC",
    });
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
