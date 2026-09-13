import { test, expect, type Page } from "@playwright/test";

// **Ficha P2-3 — «Dar…» ofrecía un gesto y no traía con qué completarlo.**
//
// `fetchCharacters` llama a `CharactersService.list()`, que filtra `statblockRef: null` a
// propósito: esa lista es «quién se sienta a la mesa». El selector de destinatarios de «Dar…»
// (B4/B5) se construía **solo** con esa llamada, así que ningún PNJ podía recibir nada y un
// jugador con un PNJ cedido abría el cajón vacío.
//
// **Qué se mide aquí y no en `jsdom`.** La prueba de componente
// (`src/features/sessions/elenco/__tests__/DarObjeto.test.tsx`) monta el caso del jugador con la
// API simulada, que es la única forma de tenerlo: **hoy no existe ninguna puerta para ceder un
// PNJ** —`NpcsService.instanciar` pone al DM como dueño y ningún endpoint cambia `ownerId`—, así
// que ese caso no se puede montar desde un navegador. Lo que sí se puede, y es el mismo carril de
// datos, es la otra mitad del arreglo: que la segunda lista (`GET /npcs`) **llega de verdad al
// selector contra el servidor real**, con su `enabled` atado a abrir el cajón. Con la versión
// rota, el Ogro no está entre los destinatarios por mucho que esté en la mesa.
//
// **No mueve la autorización ni un milímetro**: quien decide si el objeto entra en esa bolsa es
// `requireOwnerOrDM` en `inventory.service.ts`, y sigue igual.

// Registrar, crear campaña, escribir un personaje, bajar un PNJ y arrancar la sesión antes de
// medir nada: el mismo presupuesto que `paso-1-goteras` y `archivar`.
test.setTimeout(90_000);

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `darpnj-${marca}@example.com`,
    password: "password123",
    displayName: `DarPnj ${marca}`,
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

test("el PNJ que está en la mesa aparece entre los destinatarios de «Dar…»", async ({ page }) => {
  const cuenta = await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La mesa del PNJ");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La mesa del PNJ" }).click();
  await expect(page.getByRole("heading", { name: "La mesa del PNJ" })).toBeVisible();

  // --- Un personaje de la mesa, que es quien lleva los mandos donde vive «Dar…» ---
  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill("Borin Barbaférrea");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  // --- Y un PNJ bajado a la mesa desde el bestiario ---
  // **Se cierra el cajón, no se navega.** «Personajes» y «Bestiario» son dos cajones del mismo
  // taller de la campaña: ya estamos donde hay que estar, y buscar aquí un enlace a la campaña es
  // buscar algo que la página no pinta porque no hace falta.
  await page.getByRole("button", { name: "Cerrar (Escape)" }).click();
  await page.getByRole("button", { name: "Bestiario" }).click();
  await expect(page.getByRole("dialog", { name: "Bestiario" })).toBeVisible();
  const ogro = page.getByTestId("ficha-de-criatura").filter({ hasText: "Ogro" }).first();
  await ogro.getByRole("button", { name: /Bajar a la mesa/i }).click();
  await expect(page.getByTestId("pnj-en-la-mesa")).toContainText("Ogro", { timeout: 15_000 });
  await page.getByRole("button", { name: "Cerrar (Escape)" }).click();

  // --- La sesión, con el personaje declarado presente ---
  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Nueva sesión" }).click();
  await page.getByLabel("Título").fill("El puerto en llamas");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByLabel(cuenta.displayName).check();
  await page
    .getByLabel(`Personaje de ${cuenta.displayName}`)
    .selectOption({ label: "Borin Barbaférrea" });
  await page.getByRole("button", { name: "Empezar la sesión" }).click();

  const barra = page.getByRole("status", { name: "Sesión en curso" });
  await expect(barra).toBeVisible({ timeout: 10_000 });
  await barra.getByRole("link", { name: "Ir a la mesa" }).click();

  // --- Y la medida: abrir «Dar…» y encontrar al Ogro entre los destinatarios ---
  const elenco = page.getByRole("region", { name: "En la mesa" });
  await expect(elenco.getByText("Borin Barbaférrea").first()).toBeVisible({ timeout: 15_000 });
  // Tarea 8 del pulido (C2: #1) — «Dar…» dejó de ser un botón de la fila: ahora es un ítem del
  // menú «…», `MenuDeAcciones.tsx`. Se abre «Más acciones sobre Borin Barbaférrea» y se elige
  // «Dar…» dentro.
  await elenco.getByRole("button", { name: "Más acciones sobre Borin Barbaférrea" }).click();
  await page.getByRole("menuitem", { name: "Dar…" }).click();

  const cajon = page.getByRole("dialog", { name: "Dar…" });
  await expect(cajon).toBeVisible();
  // El personaje de la mesa ya estaba antes del arreglo: se comprueba para que un cajón vacío por
  // cualquier otro motivo no se lea como «el PNJ no llegó».
  await expect(cajon.getByRole("radio", { name: /Borin Barbaférrea/ })).toBeVisible({
    timeout: 15_000,
  });
  // Y lo que el arreglo añade.
  await expect(cajon.getByRole("radio", { name: /Ogro/ })).toBeVisible({ timeout: 15_000 });
});
