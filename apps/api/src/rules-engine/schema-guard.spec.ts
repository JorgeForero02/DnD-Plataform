import { readFileSync } from "fs";
import { join } from "path";
import { ruleModeSchema, ruleStatusSchema, ruleTraceStatusSchema } from "@dnd/shared";

// Tarea 2A.16 — mismo guardián que ya existe para `GameEventType`
// (`apps/api/src/game-events/game-events.service.spec.ts`), repetido aquí para los tres enums
// de Prisma del motor de reglas. Dos copias del mismo conjunto de valores, una en Zod y otra en
// `schema.prisma`, es exactamente la deriva que este proyecto evita a propósito — y hoy este
// guardián se puso en rojo solo una vez (faltaba `RuleTraceStatus` en `@dnd/shared`), lo que
// confirma que merece la pena.

const schema = readFileSync(join(__dirname, "..", "..", "prisma", "schema.prisma"), "utf8");

function enumValuesInPrisma(enumName: string): string[] {
  const block = new RegExp(`enum ${enumName} \\{([^}]*)\\}`).exec(schema);
  expect(block).not.toBeNull();
  return (block![1].match(/^\s*([A-Za-z_]+)\s*$/gm) ?? []).map((l) => l.trim());
}

describe("los enums de Prisma del motor de reglas y las uniones de Zod no se separan", () => {
  it("RuleMode: mismos valores en schema.prisma y en ruleModeSchema", () => {
    expect(enumValuesInPrisma("RuleMode").sort()).toEqual([...ruleModeSchema.options].sort());
  });

  it("RuleStatus: mismos valores en schema.prisma y en ruleStatusSchema", () => {
    expect(enumValuesInPrisma("RuleStatus").sort()).toEqual([...ruleStatusSchema.options].sort());
  });

  it("RuleTraceStatus: mismos valores en schema.prisma y en ruleTraceStatusSchema", () => {
    expect(enumValuesInPrisma("RuleTraceStatus").sort()).toEqual(
      [...ruleTraceStatusSchema.options].sort(),
    );
  });
});
