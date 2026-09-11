# Historial — el nervio medido en producción, y el PNJ que la pantalla no sabía meter (2026-09-05)

**Dos entradas de `07-historial.md` movidas enteras el 2026-09-10**, cuando la tanda 1 de cerrar
fichas volvió a dejar el fichero por encima de sus 1000 líneas y estas eran las dos entradas
completas más antiguas. No se reescriben. Sus hitos se quedan en el 07.

---

## El nervio en vivo, medido en producción detrás de nginx y Traefik (2026-09-05)

**Qué se comprobó, y por qué hacía falta el servidor.** El plan 12 dejaba un punto sin cerrar: *«la
comprobación detrás de nginx y Traefik hecha en el servidor, no supuesta»*. **En local no hay
proxies**, así que el canal podía funcionar perfecto aquí y llegar a ráfagas allí — nginx acumula
por defecto, y ese es justo el fallo que `X-Accel-Buffering: no` existe para evitar.

Desplegado `b9d6cce` (a mano, como manda `03-despliegue.md`), medido contra
`https://dnd.supportive.pro` con una cuenta de la campaña de demostración:

| Qué | Resultado |
|---|---|
| Apertura del canal | `200`, `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Transfer-Encoding: chunked`, `Server: nginx/1.31.5` |
| Primer byte | `: abierto` **en el acto**, no al cerrar |
| Tres sucesos provocados con el flujo abierto | llegaron **en el mismo segundo** en que se enviaron (14:17:16, :21, :27) |
| Latido | `:` a los **15 segundos** de abrir |
| Sin billete | `401` |

**`X-Accel-Buffering` no aparece en la respuesta, y eso es lo correcto**: es una directiva **para**
nginx, que la consume en vez de reenviarla. Lo que demuestra que funciona no es la cabecera, es que
los sucesos lleguen sueltos — y llegaron.

**Y lo que viaja por el canal es un aviso, no un dato**: `{"type":"ABILITY_ROLL","campaignId":…,
"subjectType":"campaign","subjectId":…}`. Ni el resultado de la tirada ni su visibilidad: quien lo
recibe recarga por su ruta, donde `canView` sigue mandando.

**Lo que hay en producción y lo que no.** Producción corre **`b9d6cce`**: tiene el nervio, la
bandeja y los dos avisos. **No tiene** `31dd05c` (el seed) ni `cc64ed7` (el PNJ que se llamaba
«Alguien» y «Entrar en combate» sin PNJ que ofrecer), así que **esos dos defectos siguen ahí** hasta
el siguiente despliegue.

## Un PNJ podía pelear, pero la pantalla no sabía su nombre ni sabía meterlo (2026-09-05)

**Qué.** Dos defectos de la capa de combate, encontrados **paseando la aplicación** sobre la
campaña de demostración recién sembrada — no por una prueba:

1. **En el orden de turnos, un PNJ se llamaba «Alguien»**, y se lo llamaba también al DM que
   acababa de sacarlo del bestiario.
2. **El diálogo de «Entrar en combate» no ofrecía ningún PNJ**: solo los personajes de los
   jugadores. Se podía entrar en combate y **no había con quién combatir**; meter al capataz en la
   iniciativa solo se podía por la API.

**Por qué pasaba, y no era un descuido de dos líneas.** Un PNJ **es** una fila de `Character` —esa
decisión es la que hizo barata toda la fase 2D—, pero `GET /characters` **no los lista a
propósito**: esa lista es «quién se sienta a la mesa», y seis goblins mezclados con tres
aventureros convierten la pantalla de personajes en un listado de combate. La mesa leía solo esa
lista, así que para ella los PNJ no existían.

**El arreglo es pasarle la segunda lista**, la del bestiario, que el servidor ya filtra por
visibilidad. Con eso los dos defectos caen juntos, y **un PNJ que el jugador no puede ver sigue
siendo «Alguien» para él**, que es lo correcto: la lista que no le llega no puede nombrárselo.

**Y una molestia de maquetación, del mismo paseo**: el rótulo «Ver el registro como» de la banda de
la mesa se partía en **tres renglones** y empujaba el resto de la fila, a 1280 px y peor a 390. Se
acorta lo visible a «Ver como» y **el nombre accesible se queda entero**.

**Mutación probada**: deshecho el nombre del PNJ, se pone roja **una sola** prueba de las 1093.

**Cómo revertirlo.** `git revert` del commit; los PNJ vuelven a estar en el bestiario y fuera del
combate.
