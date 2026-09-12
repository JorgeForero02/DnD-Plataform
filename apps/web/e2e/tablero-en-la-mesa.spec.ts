import { test, expect, type Page } from "@playwright/test";

// **El tablero PlanarAlly enmarcado en el centro de la mesa (C1 bis, D-CF-63).**
//
// `jsdom` no maqueta: un `<iframe>` con `flex-1 min-h-0` y el cajón del registro plegándose son
// exactamente el tipo de comportamiento que solo se ve en un navegador de verdad (la misma razón
// de ser que `mesa-mide.spec.ts`, que esta suite deja intacta — se corre justo después para
// comprobar que la rama SIN sala no cambió).
//
// La «sala» de la prueba es **nuestra propia página** `/acerca-de` (mismo origen): el e2e no sale
// a internet, y nuestra web no manda `X-Frame-Options` ni CSP que bloquee su propio iframe.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `tablero-mesa-${marca}@example.com`,
    password: "password123",
    displayName: `Tablero ${marca}`,
  };
}

async function registrarse(page: Page) {
  const cuenta = nuevaCuenta();
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();
  return cuenta;
}

/**
 * Una campaña con sesión **empezada** y el hilo **lleno** — copiado de `mesa-mide.spec.ts`
 * (mismos nombres, mismo gesto): sin un hilo real, plegar el registro y ver su contador subir no
 * se puede comprobar.
 */
async function campanaConSesionYHiloLargo(page: Page) {
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La mesa con tablero");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La mesa con tablero" }).click();
  await expect(page.getByRole("heading", { name: "La mesa con tablero" })).toBeVisible();

  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Nueva sesión" }).click();
  await page.getByLabel("Título").fill("El almacén cuatro");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();
  const barra = page.getByRole("status", { name: "Sesión en curso" });
  await expect(barra).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "Anotar" }).click();
  const campo = page.getByLabel("Qué anotar");
  const sellarCombate = page.getByRole("button", { name: /Combate/ }).first();
  for (let i = 0; i < 3; i++) {
    await expect(campo).toHaveValue("");
    await campo.fill(`la línea número ${i + 1} del almacén`);
    await expect(sellarCombate).toBeEnabled();
    await sellarCombate.click();
  }

  await barra.getByRole("link", { name: "Ir a la mesa" }).click();
  await expect(page.getByRole("banner", { name: "Estado de la mesa" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.getByRole("list", { name: "Sucesos de la sesión" }).getByText(/la línea número 3/),
  ).toBeVisible({ timeout: 15_000 });
}

/** El id de campaña sale de la URL de la mesa: `/campaigns/<id>/sesion`. */
function campaignIdDeLaMesa(page: Page): string {
  const m = new URL(page.url()).pathname.match(/^\/campaigns\/([^/]+)\/sesion$/);
  if (!m) throw new Error(`No se reconoce el id de campaña en ${page.url()}`);
  return m[1];
}

/** Guarda la propia `/acerca-de` de la app como «sala del tablero», desde Ajustes. */
async function guardarSalaPropia(page: Page, campaignId: string) {
  const sala = `${new URL(page.url()).origin}/acerca-de`;
  await page.goto(`/campaigns/${campaignId}?seccion=settings`);
  await page.getByRole("tab", { name: "Ajustes", selected: true }).waitFor();
  await page.getByLabel("Dirección de la sala").fill(sala);
  await page.getByRole("button", { name: "Guardar la sala" }).click();
  await expect(page.getByRole("button", { name: "Quitar la sala" })).toBeVisible();
}

test("con sala guardada, el marco ocupa el centro sin scroll de página y el registro se pliega con contador", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await registrarse(page);
  await campanaConSesionYHiloLargo(page);
  const campaignId = campaignIdDeLaMesa(page);

  await guardarSalaPropia(page, campaignId);

  await page.goto(`/campaigns/${campaignId}/sesion`);
  const marco = page.frameLocator("iframe[title='Sala del tablero']");
  await expect(marco.getByRole("heading", { level: 1 })).toBeVisible();

  const scrollDePagina = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight + 2,
  );
  expect(scrollDePagina).toBe(false);

  await page.getByRole("button", { name: "Plegar el registro" }).click();
  await page.getByRole("button", { name: "Anotar" }).click();
  await page.getByLabel("Qué anotar").fill("una línea con el registro plegado");
  await page
    .getByRole("button", { name: /Combate/ })
    .first()
    .click();
  await expect(page.getByRole("button", { name: "Desplegar el registro" })).toContainText("1", {
    timeout: 20_000,
  });

  // Desplegado, el hilo vuelve a verse y el contador se pone a cero.
  await page.getByRole("button", { name: "Desplegar el registro" }).click();
  await expect(page.getByRole("region", { name: "Registro de la sesión" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Plegar el registro" })).not.toContainText(/\d/);
});

test("a 390 px el marco va arriba y el registro debajo (la mesa a 390 sigue aplazada: D-CF-26)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await registrarse(page);
  await campanaConSesionYHiloLargo(page);
  const campaignId = campaignIdDeLaMesa(page);

  await guardarSalaPropia(page, campaignId);

  await page.goto(`/campaigns/${campaignId}/sesion`);
  const marco = await page.locator("iframe[title='Sala del tablero']").boundingBox();
  const registro = await page.getByRole("region", { name: "Registro en vivo" }).boundingBox();
  expect(marco).not.toBeNull();
  expect(registro).not.toBeNull();
  expect(registro!.y).toBeGreaterThanOrEqual(marco!.y + marco!.height - 1);
});
