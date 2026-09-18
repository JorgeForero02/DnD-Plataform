# Arquitectura

## Monorepo

```
apps/api        NestJS 11 + Fastify + Prisma 5 + PostgreSQL 16
apps/web        React 18 + Vite + TanStack Query + Zustand + Tailwind + React Hook Form
packages/shared @dnd/shared — esquemas Zod compartidos por API y web
```

pnpm workspaces, `packageManager: pnpm@10.32.1` (pin obligatorio: corepack traía pnpm 11 y
rompía en Node 20 dentro de Docker). **Node ≥ 22** desde el 2026-09-11 (D-CF-13: Node 20 dejó de
recibir parches el 2026-04-30); los cuatro pines —dos `Dockerfile`, `ci.yml` y los `engines`— los
mantiene iguales una prueba en `apps/web/src/__tests__/`.

**`@dnd/shared` es el único sitio donde vive la forma de los datos.** La API valida con esos
esquemas en el borde (`ZodValidationPipe`) y la web construye sus formularios contra los
mismos. Un campo nuevo se añade una vez, en `packages/shared/src`.

## Dirección de dependencias

```
web  ─┐
      ├─→ @dnd/shared            (la web nunca importa de apps/api)
api  ─┘
```

Dentro de la API:

```
Controlador → Servicio → Prisma
```

- El **controlador** no toma decisiones de negocio: valida con el pipe de Zod, saca el
  `userId` del JWT y delega.
- El **servicio** decide: quién puede ver qué, quién puede escribir, qué se filtra.
- **Prisma** es el único que habla con la base. Ningún controlador la toca.

`MembershipService` (en `campaigns/`) es el dueño único de la pregunta *"¿este usuario
pertenece a esta campaña y con qué rol?"*: `requireMember`, `requireDM`, `getMembership`.
Cualquier módulo que necesite eso importa `CampaignsModule`; **nadie recalcula la membresía
por su cuenta**.

## Módulos de la API

