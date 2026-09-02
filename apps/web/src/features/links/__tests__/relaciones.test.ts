import { describe, it, expect } from "vitest";
import { RELACIONES, etiquetaEntrante, relacionesSugeridas } from "../relaciones";

describe("relaciones", () => {
  it("sugiere según el par de tipos, no según uno solo", () => {
    const desdePnjALugar = relacionesSugeridas("NPC", "LOCATION").map((r) => r.desde);
    expect(desdePnjALugar).toContain("vive en");
    expect(desdePnjALugar).not.toContain("pertenece a"); // eso es de PNJ a facción

    expect(relacionesSugeridas("NPC", "FACTION").map((r) => r.desde)).toContain("pertenece a");
    expect(relacionesSugeridas("EVENT", "LOCATION").map((r) => r.desde)).toContain("ocurrió en");
  });

  it("cada par sugerido tiene su lectura inversa, y son frases distintas salvo las simétricas", () => {
    const simetricas = ["es aliado de", "es enemigo de"];
    for (const r of RELACIONES) {
      expect(r.desde.length).toBeGreaterThan(0);
      expect(r.hacia.length).toBeGreaterThan(0);
      if (!simetricas.includes(r.desde)) expect(r.hacia).not.toBe(r.desde);
    }
  });

  it("invierte una etiqueta conocida", () => {
    expect(etiquetaEntrante("vive en")).toBe("vive aquí");
    // Se guardó con otra caja o con espacios: sigue siendo la misma relación.
    expect(etiquetaEntrante("  Vive En ")).toBe("vive aquí");
  });

  it("no se inventa la inversa de una etiqueta libre: la cita tal cual", () => {
    // Adivinar la inversa de una frase que nadie declaró sería mentir sobre el mundo del DM.
    expect(etiquetaEntrante("le debe dinero a")).toBe("enlazado como «le debe dinero a»");
  });

  it("sin etiqueta no inventa texto", () => {
    expect(etiquetaEntrante(null)).toBeNull();
    expect(etiquetaEntrante("   ")).toBeNull();
  });
});
