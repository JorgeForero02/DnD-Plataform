// Task 7 (2026-09-19) — un solo convenio de fecha, no uno por pantalla. `CampaignOverview.tsx` y
// `SessionDetailPage.tsx` tenían cada uno su propio `fechaLarga` local, casi idéntico y ya
// desincronizado (uno con año, el otro sin). **Aquí sí se usa `toLocaleDateString`**, a
// diferencia de `dominio/numeros.ts`: se comprobó a mano (`node -e`, y la misma prueba dentro de
// Vitest/jsdom) que este Node da `"sábado, 19 de septiembre de 2026"` para `es-ES` — el ICU
// pequeño del proyecto pierde el AGRUPADO de miles (`toLocaleString` de un número), no el
// vocabulario de fechas, que sí trae completo. Si algún día ese Node cambia y la prueba empieza
// a ver inglés, la unitaria de este fichero solo comprueba la presencia del año, no el nombre del
// día de la semana — así no depende de qué locale de verdad resuelva el entorno que la corra.

/**
 * «19 sept» o «19 sept 2025»: sin año si `d` cae en el año en curso, con año si no —para no
 * confundir «lo de hace un año» con «lo de esta semana».
 */
export function fechaCorta(d: string | Date): string {
  const fecha = typeof d === "string" ? new Date(d) : d;
  const esDelAnoActual = fecha.getFullYear() === new Date().getFullYear();
  return fecha.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: esDelAnoActual ? undefined : "numeric",
  });
}

/** «sábado, 19 de septiembre de 2026»: el día de la semana entero, para la ficha que se lee una
 *  vez y quiere decir exactamente cuándo fue. */
export function fechaLarga(d: string | Date): string {
  const fecha = typeof d === "string" ? new Date(d) : d;
  return fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
