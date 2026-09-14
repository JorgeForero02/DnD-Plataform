import { test, expect, type Page } from "@playwright/test";

// Tarea 11 (2026-09-05, iniciativa-y-bando) — **la única prueba que demuestra que esto funciona.**
// Lo demás —el DM pide iniciativa desde el diálogo, el encuentro nace `PREPARING`, cada jugador
// recibe su petición con su modificador, la sala de espera con «N de M», el panel del jugador que
// toma la mesa— es fontanería ya escrita. Esto es el recorrido entero, en dos navegadores de
// verdad, porque `jsdom` no tiene canal en vivo ni maqueta nada.

function nuevaCuenta(prefijo: string) {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `${prefijo}-${marca}@example.com`,
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

async function tokenDe(page: Page): Promise<string | null> {
  return page.evaluate(() => window.localStorage.getItem("dnd_token"));
}

/**
 * Crea un personaje por la pantalla de siempre y le da una hoja completa **por la API**, no
 * campo a campo: lo único que hace falta de él es que derive, para que
 * `CharacterSheetService.getInitiativeModifier` no lo rechace — la misma receta que ya usa
 * `condiciones-en-la-mesa.spec.ts`.
 */
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
  const characterId = page.url().split("/personajes/")[1];

  const token = await tokenDe(page);
  const hoja = await page.request.patch(
    `/api/campaigns/${campaignId}/characters/${characterId}/sheet`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        abilities: { str: 12, dex: 14, con: 14, int: 15, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
        // Sin `level`: desde D-CF-66 (`4ea688c`, reglas de la mesa) el nivel lo fija solo el DM y el
        // `PATCH` del dueño con `level` responde 403 — este helper lo llama la jugadora. El nivel no
        // pinta nada en lo que la prueba mide (la petición de iniciativa y su panel a 390 px).
        choices: { "fighter-skills": ["athletics", "perception"] },
      },
    },
  );
  expect(hoja.ok()).toBe(true);
  await page.goto(`/campaigns/${campaignId}`);
  return characterId;
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

/** La mesa, la MISMA pantalla que consulta el DM y el jugador — sin ella no hay «sin recargar» que medir. */
async function abrirLaMesa(page: Page, campaignId: string) {
  await page.goto(`/campaigns/${campaignId}/sesion`);
  await expect(page.getByRole("banner", { name: "Estado de la mesa" })).toBeVisible({
    timeout: 10_000,
  });
}

