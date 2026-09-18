import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Character, Prisma } from "@prisma/client";
import type {
  CharacterSpellState,
  SetCharacterSpellInput,
  SpellbookEntry,
  SetSpellResponse,
  SpellbookResponse,
  SrdSpell,
} from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { CharacterSheetService } from "../characters/character-sheet.service";
import { requireOwnerOrDM, requireVisibleCharacter } from "../common/character-viewer";
import {
  actividadDeLanzamiento,
  conjurosConocidos,
  ENCANTAMIENTOS,
  findClass,
  mecanicaDe,
  modeloDePreparacion,
  objetivosDe,
  SRD_SPELL_POR_KEY,
  SRD_SPELLS,
  tamanoDelLibro,
  topeDePreparados,
  trucosConocidos,
  UnknownContentError,
  type ModeloDePreparacion,
} from "../rules/catalog";

// Tarea 3A.2 (Task 3, T10) — el libro de conjuros de un personaje: qué tiene marcado de la
// lista de su clase, en qué estado, y cambiar ese estado dejando el hecho escrito
// (`SPELLBOOK_CHANGED`). No es mecánica nueva: es la misma lectura que ya hace `list()` para
// pintar la pantalla, y la misma escritura para un solo conjuro a la vez.

type ClaveDeTope = "trucos" | "preparados" | "libro" | "conocidos";

