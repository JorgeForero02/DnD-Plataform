# Pendientes cerrados — archivados el 2026-09-07 (la tanda corta de las seis fichas)

**Congelado. Nada de aquí se edita.** Son las seis fichas que `docs/06-pendientes.md` cerró en la
tanda corta del 2026-09-07 — los arreglos que el paso 2 dejó abiertos. Se conservan por si algo se
reabre y hace falta saber cómo se cerró la vez anterior.

Continúa a
[`pendientes-cerrados-2026-09-06-paso-1.md`](./pendientes-cerrados-2026-09-06-paso-1.md).

**La regla, sin criterio de nadie:** lo tachado sale, lo abierto se queda, y cada ficha se mueve
**entera** — nunca se resume. Los identificadores **no se reciclan**.

**Lo que esta tanda enseñó, y por eso se guarda:** las seis se cerraron escribiendo la prueba
primero, viéndola en rojo, y **verificando por mutación pieza a pieza** que enrojecía por la
aserción que tenía que enrojecer. Dos de ellas no se podían medir sin la base real —el candado de
fila de P2-6— o sin un navegador —P2-3—, y decirlo en su cabecera es lo que impide que la próxima
vuelta las meta en una unitaria donde no significarían nada. La otra lección va en la ficha P2-9:
**P2-3 describía un estado que el producto no sabe producir**, y eso solo se descubre al intentar
montarlo de verdad.

---

### ~~A11-usos-sin-tope — un recurso con `max: null` no se repone en un descanso ni se gasta sin tope de verdad~~ (2026-09-07) — CERRADA

> **Cerrada el 2026-09-07.** `RestService` repone ahora también las filas con `max: null` —hasta el marcador— y `ActivitiesService.consumir` mira `max === null` **antes** que `current`: ni compara ni descuenta. **El marcador se queda y no sobra**, y su nota lo explica: `ResourcesService.adjust` —el `+`/`−` a mano— sigue moviendo `current`, así que sin un valor de partida grande el `−` de un recurso sin tope lo dejaría en cero. Tres mutaciones, una por cambio, cada una rompiendo su propia aserción.

**Abierto, encontrado al sembrar la Furia (paso 2, tarea A11), fuera de su frontera de ficheros.**
El SRD declara la Furia «Unlimited» a partir de nivel 20 (`ItemGrant.usos.sinTopeDesde`,
`resolve.ts` ya pone `usos.max: null` — verificado y en verde). Pero **dos puertas que ya
existían no saben leer ese `null`**:

- `RestService` (método de reposición por descanso, `rest.service.ts`) solo repone un recurso si
  `recurso.max !== null` — un recurso sin tope **nunca se repone en un descanso**, aunque su
  `resetOn` sea `LONG_REST`.
- `ActivitiesService.consumir` compara `recurso.current < item.cantidad` sin mirar `max` en
  ningún momento — un recurso "sin tope" sigue gastándose de un contador finito como cualquier
  otro.

**Lo que A11 hizo para no dejarlo roto sin resolver el problema de fondo:** `seedResourcesFor`
siembra `current` con un marcador finito (`MARCADOR_DE_USOS_SIN_TOPE`, `resources.service.ts`,
hoy `1_000_000`) en vez de fingir un número del SRD que no existe — el SRD dice "Unlimited", no
una cifra. Es una cota práctica, no una regla de juego, y funciona mientras nadie gaste un millón
de veces la Furia en una sesión.

**El arreglo de verdad** es que quien gasta y quien repone un `CharacterResource` miren
`max === null` ANTES de mirar `current` y, si es así, no comparen ni descuenten nada — la misma
idea que `ResourcesService.adjust` ya aplica al RECORTAR por arriba (`resource.max ??
Number.POSITIVE_INFINITY`), llevada también a la comparación de si queda algo que gastar. Toca
`ActivitiesService.consumir` y `RestService`, ninguno de los dos en la frontera de A11.

> **Ronda de arreglo 1 (importante I4): `seedResourcesFor` ya no deja el `current` finito
> atascado al subir a nivel 20.** La primera versión solo actualizaba `max` al subir de nivel
> (`update: { max: actividad.usos.max }`), así que un bárbaro de nivel 19 con, digamos, un uso
> gastado de tres subía a nivel 20 con `max: null` y `current: 2` — y como `RestService` no toca
> una fila con `max: null`, «sin tope» se habría quedado en «dos usos para siempre». Ahora, **solo
> en el instante en que `max` pasa a ser `null`**, `current` también sube al marcador. El resto de
> la deuda de arriba (`consumir()` y `RestService` sin mirar `max`) sigue abierta.

