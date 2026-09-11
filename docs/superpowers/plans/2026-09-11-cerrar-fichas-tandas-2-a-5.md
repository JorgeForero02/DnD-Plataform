# Cerrar fichas — tandas 2 a 5 y las decididas con código (2026-09-11) · plan de ejecución por subagentes

> Escrito el 2026-09-11 sobre `main` = `845a0ab`, en mitad de la sesión de cerrar fichas
> (`docs/superpowers/notes/2026-09-10-prompt-cerrar-fichas.md`). Cada tarea es **una ficha de
> `06-pendientes.md`** que la clasificación del 2026-09-10 dejó en el cubo B o que el autor
> decidió el mismo día (`D-CF-*` en `decisiones.md`). Lo ejecuta un implementador por tarea, en
> secuencia; **la documentación (archivo, 07, decisiones) y el commit los hace el orquestador**
> después de la revisión, con `pnpm verify` de gancho.

## Global Constraints

Aplican a **todas** las tareas.

- **Prueba que falla primero.** Antes de tocar producción, la prueba nueva se corre y se mira roja
  **por el motivo esperado**; se pega la salida en el informe. Sin RED no hay tarea.
- **Mutación.** Terminado el arreglo, se deshace **una pieza** del arreglo (copia de respaldo del
  fichero, `cp`, **nunca `git checkout`**) y se vuelve a correr la prueba: tiene que enrojecer. Se
  restaura y se pega la salida. Si la mutación no enrojece, la prueba no prueba nada: se rehace.
- **Una transacción se abre con `PrismaService.transaction`, nunca con `$transaction`** (lo
  comprueba `apps/api/src/prisma/no-transaction-suelta.spec.ts`).
- **El contrato es el Zod de `@dnd/shared`.** Ningún campo se redefine en `apps/api` ni en
  `apps/web`. Tras tocar `packages/shared`, `pnpm --filter @dnd/shared build`.
- **Ningún valor de enumeración llega a la pantalla.** La forma legible se escribe una vez por
  dominio (`apps/web/src/dominio/`, `features/*/vocabulario.ts`) y se importa.
- **Los iconos se dibujan** (SVG en `ui/Iconos.tsx` o en el módulo); nada de glifos ni emoji.
- **La autorización se comprueba en el servidor.** Un botón que el servidor contesta con 403 es un
  defecto: si la API cierra una puerta, la pantalla deja de ofrecerla en el mismo cambio.
- **Un 400 no dice si algo existe**; misma frase para «no existe» y «no es tuyo».
- **Código en inglés; vocabulario de mesa en español está permitido en identificadores** (excepción
  declarada en `04-convenciones.md`). Interfaz y comentarios en español.
- **Comandos:** unitarias de API `cd apps/api && npx jest <patrón>`; e2e de API
  `cd apps/api && npx jest --config test/jest-e2e.json <patrón>` (Postgres ya corre en `:5432`);
  web `cd apps/web && npx vitest run <ruta>`; tipos `npx tsc --noEmit -p .` en cada paquete;
  formato `npx prettier --write <ficheros>`.
- **Lo que NO haces, pase lo que pase:** no despliegas · **no corres Playwright** ni `pnpm verify`
  entero (los corre el orquestador) · no dejas un `dev:api` arrancado · **no commiteas, no empujas,
  no lanzas agentes** · no desactivas una prueba, ni bajas un umbral, ni silencias una regla · no
  tocas `docs/` (la documentación la escribe el orquestador) · no rediseñas lo decidido: si algo te
  parece mal, lo cumples y lo anotas en el informe. Si crees que necesitas salirte: repórtalo y
  para.
- **Informe:** en el fichero que diga el encargo. Lleva: qué cambió (ficheros), la salida del RED,
  la salida del verde, la mutación (qué pieza, salida roja, restaurado), y dudas o cosas medidas de
  paso. Si una tarea resulta pedir una migración o una decisión que el plan no da, se para con
  `BLOCKED` y la medición.

---

## Bloque A — las decididas por el autor con código

### Task 1 · El hilo de la sesión mezcla los sucesos de campaña posteriores a su inicio (ficha P3 «archivar», D-CF-19)

**Ficha.** `characters.service.ts` escribe `CHARACTER_ARCHIVED` sin `sessionId` (archivar es un acto
de campaña) y `game-events.service.ts` filtra estricto por `sessionId`, así que «Se archiva a X»
—y «entra Marta», «cambia de bando»— no aparece en el hilo mientras se juega.

**Decisión (D-CF-19):** con `query.sessionId`, el listado devuelve los sucesos de esa sesión **más**
los sucesos de la campaña **sin sesión** cuyo `createdAt` sea posterior al `startedAt` de esa
sesión (si la sesión no tiene `startedAt`, su `createdAt`).

**Files:** `apps/api/src/game-events/game-events.service.ts` (`list`); prueba nueva en
`apps/api/test/sessions.e2e-spec.ts` o un e2e nuevo `apps/api/test/hilo-mixto.e2e-spec.ts`.

