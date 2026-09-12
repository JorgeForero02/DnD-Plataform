import { test, expect, type Locator, type Page } from "@playwright/test";

// Tarea 4 (plan de pulido, 2026-09-12) — **los huecos, medidos.** Anexo #17: «espacios
// perdidos», tarjetas que no llenan su columna, huecos entre bloques. `jsdom` no maqueta; esto
// sí. Los dos umbrales salen de la nota de diseño de la tarea 0
// (docs/superpowers/notes/2026-09-12-nota-de-diseno-ui-de-juegos.md § 7): son una medida de la
// casa (spec § 3, C1), sin cita externa mejor.
const HUECO_MAX_PX = 48;
const DESNIVEL_MAX_PX = 24;

// **Los e2e de este proyecto no comparten módulo hoy** (anotado tal cual, no se crea uno para
// esta tarea): `registrarse`, `crearPersonajeYAbrirFicha` y `completarFichaDeGuerreroEnano` son
// copias literales de `apps/web/e2e/hoja.spec.ts`, con el mismo nombre.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `espacios-${marca}@example.com`,
    password: "password123",
    displayName: `Espacios ${marca}`,
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

/** Crea una campaña, un personaje vacío dentro de ella, y abre su página de ficha. */
async function crearPersonajeYAbrirFicha(page: Page, nombrePersonaje: string) {
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("Los espacios de la hoja");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "Los espacios de la hoja" }).click();
  await expect(page.getByRole("heading", { name: "Los espacios de la hoja" })).toBeVisible();

  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill(nombrePersonaje);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("link", { name: new RegExp(nombrePersonaje) }).click();
  await expect(page.getByRole("heading", { name: nombrePersonaje })).toBeVisible();
}

