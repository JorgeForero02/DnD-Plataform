import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { actividadDe } from "../actividad.mjs";

// Tarea 3A.1 (T1), Step 7. Fixtures MECÁNICAS reconstruidas a mano (números, claves, fórmulas —
// nunca prosa con derechos, salvo la que `casos-raros.json` ya trae committeada por la tarea 0)
// a partir de los `.yml` reales de Foundry, sin copiar sus campos de prosa al repo. El texto en
// español (`description`, `materiales.texto`, `condicion`, `higherLevelsEs`) sale literal de
// `casos-raros.json`, que es exactamente lo que en producción cortaría `srd-es.mjs`.

const casosRaros = JSON.parse(
  readFileSync(fileURLToPath(new URL("../casos-raros.json", import.meta.url)), "utf8"),
);

function casoPorId(id) {
  const caso = casosRaros.find((c) => c.id === id);
  if (!caso) throw new Error(`No existe el caso raro "${id}" en casos-raros.json`);
  return caso;
}

/**
 * `higherLevelsEs` no es un campo de `Actividad` (`actividadBaseObjectSchema` es `.strict()`):
 * vive un nivel por encima, en `SrdSpell` (`packages/shared/src/catalog.schema.ts`). Los
 * `esperado` de `casos-raros.json` lo incluyen inline por comodidad documental de T0; aquí se
 * separa para comparar solo lo que `actividadDe` de verdad devuelve.
 */
function sinHigherLevels(esperado) {
  const resto = { ...esperado };
  delete resto.higherLevelsEs;
  return resto;
}

/** Reconstruye el `ctx` de texto español a partir del literal `esperado` de un caso raro. */
function ctxDesdeEsperado(esperado, extra = {}) {
  return {
    descripcionEs: esperado.description,
    condicionEs: esperado.activation?.condicion,
    materialesTextoEs: esperado.materiales?.texto,
    higherLevelsEs: esperado.higherLevelsEs,
    ...extra,
  };
}

test("barbarian:rage — reproduce RASGO_FURIA, no lo regenera (E-3A1-5)", () => {
  const caso = casoPorId("barbarian:rage");
  const resultado = actividadDe({ type: "utility" }, { claveConocida: "rage" });
  assert.deepEqual(resultado, caso.esperado);
});

test("fighter:second-wind — healing.bonus '@classes.fighter.levels' -> nivelDeClase('fighter')", () => {
  const caso = casoPorId("fighter:second-wind");
  const activity = {
    type: "heal",
    activation: { type: "bonus", override: false },
    consumption: { targets: [{ type: "itemUses", target: "", value: "1" }] },
    duration: { units: "", value: "" },
    healing: {
      number: 1,
      denomination: 10,
      bonus: "@classes.fighter.levels",
      custom: { enabled: false, formula: "" },
      scaling: { mode: "whole", number: null },
    },
  };
  const ctx = { recurso: "second-wind", itemLevel: undefined };
  assert.deepEqual(actividadDe(activity, ctx), caso.esperado);
});

test("rogue:sneak-attack — dados por tabla de escala: hueco A, se queda en texto", () => {
  const caso = casoPorId("rogue:sneak-attack");
  const activity = {
    type: "damage",
    activation: { type: "", override: false },
    consumption: { targets: [] },
    duration: { units: "", value: "" },
    damage: {
      parts: [
        {
          number: null,
          denomination: null,
          custom: { enabled: true, formula: "@scale.rogue.sneak-attack" },
        },
      ],
    },
  };
  const resultado = actividadDe(activity, {});
  assert.equal(resultado.texto, true);
  assert.equal(typeof resultado.motivo, "string");
  assert.ok(resultado.motivo.length > 0);
  assert.equal(caso.esperado.texto, true); // el propio caso raro también lo documenta como texto
});

test("paladin:lay-on-hands — consumo variable = efecto: hueco C, se queda en texto", () => {
  const caso = casoPorId("paladin:lay-on-hands");
  const primeraActividad = {
    type: "heal",
    activation: { type: "action", override: false },
    consumption: {
      targets: [{ type: "itemUses", target: "", value: "1" }],
      scaling: { allowed: true, max: "@item.uses.value" },
    },
    duration: { units: "", value: "" },
    healing: { custom: { enabled: true, formula: "1" } },
  };
  const segundaActividad = {
    type: "utility",
    activation: { type: "action", override: false },
    consumption: {
      targets: [{ type: "itemUses", target: "", value: "5" }],
      scaling: { allowed: true, max: "floor(@item.uses.value / 5)" },
    },
    duration: { units: "", value: "" },
  };
  const resultado1 = actividadDe(primeraActividad, {});
  const resultado2 = actividadDe(segundaActividad, {});
  assert.equal(resultado1.texto, true);
  assert.equal(resultado2.texto, true);
  assert.equal(caso.esperado.texto, true);
});

