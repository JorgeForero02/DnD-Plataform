import { test, expect, type Page } from "@playwright/test";

// **El mundo como árbol con detalle, de punta a punta** (Task 14 bis del pulido, D-CF-64; cierra
// el #23 del anexo y retira el tablero telaraña, D4).
//
// Lo que ninguna prueba de componente puede ver, y por eso se mide aquí:
//
//  1. Un hilo tendido desde los dos desplegables del detalle **llega al servidor** y **mueve la
//     ficha en el árbol**: Corvin, que colgaba de la raíz «PNJ», pasa a colgar de la Torre Gris.
//  2. **Sobrevive a una recarga entera**, que es lo único que demuestra que no vive en memoria.
//  3. A 390 px el detalle va **debajo** del desglose y la página no se sale de la ventana.
//
// El DM en reposo entra en la mesa y encuentra el taller (`MesaDeSesion.tsx`: `esDm && !sesion`).
// Las dos fichas se montan por la API —crearlas a clics es lo que ya recorre `campana.spec.ts`— y
// lo que se mide es el mundo.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `mundo-arbol-${marca}@example.com`,
    password: "password123",
    displayName: `Mundo ${marca}`,
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
}

/** La cabecera de autorización de la sesión abierta en el navegador. Se usa para MONTAR. */
async function comoLaSesion(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem("dnd_token"));
  return { Authorization: `Bearer ${token}` };
}

/** Una campaña con un lugar y un PNJ, sin hilo entre ellos todavía. */
async function montarMundo(page: Page) {
  const headers = await comoLaSesion(page);
  const campana = await page.request.post("/api/campaigns", {
    headers,
    data: { name: "El mundo en árbol" },
  });
  expect(campana.ok()).toBe(true);
  const campaignId: string = (await campana.json()).id;

  const torre = await page.request.post(`/api/campaigns/${campaignId}/entities`, {
    headers,
    data: { type: "LOCATION", name: "Torre Gris" },
  });
  expect(torre.ok()).toBe(true);
  const corvin = await page.request.post(`/api/campaigns/${campaignId}/entities`, {
    headers,
    data: { type: "NPC", name: "Corvin" },
  });
  expect(corvin.ok()).toBe(true);

  return { campaignId, torreId: (await torre.json()).id as string };
}

