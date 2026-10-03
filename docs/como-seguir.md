# Cómo seguir

**Para quien abre este repositorio y no sabe por dónde entrar** — persona o agente. Dice **qué ya
está puesto** (para que nadie lo vuelva a montar), **qué sigue** y en qué orden, y **qué no decide
un agente**.

No es un plan de producto: el alcance por fases vive en `docs/superpowers/plans/` —al que **se
entra por [decisiones.md](./decisiones.md)**, una línea por decisión, y no releyéndolo entero— y lo
abierto en [06-pendientes.md](./06-pendientes.md).
Esto es el estado del **andamiaje**: la puerta, las reglas y el sistema de agentes.

*(Hasta el 2026-09-08 la línea de arriba enlazaba a `superpowers/README.md`, que **no existe**: el protocolo lo pide como índice por fecha, aquí nunca se escribió, y en su lugar se decidió `decisiones.md`. Que el fichero no exista es el punto de esta frase, de ahí el escape del lint.)* <!-- docs-lint-ignore -->

> **Si esta página y el repositorio discrepan, manda el repositorio.** Aquí no se escribe estado
> que una máquina pueda medir — esa es la regla que `CLAUDE.md` estrenó el 2026-09-06.

---

## Ya está puesto — no hace falta volver a montarlo

| Qué | Dónde se comprueba |
|---|---|
| **Puerta de siete pasos** en `pnpm verify`, en el gancho de pre-commit y en CI | [04-convenciones.md](./04-convenciones.md), § *Nivel de verificación* |
| **Conteos generados**, y un control que falla si alguien los edita a mano | `scripts/update-estado.mjs`, `pnpm check:estado` |
| **Lint de documentación con seis reglas**, incluida «ninguna fecha en el futuro» | `scripts/check-docs.mjs` |
| **Tipos comodín en error**, con el techo en cero | `eslint.config.mjs` |
| **Los cuatro pasos antes de abrir una ficha**, con su frontera de cuatro casos | [04-convenciones.md](./04-convenciones.md) |
| **Frontera del encargo de ficheros *y* de herramientas**, por rol, y comprobada al cerrar la tanda | [04-convenciones.md](./04-convenciones.md), § *Trabajo con varios agentes a la vez* |
| **Tabla de observabilidad de la tanda** en el ledger | Ídem |
| **Banco de tres tareas-tipo** para medir el proceso | [10-banco-de-tareas.md](./10-banco-de-tareas.md) |
| **Prompts que sirven cualquier día** | [prompts.md](./prompts.md) |

## Qué sigue, en este orden

> **Decisión del autor, 2026-09-18 (madrugada, al cerrar la noche):** *«con esta beta se puede
> jugar; aplazaré 3B por un buen tiempo y solo pediré solucionar errores».* Así que **lo que
> sigue es JUGAR con la beta 0.1.0** (`v0.1.0-beta`, desplegada el 2026-09-18 como `a0020a6` con la demo nueva
> sembrada, DM = la cuenta del autor) y **arreglar lo que salga**: cada fallo es una ficha en
> [06-pendientes.md](./06-pendientes.md) con su medida, y se cierra con los cuatro pasos de
> `04-convenciones.md`. **3B queda aplazada sin fecha** (bloques en
> [Paso 3 en dos partes](./superpowers/plans/2026-09-14-paso-3-en-cinco-tandas.md) § Parte B). El
> Paso 4 (`partida.spec.ts`, guion en
> [2026-09-18-paso-4-la-partida.md](./superpowers/notes/2026-09-18-paso-4-la-partida.md)) sigue
> disponible como prueba de regresión si algún día se quiere; no bloquea nada. D-CF-161.

### 0 · Lo que se cerró hasta la beta

La crónica tanda a tanda —hoja a página completa, pulido, reglas de la mesa, desbordes, puerta de
efectos, PNJ del mundo y la mesa, 3A.1, 3A.2 y 3A.3— está entera en
[_archivo/como-seguir-cronica-2026-09-12-a-2026-09-18.md](./_archivo/como-seguir-cronica-2026-09-12-a-2026-09-18.md).
Qué sirve producción **se mide** (comando en [00-INDEX.md](./00-INDEX.md)); la última medición
fechada está en [07-historial.md](./07-historial.md).

### 1 · Terminar la poda del tablero — **lo mecánico ya está; queda lo del autor**

El 2026-09-06 salieron las tres fichas que llevaban «Cerrado» en su propio título, y **el
2026-09-10 salieron treinta y nueve bloques más** —falsas, tachadas y decisiones disfrazadas de
deuda— con los cuatro pasos de [04-convenciones.md](./04-convenciones.md) delante
([`_archivo/pendientes-cerrados-2026-09-10-poda.md`](./_archivo/pendientes-cerrados-2026-09-10-poda.md)).
**Lo que queda no es mecánico**: las secciones que sobreviven son migraciones, decisiones de
producto y lo que solo se juzga jugando, y cada una lleva ya su medición en el 06 para que el
autor decida sin volver al código.

**Cómo se hace, cuando se haga:**

- Se decide **por sección entera**, no por línea.
- Lo que salga se mueve **entero y sin resumir** a `_archivo/`, con su fila en el README de ahí.
  Archivar no es reescribir: varias de esas fichas explican una afirmación que resultó falsa, y
  ese registro es lo que evita volver a creérsela.
- Una sección **sin fecha en el título** es el peor caso: antes de decidir, se le pone la fecha
  que diga `git log` de cuando entró.

### 2 · Volver a correr el banco al cambiar el proceso

Se estrenó el 2026-09-07 y pasó 3 de 3 ([10-banco-de-tareas.md](./10-banco-de-tareas.md),
«Historial de corridas»). Toca otra vez antes y después de cada cambio de `CLAUDE.md`, de una regla
del `04`, de una skill o del modelo; la adopción de la plantilla del 2026-10-03 es uno de esos cambios.

Se corre como dice [prompts.md](./prompts.md) §2 — **pegando solo el enunciado**, en sesión
limpia, sin avisar de que es una prueba.

### 3 · Estrenar la tabla de observabilidad en la próxima tanda

La plantilla está en [04-convenciones.md](./04-convenciones.md). La primera tanda que la use dirá
más que cualquier regla nueva: **dos vueltas o más señalan un encargo malo, no un agente malo.**

### 4 · Lo de siempre, que no es de andamiaje

La partida de prueba con dos cuentas (`D-OP-3`), y lo que el tablero diga que duele.

## Lo que un agente no decide

- **Cuándo se despliega.** El despliegue es manual y lo lanza el autor
  ([03-despliegue.md](./03-despliegue.md)); esa decisión existe porque las migraciones corren
  solas al arrancar el contenedor.
- **Qué ficha del tablero sigue viva.** Ver el punto 1.
- **Qué regla ya no sirve.** Una regla se archiva con su motivo original intacto, y saber cuál
  lleva meses sin que nadie la incumpla ni la consulte no se deduce del código.
- **Rediseñar una decisión ya tomada.** Se cumple y se anota el desacuerdo.

## Si vas a cambiar cómo se trabaja

Cualquier cambio a `CLAUDE.md`, a una regla de [04-convenciones.md](./04-convenciones.md), a una
skill o al modelo: **se corre el banco antes y después**
([10-banco-de-tareas.md](./10-banco-de-tareas.md)). Es la diferencia entre saber que una regla
sirve y creerlo.