@Injectable()
export class SpellbookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
    private readonly characterSheet: CharacterSheetService,
  ) {}

  async list(userId: string, campaignId: string, characterId: string): Promise<SpellbookResponse> {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    return this.construirRespuesta(userId, campaignId, character);
  }

  /**
   * Ronda de arreglo 1 (revisión del orquestador) — el conjuro entero, con su prosa del SRD.
   * `list()` ya no la trae (ver el comentario de `entradaBase`): la pantalla abre esto solo
   * cuando alguien pulsa UN conjuro, no los hasta 204 de la clase a la vez.
   *
   * **Mismo permiso que `list`** (`requireVisibleCharacter`, no `requireOwnerOrDM`): es una
   * lectura, no una escritura del libro. **404 si la clave no existe en el catálogo** —un
   * `spellKey` inventado no es "este conjuro no es tuyo", es "esto no existe". **Si el conjuro
   * no es de la lista de la clase del personaje, se devuelve igual con `estado: null`**: es
   * catálogo compartido, no un secreto de este personaje — la puerta que sí protege algo
   * (`setEstado`) ya exige que sea de la clase antes de escribir.
   */
  async detalle(
    userId: string,
    campaignId: string,
    characterId: string,
    spellKey: string,
  ): Promise<SpellbookEntry> {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    const spell = SRD_SPELL_POR_KEY.get(spellKey);
    if (!spell) {
      throw new NotFoundException(`No existe el conjuro «${spellKey}» en el catálogo.`);
    }
    const fila = await this.prisma.characterSpell.findUnique({
      where: { characterId_spellKey: { characterId: character.id, spellKey } },
    });
    return {
      ...this.entradaBase(spell, fila?.estado ?? null),
      textEs: spell.textEs,
      textEn: spell.textEn,
      ...(spell.higherLevelsEs !== undefined ? { higherLevelsEs: spell.higherLevelsEs } : {}),
      ...(spell.higherLevelsEn !== undefined ? { higherLevelsEn: spell.higherLevelsEn } : {}),
    };
  }

  async setEstado(
    userId: string,
    campaignId: string,
    characterId: string,
    spellKey: string,
    input: SetCharacterSpellInput,
  ): Promise<SetSpellResponse> {
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
      "Solo el dueño del personaje o el DM puede cambiar su libro de conjuros.",
    );

    const spell = SRD_SPELL_POR_KEY.get(spellKey);
    if (!spell) {
      throw new BadRequestException(`No existe el conjuro «${spellKey}» en el catálogo.`);
    }

    const modelo = modeloDePreparacion(character.classKey ?? undefined);
    if (modelo === "NINGUNO") {
      throw new BadRequestException("Esta clase no lanza conjuros.");
    }
    if (!character.classKey || !spell.classes.includes(character.classKey)) {
      const clase = this.claseOMotivo(character.classKey);
      throw new BadRequestException(
        `${spell.nameEs ?? spell.nameEn} no está en la lista del ${clase}.`,
      );
    }

    const esTruco = spell.level === 0;
    const permitidos = estadosPermitidos(modelo, esTruco);
    if (input.estado !== null && !permitidos.includes(input.estado)) {
      throw new BadRequestException(mensajeDeEstadoInvalido(esTruco, input.estado));
    }

    // **El modificador de lanzamiento se resuelve AQUÍ, antes de abrir la transacción — nunca
    // dentro de ella.** `CharacterSheetService.getSheet` habla por `this.prisma` (el pool
    // principal), no por el `tx` de abajo: pedirle una hoja mientras una transacción mantiene
    // ocupada una conexión del mismo pool pequeño de pruebas es la receta de un interbloqueo de
    // verdad — medido en el e2e (`libro-de-conjuros.e2e-spec.ts`): preparar un conjuro colgaba
    // el `PUT` ~19 s y el resto de la suite se degradaba en cascada, hasta que Postgres mataba
    // la conexión huérfana. `maximoDelTope`, dentro de la transacción, ya no toca la base — solo
    // hace aritmética con el número que se trae de aquí.
    const modMaximo = await this.modificadorDeLanzamiento(userId, campaignId, character);

    const fueraDeRegla = await this.prisma.transaction(async (tx) => {
      const filaAntes = await tx.characterSpell.findUnique({
        where: { characterId_spellKey: { characterId: character.id, spellKey } },
      });
      const estadoAntes = filaAntes?.estado ?? null;

      let estadoFinal: CharacterSpellState | null;
      if (input.estado === null) {
        // Dejar de preparar en el mago no borra la copia del libro: solo baja un peldaño.
        estadoFinal = modelo === "LIBRO" && estadoAntes === "PREPARADO" ? "EN_EL_LIBRO" : null;
      } else {
        estadoFinal = input.estado;
      }

      // Ola de arreglos de 3A.2 (m-1) — **`cambio` se deriva del par (antes, después)**, no del
      // estado pedido: `PUT {estado: "EN_EL_LIBRO"}` sobre un conjuro PREPARADO (el mago que deja
      // de prepararlo por la puerta explícita) era «APRENDIDO». Y **repetir el mismo estado no
      // escribe nada**: el hilo no gana con un `SPELLBOOK_CHANGED` idéntico al anterior.
      if (estadoFinal === estadoAntes) return [] as SetSpellResponse["fueraDeRegla"];
      const cambio: "PREPARADO" | "DESPREPARADO" | "APRENDIDO" | "OLVIDADO" =
        estadoFinal === "PREPARADO"
          ? "PREPARADO"
          : estadoAntes === "PREPARADO"
            ? "DESPREPARADO"
            : estadoFinal === null
              ? "OLVIDADO"
              : "APRENDIDO";

      if (estadoFinal === null) {
        await tx.characterSpell.deleteMany({
          where: { characterId: character.id, spellKey },
        });
      } else {
        await tx.characterSpell.upsert({
          where: { characterId_spellKey: { characterId: character.id, spellKey } },
          create: { characterId: character.id, spellKey, estado: estadoFinal },
          update: { estado: estadoFinal },
        });
      }

      // D-CF-126: pasarse del tope o preparar en combate se escribe igual — el aviso va en el
      // suceso, no en un rechazo.
      const fueraDeRegla: SetSpellResponse["fueraDeRegla"] = [];
      const combatiente = await tx.combatant.findFirst({
        where: {
          characterId: character.id,
          encounter: { status: "ACTIVE", session: { campaignId } },
        },
        select: { id: true },
      });
      if (combatiente) fueraDeRegla.push("EN_COMBATE");

      const topeAfectado = topeDeEstado(esTruco, modelo, estadoFinal);
      if (topeAfectado) {
        const actual = await this.contarTope(tx, character.id, topeAfectado, character.classKey!);
        const maxDelTope = this.maximoDelTope(
          topeAfectado,
          character.classKey!,
          character.level,
          modMaximo,
        );
        if (actual > maxDelTope) fueraDeRegla.push("SOBRE_EL_TOPE");
      }

      await this.events.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          subjectId: character.id,
          visibility: character.visibility,
          payload: {
            type: "SPELLBOOK_CHANGED",
            spellKey,
            name: spell.nameEs ?? spell.nameEn,
            cambio,
            estado: estadoFinal,
            ...(fueraDeRegla.length > 0 ? { fueraDeRegla } : {}),
          },
        },
        tx,
      );
      return fueraDeRegla;
    });

    // **Fix round 2 de la ola — la respuesta es pequeña a propósito** (ver `SetSpellResponse`):
    // la entrada que cambió, los topes recontados (misma cuenta que `list()`, `topesYAvisos`) y
    // el `fueraDeRegla` de este cambio. La lista entera se pide por `GET` — la pantalla invalida
    // `spellbookKey`. Se relee la fila para no fiarse de lo que la transacción creyó escribir.
    const fila = await this.prisma.characterSpell.findUnique({
      where: { characterId_spellKey: { characterId: character.id, spellKey } },
    });
    const filas = await this.prisma.characterSpell.findMany({
      where: { characterId: character.id },
    });
    const { topes, avisos } = this.topesYAvisos(
      character.classKey,
      character.level,
      modMaximo,
      filas,
    );
    return {
      entrada: this.entradaBase(spell, fila?.estado ?? null),
      topes,
      avisos,
      espacios: await this.espaciosDe(character.id),
      fueraDeRegla,
    };
  }

  /** ¿Puede lanzarse ahora? Solo PREPARADO o CONOCIDO (los trucos son CONOCIDO). */
  async lanzable(
    cliente: PrismaService | Prisma.TransactionClient,
    characterId: string,
    spellKey: string,
  ): Promise<{ ok: true } | { ok: false; motivo: "NO_PREPARADO" | "NO_ES_SUYO" }> {
    const fila = await cliente.characterSpell.findUnique({
      where: { characterId_spellKey: { characterId, spellKey } },
    });
    if (!fila) return { ok: false, motivo: "NO_ES_SUYO" };
    if (fila.estado === "PREPARADO" || fila.estado === "CONOCIDO") return { ok: true };
    return { ok: false, motivo: "NO_PREPARADO" };
  }

  // --- privado ------------------------------------------------------------------------------

  /**
   * Lo que `list()` y `detalle()` tienen en común: todo de `SpellbookEntry` salvo la prosa
   * (`textEs`/`textEn`/`higherLevels*`), que solo añade `detalle()`. Un solo sitio calcula
   * `lanzable`/`mecanica`/`objetivos`/`escalaPorEspacio` — dos copias de esa lógica es
   * exactamente el vocabulario paralelo que el resto del proyecto evita.
   */
  private entradaBase(
    spell: SrdSpell,
    estado: CharacterSpellState | null,
  ): Omit<SpellbookEntry, "textEs" | "textEn" | "higherLevelsEs" | "higherLevelsEn"> {
    const actividad = actividadDeLanzamiento(spell);
    return {
      key: spell.key,
      nameEs: spell.nameEs ?? spell.nameEn,
      nameEn: spell.nameEn,
      level: spell.level,
      school: spell.school,
      castingTime: spell.castingTime,
      range: spell.range,
      concentration: spell.concentration,
      ritual: spell.ritual,
      estado,
      lanzable: estado === "PREPARADO" || estado === "CONOCIDO",
      mecanica: mecanicaDe(spell),
      objetivos: objetivosDe(spell),
      escalaPorEspacio: Boolean(
        actividad && "dados" in actividad && actividad.dados?.escalado?.por === "espacio",
      ),
      // T15 (3A.2) — es un encantamiento conocido (`magic-weapon`, hoy el único, D-CF-130): la
      // pantalla lo usa para ofrecer un arma del inventario como objetivo, no el selector de
      // criaturas.
      encanta: spell.key in ENCANTAMIENTOS,
    };
  }

  private claseOMotivo(classKey: string | null): string {
    if (!classKey) return "personaje sin clase";
    try {
      return findClass({ source: "SRD", key: classKey }).name.toLowerCase();
    } catch (error) {
      if (error instanceof UnknownContentError) return classKey;
      throw error;
    }
  }

  /** Espacios por nivel, de `CharacterResource` (`spell-slot-N`), ordenados por nivel. */
  private async espaciosDe(characterId: string): Promise<SpellbookResponse["espacios"]> {
    const espaciosFilas = await this.prisma.characterResource.findMany({
      where: { characterId, key: { startsWith: "spell-slot-" } },
    });
    return espaciosFilas
      .map((r) => {
        const coincide = /^spell-slot-(\d+)$/.exec(r.key);
        return { nivel: coincide ? Number(coincide[1]) : 0, actual: r.current, max: r.max ?? 0 };
      })
      .filter((e) => e.nivel > 0)
      .sort((a, b) => a.nivel - b.nivel);
  }

  /**
   * Los topes y sus avisos, contados sobre las filas `CharacterSpell` del personaje **que sean de
   * la lista de su clase** (un conjuro de una clase anterior no cuenta — la misma población que
   * `list()` pinta). Compartido por `list()` y `setEstado` (fix round 2 de la ola) para que la
   * respuesta del `PUT` y la del `GET` no puedan dar dos cuentas distintas.
   */
  private topesYAvisos(
    classKey: string | null,
    level: number,
    mod: number,
    filas: Array<{ spellKey: string; estado: CharacterSpellState }>,
  ): Pick<SpellbookResponse, "topes" | "avisos"> {
    const topes: SpellbookResponse["topes"] = {};
    const avisos: SpellbookResponse["avisos"] = [];
    const modelo = modeloDePreparacion(classKey ?? undefined);
    if (modelo === "NINGUNO" || !classKey) return { topes, avisos };

    const nivelPorClave = new Map(
      SRD_SPELLS.filter((s) => s.classes.includes(classKey)).map((s) => [s.key, s.level]),
    );
    let trucosActual = 0;
    let preparadosActual = 0;
    let libroActual = 0;
    let conocidosActual = 0;
    for (const fila of filas) {
      const nivel = nivelPorClave.get(fila.spellKey);
      if (nivel === undefined) continue;
      const esTruco = nivel === 0;
      if (fila.estado === "CONOCIDO" && esTruco) trucosActual += 1;
      if (fila.estado === "CONOCIDO" && !esTruco) conocidosActual += 1;
      if (fila.estado === "PREPARADO") {
        preparadosActual += 1;
        libroActual += 1;
      }
      if (fila.estado === "EN_EL_LIBRO") libroActual += 1;
    }

    const trucosMax = trucosConocidos(classKey, level);
    const preparadosMax = topeDePreparados(classKey, level, mod) ?? 0;
    const libroMax = tamanoDelLibro(classKey, level) ?? 0;
    const conocidosMax = conjurosConocidos(classKey, level) ?? 0;

    if (modelo === "LIBRO") {
      topes.preparados = { max: preparadosMax, actual: preparadosActual };
      topes.trucos = { max: trucosMax, actual: trucosActual };
      topes.libro = { max: libroMax, actual: libroActual };
      if (preparadosActual > preparadosMax) avisos.push("PREPARADOS_DE_MAS");
      if (trucosActual > trucosMax) avisos.push("TRUCOS_DE_MAS");
      if (libroActual > libroMax) avisos.push("LIBRO_DE_MAS");
    } else if (modelo === "PREPARA_DE_LISTA") {
      topes.preparados = { max: preparadosMax, actual: preparadosActual };
      topes.trucos = { max: trucosMax, actual: trucosActual };
      if (preparadosActual > preparadosMax) avisos.push("PREPARADOS_DE_MAS");
      if (trucosActual > trucosMax) avisos.push("TRUCOS_DE_MAS");
    } else if (modelo === "CONOCIDOS") {
      topes.conocidos = { max: conocidosMax, actual: conocidosActual };
      topes.trucos = { max: trucosMax, actual: trucosActual };
      if (conocidosActual > conocidosMax) avisos.push("CONOCIDOS_DE_MAS");
      if (trucosActual > trucosMax) avisos.push("TRUCOS_DE_MAS");
    }
    return { topes, avisos };
  }

  private async construirRespuesta(
    userId: string,
    campaignId: string,
    character: Character,
  ): Promise<SpellbookResponse> {
    const espacios = await this.espaciosDe(character.id);

    const classKey = character.classKey ?? undefined;
    const modelo = modeloDePreparacion(classKey);
    if (modelo === "NINGUNO" || !classKey) {
      return { modelo, entradas: [], topes: {}, avisos: [], espacios };
    }

    const conjurosDeClase = SRD_SPELLS.filter((s) => s.classes.includes(classKey));

    const filas = await this.prisma.characterSpell.findMany({
      where: { characterId: character.id },
    });
    const estadoPorClave = new Map(filas.map((f) => [f.spellKey, f.estado]));

    const mod = await this.modificadorDeLanzamiento(userId, campaignId, character);

    const entradas: SpellbookEntry[] = conjurosDeClase.map((spell) => {
      const estado = estadoPorClave.get(spell.key) ?? null;

      // **Ronda de arreglo 1 — sin prosa aquí.** `entradaBase` no trae `textEs`/`textEn`/
      // `higherLevels*`: `list()` pinta hasta 204 filas a la vez (la clase entera del
      // personaje), y cargar el texto completo del SRD (hasta 8000 caracteres × 2 idiomas) de
      // cada una pesaba ~460 KB por petición para una pantalla que solo abre el texto de UNA. El
      // texto vive en `detalle()`, que se pide conjuro a conjuro.
      return this.entradaBase(spell, estado);
    });

    const { topes, avisos } = this.topesYAvisos(classKey, character.level, mod, filas);
    return { modelo, entradas, topes, avisos, espacios };
  }

  private async contarTope(
    tx: Prisma.TransactionClient,
    characterId: string,
    tope: ClaveDeTope,
    classKey: string,
  ): Promise<number> {
    const trucoKeys = new Set(
      SRD_SPELLS.filter((s) => s.classes.includes(classKey) && s.level === 0).map((s) => s.key),
    );
    if (tope === "preparados") {
      return tx.characterSpell.count({ where: { characterId, estado: "PREPARADO" } });
    }
    if (tope === "trucos") {
      const filas = await tx.characterSpell.findMany({
        where: { characterId, estado: "CONOCIDO" },
        select: { spellKey: true },
      });
      return filas.filter((f) => trucoKeys.has(f.spellKey)).length;
    }
    if (tope === "libro") {
      const filas = await tx.characterSpell.findMany({
        where: { characterId, estado: { in: ["EN_EL_LIBRO", "PREPARADO"] } },
        select: { spellKey: true },
      });
      return filas.filter((f) => !trucoKeys.has(f.spellKey)).length;
    }
    // "conocidos"
    const filas = await tx.characterSpell.findMany({
      where: { characterId, estado: "CONOCIDO" },
      select: { spellKey: true },
    });
    return filas.filter((f) => !trucoKeys.has(f.spellKey)).length;
  }

  /**
   * Puramente aritmética — **nunca toca la base**. `"preparados"` necesita el modificador de
   * lanzamiento, pero lo recibe ya resuelto (`modMaximo`): quien llama a esto SIEMPRE lo hace
   * fuera de una transacción abierta, y este método existe justo para que eso no se olvide.
   */
  private maximoDelTope(
    tope: ClaveDeTope,
    classKey: string,
    level: number,
    modDeLanzamiento: number,
  ): number {
    if (tope === "trucos") return trucosConocidos(classKey, level);
    if (tope === "libro") return tamanoDelLibro(classKey, level) ?? 0;
    if (tope === "conocidos") return conjurosConocidos(classKey, level) ?? 0;
    return topeDePreparados(classKey, level, modDeLanzamiento) ?? 0;
  }

  /**
   * El modificador de la característica de lanzamiento de la clase, leído de la hoja derivada
   * (`CharacterSheetService.getSheet`, que habla por el pool principal de Prisma).
   *
   * **Se llama SIEMPRE fuera de una transacción** — ver el porqué en `setEstado`. `0` si la
   * clase no lanza por característica (no debería llegar aquí sin clase) o la hoja no deriva.
   */
  private async modificadorDeLanzamiento(
    userId: string,
    campaignId: string,
    character: Pick<Character, "id" | "classKey">,
  ): Promise<number> {
    if (!character.classKey) return 0;
    const clase = findClass({ source: "SRD", key: character.classKey });
    if (!clase.spellcastingAbility) return 0;
    const hoja = await this.characterSheet.getSheet(userId, campaignId, character.id);
    return hoja.sheet?.derived[`abilityMod.${clase.spellcastingAbility}`]?.total ?? 0;
  }
}

