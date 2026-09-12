import { test, expect, type Browser, type Locator, type Page } from "@playwright/test";

// Tarea 10 (spec 2026-09-11, «la hoja a página completa») — **la hoja con pestañas, medida en
// el navegador, pestaña por pestaña.** Desde la Tarea 7 solo se monta el contenido de la pestaña
// activa, así que lo que aquí se afirma no lo puede ver ninguna prueba de componente de una
// pestaña sola: que las secciones de cada una están y las ajenas NO, que la URL recuerda la
// elegida, que la cabecera fija sigue arriba en las siete, que a 1280 las columnas van de verdad
// lado a lado (`jsdom` no maqueta), que el inventario a página filtra y equipa desde su detalle
// **y la CA de la cabecera cambia delante de quien lo hace**, y que en la mesa, a 390, la tira de
// pestañas y una fila de objeto caben y no hay panel de detalle.
//
// Decisión del autor (2026-09-11): riguroso en lo nuevo, acotado a lo nuevo. Este fichero se
// corre solo, no la suite entera.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `pestanas-${marca}@example.com`,
    password: "password123",
    displayName: `Pestañas ${marca}`,
  };
}

type Cuenta = ReturnType<typeof nuevaCuenta>;

async function registrarse(page: Page, cuenta: Cuenta) {
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();
}

async function iniciarSesion(page: Page, cuenta: Cuenta) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();
}

/** La cabecera de autorización de la sesión abierta en el navegador. Se usa para MONTAR. */
async function comoLaSesion(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem("dnd_token"));
  return { Authorization: `Bearer ${token}` };
}

/**
 * El personaje de la prueba, **montado por la API y medido en pantalla** (el mismo reparto que
 * `condiciones-con-duracion.spec.ts`): rellenar la ficha a clics son quince pasos que
 * `hoja.spec.ts` ya recorre, y aquí lo que se mide son las pestañas.
 *
 *  · **Mago** humano de nivel 1: tiene espacios de conjuro, así que la pestaña «Conjuros» existe
 *    (`lanzaConjuros`). Un guerrero no la tendría y el bucle de abajo no podría medirla.
 *  · Cuatro objetos en la mochila, todos SIN equipar para que «equipar desde el detalle» tenga
 *    algo que equipar: una **daga** (SRD, arma), una **armadura de cuero** (SRD; el catálogo la
 *    llama «Cuero», no «Armadura de cuero» — `apps/api/src/rules/catalog/armor.ts`), y dos
 *    objetos propios de la campaña porque el SRD 5.1 no trae ni consumibles ni nada que pida
 *    sintonización: una **poción de curación** (consumible) y un **anillo de protección**
 *    (`requiresAttunement`).
 */
async function montarMagoConObjetos(page: Page) {
  const headers = await comoLaSesion(page);
  const campana = await page.request.post("/api/campaigns", {
    headers,
    data: { name: "La torre de las pestañas" },
  });
  expect(campana.ok()).toBe(true);
  const campaignId: string = (await campana.json()).id;

  const personaje = await page.request.post(`/api/campaigns/${campaignId}/characters`, {
    headers,
    data: { name: "Ilyana Velaencendida" },
  });
  expect(personaje.ok()).toBe(true);
  const characterId: string = (await personaje.json()).id;

  const hoja = await page.request.patch(
    `/api/campaigns/${campaignId}/characters/${characterId}/sheet`,
    {
      headers,
      data: {
        abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10 },
        race: { source: "SRD", key: "human" },
        class: { source: "SRD", key: "wizard" },
        level: 1,
        choices: { "wizard-skills": ["arcana", "history"] },
      },
    },
  );
  expect(hoja.ok()).toBe(true);

  const pocion = await page.request.post(`/api/campaigns/${campaignId}/items`, {
    headers,
    data: { name: "Poción de curación", kind: "CONSUMABLE", weightOz: 8 },
  });
  expect(pocion.ok()).toBe(true);
  const anillo = await page.request.post(`/api/campaigns/${campaignId}/items`, {
    headers,
    data: {
      name: "Anillo de protección",
      kind: "OTHER",
      weightOz: 0,
      requiresAttunement: true,
      effects: [{ kind: "ac", amount: 1 }],
      slot: "RING_1",
    },
  });
  expect(anillo.ok()).toBe(true);

  const refs = [
    { source: "SRD", key: "dagger" },
    { source: "SRD", key: "leather" },
    { source: "CAMPAIGN", id: (await pocion.json()).id },
    { source: "CAMPAIGN", id: (await anillo.json()).id },
  ];
  for (const ref of refs) {
    const alta = await page.request.post(
      `/api/campaigns/${campaignId}/characters/${characterId}/inventory`,
      { headers, data: { ref, quantity: 1, location: "CARRIED" } },
    );
    expect(alta.ok(), `alta de ${JSON.stringify(ref)}`).toBe(true);
  }

  return { campaignId, characterId };
}

