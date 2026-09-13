import { test, expect, type Browser, type Locator, type Page } from "@playwright/test";

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
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();
  return cuenta;
}

// **«Nueva campaña» resuelve a DOS botones**, y por eso todos los usos llevan `.first()`.
//
// Hay uno en la cabecera de la página y otro dentro de la lista, la tarjeta de borde discontinuo.
// El recorrido de abajo llevaba **una carrera dentro**: pasaba cuando la consulta de campañas aún
// no había pintado la lista —un solo botón— y se caía por modo estricto cuando sí. Que aguantara
// meses no lo hacía correcto: lo hacía afortunado.
//
// `.first()` es la cabecera, que es la que una persona pulsa desde arriba.

test("del registro a ver un NPC recien creado en su pestaña", async ({ page }) => {
  await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La Tumba de la Aniquilación");
  await page.getByRole("button", { name: "Crear" }).click();

  await page.getByRole("link", { name: "La Tumba de la Aniquilación" }).click();
  await expect(page.getByRole("heading", { name: "La Tumba de la Aniquilación" })).toBeVisible();

  await page.getByRole("tab", { name: "El mundo" }).click();

  await page.getByRole("button", { name: /^PNJ/ }).click();
  await expect(page.getByText("Ningún personaje del mundo todavía")).toBeVisible();

  await page.getByRole("button", { name: "Nuevo PNJ" }).click();
  await page.getByLabel("Nombre").fill("Acererak");
  await page.getByLabel("Etiquetas (separadas por coma)").fill("lich, villano");
  await page.getByRole("radio", { name: /Solo DM/ }).check();
  await page.getByRole("button", { name: "Guardar" }).click();

  // El editor se cierra y la entidad aparece en la lista con su visibilidad.
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  const npc = page.getByRole("link", { name: /Acererak/ });
  // Reseño 2026-09-02, segunda pasada — alarma de maquetación. Cuando la fila pasó de <button>
  // a <a> heredó `display: inline`, y un borde sobre un elemento en línea que ocupa varias
  // líneas se dibuja PARTIDO: un trozo vertical suelto a la izquierda de cada fila. Ninguna
  // prueba unitaria puede ver esto —jsdom no maqueta— y ninguna aserción de texto lo nota.
  // Quita el `block` de ROW_BUTTON_CLASS y esta comprobación se pone roja.
  await expect(npc).toBeVisible();
  expect(await npc.evaluate((el) => getComputedStyle(el).display)).not.toBe("inline");
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

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("Descenso a Avernus");
  await page.getByRole("button", { name: "Crear" }).click();

  await page.getByRole("link", { name: "Descenso a Avernus" }).click();
  await expect(page.getByRole("heading", { name: "Descenso a Avernus" })).toBeVisible();

  await page.getByRole("tab", { name: "El mundo" }).click();

  await page.getByRole("button", { name: /^PNJ/ }).click();

  // Hacen falta dos NPCs: uno para abrir en modo edición y otro para enlazarlo.
  await page.getByRole("button", { name: "Nuevo PNJ" }).click();
  await page.getByLabel("Nombre").fill("Zariel");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("button", { name: "Nuevo PNJ" }).click();
  await page.getByLabel("Nombre").fill("Mahadi");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  // Abrir la ficha de Zariel. Reseño 2026-09-02: enlaces y comentarios ya no viven dentro del
  // editor —donde solo se veían si abrías un formulario para leer— sino en la página de la
  // ficha, que es donde se consultan en mitad de una partida.
  await page.getByRole("link", { name: /Zariel/ }).click();
  await expect(page.getByRole("heading", { name: "Zariel" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Enlaces" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comentarios" })).toBeVisible();

  // Enlazar Zariel con Mahadi y comprobar que aparece en la lista de enlaces. Se acota al
  // panel "Enlaces" con un hijo directo `> h3`: la página envuelve secciones dentro de
  // secciones, así que "has" sin combinador de hijo directo capturaría también a la de fuera.
  const linksSection = page
    .locator("section")
    .filter({ has: page.locator("> h3", { hasText: "Enlaces" }) });
  await linksSection.getByLabel("Entidad destino").selectOption({ label: "Mahadi (PNJ)" });
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

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La Maldición de Strahd");
  await page.getByRole("button", { name: "Crear" }).click();

  await page.getByRole("link", { name: "La Maldición de Strahd" }).click();
  await expect(page.getByRole("heading", { name: "La Maldición de Strahd" })).toBeVisible();

  await page.getByRole("tab", { name: "El mundo" }).click();

  await page.getByRole("button", { name: /^PNJ/ }).click();

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
  await page.getByRole("link", { name: /Zariel/ }).click();
  await expect(page.getByRole("heading", { name: "Zariel" })).toBeVisible();
  const zarielLinksSection = page
    .locator("section")
    .filter({ has: page.locator("> h3", { hasText: "Enlaces" }) });
  await zarielLinksSection.getByLabel("Entidad destino").selectOption({ label: "Mahadi (PNJ)" });
  await zarielLinksSection.getByRole("button", { name: "Añadir enlace" }).click();
  await expect(zarielLinksSection.locator("li").filter({ hasText: "Mahadi" })).toBeVisible();

  // 2. Comentar en Mahadi. Se vuelve por las migas de pan, que llevan a la SECCIÓN de la que
  // salió la ficha y no al resumen — antes esto era cerrar un modal.
  await page.getByRole("link", { name: "La Maldición de Strahd" }).click();
  await page.getByRole("link", { name: /Mahadi/ }).click();
  await expect(page.getByRole("heading", { name: "Mahadi" })).toBeVisible();
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
  // Borrar sigue viviendo en el editor, que ahora se abre a propósito desde la ficha.
  await page
    .getByRole("button", { name: /Editar|Ver el texto completo|Ver la hoja completa/ })
    .click();
  await expect(page.getByRole("heading", { name: "Editar PNJ" })).toBeVisible();
  const entityForm = page.locator("form").filter({ has: page.getByLabel("Nombre") });
  await entityForm.getByRole("button", { name: "Borrar" }).click();
  await expect(
    page.getByText(
      /No se puede deshacer: se borrarán también todos los enlaces en los que aparece/,
    ),
  ).toBeVisible();
  await entityForm.getByRole("button", { name: "Sí, borrar definitivamente" }).click();
  await expect(page.getByRole("heading", { name: "Editar PNJ" })).toBeHidden();

  // 4a. Desaparece de la lista.
  await expect(page.getByRole("link", { name: /Mahadi/ })).toHaveCount(0);

  // 4b. El panel de enlaces de Zariel ya no lo muestra: la cascada borró el EntityLink de
  // verdad en Postgres, no solo la fila de la lista de Mahadi.
  await page.getByRole("link", { name: /Zariel/ }).click();
  await expect(page.getByRole("heading", { name: "Zariel" })).toBeVisible();
  const reopenedLinksSection = page
    .locator("section")
    .filter({ has: page.locator("> h3", { hasText: "Enlaces" }) });
  await expect(reopenedLinksSection.getByText("Sin enlaces.")).toBeVisible();
  await expect(reopenedLinksSection.locator("li").filter({ hasText: "Mahadi" })).toHaveCount(0);
});

