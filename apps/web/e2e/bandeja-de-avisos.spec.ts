import { test, expect, type Page } from "@playwright/test";

// Plan 12 · 12.2 — **la bandeja de avisos, medida en el navegador y con dos cuentas.**
//
// Lo que `jsdom` no puede decir y esto sí: que el distintivo **no tapa** la navegación de la
// cabecera, que el panel **cabe en la ventana**, y que el recorrido entero —comentas tú, se entera
// el otro, lo abre y llega a la ficha— funciona contra la API de verdad.
//
// **Sin avisos no hay distintivo**, y esa es la primera medición: un cero con globo es ruido.

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

test("la bandeja: sin avisos no hay distintivo, y un comentario ajeno llega y lleva a su ficha", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const contextoDm = await browser.newContext();
  const contextoJugador = await browser.newContext();
  const paginaDm = await contextoDm.newPage();
  const paginaJugador = await contextoJugador.newPage();

  await registrarse(paginaDm, "dm");

  // --- 1. Recién registrado, **no hay distintivo** ---
  const campana = paginaDm.getByRole("button", { name: /^Avisos/ });
  await expect(campana).toBeVisible();
  await expect(campana).toHaveAccessibleName("Avisos"); // sin «(N sin leer)»

  // Y el panel vacío **lo dice**, en vez de dejar un hueco.
  await campana.click();
  await expect(paginaDm.getByText(/No tienes avisos/)).toBeVisible();
  await paginaDm.keyboard.press("Escape");
  await expect(paginaDm.getByRole("dialog", { name: "Avisos" })).toBeHidden();

  // --- 2. Una mesa con una ficha y una jugadora dentro ---
  await paginaDm.getByRole("button", { name: "Nueva campaña" }).first().click();
  await paginaDm.getByLabel("Nombre").fill("La mesa que avisa");
  await paginaDm.getByRole("button", { name: "Crear" }).click();
  await paginaDm.getByRole("link", { name: "La mesa que avisa" }).click();

  await paginaDm.getByRole("tab", { name: "El mundo" }).click();
  await paginaDm.getByRole("button", { name: /^PNJ/ }).click();
  await paginaDm.getByRole("button", { name: "Nuevo PNJ" }).click();
  await paginaDm.getByLabel("Nombre").fill("Gundren");
  // **La ficha tiene que ser visible para la mesa**: de partida una ficha nueva es del DM, y con
  // una ficha que la jugadora no ve no hay comentario que dé aviso —el aviso pasa por `canView`.
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
  await expect(paginaJugador.getByRole("heading", { name: "La mesa que avisa" })).toBeVisible();

  // --- 3. La jugadora comenta la ficha ---
  await paginaJugador.getByRole("tab", { name: "El mundo" }).click();
  await paginaJugador.getByRole("button", { name: /^PNJ/ }).click();
  await paginaJugador.getByRole("link", { name: /Gundren/ }).click();
  await paginaJugador.getByLabel("Nuevo comentario").fill("A este le falta un ojo, ¿no?");
  await paginaJugador.getByRole("button", { name: "Publicar" }).click();
  await expect(paginaJugador.getByText("A este le falta un ojo, ¿no?")).toBeVisible();

  // **Quien comenta no se avisa a sí misma.** Su campana sigue sin distintivo.
  await expect(paginaJugador.getByRole("button", { name: /^Avisos/ })).toHaveAccessibleName(
    "Avisos",
  );

  // --- 4. Al DM le llega, y el aviso lleva a la ficha ---
  //
  // Se recarga en vez de esperar el sondeo: el canal en vivo es 12.3, y una prueba que espera
  // treinta segundos es una prueba que nadie corre.
  await paginaDm.reload();
  const campanaConAvisos = paginaDm.getByRole("button", { name: /sin leer/ });
  await expect(campanaConAvisos).toBeVisible();

  // **El distintivo no tapa la navegación de la cabecera**, que es lo que `jsdom` no puede decir.
  const cuenta = paginaDm.getByRole("link", { name: "Cuenta" });
  const cajaCampana = await campanaConAvisos.boundingBox();
  const cajaCuenta = await cuenta.boundingBox();
  expect(cajaCampana).not.toBeNull();
  expect(cajaCuenta).not.toBeNull();
  expect(cajaCampana!.x + cajaCampana!.width).toBeLessThanOrEqual(cajaCuenta!.x + 1);

  await campanaConAvisos.click();
  const panel = paginaDm.getByRole("dialog", { name: "Avisos" });
  await expect(panel).toBeVisible();

  // El panel cabe en la ventana: no se sale por la derecha ni por abajo.
  const cajaPanel = await panel.boundingBox();
  const ventana = paginaDm.viewportSize();
  expect(cajaPanel).not.toBeNull();
  expect(cajaPanel!.x).toBeGreaterThanOrEqual(0);
  expect(cajaPanel!.x + cajaPanel!.width).toBeLessThanOrEqual((ventana?.width ?? 1280) + 1);

  // El aviso se lee en español, sin el cuerpo del comentario, y **lleva a su ficha**.
  const aviso = panel.getByRole("link", { name: /Han comentado Gundren/ });
  await expect(aviso).toBeVisible();
  await expect(panel).not.toContainText("A este le falta un ojo");
  await expect(panel).not.toContainText("COMMENT_ADDED");
  await aviso.click();
  await expect(paginaDm.getByRole("heading", { name: "Gundren" })).toBeVisible();

  // --- 5. «Marcar todo leído» apaga el distintivo, y el historial se queda ---
  await paginaDm.getByRole("button", { name: /^Avisos/ }).click();
  await paginaDm.getByRole("button", { name: "Marcar todo leído" }).click();
  await expect(paginaDm.getByRole("button", { name: /^Avisos/ })).toHaveAccessibleName("Avisos");
  // No se ha borrado nada: el aviso sigue en la lista, apagado.
  await expect(
    paginaDm.getByRole("dialog", { name: "Avisos" }).getByText(/Han comentado Gundren/),
  ).toBeVisible();
  // Y no hay ningún botón de borrar: un aviso leído se apaga, el historial se queda.
  await expect(
    paginaDm.getByRole("dialog", { name: "Avisos" }).getByRole("button", { name: /Borrar/ }),
  ).toHaveCount(0);

  await contextoDm.close();
  await contextoJugador.close();
});
