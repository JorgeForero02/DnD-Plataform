// Tarea 2C.2 — **cómo un atajo de dado compone la expresión**, y por qué es una función aparte.
//
// El prototipo no tiene ni campo de expresión ni atajos: enseña un d20 y tres estados. El alcance
// de 2C sí los exige, porque «tira 2d6+3 porque lo digo yo» es la mitad de lo que pasa en una
// mesa. Componer texto dentro de un `onClick` es donde este tipo de reglas se rompe en silencio
// —un `+` de más, un `1d20+` que el evaluador rechaza—, así que la regla vive aquí, se prueba
// sola, y la pantalla solo la llama.
//
// **No valida nada.** Quien decide si una expresión es válida es el evaluador del servidor
// (`apps/api/src/dice/dice.ts`), y su rechazo se pinta en línea. Una segunda validación en el
// cliente sería una segunda fuente de verdad sobre la gramática de los dados.
//
// **Task 10 — ya no la llama ningún panel.** `PanelDeDados` y `PanelDeDadosDeLaMesa` pulsan
// dados de una `Bandeja` (`bandeja.ts`, `conDado`) en vez de componer texto sobre la marcha; el
// campo «Qué se tira» del modo avanzado sigue siendo un campo de texto libre, pero ya no tiene
// atajos propios que le añadan un término. Se conserva con su prueba, declarado a propósito: no
// es una función que sobre por descuido, es la que hacía el trabajo antes de esta tarea.

/**
 * Añade un dado a la expresión que ya hay.
 *
 * - Vacía → `1d20`, sin operador delante.
 * - Terminada en un operador (`1d20+`) → se pega el término, sin doblar el signo.
 * - Cualquier otra cosa → se suma: `1d20` + d6 = `1d20+1d6`.
 */
export function conDadoAnadido(actual: string, caras: number): string {
  const base = actual.trim();
  const termino = `1d${caras}`;
  if (base === "") return termino;
  if (/[+\-*/(]$/.test(base)) return `${base}${termino}`;
  return `${base}+${termino}`;
}
