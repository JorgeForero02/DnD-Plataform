// Estrato: ninguno — primitiva reutilizable.
// Superficie elevada con una regla de cobre opcional (ornamento que no compite).
import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
  reglaCobre = false,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  reglaCobre?: boolean;
  as?: "section" | "div" | "aside" | "article";
}) {
  return (
    <Tag
      className={`relative bg-surface rounded-radius-md border border-muted/20 ${className}`}
    >
      {reglaCobre && (
        <span
          aria-hidden="true"
          className="absolute inset-x-s3 top-0 h-px bg-gradient-to-r from-transparent via-copper to-transparent"
        />
      )}
      {children}
    </Tag>
  );
}

// Título con regla de cobre, para cabeceras de panel.
export function TituloPanel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-s3">
      <h3 className="font-title text-chrome-md text-text">{children}</h3>
      <span aria-hidden="true" className="h-px flex-1 bg-copper/40" />
    </div>
  );
}
