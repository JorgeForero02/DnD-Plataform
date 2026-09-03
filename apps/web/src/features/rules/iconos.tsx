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

// --- Tarea R1/R4 — la forma dice de qué parte es la pieza -------------------------------------
//
// El dibujo repite lo que ya dicen la silueta, el color y la palabra de la caja. Es redundancia
// a propósito: el color solo nunca puede ser la única señal, y la silueta se pierde cuando la
// caja se estrecha en un móvil.

/** Suceso: el instante. Una chispa — llega, pasa y ya no está. */
export function IconoSuceso({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <path d="M9 1.5L4 8.5h3.5L7 14.5l5-7H8.5z" />
    </Marco>
  );
}

/** Estado: la comprobación. Un rombo con su marca — es verdad o no lo es. */
export function IconoEstado({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <path d="M8 1.5L14.5 8 8 14.5 1.5 8z" />
      <path d="M5.5 8l1.8 1.8L10.5 6.5" />
    </Marco>
  );
}

/** Acción: lo que escribe. Una punta que empuja contra un muro. */
export function IconoAccion({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <path d="M1.5 8h8" />
      <path d="M6.5 5l3 3-3 3" />
      <path d="M13 2.5v11" />
    </Marco>
  );
}

/** Agarre: las seis marcas de «esto se arrastra». */
export function IconoAgarre({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <circle cx="6" cy="3.5" r="0.9" />
      <circle cx="10" cy="3.5" r="0.9" />
      <circle cx="6" cy="8" r="0.9" />
      <circle cx="10" cy="8" r="0.9" />
      <circle cx="6" cy="12.5" r="0.9" />
      <circle cx="10" cy="12.5" r="0.9" />
    </Marco>
  );
}

/** Ranura vacía: el hueco de puntos donde cae una caja. */
export function IconoRanura({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <rect x="1.5" y="4" width="13" height="8" rx="1.5" strokeDasharray="2.5 2" />
    </Marco>
  );
}

// --- Tareas F5 y F6 — los avisos, la guía y las plantillas ------------------------------------
//
// Mismas reglas: SVG en trazo, `currentColor`, `aria-hidden`. Ningún aviso depende del dibujo
// para entenderse — el dibujo acompaña al título, que ya dice de qué clase es.

/** Reversión ausente: la flecha que vuelve sobre sus pasos. */
export function IconoReversion({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <path d="M3 7.5A5 5 0 118 13" />
      <path d="M1 5l2 2.5L5.5 5.5" />
    </Marco>
  );
}

/** Conflicto de prioridad: dos barras que compiten, una más larga que la otra. */
export function IconoPrioridad({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <path d="M2.5 5h11" />
      <path d="M2.5 11h6" />
      <path d="M12 9.5l2 1.5-2 1.5" />
    </Marco>
  );
}

/** Bucle: el lazo que vuelve a entrar por donde salió. */
export function IconoBucle({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <path d="M8 3.5a4.5 4.5 0 104.5 4.5" />
      <path d="M12.5 8V4.5" />
      <path d="M6 1.8L8 3.5 6 5.2" />
    </Marco>
  );
}

/** Guía: la marca que señala lo siguiente que hay que hacer. */
export function IconoGuia({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <path d="M4 14V2.5" />
      <path d="M4 3h8l-2 2.5L12 8H4z" />
    </Marco>
  );
}

/** Plantilla: dos hojas, una sobre otra — copiar antes que escribir. */
export function IconoPlantilla({ className }: IconoProps) {
  return (
    <Marco className={className}>
      <rect x="2" y="2" width="8" height="10" rx="1" />
      <path d="M6 14h6a1 1 0 001-1V5" />
    </Marco>
  );
}
