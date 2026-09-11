import { describe, expect, it } from "vitest";
import {
  closeSessionSchema,
  createSessionSchema,
  stampSessionNoteSchema,
  updateSessionSchema,
} from "../session.schema";

// Task 5: un sello sin texto de verdad ("" o solo espacios) no es una nota — el sello sin texto
// (campo ausente) sigue siendo legítimo, así que `undefined` debe seguir aceptándose.

describe("stampSessionNoteSchema", () => {
  it("rechaza el texto vacío", () => {
    expect(() => stampSessionNoteSchema.parse({ kind: "NOTE", text: "" })).toThrow();
  });

  it("rechaza el texto que es solo espacios", () => {
    expect(() => stampSessionNoteSchema.parse({ kind: "NOTE", text: "   " })).toThrow();
  });

  it("acepta el sello sin texto (campo ausente)", () => {
    expect(() => stampSessionNoteSchema.parse({ kind: "NOTE" })).not.toThrow();
  });

  it("acepta un texto real", () => {
    const parsed = stampSessionNoteSchema.parse({ kind: "NOTE", text: "Kellan llega tarde" });
    expect(parsed.text).toBe("Kellan llega tarde");
  });
});

// Task 27 (P3) — `Session` no tiene `grants`, así que `SPECIFIC_PLAYERS` es inerte de verdad: el
// nivel dice «solo quienes elijas abajo» y no hay dónde elegir a nadie. Y `sessions.service.ts`
// pasa `createdById: ""` al escribir, así que `OWNER_DM` («tú y quien lo creó») compara ese ""
// contra el `userId` de cualquier espectador y da `false` siempre — produce exactamente el mismo
// conjunto de espectadores que `DM_ONLY` (solo el DM) mientras su nombre promete un creador que
// no existe. Los dos son el mismo placebo, y los dos se excluyen.
describe("createSessionSchema — visibilidad", () => {
  it("rechaza SPECIFIC_PLAYERS", () => {
    expect(() =>
      createSessionSchema.parse({ title: "x", visibility: "SPECIFIC_PLAYERS" }),
    ).toThrow();
  });

  it("rechaza OWNER_DM", () => {
    expect(() => createSessionSchema.parse({ title: "x", visibility: "OWNER_DM" })).toThrow();
  });

  it("acepta PUBLIC, PLAYERS y DM_ONLY", () => {
    for (const visibility of ["PUBLIC", "PLAYERS", "DM_ONLY"] as const) {
      expect(() => createSessionSchema.parse({ title: "x", visibility })).not.toThrow();
    }
  });

  it("sigue por defecto en PLAYERS sin decir nada", () => {
    expect(createSessionSchema.parse({ title: "x" }).visibility).toBe("PLAYERS");
  });
});

describe("updateSessionSchema — visibilidad", () => {
  it("rechaza SPECIFIC_PLAYERS y OWNER_DM igual que al crear", () => {
    expect(() => updateSessionSchema.parse({ visibility: "SPECIFIC_PLAYERS" })).toThrow();
    expect(() => updateSessionSchema.parse({ visibility: "OWNER_DM" })).toThrow();
  });
});

// Task 27 (P3, ronda del orquestador) — el mismo defecto, un campo más allá: la crónica de
// cierre también se publica con un nivel de `Visibility`, y `recapVisibility` seguía aceptando
// los dos niveles inertes aunque `visibility` (la de la sesión) ya no los aceptara.
describe("closeSessionSchema — recapVisibility", () => {
  it("rechaza SPECIFIC_PLAYERS", () => {
    expect(() => closeSessionSchema.parse({ recapVisibility: "SPECIFIC_PLAYERS" })).toThrow();
  });

  it("rechaza OWNER_DM", () => {
    expect(() => closeSessionSchema.parse({ recapVisibility: "OWNER_DM" })).toThrow();
  });

  it("acepta PUBLIC, PLAYERS y DM_ONLY, y por defecto sigue en PLAYERS", () => {
    for (const recapVisibility of ["PUBLIC", "PLAYERS", "DM_ONLY"] as const) {
      expect(() => closeSessionSchema.parse({ recapVisibility })).not.toThrow();
    }
    expect(closeSessionSchema.parse({}).recapVisibility).toBe("PLAYERS");
  });
});