let cuenta: Cuenta;
let campaignId: string;
let characterId: string;

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  const page = await browser.newPage();
  cuenta = nuevaCuenta();
  await registrarse(page, cuenta);
  ({ campaignId, characterId } = await montarMagoConObjetos(page));
  await page.close();
});

const urlDeLaHoja = () => `/campaigns/${campaignId}/personajes/${characterId}`;

/** La cifra de la CA en la tira fija: `ValorDerivado` compacta la pinta en el botón de la traza. */
function cifraDeCA(resumen: Locator) {
  return resumen.getByText("CA", { exact: true }).locator("..").getByRole("button");
}

// --- Un `test` por pestaña ---
//
// `dentro` son los rótulos de las tarjetas de cada pestaña, buscados **por su papel de
// encabezado** dentro de la raíz de la pestaña (`TarjetaDeHoja` pinta un `<h3>`, cada zona del
// inventario un `<h2>`): un `getByText` a secas tropezaba con la `<option>` «Clase de armadura»
// del desplegable de anulaciones, que está en el documento y oculta. Los tres rótulos que NO son
// encabezado (`{ texto }`: las dos tarjetas pequeñas de «Recursos» y el estado vacío de
// «Conjuros» van en `<p>`) se buscan por texto —con `exact` cuando hace falta: «Dados de golpe»
// es también el principio de «Dados de golpe a gastar», el control del descanso corto en
// «Recursos y descansos»—, y ninguno lleva `.first()`: si un rótulo resolviera a dos nodos, es
// que la pestaña lo repite y eso se quiere saber. `fuera` se busca con
// `exact: true` y `toHaveCount(0)`: es la afirmación fuerte —lo ajeno NO está montado—.
type Rotulo = string | { texto: string | RegExp };
const PESTANAS: Array<{ id: string; rotulo: string; dentro: Rotulo[]; fuera: string[] }> = [
  {
    id: "numeros",
    rotulo: "Números",
    dentro: ["Características", "Salvaciones", "Habilidades"],
    fuera: ["Puntos de golpe", "Rasgos y aptitudes"],
  },
  {
    id: "objetos",
    rotulo: "Objetos",
    dentro: ["Equipado", "Encima", "Guardado"],
    fuera: ["Salvaciones"],
  },
  {
    id: "ataques",
    rotulo: "Ataques",
    dentro: ["Ataques y lanzamiento", "Competencias con armas"],
    fuera: ["Habilidades"],
  },
  {
    id: "recursos",
    rotulo: "Recursos",
    dentro: [
      "Puntos de golpe",
      { texto: /^Dados de golpe \(d\d+\)$/ },
      { texto: "Salvaciones de muerte" },
      "Recursos y descansos",
    ],
    fuera: ["Salvaciones"],
  },
  {
    id: "estado",
    rotulo: "Estado",
    dentro: [
      "Modificadores temporales",
      "Condiciones activas",
      "Clase de armadura",
      "Velocidad y sentidos",
    ],
    fuera: ["Habilidades"],
  },
  {
    id: "rasgos",
    rotulo: "Rasgos",
    dentro: ["Rasgos y aptitudes", "Ficha", "Personalidad"],
    fuera: ["Salvaciones"],
  },
  {
    id: "conjuros",
    rotulo: "Conjuros",
    dentro: ["Espacios de conjuro", { texto: "Los conjuros llegan con el paso 3" }],
    fuera: ["Salvaciones"],
  },
];

