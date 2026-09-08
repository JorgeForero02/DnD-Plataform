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
// **Esta prueba siembra por la API, y desde la ficha P2-2 (2026-09-07) ya NO es porque la pantalla
// no sepa** — sabe, y lo demuestra la prueba del final de este fichero. Se conserva sembrando por
// la API a propósito: lo que mide es la mitad de «enseñar y dar» —la tirada enseña el objeto por
// su nombre y darlo lo mete en la bolsa de otro—, y llegar hasta aquí redactando la entrega a mano
// alargaría el recorrido sin medir nada nuevo. Aquí ponía que el formulario «no tiene todavía
// campos para `entrega`»; eso caducó con esa ficha. Por eso la tabla con botín se siembra por la API
// (mismo patrón que `condiciones-en-la-mesa.spec.ts`), y lo que se mide en el navegador es la
// mitad que sí se construyó: la tirada enseña el objeto por su nombre, no por su clave, y darlo
// a un segundo personaje lo hace aparecer en su inventario sin recargar.
test("tirar una tabla de botín enseña el objeto por su nombre y dárselo lo mete en su bolsa", async ({
  page,
}) => {
  await abrirTablas(page);
  const url = page.url();
  // La navegación por secciones va en `?seccion=`, no en un segmento de ruta (ver
  // `CampaignDetailPage.tsx`): la URL abierta en «Tablas» es `/campaigns/<id>?seccion=tables`.
  // Cortar solo por "/" dejaba el `?seccion=tables` pegado al id y la siembra por API pedía una
  // ruta que no existe.
  const campaignId = url.split("/campaigns/")[1].split(/[/?]/)[0];

  // Un segundo personaje, para tener a quién dárselo: el DM no se da cosas a sí mismo en esta
  // prueba porque eso no demuestra el radio de destinatario.
  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill("Marta");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  // `HojaCalculada` no monta `PaginaDeInventario` (y por tanto no hay region «inventario»)
  // mientras la hoja está a medias — necesita raza, clase y las seis características. Un
  // personaje recién creado no trae nada de eso, así que sin este paso la comprobación de más
  // abajo nunca encontraría la bolsa de Marta. No es lo que este encargo mide —eso ya lo cubre
  // `inventario.spec.ts`—, así que se completa por la API y no por el formulario.
  await page.getByRole("link", { name: "Marta" }).click();
  await expect(page.getByRole("heading", { name: "Marta" })).toBeVisible();
  const characterId = page.url().split("/personajes/")[1];
  const hojaDeMarta = await page.request.patch(
    `/api/campaigns/${campaignId}/characters/${characterId}/sheet`,
    {
      headers: await comoLaSesion(page),
      data: {
        abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "fighter" },
        level: 1,
      },
    },
  );
  expect(hojaDeMarta.ok()).toBe(true);

  // Vuelve a la pestaña «Tablas» por la propia URL: tras el PATCH ya no hay un cajón abierto que
  // cerrar, y `?seccion=` es justo el mecanismo que la nota de arriba describe para llegar ahí.
  await page.goto(`/campaigns/${campaignId}?seccion=tables`);
  await expect(page.getByRole("heading", { name: "Tablas del DM" })).toBeVisible();

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

  // Se siembra por la API, no por la pantalla (comentario de cabecera): la lista de tablas la
  // trae `useQuery` con su caché normal, que no se entera de una fila que entró por fuera hasta
  // que algo la fuerce a pedirla otra vez — mismo patrón que `comoLaSesion` deja escrito en
  // `condiciones-en-la-mesa.spec.ts` para la ficha sembrada por API.
  await page.reload();
  await page.getByRole("tab", { name: "Tablas" }).click();
  await expect(page.getByText("Cofre del vestíbulo")).toBeVisible();
  await page.getByRole("button", { name: "Tirar" }).click();

  const resultado = page.getByRole("status");
  // `exact: true`: sin él, «Espada corta» también casa por subcadena con el párrafo del texto
  // de la fila («…Una espada corta y quince monedas de oro.») y el localizador cae en modo
  // estricto con dos elementos — la misma trampa que ya avisa el encargo para `furia.spec.ts`.
  // Nunca la clave: si esto se rompiera pintando la `ref` en vez del `name`, esta línea es la que
  // se pone roja.
  await expect(resultado.getByText("Espada corta", { exact: true })).toBeVisible();
  await expect(resultado.getByText(/15 monedas de oro/i)).toBeVisible();
  await expect(page.getByText("short-sword")).toHaveCount(0);

  await resultado.getByRole("button", { name: /dar/i }).click();
  await page.getByRole("radio", { name: "Marta" }).click();
  await page.getByRole("button", { name: "Entregar" }).click();
  await expect(page.getByText("Entregado.")).toBeVisible();
  // «Dar…» es su propio cajón (`DarObjeto` monta un `Dialog`) y queda abierto tras entregar: hay
  // que cerrarlo o su velo tapa el botón «Personajes» de detrás (misma razón que ya se documenta
  // arriba para el cajón de «Personajes»).
  await page.keyboard.press("Escape");

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

// **Ficha P2-2 — la prueba que decide si el eslabón está puesto.**
//
// Todo lo demás de esta ficha es andamiaje; esto es lo único que demuestra que un DM puede sembrar
// una fila con botín **desde la pantalla**, sin un `curl` y sin tocar la base, y que lo que sembró
// se entrega de verdad al tirar. Recorre el ida y vuelta entero: formulario → `POST` → columna
// `Json` → `resolverEntrega` → pantalla.
//
// **Y edita-y-guarda, que es la mitad que casi se pierde.** El defecto que esta ficha destapó no
// era el de crear: `DmTableEntry` no declaraba `entrega` en la web, así que abrir el formulario de
// una tabla con botín y pulsar «Guardar cambios» **la borraba** —las filas se reemplazan enteras y
// el servicio las borra y las vuelve a crear—. Por eso el recorrido no termina al crear: edita el
// texto, guarda, y vuelve a tirar para comprobar que el botín sigue ahí.
test("el DM redacta la entrega desde la pantalla, y sobrevive a editar la tabla", async ({
  page,
}) => {
  await abrirTablas(page);

  await page.getByRole("button", { name: "Crear tabla" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Cofre redactado a mano");
  // Una sola fila que cubre el 1: la tabla se tira con un d1 y siempre cae aquí, así que la
  // prueba no depende del azar.
  await page.getByLabel("Desde", { exact: true }).first().fill("1");
  await page.getByLabel("Hasta", { exact: true }).first().fill("1");
  await page.getByLabel("Resultado", { exact: true }).first().fill("Lo que hay en el cofre.");

  // --- La entrega, en su propio panel ---
  await page.getByRole("button", { name: /Entrega de la fila 1: no entrega nada/ }).click();
  const panel = page.getByRole("dialog", { name: /Entrega de la fila 1/ });
  await expect(panel).toBeVisible();

  await panel.getByLabel("Buscar en el catálogo").fill("Espada corta");
  await panel.getByRole("button", { name: "Espada corta" }).click();
  await panel.getByLabel("Cuántas").fill("2");
  await panel.getByRole("button", { name: "Añadir a la entrega" }).click();
  // **Objetos Y monedas a la vez**, que es lo que el esquema permite y la pantalla no puede
  // impedir.
  await panel.getByLabel("oro").fill("15");
  await panel.getByRole("button", { name: "Guardar la entrega" }).click();

  // El botón lo dice **sin abrirse**: es la mitad de la decisión de esconderlo en un panel.
  await expect(
    page.getByRole("button", { name: /Entrega de la fila 1: 1 objeto y monedas/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Guardar tabla" }).click();
  await expect(page.getByText("Cofre redactado a mano")).toBeVisible();

  // --- Y se tira: lo sembrado a mano se entrega ---
  await page.getByRole("button", { name: "Tirar" }).click();
  const resultado = page.getByRole("status");
  // **Sin `exact: true`, y a diferencia de la prueba de arriba**: aquí se sembraron DOS unidades,
  // así que `ResultadoDeTabla` pinta «Espada corta x2» y una coincidencia exacta no casa. La
  // trampa que obligaba a `exact` allí —el nombre repetido en el texto de la fila— no existe aquí
  // porque el texto de esta fila no nombra la espada. Y la cantidad **se afirma**: es la mitad de
  // lo que se redactó a mano, y sin comprobarla la prueba pasaría con un 1 escrito por defecto.
  await expect(resultado.getByText(/Espada corta x2/)).toBeVisible();
  await expect(resultado.getByText(/15 monedas de oro/i)).toBeVisible();
  // Nunca la clave del catálogo.
  await expect(page.getByText("short-sword")).toHaveCount(0);

  // --- Editar y guardar NO se lleva el botín por delante ---
  await page.getByRole("button", { name: /Editar/ }).click();
  await page
    .getByLabel("Resultado", { exact: true })
    .first()
    .fill("Lo que hay en el cofre, atado.");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Lo que hay en el cofre, atado.")).toBeVisible();

  await page.getByRole("button", { name: "Tirar" }).click();
  await expect(resultado.getByText(/Espada corta x2/)).toBeVisible();
  await expect(resultado.getByText(/15 monedas de oro/i)).toBeVisible();
});
