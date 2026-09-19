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

/** Registrarse a secas, sin campaña — lo que necesita la prueba de «PG temporales…», que crea la
 *  suya propia con otro nombre. */
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

async function abrirBestiario(page: Page) {
  await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La cripta de Sarnath");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La cripta de Sarnath" }).click();
  await page.getByRole("button", { name: "Bestiario" }).click();
  // **El cajón, no «un encabezado que ponga Bestiario».** Hay DOS: el título del `Dialog` y el
  // que el propio panel pinta en su cabecera, y cuál de los dos está montado depende de en qué
  // punto de la animación mire Playwright — por eso este ayudante pasaba en unas pruebas y en
  // otras moría con «strict mode violation: resolved to 2 elements», sin que nadie tocara el
  // bestiario. `Dialog` pone `aria-labelledby` en su título, así que el cajón tiene nombre
  // accesible propio y **eso no es ambiguo**.
  await expect(page.getByRole("dialog", { name: "Bestiario" })).toBeVisible();
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

test("**la fila de acciones de una plantilla no se sale de la tarjeta a 430 px** (2026-09-14, captura del autor)", async ({
  page,
}) => {
  // La tarjeta de «Sacar criatura» se abre dentro de un cajón de la mesa, así que su ancho útil
  // ronda los 430 px. Con «¿De qué ficha del mundo es?» en la misma fila que Bajar/Editar/Borrar,
  // «Bajar a la mesa» se partía en tres líneas y «Borrar» quedaba cortado por el borde derecho.
  await page.setViewportSize({ width: 430, height: 900 });
  await abrirBestiario(page);
  const ficha = page.getByTestId("ficha-de-criatura").first();
  await expect(ficha).toBeVisible();
  const caja = await ficha.boundingBox();
  const bajar = ficha.getByRole("button", { name: "Bajar a la mesa" });
  const cajaBajar = await bajar.boundingBox();
  // Un botón de una sola línea: su alto es el de una línea de texto con relleno, no tres.
  expect(cajaBajar!.height).toBeLessThan(48);
  for (const nombre of ["Bajar a la mesa", "¿De qué ficha del mundo es?"]) {
    const b = await ficha.getByRole("button", { name: nombre }).boundingBox();
    expect(b!.x + b!.width).toBeLessThanOrEqual(caja!.x + caja!.width + 1);
  }
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

// Tarea 9 (plan 2026-09-19) — **«PG temporales…» se mudó del bestiario al menú «…» de un
// combatiente** (`MandosDeCombatiente.tsx`), el mismo sitio que ya lleva «Dar…»: era el único
// gesto de la lista «En la mesa» que no pasaba por ahí, y era solo de PNJ cuando el formulario
// (`DarTemporales`) nunca lo fue. Un PNJ solo aparece en el elenco mientras combate (encuentro
// en marcha), así que esta prueba lo mide sobre un personaje de la mesa — la misma puerta que
// `e2e/dar-a-un-pnj.spec.ts` usa para «Dar…» — y no sobre el Ogro del bestiario.
//
// Anexo #20 — la pregunta del SRD solo sale al pulsar «Dárselos», y «Dejar los que tenía» no
// manda ninguna petición: conservar es no cambiar nada (SRD 5.1, Temporary Hit Points).
test("un combatiente con 5 PG temporales: Dárselos con 3 abre la pregunta; «Dejar los 5 que tenía» la cierra; «Quedarse con los 3 nuevos» deja 3, y la hoja lo enseña aparte", async ({
  page,
}) => {
  const cuenta = await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La mesa de los temporales");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La mesa de los temporales" }).click();
  await expect(page.getByRole("heading", { name: "La mesa de los temporales" })).toBeVisible();

  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill("Borin Barbaférrea");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  // **Hace falta una hoja completa, no solo el nombre.** `setHp` (donde aterriza «Dárselos») la
  // exige para derivar los puntos de golpe — un personaje a medias no tiene «puntos de golpe en
  // la hoja» todavía, y el servidor rechaza con «Faltan datos para calcular la hoja». Se
  // completa aquí, en su propia página, antes de volver a la mesa.
  await page.getByRole("link", { name: /Borin Barbaférrea/ }).click();
  await expect(page.getByRole("heading", { name: "Borin Barbaférrea" })).toBeVisible();
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
  ] as const) {
    const campo = page.getByLabel(nombre, { exact: true });
    await campo.fill(valor);
    // Salir del campo ES el guardado (mismo patrón que `hoja.spec.ts`).
    await campo.blur();
  }
  await expect(page.getByText("Salvaciones", { exact: true })).toBeVisible({ timeout: 15_000 });

  const ruta = new URL(page.url()).pathname;
  const [, campaignId] = ruta.match(/\/campaigns\/([^/]+)\/personajes\//)!;
  await page.goto(`/campaigns/${campaignId}`);
  await expect(page.getByRole("heading", { name: "La mesa de los temporales" })).toBeVisible();

  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Nueva sesión" }).click();
  await page.getByLabel("Título").fill("El puerto en llamas");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByLabel(cuenta.displayName).check();
  await page
    .getByLabel(`Personaje de ${cuenta.displayName}`)
    .selectOption({ label: "Borin Barbaférrea" });
  await page.getByRole("button", { name: "Empezar la sesión" }).click();

  const barra = page.getByRole("status", { name: "Sesión en curso" });
  await expect(barra).toBeVisible({ timeout: 10_000 });
  await barra.getByRole("link", { name: "Ir a la mesa" }).click();

  const elenco = page.getByRole("region", { name: "En la mesa" });
  await expect(elenco.getByText("Borin Barbaférrea").first()).toBeVisible({ timeout: 15_000 });

  await elenco.getByRole("button", { name: "Más acciones sobre Borin Barbaférrea" }).click();
  await page.getByRole("menuitem", { name: "PG temporales…" }).click();

  const cajon = page.getByRole("dialog", { name: "PG temporales · Borin Barbaférrea" });
  await expect(cajon).toBeVisible();

  // Sin temporales previos, «Dárselos» no pregunta nada.
  await cajon.getByLabel("PG temporales").fill("5");
  await cajon.getByRole("button", { name: "Dárselos" }).click();
  await expect(cajon.getByRole("alertdialog")).toHaveCount(0);

  // Con 3 nuevos y 5 previos, «Dárselos» abre la pregunta del SRD.
  await cajon.getByLabel("PG temporales").fill("3");
  await cajon.getByRole("button", { name: "Dárselos" }).click();
  const pregunta = cajon.getByRole("alertdialog", { name: "Ya tiene PG temporales" });
  await expect(pregunta).toBeVisible();
  await expect(pregunta).toContainText("ya tiene 5");

  // «Dejar los 5 que tenía» no manda nada: la pregunta se cierra sin más.
  await pregunta.getByRole("button", { name: "Dejar los 5 que tenía" }).click();
  await expect(pregunta).toBeHidden();

  // Repetir con los mismos 3, y esta vez quedarse con los nuevos.
  await cajon.getByRole("button", { name: "Dárselos" }).click();
  await cajon.getByRole("button", { name: "Quedarse con los 3 nuevos" }).click();
  await expect(cajon.getByRole("alertdialog")).toBeHidden();
  await page.getByRole("button", { name: "Cerrar (Escape)" }).click();

  // Y donde de verdad se lee lo que quedó: la hoja pinta los temporales aparte de los actuales
  // (`PuntosDeGolpe.tsx`), nunca sumados.
  await elenco.getByRole("button", { name: "Más acciones sobre Borin Barbaférrea" }).click();
  await page.getByRole("menuitem", { name: "Su hoja" }).click();
  await expect(page.getByRole("dialog", { name: "Su hoja" })).toContainText("+3 temporales");
});

