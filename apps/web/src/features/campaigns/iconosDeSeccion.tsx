// **Los iconos de «La mesa», y el signo de más.**
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

// **El signo de más, dibujado.** Vivía en `CampaignList.tsx` como el carácter «＋» de ancho
// completo, que es exactamente lo que la regla de iconos prohíbe: un glifo de fuente se pinta a
// todo color en unos sistemas y como un cuadrado vacío en otros. La maqueta lo pone dentro del
// botón que crea, y ahí sigue — pero en trazo.
export function IconoMas({ className = "" }: Props) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={["h-[1em] w-[1em] shrink-0", className].join(" ")}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 5.5v13M5.5 12h13" {...TRAZO} />
    </svg>
  );
}

/**
 * Resumen: el banderín del tablero. Es la pantalla que dice dónde está la campaña.
 *
 * Las tres de aquí abajo entraron el 2026-09-03: el carril tenía icono en nueve entradas y
 * **tres iban peladas** —Resumen, Reglas y Ajustes—, así que la columna se leía con tres huecos.
 * El autor lo señaló mirando el prototipo: «todo tiene icono».
 */
export function IconoResumen({ className = "" }: Props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...TRAZO}>
      <path d="M6 21V4" />
      <path d="M6 4h11l-2.5 3.5L17 11H6" />
    </svg>
  );
}

/** Reglas: el sol de rayos, que es lo que se dispara cuando pasa algo. */
export function IconoReglas({ className = "" }: Props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...TRAZO}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
    </svg>
  );
}

/** Ajustes: el engranaje, simplificado a seis dientes para que aguante a 16 px. */
export function IconoAjustes({ className = "" }: Props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...TRAZO}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4M18.7 18.7l-1.4-1.4M6.7 6.7L5.3 5.3" />
    </svg>
  );
}
