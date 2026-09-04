import { test, expect } from "@playwright/test";

// La otra mitad de la red que protege el mismo fallo. El barrido del código fuente vive en
// `src/ui/__tests__/canales-de-color.test.ts`, porque no necesita navegador; **esto sí**: caza
// una clase que se usa y **no llega a pintar**, que es exactamente lo que pasaba y lo que ninguna
// prueba de jsdom podía ver, porque jsdom no resuelve una clase de Tailwind hasta un color.

test("las superficies que la aplicación promete se pintan de verdad, medidas en el navegador", async ({
  page,
}) => {
  await page.goto("/login");

  // 1. La cabecera de la aplicación no está en /login, así que se mide lo que sí hay ahí y se
  //    comprueba lo esencial: que las utilidades arbitrarias que sustituyen a las de opacidad
  //    llegaron al CSS. Si Tailwind las descartara, no estarían.
  const utilidades = await page.evaluate(() => {
    const encontradas: string[] = [];
    for (const hoja of Array.from(document.styleSheets)) {
      let reglas: CSSRuleList;
      try {
        reglas = hoja.cssRules;
      } catch {
        continue; // hoja de otro origen
      }
      for (const regla of Array.from(reglas)) {
        const texto = regla.cssText;
        if (
          texto.includes("--chrome-veil") ||
          texto.includes("--veil") ||
          texto.includes("--accent-tint") ||
          texto.includes("--danger-tint")
        ) {
          encontradas.push(texto.slice(0, 120));
        }
      }
    }
    return encontradas;
  });
  // Tienen que estar **las declaraciones de los tokens y las utilidades que los usan**.
  const comoUtilidad = utilidades.filter(
    (t) => t.includes("background-color:var(") || t.includes("background-color: var("),
  );
  expect(comoUtilidad.length).toBeGreaterThan(0);

  // 2. Y el color compuesto: un elemento con esa clase tiene fondo, no `transparent`.
  const fondo = await page.evaluate(() => {
    const d = document.createElement("div");
    d.className = "bg-[color:var(--veil)]";
    document.body.appendChild(d);
    const c = getComputedStyle(d).backgroundColor;
    d.remove();
    return c;
  });
  expect(fondo).not.toBe("rgba(0, 0, 0, 0)");
  expect(fondo).not.toBe("transparent");
});

// B0 (2026-09-04) — **la otra dirección de la misma red.** Hasta hoy la defensa contra el
// fallo era PROHIBIR `/NN`, porque no compilaba. Los tokens pasan a declararse por canales
// (`--copper-ch: 201 125 70` + `rgb(var(--copper-ch) / <alpha-value>)` en
// `tailwind.config.js`), así que ahora sí compila — y una prohibición levantada sin una
// medición que la sustituya es exactamente cómo volvería el fallo en silencio.
//
// Se mide sobre `/design-tokens`, que es donde viven las cuatro cajas de prueba: una clase
// solo llega al CSS si Tailwind la ve escrita en el código, así que la prueba no puede
// inventarse la clase — tiene que existir en una pantalla de verdad.
test("el modificador de opacidad sobre un token compone un color real, no se descarta", async ({
  page,
}) => {
  await page.goto("/design-tokens?theme=dark");

  const medido = await page.evaluate(() => {
    function leer(marca: string, propiedad: "borderTopColor" | "backgroundColor" | "color") {
      const el = document.querySelector(`[data-opacidad="${marca}"]`);
      if (!el) return null;
      return getComputedStyle(el)[propiedad];
    }
    return {
      bordeCobre: leer("borde-cobre", "borderTopColor"),
      bordeApagado: leer("borde-apagado", "borderTopColor"),
      fondoAcento: leer("fondo-acento", "backgroundColor"),
      textoApagado: leer("texto-apagado", "color"),
    };
  });

  // Ninguno puede ser `null`: eso significaría que la sección de prueba desapareció de la
  // pantalla y la medición estaría midiendo el vacío — el modo exacto en que una prueba en
  // verde deja de probar algo.
  expect(medido.bordeCobre).not.toBeNull();
  expect(medido.bordeApagado).not.toBeNull();
  expect(medido.fondoAcento).not.toBeNull();
  expect(medido.textoApagado).not.toBeNull();

  // Y cada uno tiene que ser el token con SU alfa, no el gris del preflight (`#e5e7eb` →
  // `rgb(229, 231, 235)`), no `currentColor` heredado y no transparente. Se comprueba el
  // canal alfa explícitamente: un `rgb(...)` sin alfa significaría que Tailwind emitió el
  // color entero y se comió el modificador, que es un fallo distinto y también silencioso.
  expect(medido.bordeCobre).toBe("rgba(201, 125, 70, 0.3)");
  expect(medido.bordeApagado).toBe("rgba(139, 153, 161, 0.25)");
  expect(medido.fondoAcento).toBe("rgba(74, 155, 184, 0.1)");
  expect(medido.textoApagado).toBe("rgba(139, 153, 161, 0.6)");
});
