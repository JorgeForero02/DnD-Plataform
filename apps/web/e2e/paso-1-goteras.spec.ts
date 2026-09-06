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

// --- Tareas 11 y 12 · lo que NO está aquí, y por qué -----------------------------------------
//
// **Las dos pruebas de navegador de estas tareas se midieron y NO se commitean, porque
// parpadean.** Una prueba que da verde y rojo en dos pasadas seguidas sobre el mismo código no
// defiende nada y envenena la suite; dejarla dentro sería peor que no tenerla.
//
// Lo que se midió, para que el siguiente no empiece de cero:
//
// - **Dos dagas (tarea 11).** El recorrido llega hasta el final: se añaden las dos, se abre el
//   selector de mano y se pulsa. Falla al marcar el radio o al confirmar, con «element was
//   detached from the DOM» o esperando estabilidad: **la fila se remonta al equipar** —la lista se
//   invalida y el objeto salta de «Encima» a «Equipado»— y el chooser se va con ella. Acotar la
//   fila a la que todavía tiene «Equipar» arregló una mitad y no la otra. Su ayudante para añadir
//   objetos se fue con la prueba: `inventario.spec.ts` tiene uno equivalente, y dejar aquí uno sin
//   usar habría sido decoración.
// - **Cambiar quién ve una criatura (tarea 12).** Pasó en una pasada y falló en la siguiente,
//   siempre en la última aserción: al reabrir el editor el radio vuelve sin marcar. **El servidor
//   NO es el problema**, y eso sí está probado: `apps/api/test/statblocks.e2e-spec.ts` comprueba
//   que el `PUT` guarda el nivel nuevo y que releer la lista lo devuelve.
//
// Queda ficha en `docs/06-pendientes.md` con lo que se descartó antes de abrirla.

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
