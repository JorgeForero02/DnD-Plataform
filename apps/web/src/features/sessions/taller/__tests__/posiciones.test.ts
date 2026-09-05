import { describe, expect, it } from "vitest";
import type { EntityType } from "@dnd/shared";
import { MAXIMO_DE_CHINCHETAS, claveDeHilo, posicionDeFicha } from "../posiciones";

// Qué defiende este fichero, y por qué existe.
//
// El reseño de cierre del 2026-09-04 encontró el defecto más grave del día **ejecutando esta
// función en `node` durante cinco minutos**: el comentario del módulo afirmaba que «con tres
// anillos por sector hay 21 huecos naturales antes de que el solape sea probable», y la medición
// real daba **75% de chinchetas tapadas con seis fichas**. El comentario ya está corregido y trae
// su tabla medida. Estas pruebas son lo que impide que vuelva a mentir: **el tope de solape se
// mide aquí, en cada tanda, en vez de escribirse en una frase que nadie ejecuta.**
//
// Las tres propiedades que se defienden, en orden de importancia:
//
//  1. **Determinismo** — una ficha cae siempre en el mismo sitio. Es la decisión que el módulo
//     documenta y todo lo demás se paga por ella.
//  2. **Independencia del conjunto** — crear fichas nuevas no mueve las que ya estaban. Es lo
//     único que se compró a cambio del solape: si se pierde, no queda nada.
//  3. **Un tope de solape medido** — cuántas chinchetas quedan tapadas, contadas de verdad.

const TIPOS: readonly EntityType[] = [
  "NPC",
  "LOCATION",
  "QUEST",
  "FACTION",
  "OBJECT",
  "EVENT",
  "DOCUMENT",
];

// Las constantes del módulo, repetidas aquí a propósito: si alguien las cambia allí sin pensar,
// las pruebas de abajo lo dicen. No se importan porque no son públicas, y no deben serlo.
const SEMIEJE_X = 40;
const SEMIEJE_Y = 38;

// La chincheta que se pinta hoy: `w-28` (7rem = 112 px) de una sola línea, centrada sobre su
// punto por `-translate-x-1/2 -translate-y-1/2` (TableroTelarana.tsx). Alto medido: 26 px.
const ANCHO_DE_CHINCHETA = 112;
const ALTO_DE_CHINCHETA = 26;

