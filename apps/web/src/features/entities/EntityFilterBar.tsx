import type { EntityFilterValue } from "./filter";

// Controlled component: EntityTab (CampaignDetailPage.tsx) owns the filter state and passes
// it down, so switching entity type or resetting the tab is a single source of truth. See
// filter.ts for why this filter can never be treated as access control.
export function EntityFilterBar({
  availableTags,
  value,
  onChange,
  totalCount,
  visibleCount,
}: {
  // Tags present in the currently loaded list (already deduped and sorted by the caller) —
  // per entity type, not the whole campaign, since that's what's loaded per tab.
  availableTags: string[];
  value: EntityFilterValue;
  onChange: (next: EntityFilterValue) => void;
  totalCount: number;
  visibleCount: number;
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
    <div className="mb-3 space-y-2">
      <div>
        <label htmlFor="entity-search" className="block text-sm">
          Buscar
        </label>
        <input
          id="entity-search"
          type="search"
          value={value.query}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
          className="w-full max-w-xs rounded bg-slate-700 p-2 text-sm"
        />
      </div>
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {availableTags.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={value.tags.includes(tag)}
              onClick={() => toggleTag(tag)}
              className="rounded bg-slate-700 px-2 py-0.5 text-xs aria-pressed:bg-indigo-600"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      {hasActiveFilter && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{`${visibleCount} de ${totalCount}`}</span>
          <button type="button" onClick={clearFilters} className="text-indigo-400 underline">
            Quitar filtros
          </button>
        </div>
      )}
    </div>
  );
}
