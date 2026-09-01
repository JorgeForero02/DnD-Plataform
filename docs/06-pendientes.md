# Pendientes

Deuda conocida y decisiones abiertas. Cada línea: qué, por qué importa, y la evidencia de
que existe. **Subir de nivel de verificación o pagar deuda es una tarea con su ficha, nunca
un efecto colateral de la siguiente funcionalidad.**

Última revisión: 2026-09-01.

## Antes de desplegar — seguridad

**Auditoría hecha el 2026-09-01 sobre el commit `4a3fe43`, con todos los hallazgos verificados
en el código.** El detalle, la evidencia y el orden de arreglo están en
**[`superpowers/specs/2026-09-01-endurecimiento-seguridad-design.md`](./superpowers/specs/2026-09-01-endurecimiento-seguridad-design.md)**
— ahí está todo, para no tener que auditar otra vez.

Lo que **sí** está cubierto (comprobado, no supuesto): inyección SQL, XSS, validación de
entrada, contraseñas con argon2, autorización en el servidor y ausencia de secretos en el
código.

Lo que falta, y va como **tarea 1.17**:

| | Hallazgo | Gravedad |
|---|---|---|
| 1 | **`JWT_SECRET` tiene un valor por defecto en el código**, en dos sitios. Si falta la variable en producción, la API firma tokens con una cadena que está en el repositorio público | **Crítico** |
| 2 | **29 vulnerabilidades en dependencias de producción** (1 crítica, 16 altas) y CI no audita | Alto |
| 3 | **Sin límite de peticiones**: fuerza bruta en login y en tokens de invitación | Alto |
| 4 | **Sin cabeceras de seguridad** (`helmet`) | Medio |
| 5 | **CORS abierto**, y además innecesario: nginx hace de proxy | Medio |
| 6 | **Sin pantalla de 404 ni `ErrorBoundary`**: una URL inventada da pantalla en blanco | Medio |
| 7 | El token vive en `localStorage` — compromiso conocido, no urgencia | Bajo |

## P0 — Las fichas del mundo no tienen texto

**Descubierto el 2026-09-01 respondiendo a una pregunta del autor, no por una prueba.**

`Entity.body` existe en el modelo (`schema.prisma:80`, `Json?`) y en el esquema compartido
(`entity.schema.ts:7`, `body: z.unknown().optional()`), y la API lo aceptaría sin problema.
**Pero `EntityEditor.tsx` no lo pinta ni lo envía**, y `entities/api.ts` tampoco: los únicos
`body` que hay en la web son cuerpos de peticiones HTTP.

**Consecuencia:** una entidad es hoy **nombre + etiquetas + visibilidad + enlaces +
comentarios**, y nada más. Una ficha de tipo `DOCUMENT` **no puede contener un documento**; un
NPC no puede tener su descripción. La wiki es un índice sin páginas.

**Por qué nadie lo vio:** ninguna prueba lo echa en falta, porque **nunca se escribió la prueba
de que se pueda escribir**. Las 167 unitarias y los 6 recorridos de navegador comprueban con
detalle que el texto que no existe se oculta a quien no debe verlo.

**Es lo más barato de arreglar y lo que más cambia el producto**: el modelo, el esquema y la
API ya están. Es trabajo de web —un campo de texto en el editor y su prueba— y va **antes que
1.17**, porque sin esto no hay nada que enseñarle a nadie.

Al hacerlo, decidir **si el texto es plano o con formato** (negritas, listas, encabezados). Si
va a ser con formato, mejor decidirlo ahora que migrar después: `body` es `Json?`, así que el
modelo aguanta las dos cosas.

## Antes de la primera partida

> **La primera partida queda aplazada por decisión del autor (2026-09-01):** no se juega hasta
> tener al menos el tablero 2D de la fase 3, y quizá tampoco antes de las reglas de la fase 2.
> **Eso suspende la regla de fase del plan**, que exigía usar una fase antes de empezar la
> siguiente. Las carencias de abajo dejan de bloquear nada inmediato, pero siguen abiertas —
> la de identidad/rol se cerró igual como tarea 1.15, y la de borrado entra como 1.16.
>
> **El riesgo que se acepta, escrito para que nadie lo descubra tarde:** los planes de las
> fases 2 a 5 se escribirán **sin realimentación de uso real**, que es exactamente lo que la
> regla quería evitar. Para la fase 2 es tolerable —las reglas de 5e están escritas y no
> dependen de esta mesa—; **para la fase 3 no**, porque un tablero se diseña alrededor de cómo
> juega la gente. Si se llega a la 3 sin haber jugado, su plan debería empezar por una sesión
> de prueba aunque sea con lo que haya.

