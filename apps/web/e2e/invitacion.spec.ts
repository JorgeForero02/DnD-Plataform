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
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Mis campañas" })).toBeVisible();
  return cuenta;
}

// Reseño 2026-09-02: este recorrido cruza ahora dos páginas más por cada ficha que abre —
// leer y editar dejaron de ser la misma pantalla— y con dos navegadores en juego se pasaba de
// los 30 s por defecto. Se le da su propio presupuesto en vez de recortar lo que comprueba.
test.setTimeout(90_000);

test("el DM invita, el jugador entra por el enlace y no ve la entidad DM_ONLY", async ({
  browser,
}: {
  browser: Browser;
}) => {
  // Contexto 1: el DM. Sesión y cookies propias, independientes del jugador.
  const dmContext = await browser.newContext();
  const dmPage = await dmContext.newPage();
  await registrarse(dmPage, "dm");

  await dmPage.getByRole("button", { name: "Nueva campaña" }).first().click();
  await dmPage.getByLabel("Nombre").fill("La Mina Perdida de Phandelver");
  await dmPage.getByRole("button", { name: "Crear" }).click();
  await dmPage.getByRole("link", { name: "La Mina Perdida de Phandelver" }).click();
  await expect(
    dmPage.getByRole("heading", { name: "La Mina Perdida de Phandelver" }),
  ).toBeVisible();

  // Crear una entidad DM_ONLY antes de invitar: es la comprobación que le falta a la fase,
  // hecha por fin sobre el DOM real, no solo por HTTP (apps/api/test/*.e2e-spec.ts).
  await dmPage.getByRole("tab", { name: "PNJ" }).click();
  await dmPage.getByRole("button", { name: "Nuevo PNJ" }).click();
  await dmPage.getByLabel("Nombre").fill("El secreto de Cragmaw");
  await dmPage.getByRole("radio", { name: /Solo DM/ }).check();
  await dmPage.getByRole("button", { name: "Guardar" }).click();
  await expect(dmPage.getByRole("button", { name: "Guardar" })).toBeHidden();
  const dmOnlyNpc = dmPage.getByRole("link", { name: /El secreto de Cragmaw/ });
  await expect(dmOnlyNpc).toBeVisible();
  // Task 1.19 converted the raw "DM_ONLY" text to the Badge primitive — icon + Spanish label,
  // not the enum value. The row still carries the real visibility level as data-visibility.
  await expect(dmOnlyNpc).toContainText("Solo DM");
  await expect(dmOnlyNpc.locator('[data-visibility="DM_ONLY"]')).toBeVisible();

  // Arreglo 1 (1.15-fix), Crítico: además un NPC PLAYERS, creado por el DM, con un comentario
  // suyo ya puesto — es la entidad que el jugador va a abrir y LEER más abajo sin poder
  // editarla. Sin este NPC, el recorrido de invitación nunca ejercía la fila
  // visible-pero-no-editable: la única entidad del DM era DM_ONLY, así que el jugador solo
  // veía "Sin elementos." y el defecto de la fila deshabilitada (fila = único botón de
  // editar, sin ninguna vista de lectura separada) pasaba desapercibido.
  await dmPage.getByRole("button", { name: "Nuevo PNJ" }).click();
  await dmPage.getByLabel("Nombre").fill("Gundren Rockseeker");
  await dmPage.getByRole("radio", { name: /Todos los que se sientan a esta mesa/ }).check();
  await dmPage.getByRole("button", { name: "Guardar" }).click();
  await expect(dmPage.getByRole("button", { name: "Guardar" })).toBeHidden();
  const playersNpcRowDm = dmPage.getByRole("link", { name: /Gundren Rockseeker/ });
  await expect(playersNpcRowDm).toBeVisible();
  // Task 1.19 converted the raw "PLAYERS" text to the Badge primitive — icon + Spanish label,
  // not the enum value. The row still carries the real visibility level as data-visibility.
  await expect(playersNpcRowDm).toContainText("Jugadores");
  await expect(playersNpcRowDm.locator('[data-visibility="PLAYERS"]')).toBeVisible();
  await playersNpcRowDm.click();
  await dmPage
    .getByLabel("Nuevo comentario")
    .fill("Gundren contrató a los aventureros en Piedra del Fuego.");
  await dmPage.getByRole("button", { name: "Publicar" }).click();
  await expect(
    dmPage.getByText("Gundren contrató a los aventureros en Piedra del Fuego."),
  ).toBeVisible();
  // Reseño 2026-09-02: comentar ya no ocurre dentro de un modal, así que no hay nada que
  // cerrar; se sigue navegando desde la propia página.

  // Reseño 2026-09-02: se sale de la ficha por las migas, e InvitePanel vive ahora en
  // "Ajustes" y no en la primera sección — el resumen dejó de ser un formulario de
  // administración y pasó a decir qué ocurre en la mesa.
  await dmPage.getByRole("link", { name: "La Mina Perdida de Phandelver" }).click();
  await dmPage.getByRole("tab", { name: "Ajustes" }).click();
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
  await playerPage.getByLabel("Correo").fill(jugador.email);
  await playerPage.getByLabel("Contraseña").fill(jugador.password);
  await playerPage.getByRole("button", { name: "Crear cuenta" }).click();

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
  await playerPage.getByRole("tab", { name: "PNJ" }).click();
  await expect(playerPage.getByRole("link", { name: /El secreto de Cragmaw/ })).toHaveCount(0);

  // Arreglo 1 (1.15-fix), Crítico: el jugador SÍ ve la entidad PLAYERS y la fila abre.
  // Reseño 2026-09-02: abre la PÁGINA DE LECTURA, que es la mejora — leer una ficha ya no
  // exige abrir un formulario. Lo que el permiso cambia sigue siendo lo mismo: el editor al
  // que llega desde ahí está en modo lectura.
  const playersNpcRowPlayer = playerPage.getByRole("link", { name: /Gundren Rockseeker/ });
  await expect(playersNpcRowPlayer).toBeVisible();
  await expect(playersNpcRowPlayer).toBeEnabled();
  await playersNpcRowPlayer.click();
  await expect(playerPage.getByRole("heading", { name: "Gundren Rockseeker" })).toBeVisible();
  await playerPage
    .getByRole("button", { name: /Editar|Ver el texto completo|Ver la hoja completa/ })
    .click();
  await expect(playerPage.getByRole("heading", { name: "Editar PNJ" })).toBeVisible();
  // Lee su contenido: el nombre real, no un formulario vacío.
  await expect(playerPage.getByLabel("Nombre")).toHaveValue("Gundren Rockseeker");
  await expect(playerPage.getByLabel("Nombre")).toBeDisabled();
  await expect(playerPage.getByRole("button", { name: "Guardar" })).toBeDisabled();
  // getByText alone matches both the row's badge (still in the DOM behind the modal) and the
  // editor's own read-only notice — scope to the paragraph the editor renders.
  await expect(
    playerPage.getByRole("paragraph").filter({ hasText: "Solo el DM o quien lo creó" }),
  ).toBeVisible();
  // Cerrar el editor y volver a la ficha: desde el reseño del 2026-09-02 los comentarios
  // viven en la página, no dentro del diálogo, así que hay que salir de él para llegar.
  await playerPage.getByRole("button", { name: "Cancelar" }).click();
  await expect(playerPage.getByRole("heading", { name: "Editar PNJ" })).toBeHidden();

  // Y el hilo de comentarios: lee el que puso el DM y publica el suyo — comentar es de
  // cualquiera que pueda ver la entidad (comments.service.ts exige solo canView), así que
  // el modo lectura del formulario no debe apagar esto.
  await expect(
    playerPage.getByText("Gundren contrató a los aventureros en Piedra del Fuego."),
  ).toBeVisible();
  await playerPage.getByLabel("Nuevo comentario").fill("¡Encontramos la mina!");
  await playerPage.getByRole("button", { name: "Publicar" }).click();
  await expect(playerPage.getByText("¡Encontramos la mina!")).toBeVisible();
  // Reseño 2026-09-02: comentar ocurre en la página de la ficha, así que aquí no hay modal
  // que cerrar; se vuelve a la campaña por las migas de pan.
  await playerPage.getByRole("link", { name: "La Mina Perdida de Phandelver" }).click();

  // 1.15: la interfaz ya conoce el rol de quien la usa (useMyRole,
  // features/campaigns/members.ts), así que "Nuevo" en Sesiones deja de ofrecer una acción
  // que el servidor (sessions.service.ts, requireDM) va a rechazar. Deshabilitado, no oculto
  // — con un motivo, no en silencio.
  await playerPage.getByRole("tab", { name: "Sesiones" }).click();
  const playerNewSession = playerPage.getByRole("button", { name: "Nueva sesión" });
  await expect(playerNewSession).toBeDisabled();
  await expect(playerPage.getByText("Solo el DM puede crear o editar sesiones.")).toBeVisible();

  // El DM, en su propia sesión de navegador, sí puede: sin esto la comprobación de arriba
  // pasaría igual con todo deshabilitado para todo el mundo. El DM está en el listado de
  // campañas (canceló su propio enlace más arriba), así que vuelve a entrar primero.
  await dmPage.getByRole("link", { name: "La Mina Perdida de Phandelver" }).click();
  await expect(
    dmPage.getByRole("heading", { name: "La Mina Perdida de Phandelver" }),
  ).toBeVisible();
  await dmPage.getByRole("tab", { name: "Sesiones" }).click();
  const dmNewSession = dmPage.getByRole("button", { name: "Nueva sesión" });
  await expect(dmNewSession).toBeEnabled();
  await dmNewSession.click();
  await expect(dmPage.getByRole("heading", { name: "Nueva sesión" })).toBeVisible();
  await dmPage.getByLabel("Título").fill("Sesión de prueba del DM");
  await dmPage.getByRole("button", { name: "Guardar" }).click();
  await expect(dmPage.getByRole("heading", { name: "Nueva sesión" })).toBeHidden();
  await expect(dmPage.getByRole("button", { name: /Sesión de prueba del DM/ })).toBeVisible();

  await dmContext.close();
  await playerContext.close();
});
