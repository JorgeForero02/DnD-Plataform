import { describe, expect, it } from "vitest";
import { applyConditionSchema } from "../character-state.schema";

// Puerta de efectos, tarea 4 (2026-09-13) — «hasta el próximo descanso». SRD 5.1, *Resting*:
// docenas de condiciones y efectos usan «until you finish a short or long rest» o «until you
// finish a long rest» como duración literal, y eso no es un número de segundos: es un suceso que
// solo el propio descanso puede resolver.

describe("applyConditionSchema — expiresOnRest", () => {
  it("una condición con expiresOnRest: LONG parsea, sin durationSeconds", () => {
    const resultado = applyConditionSchema.parse({ key: "poisoned", expiresOnRest: "LONG" });
    expect(resultado.expiresOnRest).toBe("LONG");
    expect(resultado.durationSeconds).toBeUndefined();
  });

  it("una condición con expiresOnRest: SHORT también parsea", () => {
    const resultado = applyConditionSchema.parse({ key: "poisoned", expiresOnRest: "SHORT" });
    expect(resultado.expiresOnRest).toBe("SHORT");
  });

  it("durationSeconds y expiresOnRest a la vez se rechazan: una condición dura por reloj o por descanso, no las dos", () => {
    expect(() =>
      applyConditionSchema.parse({ key: "poisoned", durationSeconds: 60, expiresOnRest: "LONG" }),
    ).toThrow("Una condición dura por reloj o hasta un descanso, no las dos.");
  });

  it("sin ninguno de los dos, la condición sigue siendo indefinida", () => {
    const resultado = applyConditionSchema.parse({ key: "poisoned" });
    expect(resultado.expiresOnRest).toBeUndefined();
    expect(resultado.durationSeconds).toBeUndefined();
  });

  it("un valor fuera del vocabulario cerrado {SHORT, LONG} se rechaza", () => {
    expect(() =>
      applyConditionSchema.parse({ key: "poisoned", expiresOnRest: "MEDIUM" }),
    ).toThrow();
  });
});
