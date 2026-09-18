# 3A.3 · La barra de acciones y la mesa que converge al prototipo — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que una partida entera se juegue desde la pantalla de la mesa: una sola lista de acciones
que el servidor deriva (`GET …/characters/:id/actions`, T21), la barra de acciones bajo el marco
con sus cuatro menús + «Esquivar, ayudar…» (T22), la economía del turno como **estado que se gasta
al actuar**, y la mesa convergiendo al prototipo del 2026-09-18 en disposición y uso del espacio
**sin quitar nada de lo que hoy hace**.

**Architecture:** el servidor compone la lista de acciones desde lo que ya deriva (cuadro de
ataques, `sheet.activities`, `SpellbookService.list`, inventario consumible, economía del
`Combatant`); cada fila lleva `disponible` y `motivo`. La web pinta menús que suben desde la barra;
pulsar una acción llama a la puerta que ya existe (`resolveAttack`, `usar`, `consume`) y la economía
se marca **dentro** de esa puerta (ya lo hace `gastarActivacion`/`gastar`) — la barra no gasta nada
por su cuenta. La convergencia visual es recolocar componentes existentes en la disposición del
prototipo (`MesaDeSesion.tsx` es solo un compositor).

**Tech Stack:** el de siempre (NestJS + Prisma · Zod en `@dnd/shared` · React + TanStack Query +
Tailwind por tokens · jest · vitest + RTL · Playwright).

**Spec:** `docs/superpowers/specs/2026-09-18-prototipo-de-la-mesa.md` (+ el HTML
`prototipo/mesa/2026-09-18-prototipo-mesa.html`, capturas en
`.superpowers/sdd/2026-09-18-noche-3a/prototipo-1280.png` y `-390.png`), bloque 3A.3 de
`docs/superpowers/plans/2026-09-14-paso-3-en-cinco-tandas.md`, T21/T22 de
`docs/superpowers/plans/2026-09-08-paso-3-el-catalogo-y-los-conjuros-del-personaje.md`, D-CF-50
(menús derivados de las reglas, no barra que el jugador ordena), D-CF-123 (el prototipo manda en
disposición, no en qué existe).

## Global Constraints

- Las de 3A.2 (`docs/superpowers/plans/2026-09-18-3a2-elegir-lanzar-y-usar.md`, § Global Constraints) aplican enteras: autorización en el servidor, `canView`, Zod desde `@dnd/shared`, ningún enum en pantalla, iconos dibujados, cuenta y avisa, TDD, `pnpm verify` en primer plano con `timeout: 600000`, Playwright solo el orquestador y por fichero, rótulo renombrado → `grep` en `apps/web/e2e`.
- **Todo lo que la mesa hace hoy se conserva** (D-CF-123): «Poner daño», «Dar temporales», «Curar», el menú «…» de cada ficha del elenco (condición, Dar…, Su hoja, bando, quitar, revelar/ocultar, sacar del combate), Ayudar, pedir tirada, revelar, avanzar reloj, sacar criatura, bloques de reglas, tablas, Dar XP, consultar el mundo, iniciativa forzada/repartida, corregir iniciativa, pasar turno, terminar combate, la propuesta de XP, efectos de mesa, «Ver como», tema, avisos, anotar con sello. Lo que el HTML no dibuja se **coloca**; si no cabe, ficha con la medida, nunca se borra.
- **`canView` manda sobre «Ver como»** (pinta; el servidor decide lo que envía).
- **Ningún botón que el servidor rechace**: cada fila apagada lleva su motivo, y el motivo lo da `GET …/actions`.
- **La economía se gasta al actuar**: la barra NO llama a `POST …/gastar`. Los contadores («acción · adicional · reacción · 30/30 pies») son **estado** leído de `Combatant`; el único mando que queda es el movimiento (pies) y «Corregir» del DM (que abre lo que hoy son los botones «Usar mi…», solo para el DM o para corregir a mano — ver D-CF-131 abajo).
- **Los e2e que miden la mesa se actualizan a la disposición nueva sin bajar lo que miden**: `mesa-mide`, `mesa-en-estrecho` (sigue `test.fail`, D-CF-26), `tablero-en-la-mesa`, `tokens-contrast`, `desbordes`, `leer-una-sesion`, `combate`, `iniciativa-en-vivo`, `pnj-del-mundo-en-vivo`, `efectos-de-mesa`, `puerta-de-efectos`, `lanzar`, `condiciones-en-la-mesa`, `dar-a-un-pnj`, `sesion`, `teclado`, `arrastre-dentro-del-cajon`. `grep` de cada rótulo/`aria-label` que cambie antes de cambiarlo.
- **Tiradores redimensionables, atajos nuevos, «Repetir (R)», «Deshacer (Z)» y «Espacio = siguiente turno» NO entran**: ficha en 06 con lo que costarían (Task 7). `Escape`, `N/I/M/D` siguen.
- **Worktree**: `3a3/la-barra-de-acciones` (`../dnd-3a3-la-barra-de-acciones`), slot 1.
- **Rigor según la pieza (decisión del autor, 2026-09-18 de madrugada, misma lógica que D-CF-67):** las tareas
  **visuales** (Task 3 banda única, Task 5 tres columnas, Task 6 capturas) **no llevan unitarias ni mutación
  por tarea** — una vista rara vez «no funciona» y la prueba de funcionamiento solo trae problemas de
  integración —; cierran con `pnpm verify` verde (las unitarias existentes siguen), el spec gráfico
  `mesa-prototipo.spec.ts` (medidas + capturas) y los e2e existentes ajustados; RTL solo donde hay lógica
  (filtros del registro, conmutador «Con/Sin tablero»). Las tareas de **integración** (Task 1 T21, Task 2
  economía, Task 4 barra) siguen con TDD: ahí es donde salen los fallos. Se declara como D-CF en el cierre.