| Módulo | Responsabilidad | Quién puede escribir |
|---|---|---|
| `auth` | Registro, login, JWT, `JwtAuthGuard`, `/auth/me` | público (registro/login) |
| `users` | Alta y consulta de usuarios | interno |
| `campaigns` | Campañas + `MembershipService` + listado de miembros | dueño / DM |
| `invites` | Crear invitación (DM) y aceptarla por token | DM crea, cualquiera acepta |
| `entities` | NPC, lugar, misión, facción, objeto, evento, documento | DM o creador |
| `links` | Relaciones wiki entre entidades | DM o creador |
| `comments` | Hilo de comentarios de una entidad | quien pueda ver la entidad |
| `sessions` | Sesiones de juego | solo DM |
| `characters` | Personajes y **la hoja de 5.ª edición** (2A.6) con sus PG mutables y sus tiradas de muerte (2A.7). `ability-rolls.service.ts`/`ability-rolls.controller.ts` (D-CF-53): tirar las seis características cuando la regla de la mesa es `DADOS`, contando intentos contra `AbilityRollAttempt` para que no se pueda repetir a escondidas. Puerta de efectos (2026-09-13): `damage-tray.controller.ts` (`GET/POST .../rolls/:rollEventId/damage-preview` y `/apply-damage`, la única puerta HTTP sobre el `pendingDamage` de una tirada) y `xp.controller.ts`/`xp.service.ts` (`POST .../xp`, dar experiencia por cabeza — 400 si algún destinatario es un PNJ de statblock) | dueño o DM; XP, solo DM |
| `character-state` | Recursos consumibles y descansos (2A.8), condiciones y velocidad efectiva (2A.12), **la sugerencia de ventaja o desventaja que sale de esas condiciones** (2.5.5, `roll-mode/`) y **si un personaje está concentrado** (2.5.4, `concentration/`, que solo reconoce el prefijo y calcula la CD; pedir la salvación lo hace `changeHp`) | dueño o DM; los recursos `DM_ONLY`, solo el DM |
| `game-events` | Log append-only de la partida (2A.5). **Solo lectura por HTTP**: escribe el servicio que provoca el cambio | nadie, por HTTP |
| `rolls` | Tirar de verdad (2A.13). **El azar vive aquí y solo aquí**: el servidor tira y escribe la tirada antes de devolverla | miembro de la campaña |
| `notifications` | Avisos (2A.14). **Sin tiempo real**: se piden al cargar. Escucha los eventos de dominio que ya se emitían y nadie escuchaba —cuatro `@OnEvent` en `notifications.service.ts`: miembro que entra, ficha creada, comentario y sesión programada—. **Y sí tiene pantalla**: `features/notifications/BandejaDeAvisos.tsx`, montada en `ui/AppShell.tsx`, con su recorrido de navegador. **Hasta el 2026-09-08 esta fila decía «es API sin pantalla, no hay ninguna bandeja» y remitía a una ficha `A1-avisos` que ya no existía en `06-pendientes.md`**: una fila de estado afirmando un hueco cerrado y apuntando a una ficha ausente. Ver [`_archivo/pendientes-cerrados-2026-09-08-reconocimiento.md`](./_archivo/pendientes-cerrados-2026-09-08-reconocimiento.md) | la bandeja del armazón; y marcar leídas las propias |
| `world-state` | Marcas, conjuntos y señales de la campaña (2A.15). Lo que el motor de reglas escucha | **Por HTTP, solo DM. Pero no todo lo que escribe entra por HTTP**: `recordEntityOpened` lo llama `entities` cuando **un jugador** abre una ficha, así que un jugador escribe aquí sin pasar por este controlador. El suceso es `DM_ONLY` y no se registra si quien mira es el DM o el creador |
| `common` | `canView` (matriz de visibilidad) y `ZodValidationPipe` | — |
| `prisma` | `PrismaService` | — |
| `dice` | Evaluador de expresiones de dados (2A.1). **Puro** | — |
| `rules` | Motor de derivación de 5.ª edición (2A.2), catálogo SRD (2A.3), elecciones (2A.4) y, desde 2B, **los objetos**: `items.ts` traduce la lista cerrada de efectos a modificadores y fórmulas de CA —es su dueño único— y `attacks.ts` monta el cuadro de ataques. El núcleo es **puro**; `catalog.controller.ts` es la única puerta HTTP: `GET /catalog` sirve razas, subrazas, clases y armaduras para que la pantalla no las transcriba. `table-rules.ts` (D-CF-53) comprueba raza/clase/subclase contra `permitidos` y valida un reparto de características contra la regla vigente (`MATRIZ`/`PUNTOS`/`DADOS`) — lo llama `character-sheet` al fijar la hoja (`PATCH …/sheet`); `characters.service.create` no pasa por él, solo lee `nivelInicial` | autenticado (el SRD es el mismo para todas las campañas) |
| `level-up` | Subida de nivel (2A.9): el servidor **propone un diff** y el jugador confirma. Siembra los recursos del nivel nuevo en la misma transacción | dueño o DM |
| `campaign-items` | Los objetos propios de una campaña — el *homebrew* del DM (2B). Traduce sus filas a la misma forma que el catálogo del SRD, para que el motor no pueda saber de dónde salió un objeto | **DM para escribir; cualquier miembro lee**, filtrado por `canView` |
| `inventory` | El inventario de un personaje, equipar, sintonizar y la bolsa (2B). Aquí viven las reglas de **ranura, manos y tope de tres sintonizaciones**; la base garantiza «una ranura, un objeto» con un índice único parcial | dueño o DM |
| `rules-engine` | Reglas suceso–condición–efecto de la campaña (2A.16): alta, ensayo en seco, trazas y propuestas. **Escucha `game_event.recorded`** por un puente, en vez de que el log le llame | solo DM |
| `game-clock` | El reloj de la campaña (2C.3): un contador de **segundos de juego** que solo se avanza, nunca se fija, y el viaje con su ritmo y su marcha forzada. Lo lee cualquier miembro; lo mueve el DM | leer, miembro; avanzar, solo DM |
| `encounters` | El combate: iniciativa, orden de turnos y asaltos (2.5.2), y desde 2.5.6 **el encuentro activo de una sesión** (`GET .../current`, que contesta `null` en vez de 404 porque no estar en combate es lo normal) y **terminarlo** (`POST .../:id/end`, que lo pasa a `ENDED` sin borrar nada). Cuelga de la sesión. **Como mucho uno activo por sesión, y lo garantiza un índice único parcial**, no un `if`. Filtra los combatientes por `canView` y **renumera denso** las posiciones visibles: devolverlas crudas deja contar los huecos, o sea contar enemigos escondidos. Desde PNJ del mundo y la mesa (spec 2026-09-14), `DELETE .../encounters/:id/combatants/:combatantId` saca a un combatiente del orden de turnos (200 con el `Encounter` entero, E-PM-8): con el encuentro `ACTIVE` y nunca al último (409); si tenía el turno y estaba solo en su posición, avanza con el mismo `empezarTurno` que usa `advanceTurn` (E-PM-7) | empezar, corregir, pasar turno, sacar del combate y terminar: **solo DM**; leer: cualquier miembro |
| `roll-requests` | La petición de tirada (2C.5): el DM pide **un valor de la hoja** —no una expresión— y quien tira la responde con su hoja de ese momento. Con sondeo | pedir, solo DM; responder, el dueño del personaje o el DM |
| `bestiario` (web) | La pestaña del bestiario (2D.5): las fichas del SRD y las del DM, y el botón que baja una criatura a la mesa. Va **justo antes de «Catálogo»**, que es donde la pone el prototipo, y por el mismo motivo: es la cara mecánica de algo que ya tiene ficha de mundo | pinta lo que el servidor le manda; el botón solo se le enseña al DM, y eso **no** es el control de acceso |
| `npcs` (dentro de `statblocks`) | Bajar un statblock a la mesa (2D.4): de una plantilla nacen N combatientes, y **un PNJ en la mesa es una fila de `Character`** — no un modelo nuevo. Lo que lo distingue es `statblockRef`; `classKey`, `raceKey` y `level` quedan sin usar. Puede nacer enlazado a una ficha del mundo (`entityId`, PNJ del mundo y la mesa, spec 2026-09-14). Desde esa misma tanda, `NpcsService.reveal`/`hide` (ruta en `npc-visibility.controller.ts`, `POST campaigns/:id/characters/:id/reveal\|hide`, E-PM-1) — **corregido en la ola de cierre (2026-09-14, I4)**: `reveal` sube la instancia, la ficha del mundo enlazada y la plantilla creada, cada una si estaba por debajo de la mesa; `hide` baja **solo** la instancia, nunca la ficha (spec §3.2, «la ficha del wiki no se des-revela») | instanciar, revelar, ocultar: solo DM; listar, filtrado por `canView` |
| `statblocks` | Los statblocks de PNJ (2D.3): el catálogo del SRD 5.1 **en código** y los propios del DM **en la base**, con una sola forma resuelta y **una sola puerta que traduce un `ref`** (`SRD:goblin` o `CAMPAIGN:<id>`). Es el mismo reparto que 2B eligió para los objetos | escribir, solo DM; leer, filtrado por `canView` |
| `dm-tables` | Las tablas del DM (2C.6): tirar sobre una tabla con sus resultados y su visibilidad. **Regla de la casa, con interruptor por campaña y apagada por defecto** — el SRD no trae ninguna tabla de críticos ni de pifias. Desde el paso botín (2026-09-06) una fila puede llevar `entrega` (objetos y monedas), y tirarla devuelve esos objetos ya resueltos por nombre | escribir, solo DM; leer, filtrado por `canView` |
| `activities` (paso 2, 2026-09-06) | Usar una actividad de la hoja (`POST .../characters/:characterId/activities/:activityKey/use`): gasta lo que declare `consumption` (que apunta a un `CharacterResource` por clave, nunca un contador propio), cobra la acción por la puerta de `Combatant` (2.5.2/A1) y aplica sus `effects` — daño o curación por `changeHp`, una salvación por `RollRequestsService`, una condición por `ConditionsService`. No calcula nada por su cuenta: todo número sale de `resolverOrigen` (`rules/engine.ts`) con su paso de traza | dueño o DM del personaje que usa la actividad |
| `spellbook` (3A.2, Task 3, T10) | El libro (o la lista) de conjuros de un personaje (`GET .../characters/:characterId/spellbook`; `PUT .../spellbook/:spellKey`, que responde con la entrada tocada y los topes —`SetSpellResponse`—, no con la lista): qué conjuros de la clase tiene marcados y en qué estado, con los topes ya contados (D-CF-125). El mago **nace con su libro sembrado** al fijar la primera clase — `sembrarLibro` (`spellbook/sembrar.ts`) es una función libre, no un método del servicio, para que `characters` no tenga que importar `spellbook` (evita el ciclo de módulos). D-CF-126: pasarse de un tope o preparar en combate **se escribe igual**, marcado en `fueraDeRegla` del suceso — nunca un rechazo | leer, quien ve el personaje (`canView`); escribir, dueño o DM |
| `actions` (3A.3, Task 1, T21) | La barra de acciones: `GET .../characters/:characterId/actions` compone en una sola lista lo que `characters` (el cuadro de ataques y `sheet.activities`), `spellbook` (el libro) e `inventory` (los consumibles) ya derivan, más las ocho básicas del SRD (`rules/catalog/basic-actions.ts`, cableadas en `ActivitiesModule` bajo la clave `basic:<key>` — Ayudar la rechaza y va por su propia puerta). No calcula NINGUNA mecánica nueva: solo decide, con la economía del turno (`Combatant`, leída directamente de Prisma como ya hace `ActivitiesService.gastarActivacion`), por qué cada fila está o no disponible ahora | **solo dueño o DM** del personaje — no `canView`: la barra es del jugador sobre SU personaje |

