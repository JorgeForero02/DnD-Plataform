import type { Character } from "@prisma/client";
import { deriveCharacter } from "../../rules/catalog";
import { maxHpConAgotamiento, nivelDeAgotamiento } from "./agotamiento";
import { condicionesActivas, type CondicionConVencimiento } from "../conditions/vencimiento";

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
export function maxHpDe(
  character: Character,
  /**
   * Las condiciones activas y el reloj, si quien llama los tiene (2C.4).
   *
   * **Sin ellos el máximo se devuelve sin agotamiento**, que es lo que hacía hasta 2C.4 y sigue
   * siendo correcto para quien no puede saberlo. Se pasan **opcionales y no obligatorios** a
   * propósito: hacerlos obligatorios habría obligado a cada llamante a consultar la base para un
   * caso que casi nunca aplica, y el precio de olvidarlos es un tope de curación generoso, no un
   * número que la hoja enseñe mal — la hoja lo calcula por su cuenta y con las condiciones puestas.
   */
  agotamiento?: { conditions: CondicionConVencimiento[]; clockSeconds: number },
): number | null {
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
      // Encargo A8 (2026-09-07), vuelta de arreglo 1. **Hoy no cambia ningún número**: ninguna
      // subclase de este catálogo toca `hpPerLevel` ni ningún modificador que afecte a los PG
      // máximos. Se pasa de todos modos porque esta es la tercera construcción de un
      // `CharacterBuild` a partir de la fila (`resolve.ts`/`character-sheet.service.ts` y
      // `level-up.service.ts` son las otras dos) — omitirla aquí es la misma clase de fallo que
      // ya mordió dos veces: basta que un rasgo futuro de subclase toque PG máximos para que esta
      // función calcule un tope de curación distinto al de la propia hoja.
      subclass: character.subclassKey ? { source: "SRD", key: character.subclassKey } : undefined,
      level: character.level,
      choices: (character.choices as Record<string, string[]> | null) ?? undefined,
      // Reglas de la mesa (E-RM-3): el cuarto motivo por el que esta construcción tiene que ir a
      // la par de las otras dos — sin esto, un personaje con PG fijados al nacer vería un tope de
      // curación distinto al de su propia hoja.
      hitPointsPerLevel: (character.hitPointsPerLevel as number[] | null) ?? undefined,
    });
    const maxHp = hoja.derived.maxHp;
    if (!maxHp) return null;
    if (!agotamiento) return maxHp.total;
    const nivel = nivelDeAgotamiento(
      condicionesActivas(agotamiento.conditions, agotamiento.clockSeconds),
    );
    return maxHpConAgotamiento(maxHp, nivel).total;
  } catch {
    // Una clave que el catálogo no reconoce, o unas elecciones que ya no encajan con la raza
    // actual: la hoja no se puede derivar hoy. **Devolver `null` y no curar de más es más
    // honesto que reventar un descanso** por un dato viejo que nadie ha tocado todavía.
    return null;
  }
}
