import { test, expect, type Page } from "@playwright/test";

/** Se usa para MONTAR contra la API (sembrar lo que la pantalla todavía no puede escribir), nunca
 * para comprobar: lo que se mide sigue pasando en pantalla. Mismo patrón que
 * `condiciones-en-la-mesa.spec.ts`. */
async function comoLaSesion(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem("dnd_token"));
  return { Authorization: `Bearer ${token}` };
}

// Tarea 2C.6 — **las tablas del DM, en el navegador.**
//
// Lo que se mide aquí y no se puede medir en otro sitio: que la pantalla **dice lo que estas
// tablas son** antes que ninguna otra cosa —una regla de la casa, no del manual—, que crear una
// tabla mala enseña **la frase del servidor** y no una genérica, y que la rejilla de filas no
// arrastra la página a lo ancho.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `tabla-${marca}@example.com`,
    password: "password123",
    displayName: `Tabla ${marca}`,
  };
}

async function abrirTablas(page: Page) {
  const cuenta = nuevaCuenta();
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();

  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La casa que tira");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La casa que tira" }).click();
  await page.getByRole("tab", { name: "Tablas" }).click();
  await expect(page.getByRole("heading", { name: "Tablas del DM" })).toBeVisible();
}

test("**lo primero que se lee es que esto no es del manual**", async ({ page }) => {
  await abrirTablas(page);
  await expect(
    page.getByText(/el SRD no trae ninguna tabla de críticos ni de pifias/i),
  ).toBeVisible();
  await expect(page.getByText(/regla de la casa/i).first()).toBeVisible();
});

test("**el interruptor dice en qué posición está**, leído del servidor", async ({ page }) => {
  await abrirTablas(page);
  const apagada = page.getByRole("radio", { name: /Apagada/ });
  await expect(apagada).toBeChecked();
  // Y dice qué significa: es la frase que impide que una casa cambie una regla sin decirlo.
  await expect(page.getByText(/duplicando dados y nada más/i)).toBeVisible();
});

