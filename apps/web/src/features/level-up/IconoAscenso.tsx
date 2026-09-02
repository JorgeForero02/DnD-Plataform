// Tarea 2A.11 — el icono se dibuja (docs/04-convenciones.md). Ni «▲», ni «⬆», ni emoji: un
// glifo de fuente se pinta a todo color en unos sistemas y como un cuadrado vacío en otros.
// Trazo que hereda `currentColor`, así que vale igual en un botón primario que en uno secundario
// y en los dos temas.

export function IconoAscenso({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Tres peldaños ascendentes y la punta que los remata: un ascenso, no una flecha de
          navegación. */}
      <path d="M2 13h4V9" />
      <path d="M6 9h4V5" />
      <path d="M10 5h4" />
      <path d="M11.5 2.5 14 5l-2.5 2.5" />
    </svg>
  );
}