test("el DM pide iniciativa y la jugadora se entera sin recargar, y el contador del DM baja solo", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const contextoDm = await browser.newContext();
  const contextoJugadora = await browser.newContext();
  const dm = await contextoDm.newPage();
  const jugadora = await contextoJugadora.newPage();

  await registrarse(dm, "dm-iniciativa");
  await dm.getByRole("button", { name: "Nueva campaña" }).first().click();
  await dm.getByLabel("Nombre").fill("La emboscada en vivo");
  await dm.getByRole("button", { name: "Crear" }).click();
  await dm.getByRole("link", { name: "La emboscada en vivo" }).click();
  const campaignId = dm.url().split("/campaigns/")[1].split("/")[0];

  // El DM lleva a Thora, la suya: **es lo que dispara la tirada del servidor al pedir
  // iniciativa** (`EncountersService.start` solo tira por los grupos del DM), y esa tirada es
  // justo la que emite el aviso por el canal en vivo (`GameEventsService.record`). Sin un
  // combatiente propio, el DM no tira nada al empezar y el canal se queda mudo.
  await crearPersonajeConHoja(dm, campaignId, "Thora");

  const enlace = await generarInvitacion(dm);
  await unirseDesdeInvitacion(jugadora, enlace, "jugadora-iniciativa");
  await expect(jugadora.getByRole("heading", { name: "La emboscada en vivo" })).toBeVisible();
  await crearPersonajeConHoja(jugadora, campaignId, "Elara");

  await empezarSesion(dm, "La emboscada del vado");

  await abrirLaMesa(dm, campaignId);
  await abrirLaMesa(jugadora, campaignId);

  await dm.getByRole("button", { name: "Entrar en combate" }).click();
  const dialogo = dm.getByRole("dialog", { name: "Entrar en combate" });
  await dialogo.getByRole("checkbox", { name: /Thora/ }).click();
  await dialogo.getByRole("checkbox", { name: /Elara/ }).click();
  await dialogo.getByRole("button", { name: "Pedir iniciativa" }).click();

  // **Sin recargar**: si esto pasa, el canal en vivo funciona de verdad. Diez segundos, y no
  // los quince del sondeo de peticiones (`SONDEO_DE_PETICIONES_MS`) — si lo trajera el sondeo,
  // esta espera lo cazaría igual, pero el motivo de que pase ANTES es el canal.
  await expect(jugadora.getByText("EMPIEZA EL COMBATE")).toBeVisible({ timeout: 10_000 });
  // **«1 de 2», no «0 de 2».** El total cuenta a los DOS combatientes (Thora y Elara), y la
  // tirada de Thora —la suya— ya se resolvió DENTRO de la misma transacción que crea el
  // encuentro: es justo la que dispara `GameEventsService.record` y, con ella, el canal. Sin
  // ese combatiente propio no habría ninguna tirada al empezar y el canal se quedaría mudo (ver
  // la mutación del paso 3), pero eso significa que el contador NUNCA pasa por cero: nace ya en
  // «1 de 2», con la de Elara pendiente. Esta línea no prueba el canal por sí sola —es la propia
  // mutación del DM la que se lo pinta—, pero fija el punto de partida del que sale la medida de
  // verdad, la de abajo.
  await expect(dm.getByText("1 de 2")).toBeVisible();

  await jugadora.getByRole("button", { name: "Tirar iniciativa" }).click();
  // **El contador del DM baja solo.** Elara era la última pendiente: en cuanto tira, el
  // encuentro entero pasa de `PREPARING` a `ACTIVE` (`aplicarIniciativaDePeticion`), y
  // `TiraDeIniciativa` deja de pintar «N de M» para pintar el orden de turnos — así que lo que
  // demuestra que el canal llegó SIN que el DM tocara nada es que la sala de espera desaparece y
  // el combate arranca solo delante de sus ojos.
  await expect(dm.getByRole("region", { name: "Orden de turnos" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(dm.getByText("Preparando combate")).toHaveCount(0);

  await contextoDm.close();
  await contextoJugadora.close();
});

test("el panel de iniciativa cabe a 390 px", async ({ browser }) => {
  test.setTimeout(120_000);
  const contextoDm = await browser.newContext();
  const dm = await contextoDm.newPage();

  await registrarse(dm, "dm-390");
  await dm.getByRole("button", { name: "Nueva campaña" }).first().click();
  await dm.getByLabel("Nombre").fill("La mesa a 390");
  await dm.getByRole("button", { name: "Crear" }).click();
  await dm.getByRole("link", { name: "La mesa a 390" }).click();
  const campaignId = dm.url().split("/campaigns/")[1].split("/")[0];

  const enlace = await generarInvitacion(dm);

  const contextoJugadora = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const jugadora = await contextoJugadora.newPage();
  await unirseDesdeInvitacion(jugadora, enlace, "jugadora-390");
  await expect(jugadora.getByRole("heading", { name: "La mesa a 390" })).toBeVisible();
  const characterId = await crearPersonajeConHoja(jugadora, campaignId, "Kara");

  await empezarSesion(dm, "La emboscada de la medida");
  // El `sessionId` sale de `.../sessions/current` — la sesión en curso, que **es** la que se
  // acaba de arrancar, y `Encounter` la exige por parámetro de ruta. Se pide por la API y no
  // haciendo clic en la fila de la lista: con la sesión ya en curso esa fila deja de ser un
  // enlace de navegación (la barra global se hace cargo), así que sacar el id de la URL después
  // de pulsarla no tenía de dónde salir.
  const tokenDmSesion = await tokenDe(dm);
  const actual = await dm.request.get(`/api/campaigns/${campaignId}/sessions/current`, {
    headers: { Authorization: `Bearer ${tokenDmSesion}` },
  });
  expect(actual.ok()).toBe(true);
  const sessionId = (await actual.json()).id as string;

  // **Se pide por la API, no desde el diálogo**: esta prueba mide una anchura, no un recorrido
  // de clics, y el diálogo ya se mide aparte. Sin combatiente propio del DM: no hace falta el
  // canal en vivo, solo que la petición exista cuando la jugadora entre a la mesa.
  const tokenDm = await tokenDe(dm);
  const inicio = await dm.request.post(
    `/api/campaigns/${campaignId}/sessions/${sessionId}/encounters`,
    {
      headers: { Authorization: `Bearer ${tokenDm}` },
      data: { characterIds: [characterId] },
    },
  );
  expect(inicio.ok()).toBe(true);

  await abrirLaMesa(jugadora, campaignId);

  // **La medición.** `jsdom` no maqueta: esto se sabe con números o no se sabe. Es lo que dejó
  // 871 pruebas verdes con la mesa rota.
  const panel = jugadora.getByTestId("panel-de-iniciativa");
  await expect(panel).toBeVisible({ timeout: 15_000 });
  const caja = await panel.boundingBox();
  expect(caja).not.toBeNull();
  expect(caja!.x).toBeGreaterThanOrEqual(0);
  expect(caja!.x + caja!.width).toBeLessThanOrEqual(390);

  await contextoDm.close();
  await contextoJugadora.close();
});

test("el diálogo de empezar combate cabe a 390 px con cuatro combatientes", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await registrarse(page, "dm-dialogo-390");
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La leva de cuatro");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La leva de cuatro" }).click();

  // **«Personajes» abre su propio cajón** — no es una pestaña más, es un `Dialog` (el mismo
  // patrón de toda la app) que se queda abierto entre una creación y la siguiente: «Guardar»
  // oculto solo dice que el formulario volvió a la lista, no que el cajón se cerró. Sin cerrarlo
  // a propósito se queda tapando la pantalla y el clic de «Sesiones» de más abajo choca contra
  // su velo — es justo lo que delató la instrumentación de esta prueba en la ronda anterior.
  const nombres = ["Thora", "Brann", "Sabra", "Dorn"];
  await page.getByRole("button", { name: "Personajes" }).click();
  for (const nombre of nombres) {
    await page.getByRole("button", { name: "Nuevo personaje" }).click();
    await page.getByLabel("Nombre").fill(nombre);
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Personajes" })).toBeHidden();

  await empezarSesion(page, "La emboscada de los cuatro");
  await page
    .getByRole("status", { name: "Sesión en curso" })
    .getByRole("link", { name: "Ir a la mesa" })
    .click();
  await expect(page.getByRole("banner", { name: "Estado de la mesa" })).toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole("button", { name: "Entrar en combate" }).click();
  const dialogo = page.getByRole("dialog", { name: "Entrar en combate" });
  await expect(dialogo).toBeVisible();

  for (const nombre of nombres) {
    await dialogo.getByRole("checkbox", { name: new RegExp(nombre) }).click();
  }

  // **La medida.** Cada combatiente elegido despliega una fila de tres radios (BANDOS) dentro
  // del cajón lateral — hoy solo se había comprobado en `jsdom`, que no maqueta y no puede ver
  // un desborde horizontal.
  const cajaDialogo = await dialogo.boundingBox();
  expect(cajaDialogo).not.toBeNull();
  expect(cajaDialogo!.x).toBeGreaterThanOrEqual(0);
  expect(cajaDialogo!.x + cajaDialogo!.width).toBeLessThanOrEqual(390);

  for (const nombre of nombres) {
    const fila = dialogo.getByRole("radiogroup", { name: `Bando de ${nombre}` });
    const cajaFila = await fila.boundingBox();
    expect(cajaFila, `la fila de ${nombre} no se pudo medir`).not.toBeNull();
    expect(cajaFila!.x).toBeGreaterThanOrEqual(0);
    expect(cajaFila!.x + cajaFila!.width).toBeLessThanOrEqual(390);
  }

  // Y la página, con el cajón abierto, tampoco arrastra a lo ancho.
  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(desborde).toBeLessThanOrEqual(1);
});
