import { test, expect, type Locator, type Page } from "@playwright/test";

// Reseño 2026-09-03 — la página de lectura de una ficha del mundo.
//
// Tres cosas que **solo** se pueden comprobar en un navegador, y ninguna de las tres la ve una
// prueba unitaria:
//
//  1. **La frase de un enlace leída por sus dos lados contra la API real.** Que «Corvin vive en
//     la Torre Gris» se guarde una vez, desde Corvin, y que al abrir la Torre Gris se lea «la
//     Torre Gris es el hogar de Corvin» depende de que el servidor devuelva el retroenlace con
//     `direction: "INCOMING"` y de que la tabla de `relaciones.ts` lo invierta con el sujeto
//     correcto. Con espías, las dos mitades se simulan y no se prueba ninguna.
//  2. **La maquetación de la hoja.** `jsdom` no maqueta: no hay flotante, ni altura, ni medida.
//     La capitular, la separación entre párrafos y el ancho de la columna de texto son
//     exactamente la clase de defecto que ya se coló una vez con toda la suite en verde (el
//     borde partido de las filas, 2026-09-02).
//  3. **El contraste, medido y compuesto**, en los dos temas. Se compone contra el primer
//     ancestro OPACO, no contra `document.body`: `body` es transparente y medir contra él da un
//     resultado falso.

function nuevaCuenta(prefijo = "DM") {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `e2e-${marca}@example.com`,
    password: "password123",
    displayName: `${prefijo} ${marca}`,
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

const CUERPO = [
  "Al llegar al puerto de Sarnath, lo primero es el olor: brea caliente, sal, y por debajo,",
  "algo dulzón que nadie nombra.",
  "",
  "Hay siempre luz en la Sirena Ahogada, y siempre alguien dispuesto a contarte lo que viste.",
].join("\n");

/** Una campaña con un lugar, un PNJ con cuerpo, y el enlace «vive en» entre los dos. */
async function mundoConUnEnlace(page: Page, nombreCampana: string) {
  await registrarse(page);
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill(nombreCampana);
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: nombreCampana }).click();
  await expect(page.getByRole("heading", { name: nombreCampana })).toBeVisible();

  await page.getByRole("tab", { name: "Lugares" }).click();
  await page.getByRole("button", { name: "Nuevo lugar" }).click();
  await page.getByLabel("Nombre").fill("La Torre Gris");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("tab", { name: "PNJ" }).click();
  await page.getByRole("button", { name: "Nuevo PNJ" }).click();
  await page.getByLabel("Nombre").fill("Corvin Vhael");
  await page.getByLabel("Etiquetas (separadas por coma)").fill("puerto");
  await page.getByLabel("Texto").fill(CUERPO);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("link", { name: /Corvin Vhael/ }).click();
  await expect(page.getByRole("heading", { name: "Corvin Vhael" })).toBeVisible();

  const panel = page
    .locator("section")
    .filter({ has: page.locator("> h3", { hasText: "Enlaces" }) });
  await panel.getByLabel("Entidad destino").selectOption({ label: "La Torre Gris (Lugar)" });
  await panel.getByRole("button", { name: "vive en" }).click();
  await panel.getByRole("button", { name: "Añadir enlace" }).click();
  return panel;
}

test("un enlace se lee como una frase por sus dos lados, y lleva al vecino", async ({ page }) => {
  const panel = await mundoConUnEnlace(page, "Las Mareas de Sarnath");

  // Desde Corvin: la frase la escribió él, así que se lee al derecho.
  const saliente = panel.locator("article").filter({ hasText: "La Torre Gris" });
  await expect(saliente).toContainText("Corvin Vhael");
  await expect(saliente).toContainText("vive en");
  await expect(saliente).toContainText("Lugar");
  // Nunca la clave del enumerado.
  await expect(saliente).not.toContainText("LOCATION");

  // Y el vecino se abre desde aquí: el nombre ES el enlace.
  await saliente.getByRole("link", { name: "La Torre Gris" }).click();
  await expect(page.getByRole("heading", { name: "La Torre Gris" })).toBeVisible();

  // Desde la Torre Gris: el mismo registro, leído al revés. «Corvin vive en» dicho desde aquí
  // diría que la Torre vive en Corvin; el sujeto de la frase sigue siendo la ficha abierta.
  const entrante = page
    .locator("section")
    .filter({ has: page.locator("> h3", { hasText: "Enlaces" }) })
    .locator("article")
    .filter({ hasText: "Corvin Vhael" });
  await expect(entrante).toContainText("La Torre Gris");
  await expect(entrante).toContainText("es el hogar de");
  await expect(entrante).not.toContainText("vive en");
  await expect(entrante).toContainText("PNJ");
});

