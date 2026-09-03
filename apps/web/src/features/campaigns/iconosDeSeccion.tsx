// **Los dos iconos de «La mesa».**
//
// Los siete del mundo viven en `features/entities/iconos.tsx`, junto al resto de lo que
// distingue un tipo de otro. Estos dos no son tipos de ficha, así que no caben ahí: sesiones y
// personajes son la otra mitad de la pantalla de campaña. Dibujados, en trazo y heredando
// `currentColor`, como exige la regla de interfaz — y `aria-hidden`, porque el rótulo de la
// sección ya está escrito al lado.

interface Props {
  className?: string;
}

const TRAZO = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Sesiones: el reloj. Lo que define una sesión es cuándo ocurre. */
export function IconoSesiones({ className = "" }: Props) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={["h-[1em] w-[1em] shrink-0", className].join(" ")}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="8.5" {...TRAZO} />
      <path d="M12 6.8V12l3.4 2.2" {...TRAZO} />
    </svg>
  );
}

/** Personajes: dos figuras. Una sola sería un PNJ; la mesa son varios. */
export function IconoPersonajes({ className = "" }: Props) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={["h-[1em] w-[1em] shrink-0", className].join(" ")}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="9.2" cy="8.4" r="3.2" {...TRAZO} />
      <path d="M3 20c0-3.3 2.8-5.5 6.2-5.5s6.2 2.2 6.2 5.5" {...TRAZO} />
      <path d="M16.2 5.6a3.2 3.2 0 0 1 0 5.7" {...TRAZO} />
      <path d="M17.4 14.9c2.2.6 3.6 2.4 3.6 5.1" {...TRAZO} />
    </svg>
  );
}
