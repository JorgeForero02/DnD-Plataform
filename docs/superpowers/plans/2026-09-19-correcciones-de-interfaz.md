# Correcciones de interfaz tras la auditoría del 2026-09-19 — plan

> **Para agentes:** SUB-SKILL OBLIGATORIA: `superpowers:subagent-driven-development` o
> `superpowers:executing-plans`, tarea a tarea. Los pasos llevan casillas (`- [ ]`).
> **Un implementador por árbol** (E-IB-30). **Rigor según riesgo** (decisión del autor,
> 2026-09-11): esto son textos, rótulos y maquetación; **prueba nueva solo donde cambia
> comportamiento**, un `pnpm verify` por tarea, y **si se toca una pantalla se abre el navegador**
> (`pnpm --filter @dnd/web exec playwright test <fichero>`). **Renombrar un rótulo barre los e2e**:
> antes de cambiar un texto, `grep -rn "<texto viejo>" apps/web/e2e apps/web/src` y se arreglan
> juntos.

**Objetivo:** cerrar los hallazgos de la auditoría de interfaz del 2026-09-19
([archivada](../../_archivo/auditoria-interfaz-2026-09-19.md)) que **no piden funcionalidad
nueva ni reabren una decisión**: textos que mienten o se repiten, rótulos en primera persona,
cabeceras dobles dentro de cajones, contraste de bordes, foco, y cuatro pequeños reordenes.

**Arquitectura:** solo `apps/web`. Ningún esquema, ninguna migración, ningún endpoint nuevo. Los
textos siguen la regla de casa: la forma legible se escribe **una vez** en el vocabulario del
dominio (`apps/web/src/dominio/`, `features/*/vocabulario.ts`) y las pantallas la importan.

**Stack:** React 18 + Tailwind (tokens en `apps/web/src/ui/tokens.css`), Vitest + RTL, Playwright.

**Spec:** la auditoría archivada. El cruce con las decisiones —qué choca y qué no— está en
`06-pendientes.md` § «Dejado por la auditoría de interfaz (2026-09-19)». **Lo que ahí figura como
«choca» o «3B» NO entra en este plan.**

## Restricciones globales

- **Ningún valor de enumeración llega a la pantalla** (`CLAUDE.md`).
- **Se deshabilita, nunca se esconde, con su motivo** (D-CF-66, E-PL-7, D-CF-121): un botón que no
  aplica va `aria-disabled` + `aria-describedby`, y el `onClick` sale antes (E-14-4).
- **El botón de guardar/enviar nunca se deshabilita** (`04-convenciones.md` § formularios, E-PL-8):
  pulsar sin nada que enviar escribe el error en línea.
- **Iconos dibujados, nunca glifos** (`Iconos.test.tsx` caza `×`, `↗`, `✓`…). «Goblins ×3» se
  escribe «Goblins (3)».
- **Números en es-ES con espacio fino de miles y coma decimal** («1 250», «3,5 kg»). **No usar
  `Intl.NumberFormat`/`ListFormat` ni `toLocaleString("es-ES")`**: el Node del proyecto trae
  small-ICU y devuelve en-US (`character-sheet/vocabulario.ts:875`). Se agrupa/une a mano.
- **Texto neutro en todo componente que sirven dos roles**: nunca «tú», «yo», «me» en algo que el
  DM y el jugador ven igual.
- **Un cajón (`Dialog`) tiene exactamente un `h2`: el suyo.**
- La mesa se ve como el prototipo del autor (D-CF-149): **no** se cambian tamaños de cuadrados
  (1,6 rem), ni la base de 14 px (D-POD-9), ni la disposición de columnas (D-CF-156).

---

## Bloque A — textos que mienten o se repiten

### Task 1: las cinco frases del combate

**Files:**
- Modify: `apps/web/src/features/encounters/TiraDeIniciativa.tsx:338-339` (plural), `:585-590` (lista «y»), `:640-660` (contador)
- Modify: `apps/web/src/features/sessions/elenco/ColumnaElenco.tsx:99-104` («Su turno» en preparación)
- Modify: `apps/web/src/features/roll-requests/TiradasPendientes.tsx:249-257` (tres números)
- Test: `apps/web/src/features/encounters/__tests__/TiraDeIniciativa.test.tsx` (ya existe; añadir los casos)

