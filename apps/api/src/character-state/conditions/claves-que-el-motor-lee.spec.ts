import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CLAVE_AYUDA, CLAVE_FURIA_ACTIVA, esClaveReservada } from "@dnd/shared";

// **Ficha P2-1 — la clave de una condición es un contrato de seguridad, y lo sostenía la costumbre.**
//
// El argumento entero, en una frase: si el motor LEE una clave para decidir algo —modo de tirada,
// velocidad, daño—, esa clave tiene que estar reservada (`esClaveReservada`, `@dnd/shared`), o
// cualquier jugador se la escribe a sí mismo por la puerta genérica de condiciones y se concede la
// mecánica sin pagarla.
//
// **Y el dos-de-dos es el dato que manda.** De las claves que el motor lee, todas menos dos son
// del SRD y llegaron reservadas de oficio con la lista de quince. Las dos que no —`helped` y
// `raging`— son exactamente las dos que hubo que acordarse de añadir a mano, y las dos se
// añadieron **después** de que el agujero ya estuviera abierto en producción. `raging` es, letra
// por letra, la reincidencia del fallo que `helped` cerró once tareas antes. No hay ningún caso en
// el que la costumbre haya funcionado a la primera.
//
// **Por qué NO basta con buscar `=== "..."`, que es el corazón de esta prueba.** Las lecturas
// vienen en dos formas y la mitad del tráfico va por la segunda:
//
//  · comparación directa — `condition.key === "exhaustion"`;
//  · pertenencia a un conjunto — `VENTAJA_EN_ATAQUE.has(condition.key)`.
//
// Hay **siete** conjuntos (`VENTAJA_EN_ATAQUE`, `DESVENTAJA_EN_ATAQUE`, `DESVENTAJA_EN_PRUEBAS`,
// `CONDICIONES_DE_FALLO_AUTOMATICO`, `CONDICIONES_A_CERO`, `VENTAJA_CONTRA`, `DESVENTAJA_CONTRA`),
// y **dentro de uno vive la única lectura de `helped`**. Una red que solo mirara literales
// comparados dejaría fuera justo la clave que motivó la ficha — que es, literalmente, el mismo
// error de mirar una sola forma por el que este proyecto ya se olvidó de reservar `helped` y
// `raging`, una vez cada uno. Las dos cuentas anteriores de la ficha se quedaron cortas por eso.
//
// **Y una tercera forma, la que consulta la base**: `key: CLAVE_AYUDA` dentro de un `where` de
// Prisma. Ahí la clave llega por constante, no por literal, así que se resuelven las constantes
// conocidas por su valor en vez de fingir que no se leen.
//
// **Lo que esta red NO cierra, dicho para que nadie la crea más fuerte de lo que es.** Se burla
// leyendo la clave desde una variable (`const k = "..."; if (c.key === k)`). No se cierra porque
// no es el fallo realista: quien añade un `if` de buena fe escribe el literal o lo mete en el
// conjunto de al lado. El fallo es **olvidarse**, no evadir. El cierre de verdad —que el motor
// solo pueda leer la clave de constantes declaradas en `shared`, y esta prueba comprobar
// importaciones en vez de literales— es un cambio de forma, y `CLAVE_FURIA_ACTIVA` ya lo hace hoy
// sin que nada lo obligue.

const API_SRC = join(__dirname, "..", "..");

/**
 * **Los seis ficheros del motor que leen una condición por su clave**, medidos abriéndolos, no de
 * memoria: la ficha los contó tres veces y las dos primeras se quedaron cortas.
 *
 * Si aparece un séptimo, esta lista tiene que crecer — y ese es el límite conocido de esta red:
 * **no descubre ficheros nuevos, defiende los que sabe**. Se acepta a propósito porque la
 * alternativa —barrer `src/` entero buscando `.key`— trae cientos de aciertos que no son claves de
 * condición (`srdKey`, `raceKey`, `classKey`, la clave de un ataque) y una prueba con ruido es una
 * prueba que se acaba desactivando.
 */
const FICHEROS_DEL_MOTOR = [
  "character-state/roll-mode/suggested-roll-mode.ts",
  "character-state/roll-mode/modo-contra-objetivo.ts",
  "character-state/speed/effective-speed.ts",
  "character-state/common/agotamiento.ts",
  "character-state/rest/rest.service.ts",
  "characters/character-sheet.service.ts",
] as const;

