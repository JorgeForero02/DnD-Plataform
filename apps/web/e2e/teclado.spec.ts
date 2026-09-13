import { test, expect, type Locator, type Page } from "@playwright/test";

// Task 32 (U6) — el recorrido de teclado: desde «Tus crónicas» se llega a una campaña, se abre
// «El mundo», se abre una ficha y se vuelve, sin tocar el ratón ni una sola vez. En cada parada
// se comprueba que `document.activeElement` es el control que se pretendía alcanzar y que su
// `outline-style` calculado no es `none` (WCAG 2.4.7, foco visible).
//
// **Por qué entra `ArrowRight` además de `Tab`/`Shift+Tab`/`Enter`/`Escape`.** La tira de
// pestañas (`ui/Tabs.tsx`) implementa el patrón WAI-ARIA de tabs con «roving tabindex»: solo la
// pestaña activa es alcanzable con `Tab`, y `ArrowRight`/`ArrowLeft` mueven el foco Y la
// selección entre pestañas (`Tabs.test.tsx` ya lo exige así). Es el comportamiento correcto y
// documentado —no un rodeo—, así que sin `ArrowRight` no hay manera de llegar de «Resumen» a «El
// mundo» por teclado: sería el propio patrón de accesibilidad el que impidiera la prueba.
//
// **Por qué las pestañas inactivas con `tabindex="-1"` no cuentan como el fallo que busca la
// segunda comprobación.** El mismo patrón de roving tabindex exige que las pestañas no activas
// queden fuera de la secuencia de `Tab` — es la forma en que WAI-ARIA dice «hay un solo punto de
// entrada al grupo, y las flechas mueven dentro de él». Tienen motivo (`role="tab"` con
// `aria-selected`) y se excluyen explícitamente; cualquier otro `tabindex="-1"` en las pantallas
// visitadas sí cuenta.

async function tabHasta(page: Page, objetivo: Locator, maxPasos = 60) {
  for (let i = 0; i < maxPasos; i++) {
    const yaEsta = await objetivo
      .evaluate((el) => el === document.activeElement)
      .catch(() => false);
    if (yaEsta) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("No se alcanzó el control por teclado dentro del número de Tabs esperado");
}

async function estaEnfocadoConAnilloVisible(objetivo: Locator) {
  const { enfocado, outlineStyle } = await objetivo.evaluate((el) => ({
    enfocado: el === document.activeElement,
    outlineStyle: getComputedStyle(el).outlineStyle,
  }));
  expect(enfocado, "el control tiene que ser document.activeElement").toBe(true);
  expect(outlineStyle, "el anillo de foco calculado no puede ser 'none'").not.toBe("none");
}

// La excepción de roving tabindex, explicada arriba: una pestaña no activa dentro de un
// `role="tablist"` es el único `tabindex="-1"` que tiene motivo declarado.
async function sinTabindexHuerfano(page: Page) {
  const huerfanos = await page.evaluate(() => {
    const nodos = Array.from(document.querySelectorAll('[tabindex="-1"]'));
    return nodos
      .filter((el) => !(el.getAttribute("role") === "tab" && el.hasAttribute("aria-selected")))
      .map((el) => el.outerHTML.slice(0, 120));
  });
  expect(
    huerfanos,
    "tabindex=-1 sin motivo (ni pestaña con aria-selected, ni aria-hidden)",
  ).toEqual([]);
}

function nuevaCuenta(prefijo: string) {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `e2e-${prefijo}-${marca}@example.com`,
    password: "password123",
    displayName: `${prefijo} ${marca}`,
  };
}

test.setTimeout(60_000);

