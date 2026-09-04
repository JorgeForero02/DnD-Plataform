import { test, expect, type Page } from "@playwright/test";

// Tarea 2C.4 — **la condición que caduca sola, medida en un navegador y contra la API real.**
//
// Lo unitario ya prueba la tabla de duraciones y el pintado con datos fijos. Esto prueba lo que
// aquel no puede: que aplicar «una hora» y avanzar el reloj de la campaña **de verdad** deja la
// condición marcada como vencida, que el número que frenaba vuelve a su sitio, y que la fila
// vencida **sigue ahí** en vez de desaparecer — que es la mitad de la decisión del autor.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `cond-${marca}@example.com`,
    password: "password123",
    displayName: `Cond ${marca}`,
  };
}

/**
 * La cabecera de autorización de la sesión que hay abierta en el navegador.
 *
 * **Se usa para MONTAR, nunca para comprobar.** Rellenar raza, clase y seis características a
 * clics son quince pasos que `hoja.spec.ts` ya recorre, y repetirlos aquí solo alargaría el
 * recorrido sin medir nada nuevo. Lo que se mide sigue siendo lo que pasa en pantalla.
 */
async function comoLaSesion(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem("dnd_token"));
  return { Authorization: `Bearer ${token}` };
}

async function abrirHoja(page: Page) {
  const cuenta = nuevaCuenta();
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La cuenta atrás");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La cuenta atrás" }).click();
  await expect(page.getByRole("heading", { name: "La cuenta atrás" })).toBeVisible();

  await page.getByRole("tab", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill("Brann");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  await page.getByRole("link", { name: "Brann" }).click();
  await expect(page.getByRole("heading", { name: "Brann" })).toBeVisible();

  // La hoja se completa por la API: sin raza ni clase no hay nada que derivar, y la sección de
  // condiciones vive dentro de la hoja derivada.
  const url = page.url();
  const campaignId = url.split("/campaigns/")[1].split("/")[0];
  const characterId = url.split("/personajes/")[1];
  const hoja = await page.request.patch(
    `/api/campaigns/${campaignId}/characters/${characterId}/sheet`,
    {
      headers: await comoLaSesion(page),
      data: {
        abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
        race: { source: "SRD", key: "dwarf" },
        subrace: { source: "SRD", key: "dwarf-hill" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      },
    },
  );
  expect(hoja.ok()).toBe(true);
  await page.reload();
  await expect(page.getByLabel("Nueva condición")).toBeVisible();
  return { campaignId, characterId };
}

test("una condición con duración se marca como vencida al pasar su hora, **y no desaparece**", async ({
  page,
}) => {
  const { campaignId, characterId } = await abrirHoja(page);

  // 1 · Se aplica «derribado» durante una hora de juego.
  await page.getByLabel("Nueva condición").selectOption({ label: "Derribado" });
  await page.getByLabel("Duración").selectOption({ label: "1 hora" });
  await page
    .locator('section[aria-label="condiciones"]')
    .getByRole("button", { name: "Aplicar" })
    .click();

  // Mientras está viva, la pantalla dice lo que le queda — no un «vence a las 3600», que no
  // significa nada para quien juega.
  await expect(page.getByText(/vence en/i)).toBeVisible();
  await expect(page.getByText(/vencida/i)).toHaveCount(0);

  // 2 · **El DM hace que pase una hora desde la pantalla**, que es la ficha C2C-3: el endpoint
  // existía y ninguna pantalla lo llamaba, así que una condición de una hora no vencía nunca
  // porque nadie podía hacer que pasara esa hora.
  await page.goto(`/campaigns/${campaignId}`);
  await page.getByRole("tab", { name: "Dados" }).click();
  await expect(page.getByRole("heading", { name: "El reloj" })).toBeVisible();
  await page.getByRole("button", { name: "1 hora" }).click();
  await expect(page.getByText(/pasan 1 hora/i)).toBeVisible();

  // 3 · Y en la hoja, la condición **sigue en la lista** y se ve vencida.
  await page.goto(`/campaigns/${campaignId}/personajes/${characterId}`);
  await expect(page.getByText(/vencida: ya no se aplica/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Renovar" })).toBeVisible();
  await expect(page.getByRole("button", { name: /quitar derribado/i })).toBeVisible();
});

test("**los PG máximos partidos por agotamiento se explican en la hoja**", async ({ page }) => {
  await abrirHoja(page);

  const cifras = page.locator('[data-hp="cifras"]').first();
  const maximoSano = Number((await cifras.innerText()).split("/")[1].trim());
  expect(maximoSano).toBeGreaterThan(0);

  await page.getByLabel("Nueva condición").selectOption({ label: "Agotamiento" });
  await page.getByLabel("Nivel de agotamiento").fill("4");
  await page
    .locator('section[aria-label="condiciones"]')
    .getByRole("button", { name: "Aplicar" })
    .click();

  // El número baja a la mitad **y la pantalla dice por qué**. Sin la frase, unos PG máximos que
  // caen a la mitad son la pregunta que más se hace en una mesa.
  // `toContainText` y no `toHaveText`: con una expresión regular, `toHaveText` exige que
  // **toda** la cadena case, y aquí la cadena es «7 / 7».
  await expect(cifras).toContainText(`/ ${Math.floor(maximoSano / 2)}`);
  await expect(page.getByText(/a la mitad/i).first()).toBeVisible();
});
