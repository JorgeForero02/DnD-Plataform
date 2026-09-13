import { execFileSync } from "node:child_process";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { apiPortForSlot, getWorktreeSlot } from "../worktree-slot";

// Desbordes (spec 2026-09-13, D-CF-67) — **la única prueba de esta tanda**, recortada por el
// autor a los tres casos que la auditoría (T0) encontró de verdad (ver el ledger,
// `.superpowers/sdd/2026-09-13-desbordes/progress.md`, sección «Auditoría (T0)»): no un recorrido
// genérico por toda la aplicación, sino estos tres, cada uno con `test.fail()` hasta que su tarea
// lo arregle (mismo patrón que `mesa-en-estrecho.spec.ts`):
//
//  1. Hoja (PJ) → Ataques → icono «Tirada de X» → «Atacar» → la lista de objetivos no cabe en el
//     CLIENTE de su ancestro recortador (`overflow-x-auto` de `AtaquesYLanzamiento.tsx`).
//  2. Mesa → elenco → menú «…» de la fila MÁS BAJA → el menú no cabe en el carril scrollable del
//     elenco (`PanelDeMesa.tsx`).
//  3. Hoja → cabecera → traza de «Comp.» abierta → se sale de la ventana por la derecha.
//
// **`medirDesbordes` y sus dos reglas:**
//
//  1. Texto que se sale de su propia caja visible: cualquier elemento SIN hijos de elemento
//     (`el.children.length === 0` — un nodo de solo texto) cuyo `scrollWidth`/`scrollHeight`
//     supere a su `clientWidth`/`clientHeight` sin que su propio `overflow` lo permita.
//  2. Fuera del ancestro recortador más cercano, o de la ventana si ninguno recorta: se sube por
//     los ancestros hasta el primero con `overflow` no visible (o hasta `position: fixed` — ver
//     ajuste 4 — o hasta `document.body`) y se compara la caja del elemento con la de ese
//     ancestro (o con la ventana). Un desplegable ABIERTO tiene que caber en el CLIENTE de su
//     ancestro (E-DB-6): el desplazamiento legítimo (`overflow: auto/scroll` con el elemento
//     dentro del área que se puede alcanzar haciendo scroll) solo excusa a quien NO es un
//     desplegable abierto.
//
// **Exclusiones (E-DB-6)**: `select`, `option`, `iframe`, `.sr-only`, `[aria-hidden="true"]`,
// `script`, `style` (y sus descendientes) no se miden. El desplazamiento vertical legítimo de una
// página normal (sin desplegable abierto) tampoco cuenta: contra la ventana, el eje Y solo se
// exige para un desplegable abierto — el eje X se exige siempre.
//
// **Los cuatro ajustes que la auditoría (T0) pidió a la función tal como la propuso el brief**
// (ver el ledger, «Auditoría (T0)» → «falsos positivos» 1-4, para el porqué completo):
//
//  1. Comprobar que el ancestro que recorta (`ca`) exista antes de mirar su `overflow`: sin
//     ancestro (se sube hasta `document.body`), `ca` es `null` y mirarlo revienta la función en
//     el primer elemento del documento.
//  2. La regla 1 (texto que se sale de su caja) solo se aplica a elementos SIN hijos de elemento
//     — si no, cualquier `<li>`/`<button>` ancestro de un desplegable abierto se cuenta a sí
//     mismo con miles de píxeles de más (es la regla 2, mal atribuida al contenedor entero).
//  3. Contra la ventana, el eje Y solo se exige cuando el elemento es un desplegable ABIERTO — si
//     no, cualquier página más alta que el viewport (casi todas) cuenta como «se sale de la
//     ventana» por desplazarse en vertical, que es lo normal.
//  4. El ancestro-walk para en el primer `position: fixed` (o si el propio elemento ya lo es):
//     esta web no usa `createPortal`, así que un `Dialog` vive DENTRO de lo que sea que lo abrió,
//     y sin este freno el algoritmo sube hasta un contenedor angosto ajeno y lo toma por el que
//     recorta, inventando desbordes de cientos de píxeles que no existen.
//
// Y un ruido universal, sin tocar la función: 2-4 px de redondeo de subpíxel en botones y
// números con `leading-none`, que no se ve — `TOLERANCIA` sube de 1 a 5 para quitarlo sin perder
// los hallazgos reales (71/79/23/8 px, muy por encima de ese umbral).

