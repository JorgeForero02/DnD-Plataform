import { describe, expect, it } from "vitest";
import { changeHpSchema } from "./index";

// Capa 1 de `docs/08-pruebas.md`. Tarea 2.5.1 — `damageType` en el cuerpo de "aplicar un
// delta de PG" es opcional: el camino de siempre (una curación, un golpe sin tipo declarado)
// no puede dejar de validar.

describe("changeHpSchema — damageType", () => {
  it("acepta el cuerpo de siempre, sin damageType", () => {
    const r = changeHpSchema.safeParse({ delta: -5 });
    expect(r.success).toBe(true);
  });

  it("acepta un damageType de los trece del SRD", () => {
    const r = changeHpSchema.safeParse({ delta: -7, damageType: "NECROTIC" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.damageType).toBe("NECROTIC");
  });

  it("rechaza un damageType que no está en la lista cerrada", () => {
    const r = changeHpSchema.safeParse({ delta: -7, damageType: "HOLY" });
    expect(r.success).toBe(false);
  });
});
