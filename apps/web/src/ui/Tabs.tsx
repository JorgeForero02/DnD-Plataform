import { useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  /** Uncontrolled by default (first item active); pass both to control it from outside. */
  active?: string;
  onChange?: (id: string) => void;
}

// Task 1.19 — WAI-ARIA tabs pattern: one tab is Tab-reachable at a time (roving tabindex),
// Left/Right (and Home/End) move focus AND selection between tabs, matching the "automatic
// activation" variant of the pattern. Tabs.test.tsx exercises ArrowRight/ArrowLeft/Home/End;
// revert the roving-tabindex/onKeyDown wiring below and those assertions fail while a mouse
// click on each tab still works.
export function Tabs({ items, active: controlledActive, onChange }: TabsProps) {
  const [uncontrolledActive, setUncontrolledActive] = useState(items[0]?.id);
  const active = controlledActive ?? uncontrolledActive;
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function select(id: string) {
    setUncontrolledActive(id);
    onChange?.(id);
  }

  function focusAndSelect(id: string) {
    select(id);
    tabRefs.current[id]?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") nextIndex = (index + 1) % items.length;
    else if (e.key === "ArrowLeft") nextIndex = (index - 1 + items.length) % items.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = items.length - 1;

    if (nextIndex !== null) {
      e.preventDefault();
      focusAndSelect(items[nextIndex].id);
    }
  }

  const activeItem = items.find((item) => item.id === active);

  return (
    <div>
      {/* Fix round 1 (post-1.19b review): flex-wrap restored. The old hand-rolled strip
          CampaignDetailPage.tsx replaced with this primitive was `flex flex-wrap gap-2`; this
          tablist had silently dropped the wrap, and with no overflow-x either, a 10-item strip
          (CampaignDetailPage's real tab count) could push past a narrow container instead of
          wrapping the way its predecessor did. Roles, key handling and the primitive's own
          tests are unaffected — this is layout only. */}
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-muted">
        {items.map((item, index) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              ref={(el) => {
                tabRefs.current[item.id] = el;
              }}
              role="tab"
              type="button"
              id={`tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${item.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => select(item.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={[
                "border-b-2 px-3 py-1.5 font-chrome text-chrome-sm font-semibold",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                // border-accent (3:1, graphical) stays as-is; the label text uses
                // --accent-text — fix round 1, Critical 2: plain --accent text is only 4.5:1+
                // against --bg, and drops under it against --surface (4.26:1 dark). --accent-text
                // clears every dark surface (see tokens.css).
                isActive
                  ? "border-accent text-accent-text"
                  : "border-transparent text-muted hover:text-text",
              ].join(" ")}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {activeItem && (
        <div
          role="tabpanel"
          id={`tabpanel-${activeItem.id}`}
          aria-labelledby={`tab-${activeItem.id}`}
          tabIndex={0}
          className="pt-3"
        >
          {activeItem.content}
        </div>
      )}
    </div>
  );
}
