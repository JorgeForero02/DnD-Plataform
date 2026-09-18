import { z } from "zod";
import type { Activacion, Rango } from "./activity.schema";
import type { SpellSchool } from "./catalog.schema";

// Tarea 2 de 3A.2 (Task 2, brief «Elegir, lanzar y usar») — el libro de conjuros de un
// personaje: qué conjuros de su clase tiene marcados, en qué estado, y la respuesta que arma la
// pantalla para pintarlo sin una segunda consulta.
//
// **Los cuatro modelos de preparación se declaran otra vez aquí, y no es un descuido.** Task 1
// (`apps/api/src/rules/catalog/spell-knowledge.ts`) ya exporta `ModeloDePreparacion` como tipo
// TS puro — no hay Zod ahí porque `modeloDePreparacion()` es una función del catálogo generado,
// no un dato que llegue por HTTP. Este fichero SÍ necesita el esquema, porque `SpellbookResponse`
// SÍ viaja por la red y su `modelo` tiene que validarse en el cliente igual que en el servidor.
// La Task 3 hace que el catálogo de la API importe el tipo de aquí (nunca al revés): dos
// declaraciones de los mismos cuatro literales durante una tarea, no un vocabulario paralelo que
// se quede así — es lo que este propio comentario avisa de no dejar pasar.

/** Los tres estados de un conjuro en la lista de un personaje. */
export const CHARACTER_SPELL_STATES = ["EN_EL_LIBRO", "PREPARADO", "CONOCIDO"] as const;
export const characterSpellStateSchema = z.enum(CHARACTER_SPELL_STATES);
export type CharacterSpellState = z.infer<typeof characterSpellStateSchema>;

/**
 * Cómo una clase llena su lista de conjuros disponibles, igual que
 * `apps/api/src/rules/catalog/spell-knowledge.ts` — ver el comentario de arriba sobre por qué
 * se declara dos veces durante esta tarea.
 */
export const MODELOS_DE_PREPARACION = [
  "PREPARA_DE_LISTA",
  "LIBRO",
  "CONOCIDOS",
  "NINGUNO",
] as const;
export type ModeloDePreparacion = (typeof MODELOS_DE_PREPARACION)[number];

/** `PUT …/spellbook/:spellKey` — `null` = quitar el conjuro de la lista. */
export const setCharacterSpellSchema = z.object({
  estado: characterSpellStateSchema.nullable(),
});
export type SetCharacterSpellInput = z.infer<typeof setCharacterSpellSchema>;

/**
 * De qué familia es la mecánica de un conjuro, para que la pantalla decida qué botón ofrecer sin
 * tener que releer la actividad entera (`Actividad`, `activity.schema.ts`) cada vez.
 */
export type MecanicaDeConjuro = "ataque" | "salvacion" | "dados" | "utilidad" | "prueba" | "texto";

/**
 * Una entrada del libro de conjuros de un personaje: el conjuro del catálogo (Task 1) más el
 * estado que tiene ESTE personaje sobre él (o `null` si ni siquiera está en su lista).
 */
export interface SpellbookEntry {
  key: string;
  nameEs: string;
  nameEn: string;
  level: number;
  school: SpellSchool;
  castingTime: Activacion;
  range: Rango;
  concentration: boolean;
  ritual: boolean;
  estado: CharacterSpellState | null;
  /** Se puede lanzar ahora: PREPARADO, o CONOCIDO (incluye trucos). Un EN_EL_LIBRO no. */
  lanzable: boolean;
  mecanica: MecanicaDeConjuro;
  /** Cuántos objetivos pide la actividad de lanzamiento: "ninguno" | "uno" | "varios". */
  objetivos: "ninguno" | "uno" | "varios";
  /** Tiene `escalado.por === "espacio"` (se ofrece elegir espacio). */
  escalaPorEspacio: boolean;
  textEs: string | null;
  textEn: string;
  higherLevelsEs?: string;
  higherLevelsEn?: string;
}

/** Cuánto tiene ocupado de un tope, y cuánto le cabe. */
export interface SpellbookTope {
  max: number;
  actual: number;
}

/**
 * La respuesta completa de `GET …/spellbook`: las entradas y los topes que la pantalla necesita
 * para pintar avisos («7 de 6 preparados») sin recalcularlos.
 */
export interface SpellbookResponse {
  modelo: ModeloDePreparacion;
  entradas: SpellbookEntry[];
  topes: {
    preparados?: SpellbookTope;
    trucos?: SpellbookTope;
    libro?: SpellbookTope;
    conocidos?: SpellbookTope;
  };
  /**
   * Avisos derivados de los topes. **Solo códigos**: la frase en español la compone la pantalla
   * a partir de `topes`, igual que ningún otro valor de enumeración llega ya traducido.
   */
  avisos: Array<"PREPARADOS_DE_MAS" | "TRUCOS_DE_MAS" | "LIBRO_DE_MAS" | "CONOCIDOS_DE_MAS">;
  /** Espacios por nivel, para pintar «nivel 2 · 1/2» sin una segunda consulta. */
  espacios: Array<{ nivel: number; actual: number; max: number }>;
}
