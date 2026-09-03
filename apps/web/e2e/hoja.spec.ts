import { test, expect, type Page } from "@playwright/test";

// Tarea 2A.10 — la pantalla de la hoja de personaje, contra la API real (Docker + Postgres).
// Cubre lo que ninguna prueba unitaria puede: que la hoja carga con datos reales de principio a
// fin (crear personaje → completar raza/clase/características → ver los números derivados con
// su traza → tirar de verdad → cambiar PG con un delta → aplicar una condición), y que el
// contraste de lo que este task añade se sostiene en el navegador, no en la teoría de los
// tokens (docs/04-convenciones.md: "un defecto de maquetación exige una prueba de navegador").

/**
 * La cifra derivada de la casilla de Destreza. Se señala por `data-derivado` y no por su texto:
 * el texto es «+1» y hay más de un «+1» en la hoja, y no por su papel accesible, porque desde la
 * adopción de la maqueta el modificador **no es un botón** — es la cifra grande de la casilla.
 */
const SELECTOR_MODIFICADOR_DES = '[data-derivado="abilityMod.dex"]';

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `hoja-${marca}@example.com`,
    password: "password123",
    displayName: `Hoja ${marca}`,
  };
}

/**
 * Fija el tema como lo haría una persona que ya eligió: escribiendo la MISMA clave de
 * `localStorage` que leen `ui/theme.ts` e `index.html`, y por un guion de inicio, porque este
 * recorrido cruza varias navegaciones —registro, campaña, personaje— y el tema tiene que
 * sobrevivir a todas igual que le sobreviviría a un visitante real. Mismo patrón que
 * `setStoredTheme` en `e2e/tokens-contrast.spec.ts`.
 */