### Las tres capas de la fase 2A, y por qué no se tocan entre sí

`dice/`, `rules/engine.ts` y `rules/catalog/` **no son módulos de Nest**: no tienen
controlador, ni servicio, ni Prisma. Son código puro que se importa. La dirección de
dependencias entre ellos es de una sola vía y está puesta a propósito:

```
catalog/  ──→  engine.ts        (el catálogo conoce al motor; el motor NO conoce el catálogo)
engine.ts ──→  @dnd/shared      (la traza vive en shared, porque la web la pinta)
dice/     ──→  (nada)
```

**Y los dos módulos que calculan una hoja no dependen uno del otro.** `characters` y
`character-state` necesitan los mismos PG máximos —uno para recortar al leer, otro para no
curar por encima—, y **los dos los derivan del catálogo** en vez de pedírselos al vecino:
`character-state/common/max-hp.ts` llama a `deriveCharacter` igual que hace la hoja. Cuelgan
del mismo cálculo y ninguno del otro, que es lo que evita el ciclo.

**El motor no importa nada de `catalog/`**, y esa es la regla que hace útil la separación: si
el motor conociera las razas, un `+1` transcrito mal parecería un fallo del motor y se buscaría
en el sitio equivocado. El único punto donde se tocan es
`apps/api/src/rules/catalog/resolve.ts`, que traduce una ficha declarada (raza, subraza,
clase, nivel, armadura) a la entrada que el motor come.

La puerta de entrada es `deriveCharacter` (`apps/api/src/rules/catalog/index.ts`): resuelve el
catálogo, deriva con el motor y **junta las dos listas de avisos**. Existe porque significan lo
mismo para quien mira la hoja —«hay algo que querrías saber»— y dejar que cada pantalla las
junte por su cuenta es cómo una de ellas acaba sin pintarse.

**El catálogo generado (3A.1, 2026-09-14) añade dos directorios al mapa**, uno fuera de `apps/`
y otro dentro de `rules/catalog/`: `scripts/convertir-catalogo.mjs` + `scripts/convertir-catalogo/`
es el conversor —Foundry YAML + el SRD 5.1 español → los cuatro JSON de abajo, por huella
estructural y tablas a mano, puro y probado con `node --test` (`pnpm catalogo:test`, 47
unitarias)—, y `apps/api/src/rules/catalog/generado/` son sus **ficheros generados y
commiteados** (`spells-srd.json`, `class-features-srd.json`, `race-features-srd.json`,
`class-scales-srd.json`, `rechazos.md`), leídos una sola vez al arrancar por `apps/api/src/rules/catalog/generado/index.ts`
con Zod (`spellsCatalogSchema` y hermanos en `packages/shared/src/catalog.schema.ts`) y fundidos
en `SRD_CLASSES`/`SRD_RACES` al cargar (`enriquecerClases`, `enriquecerRazas`). Es **generado, no
editado** — ver [05-datos.md](./05-datos.md) y [02-entorno.md](./02-entorno.md) para cómo se
regenera y [NOTICE.md](../NOTICE.md) para su licencia.

`ContentRef` (`apps/api/src/rules/catalog/types.ts`) existe desde 2A aunque **hoy solo
tenga una rama útil** (`SRD`): la otra (`CAMPAIGN`) es por donde entrará el contenido propio
del DM en 2B, **sin que el motor cambie**. Mientras no exista, una referencia de campaña falla
ruidosamente con
`UnknownContentError` en vez de resolverse a nada.

**La seguridad de lectura es un único concepto derivado:** `common/visibility.ts` exporta
`canView`, con la matriz completa de 5 visibilidades × 6 situaciones de espectador probada
en `visibility.spec.ts`. Los listados filtran por `canView`; las mutaciones exigen DM o
propiedad. Ver [05-datos.md](./05-datos.md) para la semántica de cada nivel.

