import { test, expect, type Browser, type Page } from "@playwright/test";

// Cada corrida crea su propio usuario: las pruebas no dependen de datos sembrados
// ni se pisan entre si al repetirse contra la misma base de desarrollo.
function nuevaCuenta(prefijo = "DM") {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `e2e-${marca}@example.com`,
    password: "password123",
    displayName: `${prefijo} ${marca}`,
  };
}

async function registrarse(page: Page) {
  const cuenta = nuevaCuenta();
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Mis campañas" })).toBeVisible();
  return cuenta;
}

test("del registro a ver un NPC recien creado en su pestaña", async ({ page }) => {
  await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).click();
  await page.getByLabel("Nombre").fill("La Tumba de la Aniquilación");
  await page.getByRole("button", { name: "Crear" }).click();

  await page.getByRole("link", { name: "La Tumba de la Aniquilación" }).click();
  await expect(page.getByRole("heading", { name: "La Tumba de la Aniquilación" })).toBeVisible();

  await page.getByRole("tab", { name: "PNJ" }).click();
  await expect(page.getByText("Ningún personaje del mundo todavía")).toBeVisible();

  await page.getByRole("button", { name: "Nuevo PNJ" }).click();
  await page.getByLabel("Nombre").fill("Acererak");
  await page.getByLabel("Etiquetas (separadas por coma)").fill("lich, villano");
  await page.getByLabel("Visibilidad").selectOption("DM_ONLY");
  await page.getByRole("button", { name: "Guardar" }).click();

  // El editor se cierra y la entidad aparece en la lista con su visibilidad.
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  const npc = page.getByRole("button", { name: /Acererak/ });
  await expect(npc).toBeVisible();
  // Task 1.19 converted the raw "DM_ONLY" text to the Badge primitive — icon + Spanish label,
  // not the enum value. The row still carries the real visibility level as data-visibility.
  await expect(npc).toContainText("Solo DM");
  await expect(npc.locator('[data-visibility="DM_ONLY"]')).toBeVisible();
});

test("modo edicion abre enlaces y comentarios, y los dos se ejercitan de verdad", async ({
  page,
}) => {
  await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).click();
  await page.getByLabel("Nombre").fill("Descenso a Avernus");
  await page.getByRole("button", { name: "Crear" }).click();

  await page.getByRole("link", { name: "Descenso a Avernus" }).click();
  await expect(page.getByRole("heading", { name: "Descenso a Avernus" })).toBeVisible();

  await page.getByRole("tab", { name: "PNJ" }).click();

  // Hacen falta dos NPCs: uno para abrir en modo edición y otro para enlazarlo.
  await page.getByRole("button", { name: "Nuevo PNJ" }).click();
  await page.getByLabel("Nombre").fill("Zariel");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("button", { name: "Nuevo PNJ" }).click();
  await page.getByLabel("Nombre").fill("Mahadi");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  // Abrir Zariel en modo edición: EntityEditor solo pinta LinksPanel y CommentThread
  // cuando `isEdit && entity` (EntityEditor.tsx), así que este clic es el paso que el
  // único recorrido anterior nunca daba.
  await page.getByRole("button", { name: /Zariel/ }).click();
  await expect(page.getByRole("heading", { name: "Editar NPC" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Enlaces" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comentarios" })).toBeVisible();

  // Enlazar Zariel con Mahadi y comprobar que aparece en la lista de enlaces. Se acota al
  // panel "Enlaces" con un hijo directo `> h3`: CampaignDetailPage envuelve toda la pestaña
  // (lista de NPCs incluida) en su propio `<section>`, así que "has" sin combinador de hijo
  // directo también lo capturaría a él.
  const linksSection = page
    .locator("section")
    .filter({ has: page.locator("> h3", { hasText: "Enlaces" }) });
  await linksSection.getByLabel("Entidad destino").selectOption({ label: "Mahadi (NPC)" });
  await linksSection.getByLabel("Etiqueta del enlace").fill("rival");
  await linksSection.getByRole("button", { name: "Añadir enlace" }).click();
  const linkRow = linksSection.locator("li").filter({ hasText: "Mahadi" });
  await expect(linkRow).toBeVisible();
  await expect(linkRow).toContainText("rival");

  // Publicar un comentario y comprobar que aparece con su texto.
  await page.getByLabel("Nuevo comentario").fill("Cuidado con el mercado de almas");
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("Cuidado con el mercado de almas")).toBeVisible();
});

