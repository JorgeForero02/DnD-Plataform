import { z } from "zod";
import { abilityKeySchema, proficiencyLevelSchema, SKILLS } from "./rules/trace.schema";
import { visibilitySchema } from "./visibility.schema";
import { damageTypeSchema } from "./item.schema";

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
 * de la tanda —goblin pequeño con d6, **lobo terrible** grande con d10, gigante de las colinas
 * enorme con d12— sin una sola excepción.
 *
 * Por eso el tamaño del dado **se deriva y no se guarda**: guardarlo sería guardar un valor
 * calculado, que es justo lo que este proyecto no hace.
 *
 * (Este comentario decía «huargo», y **el huargo no está en la tanda**. Lo cazó la revisión de
 * cierre de 2D: citar una comprobación que no se hizo es la clase de mentira pequeña que hace
 * dudar de las grandes.)
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
 * **Encuentros**, un bloque que el plan maestro sitúa entre la fase 2 y la 3 y que aún no tiene
 * plan escrito. Ver la especificación de alcance de 2D, §7.
 */
export const statblockFeatureSchema = z.object({
  name: z.string().min(1).max(120),
  desc: z.string().min(1).max(4000),
});
export type StatblockFeature = z.infer<typeof statblockFeatureSchema>;

/**
 * Las resistencias son **prosa, no un vocabulario cerrado**, y esto es una decisión con motivo.
 *
 * El **tumulario** ya la rompe: resiste *«necrótico; contundente, cortante y perforante de
 * ataques no mágicos con armas que no sean de plata»*. Eso no es un tipo de daño, es una
 * condición sobre el arma que lo causa, y una lista cerrada de tipos de daño no puede
 * expresarla. Cerrar el vocabulario aquí obligaría a mentir en la primera transcripción.
 *
 * (Este comentario decía «el espectro», y el espectro es **otro monstruo** —el *specter*—, en el
 * mismo trabajo que se molestó en corregir precisamente ese nombre. Lo cazó la revisión de cierre
 * de 2D.)
 */
const damageTagSchema = z.string().min(1).max(200);

/**
 * Tarea 2.5.1 — la MISMA resistencia, partida en dos. Las tres listas de prosa de arriba se
 * conservan tal cual (es lo que lee el DM); esto es la parte que el servidor sabe aplicar solo:
 * un tipo de daño de los trece del SRD y el efecto que le toca.
 *
 * `note` es la prosa que **limita** la regla — *«de ataques no mágicos con armas que no sean de
 * plata»*, el caso del tumulario — y el servidor **nunca la interpreta**: la transporta para que
 * el DM la vea junto al resultado y pueda ignorarla o degradarla de un clic, como hace Foundry
 * con `Ignoring {source}` / `Downgrading {source} to Resistance`. Un vocabulario cerrado que
 * intentara entender "no mágico y no plateado" sería un tercer motor de reglas.
 */
export const damageModifierSchema = z.object({
  damageType: damageTypeSchema,
  effect: z.enum(["RESIST", "IMMUNE", "VULNERABLE"]),
  note: z.string().min(1).max(300).optional(),
});
export type DamageModifier = z.infer<typeof damageModifierSchema>;

/**
 * **`.optional()`, deliberadamente sin `.default([])` aquí.** Un `z.array(...).default([])`
 * hace que `z.infer` marque el campo como NO opcional en el tipo de salida —Zod rellena el valor,
 * así que TypeScript deja de admitir que falte—, y eso habría obligado a tocar `apps/web`, fuera
 * de la frontera de esta tarea, para añadir el campo a cada `Statblock` escrito a mano en sus
 * fixtures de prueba. Con `.optional()` el tipo es `DamageModifier[] | undefined` de verdad, y
 * quien lo consulta usa `?? []` — exactamente igual que ya hace `aStatblock()` con un valor `null`
 * de la base. `createCampaignStatblockSchema` y `updateCampaignStatblockSchema` heredan el mismo
 * opcional al derivarse de este esquema.
 */
