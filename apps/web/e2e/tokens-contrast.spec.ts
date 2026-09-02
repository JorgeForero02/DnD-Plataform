import { test, expect, devices, type Locator, type Page } from "@playwright/test";

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

// Task 1.19b: the observe()/OBSERVE_ALLOWLIST escape hatch from 1.19 is gone. It existed for
// exactly one pair — the visibility Badge measured against CampaignDetailPage.tsx's real,
// untouched `bg-slate-800` row, debt this task had no authority to fix. That row is converted
// now (ROW_BUTTON_CLASS, CampaignDetailPage.tsx reads --surface/--muted like everything else),
// so there is no more out-of-scope background to protect a measurement from — every pair below,
// on /design-tokens and on the real screens, goes through record() and actually gates the run.

async function gotoTheme(page: Page, theme: "dark" | "light") {
  await page.goto(`/design-tokens?theme=${theme}`);
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

// Task 1.19b: sets the theme via the same localStorage key ui/theme.ts and index.html's
// flash-prevention script read (getStoredTheme/STORAGE_KEY), via an init script so it is
// already in place before the FIRST navigation of the test — unlike gotoTheme() above (which
// only ever visits /design-tokens with its own ?theme= query param), the real-screen
// measurements below cross several navigations (register → create campaign → open it), and the
// theme has to survive every one of them the way a real visitor's stored choice would.
async function setStoredTheme(page: Page, theme: "dark" | "light") {
  await page.addInitScript((t) => localStorage.setItem("dnd-theme", t), theme);
}

for (const theme of ["dark", "light"] as const) {
  test(`contraste medido en tema ${theme}`, async ({ page }) => {
    await gotoTheme(page, theme);

    // --- Reseño 2026-09-02: copper. It is the identity's warm accent and it is NOT an action
    // colour, so it gets measured in both of the jobs it actually does: as readable text
    // (4.5:1) and as a rule/boundary (3:1). A colour that only looks right in the mock is not
    // a token — this is where it either holds in both themes or gets changed. ---
    {
      const { color, bg } = await effectiveTextColours(page.locator('[data-token="copper-text"]'));
      record(theme, "cobre como texto", contrastRatio(color, bg), 4.5);
      const { border, bg: ruleBg } = await borderColourAgainstBg(
        page.locator('[data-token="copper-rule"]'),
      );
      record(theme, "cobre como filete", contrastRatio(border, ruleBg), 3);
    }

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

    // --- Task 1.19b: the same five badges, on a bordered chrome row (--surface), which is what
    // CampaignDetailPage.tsx's entity/session/character rows actually paint now that they read
    // tokens instead of bg-slate-800. record(), not the old observe() — there is no more
    // out-of-scope background here to protect a measurement from.
    {
      const row = page.locator('[aria-label="badges sobre una fila de la campaña"]');
      for (const [level, label] of Object.entries(badgeLabels)) {
        const badge = row.locator(`[data-visibility="${level}"]`);
        const { color, bg } = await effectiveTextColours(badge);
        record(theme, `badge ${label} texto (fila --surface)`, contrastRatio(color, bg), 4.5);
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

    // --- Task 1.18b: the warning token, rendered exactly as InvitePanel.tsx and
    // CampaignDetailPage.tsx's per-row reason use it (DesignTokensPage.tsx's "advertencia"
    // section) — text needs 4.5:1, the border needs 3:1. ---
    {
      const warningBox = page.locator('section[aria-label="advertencia"] p').first();
      const { color, bg } = await effectiveTextColours(warningBox);
      record(theme, "advertencia texto", contrastRatio(color, bg), 4.5);
      const { border, bg: borderBg } = await borderColourAgainstBg(warningBox);
      record(theme, "advertencia borde", contrastRatio(border, borderBg), 3);
    }
    {
      const reasonNextToChip = page.getByText("Solo el DM o quien lo creó puede editarlo.", {
        exact: true,
      });
      const { color, bg } = await effectiveTextColours(reasonNextToChip);
      record(theme, "advertencia junto a etiqueta texto", contrastRatio(color, bg), 4.5);
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

// Task 1.19b — the measurement this task exists for: /design-tokens above is a synthetic
// showcase, and the 1.10:1 defect that started this task lived on a REAL screen, not there.
// These two blocks repeat the same measured-not-assumed discipline against the actual login
// screen (a form, unauthenticated) and the actual campaign detail screen (chrome + tabs + a
// row + a badge, authenticated, seeded through the real UI, not fixtures), in both themes.
// Fix round 1 (post-1.18b review), minor: nuevaCuentaCuenta() below used to be a near-verbatim
// copy of this — same three fields, same marca scheme, different literal prefix. Parameterized
// instead of duplicated.
function nuevaCuenta(prefijo: string) {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `${prefijo}-${marca}@example.com`,
    password: "password123",
    displayName: `${prefijo} ${marca}`,
  };
}

function nuevaCuentaContraste() {
  return nuevaCuenta("contraste");
}

for (const theme of ["dark", "light"] as const) {
  test(`contraste medido en la pantalla de login (${theme})`, async ({ page }) => {
    await setStoredTheme(page, theme);
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

    {
      const { color, bg } = await effectiveTextColours(
        page.getByRole("heading", { name: "Entrar" }),
      );
      record(theme, "login: título", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(page.getByText("Correo", { exact: true }));
      record(theme, "login: etiqueta de campo", contrastRatio(color, bg), 4.5);
    }
    {
      const input = page.getByLabel("Correo");
      const { border, bg } = await borderColourAgainstBg(input);
      record(theme, "login: borde del campo", contrastRatio(border, bg), 3);
    }
    {
      const { color, bg } = await effectiveTextColours(
        page.getByRole("button", { name: "Entrar" }),
      );
      record(theme, "login: texto del botón", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(
        page.getByRole("link", { name: "Crear una" }),
      );
      record(theme, "login: enlace de registro", contrastRatio(color, bg), 4.5);
    }
  });

  test(`contraste medido en la pantalla de detalle de campaña (${theme})`, async ({ page }) => {
    await setStoredTheme(page, theme);
    const cuenta = nuevaCuentaContraste();
    await page.goto("/register");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.getByLabel("Nombre").fill(cuenta.displayName);
    await page.getByLabel("Correo").fill(cuenta.email);
    await page.getByLabel("Contraseña").fill(cuenta.password);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByRole("heading", { name: "Mis campañas" })).toBeVisible();

    await page.getByRole("button", { name: "Nueva campaña" }).click();
    await page.getByLabel("Nombre").fill("Campaña de contraste");
    await page.getByRole("button", { name: "Crear" }).click();
    await page.getByRole("link", { name: "Campaña de contraste" }).click();
    await expect(page.getByRole("heading", { name: "Campaña de contraste" })).toBeVisible();

    await page.getByRole("tab", { name: "PNJ" }).click();
    await page.getByRole("button", { name: "Nuevo PNJ" }).click();
    await page.getByLabel("Nombre").fill("Strahd von Zarovich");
    await page.getByLabel("Etiquetas (separadas por coma)").fill("villano");
    // DM_ONLY is the danger tone — the worst-case badge pair, and the one 1.19's own report
    // flagged as needing --danger-text instead of --danger for exactly this reason.
    await page.getByLabel("Visibilidad").selectOption("DM_ONLY");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

    {
      const { color, bg } = await effectiveTextColours(
        page.getByRole("heading", { name: "Campaña de contraste" }),
      );
      record(theme, "detalle de campaña: título", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(page.getByRole("tab", { name: "PNJ" }));
      record(theme, "detalle de campaña: tab activo texto", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(page.getByRole("tab", { name: "Resumen" }));
      record(theme, "detalle de campaña: tab inactivo texto", contrastRatio(color, bg), 4.5);
    }
    // Reseño 2026-09-02: la fila de una ficha es un enlace a su página de lectura, no un
    // botón que abre un formulario.
    const row = page.getByRole("link", { name: /Strahd von Zarovich/ });
    {
      const { color, bg } = await effectiveTextColours(row);
      record(theme, "detalle de campaña: fila de entidad texto", contrastRatio(color, bg), 4.5);
    }
    {
      const { border, bg } = await borderColourAgainstBg(row);
      record(theme, "detalle de campaña: fila de entidad borde", contrastRatio(border, bg), 3);
    }
    {
      const badge = row.locator('[data-visibility="DM_ONLY"]');
      const { color, bg } = await effectiveTextColours(badge);
      record(theme, "detalle de campaña: badge DM_ONLY texto", contrastRatio(color, bg), 4.5);
      const { border, bg: borderBg } = await borderColourAgainstBg(badge);
      record(theme, "detalle de campaña: badge DM_ONLY borde", contrastRatio(border, borderBg), 3);
    }
    {
      const tag = row.getByText("villano", { exact: true });
      const { color, bg } = await effectiveTextColours(tag);
      record(theme, "detalle de campaña: etiqueta texto", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(
        page.getByRole("button", { name: "Nuevo PNJ" }),
      );
      record(theme, "detalle de campaña: botón Nuevo texto", contrastRatio(color, bg), 4.5);
    }

    // Fix round 1 (post-1.18b review), Important 6: the warning token was measured only on
    // /design-tokens' synthetic page before this — this journey creates a fresh account that is
    // DM and creator of everything in it, so the per-row "you can't edit this" reason never has
    // a reason to paint (canEdit is always true) and the InvitePanel warning box was never
    // reached either, because the section holding it was never opened. Revert text-warning-text
    // back to text-danger-text on InvitePanel.tsx's "no anula" box and this block goes red —
    // the real screen, not a stand-in. (Reseño 2026-09-02: that section is "Ajustes" now.)
    await page.getByRole("tab", { name: "Ajustes" }).click();
    await page.getByRole("button", { name: "Generar invitación" }).click();
    const warningBox = page.getByText("Generar otro enlace no anula este ni los anteriores");
    {
      const { color, bg } = await effectiveTextColours(warningBox);
      record(theme, "detalle de campaña: aviso de invitación texto", contrastRatio(color, bg), 4.5);
      const { border, bg: borderBg } = await borderColourAgainstBg(warningBox);
      record(
        theme,
        "detalle de campaña: aviso de invitación borde",
        contrastRatio(border, borderBg),
        3,
      );
    }
  });
}

// Task 1.18b — the two new screens (hallazgo 6 + the account screen), measured the same
// disciplined way: real navigation, real computed colours, both themes.
function nuevaCuentaCuenta() {
  return nuevaCuenta("cuenta");
}

for (const theme of ["dark", "light"] as const) {
  test(`contraste medido en la pantalla 404 (${theme})`, async ({ page }) => {
    await setStoredTheme(page, theme);
    await page.goto("/una-ruta-que-no-existe");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

    {
      const { color, bg } = await effectiveTextColours(
        page.getByRole("heading", { name: "Esta página no existe" }),
      );
      record(theme, "404: título", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(
        page.getByText("No hay nada en", { exact: false }),
      );
      record(theme, "404: texto de ruta", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(
        page.getByRole("button", { name: "Ir a iniciar sesión" }),
      );
      record(theme, "404: botón texto", contrastRatio(color, bg), 4.5);
    }
  });

  test(`contraste medido en la pantalla de cuenta (${theme})`, async ({ page }) => {
    await setStoredTheme(page, theme);
    const cuenta = nuevaCuentaCuenta();
    await page.goto("/register");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.getByLabel("Nombre").fill(cuenta.displayName);
    await page.getByLabel("Correo").fill(cuenta.email);
    await page.getByLabel("Contraseña").fill(cuenta.password);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByRole("heading", { name: "Mis campañas" })).toBeVisible();

    await page.getByRole("link", { name: "Cuenta" }).click();
    await expect(page.getByRole("heading", { name: "Cuenta" })).toBeVisible();

    {
      const { color, bg } = await effectiveTextColours(
        page.getByRole("heading", { name: "Nombre visible" }),
      );
      record(theme, "cuenta: título de sección texto", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(
        page.getByRole("button", { name: "Guardar nombre" }),
      );
      record(theme, "cuenta: botón guardar nombre texto", contrastRatio(color, bg), 4.5);
    }
    {
      const hint = page.getByText("Al menos 8 caracteres.");
      const { color, bg } = await effectiveTextColours(hint);
      record(theme, "cuenta: pista de contraseña texto", contrastRatio(color, bg), 4.5);
    }

    // Real success register: --accent-text plus the check glyph, exercised for real by an
    // actual PATCH /auth/me, not a synthetic sample.
    await page.getByLabel("Nombre").fill(`${cuenta.displayName} renombrado`);
    await page.getByRole("button", { name: "Guardar nombre" }).click();
    await expect(page.getByText("Nombre actualizado.")).toBeVisible();
    {
      const { color, bg } = await effectiveTextColours(page.getByText("Nombre actualizado."));
      record(theme, "cuenta: confirmación de nombre texto", contrastRatio(color, bg), 4.5);
    }

    // Fix round 1 (post-1.18b review), Critical 1: the flash banner LoginPage.tsx renders after
    // AccountPage.tsx's password change (the message that used to live, unmeasured, on
    // AccountPage's own now-removed success panel) — same success register, real screen, real
    // PATCH /auth/password.
    await page.getByLabel("Contraseña actual").fill(cuenta.password);
    await page.getByLabel("Contraseña nueva").fill("password456");
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(page).toHaveURL(/\/login$/);
    const flash = page.getByText(
      "Contraseña actualizada. Inicia sesión otra vez con tu contraseña nueva.",
    );
    await expect(flash).toBeVisible();
    {
      const { color, bg } = await effectiveTextColours(flash);
      record(theme, "login: aviso de contraseña cambiada texto", contrastRatio(color, bg), 4.5);
    }
  });
}

// Fix round 2 (post-1.19b review): fix round 1's "computed size, not explicitness"
// argument was correct about the test, then lost to the very cascade it was reasoning
// about -- the element-selector override it shipped in tokens.css never beat
// fieldControlClass's text-chrome-sm class selector, so every real control still computed
// to 13px on a coarse pointer. This measures the ACTUAL computed font-size on a real
// screen, under real touch emulation, instead of asserting a class string is present (the
// exact kind of test that let the broken fix through). devices["iPhone 13"] sets
// hasTouch/isMobile, which is what makes Chromium itself report (pointer: coarse) --
// verified below, not assumed, because the brief asked to say so plainly if it turned out
// not to match.
test("un control de formulario real no dispara el zoom de iOS Safari en un puntero basto", async ({
  browser,
}) => {
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  await page.goto("/login");

  const reportsCoarsePointer = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
  expect(
    reportsCoarsePointer,
    "devices['iPhone 13'] should make Chromium itself report (pointer: coarse); if this is " +
      "false the media query this fix relies on cannot match and a different query is needed",
  ).toBe(true);

  const email = page.getByLabel("Correo");
  await email.focus();
  const fontSizePx = await email.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  results.push(
    `[touch] login: campo Email tamano de fuente: ${fontSizePx}px (necesita >=16px) -- ` +
      (fontSizePx >= 16 ? "PASS" : "FAIL"),
  );
  expect(
    fontSizePx,
    "computed font-size on a real <input> under (pointer: coarse)",
  ).toBeGreaterThanOrEqual(16);

  await context.close();
});

test.afterAll(() => {
  console.log("\n=== Contraste WCAG medido (task 1.19 + 1.19b) ===\n" + results.join("\n") + "\n");
});
