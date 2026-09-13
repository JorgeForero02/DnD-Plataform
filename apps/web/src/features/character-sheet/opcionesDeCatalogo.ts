import type { Catalog } from "./api";

// Tarea 24 (cerrar fichas, tanda 2026-09-11) — el catálogo → opciones de selector se escribía en
// `IdentidadEditable.tsx` y en ningún otro sitio: la única vez que hacía falta era editando una
// hoja ya creada. `CharacterEditor.tsx` (el diálogo de creación) pedía raza y clase como texto
// libre en vez de tirar del mismo catálogo, así que la creación y la edición podían nombrar cosas
// distintas para lo mismo. Esto saca esa conversión — catálogo a `{valor, texto}` — a un módulo
// propio para que las dos la compartan: **una sola vez por dominio**, la misma regla que ya se
// aplica al vocabulario legible (`vocabulario.ts`).

/** Una opción de selector: la clave que se guarda y el nombre del catálogo que se lee. */
export interface OpcionDeCatalogo {
  valor: string;
  texto: string;
}

// Reglas de la mesa (Task 6, D-CF-53) — `permitidos` filtra el catálogo por lo que el DM dejó
// elegir (`TableRules.permitidos`, `packages/shared/src/table-rules.schema.ts`). **La lista
// vacía deja todo**, la misma semántica que ya usa el servidor al validar `race`/`class` en el
// `PATCH .../sheet`: una campaña sin reglas propias no pierde ninguna opción por el camino.

export function opcionesDeRaza(
  catalogo: Catalog | undefined,
  permitidos: readonly string[] = [],
): OpcionDeCatalogo[] {
  const todas = (catalogo?.races ?? []).map((r) => ({ valor: r.key, texto: r.name }));
  return permitidos.length === 0 ? todas : todas.filter((o) => permitidos.includes(o.valor));
}

export function opcionesDeSubraza(
  catalogo: Catalog | undefined,
  raceKey: string | null | undefined,
): OpcionDeCatalogo[] {
  // Sin filtro a propósito: `TableRules.permitidos` no trae una lista de subrazas, solo de
  // subclases — el DM no acota subrazas.
  return (catalogo?.races.find((r) => r.key === raceKey)?.subraces ?? []).map((s) => ({
    valor: s.key,
    texto: s.name,
  }));
}

export function opcionesDeClase(
  catalogo: Catalog | undefined,
  permitidos: readonly string[] = [],
): OpcionDeCatalogo[] {
  const todas = (catalogo?.classes ?? []).map((c) => ({ valor: c.key, texto: c.name }));
  return permitidos.length === 0 ? todas : todas.filter((o) => permitidos.includes(o.valor));
}
