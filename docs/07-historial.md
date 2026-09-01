# Historial

Qué se entregó, por qué, y cómo revertirlo. Fechas absolutas. El detalle por tarea —commit,
número de pruebas, resultado de la revisión— vive en el ledger
`.superpowers/sdd/progress.md`; aquí van los hitos.

---

## 2026-09-01 — Arreglos de la revisión del flujo de invitación (1.14-fix)

**Qué.** Una revisión independiente de 1.14 encontró un **Crítico** verificado en el código:
una invitación pendiente quedaba en `localStorage` para siempre — nada la borraba si el
invitado no volvía (`logout()` solo quitaba `dnd_token`; no había caducidad) — y **cualquier**
autenticación posterior en ese navegador la leía y navegaba a `/join/:token`, donde la
aceptación se disparaba sola al montar sin pedir confirmación. En una mesa con un portátil
compartido, el siguiente que iniciara sesión ahí —otro jugador, el DM— acababa dentro de la
campaña como `PLAYER` sin pulsar nada, y el token quedaba quemado: el invitado legítimo
recibía "Invalid or already-used invite".

**Arreglo 1 (el Crítico), con sus tres partes:**

1. **`/join/:token` ya no acepta al montar.** Con sesión activa, la página muestra una
   confirmación ("Estás a punto de unirte a una campaña con esta invitación.") y espera un
   clic en "Unirse a la campaña" (`JoinPage.tsx`). La guarda `attempted = useRef(false)` sigue
   ahí, sin tocar — ahora protege el clic explícito de un doble clic rápido en vez del efecto
   de montaje bajo StrictMode.
2. **`logout()` borra la invitación pendiente** (`auth.store.ts`), igual que borra
   `dnd_token`.
3. **La invitación pendiente caduca a los 5 minutos** (`PENDING_INVITE_TTL_MS`,
   `features/invites/api.ts`): el guardado ahora lleva un sello de tiempo
   (`{ token, savedAt }` en vez del token suelto) y `peekPendingInvite()` descarta y borra la
   entrada si ya pasó el plazo. Cinco minutos alcanza para completar un login o un registro
   corto sin tener que volver a pegar el enlace, y es corto a propósito: quien se aleja de un
   portátil compartido en la mesa no debería dejarle a la siguiente persona una invitación
   utilizable pasado ese rato. Una entrada con formato antiguo (token suelto, sin `savedAt`,
   de antes de este cambio) se trata como caducada.

**Arreglo 2 (Importante).** Mismo origen: antes, quien abriera el enlace ya autenticado lo
consumía aunque solo quisiera mirarlo — el caso típico es el DM comprobando su propio enlace
antes de mandarlo. Lo cierra el clic explícito del arreglo 1, y la pantalla de confirmación
dice explícitamente que aceptar consume el enlace. `apps/web/e2e/invitacion.spec.ts` ahora
comprueba este caso: el DM visita su propio enlace, ve la confirmación, pulsa "Cancelar" sin
aceptar, y el mismo enlace **sigue funcionando** cuando el jugador lo usa después.

**Arreglo 3 (Importante).** `LoginPage.tsx`/`RegisterPage.tsx` seguían desviando a
`/join/...` mientras existiera la clave en `localStorage`, sin distinguir una invitación
reciente de una de hace semanas ya usada. Lo cierra la caducidad del arreglo 1: expirada la
entrada, `peekPendingInvite()` devuelve `null` y el login/registro navegan a `/` como
siempre. Se añadió la prueba que faltaba: `LoginPage.test.tsx` (y, por simetría,
`RegisterPage.test.tsx`) comprueban que sin invitación pendiente el flujo normal navega al
listado.

**Arreglo 4 (Importante).** La guarda `attempted` no la protegía ninguna prueba unitaria:
`JoinPage.test.tsx` usaba `toHaveBeenCalledWith`, que no cuenta invocaciones, y
`setupTests.ts` no probaba nada bajo `<React.StrictMode>`. Se añadieron las tres pruebas que
faltaban (todas vistas en rojo antes del arreglo correspondiente):
- `JoinPage` bajo `<React.StrictMode>`, dos clics rápidos en "Unirse a la campaña" →
  `acceptInvite` se llama una sola vez.
- Tras un intento de aceptar (éxito o error), `peekPendingInvite()` es `null`.
- `LoginPage` sin invitación pendiente navega a `/`.

Y se corrigió `InvitePanel.test.tsx:61-64` ("una sola persona"), que comprobaba un párrafo
estático pintado siempre, sin depender de ninguna interacción — pasaba por construcción. Se
quitó y se sustituyó por dos pruebas que sí dependen del estado: el aviso de "no anula el
anterior" (arreglo 6) solo aparece tras generar un enlace, y el mensaje de error traducido
(arreglo 8) solo aparece cuando `createInvite` falla.

**Arreglo 5 (Menor).** `JoinPage.tsx` no invalidaba la consulta de campañas al aceptar: un
jugador que ya había cargado "Mis campañas" podía tardar hasta 30 s
(`staleTime`, `lib/queryClient.ts`) en verla ahí. Ahora invalida `campaignsKey`
(`features/campaigns/hooks.ts`) justo antes de navegar a la campaña.