// Task 1.16: ejerce la cascada del esquema (schema.prisma: Entity -> EntityLink, onDelete:
// Cascade) contra la base real, no un espía. Un espía nunca podría probar esto: al borrar
// Mahadi de verdad en Postgres, el enlace que Zariel tenía hacia él desaparece con él, y solo
// se ve reabriendo el panel de enlaces de Zariel y comprobando que ya no está. Se comenta en
// Mahadi antes de borrarlo (paso 2) para ejercer también la ruta de "Publicar", pero la
// cascada de comentarios no es verificable desde aquí: la entidad que los contenía ya no
// existe tras borrarla, así que no hay dónde comprobarlos.
test("borrar una entidad se lleva sus enlaces consigo (cascada real)", async ({ page }) => {
  await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).click();
  await page.getByLabel("Nombre").fill("La Maldición de Strahd");
  await page.getByRole("button", { name: "Crear" }).click();

  await page.getByRole("link", { name: "La Maldición de Strahd" }).click();
  await expect(page.getByRole("heading", { name: "La Maldición de Strahd" })).toBeVisible();

  await page.getByRole("tab", { name: "PNJ" }).click();

  // Dos NPCs: Zariel enlaza con Mahadi, y Mahadi recibe un comentario. Borrar Mahadi debe
  // llevarse los dos consigo.
  await page.getByRole("button", { name: "Nuevo PNJ" }).click();
  await page.getByLabel("Nombre").fill("Zariel");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("button", { name: "Nuevo PNJ" }).click();
  await page.getByLabel("Nombre").fill("Mahadi");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  // 1. Enlazar Zariel con Mahadi.
  await page.getByRole("button", { name: /Zariel/ }).click();
  await expect(page.getByRole("heading", { name: "Editar NPC" })).toBeVisible();
  const zarielLinksSection = page
    .locator("section")
    .filter({ has: page.locator("> h3", { hasText: "Enlaces" }) });
  await zarielLinksSection.getByLabel("Entidad destino").selectOption({ label: "Mahadi (NPC)" });
  await zarielLinksSection.getByRole("button", { name: "Añadir enlace" }).click();
  await expect(zarielLinksSection.locator("li").filter({ hasText: "Mahadi" })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();

  // 2. Comentar en Mahadi.
  await page.getByRole("button", { name: /Mahadi/ }).click();
  await expect(page.getByRole("heading", { name: "Editar NPC" })).toBeVisible();
  await page.getByLabel("Nuevo comentario").fill("No confíes en sus tratos");
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("No confíes en sus tratos")).toBeVisible();

  // 3. Borrar Mahadi, confirmando en la propia pantalla — nada de window.confirm. Scoped to
  // <form>: the entity's own "Borrar" and the comment thread's "Borrar" (on the comment just
  // posted) share the same accessible name once a comment exists. Task 1.19b: filtered by the
  // "Nombre" field instead of the "Editar NPC" heading — EntityEditor.tsx now renders inside
  // the Dialog primitive, which paints the title itself as a sibling of <form>, not a
  // descendant of it, so a heading-inside-form filter no longer matches anything. "Nombre" is
  // still unique to the entity's own form: LinksPanel's and CommentThread's forms (also open
  // here, both real <form> elements) have no field with that label.
  const entityForm = page.locator("form").filter({ has: page.getByLabel("Nombre") });
  await entityForm.getByRole("button", { name: "Borrar" }).click();
  await expect(
    page.getByText(
      /No se puede deshacer: se borrarán también todos los enlaces en los que aparece/,
    ),
  ).toBeVisible();
  await entityForm.getByRole("button", { name: "Sí, borrar definitivamente" }).click();
  await expect(page.getByRole("heading", { name: "Editar NPC" })).toBeHidden();

  // 4a. Desaparece de la lista.
  await expect(page.getByRole("button", { name: /Mahadi/ })).toHaveCount(0);

  // 4b. El panel de enlaces de Zariel ya no lo muestra: la cascada borró el EntityLink de
  // verdad en Postgres, no solo la fila de la lista de Mahadi.
  await page.getByRole("button", { name: /Zariel/ }).click();
  await expect(page.getByRole("heading", { name: "Editar NPC" })).toBeVisible();
  const reopenedLinksSection = page
    .locator("section")
    .filter({ has: page.locator("> h3", { hasText: "Enlaces" }) });
  await expect(reopenedLinksSection.getByText("Sin enlaces.")).toBeVisible();
  await expect(reopenedLinksSection.locator("li").filter({ hasText: "Mahadi" })).toHaveCount(0);
});

