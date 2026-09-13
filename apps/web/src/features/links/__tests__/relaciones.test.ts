import { describe, it, expect } from "vitest";
import {
  RELACIONES,
  ROTULOS_DE_JERARQUIA,
  esRotuloDeJerarquia,
  lecturaEntrante,
  lecturaSaliente,
  relacionesSugeridas,
} from "../relaciones";

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

  // El defecto que motivó esto: el sujeto de `hacia` no estaba declarado, y tres filas lo tenían
  // puesto en la ficha DE ENFRENTE («vive aquí», «se encuentra aquí», «la encarga») mientras las
  // otras quince lo tenían en la ficha abierta («está liderada por», «fue escenario de»). El
  // panel las compone todas igual —«[esta ficha] [hacia] [la otra]»—, así que las tres salían al
  // revés: «la Torre Gris vive aquí Corvin». La marca del error es la palabra «aquí» dentro del
  // predicado: solo aparece si el sujeto es la otra ficha.
  it("el sujeto de la lectura inversa es siempre la ficha abierta", () => {
    for (const r of RELACIONES) {
      // `\b` no sirve de cierre aquí: para una expresión regular de JavaScript la «í» no es un
      // carácter de palabra, así que /\baquí\b/ **no** casa con «vive aquí». El primer intento
      // de esta prueba usaba justo eso y pasaba con el defecto delante; se compara la palabra.
      expect(r.hacia.toLowerCase().split(/[\s.,;]+/), `«${r.desde}» → «${r.hacia}»`).not.toContain(
        "aquí",
      );
    }
    expect(RELACIONES.find((r) => r.desde === "vive en")?.hacia).toBe("es el hogar de");
    expect(RELACIONES.find((r) => r.desde === "se encuentra en")?.hacia).toBe("alberga");
    expect(RELACIONES.find((r) => r.desde === "encarga")?.hacia).toBe("está encargada por");
  });

  it("un enlace saliente se lee con su propia etiqueta", () => {
    expect(lecturaSaliente("vive en")).toEqual({ relacion: "vive en" });
    expect(lecturaSaliente("  vive en  ")).toEqual({ relacion: "vive en" });
  });

  it("invierte una etiqueta conocida que llega de fuera", () => {
    expect(lecturaEntrante("vive en")).toEqual({ relacion: "es el hogar de" });
    // Se guardó con otra caja o con espacios: sigue siendo la misma relación.
    expect(lecturaEntrante("  Vive En ")).toEqual({ relacion: "es el hogar de" });
  });

  it("no se inventa la inversa de una etiqueta libre: la cita tal cual", () => {
    // Adivinar la inversa de una frase que nadie declaró sería mentir sobre el mundo del DM.
    expect(lecturaEntrante("le debe dinero a")).toEqual({
      relacion: "recibe un enlace de",
      literal: "le debe dinero a",
    });
  });

  it("sin etiqueta la frase sigue teniendo verbo, y no cita nada", () => {
    // Antes esto devolvía null y la fila se quedaba sin relación: «Torre Gris (Lugar)» y nada
    // más. Un enlace sin etiqueta sigue siendo un enlace, y hay que poder leerlo.
    expect(lecturaSaliente(null)).toEqual({ relacion: "enlaza con" });
    expect(lecturaSaliente("   ")).toEqual({ relacion: "enlaza con" });
    expect(lecturaEntrante(null)).toEqual({ relacion: "recibe un enlace de" });
    expect(lecturaEntrante("   ")).toEqual({ relacion: "recibe un enlace de" });
  });
});

// Task 14 bis (D-CF-64) — los rótulos que cuelgan una ficha de su padre en el desglose del mundo
// son un SUBCONJUNTO del catálogo: uno que no se pueda elegir desde el selector sería un padre
// que nadie puede poner a propósito.
describe("ROTULOS_DE_JERARQUIA", () => {
  it("cada rótulo de jerarquía existe como `desde` en RELACIONES", () => {
    const desdes = new Set(RELACIONES.map((r) => r.desde));
    for (const rotulo of ROTULOS_DE_JERARQUIA) expect(desdes.has(rotulo), rotulo).toBe(true);
    expect(ROTULOS_DE_JERARQUIA.length).toBeGreaterThan(0);
  });

  it("el árbol enseña contención: «custodia» es lateral y no cuelga nada (ronda 1, Task 14 bis)", () => {
    expect(ROTULOS_DE_JERARQUIA).not.toContain("custodia");
    expect(esRotuloDeJerarquia("custodia")).toBe(false);
  });

  it("esRotuloDeJerarquia ignora mayúsculas y espacios, y lo lateral no cuenta", () => {
    expect(esRotuloDeJerarquia("  Vive En ")).toBe(true);
    expect(esRotuloDeJerarquia("es aliado de")).toBe(false);
    expect(esRotuloDeJerarquia(null)).toBe(false);
    expect(esRotuloDeJerarquia("")).toBe(false);
  });
});
