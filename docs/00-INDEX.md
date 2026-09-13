# D&D Platform — índice de documentación

Plataforma web para gestionar campañas de D&D: mundo (NPCs, lugares, misiones,
facciones, objetos, eventos, documentos enlazados entre sí tipo wiki), sesiones y
personajes, con **cinco niveles de visibilidad** por objeto para que el DM decida qué
ve cada jugador. Herramienta propia para la mesa del autor primero; SaaS después si
funciona.

**No es** mapas, ni tiempo real, ni 3D, ni IA: eso son las fases 3–5 y cada una recibe su
propio plan cuando se llega. Contenido legal limitado a SRD 5.1 / OGL.

**Sí tiene, y está desplegado: las fases 2 y 2.5, el reseño de la mesa, los quince planes del
2026-09-05, la sesión de cerrar fichas, las ocho migraciones de D-CF-14 y ahora la hoja a página
completa.** `dnd.supportive.pro` sirve la imagen etiquetada **`6d2b2ca`** — lo comprobó el
controlador el 2026-09-12 en `vps1new` con `docker ps` (API y web `healthy`) y con `curl` contra el
dominio (200).

> **Hasta el 2026-09-12 aquí ponía que producción servía `6eb2590`**, la imagen del 2026-09-05, y
> el párrafo de abajo contaba la distancia contra ella (70 ficheros). El autor desplegó después y
> este fichero no se enteró: la misma caducidad de siempre, escrita a mano en el que se manda leer
> primero.

> **Hasta el 2026-09-05 aquí ponía que el reseño de la mesa NO estaba desplegado y que producción
> iba por detrás de los dos `main`.** Las dos frases caducaron con ese despliegue.

> **Hasta este mismo bloque, hasta el 2026-09-06, aquí ponía que «no hay ningún cambio de código
> sin desplegar».** Era cierto cuando se escribió y dejó de serlo con este plan — la misma
> caducidad que ya avisó el párrafo de arriba sobre el reseño de la mesa.

> **Hasta el 2026-09-12 este párrafo decía que producción servía `f9579b2` y que `main` (en
> `e43038f`) le llevaba 80 ficheros de ventaja sin desplegar.** Las dos frases eran ciertas hasta
> que el autor desplegó ese mismo día: `git diff --name-only 6d2b2ca..HEAD -- apps packages` está
> vacío, así que no queda nada sin desplegar.

**`main` va por delante de producción desde el 2026-09-13**: la rama `pulido/antes-del-paso-3`
(45 commits sobre `0ebdd9f`, cerrada por la Tarea 15) se fusionó a `main` en `d7ec2b3`
(`--no-ff`) y se empujó a GitHub. Producción sigue sirviendo `6d2b2ca`: empujar **no despliega
nada** — el CI solo prueba, y el despliegue es manual por decisión del autor, ver
[03-despliegue.md](./03-despliegue.md). Qué separa `main` de producción se mide:
`git diff --name-only 6d2b2ca..HEAD -- apps packages`.

**Los quince planes del 2026-09-05 están cerrados**, uno por fichero, en
[superpowers/plans/2026-09-05-planes/](./superpowers/plans/2026-09-05-planes/00-INDICE.md), y lo que
decidieron mientras se ejecutaban está en [decisiones.md](./decisiones.md). **Lo que queda por hacer
ya no es «jugar y ya»: son tres tandas más antes del paso 3** (D-CF-52, enmendada por D-CF-64) —
**reglas de la mesa** → **puerta de efectos** → **paso 3**, con el **mapa de historia del DM
aplazado** por el autor tras ver cuatro maquetas (su spec se queda escrita, sin fecha). Cada tanda
espera su propio plan y el OK del autor; ninguna arranca sola. Y sigue pendiente la partida de
prueba con dos cuentas de jugador (D-OP-3), en producción desde el 2026-09-02.


- **Motor de reglas con traza** desde 2A (`apps/api/src/rules/`) — y conviene decirlo porque esta
  frase decía lo contrario cuando ya existía: la hoja de 5.ª edición se **deriva**, no se guarda, y
  cada número enseña de dónde sale. Más las reglas suceso–condición–efecto de vocabulario cerrado
  (`apps/api/src/rules-engine/`), con su pantalla en la pestaña «Reglas».
