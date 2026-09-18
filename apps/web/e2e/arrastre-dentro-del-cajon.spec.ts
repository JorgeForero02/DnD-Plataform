import { test, expect, type Page } from "@playwright/test";

// Plan 14, punto 14.1 — **volver a medir R1, que es lo primero del plan y va antes de tocar nada.**
//
// ## Qué se está midiendo, y por qué de esta forma exacta
//
// La ficha R1 dice que el editor de reglas **no arrastra dentro de un superpuesto**, y el dato que
// lo sostenía era este: *«un `<div draggable>` trivial inyectado DENTRO del diálogo tampoco
// arrastra, y uno inyectado FUERA sí — así que es del contexto, no de la pieza»*.
//
// **Ese contexto ya no existe.** La Ola 0 convirtió `Dialog` de cuadro centrado con `max-h-[85vh]`
// a **cajón lateral de altura completa**, que es justo la variable que aquella medición culpaba. Es
// la decisión D-OP-19, que dejó escrito que R1 se remide cuando el carril gráfico reemplazara el
// diálogo.
//
// Por eso esta prueba **repite el experimento original**, no uno parecido: el mismo `<div
// draggable>` trivial, dentro y fuera, y se comparan. Si el de dentro dispara `dragstart`, el
// diagnóstico de R1 **está caducado** y con él la desviación **C3-4** —«Bloques de reglas abre
// lectura y no el editor con arrastre»—, que existe *porque* aquella medición decía lo que decía.
//
// **El resultado se escribe gane o pierda**, con su fecha, que es lo que el plan pide.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `cajon-${marca}@example.com`,
    password: "password123",
    displayName: `Cajón ${marca}`,
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
}

/**
 * Inyecta un `<div draggable>` trivial dentro del elemento que se le diga, lo arrastra con el ratón
 * paso a paso —no con `dragTo`, que la medición original ya descartó— y devuelve si `dragstart`
 * llegó a dispararse.
 */
async function arrastraUnDivTrivialDentroDe(page: Page, selector: string): Promise<boolean> {
  await page.evaluate((sel) => {
    const anfitrion = document.querySelector(sel);
    if (!anfitrion) throw new Error(`no existe ${sel}`);
    const caja = document.createElement("div");
    caja.id = "sonda-de-arrastre";
    caja.setAttribute("draggable", "true");
    caja.textContent = "sonda";
    // **Posición fija y arriba del todo**, en los dos casos. La primera versión la dejaba fluir al
    // final del `body`, y en la página de campaña eso la mandaba fuera de la vista: el control salió
    // «NO» por geometría, no por contexto — que es exactamente el error que esta prueba investiga.
    // Lo que se compara es el CONTEXTO del DOM, no dónde cae en la maqueta.
    caja.style.cssText =
      "position:fixed;top:120px;left:120px;width:80px;height:40px;background:#888;color:#fff;z-index:99999";
    caja.addEventListener("dragstart", () => {
      (window as unknown as { __arrastro?: boolean }).__arrastro = true;
    });
    anfitrion.appendChild(caja);
    (window as unknown as { __arrastro?: boolean }).__arrastro = false;
  }, selector);

  const sonda = page.locator("#sonda-de-arrastre");
  const caja = (await sonda.boundingBox())!;
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.mouse.down();
  // Varios pasos: un solo salto no siempre cruza el umbral de arrastre del navegador.
  for (let i = 1; i <= 6; i += 1) {
    await page.mouse.move(caja.x + caja.width / 2 + i * 20, caja.y + caja.height / 2 + i * 10);
  }
  await page.mouse.up();

  const arrastro = await page.evaluate(
    () => (window as unknown as { __arrastro?: boolean }).__arrastro === true,
  );
  await page.evaluate(() => document.querySelector("#sonda-de-arrastre")?.remove());
  return arrastro;
}

test("R1 remedida — un `div draggable` trivial DENTRO del cajón nuevo, comparado con uno fuera", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await registrarse(page);
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La mesa que se mide");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La mesa que se mide" }).click();
  await expect(page.getByRole("heading", { name: "La mesa que se mide" })).toBeVisible();

  // --- Paso 0: el control. Fuera de todo superpuesto, el mismo div, para saber que la sonda mide
  //     algo y no está rota. Si esto fallara, el resto no diría nada.
  const fuera = await arrastraUnDivTrivialDentroDe(page, "body");

  // --- Paso 1: DENTRO del cajón nuevo. Se abre uno de verdad —«Consulta del mundo», desde el
  //     rail de la mesa—, que es **el mismo componente `Dialog`** que la Ola 0 convirtió en cajón y
  //     el mismo que monta «Bloques de reglas». Se elige este porque está disponible con la mesa en
  //     reposo: lo que se mide es el CONTEXTO del cajón, no su contenido, así que cuál se abra da
  //     igual mientras sea un `Dialog` de verdad.
  await page.getByRole("link", { name: /^Entrar a la mesa/ }).click();
  // Task 3 (3A.3): la banda única absorbió `CabeceraDeEscena` (`<section aria-label="La
  // escena">` ya no existe); el `<header aria-label="Estado de la mesa">` es ahora la señal de
  // «hemos llegado a la mesa».
  await expect(page.getByRole("banner", { name: "Estado de la mesa" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Paneles de la mesa" })
    .getByRole("button", { name: /Mundo/ })
    .click();
  const cajon = page.getByRole("dialog");
  await expect(cajon).toBeVisible();
  const dentro = await arrastraUnDivTrivialDentroDe(page, '[role="dialog"]');

  // La medición, escrita donde se pueda leer sin abrir una traza.
  // eslint-disable-next-line no-console
  console.log(
    `\n=== R1 remedida (2026-09-06) ===\n` +
      `  dragstart FUERA del cajón: ${fuera ? "SÍ" : "NO"}\n` +
      `  dragstart DENTRO del cajón: ${dentro ? "SÍ" : "NO"}\n`,
  );

  // El control tiene que valer, o la sonda no mide nada.
  expect(fuera, "la sonda no mide: un div draggable fuera de todo tampoco arrastra").toBe(true);

  // **Y esto es el resultado.** Si algún día vuelve a fallar, la frase dice qué significa.
  expect(
    dentro,
    "el `dragstart` no llega dentro del cajón: R1 sigue viva y el sospechoso nuevo es el atrapa-foco del cajón",
  ).toBe(true);
});
