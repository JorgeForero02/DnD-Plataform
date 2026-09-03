// **«hace 6 días», que es como se dice en la mesa.**
//
// La tarjeta de campaña ponía «desde el 14 de febrero de 2026». Es exacto y no dice nada: para
// saber si esa campaña está viva hay que restar mentalmente. La maqueta escribe el hueco, no la
// fecha, y esa es la cifra que se usa al mirar una rejilla de campañas.
//
// `Intl.RelativeTimeFormat` con `numeric: "auto"` da «hoy», «ayer» y «hace 6 días» en español
// sin que aquí se escriba ni una tabla de plurales — que es exactamente el tipo de tabla que
// acaba mintiendo en el caso singular.
const FORMATO = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/**
 * Cuánto hace de `iso`, en palabras. Devuelve cadena vacía si la fecha no se entiende, porque
 * pintar «Invalid Date» en una tarjeta es peor que no pintar nada.
 *
 * El futuro también se dice («dentro de 2 días»): una campaña no debería tener fecha futura,
 * pero un reloj mal puesto no es motivo para escribir «hace -1 días».
 */
export function tiempoRelativo(iso: string, ahora: number = Date.now()): string {
  const cuando = new Date(iso).getTime();
  if (Number.isNaN(cuando)) return "";

  const delta = cuando - ahora;
  const magnitud = Math.abs(delta);
  const signo = delta < 0 ? -1 : 1;

  if (magnitud < HORA) return FORMATO.format(signo * Math.floor(magnitud / MINUTO), "minute");
  if (magnitud < DIA) return FORMATO.format(signo * Math.floor(magnitud / HORA), "hour");
  if (magnitud < 30 * DIA) return FORMATO.format(signo * Math.floor(magnitud / DIA), "day");
  if (magnitud < 365 * DIA)
    return FORMATO.format(signo * Math.floor(magnitud / (30 * DIA)), "month");
  return FORMATO.format(signo * Math.floor(magnitud / (365 * DIA)), "year");
}