/** Completa raza, clase, nivel y las seis características en el sitio, sin diálogo. */
async function completarFichaDeGuerreroEnano(page: Page) {
  await page.getByLabel("Raza", { exact: true }).selectOption("dwarf");
  await page.getByLabel("Clase", { exact: true }).selectOption("fighter");
  await page.getByLabel("Nivel", { exact: true }).fill("1");
  await page.getByLabel("Nivel", { exact: true }).blur();

  const caracteristicas: [string, string][] = [
    ["Fuerza", "16"],
    ["Destreza", "12"],
    ["Constitución", "14"],
    ["Inteligencia", "10"],
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

// **`abrirPestana` no se copia aquí.** `hoja.spec.ts` la usa para entrar a una pestaña haciendo
// clic en su `tab`; esta suite entra siempre por la URL (`?pestana=…`), que es la propia vía que
// prueba la Tarea 7, así que copiarla sin usarla solo dejaría un aviso de lint muerto.

/**
 * Deja una ficha de guerrero enano completa, en `/campaigns/:id/personajes/:cid`, y devuelve los
 * dos identificadores que la URL real ya lleva — no hace falta una API paralela para leerlos.
 */
async function personajeCompleto(page: Page, nombre: string) {
  await registrarse(page);
  await crearPersonajeYAbrirFicha(page, nombre);
  await completarFichaDeGuerreroEnano(page);
  const ruta = new URL(page.url()).pathname;
  const [, campaignId, characterId] = ruta.match(/\/campaigns\/([^/]+)\/personajes\/([^/]+)/)!;
  return { campaignId, characterId };
}

// Ronda de arreglo 2 (2026-09-12) — **medía ciega**. La primera versión de `medirHermanas` medía
// `:scope > *`, los hijos DIRECTOS de `[data-pestana]`. Eso funciona para Números (tres tarjetas
// como hijos directos), pero desde las Tareas 2 y 3 Rasgos y Recursos meten dos tarjetas en una
// sub-rejilla de una columna (`Rasgos.tsx`: `<div className="grid gap-s4">` con Ficha +
// Personalidad dentro) para apilarlas sin dejar un hueco de rejilla bajo la más corta — y esa
// sub-rejilla, no sus tarjetas, es el hijo directo. Mutar su `gap-s4` a `gap-[10rem]` (160px de
// hueco real bajo «Ficha») seguía en verde: el hueco vivía DENTRO del hijo directo, invisible
// desde fuera. El controlador lo destapó con esa mutación exacta.
//
// **La unidad que se mide ahora es la TARJETA, esté donde esté en el árbol**, no el hijo directo
// de la rejilla. Dos formas de tarjeta en esta hoja, confirmadas leyendo cada pestaña y cada
// componente que monta (ninguna anida la otra dentro de las cuatro pestañas que mide esta
// suite):
//
//  - `section[aria-label]` — toda `TarjetaDeHoja` (`Tarjeta.tsx`): Características, Salvaciones,
//    Habilidades, Ficha, Personalidad, Rasgos y aptitudes, Puntos de golpe, Recursos y
//    descansos, Actividades, Modificadores temporales, Condiciones activas, Clase de armadura,
//    Velocidad y sentidos, Anulaciones del DM.
//  - `[data-tarjeta]` — la caja pequeña (`CAJA_DE_HOJA`, `TarjetasDeEstado.tsx`) que se apila
//    JUNTO a una `TarjetaDeHoja` en la misma columna en vez de ir dentro de ella: Percepción
//    pasiva (bajo Salvaciones, en Números), Dados de golpe y Salvaciones de muerte (bajo Puntos
//    de golpe, en Recursos). Las seis casillas de característica (`IdentidadEditable.tsx`) usan
//    la MISMA clase pero SIN `data-tarjeta` — a propósito, para no confundirlas con esto: viven
//    DENTRO de la tarjeta «Características», no apiladas junto a ella, y contarlas como tarjeta
//    propia mediría la rejilla interna de una tarjeta, no el hueco entre tarjetas.
type Caja = { x: number; y: number; width: number; height: number };

async function medirHermanas(raiz: Locator) {
  const cajas: Caja[] = (
    await Promise.all(
      (await raiz.locator("section[aria-label], [data-tarjeta]").all()).map((h) => h.boundingBox()),
    )
  ).filter((b): b is NonNullable<typeof b> => b !== null && b.height > 0);

  // --- Huecos: sin cambios de fondo, solo sobre el conjunto de tarjetas más amplio. Dos
  //     tarjetas de la misma columna (`|x diff| < 4`) que son vecinas verticales inmediatas —
  //     ninguna otra tarjeta de esa columna cae entre ellas. Esto es lo que atrapa la mutación
  //     del controlador: Ficha y Personalidad son ambas `section[aria-label]`, comparten `x`
  //     (están en la misma sub-rejilla de una columna, y el `x` es de pantalla, no de padre en
  //     el árbol), y con `gap-[10rem]` el hueco entre ellas mide 160px > 48px.
  let huecoMax = 0;
  for (let i = 0; i < cajas.length; i++) {
    for (let j = i + 1; j < cajas.length; j++) {
      const a = cajas[i],
        b = cajas[j];
      if (Math.abs(a.x - b.x) >= 4) continue;
      const [arriba, abajo] = a.y < b.y ? [a, b] : [b, a];
      const hayAlgoEnMedio = cajas.some(
        (c) => c !== a && c !== b && Math.abs(c.x - a.x) < 4 && c.y > arriba.y && c.y < abajo.y,
      );
      if (!hayAlgoEnMedio) huecoMax = Math.max(huecoMax, abajo.y - (arriba.y + arriba.height));
    }
  }

  // --- Desnivel: **una tarjeta con otra tarjeta debajo, en su misma columna, queda exenta.**
  //     Es la regla del controlador, hecha explícita: en Números, Salvaciones y Percepción
  //     pasiva comparten columna con `items-stretch` (Ronda de arreglo de la Tarea 4) — la
  //     COLUMNA se estira para llenar la fila, no cada tarjeta suya, así que Salvaciones (más
  //     baja que Características/Habilidades porque Percepción pasiva se lleva el resto del
  //     alto) NO es un desnivel real: es media columna comparada contra una columna entera.
  //     Sin esta exención, activar la comparación sobre TODAS las tarjetas (en vez de solo los
  //     tres hijos directos) habría convertido este falso desnivel en un fallo nuevo.
  //
  //     Lo que SÍ se compara, tarjeta a tarjeta: la que queda última en su columna (o la única).
  //     Se agrupan por «fila» las que comparten techo (`|y diff| < 4`) y se mide el desnivel
  //     dentro de cada fila con 2+ tarjetas. Se descarta la fila más baja SOLO si hay más de una
  //     fila comparable — nunca la única, porque en Números esa fila única (Características vs.
  //     Habilidades, ambas sin nada debajo) es exactamente lo que esta prueba existe para vigilar
  //     y descartarla la dejaría sin comprobar nada.
  const cajasConAlgoDebajoEnSuColumna = new Set(
    cajas.filter((c) => cajas.some((d) => d !== c && Math.abs(d.x - c.x) < 4 && d.y > c.y + 4)),
  );
  const comparables = cajas
    .filter((c) => !cajasConAlgoDebajoEnSuColumna.has(c))
    .sort((a, b) => a.y - b.y);
  const filas: Caja[][] = [];
  const restantes = [...comparables];
  while (restantes.length) {
    const cabeza = restantes.shift()!;
    const fila = [cabeza];
    for (let i = restantes.length - 1; i >= 0; i--) {
      if (Math.abs(restantes[i].y - cabeza.y) < 4) fila.push(...restantes.splice(i, 1));
    }
    filas.push(fila);
  }
  const filasAComparar = filas.length > 1 ? filas.slice(0, -1) : filas;
  let desnivelMax = 0;
  for (const fila of filasAComparar) {
    if (fila.length < 2) continue;
    const altos = fila.map((c) => c.height);
    desnivelMax = Math.max(desnivelMax, Math.max(...altos) - Math.min(...altos));
  }

  return { huecoMax, desnivelMax };
}

test.describe("los espacios de la hoja a página", () => {
  for (const pestana of ["numeros", "rasgos", "recursos", "estado"]) {
    test(`pestaña ${pestana}: sin huecos > ${HUECO_MAX_PX}px ni desniveles > ${DESNIVEL_MAX_PX}px`, async ({
      page,
    }) => {
      // Ancho de escritorio a propósito: las cuatro rejillas solo se parten en columnas desde
      // `lg` (Tailwind, 1024px) — `disposicion === "pagina"` añade `lg:grid-cols-N` — y es
      // precisamente el reparto en columnas donde puede aparecer un hueco o un desnivel entre
      // vecinas. Por debajo de `lg` las cuatro son una sola columna sin nada que medir aquí.
      await page.setViewportSize({ width: 1280, height: 800 });
      const { campaignId, characterId } = await personajeCompleto(page, `Midetodo ${pestana}`);
      await page.goto(`/campaigns/${campaignId}/personajes/${characterId}?pestana=${pestana}`);
      const rejilla = page.locator(`[data-pestana="${pestana}"]`);
      await expect(rejilla).toBeVisible();
      const { huecoMax, desnivelMax } = await medirHermanas(rejilla);
      expect(huecoMax, "hueco vertical entre tarjetas hermanas").toBeLessThanOrEqual(HUECO_MAX_PX);
      expect(desnivelMax, "desnivel entre vecinas de fila").toBeLessThanOrEqual(DESNIVEL_MAX_PX);
    });
  }
});

test("el detalle de Objetos se pega bajo la banda fija, no debajo de ella (anexo #6)", async ({
  page,
}) => {
  // `lg:sticky` exige el mismo ancho de escritorio que arriba, y además es el ancho en el que
  // la pestaña Objetos pasa a dos columnas con el panel de detalle a la derecha
  // (`PaginaDeInventario`, `disposicion === "pagina"`).
  await page.setViewportSize({ width: 1280, height: 800 });
  const { campaignId, characterId } = await personajeCompleto(page, "Guardaespacio");

  // Doce objetos del catálogo, por la API — el mismo atajo que `inventario.spec.ts` usa para el
  // anillo de sintonización: crear en el catálogo de la campaña y darlo al personaje, sin pasar
  // por el selector de alta doce veces. Cantidad elegida para que la lista sea más alta que la
  // ventana y de verdad haya algo que desplazar.
  const token = await page.evaluate(() => localStorage.getItem("dnd_token"));
  const headers = { Authorization: `Bearer ${token}` };
  for (let i = 0; i < 12; i++) {
    const objeto = await page.request.post(`/api/campaigns/${campaignId}/items`, {
      headers,
      data: { name: `Baratija de prueba ${i}`, kind: "OTHER", weightOz: 1 },
    });
    expect(objeto.ok(), `crear la baratija ${i} en el catálogo`).toBe(true);
    const alta = await page.request.post(
      `/api/campaigns/${campaignId}/characters/${characterId}/inventory`,
      {
        headers,
        data: {
          ref: { source: "CAMPAIGN", id: (await objeto.json()).id },
          quantity: 1,
          location: "CARRIED",
        },
      },
    );
    expect(alta.ok(), `dar la baratija ${i} al personaje`).toBe(true);
  }

  await page.goto(`/campaigns/${campaignId}/personajes/${characterId}?pestana=objetos`);
  // Con al menos un objeto en la lista, `PaginaDeInventario` selecciona el primero por defecto
  // (`disposicion === "pagina"`) y el panel de detalle ya está montado sin hacer clic en nada.
  const detalle = page.getByRole("complementary", { name: "detalle del objeto" });
  await expect(detalle).toBeVisible();

  await page.mouse.wheel(0, 600);
  // La banda fija (`Cabecera.tsx`, `resumen de combate`) se queda pegada arriba; el detalle
  // (`DetalleDeObjeto.tsx`, `lg:sticky lg:top-[calc(var(--tira-fija-top,0px)+var(--space-4))]`)
  // se pega justo debajo de ella, nunca la solapa ni queda por encima.
  await expect.poll(async () => (await page.evaluate(() => window.scrollY)) > 0).toBe(true);
  const banda = await page.getByRole("region", { name: "resumen de combate" }).boundingBox();
  const cajaDetalle = await detalle.boundingBox();
  expect(banda).not.toBeNull();
  expect(cajaDetalle).not.toBeNull();
  expect(cajaDetalle!.y).toBeGreaterThanOrEqual(banda!.y + banda!.height - 1);
});

test("escribir una expresión inválida no cambia el alto de la tarjeta de tirar, en la pantalla de Dados (anexo #8)", async ({
  page,
}) => {
  const { campaignId } = await personajeCompleto(page, "Midemano");
  await page.goto(`/campaigns/${campaignId}`);
  await expect(page.getByRole("heading", { name: "Los espacios de la hoja" })).toBeVisible();
  await page.getByRole("tab", { name: "Dados" }).click();
  await expect(page.getByRole("heading", { name: "Dados", exact: true })).toBeVisible();

  const tarjeta = page.getByRole("region", { name: "Tirada nueva" });
  const antes = await tarjeta.boundingBox();
  expect(antes).not.toBeNull();

  // «4d» no es una expresión que el evaluador entienda (`dice.ts`), y el rechazo se pinta junto
  // al campo (`Field`, `reservaEspacio`) — que es exactamente lo que esta prueba mide: la línea
  // de pista ya reservaba su alto ANTES del error, así que el error no debería mover nada debajo.
  await page.getByLabel("Qué se tira").fill("4d");
  await page.getByRole("button", { name: "Tirar", exact: true }).click();
  await expect(tarjeta.getByRole("alert")).toBeVisible();
  const despues = await tarjeta.boundingBox();
  expect(despues).not.toBeNull();
  expect(Math.round(despues!.height)).toBe(Math.round(antes!.height));
});

// Regla del controlador (extra al brief): la misma medida, en el cajón «La mesa tira» de la
// sesión — el otro sitio donde vive `Field reservaEspacio="Qué se tira"`
// (`PanelDeDadosDeLaMesa.tsx`). El cajón es angosto (`max-w-[46rem]`, sin la columna ancha de la
// pantalla «Dados»): es justo donde una pista larga tendría más motivos para envolver y mover
// el resto del panel hacia abajo si el hueco no estuviera reservado.
test("escribir una expresión inválida no cambia el alto del panel, en el cajón «La mesa tira» (anexo #8)", async ({
  page,
}) => {
  await registrarse(page);
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La mesa que tira estrecho");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La mesa que tira estrecho" }).click();
  await expect(page.getByRole("heading", { name: "La mesa que tira estrecho" })).toBeVisible();

  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Nueva sesión" }).click();
  await page.getByLabel("Título").fill("La sesión angosta");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();
  await expect(page.getByRole("status", { name: "Sesión en curso" })).toBeVisible({
    timeout: 10_000,
  });

  const campaignId = page.url().split("/campaigns/")[1].split(/[/?]/)[0];
  await page.goto(`/campaigns/${campaignId}/sesion`);
  await expect(page.getByRole("banner", { name: "Estado de la mesa" })).toBeVisible({
    timeout: 10_000,
  });

  // Los dados no son un cajón: el botón alterna un panel anclado abajo (`RailDePaneles.tsx`),
  // y su nombre accesible arrastra el acelerador impreso debajo del rótulo («Dados» + «D»).
  await page.getByRole("button", { name: /^Dados/ }).click();
  const panel = page.getByRole("region", { name: "Tirada" });
  await expect(panel).toBeVisible();
  const antes = await panel.boundingBox();
  expect(antes).not.toBeNull();

  await panel.getByLabel("Qué se tira").fill("4d");
  await panel.getByRole("button", { name: "Tirar el dado" }).click();
  await expect(panel.getByRole("alert")).toBeVisible({ timeout: 10_000 });
  const despues = await panel.boundingBox();
  expect(despues).not.toBeNull();
  expect(Math.round(despues!.height)).toBe(Math.round(antes!.height));
});
