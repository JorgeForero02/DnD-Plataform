# Desbordes — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que nada que se despliega o se explica se dibuje fuera de su sitio —un panel flotante se ve entero por encima de lo que lo rodea; un texto cabe en su casilla o la casilla crece— y **una sola prueba de navegador genérica** que lo mida en todas las pantallas para que no vuelva a pasar con el siguiente desplegable.

**Architecture:** Un componente `ui/PanelFlotante` montado en un **portal al `body`** con `position: fixed` calculada desde el rectángulo del disparador (foco, `Escape`, clic fuera, devolución del foco, recálculo en scroll/resize), que sustituye a los tres `absolute … z-30` que hoy viven dentro de contenedores con `overflow` (`TirarAtaqueBoton`, `PanelDeTirada` vía `TirarBoton`/`SelectorDeVentaja`, `MenuDeAcciones`). Las casillas de cabecera dejan de recortar la traza. Y `apps/web/e2e/desbordes.spec.ts` recorre las pantallas con la semilla demo, abre cada desplegable y afirma que ningún elemento visible se sale de su ancestro recortador ni de la ventana, con `test.fail()` por cada caso conocido hasta que se arregle.

**Tech Stack:** React 18 (`createPortal`), Tailwind, Playwright (Chromium), la semilla `scripts/seed-demo.mjs`.

**Spec:** [docs/superpowers/specs/2026-09-13-desbordes-design.md](../specs/2026-09-13-desbordes-design.md), aprobada por el autor. La evidencia de producción está en su §2.1 y **no se re-verifica**. Proceso: **D-CF-65 enmendada por D-CF-67** (`docs/decisiones.md`, `docs/04-convenciones.md`).

## Global Constraints

- **Sin unitarias ni mutación por tarea (D-CF-67).** Cada tarea cierra con `pnpm verify` limpio (las unitarias existentes siguen pasando; si una RTL existente se rompe por el portal, **se adapta al comportamiento nuevo, nunca se borra ni se afloja**) y con `pnpm --filter @dnd/web exec playwright test e2e/desbordes.spec.ts` en verde sobre lo que tocó — **corrido por el propio implementador**, solo ese fichero, un agente a la vez. Ningún otro spec de Playwright lo corre el implementador.
- **Playwright reutiliza el servidor**: `playwright.config.ts` levanta la API (`start:prod` tras `build`) en `:3000` y la web en `:5173` con `reuseExistingServer`. **No dejar ningún `dev:api`/`vite` arrancado a mano**; no compilar la API mientras corre una tanda de Playwright.
- **La semilla demo** (`node scripts/seed-demo.mjs`, contra `http://localhost:3000`) es idempotente y crea: cuentas `demo-dm@demo.invalid` / `demo-jugadora@demo.invalid` / `demo-jugador@demo.invalid` (contraseña `demo-de-la-sala-2026`, salvo `SEED_DEMO_PASSWORD`), la campaña `[demo] La mina perdida`, personajes, PNJ, una sesión en curso y **un encuentro con iniciativa**. Los spec de esta tanda la ejecutan en `beforeAll` con `child_process.execFileSync("node", ["../../scripts/seed-demo.mjs"])` (ruta relativa a `apps/web`) y entran como la DM.
- **Reglas de interfaz vinculantes** (`04-convenciones.md`): iconos dibujados; un control **se deshabilita con su motivo, nunca se esconde**; si un texto explica una regla y discrepan, miente el texto; **lo que solo se ve maquetado se mide en el navegador** (esta tanda entera es esa regla). **No se rediseña ningún panel**: mismo contenido, mismo sitio visual, solo que ahora se ve entero (spec §5).
- **Accesibilidad que ya existe y se conserva**: `aria-expanded` en el disparador, `role="group"`/`listbox`/`menu` con `aria-label`, foco al abrir, `Escape` cierra (anidado: un cierre a la vez en `TirarAtaqueBoton`), devolución del foco al disparador al cerrar, teclado completo en `MenuDeAcciones`.
- **Guardas de siempre**: si se renombra o retira un rótulo visible, `grep` en `apps/web/e2e` y ajustar en el mismo commit; todo Bash de más de 120 s lleva `timeout: 600000` como parámetro de la herramienta, **INCLUIDO `git commit`** (el gancho corre `pnpm verify`), y en primer plano.
- **Frontera de herramientas**: no desplegar, no correr la suite Playwright entera ni los e2e de API, no empujar, no lanzar agentes, no desactivar pruebas, no rediseñar lo decidido. Un commit por tarea, mensaje en inglés (Conventional Commits) con las dos líneas de atribución.
- **Lo que NO entra** (spec §5): lógica de combate/objetivos/audiencia/servidor; zoom del `iframe` del tablero; la mesa a 390 px (`mesa-en-estrecho.spec.ts` ya tiene su `test.fail`).

