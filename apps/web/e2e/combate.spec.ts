import { test, expect, type Page } from "@playwright/test";

// Tarea 2.5.6 — **el combate, medido en un navegador de verdad.**
//
// El servidor sabía llevar un encuentro desde 2.5.2 y ninguna pantalla lo consumía; su propio
// controlador lo decía. Esto es el camino entero: entrar en combate desde la mesa, ver el orden,
// pasar turno, y salir. Se mide aquí y no en `jsdom` porque lo que hay que demostrar es que **no
// se navega a ninguna parte** —la mesa sigue siendo la misma pantalla, con el elenco y el registro
// donde estaban— y eso es navegación, no maquetación.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `combate-${marca}@example.com`,
    password: "password123",
    displayName: `Combate ${marca}`,
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

test("el combate entero desde la mesa: entrar, ver el orden, pasar turno y salir", async ({
  page,
}) => {
  await registrarse(page);

  // --- Una campaña con su sesión, y dos personajes con hoja ---
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La emboscada");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La emboscada" }).click();

  for (const [nombre, destreza] of [
    ["Thora", "16"],
    ["Brann", "8"],
  ] as [string, string][]) {
    await page.getByRole("button", { name: "Personajes" }).click();
    await page.getByRole("button", { name: "Nuevo personaje" }).click();
    await page.getByLabel("Nombre").fill(nombre);
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
    await page.getByRole("link", { name: new RegExp(nombre) }).click();
    await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
    await page.getByLabel("Raza", { exact: true }).selectOption("dwarf");
    await page.getByLabel("Clase", { exact: true }).selectOption("fighter");
    // **Destrezas muy distintas a propósito**: la iniciativa la tira el servidor, y con un +3 y
    // un −1 el orden deja de ser un empate que se resuelve al azar. La prueba no comprueba QUIÉN
    // va primero —eso es un d20— sino que hay un orden y que se puede recorrer.
    for (const [etiqueta, valor] of [
      ["Fuerza", "14"],
      ["Destreza", destreza],
      ["Constitución", "14"],
      ["Inteligencia", "10"],
      ["Sabiduría", "10"],
      ["Carisma", "8"],
    ] as [string, string][]) {
      const campo = page.getByLabel(etiqueta, { exact: true });
      await campo.fill(valor);
      await campo.blur();
    }
    await expect(page.getByText("Salvaciones", { exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("link", { name: "La emboscada" }).click();
  }

  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Nueva sesión" }).click();
  await page.getByLabel("Título").fill("La emboscada del vado");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();

  // --- La mesa, sin combate ---
  await page
    .getByRole("status", { name: "Sesión en curso" })
    .getByRole("link", { name: "Ir a la mesa" })
    .click();
  await expect(page.getByRole("heading", { name: "La mesa", exact: true })).toBeVisible();
  await expect(page.getByText("La mesa no está en combate.")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("region", { name: "Orden de turnos" })).toBeHidden();

  // --- Entrar en combate. **Es un momento, no una pantalla**: la URL no cambia. ---
  const urlDeLaMesa = page.url();
  await page.getByRole("button", { name: "Entrar en combate" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("checkbox", { name: /Thora/ }).click();
  await dialogo.getByRole("checkbox", { name: /Brann/ }).click();
  await dialogo.getByRole("button", { name: "Tirar iniciativa" }).click();

  const tira = page.getByRole("region", { name: "Orden de turnos" });
  await expect(tira).toBeVisible({ timeout: 15_000 });
  expect(page.url()).toBe(urlDeLaMesa);
  // El elenco y el registro siguen donde estaban: la tira se pone ENCIMA, no en lugar de.
  await expect(page.getByRole("region", { name: "En la mesa" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Sucesos de la sesión" })).toBeVisible();

  await expect(tira).toContainText("Asalto 1");
  await expect(tira).toContainText("Thora");
  await expect(tira).toContainText("Brann");
  // **Uno y solo uno tiene el turno**, y se dice con palabras además de con color.
  await expect(tira.getByText("Le toca")).toHaveCount(1);

  // --- La tira no arrastra la página a lo ancho, y eso solo se puede medir aquí ---
  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(desborde).toBeLessThanOrEqual(1);

  // --- Pasar turno: dos personajes, así que al segundo paso se sube de asalto ---
  // **Se espera entre clic y clic, y no es cosmética**: mientras la mutación está en vuelo el
  // botón se deshabilita, así que dos clics seguidos son un clic y una pulsación perdida. La
  // primera versión de esta prueba los encadenaba y se quedaba en el asalto 1 — que es
  // exactamente lo que vería un jugador impaciente. Se espera a que el botón vuelva a estar
  // disponible, que es el mecanismo de verdad y no un texto que lo aproxime.
  const pasarTurno = page.getByRole("button", { name: "Pasar turno" });
  await pasarTurno.click();
  await expect(tira.getByRole("alert")).toHaveCount(0);
  await expect(pasarTurno).toBeEnabled({ timeout: 10_000 });
  await expect(tira).toContainText("Asalto 1");

  await pasarTurno.click();
  await expect(tira).toContainText("Asalto 2", { timeout: 10_000 });
  // Y el registro lo cuenta en castellano, no como clave del enumerado (ficha L1).
  const sucesos = page.getByRole("list", { name: "Sucesos de la sesión" });
  await expect(sucesos.getByText("Empieza el combate")).toBeVisible({ timeout: 10_000 });
  await expect(sucesos.getByText(/Asalto 2/)).toBeVisible();
  await expect(sucesos.getByText(/Sin traducir/)).toHaveCount(0);

  // --- El combate sobrevive a una recarga: es para lo que existe `current` ---
  await page.reload();
  await expect(page.getByRole("region", { name: "Orden de turnos" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("region", { name: "Orden de turnos" })).toContainText("Asalto 2");

  // --- Salir del combate: la tira se va, la mesa se queda ---
  await page.getByRole("button", { name: "Terminar el combate" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Terminar el combate" }).click();
  await expect(page.getByRole("region", { name: "Orden de turnos" })).toBeHidden({
    timeout: 15_000,
  });
  await expect(page.getByRole("region", { name: "En la mesa" })).toBeVisible();
  await expect(sucesos.getByText(/Termina el combate tras 2 asaltos/)).toBeVisible({
    timeout: 10_000,
  });
});
