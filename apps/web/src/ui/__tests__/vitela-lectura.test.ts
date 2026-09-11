import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// **Ticket P1 — «La vitela de "Lectura" no es un pliego claro».** El prototipo pone un pliego
// CLARO (#efe3c8) sobre la mesa oscura de Lectura; esta app lo probó una vez, midió texto y
// enlace en **1.02:1** y **1.51:1** (ver el comentario largo que este mismo cambio reescribe en
// `ui/tokens.css`) y se echó atrás pintando la vitela oscura en su lugar. La decisión del autor
// (2026-09-11) es hacerlo tal como el prototipo, esta vez con la paleta de pliego completa que
// faltó la primera vez: no basta con oscurecer la tinta, hay que dar vuelta también el acento,
// el cobre y el peligro que se pintan DENTRO del panel.
//
// Esta prueba lee `tokens.css` como texto — igual que `capturas-no-ensucian.test.ts` lee su
// guion — y comprueba las dos piezas que no se pueden fingir: el canal de la vitela y la regla
// de paleta que reescribe lo que se ve encima. El contraste real en el navegador es el lote de
// Playwright del orquestador; aquí se computa la fórmula WCAG a mano, sobre los canales tal
// cual quedan escritos en la hoja.

const TOKENS_PATH = join(process.cwd(), "src", "ui", "tokens.css");

function leerBloque(fuente: string, selector: string): string {
  const inicio = fuente.indexOf(selector);
  expect(inicio, `no se encontró el selector ${selector}`).toBeGreaterThanOrEqual(0);
  const aperturaLlave = fuente.indexOf("{", inicio);
  let profundidad = 1;
  let i = aperturaLlave + 1;
  while (profundidad > 0 && i < fuente.length) {
    if (fuente[i] === "{") profundidad++;
    if (fuente[i] === "}") profundidad--;
    i++;
  }
  return fuente.slice(aperturaLlave + 1, i - 1);
}

function canal(bloque: string, nombre: string): [number, number, number] {
  const m = new RegExp(`--${nombre}-ch:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)`).exec(bloque);
  expect(m, `${nombre}-ch no está en el bloque`).not.toBeNull();
  return [Number(m![1]), Number(m![2]), Number(m![3])];
}

// La misma fórmula WCAG que `e2e/tokens-contrast.spec.ts` — reescrita aquí porque ese fichero
// corre en el navegador vía Playwright y esta prueba corre en Node sobre texto.
function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function luminancia([r, g, b]: [number, number, number]): number {
  const [rl, gl, bl] = [r, g, b].map(srgbToLinear);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}
function contraste(a: [number, number, number], b: [number, number, number]): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

describe("la vitela de Lectura es un pliego claro, como el prototipo", () => {
  const fuente = readFileSync(TOKENS_PATH, "utf8");
  const bloqueLectura = leerBloque(fuente, '[data-theme="reading"] {');

  it("--vellum-ch de Lectura es el beige del prototipo (#efe3c8), no la vitela oscura", () => {
    expect(canal(bloqueLectura, "vellum")).toEqual([239, 227, 200]);
  });

  it("existe una paleta de pliego que activa DENTRO del panel de vitela en Lectura", () => {
    // Ronda 1 de revisión, hallazgo 6 — `toContain` a secas lo satisface el COMENTARIO que cita
    // el selector entre comillas (`tokens.css`, el párrafo que explica la regla), no solo la
    // regla de verdad: borrar la regla y dejar el comentario no habría puesto esto en rojo. Se
    // exige el selector seguido de `{`, que solo escribe una regla CSS real.
    expect(fuente).toMatch(/\[data-theme="reading"\]\s*\[data-tone="vellum"\]\s*\{/);
  });

  it("la tinta (vellum-ink) sobre la vitela clara despeja 4.5:1", () => {
    const vellum = canal(bloqueLectura, "vellum");
    const ink = canal(bloqueLectura, "vellum-ink");
    expect(contraste(ink, vellum)).toBeGreaterThanOrEqual(4.5);
  });

  it("el acento, el cobre, el peligro y la advertencia redefinidos para el pliego despejan 4.5:1", () => {
    const vellum = canal(bloqueLectura, "vellum");
    const bloqueSabana = leerBloque(fuente, '[data-theme="reading"] [data-tone="vellum"] {');
    for (const nombre of ["accent-text", "copper-text", "danger-text", "warning-text"]) {
      const color = canal(bloqueSabana, nombre);
      expect(contraste(color, vellum), `${nombre} sobre vellum`).toBeGreaterThanOrEqual(4.5);
    }
  });

  // Ticket 38 (2026-09-11) — el hairline de `Panel.tsx` (`border-vellum-border`) se pinta
  // contra la mesa de FUERA del panel, no contra el papel: `e2e/tokens-contrast.spec.ts` mide el
  // filete con `borderColourAgainstBg`, que arranca en `el.parentElement` a propósito (un
  // filete se ve contra lo que hay detrás, no contra el propio relleno del elemento). Esta
  // prueba compone la MISMA fórmula, contra la MISMA mesa (`--bg-ch` de Lectura), y no contra
  // `--vellum-ch` como hacía la tabla fuera de línea que dio 4.7:1 y mintió: el navegador midió
  // 2.78:1 la primera vez que `--vellum-border-ch` aliasaba a `--muted-ch` sin más.
  it("el filete del panel de vitela (--vellum-border-ch) despeja 3:1 contra la mesa de Lectura, no contra el papel", () => {
    const bg = canal(bloqueLectura, "bg");
    const bloqueSabana = leerBloque(fuente, '[data-theme="reading"] [data-tone="vellum"] {');
    const border = canal(bloqueSabana, "vellum-border");
    expect(
      contraste(border, bg),
      "vellum-border-ch sobre bg-ch (la mesa detrás del panel)",
    ).toBeGreaterThanOrEqual(3.3);
  });

  // Ronda 1 de revisión, hallazgo 1 (crítico) — `--text-ch` SÍ se redefine dentro de la vitela.
  // Sin esto, `text-text` (la atribución del SRD en `AcercaDePage.tsx`, la biografía editable de
  // `CharacterDetailPage.tsx`) resuelve la tinta del cromo, clara, sobre el pliego claro: 1.02:1,
  // el mismo defecto que esta ficha existe para cerrar. Y `--surface-ch` tiene que acompañarlo:
  // es lo que evita que el código en línea de Markdown (`bg-surface text-text`) se quede con
  // tinta oscura sobre un chip que sigue siendo oscuro.
  it("--text-ch y --surface-ch se redefinen dentro de la vitela, y el chip de código sigue leyéndose", () => {
    const bloqueSabana = leerBloque(fuente, '[data-theme="reading"] [data-tone="vellum"] {');
    const vellum = canal(bloqueLectura, "vellum");
    const text = canal(bloqueSabana, "text");
    const surface = canal(bloqueSabana, "surface");
    // El propio texto sobre la vitela (AcercaDePage, la biografía).
    expect(contraste(text, vellum), "text-ch sobre vellum").toBeGreaterThanOrEqual(4.5);
    // El código en línea: `text-text` sobre `bg-surface`, no sobre la vitela directamente.
    expect(
      contraste(text, surface),
      "text-ch sobre surface-ch (chip de código)",
    ).toBeGreaterThanOrEqual(4.5);
  });
});
