# Pendientes

Deuda conocida y decisiones abiertas. Cada línea: qué, por qué importa, y la evidencia de
que existe. **Subir de nivel de verificación o pagar deuda es una tarea con su ficha, nunca
un efecto colateral de la siguiente funcionalidad.**

Última revisión: 2026-09-01.

## Antes de la primera partida

> **La primera partida queda aplazada por decisión del autor (2026-09-01):** no se juega hasta
> tener al menos el tablero 2D de la fase 3, y quizá tampoco antes de las reglas de la fase 2.
> **Eso suspende la regla de fase del plan**, que exigía usar una fase antes de empezar la
> siguiente. Las tres carencias de abajo dejan de bloquear nada inmediato, pero siguen abiertas
> y las dos primeras entran igual como tareas 1.15 y 1.16.
>
> **El riesgo que se acepta, escrito para que nadie lo descubra tarde:** los planes de las
> fases 2 a 5 se escribirán **sin realimentación de uso real**, que es exactamente lo que la
> regla quería evitar. Para la fase 2 es tolerable —las reglas de 5e están escritas y no
> dependen de esta mesa—; **para la fase 3 no**, porque un tablero se diseña alrededor de cómo
> juega la gente. Si se llega a la 3 sin haber jugado, su plan debería empezar por una sesión
> de prueba aunque sea con lo que haya.

La fase 1 está construida y verificada (ver
[09-primera-partida.md](./09-primera-partida.md) para el guion de esa sesión cuando llegue). Estas tres son las que se notan en la
mesa, en orden de cuánto estorban:

**1 · No se puede borrar casi nada desde la interfaz.** Solo enlaces y comentarios tienen
botón. Una entidad, una sesión o un personaje creados por error **se quedan para siempre**,
aunque `DELETE` exista y esté probado en la API para los tres. Es la carencia que más se va a
notar: en una partida se crean cosas mal. **Es trabajo solo de web.**

**2 · La web no conoce su propio identificador de usuario.** `auth.store.ts` deja `user: null`
tras recargar, así que ningún botón se oculta por permiso: un jugador ve "Nuevo" en Sesiones,
lo pulsa y recibe un 403. El error **se ve** —eso se arregló en 1.12b— pero la pantalla ofrece
lo que el servidor va a rechazar. Bloquea además dos fichas de P3 (las filas que son botón de
editar sin poder editarlas). **La autorización del servidor no depende de esto**: es
honestidad de la interfaz, no seguridad.

**3 · No hay despliegue.** Sin VPS, la partida se juega en local y los jugadores tienen que
estar en la misma red. Si se quiere que entren desde sus casas, esto **sí** es bloqueante.
Decisión aparte, no configuración. Ver [03-despliegue.md](./03-despliegue.md).

Las dos primeras se pueden cerrar antes de jugar; la tercera es una decisión de alcance.

## Cerrados

**~~Una invitación pendiente huérfana mete a cualquiera en la campaña ajena~~ — CERRADO el
2026-09-01 (tarea 1.14-fix). Crítico verificado en el código por una revisión independiente.**
`JoinPage.tsx` guardaba el token en `localStorage` sin caducidad si el invitado no volvía;
nada lo borraba —`logout()` solo quitaba `dnd_token`— y **cualquier** autenticación posterior
en ese navegador (`LoginPage.tsx`/`RegisterPage.tsx`) lo leía y navegaba a `/join/:token`,
donde la aceptación se disparaba sola al montar sin pedir confirmación. En un portátil
compartido de mesa, el siguiente en iniciar sesión ahí acababa dentro de la campaña como
`PLAYER` sin pulsar nada, y el token quedaba quemado para el invitado real. Arreglo de tres
partes: (1) `/join/:token` ya no acepta al montar — con sesión, muestra una confirmación y
espera un clic explícito en "Unirse a la campaña", y dice que aceptar consume el enlace
(cierra también el caso del DM que abre su propio enlace y lo quemaba sin querer); (2)
`logout()` borra la invitación pendiente igual que borra `dnd_token`; (3) la invitación
pendiente caduca a los 5 minutos (sello de tiempo junto al token en `localStorage`), lo que
también cierra el caso de un token viejo desviando un login normal a una pantalla de error.
La guarda `attempted = useRef(false)` no se tocó — sigue protegiendo un doble clic rápido en
vez del efecto de montaje. Detalle completo, con las ocho partes de la revisión, en la
entrada de 1.14-fix en [07-historial.md](./07-historial.md).