---

### ~~P2-0 · `ConditionsService.apply` pide una segunda conexión del pool cuando corre dentro de la transacción de otro servicio~~ (2026-09-07) — CERRADA

> **Cerrada el 2026-09-07, con la salvedad que su propio cuerpo mide más abajo.** `viewerFor`, `requireVisibleCharacter(WithViewer)` y `StatblocksService.resolver` aceptan el cliente opcional, y `apply` se lo reenvía a los dos sitios que lo pedían. Tres mutaciones por separado: quitar el `db` de `viewerFor` rompe `tx.user.findUnique`; el de `requireVisibleCharacterWithViewer`, `tx.character.findFirst`; y el `tx` de `inmunidadesDe`, la llamada a `resolver`.

**Abierto, encontrado en la revisión de cierre de la documentación.** El patrón `tx?` opcional
(ver [01-arquitectura.md](./01-arquitectura.md)) existe para no tomar una segunda conexión con la
primera ya abierta. `changeHp` y `RollRequestsService.create` lo cumplen **para su comprobación de
autorización**: con `tx`, la repiten contra ese mismo cliente. `ConditionsService.apply` no tiene
esa rama — reciba `tx` o no, siempre llama a `requireVisibleCharacter(this.prisma, …)` y
`requireOwnerOrDM(…)` contra la conexión por defecto, y usa `tx` solo para escribir al final. No es
hipotético: `ActivitiesService.usar` lo llama **con** `tx` (`activities.service.ts:266`), así que
ese camino abre exactamente la segunda conexión que el patrón existía para evitar. El arreglo es
que `apply` reciba también una variante de sus dos comprobaciones que acepte un
`Prisma.TransactionClient`, igual que ya hacen `changeHp` y `create`.

> **Lo que este arreglo NO cierra, medido al hacerlo (2026-09-07):** de las seis consultas que
> `apply` hace antes de escribir, **tres** pasan a ir por el `tx` —buscar el personaje, resolver el
> visor y leer las inmunidades del statblock— y **tres siguen yendo por el pool**, todas por el
> mismo motivo: `MembershipService` no tiene la puerta. Ni `requireMember`
> (`apps/api/src/campaigns/membership.service.ts`) ni `requireDM` ni `getMembership` aceptan un
> cliente, así que `membership.requireMember` (dentro de `requireVisibleCharacterWithViewer`),
> `membership.getMembership` (dentro de `viewerFor`) y `requireOwnerOrDM` (en `apply`) siguen
> abriendo conexión propia. **Darle el mismo parámetro opcional a `MembershipService` es la tarea
> que falta**, y toca a todo el que lo usa, no solo a esta ruta: por eso no entró aquí.

---

### ~~P2-0b · `changeHp` con `tx` tampoco evita del todo la segunda conexión — el hueco está en calcular la hoja, no en autorizar~~ (2026-09-07) — CERRADA

> **Cerrada el 2026-09-07.** `equipoEquipado` y `viewerFor` declaran el `tx?`, `construirODenegar` se lo reenvía a las dos, y los tres llamadores que ya corrían dentro de una transacción le pasan el suyo. **Queda un tramo, y tiene ficha propia: P2-8**, `buildResponse` al final del camino feliz.

**Abierto, encontrado revisando la propia corrección de P2-0.** La autorización de `changeHp` sí
va contra el cliente correcto cuando recibe `tx` (ver P2-0), pero eso no es todo lo que `changeHp`
hace antes de escribir: dentro de `changeHpEnTransaccion`
(`apps/api/src/characters/character-sheet.service.ts:1196`), la llamada a
`this.construirODenegar(userId, character)` **no le pasa el `tx`**, aunque `construirODenegar`
acepta un tercer parámetro `tx?: Prisma.TransactionClient` (línea 1028) precisamente para esto. De
ahí cuelgan `equipoEquipado` (línea 390) y `viewerFor` (línea 297), y ninguna de las dos declara
siquiera un parámetro `tx`: las dos hablan con `this.prisma` sin condición. El resultado es que
`changeHp` con `tx`, hoy, sigue abriendo varias conexiones por la puerta por defecto —para leer el
inventario equipado y para resolver el visor— mientras la transacción ajena que le pasaron sigue
abierta. El arreglo es doble: que `equipoEquipado` y `viewerFor` acepten un `tx?` opcional (el
mismo patrón que el resto de esta tanda ya usa), y que `construirODenegar` se lo reenvíe a las dos
en vez de solo a `hojaOMotivo`.

---