const SLOT = getWorktreeSlot();
const API_PORT = apiPortForSlot(SLOT);
const CAMPANA = "[demo] La mina perdida";
const DM = {
  email: "demo-dm@demo.invalid",
  password: process.env.SEED_DEMO_PASSWORD ?? "demo-de-la-sala-2026",
};

test.beforeAll(() => {
  // La semilla habla por HTTP con la API que Playwright ya levantó en su puerto de este slot; es
  // idempotente. E-DB-11: desde D-CF-66 arregla el PATCH de nivel con el token de la DM, así que
  // corre limpia tal cual está en esta rama (ver `scripts/seed-demo.mjs`).
  execFileSync("node", ["../../scripts/seed-demo.mjs", "--base", `http://localhost:${API_PORT}`], {
    stdio: "inherit",
    timeout: 300_000,
  });
});

async function entrarComoDM(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(DM.email);
  await page.getByLabel("Contraseña").fill(DM.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await entrarComoDM(page);
});

/** Todo lo visible que se sale de su ancestro recortador más cercano o de la ventana (E-DB-6/7). */
async function medirDesbordes(page: Page) {
  return page.evaluate(() => {
    // 5, no 1: ruido de subpíxel universal (T0, «falsos positivos» 5) — botones y números
    // grandes con `leading-none` se miden a sí mismos con 2-4 px de exceso en CUALQUIER
    // pantalla, abiertos o cerrados; es redondeo de métrica de fuente, no algo que se vea. Con 5
    // desaparece sin tocar los hallazgos reales (71/79/23/8 px, muy por encima de este umbral).
    const TOLERANCIA = 5;
    const describir = (el: Element) => {
      const id = el.id ? `#${el.id}` : "";
      const aria = el.getAttribute("aria-label")
        ? `[aria-label="${el.getAttribute("aria-label")}"]`
        : "";
      const clases = Array.from(el.classList).slice(0, 3).join(".");
      return `${el.tagName.toLowerCase()}${id}${clases ? "." + clases : ""}${aria}`;
    };
    const recorta = (cs: CSSStyleDeclaration) => ({
      x: cs.overflowX !== "visible",
      y: cs.overflowY !== "visible",
    });
    const esDesplegableAbierto = (el: Element) =>
      el.matches(
        '[data-panel-flotante], [role="listbox"], [role="menu"], details[open] > :not(summary)',
      ) || el.closest('[data-panel-flotante], [role="listbox"], [role="menu"]') !== null;
    const ignorar = (el: Element) =>
      el.matches('select, option, iframe, .sr-only, [aria-hidden="true"], script, style') ||
      el.closest('select, iframe, [aria-hidden="true"]') !== null;

    const salida: Array<{
      tipo: "panel" | "texto";
      elemento: string;
      ancestro: string;
      fuera: { izquierda: number; derecha: number; arriba: number; abajo: number };
    }> = [];
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      if (ignorar(el) || el.getClientRects().length === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;

      // Ajuste 2 (T0): regla 1 solo en elementos sin hijos de elemento (nodo de solo texto).
      if (el.children.length === 0) {
        const propio = recorta(cs);
        const fueraX =
          !propio.x && el.scrollWidth > el.clientWidth + TOLERANCIA && el.clientWidth > 0;
        const fueraY =
          !propio.y && el.scrollHeight > el.clientHeight + TOLERANCIA && el.clientHeight > 0;
        if (fueraX || fueraY) {
          salida.push({
            tipo: "texto",
            elemento: describir(el),
            ancestro: describir(el),
            fuera: {
              izquierda: 0,
              derecha: fueraX ? el.scrollWidth - el.clientWidth : 0,
              arriba: 0,
              abajo: fueraY ? el.scrollHeight - el.clientHeight : 0,
            },
          });
        }
      }

      // Regla 2: fuera del ancestro recortador más cercano, o de la ventana.
      // Ajuste 4 (T0): el bucle para en el primer `position: fixed` (esta web no usa
      // createPortal, así que un Dialog vive dentro de lo que sea que lo abrió).
      let a: HTMLElement | null = el.parentElement;
      while (a && a !== document.body) {
        const csA = getComputedStyle(a);
        if (csA.position === "fixed") break;
        const rc = recorta(csA);
        if (rc.x || rc.y) break;
        a = a.parentElement;
      }
      const propioFixed = cs.position === "fixed";
      const aEsFixed =
        a !== null && a !== document.body && getComputedStyle(a).position === "fixed";
      const hayAncestro = a !== null && a !== document.body && !aEsFixed && !propioFixed;

      const abierto = esDesplegableAbierto(el);
      const caja = hayAncestro ? a!.getBoundingClientRect() : new DOMRect(0, 0, vw, vh);
      // Ajuste 1 (T0): comprobar que el ancestro exista antes de mirar su overflow.
      const ca = hayAncestro ? getComputedStyle(a!) : null;
      const rc = ca !== null ? recorta(ca) : { x: true, y: true };

      // Ajuste 3 (T0): contra la ventana, el eje Y solo se exige para un desplegable abierto.
      const exigirY = hayAncestro || abierto;

      // Desplazamiento legítimo: el ancestro hace scroll en ese eje y el elemento cae dentro del
      // área desplazable — salvo desplegables abiertos, que tienen que caber en el CLIENTE
      // (E-DB-6).
      const excusaX =
        !abierto &&
        hayAncestro &&
        rc.x &&
        ["auto", "scroll"].includes(ca!.overflowX) &&
        r.right <= caja.left + a!.scrollWidth - a!.scrollLeft + TOLERANCIA;
      const excusaY =
        !abierto &&
        hayAncestro &&
        rc.y &&
        ["auto", "scroll"].includes(ca!.overflowY) &&
        r.bottom <= caja.top + a!.scrollHeight - a!.scrollTop + TOLERANCIA;

      const fuera = {
        izquierda: rc.x && !excusaX ? Math.max(0, Math.round(caja.left - r.left)) : 0,
        derecha: rc.x && !excusaX ? Math.max(0, Math.round(r.right - caja.right)) : 0,
        arriba: exigirY && rc.y && !excusaY ? Math.max(0, Math.round(caja.top - r.top)) : 0,
        abajo: exigirY && rc.y && !excusaY ? Math.max(0, Math.round(r.bottom - caja.bottom)) : 0,
      };
      if (Object.values(fuera).some((v) => v > TOLERANCIA)) {
        salida.push({
          tipo: abierto ? "panel" : "texto",
          elemento: describir(el),
          ancestro: hayAncestro ? describir(a!) : "ventana",
          fuera,
        });
      }
    }
    // Un desborde por elemento raíz: si un panel se sale, sus hijos también; nos quedamos con
    // los que no son descendientes de otro ya listado (aproximación por aria-label).
    return salida.filter((d, i) => {
      const propio = d.elemento.match(/\[aria-label="([^"]*)"\]/)?.[1];
      return !salida.slice(0, i).some((p) => {
        if (d.elemento === p.elemento) return false;
        const suyo = p.elemento.match(/\[aria-label="([^"]*)"\]/)?.[1];
        if (!propio || !suyo) return false;
        const elP = document.querySelector(`[aria-label="${suyo}"]`);
        const elD = document.querySelector(`[aria-label="${propio}"]`);
        return elP !== null && elD !== null && elP !== elD && elP.contains(elD);
      });
    });
  });
}

