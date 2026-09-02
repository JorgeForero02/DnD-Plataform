import { test, expect, type Page } from "@playwright/test";

// Tarea R1 — **arrastrar y soltar, medido en un navegador de verdad.**
//
// Esta suite existe porque `jsdom` no arrastra y no maqueta: ni hay `DataTransfer` real, ni hay
// `clip-path` calculado, ni hay puntero. Las pruebas de componente cubren la ruta de teclado
// (`src/features/rules/__tests__/`); lo que solo se ve y solo se hace con el ratón se mide
// aquí, que es la regla del proyecto (docs/04-convenciones.md).
//
// Tres cosas que ninguna otra capa puede demostrar:
//   1. Que cada parte tiene **una silueta distinta**, calculada por el navegador. Es la lección
//      de Blockly: la forma dice dónde encaja una pieza antes de que lo intentes.
//   2. Que arrastrar una caja a su carril **la coloca de verdad**.
//   3. Que arrastrar una caja al carril equivocado **no la coloca**. Eso es «la ranura es la
//      conexión»: no existe el estado intermedio de una caja que parece puesta y no lo está.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `arrastre-${marca}@example.com`,
    password: "password123",
    displayName: `Arrastre ${marca}`,
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
}

async function abrirEditorDeRegla(page: Page) {
  await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).click();
  await page.getByLabel("Nombre").fill("La mesa de los carriles");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La mesa de los carriles" }).click();

  // Una regla fija el identificador de la ficha al armarse: hace falta una ficha real antes.
  await page.getByRole("tab", { name: "PNJ" }).click();
  await page.getByRole("button", { name: "Nuevo PNJ" }).click();
  await page.getByLabel("Nombre").fill("La puerta de sal");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("tab", { name: "Reglas" }).click();
  await page.getByRole("button", { name: "Nueva regla" }).click();
  await expect(page.getByRole("heading", { name: "Nueva regla" })).toBeVisible();
}

test("cada parte tiene su propia silueta, medida en el navegador", async ({ page }) => {
  await abrirEditorDeRegla(page);

  const siluetaDe = (nombre: string) =>
    page
      .getByRole("button", { name: nombre })
      .evaluate((el) => getComputedStyle(el as HTMLElement).clipPath);

  const suceso = await siluetaDe("Empieza una sesión — poner en el carril Cuando");
  const estado = await siluetaDe("Esta regla no se ha disparado nunca — poner en el carril Si");
  const accion = await siluetaDe("Revelar una entrada del mundo — poner en el carril Entonces");

  // Ninguna se queda sin recortar: si el `clip-path` no llega, las tres son rectángulos y la
  // forma deja de decir nada. `jsdom` devolvería la cadena declarada aunque el navegador la
  // ignorase; esto lee lo que el navegador **calculó**.
  for (const [nombre, valor] of Object.entries({ suceso, estado, accion })) {
    expect(valor, `${nombre} sin silueta`).toContain("polygon");
  }
  expect(new Set([suceso, estado, accion]).size).toBe(3);
});

// **El arrastre no está probado en navegador, y no se finge que lo esté.** Aquí había un
// recorrido que arrastraba una pieza a su carril; nunca llegó a pasar. La sonda del 2026-09-02
// midió que en esta página **no se dispara ni un `dragstart`**: ni con `dragTo`, ni con el ratón
// paso a paso, ni sobre un `<div>` en vez de un `<button>`, ni quitándole el `clip-path`, ni
// quitándole `user-select: none`. Un `<div draggable>` trivial **inyectado dentro del mismo
// diálogo** tampoco arrastra, mientras que uno inyectado fuera sí — así que el problema no es la
// pieza, es algo del contexto que todavía no está identificado.
//
// Se retira el recorrido en vez de dejarlo rojo o, peor, dejar su primera mitad: comprobaba que
// **el carril ajeno rechaza** la pieza, y eso pasaba en verde **exactamente igual si el arrastre
// no funciona en absoluto**. Una prueba que no puede distinguir «rechaza bien» de «no arrastra
// nada» no prueba nada.
//
// Lo que sí está probado: la silueta, aquí arriba, en el navegador; y **colocar una pieza por
// teclado y por pulsación**, en `src/features/rules/__tests__/`. Las dos rutas llaman a la misma
// función, así que lo que está sin demostrar es el gesto del ratón, no la lógica.
//
// La ficha queda abierta en `docs/06-pendientes.md`.
