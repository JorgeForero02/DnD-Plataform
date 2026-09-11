import { test, expect, type Browser, type Locator, type Page } from "@playwright/test";

// Task 30 (ficha 1.18b) — el aviso «no puedes editar esto» se mide en la pantalla de un
// jugador de verdad, con dos navegadores (patrón de admin-reinicio.spec.ts): el DM crea una
// ficha PLAYERS, invita a un jugador (patrón de invitacion.spec.ts), el jugador entra por el
// enlace y abre la ficha. El control de editar tiene que llevar `aria-disabled="true"` y el
// motivo tiene que ser legible: no basta con que esté en el DOM, se mide su contraste como hace
// tokens-contrast.spec.ts.

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

// Copiado de tokens-contrast.spec.ts tal cual (el brief pide reusar exactamente esa función):
// compone los fondos translúcidos hasta el primero opaco en vez de asumir que el elemento pinta
// sobre blanco.
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

function nuevaCuenta(prefijo: string) {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `e2e-${prefijo}-${marca}@example.com`,
    password: "password123",
    displayName: `${prefijo} ${marca}`,
  };
}

async function registrarse(page: Page, prefijo: string) {
  const cuenta = nuevaCuenta(prefijo);
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();
  return cuenta;
}

test.setTimeout(60_000);

test("el jugador ve por qué no puede editar una ficha PLAYERS, con el motivo legible", async ({
  browser,
}: {
  browser: Browser;
}) => {
  // Contexto 1: el DM.
  const dmContext = await browser.newContext();
  const dmPage = await dmContext.newPage();
  await registrarse(dmPage, "dm-no-edita");

  await dmPage.getByRole("button", { name: "Nueva campaña" }).first().click();
  await dmPage.getByLabel("Nombre").fill("Campaña del aviso de edición");
  await dmPage.getByRole("button", { name: "Crear" }).click();
  await dmPage.getByRole("link", { name: "Campaña del aviso de edición" }).click();
  await expect(dmPage.getByRole("heading", { name: "Campaña del aviso de edición" })).toBeVisible();

  // Una ficha PLAYERS: la visibilidad que un jugador ve pero no puede tocar si no la creó él.
  await dmPage.getByRole("tab", { name: "El mundo" }).click();
  await dmPage.getByRole("button", { name: /^PNJ/ }).click();
  await dmPage.getByRole("button", { name: "Nuevo PNJ" }).click();
  await dmPage.getByLabel("Nombre").fill("Sildar Hallwinter");
  await dmPage.getByRole("radio", { name: /Todos los que se sientan a esta mesa/ }).check();
  await dmPage.getByRole("button", { name: "Guardar" }).click();
  await expect(dmPage.getByRole("button", { name: "Guardar" })).toBeHidden();
  const fila = dmPage.getByRole("link", { name: /Sildar Hallwinter/ });
  await expect(fila).toBeVisible();
  await expect(fila).toContainText("Jugadores");

  // Invitar (patrón de invitacion.spec.ts).
  await dmPage.getByRole("link", { name: "Campaña del aviso de edición" }).click();
  await dmPage.getByRole("tab", { name: "Resumen" }).click();
  const quienJuega = dmPage.getByRole("region", { name: "Quién juega" });
  await expect(quienJuega).toContainText("Todavía no hay jugadores", { timeout: 10_000 });
  await quienJuega.getByRole("link", { name: "Invitar a un jugador" }).click();
  await expect(dmPage.getByRole("tab", { name: "Ajustes", selected: true })).toBeVisible();
  await dmPage.getByRole("button", { name: "Generar invitación" }).click();
  const linkField = dmPage.getByLabel("Enlace de invitación");
  await expect(linkField).toBeVisible();
  const inviteUrl = await linkField.inputValue();
  expect(inviteUrl).toMatch(/\/join\/.+/);

  // Contexto 2: el jugador, se une por el enlace.
  const playerContext = await browser.newContext();
  const playerPage = await playerContext.newPage();
  await playerPage.goto(inviteUrl);
  await expect(
    playerPage.getByText("Necesitas iniciar sesión para aceptar esta invitación."),
  ).toBeVisible();
  await playerPage.getByRole("link", { name: "Crear cuenta" }).click();
  const jugador = nuevaCuenta("jugador-no-edita");
  await playerPage.getByLabel("Nombre").fill(jugador.displayName);
  await playerPage.getByLabel("Correo").fill(jugador.email);
  await playerPage.getByLabel("Contraseña").fill(jugador.password);
  await playerPage.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(
    playerPage.getByText("Estás a punto de unirte a una campaña con esta invitación."),
  ).toBeVisible();
  await playerPage.getByRole("button", { name: "Unirse a la campaña" }).click();
  await expect(
    playerPage.getByRole("heading", { name: "Campaña del aviso de edición" }),
  ).toBeVisible();

  // El jugador abre la ficha PLAYERS que puso el DM.
  await playerPage.getByRole("tab", { name: "El mundo" }).click();
  await playerPage.getByRole("button", { name: /^PNJ/ }).click();
  const filaJugador = playerPage.getByRole("link", { name: /Sildar Hallwinter/ });
  await expect(filaJugador).toBeVisible();
  await filaJugador.click();
  await expect(playerPage.getByRole("heading", { name: "Sildar Hallwinter" })).toBeVisible();

  // El botón de la página de detalle abre el editor en modo lectura — no dice "Editar" porque
  // no lo es (EntityDetailPage.tsx: puedeEditar decide la etiqueta).
  await playerPage
    .getByRole("button", { name: /Editar|Ver el texto completo|Ver la hoja completa/ })
    .click();
  await expect(playerPage.getByRole("heading", { name: "Editar PNJ" })).toBeVisible();

  // El control de guardar: aria-disabled, no disabled — sigue en el recorrido de teclado
  // (docs/07-historial.md, U9) — y con su motivo en el atributo title.
  const guardar = playerPage.getByRole("button", { name: "Guardar" });
  await expect(guardar).toHaveAttribute("aria-disabled", "true");
  await expect(guardar).toHaveAttribute("title", "Solo el DM o quien lo creó puede editarlo.");

  // Y el motivo, escrito y visible junto al formulario — no solo en un atributo que un lector
  // de pantalla lee pero un ojo no ve sin pasar el ratón por encima.
  const motivo = playerPage
    .getByRole("paragraph")
    .filter({ hasText: "Solo el DM o quien lo creó" });
  await expect(motivo).toBeVisible();
  await expect(motivo).toHaveText("Solo el DM o quien lo creó puede editarlo.");

  // Medido, no solo leído: el mismo umbral que tokens-contrast.spec.ts exige para texto de
  // cuerpo (4.5:1), sobre el color realmente calculado por el navegador y no asumido.
  const { color, bg } = await effectiveTextColours(motivo);
  const ratio = contrastRatio(color, bg);
  console.log(`[no-puedes-editar] motivo de solo-lectura: ${ratio.toFixed(2)}:1 (necesita 4.5:1)`);
  expect(ratio, "motivo de solo-lectura, contraste sobre su fondo real").toBeGreaterThanOrEqual(
    4.5,
  );

  await dmContext.close();
  await playerContext.close();
});