test("crear una sesion y un personaje desde sus pestañas, con su visibilidad", async ({ page }) => {
  await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).click();
  await page.getByLabel("Nombre").fill("Fuera del Abismo");
  await page.getByRole("button", { name: "Crear" }).click();

  await page.getByRole("link", { name: "Fuera del Abismo" }).click();
  await expect(page.getByRole("heading", { name: "Fuera del Abismo" })).toBeVisible();

  // Pestaña de Sesiones: hoy no la visita ningún recorrido de Playwright, así que
  // SessionsTab, el botón "Nuevo" propio y SessionEditor nunca se habían pintado en un
  // navegador real.
  await page.getByRole("tab", { name: "Sesiones" }).click();
  await expect(page.getByText("Ninguna sesión todavía")).toBeVisible();

  await page.getByRole("button", { name: "Nueva sesión" }).click();
  await expect(page.getByRole("heading", { name: "Nueva sesión" })).toBeVisible();
  await page.getByLabel("Título").fill("Sesión 1: la entrada al abismo");
  await page.getByLabel("Fecha y hora").fill("2026-10-03T19:00");
  await page.getByLabel("Notas").fill("Traer las miniaturas de demonios");
  await page.getByLabel("Visibilidad").selectOption("DM_ONLY");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByRole("heading", { name: "Nueva sesión" })).toBeHidden();
  const sessionRow = page.getByRole("button", { name: /Sesión 1: la entrada al abismo/ });
  await expect(sessionRow).toBeVisible();
  // Task 1.19 converted the raw "DM_ONLY" text to the Badge primitive — icon + Spanish label,
  // not the enum value. The row still carries the real visibility level as data-visibility.
  await expect(sessionRow).toContainText("Solo DM");
  await expect(sessionRow.locator('[data-visibility="DM_ONLY"]')).toBeVisible();

  // Abrir la sesión recién creada en modo edición: comprueba la precarga de un formulario
  // real contra la API real, no solo contra un espía.
  await sessionRow.click();
  await expect(page.getByRole("heading", { name: "Editar sesión" })).toBeVisible();
  await expect(page.getByLabel("Título")).toHaveValue("Sesión 1: la entrada al abismo");
  await expect(page.getByLabel("Notas")).toHaveValue("Traer las miniaturas de demonios");

  // Arreglo 1, de punta a punta contra la API real: vaciar las notas y guardar debe borrarlas
  // de verdad, no dejar el valor viejo porque la clave se omitió del PATCH. Se cambia también
  // el título para distinguir esta fila de otras filas "Sesión 1..." en la lista.
  await page.getByLabel("Título").fill("Sesión 1: notas borradas");
  await page.getByLabel("Notas").fill("");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("heading", { name: "Editar sesión" })).toBeHidden();

  const renamedSessionRow = page.getByRole("button", { name: /Sesión 1: notas borradas/ });
  await expect(renamedSessionRow).toBeVisible();

  // Reabrir para comprobar, contra la API real (no un espía), que las notas siguen vacías:
  // es el hallazgo que arregla 1.13-fix — un PATCH que omite la clave deja el valor viejo.
  await renamedSessionRow.click();
  await expect(page.getByRole("heading", { name: "Editar sesión" })).toBeVisible();
  await expect(page.getByLabel("Título")).toHaveValue("Sesión 1: notas borradas");
  await expect(page.getByLabel("Notas")).toHaveValue("");
  await page.getByRole("button", { name: "Cancelar" }).click();

  // Pestaña de Personajes: mismo hueco — CharactersTab, su botón "Nuevo" y CharacterEditor
  // tampoco los pintaba nunca un navegador real.
  await page.getByRole("tab", { name: "Personajes" }).click();
  await expect(page.getByText("Ningún personaje todavía")).toBeVisible();

  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await expect(page.getByRole("heading", { name: "Nuevo personaje" })).toBeVisible();
  await page.getByLabel("Nombre").fill("Kaelith");
  await page.getByLabel("Raza").fill("Tiefling");
  await page.getByLabel("Clase").fill("Brujo");
  await page.getByLabel("Nivel").fill("3");
  await page.getByLabel("Biografía").fill("Pactó con un demonio para salvar a su aldea");
  await page.getByLabel("Visibilidad").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByRole("heading", { name: "Nuevo personaje" })).toBeHidden();
  const characterRow = page.getByRole("button", { name: /Kaelith/ });
  await expect(characterRow).toBeVisible();
  await expect(characterRow).toContainText("Nivel 3");

  // Abrir el personaje en modo edición y comprobar que raza, clase y biografía —
  // los campos que la interfaz de solo lectura ni siquiera mostraba — precargan de verdad.
  await characterRow.click();
  await expect(page.getByRole("heading", { name: "Editar personaje" })).toBeVisible();
  await expect(page.getByLabel("Raza")).toHaveValue("Tiefling");
  await expect(page.getByLabel("Clase")).toHaveValue("Brujo");
  await expect(page.getByLabel("Nivel")).toHaveValue("3");
  await expect(page.getByLabel("Biografía")).toHaveValue(
    "Pactó con un demonio para salvar a su aldea",
  );
  await expect(page.getByLabel("Visibilidad")).toHaveValue("PUBLIC");

  // Guardar la edición de verdad: subir el nivel a 4 y comprobar en la lista que el `PATCH`
  // se ejecutó contra la API real, no solo que el formulario se cerró.
  await page.getByLabel("Nivel").fill("4");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("heading", { name: "Editar personaje" })).toBeHidden();

  const updatedCharacterRow = page.getByRole("button", { name: /Kaelith/ });
  await expect(updatedCharacterRow).toBeVisible();
  await expect(updatedCharacterRow).toContainText("Nivel 4");

  // Task 1.16: borrar el personaje de verdad contra la API real — el botón "Borrar" y su
  // confirmación en pantalla nunca se habían pintado en un navegador antes de esta tarea.
  await updatedCharacterRow.click();
  await expect(page.getByRole("heading", { name: "Editar personaje" })).toBeVisible();
  await page.getByRole("button", { name: "Borrar" }).click();
  await expect(page.getByText('Vas a borrar a "Kaelith". No se puede deshacer.')).toBeVisible();
  await page.getByRole("button", { name: "Sí, borrar definitivamente" }).click();
  await expect(page.getByRole("heading", { name: "Editar personaje" })).toBeHidden();
  await expect(page.getByRole("button", { name: /Kaelith/ })).toHaveCount(0);

  // Y la sesión, contra la API real, incluyendo la cancelación: pulsar "No, cancelar" no borra
  // y deja el editor abierto.
  await page.getByRole("tab", { name: "Sesiones" }).click();
  const finalSessionRow = page.getByRole("button", { name: /Sesión 1: notas borradas/ });
  await finalSessionRow.click();
  await expect(page.getByRole("heading", { name: "Editar sesión" })).toBeVisible();
  await page.getByRole("button", { name: "Borrar" }).click();
  await page.getByRole("button", { name: "No, cancelar" }).click();
  await expect(page.getByRole("heading", { name: "Editar sesión" })).toBeVisible();
  await page.getByRole("button", { name: "Borrar" }).click();
  await page.getByRole("button", { name: "Sí, borrar definitivamente" }).click();
  await expect(page.getByRole("heading", { name: "Editar sesión" })).toBeHidden();
  await expect(page.getByRole("button", { name: /Sesión 1: notas borradas/ })).toHaveCount(0);
});

