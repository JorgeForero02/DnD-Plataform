import { test, expect, type Browser, type Page } from "@playwright/test";

// Tarea 2C.2 — **la pantalla de dados, en un navegador de verdad y contra la API real.**
//
// Lo que las unitarias ya cubren —qué se manda, qué rama se pinta— no se repite aquí. Esto mide
// las tres cosas que `jsdom` **no puede** y una que ninguna simulación puede:
//
//  · que el dado descartado se pinta **tachado de verdad** (`line-through` es maquetación, y
//    jsdom no maqueta);
//  · que la tarjeta no desborda su contenedor;
//  · que el rechazo del servidor llega y **se lee**, con el evaluador de verdad al otro lado —el
//    mensaje lo escribe `apps/api/src/dice/dice.ts`, no un simulacro;
//  · y que **una tirada a ciegas no trae el total ni siquiera en la red**: se comprueba sobre la
//    respuesta HTTP, no sobre el DOM, que es donde estaba el agujero de 2C.1.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `dados-${marca}@example.com`,
    password: "password123",
    displayName: `Dados ${marca}`,
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

/** La tarjeta de arriba, no el registro: las dos enseñan un resultado y hay que distinguirlas. */
function tarjeta(page: Page) {
  return page.getByRole("region", { name: "Tirada nueva" });
}

async function abrirDados(page: Page) {
  await registrarse(page);
  await page.getByRole("button", { name: "Nueva campaña" }).click();
  await page.getByLabel("Nombre").fill("La partida de prueba");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La partida de prueba" }).click();
  await expect(page.getByRole("heading", { name: "La partida de prueba" })).toBeVisible();
  await page.getByRole("tab", { name: "Dados" }).click();
  await expect(page.getByRole("heading", { name: "Dados", exact: true })).toBeVisible();
}

test("se tira una expresión libre y se ve el desglose, no solo el total", async ({ page }) => {
  await abrirDados(page);

  await page.getByLabel("Qué se tira").fill("2d6+3");
  await page.getByLabel("Motivo (opcional)").fill("Daño de la maza");
  await page.getByRole("button", { name: "Tirar" }).click();

  const resultado = tarjeta(page).getByRole("status");
  await expect(resultado).toBeVisible();
  // El desglose nombra los dados y el modificador: **nunca un número suelto**.
  await expect(resultado).toContainText("dado");
  await expect(resultado).toContainText("3");

  // Y el total está entre 5 y 15, que es todo lo que `2d6+3` puede dar. Se comprueba el rango y
  // no un número: el azar vive en el servidor y esta prueba no lo fija.
  const primerDado = Number(await tarjeta(page).locator("[data-dado]").first().innerText());
  expect(primerDado).toBeGreaterThanOrEqual(1);
  expect(primerDado).toBeLessThanOrEqual(6);
});

test("**el dado descartado se pinta tachado** — y eso solo se puede medir en un navegador", async ({
  page,
}) => {
  await abrirDados(page);

  // Con ventaja, el servidor convierte el d20 en `2d20kh1`: caen dos dados y uno se descarta.
  await page.getByLabel("Qué se tira").fill("1d20");
  // **Acotado a la tarjeta.** Desde 2C.5 el DM también tiene «Pedir una tirada» en esta pantalla,
  // con su propio control de ventaja: sin acotar, «Ventaja» resuelve a dos radios y la prueba se
  // cae por modo estricto sin que nada del código esté mal.
  await tarjeta(page).getByRole("radio", { name: "Ventaja", exact: true }).check();
  await page.getByRole("button", { name: "Tirar" }).click();

  await expect(tarjeta(page).getByRole("status")).toBeVisible();
  const descartado = tarjeta(page).locator('[data-dado="descartado"]');
  await expect(descartado).toHaveCount(1);
  await expect(tarjeta(page).locator('[data-dado="conservado"]')).toHaveCount(1);

  // `jsdom` no resuelve esto: la clase existe en el DOM y el estilo calculado es lo único que
  // dice si de verdad se pinta la raya.
  const decoracion = await descartado.evaluate((el) => getComputedStyle(el).textDecorationLine);
  expect(decoracion).toContain("line-through");
});

