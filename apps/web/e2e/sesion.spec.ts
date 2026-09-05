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
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();
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
  await page.getByRole("button", { name: "Personajes" }).click();
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
  // Ola 0 (2026-09-04): sin `AppShell` no hay `PageHeader`, así que el título «La mesa» ya no
  // existe. Su banda superior es lo que dice que has llegado, y es un `banner` porque la mesa
  // ocupa la ventana. **Lo que se comprueba no cambia.**
  await expect(page.getByRole("banner", { name: "Estado de la mesa" })).toBeVisible();
  const sucesos = page.getByRole("list", { name: "Sucesos de la sesión" });
  // Lo que se comprueba es lo de siempre: el sello puesto desde la barra **llega a la mesa, en
  // prosa y no como clave**. Desde que el hilo pinta los cinco tipos de mensaje, la clase va en
  // la banda de cobre y el texto debajo, así que se busca el texto de la anotación en vez de la
  // frase entera de `lineaDeLog` («Combate: los guardias del muelle»), que repetía la palabra.
  await expect(sucesos.getByText("Combate", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(sucesos.getByText("los guardias del muelle")).toBeVisible();
  // Y el suceso de apertura de la sesión, también traducido.
  await expect(sucesos.getByText(/Empieza la sesión/)).toBeVisible();

  // La banda de estado dice de qué sesión se trata sin tener que leer el registro. Y como nadie
  // declaró asistencia, **lo dice** en vez de inventarse una cifra.
  const banda = page.getByRole("banner", { name: "Estado de la mesa" });
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

  // **Quién puede leer la crónica se elige aquí, y es una decisión aparte de quién ve la sesión.**
  // El servidor respeta `recapVisibility` desde el plan 02; hasta entonces publicaba el suceso con
  // la visibilidad de la SESIÓN y elegir no hacía nada. Sin este control, el arreglo del servidor
  // no lo usaría nadie.
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByRole("radio", { name: /Solo el DM/i })).toBeVisible();
  // Y los niveles se ofrecen **traducidos**: ningún valor del enum llega a la pantalla.
  await expect(dialogo.getByText(/DM_ONLY|PLAYERS|PUBLIC/)).toHaveCount(0);
  await dialogo.getByRole("radio", { name: /Todos los que se sientan/i }).check();

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
  // Carril C2: el nombre aparece ahora tres veces en la ficha —el rótulo y los `sr-only` de
  // «Daño a …» y «Abrir la ficha de …»—, así que se pide el primero. **Lo que se comprueba es lo
  // mismo: que el personaje está en el elenco.**
  await expect(elenco.getByText("Borin Barbaférrea").first()).toBeVisible({ timeout: 15_000 });
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
  await expect(page.getByRole("banner", { name: "Estado de la mesa" })).toContainText(
    "1 en la mesa",
  );

  // Carril C2 (2026-09-04) — **el gesto cambió, lo que se mide no.** En la disposición del DM la
  // ficha ya no lleva los ±5: lleva los mandos de la maqueta, y «Daño» abre un cajón donde se
  // escribe cuánto. Esta prueba sigue siendo la única que demuestra de punta a punta que el
  // delta ATERRIZA EN EL SERVIDOR —los PG bajan de verdad y el suceso se escribe en prosa—, así
  // que se reescribe el gesto y se conservan las tres aserciones de después.
  await elenco.getByRole("button", { name: "Daño a Borin Barbaférrea" }).click();
  const cajonDeDano = page.getByRole("dialog", { name: "Daño · Borin Barbaférrea" });
  await cajonDeDano.getByLabel("Cuánto daño").fill("5");
  await cajonDeDano.getByRole("button", { name: "Aplicar daño" }).click();
  // El cajón se cierra solo cuando el servidor responde: si sigue abierto, la mutación falló.
  await expect(cajonDeDano).toBeHidden({ timeout: 10_000 });
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
  // Y el texto de la anotación, que es la otra mitad. Va debajo de la banda desde que el hilo
  // pinta los cinco tipos de mensaje de la maqueta; antes se pedía la frase entera de
  // `lineaDeLog` («Hallazgo: media carta…»), que repetía la clase que la banda ya dice.
  await expect(sucesos.getByText("media carta con el sello de la Casa")).toBeVisible();
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
  // **La barra se mide ANTES de entrar a la mesa, y esto es una consecuencia directa de la Ola 0**
  // que costó un rojo: la mesa dejó de ir dentro de `AppShell`, así que `BarraDeSesion` **ya no se
  // pinta ahí**. Medir las dos superficies en la misma pantalla dejó de ser posible, y el
  // `getComputedStyle` de una barra inexistente reventaba el evaluate entero. Se mide cada una
  // donde vive: la barra en la campaña, la banda en la mesa.

  // La barra vive en la campaña: se mide aquí, antes de irse.

  // El mismo método que `tokens-contrast.spec.ts`: se compone el alfa contra lo que hay detrás y
  // se mide el color **calculado**, no el declarado.
  //
  // **Los elementos se buscan por `data-medida`, no contando `span`s.** La versión anterior
  // leía «el segundo `span` de la barra», y bastaba meter un separador entre medias para que
  // midiera otra cosa sin que nada avisara. Un número que se mide tiene que saber qué mide.
  const medirLoQueHaya = () =>
    page.evaluate(() => {
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
      const barra = document.querySelector('[aria-label="Sesión en curso"]') as HTMLElement | null;

      const salida: { que: string; valor: number; minimo: number }[] = [];
      const texto = (sel: string, que: string, fondo: [number, number, number], minimo = 4.5) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (!el) throw new Error(`No existe el elemento a medir: ${sel}`);
        salida.push({ que, valor: ratio(sobre(getComputedStyle(el).color, fondo), fondo), minimo });
      };

      if (barra) {
        const fondoBarra = sobre(getComputedStyle(barra).backgroundColor, fondoPagina);
        texto('[data-medida="en-juego"]', "barra: «En juego» (cobre)", fondoBarra);
        texto('[data-medida="titulo"]', "barra: título de la sesión", fondoBarra);
        texto('[data-medida="duracion"]', "barra: tiempo transcurrido", fondoBarra);
        texto('[data-medida="ir-a-la-mesa"]', "barra: «Ir a la mesa»", fondoBarra);
        salida.push({
          que: "barra: filete inferior",
          valor: ratio(sobre(getComputedStyle(barra).borderBottomColor, fondoPagina), fondoPagina),
          minimo: 3,
        });
      }

      // La mesa adoptada de la maqueta: sus paneles y su banda son superficies nuevas, y las
      // superficies nuevas se miden. El fondo del panel es `--surface` sobre la cuadrícula.
      // Ola 0 (2026-09-04): la banda pasó de `<section aria-label="Estado de la sesión">` dentro
      // del armazón a la CABECERA de una mesa a pantalla completa. Su título dejó de ser un `h2`
      // —el nombre de la campaña es un enlace, porque desde la mesa se vuelve a ella— así que se
      // mide ese enlace. **Lo que se comprueba es lo mismo: que el texto de la banda se lee sobre
      // su propio fondo.**
      const banda = document.querySelector(
        '[aria-label="Estado de la mesa"]',
      ) as HTMLElement | null;
      if (!banda) return salida;
      const fondoBanda = sobre(getComputedStyle(banda).backgroundColor, fondoPagina);
      const tituloBanda = banda.querySelectorAll("a")[1] as HTMLElement;
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

  // **Cada superficie se mide donde vive, y se juntan.** Antes las dos se medían en la misma
  // pantalla porque la mesa iba dentro de `AppShell` y arrastraba la barra consigo. Ya no: la
  // función de arriba se salta lo que no encuentra, así que en la campaña devuelve lo de la barra
  // y en la mesa lo de la banda y el panel.
  const enLaCampana = await medirLoQueHaya();
  await page
    .getByRole("status", { name: "Sesión en curso" })
    .getByRole("link", { name: "Ir a la mesa" })
    .click();
  await expect(page.getByRole("banner", { name: "Estado de la mesa" })).toBeVisible({
    timeout: 15_000,
  });
  const enLaMesa = await medirLoQueHaya();
  const medido = [...enLaCampana, ...enLaMesa];

  // Si alguna de las dos pantallas dejara de tener sus superficies, esto mediría **menos cosas y
  // seguiría en verde**. Se fija cuántas trae cada una.
  expect(enLaCampana.length, "medidas de la barra de sesión").toBeGreaterThan(0);
  expect(enLaMesa.length, "medidas de la mesa").toBeGreaterThan(0);

  console.log("\n=== Contraste WCAG medido (barra de sesión y mesa) ===");
  for (const m of medido) {
    console.log(
      `${m.que}: ${m.valor.toFixed(2)}:1 (necesita ${m.minimo}:1) — ${m.valor >= m.minimo ? "PASS" : "FAIL"}`,
    );
    expect(m.valor, m.que).toBeGreaterThanOrEqual(m.minimo);
  }
});

