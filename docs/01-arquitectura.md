# Arquitectura

## Monorepo

```
apps/api        NestJS 11 + Fastify + Prisma 5 + PostgreSQL 16
apps/web        React 18 + Vite + TanStack Query + Zustand + Tailwind + React Hook Form
packages/shared @dnd/shared — esquemas Zod compartidos por API y web
```

pnpm workspaces, `packageManager: pnpm@10.32.1` (pin obligatorio: corepack traía pnpm 11 y
rompía en Node 20 dentro de Docker). Node ≥ 20.

**`@dnd/shared` es el único sitio donde vive la forma de los datos.** La API valida con esos
esquemas en el borde (`ZodValidationPipe`) y la web construye sus formularios contra los
mismos. Un campo nuevo se añade una vez, en `packages/shared/src`.

## Dirección de dependencias

```
web  ─┐
      ├─→ @dnd/shared            (la web nunca importa de apps/api)
api  ─┘
```

Dentro de la API:

```
Controlador → Servicio → Prisma
```

- El **controlador** no toma decisiones de negocio: valida con el pipe de Zod, saca el
  `userId` del JWT y delega.
- El **servicio** decide: quién puede ver qué, quién puede escribir, qué se filtra.
- **Prisma** es el único que habla con la base. Ningún controlador la toca.

`MembershipService` (en `campaigns/`) es el dueño único de la pregunta *"¿este usuario
pertenece a esta campaña y con qué rol?"*: `requireMember`, `requireDM`, `getMembership`.
Cualquier módulo que necesite eso importa `CampaignsModule`; **nadie recalcula la membresía
por su cuenta**.

## Módulos de la API