> **Deuda conocida, y con la mitad pagada el 2026-09-03:** **el visor de un personaje ya vive
> en un solo sitio**, `apps/api/src/common/character-viewer.ts`, y lo usan `character-state` y el
> inventario de 2B. Lo que cerró la refactorización no fue la deuda escrita: fue que 2B estuvo a
> punto de escribir la **tercera** copia de la misma regla de autorización.
>
> **Y la otra mitad se pagó el 2026-09-11:** diez de las trece copias de
> `viewerFor(userId, campaignId)` importan el común, y `common/un-solo-viewer-for.spec.ts` barre
> el árbol para que no vuelva ninguna. **Tres se quedan a propósito y en su lista blanca**
> —`dm-tables`, `npcs`, `statblocks`— porque no son copias: usan `requireMember` (403 al no
> miembro) donde el común usa `getMembership` (rol nulo → `canView` niega). Unificarlas es una
> decisión sobre 403 contra 404, no una limpieza. Lo que este párrafo enumeraba caducó dos veces;
> por eso ahora lo cuenta una prueba.

### Un `tx?` opcional y aditivo, porque `PrismaService.transaction` no anida

Usar una actividad (`ActivitiesService.usar`) tiene que gastar un recurso, cobrar una acción,
aplicar daño o curación, pedir una salvación y aplicar una condición **en una sola transacción**: o
se escribe todo o no se escribe nada. El problema es que cada una de esas piezas ya era un servicio
con su propia transacción, y `PrismaService.transaction` **no anida** — abrir una segunda dentro de
la primera no comparte candados ni revierte junto con ella.

La solución, ya probada dos veces antes del paso 2 (`DmTablesService.tirarSobre` y
`GameEventsService.record`), se extendió en esta tanda a **tres** servicios más:
`CharacterSheetService.changeHp`, `RollRequestsService.create` y `ConditionsService.apply`
ganaron un parámetro **`tx?: Prisma.TransactionClient` opcional y aditivo** — sin él, el servicio
abre su propia transacción como siempre; con él, corre dentro de la que le pasan. Ningún llamador
existente cambia.

**Y el `tx?` no siempre evita la segunda conexión, y eso es una deuda real en dos frentes
distintos, no una errata.**

Para la **autorización**: `changeHp` y `RollRequestsService.create` tienen una rama explícita
(`autorizarEdicionConCliente` / `autorizarYComprobarPersonajesConCliente`) que repite su
comprobación **contra el cliente que les pasan**. `ConditionsService.apply` no tiene esa rama:
reciba `tx` o no, empieza siempre llamando a `requireVisibleCharacter(this.prisma, …)` y
`requireOwnerOrDM(…)` contra la conexión por defecto. No es hipotético: `ActivitiesService` la
llama **con** `tx` (`activities.service.ts:266`), así que ese camino abre ahí una segunda conexión
del pool. Ficha **P2-0** en [06-pendientes.md](./06-pendientes.md).

Pero **ni siquiera `changeHp` cumple el patrón entero**, y esto es un hallazgo distinto del de
arriba, no el mismo con otro nombre: dentro de `changeHpEnTransaccion`, la llamada a
`this.construirODenegar(userId, character)` (`character-sheet.service.ts:1196`) **no le pasa el
`tx`**, aunque `construirODenegar` sí acepta uno (línea 1028). De ahí cuelgan `equipoEquipado` y
`viewerFor` (líneas 390 y 297), que ni siquiera declaran un parámetro `tx` — hablan con
`this.prisma` siempre. Así que **`changeHp` con `tx`, hoy, sigue pidiendo varias consultas por la
conexión por defecto mientras la transacción ajena está abierta**: la autorización sí va contra el
cliente correcto (la frase de arriba, acotada, sigue siendo cierta), pero calcular la hoja para
saber los PG máximos no. Ficha hermana, **P2-0b**, en [06-pendientes.md](./06-pendientes.md).

**El parámetro no es siempre el último tampoco.** En `changeHp` y en `create` sí lo es; en
`ConditionsService.apply` va seguido de un `opciones?: { concedidoPorActividad?: boolean }` — el
mismo patrón que ya traía su precedente, `GameEventsService.record(actorUserId, campaignId, input,
tx?, options?)`.

**Por qué aditivo y no un rediseño**: reescribir esos tres servicios para que solo supieran operar
dentro de una transacción ajena habría tocado a todos sus llamadores actuales para nada — lo único
nuevo es que ahora tienen un llamador más. Un `tx?` que por defecto abre su propia transacción es la
forma más barata de dar una puerta nueva sin mover la que ya existía.

### Misma escritura, dos autorizaciones, la interna sin ruta

Un tercer patrón, distinto del `tx?` aditivo de arriba aunque a veces viaje con él: **la misma
escritura tiene dos puertas de entrada, con dos autorizaciones distintas, y una de las dos no tiene
ruta HTTP** — nadie puede llamarla directamente, solo otro servicio que ya autorizó por su cuenta.

- **`GameEventsService.record` / `recordFromEngine`** (`game-events`): `record` es la puerta
  pública, con su propia comprobación de membresía; `recordFromEngine` la usa el motor de reglas
  (`rules-engine`) para escribir el eco de una regla que él mismo disparó, sin volver a pedirle
  permiso a nadie — la autorización ya la hizo quien montó la regla.
- **`WorldStateService.recordEntityOpened`** (`world-state`): sin ruta HTTP propia; la llama
  `entities` cuando un jugador (no el DM) abre una ficha, así que un jugador escribe en
  `world-state` sin pasar por su controlador, que solo admite al DM.
