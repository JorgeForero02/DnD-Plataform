import type { ParteDeRegla } from "./vocabulario";

// Tareas R1 y R4 — la forma y el color de cada parte de una regla.
//
// **La lección de Blockly:** la forma dice dónde encaja algo *antes* de que lo intentes. Aquí
// hay tres siluetas irreconciliables, una por parte, y la del carril es la misma que la de la
// caja que admite. Un suceso no se puede meter en el carril de las acciones, y se ve a un metro
// de la pantalla sin leer una palabra.
//
// **El color acompaña, nunca decide solo.** Cada caja lleva además su silueta, su icono
// dibujado y la palabra de su parte escrita: quien no distinga cobre de azul sigue teniendo
// tres señales. Los tres tonos son los del proyecto y respetan sus oficios
// (docs/04-convenciones.md): `--copper` es lo que pertenece al mundo —un suceso ocurre en él—,
// `--accent` es lo que actúa —una acción escribe—, y el estado va en neutro porque no hace
// ninguna de las dos cosas: solo se comprueba. Ni `--warning` ni `--danger` aparecen: una regla
// bien escrita no es un aviso ni un peligro.

/**
 * El tipo MIME que viaja en el `DataTransfer`. **La parte va en el tipo, no en los datos**, y
 * eso no es un capricho: durante `dragover` el navegador prohíbe leer los datos y solo deja
 * mirar los tipos. Es la única forma de que un carril sepa **mientras arrastras** si lo que
 * traes le vale, y por tanto de que rechace lo que no es suyo antes de soltarlo.
 */
export function tipoDeArrastre(parte: ParteDeRegla): string {
  return `application/x-dnd-regla-${parte.toLowerCase()}`;
}

/** La silueta de la parte, como `clip-path`. Es lo que hace que la forma signifique algo. */
export const SILUETA: Record<ParteDeRegla, string> = {
  // El suceso apunta hacia delante: llega y empuja a lo siguiente.
  SUCESO: "polygon(0% 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 0% 100%)",
  // El estado es el hexágono de las condiciones: entra por un lado y sale por el otro, sin
  // cambiar nada. Es la forma que Blockly reserva a lo booleano.
  ESTADO:
    "polygon(12px 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0% 50%)",
  // La acción es el bloque de sentencia: recto, con la muesca por la que encaja debajo del
  // anterior. Nada apunta a ninguna parte porque una acción no lleva a otra: se ejecuta.
  ACCION:
    "polygon(0% 0%, 9px 0%, 15px 6px, 21px 0%, 100% 0%, 100% calc(100% - 6px), 21px calc(100% - 6px), 15px 100%, 9px calc(100% - 6px), 0% calc(100% - 6px))",
};

export interface ClasesDeParte {
  /** El borde de la caja colocada. */
  borde: string;
  /** El relleno suave del fondo. */
  fondo: string;
  /** El color del texto que nombra la parte. */
  texto: string;
  /** El relleno de la silueta de la paleta. */
  silueta: string;
}

export const CLASES_DE_PARTE: Record<ParteDeRegla, ClasesDeParte> = {
  SUCESO: {
    borde: "border-copper",
    fondo: "bg-copper/10",
    texto: "text-copper-text",
    silueta: "bg-copper/25",
  },
  ESTADO: {
    borde: "border-muted",
    fondo: "bg-surface",
    texto: "text-text",
    silueta: "bg-muted/25",
  },
  ACCION: {
    borde: "border-accent",
    fondo: "bg-accent/10",
    texto: "text-accent-text",
    silueta: "bg-accent/25",
  },
};

/** Las tres partes en el orden en que se leen: cuando, si, entonces. */
export const PARTES: ParteDeRegla[] = ["SUCESO", "ESTADO", "ACCION"];
