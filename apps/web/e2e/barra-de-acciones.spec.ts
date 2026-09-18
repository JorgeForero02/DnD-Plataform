import { test, expect, type Browser, type Page } from "@playwright/test";

// Task 4 de 3A.3 (T22) — la barra de acciones bajo el marco, medida en un navegador de verdad:
// apuntar desde el elenco, abrir «Conjuros» y lanzar contra el chip, ver la economía del turno
// pasar a «gastada», ver la misma fila apagarse con su motivo, pasar turno y volver, y «Esquivar»
// desde «Esquivar, ayudar…».
//
// **NO se ejecuta en esta ficha** (regla del encargo, D-CF-65): lo corre el orquestador. Mismos
// ayudantes que `lanzar.spec.ts` (dos contextos, maga nivel 3 con `magic-missile` PREPARADO,
// goblin instanciado y revelado con CA anulada a 1 y PG máximos anulados a 60) — se reutiliza el
// fixture entero en vez de escribir un segundo mago desde cero.

test.setTimeout(240_000);

function nuevaCuenta(prefijo: string) {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
  return {
    email: `barra-${prefijo}-${marca}@example.com`,
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
 * La maga (mismo atajo que `lanzar.spec.ts`, Task 7 de 3A.2): nivel 3 ANTES que clase
 * (`sembrarRecursos`/`sembrarLibro` leen el nivel del personaje en ese momento — fix round 3 de
 * esa tarea), «Proyectil mágico» PREPARADO.
 */
async function montarMaga(dm: Page, jugadora: Page, campaignId: string, nombre: string) {
  await jugadora.getByRole("button", { name: "Personajes" }).click();
  await jugadora.getByRole("button", { name: "Nuevo personaje" }).click();
  await jugadora.getByLabel("Nombre").fill(nombre);
  await jugadora.getByRole("button", { name: "Guardar" }).click();
  await expect(jugadora.getByRole("button", { name: "Guardar" })).toBeHidden();
  await jugadora.getByRole("link", { name: new RegExp(nombre) }).click();
  await expect(jugadora.getByRole("heading", { name: nombre })).toBeVisible();
  const characterId = jugadora.url().split("/personajes/")[1].split(/[/?]/)[0];

  const headersDm = await comoLaSesion(dm);
  const subida = await dm.request.patch(`/api/campaigns/${campaignId}/characters/${characterId}`, {
    headers: headersDm,
    data: { level: 3 },
  });
  expect(subida.ok()).toBe(true);

  const headersJugadora = await comoLaSesion(jugadora);
  const hoja = await jugadora.request.patch(
    `/api/campaigns/${campaignId}/characters/${characterId}/sheet`,
    {
      headers: headersJugadora,
      data: {
        abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "wizard" },
        choices: { "wizard-skills": ["arcana", "history"] },
      },
    },
  );
  expect(hoja.ok()).toBe(true);

  const preparar = await jugadora.request.put(
    `/api/campaigns/${campaignId}/characters/${characterId}/spellbook/magic-missile`,
    { headers: headersJugadora, data: { estado: "PREPARADO" } },
  );
  expect(preparar.ok()).toBe(true);

  await jugadora.reload();
  return characterId;
}

/** El goblin (mismo patrón que `lanzar.spec.ts`): CA anulada a 1, PG máximos anulados a 60 y
 *  curado hasta ahí — aguanta el Proyectil mágico sin caer, que no es lo que esta prueba mide. */
async function montarGoblin(dm: Page, campaignId: string) {
  const headersDm = await comoLaSesion(dm);
  const instanciado = await dm.request.post(`/api/campaigns/${campaignId}/npcs`, {
    headers: headersDm,
    data: { ref: "SRD:goblin", count: 1, hp: "AVERAGE" },
  });
  expect(instanciado.ok()).toBe(true);
  const [goblin] = await instanciado.json();
  const goblinId: string = goblin.id;

  const revelado = await dm.request.post(
    `/api/campaigns/${campaignId}/characters/${goblinId}/reveal`,
    { headers: headersDm },
  );
  expect(revelado.ok()).toBe(true);

  await dm.goto(`/campaigns/${campaignId}/personajes/${goblinId}`);
  await expect(dm.getByRole("heading", { name: "Goblin" })).toBeVisible();
  await dm.getByRole("tab", { name: "Estado" }).click();
  const anulaciones = dm.getByRole("region", { name: "anulaciones del DM" });
  await anulaciones.getByLabel("Valor a anular").selectOption({ label: "Clase de armadura" });
  await anulaciones.getByLabel("Nuevo valor").fill("1");
  await anulaciones.getByRole("button", { name: "Anular" }).click();
  await expect(anulaciones.getByText(/Clase de armadura: fijada a 1/)).toBeVisible();

  await anulaciones.getByLabel("Valor a anular").selectOption({ label: "Puntos de golpe máximos" });
  await anulaciones.getByLabel("Nuevo valor").fill("60");
  await anulaciones.getByRole("button", { name: "Anular" }).click();
  await expect(anulaciones.getByText(/Puntos de golpe máximos: fijada a 60/)).toBeVisible();

  const curado = await dm.request.post(`/api/campaigns/${campaignId}/characters/${goblinId}/hp`, {
    headers: headersDm,
    data: { delta: 9999, reason: "Aguanta el Proyectil mágico entero" },
  });
  expect(curado.ok()).toBe(true);

  await dm.goto(`/campaigns/${campaignId}`);
  await expect(dm.getByRole("heading", { name: "La marca del pantano" })).toBeVisible();

  return goblinId;
}

test("la barra de acciones: apuntar desde el elenco, lanzar contra el chip, la fila que se apaga, y Esquivar", async ({
  browser,
}: {
  browser: Browser;
}) => {
  const dmContext = await browser.newContext();
  const magaContext = await browser.newContext();
  const dm = await dmContext.newPage();
  const maga = await magaContext.newPage();

  await registrarse(dm, "dm");
  const campaignId = await crearCampana(dm, "La marca del pantano");

  const enlace = await generarInvitacion(dm);
  await unirseDesdeInvitacion(maga, enlace, "maga");
  await expect(maga.getByRole("heading", { name: "La marca del pantano" })).toBeVisible();

  await montarMaga(dm, maga, campaignId, "Sylas Tintanoche");
  await montarGoblin(dm, campaignId);

  await empezarSesion(dm, "La barra entra en juego");
  await abrirLaMesa(dm, campaignId);
  await abrirLaMesa(maga, campaignId);

  // --- Entrar en combate: la maga y el goblin (mismo patrón que `lanzar.spec.ts`) ---
  await dm.getByRole("button", { name: "Entrar en combate" }).click();
  const dialogoDeCombate = dm.getByRole("dialog", { name: "Entrar en combate" });
  await dialogoDeCombate.getByRole("checkbox", { name: /Sylas/ }).click();
  await dialogoDeCombate.getByRole("checkbox", { name: /Goblin/ }).click();
  await dialogoDeCombate.getByRole("button", { name: "Pedir iniciativa" }).click();

  await expect(maga.getByText("EMPIEZA EL COMBATE")).toBeVisible({ timeout: 15_000 });
  await maga.getByRole("button", { name: "Tirar iniciativa" }).click();

  await expect(dm.getByRole("region", { name: "Orden de turnos" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(maga.getByRole("region", { name: "Orden de turnos" })).toBeVisible({
    timeout: 15_000,
  });

  const elencoMaga = maga.getByRole("region", { name: "En la mesa" });
  const barra = maga.getByRole("region", { name: "Barra de acciones" });

  // **Igual que `actions.service.spec.ts`/`acciones.e2e-spec.ts` de la Task 1: quién arranca el
  // asalto no está fijado por el motor de iniciativa (sin tiradas reales), así que la prueba no
  // asume que le toca a la maga desde el principio** — avanza el turno hasta que sea el suyo,
  // antes de gastar nada. Con solo dos combatientes, «Pasar turno» alterna entre los dos.
  await expect(async () => {
    const leToca = await barra.getByText("· le toca").isVisible();
    if (!leToca) await dm.getByRole("button", { name: "Pasar turno" }).click();
    expect(leToca).toBe(true);
  }).toPass({ timeout: 30_000 });

  // --- La maga apunta al Goblin desde el elenco: clic en su tarjeta ---
  await elencoMaga.getByRole("button", { name: "Apuntar a Goblin" }).click();
  await expect(barra.getByText("apuntas a Goblin")).toBeVisible({ timeout: 15_000 });

  // --- Abre «Conjuros», «Lanzar» Proyectil mágico ---
  await barra.getByRole("button", { name: /^Conjuros/ }).click();
  await maga.getByRole("button", { name: "Lanzar Proyectil mágico" }).click();
  // **Fix round 1 — «Lanzar sobre 1», no «Lanzar sobre Goblin».** «Proyectil mágico» tiene
  // `objetivos: "varios"` (reparte sus dardos), no «uno»: el chip pre-marca la casilla de
  // «Goblin» (`objetivoInicial`, valor inicial de `objetivosVarios` en `LanzarConjuro.tsx`), pero
  // el botón de confirmar sigue siendo el de siempre — cuenta objetivos marcados, no los nombra
  // («Lanzar sobre N»). El objetivo-por-nombre solo existe para `objetivos: "uno"`, que no es
  // este conjuro. Se comprueba primero que la casilla ya llegó marcada (el chip hizo su trabajo
  // sin que la maga tuviera que tocarla) y luego se confirma.
  await expect(maga.getByRole("checkbox", { name: "Goblin" })).toBeChecked();
  await maga.getByRole("button", { name: "Lanzar sobre 1" }).click();

  // --- En el hilo de la maga: «lanza Proyectil mágico», y una tarjeta pendiente en el DM ---
  const hiloMaga = maga.getByRole("list", { name: "Sucesos de la sesión" });
  await expect(hiloMaga.getByText(/lanza Proyectil mágico/)).toBeVisible({ timeout: 15_000 });
  await expect(dm.getByRole("button", { name: /Aplicar el daño a Goblin/ })).toBeVisible({
    timeout: 20_000,
  });

  // --- La franja de economía del turno dice «acción: gastada» ---
  const economia = maga.getByRole("status", { name: "Economía del turno" });
  await expect(economia.getByText("acción: gastada")).toBeVisible({ timeout: 15_000 });

  // --- La misma fila de «Conjuros», que se quedó abierta, se apaga sola con su motivo ---
  //
  // **No se vuelve a pulsar el botón «Conjuros»**: cerraría el menú en vez de reabrirlo (el
  // mismo `<button aria-expanded>` alterna) — el panel del grupo sigue abierto desde el paso de
  // arriba (lo que cerró `LanzarConjuro` al lanzar fue SU propio panel de espacio/objetivo, no
  // el `MenuQueSube` que lista las filas), así que la fila se apaga sola en cuanto
  // `useAcciones` invalida y vuelve a pedir `GET …/actions` (`useUsarActividad`, Task 4).
  const filaProyectil = maga.getByRole("button", { name: "Lanzar", exact: true });
  await expect(filaProyectil).toHaveAttribute("aria-disabled", "true", { timeout: 15_000 });
  await expect(maga.getByText("ya gastaste tu acción")).toBeVisible();

  // --- El DM pasa turno dos veces: vuelve a ser el de la maga ---
  await dm.getByRole("button", { name: "Pasar turno" }).click();
  await dm.getByRole("button", { name: "Pasar turno" }).click();
  await expect(barra.getByText("· le toca")).toBeVisible({ timeout: 15_000 });

  // --- «Esquivar, ayudar…» → «Esquivar» → línea en el hilo ---
  await barra.getByRole("button", { name: /^Esquivar, ayudar…/ }).click();
  const filaEsquivar = maga.locator("li", { hasText: "Esquivar" }).first();
  await filaEsquivar.getByRole("button", { name: "Usar" }).click();
  await expect(hiloMaga.getByText(/usa Esquivar/)).toBeVisible({ timeout: 15_000 });
});
