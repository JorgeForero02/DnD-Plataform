import { test, expect, type Browser, type Page } from "@playwright/test";

// Reglas de la mesa (spec 2026-09-13, D-CF-53/65) — el recorrido que ninguna unitaria, ninguna
// RTL ni ningún e2e de API pueden hacer entero: el DM fija «dados, 3d6, 2 intentos» desde
// «Ajustes», un jugador de verdad crea su personaje sin poder teclear el nivel, tira los dados
// del servidor, VE las seis caras (no solo el total) y elige un intento — y a partir de ahí las
// seis casillas de la hoja se quedan bloqueadas para él, aunque la hoja derive con normalidad
// (E-RM-1, E-RM-13). El segundo test cubre la otra mitad de §6/§7: un catálogo filtrado por
// `permitidos` no ofrece lo excluido al crear, y un valor ya guardado que deja de estar permitido
// se ve marcado y no seleccionable — nunca desaparece.
//
// **NO se ejecuta en esta ficha** (regla del encargo): la corre el orquestador en la tanda de
// cierre (D-CF-65), igual que `sobrecarga.spec.ts`. Escrito con sus mismos ayudantes (registro,
// campaña, personaje, pestaña «Ajustes») y el flujo de dos contextos de `invitacion.spec.ts`.

test.setTimeout(90_000);

function nuevaCuenta(prefijo: string) {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `rm-${prefijo}-${marca}@example.com`,
    password: "password123",
    displayName: `${prefijo} ${marca}`,
  };
}

async function registrarse(page: Page, prefijo: string) {
  const cuenta = nuevaCuenta(prefijo);
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
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
}