for (const p of PESTANAS) {
  test(`pestaña ${p.rotulo}: sus secciones están, las ajenas no, la URL la recuerda y los cinco números siguen arriba`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await iniciarSesion(page, cuenta);
    await page.goto(urlDeLaHoja());
    await page.getByRole("tab", { name: p.rotulo }).click();
    await expect(page).toHaveURL(new RegExp(`pestana=${p.id}`));

    const pestana = page.locator(`[data-pestana="${p.id}"]`);
    await expect(pestana).toBeVisible();
    for (const t of p.dentro) {
      const rotulo =
        typeof t === "string"
          ? pestana.getByRole("heading", { name: t })
          : pestana.getByText(t.texto);
      await expect(rotulo).toBeVisible();
    }
    for (const t of p.fuera) {
      await expect(page.getByText(t, { exact: true })).toHaveCount(0);
    }
    // Solo la activa está montada: siete raíces de pestaña serían siete árboles calculándose.
    await expect(page.locator("[data-pestana]")).toHaveCount(1);

    const resumen = page.getByRole("region", { name: "resumen de combate" });
    await expect(resumen).toBeVisible();
    for (const n of ["CA", "Inic.", "Vel. (pies)", "PG", "Comp."]) {
      await expect(resumen.getByText(n, { exact: true })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      1280,
    );

    await page.reload();
    await expect(page.getByRole("tab", { name: p.rotulo, selected: true })).toBeVisible();
    await expect(pestana).toBeVisible();
  });
}

test("Números a 1280: las tres columnas van lado a lado", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await iniciarSesion(page, cuenta);
  await page.goto(`${urlDeLaHoja()}?pestana=numeros`);

  const numeros = page.locator('[data-pestana="numeros"]');
  const carac = numeros
    .getByText("Características", { exact: true })
    .locator("xpath=ancestor::section[1]");
  const salv = numeros
    .getByText("Salvaciones", { exact: true })
    .locator("xpath=ancestor::section[1]");
  const habil = numeros
    .getByText("Habilidades", { exact: true })
    .locator("xpath=ancestor::section[1]");
  await expect(habil).toBeVisible();

  const a = (await carac.boundingBox())!;
  const s = (await salv.boundingBox())!;
  const b = (await habil.boundingBox())!;
  // Una columna empieza donde acaba la anterior (un píxel de tolerancia por el redondeo), y las
  // tres arrancan a la misma altura: eso es «lado a lado», no «una debajo de otra».
  expect(s.x, "Salvaciones a la derecha de Características").toBeGreaterThanOrEqual(
    a.x + a.width - 1,
  );
  expect(b.x, "Habilidades a la derecha de Salvaciones").toBeGreaterThanOrEqual(s.x + s.width - 1);
  expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(2);
  // Y ninguna columna está estrangulada: si el arreglo fuera `minmax(0,1fr)` mal puesto, una
  // de las tres saldría de treinta píxeles y la prueba de arriba pasaría igual.
  for (const [nombre, caja] of [
    ["Características", a],
    ["Salvaciones", s],
    ["Habilidades", b],
  ] as const) {
    expect(caja.width, `la columna de ${nombre} tiene que caber algo`).toBeGreaterThan(200);
  }
});

