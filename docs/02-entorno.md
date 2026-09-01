# Entorno de desarrollo

Requisitos: Node ≥ 20, pnpm 10.32.1 (lo fija `packageManager`), Docker Desktop.

## Arranque

**El `.env` que lee la API es `apps/api/.env`, no uno en la raíz.** `ConfigModule.forRoot({
isGlobal: true })` (`apps/api/src/app.module.ts`) no fija `envFilePath`, así que Nest lee
relativo al directorio de trabajo del proceso — que con `pnpm --filter @dnd/api ...` es
`apps/api/`. Prisma resuelve `DATABASE_URL` igual (`apps/api/prisma/schema.prisma`). El
`.env.example` de la raíz sigue siendo la plantilla; se copia dentro de `apps/api/`.

```bash
pnpm install                                  # el script `prepare` compila @dnd/shared a dist/
docker compose up -d                          # Postgres 16 en localhost:5432 (volumen dnd_pgdata)
cp .env.example apps/api/.env                 # y edita JWT_SECRET
pnpm --filter @dnd/api prisma:generate
pnpm --filter @dnd/api exec prisma migrate deploy

pnpm dev:api                                  # API en :3000
pnpm dev:web                                  # web en :5173, proxy /api -> :3000
```

## Variables de entorno

| Variable | Para qué | Ejemplo local |
|---|---|---|
| `DATABASE_URL` | Postgres de la API | `postgresql://dnd:dnd@localhost:5432/dnd` |
| `JWT_SECRET` | Firma de los tokens | `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | Caducidad del token | `7d` |
| `PORT` | Puerto de la API | `3000` |
| `SENTRY_DSN` | Errores en Sentry; **vacío lo desactiva** | *(vacío)* |
| `API_URL` | **Solo web en producción**: destino interno del proxy nginx | `http://api:3000` |

`.env.example` es la fuente de verdad de esta lista: si añades una variable, se añade ahí
en el mismo commit. **Ningún secreto en el código.**

**`API_URL` no está en `.env.example`** porque no la usa el desarrollo local: solo la lee el
contenedor de `apps/web` en producción (`apps/web/nginx.conf`), que se configura al desplegar,
no al copiar la plantilla local.

## Comandos

```bash
pnpm verify                            # build + lint + formato + unitarias. Lo exige el pre-commit
pnpm test                              # solo las unitarias de los tres paquetes
pnpm --filter @dnd/api test:e2e        # e2e de API contra el Postgres real (docker arriba)
pnpm build                             # compila los tres paquetes (hace de type-check)
pnpm lint                              # ESLint 9, configuración plana en la raíz
pnpm format                            # aplica Prettier (format:check solo comprueba)
pnpm --filter @dnd/web e2e             # Playwright: levanta API+web y abre Chromium
```

Base de datos:

```bash
pnpm --filter @dnd/api prisma:migrate           # crear migración en desarrollo
pnpm --filter @dnd/api exec prisma migrate deploy   # aplicar las existentes
docker compose down                             # parar Postgres (el volumen persiste)
```

## Gotchas que ya costaron tiempo

**La carpeta del proyecto contiene un `&`** (`D&D-Plataform`). Eso rompe `nest --watch` en
Windows: el shell parte la ruta en dos. Por eso `start:dev` es
`concurrently -k "nest build --watch" "node --watch dist/src/main.js"` y **no** `nest start
--watch`. Si algún día un script nuevo falla con una ruta cortada a la altura de `D`, es
esto.

**`@dnd/shared` se consume compilado en Node y en fuente en Vite.** El `package.json`
apunta a `dist/index.js` porque el `node` de producción necesita JavaScript; el `prepare`
de la raíz lo compila tras cada `pnpm install`. Pero **`vite.config.ts` tiene un alias
`@dnd/shared` → `src`**, porque rollup no resuelve las exportaciones nombradas del CommonJS
(`__exportStar`) del `dist`. Los dos caminos son necesarios; no quites ninguno.

**Si cambias un esquema de `@dnd/shared` y la API no lo ve**, es que falta recompilar:
`pnpm --filter @dnd/shared build`.

**Los e2e necesitan Docker arriba.** Sin `docker compose up -d` fallan en la conexión, no en
la lógica.