test("la hoja de lectura: capitular, párrafos separados y medida corta", async ({ page }) => {
  await mundoConUnEnlace(page, "El Puerto de Sarnath");

  const parrafos = page.locator('[data-tone="vellum"] p');
  await expect(parrafos).toHaveCount(2);

  // La capitular. Ninguna prueba unitaria puede verla: `::first-letter` no existe en jsdom.
  const capitular = await parrafos.first().evaluate((el) => {
    const cs = getComputedStyle(el, "::first-letter");
    return { float: cs.float, fontSize: parseFloat(cs.fontSize), color: cs.color };
  });
  const cuerpo = await parrafos.first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(capitular.float).toBe("left");
  // Tres veces el cuerpo, no un poco más grande: una capitular tímida es un error tipográfico.
  expect(capitular.fontSize).toBeGreaterThan(cuerpo * 2.5);

  // Dos párrafos seguidos tienen que estar separados. Antes no lo estaban: el `space-y-2` de
  // `Markdown.tsx` cae sobre el `Panel`, cuyo único hijo es el relleno del borde, así que la
  // regla nunca llegaba a los párrafos. Quita `[&_p+p]:mt-s3` de EntityDetailPage y esto falla.
  const hueco = await parrafos.nth(1).evaluate((el) => {
    const previo = el.previousElementSibling as HTMLElement;
    return el.getBoundingClientRect().top - previo.getBoundingClientRect().bottom;
  });
  expect(hueco).toBeGreaterThan(6);

  // La medida. Un párrafo de vitela nunca se estira a lo ancho del monitor.
  const anchoTexto = await parrafos.first().evaluate((el) => el.getBoundingClientRect().width);
  const anchoEme = await parrafos.first().evaluate((el) => {
    const s = document.createElement("span");
    s.textContent = "0";
    s.style.font = getComputedStyle(el).font;
    el.appendChild(s);
    const w = s.getBoundingClientRect().width;
    s.remove();
    return w;
  });
  expect(anchoTexto / anchoEme).toBeLessThanOrEqual(66);

  // Reseño 2026-09-03 — **la medida es del párrafo, no del papel.** Antes la hoja heredaba el
  // `max-w-[66ch]` del `Panel` y se quedaba en 537 px dentro de una columna de 1014: un recorte
  // pardo flotando en el vacío. Ahora la hoja llena su columna y el tope de 66 caracteres lo
  // lleva el renglón — que es de lo que habla la regla tipográfica. Las dos cosas se miden aquí
  // porque `jsdom` no tiene anchos: la comprobación de arriba ya exige la medida corta; ésta
  // exige que el papel sea claramente más ancho que ella, o volveríamos al recorte.
  const hoja = page.locator('[data-tone="vellum"]');
  const cajaHoja = (await hoja.boundingBox())!;
  const cajaColumna = (await page.locator("[data-cuerpo-del-mundo]").boundingBox())!;
  expect(cajaHoja.width).toBeGreaterThan(anchoTexto + 40);
  expect(cajaHoja.width).toBeGreaterThan(cajaColumna.width - 4);

  const filete = await hoja.evaluate((el) => {
    const cs = getComputedStyle(el as HTMLElement);
    return { ancho: parseFloat(cs.borderTopWidth), color: cs.borderTopColor };
  });
  expect(filete.ancho).toBeGreaterThan(0);
  // Cobre, no gris: lo que se lee pertenece al mundo. Si la clase no compilara, Tailwind dejaría
  // el `#e5e7eb` del preflight — el fallo de las 49 utilidades de opacidad, dicho en un color.
  expect(filete.color).not.toBe("rgb(229, 231, 235)");

  // Alarma de maquetación, la misma que cazó el borde partido: una tarjeta de enlace en línea
  // dibuja su borde a trozos. Tiene que ser de bloque.
  const tarjeta = page.locator("aside article").first();
  expect(await tarjeta.evaluate((el) => getComputedStyle(el).display)).not.toBe("inline");
});

