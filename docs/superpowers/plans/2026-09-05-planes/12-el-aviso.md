# Plan 12 · El aviso (N1 · A1-avisos · D-OP-22)

**Objetivo en una frase:** que las notificaciones existan **por fuera** —hoy están construidas por
dentro y no las ve nadie— y que lleguen solas, sin esperar al sondeo.

**Tamaño:** tres commits. **Dependencias:** ninguna técnica, pero **el autor decidió que este plan
va junto al nervio en vivo** y no antes: hacer la bandeja ahora y el SSE después es hacerla dos
veces.

---

## Por qué van juntos, y no es una opinión

**Medido el 2026-09-05:**
- `apps/api/src/notifications/` **existe entero** —tabla, servicio, dos rutas—.
- **Cero ficheros de `apps/web/src` mencionan notificaciones.** Nadie ve una notificación nunca.
- **`COMMENT_ADDED` y `SESSION_SCHEDULED` están en el contrato y no los emite nadie**: 0 emisores.

Es el patrón que este proyecto ha cerrado en falso cuatro veces: **servidor hecho, nadie que lo
dispare = la ficha sigue abierta**.

Y el nervio en vivo (**D-OP-22**) es **el mismo territorio**: avisos que llegan solos. Si la bandeja
se construye contra el sondeo de 15 s y luego entra SSE, se reescribe entera.

## 12.1 · Los dos avisos que faltan

**`COMMENT_ADDED`** — al comentar una ficha, avisa **a quien deba saberlo**: el DM siempre; el autor
de la ficha si no es quien comenta. **Nunca a quien no puede ver la ficha** — el aviso pasa por
`canView` igual que todo lo demás, y **el cuerpo del comentario no viaja en el aviso** por el mismo
motivo por el que no viaja en su suceso: el hilo tiene su propia puerta.

**`SESSION_SCHEDULED`** — al planificar una sesión con fecha, avisa a la mesa. Visibilidad de la
sesión.

**Y ojo con el ruido**: un DM que comenta veinte fichas seguidas no puede generar veinte avisos a sí
mismo. **Nadie se avisa de lo que acaba de hacer.**

## 12.2 · La bandeja

En el chrome, junto al conmutador de tema. Con tres cosas y ninguna más:
- **cuántas sin leer**, y si son cero **no hay distintivo** (un cero con globo es ruido);
- **la lista**, cada una con su enlace al sitio donde pasó;
- **marcar leído**, y **marcar todo leído**, que es lo que la gente usa de verdad.

**Lo que NO hace:** no borra. Un aviso leído se apaga; el historial se queda.

## 12.3 · El nervio en vivo (D-OP-22)

**Canal SSE por campaña que manda AVISOS, NO DATOS.** «Ha cambiado la sesión», «ha cambiado esta
hoja»; el navegador **recarga por el endpoint autorizado de siempre**.

> **Mandar avisos y no datos deja `canView` en un solo sitio.** Un canal tonto no filtra, y por lo
> tanto no puede filtrar mal. Es la razón de diseño entera.

**Cuatro cosas que hay que hacer bien o no se hace:**

1. **Autenticación con billete de un solo uso y vida corta.** `EventSource` **no manda cabeceras**, y
   un token en la URL **acaba en los registros de los proxies**. Se pide un billete por el endpoint
   normal y se canjea al abrir el canal.
2. **`GameEventsService.record` es el único punto por donde pasa todo lo que ocurre.** Ahí se emite,
   y en ningún otro sitio.
3. **El sondeo NO se quita: se alarga a 60 s** y queda de red de seguridad. Un canal que se cae en
   silencio con el sondeo quitado es peor que no tener canal.
4. **La web ya tiene 47 invalidaciones escritas.** El aviso las dispara; **no escribas un camino
   nuevo de recarga**.

**Dos trampas conocidas y medidas:**
- **nginx bufferiza los flujos por defecto**, y aquí hay **nginx y Traefik** delante. Sin
  `X-Accel-Buffering: no` (y su equivalente en Traefik) los eventos llegan a ráfagas o no llegan.
- **El estado en memoria solo vale con un contenedor.** Hoy es uno. **Escríbelo en el código**: el
  día que haya dos, la mitad de la mesa deja de enterarse y el síntoma es indistinguible de un fallo
  de red.

## Pruebas

**Avisos:** comentar genera aviso al DM y **no** a quien comentó · **no** llega a quien no ve la
ficha · planificar genera el suyo · veinte comentarios propios generan **cero** avisos propios.

**Bandeja:** sin avisos, **sin distintivo** · marcar leído baja el contador · «marcar todo» los apaga
· cada aviso lleva a su sitio.

**SSE:** un e2e con **dos navegadores** — el DM cambia algo y **la pestaña del jugador se entera sin
recargar**. Es la única prueba que demuestra el nervio; lo demás es fontanería.
**Y el interruptor para las pruebas**: si el canal queda abierto, Playwright se vuelve intermitente.

**Mutación:** quita el filtro de `canView` del aviso y comprueba que la prueba de «no llega a quien
no ve la ficha» se pone roja. **Es la única que protege una fuga.**

## Guía de revisión

- [ ] El canal manda **avisos, no datos**. Si en el `payload` viaja algo que haya que filtrar, está
      mal por diseño.
- [ ] El billete es **de un solo uso y vida corta**. Ningún token largo en una URL.
- [ ] El sondeo **sigue existiendo**, a 60 s.
- [ ] La emisión ocurre **solo** en `record`.
- [ ] Sin avisos no hay distintivo.
- [ ] Nadie recibe aviso de su propia acción.
- [ ] `X-Accel-Buffering` resuelto **y comprobado detrás de los dos proxies**, no solo en local.
- [ ] La limitación de «un solo contenedor» **está escrita en el código**.
- [ ] Hay interruptor para apagar el canal en las pruebas.

## Trampas

- **`EventSource` reconecta solo** y puede duplicar suscripciones si no se cierra al desmontar. Una
  mesa abierta seis horas con reconexiones acumuladas se come el servidor.
- **Un aviso no es un suceso.** El registro cuenta lo que pasó; el aviso dice a alguien que mire.
  Mezclarlos hace que el registro se llene de ruido personal.
- **En local no hay proxies.** El canal funcionará perfecto en tu máquina y llegará a ráfagas en
  producción. **Pruébalo detrás de la pila real antes de darlo por hecho.**

## Commits

```
feat(api): the two notifications nobody was emitting
feat(web): notifications get an inbox, and a badge that stays quiet at zero
feat(api,web): a live channel that carries notices, not data
```

## Definición de terminado

`pnpm verify` verde, el e2e de dos navegadores corrido, la mutación de la fuga probada, y **la
comprobación detrás de nginx y Traefik hecha en el servidor**, no supuesta.