La fase 1 está construida y verificada (ver
[09-primera-partida.md](./09-primera-partida.md) para el guion de esa sesión cuando llegue).
La única carencia que quedaba de la lista original —no se podía borrar casi nada desde la
interfaz— se cerró como tarea 1.16 (ver "Cerrados"). Queda esta:

**No hay despliegue.** Sin VPS, la partida se juega en local y los jugadores tienen que
estar en la misma red. Si se quiere que entren desde sus casas, esto **sí** es bloqueante.
Decisión aparte, no configuración. Ver [03-despliegue.md](./03-despliegue.md).

## Cerrados

**~~No se puede borrar casi nada desde la interfaz~~, y ~~"Quitar"/"Borrar" en `LinksPanel`/
`CommentThread` se pintan sin mirar permiso~~ — CERRADO el 2026-09-01 (tarea 1.16).** Los tres
editores (`EntityEditor.tsx`, `SessionEditor.tsx`, `CharacterEditor.tsx`) ganan un botón
"Borrar" en modo edición, con confirmación **en la propia pantalla** — un `DeleteButton`
compartido (`apps/web/src/components/DeleteButton.tsx`), no `window.confirm` — que reutiliza
exactamente el mismo `readOnly`/`readOnlyReason` que el editor ya recibía para editar: los
tres recursos gatean borrar con la misma regla que editar (`entities.service.ts` y
`characters.service.ts`: DM o creador/dueño vía `requireEditable`; `sessions.service.ts`: DM
vía `requireDM`), así que no hace falta una segunda comprobación de permiso. La confirmación
de entidad dice qué se lleva la cascada real del esquema (`schema.prisma`: `EntityLink` en
ambas direcciones, `EntityVisibilityGrant` y `Comment`, los tres `onDelete: Cascade`), con
números reales de comentarios y concesiones cuando ya están cargados (comparten clave de
consulta con `CommentThread`/el propio detalle de la entidad, así que no hay una petición
extra) — el número de enlaces no se muestra porque `/entities/:id/links` solo lista los
salientes visibles para quien mira, no los entrantes de otras entidades, así que no hay forma
honesta de contarlos desde aquí. Sesión y personaje no tienen hijos en cascada
(`schema.prisma`), así que su aviso es solo "no se puede deshacer".

`LinksPanel.tsx` y `CommentThread.tsx` ganan el mismo criterio de honestidad que 1.15 le dio a
los otros cuatro sitios: "Quitar" se deshabilita (nunca se oculta) para quien no es DM ni creó
la entidad (`links.service.ts:75`), y "Borrar" para quien no es DM ni el propio autor del
comentario (`comments.service.ts:65`), ambos con el motivo visible — la ficha que 1.15 dejó
abierta a propósito porque su brief pedía otras cuatro superficies.

**Invalidación de caché — dos mordiscos nuevos del mismo tipo que 1.12b, encontrados
escribiendo las pruebas de esta tarea, no adivinados:**
- Borrar una entidad invalida `entitiesKey`/`allEntitiesKey` (mismo patrón que crear/editar).
- La cascada del esquema borra `EntityLink` **en las dos direcciones**: al borrar una entidad
  puede desaparecer un enlace que **otra** entidad ya tenía cacheado bajo su propio
  `linksKey(otraEntidadId)` — una clave que `useDeleteEntity` no puede nombrar porque no sabe
  qué otras entidades la enlazaban. Se prueba y se cazó primero en el navegador real (reabrir
  el editor de la primera entidad seguía mostrando el enlace hacia la segunda, ya borrada, en
  Postgres) — ni un espía ni la unitaria original lo habrían visto, porque ninguna comparte
  cache real entre dos entidades. Arreglado invalidando por predicado sobre la raíz
  `"entities"` (`features/entities/hooks.ts`), que cubre `linksKey`/`commentsKey` de
  cualquier entidad — más ancho de lo estrictamente necesario, pero la alternativa es
  exactamente este bug. Regresión cubierta en
  `apps/web/src/features/entities/__tests__/hooks.test.tsx` y en el recorrido de navegador
  `apps/web/e2e/campana.spec.ts`.

