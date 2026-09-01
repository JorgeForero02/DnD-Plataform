import { test, expect, type Browser, type Page } from "@playwright/test";

// Cada corrida crea sus propias cuentas: las pruebas no dependen de datos sembrados ni se
// pisan entre si al repetirse contra la misma base de desarrollo.
function nuevaCuenta(prefijo: string) {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `e2e-${prefijo}-${marca}@example.com`,
    password: "password123",
    displayName: `${prefijo} ${marca}`,
  };
}

async function registrarse(page: Page, prefijo: string) {
  const cuenta = nuevaCuenta(prefijo);
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Email").fill(cuenta.email);
  await page.getByLabel("Password").fill(cuenta.password);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("heading", { name: "Mis campañas" })).toBeVisible();
  return cuenta;
}

test("el DM invita, el jugador entra por el enlace y no ve la entidad DM_ONLY", async ({
  browser,
}: {
  browser: Browser;
}) => {
  // Contexto 1: el DM. Sesión y cookies propias, independientes del jugador.
  const dmContext = await browser.newContext();
  const dmPage = await dmContext.newPage();
  await registrarse(dmPage, "dm");

  await dmPage.getByRole("button", { name: "Nueva campaña" }).click();
  await dmPage.getByLabel("Nombre").fill("La Mina Perdida de Phandelver");
  await dmPage.getByRole("button", { name: "Crear" }).click();
  await dmPage.getByRole("link", { name: "La Mina Perdida de Phandelver" }).click();
  await expect(
    dmPage.getByRole("heading", { name: "La Mina Perdida de Phandelver" }),
  ).toBeVisible();

  // Crear una entidad DM_ONLY antes de invitar: es la comprobación que le falta a la fase,
  // hecha por fin sobre el DOM real, no solo por HTTP (apps/api/test/*.e2e-spec.ts).
  await dmPage.getByRole("button", { name: "NPCs" }).click();
  await dmPage.getByRole("button", { name: "Nuevo" }).click();
  await dmPage.getByLabel("Nombre").fill("El secreto de Cragmaw");
  await dmPage.getByLabel("Visibilidad").selectOption("DM_ONLY");
  await dmPage.getByRole("button", { name: "Guardar" }).click();
  await expect(dmPage.getByRole("button", { name: "Guardar" })).toBeHidden();
  const dmOnlyNpc = dmPage.getByRole("button", { name: /El secreto de Cragmaw/ });
  await expect(dmOnlyNpc).toBeVisible();
  await expect(dmOnlyNpc).toContainText("DM_ONLY");

  // Generar la invitación desde el resumen, donde vive InvitePanel.
  await dmPage.getByRole("button", { name: "Resumen" }).click();
  await dmPage.getByRole("button", { name: "Generar invitación" }).click();

  // Leer el enlace DE LA PANTALLA, no construirlo a mano: si se construyera con el token
  // conocido de antemano, esto no probaría que la pantalla lo pinta de verdad.
  const linkField = dmPage.getByLabel("Enlace de invitación");
  await expect(linkField).toBeVisible();
  const inviteUrl = await linkField.inputValue();
  expect(inviteUrl).toMatch(/\/join\/.+/);

  // Arreglo 2: el DM abre su propio enlace para comprobar que funciona. Antes de 1.14-fix la
  // aceptación se disparaba sola al montar y esto quemaba el enlace (usedAt se marcaba aunque
  // el rol no cambiara) sin que nadie lo avisara. Ahora ve una confirmación explícita, dice
  // que aceptar consume el enlace, y el DM puede irse sin pulsar "Unirse".
  await dmPage.goto(inviteUrl);
  await expect(
    dmPage.getByText("Estás a punto de unirte a una campaña con esta invitación."),
  ).toBeVisible();
  await expect(dmPage.getByText(/consume el enlace/)).toBeVisible();
  await dmPage.getByRole("link", { name: "Cancelar" }).click();
  await expect(dmPage.getByRole("heading", { name: "Mis campañas" })).toBeVisible();

  // Contexto 2: el jugador. Navegador nuevo, sin la sesión del DM.
  const playerContext = await browser.newContext();
  const playerPage = await playerContext.newPage();

  // Visita el enlace sin sesión: uno de los tres caminos que JoinPage tiene que cubrir.
  await playerPage.goto(inviteUrl);
  await expect(
    playerPage.getByText("Necesitas iniciar sesión para aceptar esta invitación."),
  ).toBeVisible();

  // Se registra desde ahí mismo: al volver, la invitación se completa sola.
  await playerPage.getByRole("link", { name: "Crear cuenta" }).click();
  const jugador = nuevaCuenta("jugador");
  await playerPage.getByLabel("Nombre").fill(jugador.displayName);
  await playerPage.getByLabel("Email").fill(jugador.email);
  await playerPage.getByLabel("Password").fill(jugador.password);
  await playerPage.getByRole("button", { name: "Register" }).click();

  // Sin volver a pegar el enlace: cae en la pantalla de confirmación de /join/:token (arreglo 1
  // del Crítico), que el DM comprobó arriba que no se salta sola. El jugador sí pulsa "Unirse":
  // este es el clic que ejerce la aceptación real.
  await expect(
    playerPage.getByText("Estás a punto de unirte a una campaña con esta invitación."),
  ).toBeVisible();
  await playerPage.getByRole("button", { name: "Unirse a la campaña" }).click();

  await expect(
    playerPage.getByRole("heading", { name: "La Mina Perdida de Phandelver" }),
  ).toBeVisible();

  // La comprobación que llevaba toda la fase debiendo: el jugador no ve la entidad DM_ONLY.
  await playerPage.getByRole("button", { name: "NPCs" }).click();
  await expect(playerPage.getByText("Sin elementos.")).toBeVisible();
  await expect(playerPage.getByRole("button", { name: /El secreto de Cragmaw/ })).toHaveCount(0);

  await dmContext.close();
  await playerContext.close();
});
