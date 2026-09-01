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
| `common` | `canView` (matriz de visibilidad) y `ZodValidationPipe` | — |
| `prisma` | `PrismaService` | — |

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
expone `retry()` y los cuatro consumidores lo enlazan a un botón "Reintentar". Los botones de
**crear** una sesión, un personaje o una entidad, y de **generar invitación**, usan ese rol
para **deshabilitar** (no ocultar) lo que el servidor va a rechazar, con una explicación
visible. La **fila** de una entidad, sesión o personaje **nunca se deshabilita** (arreglo 1,
1.15-fix): es la única vista de detalle que existe — el editor es el único consumidor de
`useEntity`/`useSession`/`useCharacter`, y enlaces y comentarios solo se pintan dentro de él
— así que lo que el rol decide es si el editor que la fila abre lo hace en modo lectura
(campos deshabilitados, Guardar deshabilitado con motivo) o en modo edición, nunca si la fila
abre o no.
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
- **Eventos de dominio** vía `@nestjs/event-emitter` — en proceso, sin infraestructura.
- **Sentry** desde la fase 0 (`SENTRY_DSN` opcional; vacío lo desactiva).
- **Visibilidad de primera clase desde la fase 1**, no añadida después: es el rasgo que
  distingue al producto y meterla tarde habría tocado todas las consultas.
