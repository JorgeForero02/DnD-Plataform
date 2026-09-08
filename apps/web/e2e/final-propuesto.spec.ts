import { test, expect, type Page } from "@playwright/test";

// **El combate propone terminarse; no se termina solo.** Ficha P2, 2026-09-07.
//
// Por qué esto vive en un navegador y no en `jsdom`: **el gris de un caído es opacidad**, y
// `jsdom` no maqueta —no calcula estilo heredado ni compone nada—, así que allí «se puso gris»
// solo se puede fingir. Lo que sí cubre `jsdom` y no se repite aquí: que el aviso aparece y
// desaparece según `finalPropuesto`, y que un caído lleva rótulo además de color
// (`capa-de-combate.test.tsx`).
//
// **La doctrina que se mide, y es del SRD antes que del proyecto.** «Monsters and Death» (SRD 5.1,
// 2014): *«Most DMs have a monster die the instant it drops to 0 hit points, rather than having it
// fall unconscious and make death saving throws. Mighty villains and special nonplayer characters
// are common exceptions.»* Ni la muerte del monstruo es automática: es **costumbre del DM**. Así
// que el sistema propone y el DM decide — y esta prueba falla si el combate se cierra solo.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `final-propuesto-${marca}@example.com`,
    password: "password123",
    displayName: `Final ${marca}`,
  };
}

async function registrarse(page: Page) {
  await page.goto("/register");
  const cuenta = nuevaCuenta();
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();
}

/** Un personaje con hoja de verdad: sin raza y clase no hay PG, y sin PG no hay nada que bajar. */
async function crearPersonaje(page: Page, nombre: string, campana: string) {
  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  await page.getByRole("link", { name: new RegExp(nombre) }).click();
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
  await page.getByLabel("Raza", { exact: true }).selectOption("dwarf");
  await page.getByLabel("Clase", { exact: true }).selectOption("fighter");
  for (const [etiqueta, valor] of [
    ["Fuerza", "14"],
    ["Destreza", "12"],
    ["Constitución", "14"],
    ["Inteligencia", "10"],
    ["Sabiduría", "10"],
    ["Carisma", "8"],
  ] as [string, string][]) {
    const campo = page.getByLabel(etiqueta, { exact: true });
    await campo.fill(valor);
    await campo.blur();
  }
  await expect(page.getByText("Salvaciones", { exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("link", { name: campana }).click();
}

test("el último enemigo cae: la mesa lo propone y el combate NO se cierra solo", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await registrarse(page);

  const CAMPANA = "El vado";
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill(CAMPANA);
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: CAMPANA }).click();

  await crearPersonaje(page, "Thora", CAMPANA);
  await crearPersonaje(page, "Gorm", CAMPANA);

  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Nueva sesión" }).click();
  await page.getByLabel("Título").fill("El vado de noche");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();
  await page
    .getByRole("status", { name: "Sesión en curso" })
    .getByRole("link", { name: "Ir a la mesa" })
    .click();
  await expect(page.getByRole("banner", { name: "Estado de la mesa" })).toBeVisible({
    timeout: 10_000,
  });

  // --- En combate, y **Gorm es el enemigo** ---
  //
  // El bando se declara al empezar: es un dato del encuentro y no del personaje, porque «enemigo»
  // no es una propiedad de una criatura sino una relación en un momento.
  await page.getByRole("button", { name: "Entrar en combate" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("checkbox", { name: /Thora/ }).click();
  await dialogo.getByRole("checkbox", { name: /Gorm/ }).click();
  await dialogo.getByRole("radiogroup", { name: "Bando de Gorm" }).getByLabel("Enemigo").check();
  await dialogo.getByRole("radiogroup", { name: "Bando de Thora" }).getByLabel("Aliado").check();
  await dialogo.getByRole("button", { name: "Pedir iniciativa" }).click();

  const tira = page.getByRole("region", { name: "Orden de turnos" });
  await expect(tira).toBeVisible({ timeout: 15_000 });

  // Todavía no hay nada que proponer: el enemigo está en pie.
  await expect(page.getByRole("status", { name: "Sin enemigos en pie" })).toBeHidden();
  await expect(tira.getByText("Cayó")).toHaveCount(0);

  // --- Se le baja a 0, con el gesto de la mesa y no por la puerta de atrás ---
  //
  // El gesto real de la mesa: «Daño a X», su cantidad, y aplicar. **La cantidad se lee de la
  // barra** en vez de escribir un número fijo: un enano guerrero de nivel 1 ronda los 12 PG, pero
  // atarse a esa cifra rompería esta prueba el día que cambien los dados de golpe, y por un
  // motivo que no tiene nada que ver con lo que mide.
  const barra = page.getByRole("img", { name: /^Gorm: \d+ de \d+ puntos de golpe$/ });
  await expect(barra).toBeVisible({ timeout: 15_000 });
  const etiqueta = (await barra.getAttribute("aria-label")) ?? "";
  const pgActuales = Number(/Gorm: (\d+) de/.exec(etiqueta)?.[1] ?? 0);
  expect(pgActuales).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Daño a Gorm" }).click();
  await page.getByLabel("Cuánto daño").fill(String(pgActuales));
  await page.getByRole("button", { name: "Aplicar daño" }).click();

  // A cero, y comprobado en la barra antes de mirar nada más: si el daño no llegó, todo lo de
  // abajo estaría midiendo el estado equivocado.
  await expect(page.getByRole("img", { name: /^Gorm: 0 de \d+ puntos de golpe$/ })).toBeVisible({
    timeout: 15_000,
  });

  // --- 1 · La mesa lo PROPONE ---
  const propuesta = page.getByRole("status", { name: "Sin enemigos en pie" });
  await expect(propuesta).toBeVisible({ timeout: 15_000 });
  await expect(propuesta).toContainText("ciérralo tú");

  // --- 2 · Y NO se cierra solo. Es la aserción que da nombre a la prueba ---
  //
  // La tira sigue puesta y el gesto de terminar sigue siendo un botón que hay que pulsar. Si
  // alguien convierte la propuesta en un cierre automático, esto se pone rojo.
  await expect(tira).toBeVisible();
  await expect(page.getByRole("button", { name: "Terminar el combate" })).toBeVisible();
  await expect(page.getByText("La mesa no está en combate.")).toBeHidden();

  // --- 3 · El caído se ve caído: rótulo Y gris, medido ---
  //
  // El rótulo lo cubre `jsdom`; **la opacidad no**, y por eso esta prueba existe. Se mide el
  // valor calculado sobre la casilla de Gorm y se compara con la de Thora, que sigue en pie: un
  // número absoluto se rompería si mañana el gris se afina, pero «el caído está más apagado que
  // quien sigue de pie» es lo que de verdad se quiere.
  await expect(tira.getByText("Cayó")).toHaveCount(1);
  const opacidadDe = (nombre: string) =>
    tira
      .locator("li")
      .filter({ hasText: nombre })
      .first()
      .evaluate((el) => Number(getComputedStyle(el).opacity));
  const caido = await opacidadDe("Gorm");
  const enPie = await opacidadDe("Thora");
  expect(caido).toBeLessThan(enPie);
  expect(enPie).toBe(1);
});
