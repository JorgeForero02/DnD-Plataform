import { test, expect, type Locator, type Page } from "@playwright/test";

// **Las dos mitades que faltaban para que el motor de condiciones llegue a la mesa** (fichas M16
// y M17). Las dos se habían dado por cerradas con el servidor hecho y **ninguna pantalla usándolo**,
// que es el error que este proyecto ya cometió con `ENTITY_REVEALED` y que costó reabrir M17.
//
// Se mide aquí, contra la API real, porque lo que hay que demostrar es justo el viaje entero:
//
//  · **M17** — que se pueda marcar a alguien concentrado desde una pantalla, y que **entonces**
//    recibir daño haga que el servidor pida la salvación de Constitución que 2.5.4 escribió. Antes
//    de esto, `grep -rn "concentrat" apps/web` no devolvía nada: la regla no se disparaba jamás.
//  · **M16** — que la sugerencia de ventaja y desventaja, que el servidor calculaba desde 2.5.5,
//    aparezca donde se decide el modo de la tirada.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `mesa-cond-${marca}@example.com`,
    password: "password123",
    displayName: `MesaCond ${marca}`,
  };
}

/** Se usa para MONTAR, nunca para comprobar: lo que se mide sigue pasando en pantalla. */
/**
 * Abre una pestaña de la hoja y espera a que sea la activa. Desde la Tarea 7 (spec 2026-09-11)
 * la hoja son una cabecera fija y siete pestañas, y **solo se monta el contenido de la activa**:
 * cada tarjeta se busca después de abrir la suya. «Números» es la de arranque.
 */
async function abrirPestana(donde: Page | Locator, nombre: string) {
  await donde.getByRole("tab", { name: nombre }).click();
  await expect(donde.getByRole("tab", { name: nombre, selected: true })).toBeVisible();
}

async function comoLaSesion(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem("dnd_token"));
  return { Authorization: `Bearer ${token}` };
}

async function abrirHoja(page: Page) {
  const cuenta = nuevaCuenta();
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La bendición");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La bendición" }).click();

  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill("Elara");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  await page.getByRole("link", { name: "Elara" }).click();
  await expect(page.getByRole("heading", { name: "Elara" })).toBeVisible();

  const url = page.url();
  const campaignId = url.split("/campaigns/")[1].split("/")[0];
  const characterId = url.split("/personajes/")[1];
  // **Nivel 8, y el nivel es parte de la prueba**: a nivel 1 son 12 PG máximos y 25 de daño son
  // muerte masiva, con lo que la salvación no se pide nunca. Ese número exacto dejó el e2e de
  // 2.5.4 en rojo el día que se escribió sin ejecutarlo.
  const hoja = await page.request.patch(
    `/api/campaigns/${campaignId}/characters/${characterId}/sheet`,
    {
      headers: await comoLaSesion(page),
      data: {
        abilities: { str: 12, dex: 14, con: 14, int: 15, wis: 10, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
        level: 8,
        choices: { "fighter-skills": ["athletics", "perception"] },
      },
    },
  );
  expect(hoja.ok()).toBe(true);
  await page.reload();
  // La tarjeta de condiciones es de la pestaña «Estado» (Tarea 7, spec 2026-09-11); solo se
  // monta la pestaña activa, y la de arranque es «Números».
  await abrirPestana(page, "Estado");
  await expect(page.getByLabel("Nueva condición")).toBeVisible();
  return { campaignId, characterId };
}

