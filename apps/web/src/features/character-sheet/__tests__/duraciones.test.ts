import { describe, expect, it } from "vitest";
import {
  DURACIONES_DE_CONDICION,
  DURACION_INDEFINIDA,
  describirRestante,
  segundosDeDuracion,
} from "../duraciones";

// Tarea 2C.4 — la tabla de duraciones es un contrato con el servidor: lo que se elija aquí se
// manda en segundos de juego. Un cero de más en «10 días» no lo ve nadie mirando la pantalla.

describe("las duraciones que se ofrecen", () => {
  it("son las nueve del SRD 5.1 más la indefinida, y en segundos exactos", () => {
    expect(DURACIONES_DE_CONDICION.map((d) => d.segundos)).toEqual([
      null, // indefinida
      6, // 1 asalto
      60, // 1 minuto
      600, // 10 minutos
      3_600, // 1 hora
      28_800, // 8 horas
      86_400, // 24 horas
      604_800, // 7 días
      864_000, // 10 días
      2_592_000, // 30 días
    ]);
  });

  it("la indefinida es la primera, o sea la que sale por defecto", () => {
    expect(DURACION_INDEFINIDA).toBe(DURACIONES_DE_CONDICION[0]);
    expect(DURACION_INDEFINIDA.segundos).toBeNull();
  });

  it("«hasta el próximo descanso largo» y «mientras te concentres» NO se ofrecen: son sucesos", () => {
    const etiquetas = DURACIONES_DE_CONDICION.map((d) => d.etiqueta.toLowerCase()).join(" | ");
    expect(etiquetas).not.toMatch(/descanso|concentr/);
  });

  it("una clave desconocida vale indefinida, nunca un número inventado", () => {
    expect(segundosDeDuracion("lo-que-sea")).toBeNull();
    expect(segundosDeDuracion("hour")).toBe(3_600);
  });
});

describe("lo que le queda a una condición", () => {
  it("se dice en dos unidades como mucho, redondeando hacia abajo", () => {
    expect(describirRestante(6)).toBe("6 s");
    expect(describirRestante(59)).toBe("59 s");
    expect(describirRestante(3_600)).toBe("1 h");
    expect(describirRestante(3_720)).toBe("1 h 2 min");
    expect(describirRestante(90_000)).toBe("1 d 1 h");
    // 59 segundos por delante del minuto siguen siendo 59 segundos: no se redondea hacia
    // arriba, porque la condición sigue calculando hasta el instante exacto en que vence.
    expect(describirRestante(119)).toBe("1 min 59 s");
  });

  it("un resto de cero o negativo no imprime un número absurdo", () => {
    expect(describirRestante(0)).toBe("0 s");
    expect(describirRestante(-10)).toBe("0 s");
  });
});