**Arreglo 6 (Menor).** Generar un enlace nuevo no anula el anterior en el servidor —no hay
revocación—, y `InvitePanel.tsx` no lo decía. Ahora, una vez hay un enlace en pantalla,
aparece un aviso explícito de que generar otro no invalida los anteriores. La revocación de
verdad necesita API que no existe hoy: fichada en [06-pendientes.md](./06-pendientes.md), sin
tocar `apps/api`.

**Arreglo 7 (Menor).** Corrección de una lección falsa que este mismo documento y
`08-pruebas.md` habían dejado: "la suscripción de `useMutation` se rompe con montaje +
StrictMode" no está demostrado como regla general — ver la nota de corrección en la entrada
de 1.14 más abajo y en [08-pruebas.md](./08-pruebas.md).

**Arreglo 8 (Menor).** Los dos mensajes de error conocidos del servidor
("Invalid or already-used invite", "DM role required") llegaban en inglés a una interfaz en
español, justo a alguien que acaba de entrar por un enlace sin más contexto.
`translateInviteError` (`features/invites/api.ts`) traduce esos dos casos exactos y deja
pasar cualquier otro mensaje tal cual, sin inventar uno que tape la causa real.

**Prohibido, respetado.** No se tocó `apps/api` ni `packages/shared` — la caducidad y
revocación del token en el servidor quedan en [06-pendientes.md](./06-pendientes.md). No se
quitó la guarda `attempted`. La aserción `DM_ONLY` del e2e sigue exactamente igual.

**Pruebas.** TDD: cada prueba nueva se vio en rojo por el comportamiento que le falta al
código, no por fichero ausente — confirmado corriendo `vitest run` contra la implementación
anterior antes de escribir cada arreglo. Unitarias nuevas o reescritas: `api.test.ts` en
`features/invites/__tests__/` (8, nuevo — expiración de la invitación pendiente y
`translateInviteError`), `JoinPage.test.tsx` (6, reescrito para el flujo de clic explícito),
`auth.store.test.ts` (+1, logout borra la invitación pendiente), `LoginPage.test.tsx` y
`RegisterPage.test.tsx` (+1 cada uno), `InvitePanel.test.tsx` (4, una prueba estática
quitada, dos nuevas dependientes de estado). Total: **106 unitarias** (shared 10, api 37, web
59). `apps/web/e2e/invitacion.spec.ts` se actualizó para el clic explícito del jugador y para
el caso del DM que abre su propio enlace sin unirse por accidente; las 5 suites de e2e siguen
verdes.

**Revertir.** `git revert` del commit de esta tarea. No toca `apps/api` ni `packages/shared`;
no hay migración que deshacer.

---

## 2026-08-31 — Flujo de invitación en la interfaz (1.14)

**Qué.** Última tarea de construcción de la fase 1: hasta ahora no había forma de meter a un
jugador en una campaña desde el navegador.

- `features/invites/api.ts` + `hooks.ts` — `createInvite`/`acceptInvite` contra
  `POST /campaigns/:id/invites` y `POST /invites/:token/accept` (API sin tocar); solo
  `useCreateInvite` (mutación) en `hooks.ts` — ver el porqué de que no haya
  `useAcceptInvite` más abajo. `api.ts` también guarda el token de invitación pendiente en
  `localStorage` (`savePendingInvite`/`peekPendingInvite`/`clearPendingInvite`), junto a
  `dnd_token`, para que sobreviva a un login/registro.
- `features/invites/InvitePanel.tsx` — lado DM, montado en la pestaña Resumen de
  `CampaignDetailPage.tsx`. Un botón genera la invitación; el enlace completo
  (`origen + /join/token`) aparece en un `<input readOnly>` seleccionable con su propia
  etiqueta, y un botón de copiar. Si `navigator.clipboard.writeText` falla (permiso
  bloqueado), se muestra el fallo y **el enlace sigue en pantalla** — nunca un "copiado" que
  mienta. Generar la invitación es solo del DM en el servidor (`requireDM`); el botón se
  muestra a todo el mundo igual que en 1.13, porque `auth.store.ts:13` sigue sin conocer el
  id del usuario tras recargar — es el 403 del servidor el que corrige a quien no debería
  pulsarlo.
- `pages/JoinPage.tsx` — ruta `/join/:token`, deliberadamente fuera de `ProtectedRoute`
  (`App.tsx`) porque "sin sesión" es uno de los tres caminos que tiene que cubrir por sí
  sola: sin sesión guarda el token pendiente y muestra enlaces a iniciar sesión o
  registrarse; con sesión llama a aceptar el token de la URL y navega a
  `/campaigns/<campaignId>` con el id que **devuelve el servidor**; token inválido o ya usado
  muestra el mensaje legible de `lib/api.ts` con salida al listado de campañas.
