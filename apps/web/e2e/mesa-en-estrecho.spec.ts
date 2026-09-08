import { test, expect, type Page } from "@playwright/test";

// **La mesa del DM a 390 px, medida en un navegador de verdad.**
//
// Hermana de `mesa-mide.spec.ts`, y existe por el hueco que aquella dejó: mide en 1280 y 1920
// —«los dos tamaños que el autor usa»— y a esos anchos la rejilla del DM va sobrada. A 390 no.
//
// **Este fichero NO arregla el defecto: lo fija con números y dice por qué el arreglo no cabe en
// una sesión.** La ficha está en `docs/06-pendientes.md`. Lo que aquí hay es la demostración, que
// es lo que hoy no existía en ninguna parte.
//
// **Por qué ninguna prueba lo cazaba**, que es la mitad del hallazgo:
//
//  1. `jsdom` **no maqueta**. No hay ancho, ni posición, ni desplazamiento, así que una prueba de
//     componente que «comprueba que la clase cambió» no demuestra nada aquí.
//  2. **No hay desbordamiento de página.** La barra horizontal no aparece nunca: el armazón de la
//     mesa es `h-screen … overflow-hidden`, así que la tercera columna se sale de la ventana **en
//     silencio**. Es contenido que no cabe en su columna, no una página que crece — y por eso la
//     medida 1 de `mesa-mide` seguía en verde con esto roto. La prueba 1 de abajo lo fija.
//  3. La medida 4 de `mesa-mide` barre `main [aria-label], main section` buscando paneles cortados
//     **en vertical**. El `aside` de las herramientas no tiene `aria-label` y su corte es
//     **horizontal**: doblemente fuera de su alcance.
//
// La causa: `main` lleva `grid-cols-[17rem_1fr_15rem]` **sin un solo punto de ruptura**. Son
// 512 px de pistas que no encogen, más dos huecos, dentro de una ventana de 390.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `mesa-estrecho-${marca}@example.com`,
    password: "password123",
    displayName: `Estrecho ${marca}`,
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

/**
 * Una campaña con la sesión **en curso**, que es el único estado donde la mesa se pinta.
 *
 * A diferencia de `mesa-mide`, aquí **no** se siembran doce anotaciones: lo que se mide es
 * anchura, y un hilo vacío mide igual de ancho que uno lleno.
 */
async function mesaDelDmEnCurso(page: Page) {
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La mesa estrecha");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La mesa estrecha" }).click();
  await expect(page.getByRole("heading", { name: "La mesa estrecha" })).toBeVisible();

  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Nueva sesión" }).click();
  await page.getByLabel("Título").fill("El almacén cuatro");
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
}

// 390×844 es el iPhone 12/13/14. Se mide ahí y no en 375 porque es el ancho que nombra el
// encargo; `navegar-en-estrecho.spec.ts` ya cubre 375, y para otra cosa: la navegación.
const VENTANA = { width: 390, height: 844 };

const herramientasDelDm = (page: Page) =>
  page.locator('main aside:has(h2:text-is("Herramientas del DM"))');

// --- 1 · Lo que hoy PASA, y por eso el defecto vivía escondido ---
//
// Esta prueba está en verde con la mesa rota, y es su razón de ser: **deja escrito que la
// ausencia de barra horizontal no dice nada** sobre si la mesa cabe. Quien mida «la página no
// desborda» y concluya «entonces cabe» está cometiendo el error que esto documenta.
test("a 390 px la página no delata nada: no hay barra horizontal aunque la mesa no quepa", async ({
  page,
}) => {
  await page.setViewportSize(VENTANA);
  await registrarse(page);
  await mesaDelDmEnCurso(page);

  const medida = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }));
  expect(medida.scrollWidth).toBeLessThanOrEqual(medida.innerWidth + 2);
  expect(medida.scrollHeight).toBeLessThanOrEqual(medida.innerHeight + 2);

  // Y sin embargo el panel se sale. Las dos cosas a la vez son el hallazgo, así que se afirman
  // juntas: la página se comporta y el contenido no se ve.
  //
  // Se afirma sobre el **borde derecho** y no sobre `x`: el panel arranca dentro de la ventana
  // (≈310 px) y termina fuera (≈550), así que es su final lo que está perdido, no su principio.
  // Medirlo por `x` daría un verde que diría lo contrario de lo que pasa.
  //
  // **ATENCIÓN: esta aserción fija el DEFECTO, no un invariante.** Está en una prueba sin
  // `test.fail` porque lo que la rodea sí es invariante, así que **se pondrá roja el día que la
  // mesa se arregle** — igual que el `test.fail` de abajo, pero sin anunciarlo en su título. El
  // mensaje lo dice para que quien la vea en rojo sepa que es la señal buena y qué hacer.
  const caja = await herramientasDelDm(page).boundingBox();
  expect(caja).not.toBeNull();
  expect(
    caja!.x + caja!.width,
    "Si esto falla, la mesa a 390 px SE ARREGLÓ: quita esta aserción, cierra la ficha de " +
      "06-pendientes y convierte el `test.fail` de abajo en un `test` normal.",
  ).toBeGreaterThan(medida.innerWidth);
});

