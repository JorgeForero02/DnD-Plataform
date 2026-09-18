import { BadRequestException } from "@nestjs/common";
import type { ExpresionDeDados, SrdSpell } from "@dnd/shared";
import {
  actividadDeLanzamiento,
  claveDeConjuro,
  consumoDeEspacio,
  dadosEscalados,
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
  // Task 4 (3A.2) — reescrita: deriva del `tipo` de la actividad de lanzamiento, no de `target`
  // (que el catálogo generado por Task 1 no trae en ninguna de sus 425 actividades — medido). Los
  // tres casos reales del SRD, con conjuros de verdad.
  it("magic-weapon (sin actividad) no tiene objetivo que pedir", () => {
    expect(objetivosDe(SRD_SPELL_POR_KEY.get("magic-weapon")!)).toBe("ninguno");
  });
  it("magic-missile (dados) alcanza a varios", () => {
    expect(objetivosDe(SRD_SPELL_POR_KEY.get("magic-missile")!)).toBe("varios");
  });
  it("fire-bolt (ataque) apunta a uno", () => {
    expect(objetivosDe(SRD_SPELL_POR_KEY.get("fire-bolt")!)).toBe("uno");
  });
  it("fireball (salvación) alcanza a varios", () => {
    expect(objetivosDe(SRD_SPELL_POR_KEY.get("fireball")!)).toBe("varios");
  });
  it("hunters-mark (utilidad, la actividad de lanzamiento) no pide objetivo de criatura", () => {
    expect(objetivosDe(SRD_SPELL_POR_KEY.get("hunters-mark")!)).toBe("ninguno");
  });
});

describe("consumoDeEspacio", () => {
  it("un truco (nivel 0) no consume nada", () => {
    expect(consumoDeEspacio(SRD_SPELL_POR_KEY.get("fire-bolt")!)).toEqual([]);
  });
  it("un conjuro de nivel N sin elegir espacio consume su propio nivel", () => {
    expect(consumoDeEspacio(SRD_SPELL_POR_KEY.get("magic-missile")!)).toEqual([
      { recurso: "spell-slot-1", cantidad: 1 },
    ]);
  });
  it("con un espacio de nivel superior, consume el elegido (T18)", () => {
    expect(consumoDeEspacio(SRD_SPELL_POR_KEY.get("magic-missile")!, 2)).toEqual([
      { recurso: "spell-slot-2", cantidad: 1 },
    ]);
  });
  it("fireball (nivel 3) con nivelDeEspacio 5 consume spell-slot-5", () => {
    expect(consumoDeEspacio(SRD_SPELL_POR_KEY.get("fireball")!, 5)).toEqual([
      { recurso: "spell-slot-5", cantidad: 1 },
    ]);
  });
  it("un espacio MENOR que el nivel del conjuro se rechaza", () => {
    expect(() => consumoDeEspacio(SRD_SPELL_POR_KEY.get("fireball")!, 2)).toThrow(
      BadRequestException,
    );
  });
});

/** El `dados` de la actividad de lanzamiento — narrowed a mano, porque `Actividad[]` en el
 * catálogo generado pierde el tipo concreto del elemento y `dados` solo existe en tres de las
 * cinco ramas de la unión. */
function dadosDeLanzamiento(spell: SrdSpell): ExpresionDeDados {
  const actividad = actividadDeLanzamiento(spell)!;
  if (actividad.tipo === "ataque" || actividad.tipo === "salvacion" || actividad.tipo === "dados") {
    if (actividad.dados) return actividad.dados;
  }
  throw new Error(`«${spell.key}» no tiene dados en su actividad de lanzamiento.`);
}

describe("dadosEscalados", () => {
  it("fireball a nivel de espacio 5 (base 3): +2d6 sobre la base de 8d6", () => {
    const fireball = SRD_SPELL_POR_KEY.get("fireball")!;
    expect(
      dadosEscalados(dadosDeLanzamiento(fireball), {
        nivelBase: 3,
        nivelDeEspacio: 5,
        nivelDePersonaje: 5,
      }),
    ).toMatchObject({ n: 10, caras: 6, signo: -1, tipoDeDano: "FIRE" });
  });
  it("fireball con el espacio mínimo (sin subir de nivel): sin extra", () => {
    const fireball = SRD_SPELL_POR_KEY.get("fireball")!;
    expect(
      dadosEscalados(dadosDeLanzamiento(fireball), {
        nivelBase: 3,
        nivelDeEspacio: 3,
        nivelDePersonaje: 3,
      }),
    ).toMatchObject({ n: 8, caras: 6 });
  });
  it("fire-bolt a nivel de personaje 11 (dos tramos: 5.º y 11.º): +2d10 sobre 1d10", () => {
    const fireBolt = SRD_SPELL_POR_KEY.get("fire-bolt")!;
    expect(
      dadosEscalados(dadosDeLanzamiento(fireBolt), { nivelBase: 0, nivelDePersonaje: 11 }),
    ).toMatchObject({ n: 3, caras: 10 });
  });
  it("fire-bolt a nivel de personaje 4 (ningún tramo): sin escalar", () => {
    const fireBolt = SRD_SPELL_POR_KEY.get("fire-bolt")!;
    expect(
      dadosEscalados(dadosDeLanzamiento(fireBolt), { nivelBase: 0, nivelDePersonaje: 4 }),
    ).toMatchObject({ n: 1, caras: 10 });
  });
  it("una expresión sin `escalado` es una copia literal", () => {
    const dados: ExpresionDeDados = { n: 1, caras: 8, signo: 1 };
    expect(dadosEscalados(dados, { nivelBase: 0, nivelDePersonaje: 1 })).toEqual(dados);
  });
});
