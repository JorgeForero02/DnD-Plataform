import { describe, expect, it } from "vitest";
import { ruleConditionSchema, ruleEffectSchema, ruleTriggerSchema } from "@dnd/shared";
import {
  ARTICULO_PARTE,
  CONDICIONES,
  DISPARADORES,
  EFECTOS,
  PAREJAS_CONFUNDIBLES,
  QUE_ES_PARTE,
  avisosDeConfusion,
  nombreDePieza,
  parteDe,
} from "../vocabulario";
import { CLASES_DE_PARTE, PARTES, SILUETA, tipoDeArrastre } from "../partes";

// Tarea R4 — «ocurrió algo» no es lo mismo que «algo es verdad», y la pantalla tiene que
// decirlo. Estas pruebas comprueban la parte que no depende de pintar nada: que toda clave del
// vocabulario cerrado sabe a qué parte pertenece, y que las parejas que se confunden se avisan
// nombrando la otra pieza y su naturaleza.

describe("cada pieza del vocabulario cerrado sabe de qué parte es", () => {
  it("las 28 claves del esquema tienen parte, y ninguna otra la tiene", () => {
    for (const clave of ruleTriggerSchema.options.map((o) => o.shape.kind.value)) {
      expect(parteDe(clave), clave).toBe("SUCESO");
    }
    for (const clave of ruleConditionSchema.options.map((o) => o.shape.kind.value)) {
      expect(parteDe(clave), clave).toBe("ESTADO");
    }
    for (const clave of ruleEffectSchema.options.map((o) => o.shape.kind.value)) {
      expect(parteDe(clave), clave).toBe("ACCION");
    }
    expect(parteDe("ALGO_QUE_NO_EXISTE")).toBeUndefined();
  });

  it("`nombreDePieza` traduce cualquiera de las tres partes sin dejar caer el enum", () => {
    for (const clave of [...DISPARADORES, ...CONDICIONES, ...EFECTOS]) {
      const nombre = nombreDePieza(clave);
      expect(nombre, clave).not.toContain("Sin traducir");
      expect(nombre, clave).not.toBe(clave);
    }
  });
});

describe("las tres partes se cuentan distinto, que es de lo que va R4", () => {
  it("la frase de cada parte es propia: suceso, estado y acción no dicen lo mismo", () => {
    const frases = PARTES.map((parte) => QUE_ES_PARTE[parte]);
    expect(new Set(frases).size).toBe(3);
    expect(QUE_ES_PARTE.SUCESO).toContain("instante");
    expect(QUE_ES_PARTE.ESTADO).toContain("comprueba");
    expect(QUE_ES_PARTE.ACCION).toContain("Cambia el mundo");
  });

  it("cada parte tiene forma y color propios: ninguna se distingue de otra solo por el sitio", () => {
    expect(new Set(PARTES.map((p) => SILUETA[p])).size).toBe(3);
    expect(new Set(PARTES.map((p) => CLASES_DE_PARTE[p].borde)).size).toBe(3);
    expect(new Set(PARTES.map((p) => tipoDeArrastre(p))).size).toBe(3);
  });
});

describe("las parejas que se confunden se avisan dentro de la caja", () => {
  it("toda clave nombrada en la tabla existe de verdad en el vocabulario cerrado", () => {
    for (const [clave, parejas] of Object.entries(PAREJAS_CONFUNDIBLES)) {
      expect(parteDe(clave), `clave inventada: ${clave}`).toBeDefined();
      for (const otra of parejas) {
        expect(parteDe(otra), `pareja inventada: ${otra}`).toBeDefined();
      }
    }
  });

  it("«se pone una marca» avisa de que no es «una marca está puesta», que es un estado", () => {
    const avisos = avisosDeConfusion("FLAG_SET");
    const sobreLaCondicion = avisos.find((a) => a.includes(nombreDePieza("FLAG_IS")));
    expect(sobreLaCondicion).toBeDefined();
    expect(sobreLaCondicion).toContain(ARTICULO_PARTE.ESTADO);
    // Y el enum nunca llega a la frase.
    expect(avisos.join(" ")).not.toContain("FLAG_IS");
  });

  it("una pieza que no se parece a ninguna otra no inventa avisos", () => {
    expect(avisosDeConfusion("ADD_SESSION_NOTE")).toEqual([]);
  });
});