test("crear una sesion y un personaje desde sus pestañas, con su visibilidad", async ({ page }) => {
  await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
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
  await page.getByRole("radio", { name: /Solo DM/ }).check();
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
  await page.getByRole("button", { name: "Personajes" }).click();
  await expect(page.getByText("Ningún personaje todavía")).toBeVisible();

  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await expect(page.getByRole("heading", { name: "Nuevo personaje" })).toBeVisible();
  await page.getByLabel("Nombre").fill("Kaelith");
  // Tarea 24 (2026-09-11): raza y clase salen del mismo catálogo que la hoja, no de texto libre.
  await page.getByLabel("Raza", { exact: true }).selectOption({ label: "Tiefling" });
  await page.getByLabel("Clase", { exact: true }).selectOption({ label: "Brujo" });
  // D-CF-65: el diálogo de creación ya no pide el nivel — lo fija la mesa, y nace a 1 (la regla
  // por defecto de una campaña sin «Reglas de la mesa» propias).
  await page.getByLabel("Biografía").fill("Pactó con un demonio para salvar a su aldea");
  await page.getByRole("radio", { name: /Público/ }).check();
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByRole("heading", { name: "Nuevo personaje" })).toBeHidden();
  const characterRow = page.getByRole("link", { name: /Kaelith/ });
  await expect(characterRow).toBeVisible();
  await expect(characterRow).toContainText("Nivel 1");

  // Abrir el personaje en modo edición y comprobar que raza, clase y biografía —
  // los campos que la interfaz de solo lectura ni siquiera mostraba — precargan de verdad.
  await characterRow.click();
  // Reseño 2026-09-02: la fila lleva a la hoja del personaje —con la forma de la hoja de 5.ª
  // edición— y el editor se abre desde ella.
  await expect(page.getByRole("heading", { name: "Kaelith" })).toBeVisible();

  // **Ya no hay diálogo.** La hoja se toca donde se lee, así que lo que se comprueba es que los
  // campos en el sitio traen lo guardado: nivel, la historia, y —desde la tarea 24— raza y clase,
  // que el diálogo de creación manda como claves del catálogo (`PATCH .../sheet`) y esta misma
  // hoja las enseña ya elegidas.
  await expect(page.getByLabel("Nivel", { exact: true })).toHaveValue("1");
  await expect(page.getByLabel("Raza", { exact: true })).toHaveValue("tiefling");
  await expect(page.getByLabel("Clase", { exact: true })).toHaveValue("warlock");
  await expect(page.getByText("Pactó con un demonio para salvar a su aldea")).toBeVisible();

  // Guardar de verdad: subir el nivel a 4 saliendo del campo, y comprobar en la lista que el
  // `PATCH` se ejecutó contra la API real, no que un formulario se cerró.
  await page.getByLabel("Nivel", { exact: true }).fill("4");
  await page.getByLabel("Nivel", { exact: true }).blur();

  // Guardar deja al lector en la hoja, no lo devuelve a la lista: la cabecera de la propia
  // hoja ya muestra el nivel nuevo. Se vuelve por las migas para comprobar también la fila.
  await expect(page.getByText("Nivel 4")).toBeVisible();
  await page.getByRole("link", { name: "Fuera del Abismo" }).click();
  // **El cajón no sobrevive a navegar, y eso es correcto** (B4): pulsar el personaje abrió su
  // hoja, que es otra pantalla, así que el superpuesto se cerró al irse. Al volver hay que
  // abrirlo otra vez, exactamente como en la mesa. La miga lleva **a la campaña**, no a
  // `?seccion=characters`, que desde B4 no es ninguna sección — llevaba a una pantalla en blanco
  // y lo encontró la revisión de cierre de 2.5.6.
  await page.getByRole("button", { name: "Personajes" }).click();
  const updatedCharacterRow = page.getByRole("link", { name: /Kaelith/ });
  await expect(updatedCharacterRow).toBeVisible();
  await expect(updatedCharacterRow).toContainText("Nivel 4");

  await updatedCharacterRow.click();

  // H6 — **un solo camino de edición.** Ya no existe el diálogo de «Ajustes y borrado»: lo único
  // que tenía en exclusiva, la visibilidad, se elige aquí mismo en radios con su frase, y elegir
  // ES la acción entera, así que se guarda sola sin ningún "Guardar". Se espera el PATCH real y
  // se recarga: lo que demuestra que se guardó es que el radio vuelve marcado desde el servidor,
  // no que la pantalla se pintara.
  const guardadoDeVisibilidad = page.waitForResponse(
    (r) => r.request().method() === "PATCH" && /\/characters\//.test(r.url()),
  );
  await page.getByRole("radio", { name: /Solo el DM/ }).check();
  await guardadoDeVisibilidad;
  await page.reload();
  await expect(page.getByRole("radio", { name: /Solo el DM/ })).toBeChecked();

  // Task 1.16: borrar el personaje de verdad contra la API real. Borrar es lo único que sigue
  // tras un botón, y a propósito: es irreversible y no debe estar a un clic de lo que se lee.
  await page.getByRole("button", { name: "Borrar" }).click();
  await expect(page.getByText('Vas a borrar a "Kaelith". No se puede deshacer.')).toBeVisible();
  await page.getByRole("button", { name: "Sí, borrar definitivamente" }).click();
  // Borrar deja al lector fuera de una página que ya no existe: vuelve a la lista de la campaña.
  await expect(page.getByRole("link", { name: /Kaelith/ })).toHaveCount(0);

  // Y la sesión, contra la API real, incluyendo la cancelación: pulsar "No, cancelar" no borra
  // y deja el editor abierto. **Sesiones sigue siendo una pestaña**, no un cajón (D-R-9).
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
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toHaveCount(0);
});

