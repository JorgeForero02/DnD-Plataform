import { test, expect, type Page } from "@playwright/test";

// **La mesa, medida en un navegador de verdad.**
//
// Esta es la prueba que impide la reincidencia, y hace falta decir por qué existe con nombre y
// apellidos: **la suite entera estuvo en verde con la mesa rota**. `jsdom` no maqueta —no hay
// alto, ni posición, ni desplazamiento—, así que ninguna prueba de componente podía ver que la
// pantalla donde se juega scrolleaba como un artículo, que cinco paneles tenían `overflow-y-auto`
// escrito y ninguno se activaba, y que la rejilla no llegaba al pie.
//
// La causa técnica de todo eso cabe en una línea: **un hijo de flex/grid tiene `min-height: auto`
// por defecto y se niega a encoger por debajo de su contenido**. Sin `min-h-0` en cada ancestro,
// el panel se estira, empuja la página, y su scroll interno no aparece jamás. Es un defecto que
// **solo** se ve midiendo.
//
// Cinco medidas, y ninguna es de gusto:
//
//  1. La página **no** scrollea.
//  2. El hilo **sí**.
//  3. La rejilla llega al pie de la ventana.
//  4. Ningún panel se corta sin poder desplazarse.
//  5. Abrir un cajón **no desmonta** el hilo — «vuelves exactamente donde estabas» es
//     comprobable, no una intención.
//
// Se mide en los dos tamaños que el autor usa, 1280×800 y 1920×1080: una rejilla de tres columnas
// con anchos fijos (17rem y 15rem) se comporta distinto según cuánto le sobre al centro.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `mesa-mide-${marca}@example.com`,
    password: "password123",
    displayName: `Mesa ${marca}`,
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
 * Una campaña con sesión **empezada** y el hilo **lleno**.
 *
 * Lo segundo es la mitad de la prueba: con tres líneas en el registro, un hilo roto y uno correcto
 * miden igual. Lo que distingue «el hilo scrollea por dentro» de «la página crece» es que haya más
 * contenido del que cabe, así que se sellan bastantes anotaciones para desbordar el panel a
 * propósito.
 */
const ANOTACIONES = 30;

async function campanaConSesionYHiloLargo(page: Page) {
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La mesa medida");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La mesa medida" }).click();
  await expect(page.getByRole("heading", { name: "La mesa medida" })).toBeVisible();

  await page.getByRole("tab", { name: "Sesiones" }).click();
  await page.getByRole("button", { name: "Nueva sesión" }).click();
  await page.getByLabel("Título").fill("El almacén cuatro");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();
  const barra = page.getByRole("status", { name: "Sesión en curso" });
  await expect(barra).toBeVisible({ timeout: 10_000 });

  // Las anotaciones desde la barra, que es el gesto que existe desde cualquier pantalla.
  //
  // **«Anotar» es un ALTERNADOR, no un botón de abrir**, y esta prueba lo aprendió por las malas:
  // pulsándolo dentro del bucle, la segunda vuelta cerraba el panel que la primera había abierto y
  // el campo desaparecía. Se abre una vez, fuera del bucle, y se deja abierto — que además es lo
  // que hace una persona sellando doce veces seguidas.
  await page.getByRole("button", { name: "Anotar" }).click();
  const campo = page.getByLabel("Qué anotar");
  const sellarCombate = page.getByRole("button", { name: /Combate/ }).first();
  // Treinta, no doce (fix round 1 de la Task 5b): con las líneas compactas del registro
  // (D-CF-149) doce anotaciones cabían en 1080 px de alto sin scroll y la medida 2 no medía nada.
  for (let i = 0; i < ANOTACIONES; i++) {
    // **Se espera a que el campo esté vacío ANTES de escribir, y ahí está la carrera que costó
    // dos tandas.** El compositor limpia el texto en el `onSuccess` de la mutación anterior, así
    // que si se escribe sin esperar, ese limpiado llega tarde y **borra lo recién escrito**: el
    // botón se queda deshabilitado para siempre y el fallo sale como «esperando a que el botón
    // esté habilitado», que no dice nada de la causa.
    //
    // Y no vale mirar «Anotado: Combate.» para saber que la anterior terminó: ese cartel se queda
    // puesto de la vuelta previa, así que la aserción pasa al instante y no espera nada.
    await expect(campo).toHaveValue("");
    await campo.fill(`la línea número ${i + 1} del almacén`);
    await expect(sellarCombate).toBeEnabled();
    await sellarCombate.click();
  }

  await barra.getByRole("link", { name: "Ir a la mesa" }).click();
  await expect(page.getByRole("banner", { name: "Estado de la mesa" })).toBeVisible({
    timeout: 10_000,
  });
  // El hilo tiene que haber cargado sus líneas antes de medir nada: medir un panel vacío da un
  // verde que no significa nada.
  await expect(
    page
      .getByRole("list", { name: "Sucesos de la sesión" })
      .getByText(new RegExp(`la línea número ${ANOTACIONES} del almacén`)),
  ).toBeVisible({ timeout: 15_000 });
}

