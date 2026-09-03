# Archivo — documentos congelados

Una fila por documento. **Nada de aquí se edita nunca**: son registros de lo que era cierto
cuando se congelaron, no descripciones del sistema de hoy. Si un documento de aquí contradice a
`docs/01`–`08`, **manda `docs/`**; esto solo dice qué se creía entonces.

| Documento | Qué es | Congelado |
|---|---|---|
| [`historial-hasta-2026-09-01.md`](./historial-hasta-2026-09-01.md) | Las entradas de `07-historial.md` desde el arranque del proyecto (2026-07-02) hasta el cierre del 2026-09-01: fase 0, fase 1 completa, endurecimiento de seguridad, capa de tokens y reseño visual | 2026-09-02 |
| [`pendientes-cerrados-hasta-2026-09-02.md`](./pendientes-cerrados-hasta-2026-09-02.md) | Los pendientes que `06-pendientes.md` arrastraba ya cerrados. Se conservan por si algo se reabre y hace falta saber cómo se cerró la vez anterior | 2026-09-02 |

**Por qué existe esto.** El protocolo de documentación fija umbrales: `07-historial` se archiva
al pasar de ~600 líneas, y `06-pendientes` se poda cuando mezcla abierto con cerrado. Los dos los
habían pasado de largo — 2407 y 1181 líneas — y un documento que nadie termina de leer no informa
a nadie.

**Los números de documento no se reciclan.** Archivar algo deja su hueco; renumerar rompería los
enlaces de los specs y planes que ya lo citaban.