- [ ] **5.1 · plural.** Sustituir en `:338-339`:

```tsx
El orden de turnos desaparece de la mesa. El encuentro no se borra: queda con{" "}
{encuentro.round === 1 ? "su asalto" : `sus ${encuentro.round} asaltos`} y su rastro en el registro.
```

- [ ] **3.1 · lista con «y».** Crear `apps/web/src/dominio/listas.ts`:

```ts
/** «A», «A y B», «A, B y C». Sin `Intl.ListFormat`: small-ICU (ver character-sheet/vocabulario.ts). */
export function enumerar(partes: readonly string[]): string {
  if (partes.length <= 1) return partes[0] ?? "";
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}
```

  y en `TiraDeIniciativa.tsx:585-590` cambiar `.join(" y ")` por `enumerar(...)`. Misma función
  para `dm-tables/vocabulario.ts:93` y `EconomiaDeAccion.tsx` (`fraseDeExceso` ya lo hace a mano:
  sustituir por `enumerar`). Unitaria: tres casos (0, 1, 3 elementos) en `dominio/__tests__/listas.test.ts`.

- [ ] **3.5 · el contador también al jugador.** En `:640` quitar `esDm &&` de `contadorListo`; el
  texto «N de M» se pinta a los dos (la lista de nombres «Esperando a…» sigue siendo solo del DM).

- [ ] **3.6 · «Su turno» solo con el combate activo.** En `ColumnaElenco.tsx:99-104`:

```ts
const deQuienEsElTurno = new Set(
  encuentro && encuentro.status === "ACTIVE" && encuentro.activePosition !== null
    ? encuentro.combatants.filter((c) => c.position === encuentro.activePosition).map((c) => c.characterId)
    : [],
);
```

- [ ] **3.4 · un solo número.** En `TiradasPendientes.tsx:252-254` borrar el `<p className="text-center font-data text-chrome-xl …">{r.resultado.total}</p>`: `ResultadoDeTirada` ya pinta el total y el desglose.
- [ ] Unitarias: en `TiraDeIniciativa.test.tsx` un caso «con `round: 1` el diálogo dice «su asalto»» y otro «un jugador en la sala de espera ve «2 de 5»». `pnpm --filter @dnd/web test -- TiraDeIniciativa`.
- [ ] `grep -rn "sus 1 asalto\|Esperando a" apps/web/e2e` → ajustar lo que haya. `pnpm verify`. Commit: `fix(web): combat strip copy — plural, list join, counter for players, turn marker only when active`.

### Task 2: un solo nombre para la experiencia y las criaturas (5.3, 16.3, 5.2/16.2)

**Files:**
- Modify: `apps/web/src/features/sessions/dm/HerramientasDeNarracion.tsx` («Dar XP» → «Dar PX»; título del cajón «Dar experiencia» → «Dar PX»)
- Modify: `apps/web/src/features/sessions/dm/DarXp.tsx:240-250` (nota única), `:94` («Dados N PX»)
- Modify: `apps/web/src/features/encounters/CapaDeCombate.tsx:46` («Repartir la experiencia» → «Repartir los PX»)
- Grep: `grep -rn "statblock" apps/web/src --include=*.tsx | grep -v "//"` → toda cadena de pantalla dice «criatura del bestiario»

- [ ] Cambiar los tres rótulos. La hoja ya dice «PX» (`character-sheet/vocabulario.ts:902`), así que **PX es el nombre**.
- [ ] En `DarXp.tsx`, los PNJ de statblock **siguen listados y apagados** (nunca se esconde). La frase pasa de una por fila a **una nota al pie** de la lista: «Las criaturas del bestiario no acumulan PX.», y cada casilla apagada la referencia por `aria-describedby={idNota}`.
- [ ] `grep -rn "Dar XP\|Dar experiencia\|statblock no" apps/web/e2e apps/web/src` → arreglar pruebas. `pnpm verify`. Commit: `fix(web): one name for experience (PX) and bestiary creatures`.

