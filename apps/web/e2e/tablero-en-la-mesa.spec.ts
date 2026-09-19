import { test, expect, type Page } from "@playwright/test";

// **El tablero PlanarAlly enmarcado en el centro de la mesa (C1 bis, D-CF-63).**
//
// `jsdom` no maqueta: un `<iframe>` con `flex-1 min-h-0` y una columna lateral que scrollea por
// su cuenta son exactamente el tipo de comportamiento que solo se ve en un navegador de verdad
// (la misma razón de ser que `mesa-mide.spec.ts`, que esta suite deja intacta — se corre justo
// después para comprobar que la rama SIN sala no cambió).
//
// **Task 5 (3A.3) quitó el cajón inferior plegable.** El registro no se pliega ni cuenta líneas
// nuevas: es la columna lateral de siempre (`ColumnaDelRegistro`, con sus filtros «Todo · Relato
// · Números»), que se muda ahí cuando el tablero le quita el centro. Las medidas de este fichero
// se ajustaron a esa columna — ver el comentario de cada prueba.
//
// La «sala» de la prueba es **nuestra propia página** `/acerca-de` (mismo origen): el e2e no sale
// a internet, y nuestra web no manda `X-Frame-Options` ni CSP que bloquee su propio iframe.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `tablero-mesa-${marca}@example.com`,
    password: "password123",
    displayName: `Tablero ${marca}`,
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

/**
 * Una campaña con sesión **empezada** y el hilo **lleno** — copiado de `mesa-mide.spec.ts`
 * (mismos nombres, mismo gesto, **las mismas doce anotaciones**): con menos líneas un hilo roto
 * y uno correcto miden igual, y esta suite necesita exactamente eso para comprobar que el hilo
 * scrollea por dentro del cajón (IMPORTANT #2 de la ronda de revisión) en vez de comerse el
 * marco.
 */
