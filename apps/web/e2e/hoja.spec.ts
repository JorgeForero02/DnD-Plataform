import { test, expect, type Page } from "@playwright/test";

// Tarea 2A.10 — la pantalla de la hoja de personaje, contra la API real (Docker + Postgres).
// Cubre lo que ninguna prueba unitaria puede: que la hoja carga con datos reales de principio a
// fin (crear personaje → completar raza/clase/características → ver los números derivados con
// su traza → tirar de verdad → cambiar PG con un delta → aplicar una condición), y que el
// contraste de lo que este task añade se sostiene en el navegador, no en la teoría de los
// tokens (docs/04-convenciones.md: "un defecto de maquetación exige una prueba de navegador").

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `hoja-${marca}@example.com`,
    password: "password123",
    displayName: `Hoja ${marca}`,
  };
}

async function registrarse(page: Page) {
  const cuenta = nuevaCuenta();
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Mis campañas" })).toBeVisible();
  return cuenta;
}

/** Crea una campaña, un personaje vacío dentro de ella, y abre su página de ficha. */
async function crearPersonajeYAbrirFicha(page: Page, nombrePersonaje: string) {
  await page.getByRole("button", { name: "Nueva campaña" }).click();
  await page.getByLabel("Nombre").fill("La hoja de 5.ª edición");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La hoja de 5.ª edición" }).click();
  await expect(page.getByRole("heading", { name: "La hoja de 5.ª edición" })).toBeVisible();

  await page.getByRole("tab", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill(nombrePersonaje);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("link", { name: new RegExp(nombrePersonaje) }).click();
  await expect(page.getByRole("heading", { name: nombrePersonaje })).toBeVisible();
}

/**
 * Completa raza, clase, nivel y las seis características **en el sitio**, sin diálogo.
 *
 * Esto era un formulario aparte que se abría con un botón. La hoja ya no tiene botones de
 * «Editar»: cada valor decidido se toca donde se lee, y el modificador aparece pegado a su
 * puntuación. Los números guardan al salir del campo; los desplegables, al elegir.
 */
async function completarFichaDeGuerreroEnano(page: Page) {
  // Los desplegables primero: sin raza y clase no hay hoja que derivar, y así el resto de la
  // pantalla ya está en su forma final cuando se teclean las características.
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
    // **Salir del campo ES el guardado.** Sin esto la petición no sale, que es exactamente la
    // regla que la pantalla implementa: teclear no escribe, terminar de teclear sí.
    await campo.blur();
  }

  // La hoja está completa cuando el catálogo ya resolvió: la CA derivada aparece.
  // La hoja está derivada cuando aparece la sección de salvaciones, que solo existe si el
  // catálogo resolvió raza y clase.
  await expect(page.getByText("Salvaciones")).toBeVisible({ timeout: 15_000 });
}

test("la hoja carga con datos reales: completar ficha, ver la traza, tirar, y cambiar PG con un delta", async ({
  page,
}) => {
  await registrarse(page);
  await crearPersonajeYAbrirFicha(page, "Borin Barbaférrea");

  // Ficha a medias: la hoja lo dice como estado normal, no como error, con la tarea de
  // completarla.
  await expect(page.getByText("La hoja de 5.ª edición está a medias")).toBeVisible();

  await completarFichaDeGuerreroEnano(page);

  // Identidad calculada, en español — nunca "dwarf" ni "fighter".
  // **El resumen en prosa ya no existe**: repetía lo que dicen los controles editables, y dos
  // sitios con el mismo dato acaban con uno de los dos mintiendo. Se comprueba en la fuente.
  await expect(page.getByLabel("Raza", { exact: true })).toHaveValue("dwarf");
  await expect(page.getByLabel("Clase", { exact: true })).toHaveValue("fighter");
  await expect(page.getByLabel("Nivel", { exact: true })).toHaveValue("1");
  const cuerpoTrasCompletar = await page.locator("body").innerText();
  expect(cuerpoTrasCompletar).not.toContain("dwarf");
  expect(cuerpoTrasCompletar).not.toContain("fighter");

  // La traza: al desplegar la CA, se ve de dónde sale el número (§4.3 de la especificación).
  const casillaCA = page.getByText("CA", { exact: true }).locator("..").getByRole("button");
  await casillaCA.click();
  // Acotado a la LISTA de la traza: desde que existe la fórmula de una línea, «Sin armadura»
  // aparece dos veces —en el resumen y en el paso— y sin acotar la aserción es ambigua.
  const listaTraza = page.getByRole("list").filter({ hasText: "Sin armadura" }).first();
  await expect(listaTraza.getByText("Sin armadura")).toBeVisible();
  await expect(listaTraza.getByText("Modificador de Destreza")).toBeVisible();

  // Tirar una salvación desde la hoja: 1d20+mod con su etiqueta, de verdad contra el servidor.
  const filaFuerza = page.getByText("Salvación de Fuerza").locator("..");
  // `exact` importa: desde que existen ventaja y desventaja (`TirarBoton.tsx`) hay tres botones
  // por fila y los tres empiezan por «Tirar Salvación de Fuerza».
  await filaFuerza.getByRole("button", { name: "Tirar Salvación de Fuerza", exact: true }).click();
  await expect(filaFuerza.getByRole("status")).toBeVisible({ timeout: 10_000 });
  await expect(filaFuerza.getByRole("status")).toContainText(/\d+ \(\d+\)/);

  // PG: un delta, no un número absoluto. Se lee el actual/máximo antes y después del clic.
  const bloquePg = page.getByText("Puntos de golpe", { exact: true }).locator("..");
  const textoPgAntes = await bloquePg.innerText();
  const [actualAntes, maximo] = textoPgAntes
    .match(/(\d+)\s*\/\s*(\d+)/)!
    .slice(1)
    .map(Number);

  await page.getByLabel("Cambio de puntos de golpe").fill("5");
  await page.getByRole("button", { name: "Recibo daño" }).click();

  await expect(bloquePg).toContainText(`${actualAntes - 5} / ${maximo}`, { timeout: 10_000 });

  // Recursos. Esta prueba nació documentando un hueco: `seedResourcesFor` (2A.8) sabía sembrar
  // dados de golpe y espacios de conjuro y **no la llamaba nadie**, así que el panel salía vacío
  // para todos los personajes. Se arregló al recogerla —`character-sheet.service.ts` la llama al
  // completar la ficha, y `level-up.service.ts` dentro de su transacción—, y la prueba pasó de
  // constatar el vacío a exigir el dado de golpe de la clase.
  await expect(page.getByText(/^Dados de golpe \(d\d+\)$/)).toBeVisible();

  // Condiciones: aplicar una y verla traducida, nunca la clave cruda del SRD.
  await page.getByLabel("Nueva condición").selectOption("prone");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(
    page.locator('section[aria-label="condiciones"] li', { hasText: "Derribado" }),
  ).toBeVisible({ timeout: 10_000 });

  // El aviso legal del SRD, en la misma pantalla que pinta sus datos (catalog/index.ts lo pide).
  await expect(page.getByText("System Reference Document 5.1", { exact: false })).toBeVisible();
});

