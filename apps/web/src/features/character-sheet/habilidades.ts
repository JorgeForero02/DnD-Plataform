import type { AbilityKey, SkillKey } from "@dnd/shared";
import { ABILITY_KEYS, SKILLS } from "@dnd/shared";

// Tarea 4 (spec 2026-09-11, «la hoja a página completa») — vivía en `HojaCalculada.tsx`; se
// mueve aquí porque ahora la usa `pestanas/Numeros.tsx`, no la propia `HojaCalculada`.
export const HABILIDADES_POR_CARACTERISTICA: Record<AbilityKey, SkillKey[]> = ABILITY_KEYS.reduce(
  (acc, ability) => {
    acc[ability] = (Object.entries(SKILLS) as [SkillKey, AbilityKey][])
      .filter(([, a]) => a === ability)
      .map(([skill]) => skill);
    return acc;
  },
  {} as Record<AbilityKey, SkillKey[]>,
);
