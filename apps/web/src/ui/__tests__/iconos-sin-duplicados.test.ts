import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Plan 07 — **un concepto, un icono, y una prueba que lo sostiene.**
//
// El 2026-09-05 había **diez ficheros de iconos** y conceptos repetidos: escudo con tres
// definiciones, mochila con tres, sol y luna con dos. La auditoría original contaba «4 iconos»
// porque **solo miró `ui/Iconos.tsx`**; el número real ronda los 76. Ningún carril podía
// arreglarlo —los seis tenían `features/**` prohibido—, así que las copias se acumularon sin que
// nadie las viera juntas.
//
// **Esta prueba es lo que impide la cuarta copia.** Sin ella, consolidar hoy solo compra tiempo:
// el siguiente que necesite un escudo y no encuentre el de `ui` dibujará otro.
//
// ## La regla que comprueba, y solo esta
//
// **`ui/Iconos.tsx` es el dueño de todo concepto compartido.** Si un módulo de `features/` exporta
// un icono con un nombre que `ui/Iconos.tsx` ya exporta, hay dos dibujos para una idea y alguien
// va a importar el que no toca. Rojo.
//
// **Lo que NO comprueba, a propósito:** que un nombre se repita entre dos módulos de `features/`.
// Eso hoy pasa —`IconoObjeto` en tres, `IconoLugar` en dos— y **no es el mismo defecto**:
//
//   · `sessions/IconoObjeto` es un **cofre**, el sello «objeto entregado» de la crónica.
//   · `entities/IconoObjeto` es el glifo del **tipo de ficha** `ITEM`, de una familia de siete.
//   · `inventory/IconoObjeto` es una **caja pequeña** en rejilla de 16, de otra familia entera.
//
// Tres dibujos para tres significados, y dos de ellos en una rejilla distinta: fusionarlos sería
// redibujar, no consolidar. Un icono que solo usa su módulo **se queda en su módulo** — `ui/` no
// es un cajón, y subirlo todo es tan malo como duplicarlo.

const RAIZ = join(__dirname, "..", "..");
const UI = join(RAIZ, "ui", "Iconos.tsx");

/** Los nombres `IconoX` que un fichero exporta. */
function exportados(ruta: string): string[] {
  const fuente = readFileSync(ruta, "utf8");
  return [...fuente.matchAll(/^export function (Icono\w+)\(/gm)].map((m) => m[1]);
}

/** Todo fichero de iconos de `features/`, sea `iconos.tsx`, `iconosDeSeccion.tsx` o `IconoX.tsx`. */
function ficherosDeIconosDeFeatures(): string[] {
  const base = join(RAIZ, "features");
  const salida: string[] = [];
  for (const modulo of readdirSync(base, { withFileTypes: true })) {
    if (!modulo.isDirectory()) continue;
    const dir = join(base, modulo.name);
    for (const f of readdirSync(dir)) {
      if (/^(iconos|Icono)/.test(f) && f.endsWith(".tsx")) salida.push(join(dir, f));
    }
  }
  return salida;
}

describe("un concepto, un icono", () => {
  it("ningún módulo de features redefine un icono que ui/Iconos.tsx ya exporta", () => {
    const deUi = new Set(exportados(UI));
    const choques: string[] = [];

    for (const fichero of ficherosDeIconosDeFeatures()) {
      for (const nombre of exportados(fichero)) {
        if (deUi.has(nombre)) {
          choques.push(`${nombre} — ${fichero.slice(RAIZ.length + 1).replace(/\\/g, "/")}`);
        }
      }
    }

    // El mensaje dice qué hacer, no solo que algo falla: quien lo lea a las tres de la mañana
    // tiene que poder arreglarlo sin leer este comentario.
    expect(
      choques,
      `Hay ${choques.length} icono(s) definidos dos veces. Importa el de ui/Iconos.tsx y borra ` +
        `el del módulo; si el dibujo tiene que ser distinto porque pertenece a una familia ` +
        `propia, dale un nombre que lo diga.\n  ` +
        choques.join("\n  "),
    ).toEqual([]);
  });

  it("y ui/Iconos.tsx sigue siendo la casa de los compartidos: escudo, mochila, sol, luna y lupa", () => {
    // Los cinco que este plan consolidó. Si alguien los quita de ui, la prueba de arriba deja de
    // proteger nada —no habría con qué chocar— y esta lo dice.
    const deUi = exportados(UI);
    for (const nombre of ["IconoEscudo", "IconoMochila", "IconoSol", "IconoLuna", "IconoLupa"]) {
      expect(deUi).toContain(nombre);
    }
  });
});
