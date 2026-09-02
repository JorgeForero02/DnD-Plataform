import { test, expect, type Locator, type Page } from "@playwright/test";

// Task 1.19 — "Contrast is MEASURED, never assumed." This spec renders /design-tokens (every
// primitive + every visibility badge at once, see src/pages/DesignTokensPage.tsx), reads the
// REAL computed colours from the DOM in both themes, computes the WCAG contrast ratio by hand,
// and fails the run below 4.5:1 for body text or 3:1 for large text / UI borders. The numbers
// this prints are copied into the report verbatim — nothing here is "it passes".
//
// Fix round 1, Important 5: colour resolution now composites alpha instead of treating
// anything with a non-zero alpha as opaque. It does not change any number in this run (nothing
// on /design-tokens uses an alpha modifier today), but the old version would have silently
// measured the WRONG colour the first time something did (e.g. bg-accent/10) — the difference
// between measuring the painted result and measuring the declared colour with extra steps that
// happen to be no-ops so far.

type RGBA = { r: number; g: number; b: number; a: number };

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance({ r, g, b }: RGBA): number {
  const [rl, gl, bl] = [r, g, b].map(srgbToLinear);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrastRatio(a: RGBA, b: RGBA): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// The three functions below all run INSIDE the browser via Locator.evaluate, which serialises
// each pageFunction across the wire on its own — they cannot close over the Node-side helpers
// above or share code with each other except by being written out in full each time. Each one
// walks up from the element, collecting every background colour with a non-zero alpha until it
// hits a fully opaque one (or runs out of ancestors, in which case it assumes a white canvas —
// the browser's own default), then composites front-to-back ("source over"): the element's own
// background paints OVER its parent's, which paints over its grandparent's, and so on down to
// the opaque base. A translucent background five ancestors deep is not "close enough to opaque
// to ignore" — it is mixed in at its actual weight (fix round 1, Important 5).

async function effectiveTextColours(locator: Locator): Promise<{ color: RGBA; bg: RGBA }> {
  return locator.evaluate((el) => {
    function parseColor(css: string) {
      const m = css.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/,
      );
      if (!m) return { r: 255, g: 255, b: 255, a: 1 };
      return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
    }
    function compositeOver(
      top: ReturnType<typeof parseColor>,
      bottom: ReturnType<typeof parseColor>,
    ) {
      const a = top.a + bottom.a * (1 - top.a);
      if (a <= 0) return { r: 255, g: 255, b: 255, a: 0 };
      return {
        r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a,
        g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a,
        b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a,
        a,
      };
    }
    function resolveBackground(start: Element) {
      const WHITE = { r: 255, g: 255, b: 255, a: 1 };
      const stack: ReturnType<typeof parseColor>[] = [];
      let node: Element | null = start;
      while (node) {
        const c = parseColor(getComputedStyle(node).backgroundColor);
        if (c.a > 0) {
          stack.push(c);
          if (c.a >= 1) break;
        }
        node = node.parentElement;
      }
      const base = stack.length && stack[stack.length - 1].a >= 1 ? stack.pop()! : WHITE;
      let result = base;
      for (let i = stack.length - 1; i >= 0; i--) result = compositeOver(stack[i], result);
      return result;
    }
    return { color: parseColor(getComputedStyle(el).color), bg: resolveBackground(el) };
  });
}

async function borderColourAgainstBg(locator: Locator): Promise<{ border: RGBA; bg: RGBA }> {
  return locator.evaluate((el) => {
    function parseColor(css: string) {
      const m = css.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/,
      );
      if (!m) return { r: 255, g: 255, b: 255, a: 1 };
      return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
    }
    function compositeOver(
      top: ReturnType<typeof parseColor>,
      bottom: ReturnType<typeof parseColor>,
    ) {
      const a = top.a + bottom.a * (1 - top.a);
      if (a <= 0) return { r: 255, g: 255, b: 255, a: 0 };
      return {
        r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a,
        g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a,
        b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a,
        a,
      };
    }
    function resolveBackground(start: Element) {
      const WHITE = { r: 255, g: 255, b: 255, a: 1 };
      const stack: ReturnType<typeof parseColor>[] = [];
      let node: Element | null = start;
      while (node) {
        const c = parseColor(getComputedStyle(node).backgroundColor);
        if (c.a > 0) {
          stack.push(c);
          if (c.a >= 1) break;
        }
        node = node.parentElement;
      }
      const base = stack.length && stack[stack.length - 1].a >= 1 ? stack.pop()! : WHITE;
      let result = base;
      for (let i = stack.length - 1; i >= 0; i--) result = compositeOver(stack[i], result);
      return result;
    }
    const bgHost = el.parentElement || el;
    return {
      border: parseColor(getComputedStyle(el).borderTopColor),
      bg: resolveBackground(bgHost),
    };
  });
}

