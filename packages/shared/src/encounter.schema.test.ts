import { describe, expect, it } from "vitest";
import { setInitiativeSchema, startEncounterSchema } from "./index";

// Capa 1 de `docs/08-pruebas.md`: que un cuerpo inválido se rechaza **antes** de que exista el
// endpoint. El agrupamiento (mismo `statblockRef`) y el orden viven en el servicio.

describe("startEncounterSchema", () => {
  it("acepta una lista de personajes", () => {
    const r = startEncounterSchema.parse({ characterIds: ["clx000000000000000000001"] });
    expect(r.characterIds).toHaveLength(1);
  });

  it("rechaza una lista vacía: un encuentro sin combatientes no es un encuentro", () => {
    const r = startEncounterSchema.safeParse({ characterIds: [] });
    expect(r.success).toBe(false);
  });

  it("rechaza un id que no es un cuid", () => {
    const r = startEncounterSchema.safeParse({ characterIds: ["no-es-un-cuid"] });
    expect(r.success).toBe(false);
  });

  it("rechaza más de cincuenta combatientes", () => {
    const idsDeSobra = Array.from({ length: 51 }, (_, i) => `clx${String(i).padStart(22, "0")}`);
    const r = startEncounterSchema.safeParse({ characterIds: idsDeSobra });
    expect(r.success).toBe(false);
  });
});

describe("setInitiativeSchema", () => {
  it("acepta un número entero, negativo incluido (un −2 de penalización es legítimo)", () => {
    const r = setInitiativeSchema.parse({ initiative: -2 });
    expect(r.initiative).toBe(-2);
  });

  it("rechaza un número no entero", () => {
    const r = setInitiativeSchema.safeParse({ initiative: 3.5 });
    expect(r.success).toBe(false);
  });

  it("rechaza un cuerpo sin `initiative`", () => {
    const r = setInitiativeSchema.safeParse({});
    expect(r.success).toBe(false);
  });
});