---

## Lo medido antes de escribir (2026-09-18, sobre `main` tras 3A.2)

| Pieza | Qué hay | Qué cambia |
|---|---|---|
| `apps/web/src/features/sessions/MesaDeSesion.tsx` (485 l.) | Compositor: `BandaDeMesa` (header «Estado de la mesa») + `CabeceraDeEscena` (section «La escena») + `TiradasPendientes` + `CapaDeCombate` + `main` en rejilla `17rem/1fr/15rem` (elenco+rail · marco+`CajonDelRegistro` o `HiloDeSesion` · `aside` herramientas) + `PanelesSuperpuestos` (hoja/bolsa/mundo) + `PanelDeDadosDeLaMesa`. Atajos N/I/M/D. | Se recompone a la disposición del prototipo (Task 3-5). `PanelesSuperpuestos`, dados y atajos se quedan. |
| `BandaDeMesa.tsx` (127 l.) | ← campaña · migas · duración · «Ver como» · avisos · tema. | Absorbe título de escena + lugar + reloj + «Con tablero / Sin tablero» (Task 3). |
| `CabeceraDeEscena.tsx` (147 l.) | Sección «La escena»: título, lugar (`lugarDeLaEscena`), reloj (`momentoDeLaCampana`), presentes. | Sus datos suben a la banda; la sección desaparece como bloque aparte. Sus funciones puras (`escena.ts`) se reutilizan. |
| `CapaDeCombate.tsx` + `TiraDeIniciativa.tsx` (749 l.) + `EconomiaDeAccion.tsx` (229 l.) | Sección «Orden de turnos» con casillas por posición, «Pasar turno», «Terminar», propuesta de final, XP; `EconomiaDeAccion` con botones «Usar mi acción/adicional/reacción» + pies. | La tira se queda; `EconomiaDeAccion` pasa a **estado** (Task 2). |
| `ColumnaElenco.tsx` + `elenco/*` | Región «En la mesa»: grupo y PNJ en combate, `FichaDeElenco`/`FichaDePnj` con «Daño», «Curar», «…». | Se queda; gana «apuntar» (clic en tarjeta = objetivo de la barra, Task 4). |
| `RailDePaneles.tsx` | nav «Paneles de la mesa» (Hoja N · Bolsa I · Mundo M · Dados D), al pie del elenco. | Se queda. |
| `MarcoDelTablero.tsx` (26 l.) + `CajonDelRegistro.tsx` (93 l.) | `iframe title="Sala del tablero"` cuando hay `boardRoomUrl`; el registro en cajón plegable debajo. | El marco gana cabecera (lugar + «abrir aparte»); el cajón **desaparece** (Task 5); la barra va debajo del marco (Task 4). |
| `HiloDeSesion.tsx` (462 l.) | Lista «Sucesos de la sesión», franja «te perdiste», «Hay algo nuevo abajo», caja «Qué anotar» con sellos. `tipo-de-mensaje.ts` ya clasifica. | Pasa a columna lateral con filtros Todo / Relato / Números (Task 5). |
| `dm/HerramientasDeNarracion.tsx` (322 l.) | «Herramientas del DM» ya en rejilla 2 col. con 6-7 botones + `Dialog` por herramienta + «Consultar el mundo». | Se queda; va debajo del registro en la lateral del DM (Task 5). «Lo que el motor está siguiendo» = ficha (no hay dato hoy). |
| `apps/api/src/encounters/encounters.service.ts` `gastar()` | Cuenta y avisa, `ACTION_SPENT`. `Combatant.{actionUsed,bonusUsed,reactionUsed,movementUsed}`. | Sin cambios de forma; T21 lo lee. |
| `apps/api/src/characters/character-sheet.service.ts` `buildResponse` → `attacks: Attack[]` | Cuadro de ataques con `key`, `name`, `attackBonus`, `damage`. | T21 lo consume. |
| `sheet.activities: CharacterSheetActivity[]` (con `name`, `usos`), `SpellbookService.list` (`entradas` con `lanzable`, `level`, `objetivos`), `CharacterResource` (`spell-slot-N`), inventario (`InventoryItem` con `kind: CONSUMABLE`, `POST …/inventory/:rowId/consume`) | Existen. | T21 los junta. |
| `docs/06-pendientes.md` P2 / D-CF-26 | La mesa a 390 sigue aplazada; `mesa-en-estrecho` es `test.fail`. | No se toca la salida a 390 más allá de que nada nuevo rompa lo que ya mide. |