async function campanaConSesionYHiloLargo(page: Page) {
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La mesa con tablero");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La mesa con tablero" }).click();
  await expect(page.getByRole("heading", { name: "La mesa con tablero" })).toBeVisible();

  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Nueva sesión" }).click();
  await page.getByLabel("Título").fill("El almacén cuatro");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();
  const barra = page.getByRole("status", { name: "Sesión en curso" });
  await expect(barra).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "Anotar" }).click();
  const campo = page.getByLabel("Qué anotar");
  const sellarCombate = page.getByRole("button", { name: /Combate/ }).first();
  for (let i = 0; i < 12; i++) {
    await expect(campo).toHaveValue("");
    await campo.fill(`la línea número ${i + 1} del almacén`);
    await expect(sellarCombate).toBeEnabled();
    await sellarCombate.click();
  }

  await barra.getByRole("link", { name: "Ir a la mesa" }).click();
  await expect(page.getByRole("banner", { name: "Estado de la mesa" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.getByRole("list", { name: "Sucesos de la sesión" }).getByText(/la línea número 12/),
  ).toBeVisible({ timeout: 15_000 });
}

/** El id de campaña sale de la URL de la mesa: `/campaigns/<id>/sesion`. */
function campaignIdDeLaMesa(page: Page): string {
  const m = new URL(page.url()).pathname.match(/^\/campaigns\/([^/]+)\/sesion$/);
  if (!m) throw new Error(`No se reconoce el id de campaña en ${page.url()}`);
  return m[1];
}

/** Guarda la propia `/acerca-de` de la app como «sala del tablero», desde Ajustes. */
async function guardarSalaPropia(page: Page, campaignId: string) {
  const sala = `${new URL(page.url()).origin}/acerca-de`;
  await page.goto(`/campaigns/${campaignId}?seccion=settings`);
  await page.getByRole("tab", { name: "Ajustes", selected: true }).waitFor();
  await page.getByLabel("Dirección de la sala").fill(sala);
  await page.getByRole("button", { name: "Guardar la sala" }).click();
  await expect(page.getByRole("button", { name: "Quitar la sala" })).toBeVisible();
}

// Task 5 (3A.3) — **el cajón inferior desapareció.** El registro ya no vive debajo del marco,
// plegable con un contador: es la columna LATERAL de siempre (`ColumnaDelRegistro`, con sus
// filtros), que la Task 5 muda ahí cuando el centro se lo lleva el tablero. Las medidas de esta
// prueba pasan de «el cajón no se come el marco» a las dos que de verdad importan ahora: **el
// marco ocupa la mayoría del alto de `main`** (sin un cajón inferior disputándole la fila) y **el
// registro lateral es visible y scrollea por panel** — la misma sonda de `mesa-mide.spec.ts`.
test("con sala guardada, el marco ocupa el centro sin scroll de página y el registro lateral scrollea por panel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await registrarse(page);
  await campanaConSesionYHiloLargo(page);
  const campaignId = campaignIdDeLaMesa(page);

  await guardarSalaPropia(page, campaignId);

  await page.goto(`/campaigns/${campaignId}/sesion`);
  const marcoLocator = page.locator("iframe[title='Sala del tablero']");
  const marco = page.frameLocator("iframe[title='Sala del tablero']");
  await expect(marco.getByRole("heading", { level: 1 })).toBeVisible();

  // La raíz de la mesa es `h-screen overflow-hidden`: esta medida es **vacía por construcción**
  // —nunca podría fallar, la raíz no scrollea aunque el marco esté a 0 px—, y se deja solo por
  // paridad con `mesa-mide.spec.ts`.
  const scrollDePagina = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight + 2,
  );
  expect(scrollDePagina).toBe(false);

  // (c) **El marco ocupa al menos el 60 % del alto de `main`.** Sin cajón que le dispute la fila
  //     de abajo, el tablero (con su cabecera y la barra de acciones debajo) es la pieza que
  //     domina la columna central — el 60 % deja margen para esa barra sin fingir que el marco
  //     ocupa el 100 %.
  const mainBox = await page.locator("main").boundingBox();
  const marcoBox = await marcoLocator.boundingBox();
  expect(mainBox).not.toBeNull();
  expect(marcoBox).not.toBeNull();
  expect(marcoBox!.height).toBeGreaterThanOrEqual(mainBox!.height * 0.6);

  // (d) El hilo, ahora en la columna LATERAL, scrollea POR DENTRO — la misma sonda de
  //     `mesa-mide.spec.ts` (`overflowY` resuelto y `scrollHeight > clientHeight`): doce líneas no
  //     caben en la altura de la columna, así que si esto pasa es porque el `overflow-y-auto` del
  //     propio hilo se activó, y no la rejilla estirándose para hacerle sitio.
  const hilo = page.getByRole("list", { name: "Sucesos de la sesión" });
  const medidaHilo = await hilo.evaluate((el) => ({
    overflowY: getComputedStyle(el).overflowY,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));
  expect(["auto", "scroll"]).toContain(medidaHilo.overflowY);
  expect(medidaHilo.scrollHeight).toBeGreaterThan(medidaHilo.clientHeight);

  // (e) El compositor («Qué anotar», el mismo textarea de `HiloDeSesion`) sigue DENTRO de la
  //     ventana: no lo recorta el `overflow-hidden` de la raíz de la mesa.
  const compositor = await page.getByLabel("Qué anotar").boundingBox();
  expect(compositor).not.toBeNull();
  expect(compositor!.y + compositor!.height).toBeLessThanOrEqual(800);

  // (f) El registro lateral ES una columna, visible a la derecha del marco — no un cajón
  //     superpuesto ni un panel oculto.
  const registroBox = await page
    .getByRole("region", { name: "Registro de la sesión" })
    .boundingBox();
  expect(registroBox).not.toBeNull();
  expect(registroBox!.x).toBeGreaterThanOrEqual(marcoBox!.x + marcoBox!.width - 1);

  // (g) Fix round 1 — **la cabecera «Registro en vivo», con sus filtros dentro, no pasa de
  //     48 px de alto.** Vivían como un `GrupoDeRadios` completo encima del panel (~200 px); el
  //     ruling los mudó a un segmento inline DENTRO de esta misma cabecera (`role="radiogroup"
  //     aria-label="Qué se ve"`, tres chips de una palabra) — ver `OPCIONES_DE_FILTRO` en
  //     `HiloDeSesion.tsx`. Esta es la medida que demuestra que el bloque volvió a caber en una
  //     cabecera normal, no en un panel aparte.
  // D-CF-149: la cabecera se llama «Registro», como en el prototipo (antes «Registro en vivo»).
  const cabeceraDelRegistro = page
    .getByRole("heading", { name: "Registro", exact: true })
    .locator("xpath=..");
  const cabeceraBox = await cabeceraDelRegistro.boundingBox();
  expect(cabeceraBox).not.toBeNull();
  expect(cabeceraBox!.height).toBeLessThanOrEqual(48);

  // Y los tres filtros de verdad están ahí, dentro de esa misma cabecera.
  const filtros = page.getByRole("radiogroup", { name: "Qué se ve" });
  await expect(filtros).toBeVisible();
  await expect(filtros.getByRole("radio", { name: "Todo" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});

// **La mesa a 390 px sigue aplazada (D-CF-26): la rejilla de tres columnas no se apila ahí, y la
// columna central queda estrujada a un ancho inútil.** Por eso todo el montaje —registro,
// campaña, sesión, hilo lleno, sala guardada, abrir la mesa y esperar el marco— se hace a
// 1280×800, donde la mesa sí funciona, y **solo entonces** se cambia el tamaño de la ventana.
//
// **Task 5 cambia QUÉ se mide a 390 px, no que siga aplazada.** Antes de esta tarea el registro
// vivía DEBAJO del marco, en la misma columna central —a 390 px se apilaban, y el orden se medía
// en `y`—. Ahora el registro es la columna LATERAL de 18rem, a la DERECHA del marco: sin ningún
// punto de ruptura (el mismo defecto de siempre, D-CF-26), a 390 px las dos columnas siguen
// intentando convivir lado a lado en vez de apilarse.
//
// **Ola post-revisión de 3A.3 (M9): `test.fail`, con la medida BUENA.** Hasta la ola esta prueba
// exigía en verde que el registro cayera a la DERECHA del marco a 390 px — es decir, consagraba la
// geometría rota de D-CF-26 como «así debe ser», y un arreglo de la mesa en estrecho la habría
// puesto en rojo. Ahora afirma lo que debería pasar (el registro APILADO debajo del marco) y se
// declara `fail`, como ya hace `mesa-en-estrecho.spec.ts`: el día que la mesa se apile, Playwright
// avisará de que «pasó inesperadamente» y se quita el `fail`. Sigue sin medir que la mesa quepa o
// se lea a ese ancho.
test.fail(
  "a 390 px el registro lateral debería quedar DEBAJO del marco (la mesa a 390 sigue aplazada: D-CF-26)",
  async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await registrarse(page);
    await campanaConSesionYHiloLargo(page);
    const campaignId = campaignIdDeLaMesa(page);

    await guardarSalaPropia(page, campaignId);

    await page.goto(`/campaigns/${campaignId}/sesion`);
    const marcoLocator = page.locator("iframe[title='Sala del tablero']");
    await expect(marcoLocator).toBeAttached();
    await expect(
      page.frameLocator("iframe[title='Sala del tablero']").getByRole("heading", { level: 1 }),
    ).toBeVisible();

    // La medida buena: apilado, el registro debajo del marco. Hoy falla (columnas fijas sin
    // ruptura, D-CF-26) y por eso la prueba es `test.fail`.
    await page.setViewportSize({ width: 390, height: 844 });
    const marco = await marcoLocator.boundingBox();
    const registro = await page
      .getByRole("region", { name: "Registro de la sesión" })
      .boundingBox();
    expect(marco).not.toBeNull();
    expect(registro).not.toBeNull();
    expect(registro!.y).toBeGreaterThanOrEqual(marco!.y + marco!.height - 1);
  },
);
