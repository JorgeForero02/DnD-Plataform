import type { RollMode } from "@dnd/shared";

// D-OP-13 (2026-09-05) — **cómo tira quien ATACA a alguien que tiene condiciones.**
//
// Vive aquí y no en `suggested-roll-mode.ts` a propósito, y ese fichero ya lo decía antes de que
// esto existiera: aquel responde «¿cómo tiro YO?» y deja fuera, con todas las letras, las reglas
// que hablan de *«Attack rolls **against** the creature»*. Son dos preguntas distintas hechas por
// dos personas distintas, y quien ataca no tiene por qué estar mirando la hoja del atacado — por
// eso esto se aplica **en el camino del ataque**, que desde 2.5.3 conoce al objetivo.
//
// ## Las citas, del SRD 5.1, verificadas en INGLÉS contra `dnd5eapi.co` el 2026-09-05
//
// | Condición del objetivo | Cita literal | Para quien ataca |
// |---|---|---|
// | `blinded` | *"Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage."* | **ventaja** |
// | `paralyzed` | *"Attack rolls against the creature have advantage."* | **ventaja** |
// | `petrified` | *"Attack rolls against the creature have advantage."* | **ventaja** |
// | `restrained` | *"Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage."* | **ventaja** |
// | `stunned` | *"Attack rolls against the creature have advantage."* | **ventaja** |
// | `unconscious` | *"Attack rolls against the creature have advantage."* | **ventaja** |
// | `invisible` | *"Attack rolls against the creature have disadvantage, and the creature's attack rolls have advantage."* | **desventaja** |
//
// ## Las dos reglas que se dejan fuera, y por qué
//
//  · **`prone` no entra**: *"An attack roll against the creature has advantage if the attacker is
//    within 5 feet of the creature. Otherwise, the attack roll has disadvantage."* Depende de **la
//    distancia**, y hasta la fase 3 no hay tablero: aquí nadie sabe a cuántos pies está nadie.
//    Elegir una de las dos mitades sería inventarse la mitad de las veces, que es exactamente el
//    criterio con el que `suggested-roll-mode.ts` deja fuera el fallo automático del ciego.
//  · **El crítico automático de `paralyzed` y `unconscious`** (*"Any attack that hits the creature
//    is a critical hit if the attacker is within 5 feet"*) tampoco entra, por lo mismo.
//
// **Ventaja y desventaja se anulan y no se acumulan** (SRD 5.1: *"If circumstances cause a roll to
// have both advantage and disadvantage, you are considered to have neither of them"*), así que esto
// mira **si hay** causas de cada signo y no cuántas.

/** Lo mínimo de una condición viva para este cálculo. Quien llama ya filtró las vencidas. */
export interface CondicionDelObjetivo {
  key: string;
}

/** Las que dan **ventaja** a quien ataca, sin depender de la distancia. */
const VENTAJA_CONTRA = new Set([
  "blinded",
  "paralyzed",
  "petrified",
  "restrained",
  "stunned",
  "unconscious",
]);

/** La única que da **desventaja** a quien ataca. */
const DESVENTAJA_CONTRA = new Set(["invisible"]);

/** Qué añade el estado del OBJETIVO a la tirada de quien le ataca. */
export type EfectoContraObjetivo = "ADVANTAGE" | "DISADVANTAGE" | "NONE";

export interface ModoContraObjetivo {
  effect: EfectoContraObjetivo;
  /** Las condiciones del objetivo que lo causan, para que la traza pueda decir por qué. */
  reasons: { effect: "ADVANTAGE" | "DISADVANTAGE"; sourceKey: string }[];
}

export function modoContraObjetivo(condiciones: CondicionDelObjetivo[]): ModoContraObjetivo {
  const reasons: ModoContraObjetivo["reasons"] = [];
  for (const condicion of condiciones) {
    if (VENTAJA_CONTRA.has(condicion.key)) {
      reasons.push({ effect: "ADVANTAGE", sourceKey: condicion.key });
    } else if (DESVENTAJA_CONTRA.has(condicion.key)) {
      reasons.push({ effect: "DISADVANTAGE", sourceKey: condicion.key });
    }
  }
  const hayVentaja = reasons.some((r) => r.effect === "ADVANTAGE");
  const hayDesventaja = reasons.some((r) => r.effect === "DISADVANTAGE");
  const effect: EfectoContraObjetivo =
    hayVentaja && hayDesventaja
      ? "NONE"
      : hayVentaja
        ? "ADVANTAGE"
        : hayDesventaja
          ? "DISADVANTAGE"
          : "NONE";
  return { effect, reasons };
}

/**
 * **Junta lo que pide quien tira con lo que impone el objetivo**, con la regla del SRD y no con una
 * suma.
 *
 * *"If circumstances cause a roll to have both advantage and disadvantage, you are considered to
 * have neither of them, and you roll one d20."* Por eso dos causas del mismo signo siguen dando una
 * sola ventaja, y una de cada signo da **normal** — nunca «gana la que había primero» ni un recuento
 * de mayorías, que es una regla que la 5.ª edición no tiene.
 */
export function combinarModo(pedido: RollMode, delObjetivo: EfectoContraObjetivo): RollMode {
  if (delObjetivo === "NONE") return pedido;
  if (pedido === "NORMAL") return delObjetivo;
  return pedido === delObjetivo ? pedido : "NORMAL";
}
