import { z } from "zod";

// Fase 2C.3 — **el reloj de la campaña**.
//
// La corrección la trajo el DM asesor: hay efectos que duran una hora y el sistema **no modelaba
// el tiempo de juego en absoluto**. Sin reloj, «la antorcha dura una hora» y «la condición se
// pasa al amanecer» son texto en una nota, no reglas que la máquina pueda comprobar.
//
// ## Se guarda un CONTADOR EN SEGUNDOS, no una fecha
//
// Decisión del autor (2026-09-03), y coincide con la práctica: Foundry guarda el tiempo del mundo
// **en segundos** (`GameTime`), y los calendarios (Simple Calendar, Seasons & Stars) son una capa
// encima que lo avanza por deltas — no guardan fechas, guardan un contador.
//
// **Y es lo que hace que 2C y Encuentros sean literalmente el mismo contador**: un asalto son
// seis segundos y diez asaltos un minuto, así que la iniciativa, cuando llegue, avanza este mismo
// número de seis en seis. Guardar minutos —lo que proponía la primera versión del alcance—
// obligaría a migrar el día que llegue el combate.
//
// Un calendario (día, mes, estación, fases lunares) **no entra**: es una capa de presentación
// sobre este contador y se puede añadir sin tocar el dato. Lo que no se puede es al revés.

/** Un asalto. Está aquí, y no en Encuentros, porque es la unidad pequeña del MISMO contador. */
export const SEGUNDOS_POR_ASALTO = 6;
export const SEGUNDOS_POR_MINUTO = 60;
export const SEGUNDOS_POR_HORA = 3600;
export const SEGUNDOS_POR_DIA = 86_400;

/**
 * **El ritmo de viaje del SRD 5.1**, transcrito (hueco H-2C-3).
 *
 * > | Pace | Per Minute | Per Hour | Per Day | Effect |
 * > | Fast | 400 feet | 4 miles | 30 miles | −5 penalty to passive Wisdom (Perception) scores |
 * > | Normal | 300 feet | 3 miles | 24 miles | — |
 * > | Slow | 200 feet | 2 miles | 18 miles | Able to use stealth |
 *
 * Fuente: <https://5thsrd.org/adventuring/movement/>.
 *
 * **El reloj sin ritmo de viaje es medio mecanismo**: lo que una mesa dice no es «pasan seis
 * horas», es «vamos a la ciudad». Con la tabla, decir el ritmo y las horas da la distancia y el
 * tiempo de una vez, y el −5 a la Percepción pasiva deja de ser algo que el DM tiene que recordar.
 *
 * **En pies y en millas porque así lo escribe la fuente.** La conversión a metros es de la
 * pantalla, como ya se decidió para las distancias: pies en la base, metros al pintar.
 */
export const RITMO_DE_VIAJE = {
  FAST: { feetPerMinute: 400, milesPerHour: 4, milesPerDay: 30, passivePerception: -5 },
  NORMAL: { feetPerMinute: 300, milesPerHour: 3, milesPerDay: 24, passivePerception: 0 },
  SLOW: { feetPerMinute: 200, milesPerHour: 2, milesPerDay: 18, passivePerception: 0 },
} as const;

export const travelPaceSchema = z.enum(["FAST", "NORMAL", "SLOW"]);
export type TravelPace = z.infer<typeof travelPaceSchema>;

/**
 * **La marcha forzada** (hueco H-2C-4), transcrita del SRD:
 *
 * > For each additional hour of travel beyond 8 hours, [each character] must make a Constitution
 * > saving throw at the end of the hour. The DC is 10 + 1 for each hour past 8 hours. On a failed
 * > saving throw, a character suffers one level of exhaustion.
 *
 * Fuente: <https://5thsrd.org/adventuring/movement/>.
 */
export const HORAS_ANTES_DE_MARCHA_FORZADA = 8;
export const CD_BASE_DE_MARCHA_FORZADA = 10;

/**
 * Las salvaciones que exige un viaje de `horas`, **una por cada hora pasada de ocho**, con su CD
 * creciente. Vacío si el viaje no llega a nueve horas.
 *
 * **Devuelve las tiradas que hay que pedir; no las tira.** La máquina ejecuta, el DM arbitra: es
 * él quien decide si el grupo aprieta el paso, y son los jugadores los que tiran.
 */
export function salvacionesDeMarchaForzada(horas: number): { hora: number; dc: number }[] {
  const salvaciones: { hora: number; dc: number }[] = [];
  for (let hora = HORAS_ANTES_DE_MARCHA_FORZADA + 1; hora <= horas; hora++) {
    salvaciones.push({
      hora,
      dc: CD_BASE_DE_MARCHA_FORZADA + (hora - HORAS_ANTES_DE_MARCHA_FORZADA),
    });
  }
  return salvaciones;
}

/**
 * Avanzar el reloj. **Dos formas, y una unión discriminada** porque son dos preguntas distintas:
 * «pasan dos horas» y «viajamos seis horas a paso rápido» no llevan los mismos datos, y un objeto
 * con la mitad de los campos opcionales deja que llegue un viaje sin ritmo.
 */
export const advanceClockSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("TIME"),
    /**
     * Segundos de juego. El tope es **un año**: más que eso no es «pasa el tiempo», es empezar
     * otra campaña, y una cifra de diez dígitos escrita sin querer dejaría el reloj inservible
     * sin forma de deshacerlo desde la pantalla.
     */
    seconds: z
      .number()
      .int()
      .positive()
      .max(SEGUNDOS_POR_DIA * 365),
    reason: z.string().min(1).max(280).optional(),
  }),
  z.object({
    kind: z.literal("TRAVEL"),
    pace: travelPaceSchema,
    /** Horas de marcha. Más de ocho es marcha forzada, y el servidor lo dice. */
    hours: z.number().int().positive().max(24),
    reason: z.string().min(1).max(280).optional(),
  }),
]);
export type AdvanceClockInput = z.infer<typeof advanceClockSchema>;

/**
 * Lo que devuelve avanzar el reloj.
 *
 * `forcedMarchSaves` **no es un aviso decorativo**: es la lista de tiradas que el DM tiene que
 * pedir, con su CD ya calculada. Sin ella la marcha forzada sería una nota al pie que nadie mira.
 */
export const clockStateSchema = z.object({
  seconds: z.number().int().nonnegative(),
});
export type ClockState = z.infer<typeof clockStateSchema>;

export const advanceClockResultSchema = z.object({
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative(),
  seconds: z.number().int().positive(),
  eventId: z.string(),
  /** Solo en un viaje. */
  pace: travelPaceSchema.optional(),
  miles: z.number().optional(),
  passivePerception: z.number().int().optional(),
  forcedMarchSaves: z.array(z.object({ hora: z.number().int(), dc: z.number().int() })),
});
export type AdvanceClockResult = z.infer<typeof advanceClockResultSchema>;
