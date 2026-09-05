import { test, expect, type Page } from "@playwright/test";

// Plan 12 · 12.3 (D-OP-22) — **la única prueba que demuestra el nervio.** Lo demás es fontanería.
//
// Dos navegadores: la jugadora comenta una ficha y **la pestaña del DM se entera sin recargar**.
//
// **Lo que hace que esta prueba pruebe algo** es el reloj: el sondeo de red de seguridad está en
// **60 s** (`apps/web/src/lib/sondeo.ts`), así que si el aviso aparece en menos de eso, no lo ha
// traído el sondeo. Con el canal apagado, esta espera se agota — y eso es justo la mutación que
// hay que poder hacer a mano.
const MENOS_QUE_EL_SONDEO_MS = 20_000;

function nuevaCuenta(prefijo: string) {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `${prefijo}-${marca}@example.com`,
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

test("el nervio en vivo: la jugadora comenta y la pestaña del DM se entera sin recargar", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const contextoDm = await browser.newContext();
  const contextoJugador = await browser.newContext();
  const paginaDm = await contextoDm.newPage();
  const paginaJugador = await contextoJugador.newPage();

  await registrarse(paginaDm, "dm");
  await paginaDm.getByRole("button", { name: "Nueva campaña" }).first().click();
  await paginaDm.getByLabel("Nombre").fill("La mesa que se entera");
  await paginaDm.getByRole("button", { name: "Crear" }).click();
  await paginaDm.getByRole("link", { name: "La mesa que se entera" }).click();

  await paginaDm.getByRole("tab", { name: "El mundo" }).click();
  await paginaDm.getByRole("button", { name: /^PNJ/ }).click();
  await paginaDm.getByRole("button", { name: "Nuevo PNJ" }).click();
  await paginaDm.getByLabel("Nombre").fill("Gundren");
  await paginaDm.getByRole("radio", { name: /Todos los que se sientan a esta mesa/ }).check();
  await paginaDm.getByRole("button", { name: "Guardar" }).click();
  await expect(paginaDm.getByRole("button", { name: "Guardar" })).toBeHidden();

  await paginaDm.getByRole("tab", { name: "Ajustes" }).click();
  await paginaDm.getByRole("button", { name: "Generar invitación" }).click();
  const enlace = await paginaDm.getByLabel("Enlace de invitación").inputValue();

  await paginaJugador.goto(enlace);
  await paginaJugador.getByRole("link", { name: "Crear cuenta" }).click();
  const suya = nuevaCuenta("jugadora");
  await paginaJugador.getByLabel("Nombre").fill(suya.displayName);
  await paginaJugador.getByLabel("Correo").fill(suya.email);
  await paginaJugador.getByLabel("Contraseña").fill(suya.password);
  await paginaJugador.getByRole("button", { name: "Crear cuenta" }).click();
  await paginaJugador.getByRole("button", { name: "Unirse a la campaña" }).click();
  await expect(paginaJugador.getByRole("heading", { name: "La mesa que se entera" })).toBeVisible();

  // El DM se queda **quieto** en la pantalla de la campaña: a partir de aquí no recarga, no
  // navega y no pulsa nada. Lo único que puede traerle la noticia es el canal.
  await paginaDm.getByRole("tab", { name: "El mundo" }).click();
  // La bandeja se vacía primero: sentarse a la mesa ya le dejó un aviso al DM —y **le llegó por
  // el canal, sin recargar**, que es la misma tubería que se va a medir ahora con algo que
  // ocurre mientras él mira—. Se parte de cero para que el distintivo que aparezca luego solo
  // pueda ser el del comentario.
  await paginaDm.getByRole("button", { name: /^Avisos/ }).click();
  await paginaDm.getByRole("button", { name: "Marcar todo leído" }).click();
  await expect(paginaDm.getByRole("button", { name: /^Avisos/ })).toHaveAccessibleName("Avisos");
  await paginaDm.keyboard.press("Escape");
  const marcaDeTiempo = Date.now();

  await paginaJugador.getByRole("tab", { name: "El mundo" }).click();
  await paginaJugador.getByRole("button", { name: /^PNJ/ }).click();
  await paginaJugador.getByRole("link", { name: /Gundren/ }).click();
  await paginaJugador.getByLabel("Nuevo comentario").fill("¿Este no era el enano del mapa?");
  await paginaJugador.getByRole("button", { name: "Publicar" }).click();
  await expect(paginaJugador.getByText("¿Este no era el enano del mapa?")).toBeVisible();

  // **La medición.** Sin recargar, la campana del DM se enciende antes de que el sondeo pudiera
  // haberla encendido.
  await expect(paginaDm.getByRole("button", { name: /sin leer/ })).toBeVisible({
    timeout: MENOS_QUE_EL_SONDEO_MS,
  });
  expect(Date.now() - marcaDeTiempo).toBeLessThan(MENOS_QUE_EL_SONDEO_MS);

  // Y el aviso lleva a su sitio, como cualquier otro.
  await paginaDm.getByRole("button", { name: /sin leer/ }).click();
  await expect(
    paginaDm.getByRole("dialog", { name: "Avisos" }).getByRole("link", { name: /Gundren/ }),
  ).toBeVisible();

  await contextoDm.close();
  await contextoJugador.close();
});