test("el DM fija «dados, 3d6, 2 intentos»; el jugador tira, ve seis dados con sus caras, elige el segundo, la hoja deriva y no deja editarlas", async ({
  browser,
}: {
  browser: Browser;
}) => {
  // Contexto 1: el DM.
  const dmContext = await browser.newContext();
  const dmPage = await dmContext.newPage();
  await registrarse(dmPage, "dm");
  await crearCampana(dmPage, "La mesa de las reglas");

  // «Ajustes» → «Reglas de la mesa»: «Con dados», expresión «3d6», 2 intentos, guardar.
  await dmPage.getByRole("tab", { name: "Ajustes" }).click();
  const bloqueDeReglas = dmPage.getByRole("region", { name: "Reglas de la mesa" });
  await expect(bloqueDeReglas).toBeVisible();
  await bloqueDeReglas.getByRole("radio", { name: /Con dados/ }).click();
  await bloqueDeReglas.getByLabel("Expresión de dados").fill("3d6");
  await bloqueDeReglas.getByRole("spinbutton", { name: "Intentos" }).fill("2");
  await bloqueDeReglas.getByRole("button", { name: "Guardar las reglas" }).click();
  // Guardar entero no deja ningún `role="alert"` de error en el bloque.
  await expect(bloqueDeReglas.getByRole("alert")).toHaveCount(0);

  // Recargar y comprobar que el radio sigue marcado: el `PATCH` de verdad llegó al servidor,
  // no solo al estado local del formulario.
  await dmPage.reload();
  await dmPage.getByRole("tab", { name: "Ajustes" }).click();
  const bloqueTrasRecargar = dmPage.getByRole("region", { name: "Reglas de la mesa" });
  await expect(bloqueTrasRecargar.getByRole("radio", { name: /Con dados/ })).toBeChecked();
  await expect(bloqueTrasRecargar.getByLabel("Expresión de dados")).toHaveValue("3d6");
  await expect(bloqueTrasRecargar.getByRole("spinbutton", { name: "Intentos" })).toHaveValue("2");

  // Invitar a un jugador — mismo camino que `invitacion.spec.ts`: generar y leer el enlace de
  // la pantalla, no construirlo a mano.
  await dmPage.getByRole("button", { name: "Generar invitación" }).click();
  const linkField = dmPage.getByLabel("Enlace de invitación");
  await expect(linkField).toBeVisible();
  const inviteUrl = await linkField.inputValue();
  expect(inviteUrl).toMatch(/\/join\/.+/);

  // Contexto 2: el jugador. Se registra desde el enlace y acepta, exactamente como
  // `invitacion.spec.ts`.
  const playerContext = await browser.newContext();
  const playerPage = await playerContext.newPage();
  await playerPage.goto(inviteUrl);
  await playerPage.getByRole("link", { name: "Crear cuenta" }).click();
  const jugador = nuevaCuenta("jugador");
  await playerPage.getByLabel("Nombre").fill(jugador.displayName);
  await playerPage.getByLabel("Correo").fill(jugador.email);
  await playerPage.getByLabel("Contraseña").fill(jugador.password);
  await playerPage.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(
    playerPage.getByText("Estás a punto de unirte a una campaña con esta invitación."),
  ).toBeVisible();
  await playerPage.getByRole("button", { name: "Unirse a la campaña" }).click();
  await expect(playerPage.getByRole("heading", { name: "La mesa de las reglas" })).toBeVisible();

  // «Nuevo personaje»: nivel fijado por la mesa, ningún spinbutton «Nivel» que teclear.
  await playerPage.getByRole("button", { name: "Personajes" }).click();
  await playerPage.getByRole("button", { name: "Nuevo personaje" }).click();
  await expect(playerPage.getByRole("heading", { name: "Nuevo personaje" })).toBeVisible();
  await expect(playerPage.getByText("Nivel 1 — lo fija la mesa")).toBeVisible();
  await expect(playerPage.getByRole("spinbutton", { name: "Nivel" })).toHaveCount(0);

  await playerPage.getByLabel("Nombre").fill("Rin de los Dados");
  await playerPage.getByLabel("Raza", { exact: true }).selectOption({ label: "Enano" });
  await playerPage.getByLabel("Clase", { exact: true }).selectOption({ label: "Guerrero" });
  await playerPage.getByRole("button", { name: "Guardar" }).click();
  await expect(playerPage.getByRole("heading", { name: "Nuevo personaje" })).toBeHidden();

  await playerPage.getByRole("link", { name: /Rin de los Dados/ }).click();
  await expect(playerPage.getByRole("heading", { name: "Rin de los Dados" })).toBeVisible();

  // «Números» es la pestaña de arranque: las seis casillas ya están ahí, deshabilitadas porque
  // la regla de la mesa fija las características, con el motivo en el `title`.
  const fuerza = playerPage.getByLabel("Fuerza", { exact: true });
  await expect(fuerza).toBeDisabled();
  await expect(fuerza).toHaveAttribute("title", "Las características las fija la regla de la mesa");

  await playerPage.getByRole("button", { name: "Tirar características" }).click();
  await expect(playerPage.getByText("Intento 1 de 2")).toBeVisible();

  // Dentro de la sección de dados hay seis `role="status"` (uno por característica), y cada uno
  // trae tres `[data-dado]` con tres `[data-icono="d6"]` — 3d6, sin descarte.
  const primerIntento = playerPage.getByText("Intento 1 de 2").locator("..");
  const estados1 = primerIntento.getByRole("status");
  await expect(estados1).toHaveCount(6);
  for (let i = 0; i < 6; i++) {
    await expect(estados1.nth(i).locator("[data-dado]")).toHaveCount(3);
    await expect(estados1.nth(i).locator('[data-icono="d6"]')).toHaveCount(3);
  }

  // Un segundo intento: el DM permitió dos.
  await playerPage.getByRole("button", { name: "Tirar características" }).click();
  await expect(playerPage.getByText("Intento 2 de 2")).toBeVisible();
  // Agotados los dos intentos: el botón NO se esconde ni se deshabilita (regla de la casa: el
  // error se escribe en línea y no se manda nada); un tercer clic lo dice.
  await playerPage.getByRole("button", { name: "Tirar características" }).click();
  await expect(playerPage.getByText("Ya usaste los 2 intentos.")).toBeVisible();
  await expect(playerPage.getByText("Intento 3 de 2")).toHaveCount(0);

  const segundoIntento = playerPage.getByText("Intento 2 de 2").locator("..");
  // `asignacionLibre` es `true` por defecto (no se tocó al guardar): hay un `<select>` por
  // característica para repartir los seis valores tirados, y **se agotan**: cada valor asignado
  // desaparece de los demás. Así que a cada característica se le da el primer valor que quede
  // (índice 1; el 0 es «—»), que siempre existe — un reparto válido con seis selects.
  const etiquetas = ["Fuerza", "Destreza", "Constitución", "Inteligencia", "Sabiduría", "Carisma"];
  for (const etiqueta of etiquetas) {
    await segundoIntento.getByLabel(etiqueta, { exact: true }).selectOption({ index: 1 });
  }
  await segundoIntento.getByRole("button", { name: "Quedarme con este" }).click();

  // La casilla de Fuerza enseña el valor elegido (deja de estar vacía) y «Fijadas con dados» se
  // ve; «Tirar características» ya no existe en absoluto, y las seis casillas siguen apagadas.
  await expect(playerPage.getByText("Fijadas con dados")).toBeVisible();
  await expect(playerPage.getByRole("button", { name: "Tirar características" })).toHaveCount(0);
  await expect(fuerza).not.toHaveValue("");
  await expect(fuerza).toBeDisabled();

  // La hoja deriva con normalidad: las salvaciones, que solo se calculan con las seis
  // características puestas y raza/clase elegidas.
  await expect(playerPage.getByText("Salvaciones", { exact: true })).toBeVisible({
    timeout: 15_000,
  });

  await dmContext.close();
  await playerContext.close();
});

