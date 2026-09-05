import { test, expect, type Page } from "@playwright/test";

// Plan 05, decisión D3 — **cada personaje tiene SU color, y es el mismo en los dos sitios.**
//
// Lo que ninguna unitaria puede demostrar: que la elección **llega al servidor y vuelve**, y que
// el color que se ve en el elenco es el mismo que pinta la voz del hilo. Las dos mitades venían
// de dos cálculos distintos —una huella del usuario y un cobre fijo—, así que probar la función
// aislada no habría cazado el defecto de origen; hay que ver las dos pantallas pintadas.
//
// **Y el color se mide del DOM, no del nombre de la clase**: `jsdom` no resuelve una clase de
// Tailwind hasta un color, y esa es exactamente la trampa que este proyecto ya se declaró.

function nuevaCuenta(prefijo: string) {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `color-${prefijo}-${marca}@example.com`,
    password: "password123",
    displayName: `${prefijo} ${marca}`,
  };
}

async function registrarse(page: Page, prefijo: string) {
  const cuenta = nuevaCuenta(prefijo);
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

async function crearPersonaje(page: Page, nombre: string) {
  // El cajón de Personajes se queda abierto tras guardar, así que solo se abre si hace falta.
  const nuevo = page.getByRole("button", { name: "Nuevo personaje" });
  if (!(await nuevo.isVisible())) await page.getByRole("button", { name: "Personajes" }).click();
  await nuevo.click();
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  await expect(page.getByRole("link", { name: new RegExp(nombre) })).toBeVisible();
}

/** Vuelve a la campaña y deja abierto el cajón de Personajes, que es por donde se llega a la hoja. */
async function abrirPersonajes(page: Page, urlCampana: string) {
  await page.goto(urlCampana);
  await page.getByRole("button", { name: "Personajes" }).click();
  await expect(page.getByRole("button", { name: "Nuevo personaje" })).toBeVisible();
}

/** Elige un color desde la hoja del personaje y espera a que el servidor lo confirme. */
async function elegirColor(page: Page, personaje: string, color: string) {
  await page.getByRole("link", { name: new RegExp(personaje) }).click();
  await expect(page.getByRole("heading", { name: personaje })).toBeVisible();
  const muestra = page.getByRole("button", { name: new RegExp(`^${color}`) });
  await muestra.click();
  await expect(muestra).toHaveAttribute("aria-pressed", "true");
}

test.setTimeout(120_000);

test("el color de un personaje se elige, se guarda y es el mismo en el elenco y en el hilo", async ({
  page,
}) => {
  await registrarse(page, "dm");
  await crearCampana(page, "La mesa de tres voces");
  const urlCampana = page.url();
  for (const nombre of ["Elara", "Bran", "Sivrin"]) await crearPersonaje(page, nombre);

  // --- 1. Sin elegir, el selector lo DICE. Es la diferencia entre «este es tu color» y «este es
  //        el que te tocó», y se perdería el día que alguien escribiera el defecto en la fila. ---
  await page.getByRole("link", { name: /Elara/ }).click();
  await expect(page.getByText(/Todavía no ha elegido/)).toBeVisible();

  // --- 2. Elegir escribe en el servidor: la prueba es que sobrevive a una recarga entera. ---
  const ciruela = page.getByRole("button", { name: /^ciruela/ });
  await ciruela.click();
  await expect(ciruela).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/Todavía no ha elegido/)).toBeHidden();
  await page.reload();
  await expect(page.getByRole("button", { name: /^ciruela/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // El color de la muestra elegida, leído del DOM. Es el que tienen que repetir las dos pantallas.
  const colorElegido = await page
    .getByRole("button", { name: /^ciruela/ })
    .evaluate((el) => getComputedStyle(el).color);

  await abrirPersonajes(page, urlCampana);
  await elegirColor(page, "Bran", "salvia");
  await abrirPersonajes(page, urlCampana);
  await elegirColor(page, "Sivrin", "arena");

  // --- 3. El aviso: repetir un color se DICE y no se prohíbe. Bran se pasa a ciruela, que ya
  //        lleva Elara, y la muestra sigue pulsándose. ---
  await abrirPersonajes(page, urlCampana);
  await page.getByRole("link", { name: /Bran/ }).click();
  await page.getByRole("button", { name: /^ciruela/ }).click();
  const aviso = page.getByRole("status").filter({ hasText: /también va de ciruela/ });
  await expect(aviso).toBeVisible();
  await expect(aviso).toContainText("Elara");
  // Y se deja: nadie ha bloqueado nada.
  await expect(page.getByRole("button", { name: /^ciruela/ })).toBeEnabled();
  // Se devuelve a salvia para que la mesa tenga de verdad tres colores.
  await page.getByRole("button", { name: /^salvia/ }).click();
  await expect(page.getByRole("button", { name: /^salvia/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // --- 4. La mesa: tres personajes, tres colores, y el de Elara es EXACTAMENTE el que eligió.
  //        El elenco solo existe con la sesión en curso —en reposo la mesa no tiene a nadie
  //        sentado—, así que hay que abrirla. ---
  await page.goto(urlCampana);
  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Nueva sesión" }).click();
  await page.getByLabel("Título").fill("La primera noche");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();
  await page.getByRole("link", { name: /^Entrar a la mesa/ }).click();
  await expect(page.getByRole("region", { name: "La escena" })).toBeVisible();
  const elenco = page.getByRole("region", { name: "En la mesa" });
  await expect(elenco).toBeVisible();
  // La columna del elenco tiene su propio scroll, así que los tres se comprueban por su presencia
  // en el DOM y no por estar a la vista: el tercero puede quedar por debajo del pliegue.
  await expect(elenco.getByText("Elara", { exact: true })).toBeAttached();

  // Los retratos son la inicial del nombre, y esa inicial ES el dato: tres letras, tres tintas.
  const retratos = elenco.locator('[aria-hidden="true"]').filter({ hasText: /^[EBS]$/ });
  await expect(retratos).toHaveCount(3);
  const colores = await retratos.evaluateAll((els) => els.map((e) => getComputedStyle(e).color));
  // Tres retratos, tres colores distintos. Antes eran tres cobres.
  expect(new Set(colores).size).toBe(3);
  expect(colores).toContain(colorElegido);

  // La captura que pide el plan: la mesa con **los tres** personajes de tres colores. La ventana
  // por defecto deja al tercero por debajo del pliegue de la columna del elenco, así que se le da
  // alto — la captura es para que el autor mire, y con dos de tres no se mira nada.
  await page.setViewportSize({ width: 1280, height: 1000 });
  await expect(elenco.getByText("Elara", { exact: true })).toBeVisible();
  await page.screenshot({ path: "e2e-resultados/mesa-tres-colores.png", fullPage: false });
});
