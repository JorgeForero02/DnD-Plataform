// Task 5 (2026-09-19) — `name.trim().charAt(0)` pintaba «[» para «[demo] Tessa» y una comilla o un
// espacio para cualquier nombre que empezara por uno: el retrato dejaba de ser una inicial. La
// única letra que sirve de inicial es la primera de verdad, saltando lo que no es letra.

/** Primera letra de verdad del nombre —salta «[demo]», comillas, espacios—; «?» si no hay.
 *  `\p{L}` solo no basta: encontraría la «d» de «[demo]» antes que la «T» de «Tessa», así que la
 *  etiqueta entre corchetes se descarta primero. */
export function inicialDe(nombre: string): string {
  const sinEtiqueta = nombre.replace(/^\s*\[[^\]]*\]\s*/, "");
  return sinEtiqueta.match(/\p{L}/u)?.[0]?.toUpperCase() ?? "?";
}