test("cleric:channel-divinity-turn-undead — save.dc.calculation 'wis' -> cdDeConjuro (la de lanzamiento del clérigo es wis)", () => {
  const caso = casoPorId("cleric:channel-divinity-turn-undead");
  const activity = {
    type: "save",
    activation: {
      type: "action",
      override: false,
      condition: "Targets must be able to see or hear you.",
    },
    consumption: { targets: [{ type: "itemUses", target: "feat:channel-divinity", value: "1" }] },
    range: { units: "ft", value: "30" },
    duration: { units: "minute", value: "1", concentration: false },
    damage: { onSave: "half", parts: [] },
    save: { ability: "wis", dc: { calculation: "wis" } },
  };
  const ctx = ctxDesdeEsperado(caso.esperado, { spellcastingAbility: "wis" });
  assert.deepEqual(actividadDe(activity, ctx), caso.esperado);
});

test("I6 — save.dc.calculation 'wis' en una clase que no lanza (monk:stunning-strike) se rechaza con motivo", () => {
  const activity = {
    type: "save",
    activation: { type: "special", override: false },
    consumption: { targets: [] },
    duration: { units: "inst", concentration: false },
    damage: { onSave: "none", parts: [] },
    save: { ability: "con", dc: { calculation: "wis" } },
  };
  const resultado = actividadDe(activity, { spellcastingAbility: undefined });
  assert.equal(resultado.texto, true);
  assert.match(resultado.motivo, /dc\.calculation = 'wis'/);
  // En una clase cuya característica de lanzamiento coincide (paladín, cha) sí es cdDeConjuro.
  const enPaladin = actividadDe(
    { ...activity, save: { ability: "wis", dc: { calculation: "cha" } } },
    { spellcastingAbility: "cha" },
  );
  assert.equal(enPaladin.tipo, "salvacion");
  assert.deepEqual(enPaladin.salvacion.cd, { tipo: "cdDeConjuro" });
});

test("monk:ki — activation 'special' sin condición -> FREE; nivelDeClase('monk') es el tope", () => {
  const caso = casoPorId("monk:ki");
  const activity = {
    type: "utility",
    activation: { type: "special", override: false },
    consumption: { targets: [{ type: "itemUses", target: "", value: "1" }] },
    duration: { units: "", value: "" },
  };
  const ctx = ctxDesdeEsperado(caso.esperado, { recurso: "ki" });
  assert.deepEqual(actividadDe(activity, ctx), caso.esperado);
});

test("druid:wild-shape — type: transform, ya fuera de A (y hueco B-bis en duration)", () => {
  const caso = casoPorId("druid:wild-shape");
  const activity = {
    type: "transform",
    activation: { type: "action", override: false },
    consumption: { targets: [{ type: "itemUses", target: "", value: "1" }] },
    duration: { units: "hour", value: "floor(@classes.druid.levels / 2)" },
  };
  const resultado = actividadDe(activity, {});
  assert.equal(resultado.texto, true);
  assert.equal(caso.esperado.texto, true);
});

test("fighter:action-surge — activation 'special' -> FREE, igual que Ki", () => {
  const caso = casoPorId("fighter:action-surge");
  const activity = {
    type: "utility",
    activation: { type: "special", override: false },
    consumption: { targets: [{ type: "itemUses", target: "", value: "1" }] },
    duration: { units: "", value: "" },
  };
  const ctx = ctxDesdeEsperado(caso.esperado, { recurso: "action-surge" });
  assert.deepEqual(actividadDe(activity, ctx), caso.esperado);
});

