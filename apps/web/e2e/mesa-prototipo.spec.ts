import path from "node:path";
import { test, expect, type Browser, type Page } from "@playwright/test";

// Task 6 de 3A.3 — **la mesa medida contra el HTML del prototipo** (D-CF-149,
// `prototipo/mesa/2026-09-18-prototipo-mesa.html`, decisión del autor del 2026-09-18).
//
// Dos cosas en un solo fichero, y las dos a propósito:
//
//  1. **Capturas para poner al lado del prototipo.** DM y jugador, a 1280×800 y a 390×844, en
//     modo «Con tablero» (marco + barra) y en modo «Sin tablero» (crónica: el registro en el
//     centro). Y el propio HTML del prototipo abierto por `file://` a los dos anchos, para que
//     la comparación no dependa de una captura vieja. Van a `apps/web/e2e-resultados/`, que se
//     commitea (como las de `desbordes.spec.ts`): son el reconocimiento visual para el autor.
//  2. **Seis medidas de disposición**, las del plan («Cómo se mide en el navegador contra el
//     prototipo»): tres columnas para el DM y dos para el jugador en crónica, sin scroll de
//     página; una sola banda; la franja de combate entre la banda y el `main` con la economía
//     como estado; la barra de acciones debajo del marco con sus cinco botones a la vista; el
//     registro encima de las herramientas en la lateral del DM; y ningún «Registro en vivo».
//
// El fixture es el del prototipo en pequeño: un DM, dos jugadores (Sylas, mago; Corvin,
// guerrero), un goblin instanciado y revelado, una sesión en curso y un encuentro `ACTIVE` con los
// tres. La «sala del tablero» es `public/tablero-de-prueba.html`, servida por Vite en el mismo
// origen — el marco carga de verdad, sin salir a internet.

test.setTimeout(300_000);
test.use({ colorScheme: "dark" });

const SALIDA = "e2e-resultados";
const PROTOTIPO = path.resolve(__dirname, "../../../prototipo/mesa/2026-09-18-prototipo-mesa.html");

function nuevaCuenta(prefijo: string) {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
  return {
    email: `proto-${prefijo}-${marca}@example.com`,
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

async function comoLaSesion(page: Page) {
  const token = await page.evaluate(() => window.localStorage.getItem("dnd_token"));
  return { Authorization: `Bearer ${token}` };
}

async function crearCampana(page: Page, nombre: string) {
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: nombre }).click();
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
  return page.url().split("/campaigns/")[1].split(/[/?]/)[0];
}

async function generarInvitacion(page: Page): Promise<string> {
  await page.getByRole("tab", { name: "Ajustes" }).click();
  await page.getByRole("button", { name: "Generar invitación" }).click();
  return page.getByLabel("Enlace de invitación").inputValue();
}

async function unirseDesdeInvitacion(page: Page, enlace: string, prefijo: string) {
  await page.goto(enlace);
  await page.getByRole("link", { name: "Crear cuenta" }).click();
  const cuenta = nuevaCuenta(prefijo);
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.getByRole("button", { name: "Unirse a la campaña" }).click();
}

/** Guarda la página estática de `public/` como «sala del tablero», desde Ajustes. */
async function guardarSalaDePrueba(page: Page, campaignId: string) {
  const sala = `${new URL(page.url()).origin}/tablero-de-prueba.html`;
  await page.goto(`/campaigns/${campaignId}?seccion=settings`);
  await page.getByRole("tab", { name: "Ajustes" }).click();
  await page.getByLabel("Dirección de la sala").fill(sala);
  await page.getByRole("button", { name: "Guardar la sala" }).click();
  await expect(page.getByRole("button", { name: "Quitar la sala" })).toBeVisible();
}

async function empezarSesion(page: Page, titulo: string) {
  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Nueva sesión" }).click();
  await page.getByLabel("Título").fill(titulo);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();
  await expect(page.getByRole("status", { name: "Sesión en curso" })).toBeVisible({
    timeout: 10_000,
  });
}

async function abrirLaMesa(page: Page, campaignId: string) {
  await page.goto(`/campaigns/${campaignId}/sesion`);
  await expect(page.getByRole("banner", { name: "Estado de la mesa" })).toBeVisible({
    timeout: 10_000,
  });
}

