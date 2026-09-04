# D&D Platform — índice de documentación

Plataforma web para gestionar campañas de D&D: mundo (NPCs, lugares, misiones,
facciones, objetos, eventos, documentos enlazados entre sí tipo wiki), sesiones y
personajes, con **cinco niveles de visibilidad** por objeto para que el DM decida qué
ve cada jugador. Herramienta propia para la mesa del autor primero; SaaS después si
funciona.

**No es** mapas, ni tiempo real, ni 3D, ni IA: eso son las fases 3–5 y cada una recibe su
propio plan cuando se llega. Contenido legal limitado a SRD 5.1 / OGL.

**Sí tiene. La fase 2 está en producción; la 2.5 y el reseño de la mesa están en `main` y NO
desplegados** — producción sirve lo que se subió el 2026-09-02 y local va por delante desde el
2026-09-04. Desplegar lo pide el autor; ver [03-despliegue.md](./03-despliegue.md).


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
| [decisiones.md](./decisiones.md) | **Una línea por decisión tomada, con el enlace a dónde está razonada.** Las once de mecánica de 2B, las seis de 2C, las cuatro de 2D, **las diez de la fase 2.5**, **las once del reseño de la mesa** (`D-R-*`) y las cuatro que la fase 3 tiene abiertas. **Empieza aquí y abre solo el documento que la fila enlaza** |
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
> - **Generado sobre el commit** `924058d` **(rama `main`)** — instantánea de la
>   última vez que alguien ejecutó `pnpm update:estado`, no un valor comprobado:
>   `pnpm verify` solo vuelve a calcular las pruebas unitarias de abajo, nunca este
>   commit ni esta rama, así que pueden quedar desactualizados varios commits — no
>   necesariamente solo uno — sin que `check:estado` lo detecte.
> - **Declaraciones de prueba unitaria:** 1788 (shared 75, api 966, web 747). **Es una cota inferior, no lo
>   que imprime el corredor**: un bloque `it.each` cuenta como la declaración que es y no
>   como los casos que ejecuta, y hay más de cuarenta. Sirve para que nadie edite el número
>   a mano —`check:estado` lo caza—, no para citar cuántas pruebas hay: eso lo dice
>   `pnpm test`. Ver el comentario al principio del script, y la ficha I9 de
>   [06-pendientes.md](./06-pendientes.md). Los conteos de e2e están en
>   [08-pruebas.md](./08-pruebas.md).
<!-- estado:fin -->