- **`CharacterSheetService.changeHpFromEffect` / `RollRequestsService.createFromEffect`** (puerta
  de efectos, 2026-09-13, spec §3): las llama `ActivitiesService.usar`, que ya autorizó con
  `canView` sobre un objetivo de la actividad — «vienes de una actividad ya autorizada sobre un
  objetivo que `canView` te deja ver» (D-P2-11, [decisiones.md](./decisiones.md)). Las dos exigen
  `tx: Prisma.TransactionClient` **obligatorio**, no opcional: sin transacción ajena no hay forma
  de llamarlas, y eso es lo que impide que un controlador las importe por accidente. Ningún
  controlador lo hace — lo comprueba `apps/api/src/characters/__tests__/puertas-sin-ruta.spec.ts`
  con un grep sobre el árbol de módulos, no una convención de que nadie las use. Las cruzan otros
  **servicios**, cada uno ya autorizado por su propio camino: `ActivitiesService.usar` (el
  efecto directo de una actividad) llama a las dos; `RollRequestsService.answer` (responder una
  petición con `pendingEffect`) y `CharacterSheetService.applyPendingDamage` (la bandeja de daño,
  bajo `DamageTrayController.applyDamage`, `.../rolls/:rollEventId/apply-damage`) llaman solo a
  `changeHpFromEffect` — ninguno de los tres repite `canView` ni `requireOwnerOrDM`.

## Estructura de la web

**Las pantallas grandes de la fase 2A** viven en `apps/web/src/features/`:
`character-sheet/` (la hoja calculada con su traza desplegable, PG, recursos, descansos,
condiciones, tirar y las anulaciones del DM), `level-up/` (el diff propuesto y su confirmación) y
`rules/` (el panel del motor: reglas, propuestas y trazas), `rolls/` (la tirada: los dos dados con el descartado a la vista, el desglose y la decisión de ventaja) y `sessions/` (la barra global de
«en juego» y la mesa: elenco, registro en vivo y consulta del mundo). `characters/` conserva el
CRUD.

**Desde el reseño de la mesa (2026-09-04), `sessions/` está partido por ranuras**, y esto no es
orden por gusto: `MesaDeSesion.tsx` medía **992 líneas** con el elenco, el registro, la ficha de
personaje, la barra de PG y la consulta del mundo dentro, así que **cualquier trabajo sobre la mesa
pasaba por ese fichero** y dos personas no podían tocarla a la vez. Hoy es un **compositor de ~150
líneas que solo coloca ranuras**:

| Carpeta | Qué ocupa |
|---|---|
| `sessions/elenco/` | La columna de quién está, con los mandos del DM y el cajón de condiciones |
| `sessions/hilo/` | El registro con sus cinco formas de mensaje y su compositor |
| `sessions/dm/` | La columna de herramientas de narración y la consulta del mundo |
| `sessions/taller/` | Lo que ocupa la mesa cuando el DM está en reposo. A la izquierda **el mundo como árbol con detalle** (`taller/mundo/`, Task 14 bis, D-CF-64): `arbolDelMundo.ts` es la función pura —cuelga por `ROTULOS_DE_JERARQUIA`, dos padres se ven en los dos, un ciclo se corta—, `DesgloseDelMundo` el `tree` WAI-ARIA, `DetalleDeFicha` la cabecera · vitela · `AnilloDeVecinos` · `EditorDeHilos`, y `ElMundo` las dos mitades. **Sustituye al tablero telaraña** (D4; `TableroTelarana.tsx` y `posiciones.ts` ya no existen). A la derecha las tres solapas: escribir ficha, preparar sesión, lo que sabe la mesa |
| `sessions/tablero/` | C1 bis (2026-09-12): el tablero PlanarAlly enmarcado en el centro (`MarcoDelTablero`) y el registro en vivo como cajón inferior plegable con contador (`CajonDelRegistro`), cuando la campaña tiene `boardRoomUrl` (D-CF-63) |
| `apps/web/src/features/sessions/BandaDeMesa.tsx` · `PanelDeMesa.tsx` | La banda superior y la tarjeta común |

**La mesa es la única pantalla que NO va dentro de `AppShell`.** `SesionPage` no lo monta a
propósito: una pantalla en la que se está durante horas no se lee, **se opera**, y las migas de pan
contestan una pregunta que quien juega no tiene. Y sin `h-screen` no hay scroll por panel — con la
página scrolleando, el elenco, el hilo y las herramientas crecen a la vez y no se puede mirar el
registro sin perder de vista los puntos de golpe.

> **La regla que sostiene todo eso, y que se olvida:** `min-h-0` en **todos** los ancestros de un
> panel que scrollee. Un hijo de flex/grid tiene `min-height: auto` y se niega a encoger por debajo
> de su contenido, así que el `overflow-y-auto` de dentro **no se activa jamás** y el panel empuja
> la página. Es el defecto que tuvo esta pantalla con cinco `overflow-y-auto` escritos y ninguno
> funcionando. **`jsdom` no maqueta**, así que solo se ve midiendo en un navegador: lo cubre
> `apps/web/e2e/mesa-mide.spec.ts`.

**Y desde 2.5.6, `encounters/`: la capa de combate.** No es una pantalla y no se navega a ella —
es una tira de orden de turnos que aparece **encima** del elenco mientras dura el encuentro y se
va cuando termina, montada desde `apps/web/src/features/sessions/MesaDeSesion.tsx`. La URL no cambia. Los PG y las
condiciones de cada combatiente los sigue pintando el elenco: repetirlos en la tira sería una
segunda ficha de personaje con su segunda regla de visibilidad.

Dentro de `character-sheet/`, **`EdicionEnSitio.tsx` es la casa de las tres primitivas de
edición** —`NumeroEditable`, `SelectorEditable`, `TextoEditable`— y nadie fabrica la suya:
lo que gobiernan (cuándo se guarda solo, qué pasa al rechazar, qué significa el subrayado) son
las reglas vinculantes de [04-convenciones.md](./04-convenciones.md), y repetirlas a mano es
como empiezan a discrepar. `IdentidadEditable.tsx` las usa para raza, subraza, clase, nivel y
las seis características, y sustituyó al antiguo `EditorFicha.tsx`, que ya no existe.

