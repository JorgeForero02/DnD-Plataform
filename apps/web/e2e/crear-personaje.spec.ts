import { test, expect, type Page } from "@playwright/test";

// Tarea 24 (cerrar fichas, tanda 2026-09-11) — **el diálogo de creación pide raza y clase del
// catálogo, no texto libre**, y las manda como claves (`PATCH .../sheet`) al guardar.
//
// Lo que solo se ve en un navegador de verdad:
//
//  · Que las dos listas de verdad llegan de `GET /catalog` y se eligen por su nombre («Enano»,
//    «Guerrero»), no por su clave (`dwarf`, `fighter`) — ninguna clave puede leerse en pantalla.
//  · Que **de punta a punta contra la API real** crear-y-luego-`PATCH` deja la hoja con la raza y
//    la clase elegidas, sin que un espía finja la segunda petición.
//  · Que el cajón **cabe en la ventana** a dos anchos: el de escritorio del autor (1280×800) y el
//    de un móvil (390×844). `jsdom` no maqueta, así que un desbordamiento aquí solo lo ve esto.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `crear-personaje-${marca}@example.com`,
    password: "password123",
    displayName: `Crea ${marca}`,
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

async function crearCampana(page: Page, nombre: string) {
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: nombre }).click();
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
}

test("crear un personaje con raza y clase del catálogo, y verlas en la hoja", async ({ page }) => {
  await registrarse(page);
  await crearCampana(page, "El pozo de los ecos");

  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await expect(page.getByRole("heading", { name: "Nuevo personaje" })).toBeVisible();

  // El catálogo se ofrece por su nombre, no por su clave: las opciones del `<select>` llevan el
  // nombre del catálogo como texto, nunca la clave cruda (un `<select>` nunca enseña su `value`
  // al usuario, así que la comprobación que importa es sobre las opciones, no sobre el texto
  // pintado del diálogo entero).
  const opcionesDeRaza = await page
    .getByLabel("Raza", { exact: true })
    .locator("option")
    .allTextContents();
  expect(opcionesDeRaza).toContain("Enano");
  expect(opcionesDeRaza).not.toContain("dwarf");
  const opcionesDeClase = await page
    .getByLabel("Clase", { exact: true })
    .locator("option")
    .allTextContents();
  expect(opcionesDeClase).toContain("Guerrero");
  expect(opcionesDeClase).not.toContain("fighter");

  await page.getByLabel("Nombre").fill("Durgan");
  await page.getByLabel("Raza", { exact: true }).selectOption({ label: "Enano" });
  await page.getByLabel("Clase", { exact: true }).selectOption({ label: "Guerrero" });
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByRole("heading", { name: "Nuevo personaje" })).toBeHidden();
  await page.getByRole("link", { name: /Durgan/ }).click();
  await expect(page.getByRole("heading", { name: "Durgan" })).toBeVisible();

  // La creación y el PATCH a la hoja fueron dos peticiones reales, no una simulada: la hoja
  // enseña la raza y la clase ya elegidas, no «sin elegir».
  await expect(page.getByLabel("Raza", { exact: true })).toHaveValue("dwarf");
  await expect(page.getByLabel("Clase", { exact: true })).toHaveValue("fighter");
});

test("el contenido del diálogo cabe en la ventana, a 1280×800 y a 390×844", async ({ page }) => {
  // **Se mide el contenido, no el cajón.** `role="dialog"` es el `<div>` `fixed inset-0` de
  // `Dialog.tsx` — cabe en la ventana POR CONSTRUCCIÓN, así que medir su `boundingBox` no
  // demuestra nada sobre lo que hay dentro. Lo que puede desbordar es el `<form>` del cuerpo
  // (`[data-dialog-cuerpo]`, la única zona que scrollea) y sus controles — aquí, el botón
  // «Guardar», que en el pie del cajón es lo primero que un dedo tiene que poder alcanzar entero.
  await registrarse(page);
  await crearCampana(page, "El pozo de los ecos, estrecho");
  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  const cuerpo = page.locator("[data-dialog-cuerpo]");
  await expect(cuerpo).toBeVisible();
  const boton = page.getByRole("button", { name: "Guardar" });

  for (const tamano of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(tamano);

    // El contenido no arrastra su propia caja a lo ancho — mismo criterio que
    // `bestiario.spec.ts` usa para la página entera, aquí sobre el cuerpo del cajón.
    const desborde = await cuerpo.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(desborde).toBeLessThanOrEqual(1);

    // El botón de guardar, alcanzable entero dentro de la ventana — sin scroll horizontal.
    const cajaBoton = await boton.boundingBox();
    expect(cajaBoton).not.toBeNull();
    if (!cajaBoton) continue;
    expect(cajaBoton.x).toBeGreaterThanOrEqual(0);
    expect(cajaBoton.x + cajaBoton.width).toBeLessThanOrEqual(tamano.width);
  }
});
