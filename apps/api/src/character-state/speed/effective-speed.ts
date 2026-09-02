import type { TraceStep } from "@dnd/shared";

// Tarea 2A.12 — la velocidad efectiva. **Puro**: sin Nest, sin Prisma, sin HTTP. Entra un pie
// de velocidad base (el que da `deriveCharacter().speeds`, para el tipo de movimiento que sea:
// caminar, nadar...) más las condiciones activas del personaje; sale `{ total, steps }`, con la
// misma forma de traza que usa el motor de derivación (`TraceStep`, `@dnd/shared`).
//
// **Cifras del SRD 5.1** (`docs/superpowers/specs/2026-09-02-distancias-y-movimiento-design.md`,
// §5): derribado, agarrado, apresado, paralizado, inconsciente, aturdido y petrificado dejan la
// velocidad en un valor fijo; el agotamiento tiene seis niveles acumulativos y solo dos de ellos
// tocan la velocidad (2: mitad; 5: cero). El resto de condiciones del SRD —cegado, encantado,
// ensordecido, asustado, incapacitado, invisible, envenenado— **no tocan la velocidad**, y una
// clave que el motor no reconoce (`"concentrándose en Bendición"`, por ejemplo) tampoco: se
// ignora aquí a propósito, porque esa clave se guarda y se enseña en otro sitio, no se calcula.

/** Lo que hace falta de una fila de `CharacterCondition` para este cálculo. */
export interface EffectiveSpeedCondition {
  key: string;
  /** Solo lo usa el agotamiento. */
  level?: number | null;
}

export interface EffectiveSpeedResult {
  total: number;
  steps: TraceStep[];
}

/** Las que dejan la velocidad exactamente en 0, sin más matices. */
const CONDICIONES_A_CERO = new Set([
  "grappled",
  "restrained",
  "paralyzed",
  "unconscious",
  "stunned",
  "petrified",
]);

/**
 * La velocidad efectiva de un tipo de movimiento, dada su base en pies y las condiciones
 * activas del personaje.
 *
 * **La condición que deja la velocidad a 0 gana; dos mitades NO se multiplican.** Estar
 * derribado y agotado nivel 2 a la vez sigue siendo la mitad de la base, nunca un cuarto — el
 * SRD no compone reducciones de movimiento, y un modelo que las multiplicara inventaría una
 * regla que no existe. Por eso el cálculo separa las causas en dos cubos (a cero, a mitad) y
 * decide con el cubo, no sumando cada condición por turno.
 *
 * **La traza nombra TODAS las causas**, no solo la primera: un jugador derribado y con
 * agotamiento nivel 5 a la vez necesita ver las dos razones por las que su velocidad es 0, no
 * solo la que el código encontró antes.
 */
export function effectiveSpeed(
  baseFeet: number,
  conditions: EffectiveSpeedCondition[],
): EffectiveSpeedResult {
  const steps: TraceStep[] = [
    {
      op: "base",
      amount: baseFeet,
      sourceType: "base",
      sourceKey: "speed",
      labelKey: "speed.base",
    },
  ];

  const causasACero: string[] = [];
  const causasAMitad: string[] = [];

  for (const condition of conditions) {
    if (CONDICIONES_A_CERO.has(condition.key)) {
      causasACero.push(condition.key);
      continue;
    }
    if (condition.key === "prone") {
      // Derribado no fija un número por sí mismo: solo permite arrastrarse, al doble de coste
      // por pie (spec §5), que en un cálculo sin mapa se lee como "la mitad de distancia por
      // el mismo movimiento disponible" — el mismo efecto numérico que agotamiento nivel 2.
      causasAMitad.push(condition.key);
      continue;
    }
    if (condition.key === "exhaustion") {
      const nivel = condition.level ?? 0;
      if (nivel >= 5) causasACero.push(`exhaustion:${nivel}`);
      else if (nivel >= 2) causasAMitad.push(`exhaustion:${nivel}`);
      // Niveles 1, 3 y 4 no tocan la velocidad (spec §5): no se anota nada por ellos.
      continue;
    }
    // Cualquier otra clave —de las quince del SRD sin efecto en movimiento, o una clave libre
    // que el motor no conoce— no calcula nada aquí. Es la regla explícita del diseño.
  }

  // **La traza tiene que poder sumarse.** Es la invariante que mantiene el motor de derivacion
  // (`rules/engine.ts`): un `override` guarda el DELTA hasta el nuevo valor, no el valor. La
  // primera version repetia `-baseFeet` por cada causa, asi que con dos condiciones a cero los
  // pasos sumaban `base - 2 x base` — un numero negativo donde la hoja dice 0. Ahora **la
  // primera causa lleva el delta y las demas llevan 0**: siguen nombradas, que es lo que se
  // pedia, pero ya no mueven un total que no vuelven a mover.
  if (causasACero.length > 0) {
    causasACero.forEach((causa, i) => {
      steps.push({
        op: "override",
        amount: i === 0 ? -baseFeet : 0,
        sourceType: "manual",
        sourceKey: causa,
        labelKey: "speed.condition.zero",
      });
    });
    return { total: 0, steps };
  }

  if (causasAMitad.length > 0) {
    const mitad = Math.floor(baseFeet / 2);
    causasAMitad.forEach((causa, i) => {
      steps.push({
        op: "cap",
        amount: i === 0 ? mitad - baseFeet : 0,
        sourceType: "manual",
        sourceKey: causa,
        labelKey: "speed.condition.half",
      });
    });
    return { total: mitad, steps };
  }

  return { total: baseFeet, steps };
}