### Task 3: primera persona fuera de los componentes compartidos (6.2, 10.1, 10.2, 2.5)

**Files:**
- Modify: `apps/web/src/features/character-sheet/PuntosDeGolpe.tsx:222,230`
- Modify: `apps/web/src/features/rolls/vocabulario.ts:109-130` (`AUDIENCIAS_DE_TIRADA`)
- Modify: `apps/web/src/features/rolls/TiradaACiegas.tsx:22`
- Modify: `apps/web/src/features/sessions/hilo/HiloDeSesion.tsx:573`

- [ ] «Recibo daño» → «Aplicar daño»; «Me curo» → «Curar». La hoja se abre como «Su hoja» desde el elenco (D-CF-46): el DM la ve.
- [ ] Audiencias, frases neutras (el resumen corto no cambia):
  - Pública: «La ve toda la mesa.»
  - Privada del DM: «Solo quien tira y el DM.»
  - A ciegas: «Solo el DM ve el resultado.»
  `TiradaACiegas.tsx:22`: «Tirado a ciegas. Solo el DM ve el resultado.»
- [ ] «Solo el DM» (casilla del registro) → «Solo lo ve el DM».
- [ ] `grep -rn "Recibo daño\|Me curo\|La ves tú\|tú no\|Solo el DM\"" apps/web/e2e apps/web/src` → arreglar. `pnpm verify`. Commit: `fix(web): neutral voice in shared components`.

### Task 4: lo que sale con nombre interno (10.5, 2.3, 4.1-texto, 17.4)

**Files:**
- Modify: `apps/web/src/features/sessions/hilo/tirada.ts:93` («Dice» → «Resultado»)
- Modify: `apps/web/src/dominio/acciones.ts:95-103` (`fraseDeMecanica`)
- Modify: `apps/web/src/features/sessions/elenco/FichaDeElenco.tsx:486-499` (`BarraDePuntosDeGolpe`)
- Modify: `apps/web/src/features/sessions/elenco/FichaDePnj.tsx` (llamada a `BarraDePuntosDeGolpe`)
- Modify: `apps/web/src/features/sessions/ControlesDeSesion.tsx:221` (borrador de la crónica)

- [ ] `tirada.ts:93`: `origen: "Resultado"`. Actualizar `hilo/__tests__/tirada.test.ts:221`.
- [ ] `fraseDeMecanica`: cuando no hay `dados`, devolver `""` en vez de `NOMBRE_MECANICA[tipo]` — «Texto» y «Daño o curación» son datos del motor, no de la mesa. `FilaDeAccion` ya filtra vacíos con `.filter(Boolean)`. Unitaria en `dominio/__tests__/acciones.test.ts`: `fraseDeMecanica({ tipo: "texto" })` → `""`.
- [ ] `BarraDePuntosDeGolpe` recibe `ocultos?: boolean`. `FichaDePnj` lo pasa cuando `!esDm` (allí `maximo` se pone a `null` a propósito, `FichaDePnj.tsx:49`). Con `ocultos`: barra sin cifras y texto «PG ocultos» en vez de «Sin puntos de golpe en la hoja.», que solo se pinta cuando de verdad no hay PG en la hoja. **Sin estado Herido/Malherido**: eso es decisión del autor (06).
- [ ] `ControlesDeSesion.tsx:221`: las viñetas del borrador pasan de `· ${sello}: ${texto}` a `— ${sello}: ${texto}` (con una sola nota, «· Nota: …» se leía como separador huérfano).
- [ ] `pnpm verify` + `pnpm --filter @dnd/web exec playwright test barra-de-acciones` (o el spec que monte la barra: `grep -rl "Esquivar, ayudar" apps/web/e2e`). Commit: `fix(web): no engine labels on screen — Resultado, no mechanic type, hidden HP says so`.

### Task 5: la hoja — avatar, signos y el párrafo que explica un control (8.1, 8.2, 8.6)

