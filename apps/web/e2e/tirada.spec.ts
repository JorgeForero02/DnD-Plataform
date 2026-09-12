import { test, expect, type Page } from "@playwright/test";

// Tarea F3 — **los dos dados, con el descartado a la vista**, contra la API real.
//
// Por qué esta suite existe y no basta con las unitarias: el tachado del dado descartado es
// **maquetación**, y jsdom no maqueta — no hay `text-decoration` calculada, así que una prueba
// de componente puede estar en verde con la raya sin pintarse. Es exactamente el fallo del borde
// partido de las listas (docs/08-pruebas.md): toda la suite verde y el defecto en producción.
// Aquí se lee el estilo **calculado** del DOM real.
//
// Y lo que ninguna prueba con espías puede demostrar: que los dos dados que se pintan son los
// que el servidor tiró de verdad. El azar vive en `apps/api/src/rolls/rolls.service.ts`; esta
// prueba pide una tirada con ventaja y comprueba que llegan dos dados y que uno viene descartado.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `tirada-${marca}@example.com`,
    password: "password123",
    displayName: `Tirada ${marca}`,
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

/** Mismo guion que `hoja.spec.ts`: un guerrero enano de nivel 1, completo y derivado. */
async function personajeCompleto(page: Page) {
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La mesa de los dados");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La mesa de los dados" }).click();

  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill("Borin el Afortunado");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("link", { name: /Borin el Afortunado/ }).click();
  await expect(page.getByRole("heading", { name: "Borin el Afortunado" })).toBeVisible();

  await page.getByLabel("Raza", { exact: true }).selectOption("dwarf");
  await page.getByLabel("Clase", { exact: true }).selectOption("fighter");
  await page.getByLabel("Nivel", { exact: true }).fill("1");
  await page.getByLabel("Nivel", { exact: true }).blur();
  for (const [nombre, valor] of [
    ["Fuerza", "16"],
    ["Destreza", "12"],
    ["Constitución", "14"],
    ["Inteligencia", "10"],
    ["Sabiduría", "10"],
    ["Carisma", "8"],
  ] as [string, string][]) {
    const campo = page.getByLabel(nombre, { exact: true });
    await campo.fill(valor);
    await campo.blur();
  }
  // `exact` importa: desde que la hoja tiene su tarjeta de «Salvaciones de muerte», un
  // `getByText("Salvaciones")` casa con las dos y falla por modo estricto. El agente que la
  // añadió lo arregló en `hoja.spec.ts`, pero esta receta está copiada en tres ficheros más.
  await expect(page.getByText("Salvaciones", { exact: true })).toBeVisible({ timeout: 15_000 });
}