- `pages/LoginPage.tsx` y `pages/RegisterPage.tsx` — tras autenticar, si hay una invitación
  pendiente guardada, navegan a `/join/<token>` en vez de al listado: la invitación se
  completa sola, sin que el jugador tenga que volver a pegar el enlace.

**Dos defectos reales, cazados solo por Playwright contra la API real** (las unitarias de
componente simulan `features/invites/api.ts` entero y no los ejercitan):

1. `createInvite`/`acceptInvite` mandaban `POST` sin cuerpo. `apiFetch` (`lib/api.ts`)
   siempre añade `Content-Type: application/json`, y Fastify rechaza esa combinación con 500
   ("Body cannot be empty…") antes de llegar al controlador. Arreglado enviando
   `JSON.stringify({})` — cambio solo en `apps/web`.
2. La primera versión de `JoinPage.tsx` disparaba la aceptación con `useMutation`
   (`useAcceptInvite`) dentro de un `useEffect` de montaje. Contra la API real, con
   `React.StrictMode` (`main.tsx`) montando el componente dos veces en desarrollo, el `201`
   volvía del servidor (confirmado con logs: `RESPONSE: 201 …/accept`) pero ninguna llamada
   a `onSuccess` ni ningún nuevo render con `isSuccess: true` llegaba a producirse — la
   pantalla se quedaba en "Aceptando invitación…" para siempre, con la invitación ya
   aceptada en la base de datos. Se comprobó también con un segundo enfoque (efecto separado
   observando `accept.isSuccess`/`accept.data` en vez de un callback ligado a la llamada de
   `mutate()`) y el bloqueo persistía igual, así que la causa no era el callback puntual sino
   la suscripción de `useMutation` en sí bajo ese patrón concreto (montaje + StrictMode).
   Arreglado quitando `useMutation` de esta ruta: `JoinPage.tsx` llama `acceptInvite`
   (`api.ts`) directamente y guarda el resultado con `useState`, ajeno al ciclo de vida de
   react-query. `useAcceptInvite` se quitó de `hooks.ts` por quedarse sin nadie que lo use;
   `useCreateInvite` (el botón del DM, disparado por clic, no por montaje) no tiene este
   problema y se queda igual.

   **Corrección (revisión de 1.14-fix, 2026-09-01):** el párrafo de arriba generaliza más de
   lo que se comprobó. Lo que hace seguro el código de hoy contra la doble invocación del
   efecto de montaje es la ref `attempted = useRef(false)`, que se añadió a la vez que se
   quitó `useMutation` — el experimento nunca aisló las dos variables. Con esa misma guarda,
   la versión con `useMutation` habría dejado de disparar una segunda aceptación igual: la ref
   corta la segunda llamada antes de que le importe si la primera se está siguiendo con una
   mutación o con `useState`. "La suscripción de `useMutation` se rompe con montaje +
   StrictMode" **no es una regla general del proyecto** — es una generalización no
   demostrada a partir de un síntoma real (el `201` sin `isSuccess` visible), y no debe
   tratarse como lección para tareas futuras. Ver la entrada de 1.14-fix más abajo.

**Pruebas.** TDD: cada prueba se vio roja por comportamiento (elemento/texto/navegación que
no existía, capturado con `vitest run` antes de escribir la implementación), no por fichero
ausente — el detalle línea a línea vive en el informe de la tarea (fuera de `docs/`; ver el
ledger `.superpowers/sdd/progress.md`). Unitarias nuevas: `InvitePanel.test.tsx` (3),
`JoinPage.test.tsx` (3), `LoginPage.test.tsx` y `RegisterPage.test.tsx` (1 cada una, el caso
"resume la invitación pendiente") — 8 pruebas nuevas, 91 unitarias en total (shared 10, api
37, web 44).
Playwright: `apps/web/e2e/invitacion.spec.ts`, primera suite del proyecto con dos
`BrowserContext` (DM y jugador, cookies y `localStorage` independientes); lee el enlace de
invitación con `inputValue()` sobre el campo real de la pantalla en vez de construirlo a
mano, y comprueba a la vez que la lista de NPCs del jugador dice "Sin elementos." y que el
NPC `DM_ONLY` del DM tiene `toHaveCount(0)` — la comprobación que la fase llevaba debiendo
desde que se instaló Playwright.

**Documentación.** `08-pruebas.md` (estado 91/19/5, recorrido nuevo documentado con los dos
defectos que cazó, "lo que falta cubrir" reducido a accesibilidad/responsive/rendimiento),
`06-pendientes.md` (cierra el flujo de invitación; abre que el token ahora es visible para
el usuario sin caducar ni poder revocarse; `InvitePanel.tsx` añadido a la lista de botones
que no se ocultan por rol), `00-INDEX.md` (fase 1 con la construcción completa, pendiente de
uso real en mesa).

**Revertir.** `git revert` del commit de esta tarea. No toca `apps/api` ni
`packages/shared`; no hay migración que deshacer.

---

## 2026-08-31 — Editores de sesión y personaje (1.13)

