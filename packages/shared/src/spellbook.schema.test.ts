import { describe, expect, it } from "vitest";
import { setCharacterSpellSchema } from "./spellbook.schema";

// Tarea 2 de 3A.2 (Task 2, brief) — el cuerpo de `PUT …/spellbook/:spellKey`. `estado: null`
// quita el conjuro de la lista; un valor fuera de los tres estados no significa nada.

describe("setCharacterSpellSchema", () => {
  it("acepta un estado del vocabulario cerrado", () => {
    const r = setCharacterSpellSchema.safeParse({ estado: "PREPARADO" });
    expect(r.success).toBe(true);
  });

  it("acepta null: quitar el conjuro de la lista", () => {
    const r = setCharacterSpellSchema.safeParse({ estado: null });
    expect(r.success).toBe(true);
  });

  it("rechaza un valor que no es de los tres estados", () => {
    const r = setCharacterSpellSchema.safeParse({ estado: "LISTO" });
    expect(r.success).toBe(false);
  });
});