// Focus ring: the outline colour once the element is actually focused, against the background
// it's drawn on top of.
async function focusRingColour(locator: Locator, page: Page): Promise<{ outline: RGBA; bg: RGBA }> {
  await locator.focus();
  const result = await locator.evaluate((el) => {
    function parseColor(css: string) {
      const m = css.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/,
      );
      if (!m) return { r: 255, g: 255, b: 255, a: 1 };
      return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
    }
    function compositeOver(
      top: ReturnType<typeof parseColor>,
      bottom: ReturnType<typeof parseColor>,
    ) {
      const a = top.a + bottom.a * (1 - top.a);
      if (a <= 0) return { r: 255, g: 255, b: 255, a: 0 };
      return {
        r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a,
        g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a,
        b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a,
        a,
      };
    }
    function resolveBackground(start: Element) {
      const WHITE = { r: 255, g: 255, b: 255, a: 1 };
      const stack: ReturnType<typeof parseColor>[] = [];
      let node: Element | null = start;
      while (node) {
        const c = parseColor(getComputedStyle(node).backgroundColor);
        if (c.a > 0) {
          stack.push(c);
          if (c.a >= 1) break;
        }
        node = node.parentElement;
      }
      const base = stack.length && stack[stack.length - 1].a >= 1 ? stack.pop()! : WHITE;
      let result = base;
      for (let i = stack.length - 1; i >= 0; i--) result = compositeOver(stack[i], result);
      return result;
    }
    const bgHost = el.parentElement || el;
    return {
      outline: parseColor(getComputedStyle(el).outlineColor),
      bg: resolveBackground(bgHost),
    };
  });
  await page.keyboard.press("Escape").catch(() => {});
  return result;
}

const results: string[] = [];

// Records the measured ratio for the report AND actually fails the test below threshold — the
// brief's own words: "fails below 4.5:1 for body text and 3:1 for large text and UI borders",
// not "logs whether it would have failed".
function record(theme: string, label: string, ratio: number, threshold: number) {
  const status = ratio >= threshold ? "PASS" : "FAIL";
  results.push(`[${theme}] ${label}: ${ratio.toFixed(2)}:1 (needs ${threshold}:1) — ${status}`);
  expect(ratio, `${label} in ${theme} theme`).toBeGreaterThanOrEqual(threshold);
}

// Fix round 2, item 4: the only thing that used to stop a future edit from turning a gating
// record() into a silent observe() was a comment. That is not structural. Two things pin it
// now: observe() refuses any label that doesn't match the one pattern it exists for (the
// Badge-on-bg-slate-800 measurement), and afterAll() asserts the observed count is exactly the
// 10 this spec is supposed to produce (5 visibility levels × 2 themes) — not 9, not 11. Widening
// what observe() accepts, or how many times it's called, now has to be a deliberate, visible
// edit to this allowlist and this count, not a one-line swap three hundred lines away.
const OBSERVE_ALLOWLIST = /^badge .+ texto \(fila bg-slate-800 real\)$/;
const EXPECTED_OBSERVE_COUNT = 10;
let observeCallCount = 0;

// Same measurement and the same log line as record(), but does NOT fail the run. Reserved for
// exactly one pair below: the Badge measured against CampaignDetailPage.tsx's real, untouched
// `bg-slate-800` row — a background this task has no authority to change (the brief forbids
// redesigning existing screens; the coordinator separately logs the app's remaining literal
// Tailwind classes as project debt, not this task's job). Failing this spec on it would force a
// choice between touching a screen this task must not redesign, or leaving the whole gate red
// forever over debt someone else owns — neither is right. It still gets measured and reported,
// so the gap is evidence on record, not silently dropped the way "all passing" would drop it.
function observe(theme: string, label: string, ratio: number, threshold: number) {
  if (!OBSERVE_ALLOWLIST.test(label)) {
    throw new Error(
      `observe() was called with "${label}", which is outside its pinned allowlist ` +
        `(${OBSERVE_ALLOWLIST}). observe() exists ONLY for the Badge-on-bg-slate-800 ` +
        `measurement — every other pair must use record(), which actually gates the run. If ` +
        `this is a genuine new out-of-scope pair, widen OBSERVE_ALLOWLIST deliberately here, ` +
        `don't just call observe() with a new label.`,
    );
  }
  observeCallCount += 1;
  const status =
    ratio >= threshold ? "PASS" : "FAIL (pre-existing debt, out of scope — see report)";
  results.push(`[${theme}] ${label}: ${ratio.toFixed(2)}:1 (needs ${threshold}:1) — ${status}`);
}