**Qué.** `SessionsTab` y `CharactersTab` (`CampaignDetailPage.tsx`) eran de solo lectura;
ganan botón "Nuevo" y sus filas abren el editor correspondiente en modo edición, igual que la
pestaña de entidades:

- `features/sessions/SessionEditor.tsx` — título, fecha/hora opcional (`<input
  type="datetime-local">`, convertida a ISO al enviar), notas opcionales y visibilidad.
  `features/sessions/api.ts`/`hooks.ts` ganan `createSession`/`updateSession` y sus
  mutaciones; `Session` gana el campo `notes` que ya devolvía el servidor pero el tipo no
  declaraba.
- `features/characters/CharacterEditor.tsx` — nombre, raza, clase, nivel (convertido a
  `Number(...)`, nunca la cadena cruda del `<input type="number">`) y biografía, más
  visibilidad. `features/characters/api.ts`/`hooks.ts` ganan `createCharacter`/
  `updateCharacter` y sus mutaciones; `Character` gana el campo `bio`.
- Los dos siguen la convención `api.ts` + `hooks.ts` + componente + `__tests__` en ficheros
  separados de `features/links` y `features/comments`, y la lección de la tarea anterior: la
  edición pasa el objeto ya cargado por la lista (sin `useEntity` porque ni `Session` ni
  `Character` tienen datos ocultos como `grants`) y cada mutación fallida pinta su error en
  el formulario en vez de fallar en silencio.
- **Selector de visibilidad recortado a `PUBLIC`/`PLAYERS`/`OWNER_DM`/`DM_ONLY`**, sin
  `SPECIFIC_PLAYERS` (inerte en los dos modelos). Justificación completa en
  [05-datos.md](./05-datos.md).
- **Playwright**: nuevo recorrido en `apps/web/e2e/campana.spec.ts` que crea una sesión
  `DM_ONLY` y un personaje `PUBLIC` desde sus pestañas, comprueba que aparecen en su lista
  con lo que corresponde, y reabre los dos en modo edición para comprobar la precarga —
  título/notas de la sesión, raza/clase/nivel/biografía del personaje— contra la API real.
  Antes de esta tarea ningún recorrido visitaba `SessionsTab` ni `CharactersTab`; ver
  [08-pruebas.md](./08-pruebas.md).

**Arreglos de la revisión independiente (2026-08-31, tarea 1.13-fix), sobre el mismo trabajo
sin commitear.** Tres hallazgos Importantes y dos Menores:

1. **Vaciar un campo opcional en edición no lo borraba, en silencio.**
   `SessionEditor.tsx` y `CharacterEditor.tsx` construían el `PATCH` con propagación
   condicional (`...(trimmedX ? { x: trimmedX } : {})`), correcto para crear pero no para
   editar: si el usuario borraba el contenido de un campo, la clave se omitía del `PATCH` y
   el servicio (`if (input.x !== undefined) data.x = ...`, tanto en `sessions.service.ts`
   como en `characters.service.ts`) dejaba el valor viejo tal cual. El editor se cerraba como
   si hubiera guardado y el dato seguía en la base. Arreglado enviando la cadena vacía en modo
   edición (`notes`, `race`, `class`, `bio` — ninguno tiene `min` en el esquema). **Excepción
   que se documenta, no se arregla:** `scheduledAt` es `z.coerce.date()` sin `.nullable()`, así
   que "quitar la fecha de una sesión" no es expresable contra la API de hoy sin tocar
   `packages/shared`/`apps/api` — ver [06-pendientes.md](./06-pendientes.md).
2. **`OWNER_DM` en una sesión no significaba lo que decía.** `sessions.service.ts` pasa
   `createdById: ""` a `canView`, así que la comparación de `OWNER_DM` es falsa para
   cualquier jugador, y `visibility.ts` ya devuelve `true` para cualquier DM antes de mirar
   la visibilidad: en una sesión, `OWNER_DM`, `SPECIFIC_PLAYERS` y `DM_ONLY` producían
   exactamente el mismo conjunto de espectadores. Se quitó `OWNER_DM` del selector de
   `SessionEditor.tsx` (se queda en `CharacterEditor.tsx`, donde `ownerId` sí lo hace
   literal). Ver [05-datos.md](./05-datos.md) para la corrección del párrafo que lo
   justificaba con un razonamiento circular.
3. **El recorrido de Playwright nunca guardaba una edición.** El paso de sesión pulsaba
   "Cancelar" tras comprobar la precarga, y el de personaje terminaba en la aserción de
   precarga sin pulsar "Guardar": `updateSession` y `updateCharacter` no se ejecutaban ni una
   vez en un navegador real, pese a que el informe de 1.13 afirmaba que sí. Arreglado para
   que los dos bloques guarden de verdad y comprueben el resultado en la lista, y para que el
   paso de sesión cubra el arreglo 1 de punta a punta: vacía las notas, guarda, reabre y
   comprueba contra la API real que siguen vacías.
4. **Menor.** Un valor de visibilidad guardado que el `<select>` no ofrece (p. ej.
   `SPECIFIC_PLAYERS` por curl o siembra) dejaba el desplegable en blanco sin explicación.
   Ahora se añade como opción extra, marcada como "valor guardado, no seleccionable aquí".