**Y desde la hoja a página completa (2026-09-12), `HojaCalculada.tsx` es un compositor**: carga la
hoja, monta `features/character-sheet/Cabecera.tsx` y reparte las tarjetas en pestañas.
Dos disposiciones y un solo componente (D-CF-29): `disposicion: "mesa" | "pagina"` decide tira
arriba o columna lateral, y la pestaña activa vive en la URL (`?pestana=`).

| Fichero | Qué ocupa |
|---|---|
| `features/character-sheet/Cabecera.tsx` | La banda fija —retrato, identidad solo en la mesa, cinco números, chips de condiciones— y, **debajo y fuera del `sticky`**, los avisos (D-CF-38) |
| `features/character-sheet/pestanas/tipos.ts` | `PestanaId`, `PESTANAS_DE_LA_HOJA`, `Disposicion` y `PropsDePestana`, la forma que reciben todas las pestañas (`data`, `puedeEditar`, `disposicion`) |
| `pestanas/Numeros` · `Objetos` · `Ataques` · `Recursos` · `Estado` · `Rasgos` · `Conjuros` | Una pestaña por fichero, cada una montando las tarjetas que ya existían; `Objetos` monta `PaginaDeInventario` con la disposición y con `puedeEditar` (en un personaje ajeno, ni filas ni detalle pintan acciones) |
| `features/character-sheet/hooks.ts` | Los hooks de la hoja, y desde la ronda de cierre también `useEsVistaDeDm`, el único dueño de «esto lo mira el DM»: lo comparten `Cabecera` (para decidir si la fila de avisos existe) y `AvisoDeDm`. Un fichero de componente no exporta hooks |
| `features/character-sheet/pestanas/lanzaConjuros.ts` | Si el personaje lanza (espacios o rasgo racial de conjuro): la pestaña Conjuros existe solo entonces (D-CF-34) |
| `features/character-sheet/habilidades.ts` | Las veinticuatro líneas de habilidad, fuera de la tarjeta que las pinta |
| `features/inventory/accionesDeObjeto.ts` | **La lista única de acciones de un objeto**; la fila y el panel de detalle pintan desde ella (D-CF-33) |
| `features/inventory/filtrarObjetos.ts` · `FiltrosDeObjetos.tsx` | El filtro por texto, zona y `ItemKind`; los rótulos salen de `features/inventory/vocabulario.ts` (D-CF-40, D-CF-41) |
| `features/inventory/DetalleDeObjeto.tsx` | El panel de la derecha a página: el objeto elegido, sus números y las mismas acciones que la fila |
| `features/character-sheet/__tests__/fixtures/hoja.fixture.tsx` | **Datos y `renderPestana`, sin ningún componente de la hoja** (HP-5): «Elowen» y el `wrapper` que comparten las pruebas de pestaña. `renderHoja` vive en `features/character-sheet/__tests__/HojaCalculada.test.tsx`, el único que monta la hoja entera |

> **`inventory` no importa de `character-sheet`, y es una frontera declarada**, no una casualidad:
> `features/inventory/hooks.ts:32` escribe literal la clave de la hoja en vez de importarla, y
> `PaginaDeInventario.tsx` declara su propia unión `"mesa" | "pagina"` en vez de importar
> `Disposicion` de `features/character-sheet/pestanas/tipos.ts`. La revisión de la Task 9 vio romperse la frontera con un
> `import type` y se deshizo: un tipo también es una dependencia.

**`ui/Dialog.tsx` es un cajón lateral, no un cuadro centrado**, desde el reseño de la mesa. Entra
por la derecha a altura completa con `border-l` de cobre, en tres anchuras (`sm` 26rem, `lg` 40rem,
`xl` 58rem), con variante `pergamino` y ranuras de subtítulo y de acciones. El motivo no es
estético: el estrato superpuesto se define como *«se abre encima, Escape cierra, y vuelves
exactamente donde estabas»*, y con un cajón **«donde estabas» sigue visible**; con un cuadro
centrado, no. Lo heredan sus 24 usos. El foco entra en el **cuerpo**, no en el aspa —si cayera
ahí, el primer Enter cerraría el panel que acabas de abrir—, sigue atrapado dentro, y vuelve al
control que lo abrió.

**`ui/Iconos.tsx` es la casa común de los iconos de línea**, y cada módulo grande dibuja los suyos —`features/rules/`, `features/sessions/`, `features/entities/`, `features/campaigns/`, `features/rolls/`, `features/level-up/`—: lo que la regla exige es que sean **dibujados**, no que vivan en un único fichero (ver [04-convenciones.md](./04-convenciones.md)), dibujados en SVG. `features/links/relaciones.ts`
guarda las relaciones sugeridas por par de tipos y su lectura invertida, que es lo que permite
que un enlace entrante se lea «vive aquí» sin inventarse el inverso de una frase libre.

```
src/lib/api.ts          apiFetch<T> — base /api, adjunta el JWT
src/store/auth.store.ts Zustand: token (persistido en localStorage) y usuario (en memoria)
src/features/auth/      AuthGate + useAuthRehydration: rellena el usuario tras recargar
src/features/<x>/       api.ts (fetchers) + hooks.ts (TanStack Query) + componentes + __tests__
src/pages/              pantallas enrutadas
src/components/         ProtectedRoute y compartidos
src/dominio/            el vocabulario del juego que usan VARIAS pantallas
```

> **`src/dominio/` nació el 2026-09-05 y es una decisión declarada**, no una carpeta que apareció
> sola. Guarda **la forma legible en español** de lo que `@dnd/shared` declara como dato: hoy, los
> tipos de daño (`dominio/dano.ts`). Existe porque esa tabla estaba **copiada en tres pantallas** y
> las tres no decían lo mismo, y porque las otras carpetas no eran su sitio: `lib/` es
> infraestructura —`apiFetch`—, `ui/` es presentación sin dominio, y meterla en un `features/<x>/`
> es exactamente cómo nacieron las tres copias. **No va en `packages/shared`**: allí vive la forma
> de los datos, no su traducción; `shared` no traduce.
>
> **Lo que entra aquí tiene que cumplir las dos:** ser vocabulario del juego, y **usarlo más de una
> pantalla**. Un vocabulario de una sola se queda en su módulo, por lo mismo que un icono.

