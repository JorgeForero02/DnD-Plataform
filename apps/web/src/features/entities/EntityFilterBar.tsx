import type { EntityFilterValue } from "./filter";
import { Field, fieldControlClass } from "../../ui/Field";

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
      <div className="max-w-xs">
        <Field label="Buscar">
          <input
            id="entity-search"
            type="search"
            value={value.query}
            onChange={(e) => onChange({ ...value, query: e.target.value })}
            className={fieldControlClass}
          />
        </Field>
      </div>
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {availableTags.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={value.tags.includes(tag)}
              onClick={() => toggleTag(tag)}
              className="rounded-radius-sm border border-muted bg-surface px-2 py-0.5 text-chrome-xs text-text aria-pressed:border-accent aria-pressed:bg-bg aria-pressed:text-accent-text"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      {hasActiveFilter && (
        <div className="flex items-center gap-2 text-chrome-xs text-muted">
          <span>{`${visibleCount} de ${totalCount}`}</span>
          <button type="button" onClick={clearFilters} className="text-accent-text underline">
            Quitar filtros
          </button>
        </div>
      )}
    </div>
  );
}