**Bug real encontrado y arreglado de paso, mismo tipo que el de 1.14 con las invitaciones:**
las cinco llamadas `DELETE` de la web (`deleteEntity`, `deleteSession`, `deleteCharacter`,
y las ya existentes `deleteLink`, `deleteComment`) no mandaban cuerpo. `apiFetch` (`lib/api.ts`)
manda siempre `Content-Type: application/json`, y Fastify rechaza esa combinación con 500
("Body cannot be empty…") antes de llegar al controlador — visible solo contra la API real
compilada, nunca en una unitaria con `api.ts` simulado. `deleteLink`/`deleteComment` llevaban
este defecto latente desde que existen (nunca los ejercitó un recorrido de navegador hasta
ahora); arreglado enviando `JSON.stringify({})` en las cinco. Cambio solo en `apps/web`.

Ver la entrada de 1.16 en [07-historial.md](./07-historial.md).

**~~Pantalla en blanco perpetua tras un token caducado~~ — CERRADO el 2026-09-01 (tarea
1.15-fix, Crítico verificado en el código por una revisión independiente).** `AuthGate.tsx`
devolvía `<Navigate to="/login" replace/>` **en lugar de** sus hijos, y estaba montado **por
fuera** de `<Routes>` (`App.tsx`). `setInvalidToken(true)` (`features/auth/hooks.ts`) nunca
volvía a `false`, y como `AuthGate` no estaba dentro del árbol de rutas, navegar no lo
desmontaba: en cada render volvía a devolver `<Navigate>`, y `<Routes>` —que contiene la
propia ruta `/login`— no se renderizaba jamás. La URL cambiaba a `/login` pero la pantalla se
quedaba vacía hasta recargar a mano. El JWT caduca a los 7 días
(`apps/api/src/auth/auth.module.ts`): a cualquiera que volviera la semana siguiente le tocaba
esto. La prueba de entonces (`AuthGate.test.tsx`) pasaba por construcción: montaba `AuthGate`
dentro de una `<Route>`, una topología que sí lo desmonta al navegar — no la de producción.
**Arreglado eliminando el estado pegajoso en vez de remendarlo:** `AuthGate` ya no redirige
nunca — solo dispara `useAuthRehydration` y renderiza siempre sus hijos; `logout()` ya ponía
el token a `null`, y `ProtectedRoute` ya redirigía a `/login` cuando no hay token, así que no
hacía falta que `AuthGate` supiera redirigir nada. La prueba nueva monta `<App/>` real
(`AuthGate.test.tsx`). Ver la entrada de 1.15-fix en [07-historial.md](./07-historial.md).

**~~Cualquier fallo de red o del servidor cerraba la sesión, no solo un token inválido~~ —
CERRADO el 2026-09-01 (tarea 1.15-fix, Importante).** `apiFetch` (`lib/api.ts`) lanzaba el
mismo `Error` genérico para un 401, un 500, un 502 del proxy de Vite o un fallo de red, y
`hooks.ts` cerraba la sesión (`logout()`, que borra `dnd_token`) en cualquiera de esos casos —
al revés de lo que ya afirmaban `01-arquitectura.md` y `07-historial.md`. Con el arreglo de
arriba, eso significaba: la API se reinicia o hay un microcorte mientras el DM recarga en
plena partida → se le borra el token y se queda mirando el formulario de login sin saber por
qué. **Arreglado con `ApiError` (`lib/api.ts`)**, que propaga el `status` real de la
respuesta; `useAuthRehydration` solo cierra la sesión si `err instanceof ApiError && err.status
=== 401`. Cualquier otro fallo deja el token en paz. El mensaje legible de errores que se
arregló en 1.14 no se tocó — sigue viviendo en `readableErrorMessage()`, ahora envuelto en
`ApiError` en vez de `Error`. Ver la entrada de 1.15-fix en [07-historial.md](./07-historial.md).