test("el botón dice lo que hace, y no promete un combate que no existe", async ({ page }) => {
  await abrirBestiario(page);
  await expect(page.getByRole("button", { name: /Bajar a la mesa/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Meter al combate/i })).toHaveCount(0);
});

// Tarea 25 (cerrar fichas, tanda 2026-09-11) — **`OWNER_DM` vuelve a ofrecerse y a guardarse.**
// `statblocks.service.ts` mandaba `createdById: ""` a `canView`, así que el nivel se retiró de
// esta pantalla en la Ola 2. Ahora que el servidor compara con el creador real, «DM y creador»
// vuelve a la lista y elegirlo tiene que guardar de verdad contra la API.
test("escribir una criatura con «DM y creador», y que se guarde así", async ({ page }) => {
  await abrirBestiario(page);
  await page.getByRole("button", { name: "Escribir una criatura" }).click();
  await expect(page.getByRole("heading", { name: "Escribir una criatura" })).toBeVisible();

  await page.getByLabel("Cómo se llama").fill("Espíritu del pantano");
  // El nivel ya no está retirado: se ofrece con su frase, no solo con el nombre del enum.
  await expect(page.getByText("Tú y quien lo creó")).toBeVisible();
  await page.getByRole("radio", { name: /DM y creador/ }).check();
  await page.getByRole("button", { name: "Guardar la criatura" }).click();

  await expect(page.getByRole("heading", { name: "Escribir una criatura" })).toBeHidden();
  await page.getByPlaceholder("Buscar una criatura").fill("Espíritu del pantano");
  const ficha = page.getByTestId("ficha-de-criatura").filter({ hasText: "Espíritu del pantano" });
  await ficha.getByRole("button", { name: "Editar" }).click();
  await expect(page.getByRole("heading", { name: /Editar Espíritu del pantano/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /DM y creador/ })).toBeChecked();
});