## Decisiones de ejecución tomadas al escribir el plan (E-DB-*)

| | Decisión | Por qué |
|---|---|---|
| E-DB-1 | **`PanelFlotante` usa `createPortal(document.body)` + `position: fixed`**, no `absolute` con `z` alto: un portal sale de cualquier `overflow` por construcción; un `z` alto no sale de un recorte | Spec §3.1 daba las dos; solo una resuelve el §2.1 |
| E-DB-2 | **`z-50` para el panel** (por encima del velo `z-40` de `ui/Dialog`): un panel abierto dentro de un cajón (la hoja del DM «Su hoja», el cajón Personajes) tiene que verse encima del cajón | `Dialog.tsx:191` |
| E-DB-3 | **El `Escape` anidado de `TirarAtaqueBoton` se conserva** con una prop `onEscape?: () => void` que sustituye al cierre por defecto: primero cierra la lista de objetivos, luego el panel | Comportamiento ya revisado y con prueba |
| E-DB-4 | **Clic fuera cierra** (`mousedown` en `document` fuera del panel y del disparador); hoy `TirarAtaqueBoton` no lo hace y `MenuDeAcciones` sí — se unifica en «sí» | Es lo que hace todo desplegable de la industria; sin ello un panel fijo en el `body` queda colgado al hacer scroll fuera de él |
| E-DB-5 | **El panel se recoloca en `scroll` y `resize`** (listeners pasivos, `capture: true` para los scrolls internos) y **si no cabe debajo se abre encima**; si no cabe a la derecha se alinea a la izquierda del disparador; nunca fuera de la ventana con margen de 16 px | Spec §1: «por encima de lo que lo rodea» y «ni de la ventana» |
| E-DB-6 | **La prueba genérica ignora `<select>` nativos, `.sr-only`, `[aria-hidden="true"]`, elementos sin caja (`getClientRects().length === 0`) y el `iframe` del tablero**; y **excusa el desplazamiento legítimo**: un elemento dentro de un ancestro que hace scroll en ese eje y cuyo rectángulo cae dentro del área desplazable del ancestro **no es desborde** — salvo que sea un desplegable abierto (`[data-panel-flotante]`, `[role=listbox]`, `[role=menu]`, `details[open] > :not(summary)`), que tiene que caber en el **cliente** del ancestro sin hacerle scroll (spec §3.3) | Un `overflow-x-auto` con tabla ancha es correcto; el ataque recortado no |
| E-DB-7 | **Texto que se sale = `scrollWidth > clientWidth + 1` (o alto) en un elemento cuyo `overflow` es `visible`** en ese eje, o un hijo con rectángulo fuera del de su padre visible | Es la mitad §2.2: la casilla no recorta y el texto se dibuja fuera del borde |
| E-DB-8 | **Ventana de medida: 1280×800** (la de `playwright.config.ts`) y **una segunda pasada a 1024×768** en la hoja y la mesa. **No 390**: tiene su ficha y su `test.fail` en `mesa-en-estrecho` | Spec §5 |
| E-DB-9 | **La auditoría (Tarea 0) se hace con un spec temporal `apps/web/e2e/_auditoria-desbordes.spec.ts` que imprime las medidas y NO se commitea** (se borra al terminar la tarea); su salida va al ledger, una línea por desborde | Playwright ya tiene servidor y semilla; un MCP de navegador no está disponible |
| E-DB-10 | **Las casillas de cabecera (§2.2)**: la traza desplegada sale del `nowrap` y **se pinta como bloque debajo del número, con `whitespace-normal`, dentro del ancho de la casilla que crece hacia abajo** (el `slot desplegable` de `Casilla` ya existe para eso desde el pulido); si la Tarea 0 mide que aún se sale, `min-w` por contenido en la casilla afectada | Spec §3.2 lo deja al implementador «con la regla» — esta es la regla aplicada |

## Mapa de ficheros

