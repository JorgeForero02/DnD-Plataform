import { describe, expect, it } from "vitest";
import { lineaDeLog } from "../linea-de-log";

// PNJ del mundo y la mesa (spec §3.2, Task 1). `reveal` escribe NPC_REVEALED con o sin
// `entityName` según si además subió la ficha del mundo; `hide` escribe NPC_HIDDEN.

describe("NPC_REVEALED y NPC_HIDDEN tienen frase", () => {
  it("NPC_REVEALED y NPC_HIDDEN tienen frase", () => {
    expect(
      lineaDeLog({ type: "NPC_REVEALED", characterName: "Bandido", entityName: "Garrik" }),
    ).toBe("Bandido entra en escena — es Garrik");
    expect(
      lineaDeLog({ type: "NPC_REVEALED", characterName: "Garrik", entityName: "Garrik" }),
    ).toBe("Garrik entra en escena");
    expect(lineaDeLog({ type: "NPC_HIDDEN", characterName: "Bandido" })).toBe(
      "Bandido se oculta de la mesa",
    );
  });

  // m6 (ola de cierre, 2026-09-14): si SOLO subió la plantilla —criatura y ficha del mundo ya
  // visibles—, «entra en escena» anunciaría la llegada de alguien que ya estaba.
  it("con SOLO `templateRevealed`, dice que se enseñan sus números — no que entra en escena", () => {
    expect(
      lineaDeLog({
        type: "NPC_REVEALED",
        characterName: "Bandido",
        templateRevealed: true,
        characterRevealed: false,
        entityRevealed: false,
      }),
    ).toBe("Se enseñan los números de Bandido");
  });

  // Los sucesos que sí suben la instancia (`characterRevealed` ausente o `true`, o los que
  // escribe `raiseLiveBodies` por cada cuerpo vivo, que nunca manda estos dos campos) se siguen
  // leyendo como la entrada de verdad, con o sin `templateRevealed`.
  it("con `templateRevealed` Y la instancia también subiendo, sigue siendo una entrada en escena", () => {
    expect(
      lineaDeLog({
        type: "NPC_REVEALED",
        characterName: "Bandido",
        templateRevealed: true,
        characterRevealed: true,
      }),
    ).toBe("Bandido entra en escena");
  });

  it("sin `characterRevealed`/`entityRevealed` (sucesos viejos, o los de `raiseLiveBodies`), sigue leyéndose como entrada", () => {
    expect(
      lineaDeLog({ type: "NPC_REVEALED", characterName: "Bandido", templateRevealed: true }),
    ).toBe("Bandido entra en escena");
  });
});

// PNJ del mundo y la mesa (spec §3.3, Task 2). `removeCombatant` escribe COMBATANT_LEFT con
// `characterName` solo si el personaje es visible para la mesa en ese momento (E-PM-6).
describe("COMBATANT_LEFT tiene frase", () => {
  it("COMBATANT_LEFT tiene frase, con y sin nombre", () => {
    expect(lineaDeLog({ type: "COMBATANT_LEFT", encounterId: "e1", characterName: "Garrik" })).toBe(
      "Garrik sale del combate",
    );
    expect(lineaDeLog({ type: "COMBATANT_LEFT", encounterId: "e1" })).toBe(
      "Alguien sale del combate",
    );
  });
});

// Revisión final del pulido (2026-09-13), ítem #5 — **la frase con sujeto resuelto perdía el
// `(from → to)`** que sí lleva la frase sin sujeto: se sabía CUÁNTO cambió pero no el rastro
// completo del cambio. Las dos ramas de `HP_CHANGED` cuentan ahora la misma verdad, con el
// número dentro.
describe("HP_CHANGED con sujeto conserva el (from → to)", () => {
  it("con sujeto resuelto la frase conserva el (from → to)", () => {
    const frase = lineaDeLog(
      { type: "HP_CHANGED", from: 20, to: 13, delta: -7 },
      { sujeto: "Sylas", sujetoEnCabecera: false },
    );
    expect(frase).toBe("Sylas pierde 7 PG (20 → 13)");
  });
});
