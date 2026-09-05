import { CHARACTER_COLORS, type CharacterColor } from "@dnd/shared";

// Plan 05, decisión D3 — **el color de un personaje se decide en UN solo sitio.**
//
// Antes había dos respuestas distintas a «¿de qué color es esta persona?»: el hilo hacía una huella
// del `actorUserId` sobre cuatro tonos (`hilo/tipo-de-mensaje.ts`) y el elenco pintaba **cobre para
// todos** (`elenco/FichaDeElenco.tsx`), porque el modelo no tenía campo de color. Ni coincidían ni
// podían: eran dos cálculos.
//
// Ahora hay uno. La voz del hilo y el retrato del elenco llaman a `vozDePersonaje`, y hay una prueba
// de que dan lo mismo — es la que impide que vuelvan a separarse.
//
// ## Dónde vive, y por qué aquí
//
// En `apps/web/src/dominio/`, junto a `dano.ts`, por la misma regla: es **vocabulario del juego
// usado por más de una pantalla**. `packages/shared` declara la lista cerrada (`CHARACTER_COLORS`),
// que es forma de datos; el rótulo en español y la clase de Tailwind son interfaz y viven aquí.

/**
 * De clave guardada a **clase de Tailwind**.
 *
 * Las cuatro primeras reutilizan tokens que ya existían y que **no cambian de oficio** al usarse
 * como voz: los cuatro son tinta legible por definición. Las cuatro últimas son tokens **nuevos y
 * solo para esto**, con su contraste medido en los tres temas y anotado en `ui/tokens.css`.
 *
 * **Ni `--warning-text` ni `--muted`**: el ámbar significa «cuidado» y el apagado significa «esto
 * está apagado». Gastarlos como voz los quema para el trabajo que sí hacen.
 */
const CLASE_DE_COLOR: Record<CharacterColor, string> = {
  tinta: "text-text",
  cobre: "text-copper-text",
  senal: "text-accent-text",
  brasa: "text-danger-text",
  salvia: "text-voz-salvia",
  ciruela: "text-voz-ciruela",
  indigo: "text-voz-indigo",
  arena: "text-voz-arena",
};

/**
 * De clave guardada a **nombre que se lee**. El selector de la hoja enseña muestras con su nombre:
 * nadie elige «senal», elige «señal».
 *
 * Las claves van sin tilde **porque son claves** —viajan por la red y se guardan en una columna—;
 * el español con sus tildes es esto.
 */
export const NOMBRE_DE_COLOR: Record<CharacterColor, string> = {
  tinta: "tinta",
  cobre: "cobre",
  senal: "señal",
  brasa: "brasa",
  salvia: "salvia",
  ciruela: "ciruela",
  indigo: "índigo",
  arena: "arena",
};

/** Lo mínimo que hace falta para saber el color de alguien. No pide el personaje entero. */
export interface ConColor {
  id: string;
  color?: string | null;
}

/**
 * **La huella: el mismo `id` da siempre el mismo color.**
 *
 * Es lo que hace útil el valor por defecto — nadie tiene que elegir para empezar a jugar, y aun así
 * el personaje sale igual entre recargas, navegadores y personas, sin guardar nada.
 *
 * **Es del `id` del PERSONAJE, no del usuario**, y ese es el arreglo: hasta hoy era del
 * `actorUserId`, así que los dos personajes de un mismo jugador salían del mismo color.
 */
export function colorPorDefecto(id: string): CharacterColor {
  let acumulado = 0;
  for (let i = 0; i < id.length; i += 1) {
    acumulado = (acumulado * 31 + id.charCodeAt(i)) >>> 0;
  }
  return CHARACTER_COLORS[acumulado % CHARACTER_COLORS.length];
}

/**
 * La clave de color de un personaje: **la que eligió, y si no eligió, la de por defecto**.
 *
 * Una clave escrita **no se pisa nunca** con un recálculo. Y una clave que ya no está en la lista
 * —porque la lista cambió— cae al defecto en vez de romper: es dato viejo, no un error.
 */
export function colorDePersonaje(personaje: ConColor): CharacterColor {
  const elegido = personaje.color;
  if (elegido && (CHARACTER_COLORS as readonly string[]).includes(elegido)) {
    return elegido as CharacterColor;
  }
  return colorPorDefecto(personaje.id);
}

/** La clase de Tailwind con la que se pinta a alguien: **la voz del hilo y el retrato del elenco**. */
export function vozDePersonaje(personaje: ConColor): string {
  return CLASE_DE_COLOR[colorDePersonaje(personaje)];
}

/** Todas las clases posibles, para las pruebas y para el selector. */
export function clasesDeVoz(): string[] {
  return CHARACTER_COLORS.map((c) => CLASE_DE_COLOR[c]);
}
