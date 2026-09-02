# Arquitectura

## Monorepo

```
apps/api        NestJS 10 + Fastify + Prisma + PostgreSQL 16
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
| `characters` | Personajes | dueño o DM |
| `game-events` | Log append-only de la partida (2A.5). **Solo lectura por HTTP**: escribe el servicio que provoca el cambio | nadie, por HTTP |
| `rolls` | Tirar de verdad (2A.13). **El azar vive aquí y solo aquí**: el servidor tira y escribe la tirada antes de devolverla | miembro de la campaña |
| `common` | `canView` (matriz de visibilidad) y `ZodValidationPipe` | — |
| `prisma` | `PrismaService` | — |
| `dice` | Evaluador de expresiones de dados (2A.1). **Puro** | — |
| `rules` | Motor de derivación de 5.ª edición (2A.2), catálogo SRD (2A.3) y elecciones (2A.4). **Puro** | — |

### Las tres capas de la fase 2A, y por qué no se tocan entre sí

`dice/`, `rules/engine.ts` y `rules/catalog/` **no son módulos de Nest**: no tienen
controlador, ni servicio, ni Prisma. Son código puro que se importa. La dirección de
dependencias entre ellos es de una sola vía y está puesta a propósito:

```
catalog/  ──→  engine.ts        (el catálogo conoce al motor; el motor NO conoce el catálogo)
engine.ts ──→  @dnd/shared      (la traza vive en shared, porque la web la pinta)
dice/     ──→  (nada)
```

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

> **Deuda conocida:** cada servicio construye a mano su propio `viewerFor(userId, campaignId)`
> (rol en la campaña + `user.isAdmin`). Es duplicación real, anotada en
> [06-pendientes.md](./06-pendientes.md); el candidato es extraerla a `common/`.

## Estructura de la web

```
src/lib/api.ts          apiFetch<T> — base /api, adjunta el JWT
src/store/auth.store.ts Zustand: token (persistido en localStorage) y usuario (en memoria)
src/features/auth/      AuthGate + useAuthRehydration: rellena el usuario tras recargar
src/features/<x>/       api.ts (fetchers) + hooks.ts (TanStack Query) + componentes + __tests__
src/pages/              pantallas enrutadas

Rutas de la web (`App.tsx`), tras el reseño del 2026-09-02:

| Ruta | Pantalla |
|---|---|
| `/login`, `/register` | Entrada, con su propio armazón y su ornamento |
| `/` | Panel de campañas |
| `/campaigns/:id` | Campaña. La **sección abierta viaja en `?seccion=`**, así que es enlazable y sobrevive a una recarga |
| `/campaigns/:id/entidades/:entityId` | **Lectura** de una ficha del mundo: cuerpo en vitela, relaciones y comentarios |
| `/campaigns/:id/personajes/:characterId` | Hoja de personaje con la forma de 5.ª edición |
| `/account`, `/join/:token`, `/design-tokens`, `*` | Cuenta, invitación, control de tokens y 404 |

`src/ui/` es el sistema de diseño, y **es la única puerta al color y a la tipografía**:

| Fichero | Qué da |
|---|---|
| `tokens.css` | La paleta y las escalas, en propiedades personalizadas. **Nadie escribe un color literal fuera de aquí** |
| `Button`, `Field`, `Panel`, `Badge`, `Dialog`, `Tabs` | Las primitivas de 1.19. `Panel tone="vellum"` es la superficie del mundo; `Tabs layout="sidebar"` es la columna de secciones |
| `AppShell`, `AppHeader`, `PageHeader`, `Breadcrumbs` | El marco de toda pantalla con sesión |
| `Collection` (`Toolbar`, `FilterChip`, `ListRow`, `EmptyState`) | De lo que se hace una lista |
| `Logo`, `Ornament` | La marca, los iconos y el ornamento — todo **dibujado**, ver [04-convenciones](./04-convenciones.md) |
| `theme.ts`, `ThemeToggle` | Los dos temas y su conmutador |

Las tres primeras pantallas comparten `ui/AppShell.tsx`: cabecera global, migas y una medida
máxima. **Editar es un diálogo que se abre desde la lectura**, nunca la puerta de entrada.
src/components/         ProtectedRoute y compartidos
```

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
expone `retry()`; de sus seis consumidores hoy (tres en `CampaignDetailPage.tsx`, más
`InvitePanel.tsx`, `LinksPanel.tsx` y `CommentThread.tsx`), solo los cuatro primeros lo
enlazan a un botón "Reintentar" — `LinksPanel.tsx` y `CommentThread.tsx` leen `isError` pero
no ofrecen reintento. **Crear** una entidad o un personaje queda sin gatear en el botón a
propósito: el servidor deja crear a cualquier miembro (`entities.service.ts`,
`characters.service.ts`), así que no hay nada que el servidor vaya a rechazar. Lo que sí usa
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
- **Eventos de dominio** vía `@nestjs/event-emitter` — en proceso, sin infraestructura. **Hoy
  solo se emiten** (`campaign.created`, `entity.created`, `campaign.member_joined`): no existe
  ningún `@OnEvent` en `apps/api/src` que reaccione a ellos. "En proceso" describe el
  mecanismo de transporte, no que algo los consuma todavía.
- **Sentry** desde la fase 0 (`SENTRY_DSN` opcional; vacío lo desactiva).
- **Visibilidad de primera clase desde la fase 1**, no añadida después: es el rasgo que
  distingue al producto y meterla tarde habría tocado todas las consultas.