- RED: con una sesión **empezada**, archivar un personaje del jugador (`POST
  /campaigns/:id/characters/:cid/archive`, DM) y pedir `GET /campaigns/:id/events?sessionId=<s>`:
  aparece `CHARACTER_ARCHIVED`. Y dos exclusiones en la misma prueba: un suceso de campaña sin
  sesión escrito **antes** del `startedAt` (p. ej. un `MEMBER_JOINED` de la preparación) **no**
  aparece; un suceso de **otra** sesión no aparece.
- Cambio: en `list`, si hay `query.sessionId`, leer la sesión (`findFirst` por id y campaña; 404 si
  no existe) y usar `OR: [{ sessionId }, { sessionId: null, createdAt: { gte: inicio } }]`. El resto
  del `where` (tipos, sujetos) se mantiene combinado con `AND`.
- Mutación: quitar la rama `{ sessionId: null, ... }` del `OR` → la prueba enrojece.
- Ojo: `filtros.subjectIds` con lista vacía sigue significando «ninguno».

### Task 2 · Una regla rota se rearma solo con un objetivo válido (ficha H7)

**Ficha.** Una regla que apunta a una ficha borrada queda `BROKEN` y marcada. «Falta decidir si se
puede seguir armando.» Decidido: **se rearma editando el objetivo**, y el servidor lo comprueba.

**Files:** `apps/api/src/rules-engine/rules-engine.service.ts` (`update`); prueba en
`apps/api/test/rules-engine.e2e-spec.ts`.

- Hoy `update` valida los `effects` **solo si llegan en el cuerpo** (`requireEffectEntitiesInCampaign`,
  ficha J11). Un `PATCH { status: "ARMED" }` sobre una regla cuyo efecto apunta a una ficha borrada
  la rearma contra nada.
- RED: crear regla con `REVEAL_ENTITY` sobre ficha X; borrar X; la regla puede estar `BROKEN` o no
  (el borrado no la marca hoy — no es parte de esta tarea marcarla); `PATCH { status: "ARMED" }`
  sin `effects` → **400** con la misma frase de J11; y `PATCH { status: "ARMED", effects: [<otro
  efecto válido>] }` → 200.
- Cambio: en `update`, si `input.status === "ARMED"` y no vienen `effects`, validar los efectos
  **guardados** (`rule.effects` parseados con `ruleEffectSchema`) con `requireEffectEntitiesInCampaign`.
- Mutación: quitar esa comprobación → enrojece.

### Task 3 · TipTap sale del repositorio (E0, D-CF-12)

**Ficha.** Seis paquetes `@tiptap/*` en `dependencies` de `apps/web/package.json` con **cero
imports** en `apps/web/src`; `scripts/e0-tiptap-roundtrip.mjs` es su único consumidor y no se
empaqueta. El editor rico no está en ningún plan.

**Files:** `apps/web/package.json`, `pnpm-lock.yaml` (regenerar con `pnpm install`),
`scripts/e0-tiptap-roundtrip.mjs` (borrar), y cualquier script de `package.json` que lo llame.

- RED: una prueba en `apps/web/src/__tests__/` (o donde viva la que ya barre `package.json`, si
  existe) que afirme que **ningún paquete `@tiptap/*`** está en `dependencies` ni
  `devDependencies` de `apps/web/package.json` — roja antes.
- Cambio: quitar los seis paquetes, `pnpm install` desde la raíz, borrar el script y su entrada.
  Comprobar `grep -rn tiptap apps packages scripts --include=*.ts --include=*.tsx --include=*.mjs --include=*.json` = 0 fuera del lock.
- Mutación: volver a añadir uno → enrojece.

### Task 4 · Node 22 LTS (P6, D-CF-13)

**Files:** `apps/api/Dockerfile` y `apps/web/Dockerfile` (`FROM node:20-slim` → `node:22-slim`,
las dos etapas si hay más de una), `.github/workflows/ci.yml` (`node-version: 20` → `22`, los dos
jobs), `apps/api/package.json` y `apps/web/package.json` (`engines.node: ">=22"`).

- RED: prueba en `apps/web/src/__tests__/` (junto a `worktree-slot.test.ts`) que lea los cuatro
  ficheros y afirme que **todos** dicen 22 y ninguno dice 20 — roja antes. Es la prueba de que los
  cuatro pines no se desincronizan, que es lo que la ficha temía.
- Cambio: los cuatro pines.
- Verificación: `pnpm build`, `cd apps/api && npx jest`, `cd apps/web && npx vitest run`.
  **No** construyas las imágenes Docker (lo hace el orquestador).
- Mutación: dejar uno en 20 → enrojece.

---

## Bloque B — tanda 2, contrato compartido

### Task 5 · `stampSessionNoteSchema` no acepta el sello vacío

**Ficha.** `packages/shared/src/session.schema.ts:85` tiene `text: z.string().max(500).optional()`;
una llamada directa a la API crea el sello que dice «Nota». Los dos compositores de pantalla ya lo
impiden.

- RED: en `packages/shared/src/__tests__/` (o `session.schema.test.ts` si existe) — `""` y `"   "`
  se rechazan; `undefined` sigue valiendo (el sello sin texto es legítimo si el esquema lo permite
  hoy: **comprobar** qué hace el servidor con `text` ausente y conservarlo).