**~~Falta el flujo de invitación en la interfaz~~ — CERRADO el 2026-08-31 (tarea 1.14).** El
DM genera un enlace de invitación desde `features/invites/InvitePanel.tsx` (montado en la
pestaña Resumen de `CampaignDetailPage.tsx`) y lo ve completo en pantalla, seleccionable, con
un botón de copiar que **muestra el fallo en vez de mentir** si el portapapeles del navegador
lo rechaza — el enlace sigue visible en cualquier caso. `/join/:token`
(`pages/JoinPage.tsx`), fuera de `ProtectedRoute` a propósito, cubre los tres caminos: sin
sesión guarda el token en `localStorage` (junto a `dnd_token`, que es donde ya vive el estado
de sesión) y lo limpia al consumirlo; con sesión acepta contra la API real y navega a
`/campaigns/<campaignId>` con el id que devuelve el servidor; token inválido o ya usado
muestra el mensaje del servidor con salida al listado. `LoginPage.tsx`/`RegisterPage.tsx`
resumen la invitación pendiente en vez de aterrizar en el listado, para que el jugador no
tenga que volver a pegar el enlace. Generar la invitación es solo del DM en el servidor
(`requireDM`), pero el botón se muestra a todo el mundo — mismo bloqueante de siempre,
`auth.store.ts:13` — y es el 403 del servidor el que habla si un jugador lo pulsa.

Dos defectos reales, cazados solo por el e2e de Playwright contra la API real (las unitarias
simulan `api.ts` y no los veían): `createInvite`/`acceptInvite` mandaban un `POST` sin cuerpo
con `Content-Type: application/json`, que Fastify rechaza con 500 antes de llegar al
controlador — arreglado enviando `{}`. Y la primera versión de `JoinPage.tsx` disparaba la
aceptación con `useMutation` dentro de un `useEffect` de montaje: contra la API real, con
`React.StrictMode` montando dos veces en desarrollo, el `201` volvía del servidor pero el
`isSuccess` de la mutación nunca llegaba a reflejarse en un render nuevo, y la pantalla se
quedaba en "Aceptando invitación…" para siempre con la invitación ya aceptada en la base de
datos. Se cambió a llamar `acceptInvite` directamente y guardar el resultado con `useState`,
sin pasar por `useMutation` — ver la entrada de 1.14 en [07-historial.md](./07-historial.md)
para la secuencia de logs que lo confirmó.

Nuevo pendiente que esto deja abierto: **el token de invitación no caduca y no es
revocable** (servidor, desde la tarea 1.4 — `invites.service.ts`), y hasta ahora era un
detalle interno; con esta tarea el DM lo ve y lo comparte, así que un enlace filtrado o
reenviado por error sigue siendo válido indefinidamente hasta que alguien lo use. No se
arregla aquí — tocaría `apps/api`, fuera de alcance de 1.14 — pero conviene que su ficha
quede junto a la interfaz que lo hace visible, no solo en la fila de servidor de abajo.

**Sigue abierto tras 1.14-fix, mismo motivo, ahora más visible.** `InvitePanel.tsx` deja
generar un enlace nuevo cuantas veces el DM quiera, y cada uno anterior **sigue válido en el
servidor**: no hay listado de invitaciones vivas ni forma de revocar una desde la interfaz. Un
DM que pulsa "Generar invitación" dos veces creyendo que refresca el enlace deja el primero
flotando, sin verlo ni poder anularlo. El arreglo mínimo de 1.14-fix es honesto, no funcional:
la pantalla avisa de que generar otro enlace no anula los anteriores
(`features/invites/InvitePanel.tsx`). Arreglarlo de verdad pide un endpoint de listado y otro
de revocación en `apps/api` (fuera de alcance del brief de 1.14-fix, que prohíbe tocar
`apps/api`) — misma familia de deuda que la caducidad del párrafo de arriba: los dos piden
tocar `invites.service.ts`/`invites.controller.ts`, así que conviene resolverlos juntos en la
misma tarea de servidor cuando se aborde.

