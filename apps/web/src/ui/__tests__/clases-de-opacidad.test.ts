import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// **Las clases de opacidad de Tailwind no compilan en este proyecto, y durante meses nadie lo
// supo.** Los colores se declaran en `tailwind.config.js` como `var(--copper)`, sin
// `<alpha-value>`, así que Tailwind **no puede** emitir una variante con opacidad: descarta la
// utilidad entera y no avisa. El elemento se queda con el color del preflight, `#e5e7eb`.
//
// Lo que eso rompía, encontrado el 2026-09-02 y el 03:
//
//   · el subrayado que distingue «esto se edita» de «esto lo calculo yo» —una regla vinculante—
//     se pintaba gris claro, casi invisible sobre vitela;
//   · la **cabecera de la aplicación no tenía fondo**: el contenido se veía pasar por debajo;
//   · **los diálogos no tenían velo**, solo desenfoque, justo lo que el reseño creyó arreglar
//     con el título «un modal que parece una capa»;
//   · el relleno del distintivo «Solo DM» no existía, y su comentario afirmaba que el tinte
//     «está medido, no supuesto» — la prueba de contraste medía un fondo que no se pintaba.
//
// **Esta prueba hace UNA cosa: barrer el código fuente** buscando la clase prohibida, y así
// caza una reintroducida en una pantalla que ningún recorrido monta. La otra mitad de la red
// —comprobar que la utilidad **llega al CSS y pinta**— vive en
// `apps/web/e2e/clases-que-si-pintan.spec.ts`, porque necesita un navegador: `jsdom` no
// resuelve una clase de Tailwind hasta un color.
//
// Esta cabecera llegó a decir que hacía las dos, y era falso: el fichero tiene un solo `it`.
// Lo encontró una auditoría, no un fallo — un comentario que promete de más es una mentira que
// ninguna suite puede poner en rojo.

const SRC = join(process.cwd(), "src");

/** Los tokens del proyecto. Un `/NN` sobre cualquiera de estos es el fallo. */
const TOKENS = [
  "bg",
  "surface",
  "vellum",
  "text",
  "muted",
  "accent",
  "accent-text",
  "copper",
  "copper-text",
  "danger",
  "danger-text",
  "warning",
  "warning-text",
];
const PROHIBIDA = new RegExp(`\\b(?:bg|border|text|ring|from|to|via)-(?:${TOKENS.join("|")})/\\d+`);

function ficheros(dir: string): string[] {
  const out: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const completo = join(dir, nombre);
    if (statSync(completo).isDirectory()) out.push(...ficheros(completo));
    else if (/\.tsx?$/.test(nombre)) out.push(completo);
  }
  return out;
}

describe("las clases de opacidad de Tailwind, que en este proyecto no compilan", () => {
  it("ninguna clase de opacidad sobre un token del proyecto vuelve al código", () => {
    const culpables: string[] = [];
    for (const fichero of ficheros(SRC)) {
      readFileSync(fichero, "utf8")
        .split(/\r?\n/)
        .forEach((linea, i) => {
          // Los comentarios sí pueden nombrarlas: media docena de ficheros explican este fallo.
          const limpia = linea.replace(/^\s*(\/\/|\*|\/\*).*/, "");
          const m = PROHIBIDA.exec(limpia);
          if (m) culpables.push(`${fichero.slice(SRC.length + 1)}:${i + 1}  ${m[0]}`);
        });
    }
    expect(culpables).toEqual([]);
  });
});