- Cambio: `.trim().min(1)` sobre el texto cuando viene. Correr las unitarias de `sessions` y el
  e2e `sesion`/`sessions` de API.
- Mutación: quitar `min(1)` → enrojece.

### Task 6 · La fecha de una sesión se puede quitar (P3.5)

**Ficha.** `createSessionSchema.scheduledAt` es `z.coerce.date().optional()` sin `.nullable()`; no
hay valor que el `PATCH` pueda mandar para «quita la fecha».

**Files:** `packages/shared/src/session.schema.ts`, `apps/api/src/sessions/sessions.service.ts`
(`update`), `apps/web/src/features/sessions/SessionEditor.tsx` (el campo vacío manda `null`),
pruebas: e2e de API `sessions.e2e-spec.ts`, RTL `SessionEditor.test.tsx`.

- RED (API): crear sesión con fecha, `PATCH { scheduledAt: null }` → 200 y `scheduledAt` nulo en
  la base. RED (web): vaciar el campo de fecha y guardar manda `scheduledAt: null`.
- Cambio: `scheduledAt: z.coerce.date().nullable().optional()` en el esquema de actualización
  (**solo** en el de actualización si el de creación no debe aceptar `null`; decide y anótalo);
  `data.scheduledAt = null` cuando llega `null`; el editor manda `null` al vaciar.
- Mutación: quitar el `null` del servicio → el e2e enrojece.

### Task 7 · Los dos esquemas de consulta viven en `@dnd/shared` (S12)

**Ficha.** `listTracesQuerySchema` (`apps/api/src/rules-engine/rules-engine.controller.ts`) y
`levelUpPreviewQuerySchema` (`apps/api/src/level-up/level-up.schema.ts`) están fuera de shared, que
es la fuente única del contrato.

- RED: prueba en `packages/shared/src/__tests__/` que importe los dos desde `@dnd/shared` y valide
  un caso bueno y uno malo de cada uno — no compila antes.
- Cambio: mover los esquemas a `packages/shared/src/rules-engine.schema.ts` y a un módulo de
  `level-up` en shared (crear `level-up.schema.ts` y exportarlo en `index.ts`), importarlos desde
  ahí en la API, borrar los locales. La web, si tipa esas consultas a mano, pasa a importar el tipo.
- Mutación: no aplica (es mudanza); la prueba de shared y las unitarias de los dos módulos de API
  en verde bastan, más `tsc` de los tres paquetes.

### Task 8 · I1 — «Almádena» es «Mazo de guerra» en el SRD 5.1 en español

**Ficha.** Cuatro nombres sin contrastar: Guja, Almádena, Mangual, Lanza de caballería. Contrastados
el 2026-09-11 contra el SRD 5.1 en español (Nosolorol, traducción de Ana Navalón,
`https://srd.nosolorol.com/DD5/equipamiento/armas.html`): **Guja ✓, Mangual ✓, Lanza de
caballería ✓; *maul* = «Mazo de guerra»**, no «Almádena».

**Files:** `apps/api/src/rules/catalog/weapons.ts:314`; cualquier prueba o fixture que cite
«Almádena» (`grep -rn "Almádena" apps packages scripts`).

- RED: en `apps/api/src/rules/catalog/reference.spec.ts` (o donde se fijen nombres), afirmar que
  la clave de *maul* se llama «Mazo de guerra» — roja antes.
- Cambio: la cadena. Nada más. **La cita de la fuente va en el comentario junto al nombre.**
- Mutación: RED = ausencia.

---

## Bloque C — tanda 3, web sueltas (S)

### Task 9 · Lote de cuatro arreglos de una pieza en `apps/web`

Cuatro fichas pequeñas del mismo tipo; **un solo encargo**, cada una con su prueba.

**9a · `posiciones.ts` — el aviso apunta al mando equivocado.** `apps/web/src/features/sessions/taller/posiciones.ts:121-124`
dice «si alguien sube un semieje y olvida el tope»; el tope se deriva del semieje. El mando que sí
apila es **el anillo exterior** (`ANILLOS`, con `1.2` en vez de `1` 731 de 3000 fichas quedan
pegadas al borde). Cambiar el comentario para que diga eso. La prueba que lo defiende ya existe;
comprobar que sigue en verde. (Sin RED: es un comentario.)

**9b · `wikilinks.ts` — «gana el más reciente» acoplado.** `resolverCitas` se queda con la primera
de la lista; que sea la más reciente depende de que `entities.service.ts:102` ordene por
`createdAt desc`. Cambio: `resolverCitas` **ordena ella misma** por `createdAt` desc antes de
elegir (las fichas traen `createdAt`), y su comentario lo dice. RED: prueba unitaria con la lista
en orden inverso → hoy elige la vieja; después, la nueva. Mutación: quitar el `sort`.

