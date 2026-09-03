import { test, expect, type Page } from "@playwright/test";

// Tarea R1 — **arrastrar y soltar, medido en un navegador de verdad.**
//
// Esta suite existe porque `jsdom` no arrastra y no maqueta: ni hay `DataTransfer` real, ni hay
// `clip-path` calculado, ni hay puntero. Las pruebas de componente cubren la ruta de teclado
// (`src/features/rules/__tests__/`); lo que solo se ve y solo se hace con el ratón se mide
// aquí, que es la regla del proyecto (docs/04-convenciones.md).
//
// Tres cosas que ninguna otra capa puede demostrar:
//   1. Que cada parte tiene **una silueta distinta**, calculada por el navegador. Es la lección
//      de Blockly: la forma dice dónde encaja una pieza antes de que lo intentes.
//   2. Que arrastrar una caja a su carril **la coloca de verdad**.
//   3. Que arrastrar una caja al carril equivocado **no la coloca**. Eso es «la ranura es la
//      conexión»: no existe el estado intermedio de una caja que parece puesta y no lo está.
//
// Y una cuarta desde R1-fix, que es la que obligó a sacar el editor del diálogo: que la pieza y
// su ranura **caben en pantalla a la vez**. No es una exigencia estética — mientras no se cumplió,
// el gesto fue literalmente imposible.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `arrastre-${marca}@example.com`,
    password: "password123",
    displayName: `Arrastre ${marca}`,
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
}

async function abrirEditorDeRegla(page: Page) {
  await registrarse(page);

  await page.getByRole("button", { name: "Nueva campaña" }).click();
  await page.getByLabel("Nombre").fill("La mesa de los carriles");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La mesa de los carriles" }).click();

  // Una regla fija el identificador de la ficha al armarse: hace falta una ficha real antes.
  await page.getByRole("tab", { name: "PNJ" }).click();
  await page.getByRole("button", { name: "Nuevo PNJ" }).click();
  await page.getByLabel("Nombre").fill("La puerta de sal");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("tab", { name: "Reglas" }).click();
  await page.getByRole("button", { name: "Nueva regla" }).click();
  await expect(page.getByRole("heading", { name: "Nueva regla" })).toBeVisible();
}

test("cada parte tiene su propia silueta, medida en el navegador", async ({ page }) => {
  await abrirEditorDeRegla(page);

  const siluetaDe = (nombre: string) =>
    page
      .getByRole("button", { name: nombre })
      .evaluate((el) => getComputedStyle(el as HTMLElement).clipPath);

  const suceso = await siluetaDe("Empieza una sesión — poner en el carril Cuando");
  const estado = await siluetaDe("Esta regla no se ha disparado nunca — poner en el carril Si");
  const accion = await siluetaDe("Revelar una entrada del mundo — poner en el carril Entonces");

  // Ninguna se queda sin recortar: si el `clip-path` no llega, las tres son rectángulos y la
  // forma deja de decir nada. `jsdom` devolvería la cadena declarada aunque el navegador la
  // ignorase; esto lee lo que el navegador **calculó**.
  for (const [nombre, valor] of Object.entries({ suceso, estado, accion })) {
    expect(valor, `${nombre} sin silueta`).toContain("polygon");
  }
  expect(new Set([suceso, estado, accion]).size).toBe(3);
});

// --- Tarea R1-fix — **el arrastre, por fin medido** ---------------------------------------------
//
// Aquí había un comentario largo explicando que el arrastre no se podía probar porque en esta
// pantalla no se disparaba ni un `dragstart`, y un recorrido retirado. Las dos cosas se van: el
// arrastre funciona y estos dos recorridos lo demuestran.
//
// **Qué pasaba de verdad.** No era el `overflow-y-auto` del diálogo, como se sospechaba: era su
// `max-h-[85vh]`. El panel medía 763 px para 1553 px de contenido, y los carriles caían en
// `y ≈ 995`, fuera de la ventana. La pieza y su ranura no estaban nunca en pantalla a la vez, así
// que el gesto era imposible — arrastrando a mano el `dragstart` sí salía, pero no había adónde
// soltar. El editor dejó de ser un diálogo (`EditorDeRegla.tsx` lo cuenta entero, con la tabla de
// la bisección) y cada grupo de la paleta pasó a estar justo encima de su carril.
//
// **Y por qué este recorrido sí puede fallar.** El que se retiró comprobaba, en su primera mitad,
// que un carril ajeno *rechaza* una pieza — y eso pasaba en verde exactamente igual si el
// arrastre no funcionaba en absoluto, que es la definición de una prueba que pasa por el motivo
// equivocado. Aquí el rechazo se comprueba **después** de un arrastre que sí coloca, en la misma
// prueba: si el arrastre dejara de funcionar, la primera mitad ya estaría roja y nadie podría
// confundir «rechaza bien» con «no arrastra nada».

