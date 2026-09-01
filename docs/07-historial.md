# Historial

Qué se entregó, por qué, y cómo revertirlo. Fechas absolutas. El detalle por tarea —commit,
número de pruebas, resultado de la revisión— vive en el ledger
`.superpowers/sdd/progress.md`; aquí van los hitos.

---

## 2026-08-31 — Editor de entidades: se arregla la pérdida de datos silenciosa

**Qué.** Cinco arreglos sobre el editor de entidades (commit `7714833`), encontrados en su
revisión independiente:

1. **Crítico.** Editar una entidad `SPECIFIC_PLAYERS` sin tocar la selección de jugadores
   mandaba `specificPlayerIds: []`, y el servicio lo interpretaba como "borra todas las
   concesiones y no crees ninguna" (`entities.service.ts:112-119`). Se arregló con precarga
   real: `useEntity` (nuevo hook, `features/entities/hooks.ts`) pide el detalle —que ya traía
   `grants`— solo en modo edición, y siembra la selección una vez llega. Mientras el detalle
   no ha llegado, `specificPlayerIds` no se manda (guarda de la carrera: si se pulsa Guardar
   en ese hueco, no se destruye nada).
2. El `fieldset` "Jugadores con acceso" mostraba todas las casillas vacías al editar, aunque
   hubiera concesiones vivas. Se cae solo con el arreglo 1; lleva su propia prueba porque
   afirma sobre lo que se ve, no sobre el payload.
3. Un jugador que creaba una entidad heredaba el `DM_ONLY` por defecto del modelo y su
   entidad desaparecía (invisible incluso para él). El formulario de creación arranca ahora
   en `OWNER_DM` — una línea en `EntityEditor.tsx`, sin tocar `canView` ni los valores por
   defecto del esquema o de Prisma. Ver [05-datos.md](./05-datos.md).
4. Un error del servidor (400 de Zod, 403) se pintaba como JSON crudo dentro del modal.
   `lib/api.ts` ahora extrae un mensaje legible (`fieldErrors`/`formErrors` de Zod
   concatenados, o `message` si es una cadena) y solo cae al texto crudo si el cuerpo no es
   JSON entendible.
5. `useMembers` se pedía siempre al abrir el editor, aunque la visibilidad nunca fuera
   `SPECIFIC_PLAYERS`, y un fallo o una carga en curso dejaba el `fieldset` vacío —el mismo
   estado, visualmente, que "cero concesiones". Ahora solo se pide cuando la visibilidad lo
   necesita (`useMembers(campaignId, { enabled })`, extensión mínima y compatible hacia atrás
   de `features/campaigns/members.ts`) y `isLoading`/`isError` tienen su propio texto.

**Por qué.** El arreglo 1 no era un riesgo eventual: era determinista. Abrir cualquier entidad
`SPECIFIC_PLAYERS`, corregir una coma del nombre y guardar destruía el 100 % de sus
concesiones, siempre, sin aviso — la entidad quedaba en `SPECIFIC_PLAYERS` con cero
concesiones, que nadie salvo el DM ve, y la lista seguía pintando la misma insignia.

**Pruebas.** 6 nuevas (`EntityEditor.test.tsx`: arreglos 1, 2, 3 y la carrera del arreglo 1,
más la guarda del camino "quitar SPECIFIC_PLAYERS" que ya funcionaba y no tenía prueba;
`lib/__tests__/api.test.ts`: arreglo 4, tres casos). Las 6 se vieron en rojo antes del arreglo
correspondiente. La prueba de creación existente no se tocó.

**Verificación.** `pnpm verify` limpio (build + lint + formato + 62 unitarias: shared 10, api
37, web 15) y `pnpm --filter @dnd/web e2e` en verde (2/2) — se comprobó explícitamente que la
prueba que selecciona `DM_ONLY` a mano seguía pasando tras cambiar el valor inicial del
selector.

**No arreglado, dado de alta en [06-pendientes.md](./06-pendientes.md):** las filas de la
lista de entidades son botón de editar aunque el servidor vaya a devolver 403;
`auth.store.ts:13` deja `user: null` tras recargar; falta `key` en `EntityTab` al cambiar de
pestaña; el modal no tiene `role="dialog"` ni cierra con Escape.

**Cómo revertir.** `git revert` del commit: devuelve `EntityEditor.tsx`, `features/entities/
{api,hooks}.ts`, `features/campaigns/members.ts` y `lib/api.ts` a su estado anterior. No toca
`apps/api` ni `packages/shared` — no hay migración que revertir.

---

## 2026-08-31 — Enlaces y comentarios en el editor de entidades (1.12b), y su revisión
(1.12b-fix)

