import { test, expect, type Browser, type Locator, type Page } from "@playwright/test";

// D-CF-15 (migración 7, tickets I3 / M2B-15) — «lo tengo pero no sé qué es». Vuelve a un objeto
// por lo que hace el juego con él (Foundry): un interruptor de identificación y un alias, por
// fila, que el DM toca y el jugador ve reflejado sin que nadie haya reconstruido el nombre real
// en el cliente — la redacción es del servidor (`inventory.service.ts`, `character-sheet.
// service.ts`), la pantalla solo pinta lo que llega.
//
// **NO se ejecuta en esta ficha** (regla del encargo). Fix round 1 de la revisión (M7): la
// primera versión fallaba contra la maqueta real en tres puntos, todos corregidos aquí —
// - No hay ningún enlace con el nombre de la campaña EN LA PÁGINA DE CAMPAÑA (sí lo hay en la
//   página de PERSONAJE, `CharacterDetailPage.tsx`): navegar por pestañas y cerrar el diálogo
//   del catálogo con `Escape`, como haría alguien de verdad.
// - El catálogo es un `Dialog` `aria-modal` (`CampaignDetailPage.tsx`, `Dialog.tsx`), no una
//   pestaña: se abre, se usa, se cierra con `Escape`.
// - El personaje del jugador necesita raza, clase y las seis características para que la hoja
//   derive y `PaginaDeInventario` pinte su `region "inventario"` — mismo patrón que
//   `crearPersonajeConFicha` en `inventario.spec.ts`/`sobrecarga.spec.ts`.
// - Los dos `reload()` del jugador esperan primero, con `page.waitForResponse`, a que el `PATCH`
//   del DM haya terminado — sin eso hay una carrera real entre el `GET` del jugador y el `PATCH`
//   del DM.
//
// Fix round 2 de la revisión (R4), leído otra vez contra la maqueta real —
// - `CreateCampaignModal.tsx` solo cierra el diálogo (`onClose()`), **no navega**: tras «Crear»
//   seguimos en el panel de campañas, con el nombre nuevo pintado en un `<h2>` de la LISTA
//   (`CampaignList.tsx`), no en la página de la campaña. Hace falta el mismo clic en el enlace
//   que ya usa `inventario.spec.ts:33`.
// - El checkbox «Sin identificar» es CONTROLADO (`FilaObjeto.tsx`, `checked={sinIdentificar}`):
//   su estado solo cambia cuando vuelve el `PATCH` y se reejecuta la consulta, así que
//   `.check()`/`.uncheck()` de Playwright —que comprueban el estado justo después del clic—
//   fallan con «Clicking the checkbox did not change its state». Se usa `.click()` y, tras el
//   `waitForResponse`, `expect(checkbox).toBeChecked()`.
// - El diálogo del catálogo tiene un `<h2>` real (`Dialog.tsx` pinta `title` como `h2`): el
//   texto exacto es «Catálogo de objetos», no «Catálogo» (que es el nombre del BOTÓN que lo
//   abre) — se comprueba con `getByRole("heading", ...)` contra ese texto.

function nuevaCuenta(prefijo: string) {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `e2e-${prefijo}-${marca}@example.com`,
    password: "password123",
    displayName: `${prefijo} ${marca}`,
  };
}

/**
 * Abre una pestaña de la hoja y espera a que sea la activa. Desde la Tarea 7 (spec 2026-09-11)
 * la hoja son una cabecera fija y siete pestañas, y **solo se monta el contenido de la activa**:
 * cada tarjeta se busca después de abrir la suya. «Números» es la de arranque.
 */
