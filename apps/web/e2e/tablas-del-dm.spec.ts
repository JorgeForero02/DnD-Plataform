import { test, expect, type Page } from "@playwright/test";

// Tarea 2C.6 — **las tablas del DM, en el navegador.**
//
// Lo que se mide aquí y no se puede medir en otro sitio: que la pantalla **dice lo que estas
// tablas son** antes que ninguna otra cosa —una regla de la casa, no del manual—, que crear una
// tabla mala enseña **la frase del servidor** y no una genérica, y que la rejilla de filas no
// arrastra la página a lo ancho.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `tabla-${marca}@example.com`,
    password: "password123",
    displayName: `Tabla ${marca}`,
  };
}

async function abrirTablas(page: Page) {
  const cuenta = nuevaCuenta();
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Mis campañas" })).toBeVisible();

  await page.getByRole("button", { name: "Nueva campaña" }).click();
  await page.getByLabel("Nombre").fill("La casa que tira");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La casa que tira" }).click();
  await page.getByRole("tab", { name: "Tablas" }).click();
  await expect(page.getByRole("heading", { name: "Tablas del DM" })).toBeVisible();
}

test("**lo primero que se lee es que esto no es del manual**", async ({ page }) => {
  await abrirTablas(page);
  await expect(
    page.getByText(/el SRD no trae ninguna tabla de críticos ni de pifias/i),
  ).toBeVisible();
  await expect(page.getByText(/regla de la casa/i).first()).toBeVisible();
});

test("**el interruptor dice en qué posición está**, leído del servidor", async ({ page }) => {
  await abrirTablas(page);
  const apagada = page.getByRole("radio", { name: /Apagada/ });
  await expect(apagada).toBeChecked();
  // Y dice qué significa: es la frase que impide que una casa cambie una regla sin decirlo.
  await expect(page.getByText(/duplicando dados y nada más/i)).toBeVisible();
});

test("una tabla con un hueco se rechaza **con la frase del servidor**, no con una genérica", async ({
  page,
}) => {
  await abrirTablas(page);

  await page.getByRole("button", { name: "Crear tabla" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Con hueco");
  // La primera fila viene puesta; se le deja un rango que no empieza en 1.
  await page.getByLabel("Desde", { exact: true }).first().fill("3");
  await page.getByLabel("Hasta", { exact: true }).first().fill("8");
  await page.getByLabel("Resultado", { exact: true }).first().fill("Algo");
  await page.getByRole("button", { name: "Guardar tabla" }).click();

  // El mensaje lo escribe el esquema del servidor, y llega entero: «La tabla tiene que empezar en
  // el 1». Antes de 2C.6 llegaba como «El campo «entries» no tiene un valor válido».
  await expect(page.getByText(/tiene que empezar en el 1/i)).toBeVisible();
});

test("la pantalla no arrastra la página a lo ancho", async ({ page }) => {
  await abrirTablas(page);
  await page.setViewportSize({ width: 900, height: 900 });
  const desborda = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(desborda).toBe(false);
});
