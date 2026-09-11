import { describe, expect, it } from "vitest";
import { descriptorDePersonaje } from "../descriptor";

// El fallo que estas pruebas fijan es real y se encontró el 2026-09-02: la hoja escribe
// `raceKey`/`classKey`, y el subtítulo de la ficha y la fila de la lista leían solo el texto
// libre heredado. Un personaje montado desde la hoja salía sin raza y sin clase en la lista
// mientras su propia hoja decía «Enano · Guerrero».
//
// D-CF-27 (2026-09-11): el texto libre heredado (`race`/`class`) se retiró de la base y del
// esquema, así que las pruebas de "conserva el texto libre" y "la clave manda sobre el texto
// libre" que vivían aquí ya no tienen nada que probar — se borraron con el campo, no se
// silenciaron.

const vacio = {
  raceKey: null,
  subraceKey: null,
  classKey: null,
};

describe("el descriptor de un personaje", () => {
  it("traduce las claves del catálogo, que es lo que escribe la hoja", () => {
    expect(descriptorDePersonaje({ ...vacio, raceKey: "dwarf", classKey: "fighter" })).toBe(
      "Enano · Guerrero",
    );
  });

  it("no deja escapar la clave cruda a la pantalla", () => {
    const texto = descriptorDePersonaje({ ...vacio, raceKey: "dwarf", classKey: "fighter" });
    expect(texto).not.toContain("dwarf");
    expect(texto).not.toContain("fighter");
  });

  it("la subraza gana a la raza: en la mesa nadie llama «elfo» a un elfo alto", () => {
    expect(descriptorDePersonaje({ ...vacio, raceKey: "elf", subraceKey: "elf-high" })).toBe(
      "Alto elfo",
    );
  });

  it("sin nada, no inventa: cadena vacía, y quien la pinta decide no pintarla", () => {
    expect(descriptorDePersonaje(vacio)).toBe("");
  });

  it("con solo una mitad, no arrastra el separador", () => {
    expect(descriptorDePersonaje({ ...vacio, classKey: "fighter" })).toBe("Guerrero");
    expect(descriptorDePersonaje({ ...vacio, raceKey: "dwarf" })).toBe("Enano");
  });
});
