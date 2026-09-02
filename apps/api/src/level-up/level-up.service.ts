import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import type { Character } from "@prisma/client";
import type { CharacterChoices } from "@dnd/shared";
import {
  deriveCharacter,
  findClass,
  spellSlotsFor,
  type CharacterBuild,
  type SpellSlot,
} from "../rules/catalog";
import { abilityModifier, averageHitDie } from "../rules/engine";
import { rollExpression, type Roller } from "../dice/dice";
import { DICE_ROLLER } from "../rolls/rolls.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { ResourcesService } from "../character-state/resources/resources.service";

// Tarea 2A.9 — la subida de nivel: el diff propuesto, y el jugador que confirma.
//
// **El bonificador de competencia no se lee de `PROFICIENCY_BONUS_TABLE` a mano**: sale de
// `deriveCharacter` (que a su vez llama a `proficiencyBonus` del motor) para los niveles actual
// y siguiente, y se comparan. La tabla del catálogo es la misma verdad en otra forma —hay un
// invariante en `rules/catalog/index.ts` que las compara— así que leerla aquí también sería
// repetir un dato que ya se puede derivar.

/** Techo del SRD. Subir desde aquí es un 400, nunca un nivel 21. */
const NIVEL_MAXIMO = 20;

type FilaPersonaje = Character;

export interface NewClassFeature {
  source: "class" | "subclass";
  key: string;
  name: string;
}

export interface LevelUpPreview {
  from: number;
  to: number;
  hp: {
    method: "AVERAGE" | "ROLL";
    hitDie: number;
    conModifier: number;
    /** Lo que se sumaría a los PG máximos actuales. */
    delta: number;
    current: number;
    next: number;
    /** Solo si `method === "ROLL"`: la tirada real que produjo `delta`. */
    roll?: { expression: string; rolled: number; total: number };
  };
  proficiencyBonus: { from: number; to: number; changed: boolean };
  attacksPerAction: { from: number; to: number; changed: boolean };
  hitDice: { from: number; to: number; dieSize: number };
  spellSlots: { from: SpellSlot[]; to: SpellSlot[]; changed: boolean };
  newFeatures: NewClassFeature[];
  /**
   * **Decisión de esta tarea:** cuando `to` es uno de `asiLevels`, se avisa de que hay una
   * mejora de característica pendiente, pero **no se modela como elección todavía** — la ficha
   * S6 de `docs/06-pendientes.md` sigue abierta sobre si es "+2 a una" o "+1 a dos". Modelarla
   * aquí habría significado inventar esa forma sin que nadie la haya decidido, y una elección a
   * medias es peor que un aviso honesto.
   */
  abilityScoreImprovementPending: boolean;
}

