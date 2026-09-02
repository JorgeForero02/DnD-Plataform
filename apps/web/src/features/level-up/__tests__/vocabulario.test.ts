import { describe, expect, it } from "vitest";
import {
  conSigno,
  dadosDeGolpe,
  frasesDeEspacios,
  nombreMetodoPg,
  nombreOrigenAptitud,
} from "../vocabulario";

// Tarea 2A.11 — las dos enumeraciones que trae el previo (`source` de una aptitud y `method` de
// los PG) tienen que estar todas traducidas, y una clave desconocida tiene que verse como tal.

describe("vocabulario de la subida de nivel", () => {
  it("traduce los dos orígenes de aptitud que el servidor puede emitir", () => {
    expect(nombreOrigenAptitud("class")).toBe("Clase");
    expect(nombreOrigenAptitud("subclass")).toBe("Subclase");
  });

  it("traduce los dos métodos de PG que el servidor puede emitir", () => {
    expect(nombreMetodoPg("AVERAGE")).toBe("Media fija del dado de golpe");
    expect(nombreMetodoPg("ROLL")).toBe("Tirada del dado de golpe");
  });

  it("una clave sin traducción se ve marcada, nunca en silencio", () => {
    expect(nombreOrigenAptitud("feat")).toBe("Sin traducir: feat");
    expect(nombreMetodoPg("MAX")).toBe("Sin traducir: MAX");
  });

  it("un modificador siempre lleva signo", () => {
    expect(conSigno(3)).toBe("+3");
    expect(conSigno(0)).toBe("+0");
    expect(conSigno(-1)).toBe("−1");
  });

  it("los dados de golpe y los espacios se dicen como los dice una mesa", () => {
    expect(dadosDeGolpe(4, 10)).toBe("4d10");
    expect(frasesDeEspacios([{ spellLevel: 1, slots: 1 }])).toEqual(["1 espacio de nivel 1"]);
    expect(frasesDeEspacios([{ spellLevel: 2, slots: 3 }])).toEqual(["3 espacios de nivel 2"]);
  });
});
