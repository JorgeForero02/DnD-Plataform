# Archivo — documentos congelados

Una fila por documento. **Nada de aquí se edita nunca**: son registros de lo que era cierto
cuando se congelaron, no descripciones del sistema de hoy. Si un documento de aquí contradice a
`docs/01`–`08`, **manda `docs/`**; esto solo dice qué se creía entonces.

| Documento | Qué es | Congelado |
|---|---|---|
| [`historial-hasta-2026-09-01.md`](./historial-hasta-2026-09-01.md) | Las entradas de `07-historial.md` desde el arranque del proyecto (2026-07-02) hasta el cierre del 2026-09-01: fase 0, fase 1 completa, endurecimiento de seguridad, capa de tokens y reseño visual | 2026-09-02 |
| [`pendientes-cerrados-hasta-2026-09-02.md`](./pendientes-cerrados-hasta-2026-09-02.md) | Los pendientes que `06-pendientes.md` arrastraba ya cerrados. Se conservan por si algo se reabre y hace falta saber cómo se cerró la vez anterior | 2026-09-02 |
| [`historial-hasta-2026-09-02.md`](./historial-hasta-2026-09-02.md) | Todo el 2026-09-02 —la fase 2A tarea a tarea, la ronda de interfaz, la primera puesta en producción— **más las entradas por tarea del 2026-09-03** (2B, 2C, 2D), y la bitácora de despliegue del 2026-09-02 que vivía en `03-despliegue.md`. En `07-historial.md` se quedaron solo los hitos | 2026-09-03 |
| [`pendientes-cerrados-hasta-2026-09-03.md`](./pendientes-cerrados-hasta-2026-09-03.md) | Las **65 fichas tachadas** que `06-pendientes.md` seguía arrastrando: cerradas, resueltas o contestadas. Se seleccionaron con una regla mecánica —todo lo tachado sale, ninguna ficha abierta se toca— y varias explican una afirmación que resultó falsa | 2026-09-03 |
| [`pendientes-cerrados-2026-09-06-poda.md`](./pendientes-cerrados-2026-09-06-poda.md) | Las **tres fichas que `06-pendientes.md` seguía arrastrando con «Cerrado» en su propio título**. Dos explican un **error de medición** —una ficha afirmaba que nadie podía curar a nadie, y el grep que lo hizo creer— y por eso se archivan en vez de borrarse | 2026-09-06 |
| [`plataforma-dnd-documentacion.md`](./plataforma-dnd-documentacion.md) | **El documento fuente original del producto (2026-07-02).** Lleva su propia advertencia dentro, y hay que leerla: propone Redis, BullMQ, WebSockets, S3, una tabla por tipo de entidad y una hoja de personaje **almacenada** — o sea, lo contrario de cinco decisiones que el resto de la documentación defiende. Estaba en `docs/` junto a los documentos vivos, con la misma voz de autoridad | 2026-09-03 |

**Por qué existe esto.** El protocolo de documentación fija umbrales: `07-historial` se archiva
al pasar de ~600 líneas, y `06-pendientes` se poda cuando mezcla abierto con cerrado. Los dos los
habían pasado de largo — 2407 y 1181 líneas — y un documento que nadie termina de leer no informa
a nadie.

**Y desde el 2026-09-03 hay una razón más fuerte, que es la que manda:** el consumidor principal
de esta documentación no es una persona que hojea, es **un agente sin memoria que la relee entera
en cada sesión**. Cuando no le cabe en contexto no avisa: lee fragmentos y **rellena los huecos
inventando**. El umbral de `07-historial` es ahora **400 líneas y lo comprueba `pnpm
check:historial`**, no la buena voluntad de quien escribe.

**Archivar no es resumir.** Una entrada se mueve **entera y sin tocar**. Reescribirla para que
ocupe menos convertiría el archivo en una versión de los hechos, que es justo lo que un registro
fechado no puede ser.

**Los números de documento no se reciclan.** Archivar algo deja su hueco; renumerar rompería los
enlaces de los specs y planes que ya lo citaban.
