// Los tres iconos que el hilo necesita y que **todavía no existen en `ui/Iconos.tsx`**.
//
// La maqueta (`prototipo/src/ui/icons.tsx`) trae veintitrés iconos dibujados; la aplicación
// real tiene cuatro. Copiarlos enteros es trabajo de la capa visual, no de este carril, y el
// fichero de iconos comunes es de otro carril en esta tanda. Así que los tres que hacen falta
// aquí —el d20 de la tirada, la flecha de «De dónde sale» y la pluma del compositor— se dibujan
// **dentro de `hilo/`**, con el mismo trazo y el mismo `viewBox` que la maqueta, para que el día
// que `ui/Iconos.tsx` los absorba sea un cambio de import y nada más.
//
// Trazo, `currentColor`, `aria-hidden`: son adorno tipográfico, no información. Lo que dicen ya
// está escrito en el texto de al lado. **Nada de emoji ni glifos de fuente** — regla vinculante
// de `docs/04-convenciones.md`.

type Props = { className?: string };

const base = (className?: string) => ({
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: className ?? "h-5 w-5",
});

/** El d20 de la tirada incrustada. Copiado de `IconD20` de la maqueta. */
export function IconoD20({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M12 3l8 5v8l-8 5-8-5V8l8-5z" />
      <path d="M12 3v18M4 8l8 5 8-5M12 3l-8 5m8-5l8 5" />
    </svg>
  );
}

/** La flecha que gira al desplegar la traza. Copiada de `IconFlechaDcha` de la maqueta. */
export function IconoFlechaDerecha({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** La pluma del compositor. Copiada de `IconPluma` de la maqueta. */
export function IconoPluma({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M20 4C10 6 6 12 5 20M20 4c-1 8-6 12-13 13M20 4l-5 1M8 15l-3 5" />
    </svg>
  );
}
