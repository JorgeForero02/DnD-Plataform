import { test } from "node:test";
import assert from "node:assert/strict";
import { emparejar } from "../huella.mjs";

// Tarea 3A.1 (T1), Step 5.

function d(over = {}) {
  return {
    level: 1,
    school: "evo",
    rangeUnit: "ft",
    rangeValue: 60,
    v: true,
    s: true,
    m: false,
    durationUnit: "instantanea",
    durationValue: undefined,
    concentration: false,
    ritual: false,
    ...over,
  };
}

test("dos conjuros con huella única casan", () => {
  const spellsEn = new Map([
    ["fireball", d({ level: 3, school: "evo" })],
    ["cure-wounds", d({ level: 1, school: "evo", rangeUnit: "touch" })],
  ]);
  const conjurosEs = new Map([
    ["Bola de fuego", d({ level: 3, school: "evo" })],
    ["Curar heridas", d({ level: 1, school: "evo", rangeUnit: "touch" })],
  ]);
  const { pares, choques, sinPareja } = emparejar(spellsEn, conjurosEs, {});
  assert.equal(pares.get("fireball"), "Bola de fuego");
  assert.equal(pares.get("cure-wounds"), "Curar heridas");
  assert.equal(choques.length, 0);
  assert.equal(sinPareja.length, 0);
});

test("dos con la misma huella sin entrada a mano salen en choques", () => {
  const spellsEn = new Map([
    ["bane", d({ level: 1, school: "enc" })],
    ["hideous-laughter", d({ level: 1, school: "enc" })],
  ]);
  const conjurosEs = new Map([
    ["Perdición", d({ level: 1, school: "enc" })],
    ["Risa horrible", d({ level: 1, school: "enc" })],
  ]);
  const { pares, choques } = emparejar(spellsEn, conjurosEs, {});
  assert.equal(pares.size, 0);
  assert.equal(choques.length, 2);
});

test("con entrada en la tabla a mano, casan aunque la huella colisione", () => {
  const spellsEn = new Map([
    ["bane", d({ level: 1, school: "enc" })],
    ["hideous-laughter", d({ level: 1, school: "enc" })],
  ]);
  const conjurosEs = new Map([
    ["Perdición", d({ level: 1, school: "enc" })],
    ["Risa horrible", d({ level: 1, school: "enc" })],
  ]);
  const tablaAMano = { bane: "Perdición", "hideous-laughter": "Risa horrible" };
  const { pares, choques } = emparejar(spellsEn, conjurosEs, tablaAMano);
  assert.equal(pares.get("bane"), "Perdición");
  assert.equal(pares.get("hideous-laughter"), "Risa horrible");
  assert.equal(choques.length, 0);
});

test("un español sin inglés hermano sale en sinPareja", () => {
  const spellsEn = new Map([
    ["produce-flame", d({ level: 0, school: "con", rangeUnit: "ft", rangeValue: 30 })],
  ]);
  const conjurosEs = new Map([["Crear llama", d({ level: 0, school: "con", rangeUnit: "touch" })]]);
  const { pares, sinPareja } = emparejar(spellsEn, conjurosEs, {});
  assert.equal(pares.size, 0);
  assert.deepEqual(sinPareja, ["produce-flame"]);
});
