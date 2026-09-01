import { test, expect, type Page } from "@playwright/test";

// Cada corrida crea su propio usuario: las pruebas no dependen de datos sembrados
// ni se pisan entre si al repetirse contra la misma base de desarrollo.
function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `e2e-${marca}@example.com`,
    password: "password123",
    displayName: `DM ${marca}`,
  };
}

async function registrarse(page: Page) {
  const cuenta = nuevaCuenta();
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Email").fill(cuenta.email);
  await page.getByLabel("Password").fill(cuenta.password);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("heading", { name: "Mis campañas" })).toBeVisible();
  return cuenta;
}

test("del registro a ver un NPC recien creado en su pestaña", async ({ page }) => {
  await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).click();
  await page.getByLabel("Nombre").fill("La Tumba de la Aniquilación");
  await page.getByRole("button", { name: "Crear" }).click();

  await page.getByRole("link", { name: "La Tumba de la Aniquilación" }).click();
  await expect(page.getByRole("heading", { name: "La Tumba de la Aniquilación" })).toBeVisible();

  await page.getByRole("button", { name: "NPCs" }).click();
  await expect(page.getByText("Sin elementos.")).toBeVisible();

  await page.getByRole("button", { name: "Nuevo" }).click();
  await page.getByLabel("Nombre").fill("Acererak");
  await page.getByLabel("Etiquetas (separadas por coma)").fill("lich, villano");
  await page.getByLabel("Visibilidad").selectOption("DM_ONLY");
  await page.getByRole("button", { name: "Guardar" }).click();

  // El editor se cierra y la entidad aparece en la lista con su visibilidad.
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  const npc = page.getByRole("button", { name: /Acererak/ });
  await expect(npc).toBeVisible();
  await expect(npc).toContainText("DM_ONLY");
});

test("salir cierra la sesion y la ruta protegida deja de abrirse", async ({ page }) => {
  await registrarse(page);

  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/login$/);

  // Volver a la ruta protegida a mano no debe devolver el panel.
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Mis campañas" })).toHaveCount(0);
});
