// Tarea 2A.17 — los iconos de la pantalla de reglas.
//
// **Los iconos se dibujan** (docs/04-convenciones.md): nada de `⚡`, `✓` ni emoji. Un glifo de
// fuente se pinta a todo color en unos sistemas y como un cuadrado vacío en otros. Estos son
// SVG en trazo, heredando `currentColor`, sin relleno propio, y siempre `aria-hidden`: el
// significado lo lleva el texto que los acompaña, nunca el dibujo.

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

/** Armada: el percutor tenso — un arco cargado con su cuerda. */
export function IconoArmada({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <path d="M3 2c6 1 9 5 10 12" />
      <path d="M3 2l10 12" />
      <circle cx="3" cy="2" r="1" />
    </Marco>
  );
}

/** Desarmada: el mismo arco, con la cuerda suelta. */
export function IconoDesarmada({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <path d="M3 2c6 1 9 5 10 12" />
      <path d="M3 6h10" />
    </Marco>
  );
}

/** Rota: el aviso, un triángulo con su marca. */
export function IconoRota({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <path d="M8 2L15 14H1z" />
      <path d="M8 6.5v3.5" />
      <path d="M8 12h.01" />
    </Marco>
  );
}

/** Ensayo en seco: la lupa — mirar sin tocar. */
export function IconoEnsayo({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14.5 14.5" />
    </Marco>
  );
}

/** Propuesta pendiente: la campana que espera respuesta. */
export function IconoPropuesta({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <path d="M4 7a4 4 0 018 0c0 3 1 4 1 4H3s1-1 1-4z" />
      <path d="M6.5 13.5a1.7 1.7 0 003 0" />
    </Marco>
  );
}

/** Traza: la línea de tiempo con sus nudos. */
export function IconoTraza({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <path d="M2 8h12" />
      <circle cx="4.5" cy="8" r="1.6" />
      <circle cx="11.5" cy="8" r="1.6" />
    </Marco>
  );
}

/** Encadenamiento: dos eslabones. */
export function IconoCadena({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <path d="M6.5 9.5a2.5 2.5 0 010-3.5l1.5-1.5a2.5 2.5 0 013.5 3.5l-.7.7" />
      <path d="M9.5 6.5a2.5 2.5 0 010 3.5L8 11.5a2.5 2.5 0 01-3.5-3.5l.7-.7" />
    </Marco>
  );
}