/**
 * El gesto, tal cual lo hace una persona: se arrastra la pieza hasta su carril.
 *
 * **Se lleva a la vista la PIEZA, no el carril**, y la diferencia costó una prueba roja. La
 * primera versión hacía `scrollIntoViewIfNeeded()` sobre el carril «porque nadie arrastra hacia
 * algo que no ve», y eso empujaba la pieza a `y = -81`: fuera de la ventana por arriba. Entonces
 * `dragTo` desplazaba **otra vez** para traerse la pieza, y el puntero acababa agarrando la de al
 * lado — medido: en el carril aterrizaba `ENTITY_REVEALED` en vez de `SESSION_STARTED`, así que
 * el arrastre funcionaba y la prueba decía que no.
 *
 * Llevando la pieza a la vista, `dragTo` ya no tiene que desplazar nada para agarrarla, y el
 * carril queda en pantalla porque **está a menos de un palmo**: la paleta se pinta en dos
 * columnas justamente para que la pieza y su ranura quepan juntas.
 */
async function arrastrarPieza(page: Page, nombre: string, parte: string) {
  const pieza = page.getByRole("button", { name: nombre });
  const carril = page.locator(`[data-carril="${parte}"]`);

  // **Se coloca la página para que la pieza y su carril se vean a la vez, y solo entonces se
  // arrastra.** Ni un desplazamiento más durante el gesto: cualquiera mueve la pieza de debajo
  // del puntero. `dragTo` desplaza por su cuenta y no se le puede pedir que no lo haga, así que
  // el arrastre va con el ratón paso a paso, que es además lo que hace una persona.
  const alto = page.viewportSize()!.height;
  await page.evaluate(
    ({ etiqueta, carrilParte, hAlto }) => {
      const p = document.querySelector(`[aria-label="${etiqueta}"]`) as HTMLElement;
      const c = document.querySelector(`[data-carril="${carrilParte}"]`) as HTMLElement;
      const rp = p.getBoundingClientRect();
      const rc = c.getBoundingClientRect();
      const arriba = Math.min(rp.top, rc.top) + window.scrollY;
      const abajo = Math.max(rp.bottom, rc.bottom) + window.scrollY;
      window.scrollTo(0, Math.max(0, (arriba + abajo) / 2 - hAlto / 2));
    },
    { etiqueta: nombre, carrilParte: parte, hAlto: alto },
  );

  const a = (await pieza.boundingBox())!;
  const b = (await carril.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  // Dos movimientos: el primero arranca el arrastre, el segundo lo lleva al destino. Con uno
  // solo, Chromium a veces no llega a emitir `dragover` sobre el carril.
  await page.mouse.move(b.x + b.width / 2, b.y + Math.min(24, b.height / 2), { steps: 12 });
  await page.mouse.move(b.x + b.width / 2, b.y + Math.min(28, b.height / 2), { steps: 4 });
  await page.mouse.up();
}

test("arrastrar una pieza hasta su carril la coloca de verdad", async ({ page }) => {
  await abrirEditorDeRegla(page);

  const carril = page.locator('[data-carril="SUCESO"]');
  // Antes: vacío y diciendo lo que pide. Sin esto, el «después» podría estar cumpliéndose ya.
  await expect(carril).toContainText("Arrastra aquí el suceso que despierta la regla");
  await expect(carril.locator('[data-clave="SESSION_STARTED"]')).toHaveCount(0);

  await arrastrarPieza(page, "Empieza una sesión — poner en el carril Cuando", "SUCESO");

  // La caja está dentro del carril, con su clave: no es que se haya pintado en cualquier parte.
  await expect(carril.locator('[data-clave="SESSION_STARTED"]')).toHaveCount(1);
  await expect(carril).toContainText("Es un suceso.");
  // Y el arrastre pasa por la misma puerta que la pulsación, así que lo anuncia igual.
  await expect(
    page.getByText("«Empieza una sesión» colocado en el carril «Cuando»."),
  ).toBeVisible();
  // La frase, que es lo que el DM lee, cambia con el gesto.
  await expect(page.getByRole("region", { name: "La regla, leída" })).toContainText(
    "Cuando Empieza una sesión",
  );
});

test("un carril rechaza la pieza que no es suya — comprobado tras un arrastre que sí funciona", async ({
  page,
}) => {
  await abrirEditorDeRegla(page);

  // **Primero uno que funciona.** Si el arrastre estuviera muerto, esto ya falla, y el rechazo de
  // abajo no puede pasar por el motivo equivocado.
  await arrastrarPieza(
    page,
    "Esta regla no se ha disparado nunca — poner en el carril Si",
    "ESTADO",
  );
  await expect(page.locator('[data-carril="ESTADO"] [data-clave="NEVER_FIRED"]')).toHaveCount(1);

  // Ahora, la acción al carril del suceso: la parte viaja en el *tipo* del DataTransfer, así que
  // el carril la rechaza mientras se arrastra y no llega a soltarse.
  const carrilSuceso = page.locator('[data-carril="SUCESO"]');
  await carrilSuceso.scrollIntoViewIfNeeded();
  await page
    .getByRole("button", { name: "Revelar una entrada del mundo — poner en el carril Entonces" })
    .dragTo(carrilSuceso);

  await expect(carrilSuceso.locator('[data-clave="REVEAL_ENTITY"]')).toHaveCount(0);
  // Y no se ha colado por la puerta de atrás en su propio carril: no se colocó en ninguna parte.
  await expect(page.locator('[data-carril="ACCION"] [data-clave="REVEAL_ENTITY"]')).toHaveCount(0);
  await expect(carrilSuceso).toContainText("Arrastra aquí el suceso que despierta la regla");
});

// --- Tareas F1 y F2 — lo que solo existe maquetado ---------------------------------------------
//
// `jsdom` no maqueta y no resuelve una clase de Tailwind hasta un color: no hay ancho, ni
// posición, ni `color` calculado (docs/04-convenciones.md). Las tres cosas de este bloque se
// miden aquí porque en la suite unitaria pasarían en verde estuvieran bien o mal.

test("los tres carriles van uno junto a otro, en el orden en que se lee la frase", async ({
  page,
}) => {
  await abrirEditorDeRegla(page);

  const cajaDe = async (parte: string) => {
    const caja = await page.locator(`[data-carril="${parte}"]`).boundingBox();
    if (!caja) throw new Error(`el carril ${parte} no está en pantalla`);
    return caja;
  };

  const suceso = await cajaDe("SUCESO");
  const estado = await cajaDe("ESTADO");
  const accion = await cajaDe("ACCION");

  // De izquierda a derecha: la frase se lee así, y los carriles están puestos así.
  expect(suceso.x).toBeLessThan(estado.x);
  expect(estado.x).toBeLessThan(accion.x);
  // Y a la misma altura: uno junto a otro, no en escalera.
  expect(Math.abs(suceso.y - estado.y)).toBeLessThan(4);
  expect(Math.abs(estado.y - accion.y)).toBeLessThan(4);

  // Cada uno lleva su rótulo y su glosa. Si la glosa cayera fuera del carril, esto no la vería.
  await expect(page.locator('[data-carril="SUCESO"]')).toContainText("pasa algo (un suceso)");
  await expect(page.locator('[data-carril="ESTADO"]')).toContainText("se cumple (un estado)");
  await expect(page.locator('[data-carril="ACCION"]')).toContainText("haz esto (una acción)");
});

test("en pantalla estrecha los carriles se apilan, y en ese mismo orden", async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 900 });
  await abrirEditorDeRegla(page);

  const cajaDe = async (parte: string) => {
    const caja = await page.locator(`[data-carril="${parte}"]`).boundingBox();
    if (!caja) throw new Error(`el carril ${parte} no está en pantalla`);
    return caja;
  };

  const suceso = await cajaDe("SUCESO");
  const estado = await cajaDe("ESTADO");
  const accion = await cajaDe("ACCION");

  // Apilados: misma abscisa, y bajando en el orden de la frase. Apilar no puede reordenarla.
  expect(Math.abs(suceso.x - estado.x)).toBeLessThan(2);
  expect(Math.abs(estado.x - accion.x)).toBeLessThan(2);
  expect(suceso.y).toBeLessThan(estado.y);
  expect(estado.y).toBeLessThan(accion.y);
});