## File Structure

**Crear**
- `packages/shared/src/actions.schema.ts` (+ test): la forma única de una acción.
- `apps/api/src/actions/actions.module.ts`, `actions.controller.ts`, `actions.service.ts`, `actions.service.spec.ts`; `apps/api/test/acciones.e2e-spec.ts`.
- `apps/web/src/features/actions/api.ts`, `hooks.ts`, `BarraDeAcciones.tsx`, `MenuDeAcciones.tsx` (nombre distinto del `ui/MenuDeAcciones`: `MenuQueSube.tsx`), `ChipDeObjetivo.tsx`, `objetivo.store.ts`, `__tests__/…`; `apps/web/src/dominio/acciones.ts` (+ test).
- `apps/web/src/features/sessions/BandaUnica.tsx` (sustituye a `BandaDeMesa` + `CabeceraDeEscena`), `sessions/registro/ColumnaDelRegistro.tsx` (hilo + filtros + caja), `sessions/tablero/CabeceraDelMarco.tsx`.
- `apps/web/e2e/barra-de-acciones.spec.ts`, `apps/web/e2e/mesa-prototipo.spec.ts` (capturas al lado del prototipo).

**Modificar**
- `apps/web/src/features/sessions/MesaDeSesion.tsx`, `encounters/EconomiaDeAccion.tsx`, `encounters/TiraDeIniciativa.tsx`, `elenco/FichaDeElenco.tsx`, `elenco/FichaDePnj.tsx`, `hilo/HiloDeSesion.tsx`, `tablero/MarcoDelTablero.tsx`, `dm/HerramientasDeNarracion.tsx` (solo su montaje), e2e listados arriba.
- Docs: `docs/09-jugar.md` (la barra), `docs/01-arquitectura.md` (módulo `actions`), `docs/08-pruebas.md`, `docs/decisiones.md` (D-CF-131..), `docs/06-pendientes.md`, `docs/07-historial.md` al cierre.

## Cómo se mide en el navegador contra el prototipo

