# La puerta de efectos — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que una actividad ya autorizada pueda **curar a otro personaje, pedirle una salvación y aplicarle el daño de esa salvación al responderla**; que el daño de un ataque resuelto **se aplique con un clic** desde el hilo, con el preview calculado por el servidor; que una condición pueda durar **«hasta el próximo descanso»** y el descanso la retire con suceso; y que exista **la experiencia** (`Character.xp`), con «dar XP» desde la mesa, la propuesta por VD al terminar un combate y el aviso en la hoja — sin que nada suba de nivel solo (D-CF-66).

**Architecture:** Dos métodos internos nuevos con `tx` obligatorio y **sin ruta** —`CharacterSheetService.changeHpFromEffect` y `RollRequestsService.createFromEffect`— son la «segunda puerta» (precedente `GameEventsService.recordFromEngine`): la autorización la hizo `ActivitiesService.usar` con `canView`; las puertas no la repiten. El daño de una salvación se **tira una vez** en `usar`, viaja en `RollRequest.pendingEffect` y se aplica en `answer` **dentro de la misma transacción que cierra la petición**. El daño de un ataque viaja en el payload del `ABILITY_ROLL` (`pendingDamage`) y dos endpoints nuevos lo previsualizan y aplican (idempotencia por `jsonb_set … WHERE appliedEventId IS NULL`). `CharacterCondition.expiresOnRest` es una duración que `RestService.rest` resuelve borrando con `CONDITION_REMOVED`. `Character.xp` + suceso `XP_AWARDED` + regla de la mesa `progresion` (`HITO` por defecto, para que ninguna campaña cambie); `EncountersService.end` **propone** el reparto por VD solo en modo `XP`.

**Tech Stack:** NestJS + Prisma 5 (Postgres 16) · Zod en `packages/shared` · React 18 + TanStack Query + Tailwind · Vitest/RTL · Jest (unit y e2e API) · Playwright.

**Spec:** [docs/superpowers/specs/2026-09-12-la-puerta-de-efectos-design.md](../specs/2026-09-12-la-puerta-de-efectos-design.md) — §3 segunda puerta, §4 daño de salvación (P2-5), §4 bis bandeja de daño, §5 «hasta el próximo descanso», **§5 bis XP** (D-CF-68, D-CF-69), §6 seguridad, §7 pruebas, §9 decisiones. Proceso: **D-CF-65** (`docs/decisiones.md`, `docs/04-convenciones.md`). Cierra P2-4, P2-5 y la ficha «XP» de `docs/06-pendientes.md`.

## Global Constraints

Copiadas de la spec, de `CLAUDE.md` y de `docs/04-convenciones.md`; toda tarea las incluye:

- **La autorización se comprueba en el servidor.** `requireEditable` **no se toca**; el `PATCH` de una ficha ajena sigue en 403. Las dos puertas nuevas **exigen `tx`** y **no tienen ruta**: una prueba afirma que ningún controlador las importa. Dar XP exige DM; aplicar el daño de la bandeja exige dueño-o-DM **sobre el objetivo**; los listados filtran por `canView`.
- **`canView` (`apps/api/src/common/visibility.ts`) es el dueño único de «quién ve qué».** `requireVisibleCharacter` ya lo aplica en `usar`; nada lo reimplementa.
- **Validación de entrada: Zod desde `@dnd/shared` vía `ZodValidationPipe`.** Ningún DTO a mano. La forma de los datos vive una sola vez en `packages/shared/src`. **`pendingEffect` y `pendingDamage` no están en ningún esquema de entrada HTTP**: los escribe solo el servidor.
- **Código en inglés en la API y en shared; identificadores de la spec en español donde la spec los nombra** (`pendingEffect.signo`, `siSalva`, `tipoDeDano`, `actividadKey`, `progresion`, `xpPropuesto`, `porCabeza`) porque son el contrato. Interfaz y documentación en español. **Ningún valor de enumeración llega a la pantalla**: `SHORT`/`LONG`, `HITO`/`XP`, `resistant`/`vulnerable`/`immune` pasan por un vocabulario (`character-sheet/vocabulario.ts`, `campaigns/reglas.ts`, `sessions/hilo/`).
- **Regla de interfaz vinculante:** opciones con significado son **radios con su frase**, no `<select>`; un valor que no se puede elegir se enseña **marcado y no seleccionable con su motivo**, nunca escondido; si el texto explica una regla del servidor y discrepan, **miente el texto**; **lo que solo se ve maquetado se mide en el navegador** (el orquestador, al cierre).
- **Cita del SRD 5.1 en inglés** en el código donde se aplica la regla y en el commit. Fuentes ya verificadas en la spec: *Saving Throws* («successful if the total equals or exceeds the DC»), *Fireball* («half as much damage on a successful one»), *Damage Rolls* («roll the damage once for all of them»), *Rounding Down*, *Resting* («until you finish a long rest»), *Beyond 1st Level* (tabla *Character Advancement*), *Monsters · Experience Points* («Typically, XP is awarded for defeating the monster…»; tabla *Experience Points by Challenge Rating*). Foundry dnd5e (`Mine/referencia-foundry-dnd5e`, **solo lectura**, carpetas SIN sufijo 24) como segunda opinión: `module/config.mjs:4147,4158`, `module/applications/award.mjs`.
- **Migraciones a mano** (`apps/api/prisma/migrations/<timestamp>_<nombre>/migration.sql`, con comentario `-- Revertir:`), **una por tarea que la necesite y con su nombre**, todas aditivas con default o nulables; se aplican con `pnpm --filter @dnd/api exec prisma migrate deploy` — **nunca `migrate dev`** (resetea la base). Tras editar `schema.prisma`: `pnpm --filter @dnd/api exec prisma generate`.
- **Proceso por tarea (D-CF-65):** unitarias + **una mutación anotada en el informe** (qué se rompió, qué prueba enrojeció) + `pnpm verify` limpio (en primer plano, `timeout: 600000` como **parámetro de la herramienta Bash**, nunca `run_in_background`) + un commit del orquestador. **Sin Playwright ni revisión Opus por tarea.** **Guarda 1:** si se renombra o retira un rótulo visible, `grep -rn "<rótulo viejo>" apps/web/e2e` y ajustar el spec en el mismo commit. **Guarda 2:** todo Bash que pueda pasar de 120 s lleva `timeout: 600000`.
- **Frontera de herramientas de todo encargo** (`04-convenciones.md`, § *La frontera del encargo es de ficheros y de herramientas*): no desplegar, **no correr Playwright ni e2e de API** (se escriben; los corre el orquestador al cierre), no dejar `dev:api` arrancado, no commitear ni empujar (el orquestador commitea tras leer el informe), no lanzar agentes, no desactivar pruebas ni bajar umbrales, no rediseñar lo decidido. Si hay otro árbol trabajando, `WORKTREE_SLOT` distinto (ver `apps/web/playwright.config.ts:14`).
- **No entra (spec §3.3, §4b.7, §5.5, §5b.5):** aflojar `requireEditable`; ruta HTTP para las puertas; interruptores por resistencia en la bandeja (lo cubre `PonerDano`); aplicar daño a varios objetivos desde un ataque; daño automático sin clic; modificadores temporales «hasta el descanso»; `effects[]` con `expiresOnRest`; subir de nivel al cruzar el umbral; XP a PNJ de statblock; la regla de la DMG de contar PNJ para la parte.

## Decisiones de ejecución tomadas al escribir el plan (E-PE-*)

Lo que la spec dice y el código medido el 2026-09-13 (`main` = `0ca530c`) pide precisar. Van a `docs/decisiones.md` al cerrar la tanda; cada implementador las lee.

| | Decisión | Por qué |
|---|---|---|
| E-PE-1 | **`changeHpFromEffect` es un envoltorio público de `changeHpEnTransaccion`**, que ya existe como privado (`character-sheet.service.ts:1595`) y es exactamente «el cuerpo de `changeHp` sin autorizar». `changeHp` no cambia: ya autoriza y delega. La prueba de igualdad de la spec §7 se cumple por construcción y se afirma con una unitaria que comprueba que `changeHp` con `tx` llama al mismo cuerpo | No hay dos copias que puedan divergir |
| E-PE-2 | **Los endpoints de la bandeja viven en un controlador nuevo `damage-tray.controller.ts`** (`@Controller("campaigns/:campaignId/rolls/:rollEventId")`, dentro de `CharactersModule`), con la lógica en `CharacterSheetService.damagePreview` / `applyPendingDamage`. La spec los ponía en `character-sheet.controller.ts`, cuyo prefijo es `campaigns/:campaignId/characters/:characterId` y no admite esa ruta | La ruta de la spec manda sobre el fichero |
| E-PE-3 | **`pendingDamage` lo escribe `RollsService.roll` a través de `interno`** (el mismo canal que `attackRollEventId`/`attackRef`, «lo que solo pone el servidor»): `rollAttack` pasa `{ targetCharacterId, attackResolvedEventId, damageType }` y `roll` completa `amount: resultado.total` al escribir el payload | El total solo se conoce dentro de `roll`, y el payload se escribe una vez |
| E-PE-4 | **La marca `appliedEventId` se escribe con `$executeRaw` + `jsonb_set` y `WHERE payload->'pendingDamage'->>'appliedEventId' IS NULL`**, dentro de la transacción del `HP_CHANGED`; `count === 0` → 409 | Es el patrón `resolvedAt` de las peticiones llevado a un campo Json; Prisma no expresa esa condición en `updateMany` |
| E-PE-5 | **El `ATTACK_RESOLVED` que justifica un daño se busca por `payload.rollEventId` con filtro Json de Prisma** (`payload: { path: ["rollEventId"], equals: attackRollEventId }`, `type: "ATTACK_RESOLVED"`, `campaignId`) y se exige `verdict ∈ {HIT, CRITICAL}`; sin él, o con `MISS`, el daño no lleva `pendingDamage` | El objetivo no viaja en el payload de la tirada (a propósito, spec §4b.2); el suceso de veredicto es la única fuente |
| E-PE-6 | **El total de la salvación se lee del `ABILITY_ROLL` escrito (`payload.total`), no de `resultado.total`** | `RollResult` es una unión y `revealed: false` no trae total; el suceso siempre lo tiene |
| E-PE-7 | **El selector de duración de `Condiciones.tsx` pasa a un grupo de tres radios con frase**: «Por reloj» (que despliega el `<select>` de tiempos que ya existe, con su «Indefinida»), «Hasta el próximo descanso corto», «Hasta el próximo descanso largo». Los dos radios nuevos mandan `expiresOnRest` y no `durationSeconds` | La spec pide «dos radios con su frase» junto a las opciones de tiempo; dos radios sueltos al lado de un `<select>` no forman un grupo con significado |
| E-PE-8 | **«Dar XP» es la séptima herramienta del DM en `HerramientasDeNarracion.tsx`, en un `Dialog` como sus seis vecinas**, y solo se pinta en modo `XP`. `PanelFlotante` (D-CF-67) es para menús anclados a un disparador, no para un formulario | El patrón del fichero manda; la spec decía «un `PanelFlotante`» sin haber medido la columna |
| E-PE-9 | **La propuesta de XP tras terminar el combate se pinta en `TiraDeIniciativa.tsx`, en el sitio del botón «Terminar»**, con el mismo componente `DarXp` prellenado (`propuesta`), no abriendo el diálogo de la columna del DM desde otro componente | Un componente reutilizable, un solo formulario |
| E-PE-10 | **`getSheet` solo devuelve el bloque `xp` en modo `XP`** (`campaign.tableRules.progresion === "XP"`); en `HITO` el campo no viaja y la hoja no lo pinta. `Character.xp` se guarda igual en los dos modos | Modo, no permiso (spec §5b.4); una sola decisión, en el servidor |
| E-PE-11 | **`XP_POR_VD` mapea el VD 0 a 10** (la tabla del SRD dice «0 or 10» según tenga ataques; el statblock no lo declara) y **los VD fraccionarios se indexan por `0.125`, `0.25`, `0.5`** (así los guarda `cr`, `monsters-srd.ts:92`) | El DM edita la cifra propuesta si quiere el 0 |
| E-PE-12 | **La propuesta cuenta a TODOS los combatientes `ENEMY` con `statblockRef` resoluble y a TODOS los `ALLY` sin `statblockRef` y no archivados**; ni `NEUTRAL` ni los `ALLY` de statblock (PNJ jugables) entran en ningún lado. Un `ENEMY` sin statblock (un jugador en el bando contrario) no vale XP | «Defeated» lo juzga el DM (SRD «typically»); el servidor solo suma lo que tiene VD |

