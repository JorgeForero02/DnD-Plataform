import {
  actividadDeLanzamiento,
  claveDeConjuro,
  mecanicaDe,
  objetivosDe,
  parsearClaveDeActividad,
} from "./spell-activities";
import { SRD_SPELL_POR_KEY } from "./generado";

// Tarea 3A.2 (Task 3) — Step 1: tests rojo primero. Los tres conjuros de referencia (fuente:
// SRD 5.1, © Wizards of the Coast LLC, CC BY 4.0, ya convertidos en `spells-srd.json`) cubren
// los tres casos que el brief pide: una actividad secundaria FREE que no es la de lanzar
// (`hunters-mark`), un conjuro con una sola actividad (`magic-missile`), y uno sin ninguna
// (`magic-weapon`, importado solo con su texto).

describe("claveDeConjuro / parsearClaveDeActividad", () => {
  it("compone la clave de la actividad principal sin índice", () => {
    expect(claveDeConjuro("fireball")).toBe("spell:fireball");
  });
  it("compone la clave de una actividad secundaria con índice", () => {
    expect(claveDeConjuro("fireball", 1)).toBe("spell:fireball@1");
  });
  it("parsea una clave de conjuro sin índice", () => {
    expect(parsearClaveDeActividad("spell:fireball")).toEqual({
      tipo: "spell",
      spellKey: "fireball",
      indice: 0,
    });
  });
  it("parsea una clave de conjuro con índice", () => {
    expect(parsearClaveDeActividad("spell:fireball@1")).toEqual({
      tipo: "spell",
      spellKey: "fireball",
      indice: 1,
    });
  });
  it("una clave sin el prefijo spell: es un rasgo", () => {
    expect(parsearClaveDeActividad("second-wind")).toEqual({ tipo: "feature", key: "second-wind" });
  });
});

describe("actividadDeLanzamiento", () => {
  it("hunters-mark: la utilidad con activation BONUS, no la de dados FREE", () => {
    const spell = SRD_SPELL_POR_KEY.get("hunters-mark")!;
    const actividad = actividadDeLanzamiento(spell)!;
    expect(actividad.tipo).toBe("utilidad");
    expect(actividad.activation).toEqual({ coste: "BONUS" });
  });
  it("magic-missile: su única actividad", () => {
    const spell = SRD_SPELL_POR_KEY.get("magic-missile")!;
    const actividad = actividadDeLanzamiento(spell)!;
    expect(actividad.tipo).toBe("dados");
  });
  it("magic-weapon: sin actividades, undefined", () => {
    const spell = SRD_SPELL_POR_KEY.get("magic-weapon")!;
    expect(actividadDeLanzamiento(spell)).toBeUndefined();
  });
});

describe("mecanicaDe", () => {
  it("magic-weapon (sin actividad) es texto", () => {
    expect(mecanicaDe(SRD_SPELL_POR_KEY.get("magic-weapon")!)).toBe("texto");
  });
  it("fireball (salvación) es salvacion", () => {
    expect(mecanicaDe(SRD_SPELL_POR_KEY.get("fireball")!)).toBe("salvacion");
  });
  it("fire-bolt (ataque) es ataque", () => {
    expect(mecanicaDe(SRD_SPELL_POR_KEY.get("fire-bolt")!)).toBe("ataque");
  });
});

describe("objetivosDe", () => {
  // El catálogo generado no trae `target` en ninguno de sus 425 actividades hoy (medido: 0 de
  // 425) — es un hueco de la conversión de Task 1, no de esta función. Se comprueba el caso real
  // (siempre "ninguno" mientras eso sea así) y, aparte, la lógica de las otras dos ramas con un
  // fixture propio, para no dejar sin cubrir un camino que el catálogo todavía no ejercita.
  it("magic-weapon (sin actividad) no tiene objetivo que pedir", () => {
    expect(objetivosDe(SRD_SPELL_POR_KEY.get("magic-weapon")!)).toBe("ninguno");
  });
  it("un conjuro real sin `target` en su actividad de lanzamiento es «ninguno» hoy", () => {
    expect(objetivosDe(SRD_SPELL_POR_KEY.get("magic-missile")!)).toBe("ninguno");
  });
  it("con `target.cantidad` ausente es un solo objetivo", () => {
    const base = SRD_SPELL_POR_KEY.get("magic-missile")!;
    const spell = {
      ...base,
      actividades: [{ ...base.actividades[0], target: { tipo: "criatura" as const } }],
    };
    expect(objetivosDe(spell)).toBe("uno");
  });
  it("con `target.cantidad` numérica mayor que 1 son varios", () => {
    const base = SRD_SPELL_POR_KEY.get("magic-missile")!;
    const spell = {
      ...base,
      actividades: [{ ...base.actividades[0], target: { tipo: "criatura" as const, cantidad: 3 } }],
    };
    expect(objetivosDe(spell)).toBe("varios");
  });
  it('con `target.tipo === "personal"` es «ninguno» aunque traiga cantidad', () => {
    const base = SRD_SPELL_POR_KEY.get("magic-missile")!;
    const spell = {
      ...base,
      actividades: [{ ...base.actividades[0], target: { tipo: "personal" as const } }],
    };
    expect(objetivosDe(spell)).toBe("ninguno");
  });
});