test("marcar la concentración desde la hoja hace que el daño pida la salvación (ficha M17)", async ({
  page,
}) => {
  const { campaignId } = await abrirHoja(page);

  // --- Se marca desde la pantalla, que es justo lo que no se podía hacer ---
  await page.getByLabel("Nueva condición").selectOption("concentrating");
  await page.getByLabel("Conjuro en el que se concentra").fill("Bendición");
  await page.getByRole("button", { name: "Aplicar condición" }).click();

  // La fila de la TARJETA: la cabecera fija pinta además un chip por condición (`ul
  // "condiciones activas"`, Tarea 3) con el mismo título, y un `listitem` sin acotar ve dos.
  // Lo que se afirma —el efecto escrito debajo del nombre— solo lo dice la tarjeta.
  const entrada = page
    .locator('section[aria-label="condiciones"]')
    .getByRole("listitem")
    .filter({ hasText: "Concentración" });
  await expect(entrada).toBeVisible({ timeout: 10_000 });
  // Dice EN QUÉ se concentra, y nunca la clave del enumerado.
  await expect(entrada).toContainText("Concentración en Bendición");
  await expect(entrada).not.toContainText("concentrating");
  // Y dice lo que el servidor de verdad hace, no una promesa distinta.
  await expect(entrada).toContainText(/salvación de Constitución/i);

  // --- Y ahora el daño dispara la regla del servidor (los PG viven en «Recursos») ---
  await abrirPestana(page, "Recursos");
  await page.getByLabel("Cambio de puntos de golpe").fill("25");
  await page.getByRole("button", { name: "Aplicar daño" }).click();

  // **La petición aparece donde el jugador la sondea**, que es «Dados» y la mesa — no la hoja.
  // Ese detalle es medio hallazgo: `TiradasPendientes` no se monta en la hoja de personaje, así
  // que quien acaba de recibir el golpe no ve la salvación sin cambiar de pantalla.
  await page.goto(`/campaigns/${campaignId}?seccion=dice`);
  const pendientes = page.getByRole("region", { name: "Tiradas que te han pedido" });
  await expect(pendientes).toBeVisible({ timeout: 20_000 });
  await expect(pendientes).toContainText(/Salvación de concentración/i);
  // **La CD sale del daño tomado**: 25 → 12. Un daño par no distinguiría el redondeo hacia abajo.
  await expect(pendientes).toContainText("12");
});

test("una condición pone su aviso donde se decide el modo de la tirada (ficha M16)", async ({
  page,
}) => {
  await abrirHoja(page);

  // Sin condiciones, el panel no inventa ningún aviso. Las habilidades están en «Números».
  await abrirPestana(page, "Números");
  await page.getByRole("button", { name: "Tirada de Percepción" }).click();
  const panel = page.getByRole("group", { name: "Tirada de Percepción" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("status")).toHaveCount(0);
  await expect(panel.getByRole("radio", { name: "Normal" })).toBeChecked();
  await page.keyboard.press("Escape");

  // Envenenado: desventaja en pruebas de característica (SRD 5.1). Se pone en «Estado» y se
  // vuelve a «Números» para tirar.
  await abrirPestana(page, "Estado");
  await page.getByLabel("Nueva condición").selectOption("poisoned");
  await page.getByRole("button", { name: "Aplicar condición" }).click();
  await expect(
    page
      .locator('section[aria-label="condiciones"]')
      .getByRole("listitem")
      .filter({ hasText: "Envenenado" }),
  ).toBeVisible({ timeout: 10_000 });

  await abrirPestana(page, "Números");
  await page.getByRole("button", { name: "Tirada de Percepción" }).click();
  const conAviso = page.getByRole("group", { name: "Tirada de Percepción" });
  await expect(conAviso.getByRole("status")).toContainText("Desventaja sugerida: Envenenado", {
    timeout: 15_000,
  });
  // **Preseleccionado y editable**: sugiere, no impone (D-2.5-6). Las tres opciones siguen ahí.
  //
  // `exact: true` en «Ventaja», y no es un detalle: por defecto Playwright casa por subcadena, así
  // que «Ventaja» encuentra **también** «Desventaja» y la consulta falla por modo estricto. Es el
  // mismo tropiezo de nombres que ya costó un `spec` en B1.1, esta vez entre dos opciones del
  // mismo grupo de radios.
  const ventaja = conAviso.getByRole("radio", { name: "Ventaja", exact: true });
  await expect(conAviso.getByRole("radio", { name: "Desventaja" })).toBeChecked();
  await expect(ventaja).toBeEnabled();
  await ventaja.check();
  await expect(ventaja).toBeChecked();
  await expect(conAviso.getByRole("radio", { name: "Desventaja" })).not.toBeChecked();

  // Y una salvación de Fuerza NO lleva aviso: envenenado no las toca, así que un aviso ahí
  // sería el sistema inventándose una regla.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Tirada de Salvación de Fuerza" }).click();
  const salvacion = page.getByRole("group", { name: "Tirada de Salvación de Fuerza" });
  await expect(salvacion).toBeVisible();
  await expect(salvacion.getByRole("status")).toHaveCount(0);
});
