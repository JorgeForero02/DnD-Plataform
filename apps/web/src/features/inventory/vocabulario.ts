import type { CoinKey, DamageType, EquipSlot, ItemKind, ItemLocation } from "@dnd/shared";
import { nombreTipoDanoCorto } from "../../dominio/dano";

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

/**
 * «15 monedas de oro» / «1 moneda de oro» (tarea B4/B5, arreglo de vuelta 1). Escrita una sola
 * vez aquí porque `DarObjeto.tsx` y `ResultadoDeTabla.tsx` la necesitaban las dos y la tenían
 * a mano, sin plural — «1 monedas de oro» llegó a pantalla antes de que esto existiera.
 *
 * **A propósito distinta de `dineroLegible` en `sessions/linea-de-log.ts`** («+15 oro»): esa es
 * una anotación compacta de delta para una línea de registro que ya lleva su signo; esta es una
 * entrada de una lista de lo que se entrega, junto a nombres de objeto completos («Espada
 * corta»), donde una forma tan corta como «+15 oro» desentonaría. Las dos formas son correctas
 * para su sitio y no se han igualado a propósito.
 */
export function fraseDeMoneda(clave: CoinKey, cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? "moneda" : "monedas"} de ${NOMBRE_MONEDA[clave]}`;
}

/** El subtítulo tenue de una fila: tipo del objeto, y su ranura en mano si la tiene. */
export function subtituloDeObjeto(kind: ItemKind, slotEnMano?: EquipSlot): string {
  const base = NOMBRE_TIPO_OBJETO[kind];
  const ranura = slotEnMano ? NOMBRE_RANURA_EN_MANO[slotEnMano] : undefined;
  return ranura ? `${base} · ${ranura}` : base;
}

/** `1d8 perf.` — el dado de daño con su tipo abreviado, como en el prototipo. */
export function danioCorto(damageDice: string, damageType: DamageType): string {
  // **La forma CORTA, y es el motivo de que exista** (D-OP-14): `contund.`, `perf.`, `cort.` y
  // `rayo` son lo que hace que esta fila quepa. No es un descuido que se pueda «unificar».
  return `${damageDice} ${nombreTipoDanoCorto(damageType)}`;
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

// ---------------------------------------------------------------------------------------------
// D-CF-15 (migración 7) — «lo tengo pero no sé qué es». No es un enum: es un booleano por fila
// (`identified`) más un alias libre (`unidentifiedName`), así que aquí solo va la prosa fija
// —la etiqueta y la explicación del control del DM—, no una tabla de traducción.
// ---------------------------------------------------------------------------------------------

/** La etiqueta que ve quien no es el DM junto al nombre de un objeto sin identificar. */
export const ETIQUETA_SIN_IDENTIFICAR = "Sin identificar";

/**
 * La explicación bajo el interruptor del DM — por qué existe el control, no solo su nombre.
 *
 * Fix round 4 (D-CF-15) — el texto tiene que decir lo mismo que la regla 6 del servidor
 * (`inventory.service.ts`, `add()`): un objeto cuya visibilidad de catálogo el dueño no ve
 * TODAVÍA solo se puede dar así, sin identificar — identificado de entrada, el servidor lo
 * rechaza con 400 hasta que se suba la visibilidad. Si el texto solo hablara del alias y
 * discrepara de esta regla, mentiría (regla de interfaz de `docs/04-convenciones.md`).
 */
export const EXPLICACION_SIN_IDENTIFICAR =
  "El jugador ve un alias en vez del nombre real, hasta que lo identifiques en la mesa. También " +
  "es la única forma de dar un objeto cuya visibilidad en el catálogo el dueño todavía no ve: " +
  "identificado, el servidor lo rechaza hasta que subas esa visibilidad.";