**9c · `SessionEditor.test.tsx` — el fixture pasa por coincidencia.** El fixture usa
`20:00:00Z`; con `20:00:30Z` la ida y vuelta por `datetime-local` pierde los segundos y la
aserción fallaría. Cambio: **añadir** una prueba con `20:00:30Z` que afirme lo que de verdad
pasa —el input muestra `…T20:00` y al guardar sin tocar se manda `…T20:00:00.000Z`—, y quitar el
comentario que confesaba la coincidencia. RED: la prueba nueva enrojece si se afirma lo contrario
(comprobarlo escribiendo primero la aserción ingenua).

**9d · `CreateCampaignModal` — el estado de error local duplica `mutation.error`.**
`apps/web/src/features/campaigns/CreateCampaignModal.tsx:17`. Cambio: quitar el `useState` y
pintar `mutation.error` (traducido como haga el resto del módulo). RED: prueba RTL que haga fallar
la mutación y afirme el mensaje en pantalla — pasa antes también (ojo: entonces la prueba fija el
comportamiento, y la mutación es quitar el `<p>` del error → enrojece). Cambiar `disabled` del
botón de guardar por `aria-disabled` si lo lleva (regla de la casa).

### Task 10 · El flash «se cerró tu sesión» se limpia al salir de la pantalla de entrar

**Ficha.** `LoginPage.tsx:42` solo limpia el `flash` al entrar con éxito; si el usuario navega a
otra pantalla sin entrar, reaparece la próxima vez.

- RED: RTL en `apps/web/src/__tests__/LoginPage.test.tsx` — con `flash` puesto, montar la página,
  desmontarla (cambiar de ruta en un `MemoryRouter`), volver a montarla: el flash **no** está.
- Cambio: `useEffect(() => () => clearFlash(), [clearFlash])` en `LoginPage` (se limpia al
  desmontar). Comprobar que la prueba de `AccountPage` que lee el flash en el `LoginStub` sigue en
  verde (el stub no es la página real).
- Mutación: quitar el `useEffect` → enrojece.

### Task 11 · La rama de error del detalle de campaña distingue «no disponible» de «no se pudo cargar»

**Ficha.** `CampaignDetailPage.tsx:792-799` dice «no existe o no tienes acceso» ante cualquier
fallo, incluido un 500 o la red caída. `ApiError` trae `status`.

- RED: RTL en `pages/__tests__/CampaignDetailPage.test.tsx` — con `fetchCampaign` rechazando con
  `ApiError(…, 500)` el título es «No se pudo cargar la campaña» y el texto invita a reintentar;
  con 404 sigue el texto actual.
- Cambio: si `error instanceof ApiError && error.status === 404` (o 403) → texto actual; en otro
  caso → «No se pudo cargar la campaña» + «Vuelve a intentarlo en un momento.» y un botón
  «Reintentar» que llame a `refetch`. Sin distinguir 404 de 403 (regla).
- Mutación: quitar la distinción → enrojece.

### Task 12 · `VISIBILITY_CONFIG` deja de ser privado en `ui/Badge.tsx` (U6-visibilidad)

**Ficha.** Las cinco etiquetas de nivel («Público», «Jugadores», «Jugadores concretos», «DM y
creador», «Solo DM») viven solo dentro de `Badge`; una pantalla no puede nombrar un nivel dentro
de una frase sin duplicarlas. La regla de la casa es «una forma legible por dominio».

- Cambio: mover las etiquetas a `apps/web/src/features/entities/visibilidad.ts` (que ya tiene
  `EXPLICACION_DE_NIVEL`) como `ETIQUETA_DE_NIVEL: Record<Visibility, string>`, y que `Badge`
  las importe. Buscar (`grep -rn '"Solo DM"\|"Jugadores concretos"\|"DM y creador"' apps/web/src`)
  otras copias y hacer que importen.
- RED: prueba en `features/entities/__tests__/` que afirme que `ETIQUETA_DE_NIVEL` existe, tiene
  las cinco claves y que `Badge` pinta exactamente `ETIQUETA_DE_NIVEL[nivel]` (importando ambos).
- Mutación: cambiar una etiqueta en `Badge` a mano → enrojece.

### Task 13 · Avisos ruidosos de `ts-jest` y `postcss.config.js` (P4)

**Ficha.** `ts-jest` avisa «Got a `.js` file to compile while `allowJs` option is not set» por
`packages/shared/dist/*.js` en cada e2e; Vite avisa `MODULE_TYPELESS_PACKAGE_JSON` por
`apps/web/postcss.config.js`.

- Cambio A: en `apps/api/test/jest-e2e.json` (y `apps/api/package.json` → `jest` si aplica),
  ajustar `transform` para que `ts-jest` no reciba `.js` (p. ej. `"^.+\\.ts$": "ts-jest"`) o
  `transformIgnorePatterns` para `packages/shared/dist`. Comprobar con un e2e cualquiera que el
  aviso desaparece **y** que la suite sigue en verde.
- Cambio B: renombrar `apps/web/postcss.config.js` → `postcss.config.mjs` (o añadir `"type":
  "module"` si el paquete ya es ESM; medir cuál rompe menos). Comprobar `pnpm --filter @dnd/web build`
  sin el aviso.
