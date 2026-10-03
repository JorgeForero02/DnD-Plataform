# Adopción de la plantilla de agentes en D&D-Plataform — spec

**Fecha:** 2026-10-03 · **Repo:** `D&D-Plataform` en `dcf472b` (rama `main`, 1 commit por delante de
`origin/main` = `a4883f0`, solo docs) · **Plantilla:** `Plantilla de agentes` en `a78a535`.
**Plan derivado:** [`../plans/2026-10-03-adopcion-plantilla.md`](../plans/2026-10-03-adopcion-plantilla.md).
**El plan fue refutado y corregido el 2026-10-03.** Una refutación adversaria de solo lectura
(`Auditoria plantilla 2026-10-03/plan-dnd.refutacion.md`) encontró 31 hallazgos: 0 críticos, 1 alto, 11
medios y 19 bajos. Los 31 están incorporados al plan, y cada paso que cambió cita su hallazgo (P1…P31).
También están dentro la regla de copias de seguridad del usuario y las decisiones de §4.2.

**Fuentes (mandan en este orden):** decisiones del usuario (§3) > la refutación
`Auditoria plantilla 2026-10-03/01-dnd.refutacion.md` > la auditoría `01-dnd.md` (misma carpeta) >
`ESTADO-Y-ACCIONES.md` §5 > `CHECKLIST.md`. Como referencia de forma y de errores a no repetir, el plan
de Englishlog y su refutación `plan-englishlog.refutacion.md` (40 hallazgos, H1–H40; §9.2).

---

## 1 · Contexto

D&D-Plataform es la plataforma de campañas de D&D 5.ª del autor, **en producción** en
`dnd.supportive.pro` (`vps1new`, Coolify + Traefik, `docker-compose.prod.yml`). Monorepo pnpm:
`apps/api` (NestJS 11 + Fastify + Prisma 5 + Zod + Sentry, Jest), `apps/web` (React 18 + Vite 5 +
Tailwind + TanStack Query + Zustand, Vitest + Playwright), `packages/shared` (esquemas Zod).

La auditoría encontró una puerta N1 madura (`pnpm verify`, 7 pasos, en el gancho) y casi todas las
piezas «nuevas» de la plantilla sin montar. La refutación confirmó lo grueso (49 de 75 afirmaciones),
rebajó varias «mentiras» a desactualizaciones de registros fechados y añadió falsos negativos (`06:3`,
`01:113`, `CLAUDE.md:38`, los «sin desplegar»). Según la medición del orquestador del 2026-10-03
(`01-dnd.md:126-130`, `docker ps` en `vps1new`), producción sirve las imágenes etiquetadas **`a4883f0`**,
es decir, **el código de `main`**. Esta sesión no entró en el servidor: ese dato es del orquestador.

Este spec convierte todo eso en acciones `DND-nn` con evidencia, aplica lo ya decidido y marca lo que
decide el usuario.

---

## 2 · Estado medido hoy (2026-10-03)