test("salir cierra la sesion y la ruta protegida deja de abrirse", async ({ page }) => {
  await registrarse(page);

  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/login$/);

  // Volver a la ruta protegida a mano no debe devolver el panel.
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Mis campañas" })).toHaveCount(0);
});

// Task 1.17b · A1: el cuerpo Markdown de una ficha, de punta a punta contra la API real —
// crear con un ## Título, cerrar, reabrir y ver el título como encabezado accesible en la
// vista previa, no como texto literal con almohadillas.
test("el cuerpo Markdown de una ficha se guarda y se ve como encabezado al reabrirla", async ({
  page,
}) => {
  await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).click();
  await page.getByLabel("Nombre").fill("La Forja de la Ira");
  await page.getByRole("button", { name: "Crear" }).click();

  await page.getByRole("link", { name: "La Forja de la Ira" }).click();
  await expect(page.getByRole("heading", { name: "La Forja de la Ira" })).toBeVisible();

  await page.getByRole("tab", { name: "PNJ" }).click();
  await page.getByRole("button", { name: "Nuevo PNJ" }).click();
  await page.getByLabel("Nombre").fill("Durgeddin el Negro");
  await page.getByLabel("Texto").fill("## Título\n\nUn herrero enano legendario.");
  await page.getByRole("button", { name: "Guardar" }).click();

  // El editor se cierra: el body viajó de verdad en el POST, no solo en el estado local.
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  // Reabrir la ficha: el textarea precarga el markdown crudo desde la respuesta del GET.
  await page.getByRole("button", { name: /Durgeddin el Negro/ }).click();
  await expect(page.getByRole("heading", { name: "Editar NPC" })).toBeVisible();
  await expect(page.getByLabel("Texto")).toHaveValue("## Título\n\nUn herrero enano legendario.");

  // Cambiar a vista previa: el ## se pinta como encabezado accesible, no como texto literal.
  await page.getByRole("button", { name: "Vista previa" }).click();
  await expect(page.getByRole("heading", { name: "Título" })).toBeVisible();
  await expect(page.getByText("## Título")).toHaveCount(0);
});

