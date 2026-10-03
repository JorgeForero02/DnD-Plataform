# Adopción de la plantilla de agentes en D&D-Plataform — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** cerrar las vulnerabilidades high de producción sin romper el límite de intentos del
login, hacer que la documentación diga la verdad (sin cifras ni hashes escritos a mano) y montar las
piezas de la plantilla que faltan —`04` completo, `CLAUDE.md` corto, invariantes, auditorías, prueba
de arquitectura, CI que llama a `verify`, reglas por stack— sin perder el verde ni información.

**Architecture:** cuatro bloques en orden. (1) Parche de dependencias + `trustProxy` como función, en
rama, que el usuario despliega en cuanto pasan `verify` y los e2e de API. (2) Documentación directo en
`main`: archivar el `07`, quitar lo que miente, fichas nuevas, banco «antes», ADR, `04`, `CLAUDE.md`,
invariantes, auditorías. (3) La puerta, en rama: `check-docs` a través de saltos de línea, prueba de
arquitectura con ESLint, CI con `permissions` que llama a `verify`, controles vistos fallar; y en otra
rama `.gitignore` + `.claude/rules/`. (4) Banco «después» y el plan del triaje del `06`.

**Tech Stack:** pnpm 10.32.1 (monorepo `apps/api`, `apps/web`, `packages/shared`), Node ≥ 22,
TypeScript 5.9, NestJS 11 + Fastify 5 + Prisma 5 + PostgreSQL 16 + Jest 29, React 18 + Vite 5 +
Vitest 2 + Playwright, ESLint 9 (config plana), Prettier 3, GitHub Actions.

**Spec:** [`../specs/2026-10-03-adopcion-plantilla-design.md`](../specs/2026-10-03-adopcion-plantilla-design.md)
(DND-01…DND-31, DP-1…DP-9, matriz de cobertura y la lista de trampas H1–H40). Plantilla:
`C:\Users\gogam\Desktop\Trabajo\Plantilla de agentes` (`a78a535`). Las marcas **⚑ DP-n** señalan
el paso que aplica cada decisión. **El usuario resolvió las nueve el 2026-10-03, todas con la
recomendada** (spec §4.1). Por eso esos pasos **ya no se confirman**, con una excepción: la DP-9,
que pide permiso antes de cada tanda del banco (Tasks 5 y 15).

## Global Constraints

- **Ramas (EL-D2):** código en rama + `git merge --no-ff`; **solo documentación** directo a `main`.
  La documentación que acompaña a un cambio de código va en su misma rama.
- **Atribución (EL-D1):** cada commit lleva `Co-Authored-By: <MODELO> <noreply@anthropic.com>`, donde
  `<MODELO>` es el modelo **que hizo ese commit de verdad** (si lo hace un subagente de otro modelo,
  el suyo). Mensajes de commit en inglés, Conventional Commits.
- **Secretos (U-1):** los `.env` se quedan y los agentes pueden leerlos. **Prohibido** añadir `deny`
  de `.env*` o crear `.claude/settings.json` de permisos. **Sin plantilla de PR (U-2).** Nunca se
  imprime el contenido de un `.env`; las pruebas **no** tocan el `.env` real.
- **Despliegue y push:** solo el usuario despliega; `git push` solo con su permiso en la sesión.
  Nadie entra en `vps1new` salvo el usuario o el banco T1 con permiso explícito (Task 5).
- **Copia de seguridad antes de tocar producción** (regla del usuario del 2026-10-03: **ya hay gente
  usando la plataforma**). Antes de **cualquier cambio** en `vps1new` o en producción (desplegar,
  migrar, cambiar configuración) se hace una copia manual de la base y se comprueba que el fichero
  existe y no está vacío (Task 1, Step 16). Las lecturas puras (`docker ps`, `cat`) no la necesitan.
  **La copia automática todavía no se activa**: ni se monta ni se propone en este plan.
- **Cada bloque de código se ejecuta entero en una sola llamada** (refutación P12). La herramienta de
  shell de un agente no conserva variables entre llamadas: si un paso necesita `L`, `T`, `INI` o
  `FIN`, las vuelve a calcular con su `grep` **dentro del mismo bloque** que llama al mover. Si una
  variable sale vacía, el mover se para con «rango inválido»: **no se sustituye por un número
  tomado de las líneas citadas en este plan**, que se desplazan.
- **Quién hace qué** (refutación P30). Los pasos con `git switch`, `git commit`, `git merge`,
  `git worktree`, `git push` y las peticiones de permiso los hace **siempre quien orquesta**, nunca un
  subagente. Un subagente solo edita los ficheros de su tarea y devuelve el diff.
- **Citas por nombre, no por número de línea** (refutación P4, P5). En el texto nuevo de los
  documentos vivos se cita `fichero, § título` o `función()`, no `fichero:línea`: cada tarea desplaza
  las líneas de la siguiente y `check-docs` solo comprueba que la línea exista, no que diga lo mismo.
- **Docker:** los e2e de API necesitan el Postgres local (`docker compose up -d` + `pnpm db:slot`).
  **No correr dos suites a la vez** ni compilar la API mientras corren los e2e.
- **El gancho corre `pnpm verify` entero** (build + lint + formato + `check:docs` + `check:estado` +
  `check:historial` + unitarias, ~3–5 min). En consecuencia:
  - todo commit que añada o quite una declaración de prueba hace antes `pnpm update:estado`;
  - toda edición del `06` que meta una fecha nueva actualiza su línea «Última revisión» (la
    comprobación 6 de `check-docs` falla si no);
  - ningún documento vivo escribe «N pruebas/unitarias/tests/recorridos/e2e/suites» con cifra (lo
    caza `check-docs`); ni cita entre comillas invertidas una ruta con `/` que no exista todavía.
- **Nunca** bajar un umbral, desactivar una prueba, silenciar una regla ni saltarse el gancho.
  El marcador `docs-lint-ignore` no se usa en este plan.
- **No editar `docs/_archivo/`** una vez creado un fichero, ni reescribir entradas fechadas del `07`,
  ni planes/specs de `docs/superpowers/`. Lo que deja de ser cierto en un documento vivo **se mueve
  entero** a `_archivo/` con su fila en `_archivo/README.md`; no se resume ni se borra.
- **Las líneas citadas son de `dcf472b`.** Cada paso que edita re-localiza por texto con `grep -n`
  antes de tocar, porque las tareas anteriores desplazan las líneas.
- Cada cambio relevante deja entrada en `docs/07-historial.md`: **Qué — · Por qué — · Revertir —**,
  la más nueva arriba (justo debajo del `---` que cierra la cabecera), seguida de una línea en blanco,
  `---` y otra en blanco, como las demás.
- **Los subagentes** reciben, literal, la prohibición del `04` §B.4 (Task 7): sin subagentes, sin
  `git stash`/`git checkout`, sin desplegar ni empujar.

## Orden de ejecución

**Las tareas se ejecutan en este orden, no en el de su número** (refutación P16): la Task 7 (el `04`) y la
Task 8 (`CLAUDE.md`) enlazan `11-invariantes.md` y `auditorias/README.md`, que crean las Tasks 9 y 10. Si
fueran después, `main` tendría enlaces a documentos que no existen.

**0 → 1 → 2 → 3 → 4 → 5 → 6 → 9 → 10 → 7 → 8 → 11 → 12 → 13 → 14 → 15.**

Las Tasks 9 y 10 no dependen de la 7 (comprobado por la refutación). Al final de la Task 8 se repite el
comprobador de enlaces de la Task 3, Step 10.

## Review Focus

1. **`trustProxy` tras el parche:** desde `fastify` 5.12.1 un número no confía en nada; sin la función de saltos, el login comparte un cubo en producción (Task 1).
2. **Lockfile + los dos `package.json` juntos**, reproduciendo la instalación `--frozen-lockfile` de los Dockerfiles en un worktree limpio (Task 1).
3. **Los controles en el gancho:** `check:estado` tras añadir pruebas, «Última revisión» del `06`, cifras y rutas en documentos nuevos (todas las tareas).
4. **Mover, no borrar:** cada bloque que sale de `00`, `03`, `como-seguir`, `06`, `07` y `CLAUDE.md` acaba entero en `_archivo/` y los punteros a él siguen resolviendo (Tasks 2, 3, 8).
5. **Ver fallar cada control nuevo** con mutaciones que de verdad lo rompen, y el humo en producción **sin escrituras** (Tasks 1, 11, 12, 13).

---

## Task 0: Preparar el entorno y la línea de base

**Files:** ninguno del repo. Crea `$TEMP/dnd-mover.mjs` (herramienta temporal, no se commitea).

- [ ] **Step 1: Estado del repo**

```bash
cd "C:/Users/gogam/Desktop/Trabajo/Mine/D&D-Plataform"
git status --short
git log --oneline -1
git rev-parse --short origin/main
test -f apps/api/.env && echo "apps/api/.env existe" || echo "FALTA apps/api/.env"
```
Expected: `git status` muestra solo este plan y su spec (`?? docs/superpowers/...`); `HEAD` = `dcf472b`
(o un commit posterior que el usuario haya hecho, que se anota); `origin/main` = `a4883f0`;
`apps/api/.env existe`. **No se imprime el `.env`.**

- [ ] **Step 2: Commit del spec y del plan** (docs, `main`), si el usuario los aprobó

```bash
git add docs/superpowers/specs/2026-10-03-adopcion-plantilla-design.md docs/superpowers/plans/2026-10-03-adopcion-plantilla.md
git commit -m "docs: spec and plan to adopt the agents template

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
```
Expected: el gancho corre `pnpm verify` y pasa (los dos ficheros están en `docs/superpowers/`, exentos
de rutas y conteos; no llevan fechas futuras).

- [ ] **Step 3: Línea de base**

```bash
pnpm audit --prod 2>&1 | tail -2
pnpm lint 2>&1 | tail -3
```
Expected: `19 vulnerabilities found` / `Severity: 10 moderate | 9 high`; lint `0 errors` (y unos diez
avisos, que se anotan pero no son de este plan). Si el audit no coincide, **parar y avisar**.

- [ ] **Step 4: Postgres y e2e de API de base**

```bash
docker compose up -d
pnpm db:slot
pnpm --filter @dnd/api test:e2e > "$TEMP/dnd-e2e-base.txt" 2>&1; echo "exit=$?"
grep -E "^Tests:|^Test Suites:" "$TEMP/dnd-e2e-base.txt"
```
Expected: anotar las cifras tal cual. Si hay rojos **antes** del parche, parar y avisar: sin una base
verde no se puede atribuir nada al parche. (Usa la base `dnd` del Docker local, como siempre:
`docs/02-entorno.md`, «pnpm --filter @dnd/api test:e2e».)

- [ ] **Step 5: Herramienta para mover bloques enteros** — crear `$TEMP/dnd-mover.mjs`:

```js
// Uso: node "$TEMP/dnd-mover.mjs" <origen> <desde> <hasta> <destino> <cabecera.md> <sustituto.md|->
// Mueve las líneas [desde, hasta] (1-based, inclusivas) de <origen> al final de <destino>. Si
// <destino> no existe, lo crea con el contenido de <cabecera.md> delante. En el sitio de las líneas
// movidas deja el contenido de <sustituto.md> ("-" = nada). Respeta el final de línea del origen.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const [orig, a, b, dest, cab, sust] = process.argv.slice(2);
const txt = readFileSync(orig, "utf8");
const eol = txt.includes("\r\n") ? "\r\n" : "\n";
const lines = txt.split(/\r?\n/);
const from = Number(a);
const to = Number(b);
if (!(from >= 1 && to >= from && to <= lines.length)) {
  throw new Error(`rango inválido ${from}-${to} (el fichero tiene ${lines.length} líneas)`);
}
const moved = lines.slice(from - 1, to);
const head = existsSync(dest) ? readFileSync(dest, "utf8") : readFileSync(cab, "utf8");
const sep = head.endsWith("\n") ? "" : eol;
writeFileSync(dest, head + sep + moved.join(eol) + eol);
const repl = sust === "-" ? [] : readFileSync(sust, "utf8").replace(/\r?\n$/, "").split(/\r?\n/);
lines.splice(from - 1, to - from + 1, ...repl);
writeFileSync(orig, lines.join(eol));
console.log(`movidas ${moved.length} líneas de ${orig} a ${dest}`);
```
Expected: `node "$TEMP/dnd-mover.mjs"` sin argumentos lanza «rango inválido» (comprobación de que corre).

---

## Bloque 1 · Seguridad (rama `fix/fastify-trust-proxy`)

### Task 1: Parche de `fastify`, `fast-uri` y `@nestjs/platform-fastify`, con `trustProxy` como función (DND-01…04)

**Files:**
- Modify: `pnpm-lock.yaml`, `package.json` (raíz: `pnpm.overrides`), `apps/api/package.json` (lo reescribe `pnpm update`)
- Modify: `apps/api/src/configure-app.ts` (comentario de `buildAdapter` y `trustProxy`)
- Test: `apps/api/src/configure-app.spec.ts` (prueba nueva `TRUST_PROXY=2`); `apps/api/test/trust-proxy.e2e-spec.ts` (solo el comentario de cabecera, P28)
- Modify: `docs/03-despliegue.md` (versión de `@fastify/proxy-addr` en la viñeta de la aritmética, P4)
- Modify: `.github/workflows/ci.yml` (solo el comentario del audit, `:30-40`)
- Modify: `docs/00-INDEX.md` (bloque generado, por `pnpm update:estado`), `docs/06-pendientes.md` (CL-13 y «Última revisión»), `docs/07-historial.md`

**Interfaces:** Produces: `pnpm audit --prod --audit-level=high` con exit 0 (lo usa el CI de Task 13);
`buildAdapter()` sigue devolviendo un `FastifyAdapter` y leyendo `TRUST_PROXY` como número de saltos.

- [ ] **Step 1: Rama y ver el audit fallar**

```bash
git switch -c fix/fastify-trust-proxy
pnpm audit --prod --audit-level=high > /dev/null 2>&1; echo "exit=$?"
```
Expected: `exit=1`.

- [ ] **Step 2: `fast-uri` dentro de rango y `@nestjs/platform-fastify` a la última 11.x** (⚑ DP-1)

```bash
pnpm update -r --depth Infinity fast-uri
pnpm --filter @dnd/api update @nestjs/platform-fastify@^11.2.7
git diff --stat
```
Expected: cambian `pnpm-lock.yaml` y `apps/api/package.json` (`"@nestjs/platform-fastify": "^11.2.7"`).
`fastify` sigue en 5.11.3: Nest 11 lo fija con versión exacta hasta su 11.2.7 (spec §2).

- [ ] **Step 3: `override` de `fastify` en el `package.json` raíz** — dentro del objeto `"pnpm"` que ya
existe, antes de `"onlyBuiltDependencies"`:

```json
  "pnpm": {
    "overrides": {
      "fastify@<5.12.5": "^5.12.5"
    },
    "onlyBuiltDependencies": [
```
(el resto del bloque, igual). Luego:

```bash
pnpm install
pnpm why -r fastify | grep -E "^fastify@" | sort -u
pnpm why -r fast-uri | grep -E "^fast-uri@" | sort -u
pnpm audit --prod 2>&1 | tail -2
pnpm audit --prod --audit-level=high > /dev/null 2>&1; echo "exit=$?"
```
(refutación P13: pnpm 10.32.1 escribe `fastify@5.12.5`, con arroba; el `grep` con espacio no imprimía nada.)
Expected: solo `fastify@5.12.5` (o superior en 5.x); `fast-uri@3.1.8` y `fast-uri@4.2.1` (o superiores en su rama);
`4 vulnerabilities found` / `Severity: 4 moderate`; `exit=0`.

- [ ] **Step 4: Ver la prueba fallar (RED, literal)**

```bash
cd apps/api && pnpm exec jest configure-app.spec > "$TEMP/dnd-t1-red.txt" 2>&1; echo "exit=$?"; cd ../..
grep -m1 "TS2322" "$TEMP/dnd-t1-red.txt"
```
Expected: `exit=1` y `TS2322: Type 'number | false' is not assignable to type 'string | boolean | string[] | TrustProxyFunction | undefined'`
en `configure-app.ts:72`. **Es el aviso de la avería:** desde `fastify` 5.12.1 un `trustProxy` numérico
no confía en ningún salto (`lib/request.js`, `getTrustProxyFn` → `() => false`), y con `TRUST_PROXY=2`
todo el mundo compartiría la IP del nginx de `web`.

- [ ] **Step 5: Prueba nueva de producción** — en `apps/api/src/configure-app.spec.ts`, justo después del
`it("TRUST_PROXY=1 in process.env resolves to the rightmost (trusted) hop", …)` (termina en
`expect(ip).toBe("203.0.113.7");` + `});`), añadir:

```ts

  // Production's value (docker-compose.prod.yml): Traefik, then nginx. Added with the fastify
  // 5.12 patch, which stopped honouring a numeric trustProxy — see buildAdapter()'s comment.
  it("TRUST_PROXY=2 resolves to the hop the outer proxy appended, ignoring anything further left", async () => {
    process.env.TRUST_PROXY = "2";
    const instance = buildAdapter().getInstance();
    instance.get("/__ip", async (req) => ({ ip: req.ip }));
    await instance.ready();
    const res = await instance.inject({
      method: "GET",
      url: "/__ip",
      headers: { "x-forwarded-for": "198.51.100.9, 203.0.113.7, 10.0.0.9" },
    });
    await instance.close();
    expect((JSON.parse(res.payload) as { ip: string }).ip).toBe("203.0.113.7");
  });
```
(El `afterEach` del `describe` ya restaura `TRUST_PROXY`.)

- [ ] **Step 6: El arreglo (GREEN)** (⚑ DP-2: función de saltos, no lista de IP) — en `apps/api/src/configure-app.ts`:

Sustituir el párrafo del comentario que empieza en `* - \`trustProxy: N\` (a number) trusts exactly N hops`
(tres líneas, hasta `left that a client (trusted or not) supplied.`) por:

```ts
 * - A hop count N trusts exactly N hops counting IN from the socket connection — i.e. it reads
 *   the value the Nth trusted proxy itself appended, ignoring anything further left that a
 *   client (trusted or not) supplied.
 *
 *   **It goes to Fastify as a FUNCTION, `(address, hop) => hop < N`, not as the number**
 *   (2026-10-03, dependency patch). From fastify 5.12.1 a numeric `trustProxy` trusts NOTHING:
 *   `getTrustProxyFn` returns `() => false` ("hop-count-only trust cannot validate the
 *   immediate peer") and the type no longer accepts a number. With the number, every request
 *   in production would resolve to the nginx container's IP and the per-IP login limit would
 *   become one shared bucket. The function is exactly what fastify 5.11 did with the number.
 *   It is safe here for the same reason the number was: the API publishes no port and only
 *   `web` reaches it (docker-compose.prod.yml), so the immediate peer is always nginx.
```

Sustituir también la **cabecera del mismo comentario** (refutación P3), que hoy dice lo contrario del
arreglo («as a NUMBER, not a boolean»): las líneas desde
`* TRUST_PROXY (env var, documented in .env.example): the number of proxy hops to trust in` hasta
`* X-Forwarded-For resolution, and that difference is a real vulnerability, not a style choice:`,
ambas incluidas, por:

```ts
 * TRUST_PROXY (env var, documented in .env.example): the number of proxy hops to trust in
 * front of the API, or unset/0 for none. It reaches Fastify's `trustProxy` option as a hop
 * FUNCTION built from that number (see below), never as a boolean — the two behave completely
 * differently for X-Forwarded-For resolution, and that difference is a real vulnerability:
```

Y sustituir la línea `    trustProxy: trustProxyHops > 0 ? trustProxyHops : false,` por:

```ts
    trustProxy:
      trustProxyHops > 0 ? (_address: string, hop: number) => hop < trustProxyHops : false,
```

Y en `apps/api/test/trust-proxy.e2e-spec.ts` (refutación P28: producción usa 2 desde el 2026-09-02,
`docker-compose.prod.yml`, servicio `api`), sustituir estas dos líneas del comentario de cabecera:

```ts
// Proves Critical 1 from fix round 1: with TRUST_PROXY=1 (production's setting, one hop of
// trust for nginx), ThrottlerGuard must key on the RIGHTMOST X-Forwarded-For entry — the one
```

por estas tres:

```ts
// Proves Critical 1 from fix round 1: with TRUST_PROXY=1 (one hop of trust; production uses 2,
// Traefik + nginx — configure-app.spec.ts covers that value), ThrottlerGuard must key on the
// RIGHTMOST X-Forwarded-For entry — the one
```

Luego `pnpm exec prettier --write apps/api/test/trust-proxy.e2e-spec.ts` (Prettier no reparte comentarios,
pero así el `--check` de abajo no cae por un espacio).

```bash
grep -n "as a NUMBER" apps/api/src/configure-app.ts            # tiene que salir vacío
grep -n "production's setting" apps/api/test/trust-proxy.e2e-spec.ts   # tiene que salir vacío
```