- RED/mutación: no hay prueba automática razonable; la evidencia es la salida antes/después
  pegada en el informe. Declararlo así.

### Task 14 · `pnpm db:slot` funciona en una ruta con `&`

**Ficha.** `scripts/db-slot.mjs` usa `shell: true` (línea ~34) y el `&` de `D&D-Plataform` rompe
el comando: `Command "prisma" not found`.

- RED: prueba en `apps/web/src/__tests__/worktree-slot.test.ts` (o un `db-slot.test.ts` junto a
  ella) que compruebe que el script **no** usa `shell: true` y que invoca `execFileSync` con
  `process.execPath` + la ruta a `prisma/build/index.js` (como hace `apps/web/e2e/admin-reinicio.spec.ts`).
- Cambio: sustituir el `shell: true` por `execFileSync(process.execPath, [prismaCli, ...])`.
  Probarlo de verdad: `WORKTREE_SLOT=1 node scripts/db-slot.mjs` crea/migra `dnd_wt1` (pegar salida)
  y luego borrar esa base si el script tiene modo de limpieza; si no, dejarla y decirlo.
- Mutación: volver al `shell: true` → enrojece.

---

## Bloque D — tanda 4, API medianas

### Task 15 · Aviso de armadura sin competencia (I6)

**Ficha.** Existe `attack_not_proficient` (`rules/attacks.ts:109`); falta el de armadura. SRD 5.1,
«Armor Proficiency»: *«If you wear armor that you lack proficiency with, you have disadvantage on
any ability check, saving throw, or attack roll that involves Strength or Dexterity, and you can't
cast spells.»* **Solo aviso**: el motor cuenta y avisa, no impide (doctrina del paso 2).

**Files:** `apps/api/src/rules/catalog/index.ts` (tipo de aviso), donde se derive la CA con el
equipo (`rules/items.ts` o `character-sheet.service.ts`, `equipoEquipado`), vocabulario web
`features/character-sheet/vocabulario.ts` (frase del aviso; **el `Record` es exhaustivo**: sin frase
no compila).

- RED: unitaria del motor — un personaje sin competencia `heavy` con cota de placas equipada
  produce `warnings` con `code: "armor_not_proficient"` y la clave de la armadura; con competencia,
  no. Y la web: `vocabulario.test.ts` cubre todas las claves de aviso.
- Cambio: el aviso, con `armorKey` y la categoría; la frase en español.
- Mutación: quitar la emisión → enrojece.

### Task 16 · «Estable» sobrevive a la petición (H1b)

**Ficha.** `character-sheet.service.ts:1631`: estabilizarse pone los contadores a cero y un `GET`
posterior no distingue «estable» de «acaba de caer a 0». Decidido: **«estable» es una condición
reservada** (`CharacterCondition` con clave `stable`), como `raging`/`helped` (D-P2-10).

- RED: e2e (`apps/api/test/salvaciones-de-muerte.e2e-spec.ts` o el que ya cubra las salvaciones):
  tras tres éxitos, `GET` de la hoja da `deathSaves.status === "stable"`; al curar por encima de 0,
  la condición desaparece y el estado es `alive`; y un jugador **no puede** ponerse `stable` a mano
  (`POST` de condición con esa clave → 400, misma regla que `raging`).
- Cambio: al estabilizar (tres éxitos o 20 natural sin revivir), crear la condición reservada
  `stable`; `estadoDeMuerte` la lee: `currentHp === 0 && stable` → `"stable"`; cualquier cambio de
  PG por encima de 0 la retira; recibir daño a 0 PG la retira también (SRD: *«If you take any
  damage while stable, you are no longer stable»* — comprobar la frase exacta en el SRD y citarla).
  Reservar la clave donde se reservan las otras.
- Mutación: no crear la condición al estabilizar → enrojece.

### Task 17 · `quantity` deja de ser absoluto donde el dinero es delta (M2B-8)

**Ficha.** Dos personas descontando una flecha a la vez dejan 19 en vez de 18. La bolsa ya resuelve
la misma carrera con deltas.

**Files:** `packages/shared/src/inventory.schema.ts` (esquema de actualización: `quantityDelta`
entero ≠ 0, excluyente con `quantity`), `apps/api/src/inventory/inventory.service.ts` (aplicar el
delta con `update({ data: { quantity: { increment } } })` dentro de la transacción, y 409 legible si
baja de 1 — o borrar la fila si llega a 0 y así lo hace `consume`; **imitar `consume`**), pantalla
que edite cantidades (`features/inventory/*`) → usar el delta desde los botones ±.

- RED: e2e — dos `PATCH` concurrentes con `quantityDelta: -1` sobre 20 dejan 18 (con `quantity:
  19` absoluto dejaban 19). Unitaria de esquema: `quantity` y `quantityDelta` a la vez → error.
- Mutación: aplicar el delta leyendo y escribiendo (no `increment`) → la carrera vuelve.

### Task 18 · Equipar devuelve la CA nueva (M2B-11)

**Ficha.** `inventory/hooks.ts:91,98` hace `fetchAc` → `PATCH` → `fetchAc`; si la segunda falla,
la pantalla enseña un estado que el servidor ya cambió.