| Módulo | Responsabilidad | Quién puede escribir |
|---|---|---|
| `auth` | Registro, login, JWT, `JwtAuthGuard`, `/auth/me` | público (registro/login) |
| `users` | Alta y consulta de usuarios | interno |
| `campaigns` | Campañas + `MembershipService` + listado de miembros | dueño / DM |
| `invites` | Crear invitación (DM) y aceptarla por token | DM crea, cualquiera acepta |
| `entities` | NPC, lugar, misión, facción, objeto, evento, documento | DM o creador |
| `links` | Relaciones wiki entre entidades | DM o creador |
| `comments` | Hilo de comentarios de una entidad | quien pueda ver la entidad |
| `sessions` | Sesiones de juego | solo DM |
| `characters` | Personajes y **la hoja de 5.ª edición** (2A.6) con sus PG mutables y sus tiradas de muerte (2A.7) | dueño o DM |
| `character-state` | Recursos consumibles y descansos (2A.8), condiciones y velocidad efectiva (2A.12) | dueño o DM; los recursos `DM_ONLY`, solo el DM |
| `game-events` | Log append-only de la partida (2A.5). **Solo lectura por HTTP**: escribe el servicio que provoca el cambio | nadie, por HTTP |
| `rolls` | Tirar de verdad (2A.13). **El azar vive aquí y solo aquí**: el servidor tira y escribe la tirada antes de devolverla | miembro de la campaña |
| `notifications` | Avisos (2A.14). **Sin tiempo real**: se piden al cargar. Escucha los eventos de dominio que ya se emitían y nadie escuchaba. **Ojo: es API sin pantalla** — esta fila prometía «bandeja de avisos» y no hay ninguna, porque nada de `apps/web/src` llama a estos endpoints. Ficha **A1-avisos** de [06-pendientes.md](./06-pendientes.md) | nadie, por HTTP; solo marcar leídas las propias |
| `world-state` | Marcas, conjuntos y señales de la campaña (2A.15). Lo que el motor de reglas escucha | **Por HTTP, solo DM. Pero no todo lo que escribe entra por HTTP**: `recordEntityOpened` lo llama `entities` cuando **un jugador** abre una ficha, así que un jugador escribe aquí sin pasar por este controlador. El suceso es `DM_ONLY` y no se registra si quien mira es el DM o el creador |
| `common` | `canView` (matriz de visibilidad) y `ZodValidationPipe` | — |
| `prisma` | `PrismaService` | — |
| `dice` | Evaluador de expresiones de dados (2A.1). **Puro** | — |
| `rules` | Motor de derivación de 5.ª edición (2A.2), catálogo SRD (2A.3), elecciones (2A.4) y, desde 2B, **los objetos**: `items.ts` traduce la lista cerrada de efectos a modificadores y fórmulas de CA —es su dueño único— y `attacks.ts` monta el cuadro de ataques. El núcleo es **puro**; `catalog.controller.ts` es la única puerta HTTP: `GET /catalog` sirve razas, subrazas, clases y armaduras para que la pantalla no las transcriba | autenticado (el SRD es el mismo para todas las campañas) |
| `level-up` | Subida de nivel (2A.9): el servidor **propone un diff** y el jugador confirma. Siembra los recursos del nivel nuevo en la misma transacción | dueño o DM |
| `campaign-items` | Los objetos propios de una campaña — el *homebrew* del DM (2B). Traduce sus filas a la misma forma que el catálogo del SRD, para que el motor no pueda saber de dónde salió un objeto | **DM para escribir; cualquier miembro lee**, filtrado por `canView` |
| `inventory` | El inventario de un personaje, equipar, sintonizar y la bolsa (2B). Aquí viven las reglas de **ranura, manos y tope de tres sintonizaciones**; la base garantiza «una ranura, un objeto» con un índice único parcial | dueño o DM |
| `rules-engine` | Reglas suceso–condición–efecto de la campaña (2A.16): alta, ensayo en seco, trazas y propuestas. **Escucha `game_event.recorded`** por un puente, en vez de que el log le llame | solo DM |
| `game-clock` | El reloj de la campaña (2C.3): un contador de **segundos de juego** que solo se avanza, nunca se fija, y el viaje con su ritmo y su marcha forzada. Lo lee cualquier miembro; lo mueve el DM | leer, miembro; avanzar, solo DM |
| `roll-requests` | La petición de tirada (2C.5): el DM pide **un valor de la hoja** —no una expresión— y quien tira la responde con su hoja de ese momento. Con sondeo | pedir, solo DM; responder, el dueño del personaje o el DM |
| `bestiario` (web) | La pestaña del bestiario (2D.5): las fichas del SRD y las del DM, y el botón que baja una criatura a la mesa. Va **justo antes de «Catálogo»**, que es donde la pone el prototipo, y por el mismo motivo: es la cara mecánica de algo que ya tiene ficha de mundo | pinta lo que el servidor le manda; el botón solo se le enseña al DM, y eso **no** es el control de acceso |
| `npcs` (dentro de `statblocks`) | Bajar un statblock a la mesa (2D.4): de una plantilla nacen N combatientes, y **un PNJ en la mesa es una fila de `Character`** — no un modelo nuevo. Lo que lo distingue es `statblockRef`; `classKey`, `raceKey` y `level` quedan sin usar | instanciar, solo DM; listar, filtrado por `canView` |
| `statblocks` | Los statblocks de PNJ (2D.3): el catálogo del SRD 5.1 **en código** y los propios del DM **en la base**, con una sola forma resuelta y **una sola puerta que traduce un `ref`** (`SRD:goblin` o `CAMPAIGN:<id>`). Es el mismo reparto que 2B eligió para los objetos | escribir, solo DM; leer, filtrado por `canView` |
| `dm-tables` | Las tablas del DM (2C.6): tirar sobre una tabla con sus resultados y su visibilidad. **Regla de la casa, con interruptor por campaña y apagada por defecto** — el SRD no trae ninguna tabla de críticos ni de pifias | escribir, solo DM; leer, filtrado por `canView` |

### Las tres capas de la fase 2A, y por qué no se tocan entre sí

`dice/`, `rules/engine.ts` y `rules/catalog/` **no son módulos de Nest**: no tienen
controlador, ni servicio, ni Prisma. Son código puro que se importa. La dirección de
dependencias entre ellos es de una sola vía y está puesta a propósito:

```
catalog/  ──→  engine.ts        (el catálogo conoce al motor; el motor NO conoce el catálogo)
engine.ts ──→  @dnd/shared      (la traza vive en shared, porque la web la pinta)
dice/     ──→  (nada)
```