**Qué.** `LinksPanel` y `CommentThread`, montados dentro de `EntityEditor` solo en modo
edición (`isEdit && entity`): panel de enlaces con selector de destino y etiqueta opcional,
hilo de comentarios con nombre de autor resuelto contra `useMembers`. El selector de destino
usa `useAllEntities` (`fetchAllEntities`, sin filtro `type`) porque un enlace puede apuntar a
cualquier tipo de entidad, no solo al de la pestaña activa.

**Por qué falló la primera revisión.** El único e2e de Playwright que existía entonces
(`campana.spec.ts`) pulsaba `Nuevo` y guardaba: nunca pulsaba la fila de una entidad ya creada,
así que nunca activaba `isEdit`. Como los dos paneles solo se pintan en ese modo, **ningún
navegador había pintado jamás `LinksPanel` ni `CommentThread`**, y el e2e pasó en verde sin
ejecutar una sola línea del código nuevo. `docs/08-pruebas.md` regla 3 describe exactamente
este fallo.

**Los arreglos de la revisión independiente (1.12b-fix), en el mismo commit:**

1. **El borrado de un enlace o un comentario ajeno fallaba en silencio.**
   `deleteLink.mutate(l.id)` / `deleteComment.mutate(c.id)` no tenían `onError`; el servidor sí
   rechazaba con 403 (`links.service.ts:75`, `comments.service.ts:65`) pero la interfaz no
   cambiaba nada, así que un jugador que pulsaba "Borrar" en un comentario ajeno no veía ni
   mensaje ni cambio. Arreglado reutilizando el `error` que ya existía para el camino de
   añadir/publicar, con `mutate(id, { onError: ... })`.
2. **El selector de destinos de enlace quedaba obsoleto hasta 30 s.** `allEntitiesKey` es una
   rama distinta de `entitiesKey(campaignId, type)` (`entities/hooks.ts`), y las mutaciones de
   crear/actualizar entidad solo invalidaban la segunda; con `staleTime: 30_000`
   (`lib/queryClient.ts`) tampoco se refrescaba al montar. Un DM que creaba una entidad y
   abría otra para enlazarla no la veía en el desplegable durante medio minuto. Arreglado
   invalidando también `allEntitiesKey(campaignId)` en `useCreateEntity` y `useUpdateEntity`.
3. **El e2e verde no probaba nada nuevo** (visto arriba). Se añadió el recorrido que faltaba a
   `campana.spec.ts`: crea dos NPCs, abre uno en modo edición, comprueba que los dos paneles
   se pintan, enlaza el NPC con el otro y ve el enlace en la lista, publica un comentario y lo
   ve con su texto — contra la API real, sin mocks.
4. **El desplegable ofrecía destinos ya enlazados**, y volver a elegirlo chocaba contra
   `@@unique([fromId, toId, label])` (`schema.prisma:100`) sin que `links.service.create`
   comprobara duplicados antes: 500 en crudo o fila repetida. Arreglado excluyendo del
   desplegable lo que ya está en `links.data`, además de la propia entidad. De paso se cerró
   una prueba semivacía (`LinksPanel.test.tsx`) que metía la entidad propia en el resultado de
   `fetchAllEntities` sin afirmar nunca que no apareciera como opción.
5. **Las pruebas de `EntityEditor` en modo edición disparaban `fetch` reales.** Los cuatro
   casos de edición ahora montan `LinksPanel` y `CommentThread`, que llaman a `fetchLinks`,
   `fetchAllEntities` y `fetchComments`; ninguno estaba espiado en `EntityEditor.test.tsx`, así
   que pasaban por `retry: false` convirtiendo el fallo real en un `isError` que nadie miraba.
   Arreglado espiando los tres fetchers en ese fichero.
6. `CommentThread` llama a `useMembers(campaignId)` sin `enabled`, a diferencia del
   `EntityEditor`, que lo hace perezoso a propósito. **Se dejó así, deliberadamente**: el hilo
   necesita los nombres para atribuir comentarios y se pinta siempre en modo edición; comparte
   clave de consulta con el picker de jugadores, así que sigue siendo una sola petición, no
   dos. Documentado con un comentario en `CommentThread.tsx`.

**No arreglado a propósito.** Los botones "Quitar"/"Borrar" se pintan en todas las filas sin
mirar permiso: ocultarlos con criterio necesita que la web conozca su propio identificador de
usuario, y `auth.store.ts:13` todavía lo pierde al recargar. Mismo bloqueante que la fila de
edición de `CampaignDetailPage.tsx`. Ver [06-pendientes.md](./06-pendientes.md).

