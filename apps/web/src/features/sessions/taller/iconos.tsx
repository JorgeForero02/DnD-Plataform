// Los sellos que el taller necesita y todavía no existen en ningún sitio común.
//
// La auditoría del 2026-09-04 los contó: **4 iconos en la aplicación contra 23 en la maqueta**.
// La capa visual (carril de `ui/`) va a absorber estos dibujos cuando exista el juego completo;
// mientras tanto viven aquí dentro, que es la carpeta de este carril, y no en `ui/Iconos.tsx`,
// que es de otro. **Cuando la capa visual los publique, este fichero desaparece y los imports
// pasan a apuntar allí.**
//
// Reglas que cumplen todos: trazo sobre `currentColor` —nunca un glifo de fuente ni un emoji,
// que es regla vinculante de `docs/04-convenciones.md`—, `aria-hidden` porque el rótulo de al
// lado ya dice lo que son, y medida en `1em` para que escalen con la línea de texto.

type Props = { className?: string };

const base = (className?: string) => ({
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: className ?? "h-[1em] w-[1em] shrink-0",
});

/** Escribir: la pluma. */
export function IconoPluma({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M3 21c1.2-4.6 3.4-8 6.6-10.2C12.8 8.6 16 7.7 19.4 7.6" />
      <path d="M20.6 3.4c.6 3.7-.2 6.7-2.4 9-2.2 2.3-5 3.2-8.4 2.8-.4-3.4.5-6.2 2.8-8.4 2.3-2.2 5.3-3 8-3.4Z" />
    </svg>
  );
}

/** Preparar: el reloj de la sesión que viene. */
export function IconoReloj({ className }: Props) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.3l3.3 2" />
    </svg>
  );
}

/** Lo que la mesa ve: el ojo abierto. */
export function IconoOjo({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

/** Lo que sigue oculto: el mismo ojo, tachado. */
export function IconoOjoTachado({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M4 15.2C2.9 14 2.5 12 2.5 12S6 5.8 12 5.8c1.2 0 2.3.2 3.2.6" />
      <path d="M19 8.6c1.7 1.6 2.5 3.4 2.5 3.4s-3.5 6.2-9.5 6.2c-1.6 0-3-.4-4.2-1" />
      <path d="M3.5 3.5l17 17" />
    </svg>
  );
}

/** Enseñar a la mesa: el pregón. */
export function IconoMegafono({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M4 9.5v5a1.5 1.5 0 0 0 1.5 1.5H8l6.5 4V4L8 8H5.5A1.5 1.5 0 0 0 4 9.5Z" />
      <path d="M18 9.2a4.2 4.2 0 0 1 0 5.6" />
    </svg>
  );
}

/** Las tiradas que se van a pedir: el d20, de perfil. */
export function IconoD20({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M12 2.6 20.4 7.3v9.4L12 21.4 3.6 16.7V7.3Z" />
      <path d="M12 2.6 7.4 12h9.2Z" />
      <path d="M7.4 12 12 21.4 16.6 12" />
    </svg>
  );
}

/** El mundo, para la escena que abre la sesión. */
export function IconoMundo({ className }: Props) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.2 2.4 3.3 5.2 3.3 8.5S14.2 18.1 12 20.5c-2.2-2.4-3.3-5.2-3.3-8.5S9.8 5.9 12 3.5Z" />
    </svg>
  );
}