// El mismo método que `tokens-contrast.spec.ts`: se compone el alfa contra el primer ancestro
// OPACO. Medir contra `document.body` da un resultado falso porque `body` es transparente.
async function contraste(objetivo: Locator, propiedad: "color" | "borderTopColor" = "color") {
  return objetivo.evaluate((el, prop) => {
    const parse = (c: string) => {
      const m = (c.match(/[\d.]+/g) ?? ["0", "0", "0"]).map(Number);
      return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 };
    };
    const fondo = (nodo: Element | null) => {
      const capas: { r: number; g: number; b: number; a: number }[] = [];
      let n: Element | null = nodo;
      while (n) {
        const bg = parse(getComputedStyle(n).backgroundColor);
        if (bg.a > 0) capas.unshift(bg);
        if (bg.a === 1) break;
        n = n.parentElement;
      }
      return capas.reduce(
        (acc, c) => ({
          r: c.r * c.a + acc.r * (1 - c.a),
          g: c.g * c.a + acc.g * (1 - c.a),
          b: c.b * c.a + acc.b * (1 - c.a),
        }),
        { r: 255, g: 255, b: 255 },
      );
    };
    const lum = (c: { r: number; g: number; b: number }) => {
      const f = (v: number) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const bg = fondo(prop === "color" ? el : el.parentElement);
    const crudo = parse(getComputedStyle(el)[prop as "color"]);
    const fg = {
      r: crudo.r * crudo.a + bg.r * (1 - crudo.a),
      g: crudo.g * crudo.a + bg.g * (1 - crudo.a),
      b: crudo.b * crudo.a + bg.b * (1 - crudo.a),
    };
    const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
    return (hi + 0.05) / (lo + 0.05);
  }, propiedad);
}

for (const tema of ["dark", "light"] as const) {
  test(`el contraste de la página de lectura, tema ${tema}`, async ({ page }) => {
    // Mismo mecanismo que `hoja.spec.ts`: la clave de `localStorage` que leen `ui/theme.ts` e
    // `index.html`, puesta antes de que la aplicación arranque.
    await page.addInitScript((t) => localStorage.setItem("dnd-theme", t), tema);
    const panel = await mundoConUnEnlace(page, `Sarnath ${tema}`);
    await expect(page.locator("html")).toHaveAttribute("data-theme", tema);

    const tarjeta = panel.locator("article").first();
    const pares: [string, Locator, number, "color" | "borderTopColor"][] = [
      [
        "cuerpo del mundo sobre vitela",
        page.locator('[data-tone="vellum"] p').first(),
        4.5,
        "color",
      ],
      ["sujeto de la frase", tarjeta.locator("span.text-muted").first(), 4.5, "color"],
      ["relación del enlace", tarjeta.locator("span.text-copper-text").first(), 4.5, "color"],
      ["ficha vecina (el enlace)", tarjeta.getByRole("link"), 4.5, "color"],
      ["Quitar", tarjeta.getByRole("button", { name: "Quitar" }), 4.5, "color"],
      ["borde de la tarjeta", tarjeta, 3, "borderTopColor"],
      ["filete de cobre de la hoja", page.locator('[data-tone="vellum"]'), 3, "borderTopColor"],
    ];
    for (const [etiqueta, objetivo, umbral, prop] of pares) {
      const ratio = await contraste(objetivo, prop);
      // Se imprime siempre: un número medido que nadie ve no sirve para revisar nada.
      console.log(`[${tema}] ${etiqueta}: ${ratio.toFixed(2)}:1 (mínimo ${umbral}:1)`);
      expect(ratio, `${etiqueta} · tema ${tema}`).toBeGreaterThanOrEqual(umbral);
    }
  });
}