/** La puerta: escribir y retirar. Sus tres comparaciones se cuentan aparte de las quince lecturas. */
const PUERTA = "character-state/conditions/conditions.service.ts";

/** Las constantes con las que el motor nombra una clave sin escribirla como literal. */
const CONSTANTES: Record<string, string> = {
  CLAVE_AYUDA,
  CLAVE_FURIA_ACTIVA,
};

/** Un nombre local cualquiera para la fila de la condición: `condition`, `condicion`, `c`, `fila`. */
const RECEPTOR = "[A-Za-z_$][\\w$]*";

function leer(relativo: string): string {
  return readFileSync(join(API_SRC, relativo), "utf8");
}

/** `algo.key === "literal"` y su forma espejo, `"literal" === algo.key`. */
function comparacionesDirectas(fuente: string): string[] {
  const claves: string[] = [];
  const izquierda = new RegExp(`${RECEPTOR}\\.key\\s*===\\s*"([^"]+)"`, "g");
  const derecha = new RegExp(`"([^"]+)"\\s*===\\s*${RECEPTOR}\\.key`, "g");
  for (const patron of [izquierda, derecha]) {
    for (const m of fuente.matchAll(patron)) claves.push(m[1]);
  }
  return claves;
}

/** `algo.key === CONSTANTE` — la clave llega por nombre, y se resuelve a su valor. */
function comparacionesPorConstante(fuente: string): string[] {
  const claves: string[] = [];
  const patron = new RegExp(`${RECEPTOR}\\.key\\s*===\\s*([A-Z][A-Z0-9_]*)`, "g");
  for (const m of fuente.matchAll(patron)) {
    const valor = CONSTANTES[m[1]];
    if (valor !== undefined) claves.push(valor);
  }
  return claves;
}

/**
 * La tercera forma de leer una clave: **preguntandosela a la base**, en el `where` de una consulta
 * sobre `CharacterCondition`.
 *
 * **Anclada al `where`, y no a un `key:` cualquiera**, porque `key:` a secas es la propiedad mas
 * generica del proyecto: `key: "save.con"` es la clave de una peticion de tirada,
 * `key: fila.srdKey` la de un objeto del catalogo, `key: character.raceKey` la de una raza.
 * Contarlas todas convertia esta red en un generador de falsos positivos —la primera version de
 * esta prueba se puso roja por `save.con`, que no es una condicion—, y una prueba con ruido es una
 * prueba que alguien acaba desactivando.
 *
 * Las dos formas que de verdad consultan una condicion, las dos compactas y dentro de un solo
 * bloque —el `[^}]*?` impide que el patron se escape al objeto de al lado—:
 *
 *  · `characterId_key: { characterId, key: X }` — la clave unica de la tabla;
 *  · `where: { characterId, key: X }` — el filtro directo.
 *
 * **El limite, dicho:** una consulta escrita de otra forma se le escapa. Es aceptable porque esta
 * forma no es donde se olvida una reserva — ahi se olvida en un `if` o en un conjunto, que es lo
 * que las otras dos funciones barren sin anclaje ninguno.
 */
function consultasPorClave(fuente: string): string[] {
  const claves: string[] = [];
  const anclas = [
    /characterId_key:\s*\{[^}]*?\bkey:\s*(?:"([^"]+)"|([A-Z][A-Z0-9_]*))/g,
    /where:\s*\{[^}]*?\bcharacterId\b[^}]*?\bkey:\s*(?:"([^"]+)"|([A-Z][A-Z0-9_]*))/g,
  ];
  for (const patron of anclas) {
    for (const m of fuente.matchAll(patron)) {
      const literal = m[1];
      const constante = m[2];
      if (literal !== undefined) claves.push(literal);
      else if (constante !== undefined && CONSTANTES[constante] !== undefined) {
        claves.push(CONSTANTES[constante]);
      }
    }
  }
  return claves;
}

/**
 * Los conjuntos que se consultan con `X.has(algo.key)`, y sus miembros.
 *
 * **Primero se averigua QUÉ conjuntos son de claves de condición** —los que reciben un `.key`— y
 * solo entonces se leen sus miembros. Hacerlo al revés (leer todos los `new Set([...])` del
 * fichero) metería en la lista cualquier conjunto de otra cosa que pase por ahí.
 */
