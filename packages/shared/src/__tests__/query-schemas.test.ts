import { describe, expect, it } from "vitest";
import { listTracesQuerySchema, levelUpPreviewQuerySchema } from "../index";

// Task 7: los dos esquemas de consulta viven en @dnd/shared, que es la fuente única del
// contrato — no en apps/api, donde estaban antes.
//
// Revisión (ronda 1): se importa desde el barrel (`../index`, lo mismo que `import { X } from
// "@dnd/shared"` resuelve dentro del monorepo) y no desde el módulo interno de cada uno, para
// que el RED cubra también un olvido de `export * from` en `index.ts` — no solo que el fichero
// exista.

describe("listTracesQuerySchema", () => {
  it("acepta un caso bueno, con el límite por defecto", () => {
    expect(listTracesQuerySchema.parse({})).toEqual({ limit: 50 });
  });

  it("rechaza un límite fuera de rango", () => {
    expect(() => listTracesQuerySchema.parse({ limit: 500 })).toThrow();
  });
});

describe("levelUpPreviewQuerySchema", () => {
  // No hay caso malo que probar aquí: `roll` es `z.coerce.boolean().optional()` en un objeto
  // no-strict, y `z.coerce.boolean()` nunca lanza — cualquier valor que no sea `undefined` se
  // coacciona a un booleano (incluida una cadena vacía, que da `false`); no existe una entrada
  // que este campo, solo, pueda rechazar.
  it("acepta un caso bueno", () => {
    expect(levelUpPreviewQuerySchema.parse({ roll: "true" })).toEqual({ roll: true });
  });

  it("acepta la ausencia de roll", () => {
    expect(levelUpPreviewQuerySchema.parse({})).toEqual({});
  });
});