async function fijarTema(page: Page, tema: "dark" | "light") {
  await page.addInitScript((t) => localStorage.setItem("dnd-theme", t), tema);
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

  // La hoja está derivada cuando aparece la sección de salvaciones, que solo existe si el
  // catálogo resolvió raza y clase.
  //
  // **`exact` importa desde que la maqueta trajo la tarjeta «Salvaciones de muerte»**: sin él,
  // `getByText("Salvaciones")` casa con las dos y `toBeVisible` falla por modo estricto — un
  // fallo que no dice nada del código y cuesta media hora de leer trazas.
  await expect(page.getByText("Salvaciones", { exact: true })).toBeVisible({ timeout: 15_000 });
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
  //
  // **Dos pasos desde la adopción de la maqueta**, y son los mismos que da una persona: la fila
  // lleva un dado, el dado abre el panel, y en el panel se decide y se tira. La fila ya no
  // repite «Salvación de Fuerza»: dentro de la tarjeta de salvaciones se llama «Fuerza», que es
  // lo que la maqueta pone y lo que cabe en una línea.
  const salvaciones = page.getByRole("region", { name: "salvaciones" });
  const filaFuerza = salvaciones.locator('[data-fila="valor"]').first();
  await expect(filaFuerza).toContainText("Fuerza");
  await filaFuerza.getByRole("button", { name: "Tirada de Salvación de Fuerza" }).click();

  // **Las tres opciones, visibles a la vez y con su frase**, que es la regla vinculante: aquí es
  // donde se cumple ahora —en el momento de decidir— en vez de veinticuatro veces en la hoja.
  for (const opcion of ["Normal", "Ventaja", "Desventaja"]) {
    await expect(filaFuerza.getByRole("radio", { name: opcion, exact: true })).toBeVisible();
  }
  await expect(filaFuerza.getByText("Dos d20: se queda el alto.")).toBeVisible();

  await filaFuerza.getByRole("button", { name: "Tirar Salvación de Fuerza" }).click();
  await expect(filaFuerza.getByRole("status")).toBeVisible({ timeout: 10_000 });
  // El formato cambió con F3: era «20 (8, 17)» —un número y una lista que no decía cuál se
  // quedó— y ahora es la suma desglosada, igual que hace la hoja con sus valores derivados.
  await expect(filaFuerza.getByRole("status")).toContainText(/\d+ = \d+ dado/);

  // PG: un delta, no un número absoluto. Se lee el actual/máximo antes y después del clic.
  const bloquePg = page.getByRole("region", { name: "puntos de golpe" });
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

  // 5. Los cinco números siguen legibles con la hoja desplazada hasta el final. Los rótulos van
  //    abreviados desde que la cabecera es la **tira compacta** de la maqueta; el nombre entero
  //    viaja en un `sr-only` hermano, y de eso se ocupa la prueba de componente.
  for (const rotulo of ["CA", "Inic.", "Vel. (pies)", "PG", "Comp."]) {
    await expect(cabecera.getByText(rotulo, { exact: true })).toBeInViewport();
  }

  // 5b. **Y la tira es una tira: las cinco casillas en la MISMA fila.** Es la afirmación central
  //     de lo que se adoptó de la maqueta, y jsdom no puede verla porque no maqueta. Antes eran
  //     cinco tarjetas en una rejilla de dos o tres columnas según el ancho, y en un portátil
  //     ocupaban tres filas de la cabecera fija — que es la parte de la pantalla que no se
  //     recupera nunca. Se comparan las `y` REALES, no las clases declaradas.
  const casillas = await cabecera
    .locator("> div > div")
    .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
  expect(casillas.length).toBe(5);
  expect(Math.max(...casillas) - Math.min(...casillas)).toBeLessThanOrEqual(2);
  // Y la cabecera entera cabe en lo que ocupaba antes una sola de sus tarjetas con fórmula.
  expect(cabeceraDespues.height).toBeLessThanOrEqual(96);

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

// --- La hoja, medida en los dos temas ---
//
// **Esta prueba nació como «la vitela, medida» (tarea H4) y sigue midiendo lo mismo con otra
// piel.** El cuerpo de la hoja dejó de ser papel el 2026-09-03 —la maqueta es toda cromado, y el
// autor la prefiere—, así que lo que hay debajo de estos textos ya no es `--vellum` sino la
// superficie de las tarjetas. **No se ha borrado ni un par**: se han vuelto a medir todos sobre
// el fondo nuevo, que es exactamente el momento en el que un contraste se cae sin que nadie
// mire. La afirmación de la costura entre dos pieles ya no existe, y en su sitio se mide la que
// sí existe ahora: que una tarjeta se levanta del fondo de la página.
//
// **El fondo se compone contra el primer ancestro OPACO, nunca contra `document.body`.** Aquí eso
// no es un detalle: el `body` de esta aplicación es transparente y quien pinta el fondo es un
// `div` de `AppShell`, así que medir contra el `body` daría un blanco inventado y cualquier color
// pasaría. Lo hace `effectiveTextColours`, subiendo por el árbol.
//
// Lo que NO puede ver esta prueba, dicho a propósito: los dos degradados del papel
// (`--vellum-laid`, `--vellum-vignette`) son imágenes de fondo, no colores, y `resolveBackground`
// compone COLORES. Por eso están capados al 5 % en `ui/tokens.css`, con el peor caso calculado a
// mano allí — 4,94:1 en oscuro y 4,71:1 en claro. Es un hueco conocido, no un descuido.

for (const tema of ["dark", "light"] as const) {
  test(`contraste medido en la hoja (${tema})`, async ({ page }) => {
    await fijarTema(page, tema);
    await registrarse(page);
    await crearPersonajeYAbrirFicha(page, "Vex Sombraveloz");
    await expect(page.locator("html")).toHaveAttribute("data-theme", tema);
    await completarFichaDeGuerreroEnano(page);

    const hoja = page.locator('[data-piel="cromado"]');
    await expect(hoja).toBeVisible();

    // --- **La tarjeta se levanta del fondo.** Es lo que sustituye a la costura entre las dos
    //     pieles: la hoja es ahora una rejilla de tarjetas, y una tarjeta que pinte exactamente
    //     el fondo de la página deja de ser una tarjeta — se convierte en la banda con un filete
    //     de la que se venía. Si alguien la devuelve a `bg-bg`, esto se pone rojo aunque todos
    //     los contrastes de abajo sigan pasando.
    const cabecera = page.getByRole("region", { name: "resumen de combate" });
    const tarjeta = page.getByRole("region", { name: "salvaciones" });
    const fondoTarjeta = (await effectiveTextColours(tarjeta.getByText("Salvaciones"))).bg;
    const fondoPagina = (await effectiveTextColours(hoja)).bg;
    const distancia =
      Math.abs(fondoTarjeta.r - fondoPagina.r) +
      Math.abs(fondoTarjeta.g - fondoPagina.g) +
      Math.abs(fondoTarjeta.b - fondoPagina.b);
    resultados.push(
      `[${tema}] tarjeta sobre la página: distancia de fondo ${distancia.toFixed(1)} ` +
        `(tarjeta rgb(${fondoTarjeta.r},${fondoTarjeta.g},${fondoTarjeta.b}), ` +
        `página rgb(${fondoPagina.r},${fondoPagina.g},${fondoPagina.b}))`,
    );
    expect(
      distancia,
      "una tarjeta y el fondo de la página no pueden ser el mismo color",
    ).toBeGreaterThan(12);

    // --- El rótulo de una tarjeta y el filete de su cabecera: es lo que separa una sección de
    //     la siguiente, así que tiene que leerse Y verse.
    {
      const { color, bg } = await effectiveTextColours(tarjeta.getByText("Salvaciones"));
      record(`[${tema}] hoja: rótulo de tarjeta`, contrastRatio(color, bg), 4.5);
    }
    {
      // **El filete se mide en el elemento que lo pinta**, que es la cabecera de la tarjeta y no
      // su rótulo: un `<h3>` sin borde declarado devuelve igualmente un `borderTopColor` —el
      // color del texto— y la medición saldría alta midiendo algo que no se ve. Ya pasó una vez
      // con el filete entre filas (docs/08-pruebas.md).
      const { border, bg } = await borderColourAgainstBg(tarjeta.locator("header"));
      record(`[${tema}] hoja: filete de la cabecera de una tarjeta`, contrastRatio(border, bg), 3);
    }

    // --- La fila de una salvación: la etiqueta que se lee y la fórmula, que desde la adopción
    //     de la maqueta **sale al desplegar la traza** en vez de ocupar un renglón en cada una de
    //     las veinticuatro filas. Va en `--muted`, el par más ajustado de la hoja en oscuro.
    const filaFuerza = tarjeta.locator('[data-fila="valor"]').first();
    {
      const { color, bg } = await effectiveTextColours(filaFuerza.getByText("Fuerza"));
      record(`[${tema}] hoja: etiqueta de una fila`, contrastRatio(color, bg), 4.5);
    }
    {
      await filaFuerza.getByRole("button", { name: /^Fuerza: / }).click();
      const formula = filaFuerza.locator("p").first();
      await expect(formula).toBeVisible();
      const { color, bg } = await effectiveTextColours(formula);
      record(`[${tema}] hoja: fórmula de una línea`, contrastRatio(color, bg), 4.5);
      await filaFuerza.getByRole("button", { name: /^Fuerza: / }).click();
    }

    // --- Una casilla de característica: su filete de cobre, su rótulo en versalitas y la cifra
    //     que se teclea dentro.
    const casillaDestreza = page.getByLabel("Destreza", { exact: true }).locator("../..");
    {
      const { border, bg } = await borderColourAgainstBg(casillaDestreza);
      record(`[${tema}] hoja: filete de una casilla`, contrastRatio(border, bg), 3);
    }
    {
      // El rótulo de la casilla pasó de la abreviatura al nombre entero, que es lo que hace la
      // maqueta: en una casilla que ya no mete dos cifras grandes, la abreviatura solo ahorraba
      // caracteres a cambio de que hubiera que sabérselas.
      const { color, bg } = await effectiveTextColours(
        casillaDestreza.getByText("Destreza", { exact: true }),
      );
      record(`[${tema}] hoja: rótulo en versalitas`, contrastRatio(color, bg), 4.5);
    }
    {
      const { color, bg } = await effectiveTextColours(
        page.getByLabel("Destreza", { exact: true }),
      );
      record(`[${tema}] hoja: cifra editable`, contrastRatio(color, bg), 4.5);
    }

    // --- Un paso de la traza desplegada (2A.10 ya lo medía; ahora sobre papel, no sobre cromado).
    const casillaCA = page.getByText("CA", { exact: true }).locator("..").getByRole("button");
    await casillaCA.click();
    {
      const paso = page
        .getByRole("list")
        .filter({ hasText: "Sin armadura" })
        .first()
        .getByText("Sin armadura");
      const { color, bg } = await effectiveTextColours(paso);
      record(`[${tema}] hoja: paso de traza`, contrastRatio(color, bg), 4.5);
    }

    // --- Lo que trajo la maqueta, medido en su sitio. Son tokens ya conocidos, pero en
    //     contextos nuevos: el rótulo de columna de una tabla no tiene detrás el mismo fondo que
    //     el rótulo de una casilla, y medir el token en abstracto es exactamente lo que la
    //     prueba de contraste dejó de hacer en 1.19.
    {
      const cabeceraTabla = page
        .getByRole("region", { name: "ataques y lanzamiento" })
        .getByRole("columnheader", { name: "Bonif." });
      const { color, bg } = await effectiveTextColours(cabeceraTabla);
      record(
        `[${tema}] hoja: rótulo de columna de la tabla de ataques`,
        contrastRatio(color, bg),
        4.5,
      );
    }
    {
      // El aviso de la vista de DM va en `--copper-text`, que es el par más ajustado de toda
      // la hoja en el tema claro.
      const aviso = page.getByRole("region", { name: "vista de DM" }).locator("p").first();
      const { color, bg } = await effectiveTextColours(aviso);
      record(`[${tema}] hoja: aviso de la vista de DM`, contrastRatio(color, bg), 4.5);
      const { border, bg: fondo } = await borderColourAgainstBg(
        page.getByRole("region", { name: "vista de DM" }),
      );
      record(`[${tema}] hoja: filete del aviso de DM`, contrastRatio(border, fondo), 3);
    }
    {
      // La cifra de una tarjeta pequeña: la percepción pasiva, que es el número que el DM
      // pregunta sin avisar y ahora se lee a tamaño grande sobre el papel.
      const pasiva = page.locator('[data-tarjeta="percepcion-pasiva"]').locator("p").nth(1);
      const { color, bg } = await effectiveTextColours(pasiva);
      record(`[${tema}] hoja: cifra de una tarjeta pequeña`, contrastRatio(color, bg), 4.5);
    }

    // --- El hueco del inventario: su prosa va en `--muted` y es el bloque de texto más largo
    //     de toda la hoja.
    {
      const { color, bg } = await effectiveTextColours(
        page.getByText("Llega en la fase 2B", { exact: false }),
      );
      record(`[${tema}] hoja: prosa del hueco de inventario`, contrastRatio(color, bg), 4.5);
    }

    // --- El aviso (--warning-text) en su contexto real, si la hoja lo trae.
    const avisoBox = page.locator('section[aria-label="advertencia"] li').first();
    if (await avisoBox.isVisible().catch(() => false)) {
      const { color, bg } = await effectiveTextColours(avisoBox);
      record(`[${tema}] hoja: aviso texto`, contrastRatio(color, bg), 4.5);
      const { border, bg: borderBg } = await borderColourAgainstBg(
        page.locator('section[aria-label="advertencia"]'),
      );
      record(`[${tema}] hoja: aviso borde`, contrastRatio(border, borderBg), 3);
    }

    // --- El chip de una condición activa, con su filete.
    await page.getByLabel("Nueva condición").selectOption("prone");
    await page.getByRole("button", { name: "Aplicar" }).click();
    const chip = page.locator('section[aria-label="condiciones"] li', { hasText: "Derribado" });
    await expect(chip).toBeVisible({ timeout: 10_000 });
    {
      const { color, bg } = await effectiveTextColours(chip);
      record(`[${tema}] hoja: chip de condición texto`, contrastRatio(color, bg), 4.5);
    }
    {
      const { border, bg } = await borderColourAgainstBg(chip);
      record(`[${tema}] hoja: chip de condición borde`, contrastRatio(border, bg), 3);
    }

    // --- Y la tira fija, en la misma corrida: sus rótulos van sobre `--surface` dentro de una
    //     banda con `--chrome-veil` translúcido detrás, que es un fondo compuesto y no un token.
    {
      const { color, bg } = await effectiveTextColours(cabecera.getByText("PG", { exact: true }));
      record(`[${tema}] cromado: rótulo de la cabecera fija`, contrastRatio(color, bg), 4.5);
    }
  });
}

test("la afordancia sobrevive al rediseño: lo editable lleva subrayado y lo derivado no", async ({
  page,
}) => {
  // **La afordancia es información de dominio** (docs/04-convenciones.md): un valor editable
  // lleva un subrayado tenue, y **la ausencia de subrayado en un valor derivado significa "esto
  // lo calculo yo, edita su causa"**. Un cambio de piel —el de H4 hacia la vitela, y el de
  // 2026-09-03 de vuelta al cromado de la maqueta— es exactamente el momento en que esa
  // diferencia se pierde sin que nadie se entere, porque nada de lo que la sostiene tiene texto:
  // es un borde de un píxel, y `jsdom` no tiene bordes.
  //
  // Se miden los DOS lados del par en la misma casilla —puntuación y modificador de Destreza,
  // que están pegados a propósito— porque comprobar solo uno pasaría en verde si el otro también
  // cambiara.
  await registrarse(page);
  await crearPersonajeYAbrirFicha(page, "Sela Manoquieta");
  await completarFichaDeGuerreroEnano(page);

  const puntuacion = page.getByLabel("Destreza", { exact: true });
  const editable = await puntuacion.evaluate((el) => {
    const s = getComputedStyle(el);
    return { ancho: parseFloat(s.borderBottomWidth), estilo: s.borderBottomStyle };
  });
  expect(editable.ancho, "la puntuación es editable: tiene que llevar subrayado").toBeGreaterThan(
    0,
  );
  expect(editable.estilo).toBe("dashed");

  // El modificador es el valor DERIVADO que vive pegado a esa misma puntuación. Desde la
  // adopción de la maqueta es la cifra **grande** de la casilla y ya no es un botón, así que se
  // señala por lo que es —`data-derivado`— y no por su papel accesible.
  const modificador = page.locator(SELECTOR_MODIFICADOR_DES);
  await expect(modificador).toBeVisible();
  const derivado = await modificador.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      ancho: parseFloat(s.borderBottomWidth),
      decoracion: s.textDecorationLine,
      tamano: parseFloat(s.fontSize),
    };
  });
  expect(derivado.ancho, "un valor derivado NO lleva afordancia de edición").toBe(0);
  expect(derivado.decoracion).toBe("none");

  // **Y la vuelta que da la maqueta, medida.** El modificador es lo que se usa en cada tirada,
  // así que va grande; la puntuación es su causa, así que va pequeña — y es la pequeña la que
  // lleva el subrayado. Ese cruce —lo grande no se toca, lo pequeño sí— es justo lo que puede
  // salir mal sin que nadie lo note: las dos aserciones de arriba seguirían pasando si el
  // modificador volviera al tamaño de la puntuación.
  const tamanoPuntuacion = await puntuacion.evaluate((el) =>
    parseFloat(getComputedStyle(el).fontSize),
  );
  expect(
    derivado.tamano,
    "el modificador tiene que leerse más grande que la puntuación",
  ).toBeGreaterThan(tamanoPuntuacion * 1.4);

  // Y el orden en pantalla: el modificador ARRIBA, la puntuación debajo.
  const cajaMod = (await modificador.boundingBox())!;
  const cajaPuntuacion = (await puntuacion.boundingBox())!;
  expect(cajaMod.y).toBeLessThan(cajaPuntuacion.y);
});

