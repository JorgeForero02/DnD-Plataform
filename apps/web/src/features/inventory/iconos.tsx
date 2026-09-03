// Carril B1 — los iconos propios del inventario.
//
// **Los iconos se dibujan** (docs/04-convenciones.md): SVG en trazo, heredando `currentColor`,
// sin relleno propio, siempre `aria-hidden` porque el significado lo lleva el texto de al lado.
// Mismo patrón que `features/rules/iconos.tsx` y `features/sessions/iconos.tsx`.

interface IconoProps {
  className?: string;
}

function Marco({ children, className = "" }: IconoProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={["inline-block shrink-0", className].join(" ")}
    >
      {children}
    </svg>
  );
}

/** Equipado: el escudo — lo que llevas puesto y afecta a los números. */
export function IconoEquipado({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <path d="M8 1.5 13.5 3.5V7c0 4-2.5 6.5-5.5 7.5C5 13.5 2.5 11 2.5 7V3.5Z" />
    </Marco>
  );
}

/** Encima: la mochila. */
export function IconoMochila({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <path d="M5 6V4a3 3 0 0 1 6 0v2" />
      <rect x="3" y="6" width="10" height="8.5" rx="1.5" />
      <path d="M6 9.5h4" />
    </Marco>
  );
}

/** Guardado: el cofre — en otro sitio, no encima. */
export function IconoGuardado({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <rect x="2" y="6.5" width="12" height="7" rx="1" />
      <path d="M2 9.5h12" />
      <path d="M6.5 6.5v-1a1.5 1.5 0 0 1 3 0v1" />
    </Marco>
  );
}

/** La fila de un objeto suelto — lo mismo que la mochila, más pequeño y sin correas visibles. */
export function IconoObjeto({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <path d="M4.5 6 5.5 3h5l1 3" />
      <rect x="3" y="6" width="10" height="7.5" rx="1.2" />
    </Marco>
  );
}

/** Una moneda — el círculo con su marca central. */
export function IconoMoneda({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5.3v5.4M6.3 6.6c0-.7.8-1.1 1.7-1.1s1.7.4 1.7 1c0 1.5-3.4.9-3.4 2.4 0 .6.8 1 1.7 1s1.7-.4 1.7-1.1" />
    </Marco>
  );
}

/** Buscar: la lupa, para el selector de objeto (carril B4). */
export function IconoBuscar({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.3 10.3 14 14" />
    </Marco>
  );
}

/** Añadir: el más, para el botón que mete el objeto elegido en la mochila (carril B4). */
export function IconoAnadir({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <path d="M8 3v10M3 8h10" />
    </Marco>
  );
}

/** La balanza de la carga: dos platillos. */
export function IconoCarga({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <path d="M8 2v11" />
      <path d="M3 5h10" />
      <path d="M3 5 1.5 8.5a1.75 1.75 0 0 0 3.5 0Z" />
      <path d="M13 5l-1.5 3.5a1.75 1.75 0 0 0 3.5 0Z" />
      <path d="M5.5 13.5h5" />
    </Marco>
  );
}
