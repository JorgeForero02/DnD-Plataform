// Pure filtering logic for the entity list, kept out of EntityFilterBar.tsx so that
// component file keeps exactly one export (same reasoning as body.ts) and so this function
// can be unit-tested without mounting anything.
//
// IMPORTANT: this filter runs entirely on the client, over a list the server already
// filtered by `canView` (apps/api/src/common/visibility.ts). It can only ever REMOVE rows
// from what the viewer was already allowed to see — narrowing a list the viewer has the
// right to see is not the same thing as deciding what they may see. It must never be
// treated as, or extended into, an access control decision: that is `canView`'s job alone,
// and it runs on the server.
export interface EntityFilterValue {
  query: string;
  tags: string[];
}

export interface FilterableEntity {
  name: string;
  tags: string[];
}

// Several tags selected is a logical AND: the entity must carry every selected tag. That's
// the reading that makes sense for narrowing down a tagged list ("show me everything tagged
// Barovia AND villain"), not an OR that would only ever widen it back out.
/**
 * **Desde la ficha U3 (2026-09-06) esto ya NO filtra por texto: solo por etiquetas.**
 *
 * El texto lo busca el servidor, porque tiene que mirar **dentro del cuerpo** —una ficha que dice
 * «la puerta de sal» en su tercer párrafo era inencontrable— y porque el resultado tiene que pasar
 * por `canView` **antes** que por el texto. Dejar aquí una segunda comparación del nombre habría
 * sido peor que inútil: dos filtros para lo mismo, con el de aquí ignorando el cuerpo, y el día que
 * discreparan ganaría el que menos sabe.
 *
 * Las etiquetas **sí se quedan**: se pintan como botones sobre la lista que ya está en pantalla,
 * no hacen falta más filas para resolverlas, y no tienen el problema del cuerpo.
 */
export function filterEntities<T extends FilterableEntity>(
  entities: T[],
  filter: EntityFilterValue,
): T[] {
  return entities.filter((entity) => filter.tags.every((tag) => entity.tags.includes(tag)));
}