**Pruebas.** 5 nuevas vistas en rojo antes de su arreglo: borrado con error en `LinksPanel` y
en `CommentThread` (fix 1), exclusión del desplegable en `LinksPanel` (fix 4, más la aserción
que faltaba en la prueba semivacía existente), y dos de `entities/hooks.test.tsx` (nuevo
fichero) que comprueban `isInvalidated` en `allEntitiesKey` tras crear y tras actualizar (fix
2). El fix 5 no añade una prueba en rojo propia — espiar un fetcher no cambia el resultado de
una prueba que ya pasaba por `retry: false` — así que se declara aquí en vez de fingir un rojo
que no existió.

**Verificación.** `pnpm verify` limpio (build + lint + formato + 71 unitarias: shared 10, api
37, web 24) y `pnpm --filter @dnd/web e2e` en verde (3/3): las dos suites anteriores más el
recorrido nuevo de enlaces y comentarios, que sí ejecuta `LinksPanel` y `CommentThread` en un
navegador real.

**Cómo revertir.** `git revert` del commit: devuelve `LinksPanel.tsx`, `CommentThread.tsx`,
`entities/hooks.ts`, `campana.spec.ts` y los ficheros de prueba tocados a su estado anterior.
No toca `apps/api` ni `packages/shared`.

---

## 2026-08-31 — Playwright: la primera prueba que abre un navegador

**Qué.** Playwright con Chromium en `apps/web`: `playwright.config.ts`, especificaciones en
`apps/web/e2e/`, scripts `e2e` y `e2e:ui`, y un trabajo `e2e-browser` aparte en CI que sube el
informe como artefacto cuando falla. La configuración levanta sola los dos servidores —la API
**compilada** (`start:prod`, como en producción) y Vite haciendo de proxy de `/api`— así que
la prueba recorre la misma cadena que un usuario. El `include` de vitest se acotó a `src/`
para que los dos corredores no se disputen los `.spec.ts`.

Cubierto: **registro → crear campaña → crear un NPC con etiquetas y visibilidad → verlo en su
pestaña**, y **salir cierra la sesión** y volver a mano a la ruta protegida devuelve a
`/login`.

**Por qué.** Era la P1 tras cerrar el linter, y `08-pruebas.md` ya llevaba escritas sus reglas
esperando la herramienta: jsdom no pinta ni navega, así que nada cubría sesión, rutas ni
pintado.

**Evidencia de que las pruebas sirven, no solo de que pasan.** Se rompió a propósito la guarda
de autenticación (`ProtectedRoute` dejando pasar sin token) y se corrieron las dos suites: las
**7 pruebas de componente siguieron en verde** y **el e2e de sesión falló** con su captura. La
guarda se restauró y los dos e2e volvieron a pasar. Es el mismo defecto que en english-log
llegó dos veces a producción con toda la suite verde.

**Cómo revertir.** `git revert` del commit: quita la configuración, las especificaciones, los
scripts y el trabajo de CI, y devuelve a vitest su `include` por defecto. Los binarios del
navegador quedan en la caché del usuario (`~/AppData/Local/ms-playwright`) y se borran a mano
si molestan.

---

## 2026-08-31 — ESLint, Prettier y gancho de pre-commit: el nivel pasa a N1 real

**Qué.** ESLint 9 con configuración plana única en la raíz (`eslint.config.mjs`), Prettier
con `.prettierrc.json` y `.prettierignore` (Markdown excluido: la documentación se escribe a
mano), `pnpm verify` ampliado a `build && lint && format:check && test`, y
`.githooks/pre-commit` que lo ejecuta y bloquea el commit. El gancho se conecta solo desde el
`prepare` de la raíz vía `scripts/install-git-hooks.mjs`, escrito para **no fallar nunca sin
`.git`**, porque las imágenes Docker se construyen desde una copia sin repositorio. CI deja
de omitir el lint y añade el chequeo de formato.

**Por qué.** Era la P1 de `06-pendientes.md` y la única excepción declarada en
`04-convenciones.md`: el proyecto no podía exigir N1 sin linter desde la fase 0.

**Los 15 errores de la primera pasada se arreglaron corrigiendo el código, no las reglas:**

- Diez cuerpos de controlador tipados como `any` pasaron a los tipos de `@dnd/shared`
  (`RegisterInput`, `CreateEntityInput`, `UpdateSessionInput`…). El pipe de Zod ya garantizaba
  la forma; el `any` solo la escondía del compilador.
- `updateSessionSchema` y `updateCharacterSchema` estaban **definidos en el controlador**
  mientras el servicio redefinía a mano su `Partial<...>`: dos declaraciones de la misma
  forma. Se mudaron a `@dnd/shared`, que es donde la convención dice que vive la forma de los
  datos, y ambos las importan.
- Tres `require("supertest")` dentro del cuerpo de un test pasaron a un `import` normal.
- Un `ForbiddenException` importado y nunca usado, fuera.
- Los ficheros de configuración CommonJS (`jest.config.js`) declaran su entorno en la
  configuración de ESLint en vez de llevar un comentario que silencie la regla.

