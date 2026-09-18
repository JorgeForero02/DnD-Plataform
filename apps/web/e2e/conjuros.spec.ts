import { test, expect, type Page } from "@playwright/test";

// Tarea 6 de 3A.2 («elegir, lanzar y usar») — la pestaña «Conjuros», medida en un navegador de
// verdad: el mago nace con su libro sembrado (Task 3, D-CF-125), el contador de la cabecera lo
// dice, preparar dos conjuros de «Disponibles» los mueve a «Listos para lanzar», conocer un
// truco sube su propio contador, y el buscador de «Disponibles» encuentra un conjuro que no está
// en el libro, marcado «Fuera del libro».
//
// **Escrito, no corrido** (contrato del implementador, D-CF-65): lo ejecuta el orquestador.
//
// El personaje se hace mago **por la API**, como `combate.spec.ts` y `hoja-pestanas.spec.ts`:
// rellenar la hoja a clics no es lo que esta prueba mide, y así se llega a la pantalla con un
// nivel 1 y su libro ya sembrado sin recorrer quince pasos de formulario.
//
// **Ruling: «Descarga de fuego» (`fire-bolt`) y no «Rayo de fuego».** El brief original de esta
// tarea citaba «Rayo de fuego» para el truco a conocer; el nombre real que sirve el catálogo
// sembrado (comprobado contra `apps/api/src/rules/catalog/spell-activities.ts` y contra la lista
// de nombres verificados del encargo) es «Descarga de fuego» — se usa ese, porque un nombre que
// no existe en la pantalla haría fallar el recorrido entero por una sola palabra. Coste si está
// mal: ninguno de fondo, es solo el texto que busca `getByRole`.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
  return {
    email: `conjuros-${marca}@example.com`,
    password: "password123",
    displayName: `Conjuros ${marca}`,
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

/** La cabecera de autorización de la sesión abierta en el navegador — mismo patrón que
 *  `combate.spec.ts`, `hoja-pestanas.spec.ts` e `iniciativa-en-vivo.spec.ts`. */
async function comoLaSesion(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem("dnd_token"));
  return { Authorization: `Bearer ${token}` };
}

/**
 * El mago, montado por la API: una campaña, un personaje, y la hoja fijada a `class: wizard`
 * — fijar la primera clase es lo que dispara `sembrarLibro` (Task 3, D-CF-125), así que el
 * personaje llega a la pantalla con sus seis conjuros de nivel 1 ya `EN_EL_LIBRO` sin que nadie
 * los pida uno a uno.
 */
async function montarMaga(page: Page) {
  const headers = await comoLaSesion(page);
  const campana = await page.request.post("/api/campaigns", {
    headers,
    data: { name: "La torre del libro" },
  });
  expect(campana.ok()).toBe(true);
  const campaignId: string = (await campana.json()).id;

  const personaje = await page.request.post(`/api/campaigns/${campaignId}/characters`, {
    headers,
    data: { name: "Seraphine Tintanoche" },
  });
  expect(personaje.ok()).toBe(true);
  const characterId: string = (await personaje.json()).id;

  const hoja = await page.request.patch(
    `/api/campaigns/${campaignId}/characters/${characterId}/sheet`,
    {
      headers,
      data: {
        abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "wizard" },
        level: 1,
        choices: { "wizard-skills": ["arcana", "history"] },
      },
    },
  );
  expect(hoja.ok()).toBe(true);

  return { campaignId, characterId };
}

test.setTimeout(120_000);

test("Conjuros: 6 de 6 en el libro, preparar dos, conocer un truco, y «Fuera del libro» al buscar", async ({
  page,
}) => {
  await registrarse(page);
  const { campaignId, characterId } = await montarMaga(page);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/campaigns/${campaignId}/personajes/${characterId}?pestana=conjuros`);

  const pestana = page.locator('[data-pestana="conjuros"]');
  await expect(pestana).toBeVisible();

  const listos = page.getByRole("region", { name: "listos para lanzar" });
  const disponibles = page.getByRole("region", { name: "disponibles" });

  // El mago nace con su libro sembrado: los seis conjuros de nivel 1 EN_EL_LIBRO, ninguno
  // preparado todavía. El contador vive en la cabecera de «Listos para lanzar»
  // (`LibroDeConjuros.tsx`): es la misma tarjeta que enseña, debajo, lo que ya se puede lanzar.
  await expect(listos.getByText("6 de 6 en el libro")).toBeVisible();

  // Preparar «Proyectil mágico» y «Escudo» desde «Disponibles» — las dos van al mago sembrado.
  await disponibles
    .locator("li", { hasText: "Proyectil mágico" })
    .getByRole("button", { name: "Preparar" })
    .click();
  await expect(listos.getByText("1 de 6 preparados")).toBeVisible();
  await disponibles
    .locator("li", { hasText: "Escudo" })
    .getByRole("button", { name: "Preparar" })
    .click();
  await expect(listos.getByText("2 de 6 preparados")).toBeVisible();

  // Y ahora se leen en «Listos para lanzar» — la lista SÍ las cambia de zona.
  await expect(listos.getByText("Proyectil mágico")).toBeVisible();
  await expect(listos.getByText("Escudo")).toBeVisible();
  await expect(disponibles.locator("li", { hasText: "Proyectil mágico" })).toHaveCount(0);

  // Conocer el truco «Descarga de fuego»: sube el contador de trucos, no el de preparados.
  await disponibles
    .locator("li", { hasText: "Descarga de fuego" })
    .getByRole("button", { name: "Conocer" })
    .click();
  await expect(listos.getByText("1 de 3 trucos")).toBeVisible();
  await expect(listos.getByText("Descarga de fuego")).toBeVisible();

  // Buscar «bola»: «Bola de fuego» es de la clase pero no está en el libro — una sola fila,
  // marcada «Fuera del libro», nunca desaparecida.
  await disponibles.getByLabel("Buscar conjuro").fill("bola");
  const filaBola = disponibles.locator("li", { hasText: "Bola de fuego" });
  await expect(filaBola).toBeVisible();
  await expect(filaBola.getByText("Fuera del libro")).toBeVisible();
  await expect(filaBola.getByRole("button", { name: "Añadir al libro" })).toBeVisible();
  await expect(disponibles.locator("li")).toHaveCount(1);

  await page.screenshot({ path: "e2e-resultados/conjuros-1280.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(pestana).toBeVisible();
  await expect(disponibles.getByText("1 de 3 trucos")).toBeVisible();
  await page.screenshot({ path: "e2e-resultados/conjuros-390.png", fullPage: true });
});
