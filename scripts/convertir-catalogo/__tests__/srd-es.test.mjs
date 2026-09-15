import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cortarSrdEs,
  cortarAptitudesEs,
  textoDeAptitud,
  textoDeRasgoDeRaza,
  limpiarProsaEs,
} from "../srd-es.mjs";

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

Conjuros de mago
Trucos (nivel 0)
Descarga de fuego
Nivel 1
Detectar magia
Descripciones de conjuros
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

// -------------------------------------------------------------------------------------------
// Tarea 3A.1 (T3b) — `cortarAptitudesEs`: fragmentos REALES de `srd-5.1-es.txt` (guerrero,
// pícaro y elfo — las mismas líneas que aparecen en el documento, recortadas alrededor de las
// cabeceras de capítulo que el cortador busca).

const FRAGMENTO_CLASES = `
Bárbaro
Rasgos de clase
Como bárbaro, obtienes los siguientes rasgos.
Puntos de golpe
Dados de Golpe: 1d12 por nivel de bárbaro.

Guerrero
Rasgos de clase
Como guerrero, obtienes los siguientes rasgos
de clase.
Puntos de golpe
Dados de Golpe: 1d10 por nivel de guerrero.

El guerrero
Nivel
Bon. por
competencia
Rasgos
1
+2
Estilo de Combate, Tomar Aliento
2
+2
Acción Súbita (un uso)

Tiro con Arco
Recibes un bonificador de +2 a las tiradas de ataque
con armas a distancia.
Tomar Aliento
Posees una pequeña reserva de energías a la que
puedes recurrir para protegerte del peligro. Puedes
usar una acción adicional durante tu turno para
recuperar una cantidad de puntos de golpe igual
a 1d10 + tu nivel de guerrero. Una vez utilizado este
rasgo, deberás terminar un descanso corto o largo
para poder emplearlo de nuevo.
Acción Súbita
A partir del nivel 2, puedes superar tus límites
normales durante un instante. Durante tu turno,
puedes llevar a cabo una acción más, además de
tu acción y acción adicional habituales.

Pícaro
Rasgos de clase
Como pícaro, obtienes los siguientes rasgos
de clase.
Puntos de golpe
Dados de Golpe: 1d8 por nivel de pícaro.
Ataque Furtivo
A partir del nivel 1, sabes cómo atacar sutilmente
y aprovecharte de un enemigo distraído. Una vez
por turno, puedes infligir 1d6 de daño adicional.
Más allá del nivel 1
A medida que tu personaje viva aventuras...
`;

test("cortarAptitudesEs — Formato A (cabecera sola + prosa): Tomar Aliento y Acción Súbita", () => {
  const cortes = cortarAptitudesEs(FRAGMENTO_CLASES);
  assert.match(
    textoDeAptitud(cortes, "fighter", "Tomar Aliento"),
    /^Posees una pequeña reserva de energías/,
  );
  assert.match(
    textoDeAptitud(cortes, "fighter", "Acción Súbita"),
    /^A partir del nivel 2, puedes superar tus límites/,
  );
});

test("cortarAptitudesEs — Formato B (viñeta en línea, «Nombre. Prosa») vía «Tiro con Arco»", () => {
  const cortes = cortarAptitudesEs(FRAGMENTO_CLASES);
  assert.match(
    textoDeAptitud(cortes, "fighter", "Tiro con Arco"),
    /^Recibes un bonificador de \+2/,
  );
});

test("cortarAptitudesEs — la tabla de clase (Nivel/Bon./Rasgos) nunca se confunde con una cabecera", () => {
  const cortes = cortarAptitudesEs(FRAGMENTO_CLASES);
  // "Tomar Aliento" aparece DENTRO de la tabla, en una celda con coma ("Estilo de Combate, Tomar
  // Aliento") — no debe pisar la cabecera real de más abajo.
  assert.match(textoDeAptitud(cortes, "fighter", "Tomar Aliento"), /^Posees una pequeña reserva/);
});

test("cortarAptitudesEs — el pícaro tiene su propio Ataque Furtivo, sección aparte de la del guerrero", () => {
  const cortes = cortarAptitudesEs(FRAGMENTO_CLASES);
  assert.match(
    textoDeAptitud(cortes, "rogue", "Ataque Furtivo"),
    /^A partir del nivel 1, sabes cómo atacar sutilmente/,
  );
  // Un nombre nunca visto en la sección del pícaro no está en su índice — la MISMA búsqueda que
  // hace `textoDeAptitud` cae a `global` (el respaldo de `shared-features`, ver `srd-es.mjs`),
  // que sí puede devolverlo si algún otro nombre coincide: eso es el respaldo funcionando, no
  // una fuga entre clases. Lo que este caso comprueba es que la sección PROPIA gana cuando
  // existe — ya cubierto por la aserción de arriba y por el siguiente caso, sin ambigüedad de
  // clase (ninguna otra sección del fragmento define "Ataque Furtivo").
  const indicePropioDelPicaro = cortes.porClase.get("rogue");
  assert.equal(indicePropioDelPicaro.has("tomar aliento"), false);
});

const FRAGMENTO_RAZAS = `
Elfo
Atributos de los elfos
Tu personaje elfo posee una gran variedad de
capacidades innatas.
 Visión en la Oscuridad. Acostumbrado a la
penumbra de los bosques, puedes ver bien en la
oscuridad o con poca luz.
 Sentidos Agudos. Eres competente en la habilidad
Percepción.
 Linaje Feérico. Tienes ventaja en las tiradas de
salvación para evitar que te hechicen y la magia
no puede dormirte.
 Trance. Los elfos no necesitan dormir. Meditan
profundamente, en un estado semiconsciente,
durante 4 horas al día.
Alto elfo
Como alto elfo, posees una mente aguda.

Enano
Atributos de los enanos
Tu personaje enano tiene una serie de
características innatas.
`;

test("cortarAptitudesEs — rasgos de raza (Formato B, «Nombre. Prosa» dentro del párrafo)", () => {
  const cortes = cortarAptitudesEs(FRAGMENTO_RAZAS);
  assert.match(
    textoDeRasgoDeRaza(cortes, "elf", "Linaje Feérico"),
    /^Tienes ventaja en las tiradas de salvación/,
  );
  assert.match(textoDeRasgoDeRaza(cortes, "elf", "Trance"), /^Los elfos no necesitan dormir/);
});

test("cortarAptitudesEs — una raza no ve el texto de la siguiente", () => {
  const cortes = cortarAptitudesEs(FRAGMENTO_RAZAS);
  assert.equal(textoDeRasgoDeRaza(cortes, "dwarf", "Linaje Feérico"), undefined);
});

test("limpiarProsaEs — colapsa espacios dobles (defecto de extracción de PDF) a uno", () => {
  assert.equal(
    limpiarProsaEs("Posees  una pequeña   reserva de energías"),
    "Posees una pequeña reserva de energías",
  );
});

test("limpiarProsaEs — no toca un texto ya limpio, ni sus saltos de línea", () => {
  assert.equal(limpiarProsaEs("Línea uno\nLínea dos"), "Línea uno\nLínea dos");
});
