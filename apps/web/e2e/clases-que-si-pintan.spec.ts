import { test, expect } from "@playwright/test";

// La otra mitad de la red que protege el mismo fallo. El barrido del código fuente vive en
// `src/ui/__tests__/clases-de-opacidad.test.ts`, porque no necesita navegador; **esto sí**: caza
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
