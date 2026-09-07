import { test, expect, type Page } from "@playwright/test";

// Paso 2, tarea A11 — la Furia, de punta a punta en un navegador de verdad. **Se escribe, no se
// corre**: lo corre el orquestador, uno a la vez (docs/08-pruebas.md), y por eso este fichero se
// entrega sin haberse ejecutado. Copia el patrón de `combate.spec.ts` (entrar en combate, medir
// la tira) y de `elegir-camino.spec.ts` (bárbaro de nivel 3, contra la API real) porque los dos
// recorridos hacen falta a la vez: un botón de actividad dentro de la hoja, y su efecto en la
// mesa que solo la capa de combate enseña.
//
// **Lo que aquí se mide y en una unitaria es invisible**: que la fila «Furia» aparece dentro del
// panel de la hoja abierto DESDE LA MESA (no la página de personaje sola), que el estado
// «En furia» aparece en las condiciones sin recargar, y que la economía del turno de
// `EconomiaDeAccion` (tarea A3) refleja el gasto de la acción adicional en la misma sesión de
// navegador — tres piezas construidas por separado esta noche que solo se demuestran juntas
// dentro de una página real.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `furia-${marca}@example.com`,
    password: "password123",
    displayName: `Furia ${marca}`,
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

async function crearPersonajeYAbrirFicha(page: Page, nombrePersonaje: string) {
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("El campamento del bárbaro");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "El campamento del bárbaro" }).click();
  await expect(page.getByRole("heading", { name: "El campamento del bárbaro" })).toBeVisible();

  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill(nombrePersonaje);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("link", { name: new RegExp(nombrePersonaje) }).click();
  await expect(page.getByRole("heading", { name: nombrePersonaje })).toBeVisible();
}

/**
 * Bárbaro humano de nivel 3, copiado de `elegir-camino.spec.ts` — el nivel exacto en el que
 * `barbarian-rages` sube a 3 usos (`classes.ts`, tramo `desde: 3`).
 */
async function completarFichaDeBarbaroHumano(page: Page) {
  await page.getByLabel("Raza", { exact: true }).selectOption("human");
  await page.getByLabel("Clase", { exact: true }).selectOption("barbarian");
  await page.getByLabel("Nivel", { exact: true }).fill("3");
  await page.getByLabel("Nivel", { exact: true }).blur();

  const caracteristicas: [string, string][] = [
    ["Fuerza", "16"],
    ["Destreza", "12"],
    ["Constitución", "14"],
    ["Inteligencia", "8"],
    ["Sabiduría", "10"],
    ["Carisma", "8"],
  ];
  for (const [nombre, valor] of caracteristicas) {
    const campo = page.getByLabel(nombre, { exact: true });
    await campo.fill(valor);
    await campo.blur();
  }
  await expect(page.getByText("Salvaciones", { exact: true })).toBeVisible({ timeout: 15_000 });
}

/** Equipa el hacha grande desde el inventario que la hoja monta (fase 2B). */
async function equiparHachaGrande(page: Page) {
  const inventario = page.getByRole("region", { name: "inventario" });
  await inventario.getByRole("button", { name: /Añadir objeto/ }).click();
  await inventario.getByLabel(/Buscar/).fill("Hacha grande");
  await inventario
    .getByRole("button", { name: /Hacha grande/ })
    .first()
    .click();
  await inventario.getByRole("radio", { name: /Equipado/ }).check();
  await inventario.getByRole("button", { name: "Añadir", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "ataques y lanzamiento" }).getByRole("table"),
  ).toBeVisible({ timeout: 15_000 });
}