| Fichero | Responsabilidad | Tarea |
|---|---|---|
| `apps/web/e2e/_auditoria-desbordes.spec.ts` (temporal, **no se commitea**) | Recorre pantallas y desplegables e imprime los desbordes medidos | T0 |
| `apps/web/e2e/desbordes.spec.ts` **(nuevo)** | La prueba genérica «nada se sale», con `test.fail()` por caso conocido | T1 (roja donde toca) · T2/T3 (pasan a verde) |
| `apps/web/src/ui/PanelFlotante.tsx` **(nuevo)**, `apps/web/src/ui/index.ts` | El panel en portal | T2 |
| `apps/web/src/features/character-sheet/TirarAtaqueBoton.tsx`, `apps/web/src/features/rolls/PanelDeTirada.tsx`, `apps/web/src/features/character-sheet/TirarBoton.tsx`, `apps/web/src/features/rolls/SelectorDeVentaja.tsx`, `apps/web/src/ui/MenuDeAcciones.tsx` (+ lo que liste la T0) | Migran a `PanelFlotante` | T2 |
| RTL existentes de esos componentes (`__tests__/`) | Se adaptan al portal (`screen.getByRole` sigue viendo el contenido porque el portal cuelga de `document.body`) | T2 |
| `apps/web/src/features/character-sheet/Casilla.tsx`, `Cabecera.tsx` (+ lo que liste la T0) | Texto que se sale | T3 |
| `docs/08-pruebas.md`, `docs/06-pendientes.md`, `docs/07-historial.md`, `docs/como-seguir.md` | Cierre | T4 |

---

### Task 0: Auditoría en el navegador — la lista real de desbordes (no arregla nada)

**Files:**
- Create (temporal, se borra al final de la tarea, **no se commitea**): `apps/web/e2e/_auditoria-desbordes.spec.ts`
- Modify: `.superpowers/sdd/2026-09-13-desbordes/progress.md` (sección `## Auditoría (T0)`, **una línea por desborde**)

**Interfaces:**
- Produces: la lista que gobierna T1–T3. Formato de cada línea: `- [tipo panel|texto] <pantalla> · <qué se abre> · <fichero:línea del elemento> · recorta <fichero:línea del ancestro o "ventana"> · <N px fuera (eje)> · <ventana 1280|1024>`.
- Produces también: la función `medirDesbordes(page)` (Step 2), que **T1 copia tal cual** a `desbordes.spec.ts`.

- [ ] **Step 1: Semilla y sesión**

En `apps/web/e2e/_auditoria-desbordes.spec.ts`:

```ts
import { execFileSync } from "node:child_process";
import { test, type Page } from "@playwright/test";

const DM = { email: "demo-dm@demo.invalid", password: process.env.SEED_DEMO_PASSWORD ?? "demo-de-la-sala-2026" };

test.beforeAll(() => {
  // La semilla habla por HTTP con la API que Playwright ya levantó en :3000; es idempotente.
  execFileSync("node", ["../../scripts/seed-demo.mjs", "--base", "http://localhost:3000"], { stdio: "inherit", timeout: 300_000 });
});

async function entrarComoDM(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(DM.email);
  await page.getByLabel("Contraseña").fill(DM.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("heading", { name: "Tus crónicas" }).waitFor();
}
```

(Comprueba los rótulos reales del login en `apps/web/e2e/sobrecarga.spec.ts` / `cuenta.spec.ts`. Si la API de Playwright no escucha en `:3000` porque hay `WORKTREE_SLOT`, usa `process.env.WORKTREE_SLOT` para calcular el puerto como hace `apps/web/worktree-slot.ts`.)

- [ ] **Step 2: La medida, en `page.evaluate`**