test("tirar con ventaja pinta los dos dados, tacha el descartado de verdad y desglosa la suma", async ({
  page,
}) => {
  await registrarse(page);
  await personajeCompleto(page);

  // **La fila es una línea con un dado, y la decisión vive en el panel que abre ese dado**
  // (2026-09-03: la hoja adopta la maqueta). Dentro de la tarjeta de salvaciones la fila se
  // llama «Fuerza»; «Salvación de Fuerza» sigue siendo el nombre de lo que se tira, y por eso es
  // como se llaman el dado, el panel y el botón de tirar.
  const fila = page
    .getByRole("region", { name: "salvaciones" })
    .locator('[data-fila="valor"]')
    .first();
  await fila.getByRole("button", { name: "Tirada de Salvación de Fuerza" }).click();

  // --- La decisión, antes de tirar: tres estados visibles a la vez, nunca un desplegable. ---
  await expect(fila.getByRole("radio", { name: "Normal" })).toBeChecked();
  await expect(fila.getByRole("radio", { name: "Ventaja", exact: true })).toBeVisible();
  await expect(fila.getByRole("radio", { name: "Desventaja" })).toBeVisible();
  await expect(fila.locator("select")).toHaveCount(0);

  // Y **cada una lleva su frase al lado, las tres a la vez**. Antes solo se leía la del estado
  // elegido, porque este control se repetía en las veinticuatro filas de la hoja y tres frases
  // por fila eran setenta y dos líneas; desde que la decisión aparece una sola vez —aquí, al
  // pulsar el dado— la regla vinculante se cumple entera y sin peaje.
  await expect(fila.getByText("Un solo d20.")).toBeVisible();
  await expect(fila.getByText("Dos d20: se queda el alto.")).toBeVisible();
  await expect(fila.getByText("Dos d20: se queda el bajo.")).toBeVisible();

  // --- Una tirada normal: un dado, y nadie promete que se descarte nada. ---
  await fila.getByRole("button", { name: "Tirar Salvación de Fuerza", exact: true }).click();
  await expect(fila.getByRole("status")).toBeVisible({ timeout: 10_000 });
  await expect(fila.locator("[data-dado]")).toHaveCount(1);
  // Se mira **el resultado**, no la fila entera: las frases de ventaja y desventaja llevan «se
  // queda el alto/bajo» siempre —ahora además a la vista—, y buscarlas en toda la fila
  // encontraría esas dos aunque la tirada normal no prometa nada.
  await expect(fila.getByRole("status").getByText(/se queda el/)).toHaveCount(0);
  // El desglose está siempre: nunca un número solo.
  await expect(fila.getByRole("status")).toContainText(/\d+ = \d+ dado/);

  // --- Con ventaja: dos dados, uno tachado, y el rótulo que dice cuál se queda. ---
  await fila.getByRole("radio", { name: "Ventaja", exact: true }).check();
  await fila.getByRole("button", { name: "Tirar Salvación de Fuerza", exact: true }).click();

  await expect(fila.locator("[data-dado]")).toHaveCount(2, { timeout: 10_000 });
  await expect(fila.getByRole("status")).toContainText("se queda el alto");

  const descartado = fila.locator('[data-dado="descartado"]');
  await expect(descartado).toHaveCount(1);

  // **La medición.** Que el dado descartado esté en el DOM no basta: la gracia es verlo tachado.
  // Si alguien cambia la clase, quita el `line-through` o lo pisa con otra utilidad, esto se
  // pone rojo — y ninguna prueba de jsdom podría.
  const decoracion = await descartado.evaluate((el) => getComputedStyle(el).textDecorationLine);
  expect(decoracion).toBe("line-through");

  // Y sigue **a la vista**: tachado no es escondido.
  await expect(descartado).toBeVisible();
  const caja = await descartado.boundingBox();
  expect(caja).not.toBeNull();
  expect(caja!.width).toBeGreaterThan(0);
  expect(caja!.height).toBeGreaterThan(0);

  // El dado se **dibuja**: SVG, nunca un emoji ni un glifo de fuente. Se cuenta dentro del
  // resultado y no en la fila entera, porque desde el rediseño el disparador de la tirada es
  // **otro** dado dibujado — contar tres aquí y llamarlo «los dos dados» sería medir mal.
  await expect(fila.getByRole("status").locator('svg[data-icono="dado"]')).toHaveCount(2);

  // --- Ninguna enumeración del servidor llega a la pantalla. ---
  const cuerpo = await page.locator("body").innerText();
  for (const enumeracion of ["ADVANTAGE", "DISADVANTAGE", "TWENTY", "NO_DC", "SUCCESS"]) {
    expect(cuerpo).not.toContain(enumeracion);
  }

  // --- Desventaja: el rótulo cambia porque cambia lo que pasó. ---
  await fila.getByRole("radio", { name: "Desventaja" }).check();
  await fila.getByRole("button", { name: "Tirar Salvación de Fuerza", exact: true }).click();
  await expect(fila.getByRole("status")).toContainText("se queda el bajo", { timeout: 10_000 });
  await expect(fila.locator('[data-dado="descartado"]')).toHaveCount(1);
});

// Task 26 (I10) — **la tirada de ataque elige audiencia, contra la API real.**
//
// `TirarAtaqueBoton` mandaba `audience: "PUBLIC"` fijo en las tres tiradas del panel; ahora
// ofrece el mismo `SelectorDeAudiencia` que `PanelDeDados`. Lo que ninguna unitaria (RTL, con
// espías) puede demostrar es que el suceso que esa tirada escribe **de verdad** llega filtrado
// por `canView` en el registro de otro usuario — necesita dos navegadores y el servidor real.
//
// El ataque es de un PNJ, a propósito: es el caso del brief, y es distinto de que el propio
// atacante decida ocultarse su propia tirada — aquí el DM oculta el golpe de un PNJ que la
// mesa, por lo demás, ve perfectamente (el PNJ en sí es `PLAYERS`; es SOLO este ataque el que
// se pide `DM_ONLY`).
function cuentaDeAtaque(prefijo: string) {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  return {
    email: `ataque-${prefijo}-${marca}@example.com`,
    password: "password123",
    displayName: `${prefijo} ${marca}`,
  };
}

