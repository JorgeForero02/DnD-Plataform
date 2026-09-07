import { describe, expect, it } from "vitest";
import { usarActividadSchema } from "../activity.schema";

// Tarea A7 (paso 2), vuelta de arreglo 1 — la revisión encontró que este esquema entró sin una
// sola prueba en la suite de `@dnd/shared`. No es la forma de la actividad (esa la prueba
// `activity.schema.test.ts`, de A5/A6): es el cuerpo de la petición HTTP que la usa.

describe("usarActividadSchema", () => {
  it("acepta un cuerpo vacío: usar sin objetivos ni nivel de espacio es válido", () => {
    expect(usarActividadSchema.parse({})).toEqual({});
  });

  it("acepta objetivos y un nivel de espacio dentro de rango", () => {
    const cuerpo = { objetivos: ["clx000000000000000000001"], nivelDeEspacio: 3 };
    expect(usarActividadSchema.parse(cuerpo)).toEqual(cuerpo);
  });

  it("un objetivo que no es un cuid se rechaza", () => {
    expect(() => usarActividadSchema.parse({ objetivos: ["no-es-un-cuid"] })).toThrow();
  });

  it("más de doce objetivos se rechaza — el mismo tope que createRollRequestSchema.characterIds", () => {
    const trece = Array.from(
      { length: 13 },
      (_, i) => `clx0000000000000000000${String(i).padStart(2, "0")}`,
    );
    expect(() => usarActividadSchema.parse({ objetivos: trece })).toThrow();
  });

  it("nivelDeEspacio fuera de 1-9 se rechaza", () => {
    expect(() => usarActividadSchema.parse({ nivelDeEspacio: 0 })).toThrow();
    expect(() => usarActividadSchema.parse({ nivelDeEspacio: 10 })).toThrow();
  });
});
