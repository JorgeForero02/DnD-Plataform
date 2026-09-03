import { z } from "zod";
import { abilityKeySchema, proficiencyLevelSchema, SKILLS } from "./rules/trace.schema";
import { visibilitySchema } from "./visibility.schema";

/**
 * Fase 2D — la forma de un statblock de PNJ.
 *
 * **Atribución:** el catálogo que rellena esta forma es material del System Reference Document
 * 5.1, © Wizards of the Coast LLC, CC BY 4.0. Ver `NOTICE.md` de la raíz.
 *
 * **Por qué existe esta forma y no se reutiliza la del personaje.** Un personaje jugador guarda
 * *decisiones* —raza, clase, nivel— y el motor deriva de ahí sus números. Un monstruo no tiene
 * decisiones que guardar: sus números **vienen dichos** por quien lo escribió. Meterlo en la
 * forma del personaje obligaría a inventarle una clase y un equipo a cada monstruo para que la
 * CA cuadrase, que es exactamente la mentira que las anulaciones de 2A existen para evitar.
 *
 * **Lo que sí se conserva del personaje** es todo lo mutable: un PNJ que baja a la mesa es una
 * fila de `Character` con `statblockRef`, y sus PG, sus condiciones y sus tiradas son las de
 * siempre. Ver `docs/superpowers/specs/2026-09-03-fase-2D-alcance-design.md`, §2.
 */

/** Los seis tamaños del SRD 5.1. */
export const CREATURE_SIZES = ["TINY", "SMALL", "MEDIUM", "LARGE", "HUGE", "GARGANTUAN"] as const;
export const creatureSizeSchema = z.enum(CREATURE_SIZES);
export type CreatureSize = z.infer<typeof creatureSizeSchema>;

/**
 * El dado de golpe que le toca a cada tamaño.
 *
 * **No es una convención: es una regla del SRD**, y está verificada contra los quince statblocks
 * de la tanda —goblin pequeño con d6, huargo grande con d10, gigante de las colinas enorme con
 * d12— sin una sola excepción. Por eso el tamaño del dado **se deriva y no se guarda**: guardarlo
 * sería guardar un valor calculado, que es justo lo que este proyecto no hace.
 */
export const DADO_DE_GOLPE_POR_TAMANO: Record<CreatureSize, number> = {
  TINY: 4,
  SMALL: 6,
  MEDIUM: 8,
  LARGE: 10,
  HUGE: 12,
  GARGANTUAN: 20,
};

/** Los catorce tipos de criatura del SRD 5.1. */
export const CREATURE_TYPES = [
  "ABERRATION",
  "BEAST",
  "CELESTIAL",
  "CONSTRUCT",
  "DRAGON",
  "ELEMENTAL",
  "FEY",
  "FIEND",
  "GIANT",
  "HUMANOID",
  "MONSTROSITY",
  "OOZE",
  "PLANT",
  "UNDEAD",
] as const;
export const creatureTypeSchema = z.enum(CREATURE_TYPES);
export type CreatureType = z.infer<typeof creatureTypeSchema>;

const skillKeySchema = z.enum(Object.keys(SKILLS) as [string, ...string[]]);

/**
 * Un rasgo, una acción o una reacción: **nombre y prosa**.
 *
 * Se guardan y se pintan; **no se ejecutan**. «Regeneración» del troll y el «Aguante de los
 * muertos» del zombi son reglas condicionales con excepciones en prosa, y un vocabulario cerrado
 * que las cubriese sería el motor de reglas entero otra vez. La fase 2D las enseña; arbitrarlas es
 * Encuentros, que no está escrita. Ver la especificación de alcance, §7.
 */
export const statblockFeatureSchema = z.object({
  name: z.string().min(1).max(120),
  desc: z.string().min(1).max(4000),
});
export type StatblockFeature = z.infer<typeof statblockFeatureSchema>;