**~~Faltan editores de sesión y personaje~~ — CERRADO el 2026-08-31 (tarea 1.13).**
`SessionsTab` y `CharactersTab` (`CampaignDetailPage.tsx`) eran de solo lectura; ahora ganan
botón "Nuevo" y sus filas abren el editor correspondiente en modo edición, igual que la
pestaña de entidades. `SessionEditor.tsx` y `CharacterEditor.tsx` siguen el patrón
`api.ts` + `hooks.ts` + componente + `__tests__` de `features/links` y `features/comments`.
El selector de visibilidad de `CharacterEditor.tsx` recorta `SPECIFIC_PLAYERS` (inerte) y
conserva `PUBLIC`/`PLAYERS`/`OWNER_DM`/`DM_ONLY`. El de `SessionEditor.tsx` recorta además
`OWNER_DM` (revisión de 1.13-fix: en una sesión resuelve exactamente igual que `DM_ONLY`, no
solo "con nombre redundante"), y ofrece `PUBLIC`/`PLAYERS`/`DM_ONLY`; la justificación
completa está en [05-datos.md](./05-datos.md). Se añadió el recorrido de Playwright que
faltaba: crear una sesión `DM_ONLY` y un personaje `PUBLIC` desde sus pestañas, reabrir los
dos en modo edición para comprobar la precarga contra la API real, **guardar la edición de
los dos** y comprobar el resultado en la lista, y vaciar y guardar las notas de la sesión
para comprobar que el `PATCH` real las borra en vez de omitir la clave.
Ver [07-historial.md](./07-historial.md).

**~~El modo edición del editor de entidades no precarga los `specificPlayerIds`
existentes~~ — CERRADO el 2026-08-31 (tarea 1.12a-fix).** La consecuencia real era peor de lo
que decía esta ficha: no era un riesgo eventual, era **destrucción determinista y silenciosa**.
Cualquier edición de una entidad `SPECIFIC_PLAYERS` — aunque solo tocara el nombre — mandaba
`specificPlayerIds: []`, el servicio interpretaba el array vacío como "borra todo y no crees
nada" (`entities.service.ts:112-119`), y la entidad quedaba en `SPECIFIC_PLAYERS` con cero
concesiones: un `DM_ONLY` disfrazado, sin ningún aviso en pantalla. Se arregló con precarga
real (`GET .../entities/:entityId` ya devolvía `grants`; ahora se pide en modo edición vía
`useEntity` y siembra la selección) y una guarda de carrera: mientras el detalle no ha llegado,
`specificPlayerIds` no se manda. De paso se cerró el fallo hermano de que el selector de
jugadores mostraba todas las casillas vacías aunque hubiera concesiones vivas (misma causa raíz,
prueba propia). Ver [07-historial.md](./07-historial.md).

**~~Playwright no está instalado~~ — CERRADO el 2026-08-31.** Chromium, dos recorridos
cubiertos (registro → campaña → NPC → verlo; y cerrar sesión), trabajo `e2e-browser` propio en
CI con el informe como artefacto. Se comprobó que las pruebas **pueden fallar**: con la guarda
de `ProtectedRoute` rota a mano, las 7 de componente siguen verdes y el e2e la caza. Ver
[08-pruebas.md](./08-pruebas.md).

**~~P1 · ESLint no existe~~ — CERRADO el 2026-08-31.** ESLint 9 con configuración plana en la
raíz, Prettier, `pnpm verify` completo y gancho de pre-commit que bloquea. CI corre lint y
formato. Los 15 errores que encontró la primera pasada se arreglaron **corrigiendo el
código**, no silenciando reglas: diez `any` en los cuerpos de los controladores pasaron a los
tipos de `@dnd/shared`, tres `require("supertest")` a `import`, un import sin usar fuera, y
los `updateSessionSchema` / `updateCharacterSchema` que vivían duplicados en un controlador y
en un servicio se mudaron a `@dnd/shared`, que es donde la convención dice que vive la forma
de los datos. Ver [07-historial.md](./07-historial.md).

**~~El e2e verde de 1.12b no ejecutaba el código nuevo~~ — CERRADO el 2026-08-31
(1.12b-fix).** El único recorrido de Playwright existente pulsaba `Nuevo` y guardaba: nunca
entraba en modo edición, y los dos paneles (`LinksPanel`, `CommentThread`) solo se pintan con
`isEdit && entity` (`EntityEditor.tsx`). El e2e pasaba sin haber pintado nunca esos
componentes en un navegador real. Se añadió el recorrido que faltaba —crear dos NPCs, abrir
uno en modo edición, enlazarlo con el otro y publicar un comentario, contra la API real— y de
paso se cerraron cinco hallazgos más de una revisión independiente: el borrado de un enlace o
un comentario ajeno fallaba en silencio (sin `onError`, arreglado reusando el `error` que ya
existía), el selector de destinos de enlace quedaba obsoleto hasta 30 s tras crear o renombrar
una entidad (`allEntitiesKey` es una rama distinta de `entitiesKey` y no se invalidaba), el
desplegable ofrecía destinos ya enlazados (choca con `@@unique([fromId, toId, label])` y da
500 en crudo), y las pruebas de `EntityEditor` en modo edición disparaban `fetch` reales sin
espiar. Ver [07-historial.md](./07-historial.md).

