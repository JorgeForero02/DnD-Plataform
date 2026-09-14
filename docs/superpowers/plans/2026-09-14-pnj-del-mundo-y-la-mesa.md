# El PNJ del mundo y la mesa — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la ficha del mundo tipo PNJ y su cuerpo en la mesa (`Character` con statblock) sean **la misma persona** (`Character.entityId`), que **revelar** sea una sola acción en tres columnas (instancia, ficha del mundo, plantilla creada), que el DM pueda **ocultar** y **sacar del combate** desde el menú «…» del elenco sin salir de la mesa, y que el jugador vea aparecer al bicho **sin recargar**.

**Architecture:** Una columna opcional `Character.entityId → Entity.id` (`SetNull`) es el puente; el servidor la valida (solo `type: NPC` de la misma campaña, 400 si no) y **la redacta** al cliente si el espectador no puede ver la ficha. Dos rutas nuevas `POST /campaigns/:id/characters/:characterId/reveal|hide` en `NpcsService` (una transacción, tres columnas, suceso `NPC_REVEALED` / `NPC_HIDDEN`); la simetría desde la ficha del mundo vive en `EntitiesService.update` (sube los cuerpos cuando la audiencia crece hasta la mesa). `DELETE …/encounters/:eid/combatants/:cid` en `EncountersService` reutiliza `recolocar` y un helper `empezarTurno` extraído de `advanceTurn`, así que avanzar al siguiente al sacar a quien tenía el turno es **el mismo código** y no sube asalto dos veces. En la web, todo cuelga de hooks nuevos (`useRevealNpc`, `useHideNpc`, `useRemoveCombatant`) y los ítems del menú «…» llegan por prop como ya hace `useAccionesDeBando`. El canal en vivo ya invalida `["campaigns", id]` y `encountersKey` con cada suceso: el jugador ve aparecer al Bandido porque `reveal` escribe un suceso.

**Tech Stack:** NestJS + Prisma 5 (Postgres 16) · Zod en `packages/shared` · React 18 + TanStack Query + Tailwind · Vitest/RTL · Jest (unit y e2e API) · Playwright.

**Spec:** [docs/superpowers/specs/2026-09-13-pnj-del-mundo-y-la-mesa-design.md](../specs/2026-09-13-pnj-del-mundo-y-la-mesa-design.md) — §2 está **medido** y no se re-verifica; §3.1 puente, §3.2 revelar/ocultar, §3.3 sacar del combate, §3.4 rótulos, §4 seguridad, §5 pruebas, §6 lo que no entra, §7 las seis tareas. Proceso: **D-CF-65** con el **cierre acotado** de la spec §5 (decisión del autor, 2026-09-14). Rama: `pnj-del-mundo/antes-del-paso-3` desde `main` (`ce0cc36`).

## Global Constraints

Copiadas de la spec, de `CLAUDE.md` y de `docs/04-convenciones.md`; toda tarea las incluye:

- **La autorización se comprueba en el servidor.** `reveal`, `hide`, `DELETE combatant`, `PATCH entityId` e `instanciar` con `entityId` exigen **DM** (`requireDM`). `canView` (`apps/api/src/common/visibility.ts`) sigue decidiendo qué ve cada uno de **cada columna por separado**; nadie reimplementa la matriz. Revelar **no crea concesiones** (`EntityVisibilityGrant` no se toca).
- **`entityId` viaja al cliente solo si el espectador puede ver la ficha; si no, `null`** (spec §4). Un helper único (`apps/api/src/common/entity-link.ts`) lo decide; se aplica en `GET /characters`, `GET /characters/archived`, `GET /characters/:id`, `PATCH /characters/:id`, `GET /characters/:id/sheet` y `GET /npcs`.
- **Validación de entrada: Zod desde `@dnd/shared` vía `ZodValidationPipe`.** Ningún DTO a mano. La forma de los datos vive una sola vez en `packages/shared/src`.
- **Código en inglés en la API y en shared; interfaz y documentación en español. Ningún valor de enumeración llega a la pantalla.** Los rótulos nuevos, literales y únicos: «Revelar a la mesa», «Ocultar», «Sacar del combate», «oculto», «Revelar», «Ficha del mundo», «A la mesa», «Plantilla», «En la mesa», «Criatura en la mesa». El tipo de fila en «Revelar algo» para una criatura se escribe una vez (`ETIQUETA_CRIATURA` en `RevelarAlgo.tsx`), no inline.
- **Regla de interfaz vinculante:** opciones con significado son **radios con su frase**, no `<select>`; un valor que no se puede elegir se enseña marcado y no seleccionable con su motivo; **si el texto explica una regla del servidor y discrepan, miente el texto**; iconos dibujados (`ui/Iconos.tsx`), no glifos; lo que solo se ve maquetado se mide en el navegador (el orquestador, al cierre).
- **Un suceso nuevo es un valor en el enum de Prisma + un miembro en `GAME_EVENT_TYPES` + su payload en la unión de `game-event.schema.ts` + un `case` en `linea-de-log.ts` y en `hilo/tipo-de-mensaje.ts`** (el `switch` es exhaustivo: sin el `case` no compila). La prueba `game-events.service.spec.ts` comprueba que enum y lista no se separan.
- **Migraciones a mano** (`apps/api/prisma/migrations/<timestamp>_<nombre>/migration.sql`, con comentario `-- Revertir:`), **una por tarea que la necesite**, aditivas; se aplican con `pnpm --filter @dnd/api exec prisma migrate deploy` — **nunca `migrate dev`** (resetea la base). Tras editar `schema.prisma`: `pnpm --filter @dnd/api exec prisma generate`. `ALTER TYPE … ADD VALUE` va en su propia sentencia, como en `20260913200200_character_xp`.
- **Transacciones solo por `this.prisma.transaction`** (`no-transaction-suelta.spec.ts` barre el código). `get()` de un encuentro se llama **fuera** de la transacción (una segunda conexión del pool con la primera tomada es el defecto que este proyecto arregló tres veces).
- **Proceso por tarea (D-CF-65, cierre acotado):** unitarias (API Jest / web Vitest+RTL) + **una mutación anotada en el informe** (qué se rompió, qué prueba enrojeció) + `pnpm update:estado` + `pnpm verify` limpio (**en primer plano, `timeout: 600000` como parámetro de la herramienta Bash, nunca `run_in_background`**) + un commit del orquestador. **Sin Playwright ni revisión Opus por tarea.** **Guarda 1:** si se renombra o retira un rótulo visible, `grep -rn "<rótulo viejo>" apps/web/e2e` y ajustar el spec en el mismo commit. **Guarda 2:** todo Bash que pueda pasar de 120 s lleva `timeout: 600000`. Los conteos de pruebas los genera `pnpm update:estado`; no se escriben a mano.
- **Frontera de herramientas de todo encargo** (`04-convenciones.md`): no desplegar, **no correr Playwright ni e2e de API** (se escriben; los corre el orquestador al cierre), no dejar `dev:api` arrancado, no commitear ni empujar, no lanzar agentes, no desactivar pruebas ni bajar umbrales, no rediseñar lo decidido. Un implementador por árbol; `WORKTREE_SLOT=1` si hay otro árbol.
- **No entra (spec §6):** multi-DM, revelar por sesión, des-revelar fichas del wiki (`hide` baja **solo** la instancia), statblock propio en la ficha del mundo, tokens en el tablero externo, terminar el combate solo cuando queda un bando.

## Decisiones de ejecución tomadas al escribir el plan (E-PM-*)

Lo que la spec dice y el código medido el 2026-09-14 (`main` = `ce0cc36`) pide precisar. Van a `docs/decisiones.md` en la Task 5; cada implementador las lee.

| | Decisión | Por qué |
|---|---|---|
| E-PM-1 | **`reveal`/`hide` viven en `NpcsService` (`apps/api/src/statblocks/`) y su ruta en un controlador nuevo `npc-visibility.controller.ts`** con prefijo `campaigns/:campaignId/characters/:characterId` dentro de `StatblocksModule` (que importa `GameEventsModule`) | Es el único servicio que ya tiene `StatblocksService` (para la plantilla) y `MembershipService`; la ruta de la spec cuelga de `characters`, y `CharactersController` no puede importar `NpcsService` sin un ciclo de módulos |
| E-PM-2 | **«Por debajo» de la mesa = `DM_ONLY`, `OWNER_DM` o `SPECIFIC_PLAYERS`** para la ficha del mundo; **`DM_ONLY` u `OWNER_DM`** para instancia y plantilla (que no admiten `SPECIFIC_PLAYERS`). `reveal` sube a `PLAYERS` lo que esté por debajo y **no toca** lo que ya está en `PLAYERS`/`PUBLIC`. Si nada cambia, responde 200 sin escribir ningún suceso | Idempotente; un segundo clic no escribe «entra en escena» dos veces |
| E-PM-3 | **`reveal` escribe `NPC_REVEALED` (`PLAYERS`, `subjectType: "character"`) y, si además subió la ficha del mundo, un `ENTITY_REVEALED` con la audiencia de la ficha** (`audienciaDeSuceso(comoRecursoVisible(entity))`, como hace `EntitiesService.update`) | `rules-engine/world-builder.ts` construye «qué se ha revelado» con las filas `ENTITY_REVEALED`; una ficha revelada por esta puerta tiene que contar igual que una revelada a mano |
| E-PM-4 | **`hide` escribe `NPC_HIDDEN` con visibilidad `DM_ONLY`** | El canal en vivo emite un aviso por cada suceso escrito, sin mirar su visibilidad (`live-bus.ts`: el aviso solo lleva tipo y campaña); sin suceso, la pantalla del jugador seguiría enseñando al bicho hasta el sondeo de 10 s |
| E-PM-5 | **«Cuerpos vivos» = `Character` con ese `entityId`, de la campaña y con `archivedAt: null`**, estén o no a 0 PG. Revelar desde la ficha del mundo (`EntitiesService.update`) los sube cuando la audiencia crece hasta `PLAYERS`/`PUBLIC`, y escribe un `NPC_REVEALED` por cuerpo | Un cuerpo derrotado sigue en el orden de turnos como «Cayó»; dejarlo oculto mientras la ficha se revela sería un hueco en la lista que el jugador puede contar |
| E-PM-6 | **`COMBATANT_LEFT` es `PLAYERS` y lleva `characterName` solo si el personaje es visible para la mesa (`PLAYERS`/`PUBLIC`) en ese momento**; sin nombre, la línea dice «Alguien sale del combate» | El `payload` no se filtra por espectador (mismo motivo que `TURN_ADVANCED` sin posiciones); el nombre de un oculto no puede viajar en un suceso `PLAYERS` |
| E-PM-7 | **Sacar solo con el encuentro `ACTIVE` (409 si no) y nunca al último combatiente (409: «Termina el combate»)**. Sacar a quien tenía el turno y estaba solo en su posición **avanza** con el helper `empezarTurno` extraído de `advanceTurn` (mismo `TURN_ADVANCED`, mismo `ROUND_ADVANCED` + reloj si era el último de la vuelta, misma reposición de economía y corte de condiciones `sourceStart`). Si compartía posición con idénticos, el turno sigue en el grupo (se sigue por identidad, como `setInitiative`). Si no tenía el turno, el turno se sigue por identidad y no se escribe ningún suceso de turno | Un encuentro `PREPARING` se cancela, no se vacía; un encuentro sin combatientes rompería `advanceTurn` (409 «no tiene combatientes») |
| E-PM-8 | **`DELETE …/combatants/:cid` responde 200 con el encuentro entero (`get()`)**, como `setSide` y `advanceTurn`, no 204 | La tira de iniciativa consume `Encounter`; un 204 obligaría a un segundo viaje |
| E-PM-9 | **`entityId` entra por `PATCH /characters/:id` (`updateCharacterSchema.entityId`, `cuid().nullable().optional()`) y por `POST /npcs` (`instantiateNpcSchema.entityId`, `cuid().optional()`)**. Las dos validan con `requireNpcEntity` (400 si no existe, no es de la campaña o no es `type: NPC`); `null` desenlaza. Solo el DM puede mandar `entityId` (403 al dueño, como con `level`) | Una sola regla de validación, dos puertas |
| E-PM-10 | **Redacción de `entityId`: `entityIdsVisibleFor(db, viewer, ids)` devuelve el `Set` de fichas que el espectador ve** y cada endpoint mapea `entityId: set.has(id) ? id : null`. Se aplica en las seis rutas de lectura listadas en las Global Constraints. **Queda fuera** (y va a `06-pendientes.md` en la Task 5): las respuestas de mutación de estado (`PATCH hp`, condiciones, descanso…) devuelven la fila cruda a DM o dueño; el dueño de un PNJ cedido con una ficha que no ve podría leer ahí el `entityId` | Son quince lecturas de `Character` en cinco servicios; cubrirlas todas en esta tanda es perseguir la completitud (memoria del autor: «el riesgo es perseguir la completitud») |
| E-PM-11 | **Revelar/ocultar solo se ofrece sobre PNJ y criaturas (`FichaDePnj`); «Sacar del combate» sobre cualquier combatiente (`FichaDePnj` y `FichaDeElenco`)**. En `TiraDeIniciativa`, «oculto · Revelar» se pinta al DM en cada turno cuyo grupo tenga algún PNJ con `sePuedeRevelar(visibility)` | La visibilidad de un personaje jugador es de su dueño (spec §3.2 habla de «PNJ y criaturas»); huir del combate sí le pasa a cualquiera |
| E-PM-12 | **En el elenco, el nombre del PNJ enlaza a `/campaigns/:id/entidades/:entityId` cuando llega `entityId`.** En el hilo **no** se enlaza en esta tanda (va a `06-pendientes.md`): `nombres-del-hilo.ts` resuelve nombres, no rutas, y abrirlo es una tanda con su ficha | Spec §3.4 dice «elenco y hilo»; el hilo pide tocar el renderizado de mensajes, fuera de la frontera de esta tanda |
| E-PM-13 | **«Ficha del mundo» en la hoja se ofrece al DM sobre cualquier personaje no archivado** (con o sin `statblockRef`), y al jugador solo se le enseña el enlace de lectura si llega `entityId` | Un «PNJ jugable» es un `Character` sin `statblockRef` (spec §2, cuarta fila) y también tiene ficha del mundo |
| E-PM-14 | **`VisibilityChooser` gana dos props opcionales, `legend` y `aclaracion`**, con los valores de hoy por defecto («Quién puede verlo», sin aclaración) | Los rótulos «Plantilla»/«En la mesa» (spec §3.4) se pasan desde el editor del statblock y desde los ajustes de un PNJ sin tocar a los demás consumidores ni sus e2e |
| E-PM-15 | **La prueba Playwright a dos navegadores se escribe en la Task 5 y la corre solo el orquestador al cierre** (`pnpm --filter @dnd/web exec playwright test e2e/pnj-del-mundo-en-vivo.spec.ts`), junto con los spec tocados (`combate.spec.ts`, `bestiario.spec.ts`, `sesion.spec.ts` si un rótulo cambió) | Spec §5: Playwright solo al cierre y solo en lo tocado; la suite entera la corre la CI |