@Injectable()
export class LevelUpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
    // Mismo patrón que `CharacterSheetService`: inyectable solo en pruebas, `undefined` en
    // producción, donde `rollExpression` cae a `defaultRoller`.
    @Optional() @Inject(DICE_ROLLER) private readonly roller?: Roller,
    /** Opcional por la misma razón que en `CharacterSheetService`: las unitarias no la montan. */
    @Optional() private readonly resources?: ResourcesService,
  ) {}

  /**
   * Dueño o DM — igual que `CharactersService.requireEditable`, **duplicado a sabiendas**.
   * `CharactersModule` no exporta `CharactersService` (solo controladores y sí mismo), y la
   * frontera de ficheros de esta tarea prohíbe tocar ese módulo para añadir el `exports`. Es la
   * misma clase de deuda que `GameEventsService.viewerFor` ya acepta declarada en
   * `docs/06-pendientes.md`.
   */
  private async requireEditable(
    userId: string,
    campaignId: string,
    characterId: string,
  ): Promise<FilaPersonaje> {
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, campaignId },
    });
    if (!character) throw new NotFoundException("Character not found");
    const member = await this.membership.getMembership(campaignId, userId);
    if (member?.role !== "DM" && character.ownerId !== userId) {
      throw new ForbiddenException("Only the DM or the owner can modify this");
    }
    return character;
  }

  /**
   * De fila a `CharacterBuild` a un nivel dado, o 400 si faltan los datos que la hoja necesita.
   * A diferencia de `CharacterSheetService` (que tolera una ficha a medias en la lectura), aquí
   * no hay "motivo tolerable": sin una hoja completa no hay PG que subir ni aptitud que anunciar.
   */
  private buildFor(character: FilaPersonaje, level: number): CharacterBuild {
    const faltantes: string[] = [];
    const claves = ["str", "dex", "con", "int", "wis", "cha"] as const;
    for (const clave of claves) if (character[clave] == null) faltantes.push(clave);
    if (!character.raceKey) faltantes.push("raza");
    if (!character.classKey) faltantes.push("clase");
    if (faltantes.length > 0) {
      throw new BadRequestException(`No se puede subir de nivel: faltan ${faltantes.join(", ")}.`);
    }
    return {
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
      level,
      choices: (character.choices as CharacterChoices | null) ?? undefined,
    };
  }

  /**
   * El diff entero, puro: **no toca Prisma ni el registro de eventos** salvo por la tirada de
   * PG cuando `roll` lo pide, que es la única excepción declarada por el encargo ("tirar...
   * queda en el log"). Todo lo demás sale de `deriveCharacter`, dos veces —al nivel actual y al
   * siguiente—, para no reimplementar ninguna tabla que el catálogo ya sabe leer.
   */
  private calcularDiff(
    character: FilaPersonaje,
    roll: boolean,
  ): { preview: LevelUpPreview; tiradaParaRegistrar?: { expression: string; total: number } } {
    const from = character.level;
    if (from >= NIVEL_MAXIMO) {
      throw new BadRequestException(
        `El nivel ${NIVEL_MAXIMO} es el techo del SRD: no se puede subir más.`,
      );
    }
    const to = from + 1;

    const claseSrd = findClass({ source: "SRD", key: character.classKey! });
    const sheetFrom = deriveCharacter(this.buildFor(character, from));
    const sheetTo = deriveCharacter(this.buildFor(character, to));

    // Constitución no puede faltar si `buildFor` no lanzó: la comprobación de arriba ya exigió
    // las seis características.
    const conMod = abilityModifier(character.con!);
    const media = averageHitDie(claseSrd.hitDie);

    let hp: LevelUpPreview["hp"];
    let tiradaParaRegistrar: { expression: string; total: number } | undefined;
    if (roll) {
      const tirada = rollExpression(`1d${claseSrd.hitDie}`, this.roller);
      const delta = tirada.total + conMod;
      hp = {
        method: "ROLL",
        hitDie: claseSrd.hitDie,
        conModifier: conMod,
        delta,
        current: sheetFrom.derived.maxHp.total,
        next: sheetFrom.derived.maxHp.total + delta,
        roll: { expression: tirada.expression, rolled: tirada.total, total: delta },
      };
      tiradaParaRegistrar = { expression: tirada.expression, total: delta };
    } else {
      // **La media fija es la del SRD, redondeando hacia arriba: `dado/2 + 1`.** Es exactamente
      // `averageHitDie` del motor (2A.2), reutilizada en vez de reescrita — un d10 da 6, no 5,5,
      // y el invariante de esa función ya lo comprueba para los cuatro dados del SRD.
      const delta = media + conMod;
      hp = {
        method: "AVERAGE",
        hitDie: claseSrd.hitDie,
        conModifier: conMod,
        delta,
        current: sheetFrom.derived.maxHp.total,
        // Igual a `sheetFrom.maxHp + delta`: se toma de `sheetTo` (misma fórmula, ya calculada)
        // para no calcular dos veces el mismo número por dos caminos que podrían discrepar.
        next: sheetTo.derived.maxHp.total,
      };
    }

    const profFrom = sheetFrom.derived.proficiencyBonus.total;
    const profTo = sheetTo.derived.proficiencyBonus.total;

    const newFeatures: NewClassFeature[] = [];
    for (const feature of claseSrd.features)
      if (feature.level === to)
        newFeatures.push({ source: "class", key: feature.key, name: feature.name });
    for (const subclase of claseSrd.subclasses)
      for (const feature of subclase.features)
        if (feature.level === to)
          newFeatures.push({ source: "subclass", key: feature.key, name: feature.name });

    const slotsFrom = spellSlotsFor(claseSrd.spellProgression, from);
    const slotsTo = spellSlotsFor(claseSrd.spellProgression, to);

    const preview: LevelUpPreview = {
      from,
      to,
      hp,
      proficiencyBonus: { from: profFrom, to: profTo, changed: profFrom !== profTo },
      attacksPerAction: {
        from: sheetFrom.attacksPerAction,
        to: sheetTo.attacksPerAction,
        changed: sheetFrom.attacksPerAction !== sheetTo.attacksPerAction,
      },
      hitDice: { from, to, dieSize: claseSrd.hitDie },
      spellSlots: {
        from: slotsFrom,
        to: slotsTo,
        changed: JSON.stringify(slotsFrom) !== JSON.stringify(slotsTo),
      },
      newFeatures,
      abilityScoreImprovementPending: claseSrd.asiLevels.includes(to),
    };

    return { preview, tiradaParaRegistrar };
  }

  /**
   * `GET .../level-up/preview`. **No escribe nada en el personaje**, ni siquiera dentro de una
   * transacción: es una lectura, y la prueba que lo demuestra son los espías de Prisma en
   * verde. La única escritura posible es la tirada, cuando `roll` la pide — y esa tirada no
   * cambia el personaje, solo queda en el registro de la campaña para que la mesa no pueda
   * repetirla hasta que le convenga el número.
   */
  async preview(
    userId: string,
    campaignId: string,
    characterId: string,
    roll: boolean,
  ): Promise<LevelUpPreview> {
    await this.membership.requireMember(campaignId, userId);
    const character = await this.requireEditable(userId, campaignId, characterId);
    const { preview, tiradaParaRegistrar } = this.calcularDiff(character, roll);

    if (tiradaParaRegistrar) {
      // Sin transacción: no hay ningún cambio de personaje con el que atarla. El registro es
      // el único efecto de pedir `roll=true`, y por eso se escribe fuera de cualquier `tx`.
      await this.events.record(userId, campaignId, {
        subjectType: "character",
        subjectId: characterId,
        visibility: character.visibility,
        payload: {
          type: "ABILITY_ROLL",
          expression: tiradaParaRegistrar.expression,
          rolls: [],
          kept: [],
          dropped: [],
          modifier: 0,
          total: tiradaParaRegistrar.total,
          natural: "NONE",
          outcome: "NO_DC",
        },
      });
    }

    return preview;
  }

  /**
   * `POST .../level-up`. **Sube `level`, escribe `LEVEL_CHANGED` en la misma transacción, y no
   * toca `currentHp`** — los PG máximos se calculan siempre desde `level` vía `deriveCharacter`,
   * nunca se guardan, así que no hay columna que esta mutación tenga que tocar para que la
   * siguiente lectura de la hoja ya muestre el máximo nuevo.
   *
   * **No acepta `roll`.** Sería aceptar un número que no se puede conservar: como los PG
   * máximos no son una columna, "tirar en vez de la media" no tiene dónde vivir después de
   * aplicarse — por eso `roll` es una opción del *previo*, no de esta confirmación. Queda dicho
   * en el informe de la tarea.
   */
  async apply(userId: string, campaignId: string, characterId: string) {
    await this.membership.requireMember(campaignId, userId);
    await this.requireEditable(userId, campaignId, characterId);

    return this.prisma.$transaction(async (tx) => {
      const filas = await tx.$queryRaw<
        FilaPersonaje[]
      >`SELECT * FROM "Character" WHERE id = ${characterId} AND "campaignId" = ${campaignId} FOR UPDATE`;
      const character = filas[0];
      if (!character) throw new NotFoundException("Character not found");
      if (character.level >= NIVEL_MAXIMO) {
        throw new BadRequestException(
          `El nivel ${NIVEL_MAXIMO} es el techo del SRD: no se puede subir más.`,
        );
      }

      const from = character.level;
      const to = from + 1;
      // Falla antes de escribir si la hoja no se puede construir a ese nivel: un
      // `LEVEL_CHANGED` sin una hoja derivable detrás sería un número que nadie puede explicar.
      const hojaNueva = deriveCharacter(this.buildFor(character, to));

      const actualizado = await tx.character.update({
        where: { id: characterId },
        data: { level: to },
      });

      // **Los recursos suben con el nivel, en la misma transacción.** Un nivel 6 con cinco
      // dados de golpe, o un mago que sube a 3 sin su espacio de nivel 2, es la mitad de una
      // subida de nivel: la que se nota en la mesa. `seedResourcesFor` es un `upsert`, así que
      // sube el tope y deja lo ya gastado como estaba.
      if (this.resources) {
        await this.resources.seedResourcesFor(characterId, hojaNueva, to, tx);
      }

      await this.events.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          subjectId: characterId,
          visibility: character.visibility,
          payload: { type: "LEVEL_CHANGED", from, to },
        },
        tx,
      );

      return actualizado;
    });
  }
}