**Y los dos módulos que calculan una hoja no dependen uno del otro.** `characters` y
`character-state` necesitan los mismos PG máximos —uno para recortar al leer, otro para no
curar por encima—, y **los dos los derivan del catálogo** en vez de pedírselos al vecino:
`character-state/common/max-hp.ts` llama a `deriveCharacter` igual que hace la hoja. Cuelgan
del mismo cálculo y ninguno del otro, que es lo que evita el ciclo.

**El motor no importa nada de `catalog/`**, y esa es la regla que hace útil la separación: si
el motor conociera las razas, un `+1` transcrito mal parecería un fallo del motor y se buscaría
en el sitio equivocado. El único punto donde se tocan es
`apps/api/src/rules/catalog/resolve.ts`, que traduce una ficha declarada (raza, subraza,
clase, nivel, armadura) a la entrada que el motor come.

La puerta de entrada es `deriveCharacter` (`apps/api/src/rules/catalog/index.ts`): resuelve el
catálogo, deriva con el motor y **junta las dos listas de avisos**. Existe porque significan lo
mismo para quien mira la hoja —«hay algo que querrías saber»— y dejar que cada pantalla las
junte por su cuenta es cómo una de ellas acaba sin pintarse.

`ContentRef` (`apps/api/src/rules/catalog/types.ts`) existe desde 2A aunque **hoy solo
tenga una rama útil** (`SRD`): la otra (`CAMPAIGN`) es por donde entrará el contenido propio
del DM en 2B, **sin que el motor cambie**. Mientras no exista, una referencia de campaña falla
ruidosamente con
`UnknownContentError` en vez de resolverse a nada.

**La seguridad de lectura es un único concepto derivado:** `common/visibility.ts` exporta
`canView`, con la matriz completa de 5 visibilidades × 6 situaciones de espectador probada
en `visibility.spec.ts`. Los listados filtran por `canView`; las mutaciones exigen DM o
propiedad. Ver [05-datos.md](./05-datos.md) para la semántica de cada nivel.

> **Deuda conocida, y con la mitad pagada el 2026-09-03:** **el visor de un personaje ya vive
> en un solo sitio**, `apps/api/src/common/character-viewer.ts`, y lo usan `character-state` y el
> inventario de 2B. Lo que cerró la refactorización no fue la deuda escrita: fue que 2B estuvo a
> punto de escribir la **tercera** copia de la misma regla de autorización.
>
> Siguen construyendo a mano su propio `viewerFor(userId, campaignId)` (rol en la campaña +
> `user.isAdmin`) `entities`, `characters`, `character-sheet`, `comments`, `links`, `sessions`,
> `game-events`, `rules-engine` y `campaign-items`. Anotada en
> [06-pendientes.md](./06-pendientes.md).

## Estructura de la web

**Las pantallas grandes de la fase 2A** viven en `apps/web/src/features/`:
`character-sheet/` (la hoja calculada con su traza desplegable, PG, recursos, descansos,
condiciones, tirar y las anulaciones del DM), `level-up/` (el diff propuesto y su confirmación) y
`rules/` (el panel del motor: reglas, propuestas y trazas), `rolls/` (la tirada: los dos dados con el descartado a la vista, el desglose y la decisión de ventaja) y `sessions/` (la barra global de
«en juego» y la mesa: elenco, registro en vivo y consulta del mundo). `characters/` conserva el
CRUD.

Dentro de `character-sheet/`, **`EdicionEnSitio.tsx` es la casa de las tres primitivas de
edición** —`NumeroEditable`, `SelectorEditable`, `TextoEditable`— y nadie fabrica la suya:
lo que gobiernan (cuándo se guarda solo, qué pasa al rechazar, qué significa el subrayado) son
las reglas vinculantes de [04-convenciones.md](./04-convenciones.md), y repetirlas a mano es
como empiezan a discrepar. `IdentidadEditable.tsx` las usa para raza, subraza, clase, nivel y
las seis características, y sustituyó al antiguo `EditorFicha.tsx`, que ya no existe.