5. **Menor.** Faltaba la prueba que ata el arreglo 1 (vaciar un campo en edición envía la
   cadena vacía) en los dos editores, y `CharacterEditor.test.tsx` nunca afirmaba el payload
   completo de `updateCharacter`. Las dos se añadieron, vistas en rojo antes del arreglo. Se
   dejó constancia, con comentario en el fixture y ficha en
   [06-pendientes.md](./06-pendientes.md), de que la prueba de precarga de la fecha de sesión
   solo cuadra porque el fixture tiene los segundos a cero.

**Por qué.** Cierra el hueco que dejaban abierto 1.8/1.9 (API) y P1 de
[06-pendientes.md](./06-pendientes.md): la API de sesiones y personajes existía y estaba
probada, pero no había forma de crearlos o editarlos desde la web.

**Qué queda abierto, a propósito.** Ni `SessionsTab` ni `CharactersTab` ocultan el botón de
edición según permiso (crear/editar sesión es solo del DM; editar personaje, del dueño o el
DM) — mismo bloqueante que las entidades y los enlaces/comentarios: la web no conoce su
propio id de usuario tras recargar (`auth.store.ts:13`). No hay UI de borrado, aunque la API
la soporte: el brief pedía creación y edición, no borrado.

**Cómo revertir.** `git revert` del commit de esta tarea. Sin migraciones ni cambios en
`apps/api` o `packages/shared`: solo web y documentación.

---

## 2026-08-31 — Editor de entidades: se arregla la pérdida de datos silenciosa

**Qué.** Cinco arreglos sobre el editor de entidades (commit `7714833`), encontrados en su
revisión independiente:

1. **Crítico.** Editar una entidad `SPECIFIC_PLAYERS` sin tocar la selección de jugadores
   mandaba `specificPlayerIds: []`, y el servicio lo interpretaba como "borra todas las
   concesiones y no crees ninguna" (`entities.service.ts:112-119`). Se arregló con precarga
   real: `useEntity` (nuevo hook, `features/entities/hooks.ts`) pide el detalle —que ya traía
   `grants`— solo en modo edición, y siembra la selección una vez llega. Mientras el detalle
   no ha llegado, `specificPlayerIds` no se manda (guarda de la carrera: si se pulsa Guardar
   en ese hueco, no se destruye nada).
2. El `fieldset` "Jugadores con acceso" mostraba todas las casillas vacías al editar, aunque
   hubiera concesiones vivas. Se cae solo con el arreglo 1; lleva su propia prueba porque
   afirma sobre lo que se ve, no sobre el payload.
3. Un jugador que creaba una entidad heredaba el `DM_ONLY` por defecto del modelo y su
   entidad desaparecía (invisible incluso para él). El formulario de creación arranca ahora
   en `OWNER_DM` — una línea en `EntityEditor.tsx`, sin tocar `canView` ni los valores por
   defecto del esquema o de Prisma. Ver [05-datos.md](./05-datos.md).
4. Un error del servidor (400 de Zod, 403) se pintaba como JSON crudo dentro del modal.
   `lib/api.ts` ahora extrae un mensaje legible (`fieldErrors`/`formErrors` de Zod
   concatenados, o `message` si es una cadena) y solo cae al texto crudo si el cuerpo no es
   JSON entendible.
5. `useMembers` se pedía siempre al abrir el editor, aunque la visibilidad nunca fuera
   `SPECIFIC_PLAYERS`, y un fallo o una carga en curso dejaba el `fieldset` vacío —el mismo
   estado, visualmente, que "cero concesiones". Ahora solo se pide cuando la visibilidad lo
   necesita (`useMembers(campaignId, { enabled })`, extensión mínima y compatible hacia atrás
   de `features/campaigns/members.ts`) y `isLoading`/`isError` tienen su propio texto.

**Por qué.** El arreglo 1 no era un riesgo eventual: era determinista. Abrir cualquier entidad
`SPECIFIC_PLAYERS`, corregir una coma del nombre y guardar destruía el 100 % de sus
concesiones, siempre, sin aviso — la entidad quedaba en `SPECIFIC_PLAYERS` con cero
concesiones, que nadie salvo el DM ve, y la lista seguía pintando la misma insignia.

**Pruebas.** 6 nuevas (`EntityEditor.test.tsx`: arreglos 1, 2, 3 y la carrera del arreglo 1,
más la guarda del camino "quitar SPECIFIC_PLAYERS" que ya funcionaba y no tenía prueba;
`lib/__tests__/api.test.ts`: arreglo 4, tres casos). Las 6 se vieron en rojo antes del arreglo
correspondiente. La prueba de creación existente no se tocó.

**Verificación.** `pnpm verify` limpio (build + lint + formato + 62 unitarias: shared 10, api
37, web 15) y `pnpm --filter @dnd/web e2e` en verde (2/2) — se comprobó explícitamente que la
prueba que selecciona `DM_ONLY` a mano seguía pasando tras cambiar el valor inicial del
selector.

