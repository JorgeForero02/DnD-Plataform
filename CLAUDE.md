# D&D Platform — instrucciones del proyecto

Plataforma para gestionar campañas de D&D 5.ª edición: mundo tipo wiki con entidades enlazadas,
sesiones, personajes y **cinco niveles de visibilidad** por objeto, con **motor de reglas** (hoja
derivada con traza en `apps/api/src/rules/`, reglas suceso–condición–efecto en
`apps/api/src/rules-engine/`). **pnpm · NestJS 11 + Fastify + Prisma 5 + PostgreSQL 16 · React 18 +
Vite · Zod compartido (`@dnd/shared`) · Jest, Vitest, Playwright.** No es mapas, tiempo real ni 3D.
En producción desde el 2026-09-02 (`dnd.supportive.pro`).

Este fichero es **corto a propósito** y **no dice en qué estado está el proyecto**: el estado se mide o
lo escribe una máquina (bloque generado de `docs/00-INDEX.md`, `07`, `06`).

## Al empezar cualquier sesión (obligatorio)

1. **[docs/00-INDEX.md](docs/00-INDEX.md)** — qué es, mapa de la documentación y el comando que mide producción.
2. **[docs/06-pendientes.md](docs/06-pendientes.md)** — qué está abierto.
3. Antes de escribir código, **[docs/04-convenciones.md](docs/04-convenciones.md)** — nivel, reglas de
   código y de documentación, Git, seguridad y datos, excepciones.

**Después de leer, la respuesta de arranque son 5 líneas** —estado, qué hay abierto que importe, qué se
propone— **y se espera la confirmación del autor antes de tocar nada.**

| Necesito… | Voy a |
|---|---|
| Por dónde entrar tras semanas fuera | [docs/como-seguir.md](docs/como-seguir.md) |
| Saber si algo ya se decidió | [docs/decisiones.md](docs/decisiones.md) y [docs/adr/](docs/adr/README.md) |
| Las reglas que no pueden romperse | [docs/11-invariantes.md](docs/11-invariantes.md) |
| Arquitectura, capas y la dirección de dependencias | [docs/01-arquitectura.md](docs/01-arquitectura.md) |
| Levantar el entorno, variables, trampas de Windows | [docs/02-entorno.md](docs/02-entorno.md) |
| Desplegar, `TRUST_PROXY`, copias de seguridad | [docs/03-despliegue.md](docs/03-despliegue.md) |
| Esquema, migraciones, visibilidad | [docs/05-datos.md](docs/05-datos.md) |
| Qué prueba cada capa, la regla de Playwright, conteos de e2e | [docs/08-pruebas.md](docs/08-pruebas.md) |
| Cómo se usa (DM y jugador) | [docs/09-jugar.md](docs/09-jugar.md) |
| Medir un cambio del proceso (el banco lo lanza y lo puntúa el orquestador, no el autor) | [docs/10-banco-de-tareas.md](docs/10-banco-de-tareas.md) |
| Prompts listos para pegar | [docs/prompts.md](docs/prompts.md) |
| Auditorías anteriores | [docs/auditorias/README.md](docs/auditorias/README.md) |
| Qué se entregó y cómo revertirlo | [docs/07-historial.md](docs/07-historial.md) |
| El ledger de ejecución (local, no viaja con el clon) | `.superpowers/sdd/progress.md` |

`docs/superpowers/` (specs y planes fechados) **no se relee entero**: se entra por `docs/decisiones.md`.

## Comandos mínimos

```bash
docker compose up -d && pnpm db:slot     # Postgres 16 en :5432 y migraciones (los e2e lo necesitan)
pnpm verify                              # la comprobación completa antes de cada commit (nivel N1: tipos, lint, formato, documentación y pruebas unitarias); la lanza sola el gancho de pre-commit (.githooks/pre-commit)
pnpm --filter @dnd/api test:e2e          # e2e de API contra Postgres real
pnpm --filter @dnd/web e2e               # Playwright, Chromium
pnpm dev:api                             # API en :3000
pnpm dev:web                             # web en :5173
```

## Reglas duras (violarlas rompe cosas)

- **La autorización se comprueba en el servidor, siempre. Esconder un botón no es control de acceso.**
  Las mutaciones exigen DM, creador o dueño; los listados filtran por `canView`
  (`apps/api/src/common/visibility.ts`), **dueño único** de «quién ve qué»: nadie reimplementa la matriz
  de visibilidad por su cuenta. La membresía es de `MembershipService`.
- **La validación de entrada es Zod desde `@dnd/shared`**, vía `ZodValidationPipe`; la forma de los datos
  vive una sola vez, en `packages/shared/src`.
- **Nada de secretos en el código**; todo por variable de entorno, con `.env.example` al día.
- **Ninguna tarea se da por completa sin prueba real en verde** y sin mirar la salida: API unitaria + e2e,
  web con Testing Library (RTL) + `pnpm verify`. **Si tocas una pantalla, abres el navegador** (`jsdom`,
  el navegador simulado de las pruebas unitarias, no maqueta). Si la tarea toca una pantalla que ya tiene
  e2e, el encargo lleva ese e2e dentro.
- **Nunca** desactives una prueba, bajes un umbral, silencies una regla ni saltes el gancho de
  pre-commit. Si el control molesta, se arregla el código o se cambia el control como decisión declarada
  en el `04`.
- **Evidencia antes que afirmación.** Si algo falla, se dice y se pega la salida.
- **Código en rama y `merge --no-ff`; solo documentación directo a `main`.** Un commit por tarea, en
  inglés (Conventional Commits), con atribución veraz. **Fusionar a `main` lo hace quien orquesta el plan, o el autor; un agente con un encargo suelto deja su rama sin fusionar y lo dice.**
- **Código en inglés, interfaz y documentación en español**, y ningún valor de enumeración llega a la
  pantalla: la forma legible se escribe una vez por dominio y todo lo demás la importa. **Si un texto de
  la interfaz explica una regla del servidor y los dos discrepan, el que miente es el texto.** Las demás
  reglas de interfaz vinculantes están en el `04`, § *Reglas de interfaz que salieron del reseño*.
- **El despliegue no se lanza sin que lo pida el autor**, y lo lanza él. `TRUST_PROXY` vale **2**
  (Traefik y nginx) y llega a Fastify como función de saltos ([ADR 0001](docs/adr/0001-trust-proxy-por-saltos.md)).
  Lo que de verdad protege el límite de intentos es que Traefik descarte el `X-Forwarded-For` del
  cliente: si cambia la topología, se recuenta.
- **Hay gente usando la plataforma (desde el 2026-10-03): antes de cualquier cambio en `vps1new` o en
  producción se hace un volcado manual de la base** y se comprueba que se puede leer
  ([03-despliegue.md](docs/03-despliegue.md), § *Copias de seguridad*). La copia automática diaria del
  servidor ya incluye esta base; no se monta ninguna nueva.

## Cierre de cada cambio (obligatorio)

1. Estado que haya cambiado → `docs/01`–`05` y `08`.
2. Entrada en `docs/07-historial.md`: qué · por qué · cómo revertir.
3. `docs/06-pendientes.md`: cerrar lo hecho, dar de alta lo que quedó abierto.