**`ui/Iconos.tsx` es la casa común de los iconos de línea**, y cada módulo grande dibuja los suyos —`features/rules/`, `features/sessions/`, `features/entities/`, `features/campaigns/`, `features/rolls/`, `features/level-up/`—: lo que la regla exige es que sean **dibujados**, no que vivan en un único fichero (ver [04-convenciones.md](./04-convenciones.md)), dibujados en SVG. `features/links/relaciones.ts`
guarda las relaciones sugeridas por par de tipos y su lectura invertida, que es lo que permite
que un enlace entrante se lea «vive aquí» sin inventarse el inverso de una frase libre.

```
src/lib/api.ts          apiFetch<T> — base /api, adjunta el JWT
src/store/auth.store.ts Zustand: token (persistido en localStorage) y usuario (en memoria)
src/features/auth/      AuthGate + useAuthRehydration: rellena el usuario tras recargar
src/features/<x>/       api.ts (fetchers) + hooks.ts (TanStack Query) + componentes + __tests__
src/pages/              pantallas enrutadas
src/components/         ProtectedRoute y compartidos
```

> **Esta valla estaba sin cerrar hasta el 2026-09-02**, y se tragaba las dos tablas de abajo y
> toda la prosa que las sigue. No era solo cosmético: `scripts/check-docs.mjs` **salta lo que hay
> dentro de una valla**, así que ninguna de las rutas citadas ahí estaba siendo comprobada — y
> por eso `/acerca-de` pudo faltar en la tabla sin que nada avisara. Lo encontró una auditoría, no
> el script, que es exactamente lo que la auditoría existe para pillar.

Rutas de la web (`App.tsx`), tras el reseño del 2026-09-02:

| Ruta | Pantalla |
|---|---|
| `/login`, `/register` | Entrada, con su propio armazón y su ornamento |
| `/` | Panel de campañas |
| `/campaigns/:id` | **El taller** de la campaña. La **sección abierta viaja en `?seccion=`**, así que es enlazable y sobrevive a una recarga. Desde B4 son **seis destinos**, no diecinueve: Resumen, El mundo, Sesiones, Reglas, Miembros y Ajustes — el **tipo de ficha es un filtro dentro de «El mundo»** (`?seccion=NPC` sigue funcionando y abre «El mundo» con ese tipo puesto), y Personajes, Bestiario y Catálogo son **cajones superpuestos** sobre el taller, no secciones |
| `/campaigns/:id/sesion` | **La mesa**, y **el reposo es uno de sus tres estados, no la ausencia de la mesa**: en reposo enseña dónde quedó la escena, el elenco y el registro, y **el DM empieza ahí la sesión** en vez de volver al taller. En juego, elenco con asistencia, registro en vivo con sus sellos rápidos y el **estrato superpuesto** (Hoja, Bolsa, Mundo: uno a la vez, Escape cierra) |
| `/campaigns/:id/entidades/:entityId` | **Lectura** de una ficha del mundo: cuerpo en vitela, relaciones y comentarios |
| `/campaigns/:id/personajes/:characterId` | Hoja de personaje con la forma de 5.ª edición |
| `/account`, `/join/:token`, `/design-tokens`, `*` | Cuenta, invitación, control de tokens y 404 |
| `/acerca-de` | Atribución del SRD 5.1. **Pública a propósito**: la CC BY la pide en la obra distribuida, y una atribución que exige iniciar sesión está detrás de ella, no en ella |

`src/ui/` es el sistema de diseño, y **es la única puerta al color y a la tipografía**:

| Fichero | Qué da |
|---|---|
| `tokens.css` | La paleta y las escalas, en propiedades personalizadas. **Nadie escribe un color literal fuera de aquí** |
| `Button`, `Field`, `Panel`, `Badge`, `Dialog`, `Tabs` | Las primitivas de 1.19. `Panel tone="vellum"` es la superficie del mundo; `Tabs layout="sidebar"` es la columna de secciones |
| `AppShell`, `AppHeader`, `PageHeader`, `Breadcrumbs` | El marco de toda pantalla con sesión |
| `Collection` (`Toolbar`, `FilterChip`, `ListRow`, `EmptyState`) | De lo que se hace una lista |
| `Logo`, `Ornament` | La marca, los iconos y el ornamento — todo **dibujado**, ver [04-convenciones](./04-convenciones.md) |
| `theme.ts`, `ThemeToggle` | Los dos temas y su conmutador |
| `LegalNotice` | El pie con la atribución del SRD, montado dentro de `AppShell` para que lo lleve toda pantalla con sesión |

