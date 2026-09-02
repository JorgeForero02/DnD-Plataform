import type { ReactNode } from "react";
import type { EntityFilterValue } from "./filter";
import { fieldControlClass } from "../../ui/Field";
import { Toolbar, FilterChip } from "../../ui/Collection";

// Controlled component: EntityTab (CampaignDetailPage.tsx) owns the filter state and passes
// it down, so switching entity type or resetting the tab is a single source of truth. See
// filter.ts for why this filter can never be treated as access control.
//
// Reseño 2026-09-02 — audit C3. The controls used to float separately down the page: a
// "Nuevo" button that never said new WHAT, then a search box with its label stacked above it,
// then the tags as plain buttons with no visible pressed state at all — so you could not tell
// what was filtering. They are one instrument now, and the action that creates lives in it
// rather than above it.
export function EntityFilterBar({
  availableTags,
  value,
  onChange,
  totalCount,
  visibleCount,
  action,
}: {
  // Tags present in the currently loaded list (already deduped and sorted by the caller) —
  // per entity type, not the whole campaign, since that's what's loaded per tab.
  availableTags: string[];
  value: EntityFilterValue;
  onChange: (next: EntityFilterValue) => void;
  totalCount: number;
  visibleCount: number;
  action?: ReactNode;
}) {
  const hasActiveFilter = value.query.trim() !== "" || value.tags.length > 0;

  const toggleTag = (tag: string) => {
    onChange({
      ...value,
      tags: value.tags.includes(tag) ? value.tags.filter((t) => t !== tag) : [...value.tags, tag],
    });
  };

  const clearFilters = () => onChange({ query: "", tags: [] });

  return (
    <Toolbar
      action={action}
      search={
        <>
          {/* The label is visually hidden rather than removed: a placeholder is not a label,
              and a search box with neither is unusable with a screen reader. */}
          <label htmlFor="entity-search" className="sr-only">
            Buscar
          </label>
          <input
            id="entity-search"
            type="search"
            value={value.query}
            placeholder="Buscar por nombre…"
            onChange={(e) => onChange({ ...value, query: e.target.value })}
            className={fieldControlClass}
          />
        </>
      }
      count={
        hasActiveFilter ? (
          <span className="flex items-center gap-s2">
            <span>{`${visibleCount} de ${totalCount}`}</span>
            <button
              type="button"
              onClick={clearFilters}
              className="font-chrome text-accent-text underline"
            >
              Quitar filtros
            </button>
          </span>
        ) : (
          // "2" suelto junto al buscador no dice de qué. Con la palabra, sí — y en singular
          // cuando toca, que es la diferencia entre una interfaz escrita y una generada.
          `${totalCount} ${totalCount === 1 ? "ficha" : "fichas"}`
        )
      }
      filters={
        availableTags.length > 0 ? (
          <>
            <span className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
              Etiquetas
            </span>
            {availableTags.map((tag) => (
              <FilterChip
                key={tag}
                active={value.tags.includes(tag)}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </FilterChip>
            ))}
          </>
        ) : undefined
      }
    />
  );
}