test("Objetos a 1280: lista a la izquierda, detalle a la derecha, filtros que filtran, y equipar desde el detalle cambia la CA de arriba", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await iniciarSesion(page, cuenta);
  await page.goto(`${urlDeLaHoja()}?pestana=objetos`);

  const inventario = page.getByRole("region", { name: "inventario" });
  // El detalle vive DENTRO de la región del inventario (`PaginaDeInventario.tsx`: la región es
  // la rejilla de dos columnas), así que «la lista» es su primera columna, no la región entera.
  const lista = inventario.locator("> div").first();
  const detalle = page.getByRole("complementary", { name: "detalle del objeto" });
  await expect(lista.getByRole("button", { name: "Ver detalle de Daga" })).toBeVisible();
  await expect(detalle).toBeVisible();

  const l = (await lista.boundingBox())!;
  const d = (await detalle.boundingBox())!;
  expect(d.x, "el detalle empieza donde acaba la lista").toBeGreaterThanOrEqual(l.x + l.width - 1);
  expect(Math.abs(d.y - l.y)).toBeLessThanOrEqual(2);
  expect(d.width, "el detalle no está estrangulado").toBeGreaterThan(200);

  // Filtro «qué es»: solo armaduras → la daga desaparece de la lista, la armadura sigue.
  // `exact: true` en la ficha: «Armadura» también es subcadena de otros botones de la lista.
  const chipArmadura = page.getByRole("button", { name: "Armadura", exact: true });
  await chipArmadura.click();
  await expect(chipArmadura).toHaveAttribute("aria-pressed", "true");
  await expect(lista.getByText("Daga")).toHaveCount(0);
  await expect(lista.getByText("Cuero", { exact: true })).toBeVisible();
  await chipArmadura.click();
  await expect(chipArmadura).toHaveAttribute("aria-pressed", "false");
  await expect(lista.getByText("Daga")).toBeVisible();

  // Seleccionar y equipar desde el detalle: la CA de la cabecera cambia delante de quien lo hace.
  const resumen = page.getByRole("region", { name: "resumen de combate" });
  const ca = cifraDeCA(resumen);
  const caAntes = (await ca.textContent())!.trim();
  expect(caAntes).toMatch(/^\d+$/);
  await lista.getByRole("button", { name: /ver detalle de Cuero/i }).click();
  await expect(detalle.getByRole("heading", { name: "Cuero" })).toBeVisible();
  await detalle.getByRole("button", { name: "Equipar" }).click();
  await expect(ca, "la CA de la tira sube al equipar la armadura").not.toHaveText(caAntes, {
    timeout: 15_000,
  });
  const caDespues = (await ca.textContent())!.trim();
  expect(Number(caDespues)).toBeGreaterThan(Number(caAntes));
  // Y la fila se ha ido a «Equipado» sin perder la selección: el detalle sigue siendo el suyo.
  await expect(detalle.getByRole("heading", { name: "Cuero" })).toBeVisible();

  // El camino de vuelta, desde el mismo detalle: quitarla devuelve la CA a la de antes. Es la
  // otra mitad del gesto, y de paso deja el personaje como estaba para las pruebas que siguen.
  await detalle.getByRole("button", { name: "Quitar" }).click();
  await expect(ca).toHaveText(caAntes, { timeout: 15_000 });

  // Buscar por texto sin acentos.
  // `exact`: el selector de alta, si estuviera abierto, tiene su propio «Buscar objeto por nombre».
  // Se afirma sobre las FILAS (su botón de selección), no sobre cualquier texto de la columna:
  // el aviso «Quitaste Cuero · CA 13 → 12…» sigue en la columna y nombra el objeto.
  await page.getByRole("searchbox", { name: "Buscar objeto", exact: true }).fill("pocion");
  await expect(
    lista.getByRole("button", { name: "Ver detalle de Poción de curación" }),
  ).toBeVisible();
  await expect(lista.getByRole("button", { name: "Ver detalle de Daga" })).toHaveCount(0);
  await expect(lista.getByRole("button", { name: "Ver detalle de Cuero" })).toHaveCount(0);
  await expect(lista.getByRole("button", { name: /^Ver detalle de/ })).toHaveCount(1);
});

