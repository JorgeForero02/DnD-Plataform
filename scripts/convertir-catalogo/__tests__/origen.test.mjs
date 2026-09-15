import { test } from "node:test";
import assert from "node:assert/strict";
import { origenDe } from "../origen.mjs";

// Tarea 3A.1 (T1), Step 6 — cada fórmula distinta que la tarea 0 listó (censo d.2 del informe).

test("@mod -> lanzamiento", () => {
  assert.deepEqual(origenDe("@mod"), { origen: { tipo: "lanzamiento" } });
});

test("@abilities.cha.mod -> modificador(cha)", () => {
  assert.deepEqual(origenDe("@abilities.cha.mod"), {
    origen: { tipo: "modificador", ability: "cha" },
  });
});

test("@item.level -> nivelDeEspacio", () => {
  assert.deepEqual(origenDe("@item.level"), { origen: { tipo: "nivelDeEspacio" } });
});

test("@scale.rogue.sneak-attack -> escala('rogue-sneak-attack')", () => {
  assert.deepEqual(origenDe("@scale.rogue.sneak-attack"), {
    origen: { tipo: "escala", clave: "rogue-sneak-attack" },
  });
});

test("@classes.fighter.levels -> nivelDeClase('fighter')", () => {
  assert.deepEqual(origenDe("@classes.fighter.levels"), {
    origen: { tipo: "nivelDeClase", clase: "fighter" },
  });
});

test("'1' -> fijo(1)", () => {
  assert.deepEqual(origenDe("1"), { origen: { tipo: "fijo", valor: 1 } });
});

test("'5 * @classes.paladin.levels' -> rechazo (no es ninguna de las nueve formas)", () => {
  const r = origenDe("5 * @classes.paladin.levels");
  assert.equal(typeof r.rechazo, "string");
});

test("@item.uses.value -> rechazo", () => {
  const r = origenDe("@item.uses.value");
  assert.equal(typeof r.rechazo, "string");
});

test("una fórmula vacía se rechaza, no se trata como 0", () => {
  const r = origenDe("");
  assert.equal(typeof r.rechazo, "string");
});