function miembrosDeConjuntosConsultados(fuente: string): string[] {
  const consultados = new Set<string>();
  const patron = new RegExp(`([A-Za-z_$][\\w$]*)\\.has\\(\\s*${RECEPTOR}\\.key\\s*\\)`, "g");
  for (const m of fuente.matchAll(patron)) consultados.add(m[1]);

  const claves: string[] = [];
  for (const nombre of consultados) {
    const declaracion = new RegExp(
      `\\b${nombre}\\s*=\\s*new Set(?:<[^>]*>)?\\(\\s*\\[([\\s\\S]*?)\\]\\s*\\)`,
    );
    const cuerpo = declaracion.exec(fuente);
    // Un conjunto consultado cuyos miembros no se pueden leer aquí es un agujero, no un caso
    // aburrido: se dice en voz alta en vez de pasar de largo en silencio.
    expect(cuerpo).not.toBeNull();
    for (const m of cuerpo![1].matchAll(/"([^"]+)"/g)) claves.push(m[1]);
    for (const m of cuerpo![1].matchAll(/\b([A-Z][A-Z0-9_]*)\b/g)) {
      const valor = CONSTANTES[m[1]];
      if (valor !== undefined) claves.push(valor);
    }
  }
  return claves;
}

function clavesQueLee(relativo: string): string[] {
  const fuente = leer(relativo);
  return [
    ...comparacionesDirectas(fuente),
    ...comparacionesPorConstante(fuente),
    ...consultasPorClave(fuente),
    ...miembrosDeConjuntosConsultados(fuente),
  ];
}

describe("toda clave de condición que el motor lee está reservada", () => {
  it.each(FICHEROS_DEL_MOTOR)("%s", (relativo) => {
    const claves = [...new Set(clavesQueLee(relativo))];
    // Si un fichero de la lista deja de leer claves, la red se ha quedado apuntando a otro sitio
    // y hay que mover la lista — no es un aprobado.
    expect(claves.length).toBeGreaterThan(0);
    const sinReservar = claves.filter((clave) => !esClaveReservada(clave));
    expect(sinReservar).toEqual([]);
  });

  // **La puerta también compara claves**, y sus tres comparaciones son parte del mismo contrato:
  // decide a quién deja escribir cuál. Va aparte de las seis de arriba porque no es motor —no
  // decide un número—, pero se defiende igual.
  it(`la puerta (${PUERTA})`, () => {
    const claves = [...new Set(clavesQueLee(PUERTA))];
    expect(claves.length).toBeGreaterThan(0);
    expect(claves.filter((clave) => !esClaveReservada(clave))).toEqual([]);
  });

  // **La red se dimensiona con la lista entera de la ficha, no con una parte.** Este recuento es
  // lo que impide que alguien "arregle" la prueba estrechando los patrones hasta que solo mire una
  // forma de comparar: si mañana lee menos claves de las que hay, la cuenta baja y esto enrojece.
  it("y lee las tres formas: comparación, consulta a la base y pertenencia a un conjunto", () => {
    const suggested = leer("character-state/roll-mode/suggested-roll-mode.ts");
    // Las dos comparaciones directas de ese fichero: `exhaustion` y `restrained`.
    expect(new Set(comparacionesDirectas(suggested))).toEqual(
      new Set(["exhaustion", "restrained"]),
    );
    // Y sus cuatro conjuntos, con `helped` dentro de uno — la clave que una red de solo literales
    // habría perdido, y el motivo entero de que esta prueba mire los `Set`.
    const enConjuntos = new Set(miembrosDeConjuntosConsultados(suggested));
    expect(enConjuntos).toContain(CLAVE_AYUDA);
    expect(enConjuntos).toContain("invisible");
    expect(enConjuntos).toContain("unconscious");
    // La tercera forma vive en la hoja: `where: { key: CLAVE_FURIA_ACTIVA }`.
    const hoja = new Set(consultasPorClave(leer("characters/character-sheet.service.ts")));
    expect(hoja).toContain(CLAVE_FURIA_ACTIVA);
    expect(hoja).toContain(CLAVE_AYUDA);
  });
});