**No arreglado, dado de alta en [06-pendientes.md](./06-pendientes.md):** las filas de la
lista de entidades son botón de editar aunque el servidor vaya a devolver 403;
`auth.store.ts:13` deja `user: null` tras recargar; falta `key` en `EntityTab` al cambiar de
pestaña; el modal no tiene `role="dialog"` ni cierra con Escape.

**Cómo revertir.** `git revert` del commit: devuelve `EntityEditor.tsx`, `features/entities/
{api,hooks}.ts`, `features/campaigns/members.ts` y `lib/api.ts` a su estado anterior. No toca
`apps/api` ni `packages/shared` — no hay migración que revertir.

---

## 2026-08-31 — Enlaces y comentarios en el editor de entidades (1.12b), y su revisión
(1.12b-fix)

**Qué.** `LinksPanel` y `CommentThread`, montados dentro de `EntityEditor` solo en modo
edición (`isEdit && entity`): panel de enlaces con selector de destino y etiqueta opcional,
hilo de comentarios con nombre de autor resuelto contra `useMembers`. El selector de destino
usa `useAllEntities` (`fetchAllEntities`, sin filtro `type`) porque un enlace puede apuntar a
cualquier tipo de entidad, no solo al de la pestaña activa.

**Por qué falló la primera revisión.** El único e2e de Playwright que existía entonces
(`campana.spec.ts`) pulsaba `Nuevo` y guardaba: nunca pulsaba la fila de una entidad ya creada,
así que nunca activaba `isEdit`. Como los dos paneles solo se pintan en ese modo, **ningún
navegador había pintado jamás `LinksPanel` ni `CommentThread`**, y el e2e pasó en verde sin
ejecutar una sola línea del código nuevo. `docs/08-pruebas.md` regla 3 describe exactamente
este fallo.

**Los arreglos de la revisión independiente (1.12b-fix), en el mismo commit:**

1. **El borrado de un enlace o un comentario ajeno fallaba en silencio.**
   `deleteLink.mutate(l.id)` / `deleteComment.mutate(c.id)` no tenían `onError`; el servidor sí
   rechazaba con 403 (`links.service.ts:75`, `comments.service.ts:65`) pero la interfaz no
   cambiaba nada, así que un jugador que pulsaba "Borrar" en un comentario ajeno no veía ni
   mensaje ni cambio. Arreglado reutilizando el `error` que ya existía para el camino de
   añadir/publicar, con `mutate(id, { onError: ... })`.
2. **El selector de destinos de enlace quedaba obsoleto hasta 30 s.** `allEntitiesKey` es una
   rama distinta de `entitiesKey(campaignId, type)` (`entities/hooks.ts`), y las mutaciones de
   crear/actualizar entidad solo invalidaban la segunda; con `staleTime: 30_000`
   (`lib/queryClient.ts`) tampoco se refrescaba al montar. Un DM que creaba una entidad y
   abría otra para enlazarla no la veía en el desplegable durante medio minuto. Arreglado
   invalidando también `allEntitiesKey(campaignId)` en `useCreateEntity` y `useUpdateEntity`.
3. **El e2e verde no probaba nada nuevo** (visto arriba). Se añadió el recorrido que faltaba a
   `campana.spec.ts`: crea dos NPCs, abre uno en modo edición, comprueba que los dos paneles
   se pintan, enlaza el NPC con el otro y ve el enlace en la lista, publica un comentario y lo
   ve con su texto — contra la API real, sin mocks.
4. **El desplegable ofrecía destinos ya enlazados**, y volver a elegirlo chocaba contra
   `@@unique([fromId, toId, label])` (`schema.prisma:100`) sin que `links.service.create`
   comprobara duplicados antes: 500 en crudo o fila repetida. Arreglado excluyendo del
   desplegable lo que ya está en `links.data`, además de la propia entidad. De paso se cerró
   una prueba semivacía (`LinksPanel.test.tsx`) que metía la entidad propia en el resultado de
   `fetchAllEntities` sin afirmar nunca que no apareciera como opción.
5. **Las pruebas de `EntityEditor` en modo edición disparaban `fetch` reales.** Los cuatro
   casos de edición ahora montan `LinksPanel` y `CommentThread`, que llaman a `fetchLinks`,
   `fetchAllEntities` y `fetchComments`; ninguno estaba espiado en `EntityEditor.test.tsx`, así
   que pasaban por `retry: false` convirtiendo el fallo real en un `isError` que nadie miraba.
   Arreglado espiando los tres fetchers en ese fichero.
6. `CommentThread` llama a `useMembers(campaignId)` sin `enabled`, a diferencia del
   `EntityEditor`, que lo hace perezoso a propósito. **Se dejó así, deliberadamente**: el hilo
   necesita los nombres para atribuir comentarios y se pinta siempre en modo edición; comparte
   clave de consulta con el picker de jugadores, así que sigue siendo una sola petición, no
   dos. Documentado con un comentario en `CommentThread.tsx`.