`apps/web/e2e/mesa-prototipo.spec.ts` (patrón `capturas-comparacion.spec.ts`): monta una mesa con
DM, dos jugadores, un goblin, sesión y encuentro, `boardRoomUrl` a un HTML local servido por Vite
(un `public/tablero-de-prueba.html` con un `<h1>`), y saca **cuatro capturas** a
`apps/web/e2e-resultados/mesa-{dm,jugador}-{1280,390}.png`; además abre el HTML del prototipo
(`file://`) a 1280×800 y 390 y guarda `mesa-prototipo-{1280,390}.png` al lado. El spec **mide**:
(1) a 1280 el `main` tiene tres columnas para el DM (elenco · marco · lateral) y dos para el
jugador, sin scroll de página; (2) la banda es UNA (`banner "Estado de la mesa"` contiene el título
de la escena, el lugar y el reloj; no existe `section "La escena"`); (3) la franja de combate va
entre la banda y el `main`, y contiene la economía como texto de estado (`status "Economía del
turno"`) sin botones «Usar mi…»; (4) la barra de acciones está debajo del marco, dentro de la
columna central, y sus cinco botones son visibles a 1280; (5) en la lateral del DM el registro está
encima de las herramientas; (6) no hay `region "Registro en vivo"` (el cajón murió). El informe
del orquestador pone cada captura nuestra al lado de la del prototipo y dice qué se parece y qué no.

---

### Task 1: `GET …/characters/:id/actions` — una sola forma (T21)

**Files:**
- Create: `packages/shared/src/actions.schema.ts`, `packages/shared/src/actions.schema.test.ts`; `apps/api/src/actions/*`; `apps/api/test/acciones.e2e-spec.ts`
- Modify: `packages/shared/src/index.ts`, `apps/api/src/app.module.ts`, `docs/01-arquitectura.md`, `docs/08-pruebas.md`