- **Objetos, inventario, equipo y dinero** desde 2B: el equipo entra en el motor y **sale en la
  traza**.
- **Dados, reloj de campaña, descansos, condiciones que caducan solas, petición de tirada y tablas
  de la casa** desde 2C.
- **PNJ con números** desde 2D: statblocks del SRD 5.1 y propios del DM, PNJ jugables en la mesa
  que reciben daño y cogen condiciones, y la pestaña «Bestiario».

## Mapa de documentos

| Documento | Contenido |
|---|---|
| [01-arquitectura.md](./01-arquitectura.md) | Monorepo, capas, módulos, dirección de dependencias |
| [02-entorno.md](./02-entorno.md) | Levantar el proyecto en local, variables de entorno, gotchas de Windows |
| [03-despliegue.md](./03-despliegue.md) | Coolify + Docker en **vps1new**, dominio `dnd.supportive.pro`. **En producción desde el 2026-09-02** |
| [04-convenciones.md](./04-convenciones.md) | Nivel de verificación declarado, convenciones de API y de web |
| [05-datos.md](./05-datos.md) | Esquema Prisma, migraciones, el modelo de visibilidad |
| [06-pendientes.md](./06-pendientes.md) | Deuda técnica y decisiones abiertas, con prioridad |
| [07-historial.md](./07-historial.md) | Qué se entregó, por qué y cómo revertirlo |
| [09-jugar.md](./09-jugar.md) | **Cómo se usa, en dos mitades: montar la mesa (DM) y jugar tu personaje (jugador).** Incluye lo que sigue arbitrándose a mano. No lleva estado de ingeniería: es la guía de uso |
| [08-pruebas.md](./08-pruebas.md) | **Pruebas, entero.** Qué prueba cada capa, qué NO cubre, la regla de Playwright, y **qué demuestra cada suite** —de API y de navegador— más lo que ningún recorrido cubre. Léelo antes de dar una tarea por terminada y antes de escribir un e2e nuevo. Es la **fuente única de los conteos**. Absorbió al antiguo mapa de e2e, que ya no existe como documento aparte |
| [como-seguir.md](./como-seguir.md) | **Por dónde entrar**: qué andamiaje ya está puesto —para no volver a montarlo—, qué sigue y en qué orden, y qué no decide un agente |
| [10-banco-de-tareas.md](./10-banco-de-tareas.md) | **Banco de tareas-tipo**: tres tareas fijas que miden si un cambio del proceso —`CLAUDE.md`, una regla, una skill, el modelo— mejora o empeora al agente. No se corre al cambiar una funcionalidad |
| [prompts.md](./prompts.md) | **Prompts que sirven cualquier día**: sesión normal, correr el banco, cambiar el proceso, encargar a un subagente, trabajar una ficha, ejecutar un plan. Los de un trabajo concreto siguen fechados en `superpowers/notes/` |
| [_archivo/README.md](./_archivo/README.md) | **Documentos congelados.** El historial por tarea, los pendientes ya cerrados y el documento fuente original del producto. **Nada de ahí se edita, y nada de ahí describe el sistema de hoy** — el fuente original, en particular, propone Redis, WebSockets y una hoja de personaje almacenada, que es lo contrario de lo que se construyó |
| [../NOTICE.md](../NOTICE.md) | **Atribución del SRD 5.1 (CC BY 4.0)** y la línea de qué contenido entra en el repositorio y qué no. Vive en la raíz, no aquí, porque la licencia lo pide en la obra distribuida |

### `docs/superpowers/` no está en el camino de lectura

Ahí viven los specs, los planes, los estudios y las auditorías fechadas: **13.662 líneas, el 61%
de toda esta documentación**, y `scripts/check-docs.mjs` las exime de todas sus comprobaciones a
propósito, porque un documento fechado es el encargo del día que se escribió y no se reescribe
después. Eso las hace seguras de conservar y **caras de releer**.

