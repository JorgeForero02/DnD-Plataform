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

// Reseño 2026-09-02, segunda pasada: el título del diálogo era `${isEdit ? "Editar" : "Nuevo"}
// ${type}`, es decir "Nuevo NPC" en el mejor caso y "Nuevo LOCATION" en el resto. El género
// tampoco cuadra en español —"Nuevo misión"—, así que la forma completa se escribe una vez
// aquí en lugar de componerse a mano en cada pantalla.
export const TITULO_NUEVO: Record<EntityType, string> = {
  NPC: "Nuevo PNJ",
  LOCATION: "Nuevo lugar",
  QUEST: "Nueva misión",
  FACTION: "Nueva facción",
  OBJECT: "Nuevo objeto",
  EVENT: "Nuevo evento",
  DOCUMENT: "Nuevo documento",
};

export const TITULO_EDITAR: Record<EntityType, string> = {
  NPC: "Editar PNJ",
  LOCATION: "Editar lugar",
  QUEST: "Editar misión",
  FACTION: "Editar facción",
  OBJECT: "Editar objeto",
  EVENT: "Editar evento",
  DOCUMENT: "Editar documento",
};

// El rótulo en plural: el nombre de la sección. Vivía suelto en el array `TABS` de
// `pages/CampaignDetailPage.tsx`, y la cabecera explicada de la maqueta lo necesita otra vez
// (en el título de la sección y en la migaja «El mundo · …»). Repetirlo habría sido la cuarta
// copia de la misma palabra; se escribe aquí, junto a las otras tres formas del mismo tipo.
export const ROTULO_PLURAL: Record<EntityType, string> = {
  NPC: "PNJ",
  LOCATION: "Lugares",
  QUEST: "Misiones",
  FACTION: "Facciones",
  OBJECT: "Objetos",
  EVENT: "Eventos",
  DOCUMENT: "Documentos",
};