function estadosPermitidos(modelo: ModeloDePreparacion, esTruco: boolean): CharacterSpellState[] {
  if (esTruco) return ["CONOCIDO"];
  if (modelo === "LIBRO") return ["EN_EL_LIBRO", "PREPARADO"];
  if (modelo === "PREPARA_DE_LISTA") return ["PREPARADO"];
  if (modelo === "CONOCIDOS") return ["CONOCIDO"];
  return [];
}

function mensajeDeEstadoInvalido(esTruco: boolean, estado: CharacterSpellState): string {
  if (esTruco) return "Un truco se conoce, no se prepara.";
  if (estado === "EN_EL_LIBRO") return "Solo el mago tiene libro.";
  return "Ese conjuro no admite ese estado.";
}

function topeDeEstado(
  esTruco: boolean,
  modelo: ModeloDePreparacion,
  estadoFinal: CharacterSpellState | null,
): ClaveDeTope | null {
  if (estadoFinal === null) return null;
  if (esTruco) return "trucos";
  if (estadoFinal === "PREPARADO") return "preparados";
  if (estadoFinal === "EN_EL_LIBRO") return "libro";
  if (estadoFinal === "CONOCIDO") return "conocidos";
  return null;
}

// `sembrarLibro` (D-CF-125, la siembra al fijar la primera clase) vive en `./sembrar.ts` y no
// aquí — ver el porqué en el comentario de ese fichero: evita un ciclo de imports de verdad con
// `character-sheet.service.ts`, que SÍ importa esta función.
export { sembrarLibro } from "./sembrar";
