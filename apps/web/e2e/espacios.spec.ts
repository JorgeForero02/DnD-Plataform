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

/** Huecos verticales entre hijos directos, y desnivel entre vecinos de la misma fila. */
async function medirHermanas(rejilla: Locator) {
  const cajas = (
    await Promise.all((await rejilla.locator(":scope > *").all()).map((h) => h.boundingBox()))
  ).filter((b): b is NonNullable<typeof b> => b !== null && b.height > 0);
  let huecoMax = 0;
  let desnivelMax = 0;
  for (let i = 0; i < cajas.length; i++) {
    for (let j = i + 1; j < cajas.length; j++) {
      const a = cajas[i],
        b = cajas[j];
      const mismaFila = Math.abs(a.y - b.y) < 4;
      const mismaColumna = Math.abs(a.x - b.x) < 4;
      if (mismaFila && j < cajas.length - 1)
        desnivelMax = Math.max(desnivelMax, Math.abs(a.height - b.height));
      if (mismaColumna) {
        const [arriba, abajo] = a.y < b.y ? [a, b] : [b, a];
        // Solo hermanas consecutivas en la columna: otra caja en medio no cuenta como hueco.
        const hayAlgoEnMedio = cajas.some(
          (c) => c !== a && c !== b && Math.abs(c.x - a.x) < 4 && c.y > arriba.y && c.y < abajo.y,
        );
        if (!hayAlgoEnMedio) huecoMax = Math.max(huecoMax, abajo.y - (arriba.y + arriba.height));
      }
    }
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