### ~~P2-3 · Un jugador con un PNJ cedido ve una lista de destinatarios vacía al abrir «Dar…»~~ (2026-09-07) — CERRADA

> **Cerrada el 2026-09-07.** El selector suma ahora la lista de PNJ (`GET /npcs`, ya filtrada por `canView` en el servidor) con **el mismo filtro que la primera**, no uno aparte. El servidor no cambia de postura: `requireOwnerOrDM` sigue siendo la puerta. Prueba de componente para el caso del jugador y recorrido de navegador (`e2e/dar-a-un-pnj.spec.ts`) para el carril de datos, los dos verificados por mutación. **Y al escribirlo se encontró que ceder un PNJ no tiene puerta: ficha P2-9.**

**Abierto, gesto muerto en pantalla.** `fetchCharacters` (`apps/web/src/features/characters/api.ts`)
llama a `CharactersService.list()`, que filtra `statblockRef: null` a propósito —excluye PNJ del
listado de personajes jugadores—. El selector de destinatarios de «Dar…» (B4/B5) construye su lista
de nombres a partir de esa misma llamada, así que un jugador al que el DM le cedió el control de un
PNJ ve el botón «Dar…» pero el diálogo se abre sin nadie a quien elegir. No es una fuga de
autorización —el servidor no cambia de postura—, es una pantalla que ofrece un gesto sin datos para
completarlo.

---

### ~~P2-6 · `ActivitiesService.consumir` lee y escribe sin `SELECT … FOR UPDATE`~~ (2026-09-07) — CERRADA

> **Cerrada el 2026-09-07.** `consumir()` toma el candado sobre `CharacterResource`, el mismo patrón que `changeHp` sobre `Character`. La prueba es de concurrencia real contra Postgres (`test/usos-concurrentes.e2e-spec.ts`): tres usos simultáneos de la Furia dejaban el recurso en 2 y ahora lo dejan en 0. Quitar las dos palabras `FOR UPDATE` la devuelve al 2.

**Abierto, menor.** `consumir()` (`apps/api/src/activities/activities.service.ts`) lee un
`CharacterResource` con `findUnique` y lo actualiza con `update`, sin bloquear la fila —igual que
`ResourcesService.adjust`—, así que dos usos concurrentes de la misma actividad pueden leer el
mismo `current` y perder uno de los dos descuentos. `changeHp`, a un metro de distancia en el mismo
flujo (`character-sheet.service.ts`), sí toma el candado con `SELECT ... FOR UPDATE` sobre
`Character`. El arreglo es el mismo patrón, aplicado a `CharacterResource`.

---

### ~~P2-7 · Dos huecos de red que no falla nada hoy, pero que nada impide que fallen mañana~~ (2026-09-07) — CERRADA

> **Cerrada el 2026-09-07.** La primera red es una prueba de servicio: quitando el `safeParse`, la tirada muere con `entrega.objetos.map is not a function` en vez de seguir con su texto. La segunda **cambió el código**: `record()` compara lo que entró con lo que sobrevivió al esquema y rechaza nombrando la clave sobrante, en vez de descartarla como hace `.parse()`. La suite de e2e de API entera pasa con el guardián estricto puesto, así que ningún llamador real mandaba claves de más.

**Abierto, dos hallazgos de la revisión de B1+B2 y B3, ninguno de comportamiento medido incorrecto.**

- **No hay prueba de servicio de que un `entrega` malformado en el `Json` de `DmTableEntry` no
  rompa la tirada.** El guardián que de verdad actúa al leer es `entregaSchema.safeParse`
  (`DmTablesService.resolverEntrega`, `dm-tables.service.ts:262`) — no
  `entregaResueltaSchema`, que solo se usa como tipo de salida. El comportamiento **se verificó
  por ejecución** en la re-revisión de B1+B2 (un `entregaRaw` que no valida hace que `parsed.success`
  sea `false` y la función devuelva `undefined`, así que la tirada sigue con su texto); lo que
  falta es la prueba que lo sujete, para que un cambio futuro no lo rompa en silencio.
- **Un campo del `payload` de un `GameEvent` solo lo sujeta el `tsc` de la web, no un guardián de
  servidor.** Quitar un campo del esquema de `@dnd/shared` deja las tres suites en verde y la API
  compilando: un *spread* de TypeScript no comprueba propiedades sobrantes, y `record`
  (`game-events.service.ts`) valida con `.parse()`, que **descarta** las claves desconocidas en vez
  de rechazarlas. El campo se tiraría en silencio en producción el día que alguien lo quite del
  esquema sin darse cuenta de que la web todavía lo manda.
