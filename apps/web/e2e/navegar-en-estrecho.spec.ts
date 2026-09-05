import { test, expect, type Page } from "@playwright/test";

// Plan 14, punto 14.3 — **volver a medir U2 antes de arreglarla.**
//
// La ficha dice: *«la columna de secciones desaparece por debajo de 768 px y nada la sustituye; en
// móvil se llega a una sección por URL pero no se puede navegar a ella»*.
//
// **Ese dato es de antes del reseño.** La navegación cambió entera —de diecinueve destinos a seis—
// y la columna de secciones que la ficha describe ya no existe como tal. El plan es explícito:
// *«vuelve a medirlo; puede que el problema sea otro»*. Así que esto **no arregla nada**: mide, en
// un navegador de verdad y a 375 px, si desde la pantalla de una campaña se puede **llegar a cada
// destino sin escribir una URL**.
//
// `jsdom` no puede: no maqueta, así que no sabe qué se esconde bajo un punto de ruptura.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `estrecho-${marca}@example.com`,
    password: "password123",
    displayName: `Estrecho ${marca}`,
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

test("U2 remedida — a 375 px se llega a todos los destinos de la campaña sin escribir una URL", async ({
  page,
}) => {
  test.setTimeout(120_000);
  // Un móvil de los estrechos. Si algo sobrevive aquí, sobrevive en todo lo demás.
  await page.setViewportSize({ width: 375, height: 720 });

  await registrarse(page);
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La mesa estrecha");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La mesa estrecha" }).click();
  await expect(page.getByRole("heading", { name: "La mesa estrecha" })).toBeVisible();

  // Los destinos que la navegación de la campaña ofrece hoy. La lista sale del DOM y no de una
  // copia escrita aquí: si mañana se añade uno, esta prueba lo mide solo.
  const pestañas = page.getByRole("tab");
  const cuantas = await pestañas.count();

  // **Lo que la ficha decía que no pasaba**: que haya navegación visible en estrecho.
  expect(cuantas, "no hay ningún destino alcanzable a 375 px").toBeGreaterThan(0);

  // Y que cada uno **se pueda pulsar de verdad**: visible, dentro de la ventana y con tamaño.
  // Se recorre **por posición y no por nombre**: el rótulo lleva su contador pegado —«El mundo0»—
  // y buscar por texto mediría el contador, no la navegación.
  const anchoVentana = await page.evaluate(() => window.innerWidth);
  const nombres: string[] = [];
  for (let i = 0; i < cuantas; i += 1) {
    const destino = pestañas.nth(i);
    const rotulo = (await destino.textContent())?.trim() ?? `#${i}`;
    nombres.push(rotulo);
    await expect(destino, `«${rotulo}» no se ve a 375 px`).toBeVisible();
    const caja = (await destino.boundingBox())!;
    // Un destino que empieza fuera de la ventana **no se puede pulsar**, aunque Playwright lo dé
    // por visible: es exactamente el fallo que la ficha describe con otras palabras.
    expect(caja.x, `«${rotulo}» empieza fuera de la ventana`).toBeLessThan(anchoVentana);
    expect(caja.width, `«${rotulo}» no ocupa nada`).toBeGreaterThan(8);
  }

  // Y una navegación de verdad, no solo que el control esté: se pulsa uno y la pantalla cambia.
  await page.getByRole("tab", { name: "El mundo" }).click();
  await expect(page.getByRole("button", { name: /^PNJ/ })).toBeVisible();

  // eslint-disable-next-line no-console
  console.log(
    `\n=== U2 remedida (2026-09-06), 375 px ===\n` +
      `  destinos alcanzables sin URL: ${nombres.length} — ${nombres.join(" · ")}\n`,
  );
});