// Task 1.17c · A2 + C1: las etiquetas se guardaban y no se leían en ninguna parte, y no había
// filtro ni búsqueda en ninguna pantalla. De punta a punta contra la API real: crea dos
// fichas con etiquetas distintas, filtra por una y comprueba que la otra desaparece de
// verdad del DOM, y que quitar el filtro la devuelve.
test("filtrar por etiqueta oculta las fichas que no la llevan, y quitar el filtro las devuelve", async ({
  page,
}) => {
  await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).click();
  await page.getByLabel("Nombre").fill("El Refugio del Contrabandista");
  await page.getByRole("button", { name: "Crear" }).click();

  await page.getByRole("link", { name: "El Refugio del Contrabandista" }).click();
  await expect(page.getByRole("heading", { name: "El Refugio del Contrabandista" })).toBeVisible();

  await page.getByRole("tab", { name: "PNJ" }).click();
  await expect(page.getByText("Ningún personaje del mundo todavía")).toBeVisible();

  await page.getByRole("button", { name: "Nuevo PNJ" }).click();
  await page.getByLabel("Nombre").fill("Acererak");
  await page.getByLabel("Etiquetas (separadas por coma)").fill("lich, villano");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("button", { name: "Nuevo PNJ" }).click();
  await page.getByLabel("Nombre").fill("Vlaakith");
  await page.getByLabel("Etiquetas (separadas por coma)").fill("aliado");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  const acererak = page.getByRole("button", { name: /Acererak/ });
  const vlaakith = page.getByRole("button", { name: /Vlaakith/ });
  await expect(acererak).toBeVisible();
  await expect(vlaakith).toBeVisible();
  // Las etiquetas guardadas ahora se leen en la fila: A2 corregido.
  await expect(acererak).toContainText("lich");
  await expect(acererak).toContainText("villano");

  // Filtrar por "lich": Vlaakith, que no lleva esa etiqueta, desaparece del DOM.
  await page.getByRole("button", { name: "lich", exact: true }).click();
  await expect(vlaakith).toHaveCount(0);
  await expect(acererak).toBeVisible();

  // Quitar el filtro: la lista completa vuelve.
  await page.getByRole("button", { name: "Quitar filtros" }).click();
  await expect(vlaakith).toBeVisible();
  await expect(acererak).toBeVisible();
});

