import { describe, expect, it } from "vitest";
import { damageTypeSchema } from "@dnd/shared";
import {
  NOMBRE_TIPO_DANO,
  NOMBRE_TIPO_DANO_CORTO,
  nombreTipoDano,
  nombreTipoDanoCorto,
} from "../dano";

// D-OP-14 — una tabla, dos formas, y una prueba que impide que vuelvan a ser tres.
//
// Había tres copias en tres módulos y **no decían lo mismo**: `inventory` abrevia cuatro entradas.
// Lo que esta prueba protege no es la traducción, es **la diferencia deliberada**: si alguien
// «unifica» las dos formas, la fila del inventario deja de caber y se pone roja aquí antes de
// llegar a la pantalla.

const TIPOS = damageTypeSchema.options;

describe("el vocabulario de los tipos de daño", () => {
  it("las DOS tablas cubren los trece tipos que declara @dnd/shared", () => {
    // El catálogo se lee del esquema, no de una lista escrita a mano: si mañana se añade un tipo
    // de daño, esta prueba lo exige en las dos tablas en vez de dejar un hueco.
    for (const t of TIPOS) {
      expect(NOMBRE_TIPO_DANO[t], `falta la forma larga de ${t}`).toBeTruthy();
      expect(NOMBRE_TIPO_DANO_CORTO[t], `falta la forma corta de ${t}`).toBeTruthy();
    }
    expect(Object.keys(NOMBRE_TIPO_DANO)).toHaveLength(TIPOS.length);
    expect(Object.keys(NOMBRE_TIPO_DANO_CORTO)).toHaveLength(TIPOS.length);
  });

  it("**ningún valor de enumeración llega a la pantalla**: ni la clave ni una cadena vacía", () => {
    for (const t of TIPOS) {
      expect(nombreTipoDano(t)).not.toBe(t);
      expect(nombreTipoDanoCorto(t)).not.toBe(t);
      expect(nombreTipoDano(t).trim()).not.toBe("");
      expect(nombreTipoDanoCorto(t).trim()).not.toBe("");
    }
  });

  it("y una clave que no existe se ve COMO TAL, no se cuela pareciendo un nombre", () => {
    expect(nombreTipoDano("SONIC")).toBe("Sin traducir: SONIC");
    expect(nombreTipoDanoCorto("SONIC")).toBe("Sin traducir: SONIC");
  });

  it("**las cuatro que se acortan de verdad son distintas, y eso es la decisión**", () => {
    // Si alguien fusiona las dos formas «para limpiar», esto cae. La forma corta existe porque la
    // fila del inventario tiene un ancho, no porque sobrara una tabla.
    expect(nombreTipoDanoCorto("BLUDGEONING")).toBe("contund.");
    expect(nombreTipoDanoCorto("PIERCING")).toBe("perf.");
    expect(nombreTipoDanoCorto("SLASHING")).toBe("cort.");
    expect(nombreTipoDanoCorto("LIGHTNING")).toBe("rayo");

    expect(nombreTipoDano("BLUDGEONING")).toBe("contundente");
    expect(nombreTipoDano("LIGHTNING")).toBe("relámpago");
  });

  it("las otras nueve coinciden, y también a propósito: ya eran cortas", () => {
    const iguales = TIPOS.filter((t) => NOMBRE_TIPO_DANO[t] === NOMBRE_TIPO_DANO_CORTO[t]);
    expect(iguales).toHaveLength(TIPOS.length - 4);
  });
});
