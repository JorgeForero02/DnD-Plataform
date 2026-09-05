# Plan 12 · El aviso (N1 · A1-avisos · D-OP-22)

> **Léete antes su acompañante:**
> [el nervio en vivo — el transporte](../../specs/2026-09-05-nervio-en-vivo-transporte-design.md)
> (2026-09-05). Contesta por qué SSE y no WebSocket ni Redis, qué hay que dejar preparado para que
> la fase 3.C no obligue a rehacerlo, y **corrige cuatro números de este plan que ya no son
> ciertos** — el sondeo no es uno sino **diez**, las invalidaciones no son 47 sino **93**, falta el
> latido del canal, y `EventSource` puede colgar la aplicación en local a la tercera pestaña. Este
> fichero no se reescribe: es un encargo fechado.

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


---

## Avance — lo escribe quien ejecuta este plan

> **Obligatorio, y se escribe MIENTRAS se trabaja, no al final.** Si la sesión se queda sin contexto
> o muere, **esto y el prompt de arranque son lo único que sabe la siguiente**. Una línea por paso,
> con su commit. Nada de memoria: `fichero:línea` o no cuenta.

| Estado | Cuándo | Qué |
|---|---|---|
| ✅ hecho | 2026-09-05 | **12.1 · los dos avisos que nadie emitía.** Emisores: `apps/api/src/comments/comments.service.ts:78` (`comment.added`, **fuera** de la transacción) y `apps/api/src/sessions/sessions.service.ts:148` (`session.scheduled`, en `create` y en `update` **solo si la fecha cambia**). Oyentes: `apps/api/src/notifications/notifications.service.ts:176` y `:236`, con `visoresDeLaMesa()` extraído en `:99`. Pruebas: `apps/api/src/notifications/notifications.service.spec.ts` (17 verdes) y `apps/api/test/notifications.e2e-spec.ts` (7 verdes). **Mutación probada**: sin `canView`, roja **solo** «NO llega a quien no puede ver la ficha». **Commit `98fa00b`** |
| ✅ hecho | 2026-09-05 | **Fallo ajeno al plan, encontrado por el camino.** La suite `notifications` de la API estaba **roja en `main`**: `POST /campaigns/:id/invites` daba 400 a una petición sin cuerpo aunque su esquema tiene todo opcional. Arreglado en `apps/api/src/common/zod-validation.pipe.ts:20`, con tres pruebas en su spec. **Commit `98fa00b`** |
| ✅ hecho | 2026-09-05 | **12.2 · la bandeja.** `apps/web/src/features/notifications/`: `api.ts` (las dos rutas que ya existían), `hooks.ts` (`SONDEO_DE_AVISOS_MS = 30_000`, sin sesión no pregunta), `vocabulario.ts` (`Record` **exhaustivo** por tipo: frase y destino) y `BandejaDeAvisos.tsx`. Montada en el chrome (`apps/web/src/ui/AppShell.tsx:121`) y en la banda de la mesa (`features/sessions/BandaDeMesa.tsx:108`), que vive fuera de `AppShell`. Icono nuevo: `ui/Iconos.tsx:341`. Pruebas: `features/notifications/__tests__/BandejaDeAvisos.test.tsx` (7) y `apps/web/e2e/bandeja-de-avisos.spec.ts` (dos navegadores). **Commit `e2dc957`** |
| ✅ hecho | 2026-09-05 | **12.3 · el nervio en vivo (D-OP-22).** API: `apps/api/src/live/live-bus.ts` (mensaje agnóstico del transporte, limitación de un solo contenedor escrita dentro), `live.service.ts` (`assertCanJoin` en su propio método; billete de un solo uso, 30 s), `live.controller.ts` (latido de 15 s, `X-Accel-Buffering: no`). Emisión **solo** en `apps/api/src/game-events/game-events.service.ts:97`, tras el commit. Web: `apps/web/src/features/live/canal.ts`, montado en `pages/CampaignDetailPage.tsx` y `pages/SesionPage.tsx`. Sondeo unificado en `apps/web/src/lib/sondeo.ts` a **60 s** (11 puntos). Pruebas: `apps/api/src/live/live.service.spec.ts` (8) y `apps/web/e2e/nervio-en-vivo.spec.ts` (2, con control). **Commit `06a8875`** |
| ⛔ bloqueado | 2026-09-05 | **La comprobación de `X-Accel-Buffering` detrás de nginx y Traefik**, que la «Definición de terminado» exige hacer **en el servidor**. El prompt de arranque prohíbe desplegar esta noche; las dos no se pueden cumplir a la vez. Se deja escrito y sin dar por hecho. |

**Leyenda:** ⬜ sin empezar · 🟨 en marcha · ✅ hecho · ⛔ bloqueado (di por qué y qué descartaste).