test("fireball — salvacion con dados y escalado por espacio dentro de la misma actividad", () => {
  const caso = casoPorId("fireball");
  const activity = {
    type: "save",
    activation: { type: "action", override: false },
    consumption: { targets: [] },
    duration: { units: "", value: "" }, // el ítem trae inst -> instantanea vía ctx.itemDuration
    damage: {
      onSave: "half",
      parts: [
        {
          number: 8,
          denomination: 6,
          bonus: "",
          types: ["fire"],
          custom: { enabled: false, formula: "" },
          scaling: { mode: "whole", number: 1 },
        },
      ],
    },
    save: { ability: "dex", dc: { calculation: "spellcasting" } },
  };
  const ctx = ctxDesdeEsperado(caso.esperado, {
    itemRange: { units: "ft", value: "150" },
    itemDuration: { units: "inst", value: "" },
    itemMaterials: { value: "A tiny ball of bat guano and sulfur", consumed: false, cost: 0 },
    itemLevel: 3,
  });
  assert.deepEqual(actividadDe(activity, ctx), sinHigherLevels(caso.esperado));
});

test("cure-wounds — healing.bonus '@mod' -> lanzamiento, escalado por espacio", () => {
  const caso = casoPorId("cure-wounds");
  const activity = {
    type: "heal",
    activation: { type: "action", override: false },
    consumption: { targets: [] },
    duration: { units: "", value: "" },
    healing: {
      number: 1,
      denomination: 8,
      bonus: "@mod",
      custom: { enabled: false, formula: "" },
      scaling: { mode: "whole", number: 1 },
    },
  };
  const ctx = ctxDesdeEsperado(caso.esperado, {
    itemRange: { units: "touch" },
    itemDuration: { units: "inst", value: "" },
    itemLevel: 1,
  });
  assert.deepEqual(actividadDe(activity, ctx), sinHigherLevels(caso.esperado));
});

test("fire-bolt — attack.bonus vacío -> ataqueDeConjuro (amendment del orquestador a E-3A1-4)", () => {
  // NOTA: T0 (casos-raros.json) documentó fire-bolt como texto porque `Origen` no tenía
  // variante para el bono de ataque de conjuro. Esta tarea (T1) AÑADE esa variante
  // (`ataqueDeConjuro`) por decisión explícita del orquestador, que amend E-3A1-4 para cubrir
  // justo este caso. Se prueba el resultado NUEVO, no el literal de T0 (superado).
  const activity = {
    type: "attack",
    activation: { type: "action", override: false },
    consumption: { targets: [] },
    duration: { units: "", value: "" },
    target: { affects: { count: "1" } },
    attack: { ability: "", bonus: "", type: { value: "ranged" } },
    damage: {
      parts: [
        {
          number: 1,
          denomination: 10,
          bonus: "",
          types: ["fire"],
          custom: { enabled: false, formula: "" },
          scaling: { mode: "whole", number: 1 },
        },
      ],
    },
  };
  const ctx = {
    itemRange: { units: "ft", value: "120" },
    itemDuration: { units: "inst", value: "" },
    itemLevel: 0,
  };
  const resultado = actividadDe(activity, ctx);
  assert.deepEqual(resultado, {
    tipo: "ataque",
    activation: { coste: "ACTION" },
    range: { unidad: "pies", distanciaFt: 120 },
    duration: { unidad: "instantanea", concentracion: false },
    ataque: { bono: { tipo: "ataqueDeConjuro" } },
    dados: {
      n: 1,
      caras: 10,
      signo: -1,
      tipoDeDano: "FIRE",
      escalado: { por: "nivelDePersonaje", n: 1, caras: 10 },
    },
  });
});

test("revivify — healing.custom.formula '1' -> dados sin n/caras, solo bonus fijo", () => {
  const caso = casoPorId("revivify");
  const activity = {
    type: "heal",
    activation: { type: "action", override: false },
    consumption: { targets: [] },
    duration: { units: "", value: "" },
    healing: {
      number: null,
      denomination: null,
      bonus: "",
      custom: { enabled: true, formula: "1" },
      scaling: { mode: "", number: null },
    },
  };
  const ctx = ctxDesdeEsperado(caso.esperado, {
    itemRange: { units: "touch" },
    itemDuration: { units: "inst", value: "" },
    itemMaterials: {
      value: "Diamonds worth 300gp, which the spell consumes.",
      consumed: true,
      cost: 100,
    },
    itemLevel: 3,
  });
  assert.deepEqual(actividadDe(activity, ctx), caso.esperado);
});

test("scorching-ray — tres tiradas de ataque independientes: se queda en texto", () => {
  const caso = casoPorId("scorching-ray");
  const activity = {
    type: "attack",
    activation: { type: "action", override: false },
    consumption: { targets: [] },
    duration: { units: "", value: "" },
    target: { affects: { count: "3" } },
    attack: { bonus: "" },
    damage: {
      parts: [{ number: 2, denomination: 6, types: ["fire"], custom: { enabled: false } }],
    },
  };
  const resultado = actividadDe(activity, {});
  assert.equal(resultado.texto, true);
  assert.equal(caso.esperado.texto, true);
});

