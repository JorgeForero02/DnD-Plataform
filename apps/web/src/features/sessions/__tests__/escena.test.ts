import { describe, expect, it } from "vitest";
import { lugarDeLaEscena, momentoDeLaCampana, type EntidadParaEscena } from "../escena";
import type { GameEventRow } from "../log-api";

const entidades: EntidadParaEscena[] = [
  { id: "e-puerto", type: "LOCATION", name: "El Puerto Viejo" },
  { id: "e-almacen", type: "LOCATION", name: "Almacén cuatro" },
  { id: "e-elara", type: "NPC", name: "Elara" },
];

function revelado(subjectId: string, createdAt: string, entityName = "lo que fuera"): GameEventRow {
  return {
    id: `ev-${subjectId}-${createdAt}`,
    campaignId: "c1",
    sessionId: "s1",
    actorUserId: "dm",
    type: "ENTITY_REVEALED",
    subjectType: "campaign",
    subjectId,
    payload: { type: "ENTITY_REVEALED", entityName },
    visibility: "PLAYERS",
    createdAt,
  };
}

describe("el lugar de la escena, derivado del registro", () => {
  it("es la última ficha de LUGAR que el DM reveló", () => {
    // A propósito en orden de llegada del servidor (lo más reciente primero) para que la prueba
    // no premie a una implementación que se fíe del orden.
    const eventos = [
      revelado("e-almacen", "2026-09-04T21:10:00.000Z"),
      revelado("e-puerto", "2026-09-04T20:00:00.000Z"),
    ];
    expect(lugarDeLaEscena(eventos, entidades)).toEqual({
      id: "e-almacen",
      nombre: "Almacén cuatro",
    });
  });

  it("y sigue siendo la última aunque el registro llegue del revés", () => {
    const eventos = [
      revelado("e-puerto", "2026-09-04T20:00:00.000Z"),
      revelado("e-almacen", "2026-09-04T21:10:00.000Z"),
    ];
    expect(lugarDeLaEscena(eventos, entidades)?.nombre).toBe("Almacén cuatro");
  });

  it("revelar un PNJ no mueve la escena: no todo lo que se revela es un sitio", () => {
    const eventos = [
      revelado("e-elara", "2026-09-04T22:00:00.000Z"),
      revelado("e-puerto", "2026-09-04T20:00:00.000Z"),
    ];
    expect(lugarDeLaEscena(eventos, entidades)?.nombre).toBe("El Puerto Viejo");
  });

  // **Esta es la que importa para la seguridad, y no es un efecto colateral: es el diseño.** El
  // tipo de la ficha no viaja dentro del suceso, así que hay que cruzarlo con las fichas que el
  // espectador YA tiene — y esas se las dio el servidor filtradas por `canView`. Un lugar cuya
  // ficha no puede ver simplemente no está en el mapa que se cruza, así que no aparece.
  it("un lugar cuya ficha el espectador no tiene NO se pinta en la cabecera", () => {
    const eventos = [revelado("e-secreto", "2026-09-04T22:00:00.000Z", "La Cripta")];
    expect(lugarDeLaEscena(eventos, entidades)).toBeNull();
  });

  it("gana el nombre de AHORA, no el que el suceso guardó", () => {
    // El DM reveló «El Puerto» y luego renombró la ficha. La mesa está en el sitio nuevo.
    const eventos = [revelado("e-puerto", "2026-09-04T20:00:00.000Z", "El Puerto")];
    expect(lugarDeLaEscena(eventos, entidades)?.nombre).toBe("El Puerto Viejo");
  });

  it("sin ningún lugar revelado devuelve null, y no se inventa uno", () => {
    expect(lugarDeLaEscena([], entidades)).toBeNull();
  });

  it("una fecha ilegible no tumba la cabecera ni gana el desempate", () => {
    const eventos = [
      revelado("e-almacen", "no es una fecha"),
      revelado("e-puerto", "2026-09-04T20:00:00.000Z"),
    ];
    expect(lugarDeLaEscena(eventos, entidades)?.nombre).toBe("El Puerto Viejo");
  });
});

describe("el momento de la campaña", () => {
  it("parte el reloj en día y hora, contando el primer día como 1", () => {
    // 11 días completos + 23 h 40 min.
    const segundos = 11 * 86_400 + 23 * 3_600 + 40 * 60;
    expect(momentoDeLaCampana(segundos)).toEqual({
      hora: "23:40",
      dia: "Día 12",
      esNoche: true,
    });
  });

  it("el mediodía no es de noche, y las seis de la mañana tampoco", () => {
    expect(momentoDeLaCampana(12 * 3_600).esNoche).toBe(false);
    // La frontera exacta: 05:59 es noche, 06:00 ya no. Se prueban las dos porque un `>` mal
    // puesto solo se ve en el borde.
    expect(momentoDeLaCampana(5 * 3_600 + 59 * 60).esNoche).toBe(true);
    expect(momentoDeLaCampana(6 * 3_600).esNoche).toBe(false);
    expect(momentoDeLaCampana(19 * 3_600 + 59 * 60).esNoche).toBe(false);
    expect(momentoDeLaCampana(20 * 3_600).esNoche).toBe(true);
  });

  it("un reloj a cero es el día 1 a medianoche, no el día 0", () => {
    expect(momentoDeLaCampana(0)).toEqual({ hora: "00:00", dia: "Día 1", esNoche: true });
  });

  it("un valor imposible no rompe la cabecera", () => {
    expect(momentoDeLaCampana(Number.NaN).dia).toBe("Día 1");
    expect(momentoDeLaCampana(-500).hora).toBe("00:00");
  });
});
