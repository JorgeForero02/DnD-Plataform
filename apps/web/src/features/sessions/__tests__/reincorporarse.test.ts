import { beforeEach, describe, expect, it } from "vitest";
import { fraseDeLoPerdido, loQueTePerdiste, marcarVisto, ultimoVisto } from "../reincorporarse";
import type { GameEventRow } from "../log-api";

function suceso(id: string, createdAt: string): GameEventRow {
  return {
    id,
    campaignId: "c1",
    sessionId: "s1",
    actorUserId: "u1",
    type: "SESSION_NOTE",
    subjectType: "session",
    subjectId: "s1",
    payload: { type: "SESSION_NOTE", kind: "NOTE" },
    visibility: "PLAYERS",
    createdAt,
  };
}

// Tal y como llega del servidor: lo más reciente primero.
const registro = [
  suceso("e5", "2026-09-04T22:50:00.000Z"),
  suceso("e4", "2026-09-04T22:40:00.000Z"),
  suceso("e3", "2026-09-04T22:30:00.000Z"),
  suceso("e2", "2026-09-04T22:20:00.000Z"),
  suceso("e1", "2026-09-04T22:10:00.000Z"),
];

describe("lo que te perdiste mientras no estabas", () => {
  it("cuenta los que llegaron después de la marca y señala el primero de ellos", () => {
    expect(loQueTePerdiste(registro, "e2")).toEqual({ cuantos: 3, desde: "e3" });
  });

  // **La franja va en el más ANTIGUO de los nuevos, no en el más reciente.** Es por donde hay que
  // seguir leyendo; puesta en el más reciente quedaría arriba del todo, sin nada debajo, que es
  // justo lo contrario de lo que sirve.
  it("la franja marca por dónde SEGUIR, no dónde terminó", () => {
    expect(loQueTePerdiste(registro, "e1").desde).toBe("e2");
  });

  it("sin marca no se dice nada: a quien entra por primera vez no se le perdió nada", () => {
    expect(loQueTePerdiste(registro, null)).toEqual({ cuantos: 0, desde: null });
  });

  it("con la marca en lo último tampoco: no hay nada nuevo", () => {
    expect(loQueTePerdiste(registro, "e5")).toEqual({ cuantos: 0, desde: null });
  });

  // El registro llega paginado, así que la marca puede apuntar a algo que ya no está en la
  // ventana pedida —o a un suceso borrado con su campaña—. Decir «te perdiste 50» cuando en
  // realidad no se sabe es peor que no decir nada.
  it("una marca que ya no está en la ventana no inventa una cuenta", () => {
    expect(loQueTePerdiste(registro, "e-que-ya-no-existe")).toEqual({ cuantos: 0, desde: null });
  });

  it("una fecha ilegible no tumba el registro", () => {
    const roto = [suceso("x1", "no es una fecha"), ...registro];
    expect(loQueTePerdiste(roto, "e2").cuantos).toBe(3);
    expect(loQueTePerdiste(roto, "x1")).toEqual({ cuantos: 0, desde: null });
  });

  it("y el orden en que llegue el registro da igual", () => {
    const alReves = [...registro].reverse();
    expect(loQueTePerdiste(alReves, "e2")).toEqual({ cuantos: 3, desde: "e3" });
  });
});

describe("la marca, guardada en el navegador", () => {
  beforeEach(() => localStorage.clear());

  it("se guarda y se lee por campaña, así que dos campañas no se pisan", () => {
    marcarVisto("c1", "e5");
    marcarVisto("c2", "e9");

    expect(ultimoVisto("c1")).toBe("e5");
    expect(ultimoVisto("c2")).toBe("e9");
    expect(ultimoVisto("c3")).toBeNull();
  });

  // **Esto no es una precaución teórica.** En una ventana privada o con las cookies bloqueadas,
  // el acceso a `localStorage` no devuelve vacío: **lanza**. Sin la envoltura, la mesa entera se
  // caía por una marca de lectura, que es lo menos importante de la pantalla.
  it("si el almacenamiento no se puede tocar, no se marca nada y la mesa sigue en pie", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("almacenamiento bloqueado");
      },
    });

    expect(() => marcarVisto("c1", "e5")).not.toThrow();
    expect(ultimoVisto("c1")).toBeNull();

    if (original) Object.defineProperty(window, "localStorage", original);
  });
});

describe("la frase", () => {
  it("concuerda en singular y en plural", () => {
    expect(fraseDeLoPerdido(1)).toBe("Desde aquí te perdiste 1 suceso");
    expect(fraseDeLoPerdido(3)).toBe("Desde aquí te perdiste 3 sucesos");
  });
});