**Lo que decidí por los cuatro pasos** (qué no cuadraba · qué elegí · por qué es duradero · la
fuente si la hubo):

- **El aviso del comentario pasa por `canView`, y esa es la mitad del punto de 12.1.** «Han
  comentado esta ficha» confirma que la ficha existe, que es justo lo que esconde `DM_ONLY`. Va al
  DM y al autor **y solo si además pueden verla**: ser DM no da acceso a una ficha que no ves.
- **El cuerpo del comentario no viaja**, igual que no viaja en su suceso: el hilo ya tiene su
  puerta, y una segunda copia del texto sería una segunda puerta con otras reglas.
- **Una sesión se anuncia cuando GANA fecha, no en cada `update`.** Sin fecha no hay nada que
  apuntar, y volver a guardar la misma fecha no es una noticia. Quitarla tampoco se anuncia.
- **El aviso sale FUERA de la transacción del comentario.** Dentro se habría escrito aunque el
  comentario acabase deshecho, y el oyente lee la ficha por su cuenta: dentro leería filas sin
  confirmar.
- **Un POST sin cuerpo no es un cuerpo inválido** (fallo ajeno al plan, encontrado porque la suite
  de avisos estaba roja en `main`). Con todos los campos opcionales, `undefined` vale como `{}` —y
  **solo** en el cuerpo, y **solo** si el esquema no exige nada.

- **La bandeja se monta en DOS sitios y es el MISMO componente.** La mesa vive fuera de
  `AppShell` y no hereda la cabecera; dos bandejas serían dos contadores y uno acabaría mintiendo.
- **Sin sesión la bandeja no pregunta.** La cabecera se pinta también en `/acerca-de`, en la
  invitación y en el 404: sin el candado sería un 401 garantizado por cada carga.
- **Abrir un aviso ES leerlo, pero solo se marca si hacía falta.** Una petición por cada clic en
  algo ya leído es ruido contra el servidor.
- **El `Record` del vocabulario es exhaustivo a propósito**: un tipo nuevo en `@dnd/shared` sin
  frase aquí **no compila**, en vez de asomar su enumeración en la bandeja de alguien.
- **Sin destino no se finge uno**: un aviso al que le falta el sujeto se pinta sin enlace, porque
  llevar a un 404 es peor que no llevar a ninguna parte.
- **Dos pruebas de pantalla tuvieron que ganar `QueryClientProvider`** (`AccountPage` y
  `NotFoundPage`): la cabecera dejó de ser solo maquetación. En la aplicación real el proveedor
  envuelve `App` entero (`apps/web/src/main.tsx:27`), así que la prueba se acerca a lo que se
  monta de verdad en vez de alejarse.

- **El canal manda avisos y NO datos, y por eso no filtra.** Un canal tonto no puede filtrar mal.
  El coste son ~60 ms de más por recarga; el beneficio es que `canView` sigue viviendo en un solo
  sitio.
- **El billete se comprueba DOS veces**: al emitirlo y al canjearlo. Entre las dos cosas caben
  treinta segundos, y en treinta segundos a alguien se le puede haber echado de la mesa.
- **`assertCanJoin` está fuera del controlador de SSE** para que el WebSocket de la fase 3.C lo
  reutilice, en vez de escribir la segunda copia de «quién puede» que este proyecto prohíbe.
- **El latido no estaba en el plan y sí en el acompañante**, y sin él el canal parece roto: el
  navegador reconecta cada minuto sin ningún error visible.
- **El sondeo se unificó en una constante y bajó a 60 s.** Eran diez intervalos con cuatro valores
  en siete módulos; once ediciones para cambiar un número, y el olvidado no da error. Queda **una
  excepción declarada**: la petición de tirada, a 15 s, porque es una pregunta hecha en voz alta.
- **La prueba del nervio necesita su control.** Con el canal apagado, la campana no se enciende
  sola: sin esa segunda prueba, la primera solo demostraría que el aviso se escribió.

**Lo siguiente exacto, si me quedo aquí:**

- **El plan 12 está cerrado menos un punto**, y ese punto es el ⛔ de arriba: `X-Accel-Buffering`
  **detrás de nginx y Traefik de verdad**, que exige desplegar. El resto está verde y medido.
- Referencia del transporte, si hace falta volver: `docs/superpowers/specs/2026-09-05-nervio-en-vivo-transporte-design.md`**:
  corrige cuatro números del plan (no hay «un sondeo» sino **diez `refetchInterval` con cuatro
  valores**, son **93** invalidaciones y no 47, falta el **latido** cada 15-20 s, y `EventSource`
  gasta una de las seis conexiones por origen en HTTP/1.1, que muerde **en local con Vite**).