test("la maqueta adoptada: la tabla de ataques cabe, y la página no se desplaza a lo ancho", async ({
  page,
}) => {
  // **Un defecto de maquetación exige una prueba de navegador** (docs/04-convenciones.md). La
  // tabla de ataques es lo único de esta hoja con un ancho mínimo declarado, y una tabla que se
  // sale arrastra la página entera en horizontal — el fallo clásico de meter una rejilla ancha
  // en una columna estrecha. Se comprueba que quien desborda es **el contenedor de la tabla**,
  // que para eso lleva `overflow-x: auto`, y nunca el documento.
  await registrarse(page);
  await crearPersonajeYAbrirFicha(page, "Kera Puñoquieto");
  await completarFichaDeGuerreroEnano(page);

  const tabla = page.getByRole("region", { name: "ataques y lanzamiento" }).getByRole("table");
  await expect(tabla).toBeVisible();
  // Una fila por bonificador de ataque derivado: un guerrero no lanza, así que son dos.
  await expect(tabla.getByRole("rowheader", { name: "Cuerpo a cuerpo" })).toBeVisible();
  await expect(tabla.getByRole("rowheader", { name: "A distancia" })).toBeVisible();

  // El contenedor de la tabla desplaza lo suyo…
  const contenedor = tabla.locator("..");
  expect(await contenedor.evaluate((el) => getComputedStyle(el).overflowX)).toBe("auto");

  // …y el documento NO se desplaza en horizontal, con la ventana estrecha de un portátil.
  await page.setViewportSize({ width: 1024, height: 768 });
  const desbordaLaPagina = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(desbordaLaPagina, "la página no puede desplazarse en horizontal").toBe(false);
});