Prettier reformateó 57 ficheros de código. Ningún cambio de conducta.

**Evidencia.** `pnpm verify` ✅ (build + lint + formato + 54 unitarias) y
`pnpm --filter @dnd/api test:e2e` ✅ 19 en 9 suites, corridos después del cambio de tipos.

**Cómo revertir.** `git revert` del commit devuelve `any` a los controladores, los esquemas
de actualización al controlador, y `verify` a `build && test`; borra la configuración de
ESLint y Prettier y el gancho. Para desconectar solo el gancho sin revertir nada:
`git config --unset core.hooksPath`.

---

## 2026-08-31 — Se adopta la estructura de documentación numerada

**Qué.** Se crean `docs/00-INDEX.md` y `01`–`08` describiendo lo que el repositorio **es
hoy**, no lo que debería ser. `docs/DEPLOY.md` se elimina y su contenido pasa, traducido y
ampliado con el estado real, a `03-despliegue.md`. `CLAUDE.md` y `AGENTS.md` de la raíz
quedan como punteros cortos. Se añade el script `pnpm verify`.

**Por qué.** El repositorio no tenía `04-convenciones.md`, así que **no declaraba nivel de
verificación**, y `~/.claude/dev-rules.md` exige uno. Al levantar el estado real apareció lo
que el nivel habría destapado antes: **ESLint no está instalado** y `pnpm lint` falla en los
tres paquetes desde la fase 0. Queda declarado como excepción (**N1 incompleto**) y abierto
como P1, en vez de seguir implícito.

**Línea base medida ese día, no prometida:** `pnpm build` ✅ · `pnpm test` ✅ 54 (shared 10,
api 37, web 7) · `pnpm --filter @dnd/api test:e2e` ✅ 19 en 9 suites contra Postgres real ·
`pnpm lint` ❌ *"eslint no se reconoce"*.

**Cómo revertir.** `git revert` del commit: borra `docs/00`–`08`, restaura `docs/DEPLOY.md`
y quita el script `verify`. No toca código de aplicación ni pruebas.

---

## 2026-07-02 → 2026-08-31 — Fase 1: núcleo de campaña

**API completa.** Esquema y migración `campaign_core`; esquemas Zod compartidos; el helper
`canView` con su matriz de 5×6 probada; campañas y `MembershipService`; invitaciones;
entidades con filtro de visibilidad y concesiones; enlaces wiki; comentarios; sesiones
(gestionadas por el DM); personajes (dueño o DM); y el listado de miembros que alimenta el
selector de jugadores de la web.

**Web en curso.** Lista de campañas con creación; detalle con pestañas de entidades,
sesiones y personajes; editor de entidades con etiquetas, visibilidad y selección de
jugadores concretos (commit `7714833`, con su arreglo de pérdida de concesiones en
`1d27a52`); panel de enlaces y hilo de comentarios dentro del modo edición del editor de
entidades (tarea 1.12b), montados como componentes propios (`LinksPanel`, `CommentThread`)
solo cuando la entidad ya existe. El selector de destino de un enlace pide **todas** las
entidades de la campaña con una sola llamada (`useAllEntities`, sin filtro `type`), en vez
de siete listas por tipo: el endpoint ya aceptaba `type` como opcional
(`entities.controller.ts`) y un enlace puede apuntar a cualquier tipo. Quedan los editores
de sesión y personaje, y el flujo de invitación.

Los límites aceptados a conciencia de esta fase están en
[05-datos.md](./05-datos.md) y abiertos en [06-pendientes.md](./06-pendientes.md).

**Cómo revertir.** Cada tarea es un commit propio en `main`; el ledger da el identificador
de cada una. La migración `20260702215016_campaign_core` es la que introduce todas las
tablas de la fase.

---

## 2026-07-02 — Fase 0: cimientos

Monorepo pnpm, NestJS + Fastify + Prisma, React + Vite, `@dnd/shared`, autenticación con
argon2 y JWT, Sentry, Dockerfiles de API y web, CI en GitHub Actions y el procedimiento de
despliegue en Coolify. Ambas imágenes construyen y `node dist/src/main.js` arranca en modo
producción.

Correcciones de la fase que siguen vigentes y explican decisiones raras del repositorio
(las tres están detalladas en [02-entorno.md](./02-entorno.md)): el `&` de la carpeta rompe
`nest --watch` en Windows; `@dnd/shared` se publica a `dist` **y** se aliasa a `src` en Vite;
y `packageManager` queda fijado a pnpm 10.32.1.

**Deuda que nació aquí y sigue abierta:** ESLint nunca se configuró y CI omite el lint.