/**
 * Las resistencias son **prosa, no un vocabulario cerrado**, y esto es una decisión con motivo.
 *
 * El tercer monstruo de la tanda ya la rompe: el espectro resiste *«contundente, perforante y
 * cortante de armas no mágicas que no sean de plata»*. Eso no es un tipo de daño, es una
 * condición sobre el arma que lo causa, y una lista cerrada de tipos de daño no puede
 * expresarla. Cerrar el vocabulario aquí obligaría a mentir en la primera transcripción.
 */
const damageTagSchema = z.string().min(1).max(200);

export const statblockSchema = z.object({
  /**
   * `SRD:goblin` o `CAMPAIGN:<cuid>`. **Cadena y no clave foránea**, igual que `ResolvedItem.ref`
   * de 2B: el catálogo del SRD vive en código —donde se lee, se revisa y se prueba— y no obliga a
   * sembrar cientos de filas en la base de cada campaña.
   */
  ref: z.string().min(1).max(120),
  source: z.enum(["SRD", "CAMPAIGN"]),
  name: z.string().min(1).max(120),

  size: creatureSizeSchema,
  type: creatureTypeSchema,
  /** `"goblinoide"`, `"orco"`. Prosa del SRD, opcional. */
  subtype: z.string().max(120).optional(),
  alignment: z.string().max(120).optional(),

  /**
   * La CA **es un número dicho**, no una fórmula de armadura.
   *
   * `acNote` es el paréntesis del libro: *«armadura de cuero, escudo»*, *«armadura natural»*,
   * *«restos de armadura»*. Sale en la traza como el porqué del número, que es lo que la mesa
   * pregunta.
   */
  ac: z.number().int().min(0).max(40),
  acNote: z.string().max(200).optional(),

  /**
   * Cuántos dados de golpe. **El tamaño del dado no se guarda**: sale de `size`. El número de
   * dados y el modificador de Constitución dan los PG, y esa cuenta está verificada contra los
   * quince de la tanda sin una sola excepción.
   */
  hitDiceCount: z.number().int().min(1).max(60),
  /**
   * Válvula de escape para un statblock propio del DM que rompa la regla del tamaño. **Vacío en
   * los quince del SRD**, y si se usa, el motor lo saca en la traza como una anulación con su
   * delta — nunca en silencio.
   */
  hitDieSizeOverride: z.number().int().min(2).max(20).optional(),

  abilities: z.object({
    str: z.number().int().min(1).max(30),
    dex: z.number().int().min(1).max(30),
    con: z.number().int().min(1).max(30),
    int: z.number().int().min(1).max(30),
    wis: z.number().int().min(1).max(30),
    cha: z.number().int().min(1).max(30),
  }),

  saveProficiencies: z.array(abilityKeySchema).default([]),
  /**
   * Competencia por habilidad, **no el bono ya sumado**.
   *
   * El bono se deriva, y por eso sale en la traza descompuesto —`Sigilo +6 = +2 DES + 4 pericia`—
   * en vez de aparecer como un número sin origen. Que los quince del SRD **descompongan sin resto**
   * en «competente» o «pericia» está comprobado; si algún día un statblock propio no lo hiciera, la
   * salida es la anulación por personaje que 2A ya tiene, no ensuciar esta forma.
   */
  skillProficiencies: z.record(skillKeySchema, proficiencyLevelSchema).default({}),

  damageResistances: z.array(damageTagSchema).default([]),
  damageImmunities: z.array(damageTagSchema).default([]),
  damageVulnerabilities: z.array(damageTagSchema).default([]),
  conditionImmunities: z.array(z.string().min(1).max(60)).default([]),

  /** En pies. `0` o ausente = no ve en la oscuridad. Igual que en la hoja del jugador. */
  darkvisionFeet: z.number().int().min(0).max(1000).optional(),
  /** Otros sentidos en prosa: *«visión verdadera 120 pies»*, *«percepción a ciegas 10 pies»*. */
  otherSenses: z.array(z.string().min(1).max(200)).default([]),

  /** Caminar, trepar, nadar, volar, excavar. En pies. */
  speeds: z
    .object({
      walk: z.number().int().min(0).max(1000).optional(),
      climb: z.number().int().min(0).max(1000).optional(),
      swim: z.number().int().min(0).max(1000).optional(),
      fly: z.number().int().min(0).max(1000).optional(),
      burrow: z.number().int().min(0).max(1000).optional(),
    })
    .default({}),

  languages: z.string().max(400).optional(),

  /**
   * Valor de desafío. **De aquí sale el bonificador de competencia**, no de un nivel, porque un
   * PNJ no tiene nivel. Fraccionario a propósito: 0, 1/8, 1/4 y 1/2 son valores reales del SRD.
   */
  cr: z.number().min(0).max(30),

  traits: z.array(statblockFeatureSchema).default([]),
  actions: z.array(statblockFeatureSchema).default([]),
  reactions: z.array(statblockFeatureSchema).default([]),
  legendaryActions: z.array(statblockFeatureSchema).default([]),
});
export type Statblock = z.infer<typeof statblockSchema>;

