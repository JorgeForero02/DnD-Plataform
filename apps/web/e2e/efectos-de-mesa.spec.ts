import { test, expect, type Browser, type Page } from "@playwright/test";

// EM-1 (tanda de cierre, 2026-09-17) — lo único que `jsdom` no puede medir de
// `useEfectosDeFicha.tsx`: que el texto flotante de un golpe de verdad se anime en el
// navegador y **salga del DOM** al terminar (`onAnimationEnd`, `efectos.css`: 2,6 s). El
// detector puro (`detectarEfectos.ts`) ya tiene sus unitarias en
// `src/features/sessions/elenco/efectos/__tests__/detectarEfectos.test.ts`; este fichero prueba
// la mitad que sí necesita DOM y animación real.
//
// Arranque copiado de `apps/web/e2e/puerta-de-efectos.spec.ts` (registro, campaña, invitación,
// personaje con hoja por la API, sesión abierta, dos contextos). El golpe se pone directamente
// desde la hoja del personaje — el DM la abre y usa «Recibo daño» (`PuntosDeGolpe.tsx`), el
// mismo control que ya mide `condiciones-en-la-mesa.spec.ts` y `hoja.spec.ts` — mientras el
// jugador se queda mirando la mesa con su propio personaje en el elenco («En la mesa»).

test.setTimeout(120_000);

function nuevaCuenta(prefijo: string) {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
  return {
    email: `em-${prefijo}-${marca}@example.com`,
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

/** La cabecera de autorización de la sesión abierta en este navegador — mismo patrón que
 *  `combate.spec.ts` y `puerta-de-efectos.spec.ts`. */
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

async function abrirPestana(page: Page, nombre: string) {
  await page.getByRole("tab", { name: nombre }).click();
  await expect(page.getByRole("tab", { name: nombre, selected: true })).toBeVisible();
}

/** Un personaje nuevo, con hoja completa por la API — mismo atajo que `puerta-de-efectos.spec.ts`
 *  e `iniciativa-en-vivo.spec.ts`: lo único que hace falta es que derive, para tener PG. */
async function crearPersonajeConHoja(
  page: Page,
  campaignId: string,
  nombre: string,
): Promise<string> {
  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  await page.getByRole("link", { name: new RegExp(nombre) }).click();
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
  const characterId = page.url().split("/personajes/")[1].split(/[/?]/)[0];

  const headers = await comoLaSesion(page);
  const hoja = await page.request.patch(
    `/api/campaigns/${campaignId}/characters/${characterId}/sheet`,
    {
      headers,
      data: {
        abilities: { str: 15, dex: 14, con: 14, int: 10, wis: 10, cha: 8 },
        race: { source: "SRD", key: "dwarf" },
        subrace: { source: "SRD", key: "dwarf-hill" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      },
    },
  );
  expect(hoja.ok()).toBe(true);
  await page.reload();
  return characterId;
}

test("un golpe pinta «−7» en la ficha del elenco y el texto flotante desaparece del DOM", async ({
  browser,
}: {
  browser: Browser;
}) => {
  const dmContext = await browser.newContext();
  const jugadorContext = await browser.newContext();
  const dm = await dmContext.newPage();
  const jugador = await jugadorContext.newPage();

  await registrarse(dm, "dm-fx");
  const campaignId = await crearCampana(dm, "La mesa que se anima");

  const enlace = await generarInvitacion(dm);
  await unirseDesdeInvitacion(jugador, enlace, "jugador-fx");
  await expect(jugador.getByRole("heading", { name: "La mesa que se anima" })).toBeVisible();

  await crearPersonajeConHoja(jugador, campaignId, "Elora");

  await empezarSesion(dm, "La escaramuza que se siente");

  // El jugador se queda mirando la mesa, con su personaje en el elenco («En la mesa»).
  await abrirLaMesa(jugador, campaignId);
  const elencoJugador = jugador.getByRole("region", { name: "En la mesa" });
  await expect(elencoJugador.getByText("Elora")).toBeVisible({ timeout: 15_000 });

  // El DM abre la hoja de Elora directamente (puede editarla porque es el DM) y le pone daño
  // desde «Recibo daño» (`PuntosDeGolpe.tsx`) — el mismo control que mide `hoja.spec.ts`.
  await dm.getByRole("button", { name: "Personajes" }).click();
  await dm.getByRole("link", { name: /Elora/ }).click();
  await expect(dm.getByRole("heading", { name: "Elora" })).toBeVisible();
  await abrirPestana(dm, "Recursos");
  await dm.getByLabel("Cambio de puntos de golpe").fill("7");
  await dm.getByRole("button", { name: "Recibo daño" }).click();
  await expect(dm.getByRole("button", { name: "Recibo daño" })).toBeEnabled();

  // --- El `expect` que mira al OTRO contexto: el jugador no ha tocado nada y su tarjeta del
  //     elenco anima el golpe que le acaba de poner el DM, por el canal en vivo o el sondeo. ---
  const flotante = elencoJugador.locator(".fx-flotante", { hasText: "−7" });
  await expect(flotante).toBeVisible({ timeout: 15_000 });
  // La animación dura 2,6 s (`efectos.css`); tras `animationend` el nodo se retira
  // (`useEfectosDeFicha.tsx`, `onAnimationEnd={() => quitarFlotante(f.id)}`). Esto es lo que
  // `jsdom` no puede ver — no maqueta, así que nunca dispara `animationend` — y el navegador sí.
  await expect(flotante).toHaveCount(0, { timeout: 6_000 });

  await dmContext.close();
  await jugadorContext.close();
});