## Mapa de ficheros

| Fichero | Responsabilidad | Tarea |
|---|---|---|
| `apps/api/prisma/schema.prisma` + `apps/api/prisma/migrations/20260914100000_character_entity_id/migration.sql` **(nuevo)** | `Character.entityId String?` + relación `entity` (`SetNull`) + índice; `Entity.bodies Character[]` | T0 |
| `packages/shared/src/character.schema.ts`, `statblock.schema.ts` | `updateCharacterSchema.entityId`, `instantiateNpcSchema.entityId` | T0 |
| `apps/api/src/common/entity-link.ts` **(nuevo)** (+ `entity-link.spec.ts`) | `requireNpcEntity`, `entityIdsVisibleFor` | T0 |
| `apps/api/src/characters/characters.service.ts` (+ `.spec.ts`) | `update` acepta `entityId` (DM, validado); `list`/`listArchived`/`get`/`update` redactan | T0 |
| `apps/api/src/characters/character-sheet.service.ts` (+ `.spec.ts`) | `getSheet` redacta `character.entityId` | T0 |
| `apps/api/src/statblocks/npcs.service.ts` (+ `.spec.ts`) | `instanciar` escribe `entityId`; `list` lo devuelve redactado (T0); `reveal`, `hide` (T1) | T0, T1 |
| `apps/api/test/pnj-del-mundo.e2e-spec.ts` **(nuevo)** | e2e API de la tanda, un `describe` por tarea; **se escribe por tarea, se corre al cierre** | T0–T2 |
| `apps/web/src/features/characters/api.ts`, `apps/web/src/features/bestiario/api.ts` | `Character.entityId?`, `NpcEnLaMesa.entityId?` (T0); `revealNpc`, `hideNpc` (T3) | T0, T3 |
| `apps/api/prisma/migrations/20260914100100_npc_reveal_events/migration.sql` **(nuevo)**, `schema.prisma` | `GameEventType.NPC_REVEALED`, `NPC_HIDDEN` | T1 |
| `packages/shared/src/game-event.schema.ts` | `NPC_REVEALED`, `NPC_HIDDEN` (T1); `COMBATANT_LEFT` (T2) | T1, T2 |
| `apps/web/src/features/sessions/linea-de-log.ts`, `sessions/hilo/tipo-de-mensaje.ts` | Línea y cubo de los tres sucesos | T1, T2 |
| `apps/api/src/statblocks/npc-visibility.controller.ts` **(nuevo)**, `statblocks.module.ts` | `POST …/characters/:characterId/reveal`, `…/hide` | T1 |
| `apps/api/src/entities/entities.service.ts` (+ `.spec.ts`) | `update` sube los cuerpos vivos al crecer la audiencia hasta la mesa | T1 |
| `apps/api/prisma/migrations/20260914100200_combatant_left_event/migration.sql` **(nuevo)**, `schema.prisma` | `GameEventType.COMBATANT_LEFT` | T2 |
| `apps/api/src/encounters/encounters.service.ts` (+ `.spec.ts`), `encounters.controller.ts` | `empezarTurno` (extraído), `removeCombatant`, `DELETE …/combatants/:combatantId` | T2 |
| `apps/web/src/features/encounters/api.ts`, `hooks.ts` | `removeCombatant`, `useRemoveCombatant` | T2 |
| `apps/web/src/features/bestiario/hooks.ts` | `useRevealNpc`, `useHideNpc` | T3 |
| `apps/web/src/features/sessions/elenco/AccionesDeMesa.ts` **(nuevo)** (+ `__tests__/AccionesDeMesa.test.tsx`) | `useAccionesDeMesa` → ítems «Revelar a la mesa» / «Ocultar» / «Sacar del combate» | T3 |
| `apps/web/src/features/sessions/elenco/MandosDeCombatiente.tsx`, `FichaDePnj.tsx`, `FichaDeElenco.tsx` (+ tests) | Props `accionesDeMesa`/`errorDeMesa`; enlace del nombre a la ficha del mundo | T3 |
| `apps/web/src/features/encounters/TiraDeIniciativa.tsx` (+ `__tests__/capa-de-combate.test.tsx`) | «oculto · Revelar» junto al turno | T3 |
| `apps/web/src/features/sessions/dm/RevelarAlgo.tsx` (+ `__tests__/RevelarAlgo.test.tsx` **nuevo**) | Filas de criaturas en escena que la mesa no ve | T3 |
| `apps/web/src/features/entities/SelectorDeFichaDelMundo.tsx` **(nuevo)** (+ test) | Buscador + radios de fichas `NPC`, con «Ninguna» | T4 |
| `apps/web/src/features/characters/FichaDelMundo.tsx` **(nuevo)** (+ test), `apps/web/src/pages/CharacterDetailPage.tsx` | «Ficha del mundo: Garrik · Cambiar · Quitar» en la hoja | T4 |
| `apps/web/src/features/bestiario/PanelDeBestiario.tsx` (+ test) | «¿De qué ficha del mundo es?» al bajar una criatura | T4 |
| `apps/web/src/features/bestiario/ALaMesa.tsx` **(nuevo)** (+ test), `apps/web/src/pages/EntityDetailPage.tsx` | «A la mesa» desde la ficha del mundo | T4 |
| `apps/web/src/features/entities/VisibilityChooser.tsx`, `bestiario/EditorDeStatblock.tsx`, `characters/AjustesDePersonaje.tsx`, `bestiario/PanelDeBestiario.tsx` | Rótulos «Plantilla» / «En la mesa» con su aclaración | T5 |
| `apps/web/e2e/pnj-del-mundo-en-vivo.spec.ts` **(nuevo)** | Dos navegadores: revelar desde el elenco → el jugador ve al Bandido sin recargar; sacar del combate lo quita en las dos pantallas | T5 (se escribe), orquestador (se corre) |
| `docs/05-datos.md`, `docs/decisiones.md`, `docs/08-pruebas.md`, `docs/01-arquitectura.md` | `entityId`, E-PM-* → D-CF-72…, la prueba nueva, las rutas nuevas | T5 |

---

### Task 0: El puente — `Character.entityId`, esquemas compartidos, `PATCH`, `POST /npcs`, redacción

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (modelo `Character`, ~línea 577; modelo `Entity`, ~línea 293)
- Create: `apps/api/prisma/migrations/20260914100000_character_entity_id/migration.sql`
- Modify: `packages/shared/src/character.schema.ts`, `packages/shared/src/statblock.schema.ts`
- Create: `apps/api/src/common/entity-link.ts`, `apps/api/src/common/entity-link.spec.ts`
- Modify: `apps/api/src/characters/characters.service.ts` (+ `characters.service.spec.ts`)
- Modify: `apps/api/src/characters/character-sheet.service.ts` (`getSheet`, ~línea 706) (+ `character-sheet.service.spec.ts`)
- Modify: `apps/api/src/statblocks/npcs.service.ts` (+ `npcs.service.spec.ts`)
- Create: `apps/api/test/pnj-del-mundo.e2e-spec.ts`
- Modify: `apps/web/src/features/characters/api.ts` (`Character`), `apps/web/src/features/bestiario/api.ts` (`NpcEnLaMesa`)

**Interfaces:**
- Consumes: `canView`, `comoRecursoVisible` (`common/visibility.ts`); `viewerFor` (`common/character-viewer.ts`); `MembershipService.getMembership/requireDM`.
- Produces (los usan T1, T3, T4):
  - `Character.entityId: string | null` en Prisma.
  - `updateCharacterSchema.entityId?: string | null`; `instantiateNpcSchema.entityId?: string`.
  - `requireNpcEntity(db: Prisma.TransactionClient | PrismaService, campaignId: string, entityId: string): Promise<Entity>` — lanza `BadRequestException` con texto «Esa ficha del mundo no existe en esta campaña o no es un PNJ.».
  - `entityIdsVisibleFor(db, viewer: Viewer, ids: (string | null)[]): Promise<Set<string>>`.
  - Web: `Character.entityId?: string | null`, `NpcEnLaMesa.entityId?: string | null`.

- [ ] **Step 1: Esquema y migración**

En `schema.prisma`, dentro de `model Character` (después de `statblockRef String?`):

```prisma
  /// PNJ del mundo y la mesa (2026-09-14, spec §3.1): **este cuerpo en la mesa es esta ficha del
  /// mundo.** Una ficha puede tener varios cuerpos (seis goblins de «Goblins del paso»); un cuerpo,
  /// como mucho una ficha. Solo fichas `type: NPC` de la misma campaña — lo valida el servidor
  /// (`common/entity-link.ts`), no la base. `SetNull`: borrar la ficha no borra al bicho.
  entityId String?
```

y en la lista de relaciones del mismo modelo:

```prisma
  entity             Entity?              @relation(fields: [entityId], references: [id], onDelete: SetNull)
```

y añade `@@index([entityId])` junto al `@@index([campaignId])`. En `model Entity`, tras `opensSessions`:

```prisma
  /// Los cuerpos en la mesa de esta ficha (`Character.entityId`). Lado inverso.
  bodies        Character[]
```

Migración `apps/api/prisma/migrations/20260914100000_character_entity_id/migration.sql`:

```sql
-- PNJ del mundo y la mesa (2026-09-14, spec §3.1): el cuerpo en la mesa cuelga de su ficha del
-- mundo. Aditiva y nulable; SetNull para que borrar la ficha no borre al bicho.
-- Revertir:
--   ALTER TABLE "Character" DROP CONSTRAINT "Character_entityId_fkey";
--   DROP INDEX "Character_entityId_idx";
--   ALTER TABLE "Character" DROP COLUMN "entityId";
ALTER TABLE "Character" ADD COLUMN "entityId" TEXT;
CREATE INDEX "Character_entityId_idx" ON "Character"("entityId");
ALTER TABLE "Character" ADD CONSTRAINT "Character_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

Run: `docker compose up -d` (si no está) y luego `pnpm --filter @dnd/api exec prisma migrate deploy` y `pnpm --filter @dnd/api exec prisma generate`.
Expected: «1 migration applied» y el cliente regenerado. Comprueba con `pnpm --filter @dnd/api exec prisma migrate status` que no queda ninguna pendiente.

- [ ] **Step 2: Esquemas compartidos**

`packages/shared/src/character.schema.ts`:

```ts
export const updateCharacterSchema = createCharacterSchema.partial().extend({
  /**
   * PNJ del mundo y la mesa (spec §3.1): la ficha del mundo de la que este cuerpo es. **Solo el DM**
   * (403 al dueño, como `level`); `null` desenlaza. El servidor exige `type: NPC` y misma campaña.
   */
  entityId: z.string().cuid().nullable().optional(),
});
```

`packages/shared/src/statblock.schema.ts`, dentro de `instantiateNpcSchema`:

```ts
  /** «¿De qué ficha del mundo es?» (spec §3.1). Opcional; misma validación que el `PATCH`. */
  entityId: z.string().cuid().optional(),
```

- [ ] **Step 3: Prueba unitaria del helper (falla)**

`apps/api/src/common/entity-link.spec.ts`:

```ts
import { BadRequestException } from "@nestjs/common";
import { entityIdsVisibleFor, requireNpcEntity } from "./entity-link";

describe("entity-link", () => {
  const dm = { userId: "dm", role: "DM" as const, isAdmin: false };
  const player = { userId: "pl", role: "PLAYER" as const, isAdmin: false };

  it("requireNpcEntity: 400 si no existe, es de otra campaña o no es NPC", async () => {
    const db = { entity: { findFirst: jest.fn().mockResolvedValue(null) } };
    await expect(requireNpcEntity(db as any, "c1", "e1")).rejects.toThrow(BadRequestException);
    expect(db.entity.findFirst).toHaveBeenCalledWith({
      where: { id: "e1", campaignId: "c1", type: "NPC" },
      include: { grants: true },
    });
  });

  it("requireNpcEntity devuelve la ficha cuando es un PNJ de la campaña", async () => {
    const ficha = { id: "e1", campaignId: "c1", type: "NPC", grants: [] };
    const db = { entity: { findFirst: jest.fn().mockResolvedValue(ficha) } };
    await expect(requireNpcEntity(db as any, "c1", "e1")).resolves.toBe(ficha);
  });

  it("entityIdsVisibleFor: el jugador solo recibe las fichas que canView le deja ver", async () => {
    const db = {
      entity: {
        findMany: jest.fn().mockResolvedValue([
          { id: "vis", visibility: "PLAYERS", createdById: "dm", grants: [] },
          { id: "oculta", visibility: "DM_ONLY", createdById: "dm", grants: [] },
        ]),
      },
    };
    const set = await entityIdsVisibleFor(db as any, player, ["vis", "oculta", null]);
    expect([...set]).toEqual(["vis"]);
    expect(db.entity.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["vis", "oculta"] } },
      include: { grants: true },
    });
  });

  it("entityIdsVisibleFor: sin ids no consulta la base", async () => {
    const db = { entity: { findMany: jest.fn() } };
    const set = await entityIdsVisibleFor(db as any, dm, [null, null]);
    expect(set.size).toBe(0);
    expect(db.entity.findMany).not.toHaveBeenCalled();
  });
});
```

Run: `pnpm --filter @dnd/api exec jest src/common/entity-link.spec.ts`
Expected: FAIL — `Cannot find module './entity-link'`.

- [ ] **Step 4: El helper**

`apps/api/src/common/entity-link.ts`:

```ts
import { BadRequestException } from "@nestjs/common";
import type { Entity, EntityVisibilityGrant, Prisma } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import { canView, comoRecursoVisible, type Viewer } from "./visibility";

// PNJ del mundo y la mesa (2026-09-14, spec §3.1 y §4) — **el único sitio que sabe dos cosas
// sobre `Character.entityId`**: qué fichas pueden ser el «mundo» de un cuerpo, y a quién se le
// enseña el enlace. Las dos puertas de escritura (`PATCH /characters/:id`, `POST /npcs`) validan
// con la primera; las seis lecturas que devuelven `entityId` redactan con la segunda.

type Db = Prisma.TransactionClient | PrismaService;
type EntityWithGrants = Entity & { grants: EntityVisibilityGrant[] };

export const ENTITY_NOT_NPC_MESSAGE =
  "Esa ficha del mundo no existe en esta campaña o no es un PNJ.";