**Files:**
- Modify: `apps/web/src/features/sessions/elenco/FichaDeElenco.tsx:484` (`Retrato`)
- Modify: `apps/web/src/features/character-sheet/Cabecera.tsx` (retrato y casillas Iniciativa/Competencia, `:118`, `:142`)
- Modify: `apps/web/src/features/character-sheet/AvisoDeDm.tsx:49`

- [ ] Inicial real: `apps/web/src/dominio/nombres.ts`:

```ts
/** Primera letra de verdad del nombre —salta «[demo]», comillas, espacios—; «?» si no hay. */
export function inicialDe(nombre: string): string {
  return nombre.match(/\p{L}/u)?.[0]?.toUpperCase() ?? "?";
}
```

  Usarla en `Retrato` (`FichaDeElenco.tsx:484`) y en el retrato de `Cabecera.tsx` (`grep -n "charAt(0)" apps/web/src/features/character-sheet`). Unitaria: `inicialDe("[demo] Tessa")` → `"T"`, `inicialDe("  ")` → `"?"`.
- [ ] Signo siempre: Iniciativa y Competencia pasan por el mismo formateador que las habilidades (`grep -n "formatearModificador\|conSigno" apps/web/src/features/character-sheet/vocabulario.ts` → reutilizar; si no existe, `conSigno(n) => n >= 0 ? \`+${n}\` : \`−${Math.abs(n)}\`` en `dominio/numeros.ts`).
- [ ] `AvisoDeDm.tsx:49`: el párrafo «Vista de DM: puedes anular a mano N valores… desde “Anulaciones del DM”» se sustituye por un botón «Anulaciones del DM (N)» que abre/enfoca el panel `Anulaciones` (ya existe: `character-sheet/Anulaciones.tsx`); el texto explicativo queda como `aria-describedby`.
- [ ] `pnpm verify` + `playwright test hoja`. Commit: `fix(web): real initial in avatars, signed modifiers, DM overrides as a button`.

### Task 6: condiciones — la leyenda cuenta sola (12.1, 12.2)

**Files:**
- Modify: `apps/web/src/features/sessions/elenco/PonerCondicion.tsx:160-200`

- [ ] «Te ayudan» y «En furia» salen del grupo del manual y entran en «De la mesa, no del manual», junto a Concentración. La lista del manual se deriva del vocabulario (`character-sheet/vocabulario.ts`, `NOMBRE_CONDICION`) con una marca `delManual` por clave, no de una lista escrita a mano aquí.
- [ ] La leyenda dice «Las del manual (N)» con `N` calculado; el segundo grupo pasa de `<p>` a `<fieldset><legend>`.
- [ ] Unitaria en `elenco/__tests__/PonerCondicion.test.tsx`: el grupo «Las del manual» tiene exactamente 15 radios y «De la mesa» contiene «Te ayudan». `grep -rn "Las quince" apps/web/e2e`. `pnpm verify`. Commit: `fix(web): condition dialog — table-made conditions in their own group, legend counts`.

### Task 7: números y fechas con un solo convenio (17.2, 9.4, 8.7, 17.3)

**Files:**
- Create: `apps/web/src/dominio/numeros.ts` (mover aquí `conEspacioFino` desde `character-sheet/vocabulario.ts:881` y añadir `decimales(n, cifras)` con coma)
- Modify: `apps/web/src/features/inventory/PanelCarga.tsx:50,78` (`toFixed(1)` → `decimales(x, 1)`)
- Modify: `apps/web/src/features/campaign-items/vocabulario.ts:461,475` y `CampaignItemEditor.tsx:77,81` (`toLocaleString("es-ES")` → `decimales`: en el navegador funciona, en las unitarias no — la misma trampa de small-ICU)
- Create: `apps/web/src/dominio/fechas.ts` con `fechaCorta(d)` (sin año si es del año en curso) y `fechaLarga(d)`; usarlas en `features/campaigns/Cronicas.tsx` y `pages/SessionDetailPage.tsx` (`grep -rn "toLocaleDateString\|weekday" apps/web/src`)

- [ ] `decimales(3.5, 1)` → `"3,5"`; `decimales(1250.25, 2)` → `"1 250,25"`. Unitarias en `dominio/__tests__/numeros.test.ts`.
- [ ] `pnpm verify` + `playwright test inventario`. Commit: `fix(web): one number and date formatter (es-ES by hand, small-ICU safe)`.

