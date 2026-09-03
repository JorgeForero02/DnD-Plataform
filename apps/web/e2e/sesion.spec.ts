import { test, expect, type Page } from "@playwright/test";

// La sesión de juego, contra la API real.
//
// Lo que cubre y ninguna unitaria puede: que el ciclo entero —empezar, sellar, ver el registro,
// cerrar con la crónica ya escrita— funciona de punta a punta contra Postgres, y sobre todo
// **que lo que se anota durante la sesión queda dentro de ella**. Ese era el fallo que lo
// justificaba: la API distinguía tres estados desde 2A.5, ninguna pantalla los enseñaba, nadie
// empezaba una sesión, y todo el combate se grababa con `sessionId` nulo.
//
// Y la medición de contraste, porque `jsdom` no maqueta: la barra es un elemento nuevo pegado a
// la cabecera, sobre una superficie translúcida con desenfoque, y eso solo se comprueba mirando
// el estilo **calculado** en un navegador de verdad.
//
// **Añadido al adoptar la maqueta (2026-09-02):** tres recorridos más, y los tres son cosas que
// `jsdom` no puede ver o que solo existen contra la base real:
//  · que la barra y la cabecera **ya no se solapan** — era un defecto de maquetación, y un
//    defecto de maquetación exige una prueba de navegador;
//  · que el elenco de la mesa pinta los puntos de golpe **de la hoja calculada** y que «−5» los
//    baja de verdad, dos endpoints y una derivación de por medio;
//  · que una anotación aparece en el registro con **su chip de clase y su autor**.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `sesion-${marca}@example.com`,
    password: "password123",
    displayName: `Sesion ${marca}`,
  };
}

async function registrarse(page: Page) {
  const cuenta = nuevaCuenta();
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Mis campañas" })).toBeVisible();
  return cuenta;
}

async function crearCampanaConSesion(page: Page) {
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La mesa de prueba");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La mesa de prueba" }).click();
  await expect(page.getByRole("heading", { name: "La mesa de prueba" })).toBeVisible();

  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Nueva sesión" }).click();
  await page.getByLabel("Título").fill("El puerto en llamas");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();
}

/**
 * Un personaje con **hoja completa**, que es la única forma de que tenga puntos de golpe: los PG
 * máximos son un valor **derivado** del catálogo (dado de golpe de la clase + modificador de
 * Constitución), no una columna que se escriba a mano. Sin raza, clase y características no hay
 * `maxHp`, y el elenco de la mesa lo diría — «Sin puntos de golpe en la hoja» — con razón.
 *
 * Misma receta que `hoja.spec.ts`: enano guerrero de nivel 1 con Constitución 14, o sea 12 PG.
 */
