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
export function filterEntities<T extends FilterableEntity>(
  entities: T[],
  filter: EntityFilterValue,
): T[] {
  const query = filter.query.trim().toLocaleLowerCase("es");
  return entities.filter((entity) => {
    const matchesQuery = query === "" || entity.name.toLocaleLowerCase("es").includes(query);
    const matchesTags = filter.tags.every((tag) => entity.tags.includes(tag));
    return matchesQuery && matchesTags;
  });
}
