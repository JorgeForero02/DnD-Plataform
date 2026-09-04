import { test, expect, type Browser, type Page } from "@playwright/test";

// Tarea 2C.5 — **el DM pide, a la jugadora le aparece sin recargar, tira, y el DM lo ve.**
//
// Es el criterio con el que cierra el bloque, y **solo se puede comprobar con dos navegadores**:
// lo que se mide es que la petición cruza de una sesión a otra por sondeo, sin tiempo real y sin
// que nadie recargue nada.

function nuevaCuenta(prefijo: string) {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `${prefijo}-${marca}@example.com`,
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

/** La cabecera de la sesión abierta, para montar por API lo que no se está midiendo. */
async function comoLaSesion(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem("dnd_token"));
  return { Authorization: `Bearer ${token}` };
}

test("**el DM pide una tirada, a la jugadora le aparece sin recargar, tira, y el DM ve el resultado**", async ({
  browser,
}: {
  browser: Browser;
}) => {
  // Dos navegadores, dos registros, una hoja y dos sondeos: no cabe en los treinta segundos por
  // defecto, y alargarlo aquí es más honesto que trocear el recorrido en pedazos que ya no
  // comprueban que la petición cruza de una sesión a otra.
  test.setTimeout(120_000);

  const contextoDM = await browser.newContext();
  const paginaDM = await contextoDM.newPage();
  await registrarse(paginaDM, "dm");

  await paginaDM.getByRole("button", { name: "Nueva campaña" }).first().click();
  await paginaDM.getByLabel("Nombre").fill("La mesa de las peticiones");
  await paginaDM.getByRole("button", { name: "Crear" }).click();
  await paginaDM.getByRole("link", { name: "La mesa de las peticiones" }).click();
  await expect(paginaDM.getByRole("heading", { name: "La mesa de las peticiones" })).toBeVisible();

  await paginaDM.getByRole("tab", { name: "Ajustes" }).click();
  await paginaDM.getByRole("button", { name: "Generar invitación" }).click();
  const enlace = await paginaDM.getByLabel("Enlace de invitación").inputValue();

  // La jugadora entra y se hace un personaje con hoja: sin hoja no hay modificador que tirar.
  const contextoJugadora = await browser.newContext();
  const paginaJugadora = await contextoJugadora.newPage();
  await paginaJugadora.goto(enlace);
  const jugadora = nuevaCuenta("jugadora");
  await paginaJugadora.getByRole("link", { name: "Crear cuenta" }).click();
  await paginaJugadora.getByLabel("Nombre").fill(jugadora.displayName);
  await paginaJugadora.getByLabel("Correo").fill(jugadora.email);
  await paginaJugadora.getByLabel("Contraseña").fill(jugadora.password);
  await paginaJugadora.getByRole("button", { name: "Crear cuenta" }).click();
  await paginaJugadora.getByRole("button", { name: "Unirse a la campaña" }).click();
  await expect(
    paginaJugadora.getByRole("heading", { name: "La mesa de las peticiones" }),
  ).toBeVisible();

  await paginaJugadora.getByRole("button", { name: "Personajes" }).click();
  await paginaJugadora.getByRole("button", { name: "Nuevo personaje" }).click();
  await paginaJugadora.getByLabel("Nombre").fill("Ana");
  await paginaJugadora.getByRole("button", { name: "Guardar" }).click();
  await expect(paginaJugadora.getByRole("button", { name: "Guardar" })).toBeHidden();
  await paginaJugadora.getByRole("link", { name: "Ana" }).click();

  // La hoja se completa por API: los quince clics de rellenarla ya los recorre `hoja.spec.ts`, y
  // aquí no es lo que se mide.
  const url = paginaJugadora.url();
  const campaignId = url.split("/campaigns/")[1].split("/")[0];
  const characterId = url.split("/personajes/")[1];
  const hoja = await paginaJugadora.request.patch(
    `/api/campaigns/${campaignId}/characters/${characterId}/sheet`,
    {
      headers: await comoLaSesion(paginaJugadora),
      data: {
        abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 16, cha: 8 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
        choices: { "fighter-skills": ["athletics", "perception"] },
      },
    },
  );
  expect(hoja.ok()).toBe(true);

  // La jugadora se queda mirando la pantalla de dados. **No recarga en toda la prueba.**
  await paginaJugadora.goto(`/campaigns/${campaignId}`);
  await paginaJugadora.getByRole("tab", { name: "Dados" }).click();
  await expect(paginaJugadora.getByRole("heading", { name: "Dados", exact: true })).toBeVisible();

  // El DM pide desde su propia pantalla de dados. **Recarga primero**: su pestaña se abrió antes
  // de que existiera el personaje de Ana, y la lista de personajes es una consulta cacheada — no
  // es un fallo de la aplicación, es que en la mesa el DM tampoco tiene la pantalla abierta desde
  // antes de que sus jugadores se hicieran la ficha.
  await paginaDM.reload();
  await paginaDM.getByRole("tab", { name: "Dados" }).click();
  await expect(paginaDM.getByRole("heading", { name: "Dados", exact: true })).toBeVisible();
  await paginaDM.getByRole("checkbox", { name: "Ana" }).check();
  await paginaDM.getByLabel("Qué le pides").selectOption({ label: "Percepción" });
  await paginaDM.getByLabel("Qué se le dice").fill("Percepción: ¿oís al posadero?");
  await paginaDM.getByRole("button", { name: "Pedir la tirada" }).click();

  // **Le aparece sola**, por sondeo: aquí no hay recarga ni tiempo real.
  await expect(paginaJugadora.getByText("Percepción: ¿oís al posadero?")).toBeVisible({
    timeout: 30_000,
  });

  await paginaJugadora
    .getByRole("button", { name: "Tirar: Percepción: ¿oís al posadero?" })
    .click();
  await expect(paginaJugadora.getByRole("status").first()).toBeVisible();

  // Y el DM lo ve en el registro de la campaña, que es la otra mitad del patrón.
  await paginaDM.reload();
  await paginaDM.getByRole("tab", { name: "Dados" }).click();
  const registro = paginaDM.getByRole("region", { name: /registro de tiradas/i });
  await expect(registro.locator('[data-tirada-tipo="ABILITY_ROLL"]')).toHaveCount(1);

  // --- Y ahora lo que de verdad pasa en la mesa: **la jugadora no está en la pestaña «Dados»**.
  //
  // `TiradasPendientes` solo se montaba dentro de «Dados». Sondeaba cada quince segundos de forma
  // impecable y no lo miraba nadie, porque durante la partida nadie está parado en esa pestaña:
  // se está en la mesa. El DM pedía una tirada y la jugadora no se enteraba. Este tramo mide que
  // la petición **se ve desde la mesa**, que es donde está la gente.
  //
  // (El montaje en la mesa es provisional: el rediseño de la pantalla lo va a colocar como capa
  // contextual. Mientras exista, se prueba.)

  await paginaDM.getByRole("tab", { name: "Sesiones" }).click();
  await paginaDM.getByRole("button", { name: "Nueva sesión" }).click();
  await paginaDM.getByLabel("Título").fill("La noche del posadero");
  await paginaDM.getByRole("button", { name: "Guardar" }).click();
  await expect(paginaDM.getByRole("button", { name: "Guardar" })).toBeHidden();
  await paginaDM.getByRole("button", { name: "Empezar" }).click();
  await paginaDM.getByRole("button", { name: "Empezar la sesión" }).click();
  await expect(paginaDM.getByRole("status", { name: "Sesión en curso" })).toBeVisible({
    timeout: 15_000,
  });

  // La jugadora se planta en la mesa y **no vuelve a tocar el navegador**.
  await paginaJugadora.goto(`/campaigns/${campaignId}/sesion`);
  await expect(paginaJugadora.getByRole("region", { name: "Registro de la sesión" })).toBeVisible({
    timeout: 15_000,
  });

  // El DM pide desde su pantalla de dados, como haría en la mesa.
  await paginaDM.getByRole("tab", { name: "Dados" }).click();
  await paginaDM.getByRole("checkbox", { name: "Ana" }).check();
  await paginaDM.getByLabel("Qué le pides").selectOption({ label: "Sigilo" });
  await paginaDM.getByLabel("Qué se le dice").fill("Sigilo: ¿te oyen al pasar?");
  await paginaDM.getByRole("button", { name: "Pedir la tirada" }).click();

  // **Le aparece sola, sin salir de la mesa.** Antes de este arreglo, aquí no salía nada nunca.
  const enLaMesa = paginaJugadora.getByRole("region", { name: "Tiradas que te han pedido" });
  await expect(enLaMesa.getByText("Sigilo: ¿te oyen al pasar?")).toBeVisible({ timeout: 30_000 });

  // Y se puede responder desde ahí mismo: verla y no poder tirarla no serviría de nada.
  await enLaMesa.getByRole("button", { name: "Tirar: Sigilo: ¿te oyen al pasar?" }).click();
  await expect(enLaMesa.getByRole("status").first()).toBeVisible({ timeout: 15_000 });

  await contextoJugadora.close();
  await contextoDM.close();
});