**Interfaces (Produces):**
```ts
// packages/shared/src/actions.schema.ts — tipos de RESPUESTA (no esquema de entrada)
export type GrupoDeAccion = "ATAQUES" | "CONJUROS" | "APTITUDES" | "OBJETOS" | "BASICAS";
export type CosteDeAccion = "ACTION" | "BONUS" | "REACTION" | "FREE" | "TIEMPO"; // TIEMPO = minutos/horas (ritual, descanso)
export type MotivoNoDisponible =
  | "SIN_ESPACIO" | "SIN_USOS" | "NO_PREPARADO" | "ACCION_GASTADA" | "ADICIONAL_GASTADA"
  | "REACCION_GASTADA" | "NO_ES_TU_TURNO" | "SIN_CANTIDAD" | "NO_EQUIPADA" | "FUERA_DE_COMBATE";
export interface AccionDisponible {
  /** Clave que la pantalla manda a la puerta que toque: `attack:<attackKey>`, `spell:<key>`, `feature:<key>`, `item:<rowId>`, `basic:<dodge|help|hide|disengage|dash|ready|search|use-object>` */
  key: string;
  grupo: GrupoDeAccion;
  name: string;               // ya en español (nameEs / feature.name / nombre del objeto / vocabulario de básicas del servidor NO: las básicas llevan clave y la web pone el nombre)
  coste: CosteDeAccion;
  /** Conjuros: nivel 0..9; el resto sin. */
  spellLevel?: number;
  /** Lo que se gasta: «espacio de nivel 2 · 1/2», «uso 2/3», «×3». */
  recurso?: { tipo: "ESPACIO" | "USO" | "CANTIDAD"; actual: number; max: number | null; nivel?: number };
  /** Resumen mecánico corto para la fila: `1d8+3 cortante`, `8d6 fuego · salvación DES`, `1d20+5 vs CA`. Lo compone el servidor con el vocabulario de daño en INGLÉS de claves (la web traduce el tipo con `dominio/dano.ts`) — por eso se manda estructurado: */
  mecanica?: { tipo: "ataque" | "salvacion" | "dados" | "utilidad" | "prueba" | "texto"; dados?: string; tipoDeDano?: DamageType; ability?: AbilityKey };
  objetivos: "ninguno" | "uno" | "varios";
  escalaPorEspacio?: boolean;
  disponible: boolean;
  /** Vacío si `disponible`. Varios motivos a la vez (sin espacio Y acción gastada). */
  motivos: MotivoNoDisponible[];
}
export interface AccionesResponse {
  characterId: string;
  enCombate: boolean;
  esMiTurno: boolean | null;   // null fuera de combate
  economia: EconomiaDelTurno | null;
  velocidadPies: number | null;
  grupos: Record<GrupoDeAccion, AccionDisponible[]>;
  /** Las básicas SIEMPRE (D-CF-49: Esquivar, Ayudar, Esconderse, Destrabarse, Correr, Preparar, Buscar, Usar un objeto), con `disponible` según la economía; hoy todas menos Ayudar son «texto»: al pulsarlas la web escribe `ACTIVITY_USED kind FEATURE` vía `POST …/activities/basic:<key>/use` — Task 1 añade esa puerta en `ActivitiesService` (catálogo `basic:` con actividad `utilidad` de coste ACTION y `name` en español desde un vocabulario del SERVIDOR `apps/api/src/rules/catalog/basic-actions.ts`, con la cita del SRD de cada una). Ayudar sigue por su puerta (`AyudarA`). */
}
```
- Ruta `GET /campaigns/:campaignId/characters/:characterId/actions` — `requireVisibleCharacter` (un jugador puede ver las acciones de un aliado visible; **los motivos y recursos de un PNJ que no es suyo no viajan**: para quien no es dueño ni DM, `grupos` solo trae nombres con `disponible: false` y `motivos: []`? NO — más simple y sin fuga: **solo dueño o DM** (`requireOwnerOrDM`), 403 al resto. Ruling: la barra es del jugador sobre su personaje.)
- Composición: `attacks` de `buildResponse` → ATAQUES (`coste ACTION`, `mecanica.tipo "ataque"`, `dados: damage.expression`, `NO_EQUIPADA` no aplica: solo salen equipadas); `SpellbookService.list` → CONJUROS: todas las `lanzable` (trucos y preparados/conocidos) + las `EN_EL_LIBRO` con `NO_PREPARADO`; `recurso ESPACIO` del nivel del conjuro (`actual` = suma? NO: el espacio del nivel exacto; si `actual === 0` pero hay superior con `actual > 0` → disponible, `recurso` apunta al menor superior con espacio); `sheet.activities` → APTITUDES (`recurso USO` de `CharacterResource` por `key`; `SIN_USOS` si `current === 0 && max !== null`); inventario `kind CONSUMABLE` en `CARRIED`/`EQUIPPED` → OBJETOS (`recurso CANTIDAD`, `coste ACTION`, `SIN_CANTIDAD` si 0); economía: si `enCombate` y `!esMiTurno` → `NO_ES_TU_TURNO` en todo lo que cuesta acción/adicional (no en reacción); si `actionUsed` → `ACCION_GASTADA` en las de `ACTION`; ídem `BONUS`/`REACTION`. Fuera de combate: nada de economía (`FUERA_DE_COMBATE` **no** apaga: solo se anota en `enCombate: false`; las acciones se pueden usar igual — doctrina D-N-2).

- [ ] **Step 1: Tests rojos**: `actions.service.spec.ts` (Prisma simulado + `CharacterSheetService`/`SpellbookService`/`InventoryService` simulados): mago nivel 3 con `magic-missile` PREPARADO, `sleep` EN_EL_LIBRO, `fire-bolt` CONOCIDO, espacios L1 0/4 y L2 2/2, en combate en su turno con acción libre → `magic-missile` disponible con `recurso {tipo ESPACIO, nivel 2, actual 2, max 2}`; `sleep` con `motivos ["NO_PREPARADO"]` y disponible `true`? — **no**: `NO_PREPARADO` es aviso, se puede lanzar (D-CF-126): `disponible: true` con `motivos: ["NO_PREPARADO"]`… Ruling: `motivos` con `disponible: true` = **avisos**; la web los pinta en gris junto al nombre y no apaga. Con la acción gastada → `magic-missile.disponible false, motivos ["ACCION_GASTADA"]`; un bárbaro con Furia 0/3 → `SIN_USOS`; poción de curación ×2 → OBJETOS disponible; ×0 no sale; fuera de combate → `economia null`, todo disponible; otro jugador → 403; básicas presentes siempre con `basic:dodge` etc.
- [ ] **Step 2–4**: rojo, implementar, verde. e2e `acciones.e2e-spec.ts`: mago y goblin en encuentro; `GET actions` del mago 200 con los cuatro grupos; tras `POST …/activities/spell:magic-missile/use` → `actionUsed` y la siguiente `GET` marca `ACCION_GASTADA`; el DM avanza turno → `NO_ES_TU_TURNO`; el jugador ajeno → 403.
- [ ] **Step 5**: `pnpm verify`, commit `feat(api): single action list per character with reasons (T21)` con las citas del SRD de las ocho acciones básicas (*Actions in Combat*).