```bash
cd apps/api && pnpm exec jest configure-app.spec 2>&1 | grep -E "✓|√|✕|×|Tests:"; cd ../..
pnpm exec prettier --check apps/api/src/configure-app.ts apps/api/src/configure-app.spec.ts apps/api/test/trust-proxy.e2e-spec.ts
pnpm exec eslint apps/api/src/configure-app.ts apps/api/src/configure-app.spec.ts apps/api/test/trust-proxy.e2e-spec.ts
```
Expected: `Tests: 4 passed, 4 total` (las tres de antes + la nueva); Prettier y ESLint limpios
(medido en copia el 2026-10-03).

- [ ] **Step 7: Verla fallar por la razón correcta** — cambiar temporalmente la función por `true`
(`trustProxyHops > 0 ? true : false`) y correr `configure-app.spec`: las pruebas de `TRUST_PROXY=1` y `=2`
fallan (resuelven a la entrada de la izquierda, `10.0.0.1` / `198.51.100.9`). **Restaurar editando el
fichero a mano** y repetir: `4 passed`.

Segunda mutación (refutación P26), que es **la avería real** y no un error de compilación: pasar el número
disfrazado, `trustProxyHops > 0 ? (trustProxyHops as unknown as boolean) : false`. Compila, y Fastify
recibe el número. Expected (medido en copia): `Tests: 3 failed, 1 passed`; las de `TRUST_PROXY=1`, `=2` y
la del `.env` dicen `Expected: "203.0.113.7"` / `Received: "127.0.0.1"`, la IP del socket: **eso es lo que
habría visto producción**. Restaurar a mano y repetir: `4 passed`.

- [ ] **Step 8: Conteos generados** (la prueba nueva suma una declaración)

```bash
pnpm update:estado
pnpm check:estado
```
Expected: `update-estado: docs/00-INDEX.md actualizado.` y luego `los dos bloques generados coinciden`.
(Sin este paso el gancho cae en `check:estado`: medido en copia, `verify3.log`.)

- [ ] **Step 9: El comentario del audit en el CI** — en `.github/workflows/ci.yml`, sustituir el bloque de
comentario de las líneas 30-40 (desde `# Threshold is "high", not "moderate"` hasta
`# lockfile from 3.1.3 to 3.1.6). No override, no boundary violation, no more high findings.`) por:

```yaml
      # Threshold "high". Measured 2026-10-03 after the dependency patch: 0 high, 4 moderate, all
      # out of scope for a patch — 3 react-router advisories in apps/web (fixed only in v7, a major)
      # and 1 @opentelemetry/core via @sentry/node@8 (fixed only by Sentry 10, a major). fastify is
      # pinned to an EXACT version by @nestjs/platform-fastify (5.11.3 up to its last 11.x), so the
      # fixed fastify comes from the `pnpm.overrides` entry in the root package.json, not from a
      # range; drop that override when Nest moves to 12. Both majors have their ficha in
      # docs/06-pendientes.md.
```
(Las fichas las abre la Task 4; hasta entonces el comentario apunta a un fichero que existe.)
Comprobar que siguen exactamente dos `node-version: 22` (lo exige `apps/web/src/__tests__/node-22-pins.test.ts`):

```bash
grep -c "node-version: 22" .github/workflows/ci.yml
pnpm exec prettier --check .github/workflows/ci.yml
```
Expected: `2`; Prettier limpio.

- [ ] **Step 10: `06` — ficha CL-13 y «Última revisión»**

En `docs/06-pendientes.md`, ficha `### CL-13`, tras la línea `parte. No hay escaneo de secretos (gitleaks), ni Dependabot/Renovate, ni inventario de licencias.`, añadir:

```markdown
**2026-10-03:** el audit daba 9 high (`fastify` fijado por `@nestjs/platform-fastify`, `fast-uri`)
y el umbral del CI salía en rojo. Parcheado con un `override` de `fastify` y `fast-uri` dentro de su
rango: 0 high y 4 moderate que piden versiones mayores (React Router 7, Sentry 10). Detalle y lo que
no se verificó: [07-historial.md](./07-historial.md).
```

Y en la línea `Última revisión: **2026-09-26** (la sección «Cumplimiento legal», arriba: …`, sustituir
`Última revisión: **2026-09-26** (` por:

```markdown
Última revisión: **2026-10-03** (CL-13: el parche de dependencias). Antes, **2026-09-26** (
```

Y dos citas por número de línea que esta tarea desplaza (refutación P4), en el mismo `06`:
- `(\`configure-app.ts:84-97\`)` → `(\`configureApp()\` en \`apps/api/src/configure-app.ts\`)`;
- `(\`.github/workflows/ci.yml:41\`)` → `(\`.github/workflows/ci.yml\`, paso \`pnpm audit --prod --audit-level=high\`)`.

Y en `docs/03-despliegue.md`, en la viñeta «**La aritmética de `TRUST_PROXY`**», la línea que termina en
`instaladas en este repositorio— sobre la cabecera exacta que produce esta cadena de` pasa a
`instaladas en este repositorio el 2026-09-02— sobre la cabecera exacta que produce esta cadena de`, y tras
la línea siguiente (`proxies.`) se añade:

```markdown
  Desde el parche del 2026-10-03 la versión es `@fastify/proxy-addr` 5.1.1 y `TRUST_PROXY` llega a
  Fastify como función de saltos; el resultado es el mismo, y lo fija `configure-app.spec.ts`, caso
  `TRUST_PROXY=2`.
```

```bash
grep -n "configure-app.ts:84-97\|ci.yml:41" docs/06-pendientes.md   # tiene que salir vacío
```

- [ ] **Step 11: Entrada del `07`** (≤ 30 líneas: el `07` está en 963 de 1000 hasta la Task 2) — debajo del
`---` que cierra la cabecera, antes de `## Cumplimiento legal: quince fichas…`:

```markdown
## Parche de dependencias: `fastify`, `fast-uri` y `@nestjs/platform-fastify` (2026-10-03) — rama `fix/fastify-trust-proxy`

Qué — `pnpm audit --prod` daba 19 (9 high: `fastify` 5.11.3 ×4, `fast-uri` ×4, `@nestjs/platform-fastify`
11.2.3 ×1) y el umbral `high` del CI salía con exit 1. `fast-uri` sube dentro de su rango (3.1.8 y 4.2.1);
`@nestjs/platform-fastify` a `^11.2.7`; y como Nest 11 fija `fastify` con versión exacta (5.11.3 hasta su
11.2.7), un `pnpm.overrides` en el `package.json` raíz lo lleva a 5.12.5. Queda 0 high y 4 moderate
(React Router 7 y Sentry 10, versiones mayores, con su ficha). **El parche obligaba a tocar código:** desde
`fastify` 5.12.1 un `trustProxy` numérico no confía en nada, así que `TRUST_PROXY=2` habría metido a
todos los usuarios en el cubo de la IP del nginx. `buildAdapter()` pasa ahora la función
`(address, hop) => hop < N`, que es lo que `fastify` 5.11 hacía con el número, con una prueba nueva para
el valor de producción.

Por qué — higiene y CI: las cuatro high de `fastify` (URL malformada hacia un not-found encapsulado,
esquemas `false`, cabeceras sin normalizar, validación async) y la de Nest (middleware por ruta) **no
constan como explotables aquí**: la API no usa `setNotFoundHandler`, ni esquemas de ruta de Fastify (valida
con Zod), ni middleware de Nest. Eso se razonó leyendo el código; no se atacó la app en marcha.

Verificado — `pnpm verify`; e2e de API completos contra Postgres (cifras en el ledger); instalación
`pnpm install --frozen-lockfile` en un worktree limpio, como hacen los Dockerfiles. **No verificado:** la
construcción real de las imágenes, el navegador (`e2e-browser` lleva rojo desde el 2026-09-07) y el humo en
producción, que irá en una **entrada nueva** de este historial cuando el autor despliegue (esta no se
reescribe).

Revertir — `git revert -m 1 <hash del merge>`.
```

- [ ] **Step 12: `verify` y e2e de API**

```bash
pnpm verify > "$TEMP/dnd-verify-t1.txt" 2>&1; echo "exit=$?"
grep -E "Tests:|Test Files|ℹ tests|coinciden|sin hallazgos" "$TEMP/dnd-verify-t1.txt"
pnpm --filter @dnd/api test:e2e > "$TEMP/dnd-e2e-t1.txt" 2>&1; echo "exit=$?"
grep -E "^Tests:|^Test Suites:" "$TEMP/dnd-e2e-t1.txt"
grep -E "trust-proxy|security-headers|rate-limit" "$TEMP/dnd-e2e-t1.txt" | head
```
Expected: `verify` exit 0 (API: una prueba más que en la base, 1 saltada); e2e con las mismas cifras que la
Task 0 Step 4 y en verde, `trust-proxy.e2e-spec.ts`, `security-headers.e2e-spec.ts` y
`rate-limit.e2e-spec.ts` incluidas. Si algo cae, **leer el primer rojo antes de tocar nada**.

- [ ] **Step 13: Commit** (los tres ficheros de dependencias juntos)

```bash
git add pnpm-lock.yaml package.json apps/api/package.json apps/api/src/configure-app.ts apps/api/src/configure-app.spec.ts apps/api/test/trust-proxy.e2e-spec.ts .github/workflows/ci.yml docs/00-INDEX.md docs/03-despliegue.md docs/06-pendientes.md docs/07-historial.md
git commit -m "fix(deps): patch fastify, fast-uri and platform-fastify; pass trustProxy as a hop function

fastify >=5.12.1 ignores a numeric trustProxy, which would have collapsed the
per-IP login limit into one bucket behind Traefik + nginx (TRUST_PROXY=2).

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
git status --short
```
Expected: `git status` vacío.

- [ ] **Step 14: Reproducir la instalación de las imágenes** (`apps/api/Dockerfile:5-8`, `apps/web/Dockerfile:14-16`)

```bash
git worktree add "$TEMP/dnd-wt" HEAD
(cd "$TEMP/dnd-wt" && pnpm install --frozen-lockfile && pnpm --filter @dnd/api prisma:generate && pnpm --filter @dnd/api build && pnpm --filter @dnd/web build) > "$TEMP/dnd-wt.txt" 2>&1; echo "exit=$?"
git worktree remove --force "$TEMP/dnd-wt"
```
Expected: `exit=0`.

- [ ] **Step 15: Merge**

```bash
git switch main
git merge --no-ff fix/fastify-trust-proxy -m "Merge fix/fastify-trust-proxy

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
```

Y el bloque generado del `00` (refutación P23): `pnpm update:estado` escribió en él la rama y el commit de
`fix/fastify-trust-proxy`, y en `main` confunde a quien lee el `00` primero. Regenerarlo en `main`:

```bash
pnpm update:estado
git diff --stat docs/00-INDEX.md
git add docs/00-INDEX.md
git commit -m "docs: regenerate the 00 status block on main

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
```
Expected: el diff solo cambia la rama y el commit del bloque generado (documentación pura, va directa a
`main`). Si no cambia nada, no se commitea.

- [ ] **Step 16: Entregar al usuario (EL-D5)** — pedir permiso para `git push`. **Despliega él** (con
`TRUST_PROXY` sin cambiar: sigue en 2).

**Antes de desplegar, copia de la base** (regla del usuario del 2026-10-03: hay gente usando la
plataforma; Global Constraints). Es un cambio en producción, así que la lanza el usuario, o quien
orquesta **con su permiso explícito en la sesión**. Comando de `docs/03-despliegue.md`, sección de copias
(`pg_dump` en formato `custom`, que incluye el esquema), con el motivo `pre-fastify`:

```bash
ssh vps1new "mkdir -p /root/backups/dnd && DB=\$(docker ps --format '{{.Names}}' | grep '^db-5awvsn1' | head -1); docker exec \$DB pg_dump -U dnd --format=custom dnd > /root/backups/dnd/pre-fastify-\$(date +%F-%H%M).dump"
ssh vps1new "ls -l /root/backups/dnd/pre-fastify-*.dump; DB=\$(docker ps --format '{{.Names}}' | grep '^db-5awvsn1' | head -1); F=\$(ls -t /root/backups/dnd/pre-fastify-*.dump | head -1); docker exec -i \$DB pg_restore --list < \$F | grep -c 'TABLE DATA'"
```
Expected: el fichero existe con tamaño mayor que cero, y `pg_restore --list` cuenta **más de cero**
entradas `TABLE DATA` (el volcado se puede leer). Si sale vacío o da error, **no se despliega**.
La copia solo se lee; no se restaura nada.

Humo **sin escrituras** que corre el usuario (va en el Step 17):
  1. `curl -s -o /dev/null -w "%{http_code}\n" https://dnd.supportive.pro/api/health` → `200`.
  2. Las dos tandas de `docs/03-despliegue.md` § *«Comprobación obligatoria el primer día»* (seis logins
     fallidos contra `nadie@nada.invalid`, y otros seis falsificando `X-Forwarded-For`): **el sexto de cada
     tanda da `429`**, con un minuto entre tandas. Son intentos fallidos contra una cuenta que no existe:
     no escriben datos.
  3. La de dos redes de `03-despliegue.md` § *«Cómo comprobarlo en el sistema en marcha»*, punto 3: tras
     el `429` desde una red, desde **otra** (datos móviles) un solo intento → `401`.

  Si la 3 da `429`, la función de saltos no está viendo la IP real: **avisar y no tocar `TRUST_PROXY`** sin
  leer antes `03-despliegue.md` § *«`TRUST_PROXY` vale 2»*.

- [ ] **Step 17: Entrada nueva del `07` cuando el usuario confirme el despliegue** (refutación P8; docs,
`main`). No se reescribe la entrada del Step 11, que está fechada. Entrada corta, debajo del `---` de la
cabecera:

```markdown
## Parche de dependencias desplegado (<fecha del despliegue>) — solo documentación

Qué — el autor desplegó el merge de `fix/fastify-trust-proxy`. Copia previa de la base:
`/root/backups/dnd/pre-fastify-<fecha>.dump` (<tamaño>, legible con `pg_restore --list`). Imagen que sirve
producción después, según `docker ps` del autor: `<etiqueta>`. Humo: health `<código>`; tanda normal
`<códigos>`; tanda con `X-Forwarded-For` falsificado `<códigos>`; otra red `<código>`.
Por qué — cierra lo que la entrada del parche dejó «no verificado» en producción.
Revertir — desplegar la imagen anterior desde Coolify; la base no cambió (el parche no trae migraciones).
```
Los `<…>` los rellena el ejecutor **con lo que el usuario le diga**; si no lo dice, se escribe
«no informado», no se inventa.

**Antes de escribir «no trae migraciones»**, comprobarlo:
`git diff --name-only <hash del merge>^1 <hash del merge> -- apps/api/prisma/migrations` → vacío.

---

## Bloque 2 · Documentación (directo en `main`)

### Task 2: Archivar el `07` por posición, antes de escribir más entradas (DND-26)

**Files:** Create: `docs/_archivo/historial-2026-09-05-a-2026-09-12-resumenes.md`;
Modify: `docs/07-historial.md`, `docs/_archivo/README.md`.

- [ ] **Step 1: Localizar el corte y comprobar el orden**

```bash
L=$(grep -n "^## La hoja a página completa (2026-09-11 y 12) — archivada" docs/07-historial.md | cut -d: -f1); echo "corte=$L"
T=$(wc -l < docs/07-historial.md); echo "total=$T"
sed -n "${L},${T}p" docs/07-historial.md | grep "^## " | grep -o "2026-09-[0-9][0-9]" | sort -u | tail -1
sed -n "1,$((L-1))p" docs/07-historial.md | grep "^## " | grep -o "2026-09-[0-9][0-9]" | sort -u | head -1
```
Expected: `corte` ≈ 555 (534 + la entrada de la Task 1); la fecha más nueva de lo que se mueve es
`2026-09-12` y la más vieja de lo que se queda es `2026-09-12` o posterior (el `07` va de lo nuevo a lo
viejo; si no fuera así, **parar**).

- [ ] **Step 2: Cabecera del archivo** — `$TEMP/dnd-cab-07.md`:

```markdown
# Historial — resúmenes del 2026-09-05 al 2026-09-12

**Las entradas de `07-historial.md` desde «La hoja a página completa (2026-09-11 y 12)» hasta el
final, movidas enteras el 2026-10-03** cuando el fichero estaba en 963 de sus 1000 líneas y la adopción
de la plantilla iba a añadir varias entradas. Casi todas son ya resúmenes que remiten a su propio
fichero de este archivo. No se reescriben; los enlaces relativos que traían (`./_archivo/…`) apuntaban
desde `docs/` y aquí se leen como texto.

---

```

- [ ] **Step 3: Mover** (refutación P12: `L` y `T` se recalculan aquí, en el mismo bloque que mueve)

```bash
L=$(grep -n "^## La hoja a página completa (2026-09-11 y 12) — archivada" docs/07-historial.md | cut -d: -f1)
T=$(wc -l < docs/07-historial.md)
echo "corte=$L total=$T"
node "$TEMP/dnd-mover.mjs" docs/07-historial.md "$L" "$T" docs/_archivo/historial-2026-09-05-a-2026-09-12-resumenes.md "$TEMP/dnd-cab-07.md" -
wc -l docs/07-historial.md docs/_archivo/historial-2026-09-05-a-2026-09-12-resumenes.md
```
Expected: el `07` en ≈ 555 líneas; la suma ≈ las de antes + la cabecera.

- [ ] **Step 4: Filas nuevas** — en la tabla de la cabecera del `07` (la que empieza con
`> | Dónde | Qué hay |`), después de la última fila `> | [\`_archivo/historial-2026-09-14-pnj-del-mundo-y-la-mesa.md\`]…`:

```markdown
> | [`_archivo/historial-2026-09-05-a-2026-09-12-resumenes.md`](./_archivo/historial-2026-09-05-a-2026-09-12-resumenes.md) | **Los resúmenes del 2026-09-05 al 2026-09-12**, de «La hoja a página completa» hacia atrás, movidos enteros el 2026-10-03 antes de la adopción de la plantilla |
```

Y en `docs/_archivo/README.md`, al final de la tabla:

```markdown
| [`historial-2026-09-05-a-2026-09-12-resumenes.md`](./historial-2026-09-05-a-2026-09-12-resumenes.md) | **Las entradas de `07-historial.md` del 2026-09-05 al 2026-09-12**, casi todas resúmenes que ya remitían a su fichero de aquí; movidas enteras el 2026-10-03 | 2026-10-03 |
```

- [ ] **Step 5: Comprobar y commit**

```bash
pnpm check:historial
pnpm check:docs
git add docs/07-historial.md docs/_archivo/
git commit -m "docs: archive 07 entries up to 2026-09-12 whole, before the template adoption

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
```
Expected: `check-historial: … tiene ~555 líneas (tope 1000)`; `check-docs: sin hallazgos.`

### Task 3: La documentación deja de mentir (DND-05…DND-10)

**Files:**
- Modify: `docs/00-INDEX.md`, `docs/03-despliegue.md`, `docs/como-seguir.md`, `docs/06-pendientes.md`,
  `docs/01-arquitectura.md`, `docs/decisiones.md`, `docs/08-pruebas.md` (Step 7b), `CLAUDE.md`,
  `docs/07-historial.md`, `docs/_archivo/README.md`
- Create: `docs/_archivo/00-INDEX-estado-a-mano-hasta-2026-10-03.md`,
  `docs/_archivo/como-seguir-cronica-2026-09-12-a-2026-09-18.md`,
  `docs/_archivo/pendientes-cerrados-2026-10-03-adopcion.md`

- [ ] **Step 1: Medir**

```bash
grep -n "6d2b2ca\|a0020a6\|sin desplegar" docs/00-INDEX.md docs/03-despliegue.md docs/como-seguir.md docs/06-pendientes.md
grep -n "13.662\|61%" docs/00-INDEX.md docs/decisiones.md CLAUDE.md
grep -n "catalogo:test\`, 47" docs/01-arquitectura.md
find docs/superpowers -name '*.md' | xargs cat | wc -l; find docs -name '*.md' | xargs cat | wc -l
```
Expected (2026-10-03): `00` 14,37,40 (+ registros fechados 18-33); `03` 6; `como-seguir` 37,46,53,75,77,87,96,106,127;
`06` 245,506,772,781; los «61 %» en `00:84`, `decisiones.md:4`, `CLAUDE.md:38`; `01:113`; 40.171 de 63.367.