test("la maqueta adoptada: una habilidad es UNA línea, y las veinticuatro caben", async ({
  page,
}) => {
  // **El defecto que el autor señaló, medido.** Cada salvación y cada habilidad ocupaba un bloque
  // de tres renglones —tres radios de ventaja, la frase «Un solo d20.» y un botón «Tirar»—, y con
  // seis salvaciones y dieciocho habilidades eso eran veinticuatro bloques y una pantalla
  // interminable. `jsdom` no puede ver esto: no hay alto, no hay maquetación, y toda la suite
  // unitaria seguía en verde con la hoja así.
  await registrarse(page);
  await crearPersonajeYAbrirFicha(page, "Nima Pasoleve");
  await completarFichaDeGuerreroEnano(page);

  const habilidades = page.getByRole("region", { name: "habilidades" });
  const filas = habilidades.locator('[data-fila="valor"]');
  await expect(filas).toHaveCount(18);

  // 1. Una fila es una línea de texto, no un bloque. El umbral es generoso a propósito —una
  //    línea de 13 px con su `gap` mide unos 22— pero cierra la puerta a que vuelva a crecer:
  //    los bloques de antes pasaban de 70 px.
  const altos = await filas.evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect().height),
  );
  expect(Math.max(...altos), "una fila de habilidad tiene que caber en una línea").toBeLessThan(34);

  // 2. Y la tarjeta entera de las dieciocho cabe en menos de lo que ocupaban tres de las de
  //    antes. Se mide la tarjeta, no la suma de las filas, para que un relleno enorme tampoco
  //    cuele.
  const alto = (await habilidades.boundingBox())!.height;
  expect(alto, "las dieciocho habilidades tienen que caber en una pantalla").toBeLessThan(560);

  // 3. **Nada de radios en la hoja.** Es la mitad que hace que lo de arriba no sea un truco: si
  //    alguien devolviera el selector de ventaja a la fila, los altos crecerían… o no, si lo
  //    metiera en un desplegable — que es lo que la regla vinculante prohíbe. Aquí se afirma que
  //    no hay ni una cosa ni la otra con la hoja en reposo.
  await expect(page.locator('[data-fila="valor"] input[type="radio"]')).toHaveCount(0);
  await expect(page.locator('[data-fila="valor"] select')).toHaveCount(0);
});