## P1 — Huecos de verificación

**No hay prueba de accesibilidad, responsive ni rendimiento.** Ninguna herramienta lo mira
hoy.

## P2 — Ruta de mejora del nivel

**Linting sin información de tipos.** `typescript-eslint` corre en modo básico; el modo
*type-checked* (que ve los tipos y caza promesas sin esperar, comparaciones imposibles y
`any` implícitos que hoy pasan) exige apuntar cada paquete a su `tsconfig` y cuesta tiempo de
CI. Decisión: se activa como tarea propia, no de rebote.

**Sin umbral de cobertura (N2) ni mutación (N3).** No declarados y no prometidos. Ruta de
mejora, no compromiso.

**No hay prueba de rechazo por validación** en personajes (`level > 20` devuelve 400 y nadie
lo comprueba). Detectado en la tarea 1.9.

## P3.5 — Limitaciones conocidas de la tarea 1.13-fix

- **No se puede borrar la fecha de una sesión desde la web.** `createSessionSchema.scheduledAt`
  es `z.coerce.date().optional()`, **sin `.nullable()`**
  (`packages/shared/src/session.schema.ts`), así que no existe ningún valor que
  `SessionEditor.tsx` pueda enviar en el `PATCH` que signifique "quita la fecha que ya tenía
  la sesión": omitir la clave dice "no la toques", y no hay una representación de "vacío" que
  el esquema acepte para `Date`. Arreglarlo pide `.nullable()` en el esquema y `data.scheduledAt
  = null` en `sessions.service.ts` cuando llega `null` — cambios en `packages/shared` y
  `apps/api`, fuera de alcance de esta tarea (prohibido tocarlos en el brief de 1.13-fix). El
  resto de campos opcionales de sesión y personaje (`notes`, `race`, `class`, `bio`) sí se
  pueden vaciar desde el editor, enviando la cadena vacía en vez de omitir la clave.
- **La precarga de la fecha de una sesión en `SessionEditor.test.tsx` solo cuadra por
  coincidencia.** `<input type="datetime-local">` tiene precisión de minutos;
  `toDatetimeLocal` (`SessionEditor.tsx`) descarta los segundos al convertir el ISO del
  servidor al valor del input. El fixture de la prueba usa una hora con segundos en `:00`
  (`20:00:00Z`), así que el ida y vuelta (ISO → input → `new Date(...).toISOString()`) da el
  mismo valor y la aserción pasa. Con una hora real como `20:00:30Z` el input truncaría a
  `20:00` y la vuelta a ISO perdería los `:30`, así que la misma aserción **fallaría**. No es
  un fallo del código de producción — es una limitación real y aceptada de
  `datetime-local` (no hay forma de teclear segundos con ese tipo de input) — pero la
  prueba no lo demuestra hoy: pasa por la casualidad del fixture, no porque compruebe la
  pérdida. Comentario dejado en el propio fixture
  (`apps/web/src/features/sessions/__tests__/SessionEditor.test.tsx`).

## P3 — Correcciones funcionales conocidas

Ninguna es un agujero de lectura —nadie ve contenido ajeno—, pero todas degradan el
comportamiento:

- **Un enlace duplicado devuelve 500 en vez de 409** (choca contra el índice único de
  `EntityLink`). Tarea 1.6.
- **Crear un enlace no comprueba la visibilidad del destino** → sirve de oráculo de
  existencia para un identificador ajeno. Tarea 1.6.
- **Aceptar una invitación no es transaccional** y **el token no caduca ni es revocable**.
  Tarea 1.4; visible desde la interfaz desde la 1.14 (ver "Cerrados" arriba) — el DM ahora ve
  y comparte el enlace, así que la falta de caducidad deja de ser un detalle interno.
- **`specificPlayerIds` no se valida contra los miembros de la campaña**: se puede conceder
  acceso a alguien de fuera. Queda inerte, pero se guarda. Tarea 1.5.
- **Los `grants` son inertes si la visibilidad no es `SPECIFIC_PLAYERS`**, y aun así se
  aceptan sin aviso. Tarea 1.5.
- **`Session` y `Character` no tienen `grants` ni creador propio** → `SPECIFIC_PLAYERS` es
  inerte en ellos y **el dueño de un personaje no ve el suyo si lo marca `DM_ONLY`**.
  Tareas 1.8 y 1.9.