test("el interruptor: con el canal apagado la pestaña NO se entera sola", async ({ browser }) => {
  test.setTimeout(180_000);
  const contextoDm = await browser.newContext();
  const contextoJugador = await browser.newContext();
  // **El interruptor de las pruebas**, fijado antes de que cargue la aplicación. Existe porque un
  // canal abierto sobrevive al final de un caso y vuelve intermitente a Playwright — y aquí,
  // además, es lo que convierte esta prueba en el control de la de arriba: **con el canal
  // apagado, la campana no se enciende sola**. Si esto se pusiera verde con el canal encendido,
  // la prueba de arriba no estaría midiendo el canal.
  await contextoDm.addInitScript(() => window.localStorage.setItem("canal-en-vivo", "off"));
  const paginaDm = await contextoDm.newPage();
  const paginaJugador = await contextoJugador.newPage();

  await registrarse(paginaDm, "dm-sin-canal");
  await paginaDm.getByRole("button", { name: "Nueva campaña" }).first().click();
  await paginaDm.getByLabel("Nombre").fill("La mesa sin nervio");
  await paginaDm.getByRole("button", { name: "Crear" }).click();
  await paginaDm.getByRole("link", { name: "La mesa sin nervio" }).click();

  await paginaDm.getByRole("tab", { name: "El mundo" }).click();
  await paginaDm.getByRole("button", { name: /^PNJ/ }).click();
  await paginaDm.getByRole("button", { name: "Nuevo PNJ" }).click();
  await paginaDm.getByLabel("Nombre").fill("Sildar");
  await paginaDm.getByRole("radio", { name: /Todos los que se sientan a esta mesa/ }).check();
  await paginaDm.getByRole("button", { name: "Guardar" }).click();
  await expect(paginaDm.getByRole("button", { name: "Guardar" })).toBeHidden();

  await paginaDm.getByRole("tab", { name: "Ajustes" }).click();
  await paginaDm.getByRole("button", { name: "Generar invitación" }).click();
  const enlace = await paginaDm.getByLabel("Enlace de invitación").inputValue();

  await paginaJugador.goto(enlace);
  await paginaJugador.getByRole("link", { name: "Crear cuenta" }).click();
  const suya = nuevaCuenta("jugadora-sin-canal");
  await paginaJugador.getByLabel("Nombre").fill(suya.displayName);
  await paginaJugador.getByLabel("Correo").fill(suya.email);
  await paginaJugador.getByLabel("Contraseña").fill(suya.password);
  await paginaJugador.getByRole("button", { name: "Crear cuenta" }).click();
  await paginaJugador.getByRole("button", { name: "Unirse a la campaña" }).click();

  await paginaDm.getByRole("tab", { name: "El mundo" }).click();
  await paginaJugador.getByRole("tab", { name: "El mundo" }).click();
  await paginaJugador.getByRole("button", { name: /^PNJ/ }).click();
  await paginaJugador.getByRole("link", { name: /Sildar/ }).click();
  await paginaJugador.getByLabel("Nuevo comentario").fill("Este sí me suena.");
  await paginaJugador.getByRole("button", { name: "Publicar" }).click();
  await expect(paginaJugador.getByText("Este sí me suena.")).toBeVisible();

  // Diez segundos quieto: con el canal apagado no llega nada, porque el sondeo está a 60 s.
  await paginaDm.waitForTimeout(10_000);
  await expect(paginaDm.getByRole("button", { name: /^Avisos/ })).toHaveAccessibleName("Avisos");
  // Y recargando sí está: el aviso se escribió, lo que faltaba era quien lo trajera.
  await paginaDm.reload();
  await expect(paginaDm.getByRole("button", { name: /sin leer/ })).toBeVisible();

  await contextoDm.close();
  await contextoJugador.close();
});