> **Esta valla estaba sin cerrar hasta el 2026-09-02**, y se tragaba las dos tablas de abajo y
> toda la prosa que las sigue. No era solo cosmético: `scripts/check-docs.mjs` **salta lo que hay
> dentro de una valla**, así que ninguna de las rutas citadas ahí estaba siendo comprobada — y
> por eso `/acerca-de` pudo faltar en la tabla sin que nada avisara. Lo encontró una auditoría, no
> el script, que es exactamente lo que la auditoría existe para pillar.

Rutas de la web (`App.tsx`), tras el reseño del 2026-09-02:

| Ruta | Pantalla |
|---|---|
| `/login`, `/register` | Entrada, con su propio armazón y su ornamento |
| `/` | Panel de campañas |
| `/campaigns/:id` | **El taller** de la campaña. La **sección abierta viaja en `?seccion=`**, así que es enlazable y sobrevive a una recarga. Desde B4 son **seis destinos**, no diecinueve: Resumen, El mundo, Sesiones, Reglas, Miembros y Ajustes — el **tipo de ficha es un filtro dentro de «El mundo»** (`?seccion=NPC` sigue funcionando y abre «El mundo» con ese tipo puesto), y Personajes, Bestiario y Catálogo son **cajones superpuestos** sobre el taller, no secciones |
| `/campaigns/:id/sesion` | **La mesa**, y **el reposo es uno de sus tres estados, no la ausencia de la mesa**: en reposo enseña dónde quedó la escena, el elenco y el registro, y **el DM empieza ahí la sesión** en vez de volver al taller. En juego, elenco con asistencia, registro en vivo con sus sellos rápidos y el **estrato superpuesto** (Hoja, Bolsa, Mundo: uno a la vez, Escape cierra) |
| `/campaigns/:id/entidades/:entityId` | **Lectura** de una ficha del mundo: cuerpo en vitela, relaciones y comentarios |
| `/campaigns/:id/personajes/:characterId` | Hoja de personaje con la forma de 5.ª edición |
| `/account`, `/join/:token`, `/design-tokens`, `*` | Cuenta, invitación, control de tokens y 404 |
| `/acerca-de` | Atribución del SRD 5.1. **Pública a propósito**: la CC BY la pide en la obra distribuida, y una atribución que exige iniciar sesión está detrás de ella, no en ella |

`src/ui/` es el sistema de diseño, y **es la única puerta al color y a la tipografía**:

| Fichero | Qué da |
|---|---|
| `tokens.css` | La paleta y las escalas, en propiedades personalizadas. **Nadie escribe un color literal fuera de aquí** |
| `Button`, `Field`, `Panel`, `Badge`, `Dialog`, `Tabs` | Las primitivas de 1.19. `Panel tone="vellum"` es la superficie del mundo; `Tabs layout="sidebar"` es la columna de secciones |
| `AppShell`, `AppHeader`, `PageHeader`, `Breadcrumbs` | El marco de toda pantalla con sesión |
| `Collection` (`Toolbar`, `FilterChip`, `ListRow`, `EmptyState`) | De lo que se hace una lista |
| `Logo`, `Ornament` | La marca, los iconos y el ornamento — todo **dibujado**, ver [04-convenciones](./04-convenciones.md) |
| `theme.ts`, `ThemeToggle` | Los dos temas y su conmutador |
| `LegalNotice` | El pie con la atribución del SRD, montado dentro de `AppShell` para que lo lleve toda pantalla con sesión |

Todas las pantallas con armazón comparten `ui/AppShell.tsx` —panel, campaña, entidad, personaje
y `/acerca-de`, que además es **pública**—: cabecera global, migas y una medida máxima. Eran
«las tres primeras» y son cinco; y como `LegalNotice` viaja dentro de `AppShell`, la atribución
del SRD la llevan también las públicas que lo montan, no solo las que exigen sesión. **Y se toca donde se lee**: no hay
diálogo de edición, ni botón que lo abra. Aquí ponía «editar es un diálogo que se abre desde la
lectura, nunca la puerta de entrada», y **`04-convenciones.md` derogó esa regla la noche del
2026-09-02** al perder la hoja sus dos botones de «Editar»; este documento se quedó contándolo,
así que los dos que gobiernan la interfaz decían lo contrario el uno del otro.

**Cómo la web resuelve quién es y qué rol tiene (tarea 1.15, corregido en 1.15-fix):** el
token sobrevive a una recarga en `localStorage`, pero el usuario solo vivía en memoria —
`AuthGate` (envuelve todas las rutas en `App.tsx`, **por fuera** de `<Routes>`) pide
`/auth/me` una vez, en segundo plano, cuando hay token y no hay usuario, sin bloquear el
pintado (`ProtectedRoute` sigue mirando solo el token, como siempre). `AuthGate` nunca
redirige por sí mismo: solo dispara la comprobación y renderiza siempre sus hijos.
`apiFetch` (`lib/api.ts`) propaga el estado HTTP real en un `ApiError`, y **solo un 401**
(token caducado o inválido) hace que `useAuthRehydration` cierre la sesión — un 500, un 502
del proxy de Vite, o un fallo de red dejan el token intacto para poder reintentar. Cuando la
sesión sí se cierra, es `ProtectedRoute` (que ya redirigía a `/login` cuando no hay token)
quien lleva a la pantalla de acceso, no `AuthGate`: un `<Navigate>` devuelto en su lugar
—versión anterior a 1.15-fix— dejaba `<Routes>` (y `/login`, que vive dentro) sin
renderizarse nunca, con la pantalla en blanco para siempre tras cualquier expiración del JWT
a los 7 días. Con el `id` del usuario ya disponible, `useMyRole` (`features/campaigns/members.ts`)
cruza `GET /campaigns/:id/members` para responder "¿soy DM o jugador en esta campaña?", con un
tercer estado explícito de "aún no lo sé" mientras carga **o si la petición falla**
(`isError`, tratado siempre como "aún no lo sé", nunca como "no soy miembro") — con
`retry: false` (`lib/queryClient.ts`) un solo fallo no se reintenta solo, así que `useMyRole`
expone `retry()`, y **aquí ya no se escribe cuántos consumidores tiene**. Se intentó dos veces
—«seis consumidores, cuatro con reintento» primero, «diez llamadas en nueve componentes» después—
y **las dos caducaron**, la segunda en un día. Un censo a mano de algo que crece con cada pantalla
es una mentira con fecha de caducidad, así que se escribe **la regla** y se cuenta con `grep`
cuando haga falta: **todo consumidor que lee `isError` ofrece el botón «Reintentar»**; el que no
lo lee es porque su fallo ya lo cuenta la pantalla que lo contiene.

