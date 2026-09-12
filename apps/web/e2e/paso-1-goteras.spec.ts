import { test, expect, type Locator, type Page } from "@playwright/test";

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

/**
 * Abre una pestaña de la hoja y espera a que sea la activa. Desde la Tarea 7 (spec 2026-09-11)
 * la hoja son una cabecera fija y siete pestañas, y **solo se monta el contenido de la activa**:
 * cada tarjeta se busca después de abrir la suya. «Números» es la de arranque.
 */
async function abrirPestana(donde: Page | Locator, nombre: string) {
  await donde.getByRole("tab", { name: nombre }).click();
  await expect(donde.getByRole("tab", { name: nombre, selected: true })).toBeVisible();
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

  // La tarjeta de recursos es de la pestaña «Recursos» (Tarea 7, spec 2026-09-11).
  await abrirPestana(page, "Recursos");
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
  // El inventario es la pestaña «Objetos» de la hoja (Tarea 7, spec 2026-09-11). Abrirla dos
  // veces no cierra el selector: la pestaña ya activa no se remonta.
  await abrirPestana(page, "Objetos");
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
  await abrirPestana(page, "Ataques");
  const ataques = page.getByRole("region", { name: /ataques/i });
  await expect(ataques.getByRole("row", { name: /Daga/ })).toHaveCount(2, { timeout: 20_000 });
});

// --- Tarea 12 -----------------------------------------------------------------------------

test("se puede cambiar quién ve una criatura propia ya creada", async ({ page }) => {
  // **El editor solo ofrecía el selector AL CREAR.** Al editar pintaba un párrafo diciendo que el
  // servidor no manda ese dato — y sí lo manda—, así que no había forma de cambiar quién ve una
  // criatura que ya existía. Es la regla vinculante: si el texto explica una regla del servidor y
  // discrepan, miente el texto.
  await registrarse(page);
  await crearCampana(page, "La mesa del bestiario");

  await page.getByRole("button", { name: "Bestiario" }).click();
  await page.getByRole("button", { name: "Escribir una criatura" }).click();
  await page.getByRole("textbox", { name: "Cómo se llama" }).fill("Sabueso de humo");
  await page.getByRole("button", { name: "Guardar la criatura" }).click();

  // **`◐Jugadores` y no `/Jugadores/`, y esto es lo que hacía parpadear la prueba anterior.**
  // El nombre accesible de un radio incluye SU FRASE, y la de «Público» dice literalmente «hoy es
  // lo mismo que «Jugadores»». Así que `/Jugadores/` resolvía **al radio de Público**, se marcaba
  // el equivocado y la aserción final fallaba tres pasos después. Los glifos que abren cada
  // nombre —`○ ◐ ●`— son la excepción declarada para los cinco niveles de visibilidad
  // (`features/sessions/iconos.tsx`), y sirven justo para desambiguar aquí.
  const jugadores = /^[^A-Za-zÁÉÍÓÚ]*Jugadores/;

  await page.getByRole("button", { name: "Editar" }).first().click();
  await expect(page.getByRole("radio", { name: jugadores })).not.toBeChecked();
  await page.getByRole("radio", { name: jugadores }).click();
  // **Esperar a que el cajón se cierre, que es la señal de que el `PUT` volvió.** Sin esto la
  // prueba reabre el editor mientras el guardado sigue en vuelo, lo encuentra con el dato de
  // antes, y el fallo parece «no se guardó» cuando lo que pasó es que se miró demasiado pronto.
  // Es el mismo error que las dos dagas, con otra cara: esperar a un tiempo en vez de a un efecto.
  await page.getByRole("button", { name: "Guardar los cambios" }).click();
  await expect(page.getByRole("heading", { name: /^Editar / })).toBeHidden({ timeout: 15_000 });

  // Y la prueba de verdad: **reabrir y encontrarlo puesto**. El servidor ya se comprueba en
  // `apps/api/test/statblocks.e2e-spec.ts`; lo que aquí se mide es que la pantalla lo lea de vuelta.
  await page.getByRole("button", { name: "Editar" }).first().click();
  await expect(page.getByRole("radio", { name: jugadores })).toBeChecked({ timeout: 15_000 });
});

// --- Un defecto de maquetación ya arreglado, que no debe volver -----------------------------

test("el botón «Aplicar» de la bolsa no se sale de su tarjeta", async ({ page }) => {
  // **Se salía 24,5 px** con tres columnas en `sm:` (celda de 77 px, botón de 70). Es posición y
  // tamaño: `jsdom` no lo ve, y por eso llegó a producción. La medición es con números.
  await registrarse(page);
  await crearCampana(page, "La mesa de la bolsa");
  await crearPersonajeConFicha(page, "Brann Yunque");

  // Las monedas son del inventario, pestaña «Objetos» (Tarea 7, spec 2026-09-11).
  await abrirPestana(page, "Objetos");
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