test("clase fuera de permitidos no se ofrece al crear, y un valor guardado que deja de permitirse se ve marcado y no seleccionable", async ({
  page,
}) => {
  await registrarse(page, "solo");
  await crearCampana(page, "La mesa de los permitidos");

  // Un personaje mago, con las reglas por defecto (todo permitido).
  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill("Vex la Huérfana");
  await page.getByLabel("Raza", { exact: true }).selectOption({ label: "Humano" });
  await page.getByLabel("Clase", { exact: true }).selectOption({ label: "Mago" });
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("heading", { name: "Nuevo personaje" })).toBeHidden();

  // El cajón «Personajes» es un diálogo que tapa las pestañas: se cierra antes de ir a Ajustes.
  await page.getByRole("button", { name: "Cerrar (Escape)" }).click();
  // El DM (aquí, la misma cuenta: es el único jugador) restringe las clases a «Guerrero».
  await page.getByRole("tab", { name: "Ajustes" }).click();
  const bloqueDeReglas = page.getByRole("region", { name: "Reglas de la mesa" });
  const clasesPermitidas = bloqueDeReglas.getByRole("group", { name: "Clases permitidas" });
  await clasesPermitidas.getByRole("checkbox", { name: "Guerrero" }).check();
  await bloqueDeReglas.getByRole("button", { name: "Guardar las reglas" }).click();
  await expect(bloqueDeReglas.getByRole("alert")).toHaveCount(0);

  // Nuevo personaje: el catálogo de clases ya no ofrece «Mago».
  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  const opcionesDeClase = await page
    .getByLabel("Clase", { exact: true })
    .locator("option")
    .allTextContents();
  expect(opcionesDeClase).toContain("Guerrero");
  expect(opcionesDeClase).not.toContain("Mago");
  await page.getByRole("button", { name: "Cancelar" }).click();

  // La hoja de la maga, ya creada: su clase guardada sigue ahí, marcada y deshabilitada — el
  // mecanismo huérfano, no un valor que desapareció.
  await page.getByRole("link", { name: /Vex la Huérfana/ }).click();
  await expect(page.getByRole("heading", { name: "Vex la Huérfana" })).toBeVisible();
  // Sin las seis características la hoja no deriva y no hay pestañas: la «Ficha» (raza, clase,
  // nivel) se pinta directamente, sin pasar por «Rasgos».
  await expect(page.getByRole("region", { name: "ficha del personaje" })).toBeVisible();

  // El select en sí sigue editable (esta cuenta es DM y dueña a la vez); lo que no se puede
  // volver a elegir es la opción huérfana concreta — sigue ahí, marcada, y deshabilitada.
  const claseDeLaHoja = page.getByLabel("Clase", { exact: true });
  await expect(claseDeLaHoja).toHaveValue("wizard");
  const opcionHuerfana = claseDeLaHoja.locator("option", {
    hasText: "Mago — guardado, ya no disponible",
  });
  await expect(opcionHuerfana).toHaveCount(1);
  // `toBeDisabled` no aplica a `<option>`: se mira el atributo.
  await expect(opcionHuerfana).toHaveAttribute("disabled", "");
});