// Task 1.17b · A1: el cuerpo Markdown de una ficha, de punta a punta contra la API real —
// crear con un ## Título, cerrar, reabrir y ver el título como encabezado accesible en la
// vista previa, no como texto literal con almohadillas.
test("el cuerpo Markdown de una ficha se guarda y se ve como encabezado al reabrirla", async ({
  page,
}) => {
  await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La Forja de la Ira");
  await page.getByRole("button", { name: "Crear" }).click();

  await page.getByRole("link", { name: "La Forja de la Ira" }).click();
  await expect(page.getByRole("heading", { name: "La Forja de la Ira" })).toBeVisible();

  await page.getByRole("tab", { name: "El mundo" }).click();

  await page.getByRole("button", { name: /^PNJ/ }).click();
  await page.getByRole("button", { name: "Nuevo PNJ" }).click();
  await page.getByLabel("Nombre").fill("Durgeddin el Negro");
  await page.getByLabel("Texto").fill("## Título\n\nUn herrero enano legendario.");
  await page.getByRole("button", { name: "Guardar" }).click();

  // El editor se cierra: el body viajó de verdad en el POST, no solo en el estado local.
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  // Reabrir la ficha: el textarea precarga el markdown crudo desde la respuesta del GET.
  await page.getByRole("link", { name: /Durgeddin el Negro/ }).click();
  // Reseño 2026-09-02: la fila abre la página de lectura; el editor se abre desde ella.
  await page
    .getByRole("button", { name: /Editar|Ver el texto completo|Ver la hoja completa/ })
    .click();
  await expect(page.getByRole("heading", { name: "Editar PNJ" })).toBeVisible();
  await expect(page.getByLabel("Texto")).toHaveValue("## Título\n\nUn herrero enano legendario.");

  // Cambiar a vista previa: el ## se pinta como encabezado accesible, no como texto literal.
  // Acotado al diálogo: desde el reseño del 2026-09-02 la página de la ficha ya pinta ese
  // mismo encabezado sobre la vitela, así que sin acotar habría dos y la aserción sería
  // ambigua — que es precisamente lo que hay que comprobar por separado, más abajo.
  await page.getByRole("button", { name: "Vista previa" }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Título" })).toBeVisible();
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

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("El Refugio del Contrabandista");
  await page.getByRole("button", { name: "Crear" }).click();

  await page.getByRole("link", { name: "El Refugio del Contrabandista" }).click();
  await expect(page.getByRole("heading", { name: "El Refugio del Contrabandista" })).toBeVisible();

  await page.getByRole("tab", { name: "El mundo" }).click();

  await page.getByRole("button", { name: /^PNJ/ }).click();
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

  const acererak = page.getByRole("link", { name: /Acererak/ });
  const vlaakith = page.getByRole("link", { name: /Vlaakith/ });
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
// solo esa desaparece de "Tus crónicas" y la primera (ya renombrada) sigue ahí — la misma
// exigencia de "no borres lo primero que encuentres" que 1.16 aplicó a las filas de entidad.
test("editar el nombre, expulsar a un jugador y borrar una segunda campaña, todo desde Ajustes", async ({
  browser,
}: {
  browser: Browser;
}) => {
  const dmContext = await browser.newContext();
  const dmPage = await dmContext.newPage();
  await registrarse(dmPage);

  await dmPage.getByRole("button", { name: "Nueva campaña" }).first().click();
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
  // **Acotado a la lista de miembros**, y no al documento entero: desde el plan 11 el panel de
  // invitaciones tiene su propia lista, y una de sus filas dice «la usó <nombre>» — el mismo texto.
  // Sin acotar, el localizador cazaba dos elementos y fallaba por ambigüedad, que es exactamente lo
  // que este recorrido tiene que distinguir: el miembro y el enlace que usó no son la misma cosa.
  const playerRow = dmPage
    .getByRole("list", { name: "Miembros de la campaña" })
    .getByRole("listitem")
    .filter({ hasText: jugador.displayName });
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
  await expect(playerPage.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();
  await expect(
    playerPage.getByRole("link", { name: "La Ciudadela de los Vientos Eternos" }),
  ).toHaveCount(0);

  // 5. El DM crea una segunda campaña, la borra, y solo esa desaparece de su lista — la
  // primera (ya renombrada) sigue en pie.
  await dmPage.getByRole("link", { name: /Tus crónicas/ }).click();
  await dmPage.getByRole("button", { name: "Nueva campaña" }).first().click();
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
      /Se borrarán también sus entradas del mundo, sesiones, personajes, invitaciones y miembros/,
    ),
  ).toBeVisible();
  await dmPage.getByRole("button", { name: "Sí, borrar definitivamente" }).click();

  await expect(dmPage.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();
  await expect(dmPage.getByRole("link", { name: "El Templo Sumergido" })).toHaveCount(0);
  await expect(
    dmPage.getByRole("link", { name: "La Ciudadela de los Vientos Eternos" }),
  ).toBeVisible();

  await dmContext.close();
  await playerContext.close();
});

// **La pantalla de campaña adopta la maqueta** (2026-09-02). Tres cosas que ninguna prueba de
// jsdom puede afirmar, porque las tres son maquetación o navegación real:
//
// 1. La cabecera explicada de cada sección se pinta **en una banda**: el botón que crea va a la
//    derecha del título, no debajo ni dentro de la barra de filtros.
// 2. Las filas ya no son nueve tarjetas sueltas sino **un marco con filetes**: se comprueba que
//    apilan (misma anchura, distinta altura de pantalla) y que ninguna hereda `display: inline`
//    — el defecto del borde partido, que sobrevivió a la suite entera en verde.
// 3. Un **acceso rápido** del tablero abre su sección de verdad, y la sección abierta sobrevive
//    a una recarga porque viaja en `?seccion=`.
test("la cabecera explicada, el marco de la lista y los accesos rápidos del tablero", async ({
  page,
}) => {
  await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("El Puerto de Sarnath");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "El Puerto de Sarnath" }).click();
  await expect(page.getByRole("heading", { name: "El Puerto de Sarnath" })).toBeVisible();

  // --- 3. El acceso rápido del tablero lleva a su sección ---
  const accesoLugares = page.getByRole("link", { name: /Lugares/ });
  await expect(accesoLugares).toBeVisible();
  const cajaAcceso = await accesoLugares.boundingBox();
  // Una baldosa que no ocupa espacio es una baldosa que nadie puede pulsar. jsdom no lo ve.
  expect(cajaAcceso?.width ?? 0).toBeGreaterThan(40);
  expect(cajaAcceso?.height ?? 0).toBeGreaterThan(40);
  await accesoLugares.click();

  // --- 1. La cabecera explicada: migaja, título y la frase de plantillas.ts ---
  await expect(page.getByRole("heading", { name: "Lugares" })).toBeVisible();
  await expect(page.getByText("El mundo · Lugares")).toBeVisible();
  await expect(
    page.getByText("Un sitio al que se llega. Qué se ve, qué se oye y qué puede salir mal."),
  ).toBeVisible();

  // La sección abierta viaja en la URL, así que una recarga vuelve aquí y no al Resumen.
  expect(page.url()).toContain("seccion=LOCATION");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Lugares" })).toBeVisible();

  // El botón que crea está EN la banda del título, a su derecha y a su misma altura — no
  // debajo, y no dentro de la barra de filtros donde estuvo hasta ahora.
  const titulo = page.getByRole("heading", { name: "Lugares" });
  const nuevo = page.getByRole("button", { name: "Nuevo lugar" });
  const cajaTitulo = await titulo.boundingBox();
  const cajaNuevo = await nuevo.boundingBox();
  expect(cajaTitulo).not.toBeNull();
  expect(cajaNuevo).not.toBeNull();
  expect(cajaNuevo!.x).toBeGreaterThan(cajaTitulo!.x + cajaTitulo!.width);
  // Los dos ejes, no solo uno: una revisión que solo mira la x deja pasar un botón estirado o
  // caído media pantalla más abajo.
  expect(Math.abs(cajaNuevo!.y - cajaTitulo!.y)).toBeLessThan(60);

  // --- 2. El marco de la lista: dos filas que apilan, ninguna en línea ---
  await nuevo.click();
  await page.getByLabel("Nombre").fill("La Sirena Ahogada");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await nuevo.click();
  await page.getByLabel("Nombre").fill("La Torre Gris");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  const sirena = page.getByRole("link", { name: /La Sirena Ahogada/ });
  const torre = page.getByRole("link", { name: /La Torre Gris/ });
  await expect(sirena).toBeVisible();
  await expect(torre).toBeVisible();
  expect(await sirena.evaluate((el) => getComputedStyle(el).display)).not.toBe("inline");
  const cajaSirena = await sirena.boundingBox();
  const cajaTorre = await torre.boundingBox();
  // Mismo ancho y apiladas: es una lista dentro de un marco, no dos cajas flotando.
  expect(Math.abs(cajaSirena!.width - cajaTorre!.width)).toBeLessThan(2);
  expect(Math.abs(cajaSirena!.y - cajaTorre!.y)).toBeGreaterThan(20);
  // Y el icono del tipo se pinta de verdad dentro de la fila, dibujado y no un glifo.
  expect(await sirena.locator("svg").count()).toBeGreaterThan(0);

  // --- 4. El carril de la maqueta (2026-09-03) ---
  //
  // Dos cosas que jsdom no puede ver ninguna de las dos. La barra de secciones y su panel van
  // **lado a lado**, y el carril lleva **su propio filete a la derecha**: es esa línea la que
  // convierte dos bloques sueltos en una pantalla con navegación propia, y es exactamente el
  // tipo de defecto —una utilidad de borde que no compila, un `flex-row` que se cae a columna—
  // que sobrevive a la suite unitaria entera en verde.
  const carril = page.getByRole("tablist");
  const panel = page.getByRole("tabpanel");
  const cajaCarril = await carril.boundingBox();
  const cajaPanel = await panel.boundingBox();
  expect(cajaCarril).not.toBeNull();
  expect(cajaPanel).not.toBeNull();
  expect(cajaPanel!.x).toBeGreaterThanOrEqual(cajaCarril!.x + cajaCarril!.width - 1);
  expect(await carril.evaluate((el) => getComputedStyle(el).borderRightWidth)).not.toBe("0px");

  // --- 5. El titular de la pantalla es la SECCIÓN, no el nombre de la campaña ---
  //
  // Antes había dos titulares apilados: el nombre de la campaña a tamaño de titular con su
  // filete de cobre, y debajo el de la sección. El nombre de la campaña sigue siendo el <h1>
  // —es el nombre del documento— pero pesa lo que pesa un marco. Se mide el tamaño calculado,
  // que es lo único que dice quién manda en la página.
  const tamanoDe = (locator: Locator) =>
    locator.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  const tamTitulo = await tamanoDe(page.getByRole("heading", { name: "Lugares" }));
  const tamCampana = await tamanoDe(page.getByRole("heading", { name: "El Puerto de Sarnath" }));
  expect(tamTitulo).toBeGreaterThan(tamCampana);
});

// B3 (2026-09-04) — **la puerta de entrada deja de ser una lista de proyectos.**
//
// El diagnóstico del reseño, en palabras del autor: *«Esto es un juego, una plataforma web, no una
// página web que hay que navegar para saber cosas.»* Lo que se mide aquí es de comportamiento, no
// de aspecto: **elegir y entrar son dos gestos distintos**, y desde la puerta se llega a la mesa
// de un clic — la mesa era el único destino que no estaba en la navegación.
test("desde las crónicas se elige una y se entra a la mesa de un clic", async ({ page }) => {
  await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La Cripta de los Susurros");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("El Puerto de las Mil Velas");
  await page.getByRole("button", { name: "Crear" }).click();

  const lista = page.getByRole("list", { name: "Tus crónicas" });
  await expect(lista.getByRole("button")).toHaveCount(2);

  // **Elegir no navega.** Se puede mirar una crónica sin entrar en ella, que es lo que se hace
  // cuando tienes tres campañas y no te acuerdas de cuál era cuál.
  await lista.getByRole("button", { name: "Elegir La Cripta de los Susurros" }).click();
  expect(page.url()).not.toContain("/campaigns/");
  const abierta = page.getByRole("region", { name: /La Cripta de los Susurros/ });
  await expect(abierta).toBeVisible();
  await expect(abierta).toContainText("La mesa está en reposo");
  await expect(abierta.getByRole("button", { name: /Elegir/ })).toHaveCount(0);

  // La otra se puede elegir sin salir, y el panel cambia con ella.
  await lista.getByRole("button", { name: "Elegir El Puerto de las Mil Velas" }).click();
  await expect(page.getByRole("region", { name: /El Puerto de las Mil Velas/ })).toBeVisible();

  // **Y entrar SÍ navega, y va a la mesa.** No a los ajustes de la campaña: la acción principal
  // de una crónica es jugarla.
  await page
    .getByRole("region", { name: /El Puerto de las Mil Velas/ })
    .getByRole("link", { name: "Entrar a la mesa" })
    .click();
  await expect(page.getByRole("region", { name: "La escena" })).toBeVisible();
  expect(page.url()).toContain("/sesion");
});

// B4 (2026-09-04) — **el tipo de ficha deja de ser un destino.**
//
// Es el defecto que el reseño llama de arquitectura: *«la navegación es el esquema de la base de
// datos»*. Había siete pestañas —PNJ, Lugares, Misiones, Facciones, Objetos, Sucesos,
// Documentos— y las siete son literalmente valores del enum de la tabla `Entity`. Con las tres
// rutas propias, diecinueve destinos en una campaña.
test("el mundo es un solo destino, y el tipo de ficha un filtro dentro de él", async ({ page }) => {
  await registrarse(page);
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("El Valle de las Sombras");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "El Valle de las Sombras" }).click();

  // **Un destino, no siete.** Los tipos ya no están en el carril de secciones.
  const carril = page.getByRole("tablist");
  await expect(carril.getByRole("tab", { name: /El mundo/ })).toBeVisible();
  for (const tipo of ["PNJ", "Lugares", "Misiones", "Facciones", "Objetos", "Documentos"]) {
    await expect(carril.getByRole("tab", { name: tipo })).toHaveCount(0);
  }

  await carril.getByRole("tab", { name: /El mundo/ }).click();

  // Dentro, los siete como filtros. Van con `aria-pressed` y no con `role="tab"` a propósito:
  // un `tab` promete paneles hermanos, y aquí solo se acota una lista.
  const filtros = page.getByRole("group", { name: "Tipo de ficha" });
  await expect(filtros.getByRole("button")).toHaveCount(7);
  await expect(filtros.getByRole("button", { name: /^PNJ/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await filtros.getByRole("button", { name: /^Lugares/ }).click();
  await expect(page.getByRole("heading", { name: "Lugares" })).toBeVisible();
  await expect(filtros.getByRole("button", { name: /^Lugares/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // **Y la dirección no cambió.** `?seccion=LOCATION` era un destino propio y ahora es el mundo
  // con «Lugares» elegido: los enlaces guardados siguen llevando a los lugares. Se comprueba en
  // los dos sentidos — la URL la escribe el filtro, y la URL abre el filtro.
  expect(page.url()).toContain("seccion=LOCATION");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Lugares" })).toBeVisible();
});

// B4 · los cajones — **la forma la eligió el autor**, y el motivo de fondo es que la aplicación
// se aprenda una vez: lo que se abre encima se cierra con Escape, en la mesa y en el taller.
//
// Personajes, Sesiones, Bestiario y Catálogo eran cuatro de las dieciséis pestañas, y las cuatro
// son **colecciones que se consultan**, no sitios donde se está. Meterlas como cuatro pestañas
// más habría sido cambiarles el marco sin cambiar el problema.
test("los tres cajones se abren encima del taller, uno a la vez, y Escape los cierra", async ({
  page,
}) => {
  await registrarse(page);
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("El Taller de Bram");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "El Taller de Bram" }).click();

  // **Fuera del carril de secciones**, que es lo que arregla: de diecinueve destinos a seis.
  const carril = page.getByRole("tablist");
  for (const nombre of ["Personajes", "Bestiario", "Catálogo"]) {
    await expect(carril.getByRole("tab", { name: nombre })).toHaveCount(0);
  }
  // **Sesiones NO, y es decisión del autor** (D-R-9): es lo bastante externo para seguir siendo
  // una sección normal del taller. Se comprueba que sigue ahí, porque quitarla fue el intento
  // anterior y se deshizo.
  await expect(carril.getByRole("tab", { name: "Sesiones" })).toHaveCount(1);

  const cajones = page.getByRole("navigation", { name: "Cajones del taller" });
  await expect(cajones.getByRole("button")).toHaveCount(3);

  await cajones.getByRole("button", { name: "Bestiario" }).click();
  await expect(page.getByRole("dialog")).toContainText("Bestiario");
  // El taller sigue detrás: el cajón se abre ENCIMA, no sustituye la pantalla.
  await expect(page.getByRole("heading", { name: "El Taller de Bram" })).toBeAttached();

  // **Uno a la vez**, igual que los paneles de la mesa.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await cajones.getByRole("button", { name: "Personajes" }).click();
  await expect(page.getByRole("dialog")).toContainText("Personajes");
  await expect(page.getByRole("dialog")).toHaveCount(1);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});
