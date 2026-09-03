import { condicionVencida, condicionesActivas, vencidasEnElTramo } from "./vencimiento";

// Tarea 2C.4. Lo puro, sin base de datos: la caducidad es una resta contra el reloj.

describe("condicionVencida", () => {
  it("una condición sin vencimiento no vence nunca: la quita el DM", () => {
    expect(condicionVencida({ key: "poisoned" }, 999_999)).toBe(false);
    expect(condicionVencida({ key: "poisoned", expiresAtClock: null }, 999_999)).toBe(false);
  });

  it("antes de su hora sigue viva", () => {
    expect(condicionVencida({ key: "poisoned", expiresAtClock: 3600 }, 3599)).toBe(false);
  });

  it("**el instante exacto ya cuenta como vencida**: una hora es una hora, no una hora y un segundo", () => {
    expect(condicionVencida({ key: "poisoned", expiresAtClock: 3600 }, 3600)).toBe(true);
  });

  it("y después, con más razón", () => {
    expect(condicionVencida({ key: "poisoned", expiresAtClock: 3600 }, 7200)).toBe(true);
  });
});

describe("condicionesActivas", () => {
  it("es el filtro que atraviesa todo lo que derive algo de una condición", () => {
    const activas = condicionesActivas(
      [
        { key: "poisoned", expiresAtClock: 60 },
        { key: "prone" },
        { key: "exhaustion", level: 2, expiresAtClock: 100_000 },
      ],
      3600,
    );
    expect(activas.map((c) => c.key)).toEqual(["prone", "exhaustion"]);
  });

  it("conserva lo demás de la fila: quien filtra no decide qué campos sobreviven", () => {
    const [activa] = condicionesActivas([{ key: "exhaustion", level: 4 }], 0);
    expect(activa.level).toBe(4);
  });
});

describe("vencidasEnElTramo", () => {
  // Es lo que convierte la caducidad en algo que el jugador ve: por cada una de estas se escribe
  // un suceso en la línea de tiempo.

  it("solo las que vencen DENTRO del tramo recién avanzado", () => {
    const filas = [
      { key: "ya-estaba-vencida", expiresAtClock: 10 },
      { key: "vence-ahora", expiresAtClock: 1500 },
      { key: "vence-luego", expiresAtClock: 9000 },
      { key: "indefinida" },
    ];
    expect(vencidasEnElTramo(filas, 1000, 3600).map((c) => c.key)).toEqual(["vence-ahora"]);
  });

  it("**el tramo es abierto por la izquierda**: dos avances seguidos no anuncian dos veces lo mismo", () => {
    const filas = [{ key: "justo-en-el-borde", expiresAtClock: 1000 }];
    // El avance anterior terminó en 1000 y ya la anunció.
    expect(vencidasEnElTramo(filas, 1000, 3600)).toEqual([]);
    // Y el que la anunció fue aquel, cuyo tramo la incluía por la derecha.
    expect(vencidasEnElTramo(filas, 0, 1000).map((c) => c.key)).toEqual(["justo-en-el-borde"]);
  });
});