// --- 2 · El defecto, fijado con número ---
//
// **`test.fail()` no es una prueba desactivada**: declara que hoy esto falla y **se pone roja si
// algún día pasa**, que es justo lo que se quiere el día que alguien lo arregle. Se usa aquí, y no
// un `skip`, porque el encargo era demostrar que está roto — y una prueba que no se ejecuta no
// demuestra nada.
//
// Medido el 2026-09-07: el borde derecho del panel cae en **550 px dentro de una ventana de 390**.
test.fail(
  "a 390 px las Herramientas del DM caben en la ventana — ROTO, ver ficha en 06-pendientes",
  async ({ page }) => {
    await page.setViewportSize(VENTANA);
    await registrarse(page);
    await mesaDelDmEnCurso(page);

    const herramientas = herramientasDelDm(page);
    await expect(herramientas).toBeVisible();

    // **Todas las aserciones de esta prueba son `expect.soft` a propósito.** Con `expect` normal
    // la primera —la que falla hoy— aborta el resto, y las cuatro guardas de más abajo serían
    // código que **no se ejecuta nunca** hasta el día que alguien cambie la maqueta: guardas sin
    // estrenar que nadie sabe si funcionan. En modo blando se evalúan las cinco en cada pasada, el
    // informe las enseña juntas, y el `test.fail` sigue contando el fallo igual.

    // --- A · Dónde acaba el panel ---
    //
    // Se mide el **borde derecho** contra el ancho de la ventana, no la anchura del panel: 240 px
    // de panel son correctos si empieza en 150 y catastróficos si empieza en 512. Lo que se ve —o
    // no se ve— es dónde acaba. **Esta es la que falla hoy**: 550 > 392.
    const caja = await herramientas.boundingBox();
    expect(caja).not.toBeNull();
    expect
      .soft(caja!.x + caja!.width, "el panel acaba fuera de la ventana")
      .toBeLessThanOrEqual(VENTANA.width + 2);
    expect.soft(caja!.x, "el panel empieza fuera por la izquierda").toBeGreaterThanOrEqual(-2);

    // --- B · Y sus seis botones, uno por uno ---
    //
    // El panel podría caber y su contenido no.
    for (const nombre of [
      "Revelar algo",
      "Pedir tirada",
      "Avanzar el reloj",
      "Sacar criatura",
      "Bloques de reglas",
      "Tablas",
    ]) {
      const cajaBoton = await herramientas.getByRole("button", { name: nombre }).boundingBox();
      expect(cajaBoton, `«${nombre}» no tiene caja`).not.toBeNull();
      expect
        .soft(cajaBoton!.x + cajaBoton!.width, `«${nombre}» se sale por la derecha`)
        .toBeLessThanOrEqual(VENTANA.width + 2);
    }

    // --- C, D y E · Las tres guardas que impiden el arreglo falso ---
    //
    // No son decorativas: la primera versión del arreglo —apilar en una columna con
    // `grid-cols-1` hasta `lg`— pasaba A y B y caía en estas. Con 466 px de alto para `main`
    // repartidos entre tres regiones, el elenco quedaba con **16 px de alto bajo una cabecera de
    // 36** (medido el 2026-09-07): el corte giraba 90° en vez de desaparecer.

    // C · El hilo conserva un ancho legible. Dejar que el centro absorba el estrangulamiento y
    // colapse a nada cumpliría A y B siendo inservible.
    const cajaHilo = await page.getByRole("list", { name: "Sucesos de la sesión" }).boundingBox();
    expect(cajaHilo).not.toBeNull();
    expect.soft(cajaHilo!.width, "el hilo colapsó a un ancho ilegible").toBeGreaterThanOrEqual(240);

    // D · **Ninguna región queda más baja que su propia cabecera.** Esta es la guarda directa
    // contra lo que se midió, y hace falta escrita **en altura**: E depende de que la envoltura
    // aplastada conserve `overflow` visible para delatarse —lo hizo las dos veces que se probó,
    // pero es una condición prestada, no la propiedad que se quiere—. Un panel de 52 px con
    // cabecera de 36 deja 16 para su contenido: eso no es un panel, es un rótulo.
    // Se barren **`section` y `aside`, no `[aria-label]`**: aquel selector recogía el rail
    // (`nav`, 80 px es su alto correcto — es una barra, no un panel) y el campo «Qué anotar»
    // (42 px, un control), y una guarda que grita por dos cosas sanas se acaba ignorando. Medido
    // el 2026-09-07 al estrenarla.
    const bajitos = await page.evaluate(() => {
      const malos: string[] = [];
      document.querySelectorAll<HTMLElement>("main section, main aside").forEach((el) => {
        if (el.clientHeight >= 120) return;
        malos.push(`${el.getAttribute("aria-label") ?? el.tagName}=${el.clientHeight}px`);
      });
      return malos;
    });
    expect.soft(bajitos, "hay regiones aplastadas por debajo de lo utilizable").toEqual([]);

    // E · Y ninguna queda cortada sin con qué desplazarse: contenido inalcanzable, no recortado.
    // Es la medida 4 de `mesa-mide` traída a este ancho y ampliada a `main aside`, porque el panel
    // de las herramientas no tiene `aria-label` y aquel barrido no lo miraba.
    const cortados = await page.evaluate(() => {
      const malos: string[] = [];
      document
        .querySelectorAll<HTMLElement>("main [aria-label], main section, main aside")
        .forEach((el) => {
          if (el.scrollHeight <= el.clientHeight + 2) return;
          if (["auto", "scroll"].includes(getComputedStyle(el).overflowY)) return;
          malos.push(el.getAttribute("aria-label") ?? `${el.tagName}.${el.className.slice(0, 40)}`);
        });
      return malos;
    });
    expect.soft(cortados, "hay paneles cortados sin con qué desplazarse").toEqual([]);
  },
);