// B1 (2026-09-04) — **la mesa deja de ser inalcanzable fuera de sesión.**
//
// Es el defecto que el reseño clasifica como de arquitectura y no de acabado: `MesaDeSesion` no
// estaba en la lista de pestañas y solo se llegaba por dos enlaces que **existían únicamente
// mientras había una sesión en curso**. Diecinueve destinos en una campaña, y el único para el que
// existe el producto no estaba en ninguno; por URL directa contestaba un cartel de vacío.
//
// Se mide en el navegador porque es navegación —`jsdom` no navega— y porque lo que hay que
// demostrar es el camino entero: desde la campaña, sin sesión abierta, hasta una mesa que dice
// algo.
test("se llega a la mesa desde la campaña sin sesión abierta, y no es un cartel de vacío", async ({
  page,
}) => {
  await registrarse(page);
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("Campaña en reposo");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "Campaña en reposo" }).click();
  await expect(page.getByRole("heading", { name: "Campaña en reposo" })).toBeVisible();

  // **El enlace existe sin sesión**, que es justo lo que no pasaba, y dice qué te vas a encontrar.
  const aLaMesa = page.getByRole("link", { name: /^Entrar a la mesa/ });
  await expect(aLaMesa).toBeVisible();
  await expect(aLaMesa).toContainText("en reposo");
  await aLaMesa.click();

  // La mesa en reposo **es uno de sus tres estados**, no su ausencia: la cabecera de escena está,
  // con la hora del mundo, y el registro y la consulta siguen ahí.
  const escena = page.getByRole("region", { name: "La escena" });
  await expect(escena).toBeVisible();
  await expect(escena).toContainText("La mesa, en reposo");
  // El reloj de campaña, que llevaba semanas sondeando para nadie, por fin se pinta donde se juega.
  await expect(escena).toContainText("Día 1");
  await expect(escena).toContainText("00:00");
  // **Y el DM empieza la sesión desde aquí** (B4), que es la otra mitad del mismo defecto: hasta
  // hoy el cartel del reposo te mandaba al taller, o sea que para empezar a jugar había que salir
  // del sitio donde se juega. Sin ninguna sesión planificada no se inventa una — se enlaza.
  await expect(page.getByText(/La mesa está en reposo/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Planificar una en el taller" })).toBeVisible();
  // **La consulta del mundo ya no es una columna fija** (B1.3): se llega por el rail, que sí
  // está siempre. Lo que esta prueba defiende es que en reposo la mesa **no es un cartel de
  // vacío**, y el rail es parte de eso — desde aquí se consulta el mundo sin salir.
  await expect(page.getByRole("navigation", { name: "Paneles de la mesa" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Paneles de la mesa" })
    .getByRole("button", { name: /Mundo/ })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Consulta del mundo");
});

// Y con sesión en curso la misma cabecera dice de qué sesión se trata y quién está. Es la mitad
// que convierte una columna de texto en un sitio: *un hilo a secas es un tablón, no un escenario.*
test("en sesión, la cabecera de escena nombra la sesión y a quien está en la mesa", async ({
  page,
}) => {
  await registrarse(page);
  await crearCampanaConSesion(page);
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();
  const barra = page.getByRole("status", { name: "Sesión en curso" });
  await barra.getByRole("link", { name: "Ir a la mesa" }).click();

  const escena = page.getByRole("region", { name: "La escena" });
  await expect(escena).toBeVisible();
  await expect(escena).toContainText("Escena actual");
  await expect(escena).toContainText("El puerto en llamas");

  // Y lo que solo se ve maquetado: la cabecera de escena **no se solapa** con la banda de estado
  // que va justo encima. Las dos son del estrato permanente y viven pegadas; un solape aquí es
  // exactamente el defecto de borde partido que la suite unitaria entera no puede ver.
  const banda = page.getByRole("banner", { name: "Estado de la mesa" });
  const cajaBanda = await banda.boundingBox();
  const cajaEscena = await escena.boundingBox();
  expect(cajaBanda).not.toBeNull();
  expect(cajaEscena).not.toBeNull();
  expect(
    cajaEscena!.y,
    `banda=${JSON.stringify(cajaBanda)} escena=${JSON.stringify(cajaEscena)}`,
  ).toBeGreaterThanOrEqual(cajaBanda!.y + cajaBanda!.height);
  // Los dos ejes, como manda docs/08-pruebas.md: una cabecera de altura cero pasaría lo de arriba.
  expect(cajaEscena!.height).toBeGreaterThan(40);
});

// B1.2 (2026-09-04) — **las dos disposiciones del elenco, y la regla que las separa.**
//
// Sale de una frase del autor que invierte el modelo de Baldur's Gate 3: *«en BG3 es un jugador
// manejando varios; acá somos varios manejando uno propio»*. En BG3 los retratos del grupo son
// mandos —pulsas uno y pasas a controlarlo—; aquí no pueden serlo, porque el personaje de otro no
// es tuyo. De ahí la regla vinculante del reseño: **sobre el retrato de otro no van botones.**
//
// Se mide con **dos contextos de navegador** —cookies y almacenamiento propios, como dos
// ordenadores— porque lo que hay que demostrar es que **el mismo elenco se ve distinto según
// quién mira**, y eso una prueba de componente con la sesión simulada no lo demuestra: se lo cree.
test("el jugador ve su personaje delante, y sobre el de otro NO hay mandos", async ({
  browser,
}) => {
  // Dos registros, dos hojas completas y un flujo de invitación entero: es el recorrido más
  // largo de la suite y no cabe en el minuto por defecto. Se le da margen en vez de recortar lo
  // que mide.
  test.setTimeout(180_000);

  const contextoDm = await browser.newContext();
  const contextoJugadora = await browser.newContext();
  const paginaDm = await contextoDm.newPage();
  const paginaJugadora = await contextoJugadora.newPage();

  // El DM monta la mesa y crea SU personaje antes de invitar: así su navegador no tiene que
  // volver a la hoja después, y la prueba mide el elenco y no la navegación.
  await registrarse(paginaDm);
  await crearCampanaConSesion(paginaDm);
  await crearPersonajeConHoja(paginaDm, "Borin");
  await paginaDm.getByRole("link", { name: "La mesa de prueba" }).click();

  await paginaDm.getByRole("tab", { name: "Ajustes" }).click();
  await paginaDm.getByRole("button", { name: "Generar invitación" }).click();
  const enlace = await paginaDm.getByLabel("Enlace de invitación").inputValue();

  // La jugadora entra por el enlace, se registra desde ahí y crea el suyo.
  await paginaJugadora.goto(enlace);
  await paginaJugadora.getByRole("link", { name: "Crear cuenta" }).click();
  const suya = nuevaCuenta();
  await paginaJugadora.getByLabel("Nombre").fill(suya.displayName);
  await paginaJugadora.getByLabel("Correo").fill(suya.email);
  await paginaJugadora.getByLabel("Contraseña").fill(suya.password);
  await paginaJugadora.getByRole("button", { name: "Crear cuenta" }).click();
  await paginaJugadora.getByRole("button", { name: "Unirse a la campaña" }).click();
  await expect(paginaJugadora.getByRole("heading", { name: "La mesa de prueba" })).toBeVisible();
  await crearPersonajeConHoja(paginaJugadora, "Sirella");
  await paginaJugadora.getByRole("link", { name: "La mesa de prueba" }).click();

  await paginaDm.getByRole("tab", { name: "Sesiones" }).click();
  await paginaDm.getByRole("button", { name: "Empezar" }).click();
  await paginaDm.getByRole("button", { name: "Empezar la sesión" }).click();

  // --- Lo que ve la jugadora ---
  await paginaJugadora.reload();
  await paginaJugadora.getByRole("link", { name: /^Entrar a la mesa/ }).click();
  const elenco = paginaJugadora.getByRole("region", { name: "En la mesa" });
  await expect(elenco).toBeVisible();

  // El suyo delante con su rótulo; el de otro, en segundo plano.
  await expect(elenco.getByText("Tu personaje")).toBeVisible();
  await expect(elenco.getByText("El resto del grupo")).toBeVisible();

  // **Y la regla que importa**: mandos sobre el suyo, ninguno sobre el de otro. No es que el
  // botón no funcione —el servidor ya lo rechaza con `requireEditable`—: es que enseñar un mando
  // que va a dar 403 es prometer algo falso.
  // Primero se espera a que la hoja derivada llegue: los mandos de PG solo existen cuando hay
  // máximo, y el máximo es un valor DERIVADO del catálogo, no una columna. Sin esta espera la
  // prueba mediría la carrera entre dos consultas y no la regla.
  await expect(
    elenco.getByRole("img", { name: /Sirella: \d+ de \d+ puntos de golpe/ }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    elenco.getByRole("button", { name: /puntos de golpe a Sirella/ }).first(),
  ).toBeVisible();
  await expect(elenco.getByRole("button", { name: /puntos de golpe a Borin/ })).toHaveCount(0);

  // --- Y lo que ve el DM: la parrilla de todos, con mandos sobre cada uno ---
  // Y el DM recarga por lo mismo: su lista se pidió antes de que la jugadora creara el suyo.
  await paginaDm.reload();
  await paginaDm.getByRole("link", { name: /^Entrar a la mesa/ }).click();
  const elencoDm = paginaDm.getByRole("region", { name: "En la mesa" });
  // Misma espera que arriba, y por el mismo motivo: los mandos existen cuando la hoja derivada
  // ha llegado, y son dos consultas distintas.
  await expect(
    elencoDm.getByRole("img", { name: /Sirella: \d+ de \d+ puntos de golpe/ }),
  ).toBeVisible({ timeout: 15_000 });
  // Carril C2 (2026-09-04) — **la regla que se mide es la misma**: el DM lleva mandos sobre
  // TODOS, incluido el personaje de otra persona, porque él sí maneja a muchos. Lo que cambió es
  // cuáles son los mandos: ya no los ±5, sino los tres de la maqueta.
  await expect(elencoDm.getByRole("button", { name: "Daño a Borin" })).toBeVisible();
  await expect(elencoDm.getByRole("button", { name: "Daño a Sirella" })).toBeVisible();
  await expect(elencoDm.getByRole("button", { name: "Abrir la ficha de Sirella" })).toBeVisible();
  // El DM no tiene «su» personaje destacado: maneja a muchos, que es la situación de BG3.
  await expect(elencoDm.getByText("Tu personaje")).toHaveCount(0);

  await contextoDm.close();
  await contextoJugadora.close();
});

// B1.2 — **«desde aquí te lo perdiste».** Sale del §6 del reseño y de un matiz del autor que una
// partida solo en directo no tendría: *«sesiones largas y del tirón, pero alguien puede irse a la
// mitad y volver»*. De ahí el requisito, textual: **reincorporarse tiene que ser gratis.**
//
// La aritmética la cubren diez unitarias (`reincorporarse.test.ts`). Lo que **solo** se puede
// medir aquí es que la franja se pinta donde toca cuando la marca ya está guardada, y que quien
// llega por primera vez no la ve — porque la marca vive en `localStorage`, y `jsdom` no navega ni
// recarga.
test("al volver a la mesa, una franja dice por dónde seguir; la primera vez no la hay", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await registrarse(page);
  await crearCampanaConSesion(page);
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();
  const barra = page.getByRole("status", { name: "Sesión en curso" });
  await barra.getByRole("link", { name: "Ir a la mesa" }).click();

  // **La primera vez no hay franja**, y eso es correcto: a quien no estaba no se le perdió nada.
  await expect(page.getByRole("separator", { name: /te perdiste/ })).toHaveCount(0);

  // Tres sellos, que son tres sucesos con los que construir el «antes» y el «después».
  const sucesos = page.getByRole("list", { name: "Sucesos de la sesión" });
  // Dos sellos bastan: con el suceso de «empezó la sesión» ya son tres, que es lo que hace
  // falta para tener un «antes» y un «después». Se espera a que cada uno aparezca en la lista
  // antes de pulsar el siguiente — el botón se deshabilita mientras la mutación va en vuelo.
  // **Ahora hay que escribir antes de sellar**, y no es un retoque de la prueba para que pase:
  // es el defecto que la auditoría del 2026-09-04 marcó en `MesaDeSesion.tsx:793-805` —pulsar
  // «Nota» sin texto escribía en el registro una entrada que decía «Nota»—. Los seis botones se
  // deshabilitan sin texto, así que un recorrido que sella tiene que teclear primero. Lo que
  // esta prueba comprueba sigue siendo lo mismo: que con tres sucesos y una marca de lectura
  // aparece la franja de «desde aquí te perdiste».
  const registro = page.getByRole("region", { name: "Registro de la sesión" });
  for (const sello of ["Combate", "Hallazgo"]) {
    await registro.getByLabel("Qué anotar").fill(`lo de ${sello.toLowerCase()}`);
    await page.getByRole("button", { name: sello, exact: true }).click();
    await expect(sucesos.getByText(sello, { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
  }

  // Se da por visto el MÁS ANTIGUO de los que hay, que es lo que pasa cuando alguien se va a la
  // mitad: al volver, lo de después es lo que se perdió.
  const ids = await sucesos
    .locator("li[data-suceso]")
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-suceso")!));
  expect(ids.length).toBeGreaterThanOrEqual(3);
  const campaignId = page.url().split("/campaigns/")[1].split("/")[0];
  await page.evaluate(
    ([id, campana]) => localStorage.setItem(`dnd-mesa-visto:${campana}`, id),
    [ids[ids.length - 1], campaignId],
  );

  await page.reload();
  const franja = page.getByRole("separator", { name: /te perdiste/ });
  await expect(franja).toBeVisible();
  await expect(franja).toContainText("Desde aquí te perdiste");
});

// **Donde los dos carriles se juntan, y por eso esta prueba existe.**
//
// B1.1 dejó escrita y probada la cabecera de escena: lee los `ENTITY_REVEALED` del registro y
// dice dónde pasa la escena. **Nunca se encendía**, porque el único sitio del servidor que
// escribía ese suceso era el motor de reglas — un DM que sube a mano la visibilidad de una ficha
// no dejaba rastro. Quedó como ficha P1, se arregló en el carril del motor, y **la pantalla no se
// tocó**: esto comprueba que se enciende sola, que era la promesa.
//
// Es también la clase de defecto que solo aparece al juntar dos carriles verdes por separado —
// exactamente lo que este proyecto ya aprendió en la fase 2B.
test("el DM revela un lugar y la cabecera de escena pasa a decirlo, sin tocar la pantalla", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await registrarse(page);
  await crearCampanaConSesion(page);

  // Un lugar que **nace escondido**: preparar la mazmorra no puede ser filtrarla.
  await page.getByRole("tab", { name: "El mundo" }).click();
  await page.getByRole("button", { name: /^Lugares/ }).click();
  await page.getByRole("button", { name: "Nuevo Lugar" }).click();
  await page.getByLabel("Nombre").fill("El Puerto Viejo");
  await page.getByRole("radio", { name: /Solo DM/ }).check();
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();
  await page
    .getByRole("status", { name: "Sesión en curso" })
    .getByRole("link", { name: "Ir a la mesa" })
    .click();

  // Todavía no: la ficha existe, pero no se ha revelado nada.
  const escena = page.getByRole("region", { name: "La escena" });
  await expect(escena).toBeVisible();
  await expect(escena.getByRole("link", { name: "El Puerto Viejo" })).toHaveCount(0);

  // El DM la sube a la mesa. **Eso, y solo eso, es revelar.**
  const urlDeLaMesa = page.url();
  await page.goBack();
  await page.getByRole("tab", { name: "El mundo" }).click();
  await page.getByRole("button", { name: /^Lugares/ }).click();
  await page.getByRole("link", { name: /El Puerto Viejo/ }).click();
  await page
    .getByRole("button", { name: /Editar|Ver el texto completo/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "Editar Lugar" })).toBeVisible();
  // El nombre accesible del radio es la etiqueta ENTERA: el rótulo del nivel más su frase
  // explicativa —la regla vinculante pide justamente eso, que cada opción lleve su porqué al
  // lado—. Se busca por la frase, que es lo único que distingue «Jugadores» de «Jugadores
  // concretos» sin depender del orden de las palabras.
  await page.getByRole("radio", { name: /Todos los que se sientan a esta mesa/ }).check();
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("heading", { name: "Editar Lugar" })).toBeHidden();

  // Y la cabecera lo dice, sin que nadie tocara la pantalla.
  await page.goto(urlDeLaMesa);
  await expect(escena.getByRole("link", { name: "El Puerto Viejo" })).toBeVisible({
    timeout: 20_000,
  });
});

// B1.3 — **el estrato superpuesto**, y las tres cosas que lo definen según el §4 del reseño:
// se abre encima, **Escape cierra y vuelves exactamente donde estabas**, y **uno a la vez**.
//
// El argumento de por qué estos paneles se quitan y la cabecera no sale del mapa de teclas de
// Baldur's Gate 3: diez paneles tienen tecla de alternar; los retratos y la barra de acciones no
// tienen ninguna. Un panel tiene tecla **porque se quita**.
//
// `jsdom` no puede medir esto: no hay foco real ni superposición.
test("los paneles se abren encima, uno a la vez, y Escape devuelve el foco donde estaba", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await registrarse(page);
  await crearCampanaConSesion(page);
  await crearPersonajeConHoja(page, "Thora");
  await page.getByRole("link", { name: "La mesa de prueba" }).click();
  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();
  await page
    .getByRole("status", { name: "Sesión en curso" })
    .getByRole("link", { name: "Ir a la mesa" })
    .click();

  const rail = page.getByRole("navigation", { name: "Paneles de la mesa" });
  await expect(rail).toBeVisible();

  // El hilo y el elenco siguen ahí detrás: el panel se abre ENCIMA, no sustituye la pantalla.
  await rail.getByRole("button", { name: /Mundo/ }).click();
  const mundo = page.getByRole("dialog");
  await expect(mundo).toBeVisible();
  await expect(page.getByRole("list", { name: "Sucesos de la sesión" })).toBeAttached();

  // **Uno a la vez**: abrir la bolsa cierra el mundo. Dos paneles superpuestos son dos sitios
  // donde estar, y no tener un sitio donde estar es el defecto que todo esto corrige.
  await page.keyboard.press("Escape");
  await expect(mundo).toBeHidden();
  await rail.getByRole("button", { name: /Bolsa/ }).click();
  await expect(page.getByRole("dialog")).toContainText("bolsa", { ignoreCase: true });

  // **Escape cierra y el foco vuelve al control que lo abrió.** Es lo que hace que reincorporarse
  // a lo que estabas sea gratis, y lo único que lo demuestra es medir el foco.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  const focoTrasCerrar = await page.evaluate(
    () => document.activeElement?.textContent?.replace(/\s+/g, " ").trim() ?? "",
  );
  expect(focoTrasCerrar).toContain("Bolsa");
});
