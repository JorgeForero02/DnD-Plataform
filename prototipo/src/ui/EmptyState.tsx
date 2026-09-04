// Estrato: ninguno — primitiva reutilizable.
import type { ReactNode } from "react";

export function EmptyState({
  icono,
  titulo,
  children,
}: {
  icono?: ReactNode;
  titulo: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-s2 px-s4 py-s8 text-center">
      {icono && <span className="text-muted/60 [&>svg]:size-8">{icono}</span>}
      <p className="font-title text-chrome-md text-text">{titulo}</p>
      {children && <p className="max-w-[28ch] font-chrome text-chrome-sm text-muted">{children}</p>}
    </div>
  );
}