```ts
export interface Desborde {
  tipo: "panel" | "texto";
  elemento: string;   // selector legible: tag#id.clase[aria-label]
  ancestro: string;   // ídem, o "ventana"
  fuera: { izquierda: number; derecha: number; arriba: number; abajo: number }; // px, redondeados
}

/** Todo lo visible que se sale de su ancestro recortador más cercano o de la ventana (E-DB-6/7). */
export async function medirDesbordes(page: Page): Promise<Desborde[]> {
  return page.evaluate(() => {
    const TOLERANCIA = 1;
    const describir = (el: Element) => {
      const id = el.id ? `#${el.id}` : "";
      const aria = el.getAttribute("aria-label") ? `[aria-label="${el.getAttribute("aria-label")}"]` : "";
      const clases = Array.from(el.classList).slice(0, 3).join(".");
      return `${el.tagName.toLowerCase()}${id}${clases ? "." + clases : ""}${aria}`;
    };
    const recorta = (cs: CSSStyleDeclaration) => ({
      x: cs.overflowX !== "visible", y: cs.overflowY !== "visible",
    });
    const esDesplegableAbierto = (el: Element) =>
      el.matches('[data-panel-flotante], [role="listbox"], [role="menu"], details[open] > :not(summary)') ||
      el.closest('[data-panel-flotante], [role="listbox"], [role="menu"]') !== null;
    const ignorar = (el: Element) =>
      el.matches('select, option, iframe, .sr-only, [aria-hidden="true"], script, style') ||
      el.closest('select, iframe, [aria-hidden="true"]') !== null;

    const salida: Desborde[] = [];
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      if (ignorar(el) || el.getClientRects().length === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;

      // 1) Texto que se sale de su propia caja visible (E-DB-7).
      const propio = recorta(cs);
      const fueraX = !propio.x && el.scrollWidth > el.clientWidth + TOLERANCIA && el.clientWidth > 0;
      const fueraY = !propio.y && el.scrollHeight > el.clientHeight + TOLERANCIA && el.clientHeight > 0;
      if (fueraX || fueraY) {
        salida.push({ tipo: "texto", elemento: describir(el), ancestro: describir(el),
          fuera: { izquierda: 0, derecha: fueraX ? el.scrollWidth - el.clientWidth : 0, arriba: 0, abajo: fueraY ? el.scrollHeight - el.clientHeight : 0 } });
      }

      // 2) Fuera del ancestro recortador más cercano (o de la ventana).
      let a: HTMLElement | null = el.parentElement;
      while (a && a !== document.body) {
        const ca = getComputedStyle(a); const rc = recorta(ca);
        if (rc.x || rc.y) break;
        a = a.parentElement;
      }
      const abierto = esDesplegableAbierto(el);
      const caja = a && a !== document.body ? a.getBoundingClientRect() : new DOMRect(0, 0, vw, vh);
      const ca = a && a !== document.body ? getComputedStyle(a) : null;
      const rc = ca ? recorta(ca) : { x: true, y: true };
      // Desplazamiento legítimo: el ancestro hace scroll en ese eje y el elemento cae dentro del
      // área desplazable — salvo desplegables abiertos, que tienen que caber en el CLIENTE (E-DB-6).
      const excusaX = !abierto && a && rc.x && ["auto", "scroll"].includes(ca!.overflowX) && r.right <= caja.left + a.scrollWidth - a.scrollLeft + TOLERANCIA;
      const excusaY = !abierto && a && rc.y && ["auto", "scroll"].includes(ca!.overflowY) && r.bottom <= caja.top + a.scrollHeight - a.scrollTop + TOLERANCIA;
      const fuera = {
        izquierda: rc.x && !excusaX ? Math.max(0, Math.round(caja.left - r.left)) : 0,
        derecha: rc.x && !excusaX ? Math.max(0, Math.round(r.right - caja.right)) : 0,
        arriba: rc.y && !excusaY ? Math.max(0, Math.round(caja.top - r.top)) : 0,
        abajo: rc.y && !excusaY ? Math.max(0, Math.round(r.bottom - caja.bottom)) : 0,
      };
      if (Object.values(fuera).some((v) => v > TOLERANCIA)) {
        salida.push({ tipo: abierto ? "panel" : "texto", elemento: describir(el), ancestro: a && a !== document.body ? describir(a) : "ventana", fuera });
      }
    }
    // Un desborde por elemento raíz: si un panel se sale, sus hijos también; se queda el más externo.
    return salida.filter((d, i) => !salida.slice(0, i).some((p) => d.elemento !== p.elemento && document.querySelector(`[aria-label="${p.elemento.split('[aria-label="')[1]?.slice(0, -2) ?? " "}"]`)?.contains(document.querySelector(`[aria-label="${d.elemento.split('[aria-label="')[1]?.slice(0, -2) ?? " "}"]`) ?? null)));
  });
}
```

El filtro final de «se queda el más externo» es una aproximación: **si da ruido, sustitúyelo por marcar cada elemento medido con un `data-desborde-visto` y saltar a los descendientes de uno ya anotado** — lo importante es que la lista del ledger no tenga cien hijos de un solo panel.

- [ ] **Step 3: El recorrido**

Un `test` por pantalla, cada uno: navega, abre lo que haya que abrir, llama a `medirDesbordes`, e imprime con `console.log(JSON.stringify({ pantalla, ventana, desbordes }, null, 2))`. Pantallas y desplegables (mínimo; añade lo que veas):

1. `/` (crónicas) → menú de usuario/tema si existe.
2. Campaña `[demo] La mina perdida` → Resumen; pestañas El mundo (árbol: abrir un nodo, el detalle con el anillo de vecinos), Sesiones, Reglas, Dados (panel de dados: modo avanzado, selector de audiencia, tirar), Tablas, Ajustes (bloque «Reglas de la mesa»: radio «Con dados»).
3. Cajón Personajes → «Nuevo personaje» (diálogo) → Cancelar; Bestiario; Catálogo (filtros).
4. Hoja de un personaje de jugador y hoja de un PNJ (Bestiario → PNJ instanciado): **cada casilla de cabecera con su traza abierta** (CA, INIC., VEL., PG, COMP.), pestañas Números / Rasgos / Ataques (**icono de tirada del arma → «Atacar» → lista de objetivos** — el caso §2.1; hace falta el encuentro `ACTIVE` de la semilla), Objetos (menú «…» de una fila), Conjuros, Recursos, Estado (`<details>` de condiciones).
5. Mesa de la sesión en curso: elenco (menú «…» de una fila, mandos de combatiente), panel de dados de la mesa, selector de audiencia, tira de iniciativa, cajón del registro abierto, «Su hoja» del DM sobre un combatiente (cajón) y dentro de él el panel de ataque.
6. Repite 4 y 5 a **1024×768** (`page.setViewportSize`).

- [ ] **Step 4: Correr y volcar al ledger**

Run: `pnpm --filter @dnd/web exec playwright test e2e/_auditoria-desbordes.spec.ts --reporter=line` (timeout 600000).
Expected: termina (los `test` no afirman nada; solo imprimen). Copia **una línea por desborde real** al ledger, en el formato de arriba, agrupadas por `panel` y `texto`, y quita los falsos positivos **diciendo por qué lo son** (p. ej. una tabla ancha en `overflow-x-auto` que la excusa no pilló: anótalo como «falso positivo: desplazamiento legítimo — la excusa de E-DB-6 debe cubrirlo» para que T1 afine la medida).

- [ ] **Step 5: Borrar el spec temporal y verificar**

`rm apps/web/e2e/_auditoria-desbordes.spec.ts`. Run: `pnpm verify` (timeout 600000). Expected: exit 0, árbol limpio (`git status` sin ficheros de esta tarea; el ledger está en `.gitignore`). **No hay commit en esta tarea.**

---

### Task 1: `desbordes.spec.ts` — la prueba genérica, roja donde toca

**Files:**
- Create: `apps/web/e2e/desbordes.spec.ts`

**Interfaces:**
- Consumes: la lista del ledger (T0) y `medirDesbordes` (T0, Step 2, con los ajustes que la auditoría pidió).
- Produces: los `test.fail()` que T2 y T3 convierten en `test` normales al arreglar.

- [ ] **Step 1: Estructura**

```ts
import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";

