import type { ReactElement, ReactNode } from "react";
import type { ItemKind } from "@dnd/shared";

// Carril B2 — los seis tipos de objeto, dibujados. Mismo molde que `features/entities/iconos.tsx`
// y `features/rules/iconos.tsx`: la regla de interfaz (docs/04-convenciones.md) pide iconos
// dibujados y no glifos de fuente, y cada módulo grande dibuja los suyos.
//
// `currentColor` y `1em`: escalan con la línea de texto en la que van. `aria-hidden`: el nombre
// del tipo ya está escrito al lado en palabras (NOMBRE_TIPO, vocabulario.ts).

export interface IconoDeObjetoProps {
  className?: string;
}

const TRAZO = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Lienzo({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={["h-[1em] w-[1em] shrink-0", className].join(" ")}
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

/** Arma: una espada. */
export function IconoArma({ className }: IconoDeObjetoProps) {
  return (
    <Lienzo className={className}>
      <path d="M6.5 17.5 17 7" {...TRAZO} />
      <path d="M14.5 4.5 19.5 9.5" {...TRAZO} />
      <path d="M3.5 20.5 6.5 17.5" {...TRAZO} />
      <path d="M13 5 15 3M19 11l2-2" {...TRAZO} />
    </Lienzo>
  );
}

/** Armadura: el peto. */
export function IconoArmadura({ className }: IconoDeObjetoProps) {
  return (
    <Lienzo className={className}>
      <path d="M12 2.5 5 5v6c0 5.2 3.1 8.6 7 10.5 3.9-1.9 7-5.3 7-10.5V5Z" {...TRAZO} />
      <path d="M12 2.5v14" {...TRAZO} />
    </Lienzo>
  );
}

/** Escudo: el escudo redondo. */
export function IconoEscudo({ className }: IconoDeObjetoProps) {
  return (
    <Lienzo className={className}>
      <path d="M12 3 5 5.5v5c0 5.4 3 8.6 7 10 4-1.4 7-4.6 7-10v-5Z" {...TRAZO} />
      <path d="M9 11.5 11.2 13.5 15.5 9" {...TRAZO} />
    </Lienzo>
  );
}

/** Consumible: el frasco. */
export function IconoConsumible({ className }: IconoDeObjetoProps) {
  return (
    <Lienzo className={className}>
      <path
        d="M10 2.5h4M10.5 2.5v4l-3.8 6.6a3.3 3.3 0 0 0 2.9 5h4.8a3.3 3.3 0 0 0 2.9-5L13.5 6.5v-4"
        {...TRAZO}
      />
      <path d="M8.3 14.5h7.4" {...TRAZO} />
    </Lienzo>
  );
}

/** Impedimenta: el saco. */
export function IconoImpedimenta({ className }: IconoDeObjetoProps) {
  return (
    <Lienzo className={className}>
      <path d="M9 4h6l1.2 3.5" {...TRAZO} />
      <path d="M7.8 7.5h8.4l1.6 9.2A2.5 2.5 0 0 1 15.3 20H8.7a2.5 2.5 0 0 1-2.5-3.3Z" {...TRAZO} />
    </Lienzo>
  );
}

/** Objeto maravilloso: la estrella. */
export function IconoMaravilloso({ className }: IconoDeObjetoProps) {
  return (
    <Lienzo className={className}>
      <path
        d="M12 2.8 14 9.3 20.5 9.3 15.3 13.1 17.3 19.6 12 15.7 6.7 19.6 8.7 13.1 3.5 9.3 10 9.3Z"
        {...TRAZO}
      />
    </Lienzo>
  );
}

const ICONO_POR_TIPO: Record<ItemKind, (p: IconoDeObjetoProps) => ReactElement> = {
  WEAPON: IconoArma,
  ARMOR: IconoArmadura,
  SHIELD: IconoEscudo,
  CONSUMABLE: IconoConsumible,
  GEAR: IconoImpedimenta,
  OTHER: IconoMaravilloso,
};

export function IconoDeObjeto({ kind, className }: { kind: ItemKind } & IconoDeObjetoProps) {
  const Icono = ICONO_POR_TIPO[kind];
  return <Icono className={className} />;
}
