// Estrato: ninguno — primitiva reutilizable.
import type { ReactNode } from "react";

type Tono = "accent" | "copper" | "danger" | "warning" | "muted";

const tonos: Record<Tono, string> = {
  accent: "text-accent-text border-accent/50 bg-accent/10",
  copper: "text-copper-text border-copper/50 bg-copper/10",
  danger: "text-danger-text border-danger/50 bg-danger/10",
  warning: "text-warning-text border-warning/50 bg-warning/10",
  muted: "text-muted border-muted/40 bg-muted/10",
};

export function Badge({
  children,
  tono = "muted",
  icono,
  className = "",
}: {
  children: ReactNode;
  tono?: Tono;
  icono?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-s1 rounded-radius-sm border px-s2 py-[1px] font-chrome text-chrome-xs ${tonos[tono]} ${className}`}
    >
      {icono && <span className="[&>svg]:size-[0.95em]">{icono}</span>}
      {children}
    </span>
  );
}