/** Afirma «nada se sale» en la pantalla actual y, si hay algo, lo enseña legible. */
async function nadaSeSale(page: Page, pantalla: string) {
  const desbordes = await medirDesbordes(page);
  expect(desbordes, `${pantalla}: ${JSON.stringify(desbordes, null, 2)}`).toEqual([]);
}

/** Abre la traza de una casilla compacta de la cabecera (Traza.tsx: sin aria-label, un único
 * `button[aria-expanded]` dentro del contenedor de la casilla — el resto de botones que puede
 * haber dentro, una vez abierta, son los enlaces «causa» de la traza, sin ese atributo). */
async function abrirCasillaCompacta(resumen: Locator, etiqueta: string) {
  const casilla = resumen.getByText(etiqueta, { exact: true }).locator("xpath=ancestor::div[1]");
  await casilla.locator("button[aria-expanded]").click();
}

async function irACampana(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();
  await page.getByRole("link", { name: CAMPANA }).click();
  await expect(page.getByRole("heading", { name: CAMPANA })).toBeVisible();
}

/** Abre la hoja de Brann desde el cajón Personajes. */
async function abrirHojaDePj(page: Page) {
  await irACampana(page);
  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("link", { name: /Brann/ }).click();
  await expect(page.getByRole("heading", { name: /Brann/ })).toBeVisible();
}

