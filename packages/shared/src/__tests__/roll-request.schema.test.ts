import { describe, expect, it } from "vitest";
import { createRollRequestSchema, pendingSaveEffectSchema } from "../roll-request.schema";

// Puerta de efectos §4.2/§6: `pendingSaveEffect` es lo que viaja dentro de una `RollRequest`
// mientras nadie ha respondido, y NO es una clave del esquema público de crear una petición.

describe("pendingSaveEffect", () => {
  it("acepta el daño ya tirado con signo −1 y siSalva", () => {
    expect(
      pendingSaveEffectSchema.parse({
        amount: 28,
        signo: -1,
        tipoDeDano: "FIRE",
        siSalva: "mitad",
        actividadKey: "fireball",
        actorCharacterId: "a",
      }).amount,
    ).toBe(28);
  });

  it("el esquema PÚBLICO de crear no acepta pendingEffect (spec §6)", () => {
    const r = createRollRequestSchema.strict().safeParse({
      characterIds: ["clk1234567890abcdefghijk"],
      key: "save.dex",
      label: "S",
      pendingEffect: {
        amount: 1,
        signo: -1,
        siSalva: "ninguno",
        actividadKey: "x",
        actorCharacterId: "a",
      },
    });
    expect(r.success).toBe(false);
  });
});
