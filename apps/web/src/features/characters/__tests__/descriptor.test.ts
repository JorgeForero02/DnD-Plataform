import { describe, expect, it } from "vitest";
import { descriptorDePersonaje } from "../descriptor";

// El fallo que estas pruebas fijan es real y se encontró el 2026-09-02: la hoja escribe
// `raceKey`/`classKey`, y el subtítulo de la ficha y la fila de la lista leían solo el texto
// libre heredado. Un personaje montado desde la hoja salía sin raza y sin clase en la lista
// mientras su propia hoja decía «Enano · Guerrero».

const vacio = {
  race: null,
  class: null,
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

  it("conserva el texto libre heredado de quien se escribió a mano antes del catálogo", () => {
    expect(descriptorDePersonaje({ ...vacio, race: "Tiflin", class: "Brujo" })).toBe(
      "Tiflin · Brujo",
    );
  });

  it("la clave manda sobre el texto libre cuando están los dos, campo a campo", () => {
    // Y **campo a campo**: una raza del catálogo con una clase escrita a mano tiene que dar las
    // dos, no elegir una fuente para toda la frase.
    expect(
      descriptorDePersonaje({ ...vacio, race: "Enano de las colinas", raceKey: "dwarf" }),
    ).toBe("Enano");
    expect(descriptorDePersonaje({ ...vacio, raceKey: "dwarf", class: "Brujo" })).toBe(
      "Enano · Brujo",
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
