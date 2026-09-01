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

test("modo edicion abre enlaces y comentarios, y los dos se ejercitan de verdad", async ({
  page,
}) => {
  await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).click();
  await page.getByLabel("Nombre").fill("Descenso a Avernus");
  await page.getByRole("button", { name: "Crear" }).click();

  await page.getByRole("link", { name: "Descenso a Avernus" }).click();
  await expect(page.getByRole("heading", { name: "Descenso a Avernus" })).toBeVisible();

  await page.getByRole("button", { name: "NPCs" }).click();

  // Hacen falta dos NPCs: uno para abrir en modo edición y otro para enlazarlo.
  await page.getByRole("button", { name: "Nuevo" }).click();
  await page.getByLabel("Nombre").fill("Zariel");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("button", { name: "Nuevo" }).click();
  await page.getByLabel("Nombre").fill("Mahadi");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  // Abrir Zariel en modo edición: EntityEditor solo pinta LinksPanel y CommentThread
  // cuando `isEdit && entity` (EntityEditor.tsx), así que este clic es el paso que el
  // único recorrido anterior nunca daba.
  await page.getByRole("button", { name: /Zariel/ }).click();
  await expect(page.getByRole("heading", { name: "Editar NPC" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Enlaces" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comentarios" })).toBeVisible();

  // Enlazar Zariel con Mahadi y comprobar que aparece en la lista de enlaces. Se acota al
  // panel "Enlaces" con un hijo directo `> h3`: CampaignDetailPage envuelve toda la pestaña
  // (lista de NPCs incluida) en su propio `<section>`, así que "has" sin combinador de hijo
  // directo también lo capturaría a él.
  const linksSection = page
    .locator("section")
    .filter({ has: page.locator("> h3", { hasText: "Enlaces" }) });
  await linksSection.getByLabel("Entidad destino").selectOption({ label: "Mahadi (NPC)" });
  await linksSection.getByLabel("Etiqueta del enlace").fill("rival");
  await linksSection.getByRole("button", { name: "Añadir enlace" }).click();
  const linkRow = linksSection.locator("li").filter({ hasText: "Mahadi" });
  await expect(linkRow).toBeVisible();
  await expect(linkRow).toContainText("rival");

  // Publicar un comentario y comprobar que aparece con su texto.
  await page.getByLabel("Nuevo comentario").fill("Cuidado con el mercado de almas");
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("Cuidado con el mercado de almas")).toBeVisible();
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
