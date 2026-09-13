// La punta que dice «esto se abre», dibujada como todos los iconos (regla de
// `docs/04-convenciones.md`). La usan el desglose y los desplegables del editor de hilos: una
// sola silueta para un solo significado. Plegado apunta a la derecha; desplegado, hacia abajo.
export function Punta({ abierta }: { abierta: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={["h-[1em] w-[1em] shrink-0 transition-transform", abierta ? "rotate-90" : ""].join(
        " ",
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}
