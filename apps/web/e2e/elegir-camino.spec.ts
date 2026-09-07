import { test, expect, type Page } from "@playwright/test";

// Encargo A8 (2026-09-07) — el camino (subclase) contra la API real (Docker + Postgres).
//
// Lo que ninguna prueba de componente puede demostrar: que elegir un camino en la hoja de
// verdad, contra el servidor de verdad, hace aparecer su rasgo **sin recargar la página** — la
// misma garantía que ya prueba `subir-nivel.spec.ts` para el nivel. El fallo que este encargo
// arregla vivía justo aquí: antes de A8 el rasgo del camino aparecía SIN elegir nada, porque
// `resolve.ts` recorría todas las subclases de la clase sin mirar la elección.
//
// Mismo guion de arranque que `subir-nivel.spec.ts`: cada prueba registra su propio usuario con
// correo único, así que no depende de datos sembrados ni se pisa con las demás.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `camino-${marca}@example.com`,
    password: "password123",
    displayName: `Camino ${marca}`,
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

async function crearPersonajeYAbrirFicha(page: Page, nombrePersonaje: string) {
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("El camino elegido");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "El camino elegido" }).click();
  await expect(page.getByRole("heading", { name: "El camino elegido" })).toBeVisible();

  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill(nombrePersonaje);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("link", { name: new RegExp(nombrePersonaje) }).click();
  await expect(page.getByRole("heading", { name: nombrePersonaje })).toBeVisible();
}

/**
 * Bárbaro humano de nivel 3 — el nivel exacto en el que el SRD hace elegir senda primordial
 * («Primal Path», nivel 3, SRD 5.1). Por debajo de ese nivel el selector de camino ni se pinta
 * (regla vinculante de la pantalla), así que la prueba tiene que llegar a nivel 3 para poder
 * verlo.
 */
async function completarFichaDeBarbaroHumano(page: Page) {
  await page.getByLabel("Raza", { exact: true }).selectOption("human");
  await page.getByLabel("Clase", { exact: true }).selectOption("barbarian");
  await page.getByLabel("Nivel", { exact: true }).fill("3");
  await page.getByLabel("Nivel", { exact: true }).blur();

  const caracteristicas: [string, string][] = [
    ["Fuerza", "16"],
    ["Destreza", "12"],
    ["Constitución", "14"],
    ["Inteligencia", "8"],
    ["Sabiduría", "10"],
    ["Carisma", "8"],
  ];
  for (const [nombre, valor] of caracteristicas) {
    const campo = page.getByLabel(nombre, { exact: true });
    await campo.fill(valor);
    await campo.blur();
  }

  // La hoja está derivada cuando aparece la sección de salvaciones. `exact` importa: desde que
  // la hoja tiene su tarjeta de «Salvaciones de muerte», un `getByText("Salvaciones")` casa con
  // las dos y falla por modo estricto (misma trampa documentada en `subir-nivel.spec.ts`).
  await expect(page.getByText("Salvaciones", { exact: true })).toBeVisible({ timeout: 15_000 });
}

test("elegir camino en la hoja hace aparecer su rasgo, sin recargar", async ({ page }) => {
  await registrarse(page);
  await crearPersonajeYAbrirFicha(page, "Grudmar Puñoveloz");
  await completarFichaDeBarbaroHumano(page);

  // --- Antes de elegir: la hoja avisa, y el rasgo del camino NO está ---
  // Es el fallo vivo que A8 arregla: antes de esta tarea, "Frenesí" aparecía aquí sin que nadie
  // lo hubiera elegido.
  await expect(page.getByText(/Todavía no has elegido un camino/)).toBeVisible({
    timeout: 10_000,
  });
  const rasgos = page.getByRole("region", { name: "rasgos y aptitudes" });
  await expect(rasgos.getByText("Frenesí")).not.toBeVisible();

  // --- El selector de camino: radios, con su frase, y el nombre resuelto (nunca "berserker") ---
  const radio = page.getByRole("radio", { name: "Senda del berserker" });
  await expect(radio).toBeVisible();
  await expect(page.getByText(/^berserker$/)).toHaveCount(0);

  // --- Elegir ES la acción completa: no hay botón de guardar que pulsar ---
  await radio.check();
  await expect(radio).toBeChecked({ timeout: 10_000 });

  // --- El rasgo aparece SIN recargar la página ---
  // Si esta aserción se hiciera tras un `page.reload()`, pasaría por construcción y no probaría
  // nada — mismo criterio que ya deja escrito `subir-nivel.spec.ts` para el nivel.
  await expect(rasgos.getByText("Frenesí")).toBeVisible({ timeout: 10_000 });

  // Y el aviso de "falta elegir camino" se retira, porque ya se eligió uno válido.
  await expect(page.getByText(/Todavía no has elegido un camino/)).not.toBeVisible();
});