**Crear** una entidad, un enlace o un personaje **no** son el mismo caso, y confundirlos fue el
error que este párrafo tuvo hasta el 2026-09-02:

- **Entidades y enlaces son del DM.** `EntitiesService.create` y `LinksService.create` exigen
  `requireDM`. Antes exigían solo `requireMember`, y eso dejaba a un jugador crear PNJs, lugares,
  misiones y documentos en la campaña del DM — ver [05-datos.md](./05-datos.md). Así que el botón
  «Nuevo» **sí** se gatea por rol: ofrecerlo a un jugador es prometerle un 403.
- **Un personaje es suyo.** `CharactersService.create` sigue en `requireMember`, y ahí el botón no
  se gatea porque no hay nada que rechazar. Lo que sí usa
el rol para **deshabilitar** (no ocultar) con una explicación visible es **crear y editar una
sesión** (ambas DM-only en el servidor), **editar un personaje o una entidad**, y **generar
invitación**. La **fila** de una entidad, sesión o personaje **nunca se deshabilita** (arreglo 1,
1.15-fix). El motivo original era que el editor era la única vista de detalle que existía;
**desde el reseño del 2026-09-02 ya no lo es** —la fila es un enlace a su página de lectura
(`EntityDetailPage`, `CharacterDetailPage`), y los enlaces y los comentarios viven allí, no
dentro del editor—, pero la conclusión no cambia y ahora se sostiene mejor: **leer no es
editar**. Lo que el rol decide es si el editor que se abre *desde* esa página lo hace en modo
lectura (campos deshabilitados, Guardar deshabilitado con motivo) o en modo edición, nunca si
se puede abrir la ficha.
**Esto es honestidad de la interfaz, no seguridad: `canView`/`requireDM`/`requireMember`/
`requireEditable` (`apps/api/src/common` y cada servicio) siguen siendo la única autoridad,
y rechazan exactamente igual si el código de arriba desaparece.**

Un `feature/` es autónomo: sus llamadas HTTP y sus hooks viven juntos. Las páginas componen
features, no hacen `fetch`.

**No hay CORS por diseño:** en producción nginx sirve la web y hace proxy de `/api` hacia la
API por red interna; en desarrollo Vite hace el mismo proxy. El navegador solo habla con un
origen.

## Decisiones transversales

- **React desde el principio**, no HBS: se descartó un frontend dual para no reescribir al
  llegar al SaaS y al 3D.
- **Minimalismo de infraestructura.** Sin Redis, sin colas, sin S3, sin WebSockets, sin
  servicio de IA hasta que una fase los necesite. Hoy: Postgres + Nest + React y nada más.
- **Eventos de dominio** vía `@nestjs/event-emitter`, en proceso y sin infraestructura. Se
  emiten **nueve** —`campaign.created`, `campaign.updated`, `campaign.deleted`,
  `campaign.member.removed` (`campaigns.service.ts`), `campaign.member_joined`, `entity.created`,
  `comment.added` (`comments.service.ts`), `session.scheduled` (`sessions.service.ts`) y
  **`game_event.recorded`** (`game-events.service.ts`)—, y hay **cinco** `@OnEvent`: los cuatro
  de `notifications` (`member_joined`, `entity.created`, `comment.added`, `session.scheduled`) y
  `rules-engine/game-event-bridge.ts`, que consume `game_event.recorded` — **cómo el log de la
  partida despierta al motor de reglas**. (Hasta el 2026-09-11 este párrafo decía siete y tres:
  el censo a mano caducó dos veces; si vuelve a caducar, se sustituye por una prueba que cuente.) Un puente y no una llamada directa porque el motor
  escribe eventos: llamarle desde el log cerraría un ciclo entre los dos módulos que Nest solo
  tapa con `forwardRef`. Los cuatro de `campaigns.service.ts` siguen sin consumidor
  ([06-pendientes](./06-pendientes.md), **N1**).

  > Y esta línea ha caducado **dos veces**: primero decía que ningún `@OnEvent` los escuchaba, y
  > luego se quedó en seis eventos y dos consumidores el mismo día que llegó el séptimo. El
  > párrafo de abajo ya presumía de haber cazado la primera. Es la clase de mentira que
  > `check:docs` no ve, porque la sintaxis está en regla.

  > Esta línea decía «no existe ningún `@OnEvent` que reaccione a ellos» y **se contradecía con
  > la tabla de módulos de 138 líneas más arriba**, que ya anunciaba que `notifications` los
  > escucha. Lo cazó una auditoría de documentación contra código: es exactamente la clase de
  > mentira semántica que `check:docs` no puede ver, porque la sintaxis está en regla.
- **Sentry** desde la fase 0 (`SENTRY_DSN` opcional; vacío lo desactiva).
- **Visibilidad de primera clase desde la fase 1**, no añadida después: es el rasgo que
  distingue al producto y meterla tarde habría tocado todas las consultas.
