import { test, expect, type Locator, type Page } from "@playwright/test";

// Fase 2B — el recorrido que ninguna prueba unitaria puede hacer: **meter un objeto, ponérselo,
// y ver cambiar el número de la hoja**. Es la promesa entera de esta fase en una pantalla, y
// atraviesa el inventario, el motor de derivación, la traza y el cuadro de ataques.
//
// Lo que aquí se mide y en `jsdom` es invisible: que la tabla de ataques desplace **dentro de su
// contenedor** y no arrastre la página, y que la pantalla siga cabiendo en un portátil.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `inv-${marca}@example.com`,
    password: "password123",
    displayName: `Inv ${marca}`,
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

async function crearPersonajeConFicha(page: Page, nombre: string) {
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La mesa del inventario");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La mesa del inventario" }).click();

  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("link", { name: new RegExp(nombre) }).click();
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();

  await page.getByLabel("Raza", { exact: true }).selectOption("dwarf");
  await page.getByLabel("Clase", { exact: true }).selectOption("fighter");
  const caracteristicas: [string, string][] = [
    ["Fuerza", "16"],
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

/**
 * Abre una pestaña de la hoja y espera a que sea la activa. Desde la Tarea 7 (spec 2026-09-11)
 * la hoja son una cabecera fija y siete pestañas, y **solo se monta el contenido de la activa**:
 * cada tarjeta se busca después de abrir la suya. «Números» es la de arranque.
 */
async function abrirPestana(donde: Page | Locator, nombre: string) {
  await donde.getByRole("tab", { name: nombre }).click();
  await expect(donde.getByRole("tab", { name: nombre, selected: true })).toBeVisible();
}

/**
 * Añade un objeto del catálogo del SRD por su nombre, y lo deja en la zona indicada. Abre
 * antes la pestaña «Objetos», y al salir deja la fila YA en la lista: la pestaña se desmonta
 * al cambiar, y lo que se espera es la fila real (su botón de selección, que solo pinta la
 * página), no la del catálogo del selector, que sigue abierto.
 */
async function anadirObjeto(page: Page, nombre: string, zona: "mochila" | "equipado") {
  await abrirPestana(page, "Objetos");
  const inventario = page.getByRole("region", { name: "inventario" });
  await inventario.getByRole("button", { name: /Añadir objeto/ }).click();
  // El buscador del selector por su nombre entero: desde la tarea 9 el inventario tiene
  // además su propio «Buscar objeto» (el filtro de la lista), y `/Buscar/` casaba con los dos.
  await inventario.getByLabel("Buscar objeto por nombre").fill(nombre);
  await inventario
    .getByRole("button", { name: new RegExp(nombre) })
    .first()
    .click();
  if (zona === "equipado") {
    await inventario.getByRole("radio", { name: /Equipado/ }).check();
  }
  await inventario.getByRole("button", { name: "Añadir", exact: true }).click();
  await expect(inventario.getByRole("button", { name: `Ver detalle de ${nombre}` })).toBeVisible({
    timeout: 15_000,
  });
}

test("equipar una armadura cambia la CA de la hoja y añade su paso a la traza", async ({
  page,
}) => {
  await registrarse(page);
  await crearPersonajeConFicha(page, "Brann Yunque");

  // La CA antes de tener nada puesto: 10 + Destreza. Se lee del propio DOM, no de un número
  // escrito aquí — si la fórmula cambiara, esta prueba seguiría midiendo lo que importa: que
  // **ponerse la armadura la sube**. La tarjeta vive en «Estado».
  await abrirPestana(page, "Estado");
  const tarjetaCa = page.getByRole("region", { name: "clase de armadura" });
  await expect(tarjetaCa).toBeVisible();
  const cifraCa = tarjetaCa.locator("span").first();
  const caAntes = Number((await cifraCa.textContent())!.replace(/\D/g, ""));

  // **Entra en la mochila y se equipa con el gesto**, que es el recorrido de la mesa: se recoge
  // el botín y luego alguien se lo pone. Añadirlo ya equipado también funciona, pero se saltaría
  // justo lo que esta prueba existe para medir.
  await anadirObjeto(page, "Cota de malla", "mochila");
  const inventario = page.getByRole("region", { name: "inventario" });
  await inventario
    .getByRole("listitem")
    .filter({ hasText: "Cota de malla" })
    .getByRole("button", { name: "Equipar" })
    .click();

  // **El aviso que conecta el gesto con el número.** Es la razón de que el inventario viva
  // dentro de la hoja y no en otra pantalla. Se mira ANTES de cambiar de pestaña: el aviso
  // es estado de la pestaña «Objetos» y se va con ella al desmontarse.
  await expect(page.getByText(/Equipaste/)).toBeVisible({ timeout: 15_000 });

  await abrirPestana(page, "Estado");
  await expect
    .poll(async () => Number((await cifraCa.textContent())!.replace(/\D/g, "")), {
      timeout: 15_000,
    })
    .toBeGreaterThan(caAntes);

  // Y la traza gana el paso del objeto: sin esto, la CA sería un número que sube solo.
  await tarjetaCa.getByRole("button").first().click();
  // La fórmula de una línea escribe los pasos en minúscula («16 cota de malla +1 destreza»), así
  // que la comprobación no puede ser sensible a mayúsculas.
  await expect(tarjetaCa.getByText(/cota de malla/i).first()).toBeVisible();
});

// HP-9a (2026-09-12) — «Sintonizar cuenta». El servidor deja de aplicar los `effects` de un
// objeto que exige sintonización hasta que la fila está sintonizada (SRD 5.1 §Attunement); la
// pantalla tacha el bono, lo marca, y la cabecera avisa. Lo que aquí se mide y `jsdom` no puede:
// que el número de la tira fija NO se mueva al equipar y SÍ al sintonizar, y que a 390 la fila
// con la marca crece hacia abajo y no hacia los lados.
test("un objeto que requiere sintonización no cuenta hasta sintonizarlo", async ({ page }) => {
  test.setTimeout(90_000);
  await registrarse(page);
  await crearPersonajeConFicha(page, "Ondra Cerrojo");

  // El anillo se crea y se entrega por la API: el SRD 5.1 no trae nada que pida sintonización
  // (`hoja-pestanas.spec.ts`), y el alta a clics ya la recorre la prueba del catálogo de arriba.
  const ruta = new URL(page.url()).pathname;
  const [, campaignId, characterId] = ruta.match(/\/campaigns\/([^/]+)\/personajes\/([^/]+)/)!;
  const token = await page.evaluate(() => localStorage.getItem("dnd_token"));
  const headers = { Authorization: `Bearer ${token}` };
  const anillo = await page.request.post(`/api/campaigns/${campaignId}/items`, {
    headers,
    data: {
      name: "Anillo de protección",
      kind: "OTHER",
      weightOz: 0,
      requiresAttunement: true,
      effects: [{ kind: "ac", amount: 1 }],
      slot: "RING_1",
    },
  });
  expect(anillo.ok(), "crear el anillo en el catálogo de la campaña").toBe(true);
  const alta = await page.request.post(
    `/api/campaigns/${campaignId}/characters/${characterId}/inventory`,
    {
      headers,
      data: {
        ref: { source: "CAMPAIGN", id: (await anillo.json()).id },
        quantity: 1,
        location: "CARRIED",
      },
    },
  );
  expect(alta.ok(), "dar el anillo al personaje").toBe(true);

  await page.goto(`${ruta}?pestana=objetos`);
  const resumen = page.getByRole("region", { name: "resumen de combate" });
  const ca = resumen.getByText("CA", { exact: true }).locator("..").getByRole("button");
  await expect(ca).toHaveText(/^\d+$/);
  const caAntes = (await ca.textContent())!.trim();

  const inventario = page.getByRole("region", { name: "inventario" });
  const fila = inventario.getByRole("listitem").filter({ hasText: "Anillo de protección" });
  await expect(fila).toBeVisible();
  const MARCA = "Efecto inactivo: requiere sintonización";
  const avisos = page.getByRole("region", { name: "advertencia" });
  const avisoDeLaHoja = avisos.getByText(
    /"Anillo de protección" requiere sintonización: sus efectos no cuentan hasta sintonizarlo/,
  );

  // **Equipar no basta.** La fila pasa a «Equipado» (aparece «Sintonizar con…», que solo se
  // ofrece ahí), la hoja se recalcula y avisa, y la CA de la tira sigue siendo la de antes: el
  // aviso llega con la hoja recalculada, así que leer la CA después de verlo no es leerla antes
  // de tiempo.
  await fila.getByRole("button", { name: "Equipar" }).click();
  const sintonizar = fila.getByRole("button", { name: "Sintonizar con Anillo de protección" });
  await expect(sintonizar).toBeVisible({ timeout: 15_000 });
  await expect(avisoDeLaHoja).toBeVisible({ timeout: 15_000 });
  await expect(ca).toHaveText(caAntes);
  const tachado = fila.locator('s[data-efecto="inactivo"]');
  await expect(tachado).toHaveText("+1 CA");
  await expect(fila.getByText(MARCA, { exact: true })).toBeVisible();
  // «Equipaste … CA» no se pinta: la CA no cambió, y avisar de un cambio que no hubo mentiría.
  await expect(page.getByText(/Equipaste/)).toHaveCount(0);

  // A 390 la fila envuelve (`flex-wrap`): la marca la hace más alta, no más ancha. Se mide la
  // MARCA, no el `<li>` —la caja de la fila nunca supera a su contenedor aunque su contenido se
  // salga—, y además que ni el inventario ni el documento se desplazan a lo ancho.
  await page.setViewportSize({ width: 390, height: 844 });
  const marca = fila.getByText(MARCA, { exact: true });
  await expect(marca).toBeVisible();
  const caja = (await marca.boundingBox())!;
  expect(caja.x, "la marca empieza dentro de la ventana").toBeGreaterThanOrEqual(0);
  expect(caja.x + caja.width, "la marca cabe en 390").toBeLessThanOrEqual(390);
  const desbordaElInventario = await inventario.evaluate((el) => {
    const nodos = [el, ...Array.from(el.querySelectorAll<HTMLElement>("li"))];
    return nodos.some((n) => n.scrollWidth > n.clientWidth + 1);
  });
  expect(desbordaElInventario, "el inventario no se desplaza en horizontal").toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 1280, height: 720 });

  // **Sintonizar sí cuenta:** la CA sube uno, el bono va en limpio y no queda marca ni aviso.
  await sintonizar.click();
  await expect(ca).toHaveText(String(Number(caAntes) + 1), { timeout: 15_000 });
  await expect(
    fila.getByRole("button", { name: "Desintonizar Anillo de protección" }),
  ).toBeVisible();
  await expect(tachado).toHaveCount(0);
  await expect(fila.getByText("+1 CA", { exact: true })).toBeVisible();
  await expect(fila.getByText(MARCA, { exact: true })).toHaveCount(0);
  await expect(avisoDeLaHoja).toHaveCount(0);
});

