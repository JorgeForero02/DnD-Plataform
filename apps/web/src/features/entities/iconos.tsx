import type { ReactElement, ReactNode } from "react";
import type { EntityType } from "@dnd/shared";

// **Los siete tipos del mundo, dibujados.**
//
// La maqueta de Figma pone un icono a la izquierda de cada fila y en cada acceso rápido del
// tablero, y esa es la mitad de lo que hace que siete listas idénticas dejen de parecer la
// misma lista. Se dibujan aquí, y no en `ui/Iconos.tsx`, porque la regla de interfaz
// (docs/04-convenciones.md) pide que sean **dibujados**, no que vivan en un único fichero:
// cada módulo grande dibuja los suyos, como ya hacen `features/rules` y `features/sessions`.
//
// Todos heredan `currentColor` y se miden en `1em`, para que escalen con la línea de texto en
// la que van. Todos son `aria-hidden`: el nombre del tipo ya está escrito al lado en palabras,
// y un icono con `role="img"` en cada fila metería la palabra "PNJ" dentro del nombre
// accesible de la fila — que es justo lo que la prueba de la fila sin etiquetas prohíbe.

export interface IconoDeTipoProps {
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

/** PNJ: una cabeza y unos hombros. Alguien a quien mirar a la cara. */
export function IconoPersonaje({ className }: IconoDeTipoProps) {
  return (
    <Lienzo className={className}>
      <circle cx="12" cy="8" r="3.5" {...TRAZO} />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" {...TRAZO} />
    </Lienzo>
  );
}

/** Lugar: la chincheta del cartógrafo. */
export function IconoLugar({ className }: IconoDeTipoProps) {
  return (
    <Lienzo className={className}>
      <path
        d="M12 21c4.2-4.6 6.3-8 6.3-10.4A6.3 6.3 0 0 0 5.7 10.6C5.7 13 7.8 16.4 12 21Z"
        {...TRAZO}
      />
      <circle cx="12" cy="10.3" r="2.3" {...TRAZO} />
    </Lienzo>
  );
}

/** Misión: la diana. Algo que se persigue y en lo que se acierta o no. */
export function IconoMision({ className }: IconoDeTipoProps) {
  return (
    <Lienzo className={className}>
      <circle cx="12" cy="12" r="8.5" {...TRAZO} />
      <circle cx="12" cy="12" r="3.8" {...TRAZO} />
      <path d="M12 1.8v3.4M12 18.8v3.4M1.8 12h3.4M18.8 12h3.4" {...TRAZO} />
    </Lienzo>
  );
}

/** Facción: el estandarte. Un grupo se reconoce por su bandera. */
export function IconoFaccion({ className }: IconoDeTipoProps) {
  return (
    <Lienzo className={className}>
      <path d="M6 21V3" {...TRAZO} />
      <path d="M6 4h12l-2.6 4L18 12H6" {...TRAZO} />
    </Lienzo>
  );
}

/** Objeto: el cofre. Algo que se puede tener en la mano y cambia de dueño. */
export function IconoObjeto({ className }: IconoDeTipoProps) {
  return (
    <Lienzo className={className}>
      <path d="M3.5 10.5h17V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19Z" {...TRAZO} />
      <path d="M3.5 10.5 6 4.2A1.5 1.5 0 0 1 7.4 3.3h9.2A1.5 1.5 0 0 1 18 4.2l2.5 6.3" {...TRAZO} />
      <path d="M10 13.8h4" {...TRAZO} />
    </Lienzo>
  );
}

/** Evento: el rayo. Algo que pasa, mire quien mire. */
export function IconoEvento({ className }: IconoDeTipoProps) {
  return (
    <Lienzo className={className}>
      <path d="M13.6 2.5 5.5 13.4h5.6L10.4 21.5l8.1-10.9h-5.6Z" {...TRAZO} />
    </Lienzo>
  );
}

/** Documento: la hoja con la esquina doblada. */
export function IconoDocumento({ className }: IconoDeTipoProps) {
  return (
    <Lienzo className={className}>
      <path
        d="M14 2.8H7a1.5 1.5 0 0 0-1.5 1.5v15.4A1.5 1.5 0 0 0 7 21.2h10a1.5 1.5 0 0 0 1.5-1.5V7.3Z"
        {...TRAZO}
      />
      <path d="M14 2.8v4.5h4.5" {...TRAZO} />
      <path d="M8.8 12.5h6.4M8.8 16h4.4" {...TRAZO} />
    </Lienzo>
  );
}

const ICONO_POR_TIPO: Record<EntityType, (p: IconoDeTipoProps) => ReactElement> = {
  NPC: IconoPersonaje,
  LOCATION: IconoLugar,
  QUEST: IconoMision,
  FACTION: IconoFaccion,
  OBJECT: IconoObjeto,
  EVENT: IconoEvento,
  DOCUMENT: IconoDocumento,
};

/** El icono que le toca a un tipo. Escrito una vez, como su rótulo y su plantilla. */
export function IconoDeTipo({ type, className }: { type: EntityType } & IconoDeTipoProps) {
  const Icono = ICONO_POR_TIPO[type];
  return <Icono className={className} />;
}