---

### Task 2: La economía del turno como estado que se gasta al actuar

**Files:**
- Modify: `apps/web/src/features/encounters/EconomiaDeAccion.tsx` (+ test), `TiraDeIniciativa.tsx` (`MiEconomia`), `apps/web/e2e/combate.spec.ts` / `furia.spec.ts` / `puerta-de-efectos.spec.ts` (grep «Usar mi acción», «Acción disponible»…), `docs/decisiones.md` (D-CF-131), `docs/09-jugar.md`

**Regla (D-CF-131, decidida aquí):** los tres contadores pasan a `status aria-label="Economía del turno"` con tres marcas «acción · adicional · reacción» (punto lleno = disponible, tachado = gastada, con texto «gastada» para el lector de pantalla — nunca solo color) y «30/30 pies»; **se gastan al actuar** (atacar, lanzar, usar, consumir: las puertas ya llaman a `gastar`). Lo único que sigue siendo mando: el campo de pies + «Mover» (el movimiento no tiene puerta que lo gaste) y, **solo para el DM**, «Corregir» (abre las tres casillas como conmutadores para arreglar a mano — el DM arbitra). El jugador ya no tiene «Usar mi acción»: si hace algo fuera del sistema (habla, usa un objeto de la ficción), se lo dice al DM. Excedido (`excedido` de `gastar`): la marca se pinta en `--warning` con «de más».

- [ ] **Step 1: RTL rojo**: pinta las tres marcas desde `economia`; sin botones «Usar mi…» para el jugador; con `esDm` aparece «Corregir» y al pulsar, tres casillas que llaman a `onGastar`; el campo de pies sigue; ningún enum en el DOM.
- [ ] **Step 2–4**: rojo, implementar, verde; `grep -rn "Usar mi\|Acción disponible\|Acción adicional" apps/web/e2e apps/web/src` y ajustar (los e2e que gastaban la acción a mano pasan a comprobar el estado tras actuar).
- [ ] **Step 5**: commit `feat(web): turn economy as state spent by acting; DM corrects by hand (D-CF-131)`.

---

### Task 3: La banda única

**Files:**
- Create: `apps/web/src/features/sessions/BandaUnica.tsx` (+ test) — absorbe `BandaDeMesa` y `CabeceraDeEscena`
- Modify: `MesaDeSesion.tsx` (monta `BandaUnica`, quita `CabeceraDeEscena`), borra `BandaDeMesa.tsx`/`CabeceraDeEscena.tsx` y mueve sus tests; `mesa-mide.spec.ts`, `tablero-en-la-mesa.spec.ts`, `sesion.spec.ts`, `combate.spec.ts`, `desbordes.spec.ts` (grep `Estado de la mesa`, `La escena`, `Escena actual`, `En la escena`)

**Forma** (prototipo, fila superior): `← <campaña>` · **título de la escena** (sesión) + lugar (`lugarDeLaEscena`) en cobre · «1 h 12 min · 3 en la mesa» · reloj (`momentoDeLaCampana`: icono sol/luna dibujado + hora + «Día N, de noche») · conmutador **«Con tablero / Sin tablero»** (radios estilo segmento, `aria-label="Modo de la mesa"`; solo si hay `boardRoomUrl`; estado en `localStorage` por campaña, con `try/catch`) · «?» atajos (`Dialog` con la lista de teclas que existen: N I M D Esc) · «Ver como» (DM) · avisos · tema. `header aria-label="Estado de la mesa"` se conserva (lo miden los e2e). A 390: dos filas (`flex-wrap`), el título primero.

- [ ] Tests RTL (título, lugar, reloj, conmutador solo con sala, «Ver como» solo DM); e2e ajustados; commit `feat(web): single table band — scene, place, clock, board toggle (prototype)`.