test("el panel de tirada: la decisión aparece donde se toma, con sus tres frases y sin atrapar el teclado", async ({
  page,
}) => {
  // La regla vinculante dice que una opción con significado va **visible, con la frase que
  // explica qué hace**. Lo que cambió el 2026-09-03 no es la regla: es dónde se cumple. Aquí se
  // comprueba entera —las tres opciones y las tres frases a la vez— y además que el panel se
  // comporta como un panel: entra el foco, sale con Escape, y vuelve al dado que lo abrió.
  await registrarse(page);
  await crearPersonajeYAbrirFicha(page, "Tao Ojoquieto");
  await completarFichaDeGuerreroEnano(page);

  const habilidades = page.getByRole("region", { name: "habilidades" });
  const filaSigilo = habilidades.locator('[data-fila="valor"]').filter({ hasText: "Sigilo" });
  const dado = filaSigilo.getByRole("button", { name: "Tirada de Sigilo" });
  await dado.click();

  const panel = page.getByRole("group", { name: "Tirada de Sigilo" });
  await expect(panel).toBeVisible();
  for (const [opcion, frase] of [
    ["Normal", "Un solo d20."],
    ["Ventaja", "Dos d20: se queda el alto."],
    ["Desventaja", "Dos d20: se queda el bajo."],
  ] as const) {
    await expect(panel.getByRole("radio", { name: opcion, exact: true })).toBeVisible();
    // **`toBeVisible` no basta, y esto lo destapó una mutación**: un `sr-only` mide 1×1 px con
    // `clip`, sigue contando como visible para Playwright, y esconder ahí las tres frases —que es
    // exactamente lo que la regla vinculante prohíbe— pasaba en verde. Se mide la caja: una
    // frase que se lee ocupa un renglón entero, no un píxel.
    const caja = (await panel.getByText(frase).boundingBox())!;
    expect(caja.width, `la frase de «${opcion}» tiene que leerse, no esconderse`).toBeGreaterThan(
      40,
    );
    expect(caja.height).toBeGreaterThan(8);
  }

  // Y el panel se ve entero: un panel recortado por su tarjeta sería peor que no tenerlo, y es
  // justo lo que pasa si alguien le pone `overflow-hidden` a la tarjeta que lo contiene.
  const cajaPanel = (await panel.boundingBox())!;
  const cajaTarjeta = (await habilidades.boundingBox())!;
  expect(cajaPanel.x + cajaPanel.width).toBeLessThanOrEqual(
    (await page.evaluate(() => window.innerWidth)) + 1,
  );
  expect(cajaPanel.y + cajaPanel.height).toBeGreaterThan(cajaTarjeta.y);

  // Escape lo cierra y el foco vuelve al dado. Sin esto, quien llega con el teclado abre el
  // panel y se queda dentro de una fila sin salida.
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(dado).toBeFocused();
});

