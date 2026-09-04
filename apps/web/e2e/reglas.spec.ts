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
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();
  return cuenta;
}

test("el DM escribe una regla, la arma, la ensaya en seco, y el ensayo no deja traza", async ({
  page,
}) => {
  await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
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

  // Tarea F1 — la frase está desde el primer momento, y **dice lo que falta en palabras** en vez
  // de esperar a estar completa. Es justo cuando el DM la necesita.
  const frase = page.getByRole("region", { name: "La regla, leída" });
  await expect(frase).toContainText("Cuando — falta un suceso, entonces — falta una acción.");

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

  // Y la frase ya se puede leer en voz alta, con las tres piezas dentro y en su orden.
  await expect(frase).toContainText(
    "Cuando Empieza una sesión, si Esta regla no se ha disparado nunca, entonces Revelar",
  );
  await expect(frase).not.toContainText("falta");
  // Ningún valor del enum llega a la frase, igual que no llega a la lista.
  await expect(frase).not.toContainText("SESSION_STARTED");
  await expect(frase).not.toContainText("REVEAL_ENTITY");

  await page.getByLabel("Qué entrada del mundo").selectOption({ label: "El heraldo de la puerta" });

  // Elegida la ficha, la frase la nombra: una regla fija su objetivo **al armarse**, así que la
  // frase dice a quién apunta y no «la entrada del suceso».
  await expect(frase).toContainText("Revelar «El heraldo de la puerta»");
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

// --- Tareas F5 y F6 — el aviso que hace el arreglo, y la plantilla que se clona ----------------
//
// Las dos mitades de este recorrido necesitan la API real y por eso no pueden vivir en `jsdom`:
// «Añadir reversión» **crea una regla de verdad** con un `POST`, y la prueba de que funcionó es
// que el aviso desaparece solo —porque el detector deja de encontrar una marca sin quien la
// quite— y que la regla nueva aparece en la lista con su frase. Una prueba con la API simulada
// solo podría comprobar que se llamó a algo.

test("una plantilla se clona, y el aviso de reversión crea la regla que faltaba", async ({
  page,
}) => {
  await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La mesa de las plantillas");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La mesa de las plantillas" }).click();
  await page.getByRole("tab", { name: "Reglas" }).click();

  // --- F6: el estado vacío ofrece reglas ya escritas, no un formulario en blanco ---
  const plantillas = page.getByRole("region", { name: "Plantillas de regla" });
  await expect(plantillas).toBeVisible();
  // Cada plantilla se enseña **dicha**, con las mismas palabras que usará el editor.
  await expect(plantillas).toContainText("Cuando Se pone o se quita una marca");

  await plantillas
    .locator('[data-plantilla="marca-y-aviso"]')
    .getByRole("button", { name: "Usar esta plantilla" })
    .click();

  // Se abre el editor con las cajas ya en sus carriles y **nada guardado**: la lista de reglas
  // sigue vacía por debajo, y lo comprobamos al cancelar más abajo.
  await expect(page.getByRole("region", { name: "Carril Cuando" })).toContainText(
    "Se pone o se quita una marca",
  );
  await expect(page.getByRole("region", { name: "Carril Entonces" })).toContainText("Avisar");

  // --- F6: la guía va pidiendo una cosa cada vez y se cierra sola al hacerla ---
  const guia = page.locator("[data-guia]");
  await expect(guia).toContainText("Falta un dato dentro de una caja");
  await page.getByLabel("Nombre de la marca").fill("combate");
  await page.getByLabel("Mensaje").fill("Empieza el combate.");
  // **Una plantilla clonada llega con su nombre puesto**, así que en cuanto se rellenan los
  // huecos de las cajas la regla ya está completa: la guía se salta el paso del nombre porque no
  // falta. Esta prueba esperaba «Ponle un nombre a la regla» y la guía tenía razón, no ella.
  await expect(page.getByLabel("Nombre de la regla")).not.toHaveValue("");
  await expect(guia).toContainText("La regla ya está completa");
  // Y renombrarla no la descompleta.
  await page.getByLabel("Nombre de la regla").fill("Avisar del combate");
  await expect(guia).toContainText("La regla ya está completa");

  await page.getByRole("button", { name: "Guardar regla" }).click();
  await expect(page.locator("li", { hasText: "Avisar del combate" }).first()).toBeVisible();

  // --- F5: una marca que nadie quita, avisada, con el arreglo al lado ---
  await page.getByRole("button", { name: "Nueva regla" }).click();
  await page.getByLabel("Nombre de la regla").fill("Empieza el combate");
  await page
    .getByRole("button", { name: "Empieza una sesión — poner en el carril Cuando" })
    .click();
  await page
    .getByRole("button", { name: "Poner o quitar una marca — poner en el carril Entonces" })
    .click();

  const avisos = page.getByRole("region", { name: "Avisos sobre esta regla" });
  // Con la marca sin nombrar no hay nada de lo que avisar: el hueco está vacío, no equivocado.
  await expect(avisos).toBeHidden();

  // `getByLabel("Marca")` casa también con las piezas de la paleta, cuyos nombres accesibles
  // llevan la palabra: «Se pone o se quita una marca», «Poner o quitar una marca»… Se pide el
  // campo de texto por su rol.
  await page.getByRole("textbox", { name: "Marca" }).fill("combate");
  await expect(avisos).toContainText("Nadie deshace la marca «combate».");
  // El aviso no impide guardar y no se pinta como un error del servidor.
  await expect(avisos).toContainText("Esto se puede guardar, pero mira antes");

  // El enlace **hace** la regla: un POST real contra la API.
  await page.getByRole("button", { name: "Añadir reversión" }).click();
  // Y la prueba de que la hizo es que el aviso se va solo, porque ya hay quien quita la marca.
  await expect(avisos).toBeHidden();

  await page.getByRole("button", { name: "Guardar regla" }).click();

  // Las tres reglas están en la lista, y la que creó el aviso dice lo que hace.
  await expect(page.locator("li", { hasText: "Empieza el combate" }).first()).toBeVisible();
  const reversion = page
    .locator("li", { hasText: "Quitar la marca «combate» al cerrarse la sesión" })
    .first();
  await expect(reversion).toBeVisible();
  await expect(reversion).toContainText("Se cierra una sesión");
  await expect(reversion).toContainText("Quitar la marca «combate»");
  await expect(reversion).toContainText("Armada");
  // Ningún valor de enumeración llega a la pantalla, tampoco en la regla que creó un aviso.
  await expect(reversion).not.toContainText("SET_FLAG");
  await expect(reversion).not.toContainText("SESSION_CLOSED");
});