---

### Task 4: La barra de acciones bajo el marco (T22) y apuntar desde el elenco

**Files:**
- Create: `apps/web/src/features/actions/*`, `apps/web/src/dominio/acciones.ts` (nombres de las básicas, de los grupos, de los motivos, de los costes — en español, una vez), `apps/web/e2e/barra-de-acciones.spec.ts`
- Modify: `MesaDeSesion.tsx` (la barra debajo del marco / del hilo en «Sin tablero», solo si `miPersonaje`), `elenco/FichaDeElenco.tsx`/`FichaDePnj.tsx` (clic en la tarjeta = `objetivo.store.set(id)`; `aria-pressed` en la tarjeta apuntada; **los mandos existentes no cambian**), `LanzarConjuro.tsx` (acepta `objetivoInicial` del store), `docs/09-jugar.md`, `docs/08-pruebas.md`

**Forma** (prototipo, fila bajo el marco): «Sylas · le toca» · chip de objetivo «apuntas a Klarg ×» (`ChipDeObjetivo`; **X** lo quita; sin tecla) · cinco botones con contador: «Ataques 3», «Conjuros 6 [2]» (el segundo número = espacios disponibles del menor nivel con espacio), «Aptitudes 0 [3]», «Objetos 2», «Esquivar, ayudar…». Cada botón abre un `PanelFlotante` **hacia arriba** (`MenuQueSube`) con filas de `AccionDisponible`: nombre · coste (vocabulario) · recurso · mecánica (dados + tipo de daño traducido) · botón «Usar»/«Lanzar»/«Atacar»/«Beber»; fila no disponible: `aria-disabled` con el motivo en `aria-describedby` y visible en gris (D-CF-121); avisos (`disponible` con `motivos`) en gris sin apagar. Conjuros: «Trucos» arriba, después por nivel con «nivel 2 · 1/2». Pulsar: ATAQUES → el mismo flujo que `TirarAtaqueBoton` con el objetivo del chip (si no hay chip, abre la lista de objetivos como hoy); CONJUROS → `LanzarConjuro` con `objetivoInicial`; APTITUDES → `useUsarActividad`; OBJETOS → `consume` del inventario; BÁSICAS → `POST …/activities/basic:<key>/use` (Ayudar → `AyudarA`). Tras cada acción: invalidar `actionsKey`, `encountersKey`, hilo, hoja, recursos. Teclado: flechas y `Escape` dentro del menú (patrón `ui/MenuDeAcciones`). A 390: la barra envuelve en dos filas (sin hoja inferior: ficha).

- [ ] RTL: pinta los cinco botones con contadores desde `AccionesResponse`; una fila apagada lleva `aria-disabled` y su motivo traducido; pulsar «Lanzar» en `magic-missile` abre `LanzarConjuro` con el objetivo del chip; pulsar `basic:dodge` llama a `usarActividad("basic:dodge")`; ningún enum en el DOM. e2e `barra-de-acciones.spec.ts`: DM + maga + goblin en combate; la maga apunta al goblin desde el elenco (chip «apuntas a Goblin»), abre «Conjuros», lanza Proyectil mágico → línea en el hilo, tarjeta pendiente en el DM, y en la franja la marca de acción pasa a «gastada»; abre «Conjuros» otra vez y «Proyectil mágico» está apagado con motivo «ya gastaste tu acción»; el DM pasa turno y vuelve; «Esquivar» → línea «esquiva»; «Ataques» de un guerrero con espada → «Atacar» → veredicto en el hilo.
- [ ] commit `feat(web): action bar under the frame — five menus from the server list, target chip from the cast (T22)`.

---

### Task 5: Tres columnas del prototipo — registro lateral con filtros, herramientas debajo, el cajón desaparece, marco con cabecera