test("una tabla con un hueco se rechaza **con la frase del servidor**, no con una genérica", async ({
  page,
}) => {
  await abrirTablas(page);

  await page.getByRole("button", { name: "Crear tabla" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Con hueco");
  // La primera fila viene puesta; se le deja un rango que no empieza en 1.
  await page.getByLabel("Desde", { exact: true }).first().fill("3");
  await page.getByLabel("Hasta", { exact: true }).first().fill("8");
  await page.getByLabel("Resultado", { exact: true }).first().fill("Algo");
  await page.getByRole("button", { name: "Guardar tabla" }).click();

  // El mensaje lo escribe el esquema del servidor, y llega entero: «La tabla tiene que empezar en
  // el 1». Antes de 2C.6 llegaba como «El campo «entries» no tiene un valor válido».
  await expect(page.getByText(/tiene que empezar en el 1/i)).toBeVisible();
});

test("la pantalla no arrastra la página a lo ancho", async ({ page }) => {
  await abrirTablas(page);
  await page.setViewportSize({ width: 900, height: 900 });
  const desborda = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(desborda).toBe(false);
});

test("**editar una tabla reemplaza sus filas**, y la tabla guardada sigue siendo válida", async ({
  page,
}) => {
  // Ficha C2C-6: hasta hoy una errata en una tabla de veinte filas obligaba a rehacerla entera.
  await abrirTablas(page);

  await page.getByRole("button", { name: "Crear tabla" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Rumores de la posada");
  await page.getByLabel("Desde", { exact: true }).first().fill("1");
  await page.getByLabel("Hasta", { exact: true }).first().fill("6");
  await page.getByLabel("Resultado", { exact: true }).first().fill("Nadie sabe nada.");
  await page.locator("form").getByRole("button", { name: "Guardar tabla" }).click();
  await expect(page.getByText("Rumores de la posada")).toBeVisible();

  // Se edita: el formulario **llega relleno** con lo que la tabla tiene ahora.
  await page.getByRole("button", { name: "Editar" }).click();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Rumores de la posada");
  await expect(page.getByLabel("Resultado", { exact: true }).first()).toHaveValue(
    "Nadie sabe nada.",
  );

  await page.getByLabel("Resultado", { exact: true }).first().fill("El posadero miente.");
  await page
    .locator("form")
    .getByRole("button", { name: /guardar/i })
    .click();

  await expect(page.getByText("El posadero miente.")).toBeVisible();
  await expect(page.getByText("Nadie sabe nada.")).toHaveCount(0);
});

// Tarea B5 — «tirar una tabla de botín y dar lo que sale, en dos clics» (definición de terminado
// del plan de botín y reparto).
//
// **El formulario de crear tabla no tiene todavía campos para `entrega`** — B4/B5 solo construyen
// la mitad de "enseñar y dar" lo que una fila entrega, no la de autorarla desde la pantalla; eso
// queda abierto para `docs/06-pendientes.md`. Por eso la tabla con botín se siembra por la API
// (mismo patrón que `condiciones-en-la-mesa.spec.ts`), y lo que se mide en el navegador es la
// mitad que sí se construyó: la tirada enseña el objeto por su nombre, no por su clave, y darlo
// a un segundo personaje lo hace aparecer en su inventario sin recargar.
test("tirar una tabla de botín enseña el objeto por su nombre y dárselo lo mete en su bolsa", async ({
  page,
}) => {
  await abrirTablas(page);
  const url = page.url();
  const campaignId = url.split("/campaigns/")[1].split("/")[0];

  // Un segundo personaje, para tener a quién dárselo: el DM no se da cosas a sí mismo en esta
  // prueba porque eso no demuestra el radio de destinatario.
  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill("Marta");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  const tabla = await page.request.post(`/api/campaigns/${campaignId}/tables`, {
    headers: await comoLaSesion(page),
    data: {
      name: "Cofre del vestíbulo",
      visibility: "DM_ONLY",
      trigger: "NONE",
      entries: [
        {
          min: 1,
          max: 1,
          text: "Una espada corta y quince monedas de oro.",
          entrega: {
            objetos: [{ ref: { source: "SRD", key: "short-sword" }, cantidad: 1 }],
            monedas: { gp: 15 },
          },
        },
      ],
    },
  });
  expect(tabla.ok()).toBe(true);

  await page.getByRole("tab", { name: "Tablas" }).click();
  await expect(page.getByText("Cofre del vestíbulo")).toBeVisible();
  await page.getByRole("button", { name: "Tirar" }).click();

  const resultado = page.getByRole("status");
  // Nunca la clave: si esto se rompiera pintando la `ref` en vez del `name`, esta línea es la que
  // se pone roja.
  await expect(resultado.getByText("Espada corta")).toBeVisible();
  await expect(resultado.getByText(/15 monedas de oro/i)).toBeVisible();
  await expect(page.getByText("short-sword")).toHaveCount(0);

  await resultado.getByRole("button", { name: /dar/i }).click();
  await page.getByRole("radio", { name: "Marta" }).click();
  await page.getByRole("button", { name: "Entregar" }).click();
  await expect(page.getByText("Entregado.")).toBeVisible();

  // Se comprueba donde de verdad importa: en la bolsa de Marta, sin recargar la página. La
  // región de inventario vive en la propia página del personaje, sin una pestaña aparte (mismo
  // patrón que `inventario.spec.ts`).
  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("link", { name: "Marta" }).click();
  const inventarioDeMarta = page.getByRole("region", { name: "inventario" });
  await expect(inventarioDeMarta.getByText("Espada corta")).toBeVisible();
  // Y las monedas, no solo el objeto (arreglo de vuelta 1, I3): el puente
  // `ResultadoDeTabla` → `DarObjeto` → `changeMoney` es una petición aparte de la del objeto, y
  // hasta este arreglo nada, ni en unitarias ni aquí, comprobaba que el oro llegara de verdad.
  await expect(inventarioDeMarta.getByText("15")).toBeVisible();
});
