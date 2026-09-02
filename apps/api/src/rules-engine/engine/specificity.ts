import type { EngineRule } from "./types";

// §2.6 del diseño: cuando varias reglas pasan sus condiciones para el mismo suceso, gana la
// más específica — la que tiene más condiciones. Si empatan, el sistema no adivina: se marca
// como conflicto y ninguna de las empatadas se aplica.

export interface SpecificityResult {
  /** La única regla ganadora, si la hay sin empate. */
  winner: EngineRule | null;
  /** Más de una regla si hubo empate en la especificidad máxima — ninguna se aplica. */
  conflicting: EngineRule[];
}

export function resolveSpecificity(candidates: EngineRule[]): SpecificityResult {
  if (candidates.length === 0) return { winner: null, conflicting: [] };

  const maxSpecificity = Math.max(...candidates.map((r) => r.conditions.length));
  const mostSpecific = candidates.filter((r) => r.conditions.length === maxSpecificity);

  if (mostSpecific.length === 1) return { winner: mostSpecific[0], conflicting: [] };
  return { winner: null, conflicting: mostSpecific };
}