**No arreglado a propósito.** Los botones "Quitar"/"Borrar" se pintan en todas las filas sin
mirar permiso: ocultarlos con criterio necesita que la web conozca su propio identificador de
usuario, y `auth.store.ts:13` todavía lo pierde al recargar. Mismo bloqueante que la fila de
edición de `CampaignDetailPage.tsx`. Ver [06-pendientes.md](./06-pendientes.md).

**Pruebas.** 5 nuevas vistas en rojo antes de su arreglo: borrado con error en `LinksPanel` y
en `CommentThread` (fix 1), exclusión del desplegable en `LinksPanel` (fix 4, más la aserción
que faltaba en la prueba semivacía existente), y dos de `entities/hooks.test.tsx` (nuevo
fichero) que comprueban `isInvalidated` en `allEntitiesKey` tras crear y tras actualizar (fix
2). El fix 5 no añade una prueba en rojo propia — espiar un fetcher no cambia el resultado de
una prueba que ya pasaba por `retry: false` — así que se declara aquí en vez de fingir un rojo
que no existió.

**Verificación.** `pnpm verify` limpio (build + lint + formato + 71 unitarias: shared 10, api
37, web 24) y `pnpm --filter @dnd/web e2e` en verde (3/3): las dos suites anteriores más el
recorrido nuevo de enlaces y comentarios, que sí ejecuta `LinksPanel` y `CommentThread` en un
navegador real.

**Cómo revertir.** `git revert` del commit: devuelve `LinksPanel.tsx`, `CommentThread.tsx`,
`entities/hooks.ts`, `campana.spec.ts` y los ficheros de prueba tocados a su estado anterior.
No toca `apps/api` ni `packages/shared`.

---

## 2026-08-31 — Playwright: la primera prueba que abre un navegador

**Qué.** Playwright con Chromium en `apps/web`: `playwright.config.ts`, especificaciones en
`apps/web/e2e/`, scripts `e2e` y `e2e:ui`, y un trabajo `e2e-browser` aparte en CI que sube el
informe como artefacto cuando falla. La configuración levanta sola los dos servidores —la API
**compilada** (`start:prod`, como en producción) y Vite haciendo de proxy de `/api`— así que
la prueba recorre la misma cadena que un usuario. El `include` de vitest se acotó a `src/`
para que los dos corredores no se disputen los `.spec.ts`.

Cubierto: **registro → crear campaña → crear un NPC con etiquetas y visibilidad → verlo en su
pestaña**, y **salir cierra la sesión** y volver a mano a la ruta protegida devuelve a
`/login`.

**Por qué.** Era la P1 tras cerrar el linter, y `08-pruebas.md` ya llevaba escritas sus reglas
esperando la herramienta: jsdom no pinta ni navega, así que nada cubría sesión, rutas ni
pintado.

**Evidencia de que las pruebas sirven, no solo de que pasan.** Se rompió a propósito la guarda
de autenticación (`ProtectedRoute` dejando pasar sin token) y se corrieron las dos suites: las
**7 pruebas de componente siguieron en verde** y **el e2e de sesión falló** con su captura. La
guarda se restauró y los dos e2e volvieron a pasar. Es el mismo defecto que en english-log
llegó dos veces a producción con toda la suite verde.

**Cómo revertir.** `git revert` del commit: quita la configuración, las especificaciones, los
scripts y el trabajo de CI, y devuelve a vitest su `include` por defecto. Los binarios del
navegador quedan en la caché del usuario (`~/AppData/Local/ms-playwright`) y se borran a mano
si molestan.

---

## 2026-08-31 — ESLint, Prettier y gancho de pre-commit: el nivel pasa a N1 real

**Qué.** ESLint 9 con configuración plana única en la raíz (`eslint.config.mjs`), Prettier
con `.prettierrc.json` y `.prettierignore` (Markdown excluido: la documentación se escribe a
mano), `pnpm verify` ampliado a `build && lint && format:check && test`, y
`.githooks/pre-commit` que lo ejecuta y bloquea el commit. El gancho se conecta solo desde el
`prepare` de la raíz vía `scripts/install-git-hooks.mjs`, escrito para **no fallar nunca sin
`.git`**, porque las imágenes Docker se construyen desde una copia sin repositorio. CI deja
de omitir el lint y añade el chequeo de formato.

**Por qué.** Era la P1 de `06-pendientes.md` y la única excepción declarada en
`04-convenciones.md`: el proyecto no podía exigir N1 sin linter desde la fase 0.

**Los 15 errores de la primera pasada se arreglaron corrigiendo el código, no las reglas:**

- Diez cuerpos de controlador tipados como `any` pasaron a los tipos de `@dnd/shared`
  (`RegisterInput`, `CreateEntityInput`, `UpdateSessionInput`…). El pipe de Zod ya garantizaba
  la forma; el `any` solo la escondía del compilador.
- `updateSessionSchema` y `updateCharacterSchema` estaban **definidos en el controlador**
  mientras el servicio redefinía a mano su `Partial<...>`: dos declaraciones de la misma
  forma. Se mudaron a `@dnd/shared`, que es donde la convención dice que vive la forma de los
  datos, y ambos las importan.
