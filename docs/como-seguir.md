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

### 0 · La hoja a página completa — **hecha en local el 2026-09-12, sin fusionar ni desplegar**

Las once tareas del [plan](./superpowers/plans/2026-09-11-la-hoja-a-pagina-completa.md) de la
[spec](./superpowers/specs/2026-09-11-la-hoja-a-pagina-completa-design.md) están en la rama
`hoja/pagina-completa`, revisadas una a una y con el navegador medido fichero a fichero
([07-historial.md](./07-historial.md), «La hoja a página completa»). **No está en `main` ni en
producción: fusiona y despliega el autor, a mano.** Decisiones D-CF-29..44 en
[decisiones.md](./decisiones.md); lo que las revisiones dejaron abierto, HP-1..7 en
[06-pendientes.md](./06-pendientes.md).

**Lo siguiente es el paso 3 (D-CF-37):** conjuros y aptitudes por el conversor, con S11, E1, L5 y
S6 dentro —la «tanda L»— → higiene → jugar una partida → fase 3. A2 aplazada. El paso 3 asume la
pestaña Conjuros hecha, y lo está: hoy enseña espacios y el hueco declarado (D-CF-34).

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

### 2 · Correr el banco por primera vez

Está escrito y **sin estrenar**: las tres tareas dicen «sin estrenar» en su última corrida. Hasta
que se corra una vez, no hay línea de base contra la que comparar el siguiente cambio de proceso.

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
