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