/**
 * Un personaje de jugador con nivel 3 y su clase (mismo atajo que `barra-de-acciones.spec.ts`:
 * nivel ANTES que clase, porque la hoja lee el nivel al sembrar recursos).
 */
async function montarPersonaje(
  dm: Page,
  jugador: Page,
  campaignId: string,
  nombre: string,
  clase: "wizard" | "fighter",
) {
  await jugador.getByRole("button", { name: "Personajes" }).click();
  await jugador.getByRole("button", { name: "Nuevo personaje" }).click();
  await jugador.getByLabel("Nombre").fill(nombre);
  await jugador.getByRole("button", { name: "Guardar" }).click();
  await expect(jugador.getByRole("button", { name: "Guardar" })).toBeHidden();
  await jugador.getByRole("link", { name: new RegExp(nombre) }).click();
  await expect(jugador.getByRole("heading", { name: nombre })).toBeVisible();
  const characterId = jugador.url().split("/personajes/")[1].split(/[/?]/)[0];

  const headersDm = await comoLaSesion(dm);
  const subida = await dm.request.patch(`/api/campaigns/${campaignId}/characters/${characterId}`, {
    headers: headersDm,
    data: { level: 3 },
  });
  expect(subida.ok()).toBe(true);

  const headersJugador = await comoLaSesion(jugador);
  const hoja = await jugador.request.patch(
    `/api/campaigns/${campaignId}/characters/${characterId}/sheet`,
    {
      headers: headersJugador,
      data:
        clase === "wizard"
          ? {
              abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10 },
              race: { source: "SRD", key: "human" },
              class: { source: "SRD", key: "wizard" },
              choices: { "wizard-skills": ["arcana", "history"] },
            }
          : {
              abilities: { str: 16, dex: 12, con: 15, int: 8, wis: 10, cha: 11 },
              race: { source: "SRD", key: "human" },
              class: { source: "SRD", key: "fighter" },
            },
    },
  );
  expect(hoja.ok()).toBe(true);
  if (clase === "wizard") {
    const preparar = await jugador.request.put(
      `/api/campaigns/${campaignId}/characters/${characterId}/spellbook/magic-missile`,
      { headers: headersJugador, data: { estado: "PREPARADO" } },
    );
    expect(preparar.ok()).toBe(true);
  }
  await jugador.goto(`/campaigns/${campaignId}`);
  return characterId;
}

/** El goblin: instanciado, revelado a la mesa y con PG a tope. */
async function montarGoblin(dm: Page, campaignId: string) {
  const headersDm = await comoLaSesion(dm);
  const instanciado = await dm.request.post(`/api/campaigns/${campaignId}/npcs`, {
    headers: headersDm,
    data: { ref: "SRD:goblin", count: 1, hp: "AVERAGE" },
  });
  expect(instanciado.ok()).toBe(true);
  const [goblin] = await instanciado.json();
  const revelado = await dm.request.post(
    `/api/campaigns/${campaignId}/characters/${goblin.id}/reveal`,
    { headers: headersDm },
  );
  expect(revelado.ok()).toBe(true);
  return goblin.id as string;
}

/** Sin scroll de página: la mesa ocupa la ventana y cada panel scrollea por dentro. */
async function sinScrollDePagina(page: Page) {
  const medida = await page.evaluate(() => ({
    alto: document.documentElement.scrollHeight,
    ventana: window.innerHeight,
    ancho: document.documentElement.scrollWidth,
    ventanaAncho: window.innerWidth,
  }));
  expect(medida.alto).toBeLessThanOrEqual(medida.ventana + 1);
  expect(medida.ancho).toBeLessThanOrEqual(medida.ventanaAncho + 1);
}

/** Cuántas columnas tiene la rejilla del `main` (las «pistas» de `grid-template-columns`). */
async function columnasDelMain(page: Page) {
  return page.locator("main").evaluate((el) => {
    const pistas = getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/);
    return pistas.filter((p) => p !== "").length;
  });
}

async function ponerModo(page: Page, modo: "Con tablero" | "Sin tablero") {
  await page.getByRole("radio", { name: modo }).click();
  await expect(page.getByRole("radio", { name: modo })).toHaveAttribute("aria-checked", "true");
}