/** 400 si la ficha no existe, es de otra campaña o no es `type: NPC`. Devuelve la ficha con sus concesiones. */
export async function requireNpcEntity(
  db: Db,
  campaignId: string,
  entityId: string,
): Promise<EntityWithGrants> {
  const entity = await db.entity.findFirst({
    where: { id: entityId, campaignId, type: "NPC" },
    include: { grants: true },
  });
  if (!entity) throw new BadRequestException(ENTITY_NOT_NPC_MESSAGE);
  return entity;
}

/**
 * De una lista de `entityId` (con nulos), las fichas que ESTE espectador puede ver. Una consulta
 * para toda la lista. **La existencia del enlace no puede filtrar que «Alguien» es Garrik**: quien
 * no ve la ficha recibe `entityId: null`.
 */
export async function entityIdsVisibleFor(
  db: Db,
  viewer: Viewer,
  ids: (string | null | undefined)[],
): Promise<Set<string>> {
  const unicos = [...new Set(ids.filter((id): id is string => !!id))];
  if (unicos.length === 0) return new Set();
  const fichas = await db.entity.findMany({
    where: { id: { in: unicos } },
    include: { grants: true },
  });
  return new Set(
    fichas.filter((f) => canView(viewer, comoRecursoVisible(f))).map((f) => f.id),
  );
}

/** `{ ...fila, entityId }` redactado contra el conjunto visible. */
export function conEntityIdVisible<T extends { entityId: string | null }>(
  fila: T,
  visibles: Set<string>,
): T {
  return { ...fila, entityId: fila.entityId && visibles.has(fila.entityId) ? fila.entityId : null };
}
```

Comprueba la firma de `comoRecursoVisible` en `common/visibility.ts:52` (recibe `{ visibility, createdById, grants }`); si pide otra forma, adapta la llamada, no el helper.

Run: `pnpm --filter @dnd/api exec jest src/common/entity-link.spec.ts`
Expected: PASS (4).

- [ ] **Step 5: Pruebas de `CharactersService` (fallan)**

Añade a `apps/api/src/characters/characters.service.spec.ts` (el mock `prisma` gana `entity: { findFirst: jest.fn(), findMany: jest.fn() }`):

```ts
  describe("entityId — el puente con la ficha del mundo (spec §3.1, §4)", () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
      prisma.character.findFirst.mockResolvedValue({ id: "ch1", ownerId: "pl", visibility: "PLAYERS", entityId: null });
      prisma.character.update.mockImplementation(async ({ data }: any) => ({ id: "ch1", ownerId: "pl", visibility: "PLAYERS", entityId: data.entityId ?? null }));
    });

    it("el dueño no puede enlazar: 403", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      await expect(service.update("pl", "c1", "ch1", { entityId: "e1" })).rejects.toThrow(ForbiddenException);
    });

    it("el DM enlaza solo con una ficha NPC de la campaña: 400 si no", async () => {
      prisma.entity.findFirst.mockResolvedValue(null);
      await expect(service.update("dm", "c1", "ch1", { entityId: "e1" })).rejects.toThrow(BadRequestException);
      expect(prisma.character.update).not.toHaveBeenCalled();
    });

    it("el DM enlaza, y `null` desenlaza sin consultar la ficha", async () => {
      prisma.entity.findFirst.mockResolvedValue({ id: "e1", type: "NPC", visibility: "DM_ONLY", createdById: "dm", grants: [] });
      prisma.entity.findMany.mockResolvedValue([{ id: "e1", visibility: "DM_ONLY", createdById: "dm", grants: [] }]);
      await service.update("dm", "c1", "ch1", { entityId: "e1" });
      expect(prisma.character.update).toHaveBeenCalledWith({ where: { id: "ch1" }, data: { entityId: "e1" } });
      prisma.entity.findFirst.mockClear();
      await service.update("dm", "c1", "ch1", { entityId: null });
      expect(prisma.entity.findFirst).not.toHaveBeenCalled();
      expect(prisma.character.update).toHaveBeenLastCalledWith({ where: { id: "ch1" }, data: { entityId: null } });
    });

    it("get(): el jugador no recibe el entityId de una ficha que no ve; el DM sí", async () => {
      prisma.character.findFirst.mockResolvedValue({ id: "ch1", ownerId: "dm", visibility: "PLAYERS", entityId: "e1" });
      prisma.entity.findMany.mockResolvedValue([{ id: "e1", visibility: "DM_ONLY", createdById: "dm", grants: [] }]);
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      expect((await service.get("pl", "c1", "ch1")).entityId).toBeNull();
      membership.getMembership.mockResolvedValue({ role: "DM" });
      expect((await service.get("dm", "c1", "ch1")).entityId).toBe("e1");
    });

    it("list(): redacta con una sola consulta a las fichas", async () => {
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      prisma.character.findMany.mockResolvedValue([
        { id: "a", ownerId: "dm", visibility: "PLAYERS", entityId: "vis" },
        { id: "b", ownerId: "dm", visibility: "PLAYERS", entityId: "oculta" },
      ]);
      prisma.entity.findMany.mockResolvedValue([
        { id: "vis", visibility: "PLAYERS", createdById: "dm", grants: [] },
        { id: "oculta", visibility: "DM_ONLY", createdById: "dm", grants: [] },
      ]);
      const filas = await service.list("pl", "c1");
      expect(filas.map((f) => f.entityId)).toEqual(["vis", null]);
      expect(prisma.entity.findMany).toHaveBeenCalledTimes(1);
    });
  });
```

Importa `BadRequestException` junto a `ForbiddenException`. Run: `pnpm --filter @dnd/api exec jest src/characters/characters.service.spec.ts`
Expected: FAIL (5 nuevas).

- [ ] **Step 6: `CharactersService`**

En `characters.service.ts`:

```ts
import { conEntityIdVisible, entityIdsVisibleFor, requireNpcEntity } from "../common/entity-link";
```

Un privado que redacta una lista:

```ts
  /** Spec §4: el enlace con la ficha del mundo solo viaja a quien puede ver la ficha. */
  private async redactarEnlaces<T extends { entityId: string | null }>(viewer: Viewer, filas: T[]) {
    const visibles = await entityIdsVisibleFor(this.prisma, viewer, filas.map((f) => f.entityId));
    return filas.map((f) => conEntityIdVisible(f, visibles));
  }
```

- `list` y `listArchived`: `return this.redactarEnlaces(viewer, characters.filter(...))`.
- `get`: `return (await this.redactarEnlaces(viewer, [character]))[0];`.
- `update`: junto a la comprobación de `level`, la de `entityId` (mismo 403 «Solo el DM puede enlazar un personaje con una ficha del mundo.»); si `input.entityId` es una cadena, `await requireNpcEntity(this.prisma, campaignId, input.entityId)`; `if (input.entityId !== undefined) data.entityId = input.entityId;`. Al final, `const fila = await this.prisma.character.update(...)` y devuelve `(await this.redactarEnlaces(viewer, [fila]))[0]` — para eso `update` necesita `const viewer = await viewerFor(this.prisma, this.membership, userId, campaignId);` (ya lo importa).

Run: `pnpm --filter @dnd/api exec jest src/characters/characters.service.spec.ts`
Expected: PASS (todas, incluidas las viejas: el mock `entity.findMany` devuelve `undefined` por defecto — si alguna vieja explota, pon `prisma.entity.findMany.mockResolvedValue([])` en el `beforeEach` general).

- [ ] **Step 7: `getSheet` redacta**

En `character-sheet.service.ts`, `getSheet` (~706): tras obtener `character` y `viewer`, antes del `return`:

```ts
    // Spec §4 de «PNJ del mundo y la mesa»: la hoja devuelve la fila entera, y el enlace con la
    // ficha del mundo solo viaja a quien puede ver la ficha.
    const enlacesVisibles = await entityIdsVisibleFor(this.prisma, viewer, [character.entityId]);
```

y en el objeto que sale, `character: conEntityIdVisible(personajeQueSale, enlacesVisibles)`. Prueba en `character-sheet.service.spec.ts` (busca el `describe` de `getSheet` y añade; el mock `prisma` gana `entity.findMany`):

```ts
    it("getSheet(): el jugador no recibe el entityId de una ficha del mundo que no ve", async () => {
      // Arranca del arreglo de la prueba de getSheet que ya exista en este fichero: mismo mock
      // del personaje visible, con `entityId: "e1"` añadido.
      prisma.entity.findMany.mockResolvedValue([{ id: "e1", visibility: "DM_ONLY", createdById: "dm", grants: [] }]);
      membership.getMembership.mockResolvedValue({ role: "PLAYER" });
      const hoja = await service.getSheet("pl", "c1", "ch1");
      expect(hoja.character.entityId).toBeNull();
    });
```

Run: `pnpm --filter @dnd/api exec jest src/characters/character-sheet.service.spec.ts`
Expected: PASS.

- [ ] **Step 8: `NpcsService.instanciar` y `list`**

Pruebas en `npcs.service.spec.ts` (el mock `prisma` gana `entity: { findFirst, findMany }`):

```ts
  it("instanciar con entityId valida la ficha y la escribe en cada fila", async () => {
    prisma.entity.findFirst.mockResolvedValue({ id: "e1", type: "NPC", grants: [] });
    // usa el arreglo de `instanciar` que ya exista en el fichero (statblock resuelto, tx mock)
    await service.instanciar("dm", "c1", { ref: "SRD:goblin", count: 2, hp: "AVERAGE", entityId: "e1" });
    const creadas = tx.character.create.mock.calls.map((c: any) => c[0].data.entityId);
    expect(creadas).toEqual(["e1", "e1"]);
  });

  it("instanciar con una ficha que no es NPC de la campaña: 400 y no crea nada", async () => {
    prisma.entity.findFirst.mockResolvedValue(null);
    await expect(service.instanciar("dm", "c1", { ref: "SRD:goblin", count: 1, hp: "AVERAGE", entityId: "e9" })).rejects.toThrow(BadRequestException);
    expect(prisma.transaction).not.toHaveBeenCalled();
  });

  it("list(): entityId redactado para quien no ve la ficha", async () => {
    // arreglo de `list` que ya exista: jugador, una fila PLAYERS con entityId "oculta"
    prisma.entity.findMany.mockResolvedValue([{ id: "oculta", visibility: "DM_ONLY", createdById: "dm", grants: [] }]);
    const filas = await service.list("pl", "c1");
    expect(filas[0].entityId).toBeNull();
  });
```

Implementación: en `instanciar`, tras resolver el statblock, `if (input.entityId) await requireNpcEntity(this.prisma, campaignId, input.entityId);` y cada fila lleva `entityId: input.entityId ?? null`; la salida de `instanciar` añade `entityId: c.entityId` (el DM lo ve siempre: `requireDM` ya decidió). En `list`, calcula `const enlacesVisibles = await entityIdsVisibleFor(this.prisma, viewer, filas.map((f) => f.entityId));` y en el `.map` añade `entityId: f.entityId && enlacesVisibles.has(f.entityId) ? f.entityId : null,` con el comentario: «**Spec §4**: la existencia del enlace no puede filtrar que «Alguien» es Garrik.»

Run: `pnpm --filter @dnd/api exec jest src/statblocks/npcs.service.spec.ts`
Expected: PASS.

- [ ] **Step 9: Tipos de la web**

`apps/web/src/features/characters/api.ts`, en `Character`:

```ts
  /**
   * **La ficha del mundo de la que este cuerpo es** (PNJ del mundo y la mesa, spec §3.1). `null`
   * si no tiene o si quien mira no puede ver la ficha — el servidor la redacta (spec §4).
   */
  entityId?: string | null;
```

`apps/web/src/features/bestiario/api.ts`, en `NpcEnLaMesa`: el mismo campo con el mismo comentario.

- [ ] **Step 10: e2e de API (se escribe, no se corre)**

`apps/api/test/pnj-del-mundo.e2e-spec.ts` — copia el arranque de `pnj-en-la-mesa.e2e-spec.ts` (registro de DM y jugador, campaña, invitación, `afterAll`) y añade una segunda campaña del DM (`otraCampanaId`) y dos fichas creadas por el DM con `POST /campaigns/:id/entities` (`{ type: "NPC", name: "Garrik", visibility: "DM_ONLY" }` → `garrikId`; `{ type: "LOCATION", name: "El paso", visibility: "PLAYERS" }` → `pasoId`; y en la otra campaña `{ type: "NPC", name: "Ajeno" }` → `ajenoId`). Un goblin bajado con `POST /campaigns/:id/npcs` `{ ref: "SRD:goblin" }` → `goblinId`.

```ts
  describe("Task 0 — el puente entityId", () => {
    it("un jugador no puede enlazar: 403", async () => {
      const r = await request(app.getHttpServer()).patch(ficha(goblinId)).set("Authorization", auth(tokenPL)).send({ entityId: garrikId });
      expect(r.status).toBe(403);
    });
    it("entityId de otra campaña → 400; de una ficha que no es PNJ → 400", async () => {
      for (const id of [ajenoId, pasoId]) {
        const r = await request(app.getHttpServer()).patch(ficha(goblinId)).set("Authorization", auth(tokenDM)).send({ entityId: id });
        expect(r.status).toBe(400);
      }
    });
    it("el DM enlaza; el jugador no recibe el entityId de una ficha que no ve, y sí cuando la ficha es PLAYERS", async () => {
      const s = app.getHttpServer();
      await request(s).patch(ficha(goblinId)).set("Authorization", auth(tokenDM)).send({ entityId: garrikId, visibility: "PLAYERS" }).expect(200);
      const dm = await request(s).get(ficha(goblinId)).set("Authorization", auth(tokenDM));
      expect(dm.body.entityId).toBe(garrikId);
      const pl = await request(s).get(`/campaigns/${campaignId}/npcs`).set("Authorization", auth(tokenPL));
      expect(pl.body.find((n: any) => n.id === goblinId).entityId).toBeNull();
      const hoja = await request(s).get(`${ficha(goblinId)}/sheet`).set("Authorization", auth(tokenPL));
      expect(hoja.body.character.entityId).toBeNull();
      await request(s).patch(`/campaigns/${campaignId}/entities/${garrikId}`).set("Authorization", auth(tokenDM)).send({ visibility: "PLAYERS" }).expect(200);
      const pl2 = await request(s).get(`/campaigns/${campaignId}/npcs`).set("Authorization", auth(tokenPL));
      expect(pl2.body.find((n: any) => n.id === goblinId).entityId).toBe(garrikId);
    });
    it("bajar una criatura con entityId la enlaza", async () => {
      const r = await request(app.getHttpServer()).post(`/campaigns/${campaignId}/npcs`).set("Authorization", auth(tokenDM)).send({ ref: "SRD:goblin", count: 2, entityId: garrikId });
      expect(r.status).toBe(201);
      expect(r.body.map((c: any) => c.entityId)).toEqual([garrikId, garrikId]);
    });
  });