De solo lectura sobre el repo. Lo que exigía instalar o cambiar algo se hizo sobre **copias** en
`C:\Users\gogam\AppData\Local\Temp\claude\auditoria-plantilla\dnd-plan\` (`lockcopy/`: solo los
`package.json` y el lockfile; `repocopy/`: `git archive HEAD` **sin `.env`**; `clon/`: `git clone` del
repo). `pnpm verify` del repo no se volvió a correr: la auditoría y la refutación lo midieron (4.582
ejecutadas en verde, 1 saltada).

| Qué | Comando / evidencia | Resultado |
|---|---|---|
| Audit de producción | `pnpm audit --prod` | **19: 9 high · 10 moderate**, exit 1. High: `fast-uri` ×4 (3.1.6 < 3.1.7; 4.1.3 < 4.1.4), `fastify` 5.11.3 ×4 (< 5.12.2: bypass de autenticación por URL malformada hacia un not-found encapsulado, validación saltada con esquemas `false`, cabeceras sin normalizar, cuerpo reemplazado por validación async), `@nestjs/platform-fastify` 11.2.3 ×1 (< 11.2.4: middleware por ruta saltado con destinos de forma absoluta). Moderate: `fastify` ×3 (incluidas «X-Forwarded-* spoofing under trustProxy hop-count», < 5.12.1, y un DoS con trailers HTTP/2, < 5.12.5), `fast-uri` ×4, `react-router` ×3 (piden v7), `@opentelemetry/core` ×1 (vía `@sentry/node@8`, pide Sentry 10) |
| Quién fija `fastify` | `npm view @nestjs/platform-fastify@<v> dependencies.fastify` | **Versión exacta**: 11.2.3 → `5.11.3`, y **también 11.2.4…11.2.7** (la última de la rama 11). Solo la 12.x lleva `fastify` 5.12.5, y pide `@nestjs/common`/`core` `^12`. **El parche de `fastify` no cabe en el rango declarado sin un `override` o sin subir Nest a 12** |
| Parche en copia (`lockcopy/`) | `pnpm update -r --depth Infinity fast-uri --lockfile-only` | `fast-uri` 3.1.8 y 4.2.1 **sin tocar ningún `package.json`** → 12 (5 high) |
| | `pnpm --filter @dnd/api update @nestjs/platform-fastify@^11.2.7 --lockfile-only` | reescribe `apps/api/package.json:26` a `^11.2.7`; `fastify` sigue en 5.11.3 → 11 (4 high) |
| | `"pnpm": { "overrides": { "fastify@<5.12.5": "^5.12.5" } }` en el `package.json` raíz + `pnpm install --lockfile-only` | un solo `fastify@5.12.5`; **`pnpm audit --prod`: 4 moderate, 0 high**; `--audit-level=high` exit 0; lockfile +71/−58 |
| `trustProxy` numérico tras el parche | `lib/request.js` de `fastify` 5.11.3 frente a 5.12.1…5.12.5 (tarballs de `npm pack`) | **Desde 5.12.1 un `trustProxy` numérico no confía en nada**: `getTrustProxyFn` devuelve `() => false` («Hop-count-only trust cannot validate the immediate peer. Fail closed»), donde 5.11.3 devolvía `(a, i) => i < tp`. El tipo ya no admite `number` |
| Cómo lo usa la app | `apps/api/src/configure-app.ts:68-74`; `docker-compose.prod.yml:67` | `trustProxy: Number(TRUST_PROXY)` y **`TRUST_PROXY: "2"` en producción**. Con el parche tal cual, `req.ip` sería la IP del nginx de `web` para todo el mundo y el límite por IP del login un único cubo compartido: la avería que `docker-compose.prod.yml:12-15` describe para `TRUST_PROXY=1` |
| Verlo fallar (copia) | `pnpm install --frozen-lockfile` con el lock parcheado; `jest configure-app.spec` | install exit 0 (lo que hace `apps/api/Dockerfile:6`); la suite **no compila**: `TS2322: Type 'number \| false' is not assignable to type 'string \| boolean \| string[] \| TrustProxyFunction \| undefined'` en `configure-app.ts:72` |
| Arreglo (copia) | `trustProxy: hops > 0 ? (_address: string, hop: number) => hop < hops : false` + prueba `TRUST_PROXY=2` | `configure-app.spec` **4/4**; `pnpm --filter @dnd/api build` exit 0; Jest de la API entero **2330 pasan + 1 saltada** (la base más la prueba nueva); ESLint y Prettier limpios |
| Otros cambios 5.11.3 → 5.12.5 | `diff -r` de `lib/` | `content-type-parser`, `content-type` (`mediaType` indefinido si no es válido), `four-oh-four` (el contexto 404 hereda los hooks por prototipo), `reply` (`removeHeader` también en la respuesta cruda), `route` (esquemas booleanos), `request` (el de arriba), aviso `FSTSEC002`. La API **no** usa `setNotFoundHandler`, ni esquemas de ruta de Fastify (valida con Zod), ni middleware de Nest (`grep NestMiddleware\|MiddlewareConsumer` vacío): las high de `fastify` y la de Nest **no constan como explotables aquí**, y eso **no está verificado** contra la app en marcha |
| `verify` sin Docker ni `.env` (copia) | `pnpm verify` en `repocopy/` con el parche, la prueba nueva y la regla de arquitectura | 1.ª corrida: `lint` cae por dos errores míos en la copia (una mutación sin restaurar y un `\.` que ESLint marca `no-useless-escape` **en el propio `eslint.config.mjs`**). 2.ª (`verify3.log`): **cae `check:estado`** («no coincide con lo generado») por la prueba nueva. Tras `pnpm update:estado`, 3.ª (`verify4.log`): **exit 0** — shared 232, API 2330 + 1 saltada, web 1957, catálogo 63 |
| Clon limpio | `git clone` + `pnpm install --frozen-lockfile` + `pnpm --filter @dnd/api build` | **`build` cae con 846 errores `TS2339`**: el install no genera el cliente de Prisma (pnpm ignora el script de `@prisma/engines`). Tras `pnpm --filter @dnd/api prisma:generate` (sin base ni `.env`), `build` exit 0. Ya es un paso de `docs/02-entorno.md` («Arranque»), pero el gancho no lo dice |
| Gancho | `.githooks/pre-commit`; `scripts/install-git-hooks.mjs` | `pnpm verify` entero; `prepare` fija `core.hooksPath` y no falla sin `.git` |
| CI | `.github/workflows/ci.yml` | `on: push: [main]` + `pull_request`; **sin `permissions`**, sin `workflow_dispatch`, sin `concurrency`; job `test` con los 7 pasos sueltos (`:47-53`), audit (`:41`) y e2e de API (`:54`); `e2e-browser` aparte. El comentario `:30-40` («no more high findings») ya no es cierto. `apps/web/src/__tests__/node-22-pins.test.ts` exige **exactamente dos** `node-version: 22` |
| CI en GitHub (API pública) | `GET /repos/JorgeForero02/DnD-Plataform/actions/runs` | repo **público** (minutos sin límite). **Las 100 últimas ejecuciones terminan en `failure`**; la última verde es del **2026-09-07** (`7e7f92b`). En la de `a4883f0` (2026-09-19) el job `test` pasa entero —audit incluido, que entonces daba 0 high— y **falla `e2e-browser`** en `pnpm --filter @dnd/web e2e`, sin informe subido. Causa no investigada |
| Dockerfiles | `apps/api/Dockerfile:5-6`, `apps/web/Dockerfile:14-15` | `COPY . .` y `pnpm install --frozen-lockfile` sobre el workspace entero |
| e2e de API | — | no corridos aquí (necesitan Postgres: `docker compose up -d` + `pnpm db:slot`). 66 ficheros |
| Tamaños | `wc -l` | `CLAUDE.md` 126 · `AGENTS.md` 8 · `00` 139 · `01` 455 · `04` 911 · `06` 1.565 · `07` 963 (tope 1000: **37 de holgura**) · `docs/superpowers/**/*.md` 40.171 de 63.367 (63 %) |
| `check-docs` con el arreglo de DND-13 (copia) | `node scripts/check-docs.mjs .` | **2 hallazgos, exactamente**: `01-arquitectura.md:113` («47 / unitarias») y `como-seguir.md:86` («219 + 2051 + 1667 / unitarias»). Los dos caen en bloques que la Task 3 quita. Sobre todos los bloques Markdown del plan: ninguna cifra, y solo rutas que el propio commit crea (una real, `pendientes-cerrados-AAAA-MM-DD`, ya corregida) |
| Regla de arquitectura (copia) | `eslint` con los tres bloques de DND-19 | base verde; **9 de 9 mutaciones caen**: import, `import type`, efecto lateral, `export *`, `@dnd/api/...` en la web; `PrismaService` y `@prisma/client` en un controlador; `./catalog` y `./catalog/index` en el motor |
| Ficha I9 | `scripts/update-estado.mjs:28,199`; `docs/decisiones.md:412` | el bloque generado del `00` remite a «la ficha I9 de `06-pendientes.md`», que **no existe**: se cerró como decisión D-POD-4 y está archivada |

---

## 3 · Decisiones ya tomadas (vinculantes)

| # | Decisión | Efecto aquí |
|---|---|---|
| U-1 | Los secretos de `.env` se quedan y los agentes pueden leerlos | **Sin `deny`** y sin fichero de permisos de Claude Code. R3 ➖ |
| U-2 | Sin plantilla de PR (un solo desarrollador) | R5 ➖ |
| EL-D1 | Atribución a IA **veraz**: `Co-Authored-By` con el modelo que hizo el commit; sin `git-guard` (una identidad en 777 commits) | C9 ➖; política en el `04` |
| EL-D2 | **Código en rama + `merge --no-ff`; solo documentación directo a `main`** | En el `04` (reescribe `04:623-630`, que dice «en `main`» y «push» tras cada tarea) |
| EL-D5 | Los parches de seguridad van **primero**; los despliega **el usuario** en cuanto pasa `verify`; push solo con su permiso | Task 1. Choca con `03-despliegue.md:321-322` («con CI verde»), y el CI está rojo por `e2e-browser`: excepción declarada en el `04` |
| — | El triaje del `06` (1.565 L) es trabajo L con **plan propio**; aquí solo la tarea que lo escribe | DND-28 |
| D-POD-4 | (ya en `decisiones.md:412`) El conteo de unitarias del bloque generado **cuenta declaraciones** y se declara cota inferior; leer el informe del corredor haría caro `check:estado` | C6 y D15 no se adoptan: excepción frente a la plantilla (DND-30) |

---

## 4 · Decisiones pendientes del usuario

El plan avanza con la **recomendada** y la marca «⚑ DP-n» donde la aplica.

| # | Decisión pendiente | Recomendación | Por qué |
|---|---|---|---|
| DP-1 | Parchear `fastify` con un `override` sobre Nest 11, o subir Nest entero a 12 | **`override` `fastify@<5.12.5` → `^5.12.5`** en el `package.json` raíz + `@nestjs/platform-fastify` `^11.2.7`; Nest 12, ficha | Nest 11 fija `fastify` 5.11.3 hasta su 11.2.7. Nest 12 es solo ESM y una migración, no un parche. El `override` es un salto de menor dentro de `fastify` 5, probado en copia (build + Jest + `verify`) |
| DP-2 | `trustProxy`: función de saltos o lista de IP/CIDR | **Función de saltos** `hop < TRUST_PROXY` | Idéntica a lo que hacía 5.11 y a lo ya probado en producción (`03-despliegue.md:170-215`). El riesgo que cierra 5.12.1 —un cliente que habla **directo** con la API— no aplica: la API no publica puertos y solo la alcanza `web` (`docker-compose.prod.yml:54-59`). **No verificado:** si otro contenedor de la red de Coolify llega a `api:3000`. Una lista de rangos privados sería peor: a Traefik le puede llegar la IP del gateway de Docker (`03-despliegue.md:65`) |
| DP-3 | Qué ADR se escriben | **Solo `docs/adr/0001-trust-proxy-por-saltos.md`** por ahora | La decisión más cara de equivocar, acaba de cambiar de forma y tiene un umbral claro de revisión (topología). El motor de reglas ya está razonado en `01` y `decisiones.md` |
| DP-4 | Recortar `01-arquitectura.md` (455 L, tope 150) | **No en este plan**; techo que solo baja y ficha AD-5 | Mezclarlo con la adopción multiplica el diff y el riesgo de romper enlaces |
| DP-5 | Lecturas obligatorias de `CLAUDE.md` (hoy 13 filas) | **`00`, `06`, `04`**; el resto a «Necesito… → Voy a» | Cada lectura obligatoria se paga en contexto en cada sesión |
| DP-6 | ¿Se versionan `.claude/agents/` (3) y `.claude/skills/` (2), que ignora `.gitignore:17`? | **Sí**, tras leerlos | Son la configuración de agentes del repo; si no, `.gitignore` los nombra y solo viaja `.claude/rules/` |
| DP-7 | El CI rojo por `e2e-browser` desde el 2026-09-07 | **Ficha (AD-1) y plan aparte**; la puerta de esta adopción es el job `test` | Investigarlo exige los registros autenticados de Actions o reproducir la suite de navegador |
| DP-8 | Archivar ya las secciones cerradas del `06` o todo al triaje | **Solo `06:770-780`** («Desplegar `main` … hecho», con la cifra falsa `6d2b2ca`); cabecera `06:3` corregida | Arregla la mentira concreta sin adelantar el triaje |
| DP-9 | Correr el banco T1–T4 antes y después (8 sesiones; **T1 entra por `ssh` al servidor, solo lectura**) | **Sí, con permiso explícito** antes de lanzar | La plantilla lo pide al cambiar reglas; T1 ya cazó una mentira de producción el 2026-09-07 |

### 4.1 · Respuestas del usuario (2026-10-03)

**Las nueve se resolvieron con la recomendada.** Desde esta fecha son decisiones tomadas, no
pendientes, y el plan las aplica sin volver a preguntar, **salvo DP-9**, que pide un permiso
en cada tanda.

| # | Respuesta | Qué quiere decir en el plan |
|---|---|---|
| DP-1 | `override` de `fastify` sobre Nest 11 | Task 1 tal cual; subir a Nest 12 queda en la ficha AD-2 |
| DP-2 | Función de saltos `hop < TRUST_PROXY` | Task 1, Step 6 tal cual; `TRUST_PROXY` sigue en 2 |
| DP-3 | Solo el ADR 0001 | Task 6 tal cual |
| DP-4 | No se recorta el `01`; techo que solo baja + ficha AD-5 | Tasks 4 y 7 tal cual |
| DP-5 | Lecturas obligatorias: `00`, `06`, `04` | Task 8 tal cual |
| DP-6 | Se versionan `.claude/agents/` y `.claude/skills/`, tras leerlos | Task 14 tal cual |
| DP-7 | CI rojo por `e2e-browser`: ficha AD-1 y plan aparte | Task 4 tal cual; la puerta de esta adopción es el job `test` |
| DP-8 | Solo se archiva `06:770-780` y se corrige la cabecera | Task 3, Step 5 tal cual |
| DP-9 | Sí al banco: 8 sesiones (4 «antes», 4 «después») | Tasks 5 y 15. **Antes de cada tanda de cuatro** se vuelve a pedir permiso, porque T1 entra por `ssh` en `vps1new` y el agente elige él mismo los comandos. Que sean de lectura lo garantizan el enunciado y la costumbre, no una barrera técnica |

**Aclaración de DP-9** (se pidió al decidir): **la Task 1 del plan, que es el parche, no ejecuta
ningún `ssh`.** El `ssh` es el de la **tarea T1 del banco**. En su estreno del 2026-09-07 hizo
`docker ps` en `vps1new` y miró en la base cuál era la última migración aplicada
(`10-banco-de-tareas.md`, T1). Tras el despliegue, el humo de la Task 1 lo corre el usuario con
`curl` desde fuera: `GET /api/health` y logins **fallidos** contra una cuenta que no existe. El
módulo de autenticación (`apps/api/src/auth/`) no guarda nada cuando un login falla, así que esa
prueba no escribe en la base.

### 4.2 · Regla nueva del usuario y decisiones tomadas por el agente en su ausencia (2026-10-03)

**Regla del usuario, vinculante:** *«ya hay gente usando la plataforma así que es importante que
cualquier cosa que hagas en vps1new o producción le hagas copia de seguridad (aún no activarás la
automática)»*. **Sustituye** a la decisión del 2026-09-05 de no hacer copias (`06-pendientes.md`,
«La copia de seguridad de esta base: DECIDIDO QUE NO»), que se basaba en que no había usuarios. En el
plan, la regla está en Global Constraints, en la Task 1, Step 16 (volcado con `pg_dump` y
`pg_restore --list` antes de desplegar), en el Step 7b nuevo de la Task 3 (la decisión vieja se archiva
entera y la nueva ocupa su sitio en el `06`, el `03` y el `08`), en la D-AD-6 de la Task 6 y en las reglas
duras del `CLAUDE.md` nuevo (Task 8). La copia automática **no** se monta ni se propone.

El usuario indicó que no estaría presente y que las decisiones las tomara el agente con los cuatro pasos.
Estas se tomaron así: corrección rápida y duradera, ¿cumple las reglas?, ¿la contesta una fuente?, y si no,
la opción más reversible.

| # | Decisión | Por qué | Cómo revertirla |
|---|---|---|---|
| DA-1 | La decisión vieja sobre copias **se archiva entera** y no se anota encima | El plan prohíbe dejar en un documento vivo lo que dejó de ser cierto («se mueve entero a `_archivo/`»). Una nota encima habría dejado en el tablero un «no se propone ni se menciona» que contradice la regla nueva | Devolver el bloque desde `_archivo/pendientes-cerrados-2026-10-03-adopcion.md` |
| DA-2 | **Orden de ejecución** 0-6, 9, 10, 7, 8, 11-15, en vez de reordenar el plan | Refutación P16. Cambiar el orden de lectura habría desplazado todas las citas «Task n» del spec y del informe; el orden de ejecución, declarado al principio del plan, logra lo mismo sin tocarlas | Ejecutar en orden numérico, aceptando enlaces rotos en `main` durante unas horas |
| DA-3 | No se fabrica un CI en rojo | Refutación P1. Cualquier otra forma exige saltarse el gancho, que está prohibido | — |
| DA-4 | La ficha AD-6 nombra el ADR 0001 **sin enlazarlo** | Lo crea la Task 6, posterior a la 4: un enlace habría estado roto en `main` entre medias | Añadir el enlace después de la Task 6 |
| DA-5 | En la Task 8, el bloque del `CLAUDE.md` nuevo va con cuatro comillas invertidas | Lo encontró el orquestador, no la refutación: con tres, el bloque `bash` de dentro lo cortaba a mitad y quien copiara obtendría medio fichero | — |

---

## 5 · Acciones

Tamaños: **S** < 1 h · **M** ½ día · **L** > 1 día.

### A · Seguridad (primero; rama `fix/fastify-trust-proxy`)

| ID | Acción | Evidencia | Tam. |
|---|---|---|---|
| DND-01 | `fast-uri` dentro de rango; `@nestjs/platform-fastify` `^11.2.7`; `pnpm.overrides` `"fastify@<5.12.5": "^5.12.5"` en el `package.json` raíz, junto al `onlyBuiltDependencies` que ya vive ahí (⚑ DP-1). Commit con **lockfile + `package.json` raíz + `apps/api/package.json`** | §2; `apps/api/package.json:26`; `package.json:32-40`; `apps/api/Dockerfile:6` | S |
| DND-02 | `trustProxy` → función de saltos en `configure-app.ts:68-74` (⚑ DP-2), comentario al día, prueba `TRUST_PROXY=2`, `pnpm update:estado` | §2; `configure-app.spec.ts:37-41`; `trust-proxy.e2e-spec.ts:88` | S |
| DND-03 | Comentario `ci.yml:30-40` con la situación medida; CL-13 (`06:208-211`) con el dato; «Última revisión» del `06` | refutación, mentira #1; `check-docs.mjs:251-268` | S |
| DND-04 | `verify`; e2e de API con Postgres; instalación `--frozen-lockfile` + `prisma:generate` + builds en un worktree limpio; tras desplegar el usuario, humo **sin escrituras**: `GET /api/health` y las pruebas de límite de `03-despliegue.md` § «Comprobación obligatoria el primer día» y § «Cómo comprobarlo en el sistema en marcha» (punto 3, dos redes) | `03-despliegue.md:92-116,248-269` | S |

### B · Documentación que hoy miente (main)

| ID | Acción | Evidencia | Tam. |
|---|---|---|---|
| DND-05 | **Producción sin hash escrito a mano**: `00-INDEX:12-49` entero a `_archivo/` y en su sitio el comando; `03:6` igual; `como-seguir.md` §0 (`:46-146`) entero a `_archivo/` y `:37` fechado; `06:245`, `:506`, `:732`, `:781` sin «sin desplegar»; `06:770-780` archivado (⚑ DP-8); entrada en el `07` con la medición del 2026-10-03 que **supera** sin reescribirlas a las entradas con «sin desplegar». Comando: `ssh vps1new "docker ps --filter name=5awvsn1dnkexhcjzg7kjwom6 --format '{{.Names}} {{.Image}} {{.Status}}'"` (filtro de `03-despliegue.md:86`) | refutación, mentira #2 y FN 3; `01-dnd.md:126-134` | M |
| DND-06 | **Cifras a mano**: `01:113-114` (47; real 63) sin cifra; `00-INDEX:84`, `decisiones.md:4-5`, `CLAUDE.md:38` (13.662 / 61 %; real 40.171 / 63 %) con el comando | refutación, mentira #4 y FN 2 y 4 | S |
| DND-07 | `06:3` «**Solo fichas abiertas**» con al menos ocho cerradas (`06:245`, `742`, `759`, `770`, `878`, `971`, `1515`, `1549`): cabecera veraz hasta el triaje | refutación, FN 1 | S |
| DND-08 | `como-seguir.md:166-172` («banco… **sin estrenar**») es falso: `10-banco-de-tareas.md:150-156` registra el estreno del 2026-09-07, 3 de 3 | **nuevo** | S |
| DND-09 | `03-despliegue.md:131-137` («**CI… verde**» y «**`pnpm build` no está**») es doblemente falso: rojo desde el 2026-09-07; `build` desde el 2026-09-05 (`ci.yml:47`) | **nuevo** | S |
| DND-10 | `01:37` «Ningún controlador la toca» → con la excepción de `health.controller.ts:2,26,33` | refutación, mentira #7 | S |
| DND-11 | `04:31-34` y `check-docs.mjs:2-11` dicen «tres reglas»; son seis (más la del salto de línea). En la rama de DND-13 | refutación, mentira #5 | S |
| DND-12 | `04:623-630` (Git) contra EL-D2 y EL-D5 | §3 | S |

### C · Los controles

| ID | Acción | Evidencia | Tam. |
|---|---|---|---|
| DND-13 | `check-docs`: comprobación 1 también **a través de un salto de línea**, con `FENCE_RE` compartido (probado en copia, §2) | `check-docs.mjs:85,152,156`; refutación FN 2 | S |
| DND-31 | El bloque generado del `00` y `update-estado.mjs:28,199-200` remiten a la ficha I9, inexistente → a la decisión D-POD-4 | **nuevo**; §2 | S |

### D · Piezas de la plantilla

| ID | Acción | Evidencia | Tam. |
|---|---|---|---|
| DND-14 | `.gitignore`: `.claude/` → `.claude/worktrees/`, `.claude/settings.local.json`, `.claude/settings.local.json.bak.*` (⚑ DP-6); `.env.*` con `!.env.example`, `*.pem`, `*.key` | `.gitignore:14-17`; R6 | S |
| DND-15 | `.claude/rules/frontend-react.md` y `backend-nestjs.md` (Prisma dentro), **ajustadas a React 18 / Vite 5 / Nest 11 / Prisma 5 / Jest / Zod** y a la prueba de arquitectura real (ESLint); fuentes oficiales con fecha; comprobado que cargan por `paths:` | R4; `plantillas/rules/README.md` | M |
| DND-16 | `AGENTS.md`: puntero + línea de qué es + stack | R2 | S |
| DND-17 | `04`: mapa de la plantilla; A.1–A.4 (excepción del `06` hasta el triaje); B.4 con `git stash`/`git checkout`/`git switch` (`04:800-810`); B.5 con las 12 reglas y su evidencia; B.6 con zona congelada, permiso y «lo trivial va directo»; Parte C con tabla y estado; excepciones frente a la plantilla; atribución | D3–D9 | M |
| DND-18 | CI: `permissions: contents: read`, `workflow_dispatch`, ramas `fix/**`, `chore/**`, `docs/**`, `concurrency`; `test` llama a **`pnpm verify`**; docs del CI al día (`04:74-83`, `03:131-137`) | C3 | S |
| DND-19 | Prueba de arquitectura: tres bloques `no-restricted-imports` en `eslint.config.mjs` (web ↛ `apps/api`; controladores ↛ `PrismaService`/`@prisma/client` salvo `health`; `rules/engine.ts` ↛ `catalog/`), dentro de `pnpm lint`; el `01` dice qué se comprueba y qué no (`import()`, `require()`) | C8; D2; `01:20-43`, `01:83-99` | M |
| DND-20 | Banco: **T4** y corridas antes/después (⚑ DP-9) | D17 | M |
| DND-21 | `docs/11-invariantes.md`: visibilidad y sus cinco niveles, membresía, hoja derivada, PNJ = `Character`, reloj, un encuentro activo, ranuras y sintonizaciones, azar en el servidor; dueño + prueba o «Sin prueba»; glosario | D16 | M |
| DND-22 | `docs/auditorias/README.md` con las **cinco** auditorías existentes, reconstruidas de sus informes | D18 | S |
| DND-23 | `CLAUDE.md` corto (3 lecturas ⚑ DP-5, arranque de 5 líneas, «Necesito… → Voy a», comandos, reglas duras, cierre); `CLAUDE.md:107-126` entero a `_archivo/` | R1 | M |
| DND-24 | Techos con cifra en el `04`: `01` 455 L; `06` 1.565 L; 4 moderate; e2e fuera de `verify`; N1 | D2, D11, C7 | S |
| DND-25 | ADR 0001 `TRUST_PROXY` por saltos (⚑ DP-3) + sección en `decisiones.md` con las decisiones del 2026-10-03 | D14 | S |
| DND-26 | Archivar el `07` **por posición** antes de añadir entradas: desde «La hoja a página completa (2026-09-11 y 12)» (`07:534`) al final | D12 | S |
| DND-27 | Controles **vistos fallar** y anotados: `check:docs` (cifra en una y dos líneas, exención del `07`, ruta, línea), `check:estado`, `check:historial`, regla de arquitectura, gancho, CI | C10 | S |
| DND-28 | Plan del triaje del `06` (A.4) | D11 | S / L |
| DND-29 | Fichas AD-1…AD-5 en el `06`: CI rojo (⚑ DP-7), `override` hasta Nest 12, cuatro moderados, lo que no ve la regla de arquitectura, `01` sobre su tope (⚑ DP-4) | §2 | S |
| DND-30 | C6/D15 como **excepción declarada** frente a la plantilla (D-POD-4), sin ficha | §3 | S |

### Orden

1. **A** en su rama, merge, entrega al usuario para desplegar.
2. `main`: archivar el `07` → documentación veraz → fichas → banco «antes» → ADR → `04` → `CLAUDE.md`
   → invariantes → auditorías. El banco «antes» va **antes** de tocar reglas.
3. Rama `chore/puerta-plantilla`: `check-docs` + D-POD-4 → arquitectura → CI y controles vistos fallar.
4. Rama `chore/reglas-stack`: `.gitignore` + `.claude/rules/`.
5. Banco «después» y plan del triaje.

---

## 6 · Fuera de alcance

Subir Nest a 12, React Router a 7 o Sentry a 10 (fichas AD-2, AD-3) · arreglar `e2e-browser` (AD-1) ·
recortar `01` (AD-5) · el triaje del `06` · N2: **sigue N1** · cualquier `deny` de secretos, plantilla de PR
o `git-guard` · entrar en `vps1new` (solo el usuario, o el banco T1 con permiso).

---

## 7 · Matriz de cobertura contra la refutación

Estado = el de la refutación tras U-1/U-2. «T» = tarea del plan.

| Elemento | Estado | Acción | T |
|---|---|---|---|
| R1 `CLAUDE.md` | 🟡 | DND-23, DND-06 | T8, T3 |
| R2 `AGENTS.md` | 🟡 | DND-16 | T8 |
| R3 permisos de Claude Code | ➖ U-1 | excepción en el `04` | T7 |
| R4 `.claude/rules/` | ❌ | DND-14, DND-15 | T14 |
| R5 PR template | ➖ U-2 | excepción en el `04` | T7 |
| R6 `.gitignore` | 🟡 | DND-14 | T14 |
| R7 skills | ✅ | — | — |
| D1 `00-INDEX` | 🟡 | DND-05, DND-06 | T3 |
| D2 `01` | 🟡 | DND-10, DND-19, DND-24, AD-5 | T3, T12, T7, T4 |
| D3 A.1–A.3 | 🟡 | DND-17 | T7 |
| D4 A.4 | ❌ | DND-17 | T7 |
| D5 B.4 | 🟡 | DND-17 | T7 |
| D6 B.5 | 🟡 | DND-17, DND-01, DND-19 | T7, T1, T12 |
| D7 B.6 | 🟡 | DND-17 | T7 |
| D8 Parte C | 🟡 | DND-17, DND-24 | T7 |
| D9 excepciones + atribución | ❌ | DND-17, DND-12 | T7 |
| D10 runbook | 🟡 | excepción declarada (`05` = Datos; runbook en `02`/`03`) | T7 |
| D11 `06` por áreas | ❌ | DND-07, DND-28 (el triaje es plan aparte, por diseño) | T3, T15 |
| D12 `07` | ✅ (37 L de holgura) | DND-26 | T2 |
| D13 `como-seguir` | ✅ (con mentiras) | DND-05, DND-08 | T3 |
| D14 `decisiones` + `adr/` | 🟡 | DND-25 | T6 |
| D15 `NN-pruebas` | 🟡 | DND-30 (excepción D-POD-4) | T7 |
| D16 invariantes | ❌ | DND-21 | T9 |
| D17 banco T4 | 🟡 | DND-20 | T5, T15 |
| D18 auditorías | ❌ | DND-22 | T10 |
| D19 `_archivo` | ✅ | filas nuevas en su README | T2, T3, T8 |
| C1 `verify` | ✅ | gana la regla de arquitectura vía `lint` | T12 |
| C2 gancho | ✅ | clon limpio sin Docker ni `.env` (con `prisma:generate`) | T13 |
| C3 CI | 🟡 | DND-18 | T13 |
| C4 `check-docs` | ✅ con hueco | DND-13, DND-11 | T11 |
| C5 `check-historial` | ✅ | visto fallar | T13 |
| C6 `check-conteos` | 🟡 | DND-30 (excepción D-POD-4), DND-31 | T7, T11 |
| C7 cobertura | ➖ | N1 | — |
| C8 arquitectura | ❌ | DND-19 | T12 |
| C9 `git-guard` | ➖ | EL-D1 | T7 |
| C10 vistos fallar | 🟡 | DND-27 | T11, T12, T13 |
| Mentira 1 audit / `ci.yml:30-40` / CL-13 | ALTO | DND-01, DND-03 | T1 |
| Mentira 2 producción | ALTO | DND-05 | T3 |
| Mentira 3 `00:107` | MEDIO | DND-05 (se vuelve cierta) | T3 |
| Mentira 4 13.662 / 61 % | BAJO | DND-06 | T3 |
| Mentira 5 «tres reglas» | BAJO | DND-11 | T11 |
| Mentira 6 «no hay excepciones» | refutada | la tabla nueva es frente a la **plantilla** | T7 |
| Mentira 7 `01:37` | BAJO | DND-10 | T3 |
| Mentiras 8, 9, 10 | refutadas | — | — |
| FN `06:3` | MEDIO | DND-07 | T3 |
| FN `01:113` y el hueco de `COUNT_RE` | MEDIO | DND-06, DND-13 | T3, T11 |
| FN «sin desplegar» (`07:132`, `06:245`, como-seguir) | MEDIO | DND-05 | T3 |
| FN `CLAUDE.md:38` | BAJO | DND-06 | T3 |
| FN más auditorías | BAJO | DND-22 | T10 |
| FN 70 migraciones | BAJO | cifra del auditor, no de la doc | — |
| Refutación P2: ignorar `settings.local.json.bak.*` | — | DND-14 | T14 |
| Nuevo: `trustProxy` numérico tras el parche | CRÍTICO si se despliega sin él | DND-02 | T1 |
| Nuevo: CI rojo desde el 2026-09-07 | ALTO | DND-29, DND-09 | T4, T3 |
| Nuevo: `03:131-137` | MEDIO | DND-09 | T3, T13 |
| Nuevo: `04:623-630` contra EL-D2 | MEDIO | DND-12 | T7 |
| Nuevo: ficha I9 inexistente en el bloque generado | BAJO | DND-31 | T11 |
| Nuevo: banco «sin estrenar» | BAJO | DND-08 | T3 |
| Nuevo: un clon limpio necesita `prisma:generate` antes del gancho | BAJO (documentado en `02`) | se dice en el plan y en el `07` | T13 |
| Techos: audit 9 high → 0; `01` 455; `06` 1.565; e2e fuera; N1 | — | DND-01, DND-24 | T1, T7 |

---

## 8 · Riesgos

1. **Desplegar el parche sin DND-02 rompe el límite de intentos en producción.** Mitigación: mismo commit;
   `pnpm build` no compila sin él (visto en copia); humo de dos redes tras desplegar.
2. **El `override` puede chocar con algo de Nest 11** que las unitarias no ejercen. Mitigación: e2e de API
   completos antes del merge, con `trust-proxy`, `security-headers` y `rate-limit` entre ellos.
3. **Lockfile y los dos `package.json`** viajan juntos (Dockerfiles `--frozen-lockfile`).
4. **Controles en el gancho:** `check:estado` tras añadir pruebas; «Última revisión» del `06`; cifras y
   rutas en documentos nuevos.
5. **El `07` tiene 37 líneas de holgura**: se archiva antes de la segunda entrada.
6. **CI rojo por `e2e-browser`**: el verde de esta adopción se mide en el job `test`, y se dice.

---

## 9 · Autorrevisión

### 9.1 · Cobertura, marcadores, coherencia

- Cada `DND-01…31` tiene tarea (plan, «Matriz DND → tarea»); cada fila de §7 que no es ✅ ni ➖ tiene acción
  y tarea. Las ⚑ del plan son DP-1…DP-9, y nada más.
- Sin marcadores salvo `<MODELO>` (atribución veraz), la fecha del plan del triaje (`date +%F`) y
  `@@FECHA@@` en las reglas por stack, que un paso sustituye y comprueba.
- Las rutas y líneas se comprobaron contra `dcf472b`; cada ancla `grep -n` del plan se probó en copia
  (`00:12-49`, `como-seguir:46-146`, `06:770-780`, `07:534`, `CLAUDE.md:107`). El plan re-localiza por
  texto, porque cada tarea desplaza las líneas de la siguiente.
- `check-docs` del repo con este spec y el plan dentro: sin hallazgos; ninguna fecha posterior a hoy.

### 9.2 · Las trampas de la refutación de Englishlog, una por una

| H | Trampa | ¿Aplica a D&D? | ¿La esquiva el plan? |
|---|---|---|---|
| H1 | `check-docs` contra lo heredado (fechas en bloques de código, tachadas, rutas que se piden crear) | En parte: ya está en `verify`; DND-13 añade **2** hallazgos medidos | Sí: Task 3 los quita **antes** de la Task 11; simulado `check-docs` sobre todos los bloques del plan; «Última revisión» del `06` en cada edición |
| H2 | Lockfile sin `package.json` con `--frozen-lockfile` | **Sí** | Sí: Task 1 añade los tres y reproduce la instalación en un worktree |
| H3 | Prueba de arquitectura ciega a la mutación | **Sí** | Sí: 9 mutaciones vistas fallar en copia; el plan repite seis |
| H4 | Clon de prueba antes del commit | Sí | Sí: `--branch` **después** del commit |
| H5 | Gancho que falla sin `.env` | Medido: pasa sin `.env`… | …pero **no sin `prisma:generate`** en un clon nuevo: el paso lo incluye y lo explica |
| H6 | CI que no se dispara en una rama sin PR | **Sí** | Sí: `workflow_dispatch` + ramas |
| H7 | Linter contra lo copiado | Sí: ESLint lintea `**/*.mjs` y `eslint.config.mjs` | Sí: código del plan pasado por ESLint y Prettier en copia; la cadena del `regex` va con `\\.` (cazado en copia) |
| H8 | Docs que no cambian con `verify`/gancho/CI/banco | Sí | Sí: Task 13 (`04:74-83`, `03`), Task 5 («tres tareas» en `00` y `como-seguir`), Task 12 (B.5 y Parte C) |
| H9 | Renombrados a ciegas | Sí («sin desplegar», hashes) | Sí: línea a línea; las entradas fechadas del `07` no se tocan |
| H10 | Conteos al día al añadir pruebas | **Sí** (`check:estado`) | Sí: `pnpm update:estado` en la Task 1 (visto fallar sin él en copia) |
| H11 | `prepare` en la imagen | No cambia | La instalación del worktree de la Task 1 lo ejecuta |
| H12 | Comentarios de código en un commit de docs | No se renombra ningún documento citado por código | — |
| H13 | Punteros a secciones movidas | Sí (`00:12-49`, `como-seguir` §0, cola de `CLAUDE.md`) | Sí: sustitutos con enlace y `git grep` de los títulos |
| H14 | Humo que escribe en producción | Sí | Sí: `GET /api/health` y logins **fallidos** contra una cuenta inexistente |
| H15 | `pnpm why` sin `-r` | Sí | Sí |
| H16 / H17 | `check-conteos` y su tabla | No (D-POD-4) | — |
| H18 | `07` no cronológico | El de D&D sí va de lo nuevo a lo viejo | Sí: corte por posición y comprobación de fechas |
| H19 | Excepciones incompletas | Sí | Sí: once filas en el `04` |
| H20 | Banco antes y después | **Sí** | Sí: Tasks 5 y 15, con permiso de coste |
| H21 | `decisiones` y ADR | Sí | Sí: ADR 0001 y sección D-AD-1…5 |
| H22 | Ver fallar gancho y CI | Sí | Sí: Task 13 |
| H23 | Mutación de la exención | Sí (el `07` está exento de conteos) | Sí: Task 11 |
| H24 | Borrar hechos ciertos | Sí | Sí: se mueven enteros a `_archivo/` |
| H25 | Citas de línea exactas | Sí | Sí: comprobadas y con ancla por texto |
| H26 | La imagen descrita con precisión | Sí | Sí: «según la medición del orquestador», no verificado aquí |
| H27 / H29 | `vps1` en docs o código | No (`git grep -w vps1` vacío fuera de `_archivo/` y `superpowers/`) | — |
| H28 | Un linter que no procesa `.md` | Prettier ignora `**/*.md` | No se usa como comprobación de docs |
| H30 | Afirmaciones inventadas | Riesgo general | Nada se afirma sin comando |
| H31 | Nombre del plan del triaje; cerradas a `_archivo/` | Sí | Sí: `date +%F`; cerradas a `_archivo/pendientes-cerrados-<fecha>.md` |
| H32 | Regla pendiente sin ficha | Sí (`import()`, `require()`) | Sí: AD-4 |
| H33 | Tabla de `CLAUDE.md` incompleta | Sí | Sí: todos los documentos vivos en «Necesito… → Voy a» |
| H34 | `concurrency` | Sí | Sí |
| H35 | Trailer fijo | Sí | Sí: `<MODELO>` = quien hizo el commit |
| H36 | Dónde viven las `overrides` en pnpm 10 | Sí | Sí: en el campo `pnpm` del `package.json` raíz, probado con pnpm 10.32.1 |
| H37 | Runbook de `02` y `03` | D10 | Sí: excepción declarada |
| H38 | Reglas divergentes `CLAUDE` / `01` | Sí | Sí: la regla vive en el `01`; `CLAUDE.md` remite |
| H39 | Cifras a mano que quedan | Sí | Sí: `00:84`, `00:12-49`, `decisiones.md:4`, `CLAUDE.md:38`, `01:113` |
| H40 | Comentario cierto solo si el CI corre | Sí (`ci.yml:30-40`) | Sí: reescrito con lo medido |
| Extra | Parche de `fastify`: `trustProxy` numérico, `setNotFoundHandler`, esquemas de cabecera; la doc dice qué **no** se verificó | **Sí, y es el hallazgo más grave** | Sí: DND-02 y la entrada del `07`, que no infla la exposición |