**~~Un solo fallo al listar los miembros hace que el DM se lea a sí mismo como no-DM~~ —
CERRADO el 2026-09-01 (tarea 1.15-fix, Importante).** `useMyRole` (`features/campaigns/
members.ts`) calculaba `isLoading = !userId || members.isLoading` y el rol de
`members.data?.find(...)`. Con `retry: false` (`lib/queryClient.ts`), un solo fallo de
`GET /campaigns/:id/members` dejaba `isLoading === false` y `role === undefined` —
indistinguible de "confirmado que no es miembro". Un DM legítimo veía "Solo el DM puede
crear o editar sesiones." en su propia campaña, sin poder crear la sesión que estaba narrando
en ese momento, y solo se recuperaba si cambiaba de pestaña y volvía
(`refetchOnWindowFocus`), sin nada en pantalla que lo sugiriera. **Arreglado** exponiendo
`isError` como señal propia (nunca tratado como "no soy miembro", siempre como "aún no lo
sé") y `retry()` para forzar un nuevo intento; los cuatro consumidores (`CampaignDetailPage.
tsx`, `InvitePanel.tsx`) lo enlazan a un botón "Reintentar" junto al mensaje "Comprobando
permisos…". Ver la entrada de 1.15-fix en [07-historial.md](./07-historial.md).

**~~La web no conoce su propio identificador de usuario~~ — CERRADO el 2026-09-01 (tarea
1.15).** `auth.store.ts` dejaba `user: null` tras recargar la página: el token sobrevivía en
`localStorage`, pero el usuario solo vivía en memoria, así que ningún botón podía ocultarse ni
deshabilitarse por permiso. Arreglado con `/auth/me` devolviendo también `displayName`
(`apps/api/src/auth/auth.controller.ts`, único cambio permitido en `apps/api` para esta
tarea) y `AuthGate` + `useAuthRehydration` (`apps/web/src/features/auth/`) pidiéndolo una vez
al arrancar, cuando hay token y no hay usuario, sin bloquear el pintado de `ProtectedRoute`
(que sigue mirando solo el token); si `/auth/me` devuelve 401, cierra la sesión y redirige a
`/login`. Con el `id` disponible, `useMyRole` (`features/campaigns/members.ts`) cruza
`GET /campaigns/:id/members` para saber si el usuario es DM o jugador en la campaña, con un
tercer estado explícito de "aún no lo sé" mientras `members` o la identidad siguen cargando.
**Decisión, coherente en los cuatro sitios que se tocaron** (crear/editar sesión, editar
personaje, editar entidad, generar invitación): se **deshabilita con una explicación visible**,
nunca se oculta — un botón oculto hace pensar que la acción no existe; uno deshabilitado con
motivo enseña el modelo de permisos. Mientras el rol o la identidad todavía se están
resolviendo, también se deshabilita (no se muestra activo ni se oculta): mostrarlo activo
ofrecería una acción que puede acabar en 403 al llegar la respuesta real, y ocultarlo
parpadearía en cuanto ésta llega. Esto es honestidad de la interfaz, no seguridad: `canView`,
`requireDM`, `requireMember` y `requireEditable` no se tocaron y siguen rechazando exactamente
igual si este código desaparece. Ver la entrada de 1.15 en [07-historial.md](./07-historial.md).

**~~Las filas de la lista de entidades son botón de editar aunque el servidor vaya a devolver
403~~ y ~~lo mismo en sesiones y personajes~~ — CERRADO el 2026-09-01 (tarea 1.15), y
CORREGIDO el mismo día (tarea 1.15-fix, Crítico).** `InvitePanel.tsx` recibe el criterio
correcto de "deshabilitar con explicación, no ocultar" para "Generar invitación" (no hay nada
que leer si no puedes generar una invitación). Los botones "Quitar" (`LinksPanel.tsx`) y
"Borrar" (`CommentThread.tsx`) **no** se tocaron — quedan fuera de las "cuatro" que pedía el
brief de 1.15; su ficha sigue abierta en P3.
>
> **1.15 se equivocó al aplicar el mismo criterio a la fila de una entidad, sesión o
> personaje.** La versión de 1.15 deshabilitaba la fila entera cuando el usuario no podía
> editar. Eso confundía "editar" con "ver": la fila **es la única vista de detalle que
> existe** — el editor es el único consumidor de `useEntity`/`useSession`/`useCharacter`, y
> `LinksPanel`/`CommentThread` solo se pintan dentro de él (`EntityEditor.tsx`). Un jugador
> que **sí** puede ver una entidad por `canView` (por ejemplo `PLAYERS`, o `DM_ONLY` recién
> revelada) pero no puede editarla —no es el DM ni el creador— dejaba de poder leer su
> descripción, sus etiquetas, sus enlaces y sus comentarios: la fila deshabilitada rompía el
> movimiento central de la mesa que describe
> [09-primera-partida.md](./09-primera-partida.md) — "pasar algo de `DM_ONLY` a `PLAYERS`
> cuando la mesa lo descubre". Y en Sesiones, la fecha y las notas que un jugador sí puede ver
> por `canView` dejaban de abrirse igual. `apps/web/e2e/invitacion.spec.ts` no lo cazó en su
> momento porque la única entidad del DM en ese recorrido era `DM_ONLY` — el jugador nunca
> veía "Sin elementos." y una fila visible-pero-no-editable a la vez.
>
> **Arreglado en 1.15-fix:** la fila ahora **abre siempre** — es honestidad de lectura, no de
> escritura. Lo que el rol decide es si el editor que se abre lo hace en **modo lectura**
> (`readOnly` en `EntityEditor.tsx`/`SessionEditor.tsx`/`CharacterEditor.tsx`: campos
> deshabilitados, Guardar deshabilitado con su motivo) o en modo edición normal. `LinksPanel`
> y `CommentThread` siguen pintándose sin condición dentro del editor — nunca estuvieron
> gateados por permiso de edición en el servidor (`comments.service.ts` solo exige `canView`;
> `links.service.ts` solo exige ser miembro), así que no había honestidad que ganar
> deshabilitándolos también aquí. Ver la entrada de 1.15-fix en
> [07-historial.md](./07-historial.md).

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

**~~`invites.e2e-spec.ts` y `members.e2e-spec.ts` podían colisionar de correo entre workers de
Jest~~ — CERRADO el 2026-09-01 (tarea 1.15-fix, Menor).** Ambas suites construían sus correos
como `dm${Date.now()}@b.com` / `pl${Date.now()}@b.com` — resolución de milisegundo. Dos
workers de Jest que arrancaran en el mismo milisegundo generaban correos idénticos: el
segundo `register()` fallaba con 400 (email duplicado) y el `afterAll` de un worker borraba
el usuario que el otro seguía usando, produciendo fallos intermitentes sin relación con el
código bajo prueba. Detectado y explicado durante la revisión de 1.15 (explicación verificada
por el revisor), no corregido en su momento porque quedaba fuera del arreglo que se estaba
revisando. **Arreglado** añadiendo un sufijo aleatorio a `Date.now()` en los dos ficheros
(`${Date.now()}${Math.floor(Math.random() * 1e6)}`). **El mismo patrón de correo
(`Date.now()` a secas) existe también en `auth.e2e-spec.ts`, `campaigns.e2e-spec.ts`,
`characters.e2e-spec.ts`, `comments.e2e-spec.ts`, `entities.e2e-spec.ts`,
`links.e2e-spec.ts` y `sessions.e2e-spec.ts`** — comparten el mismo riesgo teórico, pero no
fueron los que la revisión de 1.15 vio fallar y el brief de 1.15-fix pedía arreglar
específicamente los dos de arriba; se deja anotado aquí en vez de corregido en silencio.

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
- ~~No hay botón de borrar sesión o personaje en la interfaz~~ — CERRADO, tarea 1.16 (ver
  "Cerrados").
- ~~Los botones "Quitar" (`LinksPanel.tsx`) y "Borrar" (`CommentThread.tsx`) se pintan en
  todas las filas, sin mirar si el usuario es DM o autor~~ — CERRADO, tarea 1.16 (ver
  "Cerrados").
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