test("tender «vive en» desde el detalle cuelga a Corvin de la Torre Gris, y sobrevive a recargar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await registrarse(page);
  const { campaignId } = await montarMundo(page);

  await page.goto(`/campaigns/${campaignId}/sesion`);
  const mundo = page.getByRole("region", { name: "El mundo" });
  await expect(mundo.getByRole("heading", { name: "El mundo" })).toBeVisible();
  const arbol = mundo.getByRole("tree", { name: "El mundo" });

  // De partida los dos cuelgan de la raíz de su tipo: ningún hilo, ninguna jerarquía.
  const corvin = arbol.getByRole("treeitem", { name: "Corvin", exact: true });
  const torre = arbol.getByRole("treeitem", { name: "Torre Gris", exact: true });
  await expect(corvin).toBeVisible();
  await expect(torre).toBeVisible();
  await expect(torre).not.toHaveAttribute("aria-expanded", /.*/);
  await expect(mundo.getByText("Elige una ficha del desglose")).toBeVisible();

  // --- 1 · Elegir Corvin pinta su detalle ---
  await corvin.click();
  await expect(corvin).toHaveAttribute("aria-selected", "true");
  const detalle = mundo.getByRole("article", { name: "Detalle de Corvin" });
  await expect(detalle.getByRole("heading", { name: "Corvin" })).toBeVisible();
  await expect(detalle.getByRole("link", { name: "Abrir ficha" })).toHaveAttribute(
    "href",
    new RegExp(`/campaigns/${campaignId}/entidades/`),
  );
  await expect(detalle.getByText("Esta ficha no tiene hilos todavía")).toBeVisible();

  // --- 2 · Añadir el hilo con los dos desplegables ---
  await detalle.getByRole("button", { name: "Añadir hilo" }).click();
  await detalle.getByRole("button", { name: /Hacia qué ficha/ }).click();
  await detalle.getByLabel("Buscar ficha por nombre").fill("torre");
  await detalle
    .getByRole("list", { name: "Hacia qué ficha" })
    .getByRole("button", { name: /^Torre Gris/ })
    .click();
  await detalle.getByRole("button", { name: /^Rótulo/ }).click();
  await detalle
    .getByRole("list", { name: "Rótulo" })
    .getByRole("button", { name: "vive en" })
    .click();
  await detalle.getByRole("button", { name: "Añadir hilo" }).click();

  // --- 3 · Corvin cuelga ahora de la Torre, con su rótulo, y el anillo lo enseña ---
  await expect(torre).toHaveAttribute("aria-expanded", "true");
  const corvinBajoLaTorre = torre.getByRole("treeitem", { name: "Corvin", exact: true });
  await expect(corvinBajoLaTorre).toBeVisible();
  await expect(corvinBajoLaTorre).toContainText("vive en");
  await expect(
    detalle.getByRole("group", { name: "Vecinos de Corvin" }).getByRole("button", {
      name: "vive en Torre Gris",
    }),
  ).toBeVisible();
  await expect(detalle.getByRole("list", { name: "Hilos de Corvin" })).toContainText("Torre Gris");

  // --- 4 · Persiste: recargar y volver a encontrar el mismo árbol ---
  await page.reload();
  const arbolDeNuevo = page
    .getByRole("region", { name: "El mundo" })
    .getByRole("tree", { name: "El mundo" });
  const torreDeNuevo = arbolDeNuevo.getByRole("treeitem", { name: "Torre Gris", exact: true });
  await expect(torreDeNuevo).toBeVisible();
  await expect(torreDeNuevo).toHaveAttribute("aria-expanded", "false");
  await torreDeNuevo.getByRole("button", { name: "Desplegar Torre Gris" }).click();
  await expect(torreDeNuevo.getByRole("treeitem", { name: "Corvin", exact: true })).toBeVisible();
  // Y bajo la raíz «PNJ» ya no hay ningún Corvin suelto: cuelga de un padre y solo de uno.
  await expect(arbolDeNuevo.getByRole("treeitem", { name: "Corvin", exact: true })).toHaveCount(1);
});

test("a 390 px el detalle va debajo del desglose y la página no se sale de la ventana", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await registrarse(page);
  const { campaignId, torreId } = await montarMundo(page);
  await page.goto(`/campaigns/${campaignId}/sesion`);
  const mundo = page.getByRole("region", { name: "El mundo" });
  await mundo.getByRole("treeitem", { name: "Torre Gris", exact: true }).click();
  const detalle = mundo.getByRole("article", { name: "Detalle de Torre Gris" });
  await expect(detalle.getByRole("link", { name: "Abrir ficha" })).toHaveAttribute(
    "href",
    `/campaigns/${campaignId}/entidades/${torreId}`,
  );

  // Se monta ancho, donde todo funciona, y SOLO ENTONCES se estrecha: lo que se mide es el
  // orden de las dos mitades, no que la mesa entera quepa a 390 (eso sigue aplazado, D-CF-26).
  await page.setViewportSize({ width: 390, height: 844 });
  const arbol = mundo.getByRole("tree", { name: "El mundo" });
  const cajaArbol = await arbol.boundingBox();
  const cajaDetalle = await detalle.boundingBox();
  expect(cajaArbol).not.toBeNull();
  expect(cajaDetalle).not.toBeNull();
  expect(cajaDetalle!.y).toBeGreaterThanOrEqual(cajaArbol!.y + cajaArbol!.height - 1);

  const anchoDeDocumento = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(anchoDeDocumento).toBeLessThanOrEqual(390);
});