test("counterspell — check.ability 'spellcasting' -> prueba con ability 'lanzamiento', sin CD", () => {
  const caso = casoPorId("counterspell");
  const activity = {
    type: "check",
    activation: { type: "action", override: false }, // hereda la reacción del ítem
    consumption: { targets: [] },
    duration: { units: "", value: "" },
    check: { ability: "spellcasting", dc: { calculation: "", formula: "" } },
  };
  const ctx = ctxDesdeEsperado(caso.esperado, {
    itemActivation: {
      type: "reaction",
      condition: "which you take when you see a creature within 60 feet of you casting a spell",
    },
    itemRange: { units: "ft", value: "60" },
    itemDuration: { units: "inst", value: "" },
    itemLevel: 3,
  });
  assert.deepEqual(actividadDe(activity, ctx), caso.esperado);
});

// T2 (2026-09-14): dos huecos genéricos encontrados al medir por qué 108 conjuros con más de una
// actividad en Foundry se quedaban en solo 58 tras convertir — no eran 50 casos "fuera de A"
// declarados, sino dos patrones de datos de Foundry que `actividadDe` rechazaba sin necesidad.

test("save.ability como array de un solo elemento se desenvuelve, no se rechaza (grease, T2)", () => {
  const activity = {
    type: "save",
    activation: { type: "special", override: true, condition: "" },
    consumption: { targets: [] },
    duration: { units: "inst", concentration: false },
    damage: { onSave: "none", parts: [] },
    save: { ability: ["dex"], dc: { calculation: "spellcasting", formula: "" } },
  };
  const resultado = actividadDe(activity, {});
  assert.equal(resultado.tipo, "salvacion");
  assert.equal(resultado.salvacion.ability, "dex");
});

test("save.ability como array de dos o más elementos sí se rechaza (elección real de la mesa)", () => {
  const activity = {
    type: "save",
    activation: { type: "action", override: false },
    consumption: { targets: [] },
    duration: { units: "inst", concentration: false },
    damage: { onSave: "none", parts: [] },
    save: { ability: ["str", "dex"], dc: { calculation: "spellcasting", formula: "" } },
  };
  const resultado = actividadDe(activity, {});
  assert.equal(resultado.texto, true);
});

test("save.dc.calculation vacío con dc.formula entera -> cd fijo (contact-other-plane, T2)", () => {
  const activity = {
    type: "save",
    activation: { type: "action", override: false },
    consumption: { targets: [] },
    duration: { units: "inst", concentration: false },
    damage: { onSave: "none", parts: [] },
    save: { ability: "int", dc: { calculation: "", formula: "15" } },
  };
  const resultado = actividadDe(activity, {});
  assert.equal(resultado.tipo, "salvacion");
  assert.deepEqual(resultado.salvacion.cd, { tipo: "fijo", valor: 15 });
});

// -------------------------------------------------------------------------------------------
// Ola de arreglos (2026-09-14) — fixtures reconstruidas de los YAML reales que la revisión final
// señaló, una por hallazgo.

test("C1 — override:false hereda del ítem: Escudo es REACCIÓN y dura 1 asalto, no ACTION/instantánea", () => {
  // spells/1st-level/shield.yml: la actividad trae `activation.type: action` y `duration.units:
  // inst` como placeholders con `override: false`; el ítem dice reaction + 1 round.
  const activity = {
    type: "utility",
    activation: { type: "action", value: null, override: false },
    consumption: { targets: [] },
    duration: { units: "inst", concentration: false, override: false },
    range: { override: false },
  };
  const ctx = {
    itemActivation: {
      type: "reaction",
      condition: "Which you take when you are hit by an attack",
    },
    condicionEs: "que llevas a cabo cuando te impacta un ataque",
    itemDuration: { value: "1", units: "round" },
    itemRange: { units: "self" },
    itemConcentration: false,
    descripcionEs: "Aparece una barrera invisible.",
  };
  assert.deepEqual(actividadDe(activity, ctx), {
    tipo: "utilidad",
    activation: { coste: "REACTION", condicion: "que llevas a cabo cuando te impacta un ataque" },
    duration: { unidad: "asalto", concentracion: false, valor: 1 },
    description: "Aparece una barrera invisible.",
  });
});