for (const ventana of [
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
]) {
  test(`la mesa ocupa la ventana y scrollea por panel — ${ventana.width}×${ventana.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(ventana);
    await registrarse(page);
    await campanaConSesionYHiloLargo(page);

    // --- 1 · La página NO scrollea ---
    //
    // Es la medida que define «pantalla completa». Se da 2 px de margen porque un borde de 1 px
    // redondeado hacia arriba no es un defecto y sí haría intermitente la prueba.
    const pagina = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      bodyScroll: document.body.scrollHeight,
    }));
    expect(pagina.scrollHeight).toBeLessThanOrEqual(pagina.innerHeight + 2);
    expect(pagina.bodyScroll).toBeLessThanOrEqual(pagina.innerHeight + 2);

    // --- 2 · El hilo SÍ scrollea ---
    //
    // Dos condiciones a la vez, y las dos hacen falta: que el elemento **pueda** desplazarse
    // (`overflow-y` resuelto a auto o scroll) y que de verdad tenga más contenido del que enseña.
    // Solo la primera pasaría con un panel estirado; solo la segunda pasaría con la página rota.
    const hilo = page.getByRole("list", { name: "Sucesos de la sesión" });
    const medidaHilo = await hilo.evaluate((el) => ({
      overflowY: getComputedStyle(el).overflowY,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(["auto", "scroll"]).toContain(medidaHilo.overflowY);
    expect(medidaHilo.scrollHeight).toBeGreaterThan(medidaHilo.clientHeight);

    // Y se desplaza de verdad: un `overflow` correcto sobre un contenedor de altura cero también
    // cumpliría lo de arriba.
    await hilo.evaluate((el) => el.scrollTo({ top: 200 }));
    expect(await hilo.evaluate((el) => el.scrollTop)).toBeGreaterThan(100);

    // --- 3 · La rejilla llega al pie ---
    //
    // El defecto que esto caza es el contrario del anterior: una mesa que cabe de sobra y deja
    // medio lienzo vacío por debajo. Se mide contra el borde inferior de la ventana con holgura
    // para el rail de paneles y el relleno de la mesa (`p-s3`, 0,75rem).
    const rejilla = page.locator("main");
    const caja = await rejilla.boundingBox();
    expect(caja).not.toBeNull();
    expect(caja!.y + caja!.height).toBeGreaterThan(ventana.height * 0.5);
    expect(caja!.y + caja!.height).toBeLessThanOrEqual(ventana.height);

    // --- 3 bis · La rejilla llega al BORDE, y el rail no le roba una franja ---
    //
    // El defecto que esto fija con número, y que hasta hoy no medía nada: el rail vivía en una
    // fila propia **a lo ancho de la pantalla**, hermana de la rejilla, así que el hilo se cortaba
    // ~100 px por encima del borde y a la derecha del rail quedaba una banda vacía. La maqueta
    // pone ahí `BarraDeAcciones`, que en esta aplicación **no existe** (auditoría 2026-09-04,
    // ALTA), así que esa fila era hueco muerto. El rail bajó al pie de la columna del elenco.
    //
    // Se permite `p-s3` (12 px) más un par de píxeles de redondeo. Si alguien devuelve el rail a
    // su fila, esta aserción se pone roja en el acto.
    expect(ventana.height - (caja!.y + caja!.height)).toBeLessThanOrEqual(16);

    // --- 3 ter · Las dos costuras verticales son la MISMA ---
    //
    // El rail y la columna del elenco comparten borde derecho. Antes no: la columna medía 17rem
    // (272 px) y el rail ~370 —botones `w-20` en vez de los `w-16` de la maqueta, más una caja con
    // relleno que la maqueta no tiene—, así que había dos líneas separadas 90 px donde debería
    // haber una. Se mide el borde derecho de los dos, no su anchura, porque es la costura lo que
    // se ve.
    //
    // **Y hay que decir qué defiende esto de verdad, porque se comprobó por mutación.** Devolver
    // los botones a `w-20` y quitarle al rail su ancho **NO** pone esta aserción en rojo: el rail
    // vive dentro de la columna del elenco, así que la rejilla le fija el ancho y la costura
    // coincide igualmente. Lo que sí caza es que alguien **saque el rail de la columna** y lo
    // devuelva a una fila propia a lo ancho. La alineación no la sostienen las clases: la sostiene
    // la estructura, y esto es lo que avisa si la estructura cambia.
    const cajaRail = await page.locator('nav[aria-label="Paneles de la mesa"]').boundingBox();
    const cajaElenco = await page.getByRole("region", { name: "En la mesa" }).boundingBox();
    expect(cajaRail).not.toBeNull();
    expect(cajaElenco).not.toBeNull();
    expect(
      Math.abs(cajaRail!.x + cajaRail!.width - (cajaElenco!.x + cajaElenco!.width)),
    ).toBeLessThanOrEqual(2);

    // --- 4 · Ningún panel se corta sin poder desplazarse ---
    //
    // Para cada región de la mesa: o cabe, o tiene con qué desplazarse. Un panel con más
    // contenido del que enseña y sin `overflow` es contenido **perdido**, no contenido cortado:
    // no hay forma de llegar a él.
    const cortados = await page.evaluate(() => {
      const malos: string[] = [];
      const paneles = document.querySelectorAll<HTMLElement>("main [aria-label], main section");
      paneles.forEach((el) => {
        const desborda = el.scrollHeight > el.clientHeight + 2;
        if (!desborda) return;
        const estilo = getComputedStyle(el);
        const puede = ["auto", "scroll"].includes(estilo.overflowY);
        if (!puede) malos.push(el.getAttribute("aria-label") ?? el.className.slice(0, 60));
      });
      return malos;
    });
    expect(cortados).toEqual([]);

    // --- 5 · Abrir un cajón no desmonta el hilo ---
    //
    // «Se abre encima, Escape cierra, y vuelves exactamente donde estabas» (§4 del reseño). Con un
    // cuadro centrado que sustituye la pantalla eso no se cumple; con un cajón lateral sí, y la
    // forma de comprobarlo es que el hilo **siga en el documento** y **conserve su desplazamiento**
    // mientras el cajón está abierto.
    const desplazamientoAntes = await hilo.evaluate((el) => el.scrollTop);
    await page.getByRole("button", { name: /Mundo/ }).click();
    const cajon = page.getByRole("dialog");
    await expect(cajon).toBeVisible();
    await expect(hilo).toBeVisible();
    expect(await hilo.evaluate((el) => el.scrollTop)).toBe(desplazamientoAntes);

    // El cajón entra por la derecha y llega de arriba abajo: eso es lo que lo distingue del cuadro
    // centrado que la auditoría del 2026-09-04 encontró en 24 pantallas.
    const cajaCajon = await cajon.boundingBox();
    expect(cajaCajon).not.toBeNull();
    expect(cajaCajon!.height).toBeGreaterThanOrEqual(ventana.height - 2);
    expect(cajaCajon!.x + cajaCajon!.width).toBeGreaterThanOrEqual(ventana.width - 2);

    // Y Escape lo cierra dejando la mesa donde estaba.
    await page.keyboard.press("Escape");
    await expect(cajon).toBeHidden();
    expect(await hilo.evaluate((el) => el.scrollTop)).toBe(desplazamientoAntes);
  });
}

// --- D1 (2026-09-05): el hilo se lee como una conversación ---
//
// **Esto vive aquí y no en RTL porque `jsdom` no maqueta.** `scrollHeight` y `clientHeight` valen
// cero allí, así que *cualquier* aserción sobre el anclaje pasaría —incluso con el código
// borrado—. Es exactamente el fallo que dejó 871 pruebas verdes con la mesa rota, y por eso las
// tres medidas del anclaje están en un navegador de verdad.
//
// Lo que RTL sí cubre, y no se repite aquí: el orden de los nodos, que la marca de leído sigue
// siendo el más reciente y que la franja de «te perdiste» deja lo no leído por debajo
// (`apps/web/src/features/sessions/__tests__/mesa-de-sesion.test.tsx`).
//
// Una sola ventana, 1280×800: lo que se mide es desplazamiento, no rejilla, y no cambia con el
// ancho. Repetirlo en 1920 costaría otro registro completo de doce sellos sin medir nada nuevo.
test("el hilo se lee como un chat: lo último abajo, y no arrastra a quien está leyendo", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await registrarse(page);
  await campanaConSesionYHiloLargo(page);

  const hilo = page.getByRole("list", { name: "Sucesos de la sesión" });
  /** Cuánto queda por debajo. Menos que la tolerancia del componente (80 px) es «al fondo». */
  const porDebajo = () => hilo.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight);

  // --- 1 · Al abrir la mesa, el hilo está AL FONDO ---
  await expect.poll(porDebajo, { timeout: 10_000 }).toBeLessThan(80);

  // Y lo de abajo es lo último que pasó. Se compara la POSICIÓN de dos líneas conocidas, no el
  // texto del último nodo: el registro lleva además el suceso de «sesión empezada», así que
  // fijar cuál es el primero sería atarse a un detalle que no es el que se mide.
  const orden = await hilo.evaluate((el) =>
    [...el.querySelectorAll("[data-suceso]")].map((n) => n.textContent ?? ""),
  );
  const primera = orden.findIndex((t) => t.includes("la línea número 1 del almacén"));
  const ultima = orden.findIndex((t) => t.includes("la línea número 12 del almacén"));
  expect(primera).toBeGreaterThanOrEqual(0);
  expect(ultima).toBeGreaterThan(primera);

  // --- 2 · Con el scroll subido, un suceso nuevo NO roba la posición ---
  //
  // **Esta es la medida que protege el corazón del plan** y la que la mutación tiene que poner
  // roja: quitar la condición `alFondo` del componente hace que la vista salte al fondo aquí.
  await hilo.evaluate((el) => el.scrollTo({ top: 0 }));
  const arriba = await hilo.evaluate((el) => el.scrollTop);
  expect(arriba).toBeLessThan(80);

  const registro = page.getByRole("region", { name: "Registro de la sesión" });
  const campo = registro.getByLabel("Qué anotar");
  const sellar = registro.getByRole("button", { name: "Combate", exact: true });
  await campo.fill("un suceso mientras leo más arriba");
  await sellar.click();

  // Se espera a que el suceso HAYA LLEGADO al hilo antes de medir: `toBeAttached` y no
  // `toBeVisible`, porque si el anclaje se comporta bien ese suceso está fuera de la ventana
  // del scroll — pedirle que se vea sería pedir justo el defecto que esta prueba caza.
  await expect(hilo.getByText("un suceso mientras leo más arriba")).toBeAttached({
    timeout: 10_000,
  });
  // **La aserción del plan**: la vista sigue exactamente donde estaba.
  expect(await hilo.evaluate((el) => el.scrollTop)).toBe(arriba);
  // Y el aviso lo dice — sin él, lo nuevo estaría fuera de pantalla en silencio.
  const aviso = page.getByRole("button", { name: "Hay algo nuevo abajo" });
  await expect(aviso).toBeVisible();

  // Pulsarlo sí baja, que es la salida que se le ofrece a quien quiera verlo.
  await aviso.click();
  await expect(aviso).toBeHidden();
  await expect.poll(porDebajo).toBeLessThan(80);

  // --- 3 · Estando al fondo, uno nuevo SÍ baja ---
  await expect(campo).toHaveValue("");
  await campo.fill("y otro estando ya al fondo");
  await sellar.click();
  await expect(hilo.getByText("y otro estando ya al fondo")).toBeVisible({ timeout: 10_000 });
  await expect.poll(porDebajo).toBeLessThan(80);
});