- **Las filas de la lista de entidades son botón de editar aunque el servidor vaya a devolver
  403.** `CampaignDetailPage.tsx` no distingue si el usuario puede modificar la entidad antes
  de pintar el botón; se descubre el 403 al intentar guardar. Detectado en la revisión de
  1.12a, no arreglado (fuera del alcance de 1.12a-fix). **La tarea 1.13 repite el mismo
  patrón a propósito** en `SessionsTab` y `CharactersTab`: toda fila abre el editor, y crear
  o editar una sesión es solo del DM (editar un personaje, del dueño o el DM). El brief de
  1.13 lo pide explícitamente — "no intentes ocultar botones según permiso: no tienes con qué"
  — porque `auth.store.ts:13` sigue sin conocer el id del usuario tras recargar; lo que sí
  hacen `SessionEditor.tsx` y `CharacterEditor.tsx` es pintar el 403 del servidor en el
  formulario en vez de fallar en silencio. Mismo bloqueante que la línea de abajo. **La 1.14
  hace la misma elección con `InvitePanel.tsx`**: el botón "Generar invitación" se muestra a
  todo el mundo en la pestaña Resumen, aunque el servidor lo rechace con 403 si quien pulsa
  no es el DM (`invites.service.ts`, `requireDM`) — mismo bloqueante, mismo motivo.
- **No hay botón de borrar sesión o personaje en la interfaz**, aunque la API lo soporte
  (`DELETE /campaigns/:id/sessions/:sessionId`, `DELETE /campaigns/:id/characters/:characterId`,
  ambos ya probados). El brief de 1.13 pedía dos editores de creación/edición, no borrado;
  queda fuera a propósito, no es un olvido.
- **`auth.store.ts:13` deja `user: null` tras recargar la página**: el token persiste en
  `localStorage` pero el usuario no, así que la web no conoce su propio identificador hasta el
  siguiente login. Detectado en la revisión de 1.12a, no arreglado.
- **Los botones "Quitar" (`LinksPanel.tsx`) y "Borrar" (`CommentThread.tsx`) se pintan en
  todas las filas, sin mirar si el usuario es DM o autor.** El servidor sí rechaza
  (`links.service.ts:75`, `comments.service.ts:65`, ambos 403), y desde 1.12b-fix el fallo ya
  se ve como mensaje en vez de callar; pero el botón sigue ahí para quien nunca podrá usarlo.
  Es el mismo problema de fondo que la fila de la entidad de arriba: no se puede ocultar el
  botón con criterio hasta que la web conozca su propio identificador de usuario — mismo
  bloqueante que `auth.store.ts:13`. Detectado en la revisión de 1.12b, no arreglado a
  propósito (fuera del alcance de 1.12b-fix).
- **Falta `key` en `EntityTab` al cambiar de pestaña** (`CampaignDetailPage.tsx:135`): hoy es
  inofensivo porque `EntityTab` es la única instancia en esa posición del árbol, pero es un
  riesgo latente si el modal deja de comportarse como modal (p. ej. dos `EntityTab` a la vez).
  Observación del revisor de 1.12a, no arreglado.
- **El modal del editor de entidades no tiene `role="dialog"` ni se cierra con Escape**
  (`EntityEditor.tsx`). Observación del revisor de 1.12a, no arreglado.

## P4 — Limpieza

- **`viewerFor(userId, campaignId)` está duplicado** en los servicios de entidades, enlaces,
  comentarios, sesiones y personajes. Candidato a extraerse a `common/`. Detectado en 1.7.
- **`CreateCampaignModal` mantiene un estado de error local** que duplica `mutation.error`.
  Tarea 1.10.
- **Avisos ruidosos que conviene callar bien, no silenciar**: `ts-jest` se queja de compilar
  los `.js` de `packages/shared/dist` en los e2e, y Vite avisa de que
  `apps/web/postcss.config.js` no declara tipo de módulo. Ninguno lo tapa ESLint: son de
  otras herramientas.
- **No hay política de retención de datos escrita.** Hace falta antes de que el sistema deje
  de ser de uso personal. Ver [05-datos.md](./05-datos.md).

## Decisiones abiertas

- **Sin VPS asignado**: el despliegue en Coolify está preparado y **diferido**. La parte de
  despliegue de la tarea 1.14 no se ejecuta; solo se construye la interfaz de invitación.
- **Sin sistema de diseño** para el MVP: decisión explícita, no olvido.
- **Fases 2–5** (reglas, mapas, tiempo real, 3D/IA) solo tienen alcance, no plan. Cada una
  recibe el suyo al llegar, y **no se empieza la siguiente hasta usar la anterior en una
  sesión real**.