async function abrirPestana(donde: Page | Locator, nombre: string) {
  await donde.getByRole("tab", { name: nombre }).click();
  await expect(donde.getByRole("tab", { name: nombre, selected: true })).toBeVisible();
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

/** Mismo patrón que `crearPersonajeConFicha` de `inventario.spec.ts`/`sobrecarga.spec.ts`: sin
 * raza, clase y las seis características, la hoja no deriva y `PaginaDeInventario` no pinta
 * ninguna `region "inventario"` — se quedaría en el `EmptyState` de `HojaCalculada.tsx`. */
async function crearPersonajeConFicha(page: Page, nombre: string) {
  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("link", { name: new RegExp(nombre) }).click();
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();

  await page.getByLabel("Raza", { exact: true }).selectOption("human");
  await page.getByLabel("Clase", { exact: true }).selectOption("fighter");
  const caracteristicas: [string, string][] = [
    ["Fuerza", "14"],
    ["Destreza", "12"],
    ["Constitución", "14"],
    ["Inteligencia", "10"],
    ["Sabiduría", "10"],
    ["Carisma", "8"],
  ];
  for (const [etiqueta, valor] of caracteristicas) {
    const campo = page.getByLabel(etiqueta, { exact: true });
    await campo.fill(valor);
    await campo.blur();
  }
  await expect(page.getByText("Salvaciones", { exact: true })).toBeVisible({ timeout: 15_000 });
}

test.setTimeout(90_000);

test("el DM marca un anillo sin identificar con un alias, el jugador solo ve el alias, y al identificarlo ve el nombre real", async ({
  browser,
}: {
  browser: Browser;
}) => {
  // Contexto 1: el DM.
  const dmContext = await browser.newContext();
  const dmPage = await dmContext.newPage();
  await registrarse(dmPage, "dm-sin-id");

  await dmPage.getByRole("button", { name: "Nueva campaña" }).first().click();
  await dmPage.getByLabel("Nombre").fill("La mesa del anillo sin identificar");
  await dmPage.getByRole("button", { name: "Crear" }).click();
  // Fix round 2 (R4) — `CreateCampaignModal` solo cierra el diálogo: seguimos en el panel de
  // campañas, y hay que entrar por el enlace de la lista, como `inventario.spec.ts:33`.
  await dmPage.getByRole("link", { name: "La mesa del anillo sin identificar" }).click();
  await expect(
    dmPage.getByRole("heading", { name: "La mesa del anillo sin identificar" }),
  ).toBeVisible();

  // El DM crea el objeto en el catálogo de la campaña, con su nombre REAL — el que el jugador no
  // debe ver mientras no esté identificado. `Catálogo` abre un diálogo `aria-modal` SOBRE la
  // pestaña actual, no una pestaña — se cierra con `Escape`, no navegando.
  await dmPage.getByRole("button", { name: "Catálogo" }).click();
  // Fix round 2 (R4) — el `<h2>` real del diálogo dice «Catálogo de objetos», no «Catálogo»
  // (ese es el nombre del botón que lo abre). Fix round 3 (R4') — «Catálogo de objetos» sale
  // DOS VECES (`Dialog.tsx` pinta su propio `<h2>` con el `title`, y dentro,
  // `CampaignItemsCatalogPage.tsx` monta `CabeceraDeSeccion` con el mismo texto en otro `<h2>`):
  // un `getByRole("heading", ...)` a secas es un fallo de modo estricto. El diálogo en sí SÍ es
  // único (`role="dialog"`, `aria-labelledby` con ese mismo título), así que se comprueba por
  // ahí en vez de por el titular.
  await expect(dmPage.getByRole("dialog", { name: "Catálogo de objetos" })).toBeVisible();
  await dmPage
    .getByRole("button", { name: /Crear objeto|Nuevo objeto/ })
    .first()
    .click();
  await dmPage.getByLabel("Nombre", { exact: true }).fill("Anillo de protección");
  await dmPage.getByRole("button", { name: "Guardar" }).click();
  await expect(dmPage.getByText("Anillo de protección").first()).toBeVisible({
    timeout: 15_000,
  });
  await dmPage.keyboard.press("Escape");

  // Invitar al jugador (mismo patrón que `no-puedes-editar.spec.ts`): «Quién juega» vive en la
  // pestaña «Resumen», que es donde seguimos tras cerrar el diálogo del catálogo.
  await dmPage.getByRole("tab", { name: "Resumen" }).click();
  const quienJuega = dmPage.getByRole("region", { name: "Quién juega" });
  await expect(quienJuega).toContainText("Todavía no hay jugadores", { timeout: 10_000 });
  await quienJuega.getByRole("link", { name: "Invitar a un jugador" }).click();
  await expect(dmPage.getByRole("tab", { name: "Ajustes", selected: true })).toBeVisible();
  await dmPage.getByRole("button", { name: "Generar invitación" }).click();
  const linkField = dmPage.getByLabel("Enlace de invitación");
  await expect(linkField).toBeVisible();
  const inviteUrl = await linkField.inputValue();
  expect(inviteUrl).toMatch(/\/join\/.+/);

  // Contexto 2: el jugador.
  const playerContext = await browser.newContext();
  const playerPage = await playerContext.newPage();
  await playerPage.goto(inviteUrl);
  await expect(
    playerPage.getByText("Necesitas iniciar sesión para aceptar esta invitación."),
  ).toBeVisible();
  await playerPage.getByRole("link", { name: "Crear cuenta" }).click();
  const jugador = nuevaCuenta("jugador-sin-id");
  await playerPage.getByLabel("Nombre").fill(jugador.displayName);
  await playerPage.getByLabel("Correo").fill(jugador.email);
  await playerPage.getByLabel("Contraseña").fill(jugador.password);
  await playerPage.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(
    playerPage.getByText("Estás a punto de unirte a una campaña con esta invitación."),
  ).toBeVisible();
  await playerPage.getByRole("button", { name: "Unirse a la campaña" }).click();
  await expect(
    playerPage.getByRole("heading", { name: "La mesa del anillo sin identificar" }),
  ).toBeVisible();

  // El jugador crea su personaje CON HOJA (raza, clase, características) — sin esto no hay
  // `region "inventario"` que abrir.
  await crearPersonajeConFicha(playerPage, "Portador del Anillo");

  // Y le mete el anillo en la mochila desde el selector — el mismo camino que
  // `inventario.spec.ts` usa para un objeto de campaña. Desde la Tarea 7 el inventario es la
  // pestaña «Objetos» de la hoja, y solo se monta la activa.
  await abrirPestana(playerPage, "Objetos");
  const inventarioJugador = playerPage.getByRole("region", { name: "inventario" });
  await inventarioJugador.getByRole("button", { name: /Añadir objeto/ }).click();
  // El buscador del selector por su nombre entero: desde la tarea 9 el inventario tiene
  // además su propio «Buscar objeto» (el filtro de la lista), y `/Buscar/` casaba con los dos.
  await inventarioJugador.getByLabel("Buscar objeto por nombre").fill("Anillo de protección");
  await inventarioJugador
    .getByRole("button", { name: /Anillo de protección/ })
    .first()
    .click();
  await inventarioJugador.getByRole("button", { name: "Añadir", exact: true }).click();
  // Fix round 3 (R4') — `SelectorDeObjeto` no se cierra solo tras «Añadir» (`onSuccess` limpia
  // el formulario pero no toca `abierto`): su propia lista sigue montada DENTRO de la misma
  // `region "inventario"`, y repinta «Anillo de protección» como fila SELECCIONABLE del
  // catálogo — un `getByText` a secas ve dos coincidencias. Se cierra el selector con su botón
  // «Cerrar» antes de comprobar la fila real, igual que ya hace `inventario.spec.ts:97-99` al
  // escapar de la ambigüedad con `getByRole("listitem")` scoped a la lista real.
  await inventarioJugador.getByRole("button", { name: "Cerrar" }).click();
  await expect(
    inventarioJugador.getByRole("listitem").filter({ hasText: "Anillo de protección" }),
  ).toBeVisible({ timeout: 15_000 });

  // El DM abre la MISMA ficha desde su lado — la página de PERSONAJE SÍ lleva la miga con el
  // nombre de la campaña (a diferencia de la página de campaña, que no tiene ese enlace).
  await dmPage.getByRole("button", { name: "Personajes" }).click();
  await dmPage.getByRole("link", { name: /Portador del Anillo/ }).click();
  await expect(dmPage.getByRole("heading", { name: "Portador del Anillo" })).toBeVisible();

  await abrirPestana(dmPage, "Objetos");
  const inventarioDM = dmPage.getByRole("region", { name: "inventario" });
  // La fila de la lista, no cualquier texto: a página el panel de detalle (tarea 9) repite el
  // nombre del objeto seleccionado dentro de la misma región, y un `getByText` a secas ve dos.
  await expect(
    inventarioDM.getByRole("listitem").filter({ hasText: "Anillo de protección" }),
  ).toBeVisible({ timeout: 15_000 });

  // El DM marca el anillo sin identificar — el `PATCH` sale al marcar la casilla (`onChange`,
  // sin blur de por medio). Fix round 2 (R4): el checkbox es CONTROLADO (`checked={
  // sinIdentificar}`, que solo cambia cuando vuelve el `PATCH`), así que `.check()` fallaría
  // —comprueba el estado justo después del clic, en el mismo tick—: `.click()` y, tras esperar
  // la respuesta, `toBeChecked()`.
  const casillaSinIdentificar = inventarioDM.getByRole("checkbox", { name: "Sin identificar" });
  await Promise.all([
    dmPage.waitForResponse(
      (r) => r.request().method() === "PATCH" && r.url().includes("/inventory/") && r.ok(),
    ),
    casillaSinIdentificar.click(),
  ]);
  await expect(casillaSinIdentificar).toBeChecked();

  // Y le pone el alias — este `PATCH` sale al perder el foco del campo.
  const campoAlias = inventarioDM.getByLabel(/Alias de Anillo de protección/);
  await campoAlias.fill("Anillo de aspecto extraño");
  await Promise.all([
    dmPage.waitForResponse(
      (r) => r.request().method() === "PATCH" && r.url().includes("/inventory/") && r.ok(),
    ),
    campoAlias.blur(),
  ]);

  // Solo AHORA recarga el jugador: los dos `PATCH` del DM ya han terminado, así que no hay
  // carrera entre su `GET` y la escritura del DM.
  // La recarga conserva `?pestana=objetos` en la URL, así que el jugador vuelve a su lista.
  await playerPage.reload();
  await expect(playerPage.getByRole("heading", { name: "Portador del Anillo" })).toBeVisible();
  // La fila con el alias (el detalle a página lo repite; se afirma la fila) y, en TODA la
  // página —fila, detalle, lo que sea—, ni rastro del nombre real.
  await expect(
    inventarioJugador.getByRole("listitem").filter({ hasText: "Anillo de aspecto extraño" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(playerPage.getByText("Anillo de protección")).toHaveCount(0);

  // El DM lo identifica de vuelta — de nuevo, se espera la respuesta antes de que el jugador
  // recargue, y de nuevo `.click()` en vez de `.uncheck()` por el mismo motivo (checkbox
  // controlado).
  await Promise.all([
    dmPage.waitForResponse(
      (r) => r.request().method() === "PATCH" && r.url().includes("/inventory/") && r.ok(),
    ),
    casillaSinIdentificar.click(),
  ]);
  await expect(casillaSinIdentificar).not.toBeChecked();

  // Y el jugador, tras recargar, ve el nombre real y ya no el alias — la prueba de que el
  // cambio llegó es del lado del JUGADOR, no releer lo que el DM ya sabía.
  await playerPage.reload();
  await expect(playerPage.getByRole("heading", { name: "Portador del Anillo" })).toBeVisible();
  await expect(
    inventarioJugador.getByRole("listitem").filter({ hasText: "Anillo de protección" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(playerPage.getByText("Anillo de aspecto extraño")).toHaveCount(0);

  await dmContext.close();
  await playerContext.close();
});
