// Estrato: ninguno — primitiva reutilizable.
import type { ReactNode } from "react";

export type Tab = { id: string; etiqueta: string; icono?: ReactNode };

export function Tabs({
  tabs,
  activa,
  onChange,
}: {
  tabs: Tab[];
  activa: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="tablist" className="flex items-center gap-s1 border-b border-muted/20">
      {tabs.map((t) => {
        const sel = t.id === activa;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={sel}
            onClick={() => onChange(t.id)}
            className={`-mb-px inline-flex items-center gap-s1 border-b-2 px-s3 py-s2 font-chrome text-chrome-sm transition-colors ${
              sel
                ? "border-copper text-copper-text"
                : "border-transparent text-muted hover:text-text"
            }`}
          >
            {t.icono && <span className="[&>svg]:size-4">{t.icono}</span>}
            {t.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
