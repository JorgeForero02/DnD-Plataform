import { test, expect, type Page } from "@playwright/test";

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

/** Añade un objeto del catálogo del SRD por su nombre, y lo deja en la zona indicada. */
async function anadirObjeto(page: Page, nombre: string, zona: "mochila" | "equipado") {
  const inventario = page.getByRole("region", { name: "inventario" });
  await inventario.getByRole("button", { name: /Añadir objeto/ }).click();
  await inventario.getByLabel(/Buscar/).fill(nombre);
  await inventario
    .getByRole("button", { name: new RegExp(nombre) })
    .first()
    .click();
  if (zona === "equipado") {
    await inventario.getByRole("radio", { name: /Equipado/ }).check();
  }
  await inventario.getByRole("button", { name: "Añadir", exact: true }).click();
}

test("equipar una armadura cambia la CA de la hoja y añade su paso a la traza", async ({
  page,
}) => {
  await registrarse(page);
  await crearPersonajeConFicha(page, "Brann Yunque");

  // La CA antes de tener nada puesto: 10 + Destreza. Se lee del propio DOM, no de un número
  // escrito aquí — si la fórmula cambiara, esta prueba seguiría midiendo lo que importa: que
  // **ponerse la armadura la sube**.
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

  await expect
    .poll(async () => Number((await cifraCa.textContent())!.replace(/\D/g, "")), {
      timeout: 15_000,
    })
    .toBeGreaterThan(caAntes);

  // **El aviso que conecta el gesto con el número.** Es la razón de que el inventario viva
  // dentro de la hoja y no en otra pantalla.
  await expect(page.getByText(/Equipaste/)).toBeVisible();

  // Y la traza gana el paso del objeto: sin esto, la CA sería un número que sube solo.
  await tarjetaCa.getByRole("button").first().click();
  // La fórmula de una línea escribe los pasos en minúscula («16 cota de malla +1 destreza»), así
  // que la comprobación no puede ser sensible a mayúsculas.
  await expect(tarjetaCa.getByText(/cota de malla/i).first()).toBeVisible();
});

test("un arma equipada aparece en el cuadro de ataques, se tira, y la tabla no desborda la página", async ({
  page,
}) => {
  await registrarse(page);
  await crearPersonajeConFicha(page, "Kera Puñoquieto");

  await anadirObjeto(page, "Espada larga", "equipado");

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
});