```

Comprueba en `entities.e2e-spec.ts` la forma exacta del `POST /entities` (`type`, `name`, `visibility`) y ajusta.

- [ ] **Step 11: Mutación, estado, verify**

Mutación: comenta la línea `if (!entity) throw new BadRequestException(...)` de `requireNpcEntity` → deben enrojecer «400 si no existe…» (entity-link.spec) y «el DM enlaza solo con una ficha NPC…» (characters.service.spec). Anótalo en el informe y deshaz la mutación.

Run: `pnpm update:estado` y luego `pnpm verify` (primer plano, `timeout: 600000`).
Expected: verde. Informe: ficheros tocados, mutación, salida resumida de verify, cualquier desviación.

---

### Task 1: Revelar es una sola acción — `reveal`/`hide` con suceso y transacción, y la simetría desde la ficha del mundo

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (`enum GameEventType`)
- Create: `apps/api/prisma/migrations/20260914100100_npc_reveal_events/migration.sql`
- Modify: `packages/shared/src/game-event.schema.ts`
- Modify: `apps/web/src/features/sessions/linea-de-log.ts`, `apps/web/src/features/sessions/hilo/tipo-de-mensaje.ts` (+ `hilo/__tests__/tipo-de-mensaje.test.ts` si enumera tipos)
- Modify: `apps/api/src/statblocks/npcs.service.ts` (+ `.spec.ts`), `apps/api/src/statblocks/statblocks.module.ts`
- Create: `apps/api/src/statblocks/npc-visibility.controller.ts`
- Modify: `apps/api/src/entities/entities.service.ts` (`update`, ~línea 202) (+ `.spec.ts`)
- Modify: `apps/api/test/pnj-del-mundo.e2e-spec.ts`

**Interfaces:**
- Consumes: `Character.entityId` (T0); `StatblocksService.resolver(campaignId, ref, viewer?, tx?)`; `origenDeRef` (`@dnd/shared`); `GameEventsService.record(userId, campaignId, { sessionId?, subjectType, subjectId, visibility, grantedUserIds?, payload }, tx)`; `audienciaDeSuceso`, `comoRecursoVisible` (`common/visibility.ts`).
- Produces (los usa T3):
  - `POST /campaigns/:campaignId/characters/:characterId/reveal` → 200 `{ id, name, visibility, entityId, revealed: { character: boolean; entity: boolean; template: boolean } }`.
  - `POST /campaigns/:campaignId/characters/:characterId/hide` → 200 `{ id, name, visibility }`.
  - Sucesos `NPC_REVEALED { characterName: string; entityName?: string; templateRevealed?: boolean }` (`PLAYERS`) y `NPC_HIDDEN { characterName: string }` (`DM_ONLY`).

- [ ] **Step 1: Enum, migración, esquema compartido**

`schema.prisma`, al final de `enum GameEventType`:

```prisma
  // PNJ del mundo y la mesa (2026-09-14): revelar y ocultar una criatura desde la mesa.
  NPC_REVEALED
  NPC_HIDDEN
```

`apps/api/prisma/migrations/20260914100100_npc_reveal_events/migration.sql`:

```sql
-- PNJ del mundo y la mesa (2026-09-14, spec §3.2): «Garrik entra en escena» / se oculta.
-- Revertir: un valor de enum no se quita sin reescribir el tipo; se deja.
ALTER TYPE "GameEventType" ADD VALUE 'NPC_REVEALED';
ALTER TYPE "GameEventType" ADD VALUE 'NPC_HIDDEN';
```

Run: `pnpm --filter @dnd/api exec prisma migrate deploy && pnpm --filter @dnd/api exec prisma generate`.

`game-event.schema.ts`: añade `"NPC_REVEALED", "NPC_HIDDEN"` a `GAME_EVENT_TYPES` (al final, con comentario de una línea) y a la unión:

```ts
  /**
   * PNJ del mundo y la mesa (spec §3.2) — **una criatura entra en escena.** Lo escribe `reveal`
   * (una transacción, tres columnas). `entityName` va si además subió la ficha del mundo;
   * `templateRevealed` si subió la plantilla creada. Visibilidad `PLAYERS`: es el anuncio.
   */
  z.object({
    type: z.literal("NPC_REVEALED"),
    characterName: z.string().max(120),
    entityName: z.string().max(200).optional(),
    templateRevealed: z.boolean().optional(),
  }),
  /** Ocultar baja solo la instancia. `DM_ONLY`: existe para que el canal en vivo despierte a la mesa (E-PM-4). */
  z.object({
    type: z.literal("NPC_HIDDEN"),
    characterName: z.string().max(120),
  }),
```

Run: `pnpm --filter @dnd/shared build && pnpm --filter @dnd/api exec jest src/game-events/game-events.service.spec.ts`
Expected: PASS (enum y lista alineados).

- [ ] **Step 2: La web compila — línea y cubo**

`linea-de-log.ts`, junto a `ENTITY_REVEALED`:

```ts
    case "NPC_REVEALED":
      // «Garrik entra en escena», con su ficha del mundo si también se reveló (spec §3.2).
      return p.entityName && p.entityName !== p.characterName
        ? `${p.characterName} entra en escena — es ${p.entityName}`
        : `${p.characterName} entra en escena`;
    case "NPC_HIDDEN":
      return `${p.characterName} se oculta de la mesa`;
```

`tipo-de-mensaje.ts`: `NPC_REVEALED` va con `ENTITY_REVEALED` («el mundo hablando»); `NPC_HIDDEN` va en `"sistema"`. Si `hilo/__tests__/tipo-de-mensaje.test.ts` recorre `GAME_EVENT_TYPES` y espera un cubo por tipo, añade los dos. Prueba en `sessions/__tests__/linea-de-log.test.ts` (si existe; si no, en el test que ya cubra `ENTITY_REVEALED`):

```ts
  it("NPC_REVEALED y NPC_HIDDEN tienen frase", () => {
    expect(lineaDeLog({ type: "NPC_REVEALED", characterName: "Bandido", entityName: "Garrik" })).toBe("Bandido entra en escena — es Garrik");
    expect(lineaDeLog({ type: "NPC_REVEALED", characterName: "Garrik", entityName: "Garrik" })).toBe("Garrik entra en escena");
    expect(lineaDeLog({ type: "NPC_HIDDEN", characterName: "Bandido" })).toBe("Bandido se oculta de la mesa");
  });
```

Run: `pnpm --filter @dnd/web exec vitest run src/features/sessions` — Expected: PASS.

- [ ] **Step 3: Pruebas de `reveal`/`hide` (fallan)**

En `npcs.service.spec.ts` el módulo de prueba gana `{ provide: GameEventsService, useValue: gameEvents }` con `gameEvents = { record: jest.fn().mockResolvedValue(undefined) }`, y el mock `prisma` gana `entity: { findFirst, findMany, update }`, `campaignStatblock: { findFirst, update }`, `transaction: jest.fn((fn) => fn(prisma))`.

```ts
  describe("reveal / hide (spec §3.2)", () => {
    const goblin = { id: "g1", campaignId: "c1", name: "Bandido", ownerId: "dm", visibility: "DM_ONLY", statblockRef: "CAMPAIGN:sb1", entityId: "e1" };
    beforeEach(() => {
      membership.requireDM.mockResolvedValue({ role: "DM" });
      prisma.character.findFirst.mockResolvedValue(goblin);
      prisma.character.update.mockImplementation(async ({ data }: any) => ({ ...goblin, ...data }));
      prisma.entity.findFirst.mockResolvedValue({ id: "e1", name: "Garrik", visibility: "DM_ONLY", createdById: "dm", grants: [] });
      prisma.entity.update.mockImplementation(async ({ data }: any) => ({ id: "e1", name: "Garrik", createdById: "dm", grants: [], ...data }));
      prisma.campaignStatblock.findFirst.mockResolvedValue({ id: "sb1", campaignId: "c1", visibility: "DM_ONLY", createdById: "dm" });
    });

    it("sube las tres columnas en una transacción y escribe NPC_REVEALED y ENTITY_REVEALED", async () => {
      const r = await service.reveal("dm", "c1", "g1");
      expect(prisma.transaction).toHaveBeenCalledTimes(1);
      expect(prisma.character.update).toHaveBeenCalledWith({ where: { id: "g1" }, data: { visibility: "PLAYERS" } });
      expect(prisma.entity.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "e1" }, data: { visibility: "PLAYERS" } }));
      expect(prisma.campaignStatblock.update).toHaveBeenCalledWith({ where: { id: "sb1" }, data: { visibility: "PLAYERS" } });
      expect(r.revealed).toEqual({ character: true, entity: true, template: true });
      const tipos = gameEvents.record.mock.calls.map((c: any) => c[2].payload.type);
      expect(tipos).toEqual(["NPC_REVEALED", "ENTITY_REVEALED"]);
      expect(gameEvents.record.mock.calls[0][2]).toMatchObject({ visibility: "PLAYERS", subjectType: "character", subjectId: "g1", payload: { characterName: "Bandido", entityName: "Garrik", templateRevealed: true } });
    });

    it("no toca lo que ya está a la vista, y si nada cambia no escribe suceso", async () => {
      prisma.character.findFirst.mockResolvedValue({ ...goblin, visibility: "PLAYERS" });
      prisma.entity.findFirst.mockResolvedValue({ id: "e1", name: "Garrik", visibility: "PUBLIC", createdById: "dm", grants: [] });
      prisma.campaignStatblock.findFirst.mockResolvedValue({ id: "sb1", visibility: "PLAYERS", createdById: "dm" });
      const r = await service.reveal("dm", "c1", "g1");
      expect(r.revealed).toEqual({ character: false, entity: false, template: false });
      expect(prisma.character.update).not.toHaveBeenCalled();
      expect(gameEvents.record).not.toHaveBeenCalled();
    });

    it("una plantilla del libro no se toca; sin entityId no se toca ninguna ficha", async () => {
      prisma.character.findFirst.mockResolvedValue({ ...goblin, statblockRef: "SRD:goblin", entityId: null });
      const r = await service.reveal("dm", "c1", "g1");
      expect(r.revealed).toEqual({ character: true, entity: false, template: false });
      expect(prisma.campaignStatblock.findFirst).not.toHaveBeenCalled();
      expect(prisma.entity.findFirst).not.toHaveBeenCalled();
    });

    it("un jugador no revela: 403", async () => {
      membership.requireDM.mockRejectedValue(new ForbiddenException());
      await expect(service.reveal("pl", "c1", "g1")).rejects.toThrow(ForbiddenException);
    });

    it("hide baja solo la instancia a DM_ONLY y escribe NPC_HIDDEN como DM_ONLY", async () => {
      prisma.character.findFirst.mockResolvedValue({ ...goblin, visibility: "PLAYERS" });
      await service.hide("dm", "c1", "g1");
      expect(prisma.character.update).toHaveBeenCalledWith({ where: { id: "g1" }, data: { visibility: "DM_ONLY" } });
      expect(prisma.entity.update).not.toHaveBeenCalled();
      expect(prisma.campaignStatblock.update).not.toHaveBeenCalled();
      expect(gameEvents.record.mock.calls[0][2]).toMatchObject({ visibility: "DM_ONLY", payload: { type: "NPC_HIDDEN", characterName: "Bandido" } });
    });

    it("hide sobre uno ya oculto no escribe nada", async () => {
      await service.hide("dm", "c1", "g1");
      expect(prisma.character.update).not.toHaveBeenCalled();
      expect(gameEvents.record).not.toHaveBeenCalled();
    });
  });
```

Run: `pnpm --filter @dnd/api exec jest src/statblocks/npcs.service.spec.ts` — Expected: FAIL (`service.reveal is not a function`).

- [ ] **Step 4: `reveal` y `hide`**

En `npcs.service.ts`, inyecta `private readonly gameEvents: GameEventsService` (import de `../game-events/game-events.service`) y añade:

```ts
  /** Lo que «por debajo de la mesa» significa para cada columna (E-PM-2). */
  private static readonly BELOW_TABLE_ENTITY = new Set<Visibility>(["DM_ONLY", "OWNER_DM", "SPECIFIC_PLAYERS"]);
  private static readonly BELOW_TABLE_ROW = new Set<Visibility>(["DM_ONLY", "OWNER_DM"]);

  /**
   * **Revelar es una sola acción** (spec §3.2): sube la instancia a `PLAYERS`, y con ella la ficha
   * del mundo si está por debajo y la plantilla creada si está oculta. Una transacción, un botón,
   * tres columnas. Idempotente: lo que ya se ve no se toca, y si nada cambia no hay suceso.
   */
  async reveal(userId: string, campaignId: string, characterId: string) {
    await this.membership.requireDM(campaignId, userId);
    const character = await this.prisma.character.findFirst({ where: { id: characterId, campaignId } });
    if (!character) throw new NotFoundException("Character not found");

    return this.prisma.transaction(async (tx) => {
      const revealed = { character: false, entity: false, template: false };
      let fila = character;
      if (NpcsService.BELOW_TABLE_ROW.has(character.visibility)) {
        fila = await tx.character.update({ where: { id: characterId }, data: { visibility: "PLAYERS" } });
        revealed.character = true;
      }

      let entityName: string | undefined;
      let entidadSubida: (Entity & { grants: EntityVisibilityGrant[] }) | null = null;
      if (character.entityId) {
        const entity = await tx.entity.findFirst({ where: { id: character.entityId, campaignId }, include: { grants: true } });
        if (entity) {
          entityName = entity.name;
          if (NpcsService.BELOW_TABLE_ENTITY.has(entity.visibility)) {
            entidadSubida = await tx.entity.update({ where: { id: entity.id }, data: { visibility: "PLAYERS" }, include: { grants: true } });
            revealed.entity = true;
          }
        }
      }

      const origen = character.statblockRef ? origenDeRef(character.statblockRef) : null;
      if (origen?.source === "CAMPAIGN") {
        const plantilla = await tx.campaignStatblock.findFirst({ where: { id: origen.id, campaignId } });
        if (plantilla && NpcsService.BELOW_TABLE_ROW.has(plantilla.visibility as Visibility)) {
          await tx.campaignStatblock.update({ where: { id: plantilla.id }, data: { visibility: "PLAYERS" } });
          revealed.template = true;
        }
      }

      if (revealed.character || revealed.entity || revealed.template) {
        await this.gameEvents.record(userId, campaignId, {
          subjectType: "character",
          subjectId: characterId,
          visibility: "PLAYERS",
          payload: { type: "NPC_REVEALED", characterName: character.name, entityName, templateRevealed: revealed.template || undefined },
        }, tx);
      }
      if (entidadSubida) {
        // E-PM-3: `world-builder.ts` cuenta lo revelado por las filas ENTITY_REVEALED; esta puerta
        // no puede revelar una ficha sin que el motor de reglas se entere.
        await this.gameEvents.record(userId, campaignId, {
          subjectType: "campaign",
          subjectId: entidadSubida.id,
          ...audienciaDeSuceso(comoRecursoVisible(entidadSubida)),
          payload: { type: "ENTITY_REVEALED", entityName: entidadSubida.name },
        }, tx);
      }

      return { id: fila.id, name: fila.name, visibility: fila.visibility, entityId: fila.entityId, revealed };
    });
  }

  /** Ocultar baja **solo la instancia** (spec §3.2): lo que la mesa ya leyó, leído está. */
  async hide(userId: string, campaignId: string, characterId: string) {
    await this.membership.requireDM(campaignId, userId);
    const character = await this.prisma.character.findFirst({ where: { id: characterId, campaignId } });
    if (!character) throw new NotFoundException("Character not found");
    if (character.visibility === "DM_ONLY") return { id: character.id, name: character.name, visibility: character.visibility };
    return this.prisma.transaction(async (tx) => {
      const fila = await tx.character.update({ where: { id: characterId }, data: { visibility: "DM_ONLY" } });
      // E-PM-4: DM_ONLY, y existe para que el canal en vivo despierte la pantalla del jugador.
      await this.gameEvents.record(userId, campaignId, {
        subjectType: "character", subjectId: characterId, visibility: "DM_ONLY",
        payload: { type: "NPC_HIDDEN", characterName: character.name },
      }, tx);
      return { id: fila.id, name: fila.name, visibility: fila.visibility };
    });
  }
