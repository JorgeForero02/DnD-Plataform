import { test, expect, type Page } from "@playwright/test";

// **Capturas para comparar contra el prototipo.** No es una prueba: no afirma nada, solo
// fotografía las pantallas para poder ponerlas al lado de las de la maqueta. Se conserva porque
// volver a montar una campaña con contenido a mano cada vez que hay que comparar cuesta más que
// tenerlo escrito.
//
// **Corre con la suite entera**, y es a propósito: cuesta veinte segundos y garantiza que el
// guion de capturas sigue funcionando el día que haga falta comparar. Para lanzarla sola:
// `SALIDA_CAPTURAS=<carpeta> pnpm --filter @dnd/web exec playwright test e2e/capturas-comparacion.spec.ts`.
//
// Aquí ponía «se salta en la suite normal» y era falso: no hay ningún `test.skip` en este
// fichero. Lo encontró una auditoría.
//
// **Ficha M2B-13: escribe a una carpeta ignorada, no a la seguida por git.** Hasta el 2026-09-03
// el destino por defecto era `capturas/`, que está en el repositorio, así que **cada corrida de
// la suite dejaba nueve binarios modificados** —otra cuenta, otras horas, otros
// identificadores— que no significan nada y que hay que limpiar antes de cada commit. Peor que
// el ruido era la salida fácil: limpiarlos con `git checkout` sobre un árbol con trabajo sin
// commitear, que es el comando que este proyecto prohíbe.
//
// Así que el destino por defecto es **`capturas-salida/`, ignorada**, y el juego de referencia
// de `capturas/` —el que se comparó con el prototipo— solo se reescribe **a propósito**:
// `SALIDA_CAPTURAS=capturas`. Una foto de referencia se actualiza cuando alguien lo decide, no
// como efecto colateral de correr las pruebas.

const SALIDA = process.env.SALIDA_CAPTURAS ?? "capturas-salida";

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `cap-${marca}@example.com`,
    password: "password123",
    displayName: `Capturas ${marca}`,
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

// **El tema oscuro se fuerza.** Playwright abre con `prefers-color-scheme: light`, así que sin
// esto se capturaba la piel de lectura y se comparaba con el prototipo, que va en oscuro: la
// comparación decía «todo es beige» y era culpa del fotógrafo, no de la pantalla.
test.use({ colorScheme: "dark" });

