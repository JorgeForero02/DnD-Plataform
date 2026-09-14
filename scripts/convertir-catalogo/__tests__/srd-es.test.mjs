import { test } from "node:test";
import assert from "node:assert/strict";
import { cortarSrdEs } from "../srd-es.mjs";

// Tarea 3A.1 (T1), Step 4. Fragmento sintético con tres cabeceras reales (una con `(ritual)`,
// una con `(truco)` y una con el campo "Tiempo de lanzamiento" partido en varias líneas — la
// misma forma que Contrahechizo, T0 sección c.4), una tabla de clase y una lista de conjuros.

const FRAGMENTO = `
Detectar magia
Adivinación nivel 1 (ritual)
Tiempo de lanzamiento: 1 acción
Alcance: Personal
Componentes: V, S
Duración: Concentración, hasta 10 minutos
Puedes notar la presencia de magia a 9 m o menos de ti.
A niveles superiores. Nada cambia con el nivel.

Descarga de fuego
Evocación (truco)
Tiempo de lanzamiento: 1 acción
Alcance: 36 m
Componentes: V, S
Duración: Instantánea
Lanzas una descarga de fuego contra un objetivo.

Contrahechizo
Abjuración nivel 3
Tiempo de lanzamiento: 1 reacción, que llevas
a cabo cuando una criatura que puedas ver lance
un conjuro
Alcance: 18 m
Componentes: S
Duración: Instantánea
Intentas interrumpir a una criatura.

El guerrero

Nivel
Bon. por competencia
Rasgos
1
+2
Estilo de Combate, Tomar Aliento
2
+2
Acción Súbita (un uso)
Nivel
Bon. por competencia
Rasgos
17
+6
Acción Súbita (dos usos), Indómito (tres usos)

Lista de conjuros del mago
Trucos
Descarga de fuego
Nivel 1
Detectar magia
`;

test("cortarSrdEs corta nombre, escuela, nivel, ritual y 'A niveles superiores'", () => {
  const { conjuros } = cortarSrdEs(FRAGMENTO);

  const detectarMagia = conjuros.get("Detectar magia");
  assert.ok(detectarMagia, "Detectar magia no se encontró");
  assert.equal(detectarMagia.level, 1);
  assert.equal(detectarMagia.school, "div");
  assert.equal(detectarMagia.ritual, true);
  assert.match(detectarMagia.textoEs, /Puedes notar la presencia de magia/);
  assert.match(detectarMagia.higherLevelsEs, /Nada cambia con el nivel/);

  const descargaDeFuego = conjuros.get("Descarga de fuego");
  assert.ok(descargaDeFuego, "Descarga de fuego (truco) no se encontró");
  assert.equal(descargaDeFuego.level, 0);
  assert.equal(descargaDeFuego.school, "evo");
  assert.equal(descargaDeFuego.ritual, false);

  const contrahechizo = conjuros.get("Contrahechizo");
  assert.ok(contrahechizo, "Contrahechizo (campo partido en varias líneas) no se encontró");
  assert.equal(contrahechizo.level, 3);
  // El campo "Tiempo de lanzamiento" ocupaba tres líneas: se recompone en una sola cadena.
  assert.match(
    contrahechizo.camposCrudos["Tiempo de lanzamiento:"],
    /1 reacción, que llevas a cabo cuando una criatura que puedas ver lance un conjuro/,
  );
});

test("cortarSrdEs lee una tabla de clase, descartando la fila de cabecera repetida", () => {
  const { tablasDeClase } = cortarSrdEs(FRAGMENTO);
  const guerrero = tablasDeClase.get("guerrero");
  assert.ok(guerrero, "La tabla 'El guerrero' no se leyó");
  assert.deepEqual(
    guerrero.map((f) => f.nivel),
    [1, 2, 17],
  );
  assert.deepEqual(guerrero[0].rasgos, ["Estilo de Combate", "Tomar Aliento"]);
  assert.deepEqual(guerrero[2].rasgos, ["Acción Súbita (dos usos)", "Indómito (tres usos)"]);
});

test("cortarSrdEs lee una lista de conjuros por clase, por nivel", () => {
  const { listasPorClase } = cortarSrdEs(FRAGMENTO);
  const mago = listasPorClase.get("mago");
  assert.ok(mago, "La lista de conjuros del mago no se leyó");
  assert.deepEqual(mago.porNivel.get(0), ["Descarga de fuego"]);
  assert.deepEqual(mago.porNivel.get(1), ["Detectar magia"]);
});