async function registrarseComo(page: Page, cuenta: ReturnType<typeof cuentaDeAtaque>) {
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();
}

test("Task 26 — el DM tira un ataque con un PNJ «A ciegas» y el jugador no lo ve en el registro", async ({
  browser,
}) => {
  // Dos navegadores, una campaña, un PNJ equipado y dos registros comparados: el mismo
  // presupuesto que `invitacion.spec.ts` y `peticion-de-tirada.spec.ts`.
  test.setTimeout(120_000);

  const dmContext = await browser.newContext();
  const dmPage = await dmContext.newPage();
  await registrarseComo(dmPage, cuentaDeAtaque("dm"));

  await dmPage.getByRole("button", { name: "Nueva campaña" }).first().click();
  await dmPage.getByLabel("Nombre").fill("La emboscada del goblin");
  await dmPage.getByRole("button", { name: "Crear" }).click();
  await dmPage.getByRole("link", { name: "La emboscada del goblin" }).click();
  await expect(dmPage.getByRole("heading", { name: "La emboscada del goblin" })).toBeVisible();
  const campaignId = dmPage.url().split("/campaigns/")[1].split(/[/?]/)[0];

  // --- Se invita a un jugador, para tener a alguien a quien esconderle el ataque. Se hace
  // ahora, mientras el DM sigue en la página de la campaña con sus pestañas — más abajo el DM
  // se va a la ficha del PNJ y ya no las tiene a mano. ---
  await dmPage.getByRole("tab", { name: "Ajustes" }).click();
  await dmPage.getByRole("button", { name: "Generar invitación" }).click();
  const enlace = await dmPage.getByLabel("Enlace de invitación").inputValue();

  const playerContext = await browser.newContext();
  const playerPage = await playerContext.newPage();
  await playerPage.goto(enlace);
  await playerPage.getByRole("link", { name: "Crear cuenta" }).click();
  const jugador = cuentaDeAtaque("jugador");
  await playerPage.getByLabel("Nombre").fill(jugador.displayName);
  await playerPage.getByLabel("Correo").fill(jugador.email);
  await playerPage.getByLabel("Contraseña").fill(jugador.password);
  await playerPage.getByRole("button", { name: "Crear cuenta" }).click();
  await playerPage.getByRole("button", { name: "Unirse a la campaña" }).click();
  await expect(playerPage.getByRole("heading", { name: "La emboscada del goblin" })).toBeVisible();

  // --- Un PNJ bajado a la mesa: el atacante de esta prueba. `CajonesDelTaller` está siempre
  // montado por encima de las pestañas (`CampaignDetailPage.tsx`), así que «Bestiario» no
  // depende de en qué pestaña se quedó el DM tras invitar. ---
  await dmPage.getByRole("button", { name: "Bestiario" }).click();
  await expect(dmPage.getByRole("dialog", { name: "Bestiario" })).toBeVisible();
  const goblin = dmPage.getByTestId("ficha-de-criatura").filter({ hasText: "Goblin" }).first();
  await goblin.getByRole("button", { name: /Bajar a la mesa/i }).click();
  const enLaMesa = dmPage.getByTestId("pnj-en-la-mesa");
  await expect(enLaMesa).toContainText("Goblin", { timeout: 15_000 });

  // --- **Su propia ficha, no el elenco de la mesa.** `ColumnaElenco.tsx` solo enseña a un PNJ
  // mientras hay un encuentro `ACTIVE` (es una columna de combate, no la mesa entera), y con un
  // encuentro en marcha el botón «Atacar» deja de tirar directo: abre la lista de objetivos.
  // El bestiario enlaza cada PNJ de la mesa a la MISMA página que un personaje de jugador
  // (`PanelDeBestiario.tsx`, «Estos PNJ… un enlace a su ficha» — un PNJ es una fila de
  // `Character`), y ahí `AtaquesYLanzamiento` vive sin que exista ningún combate. ---
  await enLaMesa.getByRole("link", { name: "Goblin" }).click();
  await expect(dmPage.getByRole("heading", { name: "Goblin" })).toBeVisible();

  // --- Se equipa un arma: sin arma no hay fila que tirar (`AtaquesYLanzamiento.tsx`, la misma
  // regla que `equiparEspadaLarga` en `hoja.spec.ts`). El inventario es la pestaña «Objetos»
  // de la hoja desde la Tarea 7 (spec 2026-09-11), y solo se monta la activa. ---
  await dmPage.getByRole("tab", { name: "Objetos" }).click();
  await expect(dmPage.getByRole("tab", { name: "Objetos", selected: true })).toBeVisible();
  const inventario = dmPage.getByRole("region", { name: "inventario" });
  await inventario.getByRole("button", { name: /Añadir objeto/ }).click();
  // El buscador del selector por su nombre entero: el inventario tiene además su propio
  // «Buscar objeto» (el filtro de la lista, tarea 9), y `/Buscar/` casaba con los dos.
  await inventario.getByLabel("Buscar objeto por nombre").fill("Cimitarra");
  await inventario
    .getByRole("button", { name: /Cimitarra/ })
    .first()
    .click();
  await inventario.getByRole("radio", { name: /Equipado/ }).check();
  await inventario.getByRole("button", { name: "Añadir", exact: true }).click();
  // **El cajón de «Añadir objeto» no se cierra solo al confirmar** (`SelectorDeObjeto.tsx`,
  // `confirmarAlta` solo limpia lo elegido): se cierra a mano, con SU PROPIO «Cerrar», para que
  // no queden dos botones «Cerrar» en la página cuando se abra el panel de la tirada más abajo.
  await inventario.getByRole("button", { name: "Cerrar", exact: true }).click();
  // La fila ya está en la lista antes de cambiar de pestaña (la de Objetos se desmonta al
  // salir), y el cuadro de ataques vive en «Ataques».
  await expect(inventario.getByRole("button", { name: "Ver detalle de Cimitarra" })).toBeVisible({
    timeout: 15_000,
  });
  await dmPage.getByRole("tab", { name: "Ataques" }).click();
  await expect(dmPage.getByRole("tab", { name: "Ataques", selected: true })).toBeVisible();

  const tablaAtaques = dmPage.getByRole("region", { name: "ataques y lanzamiento" });
  await expect(tablaAtaques.getByRole("table")).toBeVisible({ timeout: 15_000 });

  // --- El ataque en sí, con audiencia «A ciegas» (BLIND → visibilidad DM_ONLY). Sin encuentro,
  // el botón «Atacar» tira directo (`alPulsarAtacar`, `TirarAtaqueBoton.tsx`): no hay lista de
  // objetivos que abrir. ---
  await tablaAtaques.getByRole("button", { name: "Tirada de Cimitarra" }).click();
  // Acotado al propio panel (`role="group"`, `aria-label="Tirada de Cimitarra"`): la página
  // tiene, a la vez, el «Cerrar» de este panel Y el del cajón de objetos si no se hubiera
  // cerrado — acotar es lo que evita el modo estricto de Playwright, no un accidente de orden.
  const panelDeTirada = dmPage.getByRole("group", { name: "Tirada de Cimitarra" });
  await panelDeTirada.getByRole("radio", { name: "A ciegas" }).check();
  const botonAtacar = panelDeTirada.getByRole("button", { name: "Atacar con Cimitarra" });
  await expect(botonAtacar).not.toHaveAttribute("aria-disabled", "true", { timeout: 10_000 });
  await botonAtacar.click();
  await expect(panelDeTirada.getByRole("status").first()).toBeVisible({ timeout: 10_000 });
  await panelDeTirada.getByRole("button", { name: "Cerrar", exact: true }).click();

  // --- El DM lo ve en su propio registro; el jugador, no. ---
  await dmPage.goto(`/campaigns/${campaignId}`);
  await dmPage.getByRole("tab", { name: "Dados" }).click();
  const registroDm = dmPage.getByRole("region", { name: /registro de tiradas/i });
  await expect(registroDm.locator('[data-tirada-tipo="ABILITY_ROLL"]')).toHaveCount(1, {
    timeout: 15_000,
  });

  await playerPage.goto(`/campaigns/${campaignId}`);
  await playerPage.getByRole("tab", { name: "Dados" }).click();
  const registroJugador = playerPage.getByRole("region", { name: /registro de tiradas/i });
  // El ancla no es que la región exista — existe desde el primer render, vacía —, sino que
  // **ya cargó** y no tiene nada que enseñar: el texto de «sin nada todavía» es la prueba de
  // que la consulta volvió (y, si hubiera sondeo, tuvo ocasión de traer algo) y siguió en cero.
  await expect(
    registroJugador.getByText("Todavía no se ha tirado nada en esta campaña."),
  ).toBeVisible({
    timeout: 15_000,
  });
  await expect(registroJugador.locator('[data-tirada-tipo="ABILITY_ROLL"]')).toHaveCount(0);

  await dmContext.close();
  await playerContext.close();
});
