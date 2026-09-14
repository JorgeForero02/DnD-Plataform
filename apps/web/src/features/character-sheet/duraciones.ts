// Tarea 2C.4 — **el vocabulario de las duraciones de una condición**, escrito UNA sola vez.
//
// El servidor no cierra el conjunto: `applyConditionSchema.durationSeconds`
// (`packages/shared/src/character-state.schema.ts`) admite cualquier número entero de segundos
// de juego, hasta un año. Lo que esta tabla decide es **qué duraciones se ofrecen en pantalla**,
// y son las nueve del SRD 5.1 más «indefinida», que es lo que había antes de 2C y sigue siendo
// lo correcto para «envenenado hasta que alguien te cure».
//
// **Esta tabla no se copia en ningún otro sitio.** Es la misma regla de siempre: la forma
// legible de un dominio se escribe una vez y todo lo demás la importa
// (docs/04-convenciones.md, «ningún valor de enumeración llega a la pantalla»).
//
// **Lo que NO está aquí, y es a propósito:** «hasta el próximo descanso largo» y «mientras te
// concentres» **no son duraciones, son sucesos**. No se pueden convertir en un número de
// segundos sin mentir —nadie sabe cuándo descansará la mesa—, así que no se ofrecen; el
// esquema compartido las declara pendientes por el mismo motivo. Quien las necesite hoy aplica
// la condición como indefinida y la quita cuando el suceso ocurre, que es lo honesto.

/**
 * Cómo se cuenta cuánto dura una condición, al aplicarla (E-PE-7).
 *
 * `"RELOJ"` es el selector de siempre, de segundos de juego. `"SHORT"`/`"LONG"` son el suceso
 * —«hasta el próximo descanso corto/largo»— que la puerta de efectos añadió al esquema
 * compartido (`applyConditionSchema.expiresOnRest`): no es un número de segundos, así que no vive
 * en `DURACIONES_DE_CONDICION`, la tabla de arriba lo dice desde 2C.4. Su vocabulario legible
 * está en `vocabulario.ts` (`HASTA_EL_DESCANSO`).
 */
export type ModoDeDuracion = "RELOJ" | "SHORT" | "LONG";

/** Una opción del selector de duración. `segundos: null` es «indefinida». */
export interface DuracionDeCondicion {
  /** Clave estable del selector; nunca se pinta. */
  key: string;
  /** Lo que ve la mesa, ya en español. */
  etiqueta: string;
  /** Segundos **de juego**, o `null` si no vence sola. */
  segundos: number | null;
}

const MINUTO = 60;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/**
 * Las diez opciones, en el orden en que se leen: la indefinida primero —es el valor por
 * defecto, y lo que la aplicación hacía hasta 2C— y después las nueve del SRD de menor a mayor.
 */
export const DURACIONES_DE_CONDICION: DuracionDeCondicion[] = [
  { key: "indefinida", etiqueta: "Indefinida (la quita el DM)", segundos: null },
  { key: "round", etiqueta: "1 asalto (6 segundos)", segundos: 6 },
  { key: "minute", etiqueta: "1 minuto", segundos: MINUTO },
  { key: "ten-minutes", etiqueta: "10 minutos", segundos: 10 * MINUTO },
  { key: "hour", etiqueta: "1 hora", segundos: HORA },
  { key: "eight-hours", etiqueta: "8 horas", segundos: 8 * HORA },
  { key: "twenty-four-hours", etiqueta: "24 horas", segundos: DIA },
  { key: "seven-days", etiqueta: "7 días", segundos: 7 * DIA },
  { key: "ten-days", etiqueta: "10 días", segundos: 10 * DIA },
  { key: "thirty-days", etiqueta: "30 días", segundos: 30 * DIA },
];

/** La opción por defecto: indefinida, que es lo que la pantalla hacía antes de 2C. */
export const DURACION_INDEFINIDA = DURACIONES_DE_CONDICION[0];

/** Los segundos de una clave del selector, o `null` (indefinida, y también si la clave no existe). */
export function segundosDeDuracion(key: string): number | null {
  return DURACIONES_DE_CONDICION.find((d) => d.key === key)?.segundos ?? null;
}

const UNIDADES: { segundos: number; abreviatura: string }[] = [
  { segundos: DIA, abreviatura: "d" },
  { segundos: HORA, abreviatura: "h" },
  { segundos: MINUTO, abreviatura: "min" },
  { segundos: 1, abreviatura: "s" },
];

/**
 * Lo que le queda a una condición viva, en dos unidades como mucho: «2 d 3 h», «1 h 30 min»,
 * «6 s».
 *
 * **Se redondea hacia abajo**, como cualquier cuenta atrás: mientras quede un segundo, la
 * condición sigue calculando —el servidor la vence con `>=` sobre el reloj
 * (`apps/api/src/character-state/conditions/vencimiento.ts`)— y decir «1 min» faltando 59
 * segundos sería adelantar su hora en la pantalla. Se cortan dos unidades porque la tercera no
 * cambia ninguna decisión de la mesa y alarga la línea.
 */
export function describirRestante(segundos: number): string {
  if (segundos <= 0) return "0 s";
  const partes: string[] = [];
  let resto = segundos;
  for (const unidad of UNIDADES) {
    const n = Math.floor(resto / unidad.segundos);
    resto -= n * unidad.segundos;
    if (n > 0) partes.push(`${n} ${unidad.abreviatura}`);
    if (partes.length === 2) break;
  }
  return partes.join(" ");
}
