import { BadRequestException } from "@nestjs/common";
import type { Duracion, ExpresionDeDados, SrdSpell } from "@dnd/shared";
import {
  actividadDeLanzamiento,
  claveDeConjuro,
  consumoDeEspacio,
  dadosEscalados,
  ENCANTAMIENTOS,
  mecanicaDe,
  objetivosDe,
  parsearClaveDeActividad,
  segundosDeDuracion,
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
  // T15 (3A.2) — `magic-weapon` sigue sin actividades EN EL CATÁLOGO (`fueraDeA: ["enchant"]`),
  // pero ahora es un encantamiento conocido (`ENCANTAMIENTOS`): `actividadDeLanzamiento` le
  // construye una `utilidad` sintética en vez de devolver `undefined`, para que la pantalla del
  // libro de conjuros pueda ofrecer un botón «Lanzar» — antes de esta tarea no había ninguno.
  it("magic-weapon: sin actividades en el catálogo, pero es un encantamiento: utilidad sintética con su activation y su duración", () => {
    const spell = SRD_SPELL_POR_KEY.get("magic-weapon")!;
    expect(spell.actividades).toEqual([]);
    const actividad = actividadDeLanzamiento(spell)!;
    expect(actividad.tipo).toBe("utilidad");
    expect(actividad.activation).toEqual(spell.castingTime);
    expect(actividad.duration).toEqual(spell.duration);
  });
  it("un conjuro sin actividades que NO es un encantamiento conocido sigue dando undefined", () => {
    const sinActividades: SrdSpell = {
      ...SRD_SPELL_POR_KEY.get("magic-missile")!,
      key: "no-esta-en-encantamientos",
      actividades: [],
    };
    expect(actividadDeLanzamiento(sinActividades)).toBeUndefined();
  });
});

describe("ENCANTAMIENTOS", () => {
  it("magic-weapon es el único encantamiento conocido (D-CF-130): Shillelagh y Arma elemental quedan en 3B", () => {
    expect(Object.keys(ENCANTAMIENTOS)).toEqual(["magic-weapon"]);
  });

  // SRD 5.1, *Magic Weapon*, «At Higher Levels»: «using a spell slot of 4th level or higher, the
  // bonus increases to +2 … 6th level or higher, the bonus increases to +3».
  it.each([
    [2, 1],
    [3, 1],
    [4, 2],
    [5, 2],
    [6, 3],
    [9, 3],
  ])("nivel de espacio %i → +%i", (nivel, esperado) => {
    expect(ENCANTAMIENTOS["magic-weapon"].bonoPorNivel(nivel)).toBe(esperado);
  });
});

describe("segundosDeDuracion", () => {
  function duracion(parcial: Partial<Duracion>): Duracion {
    return { unidad: "instantanea", concentracion: false, ...parcial };
  }
  it("una hora son 3600 segundos (magic-weapon)", () => {
    expect(segundosDeDuracion(duracion({ unidad: "hora", valor: 1 }))).toBe(3600);
  });
  it("un minuto son 60 segundos", () => {
    expect(segundosDeDuracion(duracion({ unidad: "minuto", valor: 10 }))).toBe(600);
  });
  it("instantánea no es un número de segundos: undefined", () => {
    expect(segundosDeDuracion(duracion({ unidad: "instantanea" }))).toBeUndefined();
  });
  it("hasta que se disipe no es un número de segundos: undefined", () => {
    expect(segundosDeDuracion(duracion({ unidad: "hastaQueSeDisipe" }))).toBeUndefined();
  });
});

describe("mecanicaDe", () => {
  // T15 (3A.2) — ya no es "texto": `actividadDeLanzamiento` le construye una `utilidad`
  // sintética (encantamiento conocido), y esta función lee justo esa actividad.
  it("magic-weapon (encantamiento, sin actividad en el catálogo) es utilidad", () => {
    expect(mecanicaDe(SRD_SPELL_POR_KEY.get("magic-weapon")!)).toBe("utilidad");
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
