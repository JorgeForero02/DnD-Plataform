import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// **Las clases de opacidad de Tailwind no compilaban en este proyecto, y durante meses nadie lo
// supo.** Los colores se declaraban en `tailwind.config.js` como `var(--copper)`, sin
// `<alpha-value>`, así que Tailwind **no podía** emitir una variante con opacidad: descartaba la
// utilidad entera y no avisaba. El elemento se quedaba con el color del preflight, `#e5e7eb`.
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
// ─────────────────────────────────────────────────────────────────────────────────────────
// **B0 (2026-09-04): la prohibición se levanta, y esta prueba cambia de trabajo.**
//
// Hasta hoy este fichero prohibía `/NN`. Era la defensa correcta mientras la causa siguiera
// ahí, y la ficha P2 de `docs/06-pendientes.md` la había degradado a «comodidad, no
// corrección» porque ya no había nada roto. **Dejó de ser comodidad**: la interfaz de destino
// —la maqueta de `prototipo/`— está escrita con **174** de esas clases, y el filete de todas
// sus tarjetas es una de ellas. Mantener la prohibición habría obligado a inventar un token
// por cada tinte de cada borde.
//
// Así que se arregló la causa, que es lo que la propia ficha proponía: los tokens se declaran
// **por canales** (`--copper-ch: 201 125 70`) y `tailwind.config.js` compone
// `rgb(var(--copper-ch) / <alpha-value>)`. La decisión está declarada en
// `docs/04-convenciones.md`; **no se levantó un control para que pasara una tanda**, se
// sustituyó por uno que mide más.
//
// Y lo que se mide ahora es **la trampa nueva**, que es de la misma familia y también sería
// silenciosa: un canal es una terna de números, no un color. Escribir
// `style={{ color: "var(--copper-ch)" }}` produce `color: 201 125 70`, que el navegador
// descarta **sin decir nada** — exactamente el modo de fallo que este fichero existe para
// cazar. El nombre sin sufijo (`var(--copper)`) sigue siendo el color pintable y es el que hay
// que usar ahí.
//
// La otra mitad de la red sigue donde estaba: `apps/web/e2e/clases-que-si-pintan.spec.ts`
// mide en el navegador que un `/NN` **compone un color de verdad**, porque `jsdom` no resuelve
// una clase de Tailwind hasta un color y un barrido de texto no puede saberlo.

const SRC = join(process.cwd(), "src");

/** Los tokens del proyecto. Cada uno tiene su canal `--<token>-ch`. */
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

/**
 * Un canal usado como si fuera un color. `rgb(var(--copper-ch) / 0.3)` es correcto y no debe
 * saltar; `var(--copper-ch)` a secas, o dentro de un `color:`, es el fallo. La regla práctica:
 * el canal solo es legítimo **dentro de un `rgb(`**.
 */
const CANAL_SUELTO = new RegExp(`var\\(--(?:${TOKENS.join("|")})-ch\\)`);
const DENTRO_DE_RGB = new RegExp(`rgba?\\([^)]*var\\(--(?:${TOKENS.join("|")})-ch\\)`);

// Se barre **el código que se envía al navegador**, no las pruebas. La exclusión no es una
// comodidad: la segunda prueba de este mismo fichero necesita escribir la línea mala como
// literal para comprobar que el patrón la distingue, y sin esta línea el barrido se cazaría a
// sí mismo. Una prueba no pinta nada, así que un canal suelto ahí no puede romper una pantalla.
function ficheros(dir: string): string[] {
  const out: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const completo = join(dir, nombre);
    if (statSync(completo).isDirectory()) {
      if (nombre === "__tests__") continue;
      out.push(...ficheros(completo));
    } else if (/\.tsx?$/.test(nombre) && !/\.(test|spec)\.tsx?$/.test(nombre)) {
      out.push(completo);
    }
  }
  return out;
}

describe("los canales de color, que no son colores", () => {
  it("ningún canal `--<token>-ch` se usa fuera de un rgb(), donde no pintaría nada", () => {
    const culpables: string[] = [];
    for (const fichero of ficheros(SRC)) {
      readFileSync(fichero, "utf8")
        .split(/\r?\n/)
        .forEach((linea, i) => {
          // Los comentarios sí pueden nombrarlos: media docena de ficheros los explican.
          const limpia = linea.replace(/^\s*(\/\/|\*|\/\*).*/, "");
          if (!CANAL_SUELTO.test(limpia)) return;
          if (DENTRO_DE_RGB.test(limpia)) return;
          culpables.push(`${fichero.slice(SRC.length + 1)}:${i + 1}  ${limpia.trim()}`);
        });
    }
    expect(culpables).toEqual([]);
  });

  // Esta prueba mide el barrido, no el código: si el patrón dejara de encontrar nada, la de
  // arriba pasaría para siempre sin comprobar nada, que es el modo exacto en que un control se
  // convierte en decoración. Se le da la línea mala y la buena y se exige que las distinga.
  it("el barrido distingue el canal suelto del canal dentro de un rgb()", () => {
    const malo = `style={{ color: "var(--copper-ch)" }}`;
    const bueno = `style={{ color: "rgb(var(--copper-ch) / 0.3)" }}`;

    expect(CANAL_SUELTO.test(malo)).toBe(true);
    expect(DENTRO_DE_RGB.test(malo)).toBe(false);

    expect(CANAL_SUELTO.test(bueno)).toBe(true);
    expect(DENTRO_DE_RGB.test(bueno)).toBe(true);
  });
});
