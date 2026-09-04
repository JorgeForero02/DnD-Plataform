// Los seis sellos, dibujados. **Nada de emoji ni glifos de fuente** — regla vinculante de
// `docs/04-convenciones.md`: un glifo se pinta a todo color en unos sistemas y como un cuadrado
// vacío en otros, y nunca se parece al resto de la interfaz.
//
// Trazo, `currentColor`, `aria-hidden`: el nombre del sello va en el texto del botón, así que
// el icono no tiene nada que anunciarle a un lector de pantalla.

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

/** Objeto entregado: un cofre. */
export function IconoObjeto({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M3 9.5 12 5l9 4.5v8L12 22l-9-4.5z" />
      <path d="M3 9.5 12 14l9-4.5M12 14v8" />
    </svg>
  );
}

/** PNJ conocido: una silueta. */
export function IconoPnj({ className }: Props) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

/** Decisión: una bifurcación del camino. */
export function IconoDecision({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M12 21v-7" />
      <path d="M12 14 5 7M12 14l7-7" />
      <path d="M5 7V3.5M5 7H8.5M19 7V3.5M19 7h-3.5" />
    </svg>
  );
}

/** Combate: dos espadas cruzadas. */
export function IconoCombate({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M4 4l10 10M20 4L10 14" />
      <path d="M14 14l2.5 2.5M10 14l-2.5 2.5" />
      <path d="M17 17l3 3M7 17l-3 3" />
    </svg>
  );
}

/** Hallazgo: una llave. */
export function IconoHallazgo({ className }: Props) {
  return (
    <svg {...base(className)}>
      <circle cx="8" cy="8" r="4" />
      <path d="M11 11l9 9M17 17l2-2M14.5 14.5l2-2" />
    </svg>
  );
}

/** Nota suelta: una pluma. */
export function IconoNota({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M4 20s3-9 9-13c2.5-1.6 5-2 6-2s.4 3.5-1 6c-2.6 4.6-8.5 6-8.5 6" />
      <path d="M4 20l5-5" />
    </svg>
  );
}

/** La sesión en curso: un círculo lleno, la señal de «grabando» de toda la vida. */
export function IconoEnJuego({ className }: Props) {
  return (
    <svg {...base(className ?? "h-3 w-3")} fill="currentColor" strokeWidth={0}>
      <circle cx="12" cy="12" r="6" />
    </svg>
  );
}

/**
 * Presencia en la mesa: círculo lleno si vino, hueco si no.
 *
 * Dibujado y no `●`/`○` — la excepción declarada de los glifos es solo para los cinco de
 * `ui/Badge.tsx`. La primera versión de esta pantalla los usó igualmente; la regla existe porque
 * un glifo se pinta a todo color en unos sistemas y como un cuadrado vacío en otros.
 */
export function IconoPresencia({ presente, className }: { presente: boolean; className?: string }) {
  return (
    <svg {...base(className ?? "h-2.5 w-2.5")} fill={presente ? "currentColor" : "none"}>
      <circle cx="12" cy="12" r="7" />
    </svg>
  );
}

/**
 * Puntos de golpe: un corazón a trazo.
 *
 * Va **dentro de la línea** que dice «42/58», así que se dimensiona en `1em` y no en píxeles —
 * la regla de los iconos en línea de `docs/04-convenciones.md`.
 */
export function IconoPuntosDeGolpe({ className }: Props) {
  return (
    <svg {...base(className ?? "h-[1em] w-[1em]")}>
      <path d="M12 20s-7-4.6-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6C19 15.4 12 20 12 20z" />
    </svg>
  );
}

/** El elenco: dos siluetas, porque la mesa nunca es una sola persona. */
export function IconoElenco({ className }: Props) {
  return (
    <svg {...base(className ?? "h-4 w-4")}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <path d="M16 6.2a3 3 0 0 1 0 5.6M17 14.5a6 6 0 0 1 4 4.5" />
    </svg>
  );
}

/** El registro: un pliego con renglones. Es lo que se relee seis semanas después. */
export function IconoRegistro({ className }: Props) {
  return (
    <svg {...base(className ?? "h-4 w-4")}>
      <path d="M5 3.5h11l3 3V20.5H5z" />
      <path d="M16 3.5v3h3" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" />
    </svg>
  );
}

/** Consultar el mundo: una lente. */
export function IconoBuscar({ className }: Props) {
  return (
    <svg {...base(className ?? "h-4 w-4")}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </svg>
  );
}

// B1 — los tres de la cabecera de escena. Mismo trazo y misma casa que los sellos de arriba:
// la regla vinculante no pide un único fichero, pide que estén **dibujados**, y estos solo los
// usa la mesa.

/** El lugar de la escena: un mojón sobre el terreno. */
export function IconoLugar({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M12 21s6.5-6.1 6.5-10.5a6.5 6.5 0 0 0-13 0C5.5 14.9 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.3" />
    </svg>
  );
}

/** De día. No es el conmutador de tema: dice qué hora es EN LA CAMPAÑA. */
export function IconoSol({ className }: Props) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.4M12 19v2.4M2.6 12h2.4M19 12h2.4M5.3 5.3 7 7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7" />
    </svg>
  );
}

/** De noche, por la misma razón. */
export function IconoLuna({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M20.2 14.6A8.6 8.6 0 0 1 9.4 3.8a8.6 8.6 0 1 0 10.8 10.8Z" />
    </svg>
  );
}
