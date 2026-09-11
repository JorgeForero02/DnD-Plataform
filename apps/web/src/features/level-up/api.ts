import type { LevelUpPreviewQuery } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

// Tarea 2A.11 — el cliente HTTP de la subida de nivel. `apiFetch` es el único que habla HTTP
// (docs/04-convenciones.md). Los tipos de abajo son la forma del JSON que devuelven
// `GET .../level-up/preview` y `POST .../level-up` (`apps/api/src/level-up/level-up.service.ts`),
// calcados a mano por la misma razón que en `features/character-sheet/api.ts`: `LevelUpPreview`
// vive en `apps/api/src/level-up/`, y la web no puede — ni debe — importar de `apps/api`.
//
// **Tarea 7 (S12): el hueco declarado se cerró.** `roll` ya tipa contra `LevelUpPreviewQuery`,
// que ahora vive en `@dnd/shared` (`level-up.schema.ts`) — la forma de la consulta ya no se
// escribe dos veces.

/** Una aptitud nueva que el nivel de destino concede. `source` es una enumeración: se traduce. */
export interface NewClassFeatureDto {
  source: "class" | "subclass";
  key: string;
  /** Ya en español — lo pone el catálogo del servidor, no se traduce aquí. */
  name: string;
}

export interface LevelUpSpellSlotDto {
  spellLevel: number;
  slots: number;
}

export interface LevelUpPreview {
  from: number;
  to: number;
  hp: {
    method: "AVERAGE" | "ROLL";
    hitDie: number;
    conModifier: number;
    /** Lo que se sumaría a los PG máximos actuales. */
    delta: number;
    current: number;
    next: number;
    /** Solo cuando `method === "ROLL"`. */
    roll?: { expression: string; rolled: number; total: number };
  };
  proficiencyBonus: { from: number; to: number; changed: boolean };
  attacksPerAction: { from: number; to: number; changed: boolean };
  hitDice: { from: number; to: number; dieSize: number };
  spellSlots: { from: LevelUpSpellSlotDto[]; to: LevelUpSpellSlotDto[]; changed: boolean };
  newFeatures: NewClassFeatureDto[];
  abilityScoreImprovementPending: boolean;
}

/** Lo que devuelve `POST .../level-up`: la fila del personaje ya actualizada. */
export interface LevelUpResult {
  id: string;
  level: number;
}

/**
 * `GET .../level-up/preview`.
 *
 * **`roll` solo se manda cuando es verdadero, nunca como `roll=false`.** El esquema del
 * servidor lo coacciona con `z.coerce.boolean()` (`level-up.schema.ts`), y ahí cualquier cadena
 * no vacía —`"false"` incluida— vale `true`. Omitir el parámetro es la única forma de pedir la
 * media.
 */
export function fetchLevelUpPreview(
  campaignId: string,
  characterId: string,
  roll: NonNullable<LevelUpPreviewQuery["roll"]> = false,
): Promise<LevelUpPreview> {
  const sufijo = roll ? "?roll=true" : "";
  return apiFetch<LevelUpPreview>(
    `/campaigns/${campaignId}/characters/${characterId}/level-up/preview${sufijo}`,
  );
}

/**
 * `POST .../level-up`. **No acepta `roll` y no se le manda**: el servidor lo dice sin rodeos
 * (`level-up.service.ts`, `apply`) — como los PG máximos no son una columna, un número tirado no
 * tiene dónde vivir después de aplicarse, así que la confirmación siempre usa la media fija.
 */
export function applyLevelUp(campaignId: string, characterId: string): Promise<LevelUpResult> {
  return apiFetch<LevelUpResult>(`/campaigns/${campaignId}/characters/${characterId}/level-up`, {
    method: "POST",
  });
}