test("capturas: las pantallas nuestras, para comparar con el prototipo", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 1200 });
  await registrarse(page);
  // **Sin campañas todavía**: esto retrata el estado vacío, que también hay que mirar. La lista
  // con tarjetas se fotografía más abajo, después de crear una — la primera versión de este
  // guion solo sacaba el vacío, así que la tarjeta rediseñada no salía en ninguna captura.
  await page.screenshot({ path: `${SALIDA}/n00-mis-campanas-vacio.png`, fullPage: true });

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("Las Mareas de Sarnath");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "Las Mareas de Sarnath" }).click();
  await expect(page.getByRole("heading", { name: "Las Mareas de Sarnath" })).toBeVisible();
  await page.screenshot({ path: `${SALIDA}/n02-resumen-campana.png`, fullPage: true });

  // Y ahora sí, la lista **con** una campaña dentro.
  // El logotipo de la cabecera lleva `aria-label="Ir a mis campañas"`, así que un
  // `getByRole("link", { name: "Tus crónicas" })` casa con dos: se usa la miga de pan.
  await page.getByRole("link", { name: "Tus crónicas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();
  await page.screenshot({ path: `${SALIDA}/n01-mis-campanas.png`, fullPage: true });
  await page.getByRole("link", { name: "Las Mareas de Sarnath" }).click();
  await expect(page.getByRole("heading", { name: "Las Mareas de Sarnath" })).toBeVisible();

  // Un par de fichas del mundo, para que la lista tenga algo que enseñar.
  await page.getByRole("tab", { name: "PNJ" }).click();
  for (const [nombre, cuerpo] of [
    ["Maestre Kellan", "Miente sobre el registro del almacén cuatro."],
    ["Marta la del muelle", "Vio salir el humo antes que nadie."],
  ]) {
    await page.getByRole("button", { name: "Nuevo PNJ" }).click();
    await page.getByLabel("Nombre").fill(nombre);
    const cuadro = page.getByRole("textbox").filter({ hasNotText: "" }).last();
    await cuadro.fill(cuerpo);
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  }
  await page.screenshot({ path: `${SALIDA}/n03-lista-del-mundo.png`, fullPage: true });

  await page.getByRole("link", { name: /Maestre Kellan/ }).click();
  await expect(page.getByRole("heading", { name: "Maestre Kellan" })).toBeVisible();
  await page.screenshot({ path: `${SALIDA}/n04-pagina-de-lectura.png`, fullPage: true });
  await page.goBack();

  // La hoja, que es la que el autor mira primero.
  await page.getByRole("tab", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill("Corvin Vhael");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  await page.getByRole("link", { name: /Corvin Vhael/ }).click();
  await expect(page.getByRole("heading", { name: "Corvin Vhael" })).toBeVisible();

  await page.getByLabel("Raza", { exact: true }).selectOption("human");
  await page.getByLabel("Clase", { exact: true }).selectOption("rogue");
  const nivel = page.getByLabel("Nivel", { exact: true });
  await nivel.fill("5");
  await nivel.blur();
  for (const [nombre, valor] of [
    ["Fuerza", "16"],
    ["Destreza", "14"],
    ["Constitución", "15"],
    ["Inteligencia", "10"],
    ["Sabiduría", "12"],
    ["Carisma", "8"],
  ] as [string, string][]) {
    const campo = page.getByLabel(nombre, { exact: true });
    await campo.fill(valor);
    await campo.blur();
  }
  await expect(page.getByText("Salvaciones", { exact: true })).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: `${SALIDA}/n05-hoja-oscuro.png`, fullPage: true });

  // --- Fase 2B: el inventario con cosas dentro, que es como hay que mirarlo. Vacío se compara
  //     con el prototipo sin decir nada: lo que se juzga es la fila, la marca de procedencia y
  //     cómo conviven las tres zonas.
  const inventario = page.getByRole("region", { name: "inventario" });
  for (const objeto of ["Cota de malla", "Espada larga", "Raciones"]) {
    // El panel se queda abierto entre altas: solo se abre si está cerrado, o el segundo clic
    // caería sobre «Cerrar».
    const abrir = inventario.getByRole("button", { name: /Añadir objeto/ });
    if (await abrir.isVisible().catch(() => false)) await abrir.click();
    await inventario.getByLabel(/Buscar/).fill(objeto);
    await inventario
      .getByRole("button", { name: new RegExp(objeto) })
      .first()
      .click();
    if (objeto !== "Raciones") await inventario.getByRole("radio", { name: /Equipado/ }).check();
    await inventario.getByRole("button", { name: "Añadir", exact: true }).click();
    await expect(inventario.getByText(objeto).first()).toBeVisible({ timeout: 15_000 });
  }
  await inventario.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SALIDA}/n08-inventario.png`, fullPage: true });

  // El catálogo de objetos de la campaña, con su marca de procedencia.
  await page.goBack();
  await page.getByRole("tab", { name: "Catálogo" }).click();
  // El catálogo pide dos fuentes —el SRD y los objetos de la campaña— y no pinta nada hasta
  // tener las dos; se espera a que aparezca una fila del SRD, no al título.
  await expect(page.getByText("Espada larga").first()).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: `${SALIDA}/n09-catalogo-de-objetos.png`, fullPage: true });

  // El editor de reglas. **Sin `goBack()`**: el bloque del catálogo ya dejó la vista en la
  // campaña, y volver otra vez atrás caía en la hoja de personaje.
  await page.getByRole("tab", { name: "Reglas" }).click();
  await page.getByRole("button", { name: "Nueva regla" }).click();
  await expect(page.getByRole("heading", { name: "Nueva regla" })).toBeVisible();
  await page.screenshot({ path: `${SALIDA}/n07-editor-de-reglas.png`, fullPage: true });
});
