# El nervio en vivo — el transporte, y lo que medirá la fase 3.C

> Escrito el 2026-09-05, a petición del autor, **antes** de ejecutar el
> [plan 12](../plans/2026-09-05-planes/12-el-aviso.md). Es el acompañante del plan, no su
> sustituto: el plan dice **qué** se hace, esto dice **por qué SSE y no otra cosa**, y **qué
> tiene que quedar preparado** para que la fase 3.C y la 4 no obliguen a rehacerlo.
>
> **Y trae cuatro correcciones medidas contra el árbol.** El plan 12 se escribió el 2026-09-05 de
> madrugada y cuatro de sus afirmaciones envejecieron: están abajo, en su propia sección. Se
> corrigen **aquí** y no en el plan porque un encargo fechado no se reescribe.

## 1 · La pregunta que hizo el autor, y la respuesta corta

> *«¿No hay mucha latencia con SSE? Esto es tipo chat y debería manejar a varios usuarios haciendo
> cosas a la vez.»*

**No.** La latencia de SSE es la de WebSocket: las dos son una conexión TCP abierta por la que el
servidor empuja. La diferencia de transporte es de milisegundos. El mito viene de confundir SSE con
*long-polling*, que sí sondea.

**Lo que sí cuesta latencia es la decisión de «avisos, no datos»**, y es una decisión buena:

```
DM tira dado
  POST /rolls .................... ~40 ms
  aviso por SSE al jugador ....... ~20 ms   ← el canal, instantáneo
  el navegador invalida y repite
  GET /sessions/:id/rolls ........ ~60 ms   ← ESTE es el coste de diseño
  pintado ........................ ~120 ms total
```

Ese salto de más es el precio de que `canView` viva **en un solo sitio**. En una mesa de D&D nadie
nota 120 ms; una fuga de visibilidad sí se nota. Mandar el dato por el canal ahorraría 60 ms y
metería la matriz de visibilidad en un segundo lugar — el fallo que este proyecto ya declaró que no
repite.

## 2 · Concurrencia: no es el problema

Una mesa son 4-8 personas. Una conexión SSE ociosa es un socket dormido, no un hilo. El servidor
aguanta miles; `vps1new` tiene 7,8 GB y sobra por dos órdenes de magnitud.

Y «varios a la vez» no es un problema de transporte: las escrituras concurrentes van por REST a
Postgres, y ahí lo que manda son las transacciones, no el canal de avisos.

## 3 · Dónde SSE **sí** se queda corto, y por qué importa aquí

El caso malo no es la latencia de bajada: es la **frecuencia de subida**.

| Caso | Subida | SSE + REST | WebSocket |
|---|---|---|---|
| Tirada, daño, condición, comentario, sesión | un evento puntual | **sirve** | no aporta |
| **Arrastrar una ficha por el tablero** | ~30-60 por segundo | **no**: un POST por fotograma | sí |
| Cursor de otro jugador, «escribiendo…» | continuo | **no** | sí |

**La fase 3.C tiene fichas que se arrastran**, y llega **antes** que la fase 4. Así que el orden
real no es «SSE ahora, WebSocket en la 4»:

```
2.5 (plan 12)  avisos, tiradas, daño, condiciones        SSE
3.C            arrastrar fichas en el tablero            aquí ya pica el WS
4              presencia, escritura en vivo, feed        WebSocket pleno
```

**La 3.C puede salvarse sin WebSocket**: se suelta la ficha y se manda un POST. Se mueve a saltos,
no en continuo, y la posición se confirma al soltar — es lo que hace MapTool y es jugable. Si el
autor quiere ver la ficha **deslizarse** mientras el otro arrastra, el WS se adelanta a la 3.C.
**Es una decisión del autor y no hace falta tomarla para ejecutar el plan 12** — lo que sí hace
falta es no cerrarle la puerta.

## 4 · Redis: cuándo entra, y por qué no ahora

Redis pub/sub resuelve **un** problema: el emisor está en el contenedor A y el suscriptor en el B.
**Hoy hay un contenedor.** Meterlo ahora añade un servicio a Coolify, una copia de seguridad, un
punto de fallo más, y **no simplifica el código**: el reparto en memoria seguiría existiendo igual.

Entra cuando ocurra **una** de estas dos, y no antes:

1. **Varias réplicas de la API.**
2. **Presencia** («quién está en la mesa ahora»): estado efímero con caducidad, que es lo que peor
   encaja en Postgres. Si en la fase 4 entra presencia, **entra Redis aunque siga habiendo un solo
   contenedor**.

Por eso el plan 12 pide **escribir la limitación en el código**, no arreglarla.

## 5 · Lo que hay que dejar preparado, y es barato

El plan 12 ya manda que la emisión ocurra **solo** en `GameEventsService.record`
(`apps/api/src/game-events/game-events.service.ts:37`). Eso es la pieza que no se rehace. Encima de
ella, dos condiciones más y ya está:

```
GameEventsService.record()        ← punto único de emisión, ya exigido por el plan
        │
        ▼
   LiveBus (interfaz)             ← publish(campaignId, aviso) / subscribe(campaignId)
    ┌───┴───┐
    ▼       ▼
InMemoryBus  RedisBus             ← el día que haya réplicas o presencia
    │
    ├──► SSE  «algo cambió»       ← plan 12, AHORA
    └──► WS   «esto se mueve»     ← fase 3.C o 4, sin tocar lo de arriba
```

