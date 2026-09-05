import { test, expect, type Browser, type Page } from "@playwright/test";

// Plan 06, ficha M9 — **el camino entero de archivar**, contra la API real.
//
// Es lo único que demuestra que la ficha está cerrada de verdad: el servidor sabía archivar
// desde 2.5.8 y la web no llamaba a ninguna de sus tres rutas. Un recorrido que solo pulsara el
// botón probaría que el botón existe; lo que hace falta probar es que el personaje **sale de la
// lista, se encuentra en el archivo y vuelve**.
//
// Ninguna unitaria puede: `charactersKey` y su hijo `archived` son dos consultas distintas que
// una sola mutación tiene que dejar al día, y eso solo se ve con las dos listas pintadas por
// datos de verdad.

function nuevaCuenta(prefijo: string) {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `archivar-${prefijo}-${marca}@example.com`,
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

/** Abre el cajón de Personajes del taller (B4: es un cajón, no una pestaña). */
async function abrirPersonajes(page: Page) {
  await page.getByRole("button", { name: "Personajes" }).click();
  await expect(page.getByRole("button", { name: "Nuevo personaje" })).toBeVisible();
}

async function crearPersonaje(page: Page, nombre: string) {
  await abrirPersonajes(page);
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  await expect(page.getByRole("link", { name: new RegExp(nombre) })).toBeVisible();
}

// La hoja monta el motor de reglas entero y hace varias peticiones por personaje; con dos
// contextos de navegador en el segundo recorrido, los 30 s por defecto se quedan cortos. Se le
// da presupuesto en vez de recortar lo que comprueba, igual que hizo `invitacion.spec.ts`.
test.setTimeout(90_000);

test("archivar y devolver: sale de la lista, se encuentra en el archivo y vuelve", async ({
  page,
}) => {
  await registrarse(page, "dm");
  await crearCampana(page, "El archivo de la mesa");
  await crearPersonaje(page, "Kaelith");

  // --- La ficha, que es donde vive el gesto: junto a borrar, no en la mesa ---
  await page.getByRole("link", { name: /Kaelith/ }).click();
  await expect(page.getByRole("heading", { name: "Kaelith" })).toBeVisible();

  // Archivar cuesta MENOS que borrar, y se ve: los dos están, y el que archiva no lleva el
  // filete de peligro. Lo que se mide es el estilo **calculado**, porque `jsdom` no maqueta y
  // esta diferencia es exactamente la que el plan pide que se note.
  const archivar = page.getByRole("button", { name: "Archivar" });
  const borrar = page.getByRole("button", { name: "Borrar" });
  await expect(archivar).toBeVisible();
  await expect(borrar).toBeVisible();
  const bordeArchivar = await archivar.evaluate((el) => getComputedStyle(el).borderTopColor);
  const bordeBorrar = await borrar.evaluate((el) => getComputedStyle(el).borderTopColor);
  expect(bordeArchivar).not.toBe(bordeBorrar);

  // --- La confirmación dice la consecuencia y que se recupera, nunca «¿estás seguro?» ---
  await archivar.click();
  await expect(page.getByText(/sale de la lista de personajes/)).toBeVisible();
  await expect(page.getByText(/No se pierde nada/)).toBeVisible();
  await expect(page.getByText(/vuelve desde "Archivados"/)).toBeVisible();
  await expect(page.getByText(/seguro/i)).toBeHidden();

  await page.getByRole("button", { name: "Sí, archivar" }).click();

  // --- Desaparece de la lista y aparece en el archivo ---
  await expect(page.getByRole("heading", { name: "El archivo de la mesa" })).toBeVisible({
    timeout: 10_000,
  });
  await abrirPersonajes(page);
  await expect(page.getByRole("link", { name: /Kaelith/ })).toBeHidden();

  const archivo = page.getByRole("region", { name: "Archivados" });
  await expect(archivo).toBeVisible({ timeout: 10_000 });
  await expect(archivo.getByText("Kaelith")).toBeVisible();

  // El hueco vacío **nombra a los archivados**: sin esa frase, una campaña con todos sus
  // personajes archivados se lee como una campaña que los perdió.
  await expect(page.getByText(/1 personaje archivado/)).toBeVisible();

  // --- Y vuelve: la puerta de salida es lo que separa archivar de un borrado lento ---
  await archivo.getByRole("button", { name: "Devolver a la mesa" }).click();
  await expect(page.getByRole("link", { name: /Kaelith/ })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("region", { name: "Archivados" })).toBeHidden();
});

test("el suceso de archivar sale en el registro, en español y con el nombre del personaje", async ({
  browser,
}: {
  browser: Browser;
}) => {
  // **Hace falta un jugador de verdad, y el motivo es una medición, no un capricho.** El hilo de
  // la mesa filtra por la sesión abierta (`MesaDeSesion.tsx:73` pasa `sessionId`, y
  // `game-events.service.ts:143` filtra estricto), y el suceso de archivar se guarda **sin
  // sesión** (`characters.service.ts:157` no manda ninguna) — archivar es un acto de la campaña,
  // no de una partida. Y el DM en reposo ve el taller, que no tiene hilo
  // (`MesaDeSesion.tsx:138`). El único sitio donde esa línea se lee hoy es la mesa en reposo de
  // un jugador, que es justo lo que este recorrido monta. Queda anotado en `docs/06-pendientes.md`.
  const dmContext = await browser.newContext();
  const dmPage = await dmContext.newPage();
  await registrarse(dmPage, "dm");
  await crearCampana(dmPage, "El registro no miente");

  await dmPage.getByRole("tab", { name: "Ajustes" }).click();
  await dmPage.getByRole("button", { name: "Generar invitación" }).click();
  const enlace = dmPage.getByLabel("Enlace de invitación");
  await expect(enlace).toBeVisible();
  const invitacion = await enlace.inputValue();

  const jugadorContext = await browser.newContext();
  const jugadorPage = await jugadorContext.newPage();
  await registrarse(jugadorPage, "jugador");
  await jugadorPage.goto(invitacion);
  await jugadorPage.getByRole("button", { name: "Unirse a la campaña" }).click();
  await expect(jugadorPage.getByRole("heading", { name: "El registro no miente" })).toBeVisible({
    timeout: 15_000,
  });

  // El jugador archiva **el suyo**: la autorización es del servidor (`requireEditable`, dueño o
  // DM), y este es el caso del dueño.
  await crearPersonaje(jugadorPage, "Sorrel");
  await jugadorPage.getByRole("link", { name: /Sorrel/ }).click();
  await expect(jugadorPage.getByRole("heading", { name: "Sorrel" })).toBeVisible();
  await jugadorPage.getByRole("button", { name: "Archivar" }).click();
  await jugadorPage.getByRole("button", { name: "Sí, archivar" }).click();
  await expect(jugadorPage.getByRole("heading", { name: "El registro no miente" })).toBeVisible({
    timeout: 10_000,
  });

  // La línea ya estaba traducida desde 2.5.8 (`features/sessions/linea-de-log.ts:221`); lo que
  // no existía era nada que la escribiera desde la web.
  const url = jugadorPage.url();
  await jugadorPage.goto(`${url.split("?")[0]}/sesion`);
  const sucesos = jugadorPage.getByRole("list", { name: "Sucesos de la sesión" });
  await expect(sucesos.getByText("Se archiva a Sorrel")).toBeVisible({ timeout: 15_000 });

  await dmContext.close();
  await jugadorContext.close();
});