## Bloque B — cajones que se comen la cabecera de la página (21.10, 10.3, 13.1, 15.1–15.3)

### Task 8: `cabecera` como propiedad en los cinco componentes

**Files:**
- Modify: `apps/web/src/features/bestiario/PanelDeBestiario.tsx:364-370`
- Modify: `apps/web/src/features/dm-tables/PanelDeTablas.tsx:66-80`
- Modify: `apps/web/src/features/sessions/dm/ConsultaDelMundo.tsx:33-37`
- Modify: `apps/web/src/features/inventory/PaginaDeInventario.tsx:377`
- Modify: `apps/web/src/features/roll-requests/PedirTirada.tsx:113-120`
- Modify: los cinco puntos de montaje en `HerramientasDeNarracion.tsx`, `MesaDeSesion.tsx` (`PanelesSuperpuestos`) y `RailDePaneles`/campaña

- [ ] Cada componente recibe `cabecera?: "pagina" | "ninguna"` (por defecto `"pagina"`, así la página no cambia). Con `"ninguna"` no pinta su `h2`/`h3` ni su frase explicativa: el `Dialog` ya lleva `title` y `subtitulo`.
- [ ] Los cinco `Dialog` pasan `cabecera="ninguna"`. Y la frase que hoy va en el `subtitulo` del `Dialog` es la buena (una sola vez).
- [ ] Prueba gráfica: en `apps/web/e2e/mesa-prototipo.spec.ts` (o el spec que abra las herramientas) un caso «un cajón abierto tiene exactamente un `h2`» sobre los cinco. `pnpm verify` + ese spec. Commit: `fix(web): drawers keep a single heading — page components take their header as a prop`.

### Task 9: tres reordenes pequeños (15.4, 16.1, 13.4, 13.3)

**Files:**
- Modify: `apps/web/src/features/bestiario/PanelDeBestiario.tsx:265-300` (lista «En la mesa»: quitar el control «PG temporales + Dárselos»)
- Modify: `apps/web/src/features/sessions/elenco/MandosDeCombatiente.tsx:585-604` (nueva entrada de menú «PG temporales…» que abre el mismo formulario, ahora en un `Dialog` propio)
- Modify: `apps/web/src/features/game-clock/RelojDeCampana.tsx:272` («Qué pasa (opcional)» sube justo debajo de la cabecera «El reloj», antes de «Pasa el tiempo» y «O viajáis»)
- Modify: `apps/web/src/features/sessions/dm/ReglasEnLaMesa.tsx:92-98` (la nota «Componer, ensayar… siguen en la pestaña Reglas» pasa a la cabecera del cajón, con su botón)
- Modify: `apps/web/src/features/entities/BotonEjecutar.tsx` (dejar el texto visible del motivo; quitar el `title` duplicado)

- [ ] Mover el formulario de PG temporales a un componente `PgTemporales.tsx` en `elenco/`, montado desde el menú «Más acciones» (`panel: "temporales"`); el bestiario deja de pintarlo. Grep de pruebas: `grep -rn "Dárselos\|PG temporales" apps/web/e2e apps/web/src/**/__tests__`.
- [ ] Los otros tres son mover JSX; sin prueba nueva.
- [ ] `pnpm verify` + `playwright test` de los specs que casen con el grep anterior. Commit: `fix(web): temp HP lives in the creature's menu; clock note first; rules note in the header`.

## Bloque C — lo que la regla de casa ya exigía (1.5, 5.2 hecho en Task 2, 4.4, 4.3, 3.2)

### Task 10: los sellos nunca se apagan (1.5)

**Files:**
- Modify: `apps/web/src/features/sessions/hilo/HiloDeSesion.tsx:576-600`