## Mapa de ficheros

| Fichero | Responsabilidad | Tarea |
|---|---|---|
| `apps/api/src/characters/character-sheet.service.ts` (+ `.spec.ts`) | `changeHpFromEffect` (T1); `damagePreview`, `applyPendingDamage`, `rollAttack` rellena `pendingDamage` (T3); `getSheet` bloque `xp` (T5) | T1, T3, T5 |
| `apps/api/src/roll-requests/roll-requests.service.ts` (+ `.spec.ts`) | `createFromEffect` (T1); `answer` aplica `pendingEffect` en transacción (T2) | T1, T2 |
| `apps/api/src/activities/activities.service.ts` (+ `.spec.ts`) | `usar` llama a las puertas nuevas (T1); tira el daño una vez y pasa `pendingEffect`; el aviso literal desaparece (T2) | T1, T2 |
| `apps/api/src/characters/__tests__/puertas-sin-ruta.spec.ts` **(nuevo)** | Ningún `*.controller.ts` importa/llama a `changeHpFromEffect` ni `createFromEffect` | T1 |
| `packages/shared/src/roll-request.schema.ts` | `pendingSaveEffectSchema`, `PendingSaveEffect`, `answerRollRequestResultSchema` (`effectApplied`) | T2 |
| `apps/api/prisma/schema.prisma` + `apps/api/prisma/migrations/20260913200000_roll_request_pending_effect/migration.sql` **(nuevo)** | `RollRequest.pendingEffect Json?` | T2 |
| `packages/shared/src/game-event.schema.ts` | `ABILITY_ROLL.pendingDamage?` (T3); `XP_AWARDED` (T5) | T3, T5 |
| `apps/api/src/rolls/rolls.service.ts` | `interno.pendingDamage` → payload | T3 |
| `apps/api/src/characters/damage-tray.controller.ts` **(nuevo)**, `characters.module.ts` | `GET …/rolls/:rollEventId/damage-preview`, `POST …/rolls/:rollEventId/apply-damage` | T3 |
| `packages/shared/src/character-sheet.schema.ts` | `damagePreviewSchema` / `DamagePreview` | T3 |
| `packages/shared/src/character-state.schema.ts` | `applyConditionSchema.expiresOnRest` + `refine` excluyente | T4 |
| `apps/api/prisma/schema.prisma` + `apps/api/prisma/migrations/20260913200100_condition_expires_on_rest/migration.sql` **(nuevo)** | `CharacterCondition.expiresOnRest String?` | T4 |
| `apps/api/src/character-state/conditions/conditions.service.ts` (+ `.spec.ts`) | `apply` escribe `expiresOnRest`; `list` lo devuelve | T4 |
| `apps/api/src/character-state/rest/rest.service.ts` (+ `.spec.ts`) | Retira `SHORT` / `SHORT+LONG` con `CONDITION_REMOVED`; interrumpido nada | T4 |
| `packages/shared/src/xp.ts` **(nuevo)** (+ `__tests__/xp.test.ts`), `index.ts` | `UMBRALES_DE_NIVEL`, `XP_POR_VD`, `nivelPorXp`, `umbralDeNivel`, `xpPorVd`, `awardXpSchema`, `xpPropuestoSchema` | T5 |
| `packages/shared/src/table-rules.schema.ts` | `progresion: z.enum(["HITO","XP"]).default("HITO")` | T5 |
| `apps/api/prisma/schema.prisma` + `apps/api/prisma/migrations/20260913200200_character_xp/migration.sql` **(nuevo)** | `Character.xp Int @default(0)`, `GameEventType.XP_AWARDED` | T5 |
| `apps/api/src/characters/xp.controller.ts` **(nuevo)**, `xp.service.ts` **(nuevo)** (+ `.spec.ts`), `characters.module.ts` | `POST /campaigns/:campaignId/xp` | T5 |
| `apps/api/src/encounters/encounters.service.ts` (+ `.spec.ts`), `encounters.module.ts` | `end()` devuelve `xpPropuesto` (modo `XP`) | T5 |
| `apps/web/src/features/sessions/linea-de-log.ts`, `sessions/hilo/tipo-de-mensaje.ts` | Línea y cubo de `XP_AWARDED` | T5 |
| `apps/api/test/puerta-de-efectos.e2e-spec.ts` **(nuevo)** | Los e2e de la spec §6/§7 (se escriben en T2–T5; los corre el orquestador) | T2–T5 |
| `apps/web/src/features/character-sheet/Condiciones.tsx`, `duraciones.ts`, `vocabulario.ts`, `api.ts`, `__tests__/Condiciones.test.tsx`; `sessions/elenco/FichaDeElenco.tsx` | Radios «hasta el descanso», línea y chip traducidos | T6 |
| `apps/web/src/features/roll-requests/api.ts`, `TiradasPendientes.tsx`, tests | «Aplicado: −14 PG (falló)» al responder | T6 |
| `apps/web/src/features/sessions/hilo/BandejaDeDano.tsx` **(nuevo)**, `MensajeDelHilo.tsx`, `HiloDeSesion.tsx`, `sessions/api.ts`, `hooks.ts`, `__tests__/BandejaDeDano.test.tsx` **(nuevo)** | La tarjeta de daño con preview y «Aplicar» | T7 |
| `apps/web/src/features/sessions/dm/DarXp.tsx` **(nuevo)** (+ test), `HerramientasDeNarracion.tsx`; `encounters/api.ts`, `TiraDeIniciativa.tsx`; `character-sheet/Cabecera.tsx` (o `IdentidadEditable.tsx`), `api.ts`, `vocabulario.ts`; `campaigns/reglas.ts`, `ReglasDeLaMesa.tsx`; tests | «Dar XP», propuesta tras el combate, «1 250 / 2 700 PX» + aviso, radios de progresión | T8 |
| `apps/web/e2e/puerta-de-efectos.spec.ts` **(nuevo)**, `docs/05-datos.md`, `docs/08-pruebas.md`, `docs/01-arquitectura.md` | Recorrido de navegador (dos contextos) + documentación de datos y pruebas | T9 |

---

### Task 1: La segunda puerta — `changeHpFromEffect`, `createFromEffect`, y `usar` las usa

**Files:**
- Modify: `apps/api/src/characters/character-sheet.service.ts:1549-1610` (junto a `changeHp`)
- Modify: `apps/api/src/roll-requests/roll-requests.service.ts:67-140` (junto a `create`)
- Modify: `apps/api/src/activities/activities.service.ts:176-221` (ramas `salvacion` y `dados`)
- Create: `apps/api/src/characters/__tests__/puertas-sin-ruta.spec.ts`
- Test: `apps/api/src/characters/character-sheet.service.spec.ts`, `apps/api/src/roll-requests/roll-requests.service.spec.ts`, `apps/api/src/activities/activities.service.spec.ts`

**Interfaces:**
- Consumes: `changeHpEnTransaccion(tx, userId, campaignId, characterId, input)` (privado, ya existe); `crearEnTransaccion(tx, userId, campaignId, input)` (privado, ya existe); `requireVisibleCharacter` ya aplicado en `usar`.
- Produces:
  ```ts
  // CharacterSheetService
  async changeHpFromEffect(
    tx: Prisma.TransactionClient,
    actorUserId: string,
    campaignId: string,
    targetCharacterId: string,
    input: ChangeHpInput,
  ): Promise<ReturnType<CharacterSheetService["changeHpEnTransaccion"]>>;
  // RollRequestsService
  async createFromEffect(
    tx: Prisma.TransactionClient,
    actorUserId: string,
    campaignId: string,
    input: CreateRollRequestInput,   // T2 añade `& { pendingEffect?: PendingSaveEffect }`
  ): Promise<RollRequest[]>;
  ```

- [ ] **Step 1: Prueba de que ningún controlador importa las puertas**