/**
 * El bonificador de competencia de una criatura, a partir de su valor de desafío.
 *
 * SRD 5.1, tabla «Monster Statistics by Challenge Rating»: VD 0–4 → +2, 5–8 → +3, 9–12 → +4, y
 * así cada cuatro. Los valores fraccionarios (1/8, 1/4, 1/2) caen todos en la primera banda, y por
 * eso se redondea **hacia arriba** antes de dividir. Comprobado contra los quince statblocks de la
 * tanda, incluidos el troll y el gigante de las colinas de VD 5 con su +3.
 */
export function bonoDeCompetenciaPorVd(cr: number): number {
  return 2 + Math.floor(Math.max(0, Math.ceil(cr) - 1) / 4);
}

/**
 * El tamaño del dado de golpe de una criatura: el de su tamaño, salvo anulación explícita.
 */
export function dadoDeGolpeDe(statblock: Pick<Statblock, "size" | "hitDieSizeOverride">): number {
  return statblock.hitDieSizeOverride ?? DADO_DE_GOLPE_POR_TAMANO[statblock.size];
}

/**
 * Los PG medios de un statblock: la media de los dados **más el modificador de Constitución por
 * cada dado**, redondeando el total hacia abajo.
 *
 * El SRD escribe los PG de un monstruo como «7 (2d6)» y **la Constitución no aparece en la
 * fórmula**: va sumada aparte, una vez por dado. Comprobado contra los quince: el capitán bandido
 * son 10d8 (media 45) más 2 de CON por dado = 65, que es exactamente lo que dice el libro.
 */
export function pgMediosDe(
  statblock: Pick<Statblock, "size" | "hitDieSizeOverride" | "hitDiceCount" | "abilities">,
): number {
  const dado = dadoDeGolpeDe(statblock);
  const modCon = Math.floor((statblock.abilities.con - 10) / 2);
  return Math.floor((statblock.hitDiceCount * (dado + 1)) / 2) + modCon * statblock.hitDiceCount;
}

/** La expresión de dados que un statblock usa para tirar sus PG: `2d6`, `10d8+20`. */
export function expresionDePgDe(
  statblock: Pick<Statblock, "size" | "hitDieSizeOverride" | "hitDiceCount" | "abilities">,
): string {
  const dado = dadoDeGolpeDe(statblock);
  const modCon = Math.floor((statblock.abilities.con - 10) / 2);
  const total = modCon * statblock.hitDiceCount;
  const cola = total === 0 ? "" : total > 0 ? `+${total}` : `${total}`;
  return `${statblock.hitDiceCount}d${dado}${cola}`;
}

/** Cómo se escribe un valor de desafío en pantalla: `0`, `1/8`, `1/4`, `1/2`, `5`. */
export function vdLegible(cr: number): string {
  if (cr === 0.125) return "1/8";
  if (cr === 0.25) return "1/4";
  if (cr === 0.5) return "1/2";
  return String(cr);
}

/** Un statblock propio del DM, tal y como se guarda y se devuelve. */
export const campaignStatblockSchema = statblockSchema.extend({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  visibility: visibilitySchema,
  createdById: z.string().min(1),
});
export type CampaignStatblock = z.infer<typeof campaignStatblockSchema>;
