import { test, expect, type Page } from "@playwright/test";

// **Paso 1 «las goteras» — la tanda única de navegador de las tareas de pantalla.**
//
// Lo que aquí se mide y en `jsdom` es invisible: que los gestos nuevos **lleguen al servidor y
// vuelvan**, y que un defecto de maquetación arreglado esta mañana no vuelva — eso es posición y
// tamaño, y se mide con `boundingBox()` y números, nunca con una prueba de componente.

// **Noventa segundos por prueba, y no es holgura**: cada una registra una cuenta, crea una
// campaña, escribe una ficha entera —seis características, raza y clase, con su derivación— y solo
// entonces empieza a medir. Con los 30 s de la configuración por defecto, tres de estas cuatro
// morían por presupuesto **sin llegar a su aserción**, y el error que imprimen —«Test timeout»
// sobre el último locator— parece un selector roto. Es el mismo tamaño que ya usan `archivar` y
// `bandeja-de-avisos`.
test.setTimeout(90_000);

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `goteras-${marca}@example.com`,
    password: "password123",
    displayName: `Goteras ${marca}`,
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

async function crearCampana(page: Page, nombre: string) {
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: nombre }).click();
}

async function crearPersonajeConFicha(page: Page, nombre: string) {
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
    ["Destreza", "16"],
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

// --- Tarea 10 -----------------------------------------------------------------------------

test("el DM crea «Furia 2/2» desde la hoja, y la gasta", async ({ page }) => {
  // **La ruta existía desde 2A y la web no la llamaba nunca**: se podía gastar, regalar y reponer
  // un recurso y no crearlo, así que una fila «Furia» no podía existir.
  await registrarse(page);
  await crearCampana(page, "La mesa de los recursos");
  await crearPersonajeConFicha(page, "Brann Yunque");

  const recursos = page.getByRole("region", { name: /recursos/i });
  await recursos.getByRole("button", { name: /Nuevo recurso/i }).click();
  await recursos.getByRole("textbox", { name: "Nombre" }).fill("Furia");
  // **`getByRole("spinbutton")` y no `getByLabel`**: los radios de la reposición llevan la palabra
  // «máximo» dentro de su frase explicativa, así que la etiqueta sola resolvía a tres elementos.
  await recursos.getByRole("spinbutton", { name: "Máximo" }).fill("2");
  // **Radios con su frase**, no un desplegable: es el control que la regla exige.
  await expect(recursos.getByRole("radio", { name: /Descanso largo/ })).toBeVisible();
  await recursos.getByRole("button", { name: /^Crear$/ }).click();

  // Nace lleno, que es lo único que sirve para algo en una mesa.
  await expect(recursos.getByText("2 / 2")).toBeVisible({ timeout: 15_000 });

  await recursos.getByRole("button", { name: "Gastar uno de Furia" }).click();
  await expect(recursos.getByText("1 / 2")).toBeVisible({ timeout: 15_000 });
});

// --- Tarea 11 ------------------------------------------------------------------------------

/**
 * **Añade un objeto del catálogo y lo deja en la mochila.** El panel de «Añadir objeto» **se queda
 * abierto tras el alta**, así que la segunda vez no hay botón que pulsar para abrirlo: se
 * comprueba y solo se abre si hace falta. Eso fue uno de los cuatro fallos de selector de la
 * primera tanda.
 */
async function anadirDelCatalogo(page: Page, nombre: string) {
  const abrir = page.getByRole("button", { name: "Añadir objeto", exact: true });
  const panel = page.locator('section[aria-label="Añadir objeto"]');
  // **Abrir y comprobar que abrió, reintentando.** La primera versión pulsaba una vez y seguía: el
  // clic aterrizaba mientras la hoja todavía se montaba —la ficha acaba de escribirse y la
  // derivación llega después—, React reemplazaba el nodo, y el clic se perdía **sin error**. El
  // fallo aparecía 90 s más tarde buscando el buscador, con el botón de abrir todavía en la
  // página. `toPass` es la forma que Playwright documenta para esto: repetir el gesto hasta que su
  // efecto se vea, en vez de confiar en que un clic siempre cuenta.
  await expect(async () => {
    if (await abrir.count()) await abrir.first().click();
    await expect(panel).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  await panel.getByLabel(/Buscar objeto por nombre/i).fill(nombre);
  await panel
    .getByRole("button", { name: new RegExp(`^${nombre}`) })
    .first()
    .click();
  await panel.getByRole("button", { name: "Añadir", exact: true }).click();
}

/**
 * **Equipa el primer objeto que todavía se pueda equipar, en la mano que se le diga.**
 *
 * Las dos claves de que esto no parpadee, y las dos costaron una tanda:
 *
 * 1. **`Confirmar` con `exact`.** `getByRole("button", { name: /confirmar|equipar/i })` resolvía
 *    **al «Equipar» de la propia fila**, que está antes en el DOM: el recorrido volvía a abrir el
 *    selector en vez de confirmarlo, y el fallo salía tres pasos después con otra cara.
 * 2. **Se espera al EFECTO, no a un tiempo.** Al equipar, la lista se invalida y la fila **salta
 *    de «Encima» a «Equipado»**, así que el nodo que se acaba de pulsar deja de existir —«element
 *    was detached from the DOM»—. Esperar a que el texto diga en qué mano está es esperar a que el
 *    remonte haya terminado, y eso sí es estable.
 */
async function equiparEnMano(page: Page, mano: "Mano principal" | "Mano izquierda") {
  await page.getByRole("button", { name: "Equipar", exact: true }).first().click();
  await page.getByRole("radio", { name: mano, exact: true }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  const enLaMano = mano === "Mano principal" ? "en mano" : "en la mano izquierda";
  await expect(page.getByText(enLaMano, { exact: false }).first()).toBeVisible({ timeout: 20_000 });
}

test("dos dagas, una en cada mano, y el cuadro de ataques enseña las dos", async ({ page }) => {
  // **La pantalla no mandaba `slot` al equipar**: el servidor lo aceptaba y el motor lo usaba para
  // decidir si un arma versátil va a dos manos, pero no había forma de poner nada en la izquierda.
  // Un pícaro con dos dagas no existía.
  await registrarse(page);
  await crearCampana(page, "La mesa de las dos manos");
  await crearPersonajeConFicha(page, "Brann Yunque");

  await anadirDelCatalogo(page, "Daga");
  await anadirDelCatalogo(page, "Daga");

  await equiparEnMano(page, "Mano principal");
  await equiparEnMano(page, "Mano izquierda");

  // **La prueba de que el `slot` llegó al servidor no es la fila del inventario: es el CUADRO DE
  // ATAQUES**, que lo compone el motor a partir de lo equipado. Dos filas «Daga» ahí significan
  // dos manos ocupadas de verdad.
  const ataques = page.getByRole("region", { name: /ataques/i });
  await expect(ataques.getByRole("row", { name: /Daga/ })).toHaveCount(2, { timeout: 20_000 });
});

// --- Tarea 12 · lo que NO está aquí, y por qué ----------------------------------------------
//
// **La prueba de navegador de «cambiar quién ve una criatura» se midió y NO se commitea, porque
// parpadea.** Una prueba que da verde y rojo en dos pasadas seguidas sobre el mismo código no
// defiende nada y envenena la suite.
//
// Lo medido: pasa en una pasada y falla en la siguiente, siempre en la última aserción — al
// reabrir el editor el radio vuelve sin marcar. **El servidor NO es el problema**, y eso sí está
// probado: `apps/api/test/statblocks.e2e-spec.ts` comprueba que el `PUT` guarda el nivel nuevo y
// que releer la lista lo devuelve. Queda su ficha en `docs/06-pendientes.md`.

// --- Un defecto de maquetación ya arreglado, que no debe volver -----------------------------

test("el botón «Aplicar» de la bolsa no se sale de su tarjeta", async ({ page }) => {
  // **Se salía 24,5 px** con tres columnas en `sm:` (celda de 77 px, botón de 70). Es posición y
  // tamaño: `jsdom` no lo ve, y por eso llegó a producción. La medición es con números.
  await registrarse(page);
  await crearCampana(page, "La mesa de la bolsa");
  await crearPersonajeConFicha(page, "Brann Yunque");

  const boton = page.getByRole("button", { name: /Aplicar cambio de cobre/i }).first();
  await expect(boton).toBeVisible({ timeout: 15_000 });
  // **La tarjeta no es una `region`**: es el `div` que encabeza «Monedas», y se localiza por su
  // encabezado en vez de por un rol que no tiene.
  const tarjeta = page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name: "Monedas" }) })
    .last();

  const cajaBoton = (await boton.boundingBox())!;
  const cajaTarjeta = (await tarjeta.boundingBox())!;
  expect(cajaBoton.x + cajaBoton.width).toBeLessThanOrEqual(cajaTarjeta.x + cajaTarjeta.width);
});