test("la mesa se ve como el prototipo: capturas DM/jugador a 1280 y 390, con y sin tablero, y seis medidas", async ({
  browser,
}: {
  browser: Browser;
}) => {
  const dmContext = await browser.newContext();
  const sylasContext = await browser.newContext();
  const corvinContext = await browser.newContext();
  const dm = await dmContext.newPage();
  const sylas = await sylasContext.newPage();
  const corvin = await corvinContext.newPage();

  await registrarse(dm, "dm");
  const campaignId = await crearCampana(dm, "La Costa de las Espadas");

  // Una invitación por jugador: cada enlace es de un solo uso.
  await unirseDesdeInvitacion(sylas, await generarInvitacion(dm), "sylas");
  await expect(sylas.getByRole("heading", { name: "La Costa de las Espadas" })).toBeVisible();
  await dm.goto(`/campaigns/${campaignId}`);
  await unirseDesdeInvitacion(corvin, await generarInvitacion(dm), "corvin");
  await expect(corvin.getByRole("heading", { name: "La Costa de las Espadas" })).toBeVisible();

  await montarPersonaje(dm, sylas, campaignId, "Sylas", "wizard");
  await montarPersonaje(dm, corvin, campaignId, "Corvin", "fighter");
  await montarGoblin(dm, campaignId);
  await guardarSalaDePrueba(dm, campaignId);

  await dm.goto(`/campaigns/${campaignId}`);
  await expect(dm.getByRole("heading", { name: "La Costa de las Espadas" })).toBeVisible();
  await empezarSesion(dm, "Los guardias del muelle");

  await abrirLaMesa(dm, campaignId);
  await abrirLaMesa(sylas, campaignId);
  await abrirLaMesa(corvin, campaignId);

  // Una línea de relato en el registro, para que el hilo no salga vacío en la foto.
  await dm.getByLabel("Qué anotar").fill("Los faroles del muelle chisporrotean. Klarg ruge.");
  await dm.getByRole("button", { name: "Nota" }).click();

  // --- El encuentro, con los tres: cada jugador tira su iniciativa ---
  await dm.getByRole("button", { name: "Entrar en combate" }).click();
  const dialogoDeCombate = dm.getByRole("dialog", { name: "Entrar en combate" });
  await dialogoDeCombate.getByRole("checkbox", { name: /Sylas/ }).click();
  await dialogoDeCombate.getByRole("checkbox", { name: /Corvin/ }).click();
  await dialogoDeCombate.getByRole("checkbox", { name: /Goblin/ }).click();
  await dialogoDeCombate.getByRole("button", { name: "Pedir iniciativa" }).click();

  for (const jugador of [sylas, corvin]) {
    await expect(jugador.getByText("EMPIEZA EL COMBATE")).toBeVisible({ timeout: 15_000 });
    await jugador.getByRole("button", { name: "Tirar iniciativa" }).click();
  }
  for (const page of [dm, sylas, corvin]) {
    await expect(page.getByRole("region", { name: "Orden de turnos" })).toBeVisible({
      timeout: 20_000,
    });
  }
  // Sylas apunta al goblin: el chip de objetivo de la barra, como en el prototipo.
  await sylas
    .getByRole("region", { name: "En la mesa" })
    .getByRole("button", { name: "Apuntar a Goblin" })
    .click();

  // ================= Modo «Con tablero» =================
  for (const [page, quien] of [
    [dm, "dm"],
    [sylas, "jugador"],
  ] as const) {
    await page.setViewportSize({ width: 1280, height: 800 });
    await ponerModo(page, "Con tablero");
    await expect(
      page.frameLocator("iframe[title='Sala del tablero']").getByRole("heading", { level: 1 }),
    ).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SALIDA}/mesa-${quien}-1280.png` });
  }

  // --- Medida 1: tres columnas para el DM, sin scroll de página ---
  expect(await columnasDelMain(dm)).toBe(3);
  await sinScrollDePagina(dm);

  // --- Medida 2: UNA banda, con título de la escena, lugar y reloj; no existe «La escena» ---
  const banda = dm.getByRole("banner", { name: "Estado de la mesa" });
  await expect(banda).toContainText("Los guardias del muelle");
  await expect(banda).toContainText(/Día \d+/);
  await expect(dm.getByRole("region", { name: "La escena" })).toHaveCount(0);

  // --- Medida 3: la franja de combate entre la banda y el main, economía como estado ---
  const franja = dm.getByRole("region", { name: "Orden de turnos" });
  const cajaBanda = (await banda.boundingBox())!;
  const cajaFranja = (await franja.boundingBox())!;
  const cajaMain = (await dm.locator("main").boundingBox())!;
  expect(cajaFranja.y).toBeGreaterThanOrEqual(cajaBanda.y + cajaBanda.height - 1);
  expect(cajaFranja.y + cajaFranja.height).toBeLessThanOrEqual(cajaMain.y + 1);
  await expect(sylas.getByRole("status", { name: "Economía del turno" })).toBeVisible();
  await expect(sylas.getByRole("button", { name: /Usar mi/ })).toHaveCount(0);

  // --- Medida 4: la barra debajo del marco, dentro de la columna central, cinco botones ---
  const barra = sylas.getByRole("region", { name: "Barra de acciones" });
  const marco = sylas.locator("iframe[title='Sala del tablero']");
  const cajaMarco = (await marco.boundingBox())!;
  const cajaBarra = (await barra.boundingBox())!;
  expect(cajaBarra.y).toBeGreaterThanOrEqual(cajaMarco.y + cajaMarco.height - 1);
  expect(Math.abs(cajaBarra.x - cajaMarco.x)).toBeLessThan(12);
  for (const nombre of [/^Ataques/, /^Conjuros/, /^Aptitudes/, /^Objetos/, /^Esquivar, ayudar/]) {
    await expect(barra.getByRole("button", { name: nombre })).toBeVisible();
  }

  // --- Medida 5: en la lateral del DM, el registro encima de las herramientas ---
  const registroDm = dm.getByRole("region", { name: "Registro de la sesión" });
  const herramientas = dm.getByRole("complementary", { name: "Herramientas del DM" });
  const cajaRegistro = (await registroDm.boundingBox())!;
  const cajaHerramientas = (await herramientas.boundingBox())!;
  expect(cajaRegistro.y + cajaRegistro.height).toBeLessThanOrEqual(cajaHerramientas.y + 1);
  expect(Math.abs(cajaRegistro.x - cajaHerramientas.x)).toBeLessThan(12);

  // --- Medida 6: el cajón murió ---
  await expect(dm.getByRole("region", { name: "Registro en vivo" })).toHaveCount(0);

  // --- A 390: solo la foto (D-CF-26: `mesa-en-estrecho` sigue en `test.fail`) ---
  for (const [page, quien] of [
    [dm, "dm"],
    [sylas, "jugador"],
  ] as const) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SALIDA}/mesa-${quien}-390.png` });
  }

  // ================= Modo «Sin tablero» (crónica) =================
  for (const [page, quien] of [
    [dm, "dm"],
    [sylas, "jugador"],
  ] as const) {
    await page.setViewportSize({ width: 1280, height: 800 });
    await ponerModo(page, "Sin tablero");
    await expect(page.getByRole("region", { name: "Registro de la sesión" })).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SALIDA}/mesa-${quien}-cronica-1280.png` });
  }
  // Medida 1 (bis): en crónica el DM sigue con tres columnas y el jugador se queda con dos.
  expect(await columnasDelMain(dm)).toBe(3);
  expect(await columnasDelMain(sylas)).toBe(2);
  await sinScrollDePagina(dm);
  await sinScrollDePagina(sylas);

  // ================= El prototipo, tal cual, por file:// =================
  const proto = await browser.newPage({ colorScheme: "dark" });
  for (const [ancho, alto] of [
    [1280, 800],
    [390, 844],
  ]) {
    await proto.setViewportSize({ width: ancho, height: alto });
    await proto.goto(`file://${PROTOTIPO}`);
    await proto.waitForTimeout(1500);
    await proto.screenshot({ path: `${SALIDA}/mesa-prototipo-${ancho}.png` });
  }
  await proto.close();

  await dmContext.close();
  await sylasContext.close();
  await corvinContext.close();
});