```

Imports: `NotFoundException`, `Visibility` y `origenDeRef` de `@dnd/shared`, `Entity`, `EntityVisibilityGrant` de `@prisma/client`, `audienciaDeSuceso`, `comoRecursoVisible` de `../common/visibility`. Comprueba que `comoRecursoVisible` acepta la fila con `grants` (mira su firma en `visibility.ts:52`). Si `StatblocksModule` no importa `GameEventsModule`, añádelo a `imports` (mira cómo lo hace `encounters.module.ts:21`).

Controlador `apps/api/src/statblocks/npc-visibility.controller.ts`:

```ts
import { Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { NpcsService } from "./npcs.service";

/**
 * PNJ del mundo y la mesa (spec §3.2) — revelar y ocultar una criatura desde la mesa. Cuelga de
 * `characters/:characterId` porque el sujeto es la fila de `Character`; vive en este módulo
 * (E-PM-1) porque es el que sabe subir la plantilla.
 */
@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/characters/:characterId")
export class NpcVisibilityController {
  constructor(private readonly npcs: NpcsService) {}

  @Post("reveal")
  reveal(@Req() req: { user: { id: string } }, @Param("campaignId") campaignId: string, @Param("characterId") characterId: string) {
    return this.npcs.reveal(req.user.id, campaignId, characterId);
  }

  @Post("hide")
  hide(@Req() req: { user: { id: string } }, @Param("campaignId") campaignId: string, @Param("characterId") characterId: string) {
    return this.npcs.hide(req.user.id, campaignId, characterId);
  }
}
```

Regístralo en `controllers` de `StatblocksModule`. Run: `pnpm --filter @dnd/api exec jest src/statblocks` — Expected: PASS.

- [ ] **Step 5: La simetría — `EntitiesService.update` sube los cuerpos vivos**

Prueba en `entities.service.spec.ts` (mira cómo el fichero arma `update` y `laAudienciaCrecio`; el mock `prisma`/`tx` gana `character: { findMany, updateMany }`):

```ts
  it("revelar la ficha desde el mundo sube sus cuerpos vivos y escribe un NPC_REVEALED por cuerpo (E-PM-5)", async () => {
    // arreglo: ficha NPC DM_ONLY del DM, PATCH { visibility: "PLAYERS" }
    tx.character.findMany.mockResolvedValue([
      { id: "g1", name: "Bandido 1", visibility: "DM_ONLY" },
      { id: "g2", name: "Bandido 2", visibility: "OWNER_DM" },
    ]);
    await service.update("dm", "c1", "e1", { visibility: "PLAYERS" });
    expect(tx.character.findMany).toHaveBeenCalledWith({
      where: { entityId: "e1", campaignId: "c1", archivedAt: null, visibility: { in: ["DM_ONLY", "OWNER_DM"] } },
      select: { id: true, name: true, visibility: true },
    });
    expect(tx.character.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["g1", "g2"] } }, data: { visibility: "PLAYERS" } });
    const tipos = gameEvents.record.mock.calls.map((c: any) => c[2].payload.type);
    expect(tipos.filter((t: string) => t === "NPC_REVEALED")).toHaveLength(2);
  });

  it("bajar la visibilidad de la ficha no toca a sus cuerpos", async () => {
    // arreglo: ficha PLAYERS, PATCH { visibility: "DM_ONLY" }
    await service.update("dm", "c1", "e1", { visibility: "DM_ONLY" });
    expect(tx.character.findMany).not.toHaveBeenCalled();
  });
```

Implementación, dentro del `if (crecio) { … }` de `update`, después del `ENTITY_REVEALED`:

```ts
        // PNJ del mundo y la mesa (spec §3.2, E-PM-5): revelar la ficha sube **todos sus cuerpos
        // vivos** en la campaña. Solo cuando la mesa entera pasa a verla: a `SPECIFIC_PLAYERS`
        // la audiencia crece pero no es «la mesa», y un cuerpo `PLAYERS` sería más público que su ficha.
        if (entity.visibility === "PLAYERS" || entity.visibility === "PUBLIC") {
          const cuerpos = await tx.character.findMany({
            where: { entityId, campaignId, archivedAt: null, visibility: { in: ["DM_ONLY", "OWNER_DM"] } },
            select: { id: true, name: true, visibility: true },
          });
          if (cuerpos.length > 0) {
            await tx.character.updateMany({ where: { id: { in: cuerpos.map((c) => c.id) } }, data: { visibility: "PLAYERS" } });
            for (const cuerpo of cuerpos) {
              await this.gameEvents.record(userId, campaignId, {
                subjectType: "character", subjectId: cuerpo.id, visibility: "PLAYERS",
                payload: { type: "NPC_REVEALED", characterName: cuerpo.name, entityName: entity.name },
              }, tx);
            }
          }
        }
```

Run: `pnpm --filter @dnd/api exec jest src/entities` — Expected: PASS.

- [ ] **Step 6: e2e de API (se escribe, no se corre)**

En `pnj-del-mundo.e2e-spec.ts`, nuevo `describe("Task 1 — revelar y ocultar")`: baja una criatura **creada** (`POST /statblocks` con `visibility: "DM_ONLY"` → `ref: "CAMPAIGN:<id>"`), enlázala a una ficha NPC `DM_ONLY` nueva («Vela»). Aserciones: (a) **antes** de `reveal`, `GET /npcs` del jugador no la lista y `GET /entities/:id` de la ficha da 404 al jugador; (b) `POST …/reveal` del jugador → 403; del DM → 200 con `revealed: { character: true, entity: true, template: true }`; (c) **después**, el jugador la lista con `statblockRef` no nulo y `entityId` de Vela, ve la ficha, y `GET /statblocks` le lista la plantilla; (d) el registro (`GET /campaigns/:id/events` o la ruta que use `hilo-mixto.e2e-spec.ts`) tiene un `NPC_REVEALED` con `entityName: "Vela"`; (e) `POST …/hide` → la criatura deja de listarse al jugador, pero la ficha y la plantilla siguen visibles; (f) un segundo `reveal` → `revealed` todo `false` y sin suceso nuevo. Y `describe("Task 1 bis — revelar desde la ficha")`: otra ficha NPC `DM_ONLY` con dos goblins enlazados `DM_ONLY`; `PATCH /entities/:id { visibility: "PLAYERS" }` → los dos goblins aparecen en `GET /npcs` del jugador.

- [ ] **Step 7: Mutación, estado, verify**

Mutación: en `reveal`, cambia `if (NpcsService.BELOW_TABLE_ROW.has(character.visibility))` por `if (true)` → enrojece «no toca lo que ya está a la vista». Anota y deshaz. Run: `pnpm update:estado` y `pnpm verify` (primer plano, `timeout: 600000`). Expected: verde.

---

### Task 2: Sacar del combate — `DELETE` combatiente con avance de turno

**Files:**
- Modify: `apps/api/prisma/schema.prisma`; Create: `apps/api/prisma/migrations/20260914100200_combatant_left_event/migration.sql`
- Modify: `packages/shared/src/game-event.schema.ts`; `apps/web/src/features/sessions/linea-de-log.ts`; `apps/web/src/features/sessions/hilo/tipo-de-mensaje.ts`
- Modify: `apps/api/src/encounters/encounters.service.ts` (`advanceTurn` ~885, nuevo `empezarTurno`, nuevo `removeCombatant`) (+ `encounters.service.spec.ts`)
- Modify: `apps/api/src/encounters/encounters.controller.ts`
- Modify: `apps/api/test/pnj-del-mundo.e2e-spec.ts`
- Modify: `apps/web/src/features/encounters/api.ts`, `apps/web/src/features/encounters/hooks.ts`

**Interfaces:**
- Consumes: `recolocar(tx, encounterId, antesDeLeer?)`, `bloquearEncuentro`, `SEGUNDOS_POR_ASALTO`, `GameClockService.advance`.
- Produces (los usa T3): `DELETE /campaigns/:campaignId/sessions/:sessionId/encounters/:encounterId/combatants/:combatantId` → 200 `Encounter` (la forma de `get()`); suceso `COMBATANT_LEFT { encounterId: string; characterName?: string }`; web `removeCombatant(campaignId, sessionId, encounterId, combatantId): Promise<Encounter>` y `useRemoveCombatant(campaignId, sessionId)` (`mutate({ encounterId, combatantId })`).

- [ ] **Step 1: Enum, migración, esquema, web compila**

`schema.prisma`: `COMBATANT_LEFT` al final del enum con comentario «Sacar del combate (PNJ del mundo y la mesa, spec §3.3)». Migración `20260914100200_combatant_left_event/migration.sql`:

```sql
-- PNJ del mundo y la mesa (2026-09-14, spec §3.3): «Garrik sale del combate».
-- Revertir: un valor de enum no se quita sin reescribir el tipo; se deja.
ALTER TYPE "GameEventType" ADD VALUE 'COMBATANT_LEFT';
```

Run: `migrate deploy` + `generate`. `game-event.schema.ts`: `"COMBATANT_LEFT"` en la lista y en la unión:

```ts
  /**
   * Sacar del combate (spec §3.3). `PLAYERS`; **`characterName` solo si el personaje es visible
   * para la mesa en ese momento** (E-PM-6) — el payload no se filtra por espectador.
   */
  z.object({
    type: z.literal("COMBATANT_LEFT"),
    encounterId: z.string().min(1).max(60),
    characterName: z.string().max(120).optional(),
  }),
```

`linea-de-log.ts`: `case "COMBATANT_LEFT": return p.characterName ? \`${p.characterName} sale del combate\` : "Alguien sale del combate";`. `tipo-de-mensaje.ts`: cubo `"sistema"`, junto a `COMBATANT_SIDE_CHANGED`. Prueba de línea como en T1.

- [ ] **Step 2: Pruebas de `removeCombatant` (fallan)**

En `encounters.service.spec.ts`, mira cómo las pruebas de `advanceTurn()` (~675) arman `prisma.encounter.findFirst`, `prisma.transaction`, `tx.encounter.update`, `tx.combatant.updateMany`, `events.record` y `clock.advance`, y reutiliza ese arreglo. El mock `tx` gana `combatant: { findMany, findFirst, delete, update, updateMany }`, `$queryRaw: jest.fn().mockResolvedValue([{ status: "ACTIVE" }])`. **Nota sobre `recolocar`**: lee con `tx.combatant.findMany` (dos veces: por id y por posición) y actualiza con `tx.combatant.update`; haz que `findMany` devuelva las filas que queden tras el borrado.

