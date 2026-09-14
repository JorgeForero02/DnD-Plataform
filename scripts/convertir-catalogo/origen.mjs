// Tarea 3A.1 (T1) — traduce una fórmula `@` de Foundry a una variante cerrada de `Origen`
// (`packages/shared/src/origen.schema.ts`), o la rechaza en voz alta.
//
// Censo completo de las 35 fórmulas distintas medidas en la tarea 0
// (`docs/superpowers/specs/2026-09-14-3a1-tarea-0-prueba-de-fuego.md`, sección d.2). Ninguna
// fórmula se evalúa nunca: es una traducción de texto a una de las nueve formas de `Origen`
// (siete ya existían, `nivelDeClase` y `ataqueDeConjuro` las añade esta tarea), o un rechazo.

const RE_NIVEL_DE_ESPACIO = /^@item\.level$/;
const RE_LANZAMIENTO = /^@mod$/;
const RE_MODIFICADOR = /^@abilities\.([a-z]{3})\.mod$/;
const RE_NIVEL_DE_CLASE = /^@classes\.([a-z-]+)\.levels$/;
const RE_ESCALA = /^@scale\.([a-z-]+)\.([a-z-]+)$/;
const RE_FIJO = /^-?\d+$/;

/**
 * `origenDe(formula)` — pura. Devuelve `{ origen: Origen }` o `{ rechazo: string }`, nunca lanza:
 * un rechazo es un resultado esperado, no una excepción (el conversor los cuenta y los lista en
 * `rechazos.md`, no aborta al primero).
 */
export function origenDe(formula) {
  const f = typeof formula === "string" ? formula.trim() : formula;

  if (f === "" || f === undefined || f === null) {
    return { rechazo: `Fórmula vacía o ausente: no hay nada que traducir.` };
  }

  if (RE_FIJO.test(f)) {
    return { origen: { tipo: "fijo", valor: Number.parseInt(f, 10) } };
  }

  if (RE_LANZAMIENTO.test(f)) {
    return { origen: { tipo: "lanzamiento" } };
  }

  if (RE_NIVEL_DE_ESPACIO.test(f)) {
    return { origen: { tipo: "nivelDeEspacio" } };
  }

  const modificador = f.match(RE_MODIFICADOR);
  if (modificador) {
    return { origen: { tipo: "modificador", ability: modificador[1] } };
  }

  const nivelDeClase = f.match(RE_NIVEL_DE_CLASE);
  if (nivelDeClase) {
    return { origen: { tipo: "nivelDeClase", clase: nivelDeClase[1] } };
  }

  const escala = f.match(RE_ESCALA);
  if (escala) {
    return { origen: { tipo: "escala", clave: `${escala[1]}-${escala[2]}` } };
  }

  return {
    rechazo: `Fórmula "${f}" no encaja en ninguna de las nueve formas de Origen — se rechaza en voz alta en vez de forzarla.`,
  };
}
