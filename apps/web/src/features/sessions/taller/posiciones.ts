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
// **Lo que se paga por esa estabilidad, MEDIDO y no estimado.** La primera versión de este
// comentario afirmaba que «con tres anillos por sector hay 21 huecos naturales antes de que el
// solape sea probable». **Era falso**, y lo destapó el reseño de cierre ejecutando la función.
// Estas son las cifras reales: porcentaje de chinchetas que quedan tapadas por otra, sobre 400
// mundos sintéticos por casilla, con la chincheta de una línea que se pinta hoy (112x26 px) y
// esta misma configuración de anillos:
//
// ```
//   tablero      6 fichas   10    14    18    24    30
//   600x420        34%      51%   63%   73%   82%   89%
//   900x560        22%      35%   44%   54%   65%   73%
//  1000x700        18%      29%   38%   46%   56%   64%
// ```
//
// Con la tarjeta de tres líneas que había antes (144x76 px) esas cifras eran 73%/90%/…/100%: de
// ahí sale el encogimiento de la chincheta a una sola línea y la bajada del techo de 30 a 18.
//
// **Y el fondo del asunto, dicho claro: ningún reparto que sea función SOLO del `id` lee.** Se
// probaron nueve configuraciones —anillos más separados, cuatro anillos, ángulo cuantizado en
// tres, cuatro y cinco posiciones por sector, chinchetas de 96 px, y un corcho de 2200x1500 con
// scroll propio— y **ninguna baja del 10% de tapadas ni con seis fichas**. No es un problema de
// afinar constantes: con posiciones independientes entre sí, la probabilidad de encuentro crece
// con el cuadrado del número de fichas y no hay superficie que lo compense.
//
// **El arreglo de verdad es colocar por CONJUNTO** —repartir las fichas ordenadas por `id` sobre
// una retícula de huecos que no se solapan, determinista para un mismo mundo y que solo se
// recoloca cuando el mundo cambia—. Eso cambia la decisión que este fichero documenta, así que
// **no se toma aquí**: está escalada en el informe del carril, sin decidir. Hasta que se decida,
// el tablero lo compensa levantando por `z-index` la chincheta enfocada o elegida, y la lista
// completa y legible del mundo vive en la solapa «Lo que sabe la mesa».

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

// Los tres anillos, del centro hacia fuera, como fracción del radio disponible. El interior sube
// de 0,46 a 0,58 porque a 0,46 los siete sectores se juntaban casi en el mismo punto: medido, ese
// solo cambio quita entre 6 y 8 puntos de solape en todos los tamaños.
const ANILLOS = [0.58, 0.79, 1] as const;
/** Margen dentro del sector, en grados, para que dos sectores vecinos no se toquen. */
const MARGEN_DE_SECTOR = 5;
/** Semiejes de la elipse, en porcentaje. El tablero es más ancho que alto. */
const SEMIEJE_X = 40;
const SEMIEJE_Y = 38;

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

  // Los topes son **exactamente** el alcance geométrico (50 ± semieje), así que `acotar` es una
  // red y no un recorte: con los semiejes de arriba no se dispara nunca. Se comprobó sobre 3000
  // identificadores. Si alguien sube un semieje y olvida el tope, esto empezaría a apilar fichas
  // contra el borde en silencio — de ahí que los dos números se deriven de las constantes.
  return {
    x: acotar(50 + Math.cos(radianes) * SEMIEJE_X * anillo, 50 - SEMIEJE_X, 50 + SEMIEJE_X),
    y: acotar(50 + Math.sin(radianes) * SEMIEJE_Y * anillo, 50 - SEMIEJE_Y, 50 + SEMIEJE_Y),
  };
}

/**
 * Cuántas chinchetas caben en el corcho antes de que deje de leerse.
 *
 * **Dieciocho, bajado de treinta con la tabla de arriba delante.** A treinta no quedaba una sola
 * ficha sin tapar en ningún tamaño realista; a dieciocho el tablero sigue sin leerse del todo
 * (46% tapadas en 1000x700) pero al menos la mitad de las chinchetas se distinguen. **No es un
 * número satisfactorio y no se presenta como tal**: es lo mejor que da el reparto por `id`, y por
 * eso la decisión de colocar por conjunto está escalada.
 *
 * Tampoco es solo estética: los enlaces se piden **por ficha** (`GET /entities/:id/links` es la
 * única ruta que hay, `features/links/api.ts`), así que cada chincheta es además una consulta
 * abierta. El tablero dice en voz alta cuántas se ha dejado fuera en vez de recortar en silencio.
 */
export const MAXIMO_DE_CHINCHETAS = 18;

/** La clave de un hilo, sin dirección: `a|b` con los dos extremos ordenados. */
export function claveDeHilo(unId: string, otroId: string): string {
  return unId < otroId ? `${unId}|${otroId}` : `${otroId}|${unId}`;
}
