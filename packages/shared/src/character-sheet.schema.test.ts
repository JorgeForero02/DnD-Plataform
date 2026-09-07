import { describe, expect, it } from "vitest";
import { changeHpSchema, updateCharacterSheetSchema } from "./index";

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

// Tarea 2.5.4 — `rollEventId`: de qué tirada sale el daño.
describe("changeHpSchema — rollEventId", () => {
  it("acepta el cuerpo de siempre, sin rollEventId", () => {
    const r = changeHpSchema.safeParse({ delta: -5 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.rollEventId).toBeUndefined();
  });

  it("acepta un rollEventId junto al delta y al damageType", () => {
    const r = changeHpSchema.safeParse({ delta: -12, damageType: "FIRE", rollEventId: "ev1" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.rollEventId).toBe("ev1");
  });

  it("rechaza un rollEventId vacío: una cadena vacía no es un identificador", () => {
    const r = changeHpSchema.safeParse({ delta: -5, rollEventId: "" });
    expect(r.success).toBe(false);
  });
});

// Encargo A8 (2026-09-07) — `subclass` en el cuerpo de "escribir la hoja". Mismo trato que
// `subrace`: opcional (una hoja sin ella sigue validando) y nulable (así se limpia una elección).
describe("updateCharacterSheetSchema — subclass", () => {
  it("acepta el cuerpo de siempre, sin subclass", () => {
    const r = updateCharacterSheetSchema.safeParse({ level: 3 });
    expect(r.success).toBe(true);
  });

  it("acepta una referencia SRD", () => {
    const r = updateCharacterSheetSchema.safeParse({
      subclass: { source: "SRD", key: "berserker" },
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.subclass).toEqual({ source: "SRD", key: "berserker" });
  });

  it("acepta null para limpiar la elección", () => {
    const r = updateCharacterSheetSchema.safeParse({ subclass: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.subclass).toBeNull();
  });
});
