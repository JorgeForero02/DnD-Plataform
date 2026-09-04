// Estrato: ninguno — primitiva reutilizable.
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variante = "accent" | "copper" | "danger" | "fantasma" | "silencio";
type Tamano = "sm" | "base" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  tamano?: Tamano;
  icono?: ReactNode;
  children?: ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-s2 font-chrome font-medium " +
  "rounded-radius-sm transition-colors select-none disabled:opacity-40 disabled:cursor-not-allowed";

const variantes: Record<Variante, string> = {
  // El azul es acción: SOLO significa «puedes pulsar esto».
  accent:
    "bg-accent text-bg hover:brightness-110 border border-accent",
  copper:
    "border border-copper text-copper-text hover:bg-copper/15",
  danger:
    "border border-danger text-danger-text hover:bg-danger/15",
  fantasma:
    "border border-muted/40 text-text hover:border-accent hover:text-accent-text",
  silencio:
    "text-muted hover:text-text",
};

const tamanos: Record<Tamano, string> = {
  sm: "text-chrome-xs px-s2 py-s1",
  base: "text-chrome-sm px-s3 py-s2",
  lg: "text-chrome-base px-s4 py-s2",
};

export function Button({
  variante = "fantasma",
  tamano = "base",
  icono,
  children,
  className = "",
  ...rest
}: Props) {
  return (
    <button
      className={`${base} ${variantes[variante]} ${tamanos[tamano]} ${className}`}
      {...rest}
    >
      {icono && <span className="shrink-0 [&>svg]:size-[1.15em]">{icono}</span>}
      {children}
    </button>
  );
}
