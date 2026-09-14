import { z } from "zod";

// Puerta de efectos §5 bis (2026-09-13, D-CF-68/D-CF-69). El SRD 5.1 sube de nivel por experiencia,
// y el proyecto solo tenía `Character.level`: ni la tabla de umbrales ni el XP por valor de
// desafío existían en ningún sitio (spec §5b.1). Este fichero es la fuente única de las dos tablas
// y de la aritmética que sale de ellas — nadie más las copia a mano.
//
// SRD 5.1, *Beyond 1st Level*: «As your character goes on adventures and overcomes challenges, he
// or she gains experience, represented by experience points. A character who reaches a specified
// experience point total advances in capability. This advancement is called gaining a level.» La
// tabla *Character Advancement* trae los veinte umbrales de abajo. Coincide con
// `DND5E.CHARACTER_EXP_LEVELS` de Foundry (`module/config.mjs:4147`).
//
// SRD 5.1, *Monsters · Experience Points*: «The number of experience points (XP) a monster is
// worth is based on its challenge rating. Typically, XP is awarded for defeating the monster,
// although the GM may also award XP for neutralizing the threat posed by the monster in some
// other manner.» La tabla *Experience Points by Challenge Rating* es `XP_POR_VD`. Coincide con
// `DND5E.CR_EXP_LEVELS` de Foundry (`module/config.mjs:4158`); la copia del SRD en
// `OldManUmby/DND.SRD.Wiki` omite las filas 9–13 por error de transcripción — se contrastó con
// Foundry, que es la fuente que se usó aquí.

/** *Character Advancement*, SRD 5.1: 20 umbrales, índice = nivel − 1. `UMBRALES_DE_NIVEL[0] === 0`
 * (nivel 1 no exige XP) y `UMBRALES_DE_NIVEL[19] === 355000` (nivel 20, el máximo del SRD). */
export const UMBRALES_DE_NIVEL: readonly number[] = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000,
  195000, 225000, 265000, 305000, 355000,
];

/** *Experience Points by Challenge Rating*, SRD 5.1. Clave: el VD como cadena exacta —
 * `String(cr)`, que para las fracciones da `"0.125"`, `"0.25"` y `"0.5"`—, valor: el XP que vale.
 * `"0"` vale 10 y no 0: el SRD dice que un VD 0 sin ataques vale 0 XP y con ataques vale 10; el
 * statblock no distingue los dos casos, así que se toma el valor alto y el DM lo baja a mano si
 * hace falta (spec §5b.4). */
export const XP_POR_VD: Readonly<Record<string, number>> = {
  "0": 10,
  "0.125": 25,
  "0.25": 50,
  "0.5": 100,
  "1": 200,
  "2": 450,
  "3": 700,
  "4": 1100,
  "5": 1800,
  "6": 2300,
  "7": 2900,
  "8": 3900,
  "9": 5000,
  "10": 5900,
  "11": 7200,
  "12": 8400,
  "13": 10000,
  "14": 11500,
  "15": 13000,
  "16": 15000,
  "17": 18000,
  "18": 20000,
  "19": 22000,
  "20": 25000,
  "21": 33000,
  "22": 41000,
  "23": 50000,
  "24": 62000,
  "25": 75000,
  "26": 90000,
  "27": 105000,
  "28": 120000,
  "29": 135000,
  "30": 155000,
};

/**
 * El nivel que corresponde a un total de XP: el mayor umbral que ese total ya alcanza.
 *
 * **El empate sube.** `nivelPorXp(900) === 3` porque 900 ES el umbral del nivel 3, no solo
 * "más que el del nivel 2" — de ahí el `>=` y no un `>` (la mutación que lo cambiaría enrojece
 * justo este caso, ver `xp.test.ts`). Por debajo de 300, siempre nivel 1; por encima de 355 000,
 * se queda en 20 — el SRD no define nada más allá.
 */
export function nivelPorXp(xp: number): number {
  let nivel = 1;
  for (let i = 0; i < UMBRALES_DE_NIVEL.length; i++) {
    if (xp >= UMBRALES_DE_NIVEL[i]) nivel = i + 1;
  }
  return nivel;
}

/** El umbral de XP de un nivel (1..20). `null` para el 21 y más allá: el SRD no llega tan lejos. */
export function umbralDeNivel(nivel: number): number | null {
  if (nivel < 1 || nivel > UMBRALES_DE_NIVEL.length) return null;
  return UMBRALES_DE_NIVEL[nivel - 1];
}

/** El XP que vale un valor de desafío. Lanza `RangeError` si el VD no está en la tabla del SRD. */
export function xpPorVd(cr: number): number {
  const clave = String(cr);
  if (!(clave in XP_POR_VD)) throw new RangeError(`El valor de desafío ${cr} no está en la tabla.`);
  return XP_POR_VD[clave];
}

/** `POST /campaigns/:campaignId/xp` (E-PE-11/E-PE-12, DM). Negativo permitido para corregir un
 * error del DM; cero no es un premio y se rechaza. */
export const awardXpSchema = z.object({
  characterIds: z.array(z.string().cuid()).min(1).max(20),
  amount: z
    .number()
    .int()
    .min(-100000)
    .max(100000)
    .refine((n) => n !== 0, "Cero XP no es un premio."),
  reason: z.string().max(160).optional(),
});
export type AwardXpInput = z.infer<typeof awardXpSchema>;

/** Lo que `EncountersService.end()` propone en modo XP (D-CF-68): se PROPONE, no se aplica — el
 * DM confirma (con o sin ediciones) en «Dar XP». */
export const xpPropuestoSchema = z.object({
  total: z.number().int().min(0),
  porCabeza: z.number().int().min(0),
  destinatarios: z.array(z.object({ characterId: z.string(), name: z.string() })),
  desglose: z.array(
    z.object({ characterId: z.string(), name: z.string(), cr: z.number(), xp: z.number().int() }),
  ),
});
export type XpPropuesto = z.infer<typeof xpPropuestoSchema>;
