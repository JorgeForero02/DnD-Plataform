import type { Character } from "@prisma/client";
import { deriveCharacter } from "../../rules/catalog";

// Los PG máximos de una ficha, **calculados y nunca leídos de una columna**.
//
// No existe `Character.maxHp` a propósito: guardar lo calculado significa que el día que se
// corrija una fórmula habrá mil filas mintiendo sin forma de saber cuáles
// (`docs/05-datos.md`). Así que cuando este módulo necesita el máximo —para no curar por
// encima de él— lo deriva, igual que hace la hoja.
//
// **Se importa del catálogo, que es puro**, y no del servicio de la hoja: `character-state` no
// depende de `characters` ni al revés. Las dos carpetas cuelgan del mismo cálculo y ninguna de
// la otra, que es lo que evita el ciclo.

/**
 * `null` cuando la ficha no da para derivar —le faltan características, raza o clase—, que es
 * un estado legítimo de una hoja a medio hacer y **no un error**. Quien llama decide qué hacer
 * con esa ausencia; aquí no se inventa un máximo.
 */
export function maxHpDe(character: Character): number | null {
  const { str, dex, con, int, wis, cha, raceKey, classKey } = character;
  if (
    str === null ||
    dex === null ||
    con === null ||
    int === null ||
    wis === null ||
    cha === null ||
    !raceKey ||
    !classKey
  ) {
    return null;
  }

  try {
    const hoja = deriveCharacter({
      abilities: { str, dex, con, int, wis, cha },
      race: { source: "SRD", key: raceKey },
      subrace: character.subraceKey ? { source: "SRD", key: character.subraceKey } : undefined,
      class: { source: "SRD", key: classKey },
      level: character.level,
      choices: (character.choices as Record<string, string[]> | null) ?? undefined,
    });
    return hoja.derived.maxHp?.total ?? null;
  } catch {
    // Una clave que el catálogo no reconoce, o unas elecciones que ya no encajan con la raza
    // actual: la hoja no se puede derivar hoy. **Devolver `null` y no curar de más es más
    // honesto que reventar un descanso** por un dato viejo que nadie ha tocado todavía.
    return null;
  }
}