**Files:**
- Create: `sessions/registro/ColumnaDelRegistro.tsx` (+ test), `sessions/tablero/CabeceraDelMarco.tsx`
- Modify: `MesaDeSesion.tsx` (rejilla DM `17rem / minmax(0,1fr) / 18rem`; jugador `17rem / minmax(0,1fr)`; centro = marco+barra si «Con tablero», registro+barra si «Sin tablero» o sin sala; lateral DM = registro (si el centro es el marco) + herramientas; jugador «Con tablero»: el registro va… **ruling**: el jugador con tablero mantiene una lateral de registro de 18rem — el prototipo dice que la vista de jugador «pierde la lateral» solo en «Sin tablero», donde el registro ya está en el centro), `HiloDeSesion.tsx` (acepta `filtro: "TODO"|"RELATO"|"NUMEROS"` usando `tipo-de-mensaje.ts`), `MarcoDelTablero.tsx` (cabecera: icono lugar + nombre del lugar + «abrir aparte» = `<a target="_blank" rel="noreferrer">`), borrar `CajonDelRegistro.tsx` + su test; e2e `tablero-en-la-mesa.spec.ts` (el cajón ya no existe: sus medidas pasan a la columna: el marco ocupa ≥ 60 % del alto del `main`, el registro lateral es visible y scrollea por panel), `mesa-mide.spec.ts` (la medida 4 sigue: `main [aria-label], main section`), `mesa-en-estrecho.spec.ts` (sigue `test.fail`; ajustar solo localizadores), `leer-una-sesion`, `arrastre-dentro-del-cajon` (si medía el cajón del registro, pasa a la columna), `desbordes.spec.ts`
- Docs: `decisiones.md` D-CF-132 (cajón absorbido; P-1 cerrada por absorción, D-CF-124), `06-pendientes.md` (P-1 fuera)

- [ ] RTL de `ColumnaDelRegistro` (filtros como radios con explicación corta o `FilterChip` — son tres opciones con significado: **radios**; «Nuevas líneas ↓» reutiliza «Hay algo nuevo abajo»; caja de anotar con sus sellos, `/` la enfoca salvo en input); e2e ajustados; commit `feat(web): table layout converges to the prototype — side log with filters, tools below, frame header, no drawer`.

---

### Task 6: Capturas al lado del prototipo y las medidas de la disposición

**Files:** `apps/web/e2e/mesa-prototipo.spec.ts`, `apps/web/public/tablero-de-prueba.html`, `docs/08-pruebas.md`

- [ ] El spec descrito en «Cómo se mide en el navegador contra el prototipo». Lo corre el orquestador; las capturas van a `apps/web/e2e-resultados/` (trackeadas, como las de desbordes). commit `test(web): the table measured against the prototype at 1280 and 390`.

---

### Task 7: Cierre de 3A.3

- [ ] `docs/07-historial.md` (entrada única de la tanda), `decisiones.md` (D-CF-131..N + rulings de los ledgers + **la decisión del autor de la madrugada del 18: el tablero oficial es Just Another VTT (`Mine/mini-vtt`), sustituye a PlanarAlly en `boardRoomUrl`**), `06-pendientes.md` (tiradores, atajos R/Z/Espacio, hoja inferior a 390, «Lo que el motor está siguiendo», bandeja lateral propia del DM, integración fina con JAVTT, y lo que la revisión deje), `como-seguir.md` §0, `09-jugar.md`, `pnpm update:estado`, verify, commit `docs: close 3A.3`.
- [ ] Revisión Opus de la rama entera + UNA ola + re-revisión acotada; Playwright en todos los spec tocados; `git merge --no-ff` + push.

## Self-review

- Spec «Qué cambia» tabla: banda única → T3; franja de combate como estado → T2; tres columnas → T5 (tiradores: ficha); elenco + rail con teclas → se queda (N I M D existen); marco con cabecera + barra debajo → T4/T5; cajón desaparece → T5; registro lateral con filtros y caja → T5; herramientas en rejilla → ya; bandeja del DM lateral → **no entra** (la tarjeta del hilo ya es la bandeja; ficha); barra de acciones → T4; Repetir/Deshacer/Espacio → ficha; «Sin tablero» → T3+T5. «Lo que NO decide»: `canView` (T1 exige dueño/DM), motivos del servidor (T1), dados por el evaluador (todas las puertas existentes), deshacer fuera.
- Tipos: `AccionDisponible`/`AccionesResponse` (T1) se consumen en T4; `EconomiaDelTurno` existe; `objetivo.store` (T4) lo lee `LanzarConjuro` (3A.2).
