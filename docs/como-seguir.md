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

### 0 · La hoja a página completa — **fusionada a `main` y desplegada el 2026-09-12 (`6d2b2ca` en producción, comprobado en el servidor)**

Las once tareas del [plan](./superpowers/plans/2026-09-11-la-hoja-a-pagina-completa.md) de la
[spec](./superpowers/specs/2026-09-11-la-hoja-a-pagina-completa-design.md), revisadas una a una y
medidas fichero a fichero en el navegador, más la revisión final de la rama entera, dos rondas de
cierre de sus fichas y dos residuales, se fusionaron a `main` en `e43038f` (merge `--no-ff`, 38
commits; [07-historial.md](./07-historial.md), «La hoja a página completa»). El autor desplegó a
mano ese mismo día: `dnd.supportive.pro` sirve `6d2b2ca`, comprobado con `docker ps` en `vps1new`
(API y web `healthy`) y con `curl` (200). Decisiones D-CF-29..48 en [decisiones.md](./decisiones.md);
de las ocho fichas que dejaron las revisiones no queda ninguna abierta, y la que salió al medir la
sintonización se partió en dos el mismo día (D-CF-47 enmendada): **HP-9a («sintonizar cuenta») se
cerró el mismo 2026-09-12** (D-CF-48; el motor filtra los `effects` de un objeto sin sintonizar, la
pantalla tacha el bono y la cabecera avisa, con su recorrido de navegador en `inventario.spec.ts`)
y dejó HP-10 (la fila solo ponía cifra al efecto `ac`), **cerrada también el 2026-09-12** (la fila
resume los nueve tipos de efecto y los tacha enteros); HP-9b sigue en
[06-pendientes.md](./06-pendientes.md) con su estimación.

**Lo siguiente (D-CF-52, orden del autor del 2026-09-12 tras revisar producción): cuatro tandas
modulares antes del paso 3** — **pulido** ([spec](./superpowers/specs/2026-09-12-pulido-antes-del-paso-3-design.md):
24 puntos por causa, con tarea 0 de investigación de UI de juegos) → **reglas de la mesa**
([spec](./superpowers/specs/2026-09-12-reglas-de-la-mesa-design.md): características, nivel, PG,
permitidos y oro iniciales, a mano o con los dados que el DM diga) → **puerta de efectos** → paso 3. **El mundo como árbol +
detalle (T14 bis, D-CF-64) sustituyó al tablero telaraña; el mapa de historia queda aplazado por el
autor** (su [spec](./superpowers/specs/2026-09-12-mapa-de-historia-del-dm-design.md) se queda tal cual). Cada spec tiene su plan con `writing-plans` cuando el autor la apruebe. **Aparte y sin
orden fijo:** [Owlbear como tablero](./superpowers/specs/2026-09-12-owlbear-como-tablero-design.md)
(D-CF-56), que empieza con un spike del autor en su sala real.
El orden previo, que ya no manda, sigue debajo:

Antes → la tanda **«puerta de efectos»**
([spec](./superpowers/specs/2026-09-12-la-puerta-de-efectos-design.md): curar a otro, daño de
salvación, bandeja de daño, «hasta el descanso»; plan pendiente) → **el paso 3, ampliado el
2026-09-12 a ~26 tareas como cierre de la primera parte (D-CF-49..51)**: conjuros y aptitudes por
el conversor, la tanda L (S11, E1, L5, S6), magia completa (innatos, reacciones, espacio superior,
ataque de conjuro), «Acciones» en la mesa, combate sin tablero, enfrentadas y legendarias →
**después, HP-9b, catálogo SRD +N y descanso corto (D-CF-47)** → higiene → prueba de campo con
agentes a ciegas → partida real → fase 3. A2 aplazada; **nada que necesite tablero antes de la
fase 3**. El paso 3 asume la pestaña Conjuros hecha, y lo está: hoy enseña espacios y el hueco
declarado (D-CF-34).

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
