import { describe, expect, it } from "vitest";
import { ruleModeSchema, ruleStatusSchema, ruleTraceStatusSchema } from "@dnd/shared";
import {
  CONDICIONES,
  DISPARADORES,
  EFECTOS,
  NOMBRE_CONDICION,
  NOMBRE_DISPARADOR,
  NOMBRE_EFECTO,
  describirCondicion,
  describirDisparador,
  describirEfecto,
  nombreEstadoRegla,
  nombreEstadoTraza,
  nombreModo,
} from "../vocabulario";

// Tarea 2A.17 — el vocabulario cerrado, comprobado contra el esquema y no contra una lista
// copiada a mano. Si alguien añade un suceso a `rules-engine.schema.ts` y no lo traduce, estas
// pruebas fallan antes de que la clave cruda llegue a la pantalla.

describe("el vocabulario cubre exactamente lo que admite el esquema", () => {
  it("los 12 disparadores salen del esquema y todos están traducidos", () => {
    expect(DISPARADORES).toHaveLength(12);
    for (const kind of DISPARADORES) {
      expect(NOMBRE_DISPARADOR[kind], `sin traducir: ${kind}`).toBeTruthy();
      expect(NOMBRE_DISPARADOR[kind]).not.toBe(kind);
    }
  });

  it("las 8 condiciones salen del esquema y todas están traducidas", () => {
    expect(CONDICIONES).toHaveLength(8);
    for (const kind of CONDICIONES) {
      expect(NOMBRE_CONDICION[kind], `sin traducir: ${kind}`).toBeTruthy();
      expect(NOMBRE_CONDICION[kind]).not.toBe(kind);
    }
  });

  it("los 8 efectos salen del esquema y todos están traducidos", () => {
    expect(EFECTOS).toHaveLength(8);
    for (const kind of EFECTOS) {
      expect(NOMBRE_EFECTO[kind], `sin traducir: ${kind}`).toBeTruthy();
      expect(NOMBRE_EFECTO[kind]).not.toBe(kind);
    }
  });

  it("los estados de regla, de traza y los dos modos también", () => {
    for (const valor of ruleStatusSchema.options) {
      expect(nombreEstadoRegla(valor)).not.toContain("Sin traducir");
    }
    for (const valor of ruleTraceStatusSchema.options) {
      expect(nombreEstadoTraza(valor)).not.toContain("Sin traducir");
    }
    for (const valor of ruleModeSchema.options) {
      expect(nombreModo(valor)).not.toContain("Sin traducir");
    }
  });
});

describe("una clave desconocida se ve, no se esconde", () => {
  it("un estado de traza que el diccionario no conoce se marca como sin traducir", () => {
    expect(nombreEstadoTraza("SOMETHING_NEW")).toBe("Sin traducir: SOMETHING_NEW");
  });
});

describe("las frases completas", () => {
  it("un disparador con ficha usa el nombre de la ficha, no su identificador", () => {
    const frase = describirDisparador({ kind: "ENTITY_OPENED", entityId: "ck1" }, (id) =>
      id === "ck1" ? "Ciudad Ceniza" : id,
    );
    expect(frase).toContain("Ciudad Ceniza");
    expect(frase).not.toContain("ENTITY_OPENED");
    expect(frase).not.toContain("ck1");
  });

  it("una tirada natural se cuenta en español", () => {
    const frase = describirDisparador({ kind: "ABILITY_ROLL", outcome: "NATURAL_TWENTY" });
    expect(frase).toContain("20 natural");
    expect(frase).not.toContain("NATURAL_TWENTY");
  });

  it("una condición y un efecto se cuentan sin dejar caer su clave", () => {
    expect(describirCondicion({ kind: "FLAG_IS", key: "puerta", value: true })).toBe(
      "La marca «puerta» está puesta",
    );
    const efecto = describirEfecto(
      { kind: "REVEAL_ENTITY", entityId: "ck2", visibility: "PLAYERS" },
      () => "El herrero",
    );
    expect(efecto).toContain("El herrero");
    // El nombre legible del nivel lo pone `ui/Badge.tsx`; la frase no lo copia ni deja el enum.
    expect(efecto).not.toContain("PLAYERS");
  });
});