```ts
// apps/api/src/characters/__tests__/puertas-sin-ruta.spec.ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Spec puerta de efectos §3.1/§3.2: las dos puertas «no se exponen por HTTP». Misma forma que la
// prueba que protege `viewerFor`: se lee el árbol de controladores y se busca el nombre.
function controladores(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return controladores(p);
    return n.endsWith(".controller.ts") ? [p] : [];
  });
}

describe("las puertas de efecto no tienen ruta", () => {
  const raiz = join(__dirname, "..", "..");
  const ficheros = controladores(raiz);

  it("hay controladores que revisar", () => {
    expect(ficheros.length).toBeGreaterThan(10);
  });

  it.each(["changeHpFromEffect", "createFromEffect"])("ningún controlador llama a %s", (nombre) => {
    const culpables = ficheros.filter((f) => readFileSync(f, "utf8").includes(nombre));
    expect(culpables).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr la prueba** — `pnpm --filter @dnd/api exec jest puertas-sin-ruta` → PASS (todavía no existen; que pase aquí es el punto de partida, la mutación viene al final).

- [ ] **Step 3: Unitarias de `changeHpFromEffect` y `createFromEffect` (fallan)**

En `character-sheet.service.spec.ts`, junto a las pruebas de `changeHp` con `tx` (buscar `autorizarEdicionConCliente`):

```ts
describe("changeHpFromEffect (segunda puerta, spec §3.1)", () => {
  it("no autoriza: un jugador que NO es dueño ni DM cambia los PG de otro si viene con tx", async () => {
    // Montar el servicio con los mismos mocks que usa el bloque de `changeHp con tx`, con
    // `campaignMember.findUnique` devolviendo role PLAYER y `ownerId` distinto de userId.
    const tx = txConPersonaje({ id: "b", ownerId: "otro", currentHp: 10, tempHp: 0 });
    const r = await service.changeHpFromEffect(tx, "jugador-a", "c1", "b", { delta: 5, reason: "Actividad: cure-wounds" });
    expect(r.hp.current).toBe(15);
    // El suceso HP_CHANGED lo firma quien usó la actividad.
    expect(events.record).toHaveBeenCalledWith("jugador-a", "c1", expect.objectContaining({ payload: expect.objectContaining({ type: "HP_CHANGED", delta: 5 }) }), tx);
  });

  it("changeHp con tx pasa por el MISMO cuerpo (no hay dos mecánicas)", async () => {
    const espia = jest.spyOn(service as never, "changeHpEnTransaccion");
    const tx = txConPersonaje({ id: "b", ownerId: "jugador-a", currentHp: 10, tempHp: 0 });
    await service.changeHp("jugador-a", "c1", "b", { delta: 1, reason: "x" }, tx);
    await service.changeHpFromEffect(tx, "jugador-a", "c1", "b", { delta: 1, reason: "x" });
    expect(espia).toHaveBeenCalledTimes(2);
  });
});
```

En `roll-requests.service.spec.ts`:

```ts
describe("createFromEffect (segunda puerta, spec §3.2)", () => {
  it("sin requireDM: un jugador crea la petición si los personajes están en la campaña y no archivados", async () => {
    tx.character.findMany.mockResolvedValue([{ id: "b" }]);
    tx.rollRequest.create.mockResolvedValue({ id: "r1" });
    const r = await service.createFromEffect(tx, "jugador-a", "c1", { characterIds: ["b"], key: "save.dex", label: "Salvación", dc: 15, mode: "NORMAL", audience: "PUBLIC" });
    expect(r).toHaveLength(1);
    expect(tx.campaignMember.findUnique).not.toHaveBeenCalled();
    expect(tx.rollRequest.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ requestedById: "jugador-a" }) }));
  });
  it("404 si algún personaje no está en la campaña o está archivado", async () => {
    tx.character.findMany.mockResolvedValue([]);
    await expect(service.createFromEffect(tx, "a", "c1", { characterIds: ["zz"], key: "save.dex", label: "S", mode: "NORMAL", audience: "PUBLIC" })).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 4: Correr** — `pnpm --filter @dnd/api exec jest character-sheet.service roll-requests.service` → FAIL («is not a function»).

- [ ] **Step 5: Implementar las dos puertas**

```ts
// character-sheet.service.ts, tras changeHp
/**
 * **La segunda puerta** (spec puerta de efectos §3.1, D-P2-11): «vengo de un efecto ya
 * autorizado». Quien llama —hoy solo `ActivitiesService.usar` y `RollRequestsService.answer`—
 * ya comprobó con `canView` que el actor ve al objetivo y con `requireOwnerOrDM` que puede usar
 * la actividad; aquí NO se vuelve a autorizar. **Exige `tx`**: sin transacción ajena no hay
 * forma de llamarla, y eso es lo que impide que un controlador la pulse. Ningún controlador la
 * importa (`__tests__/puertas-sin-ruta.spec.ts`). El `HP_CHANGED` lo firma `actorUserId`, quien
 * usó la actividad: la crónica dice quién causó el cambio, no quién pulsó.
 */
async changeHpFromEffect(
  tx: Prisma.TransactionClient,
  actorUserId: string,
  campaignId: string,
  targetCharacterId: string,
  input: ChangeHpInput,
) {
  return this.changeHpEnTransaccion(tx, actorUserId, campaignId, targetCharacterId, input);
}
```

```ts
// roll-requests.service.ts, tras create
/** Spec puerta de efectos §3.2: `crearEnTransaccion` con la comprobación de personajes pero sin
 * `requireDM`. Los `characterIds` ya pasaron `canView` en `ActivitiesService.usar`; aquí solo se
 * repite lo barato: en la campaña y no archivados. **Exige `tx` y no tiene ruta.** */
async createFromEffect(
  tx: Prisma.TransactionClient,
  actorUserId: string,
  campaignId: string,
  input: CreateRollRequestInput,
) {
  const personajes = await tx.character.findMany({
    where: { id: { in: input.characterIds }, campaignId, archivedAt: null },
    select: { id: true },
  });
  if (personajes.length !== input.characterIds.length) {
    throw new NotFoundException("Alguno de esos personajes no está en esta campaña.");
  }
  return this.crearEnTransaccion(tx, actorUserId, campaignId, input);
}
```

En `activities.service.ts`: la rama `salvacion` cambia `this.rollRequests.create(userId, campaignId, {...}, tx)` por `this.rollRequests.createFromEffect(tx, userId, campaignId, {...})`; la rama `dados` cambia `this.characterSheet.changeHp(userId, campaignId, destino.id, {...}, tx)` por `this.characterSheet.changeHpFromEffect(tx, userId, campaignId, destino.id, {...})`. Actualizar el comentario de cabecera de `usar` («las dos puertas de abajo la aceptan sin repetir la suya», spec §3). Ajustar los mocks de `activities.service.spec.ts` (los `expect(...changeHp)` pasan a `changeHpFromEffect` con el orden nuevo de argumentos).

- [ ] **Step 6: Correr las tres suites** → PASS. **Mutación:** quitar el `archivedAt: null` de `createFromEffect` → la prueba «404 si… archivado» sigue verde porque el mock devuelve `[]`; **mejor mutación:** cambiar `personajes.length !== input.characterIds.length` por `personajes.length === 0` y hacer que la prueba pida dos ids con un solo encontrado → enrojece. Anotar en el informe.

- [ ] **Step 7: `pnpm verify`** (timeout 600000) limpio. Informe al orquestador; commit del orquestador:
  `feat(api): the second gate — changeHpFromEffect and createFromEffect, tx-only and unrouted; usar goes through them`

---

### Task 2: El daño de una salvación se tira una vez y se aplica al responder (P2-5)

**Files:**
- Modify: `packages/shared/src/roll-request.schema.ts`
- Modify: `apps/api/prisma/schema.prisma:846-876` (`RollRequest`)
- Create: `apps/api/prisma/migrations/20260913200000_roll_request_pending_effect/migration.sql`
- Modify: `apps/api/src/roll-requests/roll-requests.service.ts` (`createFromEffect`, `crearEnTransaccion`, `answer`)
- Modify: `apps/api/src/activities/activities.service.ts:176-200` (rama `salvacion`)
- Create: `apps/api/test/puerta-de-efectos.e2e-spec.ts`
- Test: `roll-requests.service.spec.ts`, `activities.service.spec.ts`, `packages/shared/src/__tests__/roll-request.schema.test.ts` (crear si no existe)

**Interfaces:**
- Consumes: `changeHpFromEffect`, `createFromEffect` (T1); `tirarDados(actividad.dados, ctx)` (`activities.service.ts:358`, devuelve `{ total, pasos }`).
- Produces:
  ```ts
  export const pendingSaveEffectSchema = z.object({
    amount: z.number().int().min(0),
    signo: z.union([z.literal(1), z.literal(-1)]),
    tipoDeDano: damageTypeSchema.optional(),
    siSalva: z.enum(["ninguno", "mitad"]),
    actividadKey: z.string().min(1),
    actorCharacterId: z.string().min(1),
  });
  export type PendingSaveEffect = z.infer<typeof pendingSaveEffectSchema>;
  export type EffectApplied = { delta: number; saved: boolean };
  // answer(): Promise<RollResult & { effectApplied?: EffectApplied }>
  // createFromEffect(tx, actorUserId, campaignId, input: CreateRollRequestInput & { pendingEffect?: PendingSaveEffect })
  ```

- [ ] **Step 1: Esquema y prueba**

```ts
// packages/shared/src/__tests__/roll-request.schema.test.ts
import { createRollRequestSchema, pendingSaveEffectSchema } from "../roll-request.schema";
describe("pendingSaveEffect", () => {
  it("acepta el daño ya tirado con signo −1 y siSalva", () => {
    expect(pendingSaveEffectSchema.parse({ amount: 28, signo: -1, tipoDeDano: "FIRE", siSalva: "mitad", actividadKey: "fireball", actorCharacterId: "a" }).amount).toBe(28);
  });
  it("el esquema PÚBLICO de crear no acepta pendingEffect (spec §6)", () => {
    const r = createRollRequestSchema.strict().safeParse({ characterIds: ["clk1234567890abcdefghijk"], key: "save.dex", label: "S", pendingEffect: { amount: 1, signo: -1, siSalva: "ninguno", actividadKey: "x", actorCharacterId: "a" } });
    expect(r.success).toBe(false);
  });
});
```
(`createRollRequestSchema` es `z.object` sin `.strict()`: la prueba lo endurece solo para afirmar que la clave no está declarada; el `ZodValidationPipe` descarta claves desconocidas, así que por HTTP `pendingEffect` nunca llega al servicio.)

- [ ] **Step 2: Migración + Prisma**

```sql
-- apps/api/prisma/migrations/20260913200000_roll_request_pending_effect/migration.sql
-- Puerta de efectos §4.2 (2026-09-13): el daño de una salvación se tira UNA vez al usar la
-- actividad y se guarda aquí; cada objetivo aplica entero o mitad al responder.
-- Revertir:
--   ALTER TABLE "RollRequest" DROP COLUMN "pendingEffect";
ALTER TABLE "RollRequest" ADD COLUMN "pendingEffect" JSONB;
```
En `schema.prisma`, dentro de `RollRequest`: `pendingEffect Json?` con comentario `///` que cite la spec §4.2 y `pendingSaveEffectSchema`. Luego `pnpm --filter @dnd/api exec prisma generate`.

- [ ] **Step 3: Unitarias de `answer` (fallan)** — en `roll-requests.service.spec.ts`, con el mock de `prisma.transaction` ejecutando el callback con `tx`:

```ts
describe("answer aplica pendingEffect (spec §4.3)", () => {
  const base = { id: "r1", campaignId: "c1", characterId: "b", requestedById: "a", key: "save.dex", label: "S", dc: 15, mode: "NORMAL", audience: "PUBLIC", resolvedAt: null, cancelledAt: null, encounterId: null, character: { id: "b", ownerId: "u-b" } };
  const efecto = { amount: 21, signo: -1, tipoDeDano: "FIRE", siSalva: "mitad", actividadKey: "fireball", actorCharacterId: "a" };
  function conTotal(total: number) {
    prisma.rollRequest.findFirst.mockResolvedValue({ ...base, pendingEffect: efecto });
    prisma.rollRequest.findUnique.mockResolvedValue({ resolvedAt: null, cancelledAt: null });
    rolls.roll.mockResolvedValue({ revealed: true, eventId: "ev1", total, expression: "1d20+2", audience: "PUBLIC", rolls: [], kept: [], dropped: [], modifier: 2 });
    tx.gameEvent.findUnique.mockResolvedValue({ payload: { type: "ABILITY_ROLL", total } });
    tx.rollRequest.updateMany.mockResolvedValue({ count: 1 });
  }
  it("falla (14 < 15): daño entero, firmado por quien lanzó, citando la salvación", async () => {
    conTotal(14);
    const r = await service.answer("u-b", "c1", "r1", { spendInspiration: false });
    expect(sheets.changeHpFromEffect).toHaveBeenCalledWith(tx, "a", "c1", "b", { delta: -21, reason: "Actividad: fireball (falló)", damageType: "FIRE", rollEventId: "ev1" });
    expect(r.effectApplied).toEqual({ delta: -21, saved: false });
  });
  it("empata (15 >= 15): salva, mitad redondeada abajo (floor(21/2) = 10)", async () => {
    conTotal(15);
    const r = await service.answer("u-b", "c1", "r1", { spendInspiration: false });
    expect(sheets.changeHpFromEffect).toHaveBeenCalledWith(tx, "a", "c1", "b", expect.objectContaining({ delta: -10, reason: "Actividad: fireball (salvó, mitad)" }));
    expect(r.effectApplied).toEqual({ delta: -10, saved: true });
  });
  it("salva con siSalva ninguno: no toca los PG y effectApplied dice delta 0", async () => {
    prisma.rollRequest.findFirst.mockResolvedValue({ ...base, pendingEffect: { ...efecto, siSalva: "ninguno" } });
    /* …mismo montaje con total 20… */
    expect(sheets.changeHpFromEffect).not.toHaveBeenCalled();
    expect(r.effectApplied).toEqual({ delta: 0, saved: true });
  });
  it("sin pendingEffect no cambia nada: ni changeHp ni effectApplied", async () => { /* base sin pendingEffect → r.effectApplied undefined */ });
  it("si la petición se cerró en la carrera (count 0) no aplica el efecto", async () => { /* updateMany → { count: 0 } → rejects BadRequest y changeHpFromEffect no llamado */ });
});
```
Y una unitaria de `usar` en `activities.service.spec.ts`: con `actividad.tipo === "salvacion"` y `dados`, `createFromEffect` recibe `pendingEffect` con `amount` = el total de `tirarDados`, `signo` y `tipoDeDano` de `dados`, `siSalva` de `salvacion`, `actividadKey`, `actorCharacterId: actor.id`; la traza de la respuesta contiene los pasos de los dados; **`aviso` es `undefined`**.

- [ ] **Step 4: Correr** → FAIL.

- [ ] **Step 5: Implementar**

`crearEnTransaccion` y `createFromEffect` aceptan `input: CreateRollRequestInput & { pendingEffect?: PendingSaveEffect }` y escriben `pendingEffect: input.pendingEffect ?? undefined` en `data` (Prisma Json). `create` (la pública) **no** cambia de tipo: recibe `CreateRollRequestInput` pelado.

`answer`: el bloque final (desde «Se marca respondida después de tirar») pasa a:

```ts
// SRD 5.1, *Saving Throws*: «A saving throw is successful if the total equals or exceeds the DC».
// *Fireball*: «half as much damage on a successful one». *Rounding Down*: la mitad se redondea
// hacia abajo. El daño ya se tiró UNA vez en `usar` (*Damage Rolls*: «roll the damage once for
// all of them») y viaja en `pendingEffect`; aquí solo se decide entero, mitad o nada.
const efecto = peticion.pendingEffect ? pendingSaveEffectSchema.parse(peticion.pendingEffect) : null;
const effectApplied = await this.prisma.transaction(async (tx) => {
  const cerrada = await tx.rollRequest.updateMany({
    where: { id: peticion.id, resolvedAt: null },
    data: { resolvedAt: new Date(), resolvedEventId: resultado.eventId },
  });
  if (cerrada.count === 0) throw new BadRequestException("Esa petición ya se respondió.");
  if (!efecto || peticion.dc === null) return undefined;
  // E-PE-6: el total se lee del suceso, no de `resultado` (que puede venir sin revelar).
  const evento = await tx.gameEvent.findUnique({ where: { id: resultado.eventId }, select: { payload: true } });
  const total = (evento?.payload as { total?: number } | null)?.total;
  if (typeof total !== "number") throw new BadRequestException("La tirada de la salvación no se pudo leer.");
  const salvo = total >= peticion.dc;
  const cantidad = salvo ? (efecto.siSalva === "mitad" ? Math.floor(efecto.amount / 2) : 0) : efecto.amount;
  if (cantidad > 0) {
    await this.sheets.changeHpFromEffect(tx, peticion.requestedById, campaignId, peticion.characterId, {
      delta: efecto.signo * cantidad,
      reason: `Actividad: ${efecto.actividadKey}${salvo ? " (salvó, mitad)" : " (falló)"}`,
      ...(efecto.signo < 0 && efecto.tipoDeDano ? { damageType: efecto.tipoDeDano } : {}),
      rollEventId: resultado.eventId,
    });
  }
  return { delta: efecto.signo * cantidad, saved: salvo };
});
return effectApplied ? { ...resultado, effectApplied } : resultado;
```
(El camino de iniciativa —`peticion.encounterId`— no cambia y sigue devolviendo antes.)

`usar`, rama `salvacion`: si `actividad.dados`, `const { total, pasos } = this.tirarDados(actividad.dados, ctx); traza.push(...pasos);` y `pendingEffect: { amount: total, signo: actividad.dados.signo, tipoDeDano: actividad.dados.tipoDeDano, siSalva: actividad.salvacion.siSalva, actividadKey, actorCharacterId: actor.id }` en la llamada a `createFromEffect`. **Borrar el aviso I5** (`avisoEfecto = "Esta salvación tiene daño…"`) y la variable si queda sin uso. Cita SRD en el comentario.

- [ ] **Step 6: e2e (se escribe, no se corre)** — `apps/api/test/puerta-de-efectos.e2e-spec.ts`, mismo andamiaje que `actividades.e2e-spec.ts` (registro DM + dos jugadores A y B, campaña, invitación, un personaje por jugador con hoja derivable —copiar el `PATCH …/sheet` de `furia.e2e-spec.ts`—, `overrideProvider(ACTIVITY_CATALOG)` con dos actividades de prueba: `cura-de-prueba` (`dados` `2d8+3` signo 1, sin `objetivos` fijos) y `bola-de-prueba` (`salvacion` dex CD 15 `siSalva: "mitad"`, `dados` `8d6` signo −1 `tipoDeDano: "FIRE"`); `overrideProvider(DICE_ROLLER)` con un tirador fijo para que el daño y los d20 sean deterministas, como hace `rolls.e2e-spec.ts`):
  1. **A cura a B** con `cura-de-prueba` y `objetivos: [B]` → 200; el último `HP_CHANGED` de B tiene `actorUserId` = A y `reason: "Actividad: cura-de-prueba"`.
  2. **A `PATCH …/characters/B/hp`** → 403 (sin cambios).
  3. **A lanza `bola-de-prueba` a [B, C]** (C = un PNJ del DM visible) → 200, `traza` trae los dados; hay dos `RollRequest` con `requestedById` = A y **el mismo `pendingEffect.amount`**.
  4. **B responde** con d20 fijo que falla → `effectApplied.delta === -amount`; su `hp.current` bajó `amount`. **C responde (el DM) con d20 que empata la CD** → `effectApplied.delta === -floor(amount/2)`, `saved: true`.
  5. **A `POST /campaigns/:id/roll-requests`** directo → 403 (sin cambios).
  6. **A usa una actividad sobre un PNJ `DM_ONLY`** → 404 y su recurso no se gastó (la garantía ya existía; se afirma aquí).

- [ ] **Step 7: Correr unitarias y shared** → PASS. **Mutación:** `>=` → `>` en `salvo` → enrojece «empata (15 >= 15)». Anotar. Revertir.

- [ ] **Step 8: `pnpm verify`** limpio (600000). Informe; commit del orquestador:
  `feat(api): a save's damage is rolled once, stored in RollRequest.pendingEffect and applied when answered — SRD 5.1 Saving Throws / Damage Rolls / Rounding Down`

---

### Task 3: La bandeja de daño — `pendingDamage`, preview y «aplicar»

**Files:**
- Modify: `packages/shared/src/game-event.schema.ts:282-303` (`ABILITY_ROLL`)
- Modify: `packages/shared/src/character-sheet.schema.ts` (añadir `damagePreviewSchema`)
- Modify: `apps/api/src/rolls/rolls.service.ts:95-185` (`interno.pendingDamage`)
- Modify: `apps/api/src/characters/character-sheet.service.ts:2283-2432` (`rollAttack`) + métodos nuevos `damagePreview`, `applyPendingDamage`
- Create: `apps/api/src/characters/damage-tray.controller.ts`
- Modify: `apps/api/src/characters/characters.module.ts` (registrar el controlador)
- Modify: `apps/api/test/puerta-de-efectos.e2e-spec.ts` (bloque «bandeja»)
- Test: `character-sheet.service.spec.ts`, `rolls.service.spec.ts`, `packages/shared/src/game-event.schema.test.ts`

**Interfaces:**
- Consumes: `changeHpFromEffect` (T1); `applyDamageModifiers(rawDamage, damageType, modifiers)` (`character-state/damage/apply-damage-modifiers.ts:77`); `construirODenegar`, `statblocks.resolver`, `requireOwnerOrDM` (`common/character-viewer.ts:98`).
- Produces:
  ```ts
  // game-event.schema.ts — dentro de ABILITY_ROLL
  pendingDamage: z.object({
    targetCharacterId: z.string().min(1),
    attackResolvedEventId: z.string().min(1),
    damageType: damageTypeSchema,
    amount: z.number().int().min(0),
    appliedEventId: z.string().min(1).optional(),
  }).optional(),
  // character-sheet.schema.ts
  export const damagePreviewSchema = z.object({
    target: z.object({ id: z.string(), name: z.string() }),
    amount: z.number().int().min(0),
    damageType: damageTypeSchema,
    resulting: z.object({
      taken: z.number().int().min(0),
      absorbedByTemp: z.number().int().min(0),
      modifier: z.enum(["resistant", "vulnerable", "immune"]).nullable(),
      reason: z.string().nullable(),
    }),
    canApply: z.boolean(),
    appliedEventId: z.string().nullable(),
  });
  export type DamagePreview = z.infer<typeof damagePreviewSchema>;
  // RollsService.roll(…, interno?: { attackRollEventId?; attackRef?; pendingDamage?: Omit<PendingDamage, "amount" | "appliedEventId"> })
  // GET  /campaigns/:campaignId/rolls/:rollEventId/damage-preview  → DamagePreview
  // POST /campaigns/:campaignId/rolls/:rollEventId/apply-damage    → SheetResponse (la de changeHp) + { appliedEventId }
  ```

- [ ] **Step 1: Esquema + prueba** (`game-event.schema.test.ts`): un `ABILITY_ROLL` con `pendingDamage` válido parsea; sin él también (histórico).

- [ ] **Step 2: Unitarias (fallan)** en `character-sheet.service.spec.ts`:
  - `rollAttack` (`part: "DAMAGE"`, con `attackRollEventId`): si `prisma.gameEvent.findFirst` con `type: "ATTACK_RESOLVED"` y `payload.path ["rollEventId"]` devuelve `{ subjectId: "t1", id: "ar1", payload: { verdict: "HIT" } }`, entonces `rolls.roll` se llama con `interno.pendingDamage = { targetCharacterId: "t1", attackResolvedEventId: "ar1", damageType: <el del arma> }`; con `verdict: "MISS"` o sin suceso, `interno` no lleva `pendingDamage`.
  - `damagePreview`: fantasma con `damageModifiers: [{ damageType: "SLASHING", effect: "RESISTANT", note: "de ataques no mágicos" }]`, daño 11 cortante, `tempHp: 0` → `resulting: { taken: 5, absorbedByTemp: 0, modifier: "resistant", reason: "de ataques no mágicos" }`; con `tempHp: 3` → `taken: 2, absorbedByTemp: 3`; inmune → `taken: 0, modifier: "immune"`; sin modificadores → `modifier: null`. Un espectador que no es dueño ni DM del objetivo → `NotFoundException` (404, spec §4b.5). Ya aplicado → `canApply: false, appliedEventId: "hp1"`.
  - `applyPendingDamage`: llama a `changeHpFromEffect(tx, <actorUserId de la tirada>, campaignId, target, { delta: -amount, damageType, rollEventId, reason: "Ataque: <attackName>" })` y a `$executeRaw` con `jsonb_set`; si el `$executeRaw` devuelve 0 → `ConflictException` («Ese daño ya se aplicó.»); el atacante (ni dueño ni DM del objetivo) → `ForbiddenException`.
  - `rolls.service.spec.ts`: con `interno.pendingDamage`, el payload escrito lleva `pendingDamage` con `amount: total`.

- [ ] **Step 3: Correr** → FAIL.

- [ ] **Step 4: Implementar**

`rolls.service.ts`: ampliar el tipo de `interno` y, en el `payload`, `...(interno?.pendingDamage ? { pendingDamage: { ...interno.pendingDamage, amount: resultado.total } } : {})`. Comentario: «lo que solo pone el servidor», spec §4b.4, E-PE-3.

`rollAttack` (`part: "DAMAGE"`), antes de `this.rolls.roll`:
```ts
// Spec §4b.4 (E-PE-5): el daño de un ataque RESUELTO contra un objetivo sabe a quién le toca.
// Solo si la tirada citada tiene un ATTACK_RESOLVED colgando y el veredicto fue HIT o CRITICAL;
// un daño tirado al aire, o sobre un fallo, no lleva `pendingDamage`.
const veredicto = input.attackRollEventId
  ? await this.prisma.gameEvent.findFirst({
      where: { campaignId, type: "ATTACK_RESOLVED", payload: { path: ["rollEventId"], equals: input.attackRollEventId } },
      select: { id: true, subjectId: true, payload: true },
    })
  : null;
const v = (veredicto?.payload as { verdict?: string } | undefined)?.verdict;
const pendingDamage =
  veredicto && (v === "HIT" || v === "CRITICAL")
    ? { targetCharacterId: veredicto.subjectId, attackResolvedEventId: veredicto.id, damageType: dano.type }
    : undefined;
```
y pasarlo en `interno` junto a `attackRollEventId`.

`damagePreview(userId, campaignId, rollEventId)`:
1. `gameEvent.findFirst({ id: rollEventId, campaignId, type: "ABILITY_ROLL" })`; sin fila o sin `payload.pendingDamage` → 404 «Esa tirada no tiene daño pendiente.».
2. `target = character.findFirst({ id: pendingDamage.targetCharacterId, campaignId })`; `try { await requireOwnerOrDM(this.membership, campaignId, userId, target, "…") } catch { throw new NotFoundException(mismo mensaje) }` — **404, no 403** (spec §4b.5: enseñar «resistente» a quien no debe es filtrar).
3. Modificadores igual que `changeHpEnTransaccion`: `target.statblockRef && this.statblocks ? (await this.statblocks.resolver(campaignId, target.statblockRef))?.damageModifiers ?? [] : (await this.construirODenegar(target.ownerId, target)).damageModifiers`; `trace = applyDamageModifiers(amount, damageType, modificadores)`; `modifier` se lee del último `step` con `labelKey` `damage.modifier.immune|resistant|vulnerable` (`null` si solo hay el `base`); `reason = trace.notes[0] ?? null`; `absorbedByTemp = Math.min(target.tempHp, trace.total)`; `taken = trace.total - absorbedByTemp`.
4. `canApply = !pendingDamage.appliedEventId`; `appliedEventId = pendingDamage.appliedEventId ?? null`.

`applyPendingDamage(userId, campaignId, rollEventId)`:
1. Misma lectura; `requireOwnerOrDM` **sin** convertir a 404 (spec §6: el atacante → 403).
2. Si `appliedEventId` ya está → 409 «Ese daño ya se aplicó.» (lectura barata antes del candado).
3. `prisma.transaction(async (tx) => { const r = await this.changeHpFromEffect(tx, evento.actorUserId, campaignId, target.id, { delta: -amount, damageType, rollEventId, reason: \`Ataque: ${attackName}\` }); const hp = <id del HP_CHANGED que acaba de escribir: this.events.record devuelve el evento; hacer que changeHpEnTransaccion devuelva también `hpEventId`>; const marcado = await tx.$executeRaw\`UPDATE "GameEvent" SET payload = jsonb_set(payload, '{pendingDamage,appliedEventId}', to_jsonb(${hp}::text)) WHERE id = ${rollEventId} AND payload->'pendingDamage'->>'appliedEventId' IS NULL\`; if (marcado === 0) throw new ConflictException("Ese daño ya se aplicó."); return { ...r, appliedEventId: hp }; })`. `attackName` sale del `ATTACK_RESOLVED` (`payload.attackName`) leído por `attackResolvedEventId`.

`damage-tray.controller.ts`: dos rutas con `@UseGuards(JwtAuthGuard)` como `character-sheet.controller.ts`; `@Get("damage-preview")` y `@Post("apply-damage")`, sin body. Registrar en `characters.module.ts`.

- [ ] **Step 5: e2e (bloque «bandeja», en el mismo fichero de T2)** — con el DM, un fantasma `SRD:ghost` en la mesa (si `monsters-srd.ts` no tiene *ghost*, usar cualquier statblock con `RESISTANT` a `SLASHING` del catálogo, y si no hay ninguno crear uno de campaña con `POST /campaigns/:id/statblocks`), un guerrero de A con espada larga equipada:
  1. A resuelve el ataque (`POST …/sheet/attacks/:key/resolve` con `targetId`) con d20 fijo que impacta; A tira el daño con `attackRollEventId` → el `ABILITY_ROLL` del daño trae `pendingDamage` con `targetCharacterId` = fantasma.
  2. **A pide el preview** → 404. **El DM** → 200 con `resulting.taken === floor(amount/2)`, `modifier: "resistant"`.
  3. **A aplica** → 403. **El DM aplica** → 200; el `HP_CHANGED` del fantasma tiene `actorUserId` = A y `rollEventId` = la tirada de daño. **Segundo clic del DM** → 409.
  4. Un daño tirado **sin** `attackRollEventId` no lleva `pendingDamage`; su preview → 404 para el DM también.

- [ ] **Step 6: Unitarias** → PASS. **Mutación:** quitar el `AND … IS NULL` del `$executeRaw` (mock devuelve 1 siempre) no la caza una unitaria — **mutación válida:** cambiar `v === "HIT" || v === "CRITICAL"` por `v !== "MISS"` con la prueba «sin suceso no lleva pendingDamage»… tampoco. **Usar:** `Math.min(target.tempHp, trace.total)` → `trace.total` → enrojece «tempHp 3 → absorbed 3, taken 2». Anotar. Revertir.

- [ ] **Step 7: `pnpm verify`** limpio. Informe; commit:
  `feat(api): damage tray — a resolved attack's damage roll knows its target; server-side preview and one-click apply, idempotent, owner-or-DM of the target only`

---

### Task 4: «Hasta el próximo descanso» — `expiresOnRest`

**Files:**
- Modify: `packages/shared/src/character-state.schema.ts:255-280` (`applyConditionSchema`)
- Modify: `apps/api/prisma/schema.prisma:773-800` (`CharacterCondition`)
- Create: `apps/api/prisma/migrations/20260913200100_condition_expires_on_rest/migration.sql`
- Modify: `apps/api/src/character-state/conditions/conditions.service.ts:151-330` (`apply`), `list`
- Modify: `apps/api/src/character-state/rest/rest.service.ts:68-140` (`rest`)
- Modify: `apps/api/test/puerta-de-efectos.e2e-spec.ts` (bloque «descanso»)
- Test: `packages/shared/src/__tests__/character-state.schema.test.ts` (crear si no existe), `conditions.service.spec.ts`, `rest.service.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  // applyConditionSchema
  expiresOnRest: z.enum(["SHORT", "LONG"]).optional(),
  // .refine((v) => !(v.durationSeconds !== undefined && v.expiresOnRest !== undefined),
  //   { message: "Una condición dura por reloj o hasta un descanso, no las dos.", path: ["expiresOnRest"] })
  export type RestKind = "SHORT" | "LONG";
  // ConditionRow (API list) gana `expiresOnRest: "SHORT" | "LONG" | null`
  ```

- [ ] **Step 1: Esquema + prueba**: `{ key: "poisoned", expiresOnRest: "LONG" }` parsea; `{ key: "poisoned", durationSeconds: 60, expiresOnRest: "LONG" }` falla con el mensaje; `{ key: "poisoned" }` sigue siendo indefinida.

- [ ] **Step 2: Migración + Prisma**
```sql
-- apps/api/prisma/migrations/20260913200100_condition_expires_on_rest/migration.sql
-- Puerta de efectos §5 (2026-09-13). SRD 5.1: «until you finish a long rest» es una duración que
-- el descanso resuelve, no un número. "SHORT" | "LONG", mismo vocabulario que RestInput.kind.
-- Revertir:
--   ALTER TABLE "CharacterCondition" DROP COLUMN "expiresOnRest";
ALTER TABLE "CharacterCondition" ADD COLUMN "expiresOnRest" TEXT;
```
`schema.prisma`: `expiresOnRest String?` con `///` que diga que es excluyente con `expiresAtClock` (lo garantiza el esquema Zod, no la base). `prisma generate`.

- [ ] **Step 3: Unitarias (fallan)**
  - `conditions.service.spec.ts`: `apply` con `expiresOnRest: "LONG"` escribe `expiresOnRest: "LONG"` y `expiresAtClock: null` en `create` y en `update`; sin él escribe `expiresOnRest: null` (se escribe siempre, como `expiresAtClock`, para que renovar sin descanso la deje indefinida). `list` devuelve `expiresOnRest`.
  - `rest.service.spec.ts` (montaje existente con `tx`): con condiciones `[{ key: "a", expiresOnRest: "SHORT" }, { key: "b", expiresOnRest: "LONG" }, { key: "c", expiresOnRest: null }]`:
    - corto → `deleteMany` de `a` y un `CONDITION_REMOVED` con `key: "a", reason: "Descanso corto"`; `b` y `c` siguen.
    - largo completo → `a` y `b` retiradas, dos `CONDITION_REMOVED` con `reason: "Descanso largo"`; `c` sigue.
    - largo interrumpido → ningún `deleteMany` de condiciones por descanso, ningún `CONDITION_REMOVED`.

- [ ] **Step 4: Correr** → FAIL.

- [ ] **Step 5: Implementar**

`conditions.service.ts` (`apply`): `const expiresOnRest = input.expiresOnRest ?? null;` y añadirlo a `create` y `update` del `upsert`. `list` lo incluye en el `map`.

`rest.service.ts`, un método privado nuevo:
```ts
/**
 * Spec puerta de efectos §5.3. SRD 5.1 usa «until you finish a short or long rest» y «until you
 * finish a long rest» como duración literal de decenas de efectos. Un descanso largo incluye lo
 * que un corto repone (misma lógica que `reponerPorTipo`), así que retira SHORT y LONG.
 * **Retirar = borrar la fila y escribir CONDITION_REMOVED**, una por condición: el descanso lo
 * declara alguien a propósito y lo que retira lo dice la crónica — no queda «vencida».
 */
private async retirarCondicionesPorDescanso(
  tx: Prisma.TransactionClient,
  userId: string,
  campaignId: string,
  character: { id: string; visibility: Visibility },
  kind: "SHORT" | "LONG",
): Promise<void> {
  const tipos = kind === "LONG" ? ["SHORT", "LONG"] : ["SHORT"];
  const filas = await tx.characterCondition.findMany({ where: { characterId: character.id, expiresOnRest: { in: tipos } } });
  for (const fila of filas) {
    await tx.characterCondition.delete({ where: { id: fila.id } });
    await this.events.record(userId, campaignId, {
      subjectType: "character", subjectId: character.id, visibility: character.visibility,
      payload: { type: "CONDITION_REMOVED", key: fila.key, reason: kind === "LONG" ? "Descanso largo" : "Descanso corto" },
    }, tx);
  }
}
```
Llamarlo **después** de reponer recursos: en la rama `SHORT` tras `reponerPorTipo(…"SHORT_REST")`; en la rama larga completa tras `bajarAgotamiento`. En la rama `interrupted`, nada. (Si `RestService` no inyecta `GameEventsService`, añadirlo: el módulo `CharacterStateModule` ya importa `GameEventsModule` para `ConditionsService`.)

- [ ] **Step 6: e2e (bloque «descanso»)**: el DM aplica a B `poisoned` con `expiresOnRest: "SHORT"` y `frightened` con `expiresOnRest: "LONG"`; `POST …/rest { kind: "SHORT" }` → `GET …/conditions` ya no trae `poisoned`, sí `frightened`; el último `CONDITION_REMOVED` dice `reason: "Descanso corto"`. Aplicar `poisoned` con `durationSeconds` **y** `expiresOnRest` → 400.

- [ ] **Step 7: Unitarias** → PASS. **Mutación:** `["SHORT", "LONG"]` → `["LONG"]` en el largo → enrojece «largo completo retira a y b». Anotar. Revertir.

- [ ] **Step 8: `pnpm verify`** limpio. Informe; commit:
  `feat(api): conditions can last "until the next short/long rest" — the rest removes them with CONDITION_REMOVED (SRD 5.1 Resting)`

---

### Task 5: XP en el servidor — columna, tabla, «dar XP», propuesta al terminar el combate, aviso en la hoja

**Files:**
- Create: `packages/shared/src/xp.ts`, `packages/shared/src/__tests__/xp.test.ts`; Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/src/table-rules.schema.ts:80-91` (`progresion`)
- Modify: `packages/shared/src/game-event.schema.ts` (`XP_AWARDED` en la lista y el payload)
- Modify: `apps/api/prisma/schema.prisma` (`Character.xp`, `GameEventType.XP_AWARDED`)
- Create: `apps/api/prisma/migrations/20260913200200_character_xp/migration.sql`
- Create: `apps/api/src/characters/xp.service.ts`, `xp.service.spec.ts`, `xp.controller.ts`; Modify: `characters.module.ts`
- Modify: `apps/api/src/characters/character-sheet.service.ts` (`getSheet`)
- Modify: `apps/api/src/encounters/encounters.service.ts:478-513` (`end`), `encounters.module.ts` (importar `StatblocksModule`), `encounters.service.spec.ts`
- Modify: `apps/web/src/features/sessions/linea-de-log.ts`, `apps/web/src/features/sessions/hilo/tipo-de-mensaje.ts` (`XP_AWARDED`, o el `switch` exhaustivo no compila)
- Modify: `apps/api/test/puerta-de-efectos.e2e-spec.ts` (bloque «XP»)

**Interfaces:**
- Produces:
  ```ts
  // packages/shared/src/xp.ts
  export const UMBRALES_DE_NIVEL: readonly number[]; // 20 valores, índice = nivel − 1
  export const XP_POR_VD: Readonly<Record<string, number>>; // "0"→10, "0.125"→25, "0.25"→50, "0.5"→100, "1"→200 … "30"→155000
  export function nivelPorXp(xp: number): number;          // 899 → 2, 900 → 3, 355000 → 20
  export function umbralDeNivel(nivel: number): number | null; // 2 → 300; 21 → null
  export function xpPorVd(cr: number): number;             // lanza RangeError si el VD no está en la tabla
  export const awardXpSchema = z.object({
    characterIds: z.array(z.string().cuid()).min(1).max(20),
    amount: z.number().int().min(-100000).max(100000).refine((n) => n !== 0, "Cero XP no es un premio."),
    reason: z.string().max(160).optional(),
  });
  export type AwardXpInput = z.infer<typeof awardXpSchema>;
  export const xpPropuestoSchema = z.object({
    total: z.number().int().min(0),
    porCabeza: z.number().int().min(0),
    destinatarios: z.array(z.object({ characterId: z.string(), name: z.string() })),
    desglose: z.array(z.object({ characterId: z.string(), name: z.string(), cr: z.number(), xp: z.number().int() })),
  });
  export type XpPropuesto = z.infer<typeof xpPropuestoSchema>;
  // table-rules.schema.ts
  progresion: z.enum(["HITO", "XP"]).default("HITO"),
  export type Progresion = TableRules["progresion"];
  // game-event.schema.ts
  z.object({ type: z.literal("XP_AWARDED"), characterId: z.string().min(1), amount: z.number().int(), xpTotal: z.number().int().min(0), reason })
  // POST /campaigns/:campaignId/xp  body AwardXpInput → { awarded: { characterId: string; xp: number }[] }
  // GET …/sheet añade (solo modo XP): xp: { actual: number; siguiente: number | null; nivelPorXp: number }
  // POST …/encounters/:id/end → { id, status, xpPropuesto?: XpPropuesto }
  ```

- [ ] **Step 1: `xp.ts` con pruebas** (`xp.test.ts`): los 20 umbrales exactos del SRD (copiar la lista de la spec §5b.2); `nivelPorXp(0) === 1`, `nivelPorXp(299) === 1`, `nivelPorXp(300) === 2`, **`nivelPorXp(900) === 3` (el empate sube)**, `nivelPorXp(355000) === 20`, `nivelPorXp(999999) === 20`; `umbralDeNivel(1) === 0`, `umbralDeNivel(20) === 355000`, `umbralDeNivel(21) === null`; `xpPorVd(0) === 10`, `xpPorVd(0.125) === 25`, `xpPorVd(0.25) === 50`, `xpPorVd(0.5) === 100`, `xpPorVd(1) === 200`, `xpPorVd(13) === 10000`, `xpPorVd(30) === 155000`, `xpPorVd(31)` lanza; `awardXpSchema` rechaza `amount: 0` y acepta `-50`. Comentario de cabecera con la cita del SRD (*Beyond 1st Level*, *Monsters · Experience Points*) y la nota de que Foundry `config.mjs:4147/4158` coincide.

- [ ] **Step 2: `progresion` en `tableRulesSchema`** + prueba en `table-rules.schema.test.ts`: `{}` → `progresion: "HITO"`. Exportar desde `index.ts` lo nuevo.

- [ ] **Step 3: Migración + Prisma**
```sql
-- apps/api/prisma/migrations/20260913200200_character_xp/migration.sql
-- Puerta de efectos §5 bis (2026-09-13, D-CF-68/69). SRD 5.1, Beyond 1st Level: «A character who
-- reaches a specified experience point total advances in capability.» El nivel NO sube solo
-- (D-CF-66): esta columna cuenta; subir lo pulsa el DM.
-- Revertir:
--   ALTER TABLE "Character" DROP COLUMN "xp";
--   (el valor XP_AWARDED del enum no se puede quitar sin reescribir el tipo; se deja)
ALTER TABLE "Character" ADD COLUMN "xp" INTEGER NOT NULL DEFAULT 0;
ALTER TYPE "GameEventType" ADD VALUE 'XP_AWARDED';
```
`schema.prisma`: `xp Int @default(0)` en `Character` (con `///` citando la spec) y `XP_AWARDED` al final del enum con comentario. `game-event.schema.ts`: añadir `"XP_AWARDED"` a la lista de tipos y su payload. `prisma generate`.

- [ ] **Step 4: Unitarias (fallan)**
  - `xp.service.spec.ts` (`XpService.award(userId, campaignId, input)`): `requireDM`; un `characterId` con `statblockRef` → `BadRequestException("Un PNJ de statblock no acumula XP: sus números salen del VD.")` **antes de escribir nada**; un id que no está en la campaña o archivado → 404; con dos personajes válidos y `amount: 450` → dos `character.update` con `xp: anterior + 450` y dos `XP_AWARDED` con `xpTotal`; con `amount: -600` sobre `xp: 100` → `xp: 0` (nunca negativo) y `XP_AWARDED.amount: -600`, `xpTotal: 0`; todo en `prisma.transaction`.
  - `character-sheet.service.spec.ts` (`getSheet`): con `campaign.tableRules.progresion === "XP"` y `character.xp: 1250, level: 3` → `xp: { actual: 1250, siguiente: 2700, nivelPorXp: 3 }`; con `xp: 2700, level: 3` → `nivelPorXp: 4` (la pantalla avisa); nivel 20 → `siguiente: null`; en modo `HITO` la respuesta **no** tiene `xp`.
  - `encounters.service.spec.ts` (`end`): modo `XP`, combatientes `[ally A (sin statblock), ally P (statblockRef SRD:goblin), enemy G1 (SRD:goblin, cr 0.25), enemy G2 (SRD:goblin), neutral N]` → `xpPropuesto: { total: 100, porCabeza: 100, destinatarios: [A], desglose: [G1 50, G2 50] }`; con dos allies sin statblock → `porCabeza: 50`; con tres allies y total 100 → `porCabeza: 33` (floor); modo `HITO` → sin `xpPropuesto`; sin `ENEMY` con statblock → sin `xpPropuesto`.

- [ ] **Step 5: Correr** → FAIL.

- [ ] **Step 6: Implementar**

`xp.service.ts` (inyecta `PrismaService`, `MembershipService`, `GameEventsService`):
```ts
async award(userId: string, campaignId: string, input: AwardXpInput) {
  await this.membership.requireDM(campaignId, userId);
  const personajes = await this.prisma.character.findMany({
    where: { id: { in: input.characterIds }, campaignId, archivedAt: null },
    select: { id: true, name: true, xp: true, visibility: true, statblockRef: true },
  });
  if (personajes.length !== input.characterIds.length) throw new NotFoundException("Alguno de esos personajes no está en esta campaña.");
  // D-CF-69: un PNJ de statblock no tiene nivel al que avanzar (sus números salen del VD).
  const deStatblock = personajes.filter((p) => p.statblockRef);
  if (deStatblock.length > 0) throw new BadRequestException("Un PNJ de statblock no acumula XP: sus números salen del VD.");
  return this.prisma.transaction(async (tx) => {
    const awarded = [];
    for (const p of personajes) {
      const xp = Math.max(0, p.xp + input.amount);
      await tx.character.update({ where: { id: p.id }, data: { xp } });
      await this.events.record(userId, campaignId, {
        subjectType: "character", subjectId: p.id, visibility: p.visibility,
        payload: { type: "XP_AWARDED", characterId: p.id, amount: input.amount, xpTotal: xp, ...(input.reason ? { reason: input.reason } : {}) },
      }, tx);
      awarded.push({ characterId: p.id, xp });
    }
    return { awarded };
  });
}
```
`xp.controller.ts`: `@Controller("campaigns/:campaignId/xp")`, `@Post()` con `ZodValidationPipe(awardXpSchema)`. Registrar servicio y controlador en `characters.module.ts`.

`getSheet`: leer `campaign.tableRules` (`tableRulesSchema.parse(campaign.tableRules ?? {})`, mismo helper que ya usa `updateSheet` para las reglas); si `progresion === "XP"`, añadir `xp: { actual: character.xp, siguiente: umbralDeNivel(character.level + 1), nivelPorXp: nivelPorXp(character.xp) }`.

`encounters.service.ts` (`end`): antes de la transacción, leer `tableRules` de la campaña y los combatientes con `include: { character: { select: { id, name, statblockRef, archivedAt } } }`; si `progresion === "XP"`, calcular:
```ts
// D-CF-68 (spec §5b.3). SRD 5.1, Monsters · Experience Points: «Typically, XP is awarded for
// defeating the monster, although the GM may also award XP for neutralizing the threat posed by
// the monster in some other manner.» Por eso se PROPONE y no se aplica: el DM confirma en «Dar XP».
const desglose = [];
for (const c of combatientes.filter((c) => c.side === "ENEMY" && c.character.statblockRef)) {
  const sb = await this.statblocks.resolver(campaignId, c.character.statblockRef!);
  if (sb) desglose.push({ characterId: c.character.id, name: c.character.name, cr: sb.cr, xp: xpPorVd(sb.cr) });
}
const destinatarios = combatientes.filter((c) => c.side === "ALLY" && !c.character.statblockRef && !c.character.archivedAt).map((c) => ({ characterId: c.character.id, name: c.character.name }));
const total = desglose.reduce((s, d) => s + d.xp, 0);
const xpPropuesto = total > 0 && destinatarios.length > 0 ? { total, porCabeza: Math.floor(total / destinatarios.length), destinatarios, desglose } : undefined;
```
y devolver `{ id, status, ...(xpPropuesto ? { xpPropuesto } : {}) }`. `end` ya exige DM, así que la propuesta solo la ve él. Inyectar `StatblocksService` (importar `StatblocksModule` en `encounters.module.ts`; no hay ciclo: `statblocks` no importa `encounters`).

Web (para que compile `verify`): `linea-de-log.ts` → `case "XP_AWARDED": return \`Gana ${p.amount} PX (total ${p.xpTotal})${p.reason ? \` — ${p.reason}\` : ""}\`` (con `sujetoEnCabecera` como `HP_CHANGED`; si el `amount` es negativo, «Pierde N PX»); `tipo-de-mensaje.ts` → `XP_AWARDED` en el cubo `personaje` junto a `LEVEL_CHANGED`. Si `nombres-del-hilo.ts` o `vocabulario.ts` tienen un `Record<GameEventType, …>` exhaustivo, añadir la entrada («Experiencia»).

- [ ] **Step 7: e2e (bloque «XP»)**: `PATCH /campaigns/:id { tableRules: { progresion: "XP" } }`; `POST …/xp` como jugador → 403; como DM a un PNJ de statblock → 400; como DM a [A, B] con 450 → 200 y `GET …/sheet` de A trae `xp.actual === 450`; en modo `HITO` la hoja no trae `xp`. **Dos goblins contra A y B**: sesión, encuentro con dos PNJ `SRD:goblin` en `ENEMY` y A, B en `ALLY` (copiar el montaje de `la-capa-de-combate.e2e-spec.ts`), `POST …/end` → `xpPropuesto.total === 100`, `porCabeza === 50`; el DM confirma con `POST …/xp { characterIds: [A,B], amount: 50 }` → las dos hojas suben 50. Como jugador, `end` → 403 (ya era así).

- [ ] **Step 8: Unitarias + shared** → PASS. **Mutación:** `>=` → `>` en `nivelPorXp` → enrojece «900 → 3». Anotar. Revertir.

- [ ] **Step 9: `pnpm verify`** limpio. Informe; commit:
  `feat(api): experience points — Character.xp, XP_AWARDED, POST /xp (DM, never to a statblock NPC), the table rule progresion HITO|XP, and end() proposes the CR split — SRD 5.1 Beyond 1st Level / Experience Points by CR (D-CF-68, D-CF-69)`

---

### Task 6: Web — la condición «hasta el descanso» y el daño aplicado al responder

**Files:**
- Modify: `apps/web/src/features/character-sheet/Condiciones.tsx:126-160, 372-390` (selector), `duraciones.ts`, `vocabulario.ts`, `api.ts:532-585` (`ConditionRow.expiresOnRest`, `applyCondition`)
- Modify: `apps/web/src/features/sessions/elenco/FichaDeElenco.tsx` (el chip de condición dice «hasta descanso largo»)
- Modify: `apps/web/src/features/roll-requests/api.ts:93`, `TiradasPendientes.tsx`
- Test: `apps/web/src/features/character-sheet/__tests__/Condiciones.test.tsx`, `apps/web/src/features/roll-requests/__tests__/TiradasPendientes.test.tsx` (existente o crear)

**Interfaces:**
- Consumes: `applyConditionSchema.expiresOnRest` (T4); `answer` → `effectApplied` (T2); `ConditionRow.expiresOnRest` (T4).
- Produces:
  ```ts
  // vocabulario.ts
  export const HASTA_EL_DESCANSO: Record<"SHORT" | "LONG", { etiqueta: string; frase: string; corto: string }> = {
    SHORT: { etiqueta: "Hasta el próximo descanso corto", frase: "Se retira sola al declarar un descanso corto o largo completo.", corto: "hasta descanso corto" },
    LONG:  { etiqueta: "Hasta el próximo descanso largo", frase: "Se retira sola al declarar un descanso largo completo; un corto no la toca.", corto: "hasta descanso largo" },
  };
  // duraciones.ts
  export type ModoDeDuracion = "RELOJ" | "SHORT" | "LONG";
  // api.ts
  applyCondition(campaignId, characterId, key, level?, note?, durationSeconds?, expiresOnRest?: "SHORT" | "LONG")
  ```

- [ ] **Step 1: Pruebas RTL (fallan)** en `Condiciones.test.tsx`: (a) el formulario ofrece tres radios «Por reloj», «Hasta el próximo descanso corto», «Hasta el próximo descanso largo» (`getByRole("radio", { name: … })`); con «Por reloj» marcado el `<select>` de tiempos está y con «Hasta el próximo descanso largo» no; (b) al aplicar con el radio largo, `applyCondition` recibe `expiresOnRest: "LONG"` y **no** `durationSeconds`; (c) una `ConditionRow` con `expiresOnRest: "LONG"` pinta «hasta descanso largo» en su línea y **nunca** el texto `LONG` (`queryByText(/\bLONG\b/)` es `null`). En `TiradasPendientes.test.tsx`: tras responder con `effectApplied: { delta: -14, saved: false }` se lee «Aplicado: −14 PG (falló)»; con `{ delta: -7, saved: true }` → «Aplicado: −7 PG (salvó, mitad)»; con `{ delta: 0, saved: true }` → «Salvó: sin daño».

- [ ] **Step 2: Correr** `pnpm --filter @dnd/web exec vitest run Condiciones TiradasPendientes` → FAIL.

- [ ] **Step 3: Implementar** — en `Condiciones.tsx`, `SelectorDeDuracion` pasa a un `<fieldset>` con `<legend>` «Cuánto dura» y tres `<label><input type="radio" name={id}/>` con etiqueta y frase (misma forma que `GrupoDeRadios` de `campaigns/ReglasDeLaMesa.tsx:271`, sin importarlo: es de otra feature; copiar el markup); estado `modo: ModoDeDuracion` (defecto `"RELOJ"`) junto al `duracion` que ya existe; el `<select>` solo se renderiza con `modo === "RELOJ"`. Al aplicar: `durationSeconds: modo === "RELOJ" ? segundosDeDuracion(duracion) ?? undefined : undefined, expiresOnRest: modo === "RELOJ" ? undefined : modo`. La renovación de una vencida (`claveDeRenovacion`) sigue por reloj (no se toca). En la línea de la condición activa, tras `tituloDe(c)`: si `c.expiresOnRest`, `· ${HASTA_EL_DESCANSO[c.expiresOnRest].corto}`. En `FichaDeElenco.tsx`, donde se pinta el chip con el restante, la misma frase corta. `api.ts`: `expiresOnRest` en `ConditionRow` y en `applyCondition` (solo viaja si está). En `TiradasPendientes.tsx`, tras `responder.mutate` con éxito, guardar `effectApplied` del resultado en estado local por `requestId` y pintarlo bajo la tirada con la frase de arriba (`delta` con signo tipográfico «−»).

- [ ] **Step 4: Guarda 1** — `grep -rn "Duración" apps/web/e2e` y `grep -rn "duracion-condicion\|Indefinida" apps/web/e2e`: si `condiciones-con-duracion.spec.ts` selecciona el `<select>` por `aria-label="Duración"`, mantener ese `aria-label` en el `<select>` que queda dentro de «Por reloj» (sigue siendo el defecto, así que el spec no cambia; si cambiara, ajustar en el mismo commit).

- [ ] **Step 5: Correr** → PASS. **Mutación:** en `HASTA_EL_DESCANSO.LONG.corto` poner `"LONG"` → enrojece (c). Anotar. Revertir.

- [ ] **Step 6: `pnpm verify`** limpio. Informe; commit:
  `feat(web): a condition can last until the next short or long rest — three radios with their sentence; the answered save shows what it applied`

---

### Task 7: Web — la bandeja de daño en el hilo

**Files:**
- Create: `apps/web/src/features/sessions/hilo/BandejaDeDano.tsx`, `apps/web/src/features/sessions/hilo/__tests__/BandejaDeDano.test.tsx`
- Modify: `apps/web/src/features/sessions/hilo/MensajeDelHilo.tsx:176-185` (rama `tirada`), `HiloDeSesion.tsx:376` (pasar `campaignId`)
- Modify: `apps/web/src/features/sessions/api.ts`, `hooks.ts` (o `log-api.ts`, donde vivan las llamadas del hilo)
- Modify: `apps/web/src/features/sessions/hilo/tirada.ts` (nada; el desglose no cambia)

**Interfaces:**
- Consumes: `GET /campaigns/:id/rolls/:rollEventId/damage-preview` → `DamagePreview` (T3, 404 = no pintar); `POST …/apply-damage`.
- Produces:
  ```ts
  export function BandejaDeDano({ campaignId, rollEventId, pendingDamage }: { campaignId: string; rollEventId: string; pendingDamage: NonNullable<Extract<GameEventPayload, { type: "ABILITY_ROLL" }>["pendingDamage"]> }): JSX.Element | null;
  // vocabulario del modificador (en BandejaDeDano.tsx o sessions/vocabulario.ts):
  export const NOMBRE_MODIFICADOR_DE_DANO: Record<"resistant" | "vulnerable" | "immune", string> = { resistant: "resistencia", vulnerable: "vulnerabilidad", immune: "inmunidad" };
  // sessions/api.ts
  fetchDamagePreview(campaignId, rollEventId): Promise<DamagePreview>; applyDamage(campaignId, rollEventId): Promise<unknown>;
  // hooks: useDamagePreview(campaignId, rollEventId, enabled) (retry: false; 404 → data undefined), useApplyDamage(campaignId) (invalida ["events", campaignId] y ["sheet", …objetivo])
  ```

- [ ] **Step 1: Pruebas RTL (fallan)** con `msw` o el mock de `apiFetch` que usen los tests de `sessions/hilo/__tests__`: (a) preview `{ target: { name: "Espectro" }, amount: 11, damageType: "SLASHING", resulting: { taken: 5, absorbedByTemp: 0, modifier: "resistant", reason: "de ataques no mágicos" }, canApply: true, appliedEventId: null }` → se lee «Espectro: 11 cortante → 5 · resistencia (de ataques no mágicos)» y hay un botón «Aplicar»; (b) `canApply: false, appliedEventId: "hp1"` → «Aplicado» y sin botón; (c) el preview devuelve 404 → el componente no pinta el preview ni el botón, solo «Daño pendiente» (sin nombre del objetivo ni cifra reducida: no filtrar); (d) pulsar «Aplicar» llama a `applyDamage(campaignId, rollEventId)` y, con 409, pinta «Ese daño ya se aplicó.». Ningún texto `SLASHING`/`resistant` crudo (`NOMBRE_TIPO_DE_DANO` ya existe en `character-sheet/vocabulario.ts` o en `elenco/PonerDano.tsx`: importarlo, no duplicarlo).

- [ ] **Step 2: Correr** → FAIL.

- [ ] **Step 3: Implementar** — `BandejaDeDano` con `useDamagePreview`; `MensajeDelHilo` recibe `campaignId: string` (prop nueva, obligatoria; `HiloDeSesion` ya lo tiene) y, en la rama `tirada`, si `p.type === "ABILITY_ROLL" && p.pendingDamage`, monta `<BandejaDeDano … />` debajo de `TiradaIncrustada`. El botón «Aplicar» es `Button variant="secondary"` con `aria-label="Aplicar el daño a <nombre>"`; mientras `isPending`, `disabled`. Estilo: una línea `font-chrome text-chrome-sm` con el número reducido en `font-data`, dentro del mismo bloque de filetes de cobre que la tirada.

- [ ] **Step 4: Ajustar los tests existentes de `MensajeDelHilo`/`HiloDeSesion`** que monten el componente sin `campaignId` (pasar `"c1"`).

- [ ] **Step 5: Correr** → PASS. **Mutación:** en (c) devolver el preview aunque llegue 404 (quitar el `retry: false`/`enabled` no basta; cambiar el `if (isError) return <Pendiente/>` por pintar `data` opcional) → enrojece (c). Anotar. Revertir.

- [ ] **Step 6: `pnpm verify`** limpio. Informe; commit:
  `feat(web): the damage tray in the thread — server preview line and one-click apply for the DM or the target's owner`

---

### Task 8: Web — «Dar XP», la propuesta tras el combate, «1 250 / 2 700 PX» y la regla de progresión

**Files:**
- Create: `apps/web/src/features/sessions/dm/DarXp.tsx`, `apps/web/src/features/sessions/dm/__tests__/DarXp.test.tsx`
- Modify: `apps/web/src/features/sessions/dm/HerramientasDeNarracion.tsx:71, 140-195, 220-278`
- Modify: `apps/web/src/features/encounters/api.ts:98-107` (`endEncounter` devuelve `xpPropuesto?`), `TiraDeIniciativa.tsx:260-270`, `__tests__/capa-de-combate.test.tsx`
- Modify: `apps/web/src/features/character-sheet/api.ts:186` (`SheetResponse.xp?`), `Cabecera.tsx` (o `IdentidadEditable.tsx`, donde esté la casilla de nivel), `vocabulario.ts`, tests de la cabecera
- Modify: `apps/web/src/features/campaigns/reglas.ts`, `ReglasDeLaMesa.tsx:174-183`, `__tests__/ReglasDeLaMesa.test.tsx`
- Modify: `apps/web/src/features/characters/api.ts` (o donde viva `CharacterRow`: `xp?: number`, `statblockRef?: string | null` si no está)

**Interfaces:**
- Consumes: `POST /campaigns/:id/xp` (T5); `SheetResponse.xp` (T5); `endEncounter` → `xpPropuesto` (T5); `tableRules.progresion` (T5); `useCharacters(campaignId)` (`characters/hooks.ts`), `useMyRole`, `useCampaign`/reglas (`campaigns/hooks.ts`, ver cómo `ReglasEnLaMesa` lee la campaña).
- Produces:
  ```ts
  // campaigns/reglas.ts
  export const NOMBRE_PROGRESION: Record<Progresion, { etiqueta: string; frase: string }> = {
    HITO: { etiqueta: "Por hito", frase: "El DM decide cuándo sube cada personaje; la hoja no cuenta experiencia. Es lo de siempre." },
    XP:   { etiqueta: "Por experiencia", frase: "La hoja cuenta PX contra la tabla del SRD y avisa cuando toca subir; el DM da los PX desde la mesa y sigue siendo quien sube el nivel." },
  };
  // sessions/dm/DarXp.tsx
  export function DarXp({ campaignId, propuesta, onHecho }: { campaignId: string; propuesta?: XpPropuesto; onHecho?: () => void }): JSX.Element;
  // character-sheet/vocabulario.ts
  export function frasesDeXp(xp: { actual: number; siguiente: number | null; nivelPorXp: number }, level: number): { marcador: string; aviso: string | null };
  // → marcador "1 250 / 2 700 PX" (es-ES, espacio fino de miles), o "355 000 PX · nivel máximo" con siguiente null;
  //   aviso "Has alcanzado el XP del nivel 4: el DM puede subirte" si nivelPorXp > level, si no null
  ```

- [ ] **Step 1: Pruebas RTL (fallan)**
  - `DarXp.test.tsx`: con `useCharacters` devolviendo `[A (statblockRef null), P (statblockRef "SRD:goblin")]`: A es una casilla marcable; **P se pinta marcada como no seleccionable (`disabled`) con el motivo «Un PNJ de statblock no acumula XP» visible** (regla de interfaz); dos radios «A cada uno» / «A repartir entre los elegidos» con frase; con `propuesta { total: 100, porCabeza: 50, destinatarios: [A, B] }` el formulario abre con A y B marcados, cantidad 50, «A cada uno» y una línea «Propuesto por el combate: 100 PX (2 goblins · VD 1/4)» —usar `vdLegible` de `@dnd/shared` para el VD—; enviar llama a `awardXp(campaignId, { characterIds: [A,B], amount: 50, reason })`; con «A repartir» y 100 sobre dos → `amount: 50`; cantidad 0 → error en línea y no se manda (el botón **no** se deshabilita).
  - `capa-de-combate.test.tsx`: al terminar, si la respuesta trae `xpPropuesto`, aparece «Repartir la experiencia» con `DarXp` prellenado; sin `xpPropuesto`, no.
  - Cabecera/hoja: con `sheet.xp = { actual: 1250, siguiente: 2700, nivelPorXp: 3 }` y `level: 3` se lee «1 250 / 2 700 PX» y no hay aviso; con `nivelPorXp: 4` se lee el aviso; sin `sheet.xp` no se pinta nada de PX.
  - `ReglasDeLaMesa.test.tsx`: hay dos radios «Por hito» / «Por experiencia» y guardar manda `progresion`.
  - `HerramientasDeNarracion`: con la campaña en `XP` hay un botón «Dar XP»; en `HITO` no.

- [ ] **Step 2: Correr** → FAIL.

- [ ] **Step 3: Implementar** — `DarXp.tsx` (casillas por personaje del elenco vía `useCharacters`; los de statblock `disabled` + `title`/texto del motivo; cantidad; radios reparto; motivo; `useMutation` sobre `awardXp`; tras éxito, invalidar `["characters"]`, `["sheet"]`, `["events"]` y `onHecho?.()`). `HerramientasDeNarracion`: `HerramientaAbierta` gana `"xp"`, un `BotonDeHerramienta tono="accent"` «Dar XP» solo si `progresion === "XP"` (leer la campaña con el hook que ya use `ReglasDeLaMesa`/`CampaignSettings`; si la rejilla queda con siete, dejar que la última fila tenga uno: no se inventa un octavo), y su `Dialog` con `title="Dar experiencia"` y `subtitulo="El servidor no sube el nivel: avisa en la hoja y lo pulsa el DM."`. `encounters/api.ts`: tipo de retorno con `xpPropuesto?: XpPropuesto`. `TiraDeIniciativa.tsx`: estado `propuestaXp` que se rellena en `onSuccess` de `terminar` y se pinta con `<DarXp propuesta onHecho={() => setPropuestaXp(null)} />` bajo un título «Repartir la experiencia». Hoja: en la casilla de nivel (`Cabecera.tsx`, donde monta `BotonSubirNivel`), si `sheet.xp`, el marcador en `font-data` y el aviso con el mismo componente de aviso que ya usa la hoja (`Avisos.tsx`/`AvisoDeDm.tsx`), y en la del DM el aviso enlaza al botón «Subir de nivel» (un `<a href="#subir-nivel">` al `id` del botón, o el foco). `reglas.ts` + `ReglasDeLaMesa.tsx`: un `GrupoDeRadios` más («Progresión», `NOMBRE_PROGRESION`).

- [ ] **Step 4: Guarda 1** — `grep -rn "Herramientas del DM\|Nivel" apps/web/e2e` para asegurar que ningún spec cuenta seis botones o localiza la casilla de nivel por un texto que cambia; ajustar en el mismo commit si hace falta.

- [ ] **Step 5: Correr** → PASS. **Mutación:** quitar el `disabled` del PNJ de statblock en `DarXp` → enrojece. Anotar. Revertir.

- [ ] **Step 6: `pnpm verify`** limpio. Informe; commit:
  `feat(web): give XP from the table (statblock NPCs shown blocked with the reason), the combat's proposed split, the sheet's "1 250 / 2 700 PX" and its level-up notice, and the progression rule`

---

### Task 9: El recorrido de navegador y la documentación

**Files:**
- Create: `apps/web/e2e/puerta-de-efectos.spec.ts`
- Modify: `docs/05-datos.md` (`RollRequest.pendingEffect`, `CharacterCondition.expiresOnRest`, `Character.xp`, `XP_AWARDED`, `ABILITY_ROLL.pendingDamage`, las tres migraciones), `docs/08-pruebas.md` (el e2e de API nuevo, el spec de navegador nuevo, qué demuestra cada uno; **los conteos de e2e solo aquí**), `docs/01-arquitectura.md` (la segunda puerta junto a `recordFromEngine`; el controlador `damage-tray`; `XpService`)

**Interfaces:**
- Consumes: todo lo anterior. El spec se **escribe** siguiendo `apps/web/e2e/no-puedes-editar.spec.ts` (dos contextos) y los helpers de `apps/web/e2e/helpers/` (registro, campaña, invitación, hoja derivable). **No se corre**: lo corre el orquestador al cierre, solo, con `WORKTREE_SLOT` si hay otro árbol.

- [ ] **Step 1: Escribir `puerta-de-efectos.spec.ts`** con estos recorridos, cada uno con un `expect` que mire el navegador **del otro** contexto:
  1. **El clérigo cura al guerrero**: contexto A (clérigo, con una actividad `dados` de curación disponible — si el catálogo real no expone ninguna usable por un nivel 1 sin preparar conjuros, usar la del DM «Dar objeto»… no: usar la API directamente en el `beforeAll` para sembrar la actividad de prueba **no es posible desde Playwright sin `overrideProvider`**; en ese caso el recorrido 1 se reduce a: A abre su hoja, usa una actividad con `objetivos` sobre B —la que exista— y en el contexto B los PG cambian sin recargar; **si ninguna actividad del catálogo real permite objetivo ajeno, el recorrido se declara en `08-pruebas.md` como cubierto por el e2e de API y aquí se omite, con la razón escrita**).
  2. **La condición «hasta el descanso largo»**: el DM aplica a B `frightened` con el radio «Hasta el próximo descanso largo»; en el contexto B la hoja dice «hasta descanso largo»; el DM declara un descanso corto → sigue; largo → desaparece, y en el hilo se lee «Descanso largo».
  3. **La bandeja**: el DM saca un goblin, A resuelve un ataque que impacta (repetir hasta impactar, tope 10, o bajar la CA con una anulación del DM a 1) y tira el daño; en el hilo del DM la tarjeta trae «Aplicar» y en el de A no; el DM aplica → «Aplicado» en ambos y los PG del goblin bajan en el elenco.
  4. **XP**: reglas de la mesa → «Por experiencia»; en la hoja de A se lee «0 / 300 PX»; el DM abre «Dar XP», da 300 a A → en el contexto A se lee «300 / 300 PX» y el aviso «Has alcanzado el XP del nivel 2»; el nivel sigue siendo 1.
  Capturas al final de cada recorrido en `apps/web/e2e/__screenshots__/…` si el resto de specs lo hace (mirar `desbordes.spec.ts`).

- [ ] **Step 2: Documentación** — `05-datos.md`: una subsección por columna con semántica y migración; `08-pruebas.md`: filas nuevas en la tabla de e2e de API (`puerta-de-efectos.e2e-spec.ts`: qué demuestra cada bloque) y de navegador (`puerta-de-efectos.spec.ts`), y **actualizar el conteo de e2e** que ese fichero mantiene; `01-arquitectura.md`: la segunda puerta (§3 de la spec) como tercer ejemplo del patrón «misma escritura, dos autorizaciones, la interna sin ruta», y `damage-tray.controller.ts` + `xp.controller.ts` en la lista de módulos de `characters`.

- [ ] **Step 3: `pnpm verify`** limpio (`check:docs` valida enlaces). Informe; commit:
  `test(e2e): puerta-de-efectos browser walkthrough (two contexts) and the data/tests/architecture docs for the three new columns`

---

## Al cerrar la tanda (lo hace el orquestador, D-CF-65)

1. **Aplicar las tres migraciones en local**: `docker compose up -d` y `pnpm --filter @dnd/api exec prisma migrate deploy` (600000).
2. **e2e de API**: `pnpm --filter @dnd/api test:e2e -- puerta-de-efectos` y después la suite entera, sin nada más compilando.
3. **Revisión Opus de la rama entera** (`git diff main...HEAD`), dimensiones en paralelo: seguridad (las dos puertas, 404 vs 403 de la bandeja, `pendingEffect` no entra por HTTP), calidad de pruebas, cascada (mocks de `changeHp` en otros specs), accesibilidad de los radios y la bandeja.
4. **Playwright**: `pnpm --filter @dnd/web exec playwright test puerta-de-efectos condiciones-con-duracion reglas-de-la-mesa combate hoja` (los spec tocados) y luego la suite entera una vez. Con `WORKTREE_SLOT` si hay otro árbol.
5. **Olas de arreglo** (Opus fresco por ola, tope cinco), re-revisión acotada tras cada una.
6. **Docs de cierre**: `07-historial.md` (una entrada), `06-pendientes.md` (cerrar P2-4, P2-5 y «XP: no existe»; abrir lo que salga), `decisiones.md` (D-CF-68, D-CF-69, E-PE-1..12), `como-seguir.md` §0, `00-INDEX.md` generado (`pnpm check:estado`).
7. **Push de la rama**. **No fusionar, no desplegar, no arrancar el paso 3.** Avisar al autor y a la sesión controladora viva (ListAgents).
