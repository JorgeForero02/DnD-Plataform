# Pulido antes del paso 3 — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal (16 tareas + T14 bis añadida el 2026-09-12):** Que la interfaz deje de parecer «una sección de tablas y tarjetas»: cuatro causas arregladas una vez en las primitivas (tarjeta y rejilla, acciones de fila con menú, iconos completos, bandeja de dados), el hilo hablando de personajes, el tablero PlanarAlly dentro de la mesa, y los tres bugs sueltos (#18, #20, #21) — todo medido en el navegador antes de construir el paso 3 encima.

**Architecture:** Primero **investigación sin código** (Task 0) que deja cinco reglas nuevas en `docs/04-convenciones.md` y una nota de diseño. Después las causas: `Casilla` y `--tira-fija-*` para la cabecera (C1), `e2e/espacios.spec.ts` como red de medición (#17), `Campaign.boardRoomUrl` + `<iframe>` + registro como cajón (C1 bis), `IconoDado` con seis formas y barrido de botones (C3), `ui/MenuDeAcciones.tsx` consumido por el elenco (C2), `dice[]` por dado en el resultado del servidor y `BandejaDeDados` en la web (C5), y `sourceCharacterId` + frases con sujeto y objetivo en `linea-de-log.ts` (C4). Cada tarea lleva su prueba roja antes, su mutación y su documentación en el mismo commit.

**Tech Stack:** React 18 + TanStack Query + react-router + Tailwind con tokens propios; Vitest + RTL; Playwright; NestJS/Fastify + Prisma + Jest; Zod desde `@dnd/shared`.

**Spec:** [`docs/superpowers/specs/2026-09-12-pulido-antes-del-paso-3-design.md`](../specs/2026-09-12-pulido-antes-del-paso-3-design.md) con su [anexo](../specs/2026-09-12-pulido-anexo-lista-del-autor.md) (los 24 puntos). C1 bis argumenta desde [`2026-09-12-owlbear-como-tablero-design.md`](../specs/2026-09-12-owlbear-como-tablero-design.md) § 2 ter (**PlanarAlly**, D-CF-57, commit de6e1b0).

## Global Constraints

- **Código en inglés, interfaz y documentación en español.** Componentes de la web con nombre en español como los que ya existen (`Cabecera`, `TarjetaDeHoja`, `MandosDeCombatiente`).
- **Ningún valor de enumeración llega a pantalla**: todo pasa por el `vocabulario.ts` de su dominio.
- **Los iconos se dibujan** (SVG en trazo `1.6`, `currentColor`, `1em` dentro de texto). Nada de glifos de fuente ni `+` como icono.
- **Una opción con significado va como radios con su frase, nunca en un `<select>`.** «Desplegable» en este plan significa **plegable** (`<details>` o botón que abre/cierra), no un `<select>`.
- **La autorización se comprueba en el servidor**; lo que se pinta solo decide qué se ofrece. `canView` no se reimplementa.
- **Lo que solo se ve maquetado se mide en el navegador** con `boundingBox` y estilo calculado. Los ficheros de Playwright los corre **solo el orquestador**, **uno a uno**, con `pnpm --filter @dnd/web exec playwright test e2e/<fichero>.spec.ts` (D-CF-44). Docker `dd-plataform-db-1` arriba; si otro proyecto ocupa `:3000`, `WORKTREE_SLOT=1` y **no se mata**.
- **Ninguna prueba se borra ni se afloja.** (La única excepción declarada, el tablero telaraña, es de la tanda del mapa, no de esta.)
- **Decisiones ya tomadas no se re-litigan:** dados 3D aplazados (D-CF-55), mesa a 390 px aplazada (D-CF-26), A2 aplazada, multiclase fuera, nada que necesite tablero propio (el tablero es PlanarAlly embebido, D-CF-57, spec del tablero § 2 ter).
- **Una duda de reglas se resuelve con el SRD 5.1 en inglés, y la cita va en el commit.** Este plan solo cita el SRD en Task 13 (*Temporary Hit Points*).
- **No se despliega.** El servicio `tablero-planarally` de Coolify no se toca.
- **Un implementador por árbol.** Las tareas 1–15 tocan `apps/web`; **nunca dos a la vez** en el mismo directorio. Task 9 (API) puede ir en un worktree aparte en paralelo con Task 7 u 8 si se quiere.
- **Verificación por mutación** sobre el código tocado en cada tarea: romper, ver la prueba fallar, restaurar **con `cp`** de una copia previa (`cp fichero fichero.bak` antes; `cp fichero.bak fichero` después; borrar el `.bak`). **Nunca `git checkout` ni `git stash`** para deshacer. Se anota en el informe de la tarea.
- **`pnpm verify` en primer plano** antes de cada commit (lo exige el gancho; nunca `run_in_background`). Comandos unitarios: `pnpm --filter @dnd/web test -- <ruta>` (Vitest), `pnpm --filter @dnd/api test -- <ruta>` (Jest); e2e de API: `pnpm --filter @dnd/api test:e2e -- <nombre>`.
- **Documentación en el mismo commit**: estado en 01–05 si cambia, deuda nueva en 06, una línea en 07 (si 07 pasa de **1000 líneas**, `scripts/check-historial.mjs` falla: se archiva la entrada completa más antigua, entera, con su fila, en `docs/_archivo/`). `progress.md` del plan (`.superpowers/sdd/2026-09-12-pulido-antes-del-paso-3/progress.md`) al día tras cada tarea; el global `.superpowers/sdd/progress.md` al cerrar.
- **Bloque obligatorio en todo encargo** (04-convenciones § *La frontera del encargo es de ficheros y de herramientas*): no despliega, no corre Playwright ni e2e de API, no deja `dev:api` arrancado, no commitea, no empuja, no lanza agentes, no desactiva pruebas, no rediseña lo decidido. Se comprueba al cerrar.
- Commits en inglés, Conventional Commits, con las líneas de atribución de la sesión.

---

## Mapa de ficheros

| Fichero | Responsabilidad |
|---|---|
| `docs/superpowers/notes/2026-09-12-nota-de-diseno-ui-de-juegos.md` (nuevo, Task 0) | Lo que se sacó de BG3, DOS2, Foundry, D&D Beyond, Owlbear; con cita o captura descrita; y los números de medida |
| `docs/04-convenciones.md` (mod, Task 0) | Cinco reglas nuevas de interfaz (reparto de tarjeta, acciones de fila, espacio reservado, sticky con escalón, un dado una forma) |
| `apps/web/src/features/character-sheet/Casilla.tsx` (nuevo, Task 1) | La casilla de la tira: ancho y alto fijos, rótulo · cifra · nota |
| `apps/web/src/features/character-sheet/Cabecera.tsx`, `Traza.tsx` (mod, Task 1) | Cinco `Casilla` iguales; banda anclada con `--tira-fija-mx` y `--tira-fija-bg` |
| `apps/web/src/ui/AppShell.tsx`, `ui/Dialog.tsx` (mod, Task 1) | Declaran `--tira-fija-mx` y `--tira-fija-bg` (página: margen negativo y velo; cajón: cero y superficie opaca) |
| `apps/web/src/features/character-sheet/Tarjeta.tsx` (mod, Task 1) | `TarjetaDeHoja` gana `pie` |
| `apps/web/src/ui/Field.tsx` (mod, Task 2) | `reservaEspacio`: la línea de pista/error reserva su alto |
| `apps/web/src/features/inventory/DetalleDeObjeto.tsx` (mod, Task 2) | `top` del sticky = `--tira-fija-top` + `s4` |
| `apps/web/src/features/character-sheet/pestanas/Rasgos.tsx` (mod, Task 2) | Ficha y Personalidad apiladas en la columna izquierda; Rasgos a la derecha |
| `apps/web/src/features/characters/AjustesDePersonaje.tsx` (mod, Task 3) | Tarjeta con color arriba, visibilidad como bloque, archivar/borrar en el `pie` |
| `apps/web/src/features/rolls/PanelDeDados.tsx`, `game-clock/RelojDeCampana.tsx` (mod, Task 3) | Rejilla de dos columnas con alturas iguales; reloj en fila |
| `apps/web/e2e/espacios.spec.ts` (nuevo, Task 4) | La pasada de medición: huecos, hermanas, casillas, tearing, sticky |
| `packages/shared/src/campaign.schema.ts`, `apps/api/prisma/schema.prisma` + migración, `apps/api/src/campaigns/campaigns.service.ts` (mod, Task 5) | `Campaign.boardRoomUrl` (texto opcional, `https?://`) |
| `apps/web/src/features/campaigns/api.ts`, `CampaignSettings.tsx` (mod, Task 5) | Ajuste «Sala del tablero» (solo DM) |
| `apps/web/src/features/sessions/tablero/MarcoDelTablero.tsx`, `CajonDelRegistro.tsx` (nuevos, Task 6) | El `<iframe>` a la partida de PlanarAlly; el registro plegable con contador |
| `apps/web/src/features/sessions/MesaDeSesion.tsx` (mod, Task 6) | Con `boardRoomUrl`, el centro es el marco y el hilo va al cajón |
| `apps/web/src/ui/Iconos.tsx` (mod, Task 7) | `IconoDado({ caras })` con seis formas; `IconoMenu` (los tres puntos) |
| `apps/web/src/features/rolls/DadoDibujado.tsx` (mod, Task 7) | Delega en `IconoDado` |
| `apps/web/src/ui/__tests__/botones-con-icono.test.tsx` (nuevo, Task 7) | Barrido: ningún `Button variant="primary"` de página ni entrada de navegación sin dibujo |
| `apps/web/src/ui/MenuDeAcciones.tsx` (nuevo, Task 8) | Botón «…» dibujado, lista con teclado, foco devuelto |
| `apps/web/src/features/sessions/elenco/MandosDeCombatiente.tsx`, `DarObjeto.tsx`, `CorregirBando.tsx`, `FichaDeElenco.tsx`, `FichaDePnj.tsx` (mod, Task 8) | Daño · Curar visibles; Condición · Dar · Su hoja · Bando en el menú |
| `packages/shared/src/roll.schema.ts`, `game-event.schema.ts`, `apps/api/src/rolls/rolls.service.ts` (mod, Task 9) | `dice: { sides, value, kept }[]` en el resultado y en `ABILITY_ROLL` |
| `apps/web/src/features/rolls/BandejaDeDados.tsx`, `bandeja.ts` (nuevos, Task 10) | La pila de dados, el modificador, la expresión compuesta |
| `apps/web/src/features/rolls/PanelDeDados.tsx`, `panel/PanelDeDadosDeLaMesa.tsx`, `ResultadoDeTirada.tsx`, `desglose.ts` (mod, Task 10) | La bandeja en las dos pantallas; un dado por dado con su forma |
| `packages/shared/src/character-sheet.schema.ts`, `game-event.schema.ts`, `apps/api/src/characters/character-sheet.service.ts` (mod, Task 11) | `sourceCharacterId` opcional en `changeHp` y en `HP_CHANGED` |
| `apps/web/src/features/sessions/linea-de-log.ts`, `hilo/HiloDeSesion.tsx`, `hilo/MensajeDelHilo.tsx`, `elenco/PonerDano.tsx` (mod, Task 11) | La frase nombra sujeto y objetivo; la persona pasa a la firma |
| `apps/web/src/features/sessions/BandaDeMesa.tsx` (mod, Task 12) | La primera miga vuelve a la campaña (Sesiones) |
| `apps/web/src/features/bestiario/DarTemporales.tsx` (mod, Task 13) | La pregunta solo tras pulsar; «dejar los que tenía» no manda nada |
| `apps/web/src/features/campaign-items/CampaignItemsCatalogPage.tsx` (mod, Task 14) | `FilterChip` por tipo y por origen |
| `docs/00-INDEX.md`, `06-pendientes.md`, `07-historial.md`, `08-pruebas.md`, `decisiones.md`, `como-seguir.md` | Documentación, en cada commit y en el cierre (Task 15) |

---

### Task 0: Investigar antes de tocar — la nota de diseño y las cinco reglas

**Files:**
- Create: `docs/superpowers/notes/2026-09-12-nota-de-diseno-ui-de-juegos.md`
- Modify: `docs/04-convenciones.md` (§ *Reglas de interfaz que salieron del reseño*, al final de la lista)
- Modify: `docs/07-historial.md` (una línea), `docs/decisiones.md` (una fila por regla nueva: `D-CF-58..62`)

**Interfaces:**
- Consumes: la spec § 2 (tabla de referencias) y el anexo (los 24 puntos).
- Produces: **los cinco números que Task 4 mide** — `HUECO_MAX_PX` (hueco vertical máximo entre tarjetas hermanas; la spec propone 48), `DESNIVEL_MAX_PX` (diferencia de alto entre vecinas de una fila; propone 24), `ANCHO_CASILLA_REM` y `ALTO_CASILLA_REM` (la casilla de la tira, Task 1), `ACCIONES_VISIBLES` (cuántas acciones caben en una fila antes del menú «…»; la spec dice 2). Se escriben en la nota **y** en la regla de 04-convenciones, y las tareas 1, 4 y 8 los leen de ahí.

**Sin código.** Este encargo lo hace un agente **con acceso a la web** (WebFetch/WebSearch), y lo que no pueda ver —capturas de BG3 o DOS2— lo describe desde fuentes escritas (wikis, guías, capturas públicas) citando la URL. Nada se afirma sin fuente.

- [ ] **Step 1: Leer la spec § 2 y el anexo entero**, y anotar por referencia qué punto del anexo responde cada una (BG3 → #1, #2, #14; DOS2 → #1, #2; Foundry → #10, #11, #14; Beyond → #2, #4, #7; Owlbear → #10, #14).

- [ ] **Step 2: Escribir la nota** con esta estructura exacta (dos páginas, no más):

```markdown
# Nota de diseño — UI de juegos, antes del pulido (2026-09-12)

> Tarea 0 del plan de pulido. Lo que se saca de cada referencia, con cita o URL. Sin código.

## 1 · Baldur's Gate 3
- **Hoja**: [qué hace con pestañas, densidad, reparto de tarjeta] — fuente: <URL>
- **Barra de acciones**: [contenedores desplegables hacia arriba; qué agrupa] — fuente: <URL>
- **Tarjeta del combatiente**: [qué enseña en el turno, cuántas acciones visibles] — fuente: <URL>
- Lo que se adopta: …  Lo que no, y por qué: …

## 2 · Divinity: Original Sin 2
…(mismo esquema; el menú contextual en vez de fila de botones)

## 3 · Foundry VTT (dnd5e)
- **Tarjeta de chat de una tirada**: un dado por dado, desglose — fuente: <URL>
- **Bandeja de daño**: solo se cita, es de la tanda «puerta de efectos»
- **Dice So Nice**: solo formas (referencia para #12)

## 4 · D&D Beyond
- **Hoja en escritorio**: tres columnas, tarjetas con cabecera, cómo centra números — fuente: <URL>

## 5 · Owlbear Rodeo
- **Bandeja de dados**: pulsar añade, se ve la pila, un botón tira — fuente: <URL>

## 6 · dddice / dice-box (solo para #13, aplazado)
- Librería, licencia, peso aproximado, coste de integración estimado. **No se hace.**

## 7 · Los números que este plan mide
| Constante | Valor | De dónde sale |
|---|---|---|
| HUECO_MAX_PX | … | … |
| DESNIVEL_MAX_PX | … | … |
| ANCHO_CASILLA_REM | … | … |
| ALTO_CASILLA_REM | … | … |
| ACCIONES_VISIBLES | 2 | spec § 2, regla 2 |

## 8 · Las cinco reglas (texto final que entra en 04-convenciones)
…
```

- [ ] **Step 3: Escribir las cinco reglas en `docs/04-convenciones.md`**, al final de la lista de § *Reglas de interfaz que salieron del reseño*, con este texto como base (el agente lo completa con lo que la investigación diga, sin cambiar el sentido):

```markdown
- **Reparto interno de tarjeta (pulido 2026-09-12).** Cabecera · cuerpo · pie, con un solo
  relleno (`p-s3`); los números alineados a una rejilla de columnas; **una tarjeta no crece para
  llenar un hueco: la rejilla la coloca** (`items-start`, y alturas iguales por fila solo donde
  haga falta con `grid-rows`). Lo mide `e2e/espacios.spec.ts`: ningún hueco vertical entre
  tarjetas hermanas mayor de **HUECO_MAX_PX**, ninguna tarjeta más baja que su vecina de fila en
  más de **DESNIVEL_MAX_PX** salvo la última.

- **Acciones de una fila: hasta ACCIONES_VISIBLES visibles, el resto en un menú «…» dibujado.**
  Nunca una fila de cinco botones (anexo #1). El menú es `ui/MenuDeAcciones.tsx`: se abre hacia
  donde hay sitio, flechas y `Escape`, y devuelve el foco.

- **Espacio reservado.** Lo que puede cambiar de tamaño al escribir —la línea de error de un
  campo, un contador, un aviso— reserva su alto (`min-height`) para que la tarjeta no salte
  (anexo #8). `Field` lo hace con `reservaEspacio`.

- **Sticky con escalón.** Todo lo pegado respeta `--tira-fija-top`, y dentro de un cajón las
  variables `--tira-fija-*` valen lo que el cajón declara. Se mide con `boundingBox` (anexo #6).

- **Un dado, una forma.** Seis dibujos (`IconoDado`, `ui/Iconos.tsx`): d4 tetraedro, d6 cubo,
  d8 octaedro, d10/d100 trapezoedro, d12 dodecaedro, d20 icosaedro. Un resultado enseña **cada
  dado** con su forma y su cara; los descartados tachados (anexo #11, #12).
```

- [ ] **Step 4: Una fila por regla en `docs/decisiones.md`** (`D-CF-58` a `D-CF-62`) enlazando a la nota, y una línea en `docs/07-historial.md` («Tarea 0 del pulido: nota de diseño y cinco reglas»).

- [ ] **Step 5: `pnpm verify`** (check:docs comprueba enlaces y fechas). Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/notes/2026-09-12-nota-de-diseno-ui-de-juegos.md docs/04-convenciones.md docs/decisiones.md docs/07-historial.md
git commit -m "docs(ui): design note from game UIs and five new interface rules before the polish"
```

---

### Task 1: `Casilla` y la banda anclada — los cinco números iguales (#3, #4) y `TarjetaDeHoja.pie`

**Files:**
- Create: `apps/web/src/features/character-sheet/Casilla.tsx`
- Modify: `apps/web/src/features/character-sheet/Cabecera.tsx:54-95`
- Modify: `apps/web/src/features/character-sheet/Traza.tsx:295-323` (variante `compacta`)
- Modify: `apps/web/src/features/character-sheet/Tarjeta.tsx:39-70`
- Modify: `apps/web/src/ui/AppShell.tsx:257-263`, `apps/web/src/ui/Dialog.tsx:214`
- Create: `apps/web/src/features/character-sheet/__tests__/Casilla.test.tsx`
- Modify: `apps/web/e2e/hoja.spec.ts` (un `test` nuevo al final)
- Modify: `docs/07-historial.md`

**Interfaces:**
- Consumes: `ANCHO_CASILLA_REM`, `ALTO_CASILLA_REM` de la nota de Task 0 (si la nota no los fija, **5.5rem × 3.75rem** y se anota); `ROTULO_DE_CASILLA` (`Tarjeta.tsx`).
- Produces: `Casilla({ rotulo, rotuloLargo?, nota?, className?, children })` — `children` es la cifra (texto o el `<button>` de la traza); `nota` es la tercera línea (siempre reservada). `TarjetaDeHoja` gana `pie?: ReactNode`. Variables CSS `--tira-fija-mx` (`AppShell`: `calc(var(--space-2) * -1)`; `Dialog`: `0px`) y `--tira-fija-bg` (`AppShell`: `var(--chrome-veil)`; `Dialog`: `var(--surface)`).

- [ ] **Step 1: Escribir la unitaria que falla**

```tsx
// apps/web/src/features/character-sheet/__tests__/Casilla.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Casilla } from "../Casilla";

// Anexo #4: las cinco casillas de la tira no eran simétricas porque la de PG crecía con la línea
// «+5 temporales». La casilla reserva la tercera línea SIEMPRE, con o sin nota.
describe("Casilla", () => {
  it("pinta rótulo, cifra y una tercera línea reservada aunque no haya nota", () => {
    render(<Casilla rotulo="CA">17</Casilla>);
    expect(screen.getByText("CA")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    const nota = screen.getByTestId("casilla-nota");
    expect(nota).toBeEmptyDOMElement();
    expect(nota.className).toMatch(/min-h-/);
  });

  it("con nota, la pinta en la tercera línea", () => {
    render(
      <Casilla rotulo="PG" nota="+5 temporales">
        12 / 20
      </Casilla>,
    );
    expect(screen.getByTestId("casilla-nota")).toHaveTextContent("+5 temporales");
  });

  it("anuncia el rótulo largo y esconde el corto de la accesibilidad", () => {
    render(
      <Casilla rotulo="Inic." rotuloLargo="Iniciativa">
        +2
      </Casilla>
    );
    expect(screen.getByText("Iniciativa")).toHaveClass("sr-only");
    expect(screen.getByText("Inic.")).toHaveAttribute("aria-hidden", "true");
  });
});
```

- [ ] **Step 2: Correrla y verla fallar**

Run: `pnpm --filter @dnd/web test -- src/features/character-sheet/__tests__/Casilla.test.tsx`
Expected: FAIL — `Cannot find module '../Casilla'`.

- [ ] **Step 3: Escribir `Casilla.tsx`**

```tsx
// apps/web/src/features/character-sheet/Casilla.tsx
import type { ReactNode } from "react";
import { ROTULO_DE_CASILLA } from "./Tarjeta";

// Pulido 2026-09-12, anexo #4 — **las cinco casillas de la tira miden lo mismo.** La de PG era
// más ancha y más alta que las otras cuatro porque «+5 temporales» le añadía una línea; las
// demás no la tenían. Aquí la tercera línea existe SIEMPRE (`min-h`) y el ancho y el alto son
// fijos: la nota entra sin romper la caja (regla «reparto interno de tarjeta», 04-convenciones).
// Los dos números vienen de la nota de diseño de la tarea 0.
export const ANCHO_CASILLA = "w-[5.5rem]";
export const ALTO_CASILLA = "min-h-[3.75rem]";

export function Casilla({
  rotulo,
  rotuloLargo,
  nota,
  className = "",
  children,
}: {
  rotulo: string;
  /** El nombre entero cuando el visible va abreviado («Inic.» → «Iniciativa»). */
  rotuloLargo?: string;
  /** La tercera línea: «+5 temporales». Reservada aunque falte. */
  nota?: ReactNode;
  className?: string;
  /** La cifra, o el botón que la abre en traza. */
  children: ReactNode;
}) {
  return (
    <div
      className={[
        ANCHO_CASILLA,
        ALTO_CASILLA,
        "grid grid-rows-[auto_1fr_auto] rounded-radius-sm border border-muted bg-surface px-s2 py-1 text-center",
        className,
      ].join(" ")}
    >
      <p
        aria-hidden={rotuloLargo ? "true" : undefined}
        title={rotuloLargo ?? rotulo}
        className={`${ROTULO_DE_CASILLA} leading-tight`}
      >
        {rotulo}
      </p>
      {rotuloLargo && <span className="sr-only">{rotuloLargo}</span>}
      <div className="flex items-center justify-center font-data text-chrome-lg leading-none text-text">
        {children}
      </div>
      <p data-testid="casilla-nota" className="min-h-[1rem] font-chrome text-chrome-xs leading-4 text-accent-text">
        {nota}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Usar `Casilla` en `Traza.tsx` (variante compacta) y en `Cabecera.tsx`**

En `Traza.tsx`, la rama `if (variante === "compacta")` pasa a:

```tsx
  if (variante === "compacta") {
    return (
      <Casilla rotulo={etiqueta} rotuloLargo={etiquetaLarga} nota={abierta ? undefined : undefined}>
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          aria-expanded={abierta}
          aria-controls={listId}
          className="w-full hover:text-accent-text"
        >
          {valor.total}
        </button>
        {abierta && listaDeTraza}
      </Casilla>
    );
  }
```

(Con `import { Casilla } from "./Casilla";` arriba. La lista de traza abierta sigue creciendo hacia abajo: es interacción, no reposo; la medida de Task 4 se hace en reposo.)

En `Cabecera.tsx`, la caja de PG (L84-92) pasa a:

```tsx
            <Casilla rotulo="PG" nota={hp.temp > 0 ? `+${hp.temp} temporales` : undefined}>
              {hp.current ?? "—"} / {hp.max ?? "—"}
            </Casilla>
```

y la `section` fija (L54) cambia sus clases de margen y fondo:

```tsx
        className="sticky top-[var(--tira-fija-top,0px)] z-20 mx-[var(--tira-fija-mx,0px)] mt-[var(--tira-fija-pull,0px)] border-b border-muted bg-[color:var(--tira-fija-bg,var(--chrome-veil))] px-s2 py-s2 backdrop-blur"
```

- [ ] **Step 5: Declarar las dos variables donde se declaran las otras dos**

`AppShell.tsx:257-263`:

```tsx
              {
                "--tira-fija-top": "4rem",
                "--tira-fija-pull": "-1.5rem",
                // Pulido 2026-09-12 (anexo #3): a página la tira se sale medio paso a cada lado y
                // lleva el velo translúcido; dentro de un cajón (Dialog) ninguna de las dos cosas.
                "--tira-fija-mx": "calc(var(--space-2) * -1)",
                "--tira-fija-bg": "var(--chrome-veil)",
              } as CSSProperties
```

`Dialog.tsx:214`:

```tsx
        style={
          {
            "--tira-fija-top": "0px",
            "--tira-fija-pull": "0px",
            // Anexo #3: dentro del cajón la banda va a ras y sobre superficie OPACA, anclada al
            // cajón con su filete inferior; el velo del 95 % la hacía «flotar sin estar anclada».
            "--tira-fija-mx": "0px",
            "--tira-fija-bg": "var(--surface)",
          } as CSSProperties
        }
```

- [ ] **Step 6: `TarjetaDeHoja.pie`**

```tsx
  pie?: ReactNode;
  …
      <div className={cuerpo}>{children}</div>
      {pie && <footer className="border-t border-muted px-s3 py-s2">{pie}</footer>}
    </section>
```

(Con una `it` en `apps/web/src/features/character-sheet/__tests__/HojaCalculada.test.tsx` o en un `Tarjeta.test.tsx` nuevo: «con `pie`, pinta un `contentinfo`… » — `footer` dentro de `section` no tiene role implícito, así que se afirma por `getByText`.)

- [ ] **Step 7: Correr las unitarias**

Run: `pnpm --filter @dnd/web test -- src/features/character-sheet`
Expected: PASS (las de `Casilla` y todas las que ya había: `HojaCalculada.test.tsx` busca el texto «PG» y la cifra, no la clase).

- [ ] **Step 8: Añadir la medida a `e2e/hoja.spec.ts`** (un `test` al final, con los helpers del fichero):

```ts
test("las cinco casillas de la tira miden lo mismo, con y sin temporales (anexo #4)", async ({ page }) => {
  // …registro, campaña, personaje con PG temporales (usar el helper que ya crea el guerrero y
  // `PATCH` de PG temporales por la pantalla de Recursos: «PG temporales» → 5).
  const tira = page.getByRole("region", { name: "resumen de combate" });
  const cajas = await tira.locator("[class*='w-[5.5rem]']").all();
  expect(cajas.length).toBeGreaterThanOrEqual(4);
  const medidas = await Promise.all(cajas.map((c) => c.boundingBox()));
  const anchos = new Set(medidas.map((m) => Math.round(m!.width)));
  const altos = new Set(medidas.map((m) => Math.round(m!.height)));
  expect(anchos.size, `anchos distintos: ${[...anchos]}`).toBe(1);
  expect(altos.size, `altos distintos: ${[...altos]}`).toBe(1);
});

test("dentro del cajón «Su hoja» la banda va a ras y sobre fondo opaco (anexo #3)", async ({ page }) => {
  // …DM abre «Su hoja» desde el elenco (ver `combate.spec.ts` para el camino).
  const dialogo = page.getByRole("dialog", { name: "Su hoja" });
  const banda = dialogo.getByRole("region", { name: "resumen de combate" });
  const cuerpo = await dialogo.locator("[data-pestana]").first().boundingBox();
  const caja = await banda.boundingBox();
  expect(Math.round(caja!.x)).toBe(Math.round(cuerpo!.x));
  const fondo = await banda.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(fondo).not.toMatch(/rgba\(.*, 0\.\d+\)/); // opaco: sin canal alfa < 1
});
```

- [ ] **Step 9: Mutación** — `cp Casilla.tsx Casilla.tsx.bak`; quitar `min-h-[1rem]` de la nota; correr la unitaria → FAIL (`className` no contiene `min-h-`); `cp Casilla.tsx.bak Casilla.tsx`; `rm Casilla.tsx.bak`. Anotar en el informe.

- [ ] **Step 10: Documentar** — línea en `docs/07-historial.md` («Casilla y banda anclada: #3, #4; revertir: quitar `Casilla.tsx` y restaurar la caja de PG en `Cabecera`»).

- [ ] **Step 11: `pnpm verify`** → exit 0. El orquestador corre `pnpm --filter @dnd/web exec playwright test e2e/hoja.spec.ts` → verde, y pega la salida.

- [ ] **Step 12: Commit**

```bash
git add apps/web/src/features/character-sheet apps/web/src/ui/AppShell.tsx apps/web/src/ui/Dialog.tsx apps/web/e2e/hoja.spec.ts docs/07-historial.md
git commit -m "feat(sheet): Casilla with fixed size for the five header numbers; the sticky band anchors to the drawer"
```

---

### Task 2: Sticky con escalón, espacio reservado y la rejilla de Rasgos (#6, #8, #7)

**Files:**
- Modify: `apps/web/src/ui/Field.tsx`
- Modify: `apps/web/src/features/inventory/DetalleDeObjeto.tsx:61`
- Modify: `apps/web/src/features/character-sheet/pestanas/Rasgos.tsx:14-36`
- Modify: `apps/web/src/features/rolls/PanelDeDados.tsx` (el `Field` de la expresión gana `reservaEspacio`), `apps/web/src/features/rolls/panel/PanelDeDadosDeLaMesa.tsx` (ídem)
- Modify: `apps/web/src/ui/__tests__/Field.test.tsx`, `apps/web/src/features/character-sheet/__tests__/HojaCalculada.test.tsx` (o donde vivan las de Rasgos)
- Modify: `docs/07-historial.md`

**Interfaces:**
- Consumes: `--tira-fija-top` (declarada en `AppShell`, `Dialog`).
- Produces: `Field` con `reservaEspacio?: boolean` — cuando es `true`, la línea de pista/error se pinta siempre con `min-h-[1.125rem]` (vacía si no hay nada que decir).

- [ ] **Step 1: Unitaria de `Field` que falla**

```tsx
// en apps/web/src/ui/__tests__/Field.test.tsx
it("con reservaEspacio, la línea de pista existe aunque no haya pista ni error (anexo #8)", () => {
  render(
    <Field label="Qué se tira" reservaEspacio>
      <input />
    </Field>,
  );
  const linea = screen.getByTestId("field-linea");
  expect(linea).toBeEmptyDOMElement();
  expect(linea.className).toMatch(/min-h-/);
});

it("sin reservaEspacio, no pinta la línea vacía", () => {
  render(
    <Field label="Motivo">
      <input />
    </Field>,
  );
  expect(screen.queryByTestId("field-linea")).toBeNull();
});
```

Run: `pnpm --filter @dnd/web test -- src/ui/__tests__/Field.test.tsx` → FAIL (`field-linea` no existe).

- [ ] **Step 2: `Field.tsx`** — leer el componente (86 líneas) y, donde hoy pinta `hint`/`error` condicionalmente, pasar a:

```tsx
      {reservaEspacio || hint || error ? (
        <p
          data-testid="field-linea"
          id={error ? errorId : hintId}
          role={error ? "alert" : undefined}
          className={[
            "mt-1 font-chrome text-chrome-xs leading-[1.125rem]",
            reservaEspacio ? "min-h-[1.125rem]" : "",
            error ? "text-danger-text" : "text-muted",
          ].join(" ")}
        >
          {error ?? hint}
        </p>
      ) : null}
```

(Conservar los `id`/`aria-describedby` que el componente ya usa; si hoy pinta pista y error como dos `<p>`, se mantienen los dos y solo el de error gana el `min-h` con `reservaEspacio`. Lo que importa es que **el alto en reposo y con error sea el mismo**.)

- [ ] **Step 3: Los dos paneles de dados** ponen `reservaEspacio` en el `Field label="Qué se tira"` (es donde el error del evaluador aparece y desaparece).

- [ ] **Step 4: `DetalleDeObjeto.tsx:61`** — el panel sticky respeta el escalón:

```tsx
      className="rounded-radius-sm border border-muted bg-surface p-s4 lg:sticky lg:top-[calc(var(--tira-fija-top,0px)+var(--space-4))]"
```

- [ ] **Step 5: `Rasgos.tsx`** — la columna izquierda apila Ficha y Personalidad; Rasgos a la derecha; sin hueco bajo «Ficha»:

```tsx
  return (
    <div data-pestana="rasgos" className={`grid items-start gap-s4 ${columnas}`}>
      <div className="grid gap-s4">
        <TarjetaDeHoja key="ficha" titulo="Ficha" etiqueta="ficha del personaje">
          …(lo que ya hay)
        </TarjetaDeHoja>
        <Personalidad bio={character.bio} />
      </div>
      <RasgosYAptitudes features={sheet.features} />
    </div>
  );
```

Unitaria: la que ya afirma que Rasgos pinta las tres regiones sigue en verde (no cambia el DOM accesible, solo el envoltorio).

- [ ] **Step 6: Correr unitarias** — `pnpm --filter @dnd/web test -- src/ui src/features/character-sheet src/features/rolls` → PASS.

- [ ] **Step 7: Medida (la escribe Task 4 en `espacios.spec.ts`; aquí se deja el gancho)**: en el informe, anotar que #6 y #8 quedan medidos en Task 4 y no en esta.

- [ ] **Step 8: Mutación** — `cp Field.tsx Field.tsx.bak`; quitar `min-h-[1.125rem]`; unitaria → FAIL; restaurar con `cp`; borrar `.bak`.

- [ ] **Step 9: Documentar** — línea en 07.

- [ ] **Step 10: `pnpm verify`** → exit 0. Orquestador: `exec playwright test e2e/hoja-pestanas.spec.ts` y `e2e/inventario.spec.ts` (las dos tocan Rasgos y el detalle de Objetos) → verde.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/ui/Field.tsx apps/web/src/ui/__tests__/Field.test.tsx apps/web/src/features/inventory/DetalleDeObjeto.tsx apps/web/src/features/character-sheet/pestanas/Rasgos.tsx apps/web/src/features/rolls docs/07-historial.md
git commit -m "fix(ui): reserved space in Field, sticky detail respects the header step, traits grid without the hole"
```

---

### Task 3: Ajustes de personaje reordenados (#9) y «Dados» de campaña en rejilla (#16, sin bandeja)

**Files:**
- Modify: `apps/web/src/features/characters/AjustesDePersonaje.tsx:100-…` (el `return`)
- Modify: `apps/web/src/features/rolls/PanelDeDados.tsx:148-160` (el reloj y la rejilla)
- Modify: `apps/web/src/features/game-clock/RelojDeCampana.tsx:123` (acepta `className`; el cuerpo en dos columnas `md:grid-cols-2`: «avanzar el tiempo» | «o viajáis»)
- Modify: `apps/web/src/pages/__tests__/CharacterDetailPage.test.tsx` o `apps/web/src/features/characters/__tests__/archivar.test.tsx` (una `it` de orden), `apps/web/src/features/rolls/__tests__/PanelDeDados.test.tsx`
- Modify: `docs/07-historial.md`

**Interfaces:**
- Consumes: `TarjetaDeHoja` con `pie` (Task 1), `SelectorDeColor`, `VisibilityChooser`, `BotonArchivar`, `DeleteButton`.
- Produces: nada nuevo para otras tareas.

- [ ] **Step 1: Unitaria de orden que falla** (en `archivar.test.tsx`, que ya monta `AjustesDePersonaje`):

```tsx
it("ordena color · visibilidad · archivar/borrar, y lo destructivo va en el pie (anexo #9)", () => {
  render(<AjustesDePersonaje {…propsDeUnPersonajeVivoDelDm} />);
  const tarjeta = screen.getByRole("region", { name: "ajustes del personaje" });
  const color = within(tarjeta).getByRole("group", { name: /color/i });
  const visibilidad = within(tarjeta).getByRole("group", { name: /quién puede verlo/i });
  const archivar = within(tarjeta).getByRole("button", { name: /archivar/i });
  // `compareDocumentPosition`: 4 = el argumento va DESPUÉS del receptor.
  expect(color.compareDocumentPosition(visibilidad) & 4).toBeTruthy();
  expect(visibilidad.compareDocumentPosition(archivar) & 4).toBeTruthy();
  expect(archivar.closest("footer")).not.toBeNull();
});
```

(Ajustar los nombres de `group` a los `aria-label` reales de `SelectorDeColor` y `VisibilityChooser` — leerlos, no suponerlos; si no llevan `role="group"`, se les pone en esta tarea.)

Run → FAIL (no hay `region` «ajustes del personaje»).

- [ ] **Step 2: Reescribir el `return` de `AjustesDePersonaje`**:

```tsx
  return (
    <TarjetaDeHoja
      titulo="Ajustes"
      etiqueta="ajustes del personaje"
      cuerpo="p-s3 space-y-s4"
      pie={
        <div className="flex flex-wrap items-center gap-s2">
          {puedeArchivar && !estaArchivado && (
            <BotonArchivar … />
          )}
          {!estaArchivado && (
            <DeleteButton … />
          )}
          {errorAlArchivar && <p className="w-full font-chrome text-chrome-xs text-danger-text">{errorAlArchivar}</p>}
          {errorAlBorrar && <p className="w-full font-chrome text-chrome-xs text-danger-text">{errorAlBorrar}</p>}
        </div>
      }
    >
      {/* Fila compacta: el color es lo primero que un jugador toca y no tiene consecuencias. */}
      <SelectorDeColor … />
      {/* Bloque: la visibilidad son radios con su frase (regla vinculante) y ocupa lo que ocupa. */}
      <VisibilityChooser … />
      {!puedeEditar && motivo && …}
      {errorAlGuardar && …}
      {estaArchivado && ( …el aviso de archivado con «Devolver a la mesa», como hoy… )}
    </TarjetaDeHoja>
  );
```

(Import `TarjetaDeHoja` desde `../character-sheet/Tarjeta`. Los props de `BotonArchivar`/`DeleteButton` son los que ya se pasan hoy: **se mueven, no se cambian**.)

- [ ] **Step 3: `PanelDeDados.tsx`** — el reloj deja de ir en `mb-s5` a media pantalla y la rejilla iguala alturas:

```tsx
      <div className={role === "DM" ? "grid items-stretch gap-s5 xl:grid-cols-2" : undefined}>
        <RelojDeCampana campaignId={campaignId} className={role === "DM" ? "xl:col-span-2" : ""} />
        {role === "DM" && <PedirTirada campaignId={campaignId} />}
        <section aria-label="Tirada nueva" className="min-w-0">
          <Panel className="h-full">
```

y en `RelojDeCampana` el `Panel` acepta `className` (`max-w-[40rem]` solo si no se pasa otra) y los dos bloques «avanzar» / «o viajáis» pasan de apilados a `md:grid md:grid-cols-2 md:gap-s4` (el `Field` «Qué pasa» debajo a todo lo ancho).

Unitaria en `PanelDeDados.test.tsx`: «con rol DM, el reloj, pedir y tirar están los tres» (ya existe algo parecido; si no, se añade afirmando los tres `aria-label`/headings).

- [ ] **Step 4: Correr unitarias** → PASS.

- [ ] **Step 5: Mutación** — `cp AjustesDePersonaje.tsx …bak`; mover `DeleteButton` fuera del `pie` (al cuerpo); unitaria de orden → FAIL (`closest("footer")` es null); restaurar con `cp`.

- [ ] **Step 6: Documentar** — línea en 07; en 06, nota bajo la ficha de #16: «la bandeja compacta llega en Task 10».

- [ ] **Step 7: `pnpm verify`** → exit 0. Orquestador: `exec playwright test e2e/color-de-personaje.spec.ts`, `e2e/archivar.spec.ts`, `e2e/dados.spec.ts` → verde.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/characters apps/web/src/features/rolls/PanelDeDados.tsx apps/web/src/features/game-clock/RelojDeCampana.tsx apps/web/src/features/rolls/__tests__/PanelDeDados.test.tsx docs/07-historial.md docs/06-pendientes.md
git commit -m "feat(ui): character settings as one card with the destructive actions in the footer; campaign dice page in an even grid"
```

---

### Task 4: `e2e/espacios.spec.ts` — la pasada de medición (#17, y cierra la medida de #6 y #8)

**Files:**
- Create: `apps/web/e2e/espacios.spec.ts`
- Modify: `docs/08-pruebas.md` (la fila nueva en la tabla de suites de navegador, con qué demuestra)

**Interfaces:**
- Consumes: `HUECO_MAX_PX`, `DESNIVEL_MAX_PX` de Task 0 (constantes al principio del fichero, con el comentario de dónde salen); los helpers de registro/campaña/personaje de `hoja.spec.ts` (copiarlos con el mismo nombre; los e2e no comparten módulo hoy, y eso se anota como está).
- Produces: `medirHermanas(locator)` — devuelve `{ huecoMax, desnivelMax }` de los hijos directos de una rejilla.

- [ ] **Step 1: Escribir el fichero**

```ts
import { test, expect, type Locator, type Page } from "@playwright/test";

// **Los huecos, medidos.** Anexo #17: «espacios perdidos», tarjetas que no llenan su columna,
// huecos entre bloques. jsdom no maqueta; esto sí. Los dos números salen de la nota de diseño
// de la tarea 0 (docs/superpowers/notes/2026-09-12-nota-de-diseno-ui-de-juegos.md § 7).
const HUECO_MAX_PX = 48;
const DESNIVEL_MAX_PX = 24;

/** Huecos verticales entre hijos directos, y desnivel entre vecinos de la misma fila. */
async function medirHermanas(rejilla: Locator) {
  const cajas = (await Promise.all((await rejilla.locator(":scope > *").all()).map((h) => h.boundingBox())))
    .filter((b): b is NonNullable<typeof b> => b !== null && b.height > 0);
  let huecoMax = 0;
  let desnivelMax = 0;
  for (let i = 0; i < cajas.length; i++) {
    for (let j = i + 1; j < cajas.length; j++) {
      const a = cajas[i], b = cajas[j];
      const mismaFila = Math.abs(a.y - b.y) < 4;
      const mismaColumna = Math.abs(a.x - b.x) < 4;
      if (mismaFila && j < cajas.length - 1) desnivelMax = Math.max(desnivelMax, Math.abs(a.height - b.height));
      if (mismaColumna) {
        const [arriba, abajo] = a.y < b.y ? [a, b] : [b, a];
        // Solo hermanas consecutivas en la columna: otra caja en medio no cuenta como hueco.
        const hayAlgoEnMedio = cajas.some((c) => c !== a && c !== b && Math.abs(c.x - a.x) < 4 && c.y > arriba.y && c.y < abajo.y);
        if (!hayAlgoEnMedio) huecoMax = Math.max(huecoMax, abajo.y - (arriba.y + arriba.height));
      }
    }
  }
  return { huecoMax, desnivelMax };
}

// …helpers registrarse / campañaConPersonaje (copiados de hoja.spec.ts, mismo nombre)…

test.describe("los espacios de la hoja a página", () => {
  for (const pestana of ["numeros", "rasgos", "recursos", "estado"]) {
    test(`pestaña ${pestana}: sin huecos > ${HUECO_MAX_PX}px ni desniveles > ${DESNIVEL_MAX_PX}px`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await registrarse(page);
      const { campaignId, characterId } = await campanaConPersonaje(page);
      await page.goto(`/campaigns/${campaignId}/personajes/${characterId}?pestana=${pestana}`);
      const rejilla = page.locator(`[data-pestana="${pestana}"]`);
      await expect(rejilla).toBeVisible();
      const { huecoMax, desnivelMax } = await medirHermanas(rejilla);
      expect(huecoMax, "hueco vertical entre tarjetas hermanas").toBeLessThanOrEqual(HUECO_MAX_PX);
      expect(desnivelMax, "desnivel entre vecinas de fila").toBeLessThanOrEqual(DESNIVEL_MAX_PX);
    });
  }
});

test("el detalle de Objetos se pega bajo la banda fija, no debajo de ella (anexo #6)", async ({ page }) => {
  // …hoja a página, pestaña objetos, con bastantes objetos para scrollear (dar 12 del catálogo)…
  await page.mouse.wheel(0, 600);
  const banda = await page.getByRole("region", { name: "resumen de combate" }).boundingBox();
  const detalle = await page.getByRole("complementary", { name: "detalle del objeto" }).boundingBox();
  expect(detalle!.y).toBeGreaterThanOrEqual(banda!.y + banda!.height - 1);
});

test("escribir una expresión inválida no cambia el alto de la tarjeta de tirar (anexo #8)", async ({ page }) => {
  // …campaña, /campaigns/:id?seccion=dados (o donde viva la pantalla «Dados»)…
  const tarjeta = page.getByRole("region", { name: "Tirada nueva" });
  const antes = await tarjeta.boundingBox();
  await page.getByLabel("Qué se tira").fill("esto no es una expresión");
  await page.getByRole("button", { name: "Tirar", exact: true }).click();
  await expect(tarjeta.getByRole("alert")).toBeVisible();
  const despues = await tarjeta.boundingBox();
  expect(Math.round(despues!.height)).toBe(Math.round(antes!.height));
});
```

- [ ] **Step 2: Correrlo (orquestador)** — `pnpm --filter @dnd/web exec playwright test e2e/espacios.spec.ts`. **Se espera que alguna medida falle** si Task 2/3 dejaron un hueco: en ese caso se arregla la rejilla que falle (`items-start`/apilado) en la misma tarea, se vuelve a medir y se pega la salida. Si todo pasa a la primera, se **muta** una rejilla (poner `gap-s6` triplicado en `Rasgos.tsx` con copia `cp`) para ver enrojecer el hueco, y se restaura.

- [ ] **Step 3: Documentar** — fila en `docs/08-pruebas.md` (suite `espacios.spec.ts`: qué demuestra y qué no); línea en 07.

- [ ] **Step 4: `pnpm verify`** → exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e/espacios.spec.ts docs/08-pruebas.md docs/07-historial.md
git commit -m "test(e2e): measure gaps, row levelling, sticky offset and reserved space across the sheet"
```

---

### Task 5: `Campaign.boardRoomUrl` — migración, contrato, PATCH y el ajuste «Sala del tablero» (C1 bis, servidor + ajustes)

**Files:**
- Modify: `packages/shared/src/campaign.schema.ts:4-15`
- Modify: `apps/api/prisma/schema.prisma:237` (campo nuevo bajo `encumbranceVariant`)
- Create: `apps/api/prisma/migrations/20260912120000_campaign_board_room_url/migration.sql`
- Modify: `apps/api/src/campaigns/campaigns.service.ts:153` (una línea más en `update`)
- Modify: `apps/api/test/campaigns.e2e-spec.ts` (dos `it`)
- Modify: `apps/web/src/features/campaigns/api.ts:48`, `CampaignSettings.tsx` (bloque nuevo bajo `InterruptorDeSobrecarga`)
- Modify: `apps/web/src/features/campaigns/__tests__/CampaignSettings.test.tsx` (o donde vivan las de ajustes)
- Modify: `docs/05-datos.md` (el campo, en la tabla de `Campaign`), `docs/07-historial.md`

**Interfaces:**
- Consumes: `updateCampaignSchema = createCampaignSchema.partial()`; `getById` devuelve la fila entera (`findUnique` sin `select`), así que el campo llega a la web sin tocar nada más.
- Produces: `Campaign.boardRoomUrl: string | null` (Prisma `String?`); en el contrato, `boardRoomUrl: z.string().url().max(500).refine(u => /^https?:\/\//.test(u)).nullable().optional()` — `null` borra. En la web, `Campaign.boardRoomUrl?: string | null`.

**Migración sola, con su nombre** (04-convenciones, «Migración o cambio de datos va sola»): esta tarea no toca la mesa.

- [ ] **Step 1: e2e de API que falla**

```ts
// apps/api/test/campaigns.e2e-spec.ts — dentro del describe de PATCH
it("el DM guarda la partida del tablero y la ve al leer la campaña; un jugador no puede", async () => {
  await api(dm).patch(`/campaigns/${campaignId}`).send({ boardRoomUrl: "https://tablero.supportive.pro/game/abc" }).expect(200);
  const { body } = await api(dm).get(`/campaigns/${campaignId}`).expect(200);
  expect(body.boardRoomUrl).toBe("https://tablero.supportive.pro/game/abc");
  await api(jugador).patch(`/campaigns/${campaignId}`).send({ boardRoomUrl: "https://x.example" }).expect(403);
});

it("rechaza una URL que no sea http(s) y acepta null para quitarla", async () => {
  await api(dm).patch(`/campaigns/${campaignId}`).send({ boardRoomUrl: "javascript:alert(1)" }).expect(400);
  await api(dm).patch(`/campaigns/${campaignId}`).send({ boardRoomUrl: null }).expect(200);
  const { body } = await api(dm).get(`/campaigns/${campaignId}`).expect(200);
  expect(body.boardRoomUrl).toBeNull();
});
```

(Usar los helpers `api(...)`, `dm`, `jugador`, `campaignId` que el fichero ya tiene; leerlo primero.)

Run: `pnpm --filter @dnd/api test:e2e -- campaigns` → FAIL (400 por campo desconocido, o `undefined`).

- [ ] **Step 2: Contrato**

```ts
  // Pulido 2026-09-12, C1 bis (spec del tablero § 2 ter): la partida de PlanarAlly que la mesa
  // enmarca. Solo `http(s)`: el valor va a un `src` de `<iframe>`, y `javascript:` no es una sala.
  // `null` la quita; ausente no la toca (`.partial()` en `updateCampaignSchema`).
  boardRoomUrl: z
    .string()
    .url()
    .max(500)
    .refine((u) => /^https?:\/\//i.test(u), "La sala tiene que ser una dirección http(s).")
    .nullable()
    .optional(),
```

- [ ] **Step 3: Prisma + migración**

```prisma
  // Pulido 2026-09-12 (C1 bis): la URL de la partida de PlanarAlly que la mesa enmarca. Sin
  // ella, la mesa es la de siempre. Texto libre validado en el contrato (http(s), ≤ 500).
  boardRoomUrl String?
```

```sql
-- apps/api/prisma/migrations/20260912120000_campaign_board_room_url/migration.sql
ALTER TABLE "Campaign" ADD COLUMN "boardRoomUrl" TEXT;
```

Run: `pnpm --filter @dnd/api prisma generate` (o el script del repo que regenera el cliente; ver `docs/02-entorno.md`).

- [ ] **Step 4: Servicio** — junto a L153:

```ts
    if (input.boardRoomUrl !== undefined) data.boardRoomUrl = input.boardRoomUrl;
```

(`createCampaign` no lo acepta al crear: se pone después, desde ajustes. Si el DTO de creación lo recibiera, se ignora — anotar.)

- [ ] **Step 5: Correr el e2e** → PASS. Correr también `pnpm --filter @dnd/api test -- campaigns` (unitarias).

- [ ] **Step 6: Web — contrato y ajuste**

`api.ts`: `boardRoomUrl?: string | null;` junto a `encumbranceVariant`.

`CampaignSettings.tsx`, debajo de `<InterruptorDeSobrecarga … />`:

```tsx
      <SalaDelTablero
        campaignId={campaignId}
        url={campaign.boardRoomUrl ?? null}
        disabled={roleUnresolved || !isDM}
      />
```

```tsx
/**
 * C1 bis (2026-09-12) — la partida de PlanarAlly (`tablero.supportive.pro/game/<nombre>`) que la mesa
 * enmarca. Guardar es explícito (escribir es un proceso: Guardar/Quitar), con el mismo
 * `PATCH /campaigns/:id` que el nombre. Solo DM; el servidor lo exige (`requireDM`).
 */
function SalaDelTablero({ campaignId, url, disabled }: { campaignId: string; url: string | null; disabled: boolean }) {
  const update = useUpdateCampaign(campaignId);
  const [valor, setValor] = useState(url ?? "");
  const [error, setError] = useState<string | null>(null);
  const guardar = (siguiente: string | null) => {
    setError(null);
    update.mutate({ boardRoomUrl: siguiente }, { onError: (e) => setError((e as Error).message) });
  };
  return (
    <section aria-label="Sala del tablero" className="mt-s5 border-t border-muted pt-s4">
      <h3 className="font-title text-chrome-md text-text">Sala del tablero</h3>
      <p className="mt-1 font-chrome text-chrome-xs text-muted">
        La dirección de vuestra partida en el tablero (PlanarAlly). Con ella, la mesa enseña el
        mapa en el centro y el registro se pliega abajo. Sin ella, la mesa es la de siempre.
      </p>
      <Field label="Dirección de la sala" hint="https://tablero.supportive.pro/game/…" error={error ?? undefined} reservaEspacio>
        <input type="url" value={valor} onChange={(e) => setValor(e.target.value)} disabled={disabled} className={fieldControlClass} />
      </Field>
      <div className="mt-s2 flex gap-s2">
        <Button type="button" onClick={() => guardar(valor.trim())} disabled={disabled || valor.trim() === ""}>Guardar la sala</Button>
        {url && (
          <Button type="button" variant="secondary" onClick={() => { setValor(""); guardar(null); }} disabled={disabled}>Quitar la sala</Button>
        )}
      </div>
    </section>
  );
}
```

Unitaria (RTL, en las de ajustes): «el DM ve “Sala del tablero”, pulsa Guardar y el PATCH lleva `boardRoomUrl`»; «con sala guardada aparece “Quitar la sala” y manda `null`». Con el `msw`/mock que las pruebas de ajustes ya usan.

- [ ] **Step 7: Unitarias web** → PASS.

- [ ] **Step 8: Mutación** — `cp campaign.schema.ts …bak`; quitar el `refine`; e2e «rechaza javascript:» → FAIL; restaurar con `cp`.

- [ ] **Step 9: Documentar** — `docs/05-datos.md` (campo), 07 (qué/por qué/revertir: «revertir = migración inversa `DROP COLUMN` + quitar el bloque»).

- [ ] **Step 10: `pnpm verify`** → exit 0. Orquestador: `pnpm --filter @dnd/api test:e2e -- campaigns` → verde (salida pegada).

- [ ] **Step 11: Commit**

```bash
git add packages/shared/src/campaign.schema.ts apps/api/prisma apps/api/src/campaigns apps/api/test/campaigns.e2e-spec.ts apps/web/src/features/campaigns docs/05-datos.md docs/07-historial.md
git commit -m "feat(campaign): boardRoomUrl — the DM saves the PlanarAlly game URL the table will frame"
```

---

### Task 6: El tablero dentro de la mesa — `<iframe>` en el centro y el registro como cajón (C1 bis, mesa)

**Files:**
- Create: `apps/web/src/features/sessions/tablero/MarcoDelTablero.tsx`, `apps/web/src/features/sessions/tablero/CajonDelRegistro.tsx`
- Create: `apps/web/src/features/sessions/tablero/__tests__/MarcoDelTablero.test.tsx`, `CajonDelRegistro.test.tsx`
- Modify: `apps/web/src/features/sessions/MesaDeSesion.tsx:203-246` (la rama `main` de la mesa)
- Create: `apps/web/e2e/tablero-en-la-mesa.spec.ts`
- Modify: `docs/01-arquitectura.md` (módulo `sessions/tablero`), `docs/08-pruebas.md`, `docs/09-jugar.md` (cómo usar la sala), `docs/07-historial.md`, `docs/decisiones.md` (D-CF-63: el tablero PlanarAlly embebido en la mesa; la mesa a 390 px sigue aplazada)

**Interfaces:**
- Consumes: `campana.boardRoomUrl` (Task 5); `HiloDeSesion` tal cual (no se toca: el cajón lo envuelve); patrón del cajón del rail (`RailDePaneles.tsx`).
- Produces: `MarcoDelTablero({ url })`, `CajonDelRegistro({ children, ultimoId })` — `ultimoId` es `eventos[0]?.id`; el cajón cuenta cuántos sucesos nuevos han llegado desde que se plegó (compara ids: guarda el `ultimoId` al plegar, y cuenta los ids de `eventos` anteriores a él… como `eventos` llega más reciente primero, «nuevos» = índice del id guardado en la lista actual, o `eventos.length` si ya no está).

- [ ] **Step 1: Unitarias que fallan**

```tsx
// MarcoDelTablero.test.tsx
it("enmarca la partida con la política de referrer y los permisos del portapapeles", () => {
  render(<MarcoDelTablero url="https://tablero.example/game/la-mesa" />);
  const marco = screen.getByTitle("Sala del tablero");
  expect(marco).toHaveAttribute("src", "https://tablero.example/game/la-mesa");
  expect(marco).toHaveAttribute("referrerpolicy", "no-referrer");
  expect(marco).toHaveAttribute("allow", "clipboard-read; clipboard-write");
  // Cada jugador inicia sesión en PlanarAlly dentro del marco, una vez por navegador: se dice
  // debajo, siempre, en una línea (no es un aviso que se cierra: es cómo funciona).
  expect(screen.getByText(/inicia sesión en el tablero dentro del marco/)).toBeInTheDocument();
});

// CajonDelRegistro.test.tsx
it("plegado, cuenta las líneas nuevas; desplegado, enseña el hilo y pone el contador a cero", () => {
  const { rerender } = render(<CajonDelRegistro eventos={[{ id: "b" }, { id: "a" }]}><p>hilo</p></CajonDelRegistro>);
  fireEvent.click(screen.getByRole("button", { name: /plegar el registro/i }));
  expect(screen.queryByText("hilo")).toBeNull();
  rerender(<CajonDelRegistro eventos={[{ id: "d" }, { id: "c" }, { id: "b" }, { id: "a" }]}><p>hilo</p></CajonDelRegistro>);
  expect(screen.getByRole("button", { name: /desplegar el registro/i })).toHaveTextContent("2");
  fireEvent.click(screen.getByRole("button", { name: /desplegar el registro/i }));
  expect(screen.getByText("hilo")).toBeVisible();
});
```

Run → FAIL (módulos inexistentes).

- [ ] **Step 2: (sin fichero de aviso)** — PlanarAlly guarda mapas y usuarios en el servidor (spec § 2 ter): la trampa del particionado desapareció con Legacy, y con ella el aviso «una vez por navegador».

- [ ] **Step 3: `MarcoDelTablero.tsx`**

```tsx
// C1 bis — el mapa en el hueco del registro (maqueta del autor, anexo #13). El tablero es
// PlanarAlly autoalojado en tablero.supportive.pro (D-CF-57): medido el 2026-09-12, sin
// X-Frame-Options ni CSP, y con registro + login dentro de un iframe desde otro origen. La URL
// es la de la PARTIDA (`…/game/<nombre>`), que el DM pega en «Sala del tablero».
export function MarcoDelTablero({ url }: { url: string }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col">
      <iframe
        title="Sala del tablero"
        src={url}
        referrerPolicy="no-referrer"
        allow="clipboard-read; clipboard-write"
        className="min-h-0 w-full flex-1 rounded-radius-sm border border-muted bg-surface"
      />
      <p className="mt-s1 font-chrome text-chrome-xs text-muted">
        Cada jugador inicia sesión en el tablero dentro del marco, una vez por navegador.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: `CajonDelRegistro.tsx`**

```tsx
import { useState, type ReactNode } from "react";
import { IconoFlechaIzquierda } from "../../../ui/Iconos";

// El registro en vivo, como un cajón inferior plegable tipo chat, con contador de líneas nuevas.
// `eventos` llega más reciente primero (reincorporarse.ts): «nuevas desde que plegué» es la
// posición del id que había arriba cuando se plegó.
export function CajonDelRegistro({ eventos, children }: { eventos: { id: string }[]; children: ReactNode }) {
  const [plegado, setPlegado] = useState(false);
  const [idAlPlegar, setIdAlPlegar] = useState<string | null>(null);
  const nuevas = plegado && idAlPlegar !== null
    ? (() => { const i = eventos.findIndex((e) => e.id === idAlPlegar); return i === -1 ? eventos.length : i; })()
    : 0;
  return (
    <section aria-label="Registro en vivo" className={["flex min-h-0 flex-col", plegado ? "" : "min-h-[14rem]"].join(" ")}>
      <button
        type="button"
        aria-expanded={!plegado}
        aria-label={plegado ? "Desplegar el registro" : "Plegar el registro"}
        onClick={() => { if (plegado) { setPlegado(false); setIdAlPlegar(null); } else { setPlegado(true); setIdAlPlegar(eventos[0]?.id ?? null); } }}
        className="flex items-center gap-s2 border-t border-muted bg-surface px-s3 py-s1 font-chrome text-chrome-xs text-muted hover:text-text"
      >
        <IconoFlechaIzquierda className={["h-4 w-4 transition-transform", plegado ? "-rotate-90" : "rotate-90"].join(" ")} />
        Registro
        {nuevas > 0 && <span className="rounded-full bg-accent px-1.5 font-data text-bg" aria-label={`${nuevas} líneas nuevas`}>{nuevas}</span>}
      </button>
      {!plegado && <div className="min-h-0 flex-1">{children}</div>}
    </section>
  );
}
```

(Si `IconoFlechaIzquierda` rotada queda rara, dibujar `IconoChevron` en `ui/Iconos.tsx` en esta tarea — dibujado, nunca `▸`.)

- [ ] **Step 5: `MesaDeSesion.tsx`** — en la rama `main` (no taller), el centro:

```tsx
            {campana?.boardRoomUrl ? (
              <div className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto] gap-s3">
                <MarcoDelTablero url={campana.boardRoomUrl} />
                <CajonDelRegistro eventos={eventos}>
                  <HiloDeSesion campaignId={campaignId} eventos={eventos} esDm={esDm} comoUsuario={comoUsuario} />
                </CajonDelRegistro>
              </div>
            ) : (
              <HiloDeSesion campaignId={campaignId} eventos={eventos} esDm={esDm} comoUsuario={comoUsuario} />
            )}
```

Unitaria en `mesa-de-sesion.test.tsx`: «con `boardRoomUrl`, la mesa monta el marco y el registro en su cajón; sin ella, el hilo a pelo» (mock de `useCampaign`).

- [ ] **Step 6: Unitarias** → PASS.

- [ ] **Step 7: e2e `tablero-en-la-mesa.spec.ts`** (lo corre el orquestador). La sala en la prueba es **una página nuestra** (`/acerca`), porque el e2e no sale a internet y nuestra web no manda `X-Frame-Options`:

```ts
test("con sala guardada, el marco ocupa el centro sin scroll de página y el registro se pliega con contador", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await registrarse(page);
  await campanaConSesionYHiloLargo(page);              // de mesa-mide.spec.ts, copiado
  // Ajustes → Sala del tablero → la propia app como sala.
  await page.goto(`/campaigns/${campaignId}?seccion=ajustes`);
  await page.getByLabel("Dirección de la sala").fill(`${page.url().split("/campaigns")[0]}/acerca`);
  await page.getByRole("button", { name: "Guardar la sala" }).click();
  await page.goto(`/campaigns/${campaignId}/sesion`);
  const marco = page.frameLocator("iframe[title='Sala del tablero']");
  await expect(marco.getByRole("heading", { level: 1 })).toBeVisible();
  const scrollDePagina = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight);
  expect(scrollDePagina).toBe(false);
  await page.getByRole("button", { name: "Plegar el registro" }).click();
  await page.getByRole("button", { name: "Anotar" }).click();
  await page.getByLabel("Qué anotar").fill("una línea con el registro plegado");
  await page.getByRole("button", { name: /Combate/ }).first().click();
  await expect(page.getByRole("button", { name: "Desplegar el registro" })).toContainText("1", { timeout: 20_000 });
});

test("a 390 px el marco va arriba y el registro debajo (la mesa a 390 sigue aplazada: D-CF-26)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // …misma preparación…
  const marco = await page.locator("iframe[title='Sala del tablero']").boundingBox();
  const registro = await page.getByRole("region", { name: "Registro en vivo" }).boundingBox();
  expect(registro!.y).toBeGreaterThanOrEqual(marco!.y + marco!.height - 1);
});
```

Y `tokens-contrast.spec.ts`: añadir el botón del cajón del registro a la lista de superficies medidas si el fichero lista superficies por selector (leerlo).

- [ ] **Step 8: Mutación** — `cp CajonDelRegistro.tsx …bak`; cambiar `findIndex` por `0` fijo; unitaria del contador → FAIL; restaurar con `cp`.

- [ ] **Step 9: Documentar** — 01 (módulo), 08 (suite), 09 (guía: «Sala del tablero», pegar la URL de la partida de PlanarAlly, cada jugador con su cuenta del tablero), 07, decisiones (D-CF-63).

- [ ] **Step 10: `pnpm verify`** → exit 0. Orquestador: `exec playwright test e2e/tablero-en-la-mesa.spec.ts`, después `e2e/mesa-mide.spec.ts` (la mesa sin sala no debe haber cambiado) → verde.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/features/sessions apps/web/e2e/tablero-en-la-mesa.spec.ts apps/web/e2e/tokens-contrast.spec.ts docs
git commit -m "feat(table): PlanarAlly game framed in the table center, the live log as a collapsible drawer with a new-lines counter"
```

---

### Task 7: Seis dados dibujados y el barrido de iconos (C3: #12, #22)

**Files:**
- Modify: `apps/web/src/ui/Iconos.tsx` (añadir `IconoDado`, `IconoMenu`)
- Modify: `apps/web/src/features/rolls/DadoDibujado.tsx` (delega)
- Modify: `apps/web/src/features/rolls/PanelDeDados.tsx:174-186`, `panel/PanelDeDadosDeLaMesa.tsx:262-274` (los atajos pintan `IconoDado caras={caras}`)
- Modify: `apps/web/src/ui/__tests__/Iconos.test.tsx`
- Create: `apps/web/src/ui/__tests__/botones-con-icono.test.tsx`
- Modify: los botones que el barrido encuentre sin icono — como mínimo `campaign-items/CampaignItemsCatalogPage.tsx:78` («+ Crear objeto» → `IconoMas` + «Crear objeto»), `bestiario/PanelDeBestiario.tsx` («Escribir una criatura»), y las entradas de navegación de `pages/CampaignDetailPage.tsx` sin dibujo
- Modify: `docs/04-convenciones.md` (la regla de iconos gana la frase «todo botón primario de página y toda entrada de navegación llevan icono; lo comprueba `botones-con-icono.test.tsx`»), `docs/07-historial.md`

**Interfaces:**
- Consumes: `Marco` de `Iconos.tsx`.
- Produces: `IconoDado({ caras: 4 | 6 | 8 | 10 | 12 | 20 | 100, className? })` con `data-icono="d{caras}"`; `IconoMenu` (tres puntos, `data-icono="menu"`), que Task 8 consume.

- [ ] **Step 1: Unitarias que fallan**

```tsx
// Iconos.test.tsx
it("IconoDado dibuja una forma distinta por dado y el d100 comparte la del d10", () => {
  const { container } = render(<>{[4, 6, 8, 10, 12, 20, 100].map((c) => <IconoDado key={c} caras={c as 4} />)}</>);
  const svgs = container.querySelectorAll("svg");
  expect(svgs).toHaveLength(7);
  const trazos = [...svgs].map((s) => s.innerHTML);
  expect(new Set(trazos.slice(0, 6)).size).toBe(6);   // d4…d20: seis dibujos distintos
  expect(trazos[6]).toBe(trazos[3]);                   // d100 = trapezoedro del d10
  expect(svgs[6]).toHaveAttribute("data-icono", "d100");
});
```

```tsx
// botones-con-icono.test.tsx — barrido del CÓDIGO FUENTE, como iconos-sin-duplicados.test.ts
import { readFileSync } from "node:fs";
import { globSync } from "node:fs"; // Node 22: fs.globSync; si no está, usar `fast-glob` ya presente en el repo o un readdir recursivo
// Anexo #22: «Escribir una criatura» iba sin icono; «+ Crear objeto» llevaba un `+` de fuente.
// Regla: todo `<Button>` primario de página (`variant` ausente o "primary") cuyo texto empieza
// por un verbo de crear/escribir/abrir lleva un `Icono*` dentro, y ningún botón empieza por «+».
describe("los botones primarios de página llevan icono dibujado", () => {
  const ficheros = globSync("src/{pages,features}/**/*.tsx", { cwd: join(__dirname, "..", "..", "..") }).filter((f) => !f.includes("__tests__"));
  it("ningún botón empieza por un «+» de fuente", () => {
    const culpables = ficheros.filter((f) => /<Button[^>]*>\s*\+\s/.test(readFileSync(f, "utf8")));
    expect(culpables).toEqual([]);
  });
  it("todo <Button> primario con «Crear», «Escribir», «Nueva», «Nuevo» o «Añadir» lleva un <Icono", () => {
    const culpables: string[] = [];
    for (const f of ficheros) {
      const fuente = readFileSync(f, "utf8");
      for (const m of fuente.matchAll(/<Button(?![^>]*variant="(?:secondary|ghost|danger)")[^>]*>([\s\S]*?)<\/Button>/g)) {
        const cuerpo = m[1];
        if (/\b(Crear|Escribir|Nueva|Nuevo|Añadir)\b/.test(cuerpo) && !/<Icono\w+/.test(cuerpo)) culpables.push(`${f}: ${cuerpo.trim().slice(0, 40)}`);
      }
    }
    expect(culpables).toEqual([]);
  });
});
```

Run → FAIL (`IconoDado` no existe; y la lista de culpables no está vacía — **esa lista es el barrido**: se pega en el informe).

- [ ] **Step 2: Dibujar en `Iconos.tsx`** (mismo `Marco`, trazo 1.6):

```tsx
/** Los seis dados, cada uno con su forma (regla «un dado, una forma», 04-convenciones). */
export function IconoDado({ caras, className }: IconoProps & { caras: 4 | 6 | 8 | 10 | 12 | 20 | 100 }) {
  const forma = caras === 100 ? 10 : caras;
  return (
    <Marco className={className} data-icono={`d${caras}`}>
      {forma === 4 && (<><path d="M12 3l9 16H3z" /><path d="M12 3v16M12 19l-9 0M12 19l9 0" /></>)}
      {forma === 6 && (<><path d="M4 8l8-4 8 4v8l-8 4-8-4z" /><path d="M4 8l8 4 8-4M12 12v8" /></>)}
      {forma === 8 && (<><path d="M12 2l8 10-8 10L4 12z" /><path d="M4 12h16M12 2l-8 10M12 2l8 10" /></>)}
      {forma === 10 && (<><path d="M12 2l9 8-9 12-9-12z" /><path d="M3 10l9 4 9-4M12 14v8M7.5 7l4.5 7 4.5-7" /></>)}
      {forma === 12 && (<><path d="M12 2l7 5 3 8-4 7H6l-4-7 3-8z" /><path d="M12 8l4 3-1.5 5h-5L8 11z" /><path d="M12 2v6M19 7l-3 4M22 15l-6.5 1M2 15l6.5 1M5 7l3 4" /></>)}
      {forma === 20 && (<><path d="M12 2.2 21 7.3v9.4L12 21.8 3 16.7V7.3z" /><path d="M12 2.2 7 10.6h10z" /><path d="M7 10.6 12 21.8l5-11.2" /><path d="M3 7.3 7 10.6M21 7.3 17 10.6" /></>)}
    </Marco>
  );
}

/** El menú «…» de una fila: tres puntos, dibujados. */
export function IconoMenu({ className }: IconoProps) {
  return (
    <Marco className={className} data-icono="menu">
      <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </Marco>
  );
}
```

`DadoDibujado.tsx` pasa a `export function DadoDibujado({ className = "" }) { return <IconoDado caras={20} className={className} />; }` — y **`data-icono` cambia de `dado` a `d20`**: buscar `data-icono="dado"` en pruebas y e2e (`grep -rn 'icono="dado"\|icono=dado' apps/web`) y actualizar cada aserción (no aflojar: se cambia el valor esperado, con motivo en el commit).

- [ ] **Step 3: Los atajos** de los dos paneles: `<IconoDado caras={caras} />` en vez de `<DadoDibujado />`.

- [ ] **Step 4: El barrido** — arreglar cada culpable de la lista: `IconoMas` + texto sin «+»; «Escribir una criatura» con `IconoPluma`; entradas de navegación de `CampaignDetailPage` sin dibujo con el icono de su sección (`iconosDeSeccion.tsx`). **No se inventan iconos nuevos si ya existe uno para el concepto** (`iconos-sin-duplicados.test.ts`).

- [ ] **Step 5: Unitarias** → `pnpm --filter @dnd/web test -- src/ui src/features/rolls src/features/campaign-items src/features/bestiario src/pages` → PASS.

- [ ] **Step 6: Mutación** — `cp Iconos.tsx …bak`; hacer que `forma === 8` pinte el trazo del 6; unitaria «seis dibujos distintos» → FAIL; restaurar con `cp`.

- [ ] **Step 7: Documentar** — 04 (la frase), 07.

- [ ] **Step 8: `pnpm verify`** → exit 0. Orquestador: `exec playwright test e2e/dados.spec.ts`, `e2e/bestiario.spec.ts` → verde.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src apps/web/e2e docs/04-convenciones.md docs/07-historial.md
git commit -m "feat(icons): one drawn shape per die, the row menu glyph, and every primary page button carries an icon"
```

---

### Task 8: `MenuDeAcciones` y la fila del elenco (C2: #1)

**Files:**
- Create: `apps/web/src/ui/MenuDeAcciones.tsx`, `apps/web/src/ui/__tests__/MenuDeAcciones.test.tsx`
- Modify: `apps/web/src/ui/index.ts` (exportar)
- Modify: `apps/web/src/features/sessions/elenco/MandosDeCombatiente.tsx:66-118`
- Modify: `apps/web/src/features/sessions/elenco/DarObjeto.tsx:71-100,180-196` (modo controlado)
- Modify: `apps/web/src/features/sessions/elenco/CorregirBando.tsx` (`variante?: "fila" | "menu"`: en el menú, las tres entradas de bando son ítems del menú)
- Modify: `apps/web/src/features/sessions/elenco/FichaDeElenco.tsx:230-260`, `FichaDePnj.tsx:138` (pasan el bando al menú en vez de montar la fila aparte)
- Modify: `apps/web/src/features/sessions/elenco/__tests__/FichaDeElenco.test.tsx`, `DarObjeto.test.tsx`
- Modify: `apps/web/e2e/teclado.spec.ts` (el menú por teclado), `e2e/combate.spec.ts` (los caminos que pulsaban «Condición» o «Dar» ahora abren el menú primero)
- Modify: `docs/04-convenciones.md` (la regla de acciones de fila enlaza al componente), `docs/07-historial.md`

**Interfaces:**
- Consumes: `IconoMenu` (Task 7); `ACCIONES_VISIBLES = 2` (Task 0).
- Produces:

```ts
export interface AccionDeMenu {
  id: string;
  rotulo: string;
  icono?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  motivo?: string;            // por qué está apagada; se lee (aria-describedby)
  tono?: "normal" | "peligro";
}
export function MenuDeAcciones({ etiqueta, acciones }: { etiqueta: string; acciones: AccionDeMenu[] }): JSX.Element;
```

`DarObjeto` gana `controlado?: { abierto: boolean; onCerrar: () => void }` — con él no pinta su botón. `CorregirBando` gana `variante="menu"` que devuelve `AccionDeMenu[]` vía un hook `useAccionesDeBando(props): AccionDeMenu[]` (para que el menú las liste) — el `role="group"` de la fila se conserva para la variante `fila`, que sigue existiendo para quien la use.

- [ ] **Step 1: Unitaria del menú que falla**

```tsx
// MenuDeAcciones.test.tsx
describe("MenuDeAcciones", () => {
  const acciones = [
    { id: "condicion", rotulo: "Condición", onSelect: vi.fn() },
    { id: "dar", rotulo: "Dar", onSelect: vi.fn() },
    { id: "hoja", rotulo: "Su hoja", onSelect: vi.fn(), disabled: true, motivo: "Cargando" },
  ];
  it("abre con el botón «…», lista las acciones y devuelve el foco al cerrar con Escape", async () => {
    render(<MenuDeAcciones etiqueta="Más acciones sobre Klarg" acciones={acciones} />);
    const boton = screen.getByRole("button", { name: "Más acciones sobre Klarg" });
    expect(boton).toHaveAttribute("aria-haspopup", "menu");
    expect(boton.querySelector("[data-icono='menu']")).not.toBeNull();
    await userEvent.click(boton);
    const menu = screen.getByRole("menu");
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(3);
    expect(within(menu).getByRole("menuitem", { name: /Su hoja/ })).toHaveAttribute("aria-disabled", "true");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(boton).toHaveFocus();
  });
  it("las flechas mueven el foco y Enter selecciona", async () => {
    render(<MenuDeAcciones etiqueta="Más" acciones={acciones} />);
    await userEvent.click(screen.getByRole("button", { name: "Más" }));
    expect(screen.getByRole("menuitem", { name: "Condición" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(acciones[1].onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });
  it("se abre hacia arriba cuando no hay sitio debajo", async () => {
    // jsdom no maqueta: se inyecta la medida por prop de prueba.
    render(<MenuDeAcciones etiqueta="Más" acciones={acciones} __medirSitio={() => ({ abajo: 40, arriba: 400 })} />);
    await userEvent.click(screen.getByRole("button", { name: "Más" }));
    expect(screen.getByRole("menu")).toHaveAttribute("data-direccion", "arriba");
  });
});
```

Run → FAIL.

- [ ] **Step 2: `MenuDeAcciones.tsx`**

```tsx
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { IconoMenu } from "./Iconos";

// Pulido 2026-09-12, C2 (anexo #1): la fila del elenco tenía siete mandos y se salía de la
// tarjeta. Regla nueva de 04-convenciones: hasta ACCIONES_VISIBLES en la fila; el resto aquí.
// Teclado: flechas, Home/End, Enter/Espacio, Escape; el foco vuelve al botón. Se abre hacia
// donde hay sitio. Lo consumirá también el menú «Acciones» del paso 3 (D-CF-50).
export interface AccionDeMenu { id: string; rotulo: string; icono?: ReactNode; onSelect: () => void; disabled?: boolean; motivo?: string; tono?: "normal" | "peligro"; }

const ALTO_ESTIMADO_POR_ITEM = 36;

export function MenuDeAcciones({ etiqueta, acciones, __medirSitio }: { etiqueta: string; acciones: AccionDeMenu[]; __medirSitio?: () => { abajo: number; arriba: number } }) {
  const [abierto, setAbierto] = useState(false);
  const [direccion, setDireccion] = useState<"abajo" | "arriba">("abajo");
  const [activo, setActivo] = useState(0);
  const botonRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();

  const medir = __medirSitio ?? (() => {
    const r = botonRef.current?.getBoundingClientRect();
    return r ? { abajo: window.innerHeight - r.bottom, arriba: r.top } : { abajo: Infinity, arriba: 0 };
  });

  const abrir = () => {
    const sitio = medir();
    setDireccion(sitio.abajo < acciones.length * ALTO_ESTIMADO_POR_ITEM && sitio.arriba > sitio.abajo ? "arriba" : "abajo");
    setActivo(0);
    setAbierto(true);
  };
  const cerrar = (devolverFoco = true) => { setAbierto(false); if (devolverFoco) botonRef.current?.focus(); };

  useEffect(() => { if (abierto) itemsRef.current[activo]?.focus(); }, [abierto, activo]);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!(e.target instanceof Node) || !botonRef.current?.parentElement?.contains(e.target)) cerrar(false); };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  const alTeclear = (e: React.KeyboardEvent) => {
    const n = acciones.length;
    if (e.key === "Escape") { e.preventDefault(); cerrar(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActivo((i) => (i + 1) % n); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((i) => (i - 1 + n) % n); }
    else if (e.key === "Home") { e.preventDefault(); setActivo(0); }
    else if (e.key === "End") { e.preventDefault(); setActivo(n - 1); }
    else if (e.key === "Tab") cerrar(false);
  };

  return (
    <div className="relative inline-block">
      <button ref={botonRef} type="button" aria-haspopup="menu" aria-expanded={abierto} aria-controls={abierto ? `${id}-menu` : undefined} aria-label={etiqueta}
        onClick={() => (abierto ? cerrar() : abrir())}
        className="rounded-radius-sm border border-muted p-1 text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
        <IconoMenu className="h-4 w-4" />
      </button>
      {abierto && (
        <ul id={`${id}-menu`} role="menu" aria-label={etiqueta} data-direccion={direccion} onKeyDown={alTeclear}
          className={["absolute right-0 z-30 min-w-[11rem] rounded-radius-sm border border-muted bg-surface py-1 shadow-lg", direccion === "arriba" ? "bottom-full mb-1" : "top-full mt-1"].join(" ")}>
          {acciones.map((a, i) => (
            <li key={a.id} role="none">
              <button ref={(el) => { itemsRef.current[i] = el; }} type="button" role="menuitem" tabIndex={i === activo ? 0 : -1}
                aria-disabled={a.disabled || undefined} aria-describedby={a.disabled && a.motivo ? `${id}-${a.id}-motivo` : undefined}
                onClick={() => { if (a.disabled) return; cerrar(); a.onSelect(); }}
                className={["flex w-full items-center gap-s2 px-s3 py-1.5 text-left font-chrome text-chrome-sm", a.disabled ? "cursor-not-allowed text-muted" : a.tono === "peligro" ? "text-danger-text hover:bg-[color:var(--danger-tint)]" : "text-text hover:bg-bg"].join(" ")}>
                {a.icono && <span className="[&>svg]:size-4">{a.icono}</span>}
                {a.rotulo}
                {a.disabled && a.motivo && <span id={`${id}-${a.id}-motivo`} className="sr-only"> — {a.motivo}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `MandosDeCombatiente`** — Daño y Curar quedan como botones; Condición · Dar · Su hoja · Bando van al menú:

```tsx
      <div className="mt-s2 flex items-center gap-s1">
        <button …Daño… />
        <button …Curar… />
        <MenuDeAcciones
          etiqueta={`Más acciones sobre ${nombre}`}
          acciones={[
            { id: "condicion", rotulo: "Condición", icono: <IconoAviso />, onSelect: () => setPanel("condicion") },
            { id: "dar", rotulo: "Dar…", icono: <IconoMochila />, onSelect: () => setPanel("dar") },
            { id: "hoja", rotulo: "Su hoja", icono: <IconoOjo />, onSelect: () => setPanel("hoja") },
            ...accionesDeBando,
          ]}
        />
      </div>
      …
      <DarObjeto campaignId={campaignId} soyDm={soyDm} miPersonajeId={characterId} controlado={{ abierto: panel === "dar", onCerrar: () => setPanel(null) }} />
```

`panel` gana `"dar"`. `accionesDeBando` viene por prop (`AccionDeMenu[]`, vacío si no hay combate) desde `FichaDeElenco`/`FichaDePnj`, que la construyen con `useAccionesDeBando({ campaignId, sessionId, encounterId, combatanteId, bando, nombre })` de `CorregirBando.tsx`:

```tsx
export function useAccionesDeBando(p: {…}): AccionDeMenu[] {
  const cambiar = useSetSide(p.campaignId, p.sessionId);
  return BANDOS.map((b) => ({
    id: `bando-${b.valor}`,
    rotulo: b.valor === p.bando ? `${b.nombre} (su bando actual)` : `Marcar como ${b.nombre}`,
    disabled: b.valor === p.bando || cambiar.isPending,
    motivo: b.valor === p.bando ? "Ya es su bando" : cambiar.isPending ? "Enviando el cambio de bando" : undefined,
    onSelect: () => cambiar.mutate({ encounterId: p.encounterId, combatantId: p.combatanteId, side: b.valor }),
  }));
}
```

(`CorregirBando` de fila se queda como está para no borrar su prueba; `FichaDeElenco`/`FichaDePnj` dejan de montarlo y pasan `accionesDeBando` al menú. Su prueba de fila sigue en verde porque el componente existe; la de `FichaDeElenco` que buscaba «Bando de X» como `group` pasa a buscar los `menuitem` — **se cambia la aserción, no se borra**.)

- [ ] **Step 4: `DarObjeto` controlado** — `const [abiertoPropio, setAbiertoPropio] = useState(false); const abierto = controlado?.abierto ?? abiertoPropio; const cerrar = …controlado ? controlado.onCerrar() : setAbiertoPropio(false)…`; el botón disparador solo se pinta si `!controlado`.

- [ ] **Step 5: Unitarias** → `pnpm --filter @dnd/web test -- src/ui src/features/sessions` → PASS (con las aserciones actualizadas).

- [ ] **Step 6: e2e** — `teclado.spec.ts`: un `test` que abre el menú de un combatiente con teclado (Tab hasta «Más acciones sobre…», Enter, ArrowDown, Enter → se abre «Condición…»; Escape devuelve el foco). `combate.spec.ts`: donde pulsaba «Condición» ahora `getByRole("button", { name: /Más acciones sobre/ })` → `getByRole("menuitem", { name: "Condición" })`. Medida en `espacios.spec.ts` (añadir un `test`): la fila de mandos de una tarjeta del elenco **no se sale** de su tarjeta (`boundingBox` de la fila dentro del de la tarjeta, ±1px), a 1280×800.

- [ ] **Step 7: Mutación** — `cp MenuDeAcciones.tsx …bak`; quitar la rama `Escape`; unitaria → FAIL; restaurar con `cp`.

- [ ] **Step 8: Documentar** — 04 (la regla nombra el componente), 07, 08 (teclado.spec gana un caso).

- [ ] **Step 9: `pnpm verify`** → exit 0. Orquestador: `exec playwright test e2e/teclado.spec.ts`, `e2e/combate.spec.ts`, `e2e/espacios.spec.ts`, `e2e/dar-a-un-pnj.spec.ts`, `e2e/tokens-contrast.spec.ts` (el menú abierto se mide en los tres temas: añadir su superficie) → verde.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/ui apps/web/src/features/sessions apps/web/e2e docs
git commit -m "feat(ui): MenuDeAcciones — the cast row keeps Damage and Heal visible and folds the rest into a drawn menu"
```

---

### Task 9: El servidor dice qué dado cayó — `dice[]` por dado (C5, API)

**Files:**
- Modify: `packages/shared/src/roll.schema.ts:163-176` (el bloque `desglose`)
- Modify: `packages/shared/src/game-event.schema.ts:273-290` (`ABILITY_ROLL`)
- Modify: `apps/api/src/rolls/rolls.service.ts:141-145` y donde construye la respuesta y el payload
- Modify: `apps/api/src/rolls/rolls.service.spec.ts`, `apps/api/test/rolls.e2e-spec.ts`
- Modify: `docs/05-datos.md` (el payload de `ABILITY_ROLL`), `docs/07-historial.md`

**Interfaces:**
- Consumes: `DiceTermResult { sides, rolled, kept, dropped }` (`dice.ts`).
- Produces: en `rollResultSchema` (rama revelada) y en el payload `ABILITY_ROLL`:

```ts
export const dieRolledSchema = z.object({
  sides: z.number().int().positive(),
  value: z.number().int().positive(),
  kept: z.boolean(),
});
/** Cada dado, en el orden en que cayó, con sus caras. **Opcional**: el historial ya escrito no lo trae. */
dice: z.array(dieRolledSchema).max(100).optional(),
```

y `dadosTirados(terms: DiceTermResult[]): DieRolled[]` exportada de `rolls.service.ts` (o de `dice.ts`, junto a los términos — mejor ahí: es del evaluador).

- [ ] **Step 1: Unitaria que falla** (en `apps/api/src/dice/dice.spec.ts`):

```ts
describe("dadosTirados", () => {
  it("empareja cada dado con sus caras y marca los descartados de kh/kl y los relanzados", () => {
    const roller = secuencia([3, 5, 1, 6, 2, 4]); // el helper de roller inyectable que ya usa el fichero
    const r = rollExpression("4d6kh3+1d4", roller);
    expect(dadosTirados(r.terms)).toEqual([
      { sides: 6, value: 3, kept: true },
      { sides: 6, value: 5, kept: true },
      { sides: 6, value: 1, kept: false },
      { sides: 6, value: 6, kept: true },
      { sides: 4, value: 2, kept: true },
    ]);
  });
  it("con 2d6 iguales y un descartado, tacha uno y no los dos", () => {
    const r = rollExpression("2d6kh1", secuencia([4, 4]));
    expect(dadosTirados(r.terms).filter((d) => !d.kept)).toHaveLength(1);
  });
  it("una constante no es un dado", () => {
    expect(dadosTirados(rollExpression("1d8+3", secuencia([5])).terms)).toEqual([{ sides: 8, value: 5, kept: true }]);
  });
});
```

Run: `pnpm --filter @dnd/api test -- dice` → FAIL.

- [ ] **Step 2: `dice.ts`**

```ts
/** Un dado como cayó, con sus caras y si cuenta. Es lo que la pantalla pinta uno a uno (C5). */
export interface DieRolled { sides: number; value: number; kept: boolean; }

/**
 * Los dados de todos los términos, en orden, con sus caras. `dropped` se consume como
 * multiconjunto —igual que `dadosDeLaTirada` en la web— para que `[4, 4]` con un descartado
 * tache uno y no los dos. Las constantes no son dados.
 */
export function dadosTirados(terms: DiceTermResult[]): DieRolled[] {
  return terms.flatMap((t) => {
    if (t.sides === 0) return [];
    const pendientes = [...t.dropped];
    return t.rolled.map((value) => {
      const i = pendientes.indexOf(value);
      if (i === -1) return { sides: t.sides, value, kept: true };
      pendientes.splice(i, 1);
      return { sides: t.sides, value, kept: false };
    });
  });
}
```

- [ ] **Step 3: Contrato** (shared, los dos sitios) y **servicio**: junto a `rolls/kept/dropped` añadir `const dice = dadosTirados(resultado.terms);` y ponerlo en el payload del `ABILITY_ROLL` y en la respuesta revelada.

- [ ] **Step 4: e2e de API** (`rolls.e2e-spec.ts`): «`POST /rolls` con `2d6+1d20` devuelve `dice` con tres entradas, caras `[6, 6, 20]` en orden, y el suceso del log lo trae igual».

- [ ] **Step 5: Correr** — `pnpm --filter @dnd/api test -- dice rolls` → PASS; orquestador `pnpm --filter @dnd/api test:e2e -- rolls` → verde.

- [ ] **Step 6: Mutación** — `cp dice.ts …bak`; no consumir `pendientes` (quitar el `splice`); unitaria «tacha uno y no los dos» → FAIL; restaurar con `cp`.

- [ ] **Step 7: Documentar** — 05 (payload), 07.

- [ ] **Step 8: `pnpm verify`** → exit 0.

- [ ] **Step 9: Commit**

```bash
git add packages/shared/src apps/api/src/dice apps/api/src/rolls apps/api/test/rolls.e2e-spec.ts docs/05-datos.md docs/07-historial.md
git commit -m "feat(rolls): the result and ABILITY_ROLL carry dice[] — each die with its sides and whether it counts"
```

---

### Task 10: La bandeja de dados (C5 web: #10, #11, #14, y la bandeja en #16)

**Files:**
- Create: `apps/web/src/features/rolls/bandeja.ts`, `BandejaDeDados.tsx`, `__tests__/bandeja.test.ts`, `__tests__/BandejaDeDados.test.tsx`
- Modify: `apps/web/src/features/rolls/desglose.ts` (`dadosDeLaTirada` acepta `dice` y devuelve `caras`), `ResultadoDeTirada.tsx` (un dado por dado con su forma), `PanelDeDados.tsx`, `panel/PanelDeDadosDeLaMesa.tsx`
- Modify: `apps/web/src/features/rolls/__tests__/desglose.test.ts`, `ResultadoDeTirada.test.tsx`, `PanelDeDados.test.tsx`
- Modify: `apps/web/e2e/dados.spec.ts`, `e2e/tirada.spec.ts` (los recorridos que escribían la expresión a mano siguen valiendo por el «modo avanzado»; añadir el camino por bandeja), `e2e/tokens-contrast.spec.ts` (la bandeja)
- Modify: `docs/08-pruebas.md`, `docs/09-jugar.md` (cómo se tira), `docs/07-historial.md`, `docs/06-pendientes.md` (#13 queda como ficha con dice-box, de la nota de Task 0)

**Interfaces:**
- Consumes: `IconoDado` (Task 7); `dice[]` del resultado (Task 9; si falta —suceso viejo— se cae al dibujo del d20 como hoy); `SelectorDeVentaja`, `SelectorDeAudiencia`; `conDadoAnadido` deja de usarse en los paneles (se conserva con su prueba: lo usa el modo avanzado).
- Produces:

```ts
// bandeja.ts — la composición, probada sola
export type Caras = 4 | 6 | 8 | 10 | 12 | 20 | 100;
export interface Bandeja { dados: Caras[]; modificador: number; }
export const BANDEJA_VACIA: Bandeja = { dados: [], modificador: 0 };
export function conDado(b: Bandeja, caras: Caras): Bandeja;
export function sinDado(b: Bandeja, indice: number): Bandeja;
export function conModificador(b: Bandeja, delta: number): Bandeja;
/** `2d6+1d20+3`, agrupando por caras en el orden en que entraron; vacía → "". */
export function expresionDeBandeja(b: Bandeja): string;
/** Hay exactamente un d20 y nada más de d20: la ventaja se ofrece. */
export function admiteVentaja(b: Bandeja): boolean;
```

`BandejaDeDados({ valor, onChange, compacta? })` pinta los siete dados como botones (`aria-label="Añadir un d6"`), la pila (`aria-label="Quitar el d6 (posición 2)"`), `−`/`+` del modificador, y un `<details>` «Modo avanzado» con el campo de expresión; **la expresión es la fuente si el modo avanzado está abierto y el usuario ha escrito**, y si no, la de la bandeja. Devuelve `onChange({ bandeja, expresion })`.

- [ ] **Step 1: Unitarias que fallan**

```ts
// bandeja.test.ts
it("compone 2d6+1d20+3 agrupando por caras y respetando el orden de entrada", () => {
  let b = conDado(conDado(conDado(BANDEJA_VACIA, 6), 20), 6);
  b = conModificador(b, 3);
  expect(expresionDeBandeja(b)).toBe("2d6+1d20+3");
});
it("un modificador negativo va con su signo y la bandeja vacía es la cadena vacía", () => {
  expect(expresionDeBandeja(conModificador(conDado(BANDEJA_VACIA, 8), -2))).toBe("1d8-2");
  expect(expresionDeBandeja(BANDEJA_VACIA)).toBe("");
});
it("quitar por índice quita ese dado y no otro con las mismas caras", () => {
  const b = sinDado(conDado(conDado(BANDEJA_VACIA, 6), 6), 0);
  expect(b.dados).toEqual([6]);
});
it("la ventaja solo se ofrece con exactamente un d20", () => {
  expect(admiteVentaja(conDado(BANDEJA_VACIA, 20))).toBe(true);
  expect(admiteVentaja(conDado(conDado(BANDEJA_VACIA, 20), 20))).toBe(false);
  expect(admiteVentaja(conDado(BANDEJA_VACIA, 6))).toBe(false);
});
```

```tsx
// BandejaDeDados.test.tsx
it("pulsar un dado lo añade a la pila y pulsar uno de la pila lo quita", async () => {
  const onChange = vi.fn();
  render(<BandejaDeDados valor={BANDEJA_VACIA} onChange={onChange} />);
  await userEvent.click(screen.getByRole("button", { name: "Añadir un d6" }));
  expect(onChange).toHaveBeenLastCalledWith({ bandeja: { dados: [6], modificador: 0 }, expresion: "1d6" });
});
it("con un d20 en la pila ofrece ventaja; sin él, no", () => {
  const { rerender } = render(<BandejaDeDados valor={{ dados: [20], modificador: 0 }} onChange={() => {}} />);
  expect(screen.getByRole("radiogroup", { name: /ventaja/i })).toBeInTheDocument();
  rerender(<BandejaDeDados valor={{ dados: [6], modificador: 0 }} onChange={() => {}} />);
  expect(screen.queryByRole("radiogroup", { name: /ventaja/i })).toBeNull();
});
it("el modo avanzado está plegado y, abierto, la expresión escrita manda", async () => {
  const onChange = vi.fn();
  render(<BandejaDeDados valor={{ dados: [6], modificador: 0 }} onChange={onChange} />);
  expect(screen.queryByLabelText("Qué se tira")).toBeNull();
  await userEvent.click(screen.getByText("Modo avanzado"));
  await userEvent.clear(screen.getByLabelText("Qué se tira"));
  await userEvent.type(screen.getByLabelText("Qué se tira"), "4d6kh3");
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ expresion: "4d6kh3" }));
});
```

```ts
// desglose.test.ts — dadosDeLaTirada con `dice`
it("con dice[], cada dado sale con sus caras y su conservado tal cual dice el servidor", () => {
  expect(dadosDeLaTirada({ rolls: [3, 5], dropped: [3], dice: [{ sides: 6, value: 3, kept: false }, { sides: 20, value: 5, kept: true }] }))
    .toEqual([{ valor: 3, conservado: false, caras: 6 }, { valor: 5, conservado: true, caras: 20 }]);
});
it("sin dice[] (suceso viejo), empareja como antes y deja caras en null", () => {
  expect(dadosDeLaTirada({ rolls: [8, 8], dropped: [8] })).toEqual([{ valor: 8, conservado: true, caras: null }, { valor: 8, conservado: false, caras: null }]);
});
```

Run → FAIL.

- [ ] **Step 2: `bandeja.ts`** (composición pura; `expresionDeBandeja` agrupa con un `Map<Caras, number>` en orden de inserción; modificador `+n`/`-n`; `admiteVentaja = dados.filter(c => c === 20).length === 1`).

- [ ] **Step 3: `BandejaDeDados.tsx`** — siete botones con `<IconoDado caras={c} />` y `d{c}` en `font-data`; la pila como `<ul aria-label="Dados en la bandeja">` con un botón por dado (`IconoDado` + `aria-label="Quitar el d6 (posición N)"`); `−`/`+` con `aria-label="Bajar el modificador"/"Subir el modificador"` y la cifra en medio; `SelectorDeVentaja` solo si `admiteVentaja`; `<details>` «Modo avanzado» con el `Field label="Qué se tira" reservaEspacio`; en `compacta`, los siete dados en una fila `flex-wrap` y sin el rótulo «Atajos».

- [ ] **Step 4: `ResultadoDeTirada.tsx`** — cada dado con su forma: `<IconoDado caras={dado.caras ?? 20} />` y el número; descartados tachados como hoy. El total en grande ya lo pinta el panel.

- [ ] **Step 5: Los dos paneles** — `PanelDeDados`: el bloque «Qué se tira» + «Atajos» + `SelectorDeVentaja` se sustituye por `<BandejaDeDados valor={bandeja} onChange={({ bandeja, expresion }) => { setBandeja(bandeja); setExpresion(expresion); }} />` (el modo y la audiencia siguen igual; el botón «Tirar» apagado con motivo si `expresion === ""`). `PanelDeDadosDeLaMesa`: lo mismo en `compacta`, y **audiencia y CD (con su guía) dentro de un `<details>` «Audiencia y CD»** cuyo `summary` dice lo elegido («Para la mesa entera · sin CD»); los radios siguen siendo radios dentro. El botón pasa a decir «Tirar» y su explicación larga a un `<p>` bajo el `details`, `text-chrome-xs`. Una sola columna siempre.

- [ ] **Step 6: Unitarias** → `pnpm --filter @dnd/web test -- src/features/rolls` → PASS (las de `PanelDeDados.test.tsx` que escribían en «Qué se tira» abren antes «Modo avanzado»: **se ajusta el camino, no la aserción**).

- [ ] **Step 7: e2e** — `dados.spec.ts`: «pulsar d6, d6, d20, subir el modificador a 3 → tirar → el resultado enseña tres dados con `data-icono` d6, d6, d20 y el total»; `tirada.spec.ts`: el cajón «La mesa tira» compacto cabe en 17rem de ancho sin desbordar (`boundingBox` del cajón ≥ el de su contenido). `tokens-contrast.spec.ts`: la bandeja y el `details` abierto.

- [ ] **Step 8: Mutación** — `cp bandeja.ts …bak`; `expresionDeBandeja` sin agrupar (`1d6+1d6`); unitaria → FAIL; restaurar con `cp`.

- [ ] **Step 9: Documentar** — 08 (suites), 09 (cómo se tira ahora: pulsa dados, quita uno con un clic, modo avanzado), 07, 06 (#13 con dice-box y su coste, de la nota).

- [ ] **Step 10: `pnpm verify`** → exit 0. Orquestador: `exec playwright test e2e/dados.spec.ts`, `e2e/tirada.spec.ts`, `e2e/peticion-de-tirada.spec.ts`, `e2e/tokens-contrast.spec.ts` → verde.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/features/rolls apps/web/e2e docs
git commit -m "feat(dice): the dice tray — tap to add, tap the pile to remove, advantage only with one d20, and every die drawn with its face"
```

---

### Task 11: El hilo habla de personajes (C4: #15)

**Files:**
- Modify: `packages/shared/src/character-sheet.schema.ts:46-67` (`changeHpSchema.sourceCharacterId`), `game-event.schema.ts:205-232` (`HP_CHANGED.sourceCharacterId`)
- Modify: `apps/api/src/characters/character-sheet.service.ts` (`changeHp`: valida el origen con `requireVisibleCharacter` del actor y lo escribe en el payload)
- Modify: `apps/api/test/dano-con-su-traza.e2e-spec.ts` (dos `it`)
- Create: `apps/web/src/features/sessions/nombres-del-hilo.ts` (resuelve sujeto/objetivo/atacante por id, con «alguien» cuando no se ve)
- Modify: `apps/web/src/features/sessions/linea-de-log.ts` (firma `lineaDeLog(p, nombres?)`), `hilo/HiloDeSesion.tsx:116-149,320-330`, `hilo/MensajeDelHilo.tsx:185-204`, `elenco/PonerDano.tsx` (selector opcional «¿De quién viene?»)
- Modify: `apps/web/src/features/sessions/__tests__/linea-de-log-sin-claves.test.ts` (nuevas frases), `hilo/__tests__/*` (la cabecera)
- Modify: `apps/web/e2e/combate.spec.ts` (una aserción sobre la frase del hilo), `docs/05-datos.md`, `docs/08-pruebas.md`, `docs/07-historial.md`

**Interfaces:**
- Consumes: `ATTACK_RESOLVED { attackerId, attackName, verdict, rollEventId }` con `subjectId` = objetivo; `HP_CHANGED { delta, damageType, rollEventId, reason }` con `subjectId` = quien lo recibe; `useCharacters` + `useNpcs` (ya en `MesaDeSesion`/`HiloDeSesion`), filtrados por `canView` en el servidor.
- Produces:

```ts
// nombres-del-hilo.ts
export interface NombresDelHilo {
  personaje: (id: string) => string | null;        // null = no lo ves (canView no te lo mandó)
  atacanteDeLaTirada: (rollEventId: string) => string | null; // vía ATTACK_RESOLVED en la ventana
}
export function nombresDelHilo(personajes: { id: string; name: string }[], eventos: GameEventRow[]): NombresDelHilo;
```

`lineaDeLog(p: GameEventPayload, ctx?: { sujeto?: string | null; nombres?: NombresDelHilo })` — sin `ctx`, las frases de hoy (las pruebas existentes siguen en verde); con él:
- `HP_CHANGED`: `«${sujeto} pierde 7 PG (cortante)${origen ? ` ← ataque de ${origen}` : ""}`` donde `origen` = `nombres.personaje(p.sourceCharacterId)` o `nombres.atacanteDeLaTirada(p.rollEventId)`; recupera → «recupera».
- `ATTACK_RESOLVED`: `«${atacante} ataca a ${sujeto}: impacta»` — **el objetivo se nombra porque quien lee el suceso ya lo ve** (se escribió a la visibilidad del objetivo); si `nombres.personaje(attackerId)` es `null` → «Alguien ataca a…».
- `ACTIVITY_USED` (si existe con objetivos): «Elara lanza Bola de fuego sobre Klarg y Sylas» — leer su payload real antes; si no trae objetivos, se deja como hoy y se anota.
- Cabecera de `MensajeDelHilo`: **el personaje** (`personaje.name` cuando `vozDe` resolvió uno real) y la persona en la firma (`Sylas · Jorge · 21:14`); sin personaje, la persona como hoy.

- [ ] **Step 1: e2e de API que falla**

```ts
it("el DM pone daño a mano citando de quién viene, y el HP_CHANGED lo lleva", async () => {
  await api(dm).post(`/campaigns/${campaignId}/characters/${sylas}/hp`).send({ delta: -7, damageType: "SLASHING", sourceCharacterId: klarg, expectedVersion: v }).expect(200);
  const { body } = await api(dm).get(`/campaigns/${campaignId}/game-log`).expect(200);
  const hp = body.events.find((e) => e.payload.type === "HP_CHANGED");
  expect(hp.payload.sourceCharacterId).toBe(klarg);
});
it("un origen que no existe en la campaña es 404, y no se escribe nada", async () => {
  await api(dm).post(`…/hp`).send({ delta: -1, sourceCharacterId: "no-existe", expectedVersion: v }).expect(404);
});
```

(Rutas y helpers: los del fichero; leerlo primero. `expectedVersion` solo si `changeHp` lo pide.)

Run → FAIL (400: campo desconocido).

- [ ] **Step 2: Contrato** — en los dos esquemas:

```ts
  /**
   * Pulido 2026-09-12 (anexo #15). **De quién viene**, cuando el daño se pone a mano desde el
   * elenco y no cuelga de una tirada: el hilo dice «← Klarg». Opcional; con `rollEventId` el
   * origen se recupera de la tirada y este campo sobra. Es un id como `ATTACK_RESOLVED.attackerId`:
   * el nombre lo resuelve quien lee, con lo que `canView` le manda.
   */
  sourceCharacterId: z.string().min(1).optional(),
```

- [ ] **Step 3: Servicio** — en `changeHp`, si `input.sourceCharacterId`: `await this.requireVisibleCharacter(userId, campaignId, input.sourceCharacterId)` (o el helper equivalente que el fichero ya usa: **leerlo**; si no hay uno reutilizable, `findFirst({ where: { id, campaignId } })` → 404 «Ese personaje no está en la campaña»), y `...(input.sourceCharacterId ? { sourceCharacterId: input.sourceCharacterId } : {})` en el payload.

- [ ] **Step 4: Correr** — orquestador `test:e2e -- dano-con-su-traza` → PASS.

- [ ] **Step 5: Web — unitaria que falla** (`linea-de-log-sin-claves.test.ts` o uno nuevo `linea-de-log-con-nombres.test.ts`):

```ts
const nombres = nombresDelHilo([{ id: "k", name: "Klarg" }, { id: "s", name: "Sylas" }], [
  { id: "ev-atk", payload: { type: "ATTACK_RESOLVED", attackerId: "k", attackName: "Cimitarra", verdict: "HIT", rollEventId: "roll-1" }, subjectId: "s", subjectType: "character", … } as GameEventRow,
]);
it("el daño nombra a quien lo recibe y de quién viene", () => {
  expect(lineaDeLog({ type: "HP_CHANGED", delta: -7, from: 20, to: 13, damageType: "SLASHING", sourceCharacterId: "k" }, { sujeto: "Sylas", nombres }))
    .toBe("Sylas pierde 7 PG (cortante) ← Klarg");
});
it("con rollEventId, el origen sale del ataque que la tirada resolvió", () => {
  expect(lineaDeLog({ type: "HP_CHANGED", delta: -7, from: 20, to: 13, rollEventId: "roll-1" }, { sujeto: "Sylas", nombres }))
    .toBe("Sylas pierde 7 PG ← ataque de Klarg");
});
it("el ataque nombra atacante y objetivo", () => {
  expect(lineaDeLog({ type: "ATTACK_RESOLVED", attackerId: "k", attackName: "Cimitarra", verdict: "HIT", rollEventId: "roll-1" }, { sujeto: "Sylas", nombres }))
    .toBe("Klarg ataca a Sylas con Cimitarra: impacta");
});
it("sin contexto, las frases de siempre", () => {
  expect(lineaDeLog({ type: "HP_CHANGED", delta: -7, from: 20, to: 13 })).toBe("Pierde 7 PG (20 → 13)");
});
it("un atacante que no ves es «Alguien»", () => {
  expect(lineaDeLog({ type: "ATTACK_RESOLVED", attackerId: "oculto", attackName: "Garra", verdict: "MISS", rollEventId: "r" }, { sujeto: "Sylas", nombres }))
    .toBe("Alguien ataca a Sylas con Garra: falla");
});
```

- [ ] **Step 6: `nombres-del-hilo.ts` + `linea-de-log.ts`** — `atacanteDeLaTirada` recorre `eventos` buscando `ATTACK_RESOLVED` con `rollEventId === id` y devuelve `personaje(attackerId)`. En `lineaDeLog`, solo los `case` de `HP_CHANGED`, `ATTACK_RESOLVED` (y `ACTIVITY_USED` si aplica) leen `ctx`; el resto no cambia. **El `from → to` se conserva en la frase larga** («Sylas pierde 7 PG (cortante, 20 → 13) ← Klarg») si la prueba existente lo exige — leerla; la spec no lo prohíbe.

- [ ] **Step 7: `HiloDeSesion` / `MensajeDelHilo`** — `HiloDeSesion` construye `nombres` con `personajes ?? []` **más `pnjs`** (pedir `useNpcs` aquí como ya lo hace `MesaDeSesion`, o pasarlos por prop desde la mesa: preferir prop `personajesVisibles` para no duplicar la consulta) y pasa a cada mensaje `linea={lineaDeLog(e.payload, { sujeto: nombreDelSujeto(e), nombres })}`; `MensajeDelHilo` pinta en la cabecera `personaje.name ?? autor` y en la firma `autor` cuando hay personaje. Sucesos sin personaje (`subjectType !== "character"`): la persona, como hoy.

- [ ] **Step 8: `PonerDano.tsx`** — bajo el tipo de daño, un `<select>`… **no**: es una lista de personajes, no una opción con significado: un desplegable con buscador (`SelectorDeObjeto` tiene el patrón; si es demasiado, un `<select>` nativo con `<option value="">Sin decir</option>` es aceptable aquí porque son **datos**, no opciones con semántica — anotarlo). Manda `sourceCharacterId` solo si se eligió.

- [ ] **Step 9: Unitarias** → `pnpm --filter @dnd/web test -- src/features/sessions` → PASS.

- [ ] **Step 10: e2e** — `combate.spec.ts`: tras el ataque resuelto, el hilo contiene `/Klarg ataca a .*: impacta/` (o los nombres que el recorrido use) y, tras aplicar daño citando la tirada, `/pierde \d+ PG.*← ataque de/`.

- [ ] **Step 11: Mutación** — `cp linea-de-log.ts …bak`; quitar el `← ${origen}`; unitaria → FAIL; restaurar con `cp`.

- [ ] **Step 12: Documentar** — 05 (campo), 08, 07.

- [ ] **Step 13: `pnpm verify`** → exit 0. Orquestador: `exec playwright test e2e/combate.spec.ts`, `e2e/nervio-en-vivo.spec.ts` → verde.

- [ ] **Step 14: Commit**

```bash
git add packages/shared/src apps/api/src/characters apps/api/test apps/web/src/features/sessions apps/web/e2e/combate.spec.ts docs
git commit -m "feat(log): the thread names the character and the target — 'Sylas loses 7 HP ← Klarg', the person moves to the signature"
```

---

### Task 12: Salir de la mesa vuelve a la campaña (#18)

**Files:**
- Modify: `apps/web/src/features/sessions/BandaDeMesa.tsx:56-70`
- Modify: `apps/web/src/features/sessions/__tests__/sesion-en-juego.test.tsx` (o donde se monte `BandaDeMesa`)
- Modify: `apps/web/e2e/sesion.spec.ts` (un `test`)
- Modify: `docs/07-historial.md`

**Interfaces:**
- Consumes: `?seccion=sessions` (`CampaignDetailPage.tsx:624-640` lo resuelve a la pestaña Sesiones; `MesaDeSesion.tsx:412` ya enlaza así).
- Produces: nada.

- [ ] **Step 1: Unitaria que falla**

```tsx
it("la primera miga de la mesa vuelve a la campaña, pestaña Sesiones; «Tus crónicas» va después (anexo #18)", () => {
  render(<BandaDeMesa campaignId="c1" nombreDeCampana="La mesa" sesion={null} esDm comoUsuario="" onComoUsuario={() => {}} />, { wrapper });
  const enlaces = screen.getAllByRole("link");
  expect(enlaces[0]).toHaveAttribute("href", "/campaigns/c1?seccion=sessions");
  expect(enlaces[0]).toHaveTextContent("La mesa");
  expect(screen.getByRole("link", { name: "Tus crónicas" })).toHaveAttribute("href", "/");
});
```

Run → FAIL (el primer enlace es «Tus crónicas»).

- [ ] **Step 2: `BandaDeMesa.tsx`** — la flecha va con la campaña, y «Tus crónicas» pasa detrás como miga secundaria:

```tsx
      <Link to={`/campaigns/${campaignId}?seccion=sessions`} className="inline-flex min-w-0 items-center gap-s1 font-title text-chrome-md text-text transition-colors hover:text-accent-text">
        <IconoFlechaIzquierda className="h-4 w-4 shrink-0 text-muted" />
        <span className="truncate">{nombreDeCampana ?? "Campaña"}</span>
      </Link>
      <span aria-hidden="true" className="h-4 w-px bg-muted/40" />
      <Link to="/" className="font-chrome text-chrome-sm text-muted transition-colors hover:text-text">Tus crónicas</Link>
```

- [ ] **Step 3: Unitaria** → PASS. Buscar en `apps/web/e2e` recorridos que pulsaban «Tus crónicas» desde la mesa esperando llegar a `/` — siguen valiendo (el enlace existe).

- [ ] **Step 4: e2e** (`sesion.spec.ts`): «desde una mesa en reposo, el primer enlace de la banda lleva a la campaña con la pestaña Sesiones seleccionada» (`expect(page.getByRole("tab", { name: "Sesiones" })).toHaveAttribute("aria-selected", "true")`).

- [ ] **Step 5: Mutación** — `cp BandaDeMesa.tsx …bak`; volver a poner `to="/"` en el primero; unitaria → FAIL; restaurar con `cp`.

- [ ] **Step 6: Documentar** — 07.

- [ ] **Step 7: `pnpm verify`** → exit 0. Orquestador: `exec playwright test e2e/sesion.spec.ts`, `e2e/mesa-mide.spec.ts` → verde.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/sessions/BandaDeMesa.tsx apps/web/src/features/sessions/__tests__ apps/web/e2e/sesion.spec.ts docs/07-historial.md
git commit -m "fix(table): leaving the table returns to the campaign's Sessions tab, not to all campaigns"
```

---

### Task 13: PG temporales del bestiario — la pregunta solo tras pulsar, y «dejar los que tenía» no manda nada (#20)

**Files:**
- Modify: `apps/web/src/features/bestiario/DarTemporales.tsx:41-134`
- Modify: `apps/web/src/features/bestiario/__tests__/DarTemporales.test.tsx`
- Modify: `apps/web/e2e/bestiario.spec.ts` (un `test` que reproduce)
- Modify: `docs/07-historial.md`

**Interfaces:**
- Consumes: `useSetHp` con `tempHpEleccion: "mayor" | "los-nuevos"` (`character-sheet.schema.ts:97`; el servidor con `"mayor"` toma `Math.max`).
- Produces: nada.

**Lo medido (por qué «parecen no hacer nada» y «el aviso sale siempre»):** `hayConflicto = actuales > 0 && nuevos > 0` con `cuantos` inicial `"5"` → en cuanto el PNJ tiene temporales, el `alertdialog` está **siempre** puesto y «Dárselos» desaparece; y «Dejar los N que tenía» manda `tempHpEleccion: "mayor"`, que **toma el mayor de los dos** — si los nuevos son más, cambia lo que el usuario pidió conservar. SRD 5.1, *Temporary Hit Points*: *«you decide whether to keep the ones you have or to gain the new ones»* — conservar es **no cambiar nada**.

- [ ] **Step 1: Reproducir con la unitaria que falla**

```tsx
it("con temporales previos, la pregunta NO sale sola: sale al pulsar «Dárselos» (anexo #20)", async () => {
  mockHoja({ hp: { current: 10, max: 10, temp: 5 }, character: { version: 1 } });
  render(<DarTemporales campaignId="c" characterId="p" nombre="Klarg" />);
  expect(screen.queryByRole("alertdialog")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Dárselos" }));
  expect(screen.getByRole("alertdialog", { name: "Ya tiene PG temporales" })).toBeVisible();
});
it("«Dejar los que tenía» no manda nada y cierra la pregunta", async () => {
  mockHoja({ hp: { current: 10, max: 10, temp: 5 }, character: { version: 1 } });
  render(<DarTemporales … />);
  await userEvent.click(screen.getByRole("button", { name: "Dárselos" }));
  await userEvent.click(screen.getByRole("button", { name: "Dejar los 5 que tenía" }));
  expect(fijar.mutate).not.toHaveBeenCalled();
  expect(screen.queryByRole("alertdialog")).toBeNull();
});
it("«Quedarse con los nuevos» manda los-nuevos y, al responder, cierra la pregunta", async () => {
  …click «Dárselos» → click «Quedarse con los 5 nuevos» → expect(fijar.mutate).toHaveBeenCalledWith(expect.objectContaining({ tempHp: 5, tempHpEleccion: "los-nuevos" }), expect.anything()); resolver onSuccess → alertdialog null.
});
```

(Usar los mocks que `DarTemporales.test.tsx` ya tiene para `useCharacterSheet`/`useSetHp`.)

Run → FAIL (el `alertdialog` está desde el principio).

- [ ] **Step 2: Arreglo**

```tsx
  const [preguntando, setPreguntando] = useState(false);
  const hayPrevios = actuales > 0;
  const mandar = (eleccion: "mayor" | "los-nuevos") => {
    if (version === undefined) return;
    setError(null);
    fijar.mutate(
      { tempHp: nuevos, tempHpEleccion: eleccion, expectedVersion: version, reason: `Temporales para ${nombre}` },
      { onSuccess: () => setPreguntando(false), onError: (e) => setError((e as Error).message) },
    );
  };
  const alPulsarDarselos = () => (hayPrevios ? setPreguntando(true) : mandar("los-nuevos"));
```

El botón «Dárselos» se pinta siempre (con su candado de `version`/`nuevos`), llama a `alPulsarDarselos`; el `alertdialog` se pinta si `preguntando`; «Quedarse con los N nuevos» → `mandar("los-nuevos")`; «Dejar los N que tenía» → `setPreguntando(false)` **sin petición** (conservar es no cambiar; el comentario lo dice con la cita del SRD). Se quita `hayConflicto`.

- [ ] **Step 3: Unitaria** → PASS.

- [ ] **Step 4: e2e** (`bestiario.spec.ts`): «un PNJ con 5 temporales: pulsar Dárselos con 3 abre la pregunta; “Dejar los 5 que tenía” la cierra y la cabecera sigue en 5; “Quedarse con los 3 nuevos” deja 3».

- [ ] **Step 5: Mutación** — `cp DarTemporales.tsx …bak`; hacer que «Dejar los que tenía» llame a `mandar("mayor")`; unitaria «no manda nada» → FAIL; restaurar con `cp`.

- [ ] **Step 6: Documentar** — 07 (con la cita del SRD).

- [ ] **Step 7: `pnpm verify`** → exit 0. Orquestador: `exec playwright test e2e/bestiario.spec.ts` → verde.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/bestiario apps/web/e2e/bestiario.spec.ts docs/07-historial.md
git commit -m "fix(bestiary): temp HP question only after pressing, and keeping the old ones sends nothing

SRD 5.1, Temporary Hit Points: 'you decide whether to keep the ones you have or to gain the new ones' — keeping is not changing anything, so 'mayor' (Math.max on the server) was the wrong choice when the new ones were higher."
```

---

### Task 14: Filtros del catálogo de objetos (#21)

**Files:**
- Modify: `apps/web/src/features/campaign-items/CampaignItemsCatalogPage.tsx:24-34,96-130`
- Modify: `apps/web/src/features/campaign-items/__tests__/CampaignItemsCatalogPage.test.tsx` (o el que exista)
- Modify: `apps/web/e2e/inventario.spec.ts` o el que cubra el catálogo (`grep -l "Catálogo de objetos" apps/web/e2e`)
- Modify: `docs/07-historial.md`

**Interfaces:**
- Consumes: `FilterChip`, `Toolbar` (`ui/Collection.tsx`, como `PanelDeBestiario.tsx:340-345`); `TIPOS_DE_OBJETO`, `NOMBRE_TIPO` (`campaign-items/vocabulario.ts:30,58`); `esDelSrd(id)`.
- Produces: nada.

- [ ] **Step 1: Unitaria que falla**

```tsx
it("filtra por tipo y por origen con chips, como el bestiario (anexo #21)", async () => {
  mockCatalogo({ propios: [{ id: "c1", name: "Daga de la casa", kind: "WEAPON" }], srd: [{ id: "SRD:cota", name: "Cota de mallas", kind: "ARMOR" }, { id: "SRD:daga", name: "Daga", kind: "WEAPON" }] });
  render(<CampaignItemsCatalogPage campaignId="c" />, { wrapper });
  expect(await screen.findAllByRole("button", { name: /^(Daga|Cota)/ })).toHaveLength(3);
  await userEvent.click(screen.getByRole("button", { name: "Arma", pressed: false }));
  expect(screen.getAllByRole("button", { name: /^(Daga|Cota)/ })).toHaveLength(2);
  await userEvent.click(screen.getByRole("button", { name: "De la campaña", pressed: false }));
  expect(screen.getAllByRole("button", { name: /^Daga/ })).toHaveLength(1);
  expect(screen.getByText("Daga de la casa")).toBeInTheDocument();
});
```

(Los nombres de fila: `FilaDeObjeto` pinta un botón con el nombre; leerlo para el `name` exacto.)

Run → FAIL.

- [ ] **Step 2: Estado y filtro** (cliente, nunca control de acceso: la lista ya viene filtrada por `canView`):

```tsx
  const [tipo, setTipo] = useState<ItemKind | "todos">("todos");
  const [origen, setOrigen] = useState<"todos" | "SRD" | "CAMPAIGN">("todos");
  const filas = todas.filter((i) =>
    (busqueda.trim() === "" || i.name.toLowerCase().includes(busqueda.trim().toLowerCase())) &&
    (tipo === "todos" || i.kind === tipo) &&
    (origen === "todos" || (origen === "SRD") === esDelSrd(i.id)),
  );
```

y bajo el buscador:

```tsx
      <Toolbar>
        <FilterChip active={tipo === "todos"} onClick={() => setTipo("todos")}>Todos</FilterChip>
        {TIPOS_DE_OBJETO.map((k) => (
          <FilterChip key={k} active={tipo === k} onClick={() => setTipo(k)} icon={iconoDeTipo(k)}>{NOMBRE_TIPO[k]}</FilterChip>
        ))}
      </Toolbar>
      <Toolbar>
        <FilterChip active={origen === "todos"} onClick={() => setOrigen("todos")}>De todas partes</FilterChip>
        <FilterChip active={origen === "SRD"} onClick={() => setOrigen("SRD")}>Del catálogo</FilterChip>
        <FilterChip active={origen === "CAMPAIGN"} onClick={() => setOrigen("CAMPAIGN")}>De la campaña</FilterChip>
      </Toolbar>
```

(`iconoDeTipo` de `campaign-items/iconos.tsx` si existe; si no, sin icono — no se inventan.) El `EmptyState` de «ningún objeto se llama así» pasa a decir también «con esos filtros».

- [ ] **Step 3: Unitaria** → PASS.

- [ ] **Step 4: e2e**: en el recorrido del catálogo, pulsar «Armadura» y afirmar que «Daga» ya no está y «Cota de mallas» sí.

- [ ] **Step 5: Mutación** — `cp CampaignItemsCatalogPage.tsx …bak`; ignorar `tipo` en el filtro; unitaria → FAIL; restaurar con `cp`.

- [ ] **Step 6: Documentar** — 07.

- [ ] **Step 7: `pnpm verify`** → exit 0. Orquestador: el e2e del catálogo → verde.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/campaign-items apps/web/e2e docs/07-historial.md
git commit -m "feat(catalog): filter chips by item kind and by origin, like the bestiary"
```

---

### Task 14 bis: El mundo como árbol con detalle — sustituye al tablero telaraña (#23)

> **Añadida el 2026-09-12 durante la ejecución**, por decisión del autor tras ver cuatro maquetas
> (transmitida por la otra sesión y confirmada por el autor en esta): el mapa de historia **se
> aplaza**; el #23 se cierra ahora con el mundo como **desglose + detalle**. Maqueta aprobada (opción
> A para el árbol, C para el detalle): `https://claude.ai/code/artifact/6036f524-4f93-4a86-95fe-a417bf9e7fe1`.
> **Es la única baja de pruebas de la tanda, y está declarada por D4** (2026-09-02: «el tablero
> telaraña se retira»): `TableroTelarana.test.tsx` y `posiciones.test.ts` salen **en el mismo commit**
> que las sustituye, con D4 citada en el mensaje.

**Files:**
- Delete: `apps/web/src/features/sessions/taller/TableroTelarana.tsx`, `posiciones.ts`, `__tests__/TableroTelarana.test.tsx`, `__tests__/posiciones.test.ts`
- Create: `apps/web/src/features/sessions/taller/mundo/arbolDelMundo.ts` (función pura), `ArbolDelMundo.tsx` (desglose), `DetalleDeFicha.tsx` (cabecera · vitela · anillo · hilos), `AnilloDeVecinos.tsx` (SVG propio), `EditorDeHilos.tsx` (lista + dos desplegables con buscador), `ElMundo.tsx` (las dos mitades), `__tests__/arbolDelMundo.test.ts`, `__tests__/DetalleDeFicha.test.tsx`, `__tests__/ElMundo.test.tsx`
- Modify: `apps/web/src/features/links/relaciones.ts` (constante única `ROTULOS_DE_JERARQUIA`), `apps/web/src/features/sessions/taller/TallerDelDM.tsx:80-100` (monta `ElMundo` donde iba el tablero; la selección sigue alimentando `setElegida` para que «Escribir ficha» de la derecha siga funcionando)
- Create: `apps/web/e2e/mundo-arbol.spec.ts`; Modify: `apps/web/e2e/tokens-contrast.spec.ts` (la pantalla en los tres temas)
- Modify: `docs/01-arquitectura.md` (taller), `docs/04-convenciones.md` (regla nueva: «un árbol enseña un padre; los demás hilos van en la ficha»), `docs/06-pendientes.md` (#23 cerrado; mapa de historia aplazado por el autor), `docs/decisiones.md` (fila nueva D-CF-64: «El mundo se muestra como árbol + detalle; la telaraña se retira (D4); el mapa de historia queda aplazado»), `docs/08-pruebas.md` (suite nueva; las dos suites retiradas, con D4), `docs/07-historial.md`

**Interfaces:**
- Consumes: `useAllEntities(campaignId)` (`entities/hooks.ts:42`), `useCampaignLinks(campaignId)` → `CampaignLinkRow[]` (`links/hooks.ts:25`, `GET /campaigns/:id/links`, filtrado por `canView` en los dos extremos), `useCreateLink`/`useDeleteLink` (`links/hooks.ts:32,45`), `RELACIONES` (`links/relaciones.ts`), `ETIQUETA_DE_TIPO` (`entities/resumen.ts:31`), los iconos por tipo de `entities/iconos.tsx`, `Panel tone="vellum"`, `Badge` de visibilidad, `Markdown` (`entities/Markdown.tsx`), el patrón de desplegable con buscador de `inventory/SelectorDeObjeto.tsx`, `EmptyState`, `Tabs` (teclado).
- Produces:

```ts
// links/relaciones.ts — la lista ÚNICA de rótulos que cuelgan una ficha de su padre en el árbol.
// Todo lo demás es lateral y no mueve nada.
export const ROTULOS_DE_JERARQUIA: readonly string[] = [
  "vive en", "se encuentra en", "forma parte de", "ocurrió en", "pertenece a", "custodia",
] as const; // el implementador cruza esta lista con RELACIONES: solo rótulos `desde` existentes; anota los que añada

// taller/mundo/arbolDelMundo.ts
export interface NodoDelMundo {
  id: string; name: string; type: EntityType;
  rotulo: string | null;          // el hilo por el que cuelga de su padre; null bajo la raíz de tipo
  tambienEn: string[];            // nombres de los OTROS padres (aparece en cada uno, marcado «también en …»)
  hijos: NodoDelMundo[];
  cicloCortado?: boolean;         // A parte de B parte de A: se corta aquí y se marca
}
export interface RaizDeTipo { type: EntityType; etiqueta: string; total: number; hijos: NodoDelMundo[] }
export interface ArbolDelMundo { raices: RaizDeTipo[]; sinHilos: { id: string; name: string; type: EntityType }[] }
export function arbolDelMundo(entidades: Entity[], hilos: CampaignLinkRow[]): ArbolDelMundo;
export function vecinosDe(id: string, entidades: Entity[], hilos: CampaignLinkRow[]): { id: string; name: string; type: EntityType; rotulo: string; direccion: "sale" | "entra" }[];
```

`ElMundo({ campaignId, seleccionId, onSeleccion })`: `grid gap-s4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]`; en estrecho el detalle **debajo**. Izquierda `ArbolDelMundo` (`<ul role="tree">` con `<li role="treeitem" aria-expanded aria-selected>`, raíces por tipo con contador, hijo con su rótulo en gris a la derecha, «también en …» cuando `tambienEn.length > 0`, buscador arriba que filtra y despliega solo lo que encaja, chip «Sin hilos»; flechas ↑↓ mueven, → despliega, ← pliega, Enter selecciona — el patrón de teclado de `ui/Tabs`). Derecha `DetalleDeFicha`: cabecera (icono · nombre · tipo legible · `Badge` de visibilidad · botón «Abrir ficha» que enlaza a `/campaigns/:id/entidades/:eid`), cuerpo en vitela recortado a ~6 líneas con «Leer más» (enlaza a la ficha), `AnilloDeVecinos` (SVG propio: la ficha en el centro, vecinos en círculo a posiciones fijas `2π·i/n`, rótulo sobre cada radio, cada vecino un `<button>` que llama a `onSeleccion` y el árbol lo revela; con 0 hilos, `EmptyState` «Esta ficha no tiene hilos todavía»), `EditorDeHilos` (fila «ficha · rótulo · ✎ ✕» con iconos dibujados; añadir con dos desplegables con buscador — hacia qué ficha, rótulo entre `relacionesSugeridas` + libre — y botón «Añadir hilo»; **la autorización la impone el servidor** (`links` exige DM o creador): la pantalla solo pinta y muestra el rechazo en línea). Vacío: «Elige una ficha del desglose» + contadores por tipo.

- [ ] **Step 1: Unitarias que fallan** (`arbolDelMundo.test.ts`):

```ts
const lugar = ent("l1", "Torre Gris", "LOCATION"), pnj = ent("n1", "Corvin", "NPC"), faccion = ent("f1", "Gremio", "FACTION"), suelto = ent("n2", "Errante", "NPC");
it("agrupa por tipo con contador y cuelga por rótulo de jerarquía", () => {
  const a = arbolDelMundo([lugar, pnj, faccion, suelto], [hilo("n1", "l1", "vive en")]);
  const lugares = a.raices.find((r) => r.type === "LOCATION")!;
  expect(lugares.total).toBe(1);
  expect(lugares.hijos[0].hijos.map((h) => [h.name, h.rotulo])).toEqual([["Corvin", "vive en"]]);
  const pnjs = a.raices.find((r) => r.type === "NPC")!;
  expect(pnjs.hijos.map((h) => h.name)).toEqual(["Errante"]);   // sin padre: bajo su tipo
});
it("un hilo lateral no mueve nada", () => {
  const a = arbolDelMundo([pnj, faccion], [hilo("n1", "f1", "es aliado de")]);
  expect(a.raices.find((r) => r.type === "NPC")!.hijos[0].name).toBe("Corvin");
});
it("dos padres: aparece en los dos, marcada «también en»", () => {
  const a = arbolDelMundo([lugar, faccion, pnj], [hilo("n1", "l1", "vive en"), hilo("n1", "f1", "pertenece a")]);
  const bajoLugar = a.raices.find((r) => r.type === "LOCATION")!.hijos[0].hijos[0];
  const bajoFaccion = a.raices.find((r) => r.type === "FACTION")!.hijos[0].hijos[0];
  expect(bajoLugar.tambienEn).toEqual(["Gremio"]);
  expect(bajoFaccion.tambienEn).toEqual(["Torre Gris"]);
});
it("un ciclo se corta y se marca", () => {
  const a = ent("a", "A", "LOCATION"), b = ent("b", "B", "LOCATION");
  const arbol = arbolDelMundo([a, b], [hilo("a", "b", "forma parte de"), hilo("b", "a", "forma parte de")]);
  const texto = JSON.stringify(arbol);
  expect(texto).toContain('"cicloCortado":true');
  expect(texto.length).toBeLessThan(5000);                      // termina
});
it("sinHilos lista las fichas sin ningún hilo", () => {
  expect(arbolDelMundo([lugar, suelto], [hilo("n2x", "l1", "vive en")]).sinHilos.map((s) => s.name)).toEqual(["Errante"]);
});
```

- [ ] **Step 2: Run → FAIL** (módulo inexistente). **Step 3:** implementar `arbolDelMundo.ts` (BFS desde las raíces; visitados por camino para el ciclo). **Step 4:** unitarias en verde.
- [ ] **Step 5: RTL del detalle** (`DetalleDeFicha.test.tsx`): anillo con N vecinos pinta N `button` con el nombre y el rótulo; hilos listados sin enums (`ETIQUETA_DE_TIPO`); «Añadir hilo» abre los dos desplegables y llama a `useCreateLink` con `{ toId, label }`; vacío → «Elige una ficha del desglose». `ElMundo.test.tsx`: seleccionar en el árbol pinta el detalle; el chip «Sin hilos» filtra.
- [ ] **Step 6: Montar en `TallerDelDM`** y **borrar** el tablero, `posiciones.ts` y sus dos pruebas (D4 en el mensaje del commit). Ningún otro fichero importa `TableroTelarana` (grep).
- [ ] **Step 7: e2e `mundo-arbol.spec.ts`** (lo corre el orquestador): DM crea un lugar y un PNJ; en el taller, selecciona el PNJ, «Añadir hilo» → ficha «Torre Gris», rótulo «vive en» → el PNJ aparece bajo el lugar en el árbol; recarga y persiste; a 390 px el detalle va debajo y `document.documentElement.scrollWidth <= 390`. `tokens-contrast.spec.ts`: el árbol y el detalle en los tres temas.
- [ ] **Step 8: Mutación** — `cp arbolDelMundo.ts …bak`; quitar la comprobación de `ROTULOS_DE_JERARQUIA` (todo rótulo cuelga); «un hilo lateral no mueve nada» → FAIL; restaurar con `cp`.
- [ ] **Step 9: Documentar** — 01, 04 (regla), 06 (#23 cerrado; mapa aplazado), decisiones (D-CF-64), 08 (suite nueva y las dos retiradas con D4), 07.
- [ ] **Step 10: `pnpm verify`** → exit 0. Orquestador: `exec playwright test e2e/mundo-arbol.spec.ts`, `e2e/tokens-contrast.spec.ts`, `e2e/mesa-mide.spec.ts` (el taller sigue midiendo) → verde.
- [ ] **Step 11: Commit**

```bash
git add apps/web/src/features/sessions/taller apps/web/src/features/links/relaciones.ts apps/web/e2e docs
git commit -m "feat(world): the world as a tree with detail — replaces the cobweb board (D4); story map deferred by the author"
```

---

### Task 15: Cierre de la tanda — estado, pendientes, historial, ledger y observabilidad

**Files:**
- Modify: `docs/00-INDEX.md` (bloque generado: `pnpm update:estado`; y la prosa que diga «lo que queda es jugar» pasa a nombrar las tres tandas que siguen), `docs/06-pendientes.md` (fichas del anexo cerradas → `docs/_archivo/pendientes-cerrados-2026-09-12.md` si el 06 las tenía; #13 con su referencia; lo que quedó fuera, con motivo), `docs/07-historial.md` (entrada de hito «Pulido antes del paso 3», con la lista de commits y cómo revertir cada causa), `docs/08-pruebas.md` (conteos de e2e), `docs/como-seguir.md` (§ 0: la tanda cerrada; siguiente = reglas de la mesa, con su plan y el OK del autor), `docs/decisiones.md` (las que esta ejecución obligó a tomar, `E-*`)
- Modify: `.superpowers/sdd/2026-09-12-pulido-antes-del-paso-3/progress.md` (tabla de observabilidad), `.superpowers/sdd/progress.md` (una línea)

- [ ] **Step 1: `pnpm update:estado`** y comprobar que el bloque cambia solo en el commit/rama/conteos.

- [ ] **Step 2: Pasar los 24 puntos del anexo** uno a uno: cerrado (tarea y commit) · en otra spec (#5, #19 → reglas de la mesa; #24 → mapa; #23 → mapa) · aplazado (#13) · «si tras C1 el autor sigue viendo la hoja como tablas» (#2: se deja escrito en 06 como decisión que **mide el autor** en producción). Ninguno sin fila.

- [ ] **Step 3: Tabla de observabilidad** en el ledger del plan (04-convenciones § *Observabilidad de la tanda*): una fila por tarea con vueltas hasta cerrar, qué encontró la revisión, tiempo perdido y en qué.

- [ ] **Step 4: Comprobar lo prohibido** — `git log --format='%an %s' <base>..HEAD` (todos del orquestador), `git status` limpio, ningún fichero fuera de las fronteras de cada encargo (`git diff --name-only <base>..HEAD` contra el mapa de ficheros de arriba), `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*worktrees*' -or $_.CommandLine -like '*dev:api*' }` vacío, y **ninguna imagen desplegada** (`ssh vps1new "docker ps --format '{{.Names}} {{.Image}}' | grep dnd"` sigue en `6d2b2ca`).

- [ ] **Step 5: `pnpm verify`** → exit 0 (check:docs, check:estado, check:historial incluidos).

- [ ] **Step 6: Commit y parar**

```bash
git add docs .superpowers/sdd/progress.md
git commit -m "docs: close the polish batch — state, open items, history and the observability table"
```

**Y aquí se para.** Reglas de la mesa, puerta de efectos y mapa de historia van después, cada una con su plan y el OK del autor; el paso 3 no se arranca. Se avisa al autor con: la tabla de observabilidad, la lista de los 24 puntos con su estado, y los ficheros de Playwright corridos con su resultado.

---

## Auto-revisión del plan (hecha al escribirlo)

**Cobertura de la spec:** Tarea 0 → Task 0. C1 (#3, #4, #6, #7, #8, #9, #16, #17, parte de #2) → Tasks 1–4. C1 bis → Tasks 5–6. C3 (#12, #22) → Task 7. C2 (#1, #14 en su parte de menú) → Task 8. C5 (#10, #11, #14) → Tasks 9–10. C4 (#15) → Task 11. Sueltos #18 → 12, #20 → 13, #21 → 14; #23 «mientras, nada» y #2 «si tras C1…» → Task 15 los deja escritos. §5 pruebas: RTL por componente nuevo (`Casilla`, `MenuDeAcciones`, `IconoDado`, `BandejaDeDados`, `nombres-del-hilo`), `espacios.spec.ts` (Task 4), `tokens-contrast` sobre bandeja y menú (Tasks 8, 10), `teclado.spec` por el menú (Task 8), un e2e por bug suelto (12, 13). **Desviaciones declaradas:** (a) la spec dice «audiencia y CD en un desplegable» — se cumple con un `<details>` plegable, no con un `<select>`, por la regla vinculante de radios con frase; (b) `dice[]` es un campo nuevo del servidor que la spec no nombra («el desglose ya viene del servidor» era cierto para los valores, no para las caras): añadirlo es más barato y más honesto que volver a analizar la expresión en el cliente, que el proyecto prohíbe; (c) `sourceCharacterId` en `HP_CHANGED` sigue el precedente de `attackerId`.

**Placeholders:** ninguna «TBD»; los sitios donde el implementador tiene que **leer** un fichero antes de escribir están marcados («leerlo primero») con la ruta y las líneas.

**Consistencia de nombres:** `Casilla` (T1) la consume T1 `Cabecera`/`Traza`; `TarjetaDeHoja.pie` (T1) lo consume T3; `Field.reservaEspacio` (T2) lo consumen T5 y T10; `IconoDado`/`IconoMenu` (T7) los consumen T8 y T10; `dice[]` (T9) lo consume T10 `dadosDeLaTirada`; `boardRoomUrl` (T5) lo consume T6; `MenuDeAcciones`/`AccionDeMenu` (T8) lo consumen `MandosDeCombatiente` y `useAccionesDeBando`; `lineaDeLog(p, ctx?)` (T11) conserva la firma de un argumento para todas las pruebas existentes.