async function crearPersonajeConHoja(page: Page, nombre: string) {
  await page.getByRole("tab", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("link", { name: new RegExp(nombre) }).click();
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();

  await page.getByLabel("Raza", { exact: true }).selectOption("dwarf");
  await page.getByLabel("Clase", { exact: true }).selectOption("fighter");
  await page.getByLabel("Nivel", { exact: true }).fill("1");
  await page.getByLabel("Nivel", { exact: true }).blur();
  for (const [etiqueta, valor] of [
    ["Fuerza", "16"],
    ["Destreza", "12"],
    ["Constitución", "14"],
    ["Inteligencia", "10"],
    ["Sabiduría", "10"],
    ["Carisma", "8"],
  ] as [string, string][]) {
    const campo = page.getByLabel(etiqueta, { exact: true });
    await campo.fill(valor);
    // Salir del campo ES el guardado: teclear no escribe, terminar de teclear sí.
    await campo.blur();
  }
  // `exact` importa: desde que la hoja tiene su tarjeta de «Salvaciones de muerte», un
  // `getByText("Salvaciones")` casa con las dos y falla por modo estricto. El agente que la
  // añadió lo arregló en `hoja.spec.ts`, pero esta receta está copiada en tres ficheros más.
  await expect(page.getByText("Salvaciones", { exact: true })).toBeVisible({ timeout: 15_000 });
}

test("la sesión entera: empezar, sellar, verlo en la mesa, y cerrar con la crónica ya escrita", async ({
  page,
}) => {
  await registrarse(page);
  await crearCampanaConSesion(page);

  // --- Antes de empezar: no hay barra. El estado «en juego» no se inventa. ---
  await expect(page.getByRole("status", { name: "Sesión en curso" })).toBeHidden();

  // --- Empezar ---
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();

  // La barra aparece **en toda la campaña**, no solo en una pantalla: ese es su motivo de ser.
  const barra = page.getByRole("status", { name: "Sesión en curso" });
  await expect(barra).toBeVisible({ timeout: 10_000 });
  await expect(barra).toContainText("El puerto en llamas");
  await expect(barra).toContainText("En juego");

  // --- Sellar desde la barra, sin salir de donde estés ---
  await page.getByRole("button", { name: "Anotar" }).click();
  await page.getByLabel("Qué anotar").fill("los guardias del muelle");
  await page
    .getByRole("button", { name: /Combate/ })
    .first()
    .click();
  await expect(page.getByText("Anotado: Combate.")).toBeVisible({ timeout: 10_000 });

  // --- La mesa: el sello está ahí, en prosa y no como clave ---
  // Hay dos: el de la barra y el de la fila de la sesión. Se usa el de la barra a propósito,
  // porque es el que existe desde CUALQUIER pantalla de la campaña.
  await barra.getByRole("link", { name: "Ir a la mesa" }).click();
  await expect(page.getByRole("heading", { name: "La mesa", exact: true })).toBeVisible();
  const sucesos = page.getByRole("list", { name: "Sucesos de la sesión" });
  await expect(sucesos.getByText("Combate: los guardias del muelle")).toBeVisible({
    timeout: 10_000,
  });
  // Y el suceso de apertura de la sesión, también traducido.
  await expect(sucesos.getByText(/Empieza la sesión/)).toBeVisible();

  // La banda de estado dice de qué sesión se trata sin tener que leer el registro. Y como nadie
  // declaró asistencia, **lo dice** en vez de inventarse una cifra.
  const banda = page.getByRole("region", { name: "Estado de la sesión" });
  await expect(banda).toContainText("El puerto en llamas");
  await expect(banda).toContainText("asistencia sin declarar");

  // El DM puede mirar por los ojos de otro. Con un solo miembro no hay a quién elegir, pero el
  // control tiene que estar: es la única forma honesta de fiarse de los cinco niveles.
  await expect(page.getByLabel("Ver el registro como")).toBeVisible();

  // --- Cerrar: la crónica sale pre-rellenada con los sellos ---
  await page.goBack();
  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  const cronica = page.getByLabel("Qué pasó");
  await expect(cronica).toHaveValue(/· Combate: los guardias del muelle/, { timeout: 10_000 });

  await page.getByRole("button", { name: "Cerrar la sesión" }).click();

  // Cerrada: la barra desaparece de toda la aplicación.
  await expect(page.getByRole("status", { name: "Sesión en curso" })).toBeHidden({
    timeout: 15_000,
  });
  await expect(page.getByText(/^Cerrada/)).toBeVisible();
});

test("la barra de «en juego» se pega DEBAJO de la cabecera y no encima de ella", async ({
  page,
}) => {
  // **El defecto que esto cierra** (ficha en `docs/06-pendientes.md`): las dos eran
  // `sticky top-0`, así que al desplazar la cabecera tapaba la barra entera. Ninguna prueba
  // unitaria podía verlo — `jsdom` no maqueta: no hay alto, ni posición, ni desplazamiento.
  //
  // Y hay una segunda trampa que esta prueba también cubre: **`sticky` se pega dentro de su
  // padre**. La barra vive ahora dentro de un envoltorio pegado (para que el panel de sellos
  // viaje con ella); envolverla en un contenedor equivocado la soltaría del todo, y eso solo se
  // nota desplazando de verdad.
  await registrarse(page);
  await crearCampanaConSesion(page);
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();
  await expect(page.getByRole("status", { name: "Sesión en curso" })).toBeVisible({
    timeout: 10_000,
  });

  // **Se encoge la ventana antes de desplazar, y no es un truco.** La mesa cabe entera en 720 px
  // de alto, así que con la ventana normal solo hay 80 px de recorrido y la comprobación «de
  // verdad se ha desplazado» se caía por falta de página, no por un defecto. Con 400 px de alto
  // hay recorrido real y la aserción sigue siendo fuerte.
  await page.setViewportSize({ width: 1280, height: 400 });
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(300);

  const medido = await page.evaluate(() => {
    const cabecera = document.querySelector("header") as HTMLElement;
    const barra = document.querySelector('[aria-label="Sesión en curso"]') as HTMLElement;
    const c = cabecera.getBoundingClientRect();
    const b = barra.getBoundingClientRect();
    return {
      cabeceraAbajo: c.bottom,
      barraArriba: b.top,
      barraAbajo: b.bottom,
      alturaVentana: window.innerHeight,
      desplazamiento: window.scrollY,
      posicionDelEnvoltorio: getComputedStyle(barra.parentElement as HTMLElement).position,
    };
  });

  console.log("\n=== Barra de sesión, medida tras desplazar ===", medido);

  // De verdad se ha desplazado: si no, la prueba pasaría por construcción.
  expect(medido.desplazamiento).toBeGreaterThan(100);
  // Sigue pegada (no se ha ido con el desplazamiento) …
  expect(medido.posicionDelEnvoltorio).toBe("sticky");
  expect(medido.barraArriba).toBeLessThan(medido.alturaVentana / 2);
  // … y **debajo** de la cabecera, no debajo de sus píxeles. Un píxel de margen por el redondeo
  // de los rectángulos del navegador.
  expect(medido.barraArriba).toBeGreaterThanOrEqual(medido.cabeceraAbajo - 1);
  // Alto real: una franja, no una segunda cabecera.
  expect(medido.barraAbajo - medido.barraArriba).toBeLessThanOrEqual(48);
});

test("el elenco de la mesa lee los PG de la hoja calculada, y «−5» los baja de verdad", async ({
  page,
}) => {
  // Tres cosas que solo existen contra la API real: que `maxHp` sale de derivar el catálogo,
  // que el elenco pide la hoja de cada personaje declarado presente, y que el delta relativo se
  // aplica en el servidor dentro de una transacción.
  const cuenta = await registrarse(page);
  await crearCampanaConSesion(page);
  await crearPersonajeConHoja(page, "Borin Barbaférrea");

  // Volver a la campaña y empezar la sesión **declarando** quién vino y con qué personaje: la
  // asistencia se declara, no se detecta.
  await page.getByRole("link", { name: "La mesa de prueba" }).click();
  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByLabel(cuenta.displayName).check();
  await page
    .getByLabel(`Personaje de ${cuenta.displayName}`)
    .selectOption({ label: "Borin Barbaférrea" });
  await page.getByRole("button", { name: "Empezar la sesión" }).click();

  const barra = page.getByRole("status", { name: "Sesión en curso" });
  await expect(barra).toBeVisible({ timeout: 10_000 });
  await barra.getByRole("link", { name: "Ir a la mesa" }).click();

  const elenco = page.getByRole("region", { name: "En la mesa" });
  await expect(elenco.getByText("Borin Barbaférrea")).toBeVisible({ timeout: 15_000 });
  // El descriptor traducido, nunca la clave del catálogo.
  await expect(elenco).toContainText("Enano · Guerrero · Nivel 1");
  await expect(elenco).toContainText(`Lo lleva ${cuenta.displayName}`);
  // Guerrero enano de nivel 1 con Constitución **14 escrita en la hoja**: el enano suma +2 a
  // Constitución, así que el motor deriva 16 y un modificador de +3 — dado de golpe 10 + 3 = 13.
  // Esta prueba decía 12 porque olvidaba el bono racial; **la hoja tenía razón y la prueba no**,
  // que es justo la clase de fallo que sale al correrla contra la API de verdad.
  await expect(elenco.getByText("13/13")).toBeVisible({ timeout: 15_000 });
  await expect(
    elenco.getByRole("img", { name: "Borin Barbaférrea: 13 de 13 puntos de golpe" }),
  ).toBeVisible();

  // La banda ya cuenta a quien se declaró.
  await expect(page.getByRole("region", { name: "Estado de la sesión" })).toContainText(
    "1 en la mesa",
  );

  await elenco
    .getByRole("button", { name: "Quitar 5 puntos de golpe a Borin Barbaférrea" })
    .click();
  await expect(elenco.getByText("8/13")).toBeVisible({ timeout: 10_000 });
  await expect(
    elenco.getByRole("img", { name: "Borin Barbaférrea: 8 de 13 puntos de golpe" }),
  ).toBeVisible();

  // Y el golpe queda en el registro de la sesión, en prosa: es el motivo por el que la mesa
  // existe. `−5` no es un control de la interfaz, es un suceso de la partida.
  await expect(
    page.getByRole("list", { name: "Sucesos de la sesión" }).getByText("Pierde 5 PG (13 → 8)"),
  ).toBeVisible({ timeout: 15_000 });
});

test("una anotación hecha desde la mesa aparece con su chip de clase y con quién la puso", async ({
  page,
}) => {
  const cuenta = await registrarse(page);
  await crearCampanaConSesion(page);
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();
  const barra = page.getByRole("status", { name: "Sesión en curso" });
  await expect(barra).toBeVisible({ timeout: 10_000 });
  await barra.getByRole("link", { name: "Ir a la mesa" }).click();

  const registro = page.getByRole("region", { name: "Registro de la sesión" });
  await registro.getByLabel("Qué anotar").fill("media carta con el sello de la Casa");
  await registro.getByRole("button", { name: /Hallazgo/ }).click();

  // El chip se busca **dentro de la lista de sucesos**, no en la región: los seis botones de
  // sellar repiten los mismos nombres, y una búsqueda en la región entera pasaría en verde
  // aunque el chip desapareciera. Esa confusión se coló en una prueba unitaria de esta misma
  // tanda y la cazó la comprobación por mutación.
  const sucesos = page.getByRole("list", { name: "Sucesos de la sesión" });
  await expect(sucesos.getByText("Hallazgo", { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(sucesos.getByText("Hallazgo: media carta con el sello de la Casa")).toBeVisible();
  // Quién lo puso, que es la mitad de para qué sirve un registro que se relee.
  // `.first()`: el sello y la anotación son **dos** sucesos, así que la firma aparece dos veces.
  // Que aparezca es lo que se comprueba; cuántas veces depende de cuántas cosas se anoten.
  await expect(sucesos.getByText(new RegExp(`^${cuenta.displayName} ·`)).first()).toBeVisible();
});

test("contraste medido en la barra de sesión y en la mesa", async ({ page }) => {
  await registrarse(page);
  await crearCampanaConSesion(page);
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();
  await expect(page.getByRole("status", { name: "Sesión en curso" })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("link", { name: "Ir a la mesa" }).first().click();
  await expect(page.getByRole("region", { name: "Estado de la sesión" })).toBeVisible({
    timeout: 15_000,
  });

  // El mismo método que `tokens-contrast.spec.ts`: se compone el alfa contra lo que hay detrás y
  // se mide el color **calculado**, no el declarado.
  //
  // **Los elementos se buscan por `data-medida`, no contando `span`s.** La versión anterior
  // leía «el segundo `span` de la barra», y bastaba meter un separador entre medias para que
  // midiera otra cosa sin que nada avisara. Un número que se mide tiene que saber qué mide.
  const medido = await page.evaluate(() => {
    const rgb = (c: string): [number, number, number] => {
      const m = c.match(/[\d.]+/g)!.map(Number);
      return [m[0], m[1], m[2]];
    };
    const alfa = (c: string): number => {
      const m = c.match(/[\d.]+/g)!.map(Number);
      return m.length > 3 ? m[3] : 1;
    };
    const sobre = (frente: string, fondo: [number, number, number]): [number, number, number] => {
      const f = rgb(frente);
      const a = alfa(frente);
      return [0, 1, 2].map((i) => f[i] * a + fondo[i] * (1 - a)) as [number, number, number];
    };
    const lum = ([r, g, b]: [number, number, number]) => {
      const c = [r, g, b].map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const ratio = (a: [number, number, number], b: [number, number, number]) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };

    // **No sirve `document.body`**: su fondo es transparente porque el color lo pinta el div
    // del armazón. Medir contra él daba 1.03:1 — el negro por defecto contra el negro por
    // defecto — y habría dejado pasar cualquier cosa. Se busca el ancestro que sí pinta.
    const opaco = (el: Element | null): [number, number, number] => {
      let n: Element | null = el;
      while (n) {
        const c = getComputedStyle(n).backgroundColor;
        if (alfa(c) > 0.99) return rgb(c);
        n = n.parentElement;
      }
      return [0, 0, 0];
    };
    const fondoPagina = opaco(document.querySelector(".bg-bg"));
    const barra = document.querySelector('[aria-label="Sesión en curso"]') as HTMLElement;
    const fondoBarra = sobre(getComputedStyle(barra).backgroundColor, fondoPagina);

    const salida: { que: string; valor: number; minimo: number }[] = [];
    const texto = (sel: string, que: string, fondo: [number, number, number], minimo = 4.5) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) throw new Error(`No existe el elemento a medir: ${sel}`);
      salida.push({ que, valor: ratio(sobre(getComputedStyle(el).color, fondo), fondo), minimo });
    };

    texto('[data-medida="en-juego"]', "barra: «En juego» (cobre)", fondoBarra);
    texto('[data-medida="titulo"]', "barra: título de la sesión", fondoBarra);
    texto('[data-medida="duracion"]', "barra: tiempo transcurrido", fondoBarra);
    texto('[data-medida="ir-a-la-mesa"]', "barra: «Ir a la mesa»", fondoBarra);
    salida.push({
      que: "barra: filete inferior",
      valor: ratio(sobre(getComputedStyle(barra).borderBottomColor, fondoPagina), fondoPagina),
      minimo: 3,
    });

    // La mesa adoptada de la maqueta: sus paneles y su banda son superficies nuevas, y las
    // superficies nuevas se miden. El fondo del panel es `--surface` sobre la cuadrícula.
    const banda = document.querySelector('[aria-label="Estado de la sesión"]') as HTMLElement;
    const fondoBanda = sobre(getComputedStyle(banda).backgroundColor, fondoPagina);
    const tituloBanda = banda.querySelector("h2") as HTMLElement;
    salida.push({
      que: "mesa: título de la sesión en la banda",
      valor: ratio(sobre(getComputedStyle(tituloBanda).color, fondoBanda), fondoBanda),
      minimo: 4.5,
    });
    const cifras = banda.querySelector("p") as HTMLElement;
    salida.push({
      que: "mesa: duración y asistencia (cifras)",
      valor: ratio(sobre(getComputedStyle(cifras).color, fondoBanda), fondoBanda),
      minimo: 4.5,
    });
    salida.push({
      que: "mesa: filete de cobre de la banda",
      valor: ratio(sobre(getComputedStyle(banda).borderTopColor, fondoPagina), fondoPagina),
      minimo: 3,
    });

    const panel = document.querySelector('[aria-label="Registro de la sesión"]') as HTMLElement;
    const fondoPanel = sobre(getComputedStyle(panel).backgroundColor, fondoPagina);
    const cabeceraPanel = panel.querySelector("h2") as HTMLElement;
    salida.push({
      que: "mesa: cabecera del panel",
      valor: ratio(sobre(getComputedStyle(cabeceraPanel).color, fondoPanel), fondoPanel),
      minimo: 4.5,
    });
    salida.push({
      que: "mesa: filete que separa la cabecera del panel",
      valor: ratio(
        sobre(getComputedStyle(panel.querySelector("div")!).borderBottomColor, fondoPanel),
        fondoPanel,
      ),
      minimo: 3,
    });

    return salida;
  });

  console.log("\n=== Contraste WCAG medido (barra de sesión y mesa) ===");
  for (const m of medido) {
    console.log(
      `${m.que}: ${m.valor.toFixed(2)}:1 (necesita ${m.minimo}:1) — ${m.valor >= m.minimo ? "PASS" : "FAIL"}`,
    );
    expect(m.valor, m.que).toBeGreaterThanOrEqual(m.minimo);
  }
});
