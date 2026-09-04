// Los iconos que la columna del DM necesita y que todavía no viven en la casa común
// (`ui/Iconos.tsx`) ni en la de otra feature. **Dibujados, nunca un glifo de fuente**: regla
// vinculante de `docs/04-convenciones.md` — un emoji se pinta a todo color en unos sistemas, como
// un cuadrado vacío en otros, y nunca se parece al resto de la interfaz.
//
// Son los tres que la maqueta usa en `prototipo/src/features/HerramientasDeNarracion.tsx` y que
// aquí no existían: megáfono (revelar), reloj (avanzar el tiempo) y rayo (el motor de reglas).
// Los otros tres se toman prestados de donde ya estaban dibujados —el d20 de `features/rolls`, la
// bestia de `features/bestiario` y la tabla de `features/dm-tables`— porque duplicar un dibujo es
// duplicar una decisión de estilo.
//
// **La capa visual los absorberá**: cuando `ui/Iconos.tsx` crezca a los veintitrés de la maqueta,
// estos tres se mudan allí y este fichero desaparece.

type Props = { className?: string };

const base = (className?: string) => ({
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: "false" as const,
  className: className ?? "h-4 w-4",
});

/** Revelar: un megáfono. Lo que se cuenta en voz alta deja de ser secreto. */
export function IconoMegafono({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M3 10v4a1 1 0 0 0 1 1h3l6 4V5L7 9H4a1 1 0 0 0-1 1z" />
      <path d="M17 9.5a3.5 3.5 0 0 1 0 5" />
      <path d="M19.5 7a7 7 0 0 1 0 10" />
    </svg>
  );
}

/** El reloj de campaña: una esfera con sus agujas. */
export function IconoReloj({ className }: Props) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

/** El motor de reglas: un rayo. Algo pasa y algo se dispara. */
export function IconoRayo({ className }: Props) {
  return (
    <svg {...base(className)}>
      <path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z" />
    </svg>
  );
}