// Desbordes (spec 2026-09-13, D-CF-67) — **la única prueba de esta tanda**. Recorre las pantallas
// con la semilla demo, abre cada desplegable y afirma que ningún elemento visible se sale del
// rectángulo de su ancestro recortador más cercano ni de la ventana. `jsdom` no maqueta: un
// `absolute` dentro de un `overflow-x-auto` recortó la lista de objetivos al atacar con 1 601
// unitarias en verde. Cada caso conocido va con `test.fail()` hasta que su tarea lo arregle
// (mismo patrón que `mesa-en-estrecho.spec.ts`).

test.beforeAll(() => { /* semilla, como T0 */ });
test.beforeEach(async ({ page }) => { await entrarComoDM(page); });

/** Afirma «nada se sale» en la pantalla actual y, si hay algo, lo enseña legible. */
async function nadaSeSale(page: Page, pantalla: string) {
  const desbordes = await medirDesbordes(page);
  expect(desbordes, `${pantalla}: ${JSON.stringify(desbordes, null, 2)}`).toEqual([]);
}
```

- [ ] **Step 2: Un `test` por pantalla + desplegable**, con el recorrido de T0. Los que la T0 midió rojos llevan `test.fail()` y un comentario `// Desborde conocido (T0): <línea del ledger>. Lo arregla la Tarea N.`; los demás son `test` normales y **tienen que estar en verde ya**. Añade `test.describe("a 1024 px", …)` con `test.use({ viewport: { width: 1024, height: 768 } })` para hoja y mesa.

- [ ] **Step 3: Correr**

Run: `pnpm --filter @dnd/web exec playwright test e2e/desbordes.spec.ts` (timeout 600000).
Expected: **todo verde** — los `test.fail()` cuentan como verdes mientras fallan; si uno de ellos pasa (no falla), el ledger estaba mal: quítale el `test.fail()` y anótalo. Si uno sin `test.fail()` está rojo, es un desborde que T0 no vio: **añádelo al ledger y ponle `test.fail()`**, no lo escondas.

- [ ] **Step 4: `pnpm verify`** (timeout 600000; `pnpm update:estado` regenerará el bloque de e2e del 08). Commit: `test(e2e): desbordes.spec.ts — nothing visible leaves its clipping ancestor or the viewport; known overflows pinned with test.fail()`.

---

### Task 2: `ui/PanelFlotante` en portal, y migrar todos los paneles

