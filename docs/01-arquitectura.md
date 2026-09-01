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
src/store/auth.store.ts Zustand: token y usuario, persistido
src/features/<x>/       api.ts (fetchers) + hooks.ts (TanStack Query) + componentes + __tests__
src/pages/              pantallas enrutadas
src/components/         ProtectedRoute y compartidos
```

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
