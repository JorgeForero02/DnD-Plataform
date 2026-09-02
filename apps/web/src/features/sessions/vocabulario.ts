import type { SessionNoteKind } from "@dnd/shared";
import {
  IconoCombate,
  IconoDecision,
  IconoHallazgo,
  IconoNota,
  IconoObjeto,
  IconoPnj,
} from "./iconos";

// La forma legible de los sellos, **escrita una sola vez**. Ninguna clave llega a la pantalla:
// es la regla del proyecto, y el fallo que apareció tres veces en una mañana ((LOCATION), PUBLIC,
// «Nuevo LOCATION») nació justo de no tener este fichero.

export const NOMBRE_SELLO: Record<SessionNoteKind, string> = {
  ITEM: "Objeto",
  NPC: "PNJ",
  DECISION: "Decisión",
  COMBAT: "Combate",
  DISCOVERY: "Hallazgo",
  NOTE: "Nota",
};

/** Lo que se lee en la crónica, en frase. «Objeto» a secas no cuenta nada seis semanas después. */
export const FRASE_SELLO: Record<SessionNoteKind, string> = {
  ITEM: "Se entregó un objeto",
  NPC: "Conocieron a alguien",
  DECISION: "Tomaron una decisión",
  COMBAT: "Hubo combate",
  DISCOVERY: "Descubrieron algo",
  NOTE: "Nota de la mesa",
};

export const ICONO_SELLO: Record<SessionNoteKind, (p: { className?: string }) => JSX.Element> = {
  ITEM: IconoObjeto,
  NPC: IconoPnj,
  DECISION: IconoDecision,
  COMBAT: IconoCombate,
  DISCOVERY: IconoHallazgo,
  NOTE: IconoNota,
};

/** El orden en pantalla. No es alfabético: es de más frecuente a menos, medido en una mesa. */
export const SELLOS_EN_ORDEN: SessionNoteKind[] = [
  "COMBAT",
  "NPC",
  "DECISION",
  "DISCOVERY",
  "ITEM",
  "NOTE",
];

export function nombreSello(k: string): string {
  return NOMBRE_SELLO[k as SessionNoteKind] ?? `Sin traducir: ${k}`;
}

/** «1h 47m». Sin segundos: en la mesa nadie los mira, y parpadeando molestan. */
export function duracionDesde(inicio: string | null, ahora: number): string {
  if (!inicio) return "";
  const minutos = Math.max(0, Math.floor((ahora - new Date(inicio).getTime()) / 60000));
  const h = Math.floor(minutos / 60);
  return h > 0 ? `${h}h ${minutos % 60}m` : `${minutos}m`;
}
