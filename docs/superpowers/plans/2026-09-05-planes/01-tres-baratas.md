# Plan 01 · Las tres baratas (D-OP-16)

**Objetivo en una frase:** que la imagen de producción no se construya sin TipTap el día que alguien
lo importe desde `src/`, que CI se entere si el build se rompe, y que muera una referencia muerta.

**Tamaño:** un commit. **Dependencias:** ninguna. **Va primero** porque el fallo de TipTap **solo
aparece en producción**: en local funciona siempre.

---

## 1 · TipTap pasa a `dependencies`

**El defecto, verificado:** los seis paquetes están en `devDependencies` de `apps/web/package.json`
(líneas 31-36) y su **único consumidor hoy es `scripts/e0-tiptap-roundtrip.mjs`**, un script. Por eso
no se nota. **El día que el editor de documentos los importe desde `apps/web/src/`**, `pnpm install
--prod` (o cualquier build que omita las de desarrollo) los dejará fuera y **la imagen de producción
se construirá sin ellos**. Falla en el despliegue, no en la máquina de nadie.

**Qué hacer.** Mover estos seis de `devDependencies` a `dependencies` en `apps/web/package.json`:

```
@tiptap/core  @tiptap/extension-image  @tiptap/extension-list
@tiptap/extension-table  @tiptap/markdown  @tiptap/starter-kit
```

Mantener las versiones **exactamente como están** (`^3.31.0`). Después: `pnpm install` y
**comprobar que `pnpm-lock.yaml` cambia** — si no cambia, el movimiento no se ha aplicado donde
crees.

## 2 · CI ejecuta `pnpm build`

**El defecto, verificado:** el job de `.github/workflows/` corre `pnpm audit`, `prisma:generate`,
`migrate deploy`, `lint`, `format:check`, `check:docs`, `check:estado`, `check:historial`, `test` y
`test:e2e` — **y no `build`**. Un fallo de compilación de TypeScript que las pruebas no toquen
llega a `main` verde.

**Qué hacer.** Añadir `- run: pnpm build` **antes de `pnpm lint`** (línea ~44). Antes y no después,
por dos motivos: `packages/shared` tiene que estar construido para que la API compile contra él, y
un error de tipos es más barato de leer que 900 pruebas rojas por la misma causa.

## 3 · Fuera `lychee`

**El estado real, verificado:** `lychee` **no está enganchado a nada**. Sus únicas menciones vivas
están en `.superpowers/sdd/2026-09-01-.../task-antideriva-*.md`, que son **informes fechados de una
tarea pasada** — o sea, historia, no configuración.

**Qué hacer.** Comprobar de nuevo antes de tocar:

```bash
grep -rn "lychee" --include="*.yml" --include="*.yaml" --include="*.json" \
     --include="*.toml" --include="*.mjs" . | grep -v node_modules | grep -v "\.superpowers/"
```

- **Si no devuelve nada** (lo esperado): no hay nada que borrar. **La tarea es documental**: se
  anota que la ficha se cierra porque *no existía la integración*, no porque se haya quitado. Decirlo
  con esas palabras importa: la ficha decía «retirar `lychee`» y la verdad es que nunca llegó.
- **Si devuelve algo**: retirarlo, y que el commit diga qué era.

**No toques los ficheros de `.superpowers/`**: son registro fechado y se conservan aunque hayan
caducado.

---

## Pruebas

**No se escribe ninguna prueba nueva**, y es a propósito: no hay comportamiento nuevo. Lo que hay es
**una comprobación de que el arreglo hace algo**:

1. `pnpm install` y `git diff pnpm-lock.yaml` → **tiene que haber cambios**.
2. `pnpm build` desde limpio → verde.
3. `pnpm verify` entero → verde.

**Mutación (obligatoria).** Para demostrar que el paso 2 sirve de algo, **rompe el build a
propósito** —una línea con un tipo imposible en `apps/web/src`— y comprueba que **`pnpm build`
falla**. Deshaz. Si el build no cae, el `- run: pnpm build` no está donde crees.

## Guía de revisión

- [ ] Los **seis** paquetes están en `dependencies`, ninguno se quedó atrás, y **ninguna versión
      cambió**.
- [ ] `pnpm-lock.yaml` **cambió** y está commiteado.
- [ ] `pnpm build` está en el workflow **antes de `pnpm lint`**, y solo una vez.
- [ ] La mutación demostró que un error de compilación tumba el build.
- [ ] El commit dice de `lychee` **la verdad medida**: si no había integración, que no la había.
- [ ] `pnpm verify` en verde, con el gancho corriendo (no `--no-verify`).
- [ ] `docs/06-pendientes.md` **sin tocar**; lo cerrado se anota en el maestro.

## Trampas

- **`pnpm install` puede tocar más de lo que crees.** Revisa el diff del lockfile antes de
  commitear: si aparecen versiones nuevas de cosas que no has movido, algo se ha actualizado de más.
- **No añadas `--prod` a ningún script para "probar"** el fallo de TipTap: se prueba moviendo el
  paquete, no cambiando cómo instala el proyecto.
- El repositorio tiene `check:estado` y `check:historial` en `verify`: si tocas `docs/`, regenera con
  `pnpm update:estado` antes de commitear o el gancho te para.

## Commit

