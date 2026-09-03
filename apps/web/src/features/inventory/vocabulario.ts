import type { CoinKey, DamageType, EquipSlot, ItemKind, ItemLocation } from "@dnd/shared";

// Carril B1 — el vocabulario del inventario.
//
// **Ningún valor de enumeración llega a la pantalla** (docs/04-convenciones.md). `EQUIPPED`,
// `MAIN_HAND`, `WEAPON`, `SLASHING`, `cp`... son claves que vienen tal cual de la API
// (`item.schema.ts` / `inventory.schema.ts` en `@dnd/shared`), y este es el único fichero de
// `features/inventory` donde se convierten a español. Todo lo demás importa de aquí.

export const NOMBRE_ZONA: Record<ItemLocation, string> = {
  EQUIPPED: "Equipado",
  CARRIED: "Encima",
  STORED: "Guardado",
};

export const SUBTITULO_ZONA: Record<ItemLocation, string> = {
  EQUIPPED: "afecta a los números",
  CARRIED: "la mochila",
  STORED: "en otro sitio",
};

export const NOMBRE_ACCION_ZONA: Record<ItemLocation, string> = {
  EQUIPPED: "Quitar",
  CARRIED: "Equipar",
  STORED: "Traer",
};

export const NOMBRE_RANURA: Record<EquipSlot, string> = {
  MAIN_HAND: "Mano principal",
  OFF_HAND: "Mano izquierda",
  ARMOR: "Armadura",
  HEAD: "Cabeza",
  NECK: "Cuello",
  CLOAK: "Capa",
  RING_1: "Anillo 1",
  RING_2: "Anillo 2",
  HANDS: "Manos",
  FEET: "Pies",
  OTHER: "Otra",
};

/** La frase corta que va junto al nombre del arma equipada: "Arma sutil · en mano". */
export const NOMBRE_RANURA_EN_MANO: Partial<Record<EquipSlot, string>> = {
  MAIN_HAND: "en mano",
  OFF_HAND: "en la mano izquierda",
};

export const NOMBRE_TIPO_OBJETO: Record<ItemKind, string> = {
  WEAPON: "Arma",
  ARMOR: "Armadura",
  SHIELD: "Escudo",
  CONSUMABLE: "Consumible",
  GEAR: "Impedimenta",
  OTHER: "Objeto",
};

export const NOMBRE_TIPO_DANO: Record<DamageType, string> = {
  BLUDGEONING: "contund.",
  PIERCING: "perf.",
  SLASHING: "cort.",
  ACID: "ácido",
  COLD: "frío",
  FIRE: "fuego",
  FORCE: "fuerza",
  LIGHTNING: "rayo",
  NECROTIC: "necrótico",
  POISON: "veneno",
  PSYCHIC: "psíquico",
  RADIANT: "radiante",
  THUNDER: "trueno",
};

export const NOMBRE_MONEDA: Record<CoinKey, string> = {
  cp: "cobre",
  sp: "plata",
  ep: "electro",
  gp: "oro",
  pp: "platino",
};

export const ABREVIATURA_MONEDA: Record<CoinKey, string> = {
  cp: "pc",
  sp: "pp", // pieza de plata — no se confunde con "pp" de platino porque nunca comparten fila
  ep: "pe",
  gp: "po",
  pp: "ppt",
};

/** El subtítulo tenue de una fila: tipo del objeto, y su ranura en mano si la tiene. */
export function subtituloDeObjeto(kind: ItemKind, slotEnMano?: EquipSlot): string {
  const base = NOMBRE_TIPO_OBJETO[kind];
  const ranura = slotEnMano ? NOMBRE_RANURA_EN_MANO[slotEnMano] : undefined;
  return ranura ? `${base} · ${ranura}` : base;
}

/** `1d8 perf.` — el dado de daño con su tipo abreviado, como en el prototipo. */
export function danioCorto(damageDice: string, damageType: DamageType): string {
  return `${damageDice} ${NOMBRE_TIPO_DANO[damageType]}`;
}

// ---------------------------------------------------------------------------------------------
// Carril B4 — el selector de objeto: "catálogo" frente a "de la campaña", tal cual en la pantalla
// 22 del prototipo (mismas dos palabras que su marca de procedencia). Se distingue de un vistazo
// de dónde sale cada objeto, porque cuando algo se comporta raro lo primero es saber su
// procedencia.
// ---------------------------------------------------------------------------------------------

export type ProcedenciaObjeto = "SRD" | "CAMPAIGN";

export const NOMBRE_PROCEDENCIA: Record<ProcedenciaObjeto, string> = {
  SRD: "catálogo",
  CAMPAIGN: "de la campaña",
};
