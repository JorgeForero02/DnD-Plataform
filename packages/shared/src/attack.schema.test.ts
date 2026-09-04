import { describe, expect, it } from "vitest";
import { attackVerdictSchema, resolveAttackSchema } from "./index";

// Capa 1 de `docs/08-pruebas.md`: que un cuerpo inválido se rechaza **antes** de que exista el
// endpoint. Comparar con la CA y decidir el veredicto vive en el servicio (2.5.3).

describe("resolveAttackSchema", () => {
  it("acepta solo el objetivo, con NORMAL por defecto", () => {
    const r = resolveAttackSchema.parse({ targetCharacterId: "clx000000000000000000001" });
    expect(r.mode).toBe("NORMAL");
    expect(r.audience).toBeUndefined();
  });

  it("acepta modo y audiencia explícitos", () => {
    const r = resolveAttackSchema.parse({
      targetCharacterId: "clx000000000000000000001",
      mode: "ADVANTAGE",
      audience: "DM_PRIVATE",
    });
    expect(r.mode).toBe("ADVANTAGE");
    expect(r.audience).toBe("DM_PRIVATE");
  });

  it("rechaza un objetivo que no es un cuid", () => {
    const r = resolveAttackSchema.safeParse({ targetCharacterId: "no-es-un-cuid" });
    expect(r.success).toBe(false);
  });

  it("rechaza un cuerpo sin objetivo", () => {
    const r = resolveAttackSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("no acepta un `critical` a mano — ficha R2C-2: eso lo decide la tirada, no quien la pide", () => {
    const r = resolveAttackSchema.parse({
      targetCharacterId: "clx000000000000000000001",
      critical: true,
    } as unknown as { targetCharacterId: string });
    expect(r).not.toHaveProperty("critical");
  });
});

describe("attackVerdictSchema", () => {
  it("acepta los tres estados cerrados", () => {
    for (const v of ["HIT", "MISS", "CRITICAL"]) {
      expect(attackVerdictSchema.safeParse(v).success).toBe(true);
    }
  });

  it("rechaza cualquier otra palabra, incluida la CA disfrazada de veredicto", () => {
    expect(attackVerdictSchema.safeParse("AC_18").success).toBe(false);
  });
});