// --- Contraste medido en el navegador (docs/04-convenciones.md: "un defecto de maquetación
// exige una prueba de navegador"; jsdom no maqueta, esto sí). Mismo patrón que
// e2e/tokens-contrast.spec.ts: colores COMPUTADOS, compuestos contra el fondo real, nunca
// asumidos por el valor declarado del token. ---

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

async function effectiveTextColours(
  locator: ReturnType<Page["locator"]>,
): Promise<{ color: RGBA; bg: RGBA }> {
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

async function borderColourAgainstBg(
  locator: ReturnType<Page["locator"]>,
): Promise<{ border: RGBA; bg: RGBA }> {
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

const resultados: string[] = [];
function record(label: string, ratio: number, umbral: number) {
  const estado = ratio >= umbral ? "PASS" : "FAIL";
  resultados.push(`${label}: ${ratio.toFixed(2)}:1 (necesita ${umbral}:1) — ${estado}`);
  expect(ratio, label).toBeGreaterThanOrEqual(umbral);
}

test("contraste medido en la hoja: traza desplegada, aviso, y chip de condición", async ({
  page,
}) => {
  await registrarse(page);
  await crearPersonajeYAbrirFicha(page, "Vex Sombraveloz");
  await completarFichaDeGuerreroEnano(page);

  // Un texto de traza (--muted sobre --surface, dentro de la casilla de CA desplegada).
  const casillaCA = page.getByText("CA", { exact: true }).locator("..").getByRole("button");
  await casillaCA.click();
  const pasoTraza = page
    .getByRole("list")
    .filter({ hasText: "Sin armadura" })
    .first()
    .getByText("Sin armadura");
  {
    const { color, bg } = await effectiveTextColours(pasoTraza);
    record("hoja: paso de traza texto", contrastRatio(color, bg), 4.5);
  }

  // El aviso de "fórmula de CA descartada" (--warning-text / --warning), en el contexto real
  // de esta pantalla (dentro de un Panel anidado, no en /design-tokens).
  await page.getByLabel("Cambio de puntos de golpe"); // espera a que la hoja termine de pintar
  const avisoBox = page.locator('section[aria-label="advertencia"] li').first();
  if (await avisoBox.isVisible().catch(() => false)) {
    const { color, bg } = await effectiveTextColours(avisoBox);
    record("hoja: aviso texto", contrastRatio(color, bg), 4.5);
    const { border, bg: borderBg } = await borderColourAgainstBg(
      page.locator('section[aria-label="advertencia"]'),
    );
    record("hoja: aviso borde", contrastRatio(border, borderBg), 3);
  }

  // El chip de condición activa (--copper-text / --copper), en su contexto real.
  await page.getByLabel("Nueva condición").selectOption("prone");
  await page.getByRole("button", { name: "Aplicar" }).click();
  const chip = page.locator('section[aria-label="condiciones"] li', { hasText: "Derribado" });
  await expect(chip).toBeVisible({ timeout: 10_000 });
  {
    const { color, bg } = await effectiveTextColours(chip);
    record("hoja: chip de condición texto", contrastRatio(color, bg), 4.5);
  }
  {
    const { border, bg } = await borderColourAgainstBg(chip);
    record("hoja: chip de condición borde", contrastRatio(border, bg), 3);
  }
});

test.afterAll(() => {
  console.log(
    "\n=== Contraste WCAG medido (hoja de personaje, 2A.10) ===\n" + resultados.join("\n") + "\n",
  );
});