- RED (API): el `PATCH` de equipar/desequipar responde con `{ item, ac }` (esquema en shared:
  añadir `ac: number | null` a la respuesta si la respuesta ya tiene forma; si no, definirla). RED
  (web): la mutación usa `data.ac` y **no** llama a `fetchAc` (espía que afirme cero llamadas).
- Cambio: el servicio calcula la CA tras la escritura, dentro de la misma transacción con
  `equipoEquipado(..., tx)` (existe desde P2-0b); el hook borra los dos `fetchAc`.
- Mutación: devolver `ac` sin recalcular (el viejo) → el e2e enrojece.

### Task 19 · `NOTIFY` del motor llega a la bandeja (N3-notify)

**Ficha.** `rules-engine.service.ts:616-620` deja `NOTIFY` en la traza y no en la bandeja porque no
hay `NotificationType`. `Notification.type` es `String` en Prisma: **sin migración**.

**Files:** `packages/shared/src/notification.schema.ts` (`"RULE_NOTIFY"` en `NOTIFICATION_TYPES`),
`apps/api/src/notifications/notifications.service.ts` (crear la notificación para el destinatario
del efecto — mirar la forma de `NOTIFY` en `rules-engine.schema.ts`: a quién va y con qué mensaje),
`rules-engine.service.ts` (llamar), web `features/notifications/vocabulario` (el `Record` es
exhaustivo: frase para `RULE_NOTIFY`, sin destino si no lo hay).

- RED: e2e del motor — una regla automática con efecto `NOTIFY` dispara y el destinatario ve la
  notificación en `GET /notifications`; quien no es destinatario, no.
- Mutación: no crear la notificación → enrojece.

### Task 20 · `PATCH /auth/password` devuelve un token fresco

**Ficha.** Cambiar la contraseña y volver a entrar en el mismo segundo puede rechazar el token
recién emitido (`iat` en segundos); el e2e espera 1,1 s por eso.

- RED (API): la respuesta de `PATCH /auth/password` es `{ success: true, token }` y ese token vale
  **inmediatamente** para `GET /auth/me` sin esperar (quitar la espera de 1,1 s de `auth.e2e-spec.ts`
  y ver que pasa). **La regla del empate no se afloja** (`JwtStrategy`: `iat <= changedAtSeconds`
  = caduco, decidida en 1.18a). Solución: el token fresco se firma con `iat` explícito en el
  payload = `Math.floor(passwordChangedAt.getTime() / 1000) + 1` (`jsonwebtoken` respeta un `iat`
  puesto en el payload; no se pone `nbf`), así `iat > changedAtSeconds` sin esperar a que cambie
  el reloj. Comprobar en la prueba que el token viejo sigue rechazado (401) y el nuevo entra (200)
  en la misma milésima.
- RED (web): `PasswordForm` usa el token devuelto (`setAuth`) en vez de `logout()` + navegar a
  login; la prueba «CRITICAL: clears the token…» de `AccountPage.test.tsx` cambia de sentido: ahora
  afirma que el token **nuevo** queda en el store y **no** se navega a login. Cambiar `cuenta.spec.ts`
  (Playwright) es del orquestador: **anotar en el informe qué recorrido cambia**.
- Mutación: devolver el token viejo → enrojece.

### Task 21 · `viewerFor` deja de vivir en trece servicios (P4)

**Ficha.** `grep -rln "private async viewerFor" apps/api/src` = 13; la casa común es
`apps/api/src/common/character-viewer.ts` (`viewerFor(prisma, membership, userId, campaignId)`).

- Cambio: cada servicio importa el común y borra su copia. **Uno a uno**, corriendo las unitarias
  del módulo tras cada uno. Si una copia hace algo distinto (comparar antes de borrar), **parar** y
  anotarlo: puede ser una diferencia deliberada.
- RED: prueba nueva `apps/api/src/common/un-solo-viewer-for.spec.ts` que barre `apps/api/src` y
  afirma **cero** `private async viewerFor` fuera de `common/` — roja antes (13).
- Mutación: RED = las copias.

### Task 22 · Los enlaces del taller se piden una vez por campaña (P3 menor)

**Ficha.** El taller dispara hasta 18 consultas de enlaces al abrir y `refetchOnWindowFocus` las
repite. Decidido: **una ruta de enlaces por campaña**, `GET /campaigns/:id/links`, filtrada por
`canView` sobre **los dos extremos** (misma regla que `links.service.ts` ya aplica por ficha).

- RED (API): e2e en `links.e2e-spec.ts`: el DM ve todos; el jugador **no** ve un enlace cuyo
  extremo `DM_ONLY` no puede ver.
- RED (web): el taller (`TableroTelarana`/quien pida enlaces) hace **una** llamada con la campaña
  (espía sobre `fetchCampaignLinks`, cero sobre `fetchLinks` por ficha).
- Mutación: filtrar solo por un extremo → el e2e del jugador enrojece.

### Task 23 · El texto de visibilidad sale de una matriz que una prueba compara con `canView` (U10)