```ts
  describe("removeCombatant() — sacar del combate (spec §3.3, E-PM-7)", () => {
    const filas = (ids: string[]) => ids.map((id, i) => ({ id, characterId: `ch-${id}`, initiative: 20 - i * 5, groupKey: id, position: i, side: "ENEMY" }));

    it("404 si el combatiente no es de este encuentro", async () => {
      prisma.combatant.findFirst.mockResolvedValue(null);
      await expect(service.removeCombatant("dm", "c1", "s1", "e1", "x")).rejects.toThrow(NotFoundException);
    });

    it("409 si el encuentro no está ACTIVE", async () => {
      prisma.combatant.findFirst.mockResolvedValue({ id: "a", encounterId: "e1" });
      prisma.encounter.findFirst.mockResolvedValue({ id: "e1", status: "PREPARING", round: 1, activePosition: 0, combatants: filas(["a", "b"]) });
      await expect(service.removeCombatant("dm", "c1", "s1", "e1", "a")).rejects.toThrow(ConflictException);
    });

    it("409 al último combatiente: se termina el combate, no se vacía", async () => {
      prisma.combatant.findFirst.mockResolvedValue({ id: "a", encounterId: "e1" });
      prisma.encounter.findFirst.mockResolvedValue({ id: "e1", status: "ACTIVE", round: 1, activePosition: 0, combatants: filas(["a"]) });
      await expect(service.removeCombatant("dm", "c1", "s1", "e1", "a")).rejects.toThrow(ConflictException);
      expect(tx.combatant.delete).not.toHaveBeenCalled();
    });

    it("sacar a quien NO tiene el turno: el turno se sigue por identidad y no se escribe suceso de turno", async () => {
      // a (pos 0) tiene el turno; se saca a b (pos 1); c pasa de pos 2 a 1
      prisma.combatant.findFirst.mockResolvedValue({ id: "b", encounterId: "e1", characterId: "ch-b" });
      prisma.encounter.findFirst.mockResolvedValue({ id: "e1", status: "ACTIVE", round: 2, activePosition: 0, combatants: filas(["a", "b", "c"]) });
      prisma.character.findFirst.mockResolvedValue({ id: "ch-b", name: "Bandido", visibility: "PLAYERS" });
      tx.combatant.findMany.mockResolvedValue(filas(["a", "c"]).map((f, i) => ({ ...f, position: i })));
      await service.removeCombatant("dm", "c1", "s1", "e1", "b");
      expect(tx.combatant.delete).toHaveBeenCalledWith({ where: { id: "b" } });
      const tipos = events.record.mock.calls.map((c: any) => c[2].payload.type);
      expect(tipos).toEqual(["COMBATANT_LEFT"]);
      expect(events.record.mock.calls[0][2].payload.characterName).toBe("Bandido");
      expect(tx.encounter.update).toHaveBeenCalledWith({ where: { id: "e1" }, data: { activePosition: 0 } });
    });

    it("sacar a quien tiene el turno (solo en su posición) avanza al siguiente con TURN_ADVANCED, sin subir asalto", async () => {
      prisma.combatant.findFirst.mockResolvedValue({ id: "a", encounterId: "e1", characterId: "ch-a" });
      prisma.encounter.findFirst.mockResolvedValue({ id: "e1", status: "ACTIVE", round: 2, activePosition: 0, combatants: filas(["a", "b", "c"]) });
      prisma.character.findFirst.mockResolvedValue({ id: "ch-a", name: "Garrik", visibility: "DM_ONLY" });
      tx.combatant.findMany.mockResolvedValue(filas(["b", "c"]).map((f, i) => ({ ...f, position: i })));
      await service.removeCombatant("dm", "c1", "s1", "e1", "a");
      const tipos = events.record.mock.calls.map((c: any) => c[2].payload.type);
      expect(tipos).toEqual(["COMBATANT_LEFT", "TURN_ADVANCED"]);
      expect(events.record.mock.calls[0][2].payload.characterName).toBeUndefined(); // oculto: «Alguien»
      expect(tx.encounter.update).toHaveBeenCalledWith({ where: { id: "e1" }, data: { activePosition: 0, round: 2 } });
      expect(clock.advance).not.toHaveBeenCalled();
      expect(tx.combatant.updateMany).toHaveBeenCalledWith({ where: { encounterId: "e1", position: 0 }, data: { actionUsed: false, bonusUsed: false, reactionUsed: false, movementUsed: 0 } });
    });

    it("sacar al último de la vuelta cuando le toca sube de asalto UNA vez y avanza el reloj seis segundos", async () => {
      prisma.combatant.findFirst.mockResolvedValue({ id: "c", encounterId: "e1", characterId: "ch-c" });
      prisma.encounter.findFirst.mockResolvedValue({ id: "e1", status: "ACTIVE", round: 2, activePosition: 2, combatants: filas(["a", "b", "c"]) });
      prisma.character.findFirst.mockResolvedValue({ id: "ch-c", name: "Orco", visibility: "PLAYERS" });
      tx.combatant.findMany.mockResolvedValue(filas(["a", "b"]));
      clock.advance.mockResolvedValue({ to: 66 });
      await service.removeCombatant("dm", "c1", "s1", "e1", "c");
      const tipos = events.record.mock.calls.map((c: any) => c[2].payload.type);
      expect(tipos).toEqual(["COMBATANT_LEFT", "TURN_ADVANCED", "ROUND_ADVANCED"]);
      expect(tx.encounter.update).toHaveBeenCalledWith({ where: { id: "e1" }, data: { activePosition: 0, round: 3 } });
      expect(clock.advance).toHaveBeenCalledTimes(1);
    });

    it("sacar a uno de un grupo que tiene el turno: el turno se queda en el grupo", async () => {
      const grupo = [{ id: "g1", characterId: "ch-g1", initiative: 15, groupKey: "SRD:goblin", position: 0, side: "ENEMY" }, { id: "g2", characterId: "ch-g2", initiative: 15, groupKey: "SRD:goblin", position: 0, side: "ENEMY" }, { id: "p", characterId: "ch-p", initiative: 10, groupKey: "p", position: 1, side: "ALLY" }];
      prisma.combatant.findFirst.mockResolvedValue({ id: "g1", encounterId: "e1", characterId: "ch-g1" });
      prisma.encounter.findFirst.mockResolvedValue({ id: "e1", status: "ACTIVE", round: 1, activePosition: 0, combatants: grupo });
      prisma.character.findFirst.mockResolvedValue({ id: "ch-g1", name: "Goblin 1", visibility: "PLAYERS" });
      tx.combatant.findMany.mockResolvedValue(grupo.filter((g) => g.id !== "g1"));
      await service.removeCombatant("dm", "c1", "s1", "e1", "g1");
      const tipos = events.record.mock.calls.map((c: any) => c[2].payload.type);
      expect(tipos).toEqual(["COMBATANT_LEFT"]);
      expect(tx.encounter.update).toHaveBeenCalledWith({ where: { id: "e1" }, data: { activePosition: 0 } });
    });
  });
```

Run: `pnpm --filter @dnd/api exec jest src/encounters/encounters.service.spec.ts` — Expected: FAIL (`removeCombatant is not a function`).

- [ ] **Step 3: Extraer `empezarTurno` de `advanceTurn` y escribir `removeCombatant`**

En `encounters.service.ts`, mueve a un privado **todo lo que `advanceTurn` hace dentro de su transacción** (el `tx.encounter.update`, `TURN_ADVANCED`, el bloque `if (sube)` con `clock.advance` + `ROUND_ADVANCED`, el corte de condiciones `sourceStart` y la reposición de economía), con la única diferencia de que quiénes empiezan turno **se leen de `tx`** y no de la foto previa:

```ts
  /**
   * **Entrar en una posición del orden**: escribe el puntero (y el asalto si sube), los sucesos
   * `TURN_ADVANCED` / `ROUND_ADVANCED` (+ seis segundos de reloj), corta las condiciones
   * `sourceStart` y repone la economía de quien entra. Extraído de `advanceTurn` (PNJ del mundo y
   * la mesa, E-PM-7) para que **sacar a quien tenía el turno sea el mismo código** y no un segundo
   * avance que suba asalto dos veces. Los comentarios de cada bloque viven aquí, no en los llamadores.
   */
  private async empezarTurno(
    tx: Prisma.TransactionClient,
    p: { userId: string; campaignId: string; sessionId: string; encounterId: string; toPosition: number; roundBefore: number; sube: boolean },
  ): Promise<void> {
    const nuevoAsalto = p.sube ? p.roundBefore + 1 : p.roundBefore;
    await tx.encounter.update({ where: { id: p.encounterId }, data: { activePosition: p.toPosition, round: nuevoAsalto } });
    // … TURN_ADVANCED, if (p.sube) { clock.advance + ROUND_ADVANCED }, tal cual estaban …
    const empiezanTurno = (await tx.combatant.findMany({ where: { encounterId: p.encounterId, position: p.toPosition }, select: { characterId: true } })).map((c) => c.characterId);
    // … corte de condiciones sourceStart, updateMany de economía, tal cual estaban …
  }
```

`advanceTurn` queda: comprobaciones, cálculo de `posiciones`/`toPosition`/`sube`, `await this.prisma.transaction((tx) => this.empezarTurno(tx, { … }))`, y el `return { ...(await this.get(...)), roundAdvanced: sube }`. Sus pruebas deben seguir en verde (si alguna mockeaba `empiezanTurno` desde la foto previa, añade `tx.combatant.findMany` al arreglo — es una adaptación de mock, no un cambio de lo que demuestran).

`removeCombatant`:

```ts
  /**
   * Sacar del combate (spec §3.3). Quita la fila, renumera denso con `recolocar`, y si era su
   * turno y estaba solo en su posición, **avanza con `empezarTurno`** — el mismo código que
   * «Pasar turno», así que no hay forma de subir asalto dos veces. El personaje sigue en la campaña
   * con sus PG y condiciones. Si queda un solo bando, el combate NO termina solo (E-PM-7).
   */
  async removeCombatant(userId: string, campaignId: string, sessionId: string, encounterId: string, combatantId: string) {
    await this.membership.requireDM(campaignId, userId);
    await this.sesion(campaignId, sessionId);
    const combatiente = await this.prisma.combatant.findFirst({ where: { id: combatantId, encounterId, encounter: { sessionId } } });
    if (!combatiente) throw new NotFoundException("Ese combatiente no está en este combate.");
    const encounter = await this.prisma.encounter.findFirst({ where: { id: encounterId, sessionId }, include: { combatants: { orderBy: { position: "asc" } } } });
    if (!encounter) throw new NotFoundException("Encounter not found");
    if (encounter.status !== "ACTIVE") throw new ConflictException("Solo se saca a alguien de un combate en marcha; uno que no ha empezado se cancela.");
    if (encounter.combatants.length <= 1) throw new ConflictException("Es el último combatiente: termina el combate en vez de sacarlo.");
    // E-PM-6: el nombre solo viaja si la mesa puede verlo; el payload no se filtra por espectador.
    const personaje = await this.prisma.character.findFirst({ where: { id: combatiente.characterId }, select: { id: true, name: true, visibility: true } });
    const nombreParaLaMesa = personaje && (personaje.visibility === "PLAYERS" || personaje.visibility === "PUBLIC") ? personaje.name : undefined;

    // Antes de tocar nada: quién tenía el turno, y quién iría después si el que sale era el único en su posición.
    const posiciones = [...new Set(encounter.combatants.map((c) => c.position))].sort((a, b) => a - b);
    const enElTurno = encounter.combatants.filter((c) => c.position === encounter.activePosition);
    const saleConElTurno = enElTurno.some((c) => c.id === combatantId);
    const soloEnSuPosicion = saleConElTurno && enElTurno.length === 1;
    const indiceActual = posiciones.indexOf(encounter.activePosition);
    const indiceSiguiente = (indiceActual + 1) % posiciones.length;
    const sube = soloEnSuPosicion && indiceSiguiente === 0;
    const siguienteRepresentante = encounter.combatants.find((c) => c.position === posiciones[indiceSiguiente] && c.id !== combatantId);
    const representanteDelTurno = enElTurno.find((c) => c.id !== combatantId) ?? encounter.combatants.find((c) => c.position === encounter.activePosition && c.id !== combatantId);

    await this.prisma.transaction(async (tx) => {
      const filas = await recolocar(tx, encounterId, async () => {
        await tx.combatant.delete({ where: { id: combatantId } });
      });
      await this.events.record(userId, campaignId, {
        sessionId, subjectType: "encounter", subjectId: encounterId, visibility: "PLAYERS",
        payload: { type: "COMBATANT_LEFT", encounterId, characterName: nombreParaLaMesa },
      }, tx);

      if (soloEnSuPosicion) {
        const destino = filas.find((f) => f.id === siguienteRepresentante?.id);
        const toPosition = destino?.position ?? filas[0]?.position ?? 0;
        await this.empezarTurno(tx, { userId, campaignId, sessionId, encounterId, toPosition, roundBefore: encounter.round, sube });
      } else {
        // El turno se sigue por identidad, como en `setInitiative`: el número puede cambiar al renumerar.
        const fila = filas.find((f) => f.id === representanteDelTurno?.id);
        const nuevaActiva = fila?.position ?? encounter.activePosition;
        await tx.encounter.update({ where: { id: encounterId }, data: { activePosition: nuevaActiva } });
      }
    });
    return this.get(userId, campaignId, sessionId, encounterId);
  }
```

**Cuidado con `sube`**: solo cuando el que sale era el único en la última posición y tenía el turno (`indiceSiguiente === 0`). Si tras el borrado `posiciones.length` baja, `indiceSiguiente` se calculó sobre las posiciones **de antes**, que es lo correcto: el siguiente es el siguiente de antes, que sigue existiendo. Controlador:

```ts
  /**
   * PNJ del mundo y la mesa (spec §3.3) — sacar del combate. Responde con el encuentro entero
   * (E-PM-8), como `setSide`: la tira lo consume tal cual.
   */
  @Delete(":encounterId/combatants/:combatantId")
  removeCombatant(@Req() req: { user: { id: string } }, @Param("campaignId") campaignId: string, @Param("sessionId") sessionId: string, @Param("encounterId") encounterId: string, @Param("combatantId") combatantId: string) {
    return this.encounters.removeCombatant(req.user.id, campaignId, sessionId, encounterId, combatantId);
  }
```

Run: `pnpm --filter @dnd/api exec jest src/encounters` — Expected: PASS (todas).

- [ ] **Step 4: Web — API y hook**

`encounters/api.ts`:

```ts
/** Sacar del combate (spec §3.3). Solo DM; el servidor devuelve el encuentro entero (E-PM-8). */
export function removeCombatant(campaignId: string, sessionId: string, encounterId: string, combatantId: string): Promise<Encounter> {
  return apiFetch<Encounter>(`${base(campaignId, sessionId)}/${encounterId}/combatants/${combatantId}`, { method: "DELETE" });
}
```

`encounters/hooks.ts`, con el patrón de `useSetSide`:

```ts
export function useRemoveCombatant(campaignId: string, sessionId: string | undefined) {
  const invalidar = useInvalidar(campaignId, sessionId);
  return useMutation({
    mutationFn: (p: { encounterId: string; combatantId: string }) =>
      encountersApi.removeCombatant(campaignId, sessionId!, p.encounterId, p.combatantId),
    onSuccess: invalidar,
  });
}
```

Prueba en `encounters/__tests__/` (mira si hay un test de hooks; si no, la cubre T3 desde el menú).

- [ ] **Step 5: e2e de API (se escribe, no se corre)**

`describe("Task 2 — sacar del combate")` en `pnj-del-mundo.e2e-spec.ts`: sesión en curso (mira `encounters.e2e-spec.ts` para crearla y empezar un encuentro con `POST …/encounters { characterIds, sides }` sobre tres PNJ del DM, que tiran en el servidor y el encuentro nace `ACTIVE`). Aserciones: (a) jugador → 403; (b) sacar al que **no** tiene el turno: `combatants` baja a 2, `activePosition` sigue señalando al mismo `characterId`, `round` igual; (c) sacar al que tiene el turno cuando es el **último de la vuelta**: `round` sube exactamente 1, `activePosition` 0, y `GET /campaigns/:id/clock` (o donde viva `clockSeconds`) avanzó **6** segundos, no 12; (d) el registro tiene un `COMBATANT_LEFT` por cada sacado; (e) sacar al último → 409; (f) el personaje sacado sigue en `GET /npcs`.

- [ ] **Step 6: Mutación, estado, verify**

Mutación: en `removeCombatant`, fuerza `const sube = false;` → enrojece «sacar al último de la vuelta… sube de asalto UNA vez». Anota y deshaz. `pnpm update:estado` + `pnpm verify` (primer plano, `timeout: 600000`). Expected: verde.

---

### Task 3: La mesa — menú «…», aviso en el orden de turnos, «Revelar algo» con criaturas

**Files:**
- Modify: `apps/web/src/features/bestiario/api.ts`, `apps/web/src/features/bestiario/hooks.ts`
- Create: `apps/web/src/features/sessions/elenco/AccionesDeMesa.ts`, `apps/web/src/features/sessions/elenco/__tests__/AccionesDeMesa.test.tsx`
- Modify: `apps/web/src/features/sessions/elenco/MandosDeCombatiente.tsx`, `FichaDePnj.tsx`, `FichaDeElenco.tsx` (+ `__tests__/FichaDeElenco.test.tsx`, `__tests__/ColumnaElenco.test.tsx` si el mock de `MandosDeCombatiente` lo pide)
- Modify: `apps/web/src/features/encounters/TiraDeIniciativa.tsx` (+ `__tests__/capa-de-combate.test.tsx`)
- Modify: `apps/web/src/features/sessions/dm/RevelarAlgo.tsx`; Create: `apps/web/src/features/sessions/dm/__tests__/RevelarAlgo.test.tsx`

