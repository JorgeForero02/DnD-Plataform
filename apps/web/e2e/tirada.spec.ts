import { test, expect, type Page } from "@playwright/test";

// Tarea F3 — **los dos dados, con el descartado a la vista**, contra la API real.
//
// Por qué esta suite existe y no basta con las unitarias: el tachado del dado descartado es
// **maquetación**, y jsdom no maqueta — no hay `text-decoration` calculada, así que una prueba
// de componente puede estar en verde con la raya sin pintarse. Es exactamente el fallo del borde
// partido de las listas (docs/08-pruebas.md): toda la suite verde y el defecto en producción.
// Aquí se lee el estilo **calculado** del DOM real.
//
// Y lo que ninguna prueba con espías puede demostrar: que los dos dados que se pintan son los
// que el servidor tiró de verdad. El azar vive en `apps/api/src/rolls/rolls.service.ts`; esta
// prueba pide una tirada con ventaja y comprueba que llegan dos dados y que uno viene descartado.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `tirada-${marca}@example.com`,
    password: "password123",
    displayName: `Tirada ${marca}`,
  };
}

async function registrarse(page: Page) {
  const cuenta = nuevaCuenta();
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Mis campañas" })).toBeVisible();
  return cuenta;
}

/** Mismo guion que `hoja.spec.ts`: un guerrero enano de nivel 1, completo y derivado. */
async function personajeCompleto(page: Page) {
  await page.getByRole("button", { name: "Nueva campaña" }).click();
  await page.getByLabel("Nombre").fill("La mesa de los dados");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La mesa de los dados" }).click();

  await page.getByRole("tab", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill("Borin el Afortunado");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("link", { name: /Borin el Afortunado/ }).click();
  await expect(page.getByRole("heading", { name: "Borin el Afortunado" })).toBeVisible();

  await page.getByLabel("Raza", { exact: true }).selectOption("dwarf");
  await page.getByLabel("Clase", { exact: true }).selectOption("fighter");
  await page.getByLabel("Nivel", { exact: true }).fill("1");
  await page.getByLabel("Nivel", { exact: true }).blur();
  for (const [nombre, valor] of [
    ["Fuerza", "16"],
    ["Destreza", "12"],
    ["Constitución", "14"],
    ["Inteligencia", "10"],
    ["Sabiduría", "10"],
    ["Carisma", "8"],
  ] as [string, string][]) {
    const campo = page.getByLabel(nombre, { exact: true });
    await campo.fill(valor);
    await campo.blur();
  }
  // `exact` importa: desde que la hoja tiene su tarjeta de «Salvaciones de muerte», un
  // `getByText("Salvaciones")` casa con las dos y falla por modo estricto. El agente que la
  // añadió lo arregló en `hoja.spec.ts`, pero esta receta está copiada en tres ficheros más.
  await expect(page.getByText("Salvaciones", { exact: true })).toBeVisible({ timeout: 15_000 });
}

test("tirar con ventaja pinta los dos dados, tacha el descartado de verdad y desglosa la suma", async ({
  page,
}) => {
  await registrarse(page);
  await personajeCompleto(page);

  const fila = page.getByText("Salvación de Fuerza", { exact: true }).locator("..");

  // --- La decisión, antes de tirar: tres estados visibles a la vez, nunca un desplegable. ---
  await expect(fila.getByRole("radio", { name: "Normal" })).toBeChecked();
  await expect(fila.getByRole("radio", { name: "Ventaja", exact: true })).toBeVisible();
  await expect(fila.getByRole("radio", { name: "Desventaja" })).toBeVisible();
  await expect(fila.locator("select")).toHaveCount(0);

  // Y cada una lleva su frase: la del estado elegido se lee, y la de las otras dos es la
  // descripción accesible de su radio.
  // La frase existe **dos veces a propósito**: como descripción accesible del radio (invisible,
  // vía `aria-describedby`) y como texto visible del estado elegido. Aquí se mira la visible, que
  // es la que lee quien está en la mesa.
  await expect(fila.locator('[data-frase="elegida"]')).toHaveText("Un solo d20.");

  // --- Una tirada normal: un dado, y nadie promete que se descarte nada. ---
  await fila.getByRole("button", { name: "Tirar Salvación de Fuerza", exact: true }).click();
  await expect(fila.getByRole("status")).toBeVisible({ timeout: 10_000 });
  await expect(fila.locator("[data-dado]")).toHaveCount(1);
  // Se mira **el resultado**, no la fila entera: las descripciones accesibles de los radios de
  // ventaja y desventaja llevan «se queda el alto/bajo» siempre, y buscarlas en toda la fila
  // encontraría esas dos aunque la tirada normal no prometa nada.
  await expect(fila.getByRole("status").getByText(/se queda el/)).toHaveCount(0);
  // El desglose está siempre: nunca un número solo.
  await expect(fila.getByRole("status")).toContainText(/\d+ = \d+ dado/);

  // --- Con ventaja: dos dados, uno tachado, y el rótulo que dice cuál se queda. ---
  await fila.getByRole("radio", { name: "Ventaja", exact: true }).check();
  await expect(fila.locator('[data-frase="elegida"]')).toHaveText("Dos d20: se queda el alto.");
  await fila.getByRole("button", { name: "Tirar Salvación de Fuerza", exact: true }).click();

  await expect(fila.locator("[data-dado]")).toHaveCount(2, { timeout: 10_000 });
  await expect(fila.getByRole("status")).toContainText("se queda el alto");

  const descartado = fila.locator('[data-dado="descartado"]');
  await expect(descartado).toHaveCount(1);

  // **La medición.** Que el dado descartado esté en el DOM no basta: la gracia es verlo tachado.
  // Si alguien cambia la clase, quita el `line-through` o lo pisa con otra utilidad, esto se
  // pone rojo — y ninguna prueba de jsdom podría.
  const decoracion = await descartado.evaluate((el) => getComputedStyle(el).textDecorationLine);
  expect(decoracion).toBe("line-through");

  // Y sigue **a la vista**: tachado no es escondido.
  await expect(descartado).toBeVisible();
  const caja = await descartado.boundingBox();
  expect(caja).not.toBeNull();
  expect(caja!.width).toBeGreaterThan(0);
  expect(caja!.height).toBeGreaterThan(0);

  // El dado se **dibuja**: SVG, nunca un emoji ni un glifo de fuente.
  await expect(fila.locator('svg[data-icono="dado"]')).toHaveCount(2);

  // --- Ninguna enumeración del servidor llega a la pantalla. ---
  const cuerpo = await page.locator("body").innerText();
  for (const enumeracion of ["ADVANTAGE", "DISADVANTAGE", "TWENTY", "NO_DC", "SUCCESS"]) {
    expect(cuerpo).not.toContain(enumeracion);
  }

  // --- Desventaja: el rótulo cambia porque cambia lo que pasó. ---
  await fila.getByRole("radio", { name: "Desventaja" }).check();
  await fila.getByRole("button", { name: "Tirar Salvación de Fuerza", exact: true }).click();
  await expect(fila.getByRole("status")).toContainText("se queda el bajo", { timeout: 10_000 });
  await expect(fila.locator('[data-dado="descartado"]')).toHaveCount(1);
});