test("C1 — override:true manda: una actividad secundaria con duración propia no hereda la concentración del ítem", () => {
  // spells/4th-level/black-tentacles.yml, «Restraining Tentacles»: el ítem es 1 minuto con
  // concentración; la actividad es instantánea con override:true y concentration:false.
  const activity = {
    type: "save",
    activation: { type: "special", override: true },
    consumption: { targets: [] },
    duration: { units: "inst", concentration: false, override: true },
    range: { override: true, units: "spec" },
    damage: { onSave: "none", parts: [] },
    save: { ability: "dex", dc: { calculation: "spellcasting" } },
  };
  const r = actividadDe(activity, {
    itemActivation: { type: "action" },
    itemDuration: { value: "1", units: "minute" },
    itemRange: { units: "ft", value: "90" },
    itemConcentration: true,
  });
  assert.deepEqual(r.activation, { coste: "FREE" });
  assert.deepEqual(r.duration, { unidad: "instantanea", concentracion: false });
  assert.deepEqual(r.range, { unidad: "especial" });
});

test("C1 — una unidad de duración sin equivalente (turn) se rechaza con motivo, no cae en instantánea", () => {
  const activity = {
    type: "utility",
    activation: { type: "action", override: true },
    consumption: { targets: [] },
    duration: { units: "turn", value: "1", override: true },
  };
  const r = actividadDe(activity, { descripcionEs: "x" });
  assert.equal(r.texto, true);
  assert.match(r.motivo, /duration\.units = 'turn'/);
});

test("C3 — un consumo cuyo target es un UUID de compendio se rechaza con motivo (flurry-of-blows)", () => {
  const activity = {
    type: "utility",
    activation: { type: "bonus", override: false },
    consumption: {
      targets: [
        {
          type: "itemUses",
          target: "Compendium.dnd5e.classfeatures.Item.10b6z2W1txNkrGP7",
          value: "1",
        },
      ],
    },
    duration: { units: "", value: "" },
  };
  const r = actividadDe(activity, { recurso: "flurry-of-blows", descripcionEs: "x" });
  assert.equal(r.texto, true);
  assert.match(r.motivo, /sin recurso resoluble/);
});

test("C3/I13 — 'feat:<identifier>' se traduce a la clave del catálogo por claveDeIdentificador", () => {
  const activity = {
    type: "utility",
    activation: { type: "action", override: false },
    consumption: { targets: [{ type: "itemUses", target: "feat:monks-focus", value: "1" }] },
    duration: { units: "", value: "" },
  };
  const r = actividadDe(activity, {
    recurso: "x",
    descripcionEs: "x",
    claveDeIdentificador: new Map([["monks-focus", "ki"]]),
  });
  assert.deepEqual(r.consumption, [{ recurso: "ki", cantidad: 1 }]);
});

test("I1 — damage.parts con más de una parte se rechaza entero (ice-storm), nunca la primera parte sola", () => {
  const activity = {
    type: "save",
    activation: { type: "action", override: false },
    consumption: { targets: [] },
    duration: { units: "inst", override: false },
    damage: {
      onSave: "half",
      parts: [
        { number: 2, denomination: 8, types: ["bludgeoning"], custom: { enabled: false } },
        { number: 4, denomination: 6, types: ["cold"], custom: { enabled: false } },
      ],
    },
    save: { ability: "dex", dc: { calculation: "spellcasting" } },
  };
  const r = actividadDe(activity, { itemDuration: { units: "inst" } });
  assert.equal(r.texto, true);
  assert.match(r.motivo, /2 partes/);
});

test("I5 — damage.onSave 'full' (Feeblemind) se rechaza: siSalva no sabe decir «todo el daño»", () => {
  const activity = {
    type: "save",
    activation: { type: "action", override: false },
    consumption: { targets: [] },
    duration: { units: "inst", override: false },
    damage: {
      onSave: "full",
      parts: [{ number: 4, denomination: 6, types: ["psychic"], custom: { enabled: false } }],
    },
    save: { ability: "int", dc: { calculation: "spellcasting" } },
  };
  const r = actividadDe(activity, { itemDuration: { units: "inst" } });
  assert.equal(r.texto, true);
  assert.match(r.motivo, /onSave = 'full'/);
});

test("I9 — la description no se recorta a 2000 caracteres", () => {
  const larga = "x".repeat(3000);
  const r = actividadDe(
    {
      type: "utility",
      activation: { type: "action", override: false },
      consumption: { targets: [] },
    },
    { descripcionEs: larga },
  );
  assert.equal(r.description.length, 3000);
});