test("los conectores de la frase van coloreados Y en negrita: el color no decide solo", async ({
  page,
}) => {
  await abrirEditorDeRegla(page);

  await page
    .getByRole("button", { name: "Empieza una sesión — poner en el carril Cuando" })
    .click();
  await page
    .getByRole("button", { name: "Esta regla no se ha disparado nunca — poner en el carril Si" })
    .click();
  await page
    .getByRole("button", { name: "Revelar una entrada del mundo — poner en el carril Entonces" })
    .click();

  const estiloDe = (parte: string) =>
    page.locator(`[data-frase="conector"][data-parte="${parte}"]`).evaluate((el) => {
      const estilo = getComputedStyle(el as HTMLElement);
      return { color: estilo.color, peso: Number(estilo.fontWeight) };
    });

  const suceso = await estiloDe("SUCESO");
  const estado = await estiloDe("ESTADO");
  const accion = await estiloDe("ACCION");

  // Tres colores, calculados por el navegador: si dos partes acabaran con el mismo tono, la
  // señal de color habría dejado de decir nada y ninguna prueba de `jsdom` lo notaría.
  expect(new Set([suceso.color, estado.color, accion.color]).size).toBe(3);
  // Y los tres en negrita: quien no distinga los tonos lee la frase igual.
  for (const [nombre, estilo] of Object.entries({ suceso, estado, accion })) {
    expect(estilo.peso, `${nombre} sin negrita`).toBeGreaterThanOrEqual(600);
  }

  // El color del conector es **el mismo** que el del carril al que pertenece: la frase y los
  // carriles son la misma regla contada dos veces, y eso se ve porque comparten el tono.
  const colorDelCarril = await page
    .locator('[data-carril="SUCESO"] h3 span')
    .evaluate((el) => getComputedStyle(el as HTMLElement).color);
  expect(suceso.color).toBe(colorDelCarril);
});
