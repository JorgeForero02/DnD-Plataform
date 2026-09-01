# Despliegue

> **Estado: NO DESPLEGADO.** No hay VPS asignado a este proyecto. Todo el desarrollo es
> local. Este documento es el procedimiento preparado, **verificado solo hasta donde dice
> cada punto**. La tarea 1.14 incluía desplegar en Coolify y **esa parte queda diferida**;
> lo único que se construye ahora es la interfaz de invitación.

Sustituye a `docs/DEPLOY.md` <!-- docs-lint-ignore -->, que se eliminó el 2026-08-31 al
adoptar la estructura numerada.

## Lo que sí está verificado

- **Ambas imágenes Docker construyen** (`dnd-api`, `dnd-web`), comprobado en la tarea 0.10.
- **`node dist/src/main.js` arranca en modo producción** y mapea las rutas de auth
  (tarea 0.10 / commit `53ac276`).
- **CI en GitHub Actions verde** en cada push a `main` y en cada PR (`.github/workflows/ci.yml`),
  con dos trabajos: `test` (instala, genera Prisma, aplica migraciones contra un Postgres de
  servicio, y corre `pnpm lint`, `pnpm format:check`, `pnpm check:docs`, `pnpm check:estado`,
  `pnpm test` y `pnpm --filter @dnd/api test:e2e` — **`pnpm build` no está entre ellos**, ver
  [06-pendientes.md](./06-pendientes.md)) y `e2e-browser` (instala Playwright y corre `pnpm
  --filter @dnd/web e2e` contra la API y la web reales, subiendo el reporte como artefacto si
  falla). **El lint corre desde el 2026-08-31**; ver [07-historial.md](./07-historial.md).

## Procedimiento previsto (Coolify sobre VPS propio)

Requisitos: VPS con Coolify, dominio con registros A apuntando al VPS, y este repositorio
conectado como origen (GitHub App o clave de despliegue).

**1 · Proyecto y base de datos**
Crear un proyecto (`dnd`) con entorno `production`. Añadir un recurso PostgreSQL y copiar su
URL de conexión **interna** — la API usa la interna, nunca la pública.

**2 · Servicio de API**
Aplicación desde repositorio Git, rama `main`. Build pack: Dockerfile, ubicación
`apps/api/Dockerfile`, contexto de construcción la raíz del repositorio. Puerto 3000.
Dominio con SSL automático (Traefik + Let's Encrypt).
Variables: `DATABASE_URL` (interna), `JWT_SECRET` (`openssl rand -hex 32`),
`JWT_EXPIRES_IN=7d`, `PORT=3000`, `SENTRY_DSN`.
El `CMD` de la imagen ejecuta `prisma migrate deploy` al arrancar: **el esquema se aplica
solo**.

**3 · Servicio web**
Misma fuente y rama. Dockerfile `apps/web/Dockerfile`, contexto la raíz, puerto 80. Dominio
propio con SSL.
Variable: `API_URL` = dirección **interna** de la API (`http://api:3000`). nginx hace proxy
de `/api`, así que **no hay CORS y no hace falta `VITE_API_URL`**.

**4 · Auto-despliegue y comprobación**
Activar auto-deploy en push para ambos servicios, con CI verde como condición previa.
Comprobar entrando al dominio web: registrarse e iniciar sesión sobre HTTPS. Si
`SENTRY_DSN` está puesto, provocar un error de prueba y confirmar que llega.

## Trampas heredadas del VPS (documentadas en `vps1new:/root/docs/`)

Si algún día esto se despliega en el VPS de producción del usuario, aplican sus reglas:
cambiar variables de entorno en Coolify **recompila la imagen** (son build args), y cambiar
`applications.fqdn` por SQL **no** regenera las etiquetas de Traefik. Se opera por la UI o
la API de Coolify, nunca tocando sus contenedores a mano.
