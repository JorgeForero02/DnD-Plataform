import { test, expect, type Page } from "@playwright/test";

// PNJ del mundo y la mesa (spec 2026-09-14) — **la única prueba que demuestra que esto
// funciona de punta a punta, con dos navegadores de verdad.** Lo demás —que `reveal`/`hide`
// suben la visibilidad en el servidor, que `DELETE combatants/:id` avanza el turno, que
// `entityId` viaja o se redacta— está cubierto por `apps/api/test/pnj-del-mundo.e2e-spec.ts` y
// por las unitarias de cada pieza. Esto es el recorrido: un PNJ nace oculto, entra en combate,
// se revela y sale del combate, y la jugadora lo ve **sin recargar** en las dos direcciones —
// justo lo que `jsdom` no puede maquetar ni sondear.
//
// Los helpers de registro/campaña/invitación/sesión/mesa son los mismos de
// `iniciativa-en-vivo.spec.ts`: ese fichero no los exporta, así que se copian aquí en vez de
// escribir una segunda forma de hacer lo mismo con matices.

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
 * `CharacterSheetService.getInitiativeModifier` no lo rechace — la misma receta que
 * `iniciativa-en-vivo.spec.ts` y `condiciones-en-la-mesa.spec.ts`.
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
        // Sin `level`: desde D-CF-66 el nivel lo fija solo el DM, y este helper lo llama tanto
        // el DM como la jugadora. No pinta nada en lo que esta prueba mide.
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

/** La mesa, la MISMA pantalla que consulta el DM y la jugadora — sin ella no hay «sin recargar» que medir. */
async function abrirLaMesa(page: Page, campaignId: string) {
  await page.goto(`/campaigns/${campaignId}/sesion`);
  await expect(page.getByRole("banner", { name: "Estado de la mesa" })).toBeVisible({
    timeout: 10_000,
  });
}

test("un PNJ del bestiario nace oculto, entra en combate, se revela y sale — la jugadora lo ve sin recargar", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const contextoDm = await browser.newContext();
  const contextoJugadora = await browser.newContext();
  const dm = await contextoDm.newPage();
  const jugadora = await contextoJugadora.newPage();

  await registrarse(dm, "dm-pnj-mundo");
  await dm.getByRole("button", { name: "Nueva campaña" }).first().click();
  await dm.getByLabel("Nombre").fill("La encerrona del Bandido");
  await dm.getByRole("button", { name: "Crear" }).click();
  await dm.getByRole("link", { name: "La encerrona del Bandido" }).click();
  const campaignId = dm.url().split("/campaigns/")[1].split("/")[0];

  // El DM lleva a Thora, la suya: dispara su propia tirada al pedir iniciativa (igual que
  // `iniciativa-en-vivo.spec.ts`), que es la que abre el canal en vivo.
  await crearPersonajeConHoja(dm, campaignId, "Thora");

  const enlace = await generarInvitacion(dm);
  await unirseDesdeInvitacion(jugadora, enlace, "jugadora-pnj-mundo");
  await expect(jugadora.getByRole("heading", { name: "La encerrona del Bandido" })).toBeVisible();
  await crearPersonajeConHoja(jugadora, campaignId, "Zero");

  // El Bandido nace por la API, no bajado a mano desde el Bestiario: lo único que esta prueba
  // necesita de él es que exista `DM_ONLY` con su statblock, y así se evita depender del
  // recorrido de `bestiario.spec.ts` para montar la suya. La clave exacta del SRD se comprobó en
  // `apps/api/src/rules/catalog/monsters-srd.ts`: `ref: "SRD:bandit"`.
  const tokenDm = await tokenDe(dm);
  const npc = await dm.request.post(`/api/campaigns/${campaignId}/npcs`, {
    headers: { Authorization: `Bearer ${tokenDm}` },
    data: { ref: "SRD:bandit", name: "Bandido" },
  });
  expect(npc.ok()).toBe(true);
  const banditoId = (await npc.json())[0].id as string;
  expect(banditoId).toBeTruthy();

  await empezarSesion(dm, "La emboscada del vado");

  await abrirLaMesa(dm, campaignId);
  await abrirLaMesa(jugadora, campaignId);

  await dm.getByRole("button", { name: "Entrar en combate" }).click();
  const dialogo = dm.getByRole("dialog", { name: "Entrar en combate" });
  await dialogo.getByRole("checkbox", { name: /Thora/ }).click();
  await dialogo.getByRole("checkbox", { name: /Zero/ }).click();
  await dialogo.getByRole("checkbox", { name: /Bandido/ }).click();
  await dialogo.getByRole("button", { name: "Pedir iniciativa" }).click();

  await jugadora.getByRole("button", { name: "Tirar iniciativa" }).click();

  // El DM ve el orden de turnos en cuanto la jugadora tira — mismo mecanismo que
  // `iniciativa-en-vivo.spec.ts`.
  const ordenDm = dm.getByRole("region", { name: "Orden de turnos" });
  await expect(ordenDm).toBeVisible({ timeout: 10_000 });

  // **Aserción de partida (E-PM-2, E-PM-11).** El Bandido nació `DM_ONLY`: la jugadora no puede
  // verlo, así que su turno se lee «Alguien» y no «Bandido»; el DM sí lo ve, marcado «oculto».
  await expect(
    jugadora.getByRole("region", { name: "Orden de turnos" }).getByText("Bandido"),
  ).toHaveCount(0);
  await expect(ordenDm.getByText("oculto")).toBeVisible();

  // DM abre «Más acciones sobre Bandido» en el elenco y revela a la mesa.
  const elencoDm = dm.getByRole("region", { name: "En la mesa" });
  await elencoDm.getByRole("button", { name: "Más acciones sobre Bandido" }).click();
  await dm
    .getByRole("menu", { name: "Más acciones sobre Bandido" })
    .getByRole("menuitem", { name: "Revelar a la mesa" })
    .click();

  // **Sin recargar**: si esto pasa, el canal en vivo llevó `NPC_REVEALED` hasta la jugadora.
  await expect(
    jugadora.getByRole("region", { name: "Orden de turnos" }).getByText("Bandido"),
  ).toBeVisible({ timeout: 10_000 });
  const sucesosJugadora = jugadora.getByRole("list", { name: "Sucesos de la sesión" });
  await expect(sucesosJugadora.getByText("Bandido entra en escena")).toBeVisible({
    timeout: 10_000,
  });

  // DM abre de nuevo el menú de Bandido y lo saca del combate.
  await elencoDm.getByRole("button", { name: "Más acciones sobre Bandido" }).click();
  await dm
    .getByRole("menu", { name: "Más acciones sobre Bandido" })
    .getByRole("menuitem", { name: "Sacar del combate" })
    .click();

  // **En las dos pantallas** deja de estar en el orden de turnos — al DM porque lo acaba de
  // pedir, a la jugadora porque le llegó por el canal en vivo sin recargar.
  await expect(ordenDm.getByText("Bandido")).toHaveCount(0);
  await expect(
    jugadora.getByRole("region", { name: "Orden de turnos" }).getByText("Bandido"),
  ).toHaveCount(0, { timeout: 10_000 });
  await expect(sucesosJugadora.getByText("Bandido sale del combate")).toBeVisible({
    timeout: 10_000,
  });

  await contextoDm.close();
  await contextoJugadora.close();
});