// Task 1.17d · B1 + B2: la API de editar/borrar campaña y expulsar/salir existía desde 1.17a
// (cafc434) pero ninguna pantalla la ofrecía. De punta a punta contra la API real, con dos
// sesiones de navegador para la parte de expulsión (mismo patrón que invitacion.spec.ts): el
// DM edita el nombre de su campaña y lo ve cambiado en la cabecera; invita a un jugador, que
// entra y ve la campaña en su lista; el DM lo expulsa desde "Miembros", y el jugador —tras
// recargar— ya no la ve. El DM crea después una segunda campaña y la borra, comprobando que
// solo esa desaparece de "Mis campañas" y la primera (ya renombrada) sigue ahí — la misma
// exigencia de "no borres lo primero que encuentres" que 1.16 aplicó a las filas de entidad.
test("editar el nombre, expulsar a un jugador y borrar una segunda campaña, todo desde Ajustes", async ({
  browser,
}: {
  browser: Browser;
}) => {
  const dmContext = await browser.newContext();
  const dmPage = await dmContext.newPage();
  await registrarse(dmPage);

  await dmPage.getByRole("button", { name: "Nueva campaña" }).click();
  await dmPage.getByLabel("Nombre").fill("La Ciudadela de los Vientos");
  await dmPage.getByRole("button", { name: "Crear" }).click();
  await dmPage.getByRole("link", { name: "La Ciudadela de los Vientos" }).click();
  await expect(dmPage.getByRole("heading", { name: "La Ciudadela de los Vientos" })).toBeVisible();

  // 1. Editar el nombre desde Ajustes y verlo cambiado en la cabecera: el PATCH real invalida
  // tanto la campaña como la lista (features/campaigns/hooks.ts). Desde el reseño del
  // 2026-09-02 los ajustes tienen su propia sección, así que hay que abrirla — la primera ya
  // no es un formulario con "Borrar" al lado de "Guardar".
  await dmPage.getByRole("tab", { name: "Ajustes" }).click();
  const nameInput = dmPage.getByLabel("Nombre");
  await expect(nameInput).toHaveValue("La Ciudadela de los Vientos");
  await nameInput.fill("La Ciudadela de los Vientos Eternos");
  await dmPage.getByRole("button", { name: "Guardar" }).click();
  await expect(
    dmPage.getByRole("heading", { name: "La Ciudadela de los Vientos Eternos" }),
  ).toBeVisible();

  // 2. Invitar a un jugador (mismo recorrido que invitacion.spec.ts: leer el enlace de la
  // pantalla, no construirlo a mano) para poder expulsarlo de verdad.
  await dmPage.getByRole("button", { name: "Generar invitación" }).click();
  const linkField = dmPage.getByLabel("Enlace de invitación");
  await expect(linkField).toBeVisible();
  const inviteUrl = await linkField.inputValue();
  expect(inviteUrl).toMatch(/\/join\/.+/);

  const playerContext = await browser.newContext();
  const playerPage = await playerContext.newPage();
  await playerPage.goto(inviteUrl);
  await expect(
    playerPage.getByText("Necesitas iniciar sesión para aceptar esta invitación."),
  ).toBeVisible();
  await playerPage.getByRole("link", { name: "Crear cuenta" }).click();
  const jugador = nuevaCuenta("Jugador");
  await playerPage.getByLabel("Nombre").fill(jugador.displayName);
  await playerPage.getByLabel("Correo").fill(jugador.email);
  await playerPage.getByLabel("Contraseña").fill(jugador.password);
  await playerPage.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(
    playerPage.getByText("Estás a punto de unirte a una campaña con esta invitación."),
  ).toBeVisible();
  await playerPage.getByRole("button", { name: "Unirse a la campaña" }).click();
  await expect(
    playerPage.getByRole("heading", { name: "La Ciudadela de los Vientos Eternos" }),
  ).toBeVisible();

  // Antes de expulsarlo: comprueba que la campaña está de verdad en la lista del jugador —
  // si no, la comprobación de después ("ya no está") pasaría por construcción.
  await playerPage.goto("/");
  await expect(
    playerPage.getByRole("link", { name: "La Ciudadela de los Vientos Eternos" }),
  ).toBeVisible();

  // 3. El DM expulsa al jugador desde "Miembros". Recarga primero: la lista de miembros del
  // DM se pidió antes de que el jugador se uniera y queda cacheada 30 s (staleTime,
  // lib/queryClient.ts) — sin recargar, la fila del jugador aún no existiría en su pantalla.
  // La fila se identifica por su nombre para no confundirla con la propia fila del DM, que
  // comparte panel.
  await dmPage.reload();
  await expect(
    dmPage.getByRole("heading", { name: "La Ciudadela de los Vientos Eternos" }),
  ).toBeVisible();
  const playerRow = dmPage.getByRole("listitem").filter({ hasText: jugador.displayName });
  await expect(playerRow).toBeVisible();
  // El DM nunca ve "Salir de la campaña": ve el motivo que da el servidor.
  await expect(dmPage.getByRole("button", { name: "Salir de la campaña" })).toHaveCount(0);
  await expect(
    dmPage.getByText("El DM no puede salir de su propia campaña; bórrala."),
  ).toBeVisible();
  await playerRow.getByRole("button", { name: "Expulsar" }).click();
  await dmPage.getByRole("button", { name: "Sí, expulsar" }).click();
  await expect(playerRow).toHaveCount(0);

  // 4. El jugador recarga y la campaña ya no está en su lista: el DELETE real borró la
  // membresía en el servidor. No es la invalidación de campaignsKey la que hace esto — el
  // DM expulsó al jugador, así que en el QueryClient del DM userId !== myUserId y esa rama
  // de useRemoveMember (hooks.ts) nunca corre; y aunque corriera, invalidaría el caché del
  // DM, nunca el del jugador (dos procesos de navegador distintos). Lo que hace que el
  // jugador deje de ver la campaña es que reload() descarta todo su caché y vuelve a pedir
  // /campaigns por red — la misma razón por la que este recorrido, con reload(), nunca pudo
  // servir de comprobación de esa invalidación (ver docs/08-pruebas.md y la entrada de
  // 1.17d en 07-historial.md).
  await playerPage.reload();
  await expect(playerPage.getByRole("heading", { name: "Mis campañas" })).toBeVisible();
  await expect(
    playerPage.getByRole("link", { name: "La Ciudadela de los Vientos Eternos" }),
  ).toHaveCount(0);

  // 5. El DM crea una segunda campaña, la borra, y solo esa desaparece de su lista — la
  // primera (ya renombrada) sigue en pie.
  await dmPage.getByRole("link", { name: /Mis campañas/ }).click();
  await dmPage.getByRole("button", { name: "Nueva campaña" }).click();
  await dmPage.getByLabel("Nombre").fill("El Templo Sumergido");
  await dmPage.getByRole("button", { name: "Crear" }).click();
  await expect(dmPage.getByRole("link", { name: "El Templo Sumergido" })).toBeVisible();

  await dmPage.getByRole("link", { name: "El Templo Sumergido" }).click();
  await expect(dmPage.getByRole("heading", { name: "El Templo Sumergido" })).toBeVisible();
  // Reseño 2026-09-02 (audit B2): "Borrar" ya no aparece a un clic de abrir la campaña, junto
  // a "Guardar" y del mismo tamaño. Vive en Ajustes, que hay que abrir a propósito — este paso
  // extra ES la mejora, no un rodeo de la prueba.
  await dmPage.getByRole("tab", { name: "Ajustes" }).click();
  await dmPage.getByRole("button", { name: "Borrar" }).click();
  await expect(
    dmPage.getByText(
      /Se borrarán también sus fichas, sesiones, personajes, invitaciones y miembros/,
    ),
  ).toBeVisible();
  await dmPage.getByRole("button", { name: "Sí, borrar definitivamente" }).click();

  await expect(dmPage.getByRole("heading", { name: "Mis campañas" })).toBeVisible();
  await expect(dmPage.getByRole("link", { name: "El Templo Sumergido" })).toHaveCount(0);
  await expect(
    dmPage.getByRole("link", { name: "La Ciudadela de los Vientos Eternos" }),
  ).toBeVisible();

  await dmContext.close();
  await playerContext.close();
});