async function abrirPestana(donde: Page | Locator, nombre: string) {
  await donde.getByRole("tab", { name: nombre }).click();
  await expect(donde.getByRole("tab", { name: nombre, selected: true })).toBeVisible();
}

async function irALaMesa(page: Page) {
  await irACampana(page);
  const m = page.url().match(/\/campaigns\/([^/?]+)/);
  if (!m) throw new Error(`No se reconoce el id de campaña en ${page.url()}`);
  await page.goto(`/campaigns/${m[1]}/sesion`);
  await expect(page.getByRole("banner", { name: "Estado de la mesa" })).toBeVisible({
    timeout: 15_000,
  });
}

// --------------------------------------------------------------------------------------------
// Los tres desbordes conocidos — `test.fail()`, exactamente tres en todo el fichero
// --------------------------------------------------------------------------------------------

// Desborde conocido (T0): [panel] Hoja de un PJ o de un PNJ (página propia, o desde el cajón
// «Su hoja» de la mesa) · pestaña Ataques → icono de tirada del arma («Tirada de X») → «Atacar»
// → lista de objetivos · TirarAtaqueBoton.tsx:357 (ul[aria-label="Objetivo del ataque con X"])
// · recorta AtaquesYLanzamiento.tsx:192 (div.overflow-x-auto) · 71 px fuera (abajo) · ventana
// 1280|1024 (mismo resultado en los dos anchos). Lo arregla la Tarea 2.
test.fail(
  "hoja de PJ (Brann): la lista de objetivos al atacar cabe en el cliente de su ancestro",
  async ({ page }) => {
    await abrirHojaDePj(page);
    await abrirPestana(page, "Ataques");
    await page
      .getByRole("button", { name: /^Tirada de /i })
      .first()
      .click();
    await page.getByRole("button", { name: /^Atacar con /i }).click();
    await expect(page.locator('[aria-label^="Objetivo del ataque"]')).toBeVisible();
    await nadaSeSale(page, "hoja de PJ (Brann): lista de objetivos al atacar");
  },
);

// Desborde conocido (T0): [panel] Mesa → elenco → menú «…» de una fila (MandosDeCombatiente.tsx:
// 118, «Más acciones sobre X») · MenuDeAcciones.tsx:152
// (ul[role="menu"][aria-label="Más acciones sobre X"]) · recorta PanelDeMesa.tsx:48
// (div.min-h-0.min-w-0.flex-1, el carril scrollable del elenco «En la mesa») · 79 px fuera
// (abajo) a 1280×800 sobre la fila más baja de la lista. Lo arregla la Tarea 2.
test.fail(
  "mesa: el menú «…» de la fila más baja del elenco cabe en su carril",
  async ({ page }) => {
    await irALaMesa(page);
    const elenco = page.getByRole("region", { name: "En la mesa" });
    // La fila más baja VISUALMENTE es la PRIMERA del DOM (el elenco no ordena el marcado en el
    // mismo sentido que lo pinta) — y el orden de combatientes depende de la iniciativa, tirada
    // al azar por la semilla, así que no es un nombre fijo.
    const menuFilaMasBaja = elenco.getByRole("button", { name: /^Más acciones sobre /i }).first();
    await menuFilaMasBaja.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await nadaSeSale(page, "mesa: menú de la fila más baja del elenco");
  },
);

// Desborde conocido (T0): [texto] Cabecera de la hoja (cualquiera: PJ, PNJ, «Su hoja») · traza
// de la casilla «Comp.» (la última de la tira, pegada al borde derecho) · Traza.tsx:311
// (Casilla.desplegable, la ul/li de ListaDeTraza) · recorta la ventana · 8 px fuera (derecha) ·
// ventana 1280. Lo arregla la Tarea 3.
test.fail("hoja de PJ (Brann): la traza de «Comp.» cabe en la ventana", async ({ page }) => {
  await abrirHojaDePj(page);
  const resumen = page.getByRole("region", { name: "resumen de combate" });
  await abrirCasillaCompacta(resumen, "Comp.");
  await nadaSeSale(page, "hoja de PJ (Brann): traza de «Comp.»");
});
