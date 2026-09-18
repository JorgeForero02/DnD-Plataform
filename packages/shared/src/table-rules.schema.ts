import { z } from "zod";
import { dieRolledSchema } from "./roll.schema";

// Reglas de la mesa (spec 2026-09-12, D-CF-53): lo que el DM decide antes de que nadie haga su
// hoja. **`LIBRE`, `MEDIA` y `EQUIPO` por defecto en todo**: una campaña que ya existe no cambia
// de comportamiento porque esta columna aparezca.
//
// SRD 5.1, *Determine Ability Scores*: «You generate your character's six ability scores randomly.
// Roll four 6-sided dice and record the total of the highest three dice on a piece of scratch
// paper. Do this five more times […] If you want to save time or don't like the idea of randomly
// determining ability scores, you can use the following scores instead: 15, 14, 13, 12, 10, 8.»
// Variant *Customizing Ability Scores*: «you have 27 points to spend on your ability scores. The
// cost of each score is shown on the Ability Score Point Cost table […] you can't have a score
// lower than 8 or higher than 15 before applying racial increases.»

/** La expresión de dados. **No se valida aquí**: la gramática vive en `apps/api/src/dice/dice.ts`
 * y la API rechaza con 400 al guardar la regla (E-RM-4). Mismo rango que `createRollSchema`. */
const expresionDeDados = z.string().min(1).max(120);

export const ORDEN_DE_CARACTERISTICAS = ["str", "dex", "con", "int", "wis", "cha"] as const;

export const MATRIZ_ESTANDAR = [15, 14, 13, 12, 10, 8] as const;

/** Ability Score Point Cost, SRD 5.1. */
export const COSTE_POR_PUNTUACION: Readonly<Record<8 | 9 | 10 | 11 | 12 | 13 | 14 | 15, number>> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

export function costeDePuntos(valores: readonly number[]): number {
  let total = 0;
  for (const v of valores) {
    if (!(v in COSTE_POR_PUNTUACION))
      throw new RangeError(`La puntuación ${v} está fuera de 8..15.`);
    total += COSTE_POR_PUNTUACION[v as keyof typeof COSTE_POR_PUNTUACION];
  }
  return total;
}

/** Los mismos valores, cada uno tantas veces como en el patrón, sin ninguno de más ni de menos. */
export function esPermutacionDe(valores: readonly number[], patron: readonly number[]): boolean {
  if (valores.length !== patron.length) return false;
  const a = [...valores].sort((x, y) => x - y);
  const b = [...patron].sort((x, y) => x - y);
  return a.every((v, i) => v === b[i]);
}

export const abilitiesRuleSchema = z.discriminatedUnion("metodo", [
  z.object({ metodo: z.literal("LIBRE") }),
  z.object({ metodo: z.literal("MATRIZ") }),
  z.object({ metodo: z.literal("PUNTOS"), puntos: z.number().int().min(15).max(40).default(27) }),
  z.object({
    metodo: z.literal("DADOS"),
    expresion: expresionDeDados.default("4d6kh3"),
    intentos: z.number().int().min(1).max(10).default(1),
    /** `false` = en el orden en que salieron: FUE DES CON INT SAB CAR (E-RM-10). */
    asignacionLibre: z.boolean().default(true),
  }),
]);
export type AbilitiesRule = z.infer<typeof abilitiesRuleSchema>;

export const pgNivelesSiguientesSchema = z.enum(["MAXIMO", "MEDIA", "TIRADA"]);
export type PgNivelesSiguientes = z.infer<typeof pgNivelesSiguientesSchema>;

export const oroInicialSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("EQUIPO") }),
  z.object({ modo: z.literal("ORO_TABLA") }),
  z.object({ modo: z.literal("ORO_FIJO"), cantidadPo: z.number().int().min(0).max(100000) }),
]);
export type OroInicial = z.infer<typeof oroInicialSchema>;

export const tableRulesSchema = z.object({
  abilities: abilitiesRuleSchema.default({ metodo: "LIBRE" }),
  nivelInicial: z.number().int().min(1).max(20).default(1),
  pgNivelesSiguientes: pgNivelesSiguientesSchema.default("MEDIA"),
  permitidos: z
    .object({
      razas: z.array(z.string().min(1).max(60)).max(60).default([]),
      clases: z.array(z.string().min(1).max(60)).max(60).default([]),
      subclases: z.array(z.string().min(1).max(60)).max(60).default([]),
    })
    .default({}),
  oroInicial: oroInicialSchema.default({ modo: "EQUIPO" }),
  // Puerta de efectos §5 bis (D-CF-68/D-CF-69, 2026-09-13). **`HITO` por defecto, para que una
  // campaña que ya existe no cambie de comportamiento**: sin XP en ningún sitio, la hoja no
  // enseñaba un marcador que no tenía sentido y `end()` no proponía ningún reparto. Con `XP`, la
  // columna que ya existía (`Character.xp`) empieza a contar y la mesa la ve — es un MODO, no un
  // permiso, igual que el `noxp` de Foundry (`award.mjs:108`) esconde el XP en vez de apagarlo.
  progresion: z.enum(["HITO", "XP"]).default("HITO"),
});
export type TableRules = z.infer<typeof tableRulesSchema>;
export type Progresion = TableRules["progresion"];

/** La respuesta de `POST`/`GET …/ability-rolls` (Task 3). Cada una de las seis tiradas viaja con el
 * mismo desglose que `rollResultSchema` revelado, para que la pantalla reutilice `ResultadoDeTirada`. */
export const abilityRollAttemptSchema = z.object({
  id: z.string(),
  values: z.array(z.number().int()).length(6),
  chosen: z.boolean(),
  attempt: z.number().int().min(1),
  /**
   * De cuántos intentos permitía la regla **cuando la lista se pide**. Opcional (M-5, 2026-09-17):
   * si el DM cambió después la regla a MATRIZ o PUNTOS, los intentos ya tirados siguen existiendo
   * y no hay ningún «de N» honesto que ponerles — antes se mandaba `0`, que este mismo esquema
   * prohíbe con `min(1)`. Sin migración a propósito: el número solo importa mientras se tira, y
   * entonces la regla es DADOS y el campo viaja.
   */
  of: z.number().int().min(1).optional(),
  createdAt: z.string(),
  rolls: z
    .array(
      z.object({
        eventId: z.string(),
        expression: z.string(),
        rolls: z.array(z.number().int()),
        kept: z.array(z.number().int()),
        dropped: z.array(z.number().int()),
        dice: z.array(dieRolledSchema).optional(),
        modifier: z.number().int(),
        total: z.number().int(),
        natural: z.enum(["NONE", "ONE", "TWENTY"]),
        outcome: z.enum(["NO_DC", "SUCCESS", "FAILURE"]),
      }),
    )
    .length(6),
});
export type AbilityRollAttemptDto = z.infer<typeof abilityRollAttemptSchema>;