test("en la mesa (390×844) la tira de pestañas y la fila de objeto no se cortan, y no hay panel de detalle", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await iniciarSesion(page, cuenta);

  // Una sesión en curso y el cajón «Tu hoja», como `furia.spec.ts`. Se abre a ancho de
  // escritorio: el rail de la mesa del DM a 390 px es un defecto conocido y medido aparte
  // (`mesa-en-estrecho.spec.ts`), y aquí lo que se mide es la HOJA a ese ancho, no el camino
  // hasta ella. La ventana se estrecha con el cajón ya abierto; el CSS es el mismo que vería
  // quien lo abriera desde un móvil.
  await page.goto(`/campaigns/${campaignId}`);
  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Nueva sesión" }).click();
  await page.getByLabel("Título").fill("La noche de las pestañas");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();
  const barra = page.getByRole("status", { name: "Sesión en curso" });
  await expect(barra).toBeVisible({ timeout: 10_000 });
  await barra.getByRole("link", { name: "Ir a la mesa" }).click();
  await expect(page.getByRole("banner", { name: "Estado de la mesa" })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: /^Hoja/ }).click();
  const cajon = page.getByRole("dialog", { name: "Tu hoja" });
  await expect(cajon).toBeVisible();
  await expect(cajon.getByRole("tab", { name: "Números", selected: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });

  const tablist = cajon.getByRole("tablist");
  await expect(tablist).toBeVisible();
  const t = (await tablist.boundingBox())!;
  expect(t.x, "la tira empieza dentro de la ventana").toBeGreaterThanOrEqual(0);
  expect(t.x + t.width, "la tira de pestañas cabe en 390").toBeLessThanOrEqual(390);
  // Y cada pestaña, no solo la tira: una tira que cabe con su última pestaña recortada por
  // `overflow` pasaría la medida de arriba.
  const pestanas = cajon.getByRole("tab");
  await expect(pestanas).toHaveCount(7);
  for (const caja of await pestanas.evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect().right),
  )) {
    expect(caja).toBeLessThanOrEqual(390);
  }

  await cajon.getByRole("tab", { name: "Objetos" }).click();
  const inventario = cajon.getByRole("region", { name: "inventario" });
  const fila = inventario.getByRole("listitem").filter({ hasText: "Daga" });
  await expect(fila).toBeVisible();
  const f = (await fila.boundingBox())!;
  expect(f.x).toBeGreaterThanOrEqual(0);
  expect(f.x + f.width, "la fila de objeto cabe en 390").toBeLessThanOrEqual(390);
  // Ni en la mesa hay panel de detalle ni la fila es seleccionable: eso es de la página.
  await expect(page.getByRole("complementary", { name: "detalle del objeto" })).toHaveCount(0);
  await expect(cajon.getByRole("button", { name: /^Ver detalle de/ })).toHaveCount(0);
  // Y el cajón no se desplaza a lo ancho: lo que no cabe se envuelve, no se corta. Se mide el
  // cajón y no el documento porque la mesa del DM que hay debajo tiene su propio desborde,
  // conocido y medido aparte (`mesa-en-estrecho.spec.ts`).
  const desbordaElCajon = await cajon.evaluate((el) => {
    const nodos = [
      el,
      ...Array.from(el.querySelectorAll<HTMLElement>("[data-piel='cromado'], [role='tabpanel']")),
    ];
    return nodos.some((n) => n.scrollWidth > n.clientWidth + 1);
  });
  expect(desbordaElCajon, "el cajón de la hoja no puede desplazarse en horizontal").toBe(false);
});