**Ficha.** `features/entities/visibilidad.ts` describe la matriz del servidor y ya mintió una vez.

- Cambio: en `visibilidad.ts`, declarar `QUIEN_VE: Record<Visibility, { noMiembro, jugador,
  jugadorConcedido, creador, dm }>` (booleanos) y **componer** `EXPLICACION_DE_NIVEL` desde ahí (o
  al menos que la prueba la lea). Nueva prueba en **`apps/api`** (`common/visibilidad-matriz.spec.ts`)
  que importe `canView` y compare, para cada nivel y cada espectador de mentira, con la matriz
  declarada — la matriz se **duplica como fixture** en la prueba de API (la web no puede
  importarse desde la API ni al revés; la duplicación es el precio y se declara) **o** se mueve la
  matriz a `packages/shared` (mejor: `visibility.schema.ts` ya vive ahí). **Elegir shared.**
- RED: la prueba de API con la matriz de shared; roja si la matriz miente (comprobar poniendo un
  valor falso primero).
- Mutación: cambiar un booleano de la matriz → enrojece.

---

## Bloque E — tanda 5, pantalla (medir en navegador: **el orquestador corre Playwright**; el implementador escribe el e2e y lo deja listo)

### Task 24 · El diálogo de creación de personaje usa el catálogo (D-OP-20, parte 1)

**Ficha.** `features/characters/CharacterEditor.tsx:80-95` pide raza y clase como texto libre; un
personaje creado ahí nace sin clave. El selector de catálogo ya existe dos veces
(`character-sheet/IdentidadEditable.tsx` y donde lo ponga `ae37dfa`, «say where the catalogue picker
now lives twice»): **reutilizarlo**, no un tercero.

- RED (RTL): `CharacterEditor.test.tsx` — el diálogo ofrece raza y clase del catálogo (`GET
  /catalog`) y al guardar manda `raceKey`/`classKey` (y `subraceKey` si el selector lo trae), no
  `race`/`class`. Y el botón de guardar lleva `aria-disabled`, no `disabled`.
- e2e Playwright nuevo `apps/web/e2e/crear-personaje.spec.ts`: crear un personaje desde la lista,
  elegir «Enano» y «Guerrero», guardar, y en la hoja aparecen; **medir** que el diálogo cabe en la
  ventana a 1280 y a 390.
- Mutación: mandar `race` en vez de `raceKey` → RTL enrojece.

### Task 25 · `OWNER_DM` en un statblock vuelve a valer (P2)

**Ficha.** `statblocks.service.ts:181` pasa `createdById: ""` a `canView`; el editor dejó de ofrecer
`OWNER_DM` por eso.

- RED (API): e2e en `statblocks.e2e-spec.ts` — un statblock `OWNER_DM` creado por el DM A **no** lo
  ve el jugador, y **sí** lo ve el DM B (segundo DM por `PATCH /members`)… **ojo**: `OWNER_DM` es
  «DM y creador»; el segundo DM lo ve por ser DM. La prueba que distingue: un statblock `OWNER_DM`
  cuyo `createdById` es el jugador P (crearlo por Prisma) lo ve P y no lo ve Q.
- Cambio: pasar `fila.createdById`. Devolver `OWNER_DM` a `NIVELES_DE_CRIATURA` en
  `EditorDeStatblock.tsx` con su frase, y una RTL que afirme que se ofrece.
- e2e Playwright: extender `bestiario.spec.ts` para elegir `OWNER_DM` y guardarlo.
- Mutación: volver a `""` → enrojece.

### Task 26 · La tirada de ataque elige visibilidad (I10)

**Ficha.** `TirarAtaqueBoton.tsx` no ofrece `visibility`; el esquema (`character-sheet.schema.ts:111`)
la acepta. El selector ya existe en el panel de tiradas general.

- RED (RTL): el botón ofrece el mismo selector (radios con frase, regla de la casa) y manda
  `visibility` elegida; por defecto `PLAYERS`.
- e2e Playwright: extender `tirada.spec.ts` o `hoja.spec.ts`: el DM tira un ataque con un PNJ a
  `DM_ONLY` y el jugador **no** lo ve en el hilo.
- Mutación: no mandar `visibility` → RTL enrojece.

### Task 27 · `Session` no ofrece `SPECIFIC_PLAYERS` (P3)

**Ficha.** `Session` no tiene `grants`, el nivel es inerte y el selector lo ofrece igual.

- Cambio: en `packages/shared/src/session.schema.ts` la visibilidad de sesión excluye
  `SPECIFIC_PLAYERS` (`visibilitySchema.exclude([...])`), el servidor devuelve 400 si llega, y
  `SessionEditor.tsx` no lo ofrece; una sesión ya guardada con ese valor se muestra **marcada y no
  seleccionable** (regla de la casa). Comprobar en la base local si existe alguna (`SELECT count(*)`
  por Prisma en un e2e o script desechable): si hay, decirlo.
- RED: unitaria de shared (rechaza), e2e (400), RTL (no se ofrece; el valor guardado se muestra
  marcado).
- Mutación: quitar el `exclude` → enrojece.