export const damageModifiersSchema = z.array(damageModifierSchema).max(26).optional();

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

  /**
   * Tarea 2.5.1 — la parte estructurada de la resistencia, al lado de las tres listas de prosa
   * de arriba. **Opcional**: un statblock ya guardado antes de esta tarea no tiene esta lista, y
   * quien la consulta trata la ausencia como ninguna resistencia (`?? []`) — no una inventada.
   */
  damageModifiers: damageModifiersSchema,

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
  const bruto =
    Math.floor((statblock.hitDiceCount * (dado + 1)) / 2) + modCon * statblock.hitDiceCount;
  // **Ninguna criatura tiene menos de 1 PG**, igual que ningún personaje.
  //
  // Sin este suelo, un statblock propio del DM con una criatura Diminuta de un solo dado y
  // Constitución 1 —todo dentro de lo que el esquema admite— salía a −3, y el PNJ se guardaba con
  // los puntos de golpe en negativo **mientras el motor derivaba 1 para esa misma criatura**: dos
  // números distintos para lo mismo, que es la clase de discrepancia que este proyecto persigue.
  // Lo cazó la revisión de cierre de 2D, que vio que el camino de la tirada (`pgDeMonstruo`) sí
  // clampaba y este no.
  return Math.max(1, bruto);
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

/**
 * Lo que el DM manda para crear uno suyo.
 *
 * **Es la misma forma sin `ref` ni `source`**, y no una lista de campos repetida: los dos los pone
 * el servidor —`CAMPAIGN:<id>` no lo puede elegir el cliente— y volver a enumerar veinte campos
 * aquí sería la segunda copia de la forma de los datos, que es justo lo que este proyecto tiene
 * prohibido.
 *
 * **Nace `DM_ONLY`.** Preparar la mazmorra no puede ser filtrarla: el DM lo sube a `PLAYERS`
 * cuando los jugadores conocen al bicho. Es la misma decisión que 2B tomó con los objetos propios.
 */
export const createCampaignStatblockSchema = statblockSchema
  .omit({ ref: true, source: true })
  .extend({ visibility: visibilitySchema.default("DM_ONLY") });
export type CreateCampaignStatblockInput = z.infer<typeof createCampaignStatblockSchema>;

/** Editar uno: los mismos campos, todos opcionales, y al menos uno. */
export const updateCampaignStatblockSchema = createCampaignStatblockSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "No hay nada que cambiar: manda al menos un campo.",
  });
export type UpdateCampaignStatblockInput = z.infer<typeof updateCampaignStatblockSchema>;

/**
 * Bajar un statblock a la mesa: de una plantilla nacen N combatientes.
 *
 * **`count` y no un botón por bicho** porque la mesa dice «salen seis goblins», no «sale un goblin»
 * seis veces. Y el tope es diez por tirada: no por miedo al servidor, sino porque un encuentro con
 * más de diez fichas es un encuentro que esta fase no sabe arbitrar y sería fingir que sí.
 */
export const instantiateNpcSchema = z.object({
  ref: z.string().min(1).max(120),
  count: z.number().int().min(1).max(10).default(1),
  /**
   * El nombre de la tanda. Si vienen varios, se numeran: «Goblin 1», «Goblin 2». Sin nombre se
   * usa el del statblock, que es lo que la mesa dice en voz alta.
   */
  name: z.string().min(1).max(120).optional(),
  /**
   * Cómo salen los PG. `AVERAGE` es el número que imprime el libro; `ROLL` los tira de verdad,
   * y entonces **seis goblins tienen seis vidas distintas**, que es lo que pasa en una mesa.
   *
   * **El azar no entra en el motor**: el motor dice `2d6`, y quien lo tira es el tirador de 2C con
   * su generador inyectable. Es la regla que la fase 2 puso por escrito y aquí se respeta.
   */
  hp: z.enum(["AVERAGE", "ROLL"]).default("AVERAGE"),
});
export type InstantiateNpcInput = z.infer<typeof instantiateNpcSchema>;

/**
 * De dónde viene un `ref`, sin tener que preguntárselo a la base.
 *
 * `SRD:goblin` → el catálogo en código. `CAMPAIGN:clx…` → una fila de esta campaña. Cualquier otra
 * cosa es un `ref` que nadie escribió, y decirlo aquí evita que cada consumidor invente su propio
 * `startsWith`.
 */
export function origenDeRef(
  ref: string,
): { source: "SRD"; key: string } | { source: "CAMPAIGN"; id: string } | null {
  if (ref.startsWith("SRD:")) {
    const key = ref.slice("SRD:".length);
    return key ? { source: "SRD", key } : null;
  }
  if (ref.startsWith("CAMPAIGN:")) {
    const id = ref.slice("CAMPAIGN:".length);
    return id ? { source: "CAMPAIGN", id } : null;
  }
  return null;
}
