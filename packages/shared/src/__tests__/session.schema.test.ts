import { describe, expect, it } from "vitest";
import { stampSessionNoteSchema } from "../session.schema";

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
