import { test, expect, type Page } from "@playwright/test";

// Cada corrida crea su propio usuario: las pruebas no dependen de datos sembrados
// ni se pisan entre si al repetirse contra la misma base de desarrollo.
function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `e2e-${marca}@example.com`,
    password: "password123",
    displayName: `DM ${marca}`,
  };
}

async function registrarse(page: Page) {
  const cuenta = nuevaCuenta();
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Email").fill(cuenta.email);
  await page.getByLabel("Password").fill(cuenta.password);
  await page.getByRole("button", { name: "Register" }).click();
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

  await page.getByRole("button", { name: "NPCs" }).click();
  await expect(page.getByText("Sin elementos.")).toBeVisible();

  await page.getByRole("button", { name: "Nuevo" }).click();
  await page.getByLabel("Nombre").fill("Acererak");
  await page.getByLabel("Etiquetas (separadas por coma)").fill("lich, villano");
  await page.getByLabel("Visibilidad").selectOption("DM_ONLY");
  await page.getByRole("button", { name: "Guardar" }).click();

  // El editor se cierra y la entidad aparece en la lista con su visibilidad.
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  const npc = page.getByRole("button", { name: /Acererak/ });
  await expect(npc).toBeVisible();
  await expect(npc).toContainText("DM_ONLY");
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

  await page.getByRole("button", { name: "NPCs" }).click();

  // Hacen falta dos NPCs: uno para abrir en modo edición y otro para enlazarlo.
  await page.getByRole("button", { name: "Nuevo" }).click();
  await page.getByLabel("Nombre").fill("Zariel");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("button", { name: "Nuevo" }).click();
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

  await page.getByRole("button", { name: "NPCs" }).click();

  // Dos NPCs: Zariel enlaza con Mahadi, y Mahadi recibe un comentario. Borrar Mahadi debe
  // llevarse los dos consigo.
  await page.getByRole("button", { name: "Nuevo" }).click();
  await page.getByLabel("Nombre").fill("Zariel");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("button", { name: "Nuevo" }).click();
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
  // posted) share the same accessible name once a comment exists.
  const entityForm = page
    .locator("form")
    .filter({ has: page.getByRole("heading", { name: "Editar NPC" }) });
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
  await page.getByRole("button", { name: "Sesiones" }).click();
  await expect(page.getByText("Sin sesiones.")).toBeVisible();

  await page.getByRole("button", { name: "Nuevo" }).click();
  await expect(page.getByRole("heading", { name: "Nueva sesión" })).toBeVisible();
  await page.getByLabel("Título").fill("Sesión 1: la entrada al abismo");
  await page.getByLabel("Fecha y hora").fill("2026-10-03T19:00");
  await page.getByLabel("Notas").fill("Traer las miniaturas de demonios");
  await page.getByLabel("Visibilidad").selectOption("DM_ONLY");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByRole("heading", { name: "Nueva sesión" })).toBeHidden();
  const sessionRow = page.getByRole("button", { name: /Sesión 1: la entrada al abismo/ });
  await expect(sessionRow).toBeVisible();
  await expect(sessionRow).toContainText("DM_ONLY");

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
  await page.getByRole("button", { name: "Personajes" }).click();
  await expect(page.getByText("Sin personajes.")).toBeVisible();

  await page.getByRole("button", { name: "Nuevo" }).click();
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
  await page.getByRole("button", { name: "Sesiones" }).click();
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
