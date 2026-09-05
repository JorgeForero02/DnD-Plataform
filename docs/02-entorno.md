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
cp .env.example apps/api/.env                 # y edita JWT_SECRET (>= 32 caracteres)
pnpm --filter @dnd/api prisma:generate
pnpm --filter @dnd/api exec prisma migrate deploy

pnpm dev:api                                  # API en :3000
pnpm dev:web                                  # web en :5173, proxy /api -> :3000
```

## Variables de entorno

| Variable | Para qué | Ejemplo local |
|---|---|---|
| `DATABASE_URL` | Postgres de la API | `postgresql://dnd:dnd@localhost:5432/dnd` |
| `JWT_SECRET` | Firma de los tokens. **Obligatoria y de 32 caracteres como mínimo: sin ella la API se niega a arrancar** (`apps/api/src/common/jwt-secret.ts`) | `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | Caducidad del token | `7d` |
| `PORT` | Puerto de la API | `3000` |
| `SENTRY_DSN` | Errores en Sentry; **vacío lo desactiva** | *(vacío)* |
| `API_URL` | **Solo web en producción**: destino interno del proxy nginx | `http://api:3000` |
| `CORS_ORIGIN` | Orígenes permitidos, separados por coma. **Vacío = sin CORS**, que es lo normal: Vite y nginx sirven `/api` en el mismo origen | *(vacío)* |
| `TRUST_PROXY` | **Número de saltos de proxy de confianza**, no un booleano. `0` o vacío = ninguno | `0` |
| `AUTH_RATE_LIMIT` | Sube el tope de las rutas de autenticación (5/min). **Existe solo para la suite de navegador** y nunca se pone en producción: es la protección contra fuerza bruta | *(vacío)* |
| `RATE_LIMIT` | Sube el tope **global** (100/min, todas las rutas). Mismo motivo y misma regla: solo la suite de navegador, que dispara cientos de peticiones legítimas desde una IP. Un valor vacío o mal escrito cae al de producción, nunca a «sin límite» | *(vacío)* |

> **`TRUST_PROXY` no es `true`/`false`, y la diferencia es una vulnerabilidad, no un estilo.**
> Con `trustProxy: true` Fastify se queda con la entrada **más a la izquierda** de
> `X-Forwarded-For` —la que pone el cliente—, y el `proxy_add_x_forwarded_for` de nginx
> **añade** en vez de sustituir, así que el valor falso sobrevive. Como el limitador de
> peticiones usa `req.ip`, un atacante rotando esa cabecera tendría intentos ilimitados. Con un
> **número** se confía en exactamente ese número de saltos contando desde el socket, que es lo
> correcto. **Se cuentan los proxies que hay delante de la API, no se pone «1 porque hay un
> proxy»**: en producción son **dos** —Traefik y el nginx de la web—, así que allí vale
> **`TRUST_PROXY=2`**; con `1` la API se quedaría con la IP de Traefik, idéntica para todo
> el mundo, y el límite por IP pasaría a ser un único cubo compartido. Ver
> [03-despliegue.md](./03-despliegue.md). Medido, no supuesto: ver
> `apps/api/src/configure-app.ts` y `apps/api/test/trust-proxy.e2e-spec.ts`.

`.env.example` es la fuente de verdad de esta lista: si añades una variable, se añade ahí
en el mismo commit. **Ningún secreto en el código.**

**`API_URL` no está en `.env.example`** porque no la usa el desarrollo local: solo la lee el
contenedor de `apps/web` en producción (`apps/web/nginx.conf`), que se configura al desplegar,
no al copiar la plantilla local.

## Comandos

```bash
pnpm verify                            # build + lint + formato + check:docs + check:estado + check:historial + unitarias. Lo exige el pre-commit
pnpm check:docs                        # rutas citadas que no existen, fichero:NN fuera de rango y conteos
pnpm check:historial                   # falla si docs/07-historial.md pasa de 400 lineas
                                       # fuera de docs/08-pruebas.md. NO mira enlaces Markdown: eso no lo comprueba nada
pnpm update:estado                     # regenera el bloque de estado de docs/00-INDEX.md (conteos de unitarias)
pnpm test                              # solo las unitarias de los tres paquetes
pnpm --filter @dnd/api test:e2e        # e2e de API contra el Postgres real (docker arriba)
pnpm build                             # compila los tres paquetes (hace de type-check)
pnpm lint                              # ESLint 9, configuración plana en la raíz
pnpm format                            # aplica Prettier (format:check solo comprueba)
pnpm --filter @dnd/web e2e             # Playwright: levanta API+web y abre Chromium
```

La campaña de demostración:

```bash
node scripts/seed-demo.mjs                                  # contra http://localhost:3000
node scripts/seed-demo.mjs --base https://dnd.supportive.pro/api
node scripts/seed-demo.mjs --limpiar                        # borra las campañas «[demo]»
```

