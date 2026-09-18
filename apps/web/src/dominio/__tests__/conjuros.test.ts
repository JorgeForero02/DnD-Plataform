import { describe, expect, it } from "vitest";
import { characterSpellStateSchema, spellSchoolSchema } from "@dnd/shared";
import {
  fraseDeTope,
  NOMBRE_ESCUELA,
  NOMBRE_ESTADO_CONJURO,
  NOMBRE_MECANICA,
  NOMBRE_NIVEL_CONJURO,
} from "../conjuros";

// Tarea 6 de 3A.2 — mismo patrón que `dominio/dano.test.ts`: las tablas se leen del esquema
// (nunca de una lista escrita a mano), y ningún valor de enumeración se cuela sin traducir.

describe("el vocabulario de conjuros", () => {
  it("NOMBRE_ESCUELA cubre las ocho escuelas de @dnd/shared, sin claves sin traducir", () => {
    for (const escuela of spellSchoolSchema.options) {
      expect(NOMBRE_ESCUELA[escuela], `falta ${escuela}`).toBeTruthy();
      expect(NOMBRE_ESCUELA[escuela]).not.toBe(escuela);
    }
    expect(Object.keys(NOMBRE_ESCUELA)).toHaveLength(spellSchoolSchema.options.length);
  });

  it("NOMBRE_ESTADO_CONJURO cubre los tres estados, en español", () => {
    for (const estado of characterSpellStateSchema.options) {
      expect(NOMBRE_ESTADO_CONJURO[estado]).toBeTruthy();
      expect(NOMBRE_ESTADO_CONJURO[estado]).not.toBe(estado);
    }
  });

  it("NOMBRE_NIVEL_CONJURO: 0 es «Truco», el resto es «Nivel N»", () => {
    expect(NOMBRE_NIVEL_CONJURO(0)).toBe("Truco");
    expect(NOMBRE_NIVEL_CONJURO(1)).toBe("Nivel 1");
    expect(NOMBRE_NIVEL_CONJURO(9)).toBe("Nivel 9");
  });

  it("NOMBRE_MECANICA traduce las seis familias sin dejar ninguna sin nombre", () => {
    const claves: Array<keyof typeof NOMBRE_MECANICA> = [
      "ataque",
      "salvacion",
      "dados",
      "utilidad",
      "prueba",
      "texto",
    ];
    for (const clave of claves) {
      expect(NOMBRE_MECANICA[clave]).toBeTruthy();
      expect(NOMBRE_MECANICA[clave]).not.toBe(clave);
    }
  });

  it("fraseDeTope compone «actual de max clave», la frase de la cabecera", () => {
    expect(fraseDeTope("preparados", { max: 6, actual: 5 })).toBe("5 de 6 preparados");
    expect(fraseDeTope("trucos", { max: 3, actual: 2 })).toBe("2 de 3 trucos");
    expect(fraseDeTope("libro", { max: 6, actual: 6 })).toBe("6 de 6 en el libro");
    expect(fraseDeTope("conocidos", { max: 4, actual: 0 })).toBe("0 de 4 conocidos");
  });
});