Hasta el 2026-09-03 este índice traía una tabla de cuarenta filas describiéndolas una a una, **en
presente y sobre trabajo terminado** —«borrador», «espera firma del autor», «se lee antes de
ejecutar 2A»—, cuando 2A llevaba un día cerrada y firmada. Un mapa que envejece es un mapa que
miente. En su lugar:

| Documento | Contenido |
|---|---|
| [decisiones.md](./decisiones.md) | **Una línea por decisión tomada, con el enlace a dónde está razonada.** Las de mecánica de 2B, 2C, 2D y 2.5, las del reseño de la mesa (`D-R-*`), las veinticuatro del autor del 2026-09-04 (`D-OP-*`), las de la investigación del 2026-09-05, **las que la ejecución de esa noche obligó a tomar** (`E-*`, y varias van contra su propio plan) y las cuatro que la fase 3 tiene abiertas. **Empieza aquí y abre solo el documento que la fila enlaza** |
| `superpowers/specs/` y `superpowers/plans/` | Los documentos completos, por si hace falta el razonamiento entero o saber qué se creía en una fecha |
| `superpowers/notes/` | Los prompts de arranque de cada fase |
| `.superpowers/sdd/progress.md` | **Ledger de ejecución** (fuera de `docs/`): una línea por tarea con commit, tests y resultado de la revisión. **Está en `.gitignore`: es local a esta máquina y no viaja con el clon** |

> El ledger y este `07-historial.md` cuentan lo mismo a distinta resolución: el ledger es
> el detalle por tarea que escribe el orquestador durante la ejecución; el 07 es el
> resumen por hito que sobrevive a la sesión.

## Dónde está el estado actual

Este documento es un mapa: enlaza y explica para qué sirve cada cosa, y no afirma nada sobre
en qué punto está el código. Esa separación es deliberada — en una sola sesión este fichero
mintió tres veces porque mezclaba el mapa con estado escrito a mano, y un documento que solo
apunta no puede contradecir nada. Para saber qué es cierto **hoy**:

- **Qué se ha entregado, cuándo y por qué** (tarea a tarea, con cómo revertir cada una):
  [07-historial.md](./07-historial.md), entrada más reciente primero.
- **Qué queda abierto, con prioridad y motivo**: [06-pendientes.md](./06-pendientes.md).
- **Qué prueba cada capa y los conteos de pruebas**: [08-pruebas.md](./08-pruebas.md).
- **Cómo se usa la herramienta**, para el DM y para el jugador: [09-jugar.md](./09-jugar.md)
  (cuándo se juega la partida de prueba y qué la bloquea está en
  [06-pendientes.md](./06-pendientes.md), no ahí).

Lo único que sí vive aquí es el bloque de abajo, y no lo escribe una persona:

<!-- estado:inicio -->
> **Este bloque lo escribe una máquina (`pnpm update:estado`) y no se edita a mano.**
> `pnpm verify` falla si no coincide con lo que el script generaría — ver
> `scripts/update-estado.mjs`.
>
> - **Generado sobre el commit** `35672ba` **(rama `reglas-de-la-mesa/antes-del-paso-3`)** — instantánea de la
>   última vez que alguien ejecutó `pnpm update:estado`, no un valor comprobado:
>   `pnpm verify` solo vuelve a calcular las pruebas unitarias de abajo, nunca este
>   commit ni esta rama, así que pueden quedar desactualizados varios commits — no
>   necesariamente solo uno — sin que `check:estado` lo detecte.
> - **Declaraciones de prueba unitaria:** 2926 (shared 201, api 1388, web 1337). **Es una cota inferior, no lo
>   que imprime el corredor**: un bloque `it.each` cuenta como la declaración que es y no
>   como los casos que ejecuta, y hay más de cuarenta. Sirve para que nadie edite el número
>   a mano —`check:estado` lo caza—, no para citar cuántas pruebas hay: eso lo dice
>   `pnpm test`. Ver el comentario al principio del script, y la ficha I9 de
>   [06-pendientes.md](./06-pendientes.md). Los conteos de e2e están en
>   [08-pruebas.md](./08-pruebas.md).
<!-- estado:fin -->