**Files:**
- Create: `apps/web/src/ui/PanelFlotante.tsx`; Modify: `apps/web/src/ui/index.ts`
- Modify: `apps/web/src/features/character-sheet/TirarAtaqueBoton.tsx` (líneas ~250–300: el `<span className="relative …">` y el `<div className="absolute … z-30 …">`)
- Modify: `apps/web/src/features/rolls/PanelDeTirada.tsx:102` (y sus montadores `TirarBoton.tsx`, `SelectorDeVentaja.tsx` si posicionan)
- Modify: `apps/web/src/ui/MenuDeAcciones.tsx:159`
- Modify: lo demás que la lista `panel` de T0 nombre
- Modify: sus RTL en `__tests__/` (solo lo que el portal cambie: p. ej. `container.querySelector` → `screen.getByRole`)
- Modify: `apps/web/e2e/desbordes.spec.ts` (los `test.fail()` de paneles → `test`)

**Interfaces:**
- Produces:
  ```tsx
  export interface PanelFlotanteProps {
    abierto: boolean;
    /** El botón que lo abre: de su rectángulo sale la posición, y recibe el foco al cerrar. */
    disparador: React.RefObject<HTMLElement>;
    onCerrar: () => void;
    /** Sustituye al cierre por defecto con Escape (E-DB-3: cierres anidados). */
    onEscape?: () => void;
    role?: "group" | "menu" | "dialog";
    etiqueta: string;                 // aria-label
    ancho?: string;                   // clases Tailwind de ancho, p. ej. "w-[21rem] max-w-[calc(100vw-2rem)]"
    alinear?: "derecha" | "izquierda"; // borde del disparador con el que se alinea; por defecto "derecha"
    className?: string;
    children: React.ReactNode;
  }
  export function PanelFlotante(props: PanelFlotanteProps): JSX.Element | null;
  ```
  El panel renderiza `<div data-panel-flotante role=… aria-label=… tabIndex={-1} style={{ position: "fixed", top, left }} className="z-50 rounded-radius-md border border-accent bg-surface p-s3 text-left shadow-[…] …">`.

- [ ] **Step 1: El componente**

