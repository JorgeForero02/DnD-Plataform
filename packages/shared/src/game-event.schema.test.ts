import { describe, expect, it } from "vitest";
import { gameEventPayloadSchema } from "./index";

// Capa 1 de `docs/08-pruebas.md`: la forma del suceso, antes de que exista el endpoint.
// Tarea 2.5.1 — `damageType` en `HP_CHANGED` tiene que ser opcional, o todo el historial ya
// escrito (sin tipo de daño) dejaría de validar de un día para otro.

const hpChangedBase = {
  type: "HP_CHANGED" as const,
  delta: -7,
  from: 20,
  to: 13,
};

describe("gameEventPayloadSchema — HP_CHANGED con damageType", () => {
  it("acepta el payload de siempre, sin damageType", () => {
    const r = gameEventPayloadSchema.safeParse(hpChangedBase);
    expect(r.success).toBe(true);
  });

  it("acepta damageType cuando viene con el delta", () => {
    const r = gameEventPayloadSchema.safeParse({ ...hpChangedBase, damageType: "BLUDGEONING" });
    expect(r.success).toBe(true);
    if (r.success && r.data.type === "HP_CHANGED") {
      expect(r.data.damageType).toBe("BLUDGEONING");
    }
  });

  it("rechaza un damageType que no es de los trece del SRD", () => {
    const r = gameEventPayloadSchema.safeParse({ ...hpChangedBase, damageType: "MAGIC" });
    expect(r.success).toBe(false);
  });
});