test("de la lista de campañas a una ficha y de vuelta, solo con teclado", async ({ page }) => {
  const cuenta = nuevaCuenta("teclado");
  const nombreCampana = "Campaña del recorrido de teclado";
  const nombrePnj = "El vigía de la puerta norte";

  // --- Preparación por ratón: hace falta una campaña con una ficha dentro antes de poder
  // recorrerla por teclado; el recorrido de teclado en sí empieza más abajo, desde "/". ---
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill(nombreCampana);
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: nombreCampana }).click();
  await expect(page.getByRole("heading", { name: nombreCampana })).toBeVisible();

  await page.getByRole("tab", { name: "El mundo" }).click();
  await page.getByRole("button", { name: /^PNJ/ }).click();
  await page.getByRole("button", { name: "Nuevo PNJ" }).click();
  await page.getByLabel("Nombre").fill(nombrePnj);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  // --- Aquí empieza el recorrido de teclado. Página fresca para no arrastrar el foco de la
  // preparación anterior. ---
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();
  await sinTabindexHuerfano(page);

  // 1. Se llega a la campaña con Tab...
  const enlaceCampana = page.getByRole("link", { name: nombreCampana });
  await tabHasta(page, enlaceCampana);
  await estaEnfocadoConAnilloVisible(enlaceCampana);

  // ...y se abre con Enter.
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: nombreCampana })).toBeVisible();
  await sinTabindexHuerfano(page);

  // 2. La pestaña "Resumen" es la única alcanzable con Tab al llegar (roving tabindex).
  const pestanaResumen = page.getByRole("tab", { name: "Resumen" });
  await tabHasta(page, pestanaResumen);
  await estaEnfocadoConAnilloVisible(pestanaResumen);

  // ArrowRight mueve el foco Y la selección a "El mundo" — ver el comentario de cabecera.
  const pestanaMundo = page.getByRole("tab", { name: "El mundo" });
  await page.keyboard.press("ArrowRight");
  await estaEnfocadoConAnilloVisible(pestanaMundo);
  await expect(pestanaMundo).toHaveAttribute("aria-selected", "true");
  await sinTabindexHuerfano(page);

  // 3. Dentro de "El mundo", con Tab se llega a la fila de la ficha.
  const filaPnj = page.getByRole("link", { name: new RegExp(nombrePnj) });
  await tabHasta(page, filaPnj);
  await estaEnfocadoConAnilloVisible(filaPnj);

  // ...y se abre con Enter.
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: nombrePnj })).toBeVisible();
  await sinTabindexHuerfano(page);

  // 4. Y se vuelve por la miga de pan de la campaña — con Tab hacia delante y luego Shift+Tab
  // hacia atrás, para ejercer las dos direcciones.
  const migaCampana = page.getByRole("link", { name: nombreCampana });
  await tabHasta(page, migaCampana);
  await estaEnfocadoConAnilloVisible(migaCampana);
  await page.keyboard.press("Tab");
  const enfocadoTrasAvanzar = await migaCampana
    .evaluate((el) => el === document.activeElement)
    .catch(() => false);
  expect(enfocadoTrasAvanzar, "Tab tiene que mover el foco a otro sitio").toBe(false);
  await page.keyboard.press("Shift+Tab");
  await estaEnfocadoConAnilloVisible(migaCampana);

  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: nombreCampana })).toBeVisible();
  // La miga vuelve a la SECCIÓN de la que salió la ficha (EntityDetailPage.tsx:
  // `?seccion=${entity.type}`), así que "El mundo" sigue abierta.
  await expect(page.getByRole("tab", { name: "El mundo", selected: true })).toBeVisible();
  await sinTabindexHuerfano(page);

  // Escape no tiene ningún diálogo que cerrar en este recorrido — se comprueba que no rompe
  // nada dejarlo pulsado sobre la página normal.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: nombreCampana })).toBeVisible();
});

// Tarea 8 del pulido (C2: #1) — **el menú «…» de la fila del elenco, solo con teclado.** La
// fila plegó «Condición», «Dar…», «Su hoja» y el bando en `ui/MenuDeAcciones.tsx`
// (`docs/04-convenciones.md`, `ACCIONES_VISIBLES`); este recorrido demuestra que el menú entero
// se abre, se recorre y se cierra sin tocar el ratón — la misma disciplina que el resto de este
// fichero.
test("el menú «Más acciones sobre …» del elenco, con teclado: Tab, Enter, flechas y Escape", async ({
  page,
}) => {
  const cuenta = nuevaCuenta("menu-teclado");
  const nombrePersonaje = "Ilda Portaescudo";

  // --- Preparación por ratón: una campaña, un personaje y una sesión con la mesa abierta ---
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("Campaña del menú por teclado");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "Campaña del menú por teclado" }).click();
  await expect(page.getByRole("heading", { name: "Campaña del menú por teclado" })).toBeVisible();

  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill(nombrePersonaje);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Nueva sesión" }).click();
  await page.getByLabel("Título").fill("La sesión del menú por teclado");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByLabel(cuenta.displayName).check();
  await page
    .getByLabel(`Personaje de ${cuenta.displayName}`)
    .selectOption({ label: nombrePersonaje });
  await page.getByRole("button", { name: "Empezar la sesión" }).click();

  const barra = page.getByRole("status", { name: "Sesión en curso" });
  await expect(barra).toBeVisible({ timeout: 10_000 });
  await barra.getByRole("link", { name: "Ir a la mesa" }).click();

  const elenco = page.getByRole("region", { name: "En la mesa" });
  await expect(elenco.getByText(nombrePersonaje).first()).toBeVisible({ timeout: 15_000 });

  // --- Aquí empieza el recorrido de teclado propiamente dicho ---
  const botonMenu = elenco.getByRole("button", { name: `Más acciones sobre ${nombrePersonaje}` });
  await tabHasta(page, botonMenu);
  await estaEnfocadoConAnilloVisible(botonMenu);

  // Enter abre el menú, y el foco entra en su primer ítem («Condición») — no se queda en el
  // botón: `MenuDeAcciones` mueve el foco al abrir, como cualquier menú de verdad.
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu", { name: `Más acciones sobre ${nombrePersonaje}` });
  await expect(menu).toBeVisible();
  const itemCondicion = menu.getByRole("menuitem", { name: "Condición" });
  await estaEnfocadoConAnilloVisible(itemCondicion);

  // ArrowDown mueve el foco al siguiente ítem («Dar…»), sin seleccionar nada todavía.
  const itemDar = menu.getByRole("menuitem", { name: "Dar…" });
  await page.keyboard.press("ArrowDown");
  await estaEnfocadoConAnilloVisible(itemDar);

  // Escape cierra el menú SIN seleccionar nada, y devuelve el foco al botón que lo abrió.
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await estaEnfocadoConAnilloVisible(botonMenu);

  // Se reabre, y esta vez Enter selecciona el ítem enfocado (el primero, «Condición»): abre su
  // cajón de verdad, no solo mueve el foco.
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("menu", { name: `Más acciones sobre ${nombrePersonaje}` }),
  ).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: `Poner condición · ${nombrePersonaje}` }),
  ).toBeVisible();
});
