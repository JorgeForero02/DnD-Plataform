import { describe, expect, it } from "vitest";
import { CHARACTER_COLORS } from "@dnd/shared";
import {
  NOMBRE_DE_COLOR,
  clasesDeVoz,
  colorDePersonaje,
  colorPorDefecto,
  vozDePersonaje,
} from "../voces";

// Plan 05 (D3) — **un solo sitio decide el color de alguien.**
//
// Antes había dos: el hilo hacía una huella del `actorUserId` sobre cuatro tonos y el elenco
// pintaba cobre para todos. Lo que estas pruebas protegen no es la paleta, es que **no vuelvan a
// ser dos** y que **una elección se respete**.

const VOCES = clasesDeVoz();

describe("el color de un personaje", () => {
  it("**lo elegido manda**: si tiene color, ese, y no la huella", () => {
    // Es el fallo que de verdad duele —elegir y que no se respete—, y es la mutación del plan.
    for (const color of CHARACTER_COLORS) {
      expect(colorDePersonaje({ id: "c-elara", color })).toBe(color);
    }
    // Y no es que el defecto de este id coincida: al menos uno tiene que diferir de él.
    const defecto = colorPorDefecto("c-elara");
    expect(CHARACTER_COLORS.some((c) => c !== defecto)).toBe(true);
  });

  it("sin color, el determinista: **dos llamadas seguidas dan lo mismo**", () => {
    // Es lo que hace útil el defecto: el mismo personaje sale igual entre recargas, navegadores y
    // personas, sin guardar nada.
    for (const id of ["c-elara", "c-dm", "", "ç", "personaje con espacios", "cmXyZ0123456789"]) {
      expect(vozDePersonaje({ id })).toBe(vozDePersonaje({ id }));
      expect(vozDePersonaje({ id, color: null })).toBe(vozDePersonaje({ id }));
    }
  });

  it("**la huella es del PERSONAJE**: dos personajes del mismo jugador pueden diferir", () => {
    // El defecto de origen: la huella era del `actorUserId`, así que los dos personajes de un
    // jugador salían idénticos. Con ids distintos, la lista de 200 no puede tener un solo color.
    const vistos = new Set<string>();
    for (let i = 0; i < 200; i += 1) vistos.add(vozDePersonaje({ id: `c-${i}` }));
    expect(vistos.size).toBe(VOCES.length);
  });

  it("nunca sale un color literal, solo clases de token", () => {
    // `docs/04-convenciones.md` prohíbe el color literal: un hexadecimal no seguiría a los temas.
    for (let i = 0; i < 500; i += 1) expect(VOCES).toContain(vozDePersonaje({ id: `c-${i}` }));
    for (const clase of VOCES) expect(clase).toMatch(/^text-[a-z-]+$/);
  });

  it("una clave que ya no existe cae al defecto en vez de romper", () => {
    // Dato viejo de una lista anterior, no un error: sigue habiendo un color y sigue siendo suyo.
    expect(vozDePersonaje({ id: "c-elara", color: "turquesa" })).toBe(
      vozDePersonaje({ id: "c-elara" }),
    );
  });

  it("las ocho claves tienen clase y nombre legible, y ninguno es la clave a secas", () => {
    expect(VOCES).toHaveLength(CHARACTER_COLORS.length);
    expect(new Set(VOCES).size).toBe(CHARACTER_COLORS.length);
    for (const c of CHARACTER_COLORS) {
      expect(NOMBRE_DE_COLOR[c]).toBeTruthy();
    }
    // Las dos que llevan tilde en español y no en la clave: es el motivo de que exista la tabla.
    expect(NOMBRE_DE_COLOR.senal).toBe("señal");
    expect(NOMBRE_DE_COLOR.indigo).toBe("índigo");
  });

  it("**el retrato y la voz del mismo personaje son el mismo color**", () => {
    // La prueba que impide que se separen otra vez: `FichaDeElenco.Retrato` y `MensajeDelHilo`
    // llaman los dos a `vozDePersonaje`, así que aquí basta con que la función sea una. Si alguien
    // vuelve a calcular el color del retrato por su cuenta, el e2e del elenco lo verá; esto fija
    // el contrato.
    const personaje = { id: "c-elara", color: "ciruela" };
    expect(vozDePersonaje(personaje)).toBe("text-voz-ciruela");
    expect(vozDePersonaje({ ...personaje })).toBe(vozDePersonaje(personaje));
  });
});