// **La fotografía de la hoja, para poder mirarla al lado del prototipo.** No es una prueba: no
// afirma nada, solo retrata. Se salta salvo que se le diga dónde dejar el fichero, para que no
// alargue la suite ni deje capturas sueltas en cada corrida de CI:
//
//     SALIDA_CAPTURAS=<carpeta> pnpm --filter @dnd/web exec playwright test e2e/hoja.spec.ts \
//       --grep captura
//
// Existe aquí, y no en `capturas-comparacion.spec.ts`, porque aquel guion recorre la aplicación
// entera y se cae por cosas ajenas a esta pantalla — el día que se escribió esto, por un enlace
// «Mis campañas» duplicado en la cabecera. Retratar la hoja no puede depender de eso.
test("captura: la hoja de personaje, para comparar con el prototipo", async ({ page }) => {
  test.skip(!process.env.SALIDA_CAPTURAS, "se corre a mano, con SALIDA_CAPTURAS puesto");
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 1200 });
  // El prototipo va en oscuro; sin forzarlo aquí se compararía nuestra piel de lectura con su
  // piel oscura y la conclusión sería sobre el fotógrafo, no sobre la pantalla.
  await fijarTema(page, "dark");
  await registrarse(page);
  await crearPersonajeYAbrirFicha(page, "Corvin Vhael");
  await completarFichaDeGuerreroEnano(page);
  await page.screenshot({
    path: `${process.env.SALIDA_CAPTURAS}/hoja-oscuro.png`,
    fullPage: true,
  });
});

test.afterAll(() => {
  console.log(
    "\n=== Contraste WCAG medido (hoja de personaje) ===\n" + resultados.join("\n") + "\n",
  );
});