test("un bárbaro pulsa Furia en su hoja: se le gasta la acción adicional y un uso, aparece su estado, y sube su daño", async ({
  page,
}) => {
  await registrarse(page);
  await crearPersonajeYAbrirFicha(page, "Grosk Puñoférreo");
  await completarFichaDeBarbaroHumano(page);
  await equiparHachaGrande(page);

  // --- La actividad, con sus usos, ya en la ficha standalone ---
  const actividades = page.getByRole("region", { name: "actividades" });
  await expect(actividades).toBeVisible();
  // `exact: true`: sin él, «Furia» también casa con el botón «Usar Furia» y con la frase que
  // explica cuánto dura, y el localizador cae en modo estricto con tres elementos — se afirma el
  // nombre de la actividad, no cualquier texto que la mencione (misma trampa ya pagada con
  // `getByRole("radio", { name: /Jugadores/ })`).
  await expect(actividades.getByText("Furia", { exact: true })).toBeVisible();
  await expect(actividades.getByText("3 / 3 usos")).toBeVisible();
  // Nunca la clave cruda: la regla de enumeraciones que llegan a pantalla.
  await expect(page.getByText("rage", { exact: true })).toHaveCount(0);

  // --- Una sesión, y la mesa en combate ---
  await page.getByRole("link", { name: "El campamento del bárbaro" }).click();
  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Nueva sesión" }).click();
  await page.getByLabel("Título").fill("La primera cacería");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();

  await page
    .getByRole("status", { name: "Sesión en curso" })
    .getByRole("link", { name: "Ir a la mesa" })
    .click();
  await expect(page.getByRole("banner", { name: "Estado de la mesa" })).toBeVisible();

  await page.getByRole("button", { name: "Entrar en combate" }).click();
  const dialogoDeCombate = page.getByRole("dialog");
  await dialogoDeCombate.getByRole("checkbox", { name: /Grosk/ }).click();
  await dialogoDeCombate.getByRole("button", { name: "Pedir iniciativa" }).click();
  await expect(page.getByRole("region", { name: "Orden de turnos" })).toBeVisible({
    timeout: 15_000,
  });

  // --- La economía del turno, sobre la tira: todo disponible antes de usar la Furia ---
  const economia = page.getByRole("region", { name: "Lo que te queda del turno" });
  await expect(economia).toBeVisible({ timeout: 10_000 });
  await expect(economia.getByText("Acción adicional: disponible")).toBeVisible();

  // --- Abrir la hoja DESDE LA MESA, y pulsar Furia ---
  await page.getByRole("button", { name: /^Hoja/ }).click();
  const cajonDeLaHoja = page.getByRole("dialog", { name: "Tu hoja" });
  await expect(cajonDeLaHoja).toBeVisible();

  const actividadesEnLaMesa = cajonDeLaHoja.getByRole("region", { name: "actividades" });
  await actividadesEnLaMesa.getByRole("button", { name: "Usar Furia" }).click();
  // Un uso menos: de 3 a 2.
  await expect(actividadesEnLaMesa.getByText("2 / 3 usos")).toBeVisible({ timeout: 10_000 });

  // El estado, sin recargar — si esta aserción se hiciera tras un `page.reload()`, pasaría por
  // construcción y no probaría nada (mismo criterio que `subir-nivel.spec.ts` deja escrito para
  // el nivel).
  const condiciones = cajonDeLaHoja.getByRole("region", { name: /condicion/i });
  // Ni con `exact: true` basta: la opción `<option>En furia</option>` del desplegable de «Nueva
  // condición» vive en esta misma región y su texto también es exactamente «En furia», así que
  // el localizador seguía cayendo en modo estricto con dos elementos. Se afirma la condición
  // aplicada de verdad — su fila de lista, `<li>` en `Condiciones.tsx` — y no cualquier texto
  // que la mencione (misma trampa que ya avisa el encargo, y la misma de «Furia» más arriba, y
  // el mismo patrón de `condiciones-en-la-mesa.spec.ts` para "Concentración").
  await expect(condiciones.getByRole("listitem").filter({ hasText: "En furia" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText("Sin traducir: raging")).toHaveCount(0);

  // --- Cerrar la hoja: la economía del turno, en la mesa, refleja el gasto ---
  await page.keyboard.press("Escape");
  await expect(cajonDeLaHoja).toBeHidden();
  await expect(economia.getByText("Acción adicional: usada")).toBeVisible({ timeout: 10_000 });

  // --- El daño del hacha, con la Furia activa: se tira de verdad y queda escrito en el registro ---
  await page.getByRole("button", { name: /^Hoja/ }).click();
  const cajonDeLaHojaOtraVez = page.getByRole("dialog", { name: "Tu hoja" });
  const cuadroDeAtaques = cajonDeLaHojaOtraVez.getByRole("region", {
    name: "ataques y lanzamiento",
  });
  await expect(cuadroDeAtaques.getByText("Hacha grande")).toBeVisible();
  await cuadroDeAtaques.getByRole("button", { name: "Tirada de Hacha grande" }).click();
  await cuadroDeAtaques.getByRole("button", { name: "Tirar daño de Hacha grande" }).click();

  // Se cierra la hoja para leer el registro de la mesa, que es donde queda constancia — la
  // misma razón por la que `combate.spec.ts` lee `sucesos` y no un toast que se ha ido antes de
  // mirar. El motivo de la tirada (`RollsService`, `payload.reason`) lleva "+ Furia" cuando
  // `bonoDeFuria` encontró la condición viva (`character-sheet.service.ts`).
  await page.keyboard.press("Escape");
  const sucesos = page.getByRole("list", { name: "Sucesos de la sesión" });
  // El suceso pinta el motivo dos veces —un rótulo y, debajo, la tirada con su resultado— y las
  // dos casan con el mismo patrón, así que el localizador caía en modo estricto con dos
  // elementos. Se afirma la fila con el resultado tirado (trae `=`), que es lo que de verdad
  // demuestra que la tirada se hizo, y no solo que su rótulo se pintó.
  await expect(sucesos.getByText(/Daño de Hacha grande.*Furia.*=/)).toBeVisible({
    timeout: 10_000,
  });
});