async function gotoTheme(page: Page, theme: "dark" | "light") {
  await page.goto(`/design-tokens?theme=${theme}`);
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

for (const theme of ["dark", "light"] as const) {
  test(`contraste medido en tema ${theme}`, async ({ page }) => {
    await gotoTheme(page, theme);

    // --- Buttons: label text, normal-size body text, needs 4.5:1 ---
    for (const name of ["Guardar", "Cancelar", "Ver más", "Borrar", "Abrir diálogo"]) {
      const { color, bg } = await effectiveTextColours(
        page.getByRole("button", { name, exact: true }),
      );
      record(theme, `botón "${name}" texto`, contrastRatio(color, bg), 4.5);
    }

    // --- Disabled buttons: must stay legible (the brief's explicit rule) ---
    for (const name of ["Nuevo", "Expulsar"]) {
      const { color, bg } = await effectiveTextColours(page.getByRole("button", { name }));
      record(theme, `botón deshabilitado "${name}" texto`, contrastRatio(color, bg), 4.5);
    }

    // --- Danger button border: UI component boundary, needs 3:1 ---
    {
      const { border, bg } = await borderColourAgainstBg(
        page.getByRole("button", { name: "Borrar", exact: true }),
      );
      record(theme, "botón danger borde", contrastRatio(border, bg), 3);
    }

    // --- Critical 2, pair 2: a ghost button's TEXT, nested inside a chrome Panel (--surface),
    // not the --bg the first version always measured it against. ---
    {
      const ghostInPanel = page
        .locator('[aria-label="ghost dentro de panel chrome"]')
        .getByRole("button", { name: "Ver detalle" });
      const { color, bg } = await effectiveTextColours(ghostInPanel);
      record(theme, "botón ghost dentro de panel chrome texto", contrastRatio(color, bg), 4.5);
    }

    // --- The five visibility badges: label text (body) and border (UI boundary), on --bg ---
    const badgeLabels: Record<string, string> = {
      PUBLIC: "Público",
      PLAYERS: "Jugadores",
      SPECIFIC_PLAYERS: "Jugadores concretos",
      OWNER_DM: "DM y creador",
      DM_ONLY: "Solo DM",
    };
    for (const [level, label] of Object.entries(badgeLabels)) {
      const badge = page.locator(`[data-visibility="${level}"]`).first();
      const { color, bg } = await effectiveTextColours(badge);
      record(theme, `badge ${label} texto`, contrastRatio(color, bg), 4.5);
      const { border, bg: borderBg } = await borderColourAgainstBg(badge);
      record(theme, `badge ${label} borde`, contrastRatio(border, borderBg), 3);
    }

    // --- Important 6: the same five badges, but on the real product's row background
    // (bg-slate-800, CampaignDetailPage.tsx's untouched entity/session rows) instead of ours.
    // observe(), not record(): the first real run of this found PLAYERS/SPECIFIC_PLAYERS
    // (--accent-text tone) at 4.38:1 and DM_ONLY (--danger-text tone) at 4.05:1 in dark, and
    // PUBLIC at 1.10:1 in light — a genuine, measured failure, but of a background this task
    // has no authority to touch (see the comment on observe() above and the report's coverage
    // section). Measured and printed either way, not swept under "all passing".
    {
      const realRow = page.locator(
        '[aria-label="badges sobre la fila real de CampaignDetailPage"]',
      );
      for (const [level, label] of Object.entries(badgeLabels)) {
        const badge = realRow.locator(`[data-visibility="${level}"]`);
        const { color, bg } = await effectiveTextColours(badge);
        observe(
          theme,
          `badge ${label} texto (fila bg-slate-800 real)`,
          contrastRatio(color, bg),
          4.5,
        );
      }
    }

    // --- Field: label, control border, input text, error message + icon, focus ring ---
    {
      const { color, bg } = await effectiveTextColours(page.getByText("Nombre", { exact: true }));
      record(theme, "field label", contrastRatio(color, bg), 4.5);
    }
    {
      const input = page.locator('section[aria-label="campo"] input');
      const { border, bg } = await borderColourAgainstBg(input);
      record(theme, "field control borde", contrastRatio(border, bg), 3);
    }
    {
      const input = page.locator('section[aria-label="campo"] input');
      const { outline, bg } = await focusRingColour(input, page);
      record(theme, "field control anillo de foco", contrastRatio(outline, bg), 3);
    }
    {
      const { color, bg } = await effectiveTextColours(
        page.getByText("Este campo es obligatorio."),
      );
      record(theme, "field error texto", contrastRatio(color, bg), 4.5);
    }
    {
      // The error's glyph is a graphical object, not text — 3:1 (1.4.11), not 4.5:1.
      const { color, bg } = await effectiveTextColours(
        page.locator('[role="alert"] [aria-hidden]'),
      );
      record(theme, "field error icono", contrastRatio(color, bg), 3);
    }

    // --- Panels: chrome and vellum body text, plus both panels' hairline borders ---
    {
      const { color, bg } = await effectiveTextColours(
        page.getByText("Panel de instrumento", { exact: false }),
      );
      record(theme, "panel chrome texto", contrastRatio(color, bg), 4.5);
    }
    {
      const chromePanel = page.locator('section[aria-label="panel chrome"] [data-tone="chrome"]');
      const { border, bg } = await borderColourAgainstBg(chromePanel);
      record(theme, "panel chrome borde", contrastRatio(border, bg), 3);
    }
    {
      const { color, bg } = await effectiveTextColours(
        page.getByText("Un fuego bajo templado", { exact: false }),
      );
      record(theme, "panel vellum texto", contrastRatio(color, bg), 4.5);
    }
    {
      const vellumPanel = page.locator('[data-tone="vellum"]');
      const { border, bg } = await borderColourAgainstBg(vellumPanel);
      record(theme, "panel vellum borde (hairline)", contrastRatio(border, bg), 3);
    }
    // Critical 2, pair 1 + Important 6: a real link and real inline code, rendered by the
    // actual Markdown component, inside the vellum panel.
    {
      const link = page.getByRole("link", { name: "mapa de Phandalin" });
      const { color, bg } = await effectiveTextColours(link);
      record(theme, "enlace en panel vellum texto", contrastRatio(color, bg), 4.5);
    }
    {
      const code = page.locator('[data-tone="vellum"] code');
      const { color, bg } = await effectiveTextColours(code);
      record(theme, "código en línea en panel vellum texto", contrastRatio(color, bg), 4.5);
    }

    // --- Tabs: active and inactive labels, plus the tablist's bottom border ---
    {
      const { color, bg } = await effectiveTextColours(page.getByRole("tab", { name: "Resumen" }));
      record(theme, "tab activo texto", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(page.getByRole("tab", { name: "NPCs" }));
      record(theme, "tab inactivo texto", contrastRatio(color, bg), 4.5);
    }
    {
      const tablist = page.getByRole("tablist");
      const { border, bg } = await borderColourAgainstBg(tablist);
      record(theme, "tablist borde inferior", contrastRatio(border, bg), 3);
    }

    // --- Dialog: title + body text on its own surface, once actually open ---
    await page.getByRole("button", { name: "Abrir diálogo" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    {
      const { color, bg } = await effectiveTextColours(
        page.getByRole("heading", { name: "Confirmar borrado" }),
      );
      record(theme, "dialog título", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(
        page.getByText("¿Seguro que quieres borrar"),
      );
      record(theme, "dialog texto", contrastRatio(color, bg), 4.5);
    }
    await page.keyboard.press("Escape");
  });
}

test.afterAll(() => {
  console.log(
    "\n=== Contraste WCAG medido (task 1.19, fix round 2) ===\n" + results.join("\n") + "\n",
  );
  // Fix round 2, item 4: the count half of the pin. Not 9, not 11 -- exactly the 5 visibility
  // levels x 2 theme runs this spec is supposed to produce via observe(). A different count
  // means either a new observe() call snuck in (caught structurally above if its label doesn't
  // match OBSERVE_ALLOWLIST, but not if someone widens the allowlist carelessly) or one of the
  // 10 expected calls silently stopped happening.
  expect(
    observeCallCount,
    `expected exactly ${EXPECTED_OBSERVE_COUNT} observe() calls (5 badge levels x 2 themes), got ${observeCallCount}`,
  ).toBe(EXPECTED_OBSERVE_COUNT);
});