**Las dos condiciones, y no cuestan nada hoy:**

- **El mensaje del bus es agnóstico del transporte**: `{ type, entityId, campaignId }` y nada más.
  Que no aparezcan `event:` ni `data:` —la sintaxis de SSE— en la capa del bus. Si un WebSocket no
  puede mandar ese mismo objeto tal cual, está acoplado.
- **La autorización del canal vive en su propio método**, del estilo
  `assertCanJoin(campaignId, userId)`, y **no dentro del controlador de SSE**. Así el WebSocket la
  reutiliza tal cual el día que llegue, en vez de escribir una segunda copia — que sería justo la
  segunda copia de la matriz de visibilidad que este proyecto prohíbe.

## 6 · Cuatro cosas del plan 12 que ya no son ciertas — medidas hoy

**No invalidan el plan. Cambian números que están escritos dentro de él.**

### 6.1 · No hay «el sondeo». Hay **diez**, con cuatro valores distintos

El plan dice *«El sondeo NO se quita: se alarga a 60 s»*, en singular. Medido:

```
apps/web/src/features/character-sheet/hooks.ts:76   SONDEO_DE_MESA_MS = 15_000
apps/web/src/features/character-sheet/hooks.ts:82   SONDEO_DE_MESA_MS
apps/web/src/features/character-sheet/hooks.ts:305  30_000
apps/web/src/features/character-sheet/hooks.ts:317  SONDEO_DE_MESA_MS
apps/web/src/features/encounters/hooks.ts:20        10_000
apps/web/src/features/game-clock/hooks.ts:17        30_000
apps/web/src/features/inventory/hooks.ts:44         30_000
apps/web/src/features/roll-requests/hooks.ts:27     SONDEO_DE_PETICIONES_MS
apps/web/src/features/rolls/hooks.ts:38             30_000
apps/web/src/features/sessions/hooks.ts:70          30_000
apps/web/src/features/sessions/hooks.ts:118         15_000
```

Solo dos salen de una constante. **Los otros son números sueltos repartidos por siete módulos**, y
«alargarlo a 60 s» son once ediciones, no una. Y hay una prueba que lo vigila:
`apps/web/src/features/character-sheet/__tests__/SondeoDeLaMesa.test.tsx:13` dice que **quitar
cualquiera de los dos `refetchInterval` deja su caso en rojo**.

**Lo que esto pide, y encaja con el plan 07:** una constante por dominio, o una sola —
`SONDEO_DE_RED_DE_SEGURIDAD_MS`— importada desde donde corresponda. Once números sueltos que hay
que cambiar a la vez son once oportunidades de olvidar uno, y el olvidado no da error: **da una
pantalla que se refresca sola cuando ya no hacía falta**.

### 6.2 · No son 47 invalidaciones. Son **93**

El plan dice *«La web ya tiene 47 invalidaciones escritas»*. Hoy hay **93 llamadas a
`invalidateQueries`** repartidas en **23 ficheros** de `apps/web/src`. El número se midió antes del
reseño de la mesa.

**No cambia la instrucción, la refuerza**: *«el aviso las dispara; no escribas un camino nuevo de
recarga»*. Con 93 ya escritas, escribir un camino nuevo es todavía peor negocio que cuando el plan
decía 47.

### 6.3 · Falta el latido, y sin él el canal parece roto

El plan cubre `X-Accel-Buffering` pero **no menciona el latido**. Un canal SSE ocioso lo corta un
proxy: Traefik y nginx cierran conexiones sin tráfico. Sin un comentario periódico —`:\n\n` cada
15-20 s— el navegador reconecta cada minuto **y nadie sabe por qué**: no hay error, solo
reconexiones.

Es una línea de código y ahorra una tarde de diagnóstico.

### 6.4 · En local, `EventSource` puede colgar la aplicación a la tercera pestaña

Sobre HTTP/1.1 el navegador limita a **6 conexiones por origen**, y una SSE abierta ocupa una
entera. En producción hay HTTP/2 tras Traefik y no muerde; **con Vite en local, sí**. El síntoma es
«se cuelga al abrir la tercera pestaña» y no se parece en nada a su causa.

**Compruébalo antes de descartarlo**, y desde dentro del servidor, no desde el PC del autor —donde
Norton intercepta el TLS.

## 7 · Lo que NO cambia del plan 12

Todo lo demás sigue igual y sigue siendo correcto:

- **Avisos, no datos.** Un canal tonto no filtra, y por lo tanto no puede filtrar mal.
- **Billete de un solo uso y vida corta.** `EventSource` no manda cabeceras y un token en la URL
  acaba en los registros de los proxies.
- **La emisión, solo en `record`.**
- **El sondeo se queda** de red de seguridad.
- **Cerrar `EventSource` al desmontar**, o las reconexiones se acumulan en una mesa de seis horas.
- **El e2e de dos navegadores** es la única prueba que demuestra el nervio.
- **La mutación de `canView`** es la única que protege una fuga.
- **La limitación de «un solo contenedor», escrita en el código.**

## Fuente

Las cifras de latencia son órdenes de magnitud de una red normal, no mediciones de este proyecto: lo
que se afirma con evidencia es lo de la sección 6, medido contra el árbol el 2026-09-05. El diseño
de «avisos y no datos» no es una elección de rendimiento: es la misma regla que
`apps/api/src/common/visibility.ts` impone en todo lo demás.
