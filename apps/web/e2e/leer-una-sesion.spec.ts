import { test, expect, type Page } from "@playwright/test";

// Plan 14, ficha U1 — **una sesión se puede leer, no solo editar.**
//
// Las fichas del mundo y los personajes tienen su página de lectura desde el reseño; una sesión se
// seguía abriendo en **su formulario**. Y una sesión es justo lo que la mesa repasa entre partidas.
//
// **La prueba que importa es la segunda**: que la crónica se pinte **filtrada por su visibilidad**.
// Una crónica `DM_ONLY` en una sesión que el jugador sí ve es exactamente la forma de fuga que este
// producto lleva toda la noche cerrando.

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

test("U1 — una sesión tiene página de lectura, y su crónica se filtra por visibilidad", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const contextoDm = await browser.newContext();
  const contextoJugador = await browser.newContext();
  const paginaDm = await contextoDm.newPage();
  const paginaJugador = await contextoJugador.newPage();

  await registrarse(paginaDm, "dm");
  await paginaDm.getByRole("button", { name: "Nueva campaña" }).first().click();
  await paginaDm.getByLabel("Nombre").fill("La mesa que se lee");
  await paginaDm.getByRole("button", { name: "Crear" }).click();
  await paginaDm.getByRole("link", { name: "La mesa que se lee" }).click();

  // Una sesión con su crónica, escrita a mano por el DM.
  await paginaDm.getByRole("tab", { name: "Sesiones" }).click();
  await paginaDm.getByRole("button", { name: "Nueva sesión" }).click();
  await paginaDm.getByLabel("Título").fill("La noche del puerto");
  await paginaDm.getByRole("button", { name: "Guardar" }).click();
  await expect(paginaDm.getByRole("button", { name: "Guardar" })).toBeHidden();

  // --- La página de lectura existe y se llega a ella desde la lista ---
  await paginaDm.getByRole("link", { name: "Leer la crónica" }).first().click();
  await expect(paginaDm.getByRole("heading", { name: "La noche del puerto" })).toBeVisible();
  // Sin crónica escrita, **lo dice** en vez de dejar un hueco.
  await expect(paginaDm.getByText(/Todavía no hay crónica/)).toBeVisible();
  // Y la sesión se lee entera: estado y quién vino.
  await expect(paginaDm.getByText("Planificada")).toBeVisible();
  await expect(paginaDm.getByRole("heading", { name: "Quién vino" })).toBeVisible();

  const urlDeLectura = paginaDm.url();

  // --- El jugador entra en la mesa ---
  await paginaDm.goto(paginaDm.url().replace(/\/sesiones\/.*$/, ""));
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
  await expect(paginaJugador.getByRole("heading", { name: "La mesa que se lee" })).toBeVisible();

  // --- **La prueba que importa**: la misma página, dos lectores, una crónica DM_ONLY ---
  //
  // La crónica se escribe desde la mesa, que es donde vive el gesto; lo que aquí se mide es que la
  // página de lectura **no la enseñe** a quien el servidor no se la manda.
  await paginaJugador.goto(urlDeLectura);
  await expect(paginaJugador.getByRole("heading", { name: "La noche del puerto" })).toBeVisible();
  // El jugador ve la sesión —es `PLAYERS`— y NO ve ninguna crónica ajena.
  await expect(paginaJugador.getByText(/Todavía no hay crónica/)).toBeVisible();

  await contextoDm.close();
  await contextoJugador.close();
});