- [ ] Los seis sellos dejan de llevar `aria-disabled` cuando no hay texto: pulsar sin texto escribe en línea «Escribe algo antes de sellar.» (mismo `error` que ya pinta el formulario) y enfoca la caja. Solo `sellar.isPending` los apaga (con motivo).
- [ ] Unitaria en `hilo/__tests__/HiloDeSesion.test.tsx`: sello pulsado sin texto → aparece el aviso y no se llama a `sellar`. `pnpm verify` + `playwright test registro`. Commit: `fix(web): stamps are never disabled — pressing without text explains inline`.

### Task 11: la tira de turnos — grupo, empate, y los avisos del DM (4.4, 4.3, 3.2)

**Files:**
- Modify: `apps/web/src/features/encounters/TiraDeIniciativa.tsx:87-135` (rótulo del grupo y distintivo de empate)
- Modify: `apps/web/src/features/roll-requests/TiradasPendientes.tsx:145-160` (el DM no ve un panel grande por cada jugador)

- [ ] **Rótulo del grupo:** si todas las criaturas de la casilla comparten nombre base (`/^(.*?)(?:\s\d+)?$/`), «Goblins (3)» — plural con `s` solo si el nombre no termina en `s`; si no, los nombres unidos con `enumerar` (Task 1). El `aria-label` de apuntar: «Apuntar al grupo de 3 goblins». Los tres nombres completos van en `title`.
- [ ] **Empate:** dos casillas con la misma `initiative` llevan un chip «empate» (`font-data`, `text-warning-text`) junto al número; el lápiz «Corregir la iniciativa» ya es la puerta para deshacerlo (E-IB-14).
- [ ] **Avisos del DM:** en `TiradasPendientes.tsx`, para el DM (`useMyRole`), las peticiones de encuentro que no sean de un personaje **suyo** no se pintan como `PanelDeIniciativa` grande: se pintan como **una** caja compacta «Faltan por tirar: Tessa, Mirela y Sylas» con un botón «Tirar por Tessa» por fila (mismo `useAnswerRollRequest`). Así el DM conserva la puerta de tirar por un ausente (D-OP-23) sin tres carteles apilados.
- [ ] Y en `TiraDeIniciativa.tsx:444-453`, el botón «Empezar igualmente» lleva `aria-describedby` con «El sistema tira la iniciativa por los que faltan.» y esa frase visible bajo el contador.
- [ ] Unitarias en `TiraDeIniciativa.test.tsx` (rótulo «Goblins (3)», chip «empate») y en `roll-requests/__tests__/TiradasPendientes.test.tsx` (el DM ve una caja, el jugador su panel). `pnpm verify` + `playwright test iniciativa`. Commit: `fix(web): grouped turn label, tie badge, and a compact "missing rolls" box for the DM`.

## Bloque D — accesibilidad y comodidad (18.2, 18.3, 10.6, 19.1, 4.5, 4.9, 9.3, 11.3)

### Task 12: el token de borde y el foco global

**Files:**
- Modify: `apps/web/src/ui/tokens.css` (nuevo `--borde` por tema, calibrado ≥ 3:1 contra `--surface`)
- Modify: `apps/web/tailwind.config.js` (`borderColor.borde`)
- Modify: `apps/web/src/index.css` (o donde viva la capa base): `:where(button, a, input, select, textarea, [role="tab"], [role="radio"], [role="menuitem"]):focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`
- Modify: `grep -rln "border-muted/30\|border-muted/40" apps/web/src` → `border-borde`
- Test: `apps/web/e2e/tokens-contrast.spec.ts` (ya mide texto; añadir borde ≥ 3:1 en los tres temas)

- [ ] Medir primero: `tokens-contrast.spec.ts` imprime los ratios actuales de `muted/30` sobre `surface` en oscuro, claro y lectura (esperado 1,5–1,8).
- [ ] Añadir `--borde` en `:root` (oscuro), `[data-theme="light"]`, `[data-theme="reading"]` y `@media (prefers-color-scheme: light)`; valores de partida `rgb(72 88 97)`, `rgb(160 152 136)`, `rgb(92 80 58)`, **ajustados hasta que la prueba dé ≥ 3:1**.
- [ ] Sustituir las clases. Quitar las utilidades `focus-visible:outline…` repetidas en los componentes solo si la capa base las cubre (medir con el spec de teclado que exista: `grep -rl "focus" apps/web/e2e`).
- [ ] `10.6`: en `PanelDeDadosDeLaMesa`/`SelectorDeAudiencia`, quitar el `role="radiogroup"` del contenedor que envuelve un `fieldset` con radios nativos.
- [ ] `pnpm verify` + `playwright test tokens-contrast`. Commit: `fix(web): border token at 3:1 in the three themes, global focus ring`.

