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

test("H3/H5 — la cabecera se queda fija al desplazar, y un paso de la traza lleva el foco a su causa", async ({
  page,
}) => {
  // **Esta prueba solo puede vivir aquí.** `jsdom` no maqueta: no hay alto, ni ventana, ni
  // `position` calculada, así que ninguna prueba de componente puede ver si la cabecera se queda
  // pegada arriba o se va con el resto del documento. Se mide el estilo **computado** y las cajas
  // reales, igual que el contraste desde 1.19 (docs/04-convenciones.md).
  await registrarse(page);
  await crearPersonajeYAbrirFicha(page, "Dania Yelmo de Hierro");
  await completarFichaDeGuerreroEnano(page);

  const cabecera = page.getByRole("region", { name: "resumen de combate" });
  await expect(cabecera).toBeVisible();

  // 1. La posición es la COMPUTADA, no la clase declarada: si un contenedor de arriba tuviera
  //    `overflow` la clase seguiría escrita y el pegado no ocurriría.
  expect(await cabecera.evaluate((el) => getComputedStyle(el).position)).toBe("sticky");

  const cabeceraAntes = (await cabecera.boundingBox())!;
  const salvaciones = page.getByText("Salvaciones", { exact: true });
  const cuerpoAntes = (await salvaciones.boundingBox())!;

  // 2. Desplazar de verdad, hasta el final **de la hoja** — que no es el final de la página.
  //
  //    Esta distinción costó una prueba roja y merece quedar escrita: **`sticky` se pega dentro
  //    de su padre**, y el padre de esta cabecera es la hoja. Debajo de la hoja siguen
  //    «Historia» y «Ajustes», que son de la página y no de ella. La primera versión de esta
  //    prueba desplazaba a `document.body.scrollHeight`, se metía en esos dos bloques y medía
  //    la cabecera en `y = -106`, o sea suelta — y estaba en lo cierto: ahí ya no tiene por qué
  //    seguir pegada. El punto 7 fija ese límite en vez de dejarlo al azar.
  const hoja = page.getByRole("region", { name: "inventario" });
  await hoja.evaluate((el) => el.scrollIntoView({ block: "end" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);

  const cabeceraDespues = (await cabecera.boundingBox())!;
  const cuerpoDespues = (await salvaciones.boundingBox())!;
  const altoVentana = await page.evaluate(() => window.innerHeight);

  // 3. El cuerpo SÍ se ha movido —si no, la prueba pasaría sin haber desplazado nada— y la
  //    cabecera se ha quedado, más arriba de donde empezó y entera dentro de la ventana.
  expect(cuerpoDespues.y).toBeLessThan(cuerpoAntes.y - 300);
  expect(cabeceraDespues.y).toBeLessThan(cabeceraAntes.y);
  expect(cabeceraDespues.y).toBeGreaterThanOrEqual(0);
  expect(cabeceraDespues.y + cabeceraDespues.height).toBeLessThanOrEqual(altoVentana);

  // 4. Y se apoya justo debajo de la cabecera de la aplicación, que también es fija: ni una se
  //    esconde detrás de la otra. Se mide con un píxel de tolerancia por el redondeo.
  const cabeceraApp = (await page.locator("header").first().boundingBox())!;
  expect(cabeceraDespues.y).toBeGreaterThanOrEqual(cabeceraApp.y + cabeceraApp.height - 1);

  // 5. Los cinco números siguen legibles con la hoja desplazada hasta el final.
  for (const rotulo of ["CA", "Iniciativa", "Velocidad (pies)", "PG", "Competencia"]) {
    await expect(cabecera.getByText(rotulo, { exact: true })).toBeInViewport();
  }

  // 7. **El límite, dicho a propósito.** Pasado el final de la hoja, la cabecera se suelta,
  //    porque «Historia» y «Ajustes» ya no son la hoja. Sin esta comprobación, el día que
  //    alguien envolviera la página entera en el contenedor pegajoso nadie se enteraría, y la
  //    cabecera de combate seguiría plantada sobre la biografía.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(async () => (await cabecera.boundingBox())!.y).toBeLessThan(0);
  // Y se vuelve a la hoja para lo que queda de prueba.
  await hoja.evaluate((el) => el.scrollIntoView({ block: "end" }));

  // 6. H5 — la traza es navegación: se despliega la CA desde la cabecera fija y el paso
  //    «Modificador de Destreza» lleva el foco a la casilla de Destreza, que es su causa.
  await cabecera.getByText("CA", { exact: true }).locator("..").getByRole("button").click();
  await page
    .getByRole("button", { name: /Modificador de Destreza/ })
    .first()
    .click();
  await expect(page.getByLabel("Destreza", { exact: true })).toBeFocused();
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
