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
| [`historial-2026-09-05-ola-3.md`](./historial-2026-09-05-ola-3.md) | **Las cinco entradas más antiguas que `07-historial.md` fue soltando el 2026-09-07** al pasarse de sus 1000 líneas: la Ola 3 con las 21 decisiones y la auditoría de la cola larga, las tres baratas, el hilo como conversación, las tres columnas, y «un personaje se archiva, y vuelve» | 2026-09-07 |
| [`pendientes-cerrados-2026-09-07-lo-que-la-poda-desbloqueo.md`](./pendientes-cerrados-2026-09-07-lo-que-la-poda-desbloqueo.md) | **Las tres fichas que la poda del 2026-09-07 encontró ya desbloqueadas**: las dos puertas por las que un jugador se concedía una mecánica, la del combate que nadie proponía terminar, y el «500 intermitente» que su propio texto daba por cerrado. Ninguna era nueva: las tres esperaban una cláusula «Cierra cuando…» que el paso 2 había cumplido la noche antes. **La del combate se conserva con dos frases falsas dentro**, dichas en su cabecera | 2026-09-07 |
| [`pendientes-cerrados-2026-09-08-start-devuelve-get.md`](./pendientes-cerrados-2026-09-08-start-devuelve-get.md) | **La ficha P3 de `start()`**, abierta al revertir un arreglo a medias y cerrada al día siguiente. Su cabecera cuenta el dato que la decidió —los tres endpoints hermanos ya devolvían por `get()`— y por qué la objeción del revert era correcta y aun así no bloqueaba | 2026-09-08 |
| [`pendientes-cerrados-2026-09-08-los-dos-que-quedaban.md`](./pendientes-cerrados-2026-09-08-los-dos-que-quedaban.md) | **`advanceTurn()` y `setInitiative()`**, el resto de la deuda que la ficha anterior dio por cerrada al nombrar mal a un hermano. Su cabecera cuenta cómo una medición —`roundAdvanced` no lo lee nadie— deshizo la única decisión que parecía necesitar al autor | 2026-09-08 |
| [`historial-2026-09-05-nervio-en-vivo.md`](./historial-2026-09-05-nervio-en-vivo.md) | **La entrada de `07-historial.md` que documenta la entrega del canal en vivo** (plan 12 · 12.3), movida entera el 2026-09-08 cuando la entrada del reconocimiento volvió a pasar el fichero de sus 1000 líneas. **No es la de la comprobación en producción**, que sigue viva arriba; su cabecera lo dice para que nadie las confunda | 2026-09-08 |
| [`historial-2026-09-05-bandeja-de-avisos.md`](./historial-2026-09-05-bandeja-de-avisos.md) | **La entrada de `07-historial.md` que documenta la bandeja de avisos**, movida entera el 2026-09-08 al llegar el fichero a 988 de sus 1000 líneas. Era la entrada completa más antigua. Su cabecera cuenta la ironía del día: `01-arquitectura.md` seguía negando esa bandeja tres días después de entregarla | 2026-09-08 |
| [`pendientes-cerrados-2026-09-08-reconocimiento.md`](./pendientes-cerrados-2026-09-08-reconocimiento.md) | **Las dieciocho fichas que `06-pendientes.md` llevaba abiertas y el código desmentía**, encontradas leyendo unas cincuenta y cinco contra el árbol. Cuatro eran P1 —`E2` era «el hallazgo más importante de la pasada» de su propia tabla— y diez llevaban dentro un barrido, un símbolo o una cita de línea. Su cabecera lleva **dos correcciones sobre sí misma**: el recuento que se le dio al autor decía catorce, y una ficha que se declaró no medida sí se midió después. Se conservan porque varias explican el modo de fallo: **una ficha que describe con precisión el arreglo que le falta no se vuelve a leer el día que ese arreglo se entrega** | 2026-09-08 |
| [`pendientes-cerrados-2026-09-10-poda.md`](./pendientes-cerrados-2026-09-10-poda.md) | **Los treinta y nueve bloques de la poda del 2026-09-10**: dieciséis fichas o mitades que el código desmentía (cada una con su `fichero:línea` y su commit), doce tachadas que seguían en el 06 contra la regla de su cabecera, y once que los cuatro pasos de `04-convenciones.md` convirtieron en decisión declarada (`D-POD-*`) o en «no es ficha». Su cabecera dice además qué tres fichas salieron de «decide el autor» **sin salir del 06**, porque los cuatro pasos las contestaban | 2026-09-10 |
| [`historial-2026-09-05-seed-demo.md`](./historial-2026-09-05-seed-demo.md) | **La campaña de demostración que se siembra sola** (`scripts/seed-demo.mjs`), entrada del 07 movida entera el 2026-09-10 al pasarse el fichero de sus 1000 líneas. Su hito se queda arriba | 2026-09-10 |
| [`historial-2026-09-05-nervio-en-produccion-y-pnj.md`](./historial-2026-09-05-nervio-en-produccion-y-pnj.md) | **El nervio en vivo medido contra producción** y **el PNJ que la pantalla no sabía meter**, dos entradas del 07 movidas enteras el 2026-09-10 en el segundo corte de la sesión. Sus hitos se quedan arriba | 2026-09-10 |
| [`historial-2026-09-05-paseo-de-uso.md`](./historial-2026-09-05-paseo-de-uso.md) | **El paseo de uso contra producción**, entrada del 07 movida entera el 2026-09-11 en el tercer corte de la sesión. Su hito se queda arriba | 2026-09-11 |
| [`historial-2026-09-05-la-documentacion-alcanza.md`](./historial-2026-09-05-la-documentacion-alcanza.md) | **La documentación alcanza a la noche del 2026-09-05**, entrada del 07 movida entera el 2026-09-11 (cuarto corte). Su hito se queda arriba | 2026-09-11 |
| [`historial-2026-09-06-iniciativa-y-bando-hito.md`](./historial-2026-09-06-iniciativa-y-bando-hito.md) | **El hito del plan de iniciativa y bando**, entrada del 07 movida entera el 2026-09-11 (quinto corte). Su resumen se queda arriba | 2026-09-11 |
| [`historial-2026-09-06-paso-1-goteras.md`](./historial-2026-09-06-paso-1-goteras.md) | **La entrada del paso 1 (las goteras) del 2026-09-06**, movida entera el 2026-09-11 en el sexto corte de la sesión de cerrar fichas; el avance por tarea sigue en el bloque «Avance» de su plan |
| [`historial-2026-09-06-cero-comodin-y-proceso-medido.md`](./historial-2026-09-06-cero-comodin-y-proceso-medido.md) | **El cero de tipos comodín** y **el proceso pasa a medirse**, dos entradas del 07 del 2026-09-06 movidas enteras el 2026-09-12 al pasarse el fichero (1002 de 1000) con los retoques de la revisión de la hoja. Sus hitos se quedan arriba | 2026-09-12 |
| [`pendientes-cerrados-2026-09-10.md`](./pendientes-cerrados-2026-09-10.md) | **Las fichas del cubo B que la sesión del 2026-09-10 cerró con código**, una por commit y cada una con su prueba roja antes, su mutación y su `fichero:línea`. Crece durante la sesión | 2026-09-10 |

> **Esta tabla lleva un rezago conocido**: la tabla de archivados de `07-historial.md` cita diez
> ficheros de `_archivo/`, y contando todas sus menciones (también fuera de esa tabla) el
> documento entero cita doce — más filas de las que esta lista tiene. No es una prueba de que
> falten ficheros de verdad: es una prueba de que nadie ha barrido las dos tablas una contra otra
> desde que empezaron a divergir. Sujeto a saldarse cuando alguien haga ese barrido, no en esta
> tarea.

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