**Siembra una mesa completa y jugable** —tres cuentas, cinco niveles de visibilidad, dos
personajes con hoja derivada, inventario con ranura y sintonización, un statblock propio y su PNJ,
una sesión cerrada con crónica y otra en curso con su encuentro, una regla del motor y avisos— para
poder mirar la aplicación con datos dentro sin construirlos a mano.

**Habla por HTTP, como una persona**: se registra, inicia sesión y usa las mismas rutas que la web,
así que **no puede saltarse un permiso** y **se puede correr contra producción** sin credenciales de
Postgres. Es **idempotente**: correrlo dos veces no duplica nada. Y todo lo que crea va marcado
—correos en `@demo.invalid`, nombres con `[demo]` delante— para poder borrarlo de un tirón.

Dos cosas que conviene saber antes de correrlo contra producción:

- **Pon `SEED_DEMO_PASSWORD`.** La contraseña por defecto está escrita en el script, y un fichero
  del repositorio no es un secreto.
- **`--limpiar` borra las campañas, no las cuentas.** La API no tiene ruta para borrar un usuario y
  no se le añade una por comodidad de un script.

Base de datos:

```bash
pnpm --filter @dnd/api prisma:migrate           # crear migración en desarrollo
pnpm --filter @dnd/api exec prisma migrate deploy   # aplicar las existentes
docker compose down                             # parar Postgres (el volumen persiste)
```

## Trabajar en paralelo (varios worktrees a la vez)

Todo checkout de este repo comparte por defecto tres recursos globales: el puerto 3000
(API), el 5173 (Vite) y la base de datos `dnd` en el Postgres único de `docker-compose.yml`
(5432). Eso significa que **dos checkouts no pueden correr el navegador (`pnpm --filter
@dnd/web e2e`) a la vez**: se pisan los puertos y las filas de la base de datos, y el
resultado son fallos falsos, no reales. Ya pasó — perdimos un ciclo entero por esto.

La solución es un **slot**: un número que, con una sola variable **de entorno de shell**,
`WORKTREE_SLOT`, deriva los puertos y el nombre de base de datos que antes eran fijos.

> **`WORKTREE_SLOT` se exporta en el shell, nunca en un `.env`.** Ni en `apps/api/.env`
> (solo lo lee la API — Vite y Playwright leen `process.env` directamente, del proceso que
> los lanzó) ni en el `.env.example` de la raíz: por eso no aparece en la tabla de arriba, y
> por eso `.env.example` no la menciona. Ponerla en `apps/api/.env` no hace nada — ni un
> error, silencio: Vite y Playwright seguirían calculando slot 0 mientras tú crees que estás
> aislado, exactamente el fallo que este mecanismo existe para evitar.

- **Slot 0** (no exportar `WORKTREE_SLOT`, o exportarla como `0`) es exactamente lo de
  siempre: API en `:3000`, web en `:5173`, base de datos `dnd`. **Quien no toca esta
  variable no ve ningún cambio** — literal: en slot 0 la configuración de Playwright no
  inyecta `PORT` ni `DATABASE_URL` en el proceso de la API, así que sigue leyendo su propio
  `apps/api/.env` tal cual, sin ningún valor calculado de por medio.
- **Slot N** (`N` de 1 a 20) usa API en `:3000 + N·100`, web en `:5173 + N·100` y una base
  de datos `dnd_wtN` en el mismo Postgres — crear una base es más barato que un segundo
  contenedor. Slot 1 → `:3100` / `:5273` / `dnd_wt1`. Slot 2 → `:3200` / `:5373` /
  `dnd_wt2`. Y así (el límite de 20 es solo para que un valor mal escrito no calcule un
  puerto o un nombre de base sin sentido; nadie va a correr 20 slots a la vez).

La aritmética vive en un solo sitio, `scripts/worktree-slot.mjs` (`apps/web/worktree-slot.ts`
solo la re-exporta), y la usan `apps/web/vite.config.ts` (puerto del dev server y, sobre
todo, **el destino del proxy `/api`, que sigue al puerto de la API automáticamente** — un
proxy apuntando al slot equivocado se vería igual que un test roto), `apps/web/playwright.config.ts`
(URL base y `env` de los dos `webServer`) y `scripts/db-slot.mjs` (más abajo).

### Cómo usar un slot

1. **Elige un número de slot** que no esté usando otro checkout (con dos agentes activos,
   uno es el 0 de siempre y el otro toma el 1, etc. — coordínalo con quien orqueste, no lo
   adivines).