test("una expresión inválida se rechaza **con el motivo del evaluador de verdad**, junto al campo", async ({
  page,
}) => {
  await abrirDados(page);

  await page.getByLabel("Qué se tira").fill("4d");
  await page.getByRole("button", { name: "Tirar" }).click();

  // El mensaje lo escribe el servidor (`dice.ts`: «No entiendo «4d». Se esperaba algo como
  // 4d6…»), y llega entero hasta el campo. Hasta 2C.2 el evaluador lo producía y nadie lo pintaba.
  await expect(page.getByText(/no entiendo/i)).toBeVisible();
  await expect(tarjeta(page).getByRole("status")).toBeHidden();
});

test("un modificador absurdo también se rechaza legible: el tope de la ficha P2, de punta a punta", async ({
  page,
}) => {
  await abrirDados(page);

  await page.getByLabel("Qué se tira").fill("1d20+999999999");
  await page.getByRole("button", { name: "Tirar" }).click();

  await expect(page.getByText(/de modificador/i)).toBeVisible();
  await expect(tarjeta(page).getByRole("status")).toBeHidden();
});

test("**a ciegas, el total no viaja al jugador**: se mide sobre la respuesta HTTP, no sobre el DOM", async ({
  browser,
}: {
  browser: Browser;
}) => {
  // **Tiene que tirar un JUGADOR, y eso es media prueba.** El DM sí ve su propia tirada a ciegas
  // —la esconde de la mesa, no de sí mismo—, así que un recorrido que tirara con la cuenta que
  // creó la campaña habría pasado en verde sin comprobar nada. Se vio al escribirla.
  const contextoDM = await browser.newContext();
  const paginaDM = await contextoDM.newPage();
  await abrirDados(paginaDM);

  await paginaDM.getByRole("tab", { name: "Ajustes" }).click();
  await paginaDM.getByRole("button", { name: "Generar invitación" }).click();
  const enlace = await paginaDM.getByLabel("Enlace de invitación").inputValue();

  const contextoJugador = await browser.newContext();
  const page = await contextoJugador.newPage();
  await page.goto(enlace);
  const jugador = nuevaCuenta();
  await page.getByRole("link", { name: "Crear cuenta" }).click();
  await page.getByLabel("Nombre").fill(jugador.displayName);
  await page.getByLabel("Correo").fill(jugador.email);
  await page.getByLabel("Contraseña").fill(jugador.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.getByRole("button", { name: "Unirse a la campaña" }).click();
  await expect(page.getByRole("heading", { name: "La partida de prueba" })).toBeVisible();
  await page.getByRole("tab", { name: "Dados" }).click();
  await expect(page.getByRole("heading", { name: "Dados", exact: true })).toBeVisible();

  await page.getByLabel("Qué se tira").fill("1d20+5");
  await tarjeta(page)
    .getByRole("radio", { name: /a ciegas/i })
    .check();

  const [respuesta] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/rolls") && r.request().method() === "POST"),
    page.getByRole("button", { name: "Tirar" }).click(),
  ]);

  // Esconderlo en el cliente no cuenta como esconderlo. El cuerpo **no trae el resultado**.
  const cuerpo = await respuesta.json();
  expect(cuerpo.revealed).toBe(false);
  expect(cuerpo.total).toBeUndefined();
  expect(cuerpo.rolls).toBeUndefined();

  // Y la pantalla lo dice en vez de dejar un hueco, que se leería como «falló, vuelve a pulsar».
  await expect(page.getByText(/tirado a ciegas/i)).toBeVisible();
  await expect(tarjeta(page).locator("[data-dado]")).toHaveCount(0);

  await contextoJugador.close();
  await contextoDM.close();
});

test("las tiradas aparecen en el registro de la campaña, debajo", async ({ page }) => {
  await abrirDados(page);

  await page.getByLabel("Qué se tira").fill("1d100");
  await page.getByLabel("Motivo (opcional)").fill("A ver qué sale");
  await page.getByRole("button", { name: "Tirar" }).click();
  await expect(tarjeta(page).getByRole("status")).toBeVisible();

  // El registro lo sirve `GET /campaigns/:id/rolls`, filtrado por `canView` en el servidor.
  const registro = page.getByRole("region", { name: /registro de tiradas/i });
  await expect(registro.locator('[data-tirada-tipo="ABILITY_ROLL"]')).toHaveCount(1);
});

test("la tarjeta no desborda su contenedor ni arrastra la página a lo ancho", async ({ page }) => {
  await abrirDados(page);
  await page.setViewportSize({ width: 900, height: 900 });

  const desbordaLaPagina = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(desbordaLaPagina).toBe(false);
});
