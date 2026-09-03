import type { CreatureSize, CreatureType } from "@dnd/shared";

// Fase 2D — la forma legible de lo que el bestiario enseña.
//
// **Se escribe una vez por dominio y todo lo demás la importa.** Es una regla dura del proyecto,
// y viene de un fallo que apareció tres veces en una sola mañana: `(LOCATION)`, `PUBLIC` y
// «Nuevo LOCATION» llegaron a la pantalla tal cual. Un `MONSTROSITY` en la ficha de un oso
// lechuza sería el cuarto.

export const NOMBRE_TAMANO: Record<CreatureSize, string> = {
  TINY: "Diminuto",
  SMALL: "Pequeño",
  MEDIUM: "Mediano",
  LARGE: "Grande",
  HUGE: "Enorme",
  GARGANTUAN: "Gargantuesco",
};

/** Los catorce del SRD, con el nombre de la traducción oficial al español. */
export const NOMBRE_TIPO_CRIATURA: Record<CreatureType, string> = {
  ABERRATION: "Aberración",
  BEAST: "Bestia",
  CELESTIAL: "Celestial",
  CONSTRUCT: "Constructo",
  DRAGON: "Dragón",
  ELEMENTAL: "Elemental",
  FEY: "Feérico",
  FIEND: "Infernal",
  GIANT: "Gigante",
  HUMANOID: "Humanoide",
  MONSTROSITY: "Monstruosidad",
  OOZE: "Cieno",
  PLANT: "Planta",
  UNDEAD: "Muerto viviente",
};

/** «Mediano humanoide (orco)» — la línea que el libro pone debajo del nombre. */
export function descriptorDeCriatura(s: {
  size: CreatureSize;
  type: CreatureType;
  subtype?: string;
  alignment?: string;
}): string {
  const base = `${NOMBRE_TAMANO[s.size]} ${NOMBRE_TIPO_CRIATURA[s.type].toLowerCase()}`;
  const conSubtipo = s.subtype ? `${base} (${s.subtype})` : base;
  return s.alignment ? `${conSubtipo}, ${s.alignment}` : conSubtipo;
}

/**
 * De dónde viene un statblock, en una palabra.
 *
 * **«Libro» y no «SRD»**: la mesa no dice SRD. Y no es un detalle de estilo — un rótulo que solo
 * entiende quien conoce la licencia es un rótulo que no informa a nadie más.
 */
export const NOMBRE_ORIGEN: Record<"SRD" | "CAMPAIGN", string> = {
  SRD: "Del libro",
  CAMPAIGN: "De la campaña",
};
