import { test, expect, type Page } from "@playwright/test";

// Tarea 2A.17 — la pantalla del motor de reglas, contra la API real (Docker + Postgres).
//
// Actualizado en R1: la regla ya no se escribe en tres desplegables, sino colocando cajas en
// tres carriles fijos. Este recorrido usa la ruta que **no** necesita ratón —pulsar la pieza de
// la paleta—; el gesto de arrastrar de verdad, y la forma de cada pieza, se miden en
// `reglas-arrastrar.spec.ts`.
//
// Cubre el viaje que ninguna prueba de componente puede cubrir: el DM escribe una regla entera
// (CUANDO / SI / ENTONCES) contra las fichas reales de su campaña, la desarma y la vuelve a
// armar con `PATCH` de verdad, hace un ensayo en seco contra el motor real, y comprueba en la
// traza que **el ensayo no dejó rastro**, que es exactamente la propiedad que lo distingue de
// un disparo.
//
// La pestaña se llama "Reglas": la engancha el orquestador en `CampaignDetailPage.tsx`, fuera
// de la frontera de ficheros de esta tarea.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `reglas-${marca}@example.com`,
    password: "password123",
    displayName: `Reglas ${marca}`,
  };
}

async function registrarse(page: Page) {
  const cuenta = nuevaCuenta();
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Mis campañas" })).toBeVisible();
  return cuenta;
}

test("el DM escribe una regla, la arma, la ensaya en seco, y el ensayo no deja traza", async ({
  page,
}) => {
  await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).click();
  await page.getByLabel("Nombre").fill("El motor de la mesa");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "El motor de la mesa" }).click();
  await expect(page.getByRole("heading", { name: "El motor de la mesa" })).toBeVisible();

  // Una regla fija el identificador de la ficha al armarse, así que hace falta una ficha real
  // en la campaña antes de poder escribir el efecto.
  await page.getByRole("tab", { name: "PNJ" }).click();
  await page.getByRole("button", { name: "Nuevo PNJ" }).click();
  await page.getByLabel("Nombre").fill("El heraldo de la puerta");
  await page.getByRole("radio", { name: /Solo DM/ }).check();
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  // --- La pantalla de reglas ---
  await page.getByRole("tab", { name: "Reglas" }).click();
  await expect(page.getByText("Esta campaña no tiene reglas todavía")).toBeVisible();

  await page.getByRole("button", { name: "Nueva regla" }).click();
  await expect(page.getByRole("heading", { name: "Nueva regla" })).toBeVisible();

  await page.getByLabel("Nombre de la regla").fill("Al empezar, se revela el heraldo");

  // Tarea R1 — los tres carriles arrancan vacíos y cada uno dice qué pide. Antes de R1 el
  // editor abría con un suceso y un efecto ya elegidos que nadie había elegido.
  const carrilCuando = page.getByRole("region", { name: "Carril Cuando" });
  await expect(carrilCuando).toContainText("Arrastra aquí el suceso que despierta la regla");

  // Se colocan las tres cajas pulsando su pieza de la paleta — la ruta que no necesita ratón.
  await page
    .getByRole("button", { name: "Empieza una sesión — poner en el carril Cuando" })
    .click();
  await page
    .getByRole("button", { name: "Esta regla no se ha disparado nunca — poner en el carril Si" })
    .click();
  await page
    .getByRole("button", { name: "Revelar una entrada del mundo — poner en el carril Entonces" })
    .click();

  // R4: la caja dice de qué parte es, y de cuál no. En la pantalla, no en una ayuda.
  await expect(carrilCuando).toContainText("Es un suceso.");
  await expect(carrilCuando).toContainText("Ocurrió algo.");
  await expect(page.getByRole("region", { name: "Carril Si" })).toContainText("Es un estado.");

  await page.getByLabel("Qué entrada del mundo").selectOption({ label: "El heraldo de la puerta" });
  await page
    .getByRole("radio", { name: /Jugadores/ })
    .first()
    .check();

  // El modo es una elección con significado: radios con su explicación, no un desplegable.
  await expect(page.getByRole("radio", { name: /Automática/ })).toBeChecked();
  await expect(
    page.getByText(/te llega a «Propuestas» y decides tú si se aplica o se rechaza/),
  ).toBeVisible();

  await page.getByRole("button", { name: "Guardar regla" }).click();
  await expect(page.getByRole("heading", { name: "Nueva regla" })).toBeHidden();

  // La regla aparece en la lista, armada por defecto y contando cero disparos.
  const fila = page.locator("li", { hasText: "Al empezar, se revela el heraldo" }).first();
  await expect(fila).toBeVisible();
  await expect(fila).toContainText("Armada");
  await expect(fila).toContainText("0 disparos");
  await expect(fila).toContainText("Empieza una sesión");
  // Ningún valor del enum llega a la pantalla.
  await expect(fila).not.toContainText("ARMED");
  await expect(fila).not.toContainText("SESSION_STARTED");
  await expect(fila).not.toContainText("REVEAL_ENTITY");

  // --- Desarmar y volver a armar, con PATCH real contra la API ---
  await fila.getByRole("button", { name: "Desarmar" }).click();
  await expect(fila).toContainText("Desarmada");
  await fila.getByRole("button", { name: "Armar" }).click();
  await expect(fila).toContainText("Armada");

  // --- El ensayo en seco ---
  await fila.getByRole("button", { name: "Ensayo en seco" }).click();
  await expect(
    page.getByRole("heading", { name: /Ensayo en seco de «Al empezar, se revela el heraldo»/ }),
  ).toBeVisible();
  // Se presenta como lo que es antes de que nadie pulse nada.
  await expect(page.getByText("Es una simulación.")).toBeVisible();

  await page.getByRole("button", { name: "Simular" }).click();
  const resultado = page.getByRole("region", { name: "Resultado de la simulación" });
  await expect(resultado).toBeVisible();
  // El motor real dice que se aplicaría, y lo dice en español.
  await expect(resultado).toContainText("Se aplicaría");
  await expect(resultado).toContainText("El heraldo de la puerta");
  await expect(resultado).not.toContainText("APPLIED");

  await page.getByRole("button", { name: "Cerrar" }).click();

  // El ensayo no cuenta como disparo: el contador sigue en cero.
  await expect(fila).toContainText("0 disparos");

  // --- La traza: el ensayo no dejó rastro, que es justo lo que lo distingue de un disparo ---
  await page.getByRole("tab", { name: "Traza" }).click();
  await expect(page.getByText("Todavía no se ha disparado nada")).toBeVisible();

  // --- Y la bandeja de propuestas está vacía, con su explicación ---
  await page.getByRole("tab", { name: "Propuestas" }).click();
  await expect(page.getByText("Nada esperando tu decisión")).toBeVisible();
});