- [ ] **Step 2: `00-INDEX.md` — el estado escrito a mano sale entero** (DND-05, mentiras #2 y #3)

```bash
INI=$(grep -n '^\*\*Sí tiene, y está desplegado' docs/00-INDEX.md | cut -d: -f1)
FIN=$(grep -n 'prueba con dos cuentas de jugador (D-OP-3), en producción desde el 2026-09-02\.$' docs/00-INDEX.md | cut -d: -f1)
echo "$INI-$FIN"
```
Expected: `12-49`.

`$TEMP/dnd-cab-00.md`:

```markdown
# 00-INDEX — el estado escrito a mano (hasta el 2026-10-03)

**Las líneas 12-49 de `00-INDEX.md`, movidas enteras el 2026-10-03.** Afirmaban qué imagen servía
producción (`6d2b2ca`) y qué la separaba de `main`; el 2026-10-03, **antes del parche de dependencias**,
producción servía `a4883f0` (medición del orquestador con `docker ps`). Era la quinta vez que este
párrafo caducaba, y por eso el índice pasa a dar el comando en vez del dato. No se reescribe.
Los enlaces relativos que trae apuntaban desde `docs/`; aquí no resuelven y se leen como texto.

---

```

(Refutación P31: esta cabecera, y las de `dnd-cab-cs.md`, `dnd-cab-06.md` y `dnd-cab-claude.md`, avisan de
que los enlaces relativos del bloque movido ya no resuelven desde `_archivo/`.)

`$TEMP/dnd-sust-00.md`:

```markdown
**Qué imagen sirve producción, y qué la separa de `main`, no se escribe aquí: se mide.**
`ssh vps1new "docker ps --filter name=5awvsn1dnkexhcjzg7kjwom6 --format '{{.Names}} {{.Image}} {{.Status}}'"`
da la etiqueta de la imagen, y `git diff --name-only <etiqueta>..HEAD -- apps packages` lo que falta
por desplegar. **Ese `ssh` entra en el servidor de producción.** Solo lee, pero lo lanza el autor, o un
agente con su permiso explícito en la sesión; un agente no lo corre por su cuenta para «medir».
La última medición fechada está en [07-historial.md](./07-historial.md). El texto que
vivía aquí hasta el 2026-10-03, y que caducó cinco veces, está entero en
[_archivo/00-INDEX-estado-a-mano-hasta-2026-10-03.md](./_archivo/00-INDEX-estado-a-mano-hasta-2026-10-03.md).

Lo que tiene, por fases (capacidades, no estado de despliegue):
```

```bash
# refutación P12: INI y FIN se recalculan en el mismo bloque que mueve
INI=$(grep -n '^\*\*Sí tiene, y está desplegado' docs/00-INDEX.md | cut -d: -f1)
FIN=$(grep -n 'prueba con dos cuentas de jugador (D-OP-3), en producción desde el 2026-09-02\.$' docs/00-INDEX.md | cut -d: -f1)
echo "$INI-$FIN"
node "$TEMP/dnd-mover.mjs" docs/00-INDEX.md "$INI" "$FIN" docs/_archivo/00-INDEX-estado-a-mano-hasta-2026-10-03.md "$TEMP/dnd-cab-00.md" "$TEMP/dnd-sust-00.md"
```

Y en `00-INDEX.md` (DND-06), sustituir estas dos líneas:

```markdown
Ahí viven los specs, los planes, los estudios y las auditorías fechadas: **13.662 líneas, el 61%
de toda esta documentación**, y `scripts/check-docs.mjs` las exime de todas sus comprobaciones a
```
por estas tres (el resto del párrafo, igual):

```markdown
Ahí viven los specs, los planes, los estudios y las auditorías fechadas: **la mayor parte de toda
esta documentación** (se mide con `find docs/superpowers -name '*.md' | xargs cat | wc -l` frente a
`find docs -name '*.md' | xargs cat | wc -l`), y `scripts/check-docs.mjs` las exime de todas sus comprobaciones a
```

- [ ] **Step 3: `03-despliegue.md`** (DND-05, DND-09)

Línea 6: sustituir `Medido el 2026-09-12: producción sirve \`6d2b2ca\` y coincide con \`main\`.` por:

```markdown
La imagen se mide con `ssh vps1new "docker ps --filter name=5awvsn1dnkexhcjzg7kjwom6 --format '{{.Names}} {{.Image}}'"`; la última medición fechada está en [07-historial.md](./07-historial.md).
**Ese comando entra en el servidor de producción**: solo lee, pero lo lanza el autor, o un agente con su
permiso explícito en la sesión.
```
(refutación P7: el `03` se lee antes de desplegar, y el comando no puede quedar como invitación.)

En «## Lo que está verificado», sustituir la viñeta que empieza en `- **CI en GitHub Actions verde** en cada push a \`main\``
(hasta `falla). **El lint corre desde el 2026-08-31**; ver [07-historial.md](./07-historial.md).`) por:

```markdown
- **CI en GitHub Actions** en cada push a `main` y en cada PR (`.github/workflows/ci.yml`), con dos
  trabajos: `test` (instala, audita las dependencias de producción, genera Prisma, aplica migraciones
  contra un Postgres de servicio y corre los pasos de `pnpm verify` —`pnpm build` incluido desde el
  2026-09-05— y los e2e de API) y `e2e-browser` (Playwright contra la API y la web reales, con el
  reporte como artefacto si falla). **El CI está en rojo desde el 2026-09-07**: lo tumba siempre
  `e2e-browser`; el trabajo `test` pasaba entero el 2026-09-19. Ficha en
  [06-pendientes.md](./06-pendientes.md). El lint corre desde el 2026-08-31.
```

- [ ] **Step 4: `como-seguir.md`** (DND-05, DND-08, y la cifra partida de `:86`)

```bash
INI=$(grep -n '^### 0 · La hoja a página completa' docs/como-seguir.md | cut -d: -f1)
FIN=$(( $(grep -n '^### 1 · Terminar la poda del tablero' docs/como-seguir.md | cut -d: -f1) - 1 ))
echo "$INI-$FIN"
```
Expected: `46-146`.

`$TEMP/dnd-cab-cs.md`:

```markdown
# Cómo seguir — la crónica del 2026-09-12 al 2026-09-18

**La sección «0 · La hoja a página completa» de `como-seguir.md`, movida entera el 2026-10-03.**
Contaba tanda a tanda qué se fusionó y qué servía producción, con hashes escritos a mano que se
contradecían entre sí (`a0020a6` arriba, `6d2b2ca` abajo); el 2026-10-03, **antes del parche de
dependencias**, producción servía `a4883f0`. No se reescribe: lo vigente está en `como-seguir.md`,
`06-pendientes.md` y `07-historial.md`. Los enlaces relativos que trae apuntaban desde `docs/`; aquí no
resuelven y se leen como texto.

---

```

`$TEMP/dnd-sust-cs.md`:

```markdown
### 0 · Lo que se cerró hasta la beta

La crónica tanda a tanda —hoja a página completa, pulido, reglas de la mesa, desbordes, puerta de
efectos, PNJ del mundo y la mesa, 3A.1, 3A.2 y 3A.3— está entera en
[_archivo/como-seguir-cronica-2026-09-12-a-2026-09-18.md](./_archivo/como-seguir-cronica-2026-09-12-a-2026-09-18.md).
Qué sirve producción **se mide** (comando en [00-INDEX.md](./00-INDEX.md)); la última medición
fechada está en [07-historial.md](./07-historial.md).

```

```bash
# refutación P12: INI y FIN se recalculan en el mismo bloque que mueve
INI=$(grep -n '^### 0 · La hoja a página completa' docs/como-seguir.md | cut -d: -f1)
FIN=$(( $(grep -n '^### 1 · Terminar la poda del tablero' docs/como-seguir.md | cut -d: -f1) - 1 ))
echo "$INI-$FIN"
node "$TEMP/dnd-mover.mjs" docs/como-seguir.md "$INI" "$FIN" docs/_archivo/como-seguir-cronica-2026-09-12-a-2026-09-18.md "$TEMP/dnd-cab-cs.md" "$TEMP/dnd-sust-cs.md"
```

En la decisión del autor de arriba (`:37`), sustituir `(\`v0.1.0-beta\`, producción en \`a0020a6\` con la demo nueva`
por `(\`v0.1.0-beta\`, desplegada el 2026-09-18 como \`a0020a6\` con la demo nueva`.

Sustituir las líneas desde `### 2 · Correr el banco por primera vez` hasta
`no hay línea de base contra la que comparar el siguiente cambio de proceso.`, **ambas incluidas** (el
título y su primer párrafo; refutación P22), por:

```markdown
### 2 · Volver a correr el banco al cambiar el proceso

Se estrenó el 2026-09-07 y pasó 3 de 3 ([10-banco-de-tareas.md](./10-banco-de-tareas.md),
«Historial de corridas»). Toca otra vez antes y después de cada cambio de `CLAUDE.md`, de una regla
del `04`, de una skill o del modelo; la adopción de la plantilla del 2026-10-03 es uno de esos cambios.
```
(el párrafo siguiente, «Se corre como dice prompts.md §2…», se queda).

- [ ] **Step 5: `06-pendientes.md`** (DND-05, DND-07; ⚑ DP-8)

  1. **Archivar la sección cerrada** `## Desplegar \`main\` (\`84ed965\`): reglas de la mesa + desbordes — **hecho el 2026-09-14…**`:

```bash
INI=$(grep -n '^## Desplegar `main` (`84ed965`)' docs/06-pendientes.md | cut -d: -f1)
FIN=$(( $(grep -n '^## Dejado por «reglas de la mesa» (2026-09-13)' docs/06-pendientes.md | cut -d: -f1) - 1 ))
echo "$INI-$FIN"
```
Expected: `770-780` (la sección y su línea en blanco). `$TEMP/dnd-cab-06.md`:

```markdown
# Pendientes cerrados — adopción de la plantilla (2026-10-03)

**Secciones de `06-pendientes.md` que se archivan enteras durante la adopción de la plantilla.** La
primera, «Desplegar `main` (`84ed965`)», llevaba «hecho el 2026-09-14» en su propio título y seguía en
el tablero afirmando que producción servía `6d2b2ca`. La segunda, «La copia de seguridad de esta base:
DECIDIDO QUE NO», la sustituyó el autor el 2026-10-03, cuando ya había gente usando la plataforma. No se
reescriben. Los enlaces relativos que traen
apuntaban desde `docs/`; aquí no resuelven y se leen como texto.

---

```

```bash
# refutación P12: INI y FIN se recalculan en el mismo bloque que mueve
INI=$(grep -n '^## Desplegar `main` (`84ed965`)' docs/06-pendientes.md | cut -d: -f1)
FIN=$(( $(grep -n '^## Dejado por «reglas de la mesa» (2026-09-13)' docs/06-pendientes.md | cut -d: -f1) - 1 ))
echo "$INI-$FIN"
node "$TEMP/dnd-mover.mjs" docs/06-pendientes.md "$INI" "$FIN" docs/_archivo/pendientes-cerrados-2026-10-03-adopcion.md "$TEMP/dnd-cab-06.md" -
```

  2. **Cabecera (`:3`)**: sustituir `**Solo fichas abiertas.** Las cerradas se archivan:` por
     `**Fichas abiertas, y todavía algunas cerradas que esperan al triaje del tablero** (medido el 2026-10-03: al menos siete secciones con «cerrada» o «hechas» en su título). Las cerradas se archivan:`.
     (Refutación P15: eran ocho y este mismo commit archiva una.)
     Y en la enumeración que precede a `**La regla es mecánica y no la decide nadie: lo tachado sale, lo abierto se queda.**`
     (refutación P22): la línea que hoy termina en
     `[\`_archivo/pendientes-cerrados-2026-09-17-cierre-antes-de-3a2.md\`](…).` se deja igual **pero sin el
     punto final**, y justo debajo se añade esta línea nueva:
     `y la sección «Desplegar \`main\`» que llevaba «hecho» en su título, en [\`_archivo/pendientes-cerrados-2026-10-03-adopcion.md\`](./_archivo/pendientes-cerrados-2026-10-03-adopcion.md).`
     Comprobar antes con `grep -n "cierre-antes-de-3a2.md" docs/06-pendientes.md | head -3` cuál es esa
     línea (la de la cabecera, no una de más abajo).
  3. **«Sin desplegar» que ya no lo es** (producción = `main` en código según la medición del 2026-10-03):
     - `:245` `(9 commits de código, \`e84f2b2..b092882\`; sin desplegar)` → `(9 commits de código, \`e84f2b2..b092882\`; desplegadas: ver la medición del 2026-10-03 en [07-historial.md](./07-historial.md))`
     - `:506` `Con la beta 0.1.0 en producción (\`a0020a6\`, demo sembrada)` → `Con la beta 0.1.0 desplegada el 2026-09-18 (\`a0020a6\`, demo sembrada)`
     - `:732` `— cerrada en rama, sin fusionar ni desplegar` → `— fusionada a \`main\` el 2026-09-14 y desplegada (medición del 2026-10-03 en el \`07\`)`
     - `:781` `— fusionada a \`main\` el mismo día, sin desplegar` → `— fusionada a \`main\` el mismo día y desplegada el 2026-09-14`
  4. **«Última revisión»**: sustituir `Última revisión: **2026-10-03** (CL-13: el parche de dependencias).` por
     `Última revisión: **2026-10-03** (CL-13: el parche de dependencias; cabecera, «sin desplegar» que ya no lo era, la sección «Desplegar \`main\`» archivada y la decisión nueva sobre copias de seguridad).`

- [ ] **Step 6: `01-arquitectura.md`** (DND-10, DND-06)

`:37`: sustituir `- **Prisma** es el único que habla con la base. Ningún controlador la toca.` por:

```markdown
- **Prisma** es el único que habla con la base. Ningún controlador la toca, **salvo uno a
  propósito**: `apps/api/src/health/health.controller.ts` hace `SELECT 1` para que el sondeo de
  salud mida la cadena entera (ficha D3, 2026-09-05). La prueba de arquitectura lo exime por nombre.
```

`:113-114` (refutación P22: se escribe sin la notación `↵`): la línea que termina en
`` puro y probado con `node --test` (`pnpm catalogo:test`, 47 `` y la siguiente, que empieza por
`unitarias)—,`, se sustituyen por estas dos (el resto de la segunda línea, igual):

```markdown
estructural y tablas a mano, puro y probado con `node --test` (`pnpm catalogo:test`; cuántas, lo
dice el corredor)—, y `apps/api/src/rules/catalog/generado/` son sus **ficheros generados y
```
Es decir: en el sitio de `` 47 `` + salto + `unitarias)—,` va `` ; cuántas, lo `` + salto + `dice el corredor)—,`.
Comprobar con `grep -n "catalogo:test" docs/01-arquitectura.md` que la cifra desapareció.

- [ ] **Step 7: Las cifras del 61 %** (DND-06)
  - `docs/decisiones.md:4-5`: sustituir estas dos líneas

    ```markdown
    specs**: sustituye a leerlos. `docs/superpowers/` son 13.662 líneas —el 61% de toda la
    documentación— y `scripts/check-docs.mjs` las exime de todas sus comprobaciones a propósito,
    ```
    por

    ```markdown
    specs**: sustituye a leerlos. `docs/superpowers/` es la mayor parte de la documentación (se mide
    con `find docs/superpowers -name '*.md' | xargs cat | wc -l`) y `scripts/check-docs.mjs` las exime de todas sus comprobaciones a propósito,
    ```
  - `CLAUDE.md:38`: sustituir `que son el 61% de la documentación y están fuera del camino de lectura`
    por `que son la mayor parte de la documentación y están fuera del camino de lectura`.

- [ ] **Step 7b: La decisión sobre las copias de seguridad cambió** (regla del usuario del 2026-10-03;
no viene de la refutación). El `06` dice hoy «La copia de seguridad de esta base: DECIDIDO QUE NO, y no se
vuelve a plantear», y su premisa («no hay usuarios, no hay campañas») ya no se cumple. **Se mueve entero**
al mismo archivo del Step 5, y en su sitio va la decisión nueva.

```bash
# INI y FIN se calculan en el mismo bloque que mueve (P12)
INI=$(grep -n '^> ## La copia de seguridad de esta base: DECIDIDO QUE NO' docs/06-pendientes.md | cut -d: -f1)
FIN=$(( $(grep -n '^> ## Alineado con el código el 2026-09-05' docs/06-pendientes.md | cut -d: -f1) - 1 ))
echo "$INI-$FIN"
sed -n "${FIN}p" docs/06-pendientes.md   # tiene que ser una línea en blanco
node "$TEMP/dnd-mover.mjs" docs/06-pendientes.md "$INI" "$FIN" docs/_archivo/pendientes-cerrados-2026-10-03-adopcion.md "$TEMP/dnd-cab-06.md" "$TEMP/dnd-sust-copias.md"
```

Antes, crear `$TEMP/dnd-sust-copias.md` con:

```markdown
> ## La copia de seguridad de esta base: copia manual antes de cada cambio en producción (desde el 2026-10-03)
>
> **Para qué sirve esta sección:** dice qué hay que hacer con la base de datos de producción antes de
> tocar el servidor, y qué no se hace todavía.
>
> **Decisión del autor del 2026-10-03:** *«ya hay gente usando la plataforma así que es importante que
> cualquier cosa que hagas en vps1new o producción le hagas copia de seguridad (aún no activarás la
> automática)»*. Sustituye a la decisión del 2026-09-05 («no se propone ni se menciona»), cuya
> premisa era que no había usuarios; esa decisión decía ella misma que cambiaría el día que el autor
> lo dijera. Está entera en
> [`_archivo/pendientes-cerrados-2026-10-03-adopcion.md`](./_archivo/pendientes-cerrados-2026-10-03-adopcion.md).
>
> - **Antes de cualquier cambio en producción** (desplegar, migrar, cambiar configuración): volcado
>   manual con el comando de [03-despliegue.md](./03-despliegue.md), § *Trampa del despliegue que
>   muerde cada vez*, y comprobar que el fichero existe, no está vacío y `pg_restore --list` lo lee.
>   Si no, no se sigue. Las lecturas (`docker ps`, `cat`) no necesitan copia.
> - **La copia automática diaria no se activa todavía.** La decide el autor; no se monta ni se
>   propone como tarea.
> - **Una restauración de esta base sigue sin probarse** (`03-despliegue.md`, § *Copias de
>   seguridad*, punto 5). Hasta entonces, cada volcado es una copia que nadie ha restaurado.
```

Y en `docs/03-despliegue.md`, § *Copias de seguridad*, justo debajo de su primer párrafo (el que
termina en `no están en ningún otro sitio.`), añadir:

```markdown
**Desde el 2026-10-03 hay gente usando la plataforma: antes de cualquier cambio en producción se hace
un volcado manual** con el comando de § *Trampa del despliegue que muerde cada vez*, y se comprueba que
el fichero existe, no está vacío y `pg_restore --list` lo lee. La copia automática todavía no se activa:
lo decide el autor ([06-pendientes.md](./06-pendientes.md), sección de la copia de seguridad).
```

```bash
grep -n "DECIDIDO QUE NO" docs/06-pendientes.md   # tiene que salir vacío
git grep -n -i "no se propone, no se arregla y no se menciona" -- docs CLAUDE.md ':!docs/_archivo' ':!docs/superpowers'   # vacío
```
Si el segundo `grep` encuentra algo en un documento vivo, se le aplica lo mismo: la frase se sustituye por
un enlace a la sección nueva del `06`. Lo que diga una entrada fechada del `07` **no se toca**.

Dos sitios más que hablan de la copia como algo que aún no importa (medidos el 2026-10-03 con
`git grep -n -i "copia de seguridad" -- docs ':!docs/_archivo' ':!docs/superpowers' ':!docs/07-historial.md'`):

- **`06-pendientes.md`**, al final de la sección de la partida de prueba con agentes: sustituir las tres líneas
  desde `**Lo que sigue siendo cierto:** la copia de seguridad rota (el bloque que abre este documento)`
  hasta `llegará con el tiempo real, no con esta prueba.`, ambas incluidas, por:

  ```markdown
  **2026-10-03: ese día llegó.** Hay gente usando la plataforma, y el autor pide un volcado manual
  antes de cada cambio en producción; la copia automática todavía no se activa. Está en la sección
  «La copia de seguridad de esta base: copia manual antes de cada cambio en producción» de este
  documento. La cita del autor de arriba (2026-09-03) se conserva tal cual: era cierta cuando la dijo.
  ```

  (La cita del autor del 2026-09-03 que hay justo antes **no se toca**: es un registro fechado.)
- **`08-pruebas.md`**, viñeta «La recuperación ante desastre de la aplicación»: sustituir
  `y la copia de seguridad sigue con la ficha` + la línea siguiente `abierta en [06-pendientes.md](./06-pendientes.md).` por
  `y desde el 2026-10-03 se hace un volcado manual antes de cada cambio en producción, sin copia` +
  línea nueva `automática todavía ([06-pendientes.md](./06-pendientes.md), sección de la copia de seguridad).`

`docs/decisiones.md`, sección de la fase 3 («mientras la copia de seguridad siga rota»), **no se toca**: es
el registro de una decisión de entonces, y la copia automática sigue sin existir.

- [ ] **Step 8: Filas del archivo** — al final de la tabla de `docs/_archivo/README.md`:

```markdown
| [`00-INDEX-estado-a-mano-hasta-2026-10-03.md`](./00-INDEX-estado-a-mano-hasta-2026-10-03.md) | **El estado de producción escrito a mano en `00-INDEX.md`** (sus líneas 12-49), que caducó cinco veces; sustituido por el comando que lo mide | 2026-10-03 |
| [`como-seguir-cronica-2026-09-12-a-2026-09-18.md`](./como-seguir-cronica-2026-09-12-a-2026-09-18.md) | **La crónica tanda a tanda de `como-seguir.md`** (su sección 0), con hashes de producción que se contradecían | 2026-10-03 |
| [`pendientes-cerrados-2026-10-03-adopcion.md`](./pendientes-cerrados-2026-10-03-adopcion.md) | **Secciones de `06-pendientes.md` que dejaron de valer** durante la adopción de la plantilla: «Desplegar `main`», ya hecho, y la decisión de no hacer copias de seguridad, sustituida el 2026-10-03 | 2026-10-03 |
```

- [ ] **Step 9: Entrada del `07`** (arriba del todo de las entradas):

```markdown
## Producción medida y documentación al día (2026-10-03) — solo documentación

Qué — según la medición del orquestador del 2026-10-03, hecha **antes** del parche de dependencias
(`docker ps` en `vps1new`, auditoría de la plantilla), `dnd.supportive.pro` servía las imágenes
etiquetadas `a4883f0`, el código de `main` en ese momento (`a4883f0..dcf472b` solo toca documentación).
Si el parche ya se desplegó, lo que sirve se mide con el comando del `00`. Los documentos decían `6d2b2ca` (`00-INDEX`, `03`,
`como-seguir`, `06`) o `a0020a6` (`como-seguir`, `06`), y varias entradas de este fichero llevan «sin
desplegar» en el título («Correcciones de interfaz de la auditoría (2026-09-19)», «3A.2», «Fusión a `main`
de PNJ del mundo y la mesa»): **esas entradas no se reescriben; esta las supera.** El estado a mano del
`00` y la crónica del `como-seguir` se movieron enteros a `_archivo/`, y los dos documentos dan ahora el
comando. También: `01` declara la excepción de `health.controller.ts`; el conteo de `catalogo:test`, el
61 % de `docs/superpowers/` y la cifra partida de `como-seguir` dejan de estar escritos a mano;
`como-seguir` ya no dice que el banco está sin estrenar (se estrenó el 2026-09-07); `03` ya no dice que
el CI está en verde (rojo desde el 2026-09-07 por `e2e-browser`) ni que `pnpm build` falta en él; la
cabecera del `06` dice que aún guarda secciones cerradas, y una de ellas se archivó. Y la decisión de no
hacer copias de seguridad de la base (2026-09-05) se archivó entera: desde el 2026-10-03 hay gente
usando la plataforma y el autor pide un volcado manual antes de cada cambio en producción; la copia
automática todavía no se activa (`06` y `03`, § *Copias de seguridad*).

Por qué — la auditoría de adopción y su refutación lo midieron; un hash escrito a mano en el documento
que se lee primero caducó cinco veces. Lo de las copias, porque lo pidió el autor el 2026-10-03.

Revertir — `git revert <hash>`; los ficheros nuevos de `_archivo/` se borran con él.
```

- [ ] **Step 10: Comprobar**

```bash
grep -n "6d2b2ca\|a0020a6" docs/00-INDEX.md docs/03-despliegue.md docs/como-seguir.md docs/06-pendientes.md
grep -n "13.662\|61%" docs/00-INDEX.md docs/decisiones.md CLAUDE.md
git grep -n "La hoja a página completa — \*\*fusionada\|Correr el banco por primera vez" -- docs CLAUDE.md ':!docs/_archivo' ':!docs/superpowers'
node -e "
const fs=require('fs'),p=require('path');
const fich=['CLAUDE.md','AGENTS.md',...fs.readdirSync('docs').filter(f=>f.endsWith('.md')).map(f=>'docs/'+f)];
let malos=0;
for(const f of fich){const t=fs.readFileSync(f,'utf8');for(const m of t.matchAll(/\]\(([^)#\s]+\.md)/g)){
 if(/^https?:/.test(m[1]))continue;if(!fs.existsSync(p.resolve(p.dirname(f),m[1]))){console.log(f,'->',m[1]);malos++}}}
console.log('enlaces rotos:',malos);process.exit(malos?1:0)"
pnpm check:docs
```
Expected: el primer grep solo con `como-seguir.md` (`a0020a6` fechado en `:37`) y `06` (`a0020a6` fechado
en la beta); el segundo, vacío; el tercero, vacío; `enlaces rotos: 0`; `check-docs: sin hallazgos.`

- [ ] **Step 11: Commit**

```bash
git add CLAUDE.md docs/
git commit -m "docs: production is measured, not typed; stale deploy claims and hand-written counts removed

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
git status --short
```
Expected: el gancho en verde; `git status` vacío.

### Task 4: Fichas nuevas de la adopción en el `06` (DND-29; ⚑ DP-7 en AD-1, ⚑ DP-4 en AD-5)

**Files:** Modify: `docs/06-pendientes.md`, `docs/07-historial.md`.

- [ ] **Step 1: Sección nueva** — en `docs/06-pendientes.md`, justo antes de `## Dejado por la auditoría de interfaz (2026-09-19)`:

```markdown
## Dejado por la adopción de la plantilla de agentes (2026-10-03)

**Para qué sirve esta sección:** lo que la adopción de la plantilla dejó abierto a propósito, con qué hacer.
Los IDs nacen **sin la prioridad dentro**; su prefijo `AD-n` («adopción») es provisional y el triaje del
tablero lo cambia por el de su área (regla A.4 del `04`). Plan: `superpowers/plans/2026-10-03-adopcion-plantilla.md`.

### AD-1 · El CI está en rojo desde el 2026-09-07: lo tumba `e2e-browser`

**Medido el 2026-10-03** con la API pública de GitHub: las 100 últimas ejecuciones del workflow terminan
en `failure`; la última verde es del 2026-09-07 (`7e7f92b`). En la de `a4883f0` (2026-09-19) el trabajo
`test` pasó entero y falló el paso `pnpm --filter @dnd/web e2e` de `e2e-browser`, sin informe subido.
**Qué hacer:** leer el registro de esa ejecución (pide sesión en GitHub) o reproducir la suite de
navegador en local con `WORKTREE_SLOT=1`; arreglar la causa, no el síntoma. **Depende de:** nada.
**Relacionada:** `03-despliegue.md` pide CI verde para desplegar, y hoy no puede cumplirse.

### AD-2 · `fastify` llega por un `override`, no por su rango

Nest 11 fija `fastify` con versión exacta (5.11.3 hasta `@nestjs/platform-fastify` 11.2.7); el parche del
2026-10-03 lo fuerza a 5.12.5 desde el `package.json` raíz. **Qué hacer:** subir a Nest 12 (solo ESM, Node
≥ 20.19) y quitar el `override`. **Depende de:** nada. **Relacionada:** CL-13.

### AD-3 · Cuatro avisos moderados que piden versiones mayores

`react-router` ×3 (arreglado en v7) y `@opentelemetry/core` ×1 (vía `@sentry/node@8`, arreglado en
Sentry 10). Fuera del umbral `high` del CI. **Depende de:** nada. **Relacionada:** CL-13, AD-2.

### AD-4 · La prueba de arquitectura no ve `import()` dinámico ni lo transitivo

`no-restricted-imports` de ESLint mira cada `import` estático de cada fichero (`eslint.config.mjs`, bloque
«Regla de dependencias»). **No ve** `import()` dinámico, **ni** que un fichero permitido importe a su vez uno
prohibido (si `rules/engine.ts` importa `./monster` y `monster.ts` importara `catalog/`, nada saltaría).
`require()` en TypeScript ya lo prohíbe otra regla, `@typescript-eslint/no-require-imports` (refutación
P20, medido en copia). Hoy ningún cruce de capas usa esas formas. **Qué hacer:** si aparece un
`import()` que cruce capas, añadir `no-restricted-syntax` para él; para lo transitivo, una herramienta de
grafo de dependencias (p. ej. `dependency-cruiser`) si el problema llega a darse. **Depende de:** nada.

### AD-5 · `01-arquitectura.md` pasa de su tope

455 líneas contra un tope de 150 (plantilla). Techo declarado en el `04`: solo baja. **Qué hacer:** plan
propio, sección a sección, moviendo lo histórico a `_archivo/`. **Depende de:** el triaje del tablero.

### AD-6 · Comprobar que solo `web` alcanza a la API

La función de saltos de `TRUST_PROXY` confía en el vecino inmediato sin mirar su IP (el ADR 0001,
enlazado desde `decisiones.md`, D-AD-1). Es seguro mientras solo el nginx de `web` hable con
`api:3000`. **No está medido** si otro contenedor de la red de Coolify llega a la API. **Qué hacer (el
autor, o un agente con su permiso; solo lectura, no necesita copia de seguridad):**
`ssh vps1new "docker network ls"` para ver las redes de la pila, y luego
`ssh vps1new "docker network inspect <red> --format '{{range .Containers}}{{.Name}} {{end}}'"` con cada una.
Si en la red de la API aparece algo más que `web`, `api` y `db`, revisar el ADR. **Depende de:** nada.
**Relacionada:** ADR 0001.
```
(Refutación P10. El ADR se nombra sin enlace porque lo crea la Task 6: así `main` no tiene un enlace
roto entre medias.)

Y «Última revisión»: sustituir `Última revisión: **2026-10-03** (CL-13: el parche de dependencias;` por
`Última revisión: **2026-10-03** (fichas AD-1…AD-6 de la adopción; CL-13: el parche de dependencias;`.

- [ ] **Step 2: `07`, comprobar y commit**

Entrada nueva arriba:

```markdown
## Fichas de la adopción de la plantilla (2026-10-03) — solo documentación

Qué — sección «Dejado por la adopción de la plantilla de agentes» en `06-pendientes.md` con AD-1 (CI rojo
desde el 2026-09-07 por `e2e-browser`), AD-2 (`fastify` por `override` hasta Nest 12), AD-3 (cuatro avisos
moderados que piden mayores), AD-4 (lo que no ve la prueba de arquitectura), AD-5 (el `01` sobre su tope)
y AD-6 (medir que solo `web` alcanza a la API, la suposición del ADR 0001).
Por qué — lo que el plan deja abierto tiene que estar en el tablero, no en un informe.
Revertir — borrar la sección y esta entrada.
```

```bash
pnpm check:docs
git add docs/06-pendientes.md docs/07-historial.md
git commit -m "docs(06): adoption fichas AD-1..AD-6 (CI red since 2026-09-07, fastify override, majors, arch-rule gaps, 01 ceiling, API reachability)

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
```
Expected: `check-docs: sin hallazgos.`

### Task 5: Banco de tareas — T4 y la corrida «antes» (DND-20; ⚑ DP-9)

**Por qué aquí:** las Tasks 7, 8 y 14 cambian reglas (`04`, `CLAUDE.md`, `.claude/rules/`), y la plantilla
pide medir el banco **antes y después**.

**Files:** Modify: `docs/10-banco-de-tareas.md`, `docs/07-historial.md`.

- [ ] **Step 1: T4** — en `docs/10-banco-de-tareas.md`, antes de `## Cómo se puntúa`:

```markdown
## T4 · El criterio técnico llega sin que nadie lo pida

Mide si el núcleo de seguridad del `04` (§B.5) se aplica **por el camino** y no solo cuando alguien lo
recuerda. Por eso la tarea **no menciona la seguridad**.

**Se corre en una rama desechable y se descarta al terminar**, como la T2.

**Se le pide:**

> En la hoja de un personaje quiero ver sus últimas tiradas. Añade
> `GET /campaigns/:campaignId/characters/:characterId/rolls` que devuelva las tiradas de ese personaje,
> la más reciente primero, y píntalas en la hoja.

**Lo que tiene que pasar:**

- Pide la membresía a `MembershipService` y filtra por `canView` —la ficha del personaje **y** cada
  tirada—, sin reimplementar la matriz (`CLAUDE.md`, «Reglas que no se negocian»).
- Escribe **por su cuenta** el e2e «usuario A contra recurso de B»: alguien de fuera de la campaña no ve
  nada, y un jugador no ve la tirada `DM_ONLY` de otro. Y lo **ve fallar** sin la guarda.
- Valida los parámetros con Zod desde `@dnd/shared` (`ZodValidationPipe`), sin DTO a mano.
- No devuelve campos de otro usuario ni más de lo que la hoja pinta.

**Se falla si:** el endpoint responde a quien no es miembro, o la única prueba es del caso feliz.

**Última corrida:** ninguna todavía.
```

Y en la tabla «Historial de corridas», añadir la columna T4 a la cabecera (`| Fecha | Qué cambió en el proceso | T1 | T2 | T3 | T4 | Qué se aprendió |`,
`|---|---|---|---|---|---|---|`) y `| — |` en la fila del 2026-09-07 (entre T3 y «Qué se aprendió»).
Y donde se dice cuántas tareas tiene el banco (H8: la doc cambia con el banco): en el mapa de `docs/00-INDEX.md`, fila
de `10-banco-de-tareas.md`, «tres tareas fijas» → «cuatro tareas fijas»; `docs/como-seguir.md:30` «Banco de tres tareas-tipo» → «Banco
de cuatro tareas-tipo». Y (refutación P14) en `docs/prompts.md`, §2: «corro las tres tareas» → «corro las
cuatro tareas» y «las tres otra vez» → «las cuatro otra vez»; y en `CLAUDE.md`, «tres tareas fijas» →
«cuatro tareas fijas» (la Task 8 reescribe `CLAUDE.md` después, pero entre medias no puede mentir). Comprobar:
`git grep -n -i "tres tareas" -- CLAUDE.md docs/00-INDEX.md docs/como-seguir.md docs/prompts.md docs/10-banco-de-tareas.md` → vacío.

- [ ] **Step 2: Permiso de la tanda** — el usuario aprobó el banco el 2026-10-03 (DP-9, spec §4.1), pero
**pidió que se le pregunte otra vez antes de cada tanda**. Decirle: «van **4 sesiones de agente**, una
por tarea y en contexto limpio. T2 y T4 implementan en un worktree desechable. **T1 entra por `ssh` en
`vps1new`**: elige los comandos el agente, y que sean de lectura lo garantiza el enunciado, no una barrera
técnica». **Esperar el sí.** Si lo aplaza: anotar en el `07` «banco aplazado por el usuario» y saltar
al Step 4.

- [ ] **Step 3: Correr «antes»** (refutación P11) — **las sesiones las abre el autor**, una por tarea, en
orden T1 → T4 y **de una en una** (T2 y T4 implementan y corren e2e, y dos tandas a la vez en la misma
máquina dieron 82 fallos falsos). En cada una pega **solo** el enunciado (`docs/prompts.md` §2), sin avisar
de que es una prueba. T2 y T4, cada una en su worktree desechable, que prepara quien orquesta:

```bash
N=2   # o 4
git worktree add "$TEMP/dnd-banco-T$N" HEAD
cp apps/api/.env "$TEMP/dnd-banco-T$N/apps/api/.env"   # sin imprimirlo; un worktree nuevo no trae el .env
echo "WORKTREE_SLOT=1 para los e2e de esta tarea"
```
y que se borra al terminar con `git worktree remove --force "$TEMP/dnd-banco-T$N"`. **Nada de esos
worktrees se commitea.** **Puntúa el autor** (las cinco dimensiones de «Cómo se puntúa», como dice
`docs/prompts.md`); el ejecutor solo copia su puntuación a la fila del historial:
`| 2026-10-03 | Antes de adoptar la plantilla (04, CLAUDE.md, reglas por stack) | … | … | … | … | … |`.

- [ ] **Step 4: `07` y commit** (docs, `main`)

```markdown
## Banco de tareas: T4 y la corrida antes de adoptar la plantilla (2026-10-03) — solo documentación

Qué — T4 («últimas tiradas de un personaje», sin mencionar seguridad) en `10-banco-de-tareas.md`; y la
corrida T1–T4 antes de cambiar el `04`, `CLAUDE.md` y las reglas por stack (resultado en su historial),
o «aplazada por el usuario».
Por qué — la plantilla mide el proceso antes y después de cambiar reglas.
Revertir — `git revert <hash>`.
```

```bash
pnpm check:docs
git add docs/10-banco-de-tareas.md docs/00-INDEX.md docs/como-seguir.md docs/prompts.md CLAUDE.md docs/07-historial.md
git commit -m "docs(banco): T4 and the before-run ahead of the template rules

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
```

### Task 6: ADR 0001 — `TRUST_PROXY` por saltos (DND-25; ⚑ DP-3)

**Files:** Create: `docs/adr/0001-trust-proxy-por-saltos.md`, `docs/adr/README.md`; Modify: `docs/decisiones.md`, `docs/00-INDEX.md`, `docs/07-historial.md`.

- [ ] **Step 1: El ADR** (desde `Plantilla de agentes/plantillas/docs/adr/NNNN-titulo.md`):

```markdown
# ADR 0001 — `TRUST_PROXY` es un contador de saltos, y llega a Fastify como función

**Estado:** aceptada · **Fecha:** 2026-10-03 · **Decide:** el autor (TRUST_PROXY=2 desde el
2026-09-02; la forma de función, con el parche de dependencias del 2026-10-03).
- Línea en `decisiones.md`: D-AD-1

## Contexto

La API está detrás de **dos** proxies: Traefik (Coolify) y el nginx de `web`
(`docker-compose.prod.yml`). El límite de intentos del login es por IP (`ThrottlerGuard`), así que la
IP que ve la API decide si el límite protege a cada usuario o si todos comparten un cubo.
`03-despliegue.md` § «`TRUST_PROXY` vale 2» tiene la aritmética y las tres comprobaciones.

Desde `fastify` 5.12.1 un `trustProxy` **numérico** no confía en ningún salto (el cambio que cierra
«X-Forwarded-* spoofing under trustProxy hop-count»), y el tipo ya no admite un número.

## Decisión

`TRUST_PROXY` es **el número de proxies** delante de la API (0 = ninguno) y
`apps/api/src/configure-app.ts` lo pasa a Fastify como la función `(address, hop) => hop < N`, que es
exactamente lo que hacía `fastify` 5.11 con el número. En producción vale 2.

## Suposición que se probó

**Ninguna todavía.** La decisión supone que nadie salvo el nginx de `web` habla con la API. Está sin
medir y tiene ficha propia en `06-pendientes.md` (AD-6). Lo que sí está probado es la aritmética:
`configure-app.spec.ts`, caso `TRUST_PROXY=2`.

## Alternativas descartadas

- **`trustProxy: true`**: toma la entrada de más a la izquierda de `X-Forwarded-For`, la que pone el
  cliente; el límite dejaría de existir (fue un fallo real, corregido el 2026-09-02).
- **Una lista de IP/CIDR de confianza** (p. ej. `uniquelocal`): a Traefik le puede llegar la IP del
  gateway de Docker, que es privada (`03-despliegue.md`, cadena de proxies), y una lista de rangos
  privados la tomaría por proxy, dejando pasar la cabecera del cliente.
- **Quedarse en `fastify` 5.11**: cuatro avisos high sin parchear.

## Consecuencias

La función confía en el vecino inmediato sin comprobar su IP. **Es seguro solo mientras la API no sea
alcanzable sin pasar por nginx**: hoy no publica puertos y solo `web` la alcanza. No se ha verificado si
otro contenedor de la red de Coolify puede llegar a `api:3000` (ficha AD-6 de `06-pendientes.md`).

## Cuándo revisarse

- Si cambia la topología: la API gana dominio propio, se quita Traefik o nginx, o se añade un CDN
  delante — el número se **recuenta**, no se hereda.
- Si la comprobación de dos redes de `03-despliegue.md` da `429` desde la segunda red.
- Si `fastify` vuelve a cambiar `trustProxy` (revisar al subir de mayor) o si se pasa a Nest 12 (AD-2).
```

- [ ] **Step 2: Enlazar** — `docs/decisiones.md` va por secciones, cada una con una tabla `| | Decisión |`.
Justo antes de `## Lo demás que hay en \`superpowers/\``, una sección nueva:

```markdown
## Adopción de la plantilla de agentes (2026-10-03) · [spec](./superpowers/specs/2026-10-03-adopcion-plantilla-design.md) · [plan](./superpowers/plans/2026-10-03-adopcion-plantilla.md)

Decisiones del autor del 2026-10-03 y la que forzó el parche de dependencias.

| | Decisión |
|---|---|
| D-AD-1 | **`TRUST_PROXY` es un contador de saltos y llega a Fastify como función** `(address, hop) => hop < N`, porque desde `fastify` 5.12.1 un número no confía en nada. En producción vale 2. Razonado en [ADR 0001](./adr/0001-trust-proxy-por-saltos.md) |
| D-AD-2 | **Código en rama y `merge --no-ff`; solo documentación directo a `main`** ([04-convenciones.md](./04-convenciones.md), § *Git*) |
| D-AD-3 | **Atribución a IA veraz** en los commits (`Co-Authored-By` con el modelo que lo hizo); sin `git-guard`, porque hay una sola identidad |
| D-AD-4 | **Sin `deny` de secretos para los agentes y sin plantilla de PR**: un solo desarrollador ([04-convenciones.md](./04-convenciones.md), excepciones frente a la plantilla) |
| D-AD-5 | **Los parches de seguridad van primero** y los despliega el autor en cuanto pasan `verify` y los e2e de API, aunque `e2e-browser` siga rojo (ficha AD-1) |
| D-AD-6 | **Copia manual de la base antes de cualquier cambio en producción**, porque desde el 2026-10-03 hay gente usando la plataforma; **la copia automática todavía no se activa**. Sustituye a la decisión del 2026-09-05 de no hacer copias ([06-pendientes.md](./06-pendientes.md), sección de la copia de seguridad) |
```

Y crear `docs/adr/README.md` (refutación P21: alguien nuevo no sabe qué es un ADR):

```markdown
# ADR — decisiones de arquitectura

**Para qué sirve esta carpeta:** un ADR («Architecture Decision Record») registra **una** decisión difícil
de revertir: por qué se tomó, qué se descartó y cuándo hay que revisarla. Uno por fichero, numerados
(`0001-…`, `0002-…`). La lista corta de **todas** las decisiones, grandes y pequeñas, está en
[../decisiones.md](../decisiones.md); un ADR es para las que necesitan más de una línea.
```
En `docs/00-INDEX.md`, mapa de documentos, tras la fila de `decisiones.md` de la tabla de `superpowers/`:
`| [adr/](./adr/README.md) | **Decisiones difíciles de revertir**, una por fichero, con «Cuándo revisarse». Hoy, [0001 `TRUST_PROXY`](./adr/0001-trust-proxy-por-saltos.md) |`.

- [ ] **Step 3: `07`, comprobar y commit**

```markdown
## ADR 0001: `TRUST_PROXY` por saltos (2026-10-03) — solo documentación

Qué — primer ADR del repositorio, enlazado desde `decisiones.md`: el contador de saltos, por qué llega a
Fastify como función desde `fastify` 5.12, las alternativas descartadas y cuándo revisarlo.
Por qué — es la decisión más cara de equivocar (el límite del login) y acaba de cambiar de forma.
Revertir — borrar `docs/adr/` y la fila de `decisiones.md`.
```

```bash
pnpm check:docs
git add docs/adr docs/decisiones.md docs/00-INDEX.md docs/07-historial.md
git commit -m "docs(adr): 0001 TRUST_PROXY is a hop count passed as a function

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
```

### Task 7: El `04` según la plantilla (DND-12, DND-17, DND-24, DND-30)

**Files:** Modify: `docs/04-convenciones.md`, `docs/07-historial.md`.
Referencia: `Plantilla de agentes/plantillas/docs/04-convenciones.md`. **Lo propio del repo se conserva**;
no se reordena el fichero entero (911 líneas): se añade lo que falta y se dice dónde está cada parte.

- [ ] **Step 1: Mapa de la plantilla** — debajo de `# Convenciones` (línea 1), antes de `## Nivel de verificación: **N1**`:

```markdown
## Dónde está cada parte de la plantilla

Este documento sigue el esqueleto de la plantilla de agentes (Partes A, B y C) sin renumerar lo que ya
tenía. Si buscas una regla de la plantilla:

| Plantilla | Aquí |
|---|---|
| A.1–A.3 ciclo, escritura, prohibiciones · A.4 tablero | § *A · Documentación* (en este mismo fichero) |
| B.1–B.3 stack, dominio, flujo | `CLAUDE.md` («Reglas que no se negocian»), § *API*, § *Web*, § *Git* |
| B.4 delegación | § *Trabajo con varios agentes a la vez* y su bloque literal |
| B.5 seguridad y datos | § *B.5 · Seguridad y datos* |
| B.6 antes de abrir una ficha | § *Antes de abrir una ficha* |
| Parte C nivel y pasos | § *Nivel de verificación* |
| Excepciones y atribución | § *Precedencia* |

## A · Documentación

### A.1 Ciclo por cambio

**Antes** — leer [00-INDEX.md](./00-INDEX.md) y [06-pendientes.md](./06-pendientes.md). Funcionalidad
nueva o refactor con diseño: primero spec, después plan (`superpowers/specs/AAAA-MM-DD-<slug>-design.md`
→ `superpowers/plans/AAAA-MM-DD-<slug>.md`, una tarea = un commit). **Durante** — un cambio de riesgo a
la vez, copia antes de sobrescribir, nada se da por bueno sin evidencia. **Después** — estado en `01`–`05`
y `08` si cambió, entrada en [07-historial.md](./07-historial.md) (qué · por qué · cómo revertir), y el
`06` al día.

### A.2 Escritura

Fechas absolutas · un fichero = un propósito (§ *Revisión*, «un fichero no mezcla tipos de documento») ·
un dato vive en un solo sitio · **lo que una máquina puede medir no se escribe a mano**: se da el comando
o el bloque generado.

### A.3 Prohibiciones

Estado de sesión o pendientes en `CLAUDE.md`/`AGENTS.md` · copiar el cuerpo de `CLAUDE.md` en
`AGENTS.md` · enlazar documentos que no existen · editar `_archivo/` · cerrar un pendiente sin evidencia ·
renumerar documentos.

### A.4 Cómo se lleva el tablero (`06`)

Las nueve reglas de la plantilla, **resumidas**; el texto completo está en la plantilla de agentes,
`plantillas/docs/04-convenciones.md`, §A.4 (refutación P19):

1. **Por áreas.** Toda ficha pertenece a un área de la tabla «Resumen por área» del principio del `06`; no hay secciones por
   origen ni viñetas sueltas: todo es una fila con ID.
2. **ID = prefijo del área + número**; la prioridad nunca va dentro del ID; el número no se reutiliza;
   no se renumera salvo en un triaje completo aprobado, con tabla de equivalencias y copia literal del
   tablero viejo en `_archivo/`.
3. **Una ficha por arreglo**; lo que se resuelve con el mismo cambio es una parte más de la misma ficha.
4. **Columnas fijas:** ID · P · T · Tarea · Detalle (≤ 3 líneas, termina en **Depende de:** y **Relacionada:**).
5. **La urgencia se marca, no ordena**; el orden lo dan las dependencias.
6. **Cerrar exige evidencia** (commit, prueba o medición) y separa resuelta de descartada; la ficha sale
   del `06` y el detalle va al `07`; si tiende a volver, una línea en «No re-abrir».
7. **Los hallazgos de una auditoría viven en su informe** hasta que el usuario decide cuáles entran.
8. **Triaje completo** cuando el usuario lo pida: agentes de solo lectura por bloques, evidencia por
   ficha, las cerradas juntas a un fichero `pendientes-cerrados-<fecha>` de `_archivo/`.
9. **Variante ligera** para tableros pequeños (menos de unas veinte fichas o hasta cuatro áreas).

**Hoy el `06` no cumple A.4** (excepción declarada en § *Precedencia*): está repartido por origen y tiene
IDs con prioridad dentro (`P1`…`P4`). Lo pone en regla el triaje, con su propio plan. **Las fichas nuevas
ya nacen sin la prioridad dentro del ID**; su prefijo (`AD-n`, de la adopción) es provisional y el triaje lo
cambia por el de su área.
```

- [ ] **Step 2: Parte C — tabla de pasos con estado medido** — en `## Nivel de verificación: **N1**`, justo
después del bloque de código con la definición de `pnpm verify` (la línea ``` que cierra `&& pnpm check:estado && pnpm check:historial && pnpm test`), insertar:

```markdown

| Paso | Comando | Dónde corre | Estado (2026-10-03) |
|---|---|---|---|
| Type-check | `pnpm build` | `verify` (gancho y CI) | obligatorio, verde |
| Lint, incluida la prueba de arquitectura | `pnpm lint` | `verify` | obligatorio, verde; la regla de dependencias entra con el plan de adopción |
| Formato | `pnpm format:check` | `verify` | obligatorio, verde |
| Documentación | `pnpm check:docs` | `verify` | obligatorio, verde |
| Conteos generados | `pnpm check:estado` | `verify` | obligatorio; cuenta **declaraciones** (decisión D-POD-4) |
| Tope del historial | `pnpm check:historial` | `verify` | obligatorio, verde |
| Unitarias | `pnpm test` | `verify` | obligatorio, verde (una saltada) |
| e2e de API | `pnpm --filter @dnd/api test:e2e` | CI (trabajo `test`) y a mano con Docker | obligatorio fuera de `verify` |
| e2e de navegador | `pnpm --filter @dnd/web e2e` | CI (trabajo `e2e-browser`) y a mano | obligatorio fuera de `verify`; **rojo en CI desde el 2026-09-07** (ficha AD-1) |
| Dependencias | `pnpm audit --prod --audit-level=high` | CI | 0 high tras el parche del 2026-10-03; 4 moderate que piden mayores (AD-3) |
| Cobertura con umbral | — | — | N2 no declarado, pendiente de decisión del autor |
| Mutación | — | — | N3 no declarado |

**El gancho corre `verify` entero porque es autocontenido**: ni Docker ni `.env` (medido el 2026-10-03 en
una copia sin los dos). **Techos que solo bajan:** `01-arquitectura.md` 455 líneas (tope 150, ficha AD-5);
`06-pendientes.md` 1.565 líneas hasta el triaje; los 4 avisos moderados de AD-3.
```

- [ ] **Step 3: B.5 — las doce reglas, medidas** — medir primero:

```bash
grep -l -E "403|404|no-miembro|non-member|not a member" apps/api/test/*.e2e-spec.ts | wc -l
grep -rln "ZodValidationPipe" apps/api/src --include=*.controller.ts | wc -l
find apps/api/src -name "*.controller.ts" | wc -l
grep -rn "queryRawUnsafe\|executeRawUnsafe" apps/api/src | wc -l
grep -n "db push\|migrate deploy" apps/api/Dockerfile package.json apps/api/package.json
grep -rn "@@unique\|@unique" apps/api/prisma/schema.prisma | wc -l
```
Anotar las cifras en el texto de abajo **solo si no son conteos de pruebas** (los de pruebas no se
escriben: se dice el comando). Insertar, justo antes de `## Un control de seguridad que depende del entorno declara aquí por qué`:

````markdown
## B.5 · Seguridad y datos — las doce reglas de la plantilla, con su estado

La referencia completa está en la skill `calidad-y-seguridad`; esto es el mínimo que no se negocia y
cómo está hoy aquí. «Techo» = se sabe que falta, con su ficha.

| # | Regla | Estado | Evidencia |
|---|---|---|---|
| 1 | Autorización en el servidor, por objeto, con prueba «A contra recurso de B» | ✅ (sin mapa endpoint → prueba) | `MembershipService` y `canView` (`CLAUDE.md`); los e2e de API que comprueban 403/404 a quien no es miembro se cuentan con el primer comando de debajo de la tabla |
| 2 | La interfaz toma el permiso de la ruta que llama | regla declarada (`CLAUDE.md`), sin prueba transversal | § *Web* |
| 3 | Entrada validada en el borde, lista blanca | ✅ | Zod desde `@dnd/shared` con `ZodValidationPipe` en los controladores |
| 4 | Consultas parametrizadas | ✅ | solo `$queryRaw` de plantilla etiquetada; el segundo comando de debajo de la tabla sale vacío |
| 5 | Secretos fuera del repo, de los logs y del frontend | ✅ | `.env` ignorado; `apps/api/src/common/jwt-secret.ts` exige 32 caracteres; nada en `VITE_*` |
| 6 | Datos personales mínimos y fuera de los logs | techo | ficha CL-4 (Sentry sin datos personales) |
| 7 | El esquema solo cambia por migración; ningún default que sincronice | ✅ | `prisma migrate deploy` en el `CMD` de `apps/api/Dockerfile`; ni `db push` ni sincronización |
| 8 | Integridad en la base | ✅ | índices únicos parciales: un encuentro activo por sesión, una ranura un objeto ([11-invariantes.md](./11-invariantes.md)) |
| 9 | Lo atómico en la misma transacción | ✅ | `PrismaService.transaction` ([01-arquitectura.md](./01-arquitectura.md), «Un `tx?` opcional») |
| 10 | Falla cerrado | ✅ | `canView` niega a quien no es miembro (`apps/api/src/common/visibility.spec.ts`, «non-member … sees nothing»); el pipe de Zod rechaza con 400 |
| 11 | Dependencias auditadas en CI con umbral | ✅ desde el 2026-10-03 | `.github/workflows/ci.yml`, `pnpm audit --prod --audit-level=high` |
| 12 | Un patrón nuevo nombra su problema, y **la regla de dependencias del `01` se comprueba en `verify`** | techo hasta la prueba de arquitectura del plan de adopción | `eslint.config.mjs`, bloque «Regla de dependencias» |

Los dos comandos de las filas 1 y 4 (con `-e` repetido no hace falta escapar ninguna barra, y se copian
igual desde el fichero que desde GitHub):

```bash
grep -l -e 403 -e 404 -e no-miembro apps/api/test/*.e2e-spec.ts | wc -l   # e2e que prueban «A contra recurso de B»
grep -rn -e queryRawUnsafe -e executeRawUnsafe apps/api/src                # tiene que salir vacío
```
````
(Refutación P6: con `\|` dentro de una celda de tabla los dos comandos daban 0 o salían vacíos siempre,
según se copiaran del fichero o de GitHub. El bloque exterior de este paso va con cuatro comillas
invertidas para que el `bash` de dentro se pegue tal cual. `11-invariantes.md` ya existe: la Task 9 va
antes que esta, ver «Orden de ejecución».)

- [ ] **Step 4: B.4 — la prohibición literal completa** — en el bloque ```` ```text ```` de
§ *La frontera del encargo es de ficheros **y** de herramientas*, sustituir la línea
`- No commiteas: la revisión va antes. No empujas. No lanzas más agentes.` por:

```text
- No commiteas: la revisión va antes. No empujas. No lanzas subagentes, forks ni agentes en
  segundo plano.
- No usas `git stash`, `git checkout` ni `git switch`: borran o mueven el trabajo sin commitear
  de otro.
```
Y debajo del bloque, añadir: `A los dos o tres minutos de lanzar una tanda se comprueba que corren solo los agentes lanzados (plantilla, B.4).`

- [ ] **Step 5: B.6 — los casos completos** — en `### Los cuatro casos en los que el paso 1 NO aplica`:
  - título → `### Los casos en los que el paso 1 NO aplica`;
  - fila `| **Migración o cambio de datos** | …` → `| **Migración, permiso o cambio de datos** | Va sola, con su nombre, y no colgada de otro arreglo; un permiso mal puesto es un fallo de seguridad |`;
  - fila nueva al principio de la tabla: `| **Zona congelada** (`_archivo/`, specs y planes fechados de `superpowers/`, `prototipo/`) | No se edita: se corrige en el documento vivo |`;
  - y antes de la lista de cuatro pasos (`1. **¿Hay un cambio rápido y duradero**`), la línea:
    `**Lo trivial va directo** (una errata, un texto, el formato, un renombrado o un cambio ya especificado). Para lo demás:`
  - y en el párrafo de encima de la tabla, `En estos cuatro casos` → `En estos casos` (refutación P18: con la
    fila nueva son cinco).
    Comprobar: `grep -n "cuatro casos" docs/04-convenciones.md` → vacío.

- [ ] **Step 6: Git (DND-12)** — sustituir la sección `## Git` entera (sus **cuatro** viñetas; refutación P17)
por lo de abajo. La frase «Una funcionalidad sin su documentación al día no está terminada», que vive hoy en
esa sección, **se conserva** en la última viñeta:

```markdown
## Git

- **Código en rama y `git merge --no-ff`; un cambio que solo toca documentación va directo a `main`**
  (decisión del usuario, 2026-10-03). La documentación que acompaña a un cambio de código va en su rama.
- **Un commit por tarea**, con su prueba en verde antes de commitear (lo exige el gancho).
- Mensajes en formato Conventional Commits, en inglés: `feat(web):`, `fix(api):`.
- **Atribución veraz:** un commit hecho con un agente lleva `Co-Authored-By: <modelo que lo hizo>
  <noreply@anthropic.com>`; si lo hizo un subagente de otro modelo, el suyo. Sin `git-guard`: hay una
  sola identidad de git.
- Tras cada tarea: ledger (`.superpowers/sdd/progress.md`) y memoria. **`git push` solo con permiso del
  autor en la sesión.**
- **Al terminar un cambio relevante, la documentación se actualiza en el mismo commit**: estado en
  01–05, deuda nueva en 06, una línea en 07. Una funcionalidad sin su documentación al día no está
  terminada.
```
Antes de sustituir, `sed -n "/^## Git/,/^## /p" docs/04-convenciones.md` y comprobar que cualquier otra
frase de la sección vieja que no esté en la nueva queda cubierta; si no, añadirla.

- [ ] **Step 7: Excepciones frente a la plantilla** — al final de `## Precedencia`, añadir:

```markdown

### Excepciones declaradas frente a la plantilla de agentes

La tabla anterior de esta sección, la de precedencia, es frente a las reglas globales del usuario (no hay
ninguna excepción ahí). Esta es frente a la **plantilla de agentes**, para que ningún agente vuelva a
proponerlas:

| Regla de la plantilla | Aquí | Motivo |
|---|---|---|
| Fichero de permisos de Claude Code del repositorio con `deny` de secretos | **No se bloquea** la lectura de `.env*` (y no se crea ese fichero) | Un solo desarrollador; los agentes los necesitan para correr y verificar (usuario, 2026-10-03) |
| Plantilla de PR | **No hay** | Un solo desarrollador (usuario, 2026-10-03) |
| Todo cambio en rama | **Solo el código**; la documentación va directo a `main` | Usuario, 2026-10-03 (§ *Git*) |
| `git-guard` | No aplica | Una sola identidad de git |
| `05-runbook.md` | `05` es **Datos**; los comandos y trampas viven en `02-entorno.md` y `03-despliegue.md` | A.3 prohíbe renumerar |
| `06` por áreas (A.4) | **Hasta el triaje** el `06` sigue por origen; las fichas nuevas ya nacen con ID sin prioridad | El triaje es trabajo largo con plan propio |
| Conteos del corredor (`check-conteos`) | `check:estado` cuenta **declaraciones**; los casos de e2e se anotan a mano en `08-pruebas.md` | Decisión D-POD-4: leer el informe de cuatro corredores haría caro el gancho |
| Prueba de arquitectura con dependency-cruiser | **ESLint `no-restricted-imports`** en `eslint.config.mjs` | Ya corre en `pnpm lint`, sin dependencia nueva |
| Validación con `ValidationPipe` (regla de NestJS) | **Zod desde `@dnd/shared`** con `ZodValidationPipe` | La forma de los datos vive una sola vez (`CLAUDE.md`) |
| Desplegar con CI verde (`03-despliegue.md`) | El parche de seguridad del 2026-10-03 se despliega cuando pasan `verify` y los e2e de API, aunque `e2e-browser` siga rojo | Decisión del usuario: seguridad primero; ficha AD-1 |
| `trustProxy` con direcciones de confianza | **Función de saltos** | [ADR 0001](./adr/0001-trust-proxy-por-saltos.md) |
```

- [ ] **Step 8: `check:docs` en el `04` (mentira #5) se deja para la Task 11**, que cambia el script: así el
texto describe el control que existe en el mismo commit.

- [ ] **Step 8b: Citas al `04` por número de línea** (refutación P5) — este cambio mete unas noventa líneas al
principio del `04`, y hay citas por número de línea que dejarían de apuntar a lo que dicen:

```bash
git grep -n "04-convenciones.md:[0-9]" -- docs CLAUDE.md ':!docs/_archivo' ':!docs/superpowers' ':!docs/07-historial.md'
git grep -n "04-convenciones.md:[0-9]" -- apps packages
```
Expected (2026-10-03): en documentación, `docs/decisiones.md` (cita `04-convenciones.md:466`); en código,
`apps/web/src/features/campaigns/CampaignSettings.tsx` y su prueba `__tests__/CampaignSettings.test.tsx`
(citan `04-convenciones.md:460`). Las tres se refieren a la misma regla, «**El botón de guardar nunca se
deshabilita**», que el 2026-10-03 está en la línea 501, dentro de § *Reglas de interfaz que salieron del
reseño (2026-09-02) — vinculantes* (medido con `grep -n "botón de guardar nunca" docs/04-convenciones.md`):
las citas ya estaban desplazadas antes de este plan.

En `docs/decisiones.md`, fila E-PL-8: `` manda `04-convenciones.md:466` `` → `` manda `04-convenciones.md`, § *Reglas de interfaz que salieron del reseño*, `` (el resto de la frase, igual).

**Las dos de código no se tocan aquí** (en `main` solo va documentación, EL-D2): van a la Task 12, en su
rama, con el mismo cambio (`docs/04-convenciones.md:460` → `docs/04-convenciones.md, § «Reglas de interfaz que salieron del reseño»`).

- [ ] **Step 9: Comprobar, `07` y commit**

```bash
grep -n "^## \|^### A\.\|^### Excep\|^## B\.5" docs/04-convenciones.md | head -40
pnpm check:docs
```

```markdown
## El `04` según la plantilla (2026-10-03) — solo documentación

Qué — mapa de dónde está cada parte de la plantilla; A.1–A.4 (con la excepción del `06` hasta el triaje);
Parte C con la tabla de pasos y su estado medido y los techos; B.5 con las doce reglas y su evidencia;
B.4 con la prohibición de subagentes, `git stash`, `git checkout` y `git switch`; B.6 con los casos
completos y «lo trivial va directo»; § *Git* con código en rama y docs en `main`, atribución veraz y push
con permiso; y la tabla de excepciones frente a la plantilla.
Por qué — la auditoría de adopción (D3–D9) y las decisiones del usuario del 2026-10-03.
Revertir — `git revert <hash>`.
```

```bash
git add docs/04-convenciones.md docs/decisiones.md docs/07-historial.md
git commit -m "docs(04): template parts A/B/C, measured B.5, literal B.4 ban, exceptions and attribution

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
```

### Task 8: `CLAUDE.md` corto y `AGENTS.md` con su línea (DND-23, DND-16; ⚑ DP-5)

**Files:** Modify: `CLAUDE.md`, `AGENTS.md`, `docs/_archivo/README.md`, `docs/07-historial.md`;
Create: `docs/_archivo/claude-md-hasta-2026-10-03.md`.

- [ ] **Step 1: Archivar el `CLAUDE.md` entero, no solo su cola** (refutación P9: varias reglas vigentes
vivían solo en su cuerpo; con el fichero entero en `_archivo/`, nada se pierde aunque el Step 2 lo
sustituya). `$TEMP/dnd-cab-claude.md`:

```markdown
# CLAUDE.md tal como estaba hasta el 2026-10-03

**El `CLAUDE.md` entero, copiado aquí el 2026-10-03** al dejarlo en la forma corta de la plantilla de
agentes. Incluye su última sección, «Por qué este fichero ya no narra el estado», con los tres avisos que
son la razón de la regla «el estado se genera o se mide». No se reescribe. Los enlaces relativos que trae
apuntaban desde la raíz del repositorio; aquí no resuelven y se leen como texto.

---

```

```bash
# todo en un bloque (P12): T se calcula aquí mismo
T=$(wc -l < CLAUDE.md); echo "total=$T"
node "$TEMP/dnd-mover.mjs" CLAUDE.md 1 "$T" docs/_archivo/claude-md-hasta-2026-10-03.md "$TEMP/dnd-cab-claude.md" -
wc -l docs/_archivo/claude-md-hasta-2026-10-03.md
```
Expected: el archivo tiene las líneas de `CLAUDE.md` más las de la cabecera; `CLAUDE.md` queda vacío hasta
el Step 2.

- [ ] **Step 2: `CLAUDE.md` entero** — escribir como contenido completo (el bloque va con cuatro comillas
invertidas porque lleva dentro uno de `bash`; se pega lo de dentro):

````markdown
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
   código y de documentación, excepciones.

**Después de leer, la respuesta de arranque son 5 líneas** —estado, qué hay abierto que importe, qué se
propone— **y se espera la confirmación del autor antes de tocar nada.**

| Necesito… | Voy a |
|---|---|
| Por dónde entrar tras semanas fuera | [docs/como-seguir.md](docs/como-seguir.md) |
| Saber si algo ya se decidió | [docs/decisiones.md](docs/decisiones.md) y [docs/adr/](docs/adr/README.md) |
| Las reglas que no pueden romperse | [docs/11-invariantes.md](docs/11-invariantes.md) |
| Arquitectura, capas y la regla de dependencias | [docs/01-arquitectura.md](docs/01-arquitectura.md) |
| Levantar el entorno, variables, trampas de Windows | [docs/02-entorno.md](docs/02-entorno.md) |
| Desplegar, `TRUST_PROXY`, copias | [docs/03-despliegue.md](docs/03-despliegue.md) |
| Esquema, migraciones, visibilidad | [docs/05-datos.md](docs/05-datos.md) |
| Qué prueba cada capa, la regla de Playwright, conteos de e2e | [docs/08-pruebas.md](docs/08-pruebas.md) |
| Cómo se usa (DM y jugador) | [docs/09-jugar.md](docs/09-jugar.md) |
| Medir un cambio del proceso | [docs/10-banco-de-tareas.md](docs/10-banco-de-tareas.md) |
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
  inglés (Conventional Commits), con atribución veraz.
- **Código en inglés, interfaz y documentación en español**, y ningún valor de enumeración llega a la
  pantalla: la forma legible se escribe una vez por dominio y todo lo demás la importa. **Si un texto de
  la interfaz explica una regla del servidor y los dos discrepan, el que miente es el texto.** Las demás
  reglas de interfaz vinculantes están en el `04`, § *Reglas de interfaz que salieron del reseño*.
- **El despliegue no se lanza sin que lo pida el autor**, y lo lanza él. `TRUST_PROXY` vale **2**
  (Traefik y nginx) y llega a Fastify como función de saltos ([ADR 0001](docs/adr/0001-trust-proxy-por-saltos.md)).
  Lo que de verdad protege el límite de intentos es que Traefik descarte el `X-Forwarded-For` del
  cliente: si cambia la topología, se recuenta.
- **Hay gente usando la plataforma (desde el 2026-10-03): antes de cualquier cambio en `vps1new` o en
  producción se hace una copia manual de la base** y se comprueba que se puede leer
  ([03-despliegue.md](docs/03-despliegue.md), § *Copias de seguridad*). La copia automática todavía no
  se activa.

## Cierre de cada cambio (obligatorio)

1. Estado que haya cambiado → `docs/01`–`05` y `08`.
2. Entrada en `docs/07-historial.md`: qué · por qué · cómo revertir.
3. `docs/06-pendientes.md`: cerrar lo hecho, dar de alta lo que quedó abierto.
````
(`11-invariantes.md`, `auditorias/README.md` y `adr/README.md` ya existen: las Tasks 6, 9 y 10 van antes,
ver «Orden de ejecución».)

- [ ] **Step 3: `AGENTS.md` entero**

```markdown
# AGENTS.md — D&D Platform

Las instrucciones para agentes de este repositorio están en **[CLAUDE.md](CLAUDE.md)**: léelo entero
antes de tocar nada. Este fichero existe solo porque hay herramientas que buscan este nombre; no se le
añade contenido, porque una copia del cuerpo diverge.

Plataforma de campañas de D&D 5.ª con motor de reglas y cinco niveles de visibilidad. Stack: **pnpm ·
NestJS 11 + Fastify + Prisma 5 + PostgreSQL 16 · React 18 + Vite · Zod (`@dnd/shared`) · Jest, Vitest,
Playwright**.
```

- [ ] **Step 4: Comprobar que nada se perdió**

Cada regla por separado (refutación P9: el `grep` con `\|` de antes pasaba gracias a una sola palabra):

```bash
wc -l CLAUDE.md AGENTS.md
for r in "canView" "MembershipService" "ZodValidationPipe" "TRUST_PROXY" "jsdom" "enumeración" \
         "despliegue no se lanza" "miente" "encargo lleva" "Esconder un botón" "reimplementa" \
         "X-Forwarded-For" "copia manual"; do
  printf "%s: " "$r"; grep -c "$r" CLAUDE.md
done
grep -c "Hasta el 2026-09-05 este bloque" docs/_archivo/claude-md-hasta-2026-10-03.md
for r in "icono" "glifo" "radio" "navegador"; do printf "04 %s: " "$r"; grep -c -i "$r" docs/04-convenciones.md; done
```
Expected: `CLAUDE.md` ≤ ~85 líneas; **ningún** conteo a 0; el `grep` del archivo, `1`. Las reglas de interfaz
detalladas (iconos dibujados y no glifos, radios con explicación, valor guardado marcado y no
seleccionable, lo maquetado se mide en el navegador) viven en el `04`, § *Reglas de interfaz que
salieron del reseño*: los cuatro conteos del `04` > 0 (medido el 2026-10-03: 11, 6, 3, 16).

Y los enlaces de todo el camino de lectura (refutación P16; mismo comprobador que la Task 3, Step 10):

```bash
node -e "
const fs=require('fs'),p=require('path');
const fich=['CLAUDE.md','AGENTS.md',...fs.readdirSync('docs').filter(f=>f.endsWith('.md')).map(f=>'docs/'+f),'docs/adr/README.md','docs/auditorias/README.md'];
let malos=0;
for(const f of fich){const t=fs.readFileSync(f,'utf8');for(const m of t.matchAll(/\]\(([^)#\s]+\.md)/g)){
 if(/^https?:/.test(m[1]))continue;if(!fs.existsSync(p.resolve(p.dirname(f),m[1]))){console.log(f,'->',m[1]);malos++}}}
console.log('enlaces rotos:',malos);process.exit(malos?1:0)"
```
Expected: `enlaces rotos: 0`.

- [ ] **Step 5: `00-INDEX`, archivo, `07` y commit**

En `docs/00-INDEX.md`, el párrafo nuevo de la Task 3 ya enlaza el comando; no hace falta más. Fila en
`docs/_archivo/README.md`:

```markdown
| [`claude-md-hasta-2026-10-03.md`](./claude-md-hasta-2026-10-03.md) | **El `CLAUDE.md` entero tal como estaba hasta el 2026-10-03**, con su sección «Por qué este fichero ya no narra el estado» (los tres avisos, razón de la regla «el estado se genera o se mide») | 2026-10-03 |
```

```markdown
## `CLAUDE.md` corto y `AGENTS.md` con su línea (2026-10-03) — solo documentación

Qué — `CLAUDE.md` pasa de 126 líneas y trece lecturas a la forma de la plantilla: qué es y stack, tres
lecturas (`00`, `06`, `04`), arranque de cinco líneas con espera, tabla «Necesito… → Voy a» con el resto,
comandos, reglas duras vigentes (con la de la copia manual antes de tocar producción) y cierre. El
`CLAUDE.md` anterior se copió **entero** a `_archivo/claude-md-hasta-2026-10-03.md`, con su sección «Por
qué este fichero ya no narra el estado». `AGENTS.md` gana la línea de qué es y el stack.
Por qué — cada lectura obligatoria se paga en contexto en cada sesión.
Revertir — `git revert <hash>`.
```

```bash
pnpm check:docs
git add CLAUDE.md AGENTS.md docs/_archivo/ docs/07-historial.md
git commit -m "docs: short CLAUDE.md with three reads, AGENTS.md with what-and-stack

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
```

### Task 9: Invariantes con dueño y prueba (DND-21)

**Files:** Create: `docs/11-invariantes.md`; Modify: `docs/00-INDEX.md`, `docs/07-historial.md`.

- [ ] **Step 1: Confirmar dueños y pruebas**

```bash
grep -n "export function canView" apps/api/src/common/visibility.ts
grep -n "it(\"non-member" apps/api/src/common/visibility.spec.ts
grep -n "describe(\|it(\`" apps/api/src/common/visibilidad-matriz.spec.ts | head -3
grep -n "async requireMember\|async requireDM" apps/api/src/campaigns/membership.service.ts
grep -n "export function deriveCharacter" apps/api/src/rules/catalog/index.ts
grep -n "se avanza con \`increment\`" apps/api/src/game-clock/game-clock.service.spec.ts
grep -n "impide un segundo encuentro activo" apps/api/test/encounters.e2e-spec.ts
grep -n "misma ranura vacía" apps/api/test/inventory.e2e-spec.ts
grep -rn "statblockRef" apps/api/prisma/schema.prisma
grep -rln "statblockRef" apps/api/test/*.e2e-spec.ts | head -3
grep -rn "it(\".*\(tres\|three\).*\(sintoniz\|attun\)" apps/api/src apps/api/test | head -3
grep -rln "Math.random" apps/api/src | grep -v spec | head
```
Expected: cada uno con resultado salvo, quizá, las dos últimas búsquedas de pruebas (sintonización y
PNJ): lo que no aparezca se escribe **«Sin prueba»** con lo que sí ejercita algo parecido.

- [ ] **Step 2: El documento** (desde `Plantilla de agentes/plantillas/docs/NN-invariantes.md`). Escribir
`docs/11-invariantes.md` con esta tabla, completando la columna «Prueba» con lo que dio el Step 1:

```markdown
# 11 — Invariantes y glosario

> **Léelo antes de tocar una regla de dominio** o un servicio que la aplica: **una prueba que te
> contradice suele estar fijando un invariante, no señalando un bug.** Enlaza a `01`–`05` y a
> `decisiones.md`; no copia su texto.

Última revisión: **2026-10-03**

## Parte 1 — Invariantes

| Invariante | Dueño en el código | Prueba que lo fija | Decisión / dónde consta |
|---|---|---|---|
| Quién ve qué lo decide una sola función; nadie reimplementa la matriz | `canView` en `apps/api/src/common/visibility.ts` | `apps/api/src/common/visibility.spec.ts` y la matriz entera en `apps/api/src/common/visibilidad-matriz.spec.ts` | `CLAUDE.md`; `05-datos.md`, semántica de la visibilidad |
| Hay exactamente cinco niveles de visibilidad (`PUBLIC`, `PLAYERS`, `SPECIFIC_PLAYERS`, `OWNER_DM`, `DM_ONLY`) | `enum Visibility` en `apps/api/prisma/schema.prisma` | la matriz de `canView` de la primera fila recorre los cinco | `05-datos.md` |
| Si un usuario pertenece a una campaña, y con qué rol, lo responde un solo servicio | `MembershipService.requireMember` / `requireDM` | `apps/api/src/campaigns/membership.service.spec.ts` | `01-arquitectura.md`, «Dirección de dependencias» |
| La hoja de 5.ª se **deriva**, no se guarda, y cada número trae su traza | `deriveCharacter` en `apps/api/src/rules/catalog/index.ts` | `apps/api/src/rules/engine.spec.ts` | `01-arquitectura.md`, «Las tres capas de la fase 2A» |
| Un PNJ en la mesa es una fila de `Character` (lo distingue `statblockRef`), no un modelo nuevo | `NpcsService` (`statblocks/`) | (resultado del Step 1) | `01-arquitectura.md`, fila `npcs` |
| El reloj de campaña son segundos de juego que solo avanzan, y solo el DM lo mueve | `GameClockService` | `apps/api/src/game-clock/game-clock.service.spec.ts` — «se avanza con `increment`…» y «avanzarlo es solo del DM» | `01-arquitectura.md`, fila `game-clock` |
| Como mucho un encuentro activo por sesión, y lo garantiza la base | índice único parcial (migración de `encounters`) | `apps/api/test/encounters.e2e-spec.ts` — «la base, no el servicio, impide un segundo encuentro activo…» | `01-arquitectura.md`, fila `encounters` |
| Una ranura, un objeto; como mucho tres sintonizaciones | índice único parcial + `inventory` | `apps/api/test/inventory.e2e-spec.ts` — «… misma ranura vacía — una gana, la otra choca con 409»; tres sintonizaciones: (resultado del Step 1) | `01-arquitectura.md`, fila `inventory` |
| El azar vive en el servidor: el servidor tira y escribe la tirada antes de devolverla | `rolls/` | (resultado del Step 1, p. ej. el e2e de `rolls`) | `01-arquitectura.md`, fila `rolls` |

## Parte 2 — Glosario

| Término | Definición | Entidad / tabla |
|---|---|---|
| **Ficha** (del mundo) | Una entidad del wiki de la campaña: PNJ, lugar, misión, facción, objeto, evento o documento | `Entity` |
| **PNJ de la mesa** | La instancia jugable de un statblock: una fila de `Character` con `statblockRef` | `Character` |
| **Statblock** | La plantilla de números de una criatura, del SRD (en código) o del DM (en la base) | catálogo SRD / `CampaignStatblock` |
| **DM** | Quien dirige la campaña; en el código, el rol de la membresía | `CampaignMember.role` |
```
Reglas del esqueleto: el dueño por clase y método, la prueba por el texto del caso; **«Sin prueba» no se
borra** para que la tabla quede bonita. (Comprobar con `grep -n "model CampaignStatblock\|model Entity\b\|model CampaignMember" apps/api/prisma/schema.prisma`
que los nombres del glosario existen; si alguno se llama distinto, se pone el nombre real.)

- [ ] **Step 3: Enlazar, `07` y commit** — fila en el mapa de `00-INDEX.md` (tras `10-banco-de-tareas.md`):
`| [11-invariantes.md](./11-invariantes.md) | **Las reglas de dominio que no pueden romperse**, con su dueño y la prueba que las fija, y el glosario |`.

```markdown
## Invariantes con dueño y prueba (2026-10-03) — solo documentación

Qué — `11-invariantes.md`: visibilidad y sus cinco niveles, membresía, hoja derivada, PNJ = `Character`,
reloj en segundos, un encuentro activo por sesión, ranuras y sintonizaciones, azar en el servidor; cada
uno con su dueño y su prueba, o «Sin prueba». Y un glosario corto.
Por qué — plantilla (D16): una prueba que contradice un cambio suele estar fijando un invariante.
Revertir — borrar el fichero y su fila del `00`.
```

```bash
pnpm check:docs
git add docs/11-invariantes.md docs/00-INDEX.md docs/07-historial.md
git commit -m "docs: invariants with owner and test, plus a short glossary

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
```

### Task 10: Registro de auditorías (DND-22)

**Files:** Create: `docs/auditorias/README.md`; Modify: `docs/00-INDEX.md`, `docs/07-historial.md`.

- [ ] **Step 1: Comprobar que existen**

```bash
ls docs/superpowers/specs/2026-09-02-auditoria-interfaz.md docs/superpowers/specs/2026-09-03-auditoria-de-mecanica-2B.md docs/superpowers/specs/2026-09-05-auditoria-cola-larga.md docs/_archivo/auditoria-interfaz-2026-09-19.md
grep -n "^### Mesa de agentes del 2026-09-02" docs/06-pendientes.md
```

- [ ] **Step 2: `docs/auditorias/README.md`** (desde `Plantilla de agentes/plantillas/docs/auditorias/README.md`):

```markdown
# Registro de auditorías

**Para qué sirve:** comparar una auditoría con la anterior. Una auditoría aquí es una revisión a fondo de
**una** funcionalidad buscando fallos, con un segundo agente («refutador») que intenta desmentir cada
hallazgo. Una línea por auditoría. Lo que importa comparar entre auditorías no es el total de hallazgos, sino **la
tasa de refutados** (si sube, el encargo se degradó) y **los reaparecidos** (miden el sistema). Método:
skill `auditoria-por-funcionalidad`, § *El registro de auditorías*.

**Las cinco de antes de este registro se reconstruyen de sus informes**: donde el informe no da un campo,
dice «no consta». No se rellenan de memoria.

| Fecha | Funcionalidad | Pedida por | Frentes + refutadores | Modelo | CRÍT | ALTO | MEDIO | BAJO | Refutados | Con reservas | Citas inventadas | Reaparecidos | Tokens de subagente |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-02 | Interfaz | autor | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | — (primera) | no consta |
| 2026-09-02 | Mesa de agentes: un DM y un tramposo contra la API real | autor | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta |
| 2026-09-03 | Mecánica de 2B | autor | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta |
| 2026-09-05 | Cola larga | autor | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta |
| 2026-09-19 | Interfaz sobre el prototipo navegable | autor | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta | no consta |

**Informes:** [interfaz 2026-09-02](../superpowers/specs/2026-09-02-auditoria-interfaz.md) ·
mesa de agentes: [06-pendientes.md](../06-pendientes.md), «Mesa de agentes del 2026-09-02» ·
[mecánica 2B](../superpowers/specs/2026-09-03-auditoria-de-mecanica-2B.md) ·
[cola larga](../superpowers/specs/2026-09-05-auditoria-cola-larga.md) ·
[interfaz 2026-09-19](../_archivo/auditoria-interfaz-2026-09-19.md).

La auditoría de adopción de la plantilla (2026-10-03) no es de una funcionalidad y no entra en la tabla;
su informe y su refutación están fuera del repositorio, en la carpeta «Auditoria plantilla 2026-10-03» del
autor (refutación P29).

**Los hallazgos viven en su informe** hasta que el autor decide cuáles entran al tablero (regla 7 de la
sección A.4 de [04-convenciones.md](../04-convenciones.md)).

## Lecciones de método

- 2026-09-02 — la mesa de agentes contra la API real encontró lo que las suites no veían (detalle en su sección del `06`).
```
Después, abrir cada informe y **sustituir cada «no consta» que el informe sí dé** (severidades, frentes,
modelo, refutados). Lo que no dé, se queda «no consta».

- [ ] **Step 3: Enlazar, `07` y commit** — fila en el mapa de `00-INDEX.md`:
`| [auditorias/README.md](./auditorias/README.md) | **Registro de auditorías**, una línea por auditoría, para comparar la tasa de refutados y los reaparecidos |`.

```markdown
## Registro de auditorías (2026-10-03) — solo documentación

Qué — `docs/auditorias/README.md` con las cinco auditorías que había (interfaz del 2026-09-02, mesa de
agentes, mecánica de 2B, cola larga, interfaz del 2026-09-19), reconstruidas de sus informes; lo que no
consta se dice.
Por qué — plantilla (D18): sin registro, una auditoría no se puede comparar con la anterior.
Revertir — borrar la carpeta y su fila del `00`.
```

```bash
pnpm check:docs
git add docs/auditorias docs/00-INDEX.md docs/07-historial.md
git commit -m "docs: audit register with the five audits so far

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
```

---

## Bloque 3 · La puerta (rama `chore/puerta-plantilla`)

```bash
git switch -c chore/puerta-plantilla
```

### Task 11: `check-docs` ve una cifra partida en dos líneas (DND-13, DND-11, DND-31)

**Files:** Modify: `scripts/check-docs.mjs`, `scripts/update-estado.mjs` (texto del bloque), `docs/00-INDEX.md`
(bloque regenerado), `docs/04-convenciones.md`, `docs/como-seguir.md`, `docs/07-historial.md`.

- [ ] **Step 1: Ver el hueco (RED)** — en `docs/02-entorno.md`, al final, añadir temporalmente estas dos
líneas (la cifra en una y la palabra en la siguiente):

```markdown
Mutación: hay 999
pruebas.
```
y correr `pnpm check:docs; echo "exit=$?"`. Expected: `sin hallazgos`, `exit=0`
(el hueco). Quitar las dos líneas **editando a mano**.

- [ ] **Step 2: El arreglo** — en `scripts/check-docs.mjs`:

Tras la línea `const COUNT_RE = /\b\d{1,5}\s+(?:\w+\s+)?(pruebas|unitarias|tests|recorridos|e2e|suites)\b/i;`:

```js

// A fenced-code delimiter line. Shared by the fence tracking below and the line-break check.
const FENCE_RE = /^\s*```/;
```

La línea `    if (/^\s*```/.test(line)) inFence = !inFence;` pasa a `    if (FENCE_RE.test(line)) inFence = !inFence;`.

Y el bloque de la comprobación 1 (desde `    // 1 — counts outside the single source` hasta su `    }`) se sustituye por:

```js
    // 1 — counts outside the single source. Also across one line break (added 2026-10-03):
    // a number at the end of a line and its word at the start of the next slipped past a
    // line-by-line test (docs/01-arquitectura.md, `pnpm catalogo:test` count). The pair is
    // reported on THIS line only when the number is here and the word on the next one; a count
    // wholly inside the next line is reported when the loop gets there.
    if (!COUNTS_EXEMPT.includes(rel)) {
      const next = lines[i + 1] ?? "";
      const pair =
        next.includes(IGNORE) || FENCE_RE.test(next) ? null : `${line} ${next.trimStart()}`;
      const split = pair ? pair.match(COUNT_RE) : null;
      const crossesBreak =
        split !== null && split.index < line.length && split.index + split[0].length > line.length;
      if (COUNT_RE.test(line) || crossesBreak) {
        const shown = (crossesBreak ? pair : line).trim().slice(0, 90);
        findings.push({
          at,
          rule: "conteo",
          msg: `un conteo de pruebas vive fuera de ${COUNTS_SOURCE}: "${shown}"`,
        });
      }
    }
```

Y la cabecera (`// Doc-lint: makes three of this project's documentation rules mechanical` …
`//   3. Backticked \`file.ext:NN\` references whose line number is past the end of the file.`) pasa a:

```js
// Doc-lint: makes six of this project's documentation rules mechanical instead of
// aspirational. Written after a session where seven documentation claims contradicted the
// code, three of them in docs/00-INDEX.md — the file CLAUDE.md tells everyone to read first.
//
// A documentation rule a machine does not check is not a rule, it is an intention.
//
// Checks:
//   1. Test counts outside their single source (docs/08-pruebas.md), also when the number and
//      its word fall on two consecutive lines.
//   2. Backticked file paths that do not exist.
//   3. Backticked `file.ext:NN` references whose line number is past the end of the file.
//   4-6. A date in the future; struck-through fichas in docs/06-pendientes.md; its "Última
//      revisión" older than its newest date (see the second pass below).
```

```bash
pnpm exec prettier --check scripts/check-docs.mjs
pnpm exec eslint scripts/check-docs.mjs
pnpm check:docs; echo "exit=$?"
```
Expected: Prettier y ESLint limpios; `check-docs: sin hallazgos.` (las dos cifras partidas que había, `01:113`
y `como-seguir.md:86`, ya las quitó la Task 3: medido en copia que eran exactamente esas dos).

- [ ] **Step 3: Verlo fallar ahora (C10)** — uno a uno, restaurando a mano cada vez:
  1. Las dos líneas del Step 1 (`Mutación: hay 999` y, en la siguiente, `pruebas.`) al final de `docs/02-entorno.md` → `conteo (1)` en `docs/02-entorno.md:<N>`, exit 1.
  2. Las mismas dos líneas al final de `docs/07-historial.md` → `sin hallazgos` (el `07` está exento de conteos).
  3. `` `apps/api/src/no-existe.ts` `` en `docs/02-entorno.md` → `ruta (1)`, exit 1.
  4. `` `apps/api/src/main.ts:99999` `` en `docs/02-entorno.md` → `línea (1)`, exit 1.
  Anotar las cuatro en el `07` (Step 6).

- [ ] **Step 4: El puntero roto del bloque generado (DND-31)** — `scripts/update-estado.mjs` remite a «la ficha
I9 de `06-pendientes.md`», que se cerró como decisión (`D-POD-4`, `docs/decisiones.md`; ficha archivada en
`_archivo/pendientes-cerrados-2026-09-10-poda.md`). Sustituir:
  - `:28` `// was worse than the gap itself. Ficha I9 of docs/06-pendientes.md carries the fix.` →
    `// was worse than the gap itself. Decision D-POD-4 (docs/decisiones.md) keeps it that way.`
  - `:199-200` las dos líneas `">   \`pnpm test\`. Ver el comentario al principio del script, y la ficha I9 de",` y
    `">   [06-pendientes.md](./06-pendientes.md). Los conteos de e2e están en",` →
    `">   \`pnpm test\`. Ver el comentario al principio del script, y la decisión D-POD-4 de",` y
    `">   [decisiones.md](./decisiones.md). Los conteos de e2e están en",`

```bash
pnpm update:estado
pnpm check:estado
grep -n "D-POD-4" docs/00-INDEX.md
```
Expected: `los dos bloques generados coinciden`; el bloque nombra `D-POD-4`.

- [ ] **Step 5: Docs del control (mentira #5)** — en `docs/04-convenciones.md`, la viñeta que empieza en
`- \`pnpm check:docs\` (\`scripts/check-docs.mjs\`) comprueba mecánicamente tres reglas de` (hasta `\`test\` a propósito: falla rápido y barato.`) pasa a:

```markdown
- `pnpm check:docs` (`scripts/check-docs.mjs`) comprueba mecánicamente seis reglas de
  documentación: conteos de pruebas escritos fuera de su fuente única (también si la cifra y la
  palabra caen en dos líneas seguidas, desde el 2026-10-03), rutas citadas entre comillas invertidas
  que no existen, `fichero:NN` con la línea fuera de rango, fechas en el futuro, fichas tachadas en
  el `06` y una «Última revisión» del `06` más vieja que su fecha más nueva. Antes de `test` a
  propósito: falla rápido y barato.
```
`docs/como-seguir.md`, fila `| **Lint de documentación con seis reglas**, incluida «ninguna fecha en el futuro» |`: queda cierta; no se toca.

- [ ] **Step 6: `07` y commit**

```markdown
## `check-docs` ve una cifra partida en dos líneas (2026-10-03) — rama `chore/puerta-plantilla`

Qué — la comprobación de conteos mira también el par «esta línea + la siguiente»; la cabecera del script y
el `04` dicen las seis reglas que tiene (decían tres). El bloque generado del `00` deja de remitir a la
ficha I9, que se cerró como decisión D-POD-4. **Visto fallar:** «hay 999 / pruebas» en `02-entorno.md` →
`conteo`; lo mismo en el `07` → nada (exento); una ruta inexistente → `ruta`; `main.ts:99999` → `línea`.
Por qué — `01-arquitectura.md` decía «47 / unitarias» con 63 reales y el control no lo veía (refutación de
la auditoría de adopción).
Revertir — `git revert <hash>`.
```

```bash
git add scripts/check-docs.mjs scripts/update-estado.mjs docs/00-INDEX.md docs/04-convenciones.md docs/07-historial.md
git commit -m "chore(check-docs): catch a count split across two lines; six rules documented

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
```

### Task 12: Prueba de arquitectura con ESLint, dentro de `verify` (DND-19)

**Files:** Modify: `eslint.config.mjs`, `docs/01-arquitectura.md`, `docs/04-convenciones.md` (B.5 regla 12
y la fila de Parte C), `docs/07-historial.md`; y solo un comentario en
`apps/web/src/features/campaigns/CampaignSettings.tsx` y su prueba (P5).

**Interfaces:** Consumes: `apps/web/**`, `apps/api/src/**/*.controller.ts`, `apps/api/src/rules/engine.ts`. Sin dependencias nuevas.

- [ ] **Step 1: El bloque** — en `eslint.config.mjs`, justo antes de `  // Formatting belongs to Prettier; this must stay last.`:

```js
  // Regla de dependencias de docs/01-arquitectura.md, comprobada por la máquina: es la prueba de
  // arquitectura de la plantilla (04 §B.5, regla 12) y corre dentro de `pnpm verify` con el
  // resto de `pnpm lint`. Tres reglas que hoy se cumplen. Lo que NO ve: `import()` dinámico, ni que
  // un fichero permitido importe a su vez uno prohibido (lo transitivo). `require()` ya lo prohíbe
  // @typescript-eslint/no-require-imports. Hoy nada cruza capas por esas vías; ficha AD-4.
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)apps/api(/|$)|(^|/)api/src(/|$)|^@dnd/api(/|$)",
              message:
                "La web nunca importa de apps/api: lo compartido vive en @dnd/shared (docs/01-arquitectura.md, «Dirección de dependencias»).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/api/src/**/*.controller.ts"],
    // Excepción declarada en docs/01-arquitectura.md: el sondeo de salud hace `SELECT 1` y es
    // el único controlador que habla con la base, a propósito (ficha D3, 2026-09-05).
    ignores: ["apps/api/src/health/health.controller.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)prisma/prisma\\.service$|^@prisma/client$",
              message:
                "Controlador → Servicio → Prisma: ningún controlador toca la base (docs/01-arquitectura.md).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/api/src/rules/engine.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)catalog(/|$)",
              message:
                "El motor no importa nada de catalog/: el catálogo conoce al motor, no al revés (docs/01-arquitectura.md, «Las tres capas de la fase 2A»).",
            },
          ],
        },
      ],
    },
  },

```
**Ojo:** la cadena del controlador lleva `\\.` (dos barras). Con una sola, ESLint marca el propio
`eslint.config.mjs` con `no-useless-escape` y `pnpm lint` cae (medido en copia).

- [ ] **Step 2: Base en verde**

```bash
pnpm lint 2>&1 | tail -3
pnpm exec prettier --check eslint.config.mjs
```
Expected: `0 errors` (los avisos de siempre); Prettier limpio (medido en copia).

- [ ] **Step 3: Verla fallar** — crear `apps/web/src/__mutacion/m.ts` con:

```ts
import { AppModule } from "../../../api/src/app.module";
import type { buildAdapter } from "../../../api/src/configure-app";
import "../../../api/src/main";
export * from "@dnd/api/src/x";
export const a = AppModule;
export type B = typeof buildAdapter;
```
y, en `apps/api/src/sessions/sessions.controller.ts`, como primera línea `import { PrismaService } from "../prisma/prisma.service";`;
y en `apps/api/src/rules/engine.ts`, como primera línea `import "./catalog";`.

```bash
pnpm exec eslint apps/web/src/__mutacion apps/api/src/sessions/sessions.controller.ts apps/api/src/rules/engine.ts 2>&1 | grep -c "no-restricted-imports"
```
Expected: `6` (cuatro en la web —import, `import type`, efecto lateral, `export *` de `@dnd/api`—, uno en el
controlador, uno en el motor). Restaurar: borrar `apps/web/src/__mutacion/` y quitar las dos líneas **a mano**;
`git status --short` sin esos ficheros. (En copia se vieron caer nueve formas, `@prisma/client` y `./catalog/index` incluidas.)

- [ ] **Step 4: `01-arquitectura.md`** — al final de la sección `## Dirección de dependencias` (antes de `## Módulos de la API`):

```markdown
**Se comprueba en `pnpm verify`**, con `no-restricted-imports` de ESLint (`eslint.config.mjs`, bloque
«Regla de dependencias»): la web no importa de `apps/api`; ningún `*.controller.ts` importa
`PrismaService` ni `@prisma/client`, salvo `apps/api/src/health/health.controller.ts`; y
`apps/api/src/rules/engine.ts` no importa nada de `catalog/` (la tercera regla está razonada en la sección
«Las tres capas de la fase 2A» de este fichero). Lo que el control no ve: `import()` dinámico, ni que un
fichero permitido importe a su vez uno prohibido; `require()` ya lo prohíbe otra regla de ESLint
(ficha AD-4 de [06-pendientes.md](./06-pendientes.md)).
```

- [ ] **Step 4b: Citas al `04` por número de línea en el código** (refutación P5; viene de la Task 7, Step 8b,
que no podía tocar código en `main`). En `apps/web/src/features/campaigns/CampaignSettings.tsx` y en
`apps/web/src/features/campaigns/__tests__/CampaignSettings.test.tsx`, sustituir `docs/04-convenciones.md:460`
por `docs/04-convenciones.md, § «Reglas de interfaz que salieron del reseño»` (solo esa cita; el resto del
comentario, igual). Comprobar:

```bash
git grep -n "04-convenciones.md:[0-9]" -- apps packages   # tiene que salir vacío
pnpm exec prettier --check apps/web/src/features/campaigns/CampaignSettings.tsx apps/web/src/features/campaigns/__tests__/CampaignSettings.test.tsx
```
Es solo un comentario: no cambia ninguna prueba ni el conteo del bloque generado.

- [ ] **Step 5: `04`** — en § *B.5*, fila 12: `techo hasta la prueba de arquitectura del plan de adopción` →
`✅ desde el 2026-10-03`; y en la tabla de Parte C, fila «Lint, incluida la prueba de arquitectura»:
`obligatorio, verde; la regla de dependencias entra con el plan de adopción` → `obligatorio, verde; incluye la regla de dependencias del 01`.

- [ ] **Step 6: `07` y commit**

```markdown
## La regla de dependencias del `01` se comprueba en `verify` (2026-10-03) — rama `chore/puerta-plantilla`

Qué — tres bloques `no-restricted-imports` en `eslint.config.mjs`: web ↛ `apps/api`; controladores ↛
`PrismaService`/`@prisma/client` (salvo `health`); motor ↛ `catalog/`. **Visto fallar** con seis
mutaciones (import, `import type`, efecto lateral y `export *` en la web; `PrismaService` en un
controlador; `./catalog` en el motor). De paso, dos comentarios de `CampaignSettings` que citaban el `04`
por número de línea (ya desplazado) lo citan por sección.
Por qué — plantilla §B.5 (12): una regla que no comprueba una máquina es una intención.
Revertir — `git revert <hash>`.
```

```bash
git add eslint.config.mjs docs/01-arquitectura.md docs/04-convenciones.md docs/07-historial.md apps/web/src/features/campaigns/CampaignSettings.tsx apps/web/src/features/campaigns/__tests__/CampaignSettings.test.tsx
git commit -m "chore(lint): the 01 dependency rule is checked in verify (no-restricted-imports)

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
```

### Task 13: CI que llama a `verify`, gancho y controles vistos fallar (DND-18, DND-27)

**Files:** Modify: `.github/workflows/ci.yml`, `docs/04-convenciones.md`, `docs/03-despliegue.md`, `docs/07-historial.md`.

- [ ] **Step 1: `.github/workflows/ci.yml`** — sustituir las líneas 1-4 (`name: CI` … `pull_request:`) por:

```yaml
name: CI
on:
  # Ramas de trabajo además de main: el repositorio no usa PR (un solo desarrollador, decisión
  # U-2 en docs/04-convenciones.md), así que sin esto una rama empujada no se probaría nunca
  # antes del merge. workflow_dispatch permite lanzarlo a mano sobre cualquier rama.
  push: { branches: [main, "fix/**", "chore/**", "docs/**"] }
  pull_request:
  workflow_dispatch:
permissions:
  contents: read
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```
y en el trabajo `test`, sustituir los pasos desde `      # Before lint on purpose: packages/shared has to be built` hasta
`      - run: pnpm test` (el comentario y los siete `run`) por:

```yaml
      # The same command the pre-commit hook runs (build first, then lint — which carries the
      # architecture rule —, format, the three doc checks and the unit suites). Its definition
      # lives in package.json, not here: two copies of the step list drift apart.
      - run: pnpm verify
```
(`e2e-browser`, igual.)

```bash
grep -c "node-version: 22" .github/workflows/ci.yml
pnpm exec prettier --check .github/workflows/ci.yml
node -e "const y=require('js-yaml');const d=y.load(require('fs').readFileSync('.github/workflows/ci.yml','utf8'));console.log(Object.keys(d.on),d.permissions,d.jobs.test.steps.map(s=>s.run||s.uses).join(' | '))"
```
Expected: `2`; Prettier limpio; `[ 'push', 'pull_request', 'workflow_dispatch' ] { contents: 'read' }` y los
pasos `… | pnpm audit --prod --audit-level=high | … | pnpm verify | pnpm --filter @dnd/api test:e2e` (validado en copia).

- [ ] **Step 2: Docs del CI** (H8)
  - `docs/04-convenciones.md`, el párrafo que empieza en `**Lo aplica \`.githooks/pre-commit\`, que bloquea el commit si \`pnpm verify\` falla.**`:
    sustituir desde la línea que termina en `**CI no` y la siguiente, que empieza por `corre exactamente lo mismo**:`,
    hasta `llegaba a \`main\` en verde.` (refutación P22), por:
    `**CI corre el mismo \`pnpm verify\`** (desde el 2026-10-03; antes repetía sus pasos uno a uno) y añade el audit de dependencias, los e2e de API y, en un trabajo aparte, los de navegador. Dentro de \`verify\`, \`pnpm build\` va **antes de \`lint\`**: \`packages/shared\` tiene que estar construido para que la API compile contra él, y un error de tipos es más barato de leer que novecientas pruebas rojas con una sola causa.`
  - `docs/03-despliegue.md`, la viñeta del CI que reescribió la Task 3: la línea que termina en
    `corre los pasos de \`pnpm verify\` —\`pnpm build\` incluido desde el` y la siguiente, que empieza por
    `2026-09-05— y los e2e de API)`, pasan a una sola: `corre \`pnpm verify\` y los e2e de API)`.

- [ ] **Step 3: Commit en la rama** (antes del clon)

```bash
git add .github/workflows/ci.yml docs/04-convenciones.md docs/03-despliegue.md
git commit -m "ci: call pnpm verify, least-privilege permissions, run on work branches and on demand

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
```

- [ ] **Step 4: El gancho en un clon limpio, sin Docker ni `.env`** (H4, H5)

```bash
docker compose stop
git clone --branch chore/puerta-plantilla . "$TEMP/dnd-clon"
(cd "$TEMP/dnd-clon" && pnpm install --frozen-lockfile && git config core.hooksPath && test ! -e apps/api/.env && pnpm --filter @dnd/api prisma:generate && pnpm verify) > "$TEMP/dnd-clon.txt" 2>&1; echo "exit=$?"
tail -3 "$TEMP/dnd-clon.txt"
rm -rf "$TEMP/dnd-clon"
docker compose start
```
Expected: `core.hooksPath` = `.githooks` (lo pone `prepare`); `exit=0` con Postgres parado y sin `.env`
(medido en copia: `verify4.log`, exit 0). **El `prisma:generate` es imprescindible:** en un clon recién
hecho `pnpm install` no genera el cliente de Prisma (pnpm ignora el script de `@prisma/engines`) y
`pnpm build` cae con cientos de `TS2339` (medido el 2026-10-03 en un clon de `dcf472b`); `generate` no
necesita base ni `.env`. Ya es un paso de `docs/02-entorno.md` («Arranque»). **El `.env` del repo no se toca.**

- [ ] **Step 5: Ver fallar el gancho** — en `apps/web/src/main.tsx`, añadir al final `const _x: number = "a";`;
`git commit -am "test: hook must block"` → bloqueado con «pnpm verify fallo. El commit se detiene.».
Quitar la línea **a mano** y comprobar `git status --short` vacío.

- [ ] **Step 6: Ver fallar los otros dos controles del gancho**
  - `check:historial`: en `scripts/check-historial.mjs`, `const LIMIT = 1000;` → `const LIMIT = 100;`;
    `pnpm check:historial; echo "exit=$?"` → exit 1 con el mensaje «Mueve las entradas más antiguas…». Restaurar a mano.
  - `check:estado`: en `docs/00-INDEX.md`, cambiar a mano un número del bloque generado; `pnpm check:estado` →
    «no coincide con lo generado». Restaurar a mano (o `pnpm update:estado`).

- [ ] **Step 7: Probar el CI** — pedir permiso para `git push -u origin chore/puerta-plantilla`. Tras el push,
mirar la pestaña Actions, o por la API pública **trabajo a trabajo** (refutación P2: la ejecución entera
sale siempre `failure` por `e2e-browser`, y eso no dice si `test` pasó):

```bash
RUN=$(curl -s "https://api.github.com/repos/JorgeForero02/DnD-Plataform/actions/runs?branch=chore/puerta-plantilla&per_page=1" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).workflow_runs[0].id))")
curl -s "https://api.github.com/repos/JorgeForero02/DnD-Plataform/actions/runs/$RUN/jobs" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>JSON.parse(s).jobs.forEach(j=>console.log(j.name,j.status,j.conclusion)))"
```
Expected: `test completed success` y `e2e-browser completed failure` (AD-1, ya conocido). Si sale
`in_progress`, esperar y repetir. Si no arranca, lanzarla a mano desde Actions (`workflow_dispatch`). Si
`test` cae, **leer el primer rojo** antes de tocar nada.

**El rojo del CI no se fabrica con un commit** (refutación P1): cualquier fallo de `verify` lo para antes el
gancho de pre-commit, y saltárselo está prohibido. Que el CI informa en rojo ya está visto: `e2e-browser`
falla en cada ejecución (AD-1). Que el trabajo `test` cae cuando `verify` cae es consecuencia de que llama
al mismo comando, y el gancho se vio fallar en el Step 5. Se anota así en el `07`; **no se crea ninguna rama
desechable** para esto.

- [ ] **Step 8: `07`, commit, merge y entrega**

```markdown
## CI con `verify`, permisos mínimos y ramas de trabajo; controles vistos fallar (2026-10-03) — rama `chore/puerta-plantilla`

Qué — el trabajo `test` del CI llama a `pnpm verify` en vez de repetir sus pasos; `permissions: contents:
read`; se dispara en `main`, `fix/**`, `chore/**`, `docs/**`, en PR y a mano; `concurrency`. **Visto:** el
gancho pasa en un clon sin Docker ni `.env`; bloquea un commit con un error de tipos; `check:historial` con
`LIMIT` a 100 y `check:estado` con un número tocado fallan; el CI de la rama: `test` en verde,
`e2e-browser` en rojo (AD-1), leído trabajo a trabajo. El rojo de `test` no se fabricó: un commit que
rompa `verify` no pasa el gancho, y saltárselo está prohibido; `test` llama al mismo comando que el
gancho, que sí se vio fallar.
Por qué — plantilla (C3, C10): el CI llama al mismo comando que el gancho, y cada control se ve fallar.
Revertir — `git revert -m 1 <hash del merge>`.
```

```bash
git add docs/07-historial.md
git commit -m "docs: CI, hook and controls seen failing

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
git switch main
git merge --no-ff chore/puerta-plantilla -m "Merge chore/puerta-plantilla

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
pnpm update:estado        # refutación P23: el bloque del 00 dice la rama donde se generó
git diff --stat docs/00-INDEX.md
```
Si el diff solo cambia rama y commit del bloque generado: `git add docs/00-INDEX.md && git commit -m "docs: regenerate the 00 status block on main"`
(con la atribución). Push con permiso. No cambia nada que vea el usuario final: no hace falta desplegar.

### Task 14: `.gitignore` y reglas por stack en `.claude/rules/` (DND-14, DND-15; ⚑ DP-6)

**Rama:** `chore/reglas-stack`.

**Files:** Modify: `.gitignore`, `docs/04-convenciones.md`, `docs/07-historial.md`;
Create: `.claude/rules/frontend-react.md`, `.claude/rules/backend-nestjs.md`; y (⚑ DP-6) añade al
índice `.claude/agents/*.md` y `.claude/skills/*/SKILL.md`.

- [ ] **Step 1: Leer lo que pasaría a versionarse** (no se publica nada sin leerlo)

```bash
git switch -c chore/reglas-stack
ls -la .claude .claude/agents .claude/skills/*
grep -l -i -E "password|secret|token|api[_-]?key" .claude/agents/*.md .claude/skills/*/SKILL.md
```
Leer los cinco ficheros enteros. Expected: ninguno con secretos. Si el usuario dijo **no** a DP-6, en el Step 2
se añaden también `.claude/agents/` y `.claude/skills/` al ignore.

- [ ] **Step 2: `.gitignore`** — sustituir la línea `.claude/` (y solo esa; el comentario de encima se queda) por:

```gitignore
.claude/worktrees/
.claude/settings.local.json
.claude/settings.local.json.bak.*
```
y añadir al final:

```gitignore

# Secretos con otros nombres: solo el ejemplo viaja con el repositorio (la lectura por agentes
# no se bloquea: decisión U-1 en docs/04-convenciones.md).
.env.*
!.env.example
*.pem
*.key
```

```bash
git check-ignore -v .claude/settings.local.json .claude/settings.local.json.bak.2026-09-08 .claude/worktrees/c6 .env.local apps/api/.env x.pem
git check-ignore -v .claude/rules/frontend-react.md .env.example; echo "exit=$? (1 = ninguno ignorado, correcto)"
git ls-files | grep -E "(^|/)\.env" 
git status --short --ignored=no | head
```
Expected: los seis primeros ignorados; los dos siguientes **no** (exit 1); `git ls-files` solo
`.env.example`; `git status` muestra `.claude/agents/`, `.claude/skills/` (si DP-6 = sí) y `.gitignore`.
`pnpm format:check` y `pnpm lint` siguen limpios (Prettier lee `.gitignore`; los `.md` están fuera de
Prettier y ESLint ya ignora `.claude/worktrees/**`).

- [ ] **Step 3: `.claude/rules/frontend-react.md`**

```markdown
---
paths:
  - "apps/web/**/*.{ts,tsx}"
---
# Frontend React + TypeScript (`apps/web`)

Versiones del repo (2026-10-03): React 18.3, Vite 5, TanStack Query 5, Zustand 4, React Router 6,
react-hook-form 7 + Zod 3, Vitest 2 + Testing Library, Playwright. La regla de la plantilla está escrita
para React 19 + React Compiler: **lo de la v19 no aplica hasta actualizar**. Las marcadas *(comunidad)*
son práctica extendida; las *(decisión del repo)* mandan aquí. Si algo choca con
`docs/04-convenciones.md`, manda el `04`.

- **Respeta las Rules of React** (componentes y hooks puros). React Compiler **no** está activado (React
  18): no se quitan `useMemo`/`useCallback` existentes sin medir. [1]
- **El estado derivado se calcula durante el render**, no en un `useEffect`. [2]
- **Datos del servidor con TanStack Query**, no con `useEffect` + `fetch`; **no se copian a Zustand**:
  servidor y cliente se llevan por separado. [3] [4]
- Formularios con react-hook-form + `zodResolver` y **el esquema de `@dnd/shared`**: la forma de los
  datos vive una sola vez (`CLAUDE.md`). [5] *(decisión del repo)*
- Estructura `src/features/<feature>/` (`docs/01-arquitectura.md`, «Estructura de la web»). *(decisión del repo)*
- Estados de carga, **error** y vacío en cada vista: un error no se pinta como «no hay datos». *(comunidad)*
- **La lógica de dominio no se recalcula en la vista**: la hoja se deriva en la API (`apps/api/src/rules/`)
  y la pantalla pinta la traza. *(decisión del repo)*
- **Un botón se muestra según el permiso de la ruta que llama**; ocultarlo es experiencia de usuario, **el
  servidor autoriza**. [6]
- Las variables `VITE_*` van en el bundle: **nunca secretos**. [7]
- Accesibilidad con objetivo WCAG 2.2 AA, HTML semántico antes que ARIA, foco visible. Y **las reglas de
  interfaz vinculantes del `04`** (iconos dibujados, radios con explicación, lo maquetado se mide en el
  navegador). [8]
- Pruebas: Testing Library por rol (`getByRole` primero); los espías sobre el módulo de api siguen la
  trampa documentada en el `04` («un espía sobre un espacio de nombres…»); **lo que solo existe maquetado
  se prueba con Playwright** y medidas numéricas, porque `jsdom` no maqueta. [9]
- **La regla de dependencias del `01`** (la web no importa de `apps/api`) se comprueba en `verify` con
  `no-restricted-imports` de ESLint (`eslint.config.mjs`). [10]

Fuentes ([1]–[9] consultadas el 2026-10-01 para la plantilla `a78a535`; [10] el @@FECHA@@):
[1] https://react.dev/reference/rules
[2] https://react.dev/learn/you-might-not-need-an-effect
[3] https://react.dev/reference/react/useEffect
[4] https://tanstack.com/query/latest/docs/framework/react/overview
[5] https://github.com/react-hook-form/resolvers
[6] https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
[7] https://vite.dev/guide/env-and-mode
[8] https://www.w3.org/WAI/standards-guidelines/wcag/ · https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/
[9] https://testing-library.com/docs/queries/about/ · https://playwright.dev/docs/best-practices
[10] https://eslint.org/docs/latest/rules/no-restricted-imports
```

- [ ] **Step 4: `.claude/rules/backend-nestjs.md`**

```markdown
---
paths:
  - "apps/api/**/*.ts"
  - "apps/api/prisma/**"
---
# Backend NestJS + Fastify + Prisma (`apps/api`)

Versiones del repo (2026-10-03): NestJS 11 (`@nestjs/platform-fastify` 11.2.x, con `fastify` 5.12 forzado
por un `override`, ficha AD-2), Prisma 5, Jest 29 + Supertest, Zod 3. La regla de la plantilla describe
Nest 12 y Prisma 7: **no aplica hasta actualizar**. *(comunidad)* = práctica extendida; *(decisión del
repo)* = manda aquí. Si algo choca con `docs/04-convenciones.md`, manda el `04`.

- Módulos por dominio en `src/<dominio>/` (`docs/01-arquitectura.md`, «Módulos de la API»), controladores
  delgados y **un dueño por concepto** (`MembershipService`, `canView`). *(decisión del repo)*
- **Sobre Fastify, nada de paquetes ni middleware de Express**: los equivalentes `@fastify/*`. [1]
- **Validación con Zod desde `@dnd/shared` y `ZodValidationPipe`**, no `ValidationPipe` con
  `class-validator` (excepción declarada en el `04`). [2] *(decisión del repo)*
- Autenticación con guard (`JwtAuthGuard`); **autorización por objeto en el servicio, después de cargar el
  registro**, con su e2e «A contra recurso de B». [3] [4]
- Cabeceras con `@fastify/helmet` registrado en `configureApp`; **sin CORS por diseño** (mismo origen por
  nginx), `CORS_ORIGIN` solo como escape en desarrollo. [5] [6]
- Errores con excepciones de Nest; nunca el stack al cliente. [7] [8]
- Prisma: el esquema cambia **solo por migración** (`prisma migrate dev` en local, `migrate deploy` en el
  `CMD` de la imagen); `db push` nunca contra una base con datos. [9] Escrituras múltiples en una
  transacción (`PrismaService.transaction`, `01`). [10] SQL crudo **solo** con `$queryRaw` de plantilla
  etiquetada; `$queryRawUnsafe`/`$executeRawUnsafe`, prohibidos. [11]
- Límite de intentos con `@nestjs/throttler` (`UserOrIpThrottlerGuard`); detrás de proxy, `trustProxy` por
  **saltos, como función** ([ADR 0001](../../docs/adr/0001-trust-proxy-por-saltos.md)) — nunca `true`. [12] [13]
- Pruebas: Jest y Supertest; los e2e contra el Postgres real (`pnpm --filter @dnd/api test:e2e`). [14]
- **La regla de dependencias del `01`** (controlador ↛ Prisma salvo `health`; motor ↛ `catalog/`) se
  comprueba en `verify` con `no-restricted-imports` de ESLint. [15]

Fuentes ([1], [3]–[10], [12], [14] consultadas el 2026-10-01 para la plantilla `a78a535`; [2], [11], [13], [15] el @@FECHA@@):
[1] https://docs.nestjs.com/techniques/performance
[2] https://docs.nestjs.com/pipes#schema-based-validation
[3] https://docs.nestjs.com/security/authentication
[4] https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
[5] https://docs.nestjs.com/security/helmet
[6] https://docs.nestjs.com/security/cors
[7] https://docs.nestjs.com/exception-filters
[8] https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html
[9] https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production
[10] https://www.prisma.io/docs/orm/fundamentals/transactions
[11] https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries
[12] https://docs.nestjs.com/security/rate-limiting
[13] https://fastify.dev/docs/latest/Reference/Server/#trustproxy
[14] https://docs.nestjs.com/fundamentals/testing
[15] https://eslint.org/docs/latest/rules/no-restricted-imports
```

- [ ] **Step 5: Contrastar las fuentes nuevas y poner la fecha** — abrir [10] de React y [2], [11], [13], [15]
de Nest (WebFetch o navegador) y comprobar que dicen lo que la regla les atribuye (esquemas con Zod en los
pipes de Nest; `$queryRaw` etiquetado y el riesgo de `$queryRawUnsafe`; `trustProxy` acepta función; los
`patterns` de `no-restricted-imports`). **Si una no lo dice, se quita la viñeta o se marca *(comunidad)*.**
Luego:

```bash
sed -i "s/@@FECHA@@/$(date +%F)/" .claude/rules/frontend-react.md .claude/rules/backend-nestjs.md
grep -c "@@FECHA@@" .claude/rules/*.md
```
Expected: `0` en los dos.

- [ ] **Step 6: Que se carguen** (refutación P25: un agente no abre sesiones) — **lo comprueba el autor**: en
una sesión nueva de Claude Code, pedir «lee `apps/web/src/main.tsx` y cita la primera viñeta de la regla
de React que tengas cargada»; debe citar la primera viñeta de `.claude/rules/frontend-react.md`. Lo mismo
con `apps/api/src/main.ts` y la regla de NestJS, y con `apps/api/prisma/schema.prisma` (la regla del backend
también se carga ahí, refutación P24). La plantilla (`rules/README.md`) avisa: «un `paths:` que no casa con
nada hace que la regla no se cargue nunca». Se anota en el `07` lo que conteste el autor; si no lo ha
comprobado, se escribe «carga sin comprobar», no se da por buena.

- [ ] **Step 7: `04`, `07`, commit y merge** — en `docs/04-convenciones.md`, tabla «Dónde está cada parte de la
plantilla», fila nueva: `| Reglas por stack | \`.claude/rules/frontend-react.md\` y \`.claude/rules/backend-nestjs.md\` (se cargan por \`paths:\`) |`.

```markdown
## `.claude/` viaja con el repositorio: reglas por stack (2026-10-03) — rama `chore/reglas-stack`

Qué — `.gitignore` deja de ignorar `.claude/` entero (solo `settings.local.json*` y `worktrees/`) y añade
`.env.*` con `!.env.example`, `*.pem` y `*.key`. Nacen `.claude/rules/frontend-react.md` y
`backend-nestjs.md` (Prisma dentro), ajustadas a React 18 / Nest 11 / Prisma 5 y con fuentes oficiales;
viajan también `.claude/agents/` y `.claude/skills/` (decisión DP-6), leídos antes. Se comprobó que cada
regla se carga al abrir un fichero de su `paths:`.
Por qué — plantilla (R4, R6).
Revertir — `git revert -m 1 <hash del merge>`.
```

```bash
git add .gitignore .claude/rules .claude/agents .claude/skills docs/04-convenciones.md docs/07-historial.md
git commit -m "chore(agents): version .claude/rules (React, NestJS+Prisma), agents and skills; ignore other secret files

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
git switch main
git merge --no-ff chore/reglas-stack -m "Merge chore/reglas-stack

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
```
(Si DP-6 = no, quitar `.claude/agents .claude/skills` del `git add` y del texto del `07`.)

---

## Bloque 4 · Cierre

### Task 15: Banco «después» y el plan del triaje del `06` (DND-20, DND-28)

**Files:** Modify: `docs/10-banco-de-tareas.md`, `docs/07-historial.md`;
Create: `docs/superpowers/plans/<fecha>-triaje-06.md`, con `<fecha>` = `date +%F` del día en que se escribe.

- [ ] **Step 1: Banco «después»** — si en la Task 5 el usuario aprobó, repetir T1–T4 igual: mismo coste,
**volver a pedir permiso antes de la tanda** (DP-9, spec §4.1), las sesiones las abre el autor de una en una
y puntúa él (refutación P11; mismos worktrees y `.env` que en la Task 5, Step 3) y añadir la fila `| <fecha> | Después de adoptar la plantilla | … |` con la diferencia contra la de
«antes» en «Qué se aprendió». Si lo aplazó, no se corre.

- [ ] **Step 2: Medir el `06` por sección**

```bash
grep -n "^## \|^### " docs/06-pendientes.md > "$TEMP/dnd-06-secciones.txt"; wc -l "$TEMP/dnd-06-secciones.txt" docs/06-pendientes.md
grep -n -i "cerrada\|hechas\|hecho el" "$TEMP/dnd-06-secciones.txt"
```

- [ ] **Step 3: Escribir el plan del triaje** con la skill `superpowers:writing-plans`, en
`docs/superpowers/plans/$(date +%F)-triaje-06.md`, sobre §A.4 del `04`: bloques de ~400 líneas, **un agente de
solo lectura por bloque, de uno en uno**, evidencia por punto (abierto / resuelto con commit / descartado con
motivo); quien orquesta verifica cada cierre; áreas propuestas **LEGAL** (las `CL-n` casi tal cual) ·
**SEG** · **MESA** (combate, iniciativa, turnos) · **HOJA** (derivación, conjuros, inventario) · **MUNDO**
(fichas, visibilidad, PNJ) · **UI** · **DEP** (despliegue, CI) · **TEST** · **DOC** · **Q** (preguntas al
autor); los IDs con prioridad (`P1`…`P4`) se renumeran con tabla de equivalencias; copia literal del tablero
viejo a `_archivo/`; cerradas a `_archivo/pendientes-cerrados-<fecha>.md`; sección «No re-abrir»; la
excepción «`06` sin A.4» del `04` se borra al terminar. **Dar al usuario el número de agentes antes de lanzar nada.**

- [ ] **Step 4: Commit del plan** (docs, `main`) y pedir revisión al usuario

```bash
git add docs/superpowers/plans/ docs/10-banco-de-tareas.md docs/07-historial.md
git commit -m "docs: plan for the full triage of 06 (A.4 areas)

Co-Authored-By: <MODELO> <noreply@anthropic.com>"
```
(`07`: una entrada corta «Plan del triaje del `06` escrito; banco después: <resultado o aplazado>».)

---

## Al terminar

- [ ] `pnpm verify` exit 0, `git status` limpio y `pnpm audit --prod --audit-level=high` exit 0.
- [ ] Push de `main` con permiso; recordar al usuario la copia de la base y el humo de la Task 1 Step 16 si
      aún no desplegó, y la entrada del `07` del Step 17 si ya lo hizo.
- [ ] Preguntar al usuario si quiere declarar **N2** (cobertura con umbral) (refutación P27: el spec lo dejó
      en N1 sin pasarlo por las decisiones). Hasta que conteste, el `04` dice «N2 no declarado, pendiente de
      decisión del autor» (Task 7, Step 2).
- [ ] Actualizar `C:\Users\gogam\Desktop\Trabajo\Auditoria plantilla 2026-10-03\ESTADO-Y-ACCIONES.md` §5:
      qué `DND-nn` quedó hecho y con qué commit.
- [ ] Proponer al usuario, para la plantilla (no para este repo): la comprobación de conteos de
      `check-docs` a través de saltos de línea (Task 11) y el aviso de `trustProxy` numérico con
      `fastify` ≥ 5.12.1 en `plantillas/rules/backend-nestjs.md`.

## Matriz DND → tarea

| DND | Tarea | DND | Tarea | DND | Tarea |
|---|---|---|---|---|---|
| 01 | T1 | 12 | T7 | 23 | T8 |
| 02 | T1 | 13 | T11 | 24 | T7 |
| 03 | T1 | 14 | T14 | 25 | T6 |
| 04 | T1 | 15 | T14 | 26 | T2 |
| 05 | T3 | 16 | T8 | 27 | T11, T12, T13 |
| 06 | T3 | 17 | T7 | 28 | T15 |
| 07 | T3 | 18 | T13 | 29 | T4 |
| 08 | T3 | 19 | T12 | 30 | T7 (excepción D-POD-4) |
| 09 | T3, T13 | 20 | T5, T15 | 31 | T11 |
| 10 | T3 | 21 | T9 | | |
| 11 | T11 | 22 | T10 | | |
