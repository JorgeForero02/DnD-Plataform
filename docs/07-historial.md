# Historial

Qué se entregó, por qué, y cómo revertirlo. Fechas absolutas. El detalle por tarea —commit,
número de pruebas, resultado de la revisión— vive en el ledger
`.superpowers/sdd/progress.md`; aquí van los hitos.

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
jugadores concretos (commit `7714833`). Quedan el panel de enlaces y comentarios, los
editores de sesión y personaje, y el flujo de invitación.

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
