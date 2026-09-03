import {
  RITMO_DE_VIAJE,
  SEGUNDOS_POR_DIA,
  SEGUNDOS_POR_HORA,
  SEGUNDOS_POR_MINUTO,
  type TravelPace,
} from "@dnd/shared";

// Tarea 2C.3 en la pantalla. **La forma legible se escribe aquí y en ningún otro sitio**: ningún
// valor de enumeración llega a la pantalla, y el reloj tiene dos vocabularios —los saltos de
// tiempo y los tres ritmos de viaje— que si se escriben dos veces se separan a la semana.

/** Los saltos que una mesa dice de verdad. Los tres primeros los nombra el plan de 2C. */
export const SALTOS_DE_RELOJ = [
  { etiqueta: "1 minuto", segundos: SEGUNDOS_POR_MINUTO },
  { etiqueta: "10 minutos", segundos: SEGUNDOS_POR_MINUTO * 10 },
  { etiqueta: "1 hora", segundos: SEGUNDOS_POR_HORA },
  { etiqueta: "8 horas", segundos: SEGUNDOS_POR_HORA * 8 },
  { etiqueta: "1 día", segundos: SEGUNDOS_POR_DIA },
] as const;

/**
 * Los tres ritmos, **con sus cifras del SRD** para que el DM no tenga que recordarlas.
 *
 * La frase del rápido dice el precio —«−5 a la Percepción pasiva»— porque es la única de las tres
 * que cuesta algo, y elegirlo sin saberlo es exactamente lo que esta pantalla existe para evitar.
 */
export const RITMOS: { pace: TravelPace; etiqueta: string; frase: string }[] = [
  {
    pace: "FAST",
    etiqueta: "Rápido",
    frase: `${RITMO_DE_VIAJE.FAST.milesPerHour} millas por hora, y −5 a la Percepción pasiva.`,
  },
  {
    pace: "NORMAL",
    etiqueta: "Normal",
    frase: `${RITMO_DE_VIAJE.NORMAL.milesPerHour} millas por hora.`,
  },
  {
    pace: "SLOW",
    etiqueta: "Lento",
    frase: `${RITMO_DE_VIAJE.SLOW.milesPerHour} millas por hora, y podéis moveros con sigilo.`,
  },
];

/**
 * El reloj en palabras. **Días y horas, no una fecha**: el contador no es un calendario, y
 * escribir «3 de Ches» sería inventarse un mundo que el dato no tiene.
 *
 * Se cuenta desde que empezó la campaña, que es lo que el número significa: «día 1» es el primero.
 */
export function relojEnPalabras(segundos: number): string {
  const dias = Math.floor(segundos / SEGUNDOS_POR_DIA);
  const restoDelDia = segundos % SEGUNDOS_POR_DIA;
  const horas = Math.floor(restoDelDia / SEGUNDOS_POR_HORA);
  const minutos = Math.floor((restoDelDia % SEGUNDOS_POR_HORA) / SEGUNDOS_POR_MINUTO);
  const hhmm = `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
  return `Día ${dias + 1}, ${hhmm}`;
}

/** «6 horas», «2 días», «45 minutos». Para decir cuánto se acaba de avanzar. */
export function duracionEnPalabras(segundos: number): string {
  if (segundos % SEGUNDOS_POR_DIA === 0) {
    const dias = segundos / SEGUNDOS_POR_DIA;
    return dias === 1 ? "1 día" : `${dias} días`;
  }
  if (segundos % SEGUNDOS_POR_HORA === 0) {
    const horas = segundos / SEGUNDOS_POR_HORA;
    return horas === 1 ? "1 hora" : `${horas} horas`;
  }
  const minutos = Math.max(1, Math.round(segundos / SEGUNDOS_POR_MINUTO));
  return minutos === 1 ? "1 minuto" : `${minutos} minutos`;
}