2. **Crea y migra su base de datos**, un solo comando:

   ```bash
   WORKTREE_SLOT=1 pnpm db:slot          # bash / Git Bash
   ```
   ```powershell
   $env:WORKTREE_SLOT=1; pnpm db:slot    # PowerShell
   ```

   Crea `dnd_wt1` si no existe (usa `prisma db execute`, no hace falta `psql` ni un cliente
   de Postgres aparte) y le aplica las migraciones pendientes con `prisma migrate deploy`.
   Es idempotente: volver a correrlo con la base ya creada solo migra. `WORKTREE_SLOT=0` (o
   sin definir) migra `dnd`, la de siempre — nunca crea nada. Al terminar, para un slot ≥ 1
   el comando imprime el par exacto `PORT=` / `DATABASE_URL=` que pegar en el paso 3 — no
   hace falta recalcularlo a mano.

3. **Levanta API y web con el mismo slot.** `apps/api` no lee `WORKTREE_SLOT` — sigue
   leyendo `PORT` y `DATABASE_URL` tal cual (`apps/api/src/main.ts`) — así que la forma
   práctica es pegar el par que imprimió `pnpm db:slot` en el `apps/api/.env` **de este
   worktree** (cada worktree tiene el suyo, no se comparte):

   ```bash
   # apps/api/.env de este worktree
   PORT=3100
   DATABASE_URL=postgresql://dnd:dnd@localhost:5432/dnd_wt1
   ```

   y luego:

   ```bash
   pnpm dev:api                                    # lee el apps/api/.env de arriba
   WORKTREE_SLOT=1 pnpm dev:web                     # bash — o $env:WORKTREE_SLOT=1; pnpm dev:web en PowerShell
   ```

4. **Corre la suite del navegador en ese mismo slot**:

   ```bash
   WORKTREE_SLOT=1 pnpm --filter @dnd/web e2e
   ```

   Con `WORKTREE_SLOT=1`, Playwright arranca su propia API compilada en `:3100` contra
   `dnd_wt1` (derivando esa `DATABASE_URL` a partir de la que ya haya en `apps/api/.env`, o
   si no existe, del entorno o el valor por defecto — nunca inventa un valor de la nada) y
   su propio Vite en `:5273` — no hace falta el paso 3 si dejas que Playwright levante los
   servidores él mismo (su comportamiento habitual cuando no hay nada escuchando ya en esos
   puertos).

**El e2e de API (`pnpm --filter @dnd/api test:e2e`) NO es consciente de `WORKTREE_SLOT`.**
Es supertest en proceso, así que no compite por puertos con nadie — pero sí lee
`DATABASE_URL` únicamente de `apps/api/.env`, así que dos checkouts corriéndolo a la vez
**sí** compiten por las mismas filas de `dnd` a menos que edites ese archivo a mano con el
par que imprime `pnpm db:slot` (paso 2). No hay atajo automático para esto hoy — es deuda
conocida, no algo que este mecanismo ya resuelva.

**Antes de correr Playwright, comprueba que los puertos que vas a usar están libres**
(`netstat -ano | grep :3000` en Windows/Git Bash, o el equivalente). Si el puerto 3000/5173
de siempre está ocupado, es que otro checkout lo está usando ahora mismo — eso es en sí
mismo el motivo para tomar un slot distinto en vez de esperar.

**Un slot repetido entre dos checkouts falla en silencio, no con un error.**
`reuseExistingServer: !CI` (`playwright.config.ts`) hace que, si el puerto de un slot ya
tiene algo escuchando, Playwright lo dé por bueno y **no** levante el suyo propio — así que
si dos checkouts usan el mismo slot a la vez, el segundo corre sus tests contra el código
(y la base) del primero, en verde, sin avisar de nada. Coordinar el número de slot no es
opcional.

CI no toca `WORKTREE_SLOT`: corre un job por máquina, así que se queda siempre en el slot 0
de siempre — `DATABASE_URL`, `PORT` y `AUTH_RATE_LIMIT` los sigue fijando
`.github/workflows/ci.yml` explícitamente, como ya hacía.

## Gotchas que ya costaron tiempo

**La carpeta del proyecto contiene un `&`** (`D&D-Plataform`). Eso rompe `nest --watch` en
Windows: el shell parte la ruta en dos. Por eso `start:dev` es
`concurrently -k "nest build --watch" "node --watch dist/src/main.js"` y **no** `nest start
--watch`. Si algún día un script nuevo falla con una ruta cortada a la altura de `D`, es
esto.

**`@dnd/shared` se consume compilado en Node y en fuente en Vite.** El `package.json`
apunta a `dist/index.js` <!-- docs-lint-ignore --> porque el `node` de producción necesita JavaScript; el `prepare`
de la raíz lo compila tras cada `pnpm install`. Pero **`vite.config.ts` tiene un alias
`@dnd/shared` → `src`**, porque rollup no resuelve las exportaciones nombradas del CommonJS
(`__exportStar`) del `dist`. Los dos caminos son necesarios; no quites ninguno.

**Si cambias un esquema de `@dnd/shared` y la API no lo ve**, es que falta recompilar:
`pnpm --filter @dnd/shared build`.

**Los e2e necesitan Docker arriba.** Sin `docker compose up -d` fallan en la conexión, no en
la lógica.