```
chore: move TipTap to dependencies, build in CI, and close the lychee ficha

The six TipTap packages sat in devDependencies with a single consumer — a
script — so nothing broke locally and nothing would have broken until the
document editor imported them from src/, at which point the production image
would build without them. That is a failure that only ever appears in
production.

CI ran lint, format, the doc checks, the unit suites and the API e2e, but never
`pnpm build`, so a type error the tests did not touch reached main green. It now
runs before lint: shared has to be built for the API to compile against it, and
one type error is cheaper to read than nine hundred red tests with one cause.

lychee: <lo que la medición diga, con esas palabras>
```

## Definición de terminado

`pnpm verify` en verde con el gancho, lockfile commiteado, la mutación probada y deshecha, y la
línea correspondiente anotada en `Mine/pendientes-maestro-2026-09-04.md`.


---

## Avance — lo escribe quien ejecuta este plan

> **Obligatorio, y se escribe MIENTRAS se trabaja, no al final.** Si la sesión se queda sin contexto
> o muere, **esto y el prompt de arranque son lo único que sabe la siguiente**. Una línea por paso,
> con su commit. Nada de memoria: `fichero:línea` o no cuenta.

| Estado | Cuándo | Qué |
|---|---|---|
| ✅ hecho | 2026-09-05 | **Paso 1 · TipTap.** Los seis paquetes en `dependencies` de `apps/web/package.json:19-24`, versiones intactas (`^3.31.0`). `pnpm install` movió las seis entradas dentro de `pnpm-lock.yaml` y **nada más**: el diff son 18 líneas añadidas y 18 quitadas, sin versión nueva de nada |
| ✅ hecho | 2026-09-05 | **Paso 2 · CI.** `- run: pnpm build` en `.github/workflows/ci.yml:47`, **antes de `pnpm lint`** (línea 48), con el comentario que dice por qué va antes. Una sola vez en el fichero |
| ✅ hecho | 2026-09-05 | **Paso 3 · lychee.** El barrido del plan (`*.yml`, `*.yaml`, `*.json`, `*.toml`, `*.mjs`, sin `node_modules/` ni `.superpowers/`) **devuelve cero líneas**. No había integración que retirar |
| ✅ hecho | 2026-09-05 | **Mutación.** `const __mutacion: number = "no soy un número";` al final de `apps/web/src/main.tsx` → `pnpm build` cae con `src/main.tsx(30,7): error TS2322: Type 'string' is not assignable to type 'number'.` y salida **2**. Deshecha (`git diff apps/web/src/main.tsx` vacío) |
| ✅ hecho | 2026-09-05 | **Documentación.** Tres fichas tachadas en `docs/06-pendientes.md` (TipTap, `pnpm build` en CI, `lychee`) con fecha y `fichero:línea`; corregido `docs/04-convenciones.md`, que afirmaba que CI **no** llama a `pnpm build`; entrada nueva en `docs/07-historial.md` |
| ✅ hecho | 2026-09-05 | **`pnpm verify` en verde, salida 0**, con el gancho de pre-commit corriendo. Commit `fbc5d99` |

**Leyenda:** ⬜ sin empezar · 🟨 en marcha · ✅ hecho · ⛔ bloqueado (di por qué y qué descartaste).

**Lo que decidí por los cuatro pasos** (qué no cuadraba · qué elegí · por qué es duradero · la
fuente si la hubo):

- **Paso 1 — la ficha condicionaba el arreglo a un futuro que nadie iba a vigilar.** Decía «E1 tiene
  que moverlas **en cuanto las importe desde `src/`**». Eso es un recordatorio, no una protección:
  quien escriba ese `import` no va a leer esta ficha. Se movieron **ya**, sin esperar al consumidor.
  Dura porque el paquete queda en el sitio correcto para siempre y no hay que acordarse de nada.
  (Paso 1 de los cuatro: cambio pequeño, alineado con el código, sin frente nuevo.)
- **Paso 3 — la ficha pedía «retirar `lychee`» y no había nada que retirar.** El barrido no encuentra
  ninguna mención viva. Se cierra **diciendo la verdad medida** —la integración nunca llegó a
  existir— en vez de escribir «retirado», que sería un registro falso. Lo que sí se conserva de la
  ficha es la parte que sigue siendo cierta y útil: `lychee` **no** sustituiría a
  `scripts/check-docs.mjs`, porque miran cosas distintas.
- **Fuera del plan, pero obligado por él: `docs/04-convenciones.md` mentía en cuanto se tocó CI.**
  Sus líneas sobre el nivel N1 decían «**no llama a `pnpm build`** — hueco real, sin ficha todavía».
  Arreglar el hueco y dejar la frase habría creado exactamente el fallo que ese documento persigue
  (documentación que miente es peor que ausente), así que se corrigió en el mismo commit.
- **`docs/06-pendientes.md` SÍ se tocó**, contra la regla 6 del índice de planes: el autor levantó esa
  restricción el 2026-09-05 y el prompt de la noche la sustituye por «cada plan que cierre una ficha
  la tacha, con fecha y `fichero:línea`, y lo tachado no se borra». Precedencia: instrucción del
  usuario > documento.

**Lo siguiente exacto, si me quedo aquí:**

- **Nada de este plan. Está cerrado.** Lo siguiente es el **plan 02** (`02-tres-columnas.md`), que no
  depende de este.
