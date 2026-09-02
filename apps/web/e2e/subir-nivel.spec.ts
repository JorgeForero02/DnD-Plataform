import { test, expect, type Page } from "@playwright/test";

// Tarea 2A.11 — la subida de nivel contra la API real (Docker + Postgres).
//
// Lo que ninguna prueba de componente puede demostrar: que el diff que se pinta es el que
// calcula el servidor de verdad (en RTL `api.ts` está espiado entero), que **pedir el previo con
// tirada no sube de nivel a nadie** —el nivel sigue siendo el mismo después de tirar—, y que
// confirmar deja la hoja con el nivel nuevo y sus PG máximos nuevos sin recargar la página.
//
// Mismo guion de arranque que `hoja.spec.ts`: cada prueba registra su propio usuario con correo
// único, así que no depende de datos sembrados ni se pisa con las demás.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `nivel-${marca}@example.com`,
    password: "password123",
    displayName: `Nivel ${marca}`,
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

async function crearPersonajeYAbrirFicha(page: Page, nombrePersonaje: string) {
  await page.getByRole("button", { name: "Nueva campaña" }).click();
  await page.getByLabel("Nombre").fill("La subida de nivel");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La subida de nivel" }).click();
  await expect(page.getByRole("heading", { name: "La subida de nivel" })).toBeVisible();

  await page.getByRole("tab", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill(nombrePersonaje);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("link", { name: new RegExp(nombrePersonaje) }).click();
  await expect(page.getByRole("heading", { name: nombrePersonaje })).toBeVisible();
}

/**
 * Guerrero enano de nivel 1. **La Constitución que cuenta es 16, no 14**: el enano da +2, y ese
 * bono lo aplica el motor de derivación, no la ficha. Con +3 de modificador y la media fija del
 * d10 (6), subir de nivel da **+9** puntos de golpe, y los máximos de nivel 1 son 13.
 *
 * Esta prueba nació diciendo +8 —contando la Constitución declarada y olvidando la raza— y
 * falló al integrarla. Es exactamente el error que la derivación con traza existe para no
 * cometer a mano, cometido a mano en la prueba de la derivación.
 */
async function completarFichaDeGuerreroEnano(page: Page) {
  // Edición en el sitio: ya no hay diálogo. Los desplegables guardan al elegir; los números, al
  // salir del campo — y sin ese `blur` la petición no sale, que es la regla de la pantalla.
  await page.getByLabel("Raza", { exact: true }).selectOption("dwarf");
  await page.getByLabel("Clase", { exact: true }).selectOption("fighter");
  await page.getByLabel("Nivel", { exact: true }).fill("1");
  await page.getByLabel("Nivel", { exact: true }).blur();

  const caracteristicas: [string, string][] = [
    ["Fuerza", "16"],
    ["Destreza", "12"],
    ["Constitución", "14"],
    ["Inteligencia", "10"],
    ["Sabiduría", "10"],
    ["Carisma", "8"],
  ];
  for (const [nombre, valor] of caracteristicas) {
    const campo = page.getByLabel(nombre, { exact: true });
    await campo.fill(valor);
    await campo.blur();
  }

  // La hoja está derivada cuando aparece la sección de salvaciones, que solo existe si el
  // catálogo resolvió raza y clase.
  await expect(page.getByText("Salvaciones")).toBeVisible({ timeout: 15_000 });
}

test("subir de nivel: el servidor propone el diff, tirar no aplica nada, y confirmar deja la hoja al nivel nuevo", async ({
  page,
}) => {
  await registrarse(page);
  await crearPersonajeYAbrirFicha(page, "Dain Yunquefirme");
  await completarFichaDeGuerreroEnano(page);
  await expect(page.getByLabel("Raza", { exact: true })).toHaveValue("dwarf");
  await expect(page.getByLabel("Nivel", { exact: true })).toHaveValue("1");

  // Los PG máximos de partida, leídos de la hoja antes de tocar nada: el diff tiene que
  // coincidir con ellos, no con un número inventado por la prueba.
  const bloquePg = page.getByText("Puntos de golpe", { exact: true }).locator("..");
  const maximoAntes = Number((await bloquePg.innerText()).match(/(\d+)\s*\/\s*(\d+)/)![2]);

  // --- El previo ---
  await page.getByRole("button", { name: "Subir a nivel 2" }).click();
  const dialogo = page.getByRole("dialog", { name: "Subir de nivel" });
  await expect(dialogo).toBeVisible();

  await expect(dialogo.getByText("Nivel 1 → 2")).toBeVisible({ timeout: 10_000 });
  // La media fija del SRD para un d10 es 6; con la Constitución 16 del enano (+3), +9.
  await expect(dialogo.getByText(`${maximoAntes} → ${maximoAntes + 9}`)).toBeVisible();
  await expect(dialogo.getByText("(+9)")).toBeVisible();
  await expect(dialogo.getByText("1d10 → 2d10")).toBeVisible();
  // El bonificador de competencia no cambia de 1 a 2, y la pantalla lo dice en vez de callarlo.
  await expect(dialogo.getByText("No cambia (+2)")).toBeVisible();
  // Aptitud de nivel 2 del guerrero, con su origen traducido — nunca «class».
  await expect(dialogo.getByText("Clase", { exact: true })).toBeVisible();
  expect(await dialogo.innerText()).not.toContain("subclass");
  expect(await dialogo.innerText()).not.toContain("AVERAGE");

  // --- Tirar el dado NO sube de nivel ---
  await page.getByRole("button", { name: "Tirar el dado de golpe" }).click();
  await expect(dialogo.getByText(/sacaste \d+/)).toBeVisible({ timeout: 10_000 });
  // La prueba de que la tirada no aplicó nada: el botón que abre este diálogo sigue ofreciendo
  // el nivel 2, y la cabecera sigue diciendo nivel 1.
  await expect(dialogo.getByText(/Nivel 1 → 2/)).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialogo).toBeHidden();
  await expect(page.getByLabel("Raza", { exact: true })).toHaveValue("dwarf");
  await expect(page.getByLabel("Nivel", { exact: true })).toHaveValue("1");
  await expect(page.getByRole("button", { name: "Subir a nivel 2" })).toBeVisible();

  // --- Confirmar ---
  await page.getByRole("button", { name: "Subir a nivel 2" }).click();
  await expect(dialogo.getByText("Nivel 1 → 2")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Confirmar subida de nivel" }).click();
  await expect(dialogo).toBeHidden({ timeout: 10_000 });

  // La hoja se refresca sola —sin recargar— porque la mutación invalida su clave. Si esta
  // aserción se hiciera tras un `reload()`, pasaría por construcción y no probaría nada.
  // El nivel nuevo se lee en su propio campo, que es ahora la única fuente en pantalla.
  await expect(page.getByLabel("Nivel", { exact: true })).toHaveValue("2", { timeout: 10_000 });
  await expect(bloquePg).toContainText(`/ ${maximoAntes + 9}`, { timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Subir a nivel 3" })).toBeVisible();
});
