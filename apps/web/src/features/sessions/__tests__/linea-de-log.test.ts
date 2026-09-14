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
