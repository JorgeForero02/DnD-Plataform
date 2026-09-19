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

// B0 (2026-09-04): el tercer tema, «Lectura», entra a las mismas mediciones que los otros
// dos y no a una excepcion suya. Adoptar una paleta de una maqueta sin medirla es exactamente
// lo que `docs/04-convenciones.md` prohibe sobre este prototipo: responde de su forma, no de
// sus contrastes.
async function gotoTheme(page: Page, theme: "dark" | "light" | "reading") {
  await page.goto(`/design-tokens?theme=${theme}`);
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

// Task 1.19b: sets the theme via the same localStorage key ui/theme.ts and index.html's
// flash-prevention script read (getStoredTheme/STORAGE_KEY), via an init script so it is
// already in place before the FIRST navigation of the test — unlike gotoTheme() above (which
// only ever visits /design-tokens with its own ?theme= query param), the real-screen
// measurements below cross several navigations (register → create campaign → open it), and the
// theme has to survive every one of them the way a real visitor's stored choice would.
async function setStoredTheme(page: Page, theme: "dark" | "light" | "reading") {
  await page.addInitScript((t) => localStorage.setItem("dnd-theme", t), theme);
}

for (const theme of ["dark", "light", "reading"] as const) {
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

    // --- Tarea 12 (2026-09-19): --borde, el filete de componente que sustituye a
    // `border-muted/30`/`/40` (1,5-1,8:1 medido contra --surface antes de este token, por
    // debajo del 3:1 de 1.4.11). Medido contra --surface, que es el fondo que la caja de
    // DesignTokensPage pinta de verdad. ---
    {
      const { border, bg } = await borderColourAgainstBg(page.locator('[data-token="borde"]'));
      record(theme, "borde de componente", contrastRatio(border, bg), 3);
    }

    // --- Plan 05 (D3): las OCHO voces de personaje, en los dos fondos donde se pintan. Una voz
    // es texto normal, así que 4.5:1, y se mide sobre --bg (el hilo cuando va a sangre) y sobre
    // --surface (el panel del hilo y la columna del elenco). **Ninguna voz nueva se acepta sin su
    // medición**: las cuatro nuevas entran por aquí o no entran. Los nombres salen del propio DOM,
    // así que un color añadido a CHARACTER_COLORS se mide solo. ---
    {
      const claves = await page
        .locator("[data-voz]")
        .evaluateAll((els) => els.map((e) => e.getAttribute("data-voz") ?? ""));
      expect(claves.length).toBeGreaterThanOrEqual(8);
      for (const clave of claves) {
        const sobreFondo = await effectiveTextColours(page.locator(`[data-voz="${clave}"]`));
        record(
          theme,
          `voz ${clave} sobre fondo`,
          contrastRatio(sobreFondo.color, sobreFondo.bg),
          4.5,
        );
        const sobrePanel = await effectiveTextColours(page.locator(`[data-voz-panel="${clave}"]`));
        record(
          theme,
          `voz ${clave} sobre panel`,
          contrastRatio(sobrePanel.color, sobrePanel.bg),
          4.5,
        );
      }
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

for (const theme of ["dark", "light", "reading"] as const) {
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
    await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();

    await page.getByRole("button", { name: "Nueva campaña" }).first().click();
    await page.getByLabel("Nombre").fill("Campaña de contraste");
    await page.getByRole("button", { name: "Crear" }).click();
    await page.getByRole("link", { name: "Campaña de contraste" }).click();
    await expect(page.getByRole("heading", { name: "Campaña de contraste" })).toBeVisible();

    await page.getByRole("tab", { name: "El mundo" }).click();

    await page.getByRole("button", { name: /^PNJ/ }).click();
    await page.getByRole("button", { name: "Nuevo PNJ" }).click();
    await page.getByLabel("Nombre").fill("Strahd von Zarovich");
    await page.getByLabel("Etiquetas (separadas por coma)").fill("villano");
    // DM_ONLY is the danger tone — the worst-case badge pair, and the one 1.19's own report
    // flagged as needing --danger-text instead of --danger for exactly this reason.
    await page.getByRole("radio", { name: /Solo DM/ }).check();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

    // **Una segunda ficha, y no es adorno: sin ella no hay filete que medir.** El separador
    // entre filas dejó de vivir en la fila y pasó al contenedor (`divide-y`), que lo pinta como
    // borde superior de todas menos la primera. Con una sola ficha se medía el borde de un
    // elemento que ya no tiene ninguno: daba 1,09:1 —o sea, nada— y la prueba lo cantaba como
    // fallo de contraste cuando en realidad estaba midiendo el vacío.
    await page.getByRole("button", { name: "Nuevo PNJ" }).click();
    await page.getByLabel("Nombre").fill("Rahadin");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

    {
      const { color, bg } = await effectiveTextColours(
        page.getByRole("heading", { name: "Campaña de contraste" }),
      );
      record(theme, "detalle de campaña: título", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(page.getByRole("button", { name: /^PNJ/ }));
      record(theme, "detalle de campaña: tab activo texto", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(page.getByRole("tab", { name: "Resumen" }));
      record(theme, "detalle de campaña: tab inactivo texto", contrastRatio(color, bg), 4.5);
    }
    // Reseño 2026-09-02: la fila de una ficha es un enlace a su página de lectura, no un
    // botón que abre un formulario.
    const row = page.getByRole("link", { name: /Strahd von Zarovich/ });
    // **El filete lo lleva el `<li>`, no el `<a>`**, porque `divide-y` pinta el borde superior de
    // los hijos directos de la lista. Medir el enlace leía el gris del preflight (`#e5e7eb`), que
    // contra un fondo oscuro contrasta de sobra: **la prueba pasaba en tema oscuro por el motivo
    // equivocado** y solo se cayó en el claro. Se mide el elemento que de verdad lo pinta.
    // Se mide el `<li>` de **Strahd**, que se creó primero y por tanto sale el segundo: las
    // fichas se listan de la más nueva a la más vieja, y `divide-y` pinta el borde superior de
    // todas menos la primera. Se llega por el ancestro del enlace y no por un `li:has(a)`
    // suelto, que casaría con las migas de pan y con la barra lateral.
    const filaConFilete = row.locator("xpath=ancestor::li[1]");
    {
      const { color, bg } = await effectiveTextColours(row);
      record(theme, "detalle de campaña: fila de entidad texto", contrastRatio(color, bg), 4.5);
    }
    {
      const { border, bg } = await borderColourAgainstBg(filaConFilete);
      record(theme, "detalle de campaña: filete entre filas", contrastRatio(border, bg), 3);
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

// Tarea 8 del pulido (C2: #1) — **el menú «…» del elenco, medido abierto.** La fila de mandos
// plegó «Condición», «Dar…», «Su hoja» y el bando en `ui/MenuDeAcciones.tsx`; es una superficie
// nueva (`bg-surface` flotante sobre la tarjeta del elenco) que ninguna medida anterior cubría.
// Real screen, no /design-tokens: se navega hasta la mesa, se abre el menú de un combatiente de
// verdad y se mide su texto y su borde, en los tres temas.
for (const theme of ["dark", "light", "reading"] as const) {
  test(`contraste medido en el menú de acciones del elenco (${theme})`, async ({ page }) => {
    await setStoredTheme(page, theme);
    const cuenta = nuevaCuentaContraste();
    await page.goto("/register");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.getByLabel("Nombre").fill(cuenta.displayName);
    await page.getByLabel("Correo").fill(cuenta.email);
    await page.getByLabel("Contraseña").fill(cuenta.password);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();

    await page.getByRole("button", { name: "Nueva campaña" }).first().click();
    await page.getByLabel("Nombre").fill("Campaña del menú");
    await page.getByRole("button", { name: "Crear" }).click();
    await page.getByRole("link", { name: "Campaña del menú" }).click();
    await expect(page.getByRole("heading", { name: "Campaña del menú" })).toBeVisible();

    await page.getByRole("button", { name: "Personajes" }).click();
    await page.getByRole("button", { name: "Nuevo personaje" }).click();
    await page.getByLabel("Nombre").fill("Ren Sombrafiel");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
    // Fix round 2 (controlador) — **se cierra el cajón, no se navega**: «Personajes» abre un
    // diálogo que se queda ENCIMA de la pestaña «Sesiones» si no se cierra; sin este clic, la
    // pestaña existe en el DOM pero no es visible, y el clic siguiente se queda esperando para
    // siempre. Mismo gesto que `e2e/dar-a-un-pnj.spec.ts` (y el mismo arreglo de la ronda 1
    // sobre `teclado.spec.ts`/`espacios.spec.ts`).
    await page.getByRole("button", { name: "Cerrar (Escape)" }).click();

    await page.getByRole("tab", { name: "Sesiones" }).click();
    await page.getByRole("button", { name: "Nueva sesión" }).click();
    await page.getByLabel("Título").fill("La sesión del menú");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
    await page.getByRole("button", { name: "Empezar" }).click();
    await page.getByLabel(cuenta.displayName).check();
    await page
      .getByLabel(`Personaje de ${cuenta.displayName}`)
      .selectOption({ label: "Ren Sombrafiel" });
    await page.getByRole("button", { name: "Empezar la sesión" }).click();

    const barra = page.getByRole("status", { name: "Sesión en curso" });
    await expect(barra).toBeVisible({ timeout: 10_000 });
    await barra.getByRole("link", { name: "Ir a la mesa" }).click();

    const elenco = page.getByRole("region", { name: "En la mesa" });
    await expect(elenco.getByText("Ren Sombrafiel", { exact: true })).toBeVisible({
      timeout: 15_000,
    });

    await elenco.getByRole("button", { name: "Más acciones sobre Ren Sombrafiel" }).click();
    const menu = page.getByRole("menu", { name: "Más acciones sobre Ren Sombrafiel" });
    await expect(menu).toBeVisible();

    {
      const item = menu.getByRole("menuitem", { name: "Condición" });
      const { color, bg } = await effectiveTextColours(item);
      record(theme, "menú de acciones: ítem texto", contrastRatio(color, bg), 4.5);
    }
    {
      const { border, bg } = await borderColourAgainstBg(menu);
      record(theme, "menú de acciones: borde del panel", contrastRatio(border, bg), 3);
    }

    await page.keyboard.press("Escape");
  });
}

// Task 1.18b — the two new screens (hallazgo 6 + the account screen), measured the same
// disciplined way: real navigation, real computed colours, both themes.
function nuevaCuentaCuenta() {
  return nuevaCuenta("cuenta");
}

for (const theme of ["dark", "light", "reading"] as const) {
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

  // Deuda S1 — la atribucion del SRD, medida en el navegador y no en jsdom.
  //
  // **Por que en el navegador.** El pie es texto pequeno en `--muted` sobre el fondo de la
  // aplicacion, y ese es exactamente el sitio donde un contraste se cae sin que nadie lo note:
  // jsdom no maqueta ni calcula color efectivo, asi que una suite verde no dice nada de si se
  // lee. Y **un aviso legal que no se puede leer no cumple** la licencia mejor que no ponerlo.
  test(`contraste de la atribucion del SRD en /acerca-de (${theme})`, async ({ page }) => {
    await setStoredTheme(page, theme);
    await page.goto("/acerca-de");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

    {
      const { color, bg } = await effectiveTextColours(
        page.getByText("Wizards of the Coast LLC", { exact: false }).first(),
      );
      record(theme, "acerca de: atribucion del SRD", contrastRatio(color, bg), 4.5);
    }
    {
      // La nota de modificacion es la mitad que se olvida, y va en negrita: se mide aparte.
      const { color, bg } = await effectiveTextColours(
        page.getByText("Modificaciones:", { exact: false }).first(),
      );
      record(theme, "acerca de: nota de modificacion", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(
        page.getByRole("link", { name: "System Reference Document 5.1" }).last(),
      );
      record(theme, "acerca de: pie, enlace al SRD", contrastRatio(color, bg), 4.5);
    }
    {
      // El pie es texto pequeno en `--muted`: el candidato numero uno a no llegar a 4.5:1.
      const { color, bg } = await effectiveTextColours(page.locator("footer p").first());
      record(theme, "acerca de: pie, texto de atribucion", contrastRatio(color, bg), 4.5);
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
    await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();

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

    // Ticket 38 (2026-09-11) — desde la ficha 1.18a (token fresco, `e2e/cuenta.spec.ts`) cambiar
    // la contraseña YA NO cierra la sesión ni manda a /login: el servidor emite un token nuevo,
    // la cuenta lo guarda y confirma EN LA MISMA pantalla, con `role="status"`. El aviso de
    // `LoginPage.tsx` que esto medía quedó sin consumidor real — se mide el que sí pinta hoy.
    await page.getByLabel("Contraseña actual").fill(cuenta.password);
    await page.getByLabel("Contraseña nueva").fill("password456");
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(page).toHaveURL(/\/account$/);
    // `getByRole("status")` resolvería dos: el aviso de nombre de arriba sigue montado (su
    // `saved` no se resetea al cambiar de formulario) y el de contraseña que acaba de aparecer.
    // Por texto, como ya se hace con «Nombre actualizado.» más arriba.
    const aviso = page.getByText("Contraseña actualizada.");
    await expect(aviso).toBeVisible();
    {
      const { color, bg } = await effectiveTextColours(aviso);
      record(theme, "cuenta: confirmación de contraseña texto", contrastRatio(color, bg), 4.5);
    }
  });
}

// Task 31 — la sexta pantalla real: el diálogo de subida de nivel (features/level-up/). Mismo
// guion que subir-nivel.spec.ts (raza enana, clase guerrero, nivel 1, características completas)
// para que el previo del servidor traiga un diff de verdad —PG máximos, dados de golpe,
// bonificador de competencia, aptitud nueva— en vez del 400 "faltan raza, clase o
// características" que se pintaría con un personaje vacío. Se mide el diálogo abierto: su
// título, el cuerpo del diff, el aviso sobre la tirada y los tres botones.
function nuevaCuentaNivel() {
  return nuevaCuenta("nivel-contraste");
}

for (const theme of ["dark", "light", "reading"] as const) {
  test(`contraste medido en la pantalla de subida de nivel (${theme})`, async ({ page }) => {
    await setStoredTheme(page, theme);
    const cuenta = nuevaCuentaNivel();
    await page.goto("/register");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.getByLabel("Nombre").fill(cuenta.displayName);
    await page.getByLabel("Correo").fill(cuenta.email);
    await page.getByLabel("Contraseña").fill(cuenta.password);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();

    await page.getByRole("button", { name: "Nueva campaña" }).first().click();
    await page.getByLabel("Nombre").fill("Campaña de contraste (nivel)");
    await page.getByRole("button", { name: "Crear" }).click();
    await page.getByRole("link", { name: "Campaña de contraste (nivel)" }).click();
    await expect(page.getByRole("heading", { name: "Campaña de contraste (nivel)" })).toBeVisible();

    await page.getByRole("button", { name: "Personajes" }).click();
    await page.getByRole("button", { name: "Nuevo personaje" }).click();
    await page.getByLabel("Nombre").fill("Dain Yunquefirme");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
    await page.getByRole("link", { name: /Dain Yunquefirme/ }).click();
    await expect(page.getByRole("heading", { name: "Dain Yunquefirme" })).toBeVisible();

    await page.getByLabel("Raza", { exact: true }).selectOption("dwarf");
    await page.getByLabel("Clase", { exact: true }).selectOption("fighter");
    await page.getByLabel("Nivel", { exact: true }).fill("1");
    await page.getByLabel("Nivel", { exact: true }).blur();
    const caracteristicas: [string, string][] = [
      ["Fuerza", "16"],
      ["Destreza", "12"],
      ["Constitución", "14"],
      ["Inteligencia", "10"],
      ["Sabiduría", "10"],
      ["Carisma", "8"],
    ];
    for (const [nombre, valor] of caracteristicas) {
      const campo = page.getByLabel(nombre, { exact: true });
      await campo.fill(valor);
      await campo.blur();
    }
    await expect(page.getByText("Salvaciones", { exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Subir a nivel 2" }).click();
    const dialogo = page.getByRole("dialog", { name: "Subir de nivel" });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByText("Nivel 1 → 2")).toBeVisible({ timeout: 10_000 });

    // Ticket 38 (2026-09-11) — «Confirmar subida de nivel» empieza deshabilitado (mientras
    // `consulta.isLoading`) y `Button.tsx` cruza a su estilo `primary` con
    // `transition-colors duration-100` en cuanto `previo` llega — el mismo instante en que el
    // texto de arriba («Nivel 1 → 2») aparece. Medir el color justo aquí, sin margen, atrapaba
    // el fotograma A MEDIO CRUCE de esa transición de 100ms — un color interpolado que no es ni
    // el desactivado ni el final, y que dio 2.58:1 en un lote pero no en otro (visto en el
    // navegador: el botón final SÍ despeja 4.5:1 de sobra, ~5.4-5.7:1 medido en frío). No es un
    // color del sistema — es una lectura a media transición.
    //
    // Revisión final de `ficha/tanda-2-a-5`, Low #9: una espera fija (`waitForTimeout(150)`)
    // es la forma más frágil de esperar esto en un CI lento — 150ms de reloj real no garantizan
    // que la transición YA terminó, solo que probablemente lo hizo. Se espera primero a que el
    // botón deje de estar deshabilitado (la condición real que dispara el cruce de estilo) y
    // luego a que sus animaciones/transiciones en curso terminen de verdad, con la Web
    // Animations API — así el test nunca lee a mitad de un cruce, sea cual sea la máquina.
    const botonConfirmar = dialogo.getByRole("button", { name: "Confirmar subida de nivel" });
    await expect(botonConfirmar).toBeEnabled();
    await botonConfirmar.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));

    {
      const { color, bg } = await effectiveTextColours(
        dialogo.getByRole("heading", { name: "Subir de nivel" }),
      );
      record(theme, "subida de nivel: título del diálogo", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(dialogo.getByText("Nivel 1 → 2"));
      record(theme, "subida de nivel: cabecera del diff", contrastRatio(color, bg), 4.5);
    }
    {
      // Sin `exact: true` esto resuelve DOS nodos: el `<dt>` de `DiffNivel.tsx` (`Fila`) que de
      // verdad lleva la etiqueta, y la fila entera que lo envuelve (`<dt>` + `<dd>`), cuyo texto
      // concatenado EMPIEZA por la misma cadena — "Puntos de golpe máximos38 → 46 (+8)" también
      // la contiene como subcadena. Se mide la etiqueta que el jugador lee, no la fila.
      const { color, bg } = await effectiveTextColours(
        dialogo.getByText("Puntos de golpe máximos", { exact: true }),
      );
      record(theme, "subida de nivel: etiqueta de fila del diff", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(
        dialogo.getByText(/Tirar el dado deja la tirada en el registro/),
      );
      record(theme, "subida de nivel: aviso sobre la tirada", contrastRatio(color, bg), 4.5);
    }
    for (const name of ["Tirar el dado de golpe", "Confirmar subida de nivel", "Cancelar"]) {
      const { color, bg } = await effectiveTextColours(
        dialogo.getByRole("button", { name, exact: true }),
      );
      record(theme, `subida de nivel: botón "${name}" texto`, contrastRatio(color, bg), 4.5);
    }

    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialogo).toBeHidden();
  });
}

// Tarea 10 (spec 2026-09-11, «la hoja a página completa») — **las dos pestañas nuevas de la
// hoja, medidas en los tres temas.** «Objetos» a página trae piezas que no existían: el carril
// de pestañas, las fichas de filtro, el buscador, la fila seleccionada sobre `--accent-tint` y
// el panel de detalle; «Estado» reúne tarjetas que ya se medían sueltas, pero ahora en su
// columna y con el chip de condición de la cabecera fija encima. Es exactamente el momento en el
// que un contraste se cae sin que nadie mire: tokens conocidos en contextos nuevos. Todo pasa
// por `record()` y frena la corrida por debajo del umbral, como el resto del fichero.
//
// El personaje se **monta por la API y se mide en pantalla** (patrón de
// `condiciones-con-duracion.spec.ts`): lo que se mide son colores, no el camino de la ficha.
function nuevaCuentaPestanas() {
  return nuevaCuenta("pestanas-contraste");
}

for (const theme of ["dark", "light", "reading"] as const) {
  test(`contraste medido en las pestañas Objetos y Estado de la hoja (${theme})`, async ({
    page,
  }) => {
    await setStoredTheme(page, theme);
    const cuenta = nuevaCuentaPestanas();
    await page.goto("/register");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.getByLabel("Nombre").fill(cuenta.displayName);
    await page.getByLabel("Correo").fill(cuenta.email);
    await page.getByLabel("Contraseña").fill(cuenta.password);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();

    const token = await page.evaluate(() => localStorage.getItem("dnd_token"));
    const headers = { Authorization: `Bearer ${token}` };
    const campana = await page.request.post("/api/campaigns", {
      headers,
      data: { name: "Campaña de contraste (pestañas)" },
    });
    expect(campana.ok()).toBe(true);
    const campaignId: string = (await campana.json()).id;
    const personaje = await page.request.post(`/api/campaigns/${campaignId}/characters`, {
      headers,
      data: { name: "Nessa Tintaclara" },
    });
    expect(personaje.ok()).toBe(true);
    const characterId: string = (await personaje.json()).id;
    const hoja = await page.request.patch(
      `/api/campaigns/${campaignId}/characters/${characterId}/sheet`,
      {
        headers,
        data: {
          abilities: { str: 10, dex: 14, con: 12, int: 15, wis: 12, cha: 8 },
          race: { source: "SRD", key: "human" },
          class: { source: "SRD", key: "fighter" },
          level: 1,
          choices: { "fighter-skills": ["athletics", "perception"] },
        },
      },
    );
    expect(hoja.ok()).toBe(true);
    // Dos objetos: uno queda seleccionado (el primero) y el otro es lo que se filtra.
    for (const key of ["dagger", "leather"]) {
      const alta = await page.request.post(
        `/api/campaigns/${campaignId}/characters/${characterId}/inventory`,
        { headers, data: { ref: { source: "SRD", key }, quantity: 1, location: "CARRIED" } },
      );
      expect(alta.ok()).toBe(true);
    }

    // --- Objetos ---
    await page.goto(`/campaigns/${campaignId}/personajes/${characterId}?pestana=objetos`);
    await expect(page.getByRole("tab", { name: "Objetos", selected: true })).toBeVisible();
    const inventario = page.getByRole("region", { name: "inventario" });
    const detalle = page.getByRole("complementary", { name: "detalle del objeto" });
    await expect(detalle.getByRole("heading", { name: "Daga" })).toBeVisible();

    {
      // El carril: la pestaña activa va en `--accent-text` sobre `--accent-tint`, que es un
      // fondo translúcido compuesto sobre la página y no un token sólido.
      const { color, bg } = await effectiveTextColours(page.getByRole("tab", { name: "Objetos" }));
      record(theme, "hoja: pestaña activa del carril texto", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(page.getByRole("tab", { name: "Números" }));
      record(theme, "hoja: pestaña inactiva del carril texto", contrastRatio(color, bg), 4.5);
    }
    {
      // Una ficha de filtro en reposo: `--muted` sobre la superficie de la lista.
      const ficha = page.getByRole("button", { name: "Encima", exact: true });
      const { color, bg } = await effectiveTextColours(ficha);
      record(theme, "hoja: ficha de filtro inactiva texto", contrastRatio(color, bg), 4.5);
      const { border, bg: fondo } = await borderColourAgainstBg(ficha);
      record(theme, "hoja: ficha de filtro inactiva borde", contrastRatio(border, fondo), 3);
    }
    {
      // Y pulsada: es el mismo par que la pestaña activa, en otro tamaño de letra.
      const ficha = page.getByRole("button", { name: "Armadura", exact: true });
      await ficha.click();
      await expect(ficha).toHaveAttribute("aria-pressed", "true");
      const { color, bg } = await effectiveTextColours(ficha);
      record(theme, "hoja: ficha de filtro activa texto", contrastRatio(color, bg), 4.5);
      const { border, bg: fondo } = await borderColourAgainstBg(ficha);
      record(theme, "hoja: ficha de filtro activa borde", contrastRatio(border, fondo), 3);
      await ficha.click();
      await expect(ficha).toHaveAttribute("aria-pressed", "false");
    }
    {
      const buscador = page.getByRole("searchbox", { name: "Buscar objeto", exact: true });
      const { border, bg } = await borderColourAgainstBg(buscador);
      record(theme, "hoja: borde del buscador de objetos", contrastRatio(border, bg), 3);
    }
    {
      // La fila seleccionada: el nombre, en `--text`, sobre el `--accent-tint` de la selección.
      const nombre = inventario.getByRole("button", { name: "Ver detalle de Daga" });
      const { color, bg } = await effectiveTextColours(nombre);
      record(theme, "hoja: nombre de la fila seleccionada texto", contrastRatio(color, bg), 4.5);
    }
    {
      const sinSeleccionar = inventario.getByRole("button", { name: "Ver detalle de Cuero" });
      const { color, bg } = await effectiveTextColours(sinSeleccionar);
      record(
        theme,
        "hoja: nombre de una fila sin seleccionar texto",
        contrastRatio(color, bg),
        4.5,
      );
    }
    {
      // El panel de detalle: su título, su subtítulo tenue, la cifra en `--accent-text`, y el
      // filete que lo separa de la lista.
      const { color, bg } = await effectiveTextColours(
        detalle.getByRole("heading", { name: "Daga" }),
      );
      record(theme, "hoja: título del detalle del objeto", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(detalle.locator("header p").first());
      record(theme, "hoja: subtítulo del detalle del objeto", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(detalle.locator("dd").first());
      record(theme, "hoja: dato del detalle del objeto", contrastRatio(color, bg), 4.5);
    }
    {
      const { border, bg } = await borderColourAgainstBg(detalle);
      record(theme, "hoja: filete del detalle del objeto", contrastRatio(border, bg), 3);
    }
    for (const name of ["Equipar", "Soltar Daga"]) {
      const { color, bg } = await effectiveTextColours(detalle.getByRole("button", { name }));
      record(theme, `hoja: botón "${name}" del detalle texto`, contrastRatio(color, bg), 4.5);
    }

    // --- Estado ---
    await page.goto(`/campaigns/${campaignId}/personajes/${characterId}?pestana=estado`);
    await expect(page.getByRole("tab", { name: "Estado", selected: true })).toBeVisible();
    const condiciones = page.locator('section[aria-label="condiciones"]');
    await expect(condiciones).toBeVisible();

    {
      const { color, bg } = await effectiveTextColours(condiciones.getByRole("heading"));
      record(theme, "hoja: rótulo de la tarjeta de condiciones", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(
        condiciones.getByText("Sin condiciones activas."),
      );
      record(theme, "hoja: texto de «sin condiciones»", contrastRatio(color, bg), 4.5);
    }
    {
      const nueva = page.getByLabel("Nueva condición");
      const { color, bg } = await effectiveTextColours(nueva);
      record(theme, "hoja: desplegable de nueva condición texto", contrastRatio(color, bg), 4.5);
      const { border, bg: fondo } = await borderColourAgainstBg(nueva);
      record(theme, "hoja: desplegable de nueva condición borde", contrastRatio(border, fondo), 3);
    }
    {
      const { color, bg } = await effectiveTextColours(
        condiciones.getByRole("button", { name: "Aplicar condición" }),
      );
      record(theme, "hoja: botón «Aplicar condición» texto", contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(
        page
          .getByRole("region", { name: "modificadores temporales" })
          .getByText("Ninguno ahora mismo."),
      );
      record(theme, "hoja: texto de «ningún modificador»", contrastRatio(color, bg), 4.5);
    }
    {
      const cifra = page.getByRole("region", { name: "clase de armadura" }).locator("span").first();
      const { color, bg } = await effectiveTextColours(cifra);
      record(
        theme,
        "hoja: cifra de la tarjeta de clase de armadura",
        contrastRatio(color, bg),
        4.5,
      );
    }
    {
      const { color, bg } = await effectiveTextColours(
        page.getByText("Caminar (pies)", { exact: true }),
      );
      record(theme, "hoja: rótulo de una casilla de velocidad", contrastRatio(color, bg), 4.5);
    }

    // --- El chip de la cabecera fija, que solo existe con una condición puesta. Es texto en
    //     `--warning-text` sobre la banda translúcida de la tira, el par nuevo de la Tarea 3.
    await page.getByLabel("Nueva condición").selectOption("prone");
    await condiciones.getByRole("button", { name: "Aplicar condición" }).click();
    const chip = page
      .getByRole("region", { name: "resumen de combate" })
      .getByRole("list", { name: "condiciones activas" })
      .getByRole("listitem")
      .filter({ hasText: "Derribado" });
    await expect(chip).toBeVisible({ timeout: 10_000 });
    {
      const { color, bg } = await effectiveTextColours(chip);
      record(theme, "hoja: chip de condición de la cabecera texto", contrastRatio(color, bg), 4.5);
      const { border, bg: fondo } = await borderColourAgainstBg(chip);
      record(
        theme,
        "hoja: chip de condición de la cabecera borde",
        contrastRatio(border, fondo),
        3,
      );
    }
  });
}

// Task 5 (3A.3) — **el cajón del registro desapareció**, y con él el botón plegado/desplegado que
// esta prueba medía. Lo que sustituye a esa única superficie nueva de C1 bis es otra: los tres
// radios del filtro del registro lateral («Todo · Relato · Números»), la única pieza de color
// nueva de esta tarea. Mismo patrón que el resto del fichero —`boardRoomUrl` por API, sin repetir
// el recorrido de Ajustes— y se mide el radio ELEGIDO (fondo `--accent-tint`, como el botón
// plegado medía `bg-accent`) y uno SIN elegir, en los tres temas.
for (const theme of ["dark", "light", "reading"] as const) {
  test(`contraste medido en los filtros del registro lateral (${theme})`, async ({ page }) => {
    await setStoredTheme(page, theme);
    const cuenta = nuevaCuenta("filtro-registro-contraste");
    await page.goto("/register");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.getByLabel("Nombre").fill(cuenta.displayName);
    await page.getByLabel("Correo").fill(cuenta.email);
    await page.getByLabel("Contraseña").fill(cuenta.password);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();

    const token = await page.evaluate(() => localStorage.getItem("dnd_token"));
    const headers = { Authorization: `Bearer ${token}` };
    const campana = await page.request.post("/api/campaigns", {
      headers,
      data: { name: "Campaña de contraste (filtros)" },
    });
    expect(campana.ok()).toBe(true);
    const campaignId: string = (await campana.json()).id;
    const sesion = await page.request.post(`/api/campaigns/${campaignId}/sessions`, {
      headers,
      data: { title: "El almacén cuatro" },
    });
    expect(sesion.ok()).toBe(true);
    const sessionId: string = (await sesion.json()).id;
    const iniciada = await page.request.post(
      `/api/campaigns/${campaignId}/sessions/${sessionId}/start`,
      { headers, data: {} },
    );
    expect(iniciada.ok()).toBe(true);

    // Sin `boardRoomUrl`: el registro va al centro y no a la lateral, pero es el mismo
    // `ColumnaDelRegistro` con los mismos filtros — lo que se mide es el color, no la columna.
    await page.goto(`/campaigns/${campaignId}/sesion`);
    // El «Todo» ELEGIDO por defecto: un `<button role="radio" aria-checked>` del segmento inline
    // de la cabecera del registro (`HiloDeSesion.tsx`, D-CF-148; desde cf68768 ya no es el
    // `GrupoDeRadios` con frase visible). Se mide el texto del BOTÓN («Todo»); su explicación va
    // en `aria-describedby`/`title`, fuera del nodo, así que no se mezcla ningún tono.
    const todo = page.getByRole("radio", { name: /^Todo/ });
    await expect(todo).toBeVisible();
    await expect(todo).toBeChecked();
    {
      const { color, bg } = await effectiveTextColours(page.getByText("Todo", { exact: true }));
      record(theme, "registro: filtro elegido (Todo) texto", contrastRatio(color, bg), 4.5);
    }
    // Y uno SIN elegir, sobre `border-transparent` — el radio que de verdad prueba el color de
    // reposo, no el de selección.
    {
      const { color, bg } = await effectiveTextColours(page.getByText("Relato", { exact: true }));
      record(theme, "registro: filtro sin elegir (Relato) texto", contrastRatio(color, bg), 4.5);
    }
  });
}

// Task 10 (pulido, C5 web) — **la bandeja de dados y el `<details>` abierto**, medidos como el
// resto del fichero: pantalla real, colores reales, en los tres temas. La bandeja pinta un botón
// por dado (secundario, como «Guardar»/«Cancelar» de arriba) y su pila; el `<details>` «Modo
// avanzado» aporta una superficie que ninguna medida anterior cubría — el propio `<summary>`, en
// `--muted`, y el campo «Qué se tira» una vez abierto.
for (const theme of ["dark", "light", "reading"] as const) {
  test(`contraste medido en la bandeja de dados (${theme})`, async ({ page }) => {
    await setStoredTheme(page, theme);
    const cuenta = nuevaCuenta("bandeja-contraste");
    await page.goto("/register");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.getByLabel("Nombre").fill(cuenta.displayName);
    await page.getByLabel("Correo").fill(cuenta.email);
    await page.getByLabel("Contraseña").fill(cuenta.password);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();

    await page.getByRole("button", { name: "Nueva campaña" }).first().click();
    await page.getByLabel("Nombre").fill("Campaña de contraste (bandeja)");
    await page.getByRole("button", { name: "Crear" }).click();
    await page.getByRole("link", { name: "Campaña de contraste (bandeja)" }).click();
    await expect(
      page.getByRole("heading", { name: "Campaña de contraste (bandeja)" }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Dados" }).click();
    await expect(page.getByRole("heading", { name: "Dados", exact: true })).toBeVisible();

    const tarjeta = page.getByRole("region", { name: "Tirada nueva" });

    {
      const boton = tarjeta.getByRole("button", { name: "Añadir un d6", exact: true });
      const { color, bg } = await effectiveTextColours(boton);
      record(theme, "bandeja: botón de dado texto", contrastRatio(color, bg), 4.5);
      const { border, bg: borderBg } = await borderColourAgainstBg(boton);
      record(theme, "bandeja: botón de dado borde", contrastRatio(border, borderBg), 3);
    }

    // La bandeja empieza con un d20 (el «1d20» de siempre); el d6 que se añade aquí entra en la
    // segunda posición de la pila. Round 1 de revisión (anexo #10): la pila pinta en superficie
    // de cobre, distinta del contorno de los atajos — se mide aparte y no se confunde con el
    // botón de arriba.
    await tarjeta.getByRole("button", { name: "Añadir un d6", exact: true }).click();
    {
      const pila = tarjeta.getByRole("button", { name: "Quitar el d6 (posición 2)", exact: true });
      const { color, bg } = await effectiveTextColours(pila);
      record(theme, "bandeja: botón de la pila texto", contrastRatio(color, bg), 4.5);
      const { border, bg: borderBg } = await borderColourAgainstBg(pila);
      record(theme, "bandeja: botón de la pila borde", contrastRatio(border, borderBg), 3);
    }
    {
      const rotuloPila = tarjeta.getByText("En la bandeja · 2 dados");
      const { color, bg } = await effectiveTextColours(rotuloPila);
      record(theme, "bandeja: rótulo «En la bandeja» texto", contrastRatio(color, bg), 4.5);
    }

    {
      const summary = tarjeta.getByText("Modo avanzado");
      const { color, bg } = await effectiveTextColours(summary);
      record(theme, "bandeja: rótulo «Modo avanzado» texto", contrastRatio(color, bg), 4.5);
    }

    await tarjeta.getByText("Modo avanzado").click();
    {
      const campo = tarjeta.getByLabel("Qué se tira");
      const { border, bg } = await borderColourAgainstBg(campo);
      record(theme, "bandeja: campo «Qué se tira» abierto, borde", contrastRatio(border, bg), 3);
    }
  });
}

// Task 14 bis (pulido, D-CF-64) — **el mundo como árbol con detalle**, en el taller del DM, medido
// como el resto del fichero: pantalla real, colores reales, en los tres temas. Lo que esta pantalla
// pinta y ninguna medida anterior cubría: la raíz de tipo en cobre con su contador, la fila elegida
// del árbol (`--accent-text` sobre `--accent-tint`), el rótulo en gris de una ficha que cuelga, el
// enlace «Abrir ficha», un vecino del anillo (texto y borde) y la fila del editor de hilos. Se
// monta por API —campaña, lugar, PNJ y el hilo «vive en»— para no repetir el recorrido de
// `mundo-arbol.spec.ts`, que es quien demuestra que el gesto funciona.
for (const theme of ["dark", "light", "reading"] as const) {
  test(`contraste medido en el mundo como árbol con detalle (${theme})`, async ({ page }) => {
    await setStoredTheme(page, theme);
    const cuenta = nuevaCuenta("mundo-contraste");
    await page.goto("/register");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.getByLabel("Nombre").fill(cuenta.displayName);
    await page.getByLabel("Correo").fill(cuenta.email);
    await page.getByLabel("Contraseña").fill(cuenta.password);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();

    const token = await page.evaluate(() => localStorage.getItem("dnd_token"));
    const headers = { Authorization: `Bearer ${token}` };
    const campana = await page.request.post("/api/campaigns", {
      headers,
      data: { name: "Campaña de contraste (mundo)" },
    });
    expect(campana.ok()).toBe(true);
    const campaignId: string = (await campana.json()).id;
    const torre = await page.request.post(`/api/campaigns/${campaignId}/entities`, {
      headers,
      data: { type: "LOCATION", name: "Torre Gris" },
    });
    expect(torre.ok()).toBe(true);
    const torreId: string = (await torre.json()).id;
    const corvin = await page.request.post(`/api/campaigns/${campaignId}/entities`, {
      headers,
      data: { type: "NPC", name: "Corvin" },
    });
    expect(corvin.ok()).toBe(true);
    const corvinId: string = (await corvin.json()).id;
    const hilo = await page.request.post(`/api/entities/${corvinId}/links`, {
      headers,
      data: { toId: torreId, label: "vive en" },
    });
    expect(hilo.ok()).toBe(true);

    await page.goto(`/campaigns/${campaignId}/sesion`);
    const mundo = page.getByRole("region", { name: "El mundo" });
    const arbol = mundo.getByRole("tree", { name: "El mundo" });
    const lugares = arbol.getByRole("treeitem", { name: "Lugares" });
    await expect(lugares).toBeVisible();

    {
      const rotuloDeRaiz = lugares.getByText("Lugares", { exact: true });
      const { color, bg } = await effectiveTextColours(rotuloDeRaiz);
      record(theme, "mundo: raíz de tipo en cobre", contrastRatio(color, bg), 4.5);
      const contador = lugares.getByText("1", { exact: true }).first();
      const medida = await effectiveTextColours(contador);
      record(theme, "mundo: contador de la raíz", contrastRatio(medida.color, medida.bg), 4.5);
    }

    const torreItem = arbol.getByRole("treeitem", { name: "Torre Gris", exact: true });
    await torreItem.getByRole("button", { name: "Desplegar Torre Gris" }).click();
    const corvinItem = arbol.getByRole("treeitem", { name: "Corvin", exact: true });
    await expect(corvinItem).toBeVisible();
    {
      const nombre = corvinItem.getByText("Corvin", { exact: true });
      const { color, bg } = await effectiveTextColours(nombre);
      record(theme, "mundo: ficha del árbol, texto", contrastRatio(color, bg), 4.5);
      const rotulo = corvinItem.getByText("vive en", { exact: true });
      const medida = await effectiveTextColours(rotulo);
      record(
        theme,
        "mundo: rótulo de jerarquía en gris",
        contrastRatio(medida.color, medida.bg),
        4.5,
      );
    }

    // La fila elegida cambia de fondo (`--accent-tint`) y de texto (`--accent-text`).
    await corvinItem.click();
    await expect(corvinItem).toHaveAttribute("aria-selected", "true");
    {
      const nombre = corvinItem.getByText("Corvin", { exact: true });
      const { color, bg } = await effectiveTextColours(nombre);
      record(theme, "mundo: ficha elegida del árbol, texto", contrastRatio(color, bg), 4.5);
    }

    const detalle = mundo.getByRole("article", { name: "Detalle de Corvin" });
    {
      const abrir = detalle.getByRole("link", { name: "Abrir ficha" });
      const { color, bg } = await effectiveTextColours(abrir);
      record(theme, "mundo: enlace «Abrir ficha» texto", contrastRatio(color, bg), 4.5);
      const { border, bg: borderBg } = await borderColourAgainstBg(abrir);
      record(theme, "mundo: enlace «Abrir ficha» borde", contrastRatio(border, borderBg), 3);
    }
    {
      const vecino = detalle
        .getByRole("group", { name: "Vecinos de Corvin" })
        .getByRole("button", { name: "vive en Torre Gris" });
      const nombre = vecino.getByText("Torre Gris", { exact: true });
      const { color, bg } = await effectiveTextColours(nombre);
      record(theme, "mundo: vecino del anillo, texto", contrastRatio(color, bg), 4.5);
      const { border, bg: borderBg } = await borderColourAgainstBg(vecino);
      record(theme, "mundo: vecino del anillo, borde", contrastRatio(border, borderBg), 3);
    }
    {
      const fila = detalle.getByRole("list", { name: "Hilos de Corvin" }).getByRole("listitem");
      const rotulo = fila.getByText("vive en", { exact: true });
      const { color, bg } = await effectiveTextColours(rotulo);
      record(theme, "mundo: rótulo de la fila de hilos, cobre", contrastRatio(color, bg), 4.5);
      const tipo = fila.getByText("Lugar", { exact: true });
      const medida = await effectiveTextColours(tipo);
      record(
        theme,
        "mundo: tipo legible de la fila de hilos",
        contrastRatio(medida.color, medida.bg),
        4.5,
      );
    }
    {
      const chip = mundo.getByRole("button", { name: "Sin hilos" });
      const { color, bg } = await effectiveTextColours(chip);
      record(theme, "mundo: chip «Sin hilos» en reposo, texto", contrastRatio(color, bg), 4.5);
      const { border, bg: borderBg } = await borderColourAgainstBg(chip);
      record(theme, "mundo: chip «Sin hilos» en reposo, borde", contrastRatio(border, borderBg), 3);
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
