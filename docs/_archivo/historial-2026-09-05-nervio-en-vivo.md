# Historial archivado — el nervio en vivo, plan 12 · 12.3 (2026-09-05)

**Movida entera y sin reescribir el 2026-09-08**, al pasarse `docs/07-historial.md` de su tope de
1000 líneas escribiendo la entrada del reconocimiento de ese día. Era la entrada completa más
antigua que quedaba, después de la de la bandeja de avisos, que salió el mismo día. Su hito se
queda arriba, en `07-historial.md`.

> **No confundir con su hermana**, que sigue viva en `07-historial.md`: *«El nervio en vivo, medido
> en producción detrás de nginx y Traefik (2026-09-05)»*. Esta es **la entrega** del canal; aquella
> es **la comprobación en el servidor** de lo único que esta dejó sin cerrar.

---

## El nervio en vivo: avisos que llegan solos, y un sondeo que deja de ser el camino (2026-09-05, plan 12 · 12.3, D-OP-22)

**Qué.** Un canal SSE por campaña que manda **avisos, no datos**: «ha cambiado algo en esta mesa».
El navegador **recarga por el endpoint autorizado de siempre**, donde `canView` sigue mandando.

**Esa es la razón de diseño entera**: un canal tonto no filtra, y por lo tanto **no puede filtrar
mal**. Mandar el dato ahorraría una petición y metería la matriz de visibilidad en un segundo
sitio, que es el fallo que este proyecto ya declaró que no repite.

**Las decisiones, una a una:**

- **Billete de un solo uso y vida corta** (30 s). `EventSource` **no manda cabeceras**, y un token
  en la URL **acaba en los registros de los proxies**. El billete se pide por la ruta autenticada
  normal y se canjea al abrir. **Y al canjearlo se vuelve a comprobar quién puede escuchar**: entre
  pedirlo y usarlo caben treinta segundos, y en treinta segundos a alguien se le puede haber echado
  de la mesa.
- **La autorización vive en su propio método** (`assertCanJoin`), **fuera del controlador de SSE**,
  para que el WebSocket de la fase 3.C la reutilice tal cual en vez de escribir una segunda copia.
- **El mensaje del bus es agnóstico del transporte** —`{ type, campaignId, subjectType, subjectId }`
  y nada más—: ni `event:` ni `data:` asoman por la capa del bus. La fase 3.C trae fichas que se
  arrastran y llega **antes** que la 4; si el bus tuviera sabor a SSE, habría que rehacerlo.
- **La emisión ocurre SOLO en `GameEventsService.record`**, junto a la emisión interna y por lo
  tanto **después del commit**. Un segundo emisor sería un aviso que llega sin dejar rastro en el
  registro.
- **El latido, cada 15 s.** Un canal ocioso lo corta un proxy: sin `:\n\n` periódico, el navegador
  reconecta cada minuto **sin error visible**, solo reconexiones. Es una línea y ahorra una tarde.
- **`X-Accel-Buffering: no`**, porque nginx acumula por defecto: el canal funcionaría perfecto en
  local y llegaría a ráfagas en producción.
- **La limitación está escrita en el código, no arreglada**: el bus reparte **en memoria**, dentro
  de un proceso. Con varias réplicas, un aviso publicado en la A no llega a la B. Hoy hay **un solo
  contenedor**; el día que haya réplicas —o presencia— entra Redis detrás de esta misma interfaz.

**Y el sondeo deja de ser el camino principal, pero NO se quita.** Un canal que se cae en silencio
con el sondeo quitado es peor que no tener canal. Lo que sí cambió es que **había diez
`refetchInterval` con cuatro valores distintos** en siete módulos, y solo dos salían de una
constante: alargarlo eran once ediciones, y el que se olvidara **no daba error**, daba una pantalla
refrescándose sola. Ahora sale de `apps/web/src/lib/sondeo.ts`, a **60 s**, con **una sola excepción
declarada**: la petición de tirada del DM sigue en 15 s, porque es una pregunta que espera respuesta
en voz alta.

**Medido con dos navegadores** (`apps/web/e2e/nervio-en-vivo.spec.ts`): la jugadora comenta y la
campana del DM se enciende **sin recargar** en menos de 20 s, cuando el sondeo está en 60. **Y con
su control**: el mismo recorrido con el canal apagado no enciende nada en diez segundos, y
recargando sí. Sin ese control, la primera prueba no demostraría que mide el canal.

**Lo que queda sin comprobar, y se dice en voz alta:** `X-Accel-Buffering` **detrás de nginx y
Traefik de verdad**. En local no hay proxies, así que esto está probado contra Vite. La comprobación
en el servidor es lo único del plan 12 que no se puede cerrar sin desplegar.

**Cómo revertirlo.** `git revert` del commit. Con el canal fuera, el sondeo de 60 s sigue trayendo
todo, más despacio.

