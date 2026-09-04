// Los tres iconos que los mandos del elenco necesitan y que `ui/Iconos.tsx` todavía no tiene.
//
// **Están aquí, y es provisional a propósito.** La auditoría del 2026-09-04 (§4) cuenta *4
// iconos contra 23*: el catálogo entero es del carril de la capa visual, y cuando llegue estos
// tres se van a `ui/Iconos.tsx` y este fichero desaparece. Dibujarlos aquí es lo que permite que
// el elenco no espere a nadie; copiarlos a `ui/` sería tocar un fichero de otro carril.
//
// Los trazos salen de `prototipo/src/ui/icons.tsx` tal cual, sin reinterpretar.
// **Nada de emoji ni glifos de fuente** — regla vinculante de `docs/04-convenciones.md`.

type Props = { className?: string };

const base = (className?: string) => ({
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: className ?? "h-4 w-4",
});

/** Daño: una espada. `prototipo/src/ui/icons.tsx` — `IconEspada`. */
export function IconoEspada({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M14.5 4L20 4l0 5.5-9 9-2.5.5.5-2.5 9-9z" />
      <path d="M4 20l4-4M6.5 13.5L3 17l4 4 3.5-3.5" />
    </svg>
  );
}

/** Abrir la ficha: un ojo. `prototipo/src/ui/icons.tsx` — `IconOjo`. */
export function IconoOjo({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

/** La clase de armadura: un escudo. `prototipo/src/ui/icons.tsx` — `IconEscudo`. */
export function IconoEscudo({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    </svg>
  );
}
