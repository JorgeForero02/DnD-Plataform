import { test, expect, type Page } from "@playwright/test";

// Fase 2D — **el bestiario, en el navegador.**
//
// Lo que se mide aquí y no se puede medir en otro sitio:
//
//  · Que **la rejilla de fichas no arrastra la página a lo ancho**. `jsdom` no maqueta, así que
//    la suite de RTL entera puede estar en verde con un borde partido o una tarjeta desbordada —
//    ya pasó una vez en este proyecto y por eso esta comprobación es regla.
//  · Que los tres números grandes **caben en una línea** y no se apilan uno por fila, que es la
//    diferencia entre «leerlo de un vistazo en mitad de un turno» y no.
//  · Que la ficha **tiene borde de verdad**, pintado y no declarado con una clase inventada. Los
//    tokens de este proyecto no incluyen `border-line`, y una clase que no existe compila a nada
//    sin avisar.
//  · Que bajar una criatura a la mesa funciona de punta a punta contra el servidor real.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `bestia-${marca}@example.com`,
    password: "password123",
    displayName: `Bestia ${marca}`,
  };
}

async function abrirBestiario(page: Page) {
  const cuenta = nuevaCuenta();
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Mis campañas" })).toBeVisible();

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La cripta de Sarnath");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La cripta de Sarnath" }).click();
  await page.getByRole("tab", { name: "Bestiario" }).click();
  await expect(page.getByRole("heading", { name: "Bestiario" })).toBeVisible();
}

test("las quince criaturas del libro llegan, con sus números", async ({ page }) => {
  await abrirBestiario(page);
  await expect(page.getByTestId("ficha-de-criatura")).toHaveCount(15);
  const goblin = page.getByTestId("ficha-de-criatura").filter({ hasText: "Goblin" }).first();
  await expect(goblin).toContainText("15"); // CA
  await expect(goblin).toContainText("1/4"); // VD en fracción, no 0.25
  await expect(goblin).toContainText("Pequeño humanoide");
});

test("**ningún valor de enumeración llega a la pantalla**", async ({ page }) => {
  await abrirBestiario(page);
  await expect(page.getByTestId("ficha-de-criatura").first()).toBeVisible();
  // **Sin pasar a mayúsculas**: «Humanoide».toUpperCase() es «HUMANOIDE», que contiene
  // «HUMANOID», así que la comprobación se acusaba a sí misma y fallaba sobre una pantalla
  // correcta. Los valores de enumeración ya vienen en mayúsculas por definición, y eso es
  // justamente lo que permite reconocerlos.
  const texto = await page.locator("main").innerText();
  for (const enumeracion of [
    "HUMANOID",
    "MONSTROSITY",
    "UNDEAD",
    "GARGANTUAN",
    "SRD:",
    "CAMPAIGN:",
  ]) {
    expect(texto).not.toContain(enumeracion);
  }
});

test("**la velocidad va en pies**, no en metros como el prototipo", async ({ page }) => {
  await abrirBestiario(page);
  const goblin = page.getByTestId("ficha-de-criatura").filter({ hasText: "Goblin" }).first();
  // El dato ESTRUCTURADO va en pies, que es la unidad del resto de la aplicación.
  await expect(goblin).toContainText("Vel");
  await expect(goblin).toContainText("30");
  await expect(goblin).toContainText("pies");
});

test("la prosa citada sigue en metros, y eso está declarado, no escondido", async ({ page }) => {
  await abrirBestiario(page);
  const goblin = page.getByTestId("ficha-de-criatura").filter({ hasText: "Goblin" }).first();
  // **Esto lo encontró esta misma prueba al escribirla**, y no es un fallo: la prosa de las
  // acciones es una cita literal del «Documento de referencia del sistema 5.1» en español, que
  // mide en metros («alcance 1,5 m»). Alterar los números de dentro de una cita es donde se
  // rompe una traducción, así que se deja — y se declara en `docs/06-pendientes.md`.
  //
  // La prueba existe para que el día que alguien decida convertirlas esto se ponga rojo y la
  // decisión se tome a la vista, en vez de descubrirse en la mesa.
  await expect(goblin).toContainText("alcance 1,5 m");
});

test("**la rejilla no arrastra la página a lo ancho**", async ({ page }) => {
  await abrirBestiario(page);
  await expect(page.getByTestId("ficha-de-criatura").first()).toBeVisible();
  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(desborde).toBeLessThanOrEqual(1);
});

test("**los cuatro números caben en una línea**, que es lo que los hace de un vistazo", async ({
  page,
}) => {
  await abrirBestiario(page);
  const ficha = page.getByTestId("ficha-de-criatura").first();
  await expect(ficha).toBeVisible();
  // Se miden las cajas de verdad: si CA, PG, Vel y VD se apilaran, sus `top` serían distintos.
  const tops = await ficha.evaluate((el) => {
    const rotulos = Array.from(el.querySelectorAll("div")).filter((d) =>
      ["CA", "PG", "Vel", "VD"].includes((d.textContent ?? "").trim()),
    );
    return rotulos.map((d) => Math.round(d.getBoundingClientRect().top));
  });
  expect(tops).toHaveLength(4);
  expect(new Set(tops).size).toBe(1);
});

test("**la ficha tiene borde pintado**, no una clase que no existe", async ({ page }) => {
  await abrirBestiario(page);
  const ficha = page.getByTestId("ficha-de-criatura").first();
  const borde = await ficha.evaluate((el) => {
    // **Se compara contra el token resuelto, no contra «no transparente».** La primera versión
    // de esta prueba solo exigía ancho > 0 y color distinto de transparente, y una mutación
    // deliberada la sobrevivió: cambiar `border-muted` por `border-line` —una clase que NO
    // existe en la paleta— deja igualmente el `border` de 1px de Tailwind con SU color por
    // defecto. O sea, la prueba prometía cazar la clase inventada y no la cazaba. Ahora sí:
    // el borde tiene que ser exactamente el token, y cualquier otro color lo delata.
    const sonda = document.createElement("div");
    sonda.style.color = "var(--muted)";
    el.appendChild(sonda);
    const esperado = getComputedStyle(sonda).color;
    sonda.remove();
    const cs = getComputedStyle(el);
    return { ancho: cs.borderTopWidth, color: cs.borderTopColor, esperado };
  });
  expect(parseFloat(borde.ancho)).toBeGreaterThan(0);
  expect(borde.color).toBe(borde.esperado);
});

test("bajar una criatura a la mesa, de punta a punta, y avisa de que solo la ve el DM", async ({
  page,
}) => {
  await abrirBestiario(page);
  await page.getByPlaceholder("Buscar una criatura").fill("Ogro");
  const ogro = page.getByTestId("ficha-de-criatura").first();
  await expect(ogro).toContainText("Ogro");
  // Los PG del libro: 59.
  await expect(ogro).toContainText("59");

  await ogro.getByRole("button", { name: /Bajar a la mesa/i }).click();
  await expect(page.getByRole("status")).toContainText(/solo lo ves tú/i);
  await expect(page.getByTestId("pnj-en-la-mesa")).toContainText("Ogro");
  await expect(page.getByTestId("pnj-en-la-mesa")).toContainText("59 PG");
});

test("el botón dice lo que hace, y no promete un combate que no existe", async ({ page }) => {
  await abrirBestiario(page);
  await expect(page.getByRole("button", { name: /Bajar a la mesa/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Meter al combate/i })).toHaveCount(0);
});
