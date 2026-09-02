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
  await page.getByRole("button", { name: "Nueva campaña" }).click();
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
  const registro = page.getByRole("region", { name: "Registro de la sesión" });
  await expect(registro.getByText("Combate: los guardias del muelle")).toBeVisible({
    timeout: 10_000,
  });
  // Y el suceso de apertura de la sesión, también traducido.
  await expect(registro.getByText(/Empieza la sesión/)).toBeVisible();

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

test("contraste medido en la barra de sesión y en la mesa", async ({ page }) => {
  await registrarse(page);
  await crearCampanaConSesion(page);
  await page.getByRole("button", { name: "Empezar" }).click();
  await page.getByRole("button", { name: "Empezar la sesión" }).click();
  await expect(page.getByRole("status", { name: "Sesión en curso" })).toBeVisible({
    timeout: 10_000,
  });

  // El mismo método que `tokens-contrast.spec.ts`: se compone el alfa contra lo que hay detrás y
  // se mide el color **calculado**, no el declarado. La barra es translúcida (`bg-surface/95`)
  // sobre la cuadrícula cartográfica, así que su fondo real no es ningún token a secas.
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
    const enJuego = barra.querySelector("span") as HTMLElement;
    salida.push({
      que: "barra: «en juego» (cobre)",
      valor: ratio(sobre(getComputedStyle(enJuego).color, fondoBarra), fondoBarra),
      minimo: 4.5,
    });
    const titulo = barra.querySelectorAll("span")[1] as HTMLElement;
    salida.push({
      que: "barra: título de la sesión",
      valor: ratio(sobre(getComputedStyle(titulo).color, fondoBarra), fondoBarra),
      minimo: 4.5,
    });
    const borde = getComputedStyle(barra).borderBottomColor;
    salida.push({
      que: "barra: filete inferior",
      valor: ratio(sobre(borde, fondoPagina), fondoPagina),
      minimo: 3,
    });
    return salida;
  });

  // eslint-disable-next-line no-console
  console.log("\n=== Contraste WCAG medido (barra de sesión) ===");
  for (const m of medido) {
    // eslint-disable-next-line no-console
    console.log(
      `${m.que}: ${m.valor.toFixed(2)}:1 (necesita ${m.minimo}:1) — ${m.valor >= m.minimo ? "PASS" : "FAIL"}`,
    );
    expect(m.valor, m.que).toBeGreaterThanOrEqual(m.minimo);
  }
});