**Interfaces:**
- Consumes: `POST …/reveal|hide` (T1), `useRemoveCombatant` (T2), `NpcEnLaMesa.entityId` (T0), `sePuedeRevelar` (`entities/BotonRevelar.tsx`), `AccionDeMenu` (`ui/MenuDeAcciones.tsx`), `npcsKey`, `encountersKey`.
- Produces: `revealNpc(campaignId, characterId)`, `hideNpc(campaignId, characterId)`; `useRevealNpc(campaignId)`, `useHideNpc(campaignId)` (`mutate(characterId)`); `useAccionesDeMesa(p): { acciones: AccionDeMenu[]; error: string | null }`; props `accionesDeMesa?: AccionDeMenu[]`, `errorDeMesa?: string | null` en `MandosDeCombatiente`.

- [ ] **Step 1: API y hooks del bestiario**

`bestiario/api.ts`:

```ts
/** Revelar es una sola acción (spec §3.2): instancia, ficha del mundo y plantilla creada, en una transacción. */
export function revealNpc(campaignId: string, characterId: string): Promise<{ id: string; visibility: string; revealed: { character: boolean; entity: boolean; template: boolean } }> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/reveal`, { method: "POST" });
}
/** Ocultar baja solo la instancia. */
export function hideNpc(campaignId: string, characterId: string): Promise<{ id: string; visibility: string }> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/hide`, { method: "POST" });
}
```

`bestiario/hooks.ts`:

```ts
/**
 * Revelar/ocultar desde la mesa. Invalida **toda la campaña** (`["campaigns", id]`: PNJ, fichas
 * del mundo, plantillas, registro) y el encuentro en curso (`encountersKey`, que empieza por
 * "encounters" y queda fuera del prefijo — la misma trampa que documenta `live/canal.ts`).
 */
function useInvalidarLaMesa(campaignId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["campaigns", campaignId] });
    void qc.invalidateQueries({ queryKey: encountersKey(campaignId) });
  };
}
export function useRevealNpc(campaignId: string) {
  const invalidar = useInvalidarLaMesa(campaignId);
  return useMutation({ mutationFn: (characterId: string) => bestiarioApi.revealNpc(campaignId, characterId), onSuccess: invalidar });
}
export function useHideNpc(campaignId: string) {
  const invalidar = useInvalidarLaMesa(campaignId);
  return useMutation({ mutationFn: (characterId: string) => bestiarioApi.hideNpc(campaignId, characterId), onSuccess: invalidar });
}
```

(`encountersKey` se importa de `../encounters/hooks`; comprueba que no crea un ciclo de imports — `encounters/hooks.ts` no importa de `bestiario`.)

- [ ] **Step 2: Prueba del hook de acciones (falla)**

`elenco/__tests__/AccionesDeMesa.test.tsx`:

```tsx
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { useAccionesDeMesa } from "../AccionesDeMesa";
import * as bestiarioApi from "../../../bestiario/api";
import * as encountersApi from "../../../encounters/api";

vi.mock("../../../bestiario/api");
vi.mock("../../../encounters/api");

const envoltorio = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);
const base = { campaignId: "c1", characterId: "g1", nombre: "Bandido", sessionId: "s1", encounterId: "e1", combatanteId: "cb1", enCombate: true, esDm: true };

describe("useAccionesDeMesa", () => {
  it("con un PNJ oculto ofrece «Revelar a la mesa» y «Sacar del combate»; con uno visible, «Ocultar»", () => {
    const oculto = renderHook(() => useAccionesDeMesa({ ...base, visibility: "DM_ONLY" }), { wrapper: envoltorio });
    expect(oculto.result.current.acciones.map((a) => a.rotulo)).toEqual(["Revelar a la mesa", "Sacar del combate"]);
    const visible = renderHook(() => useAccionesDeMesa({ ...base, visibility: "PLAYERS" }), { wrapper: envoltorio });
    expect(visible.result.current.acciones.map((a) => a.rotulo)).toEqual(["Ocultar", "Sacar del combate"]);
  });

  it("sin visibility (un personaje jugador) solo ofrece sacar; sin encuentro no ofrece sacar", () => {
    const pj = renderHook(() => useAccionesDeMesa({ ...base, visibility: undefined }), { wrapper: envoltorio });
    expect(pj.result.current.acciones.map((a) => a.rotulo)).toEqual(["Sacar del combate"]);
    const fuera = renderHook(() => useAccionesDeMesa({ ...base, visibility: "DM_ONLY", enCombate: false, encounterId: undefined, combatanteId: undefined }), { wrapper: envoltorio });
    expect(fuera.result.current.acciones.map((a) => a.rotulo)).toEqual(["Revelar a la mesa"]);
  });

  it("quien no es DM no recibe ninguna", () => {
    const r = renderHook(() => useAccionesDeMesa({ ...base, esDm: false, visibility: "DM_ONLY" }), { wrapper: envoltorio });
    expect(r.result.current.acciones).toEqual([]);
  });

  it("«Revelar a la mesa» llama a reveal; «Sacar del combate» llama a DELETE con el combatante", async () => {
    vi.mocked(bestiarioApi.revealNpc).mockResolvedValue({ id: "g1", visibility: "PLAYERS", revealed: { character: true, entity: false, template: false } });
    vi.mocked(encountersApi.removeCombatant).mockResolvedValue({} as any);
    const r = renderHook(() => useAccionesDeMesa({ ...base, visibility: "DM_ONLY" }), { wrapper: envoltorio });
    await act(async () => r.result.current.acciones[0].onSelect());
    expect(bestiarioApi.revealNpc).toHaveBeenCalledWith("c1", "g1");
    await act(async () => r.result.current.acciones[1].onSelect());
    expect(encountersApi.removeCombatant).toHaveBeenCalledWith("c1", "s1", "e1", "cb1");
  });

  it("el rechazo del servidor se devuelve en `error`, no se traga", async () => {
    vi.mocked(bestiarioApi.hideNpc).mockRejectedValue(new Error("Solo el DM"));
    const r = renderHook(() => useAccionesDeMesa({ ...base, visibility: "PLAYERS" }), { wrapper: envoltorio });
    await act(async () => r.result.current.acciones[0].onSelect());
    expect(r.result.current.error).toBe("Solo el DM");
  });
});
```

Run: `pnpm --filter @dnd/web exec vitest run src/features/sessions/elenco/__tests__/AccionesDeMesa.test.tsx` — Expected: FAIL.

- [ ] **Step 3: El hook**

`elenco/AccionesDeMesa.ts`:

```ts
import type { Visibility } from "@dnd/shared";
import { sePuedeRevelar } from "../../entities/BotonRevelar";
import { useHideNpc, useRevealNpc } from "../../bestiario/hooks";
import { useRemoveCombatant } from "../../encounters/hooks";
import type { AccionDeMenu } from "../../../ui/MenuDeAcciones";

/**
 * **Revelar a la mesa / Ocultar / Sacar del combate**, como ítems del menú «…» del elenco (PNJ
 * del mundo y la mesa, spec §3.2 y §3.3). Hermano de `useAccionesDeBando`: el hook se llama
 * siempre y es la lista la que queda vacía cuando no toca. Revelar/ocultar solo con `visibility`
 * (los PNJ, E-PM-11); sacar solo con encuentro y combatiente. Todo es del DM: `esDm` decide, y la
 * puerta real sigue siendo `requireDM` en el servidor.
 */
export function useAccionesDeMesa(p: {
  campaignId: string; characterId: string; nombre: string; esDm: boolean;
  visibility?: Visibility | string; sessionId?: string; encounterId?: string; combatanteId?: string; enCombate: boolean;
}): { acciones: AccionDeMenu[]; error: string | null } {
  const revelar = useRevealNpc(p.campaignId);
  const ocultar = useHideNpc(p.campaignId);
  const sacar = useRemoveCombatant(p.campaignId, p.sessionId);
  if (!p.esDm) return { acciones: [], error: null };
  const acciones: AccionDeMenu[] = [];
  if (p.visibility !== undefined) {
    const oculto = sePuedeRevelar(p.visibility as Visibility);
    acciones.push(oculto
      ? { id: "revelar", rotulo: "Revelar a la mesa", descripcion: "Sube a la mesa a esta criatura, su ficha del mundo y su plantilla si estaban ocultas.", disabled: revelar.isPending, motivo: revelar.isPending ? "Revelando" : undefined, onSelect: () => revelar.mutate(p.characterId) }
      : { id: "ocultar", rotulo: "Ocultar", descripcion: "Solo esta criatura; lo que la mesa ya leyó, leído está.", disabled: ocultar.isPending, motivo: ocultar.isPending ? "Ocultando" : undefined, onSelect: () => ocultar.mutate(p.characterId) });
  }
  if (p.enCombate && p.sessionId && p.encounterId && p.combatanteId) {
    const encounterId = p.encounterId, combatantId = p.combatanteId;
    acciones.push({ id: "sacar", rotulo: "Sacar del combate", descripcion: "Sale del orden de turnos; sigue en la campaña con sus PG y condiciones.", disabled: sacar.isPending, motivo: sacar.isPending ? "Sacando del combate" : undefined, onSelect: () => sacar.mutate({ encounterId, combatantId }) });
  }
  const error = [revelar, ocultar, sacar].find((m) => m.isError);
  return { acciones, error: error ? (error.error as Error).message : null };
}
```

Mira en `ui/MenuDeAcciones.tsx` qué campos tiene `AccionDeMenu` (`id`, `rotulo`, `icono?`, `descripcion?`, `disabled?`, `motivo?`, `onSelect`) y ajusta; añade iconos dibujados de `ui/Iconos.tsx` si existen (`IconoOjo` para revelar/ocultar; para «Sacar» busca uno de salida o déjalo sin icono como los de bando). Run el test — Expected: PASS.

- [ ] **Step 4: `MandosDeCombatiente`, `FichaDePnj`, `FichaDeElenco`**

`MandosDeCombatiente`: props `accionesDeMesa: AccionDeMenu[] = []`, `errorDeMesa: string | null = null`; en `acciones` del `MenuDeAcciones`, entre «Su hoja» y `...accionesDeBando`, `...accionesDeMesa`; bajo el `errorDeBando`, el mismo `<p role="alert">` para `errorDeMesa`. `FichaDePnj`: `const { acciones: accionesDeMesa, error: errorDeMesa } = useAccionesDeMesa({ campaignId, characterId: pnj.id, nombre: pnj.name, esDm, visibility: pnj.visibility, sessionId, encounterId, combatanteId, enCombate });` y pásalos; **y el nombre enlaza a la ficha del mundo** (E-PM-12): si `pnj.entityId`, el `<p>` del nombre envuelve un `<Link to={\`/campaigns/${campaignId}/entidades/${pnj.entityId}\`} className="underline-offset-2 hover:underline">` (import de `react-router-dom`). `FichaDeElenco`: mismo hook **sin `visibility`** (solo «Sacar del combate»), pasando `esDm: conMandos`. Añade a `__tests__/FichaDeElenco.test.tsx` un caso: «con encuentro y combatiente, el menú del DM ofrece "Sacar del combate"» (abre el menú «Más acciones sobre …» y busca el `menuitem`), y a un test de `FichaDePnj` (créalo en `__tests__/FichaDePnj.test.tsx` si no existe, con los mocks de hooks que use `ColumnaElenco.test.tsx`): «un PNJ oculto ofrece "Revelar a la mesa"; uno visible, "Ocultar"; y con `entityId` el nombre es un enlace a su ficha».

Run: `pnpm --filter @dnd/web exec vitest run src/features/sessions/elenco` — Expected: PASS.

- [ ] **Step 5: «oculto · Revelar» en el orden de turnos**

En `TiraDeIniciativa.tsx`, dentro del `<li>` de cada turno, después del rótulo «Cayó» y antes de «Corregir», solo para el DM:

```tsx
              {esDm && ocultosDe(grupo).length > 0 && (
                // Spec §3.2: un combatiente oculto en el orden se dice y se arregla desde aquí.
                <span className="flex items-center gap-1 font-chrome text-chrome-xs text-muted">
                  oculto ·
                  <button type="button" onClick={() => revelar.mutate(ocultosDe(grupo)[0].id)} disabled={revelar.isPending}
                    aria-label={`Revelar a ${nombres}`} className="underline-offset-2 hover:text-copper-text hover:underline">
                    Revelar
                  </button>
                </span>
              )}
```

con `const revelar = useRevealNpc(campaignId);` y `const ocultosDe = (grupo: Encounter["combatants"]) => grupo.map((c) => pnjs.find((p) => p.id === c.characterId)).filter((p): p is NpcEnLaMesa => !!p && sePuedeRevelar(p.visibility as Visibility));`. Si el grupo tiene varios ocultos (seis goblins), un clic revela **uno**; el siguiente clic, el siguiente — anótalo en un comentario y en el informe (revelar el grupo entero de una vez es una decisión que no está tomada). Error de `revelar` bajo la lista, con `role="alert"` como los de pasar turno. Prueba en `__tests__/capa-de-combate.test.tsx` (mira cómo monta `TiraDeIniciativa` con `pnjs`): «el DM ve "oculto · Revelar" junto a un PNJ DM_ONLY y no junto a uno PLAYERS; un jugador no lo ve».

- [ ] **Step 6: «Revelar algo» lista criaturas**

`RevelarAlgo.tsx`: `const { data: pnjs } = useNpcs(campaignId);` y `const criaturasOcultas = (pnjs ?? []).filter((p) => sePuedeRevelar(p.visibility as Visibility));`; el buscador filtra también por su nombre; el listado pinta primero las fichas y luego una `FilaDeCriatura` por criatura con `ETIQUETA_CRIATURA = "Criatura en la mesa"` como tipo, el `Badge` de su visibilidad, la misma confirmación en fila («¿Se lo enseñas a la mesa?») y un botón «Revelar a la mesa» que llama a `useRevealNpc`. El vacío pasa a «No queda nada oculto en esta campaña: la mesa lo ve todo, fichas y criaturas.» (**Guarda 1**: `grep -rn "No queda nada oculto" apps/web/e2e` y ajusta el spec si lo cita). Prueba nueva `dm/__tests__/RevelarAlgo.test.tsx`: con `useAllEntities` → una ficha oculta y `useNpcs` → un PNJ `DM_ONLY` y otro `PLAYERS`, se pintan dos filas (ficha y criatura), la criatura con «Criatura en la mesa», y confirmar llama a `revealNpc`.