test("un arma equipada aparece en el cuadro de ataques, se tira, y la tabla no desborda la página", async ({
  page,
}) => {
  await registrarse(page);
  await crearPersonajeConFicha(page, "Kera Puñoquieto");

  await anadirObjeto(page, "Espada larga", "equipado");

  await abrirPestana(page, "Ataques");
  const ataques = page.getByRole("region", { name: "ataques y lanzamiento" });
  const tabla = ataques.getByRole("table");
  await expect(tabla).toBeVisible({ timeout: 15_000 });
  await expect(tabla.getByRole("rowheader", { name: "Espada larga" })).toBeVisible();
  // Fuerza 16 (+3) y competencia +2 en un guerrero de nivel 1: 1d8+3 de daño.
  await expect(tabla.getByText("1d8", { exact: false }).first()).toBeVisible();

  // **El servidor tira.** La pantalla pide la tirada y enseña el desglose que le llega.
  await tabla.getByRole("button", { name: "Tirada de Espada larga" }).click();
  const panel = ataques.getByRole("group", { name: "Tirada de Espada larga" });
  await panel.getByRole("button", { name: "Atacar con Espada larga" }).click();
  // El desglose, no solo el total: un número sin explicación genera la siguiente pregunta al DM.
  // `ResultadoDeTirada` lo publica como `role="status"` con los dados y la suma dentro.
  await expect(panel.getByRole("status").first()).toBeVisible({ timeout: 15_000 });

  // **El crítico se enseña, no se elige** (C2.5-2). Había aquí una casilla «Crítico» que el
  // jugador marcaba a mano y el servidor se creía; ahora el daño manda el `eventId` de la tirada
  // de ataque y el servidor lee su `natural`. La casilla no existe, y el panel dice lo que pasó.
  await expect(panel.getByRole("checkbox", { name: "Crítico" })).toHaveCount(0);
  // **El regex casa con las dos frases a propósito** —«Fue un 20 natural» y «No fue un 20
  // natural»—: el servidor tira de verdad y un 20 sale una vez de cada veinte. Lo que se afirma
  // aquí es que el panel **dice qué pasó**, no cuál de las dos salió; que el 20 duplique los dados
  // lo prueba el servidor, que es donde se decide.
  await expect(panel.getByText(/20 natural/)).toBeVisible();

  // Y el daño se cobra sobre esa tirada. **Dos veces no**: la base tiene un índice único sobre el
  // `attackRollEventId`, así que el segundo intento es un 409 y la pantalla lo dice en línea.
  await panel.getByRole("button", { name: "Tirar daño de Espada larga" }).click();
  await expect(panel.getByRole("status").nth(1)).toBeVisible({ timeout: 15_000 });
  await panel.getByRole("button", { name: "Tirar daño de Espada larga" }).click();
  await expect(panel.getByText(/ya se había cobrado/)).toBeVisible({ timeout: 15_000 });

  // La tabla desplaza lo suyo dentro de su contenedor…
  const contenedor = tabla.locator("..");
  expect(await contenedor.evaluate((el) => getComputedStyle(el).overflowX)).toBe("auto");

  // …y la página no se desplaza en horizontal en una ventana de portátil.
  await page.setViewportSize({ width: 1024, height: 768 });
  const desborda = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(desborda, "la página no puede desplazarse en horizontal").toBe(false);
});

test("el catálogo de objetos de la campaña crea un objeto propio y se distingue del SRD", async ({
  page,
}) => {
  await registrarse(page);
  await crearPersonajeConFicha(page, "Sil la Errante");

  await page.getByRole("link", { name: "La mesa del inventario" }).first().click();
  await page.getByRole("button", { name: "Catálogo" }).click();

  await page
    .getByRole("button", { name: /Crear objeto|Nuevo objeto/ })
    .first()
    .click();
  await page.getByLabel("Nombre", { exact: true }).fill("Farol de marea");
  await page.getByRole("button", { name: "Guardar" }).click();

  // La procedencia se ve de un vistazo: cuando algo se comporta raro, lo primero es saber de
  // dónde salió.
  await expect(page.getByText("Farol de marea")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("de la campaña").first()).toBeVisible();

  // Anexo #21 — filtros del catálogo por tipo de objeto, con chips como el bestiario. «Daga»
  // es del SRD (arma) y «Cota de malla» también (armadura): pulsar «Armadura» deja la segunda y
  // quita la primera.
  await expect(page.getByRole("button", { name: "Daga" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Armadura", exact: true }).click();
  await expect(page.getByText("Cota de malla", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Daga" })).toHaveCount(0);
});