### Task 28 · La petición de tirada dice que es de concentración (P3 menor)

**Ficha.** `concentrationSave` llega en la petición de tirada y ninguna pantalla lo dice al jugador.

- Medir primero: qué `label`/campos trae la `RollRequest` que crea `changeHp` para la concentración
  (`character-sheet.service.ts`, busca `concentrationSave`). Si el `label` ya dice «concentración»,
  la tarea es que **la bandeja del jugador lo destaque** (chip o frase); si no lo dice, añadir un
  campo `reason: "concentration"` al esquema de `RollRequest` en shared (sin migración si `RollRequest`
  guarda `label` libre — si hace falta columna, **BLOCKED** con la medición).
- RED (RTL): la fila de la bandeja de tiradas muestra «Salvación de concentración» para esa petición.
- e2e Playwright: extender `peticion-de-tirada.spec.ts`.

### Task 29 · Los 22 `JSON.stringify({})` se van (P3)

**Ficha.** `apiFetch` ya no manda `Content-Type` sin cuerpo; 22 llamadas llevan `body:
JSON.stringify({})` con un comentario que describe un `apiFetch` que no existe, y
`features/level-up/__tests__/api.test.ts:53` fija la forma vieja.

- Cambio: quitar los 22 y sus comentarios; la unitaria pasa a afirmar `init.body` **ausente**.
- RED: esa unitaria cambiada enrojece antes.
- **El orquestador corre la tanda de Playwright entera después**: es lo único que caza un POST sin
  cuerpo rechazado. Dejarlo dicho en el informe.

### Task 30 · El aviso «no puedes editar esto» se mide en la pantalla de un jugador (1.18b)

- e2e Playwright nuevo con **dos contextos** (patrón de `admin-reinicio.spec.ts`): el DM crea una
  ficha `PLAYERS`, el jugador la abre y ve el motivo por el que no puede editar, con `aria-disabled`
  en el control y el motivo visible; medir contraste del motivo como hace `tokens-contrast.spec.ts`.
- Sin código de producción salvo que la medición encuentre algo (entonces: arreglar y decirlo).

### Task 31 · La pantalla de subida de nivel se mide (U7-contraste)

- Añadir la pantalla de subida de nivel a `apps/web/e2e/tokens-contrast.spec.ts` (mismo patrón que
  las cinco que ya visita) en los tres temas.

### Task 32 · Recorrido de teclado (U6)

- e2e Playwright nuevo `apps/web/e2e/teclado.spec.ts`: desde la lista de campañas, con `Tab` y
  `Enter` se llega a una campaña, se abre «El mundo», se abre una ficha y se vuelve; ningún
  control interactivo con `tabindex="-1"` sin motivo; el foco visible (`outline` calculado ≠ none)
  en cada parada. Si algo falla, arreglar el control y decirlo.

### Task 33 · El listado de campañas dice cuánto mundo tiene cada una (U4)

- RED (API): `GET /campaigns` devuelve `entityCount` contado **con `canView`** para quien pregunta
  (e2e: el jugador cuenta menos que el DM cuando hay fichas `DM_ONLY`).
- RED (RTL): `CampaignList` pinta «12 fichas» (forma legible con singular/plural).
- Mutación: contar sin `canView` → el e2e del jugador enrojece.

### Task 34 · La lista de `labelKey` del vocabulario deja de escribirse a mano (S10-vocabulario)

**Ficha.** `vocabulario.test.ts:13` lista a mano las claves que el motor puede emitir.

- Cambio: un script `scripts/claves-de-traza.mjs` que **genere** `packages/shared/src/generated/label-keys.ts`
  leyendo el catálogo de la API (o, si el catálogo no exporta las claves de forma estática, que la
  API las exporte desde `rules/catalog/index.ts` como `LABEL_KEYS` y un `pnpm check` compare);
  **elegir la salida más barata que haga imposible que el catálogo estrene una clave sin frase**, y
  la prueba de la web la consume.
- RED: añadir una clave falsa al catálogo (en la prueba) → la comprobación enrojece.

### Task 35 · Tema Claro: papel cálido (D-OP-10, P3)

- Cambio: `apps/web/src/ui/tokens.css`, bloque del tema claro: `--bg-ch` y `--surface-ch` a los
  del prototipo (`prototipo/src/index.css`, papel `#e6e1d4` → canales), y reajustar `--text-ch`,
  `--muted-ch`, `--copper-text-ch`, `--warning-text-ch`, `--danger-text-ch`, `--accent-text-ch` si
  hace falta para que **las 19 mediciones de `tokens-contrast.spec.ts` sigan en verde**.
- El orquestador corre `tokens-contrast.spec.ts` y `clases-que-si-pintan.spec.ts`; el implementador
  calcula los contrastes con la fórmula WCAG en un script desechable y los pega en el informe.

---

## Lo que este plan NO hace

- **Las L** (vitela de Lectura, S11 tipos en shared, A2 invitar por correo, E1 buscador cruzado):
  fuera, se dicen en el informe final.
- **Las migraciones** (D-CF-14): tanda propia después de esta, un commit por migración.
- **El paso 3.**
