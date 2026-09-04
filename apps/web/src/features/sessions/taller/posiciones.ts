import type { EntityType } from "@dnd/shared";

// **Dónde cae cada chincheta del corcho, y por qué no lo decide el servidor.**
//
// La maqueta (`prototipo/src/features/taller/TableroTelarana.tsx`) trae seis posiciones escritas
// a mano en un `Record<string, {x, y}>`, porque allí el mundo son seis fichas fijas. Aquí el
// mundo es una tabla que crece, y **el modelo no guarda posiciones**: `Entity` (schema.prisma)
// no tiene ni `x` ni `y`, y **este carril no toca el servidor**, así que no se inventa un campo.
//
// Decisión, escrita aquí porque es la que se pidió documentar:
//
//   La posición es una **función pura del identificador de la ficha y de su tipo**. No depende
//   de qué otras fichas haya en el tablero, ni del orden en que lleguen, ni de cuándo se
//   consulten. Consecuencia buscada: **una ficha cae siempre en el mismo sitio** — entre
//   recargas, entre sesiones, entre navegadores y entre personas. Un DM que aprende dónde está
//   «El Puerto Viejo» lo sigue teniendo ahí cuando cree diez fichas más.
//
// El reparto es **radial por tipo**: los siete tipos del mundo se reparten la circunferencia en
// siete sectores, y dentro de su sector cada ficha coge un ángulo y uno de tres anillos a partir
// de la huella de su identificador. Así los PNJ quedan juntos, los lugares juntos, y los hilos
// que cruzan de un sector a otro se leen como lo que son: relaciones entre cosas distintas.
//
// **Lo que se paga por esa estabilidad, dicho sin adornos:** al ser función solo del `id`, dos
// fichas del mismo tipo pueden caer encima. No se corrige con un empujón entre vecinas porque
// eso volvería la posición dependiente del conjunto —justo lo que se quiere evitar—, así que el
// tablero lo compensa levantando la chincheta enfocada o seleccionada por encima de las demás
// (`z-index`), y la lista completa del mundo sigue estando en «Lo que sabe la mesa». Con tres
// anillos por sector hay 21 huecos naturales antes de que el solape sea probable.

/** El orden de los siete sectores. Fijo: cambiarlo mueve el mundo entero de sitio. */
const ORDEN_DE_TIPO: readonly EntityType[] = [
  "NPC",
  "LOCATION",
  "QUEST",
  "FACTION",
  "OBJECT",
  "EVENT",
  "DOCUMENT",
];

/**
 * FNV-1a de 32 bits. Se escribe entera aquí —son seis líneas— en vez de traer una dependencia:
 * lo único que se le pide es ser **determinista y estable para siempre**, que es justamente lo
 * que una librería con versiones no garantiza.
 */
function huella(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    // Multiplicación por el primo de FNV (16777619) descompuesta en sumas de desplazamientos:
    // en JavaScript un producto de 32 bits pierde precisión al pasar por un `double`.
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export interface PosicionEnElCorcho {
  /** Porcentaje de la anchura del tablero. */
  x: number;
  /** Porcentaje de la altura del tablero. */
  y: number;
}

/** Los tres anillos, del centro hacia fuera, como fracción del radio disponible. */
const ANILLOS = [0.46, 0.73, 1] as const;
/** Margen dentro del sector, en grados, para que dos sectores vecinos no se toquen. */
const MARGEN_DE_SECTOR = 7;
/** Semiejes de la elipse, en porcentaje. El tablero es más ancho que alto. */
const SEMIEJE_X = 36;
const SEMIEJE_Y = 34;

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

/**
 * La posición de una ficha en el corcho, en porcentajes. **Pura**: mismos argumentos, mismo
 * resultado, siempre.
 */
export function posicionDeFicha(id: string, type: EntityType): PosicionEnElCorcho {
  const h = huella(id);
  const sector = Math.max(0, ORDEN_DE_TIPO.indexOf(type));
  const anchoDeSector = 360 / ORDEN_DE_TIPO.length;
  // Los 12 bits bajos deciden el ángulo dentro del sector; dos bits de más arriba, el anillo.
  const dentroDelSector = (h & 0xfff) / 0x1000;
  const anillo = ANILLOS[(h >>> 12) % ANILLOS.length];

  const grados =
    sector * anchoDeSector +
    MARGEN_DE_SECTOR +
    dentroDelSector * (anchoDeSector - 2 * MARGEN_DE_SECTOR) -
    90; // −90° para que el primer sector empiece arriba y no a la derecha.
  const radianes = (grados * Math.PI) / 180;

  return {
    x: acotar(50 + Math.cos(radianes) * SEMIEJE_X * anillo, 13, 87),
    y: acotar(50 + Math.sin(radianes) * SEMIEJE_Y * anillo, 11, 89),
  };
}

/**
 * Cuántas chinchetas caben en el corcho antes de que deje de leerse.
 *
 * No es solo estética: los enlaces se piden **por ficha** (`GET /entities/:id/links` es la única
 * ruta que hay, `features/links/api.ts`), así que cada chincheta es una consulta más. Treinta es
 * el techo que este carril se pone para no convertir el taller en treinta peticiones abiertas —
 * y el tablero dice en voz alta cuántas se ha dejado fuera en vez de recortar en silencio.
 */
export const MAXIMO_DE_CHINCHETAS = 30;

/** La clave de un hilo, sin dirección: `a|b` con los dos extremos ordenados. */
export function claveDeHilo(unId: string, otroId: string): string {
  return unId < otroId ? `${unId}|${otroId}` : `${otroId}|${unId}`;
}
