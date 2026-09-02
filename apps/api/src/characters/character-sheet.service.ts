import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
  Inject,
} from "@nestjs/common";
import type { Character } from "@prisma/client";
import type {
  ChangeHpInput,
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
} from "../rules/catalog";
import { rollExpression, type Roller } from "../dice/dice";
import { DICE_ROLLER } from "../rolls/rolls.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { CharactersService } from "./characters.service";
import { ResourcesService } from "../character-state/resources/resources.service";
import {
  effectiveSpeed,
  type EffectiveSpeedResult,
} from "../character-state/speed/effective-speed";
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
function construirBuild(character: FilaPersonaje): ResultadoConstruccion {
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
    // Mismo patrón que `RollsService`: inyectable solo en pruebas, `undefined` en producción.
    @Optional() @Inject(DICE_ROLLER) private readonly roller?: Roller,
    /**
     * Opcional porque casi todas las pruebas unitarias de este servicio se montan a mano y no
     * les interesa la siembra. En la aplicación real siempre está: `CharactersModule` importa
     * `CharacterStateModule`, que la exporta.
     */
    @Optional() private readonly resources?: ResourcesService,
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
  private buildResponse(character: FilaPersonaje) {
    const resuelto = construirBuild(character);
    let sheet: CharacterSheet | null = null;
    let reason: string | undefined;
    if ("build" in resuelto) {
      const derivado = derivarOMotivo(resuelto.build, modificadoresDeAnulacion(character));
      if ("sheet" in derivado) sheet = derivado.sheet;
      else reason = derivado.reason;
    } else {
      reason = resuelto.reason;
    }

    const maxHp = sheet ? sheet.derived.maxHp.total : null;
    const currentHpCrudo = character.currentHp ?? maxHp;
    const currentHpMostrado =
      maxHp !== null && currentHpCrudo !== null ? Math.min(currentHpCrudo, maxHp) : currentHpCrudo;
    const exceedsMax = maxHp !== null && currentHpCrudo !== null ? currentHpCrudo > maxHp : false;

    return {
      character,
      sheet,
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

  async getSheet(userId: string, campaignId: string, characterId: string) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await this.viewerFor(userId, campaignId);
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, campaignId },
    });
    if (!character || !this.canSee(viewer, character)) {
      throw new NotFoundException("Character not found");
    }
    const respuesta = this.buildResponse(character);
    return {
      ...respuesta,
      effectiveSpeeds: await this.velocidadesEfectivas(characterId, respuesta.sheet),
    };
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
    sheet: CharacterSheet | null,
  ): Promise<Record<string, EffectiveSpeedResult>> {
    if (!sheet) return {};
    const conditions = await this.prisma.characterCondition.findMany({
      where: { characterId },
      select: { key: true, level: true },
    });
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
    const construido = construirBuild(prospectivo);
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
    const respuesta = this.buildResponse(actualizado);
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
    return this.buildResponse(actualizado);
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
    if (actuales[target] === undefined) return this.buildResponse(character);
    delete actuales[target];

    const actualizado = await this.prisma.character.update({
      where: { id: characterId },
      data: { overrides: actuales },
    });
    return this.buildResponse(actualizado);
  }

  /**
   * La hoja derivada, o el 400 honesto de "no se puede sin raza/clase/características": ninguna
   * mutación de PG puede recortar contra un `maxHp` que no existe.
   */
  private async construirODenegar(character: FilaPersonaje): Promise<CharacterSheet> {
    const resuelto = construirBuild(character);
    if (!("build" in resuelto))
      throw new BadRequestException(`No se pueden gestionar los PG: ${resuelto.reason}`);
    const derivado = derivarOMotivo(resuelto.build);
    if (!("sheet" in derivado)) throw new BadRequestException(derivado.reason);
    return derivado.sheet;
  }

  async changeHp(userId: string, campaignId: string, characterId: string, input: ChangeHpInput) {
    await this.membership.requireMember(campaignId, userId);
    // Comprueba dueño-o-DM antes de bloquear la fila: es una lectura de más, pero evita
    // mantener el candado abierto mientras se resuelve un 403.
    await this.characters.requireEditable(userId, campaignId, characterId);

    return this.prisma.$transaction(async (tx) => {
      const filas = await tx.$queryRaw<
        FilaPersonaje[]
      >`SELECT * FROM "Character" WHERE id = ${characterId} AND "campaignId" = ${campaignId} FOR UPDATE`;
      const character = filas[0];
      if (!character) throw new NotFoundException("Character not found");

      const sheet = await this.construirODenegar(character);
      const maxHp = sheet.derived.maxHp.total;
      const before = character.currentHp ?? maxHp;

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

      return this.buildResponse(actualizado);
    });
  }

  async setHp(userId: string, campaignId: string, characterId: string, input: SetHpInput) {
    // Solo el DM: es la corrección absoluta, no el gasto de la mesa.
    await this.membership.requireDM(campaignId, userId);
    const existe = await this.prisma.character.findFirst({
      where: { id: characterId, campaignId },
    });
    if (!existe) throw new NotFoundException("Character not found");

    return this.prisma.$transaction(async (tx) => {
      const filas = await tx.$queryRaw<
        FilaPersonaje[]
      >`SELECT * FROM "Character" WHERE id = ${characterId} AND "campaignId" = ${campaignId} FOR UPDATE`;
      const character = filas[0];
      if (!character) throw new NotFoundException("Character not found");

      // Concurrencia optimista: una versión vieja es un 409 con el estado actual, no un pisotón.
      if (character.version !== input.expectedVersion) {
        throw new ConflictException({
          message: "La versión enviada ya no es la actual.",
          ...this.buildResponse(character),
        });
      }

      const sheet = await this.construirODenegar(character);
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
      return this.buildResponse(actualizado);
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

    return this.prisma.$transaction(async (tx) => {
      const filas = await tx.$queryRaw<
        FilaPersonaje[]
      >`SELECT * FROM "Character" WHERE id = ${characterId} AND "campaignId" = ${campaignId} FOR UPDATE`;
      const character = filas[0];
      if (!character) throw new NotFoundException("Character not found");

      const sheet = await this.construirODenegar(character);
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
        ...this.buildResponse(actualizado),
        deathSaves: { successes, failures, status },
      };
    });
  }
}