- [ ] **Step 7: Mutación, estado, verify**

Mutación: en `useAccionesDeMesa`, invierte `oculto` (`!sePuedeRevelar(...)`) → enrojece «con un PNJ oculto ofrece…». Anota y deshaz. **Guarda 1** sobre todos los rótulos tocados (`grep -rn "Más acciones sobre\|Revelar a la mesa\|No queda nada oculto" apps/web/e2e`). `pnpm update:estado` + `pnpm verify` (primer plano, `timeout: 600000`). Expected: verde.

---

### Task 4: Enlazar — al sacar una criatura, en la hoja, y «A la mesa» desde la ficha del mundo

**Files:**
- Create: `apps/web/src/features/entities/SelectorDeFichaDelMundo.tsx`, `apps/web/src/features/entities/__tests__/SelectorDeFichaDelMundo.test.tsx`
- Create: `apps/web/src/features/characters/FichaDelMundo.tsx`, `apps/web/src/features/characters/__tests__/FichaDelMundo.test.tsx`; Modify: `apps/web/src/pages/CharacterDetailPage.tsx`
- Modify: `apps/web/src/features/bestiario/PanelDeBestiario.tsx` (`FichaDeCriatura`, `onBajar`) (+ `__tests__/PanelDeBestiario.test.tsx`)
- Create: `apps/web/src/features/bestiario/ALaMesa.tsx`, `apps/web/src/features/bestiario/__tests__/ALaMesa.test.tsx`; Modify: `apps/web/src/pages/EntityDetailPage.tsx`

**Interfaces:**
- Consumes: `updateCharacterSchema.entityId`, `instantiateNpcSchema.entityId` (T0); `useEntities(campaignId, "NPC", q)`, `useEntity(campaignId, "NPC", entityId, enabled)` (`entities/hooks.ts`); `useUpdateCharacter` (`mutateAsync({ characterId, input })`); `useInstantiateNpc`; `useStatblocks`; `Badge`, `fieldControlClass`, `Dialog`, `Button`.
- Produces: `SelectorDeFichaDelMundo({ campaignId, value: string | null, onChange(next: string | null), etiqueta?: string })`; `FichaDelMundo({ campaignId, character, esDm })`; `ALaMesa({ campaignId, entity })`.

- [ ] **Step 1: El selector (prueba, luego componente)**

Prueba: con `useEntities` mockeado devolviendo dos fichas NPC («Garrik» `DM_ONLY`, «Vela» `PLAYERS`), se pintan **radios** con nombre y `Badge`, más «Ninguna»; escribir «ve» en «Buscar una ficha del mundo» deja solo Vela; elegir llama a `onChange("vela-id")`; «Ninguna» llama a `onChange(null)`; con `value` puesto, ese radio está `checked`. Componente: `fieldset` con `legend` = `etiqueta ?? "Ficha del mundo"`, input de búsqueda (`aria-label="Buscar una ficha del mundo"`, `fieldControlClass`), radios `name` con `useId()`, frase bajo el legend: «Enlaza este cuerpo con su ficha del mundo: revelar uno revela al otro.» Lista acotada a `type: NPC` por el hook. Vacío: «No hay fichas de PNJ en el mundo todavía.»

- [ ] **Step 2: «Ficha del mundo» en la hoja**

`FichaDelMundo.tsx`: para el DM (`esDm`), una `TarjetaDeHoja` (mira `Tarjeta.tsx`) con título «Ficha del mundo»: si `character.entityId`, «Es **{nombre}**» (por `useEntity(campaignId, "NPC", character.entityId, true)`) con `Link` a `/campaigns/:id/entidades/:entityId` y dos botones «Cambiar» (abre el selector en línea) y «Quitar» (`mutateAsync({ characterId, input: { entityId: null } })`); si no, «Sin ficha del mundo» y «Enlazar» (abre el selector). El selector guarda al elegir (radio = acción, como `AjustesDePersonaje`), con el error del servidor en línea. Para el jugador: solo si `character.entityId`, la línea «Es {nombre}» con el enlace, sin botones; sin `entityId`, no se monta nada. `CharacterDetailPage.tsx`: monta `<FichaDelMundo campaignId={id} character={personaje} esDm={esDM} />` junto a `AjustesDePersonaje` (misma columna, encima), solo si `personaje.archivedAt === null`. Prueba: DM sin enlace → «Enlazar» abre el selector y elegir llama a `updateCharacter` con `{ entityId }`; DM con enlace → nombre, enlace, «Cambiar», «Quitar» (llama con `null`); jugador con enlace → nombre y enlace, sin botones; jugador sin enlace → nada.

- [ ] **Step 3: «¿De qué ficha del mundo es?» al bajar una criatura**

En `PanelDeBestiario.tsx`, `FichaDeCriatura` gana estado `fichaDelMundo: string | null` y un botón de texto «¿De qué ficha del mundo es?» (solo si `puedeBajar`) que despliega `SelectorDeFichaDelMundo` (etiqueta «De qué ficha del mundo es»); `onBajar(ref, cuantos, entityId)` pasa el tercer argumento y `bajar.mutate({ ref, count, hp: "AVERAGE", entityId: entityId ?? undefined })`. El mensaje de éxito, si hubo `entityId`, dice «… está en la mesa, enlazado con su ficha del mundo. Solo lo ves tú hasta que lo reveles.» Prueba en `PanelDeBestiario.test.tsx`: desplegar, elegir «Garrik», «Bajar a la mesa» → `instantiateNpc` recibe `entityId`.

- [ ] **Step 4: «A la mesa» desde la ficha del mundo**

`ALaMesa.tsx`: botón «A la mesa» (icono `IconoBestiario`) que abre un `Dialog` «A la mesa» con subtítulo «Elige la plantilla; el cuerpo nace enlazado con esta ficha y solo lo ves tú.»: buscador + **radios** de plantillas (`useStatblocks`: `[...campaign, ...srd]`, nombre + «del libro»/«de la campaña» + `Badge` si tiene `visibility`), nombre (prellenado con `entity.name`, editable), cantidad (1–10, como `FichaDeCriatura`), y «Bajar a la mesa» → `useInstantiateNpc().mutate({ ref, count, hp: "AVERAGE", name, entityId: entity.id })`. Éxito: `role="status"` «Garrik está en la mesa. Solo lo ves tú hasta que lo reveles.» y cierra. `EntityDetailPage.tsx`: junto a `BotonRevelar`/`BotonEjecutar`, `{esDM && entity.type === "NPC" && <ALaMesa campaignId={id} entity={entity} />}`. Prueba: solo con plantilla elegida se puede bajar; el `instantiateNpc` recibe `entityId` y el nombre de la ficha.

- [ ] **Step 5: Mutación, estado, verify**

Mutación: en `ALaMesa`, deja de pasar `entityId` → enrojece su prueba. Anota y deshaz. **Guarda 1**: `grep -rn "Bajar a la mesa\|Ficha del mundo" apps/web/e2e`. `pnpm update:estado` + `pnpm verify` (primer plano, `timeout: 600000`). Expected: verde.

---

### Task 5: Rótulos «Plantilla» / «En la mesa», la prueba a dos navegadores (escrita), documentación

**Files:**
- Modify: `apps/web/src/features/entities/VisibilityChooser.tsx` (+ test si existe), `apps/web/src/features/bestiario/EditorDeStatblock.tsx` (~línea 520), `apps/web/src/features/characters/AjustesDePersonaje.tsx` (`VisibilityChooser`, ~línea 199), `apps/web/src/features/bestiario/PanelDeBestiario.tsx` (`FichaDeCriatura`)
- Create: `apps/web/e2e/pnj-del-mundo-en-vivo.spec.ts`
- Modify: `docs/05-datos.md`, `docs/decisiones.md`, `docs/08-pruebas.md`, `docs/01-arquitectura.md`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: `VisibilityChooser` props `legend?: string`, `aclaracion?: string`.

- [ ] **Step 1: `VisibilityChooser` con `legend` y `aclaracion`**

Props nuevas con defecto (`legend = "Quién puede verlo"`, `aclaracion?`); la aclaración se pinta bajo el `legend` como `<p className="mb-s2 font-chrome text-chrome-xs text-muted">`. Prueba (en el test del chooser si existe, o uno nuevo): sin props pinta «Quién puede verlo» y ninguna aclaración; con ellas, las pinta.

- [ ] **Step 2: Los rótulos**

- `EditorDeStatblock.tsx`: `legend="Quién ve la plantilla"`, `aclaracion="Afecta a la plantilla del Bestiario. Cada criatura ya en la mesa tiene su propia visibilidad; «Revelar a la mesa» sube las dos."`.
- `AjustesDePersonaje.tsx`: si `character.statblockRef`, `legend="Quién ve a esta criatura en la mesa"` y `aclaracion="Afecta solo a este cuerpo en la mesa, no a la plantilla ni a la ficha del mundo. Si la plantilla es creada y está oculta, el jugador verá a la criatura pero no sus números."` (frase **verificada contra `npcs.service.list` y `resolverParaHoja`**: la instancia se lista por su propia visibilidad; los números salen de la plantilla). Sin `statblockRef`, sin cambios.
- `FichaDeCriatura` (`PanelDeBestiario.tsx`): un rótulo `Plantilla` (mismo estilo que el `h3` «En la mesa»: `font-chrome text-chrome-xs uppercase tracking-wide text-muted`) en la cabecera de la tarjeta, antes del nombre. **Guarda 1**: `grep -rn "Quién puede verlo\|Plantilla" apps/web/e2e` — si `bestiario.spec.ts` cuenta rótulos o usa `getByText("Plantilla")` de otra cosa, ajusta.

- [ ] **Step 3: La prueba a dos navegadores (se escribe; la corre el orquestador)**

`apps/web/e2e/pnj-del-mundo-en-vivo.spec.ts`, con los helpers de `iniciativa-en-vivo.spec.ts` (`registrarse`, `crearPersonajeConHoja`, `generarInvitacion`, `unirseDesdeInvitacion`, `empezarSesion`, `abrirLaMesa` — cópialos, ese spec no los exporta). Recorrido:

1. DM crea campaña, Thora (con hoja); jugadora se une y crea a Zero.
2. DM, **por la API** (`page.request`, token de `localStorage` `dnd_token`): `POST /api/campaigns/:id/npcs { ref: "SRD:bandit", name: "Bandido" }` → `banditoId` (nace `DM_ONLY`). Comprueba en `monsters-srd.ts` la clave exacta del bandido (`bandit`) — si no está en los quince, usa `goblin` y llámalo «Bandido» por `name`.
3. Sesión en curso; las dos abren la mesa. DM «Entrar en combate», marca Thora, Zero y Bandido, «Pedir iniciativa»; la jugadora «Tirar iniciativa»; el DM ve «Orden de turnos».
4. **Aserción de partida**: la jugadora **no** ve «Bandido» en `region "Orden de turnos"`; el DM ve «oculto» junto a Bandido.
5. DM abre el menú «Más acciones sobre Bandido» en el elenco y elige «Revelar a la mesa».
6. **Sin recargar**: `await expect(jugadora.getByRole("region", { name: "Orden de turnos" }).getByText("Bandido")).toBeVisible({ timeout: 10_000 })`; y en el hilo de la jugadora «Bandido entra en escena».
7. DM abre el menú de Bandido y elige «Sacar del combate».
8. **En las dos pantallas**: `toHaveCount(0)` de «Bandido» dentro de «Orden de turnos», con `timeout: 10_000` en la jugadora; y «Bandido sale del combate» en el hilo.

`test.setTimeout(180_000)`. **No lo corras** (frontera del encargo); deja en el informe el comando exacto: `pnpm --filter @dnd/web exec playwright test e2e/pnj-del-mundo-en-vivo.spec.ts`.

- [ ] **Step 4: Documentación**

- `docs/05-datos.md`: `Character.entityId` (semántica, `SetNull`, validación en servidor, redacción al cliente) y los tres sucesos nuevos en la lista de `GameEventType` si el documento la lleva.
- `docs/01-arquitectura.md`: las tres rutas nuevas (`reveal`, `hide`, `DELETE combatants/:id`) donde el documento liste rutas o módulos; `NpcVisibilityController` en `StatblocksModule` (E-PM-1).
- `docs/decisiones.md`: E-PM-1…E-PM-15 como `D-CF-72`…`D-CF-86` (una fila cada una, con enlace a este plan), fechadas 2026-09-14.
- `docs/08-pruebas.md`: la prueba nueva a dos navegadores (qué demuestra, cómo se corre por fichero) y el e2e de API `pnj-del-mundo.e2e-spec.ts` en la tabla de suites; **los conteos de e2e solo aquí**.
- `docs/06-pendientes.md`: dos fichas nuevas — «`entityId` en respuestas de mutación» (E-PM-10) y «el nombre en el hilo no enlaza a la ficha del mundo» (E-PM-12), más «revelar un grupo entero desde el orden de turnos» (T3, paso 5). **No toques 07 ni como-seguir**: los escribe el orquestador al cierre.

`pnpm check:docs` en verde.

- [ ] **Step 5: Mutación, estado, verify**

Mutación: en `AjustesDePersonaje`, pasa el `legend` de criatura también sin `statblockRef` → enrojece la prueba de `AjustesDePersonaje` (añade una si no distingue: «un personaje jugador sigue leyendo "Quién puede verlo"»). Anota y deshaz. `pnpm update:estado` + `pnpm verify` (primer plano, `timeout: 600000`). Expected: verde.

---

## Al cerrar la tanda (lo hace el orquestador; spec §5, cierre acotado)

1. **e2e de API**: `pnpm --filter @dnd/api exec jest --config test/jest-e2e.json test/pnj-del-mundo.e2e-spec.ts` (`timeout: 600000`); arreglar en la ola.
2. **Una revisión Opus de la rama entera** (`git diff main...HEAD`) + **una ola de arreglo**.
3. **Playwright solo en lo tocado**: `pnpm --filter @dnd/web exec playwright test e2e/pnj-del-mundo-en-vivo.spec.ts e2e/combate.spec.ts e2e/bestiario.spec.ts` (+ cualquier spec que la Guarda 1 tocara), con `WORKTREE_SLOT=1` si el puerto 3000 está ocupado. **Sin suite entera**: la corre la CI en el push.
4. Docs del cierre: `07-historial.md` (hito), `06-pendientes.md`, `08-pruebas.md`, `como-seguir.md` §0, `pnpm update:estado`.
5. `git push -u origin pnj-del-mundo/antes-del-paso-3`. **No fusionar, no desplegar, no arrancar el paso 3.** Avisar al autor y a la sesión controladora viva.