### Task 13: movimiento reducido y tres comodidades de la mesa (19.1, 4.5, 4.9, 9.3, 11.3)

**Files:**
- Modify: `apps/web/src/features/sessions/elenco/efectos/efectos.css:586-597`
- Modify: `apps/web/src/features/actions/BarraDeAcciones.tsx` (línea «No es tu turno. Le toca a X» encima de los botones, barra al 60 % de opacidad)
- Modify: `apps/web/src/features/encounters/EconomiaDeAccion.tsx:729-743` (botones «−5» «−10» junto al campo de pies)
- Modify: `apps/web/src/features/inventory/FiltrosDeObjetos.tsx` (chip «Todo» primero, activo por defecto; dos grupos: estado y tipo)
- Modify: `apps/web/src/features/sessions/hilo/HiloDeSesion.tsx:395-425` (filtros: `py-s1` y `min-h-[28px]`)

- [ ] **19.1** — primero leer por qué D-CF-116 dejó el destello con 0,25 s (`git log -S"fx-pantalla-destello" --oneline`). Si no hay motivo escrito: dentro de `@media (prefers-reduced-motion: reduce)` el destello pasa a `animation: none` y el suceso se señala con `outline: 2px solid var(--fx-color)` en la tarjeta durante 0,5 s sin animación. Si hay motivo, se deja y se anota en 06.
- [ ] **4.5** — `BarraDeAcciones` ya sabe si es tu turno (`useCurrentEncounter` + `activePosition`): cuando no lo es y hay combate activo, una línea `role="status"` «No es tu turno. Le toca a Sylas.» y los cinco botones con `opacity-60` (siguen abriéndose: las filas se leen igual).
- [ ] **4.9** — dos botones `−5` / `−10` que llaman a `gastar("MOVEMENT", 5|10)`; el campo se queda.
- [ ] **9.3** — chip «Todo» y los dos grupos con rótulo `sr-only`.
- [ ] **11.3** — los tres radios del registro a `min-h-[28px]`; **no** 32 px: el prototipo del autor los tiene así de finos y 28 es el compromiso medido con el DM en la captura de la auditoría.
- [ ] `pnpm verify` + `playwright test barra-de-acciones inventario registro`. Commit: `fix(web): reduced motion without the flash, out-of-turn bar, quick movement buttons, filter chips`.

## Bloque E — el prototipo (§20), sin tocar código

### Task 14: capturar lo que faltaba

**Files:**
- Modify: `C:\Users\gogam\Desktop\Trabajo\Mine\prototipo-dnd-src\_crawl-combate.mjs` (fuera del repo)

- [ ] Añadir: ataque resuelto (con y sin chip; impacto y fallo), «Siguiente turno» hasta el asalto 2, un PJ a 0 PG (daño desde el DM sobre la demo), dos condiciones puestas, vistas a 390 y 768 px en los dos roles. Reconstruir `prototipo-dnd.html`.
- [ ] Sin commit: el prototipo vive en `Mine/`, no en el repo.

---

## Self-review

- **Cobertura:** las 43 correcciones marcadas «libres» en 06 § auditoría están en una tarea, salvo 12.3/12.4 (unificar el componente de condiciones y sus duraciones), 6.3/6.4/6.5, 9.1, 16.1-pestañas, 1.6 y 18.6, que 06 lista como fichas de tamaño medio para después de esta tanda.
- **Sin marcadores:** cada paso nombra fichero y línea o el grep que lo encuentra.
- **Nombres:** `enumerar` (Task 1) se reutiliza en Task 11; `decimales`/`conEspacioFino` (Task 7) en `dominio/numeros.ts`; `inicialDe` (Task 5) en `dominio/nombres.ts`.
