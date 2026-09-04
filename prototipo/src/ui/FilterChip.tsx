// Estrato: ninguno — primitiva reutilizable.
import type { ReactNode } from "react";

export function FilterChip({
  activo,
  onClick,
  children,
  icono,
}: {
  activo: boolean;
  onClick: () => void;
  children: ReactNode;
  icono?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={activo}
      className={`inline-flex items-center gap-s1 rounded-radius-sm border px-s3 py-s1 font-chrome text-chrome-sm transition-colors ${
        activo
          ? "border-copper bg-copper/15 text-copper-text"
          : "border-muted/30 text-muted hover:text-text hover:border-muted/60"
      }`}
    >
      {icono && <span className="[&>svg]:size-4">{icono}</span>}
      {children}
    </button>
  );
}
