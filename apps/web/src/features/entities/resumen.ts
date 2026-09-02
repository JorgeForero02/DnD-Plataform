import type { EntityBody, EntityType } from "@dnd/shared";

// Reseño 2026-09-02 — audit B1, the worst finding in the product: every list row showed a
// name and some tags and NOT ONE LINE of what the thing was, even though the body text was
// already sitting in the same response the list came from. Nobody had to fetch anything to
// fix this; the data was there and unused.
//
// This turns a Markdown body into one plain line. It is deliberately a light strip, not a
// Markdown parser: a summary that rendered bold and links inside a list row would fight the
// row's own type. Headings, emphasis, code ticks, link syntax and list bullets come off; the
// words stay.
export function resumenDeCuerpo(body: EntityBody | null | undefined, maxLength = 220): string {
  const texto = body?.text?.trim();
  if (!texto) return "";
  const plano = texto
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks, whole
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images, caption and all
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links keep their words, drop their target
    .replace(/^[>\s]*[-*+]\s+/gm, "") // list bullets
    .replace(/^#{1,6}\s+/gm, "") // heading marks
    .replace(/[*_~`]/g, "") // emphasis and inline code
    .replace(/\s+/g, " ")
    .trim();
  if (plano.length <= maxLength) return plano;
  // Cut on a word, not mid-word — a summary that ends in "sacerdo" reads as a bug.
  const corte = plano.slice(0, maxLength);
  const ultimoEspacio = corte.lastIndexOf(" ");
  return `${(ultimoEspacio > maxLength * 0.6 ? corte.slice(0, ultimoEspacio) : corte).trimEnd()}…`;
}

export const ETIQUETA_DE_TIPO: Record<EntityType, string> = {
  NPC: "PNJ",
  LOCATION: "Lugar",
  QUEST: "Misión",
  FACTION: "Facción",
  OBJECT: "Objeto",
  EVENT: "Evento",
  DOCUMENT: "Documento",
};