Todas las pantallas con armazón comparten `ui/AppShell.tsx` —panel, campaña, entidad, personaje
y `/acerca-de`, que además es **pública**—: cabecera global, migas y una medida máxima. Eran
«las tres primeras» y son cinco; y como `LegalNotice` viaja dentro de `AppShell`, la atribución
del SRD la llevan también las públicas que lo montan, no solo las que exigen sesión. **Y se toca donde se lee**: no hay
diálogo de edición, ni botón que lo abra. Aquí ponía «editar es un diálogo que se abre desde la
lectura, nunca la puerta de entrada», y **`04-convenciones.md` derogó esa regla la noche del
2026-09-02** al perder la hoja sus dos botones de «Editar»; este documento se quedó contándolo,
así que los dos que gobiernan la interfaz decían lo contrario el uno del otro.

**Cómo la web resuelve quién es y qué rol tiene (tarea 1.15, corregido en 1.15-fix):** el
token sobrevive a una recarga en `localStorage`, pero el usuario solo vivía en memoria —
`AuthGate` (envuelve todas las rutas en `App.tsx`, **por fuera** de `<Routes>`) pide
`/auth/me` una vez, en segundo plano, cuando hay token y no hay usuario, sin bloquear el
pintado (`ProtectedRoute` sigue mirando solo el token, como siempre). `AuthGate` nunca
redirige por sí mismo: solo dispara la comprobación y renderiza siempre sus hijos.
`apiFetch` (`lib/api.ts`) propaga el estado HTTP real en un `ApiError`, y **solo un 401**
(token caducado o inválido) hace que `useAuthRehydration` cierre la sesión — un 500, un 502
del proxy de Vite, o un fallo de red dejan el token intacto para poder reintentar. Cuando la
sesión sí se cierra, es `ProtectedRoute` (que ya redirigía a `/login` cuando no hay token)
quien lleva a la pantalla de acceso, no `AuthGate`: un `<Navigate>` devuelto en su lugar
—versión anterior a 1.15-fix— dejaba `<Routes>` (y `/login`, que vive dentro) sin
renderizarse nunca, con la pantalla en blanco para siempre tras cualquier expiración del JWT
a los 7 días. Con el `id` del usuario ya disponible, `useMyRole` (`features/campaigns/members.ts`)
cruza `GET /campaigns/:id/members` para responder "¿soy DM o jugador en esta campaña?", con un
tercer estado explícito de "aún no lo sé" mientras carga **o si la petición falla**
(`isError`, tratado siempre como "aún no lo sé", nunca como "no soy miembro") — con
`retry: false` (`lib/queryClient.ts`) un solo fallo no se reintenta solo, así que `useMyRole`
expone `retry()`, y **aquí ya no se escribe cuántos consumidores tiene**. Se intentó dos veces
—«seis consumidores, cuatro con reintento» primero, «diez llamadas en nueve componentes» después—
y **las dos caducaron**, la segunda en un día. Un censo a mano de algo que crece con cada pantalla
es una mentira con fecha de caducidad, así que se escribe **la regla** y se cuenta con `grep`
cuando haga falta: **todo consumidor que lee `isError` ofrece el botón «Reintentar»**; el que no
lo lee es porque su fallo ya lo cuenta la pantalla que lo contiene.

**Crear** una entidad, un enlace o un personaje **no** son el mismo caso, y confundirlos fue el
error que este párrafo tuvo hasta el 2026-09-02:

- **Entidades y enlaces son del DM.** `EntitiesService.create` y `LinksService.create` exigen
  `requireDM`. Antes exigían solo `requireMember`, y eso dejaba a un jugador crear PNJs, lugares,
  misiones y documentos en la campaña del DM — ver [05-datos.md](./05-datos.md). Así que el botón
  «Nuevo» **sí** se gatea por rol: ofrecerlo a un jugador es prometerle un 403.