describe("la posición de una ficha en el corcho", () => {
  // La promesa del módulo, y la razón de que la posición no la guarde el servidor: un DM que
  // aprende dónde está «El Puerto Viejo» lo sigue teniendo ahí en la siguiente recarga.
  it("es determinista: los mismos argumentos dan el mismo punto dos veces", () => {
    for (let i = 0; i < 200; i += 1) {
      const id = `e-${i}`;
      const tipo = TIPOS[i % TIPOS.length];
      expect(posicionDeFicha(id, tipo)).toEqual(posicionDeFicha(id, tipo));
    }
  });

  // **La propiedad que se compró a cambio del solape.** Si añadir fichas moviera las viejas, el
  // tablero tendría lo peor de las dos opciones: se solapa Y baila. Se comprueba pidiendo las
  // posiciones de un mundo pequeño y volviéndolas a pedir con el mundo triplicado.
  it("no depende del resto del tablero: crear fichas no mueve las que ya estaban", () => {
    const mundoPequeno = Array.from({ length: 6 }, (_, i) => ({
      id: `e-${i}`,
      type: TIPOS[i % TIPOS.length],
    }));
    const antes = mundoPequeno.map((f) => posicionDeFicha(f.id, f.type));

    // El mundo crece a dieciocho, y en otro orden de llegada: ni el número ni el orden cuentan.
    const mundoGrande = [
      ...Array.from({ length: 12 }, (_, i) => ({
        id: `e-nueva-${i}`,
        type: TIPOS[(i * 3) % TIPOS.length],
      })),
      ...[...mundoPequeno].reverse(),
    ];
    for (const ficha of mundoGrande) posicionDeFicha(ficha.id, ficha.type);

    const despues = mundoPequeno.map((f) => posicionDeFicha(f.id, f.type));
    expect(despues).toEqual(antes);
  });

  // El tipo forma parte de la clave: el reparto es radial por sector, así que la misma ficha con
  // otro tipo cae en otro sitio. Es lo que hace que los PNJ queden juntos y los lugares juntos.
  it("el sector depende del tipo, así que el mismo id en otro tipo cae en otro sector", () => {
    const puntos = TIPOS.map((tipo) => posicionDeFicha("e-mismo-id", tipo));
    const distintos = new Set(puntos.map((p) => `${p.x.toFixed(6)},${p.y.toFixed(6)}`));
    expect(distintos.size).toBe(TIPOS.length);
  });

  // **`acotar` es una red, no un recorte.** Con las constantes de hoy el punto nunca sale de la
  // elipse, así que ninguna ficha se apoya jamás en el tope. Se cuenta cuántas caen EXACTAMENTE
  // sobre el borde: hoy, cero sobre 3000 identificadores.
  //
  // Los topes se derivan de los semiejes, así que subir un semieje sube el tope con él y el
  // recorte sigue sin dispararse: lo que sí lo dispara es **el anillo exterior**, que es el
  // número que no está atado a nada. Comprobado por mutación: con el anillo de fuera a 1,2 en vez
  // de 1, esta cuenta pasa de 0 a **731 de 3000** fichas apiladas contra el borde, en silencio.
  it("no dispara el recorte con las constantes de hoy", () => {
    const bordes = { x: [50 - SEMIEJE_X, 50 + SEMIEJE_X], y: [50 - SEMIEJE_Y, 50 + SEMIEJE_Y] };
    let apiladas = 0;
    for (let i = 0; i < 3000; i += 1) {
      const p = posicionDeFicha(`e-${i}`, TIPOS[i % TIPOS.length]);
      if (bordes.x.includes(p.x) || bordes.y.includes(p.y)) apiladas += 1;
    }
    expect(apiladas).toBe(0);
  });

  // Y, aparte del recorte, el punto siempre cae dentro del corcho: nada se pinta fuera del marco.
  it("siempre cae dentro de la elipse del corcho", () => {
    for (let i = 0; i < 3000; i += 1) {
      const p = posicionDeFicha(`e-${i}`, TIPOS[i % TIPOS.length]);
      expect(p.x).toBeGreaterThanOrEqual(50 - SEMIEJE_X);
      expect(p.x).toBeLessThanOrEqual(50 + SEMIEJE_X);
      expect(p.y).toBeGreaterThanOrEqual(50 - SEMIEJE_Y);
      expect(p.y).toBeLessThanOrEqual(50 + SEMIEJE_Y);
      // Dentro de la elipse, con el margen de coma flotante justo.
      const radio = Math.hypot((p.x - 50) / SEMIEJE_X, (p.y - 50) / SEMIEJE_Y);
      expect(radio).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// El tope de solape, MEDIDO.
// ---------------------------------------------------------------------------------------------

/**
 * Un generador determinista de mundos sintéticos. **No `Math.random`**: una prueba que mide un
 * porcentaje tiene que dar el mismo número en cada tanda, o el día que se ponga roja nadie sabrá
 * si es un defecto o es el ruido.
 */
function generadorDeMundos(semilla: number): () => number {
  let estado = semilla >>> 0;
  return () => {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0;
    return estado / 4294967296;
  };
}

/**
 * Qué fracción de chinchetas queda tapada por otra, sobre `mundos` mundos sintéticos de `fichas`
 * fichas cada uno, en un tablero de `ancho` x `alto` píxeles.
 *
 * Dos chinchetas se tapan si sus rectángulos se cortan. Es la misma cuenta que el reseño de
 * cierre hizo en `node` para destapar que el comentario mentía.
 */
function fraccionTapada(fichas: number, ancho: number, alto: number, mundos = 400): number {
  const siguiente = generadorDeMundos(0x5eed_1234);
  let total = 0;
  let tapadas = 0;
  for (let m = 0; m < mundos; m += 1) {
    const puntos: { x: number; y: number }[] = [];
    for (let i = 0; i < fichas; i += 1) {
      const id = `e-${Math.floor(siguiente() * 1e9).toString(36)}-${i}`;
      const tipo = TIPOS[Math.floor(siguiente() * TIPOS.length)];
      const p = posicionDeFicha(id, tipo);
      puntos.push({ x: (p.x / 100) * ancho, y: (p.y / 100) * alto });
    }
    const tapada = new Array(fichas).fill(false);
    for (let i = 0; i < fichas; i += 1) {
      for (let j = i + 1; j < fichas; j += 1) {
        const seCortan =
          Math.abs(puntos[i].x - puntos[j].x) < ANCHO_DE_CHINCHETA &&
          Math.abs(puntos[i].y - puntos[j].y) < ALTO_DE_CHINCHETA;
        if (seCortan) {
          tapada[i] = true;
          tapada[j] = true;
        }
      }
    }
    total += fichas;
    tapadas += tapada.filter(Boolean).length;
  }
  return tapadas / total;
}

describe("cuántas chinchetas quedan tapadas, contadas y no estimadas", () => {
  // Lo medido hoy por esta misma función, en porcentaje de chinchetas tapadas. Coincide con la
  // tabla del comentario de `posiciones.ts` dentro de dos puntos de ruido, que es la primera vez
  // en toda la ronda que un número escrito en un comentario aguanta que lo ejecuten.
  //
  //   tablero        6 fichas   10      18
  //   600x420          31,8%    50,0%   73,1%
  //   1000x700         15,9%    27,3%   46,0%
  //
  // El 46,0% de dieciocho fichas en 1000x700 es, al decimal, el 46% que el comentario de
  // `posiciones.ts` declara: la tabla de allí aguanta que la ejecuten.
  //
  // Los topes de abajo se fijan **por encima de lo medido, con margen**, y son máximos: mejorar
  // el reparto no rompe nada, empeorarlo sí. Ese es el punto.
  const TOPES: { fichas: number; ancho: number; alto: number; tope: number }[] = [
    { fichas: 6, ancho: 1000, alto: 700, tope: 0.22 },
    { fichas: 10, ancho: 1000, alto: 700, tope: 0.34 },
    { fichas: MAXIMO_DE_CHINCHETAS, ancho: 1000, alto: 700, tope: 0.52 },
    { fichas: 6, ancho: 600, alto: 420, tope: 0.4 },
    { fichas: MAXIMO_DE_CHINCHETAS, ancho: 600, alto: 420, tope: 0.79 },
  ];

  it.each(TOPES)(
    "con $fichas fichas en $ancho x $alto no pasa del $tope de tapadas",
    ({ fichas, ancho, alto, tope }) => {
      expect(fraccionTapada(fichas, ancho, alto)).toBeLessThanOrEqual(tope);
    },
  );

  // La medición tiene que ser reproducible o el tope no significa nada: el mismo generador y la
  // misma semilla dan el mismo porcentaje en cada tanda.
  it("la medición es reproducible", () => {
    expect(fraccionTapada(18, 1000, 700, 50)).toBe(fraccionTapada(18, 1000, 700, 50));
  });

  // El techo declarado. No es un número satisfactorio y el módulo no lo presenta como tal, pero
  // subirlo sin cambiar el reparto empeora la tabla de arriba: el tope y el techo van juntos.
  it("el techo de chinchetas sigue siendo dieciocho", () => {
    expect(MAXIMO_DE_CHINCHETAS).toBe(18);
  });
});

describe("la clave de un hilo", () => {
  // Un hilo no tiene dirección: el mismo par de fichas es el mismo hilo se pida como se pida. Sin
  // esto, el tablero pintaría cada relación dos veces, una por cada extremo.
  it("es la misma en los dos sentidos", () => {
    expect(claveDeHilo("e-b", "e-a")).toBe(claveDeHilo("e-a", "e-b"));
  });

  it("distingue pares distintos", () => {
    expect(claveDeHilo("e-a", "e-b")).not.toBe(claveDeHilo("e-a", "e-c"));
  });
});
