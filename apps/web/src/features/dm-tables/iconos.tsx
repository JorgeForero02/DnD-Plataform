// Tarea 2C.6 — los dibujos de esta sección. **Nada de emoji ni glifos de fuente** (regla
// vinculante de `docs/04-convenciones.md`): un glifo se pinta a todo color en unos sistemas y como
// un cuadrado vacío en otros. Trazo, `currentColor`, `aria-hidden` — el nombre va siempre en el
// texto que acompaña, así que el dibujo no tiene nada que anunciarle a un lector de pantalla.

type Props = { className?: string };

const base = (className?: string) => ({
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: className ?? "h-5 w-5",
});

/** Una tabla: una rejilla con su columna de rangos a la izquierda. */
export function IconoTabla({ className }: Props) {
  return (
    <svg {...base(className)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M9 9v11" />
    </svg>
  );
}

/** Tirar: un dado de veinte caras, a medio trazo. */
export function IconoTirar({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z" />
      <path d="M12 2.5 7 12l5 9.5M12 2.5l5 9.5-5 9.5M7 12h10" />
    </svg>
  );
}

/** Editar: una plumilla sobre el filo que va corrigiendo. */
export function IconoEditar({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5z" />
      <path d="M13.5 7 17 10.5" />
    </svg>
  );
}

/**
 * Entrega: un saco atado, que es lo que una fila de botín deja caer.
 *
 * Dibujado y no un glifo, por la misma razón que los tres de arriba — y aquí importa el doble:
 * este icono va dentro de un botón que ya dice en palabras si la fila entrega algo, así que si el
 * dibujo no se pinta no se pierde ninguna información.
 */
export function IconoEntrega({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M9 3.5h6l-1.2 3H10.2z" />
      <path d="M10.2 6.5c-3 1.6-4.7 4.2-4.7 7.4 0 4 2.9 6.6 6.5 6.6s6.5-2.6 6.5-6.6c0-3.2-1.7-5.8-4.7-7.4" />
    </svg>
  );
}