- **Un personaje es suyo.** `CharactersService.create` sigue en `requireMember`, y ahí el botón no
  se gatea porque no hay nada que rechazar. Lo que sí usa
el rol para **deshabilitar** (no ocultar) con una explicación visible es **crear y editar una
sesión** (ambas DM-only en el servidor), **editar un personaje o una entidad**, y **generar
invitación**. La **fila** de una entidad, sesión o personaje **nunca se deshabilita** (arreglo 1,
1.15-fix). El motivo original era que el editor era la única vista de detalle que existía;
**desde el reseño del 2026-09-02 ya no lo es** —la fila es un enlace a su página de lectura
(`EntityDetailPage`, `CharacterDetailPage`), y los enlaces y los comentarios viven allí, no
dentro del editor—, pero la conclusión no cambia y ahora se sostiene mejor: **leer no es
editar**. Lo que el rol decide es si el editor que se abre *desde* esa página lo hace en modo
lectura (campos deshabilitados, Guardar deshabilitado con motivo) o en modo edición, nunca si
se puede abrir la ficha.
**Esto es honestidad de la interfaz, no seguridad: `canView`/`requireDM`/`requireMember`/
`requireEditable` (`apps/api/src/common` y cada servicio) siguen siendo la única autoridad,
y rechazan exactamente igual si el código de arriba desaparece.**

Un `feature/` es autónomo: sus llamadas HTTP y sus hooks viven juntos. Las páginas componen
features, no hacen `fetch`.

**No hay CORS por diseño:** en producción nginx sirve la web y hace proxy de `/api` hacia la
API por red interna; en desarrollo Vite hace el mismo proxy. El navegador solo habla con un
origen.

## Decisiones transversales

- **React desde el principio**, no HBS: se descartó un frontend dual para no reescribir al
  llegar al SaaS y al 3D.
- **Minimalismo de infraestructura.** Sin Redis, sin colas, sin S3, sin WebSockets, sin
  servicio de IA hasta que una fase los necesite. Hoy: Postgres + Nest + React y nada más.
- **Eventos de dominio** vía `@nestjs/event-emitter`, en proceso y sin infraestructura. Se
  emiten **siete** —`campaign.created`, `campaign.updated`, `campaign.deleted`,
  `campaign.member.removed` (`campaigns.service.ts`), `campaign.member_joined`, `entity.created`
  y **`game_event.recorded`** (`game-events.service.ts`)—, y hay **tres** `@OnEvent`:
  `notifications` consume `campaign.member_joined` y `entity.created`, y
  `rules-engine/game-event-bridge.ts` consume `game_event.recorded`, que es **cómo el log de la
  partida despierta al motor de reglas**. Un puente y no una llamada directa porque el motor
  escribe eventos: llamarle desde el log cerraría un ciclo entre los dos módulos que Nest solo
  tapa con `forwardRef`. Los cuatro de `campaigns.service.ts` siguen sin consumidor
  ([06-pendientes](./06-pendientes.md), **N1**).

  > Y esta línea ha caducado **dos veces**: primero decía que ningún `@OnEvent` los escuchaba, y
  > luego se quedó en seis eventos y dos consumidores el mismo día que llegó el séptimo. El
  > párrafo de abajo ya presumía de haber cazado la primera. Es la clase de mentira que
  > `check:docs` no ve, porque la sintaxis está en regla.

  > Esta línea decía «no existe ningún `@OnEvent` que reaccione a ellos» y **se contradecía con
  > la tabla de módulos de 138 líneas más arriba**, que ya anunciaba que `notifications` los
  > escucha. Lo cazó una auditoría de documentación contra código: es exactamente la clase de
  > mentira semántica que `check:docs` no puede ver, porque la sintaxis está en regla.
- **Sentry** desde la fase 0 (`SENTRY_DSN` opcional; vacío lo desactiva).
- **Visibilidad de primera clase desde la fase 1**, no añadida después: es el rasgo que
  distingue al producto y meterla tarde habría tocado todas las consultas.
