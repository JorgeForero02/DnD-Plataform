import { describe, expect, it } from "vitest";
import {
  changeHpSchema,
  normalizeOverride,
  overridesSchema,
  updateCharacterSheetSchema,
} from "./index";

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

// Ticket J7 (2026-09-11) — el motivo del DM llega a la traza. `overridesSchema` pasa de
// `Record<clave, number>` a `Record<clave, number | { value, reason? }>`, **unión sin
// migración**: las filas viejas se quedan como números y nunca se reescriben; lo único nuevo es
// que la forma admite el objeto también. `normalizeOverride` es el único sitio que decide cuál
// de las dos formas tiene delante — API y web lo importan de aquí, ninguno reimplementa el
// `typeof`.
describe("overridesSchema — unión number | { value, reason? }", () => {
  it("sigue aceptando el número de siempre (filas ya guardadas, nunca migradas)", () => {
    const r = overridesSchema.safeParse({ ac: 18 });
    expect(r.success).toBe(true);
  });

  it("acepta el objeto con motivo", () => {
    const r = overridesSchema.safeParse({ ac: { value: 18, reason: "El DM lo dice" } });
    expect(r.success).toBe(true);
  });

  it("acepta el objeto sin motivo: el motivo es opcional, como en setOverrideSchema", () => {
    const r = overridesSchema.safeParse({ ac: { value: 18 } });
    expect(r.success).toBe(true);
  });

  it("rechaza un motivo de más de 280 caracteres, igual que setOverrideSchema", () => {
    const r = overridesSchema.safeParse({ ac: { value: 18, reason: "x".repeat(281) } });
    expect(r.success).toBe(false);
  });
});

describe("normalizeOverride", () => {
  it("un número legado se normaliza a { value }", () => {
    expect(normalizeOverride(18)).toEqual({ value: 18 });
  });

  it("un objeto ya normalizado se devuelve tal cual", () => {
    expect(normalizeOverride({ value: 18, reason: "El DM lo dice" })).toEqual({
      value: 18,
      reason: "El DM lo dice",
    });
  });

  it("un objeto sin motivo se devuelve tal cual, sin inventar uno", () => {
    expect(normalizeOverride({ value: 18 })).toEqual({ value: 18 });
  });
});