```tsx
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

// Desbordes (spec 2026-09-13, E-DB-1..5). **Un panel que se despliega vive en el `body`**, no
// dentro del contenedor que lo abre: un `absolute` dentro de un `overflow-*` queda recortado en
// los dos ejes aunque solo se pidiera recorte horizontal (§2.1: la lista de objetivos al atacar,
// 740 px dentro de 68). El portal sale de cualquier recorte por construcción; la posición se calcula
// desde el rectángulo del disparador y se recalcula en scroll y resize.

const MARGEN = 16;      // px hasta el borde de la ventana
const SEPARACION = 4;   // px entre disparador y panel (el `top-[calc(100%+0.25rem)]` de antes)

export function PanelFlotante({ abierto, disparador, onCerrar, onEscape, role = "group", etiqueta, ancho = "w-[21rem] max-w-[calc(100vw-2rem)]", alinear = "derecha", className = "", children }: PanelFlotanteProps) {
  const caja = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const colocar = () => {
    const d = disparador.current?.getBoundingClientRect();
    const p = caja.current?.getBoundingClientRect();
    if (!d || !p) return;
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    let left = alinear === "derecha" ? d.right - p.width : d.left;
    if (left + p.width > vw - MARGEN) left = vw - MARGEN - p.width;
    if (left < MARGEN) left = MARGEN;
    let top = d.bottom + SEPARACION;
    if (top + p.height > vh - MARGEN && d.top - SEPARACION - p.height >= MARGEN) top = d.top - SEPARACION - p.height; // encima si no cabe debajo
    if (top + p.height > vh - MARGEN) top = Math.max(MARGEN, vh - MARGEN - p.height);
    setPos({ top, left });
  };

  useLayoutEffect(() => { if (abierto) colocar(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [abierto, children]);
  useEffect(() => {
    if (!abierto) return;
    caja.current?.focus();
    const onScroll = () => colocar();
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll);
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (caja.current?.contains(t) || disparador.current?.contains(t)) return;
      onCerrar();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  // El foco vuelve al disparador al cerrar — lo que `TirarAtaqueBoton.cerrar` hacía a mano.
  const abiertoAntes = useRef(false);
  useEffect(() => { if (abiertoAntes.current && !abierto) disparador.current?.focus(); abiertoAntes.current = abierto; }, [abierto, disparador]);

  if (!abierto) return null;
  return createPortal(
    <div
      ref={caja}
      data-panel-flotante=""
      role={role}
      aria-label={etiqueta}
      tabIndex={-1}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); (onEscape ?? onCerrar)(); } }}
      style={pos ? { position: "fixed", top: pos.top, left: pos.left } : { position: "fixed", top: 0, left: 0, visibility: "hidden" }}
      className={`z-50 ${ancho} rounded-radius-md border border-accent bg-surface p-s3 text-left shadow-[0_18px_40px_-24px_var(--sheet-shadow)] ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
}
```

Los `eslint-disable-line` de `exhaustive-deps` **llevan su motivo en un comentario** (`colocar` lee refs; meterla en deps la haría recrearse en cada render). Si el lint de la casa prohíbe el disable, extrae `colocar` con `useCallback`.

- [ ] **Step 2: Migrar `TirarAtaqueBoton`**: el `<span className="relative inline-flex shrink-0">` pierde `relative` (ya no posiciona nada); el `<div ref={caja} … className="absolute …">` pasa a `<PanelFlotante abierto={abierto} disparador={dado} onCerrar={cerrar} onEscape={() => (objetivoAbierto ? setObjetivoAbierto(false) : cerrar())} etiqueta={`Tirada de ${ataque.name}`} ancho="w-[21rem] max-w-[calc(100vw-2rem)]">…mismo contenido…</PanelFlotante>`; se quitan el `useEffect` de foco y el `dado.current?.focus()` de `cerrar` (el panel ya lo hace). **Nada más cambia dentro.**
- [ ] **Step 3: Migrar `PanelDeTirada`** (recibe ya `onCerrar`; necesita el `disparador`: añade la prop `disparador: RefObject<HTMLElement>` y pásala desde `TirarBoton.tsx` y `SelectorDeVentaja.tsx`/donde se monte — grep `PanelDeTirada`), y **`MenuDeAcciones`** (`role="menu"`, `alinear="derecha"`, `ancho="min-w-[11rem]"`, y su estilo `border-muted py-1 shadow-lg` por `className`; su teclado —flechas, Home/End— se conserva porque el contenido es el mismo). Después, **cada fichero de la lista `panel` de T0** que quede.
- [ ] **Step 4: RTL existentes**: corre `pnpm --filter @dnd/web test -- TirarAtaqueBoton PanelDeTirada MenuDeAcciones TirarBoton SelectorDeVentaja` (timeout 600000). Lo que se rompa por el portal se adapta (`screen.*` en vez de `within(container)`); **nada se borra**. Si una prueba afirmaba `className` con `absolute`, cambia la aserción al comportamiento (está en el documento, tiene `role`, `aria-label`).
- [ ] **Step 5: La prueba gráfica**: en `desbordes.spec.ts`, los `test.fail()` de tipo `panel` pasan a `test`. Run: `pnpm --filter @dnd/web exec playwright test e2e/desbordes.spec.ts` (timeout 600000). Expected: verde entero (los de `texto` siguen con su `test.fail()`). Si un panel migrado sigue rojo, mide por qué (¿`z-50` bajo un `Dialog`? ¿posición fuera de la ventana?) y arregla el componente, no el test.
- [ ] **Step 6: Guarda de rótulos**: `grep -rn "Tirada de\|Cerrar\|Atacar\|Objetivo del ataque" apps/web/e2e` — los localizadores por rol siguen valiendo (el contenido no cambia); si alguno buscaba dentro de un contenedor (`locator(".relative")…`), ajústalo.
- [ ] **Step 7: `pnpm verify`** (timeout 600000). Commit: `feat(ui): PanelFlotante in a body portal — the attack, roll and action panels are no longer clipped by overflow ancestors`.

---

### Task 3: Casillas de cabecera y cualquier otro texto que se sale

**Files:**
- Modify: `apps/web/src/features/character-sheet/Casilla.tsx` (slot `desplegable`, `ANCHO_CASILLA`), `apps/web/src/features/character-sheet/Cabecera.tsx` si la traza se pinta ahí
- Modify: lo demás que la lista `texto` de T0 nombre
- Modify: `apps/web/e2e/desbordes.spec.ts` (los `test.fail()` de texto → `test`)
- Modify: `apps/web/e2e/hoja.spec.ts` **solo si** su medida de casillas (`ANCHO_CASILLA` 6rem, alturas) cambia de valor esperado — con motivo en el fichero

**Interfaces:**
- Consumes: `Casilla` con `desplegable?: ReactNode` (slot ya existente, `whitespace-normal text-left`).

- [ ] **Step 1: Medir primero.** Con la lista de T0 abierta, abre la hoja en el navegador (Playwright del Step 3, o `page.pause()` no — usa las medidas de la prueba) y confirma **qué elemento** de la casilla se sale: si es la traza (`data-testid="casilla-desplegable"`), la regla E-DB-10 aplica: la traza es bloque debajo del número, `whitespace-normal break-words`, y **la casilla puede crecer hacia abajo** (la rejilla `grid-rows-[auto_1fr_auto_auto]` ya lo permite; comprueba que ningún `h-` fijo del contenedor de la cabecera la recorte — `ALTO_CASILLA_REM` es el alto **con la traza plegada**; abierta, la fila crece). Si es la cifra o el rótulo (`whitespace-nowrap`), entonces `min-w` por contenido: sustituye `w-[6rem]` por `min-w-[6rem]` **solo en esa casilla**, y anota en el fichero por qué (el pulido fijó 6rem para que las cinco fueran uniformes; una que crece rompe la uniformidad a propósito antes que recortar).
- [ ] **Step 2: Los demás `texto` de la lista**: mismo criterio — el texto envuelve dentro (`break-words`, `min-w-0` en hijos de flex que no encogen) o la caja crece; nunca `overflow-hidden` para esconderlo (eso es el fallo, no el arreglo).
- [ ] **Step 3: La prueba gráfica**: los `test.fail()` de tipo `texto` pasan a `test`. Run: `pnpm --filter @dnd/web exec playwright test e2e/desbordes.spec.ts` (timeout 600000). Expected: **verde entero, sin ningún `test.fail()` restante**. Si algo se resiste, anótalo con su medida en el ledger y déjalo con `test.fail()` y una línea para 06 — no lo escondas.
- [ ] **Step 4: Guarda**: `grep -rn "casilla\|w-\[6rem\]\|ANCHO_CASILLA" apps/web/e2e` y corre `hoja.spec.ts` **tú NO** — el orquestador lo corre al cerrar; solo asegúrate de que sus aserciones siguen siendo ciertas leyendo el fichero, y si cambias un valor esperado, con motivo.
- [ ] **Step 5: `pnpm verify`** (timeout 600000). Commit: `fix(sheet): header boxes and every clipped text grow or wrap inside their border — nothing draws outside`.

---

### Task 4: Cierre — suite entera, revisión acotada, docs

(Orquestador: la suite y la revisión. Implementador: las docs.)

**Files:**
- Modify: `docs/08-pruebas.md` (qué demuestra `desbordes.spec.ts`, qué ignora —E-DB-6—, cómo se corre, y que bajo D-CF-67 la corre el implementador de la tanda), `docs/06-pendientes.md` (la ficha «Desbordes» se cierra → se archiva según la regla del fichero; lo que quede con `test.fail()` va con su medida), `docs/07-historial.md` (hito de la tanda), `docs/como-seguir.md` §0, `docs/04-convenciones.md` (una línea en las reglas de interfaz: «un desplegable propio vive en `PanelFlotante`; un `absolute` dentro de un `overflow-*` no es una opción»).

- [ ] **Step 1 (orquestador)**: `pnpm --filter @dnd/web e2e` entera una vez (desacoplada, ~16 min) + `hoja.spec.ts`, `hoja-pestanas.spec.ts`, `combate.spec.ts`, `dados.spec.ts`, `tirada.spec.ts`, `espacios.spec.ts` fichero a fichero si la suite no los cubre.
- [ ] **Step 2 (orquestador)**: revisión acotada (Opus) a `ui/PanelFlotante.tsx` + los dos ficheros más tocados (por `git diff --stat`), con `desbordes.spec.ts` como contexto. Olas de arreglo hasta limpio, tope 5.
- [ ] **Step 3 (implementador)**: docs de arriba; `pnpm update:estado`; `pnpm verify`; commit `docs: close the overflow batch — PanelFlotante rule, desbordes.spec.ts, open items`.
- [ ] **Step 4 (orquestador)**: push de la rama; aviso a `d-d-plataform-93` y al autor. **La fusión la decide el autor. No se despliega.**

## Autorrevisión del plan contra la spec

- §1 «nada fuera de su sitio + una prueba genérica» → T1 (prueba), T2 (paneles), T3 (texto). §2.1 → T2 migra `TirarAtaqueBoton` (E-DB-1/2). §2.2 → T3 (E-DB-10). §2.3 inventario → T0 lo convierte en lista real. §3.1 componente único con portal, role, `aria-expanded`, Escape, clic fuera, foco → `PanelFlotante` (E-DB-3/4/5). §3.2 texto → T3. §3.3 prueba única con `boundingBox` contra ancestro y ventana, `select` fuera, `test.fail()` → T1 (E-DB-6/7/8). §3.4 proceso → D-CF-67 (`c34fa62`) y Global Constraints. §4 tareas 0–4 → T0–T4. §5 fuera → respetado.
- Nombres consistentes: `PanelFlotante` y sus props (T2) ↔ `data-panel-flotante` en la medida (T0/T1); `medirDesbordes` (T0) ↔ T1; `desbordes.spec.ts` ↔ T1–T4; `Casilla.desplegable` existe (`Casilla.tsx:44,76`).
