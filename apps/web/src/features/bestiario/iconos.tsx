type Props = { className?: string };

// Fase 2D — iconos **dibujados**, no glifos de fuente. Regla vinculante desde el reseño del
// 2026-09-02: un emoji cambia de dibujo en cada sistema operativo y no hereda el color del texto.

/**
 * La garra del bestiario: tres uñas.
 *
 * Es lo que distingue esta sección de «Catálogo» —que lleva una bolsa— en una columna donde las
 * dos van seguidas, que es exactamente el orden que tiene el prototipo.
 */
export function IconoBestiario({ className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 3c-.6 2.4-.7 4.6-.3 6.6" />
      <path d="M12 2.4c-.4 2.6-.4 4.9 0 6.9" />
      <path d="M17 3c.6 2.4.7 4.6.3 6.6" />
      <path d="M5.5 9.5c1.6-1 3.6-1.5 6.5-1.5s4.9.5 6.5 1.5c1.3.8 1.8 2.3 1.2 3.7l-1.6 3.8A5 5 0 0 1 13.5 20h-3a5 5 0 0 1-4.6-3l-1.6-3.8c-.6-1.4-.1-2.9 1.2-3.7Z" />
    </svg>
  );
}

/** El escudo del botón que baja una criatura a la mesa, igual que en el prototipo. */
export function IconoEscudo({ className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 5 5.8v5.4c0 4 2.8 7.6 7 9.1 4.2-1.5 7-5.1 7-9.1V5.8L12 3Z" />
    </svg>
  );
}
