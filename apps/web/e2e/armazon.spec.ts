import { test, expect, type Page } from "@playwright/test";

// **Tres cosas que el autor señaló mirando el prototipo el 2026-09-03**, y que solo se pueden
// comprobar en un navegador: «el footer está fijo abajo», «todo tiene icono» y «todos los
// espacios se usan como se debe».
//
// `jsdom` no maqueta: no hay alto de ventana, ni posición, ni sabe dónde acaba la página. Un
// pie que se queda flotando a media pantalla con medio lienzo vacío debajo pasaría en verde en
// toda la suite unitaria — de hecho pasó, durante semanas.

test.use({ colorScheme: "dark" });

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `armazon-${marca}@example.com`,
    password: "password123",
    displayName: `Armazon ${marca}`,
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
}

test("el pie se apoya en el borde inferior aunque la pantalla tenga poco contenido", async ({
  page,
}) => {
  await registrarse(page);
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("Las Mareas de Sarnath");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "Las Mareas de Sarnath" }).click();
  await expect(page.getByRole("heading", { name: "Las Mareas de Sarnath" })).toBeVisible();

  // **Ventana alta a propósito.** Con 720 px de alto el carril de once entradas ya desborda por
  // sí solo, así que «la página cabe» sería falso pase lo que pase y la prueba no mediría el
  // pie. Con 1400 el contenido de una campaña vacía cabe de sobra, y entonces la pregunta —¿el
  // pie se apoya abajo o se queda flotando a media pantalla?— sí tiene respuesta.
  await page.setViewportSize({ width: 1440, height: 1400 });
  await page.waitForTimeout(200);
  const medido = await page.evaluate(() => {
    const pie = document.querySelector("footer") as HTMLElement;
    const caja = pie.getBoundingClientRect();
    return {
      pieAbajo: caja.bottom,
      alturaVentana: window.innerHeight,
      alturaDocumento: document.documentElement.scrollHeight,
      hayDesplazamiento: document.documentElement.scrollHeight > window.innerHeight + 2,
    };
  });
  console.log("=== armazón, campaña vacía ===", medido);

  // **Sin rama permisiva.** La primera versión decía «si hay desplazamiento, basta con que no
  // quede lienzo detrás del pie», y eso lo cumple igual un pie flotando a media pantalla: la
  // mutación que quitaba el armazón flexible **pasaba en verde**. Ahora se exige lo que el autor
  // pidió: el pie tocando el borde de abajo.
  // 32 px es el relleno inferior del contenedor (`py-s5`), no holgura inventada: el pie se apoya
  // en el borde del armazón, y el armazón respira. Con el cuerpo sin empujar, esta misma medida
  // da **575**, así que el umbral distingue de sobra lo que tiene que distinguir.
  expect(medido.alturaVentana - medido.pieAbajo).toBeLessThanOrEqual(32);
});

test("ninguna entrada del carril va sin su icono dibujado", async ({ page }) => {
  await registrarse(page);
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("Con iconos");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "Con iconos" }).click();
  await expect(page.getByRole("heading", { name: "Con iconos" })).toBeVisible();

  // **El autor lo dijo mirando el prototipo: «todo tiene icono».** Aquí tres entradas iban
  // peladas —Resumen, Reglas y Ajustes— y la columna se leía con tres huecos. Se comprueba
  // sobre el DOM pintado y no sobre la tabla de pestañas, porque lo que falla es que el dibujo
  // llegue, no que esté declarado.
  const sinIcono = await page.evaluate(() => {
    const carril = document.querySelector('[aria-orientation="vertical"], aside') as HTMLElement;
    const pestanas = Array.from(carril.querySelectorAll('[role="tab"]'));
    return pestanas
      .filter((t) => t.querySelector("svg") === null)
      .map((t) => (t.textContent || "").trim());
  });
  expect(sinIcono).toEqual([]);
});

test("la marca dice «Sala de Guerra»", async ({ page }) => {
  await page.goto("/login");
  // La identidad se llama así desde el reseño; el nombre en pantalla decía «Plataforma D&D»,
  // que es una categoría y no un nombre. Lo eligió el autor el 2026-09-03.
  await expect(page.getByRole("banner").or(page.locator("body"))).toContainText("Sala de");
  await expect(page.locator("body")).not.toContainText("Plataforma D&D");
});