- Tres `require("supertest")` dentro del cuerpo de un test pasaron a un `import` normal.
- Un `ForbiddenException` importado y nunca usado, fuera.
- Los ficheros de configuración CommonJS (`jest.config.js`) declaran su entorno en la
  configuración de ESLint en vez de llevar un comentario que silencie la regla.

Prettier reformateó 57 ficheros de código. Ningún cambio de conducta.

**Evidencia.** `pnpm verify` ✅ (build + lint + formato + 54 unitarias) y
`pnpm --filter @dnd/api test:e2e` ✅ 19 en 9 suites, corridos después del cambio de tipos.

**Cómo revertir.** `git revert` del commit devuelve `any` a los controladores, los esquemas
de actualización al controlador, y `verify` a `build && test`; borra la configuración de
ESLint y Prettier y el gancho. Para desconectar solo el gancho sin revertir nada:
`git config --unset core.hooksPath`.

---

## 2026-08-31 — Se adopta la estructura de documentación numerada

**Qué.** Se crean `docs/00-INDEX.md` y `01`–`08` describiendo lo que el repositorio **es
hoy**, no lo que debería ser. `docs/DEPLOY.md` se elimina y su contenido pasa, traducido y
ampliado con el estado real, a `03-despliegue.md`. `CLAUDE.md` y `AGENTS.md` de la raíz
quedan como punteros cortos. Se añade el script `pnpm verify`.

**Por qué.** El repositorio no tenía `04-convenciones.md`, así que **no declaraba nivel de
verificación**, y `~/.claude/dev-rules.md` exige uno. Al levantar el estado real apareció lo
que el nivel habría destapado antes: **ESLint no está instalado** y `pnpm lint` falla en los
tres paquetes desde la fase 0. Queda declarado como excepción (**N1 incompleto**) y abierto
como P1, en vez de seguir implícito.

**Línea base medida ese día, no prometida:** `pnpm build` ✅ · `pnpm test` ✅ 54 (shared 10,
api 37, web 7) · `pnpm --filter @dnd/api test:e2e` ✅ 19 en 9 suites contra Postgres real ·
`pnpm lint` ❌ *"eslint no se reconoce"*.

**Cómo revertir.** `git revert` del commit: borra `docs/00`–`08`, restaura `docs/DEPLOY.md`
y quita el script `verify`. No toca código de aplicación ni pruebas.

---

## 2026-07-02 → 2026-08-31 — Fase 1: núcleo de campaña

**API completa.** Esquema y migración `campaign_core`; esquemas Zod compartidos; el helper
`canView` con su matriz de 5×6 probada; campañas y `MembershipService`; invitaciones;
entidades con filtro de visibilidad y concesiones; enlaces wiki; comentarios; sesiones
(gestionadas por el DM); personajes (dueño o DM); y el listado de miembros que alimenta el
selector de jugadores de la web.

**Web en curso.** Lista de campañas con creación; detalle con pestañas de entidades,
sesiones y personajes; editor de entidades con etiquetas, visibilidad y selección de
jugadores concretos (commit `7714833`, con su arreglo de pérdida de concesiones en
`1d27a52`); panel de enlaces y hilo de comentarios dentro del modo edición del editor de
entidades (tarea 1.12b), montados como componentes propios (`LinksPanel`, `CommentThread`)
solo cuando la entidad ya existe. El selector de destino de un enlace pide **todas** las
entidades de la campaña con una sola llamada (`useAllEntities`, sin filtro `type`), en vez
de siete listas por tipo: el endpoint ya aceptaba `type` como opcional
(`entities.controller.ts`) y un enlace puede apuntar a cualquier tipo. Quedan los editores
de sesión y personaje, y el flujo de invitación.

Los límites aceptados a conciencia de esta fase están en
[05-datos.md](./05-datos.md) y abiertos en [06-pendientes.md](./06-pendientes.md).

**Cómo revertir.** Cada tarea es un commit propio en `main`; el ledger da el identificador
de cada una. La migración `20260702215016_campaign_core` es la que introduce todas las
tablas de la fase.

---

## 2026-07-02 — Fase 0: cimientos

Monorepo pnpm, NestJS + Fastify + Prisma, React + Vite, `@dnd/shared`, autenticación con
argon2 y JWT, Sentry, Dockerfiles de API y web, CI en GitHub Actions y el procedimiento de
despliegue en Coolify. Ambas imágenes construyen y `node dist/src/main.js` arranca en modo
producción.

Correcciones de la fase que siguen vigentes y explican decisiones raras del repositorio
(las tres están detalladas en [02-entorno.md](./02-entorno.md)): el `&` de la carpeta rompe
`nest --watch` en Windows; `@dnd/shared` se publica a `dist` **y** se aliasa a `src` en Vite;
y `packageManager` queda fijado a pnpm 10.32.1.

**Deuda que nació aquí y sigue abierta:** ESLint nunca se configuró y CI omite el lint.
