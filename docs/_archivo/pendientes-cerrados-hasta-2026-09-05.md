# Pendientes cerrados — archivados el 2026-09-05

**Congelado. Nada de aquí se edita.** Son las fichas que `docs/06-pendientes.md` arrastraba ya
tachadas la noche del 2026-09-05, cuando los quince planes de
[`superpowers/plans/2026-09-05-planes/`](../superpowers/plans/2026-09-05-planes/00-INDICE.md)
cerraron catorce de ellos de una tanda. Se conservan por si algo se reabre y hace falta saber cómo
se cerró la vez anterior, y porque varias explican **una afirmación que resultó ser falsa** — el
patrón que este proyecto usa como vacuna.

Continúa a
[`pendientes-cerrados-hasta-2026-09-03.md`](./pendientes-cerrados-hasta-2026-09-03.md).

**La regla con la que se seleccionaron, sin criterio de nadie:** todo lo que estuviera tachado
—una fila de tabla o un encabezado— salió. Ninguna ficha abierta se tocó. Los identificadores
**no se reciclan**: el hueco que deja una ficha archivada se queda vacío, o se rompen las citas de
los documentos que ya la nombraban.

**Lo que esta tanda enseñó, y por eso se guarda:** siete de estas fichas afirmaban que faltaba algo
**que ya estaba hecho**, y todas traían su evidencia citada — cierta el día que se escribió. De ahí
sale la regla que gobierna ahora el documento vivo: **lo que se tacha lleva la prueba de cuándo**
—fecha y `fichero:línea`—, no solo la prueba de qué.

---

## La copia de seguridad de la base — el detalle que se retiró del documento vivo

**No es deuda: es una decisión cerrada del autor, sin caducidad** (ver `docs/06-pendientes.md`).
Se conserva aquí solo lo medido en su día, por si algún día la decisión cambia.

El bloque de D&D de `vps1new:/root/scripts/backup-coolify.sh` perdió las **comillas simples**, así
que `$POSTGRES_PASSWORD` y `$POSTGRES_USER` se expandían en el *host* —a vacío— en vez de dentro
del contenedor. `sh -c PGPASSWORD=` ejecuta una asignación, **sale con código 0**, y el `if` lo daba
por bueno. **Medido contra el contenedor real: la forma rota produce 20 bytes (gzip de la nada) y
la correcta 6305.**

```bash
# /root/scripts/backup-coolify.sh, bloque "3c. D&D Platform postgres":
docker exec "$DND" sh -c 'PGPASSWORD=$POSTGRES_PASSWORD pg_dumpall -U $POSTGRES_USER' 2>>"$LOG" | gzip > "$DEST/dnd-pg.sql.gz"
```

Y dos trampas de la misma familia, que siguen siendo ciertas para cualquier volcado manual:
`pg_dumpall -U postgres` **falla** porque el usuario de esta base es `dnd` (`POSTGRES_USER`), y
`docker ps --filter name=dnd` **no encuentra nada** porque los contenedores de Coolify se llaman
por el UUID de la aplicación. Las dos están en `docs/03-despliegue.md`.

---

## ~~C2.5-2 · El crítico de la DAMAGE de `rollAttack`, atado a la tirada A MEDIAS~~ — CERRADA ENTERA (2026-09-05, planes 03 y 15)


> **Las dos condiciones cumplidas, y en el orden que la ficha exigía.**
>
> **(1) La web manda el `eventId` de su propia tirada de ataque** y `critical` **ya no existe en el
> esquema** (`packages/shared/src/inventory.schema.ts`): el panel de ataque
> (`apps/web/src/features/character-sheet/TirarAtaqueBoton.tsx`) perdió la casilla «Crítico» que el
> jugador marcaba a mano, y en su sitio **dice lo que pasó** —«Fue un 20 natural», «No fue un 20
> natural», o «tira primero el ataque»—. `esCriticoDesdeLaTirada` devuelve **false** sin tirada
> citada (`apps/api/src/characters/character-sheet.service.ts:1465`), así que no queda ninguna
> puerta por la que declarar un crítico. Es la misma regla que `resolveAttackSchema` aplicaba desde
> R2C-2: *«eso lo decide la tirada, no quien la pide»*.
>
> **(2) Una tirada ya cobrada no se puede volver a cobrar**, y lo impide el índice único de
> `GameEvent.attackRollEventId` (plan 03, D-OP-15). El navegador lo comprueba de punta a punta en
> `apps/web/e2e/inventario.spec.ts`: el segundo intento es un 409 y la pantalla lo dice en línea.
>
> **El orden importaba y se respetó**: primero la web mandó el campo (`ede50af`), después se quitó
> `critical`. Al revés habría una ventana en la que el crítico no funciona. Texto original abajo.



**2.5.4 añadió el camino correcto, sin cerrar del todo el hueco.** `rollAttackSchema` gana
`attackRollEventId` opcional (solo-añadido, `@dnd/shared`): con él, la DAMAGE de un ataque
duplica dados **si y solo si** ese `eventId` tiene `natural: "TWENTY"` en el registro, leído y
comprobado contra la base (`CharacterSheetService.esCriticoDesdeLaTirada`) — exactamente el
criterio de cierre de abajo.

**Por qué sigue abierta.** Sin `attackRollEventId`, `critical` del cuerpo de la petición **sigue
mandando**, igual que antes de esta tarea. Quitarlo de raíz habría sido un cambio de
comportamiento silencioso para el carril que está rehaciendo `apps/web`
(`TirarAtaqueBoton.tsx`, que hoy llama sin el campo nuevo): la frontera de 2.5.4 no incluía
`apps/web`, y decidir por ese carril sin poder tocarlo ni probarlo habría sido peor que dejar el
hueco escrito.

**Y hay una segunda mitad que la revisión de cierre destapó: el `eventId` se puede REUTILIZAR.**
Nada marca una tirada de ataque como ya cobrada, así que un mismo 20 natural sirve para duplicar
los dados de tantas tiradas de daño como se pidan. La verificación se estrechó —tiene que ser un
`ABILITY_ROLL` del mismo personaje, en esta campaña, **y con el rótulo de ESTE ataque**, que antes
no se miraba: un 20 en una prueba de Sigilo valía como crítico de la espada— pero «una vez» no se
puede comprobar sin marcar el suceso, y eso es una columna nueva.

**Cierra cuando:** (1) `TirarAtaqueBoton.tsx` (o quien lo reemplace en el reseño de la mesa) mande
`attackRollEventId` con el `roll.eventId` de su propia tirada de ATAQUE, y el `critical` suelto
se pueda borrar de `rollAttackSchema` sin romper nada; y (2) una tirada de ataque ya cobrada no se
pueda volver a cobrar. Hasta las dos, no es «si y solo si».

> **La condición (2) está CERRADA (2026-09-05, plan 03 · D-OP-15).** `GameEvent.attackRollEventId`
> es una columna **con índice único** (`apps/api/prisma/schema.prisma:471-486`, migración
> `apps/api/prisma/migrations/20260905050000_damage_charged_once/`), la escribe `RollsService.roll`
> por un parámetro **interno** —no está en `createRollSchema`, porque un cliente que pudiera
> mandarlo podría quemar el identificador de la tirada de otro— y el segundo cobro lo rechaza **la
> base**: `CharacterSheetService.rollAttack` traduce el `P2002` a un 409 legible. Probado por
> mutación: al borrar el índice, el e2e recibe **201** donde esperaba 409.
>
> **Queda la condición (1)**, que es web y vive en el **plan 15**. Y el orden importa: primero la
> web manda el campo, después se quita `critical` — al revés hay una ventana en la que el crítico
> no funciona.


| ~~**C6-1**~~ **CERRADA (2026-09-05)** — dos de los cuatro existen ahora como suceso y su gesto los escribe (`ENTITY_COMMENTED` en `comments.service.ts`, `MEMBER_JOINED` en `invites.service.ts`), con su `case` en `game-event-triggers.ts`. Los otros dos siguen retirados **con su motivo escrito**: `DM_EXECUTED` no tiene gesto en ninguna pantalla y `ENTITY_ATTACKED` apunta a una ficha del mundo cuando aquí se ataca a un `Character`. **Y la lista duplicada ya no lo está**: vive en `packages/shared/src/rules-engine.schema.ts`. Texto original: | ~~**Los cuatro disparadores del motor siguen sin `case`**: `ENTITY_COMMENTED`, `DM_EXECUTED`, `ENTITY_ATTACKED`, `MEMBER_JOINED` (`apps/api/src/rules-engine/game-event-triggers.ts:29-75`) | Se han **retirado de lo que el editor ofrece** (`DISPARADORES_SIN_MOTOR`, en `features/rules/vocabulario.ts`) porque una regla armada sobre ellos se guarda y no se dispara jamás, y la interfaz no puede prometer lo que el motor no cumple. Implementarlos es servidor. **Cierra cuando** el `switch` los traduzca: entonces esa lista se vacía y la paleta los recupera sola. Y **es una segunda copia** de `UNREACHABLE_TRIGGER_KINDS` (`apps/api/src/rules-engine/trace-payload.ts:109`) **por una frontera de trabajo, no por una imposibilidad**: son cuatro literales de `RuleTrigger["kind"]` y caben en `packages/shared/src`, que es donde este proyecto guarda la forma de los datos una sola vez; el carril que las escribió no tocaba ese paquete. **La mudanza a `@dnd/shared` es el cierre de esta ficha**, y hasta entonces las dos no pueden divergir en silencio sobre una regla guardada, porque el aviso de `ListaDeReglas` lo manda el servidor |
| ~~**C6-2**~~ **CERRADA (2026-09-05, plan 15).** `aStatblock()` devuelve `visibility` (`apps/api/src/statblocks/statblocks.service.ts:185-196`) y el editor **deja de omitir el campo** al guardar: ahora manda el valor real, que llega en la lectura. **No filtra nada nuevo** —solo llegan las que `puedeVer` ya dejó pasar, y saber el nivel de algo que ya ves no revela nada—. Probado por mutación: devolviendo `DM_ONLY` fijo, dos e2e se ponen rojos. **Y la decisión hermana ya estaba tomada y medida**: `OWNER_DM` y `SPECIFIC_PLAYERS` **no se ofrecen** en el selector (`NIVELES_DE_CRIATURA`), porque un statblock no tiene concesiones y su creador es siempre el DM — los dos colapsan en `DM_ONLY`, y ofrecerlos prometería una frontera que nada aplica. Texto original: | ~~El editor de criaturas propias **no puede enseñar quién la ve al editarla**, porque no lo sabe, así que **omite el campo** en el `PUT`~~ |
| ~~**C6-3**~~ **CERRADA (2026-09-05, plan 07).** `apps/web/src/dominio/dano.ts` expone **las dos formas** —`nombreTipoDano` y `nombreTipoDanoCorto`— y las cuatro pantallas importan de ahí. **Comparadas entrada por entrada antes de borrar nada**: `character-sheet` y `campaign-items` eran **idénticas** en las trece; `inventory` difiere en **cuatro** (`contund.`, `perf.`, `cort.`, `rayo`). **Las dos tablas son completas y ninguna deriva de la otra**: con un valor por defecto, un tipo de daño nuevo daría una corta silenciosamente larga. Probado por mutación: al «unificar» las dos formas, dos pruebas se ponen rojas. Texto original: | ~~La decisión D-OP-14 no se aplicó a ciegas: el corto existe para que la fila de inventario quepa, y unificar sin más rompería ese ancho~~ |
| ~~**C6-5**~~ **CERRADA, comprobada el 2026-09-05**: `apps/web/src/features/sessions/elenco/PonerDano.tsx:125` manda `...(tipoDeDano ? { damageType: tipoDeDano } : {})`. Texto original: | ~~**Solo una de las dos pantallas que cambian PG manda el tipo de daño.** La hoja sí; el ±5 del elenco (`apps/web/src/features/sessions/elenco/FichaDeElenco.tsx`) sigue mandando `{ delta }` | Y **es la ruta que un DM usa en combate** —el gesto rápido sobre el retrato, no abrir la hoja entera—, así que la mecánica insignia de 2.5.1 sigue sin poder ocurrir en mitad de una partida. No es un olvido: ese fichero es de otro carril. La pieza que falta **ya está escrita y exportada**, `SelectorDeTipoDeDano` (`apps/web/src/features/character-sheet/AplicarDano.tsx`), autónoma y sin consultas dentro. **Cierra cuando** el cajón del elenco la monte en su ranura `ranuraTipoDeDano` y pase su valor a `tipoDeDano` |
| ~~**C6-4**~~ | **CERRADA (2026-09-05)**, plan 14. El gesto existe: `apps/web/src/features/bestiario/DarTemporales.tsx`, en la fila del PNJ que está en la mesa. **No suma** —SRD 5.1: *«they can't be added together»*— y **pregunta cuál se queda** con los dos números delante, porque la regla sigue: *«you decide whether to keep the ones you have or to gain the new ones»*. Para poder cumplirla hizo falta que la decisión viajara: `setHpSchema.tempHpEleccion`, ya que el servidor se quedaba con el mayor **por su cuenta** y eso quita la elección que el SRD da. Se siguen pintando aparte y nunca sumados. |
## ~~P1 · Nadie escribe `ENTITY_REVEALED` cuando el DM revela una ficha~~ — CERRADA (2026-09-04, C6)


**Estaba arreglada y la ficha seguía diciendo que no.** Lo destapó el carril C6 al construir el
botón «Revelar»: el texto de abajo afirmaba, con un barrido citado, que *«fuera del motor de reglas
no hay un solo `type: "ENTITY_REVEALED"` en `apps/api/src`»*, y eso **ya era falso**.
`EntitiesService.update` (`apps/api/src/entities/entities.service.ts:184-243`) compara el conjunto
de quién veía la ficha antes con el de quién la ve después y, **si creció**, escribe el suceso con
su `entityName` — que es exactamente el arreglo que esta ficha pedía. La visibilidad del suceso
hereda la de la entidad, con la salvedad de `SPECIFIC_PLAYERS`, que tiene su propia ficha más
abajo.

Así que la cabecera de escena **ya se enciende sola**, y lo que faltaba no era el suceso: era el
gesto. Hasta el 2026-09-04 la única forma de revelar era cambiar un desplegable dentro del
formulario de edición. Ahora hay un botón que dice «Revelar a la mesa»
(`apps/web/src/features/entities/BotonRevelar.tsx`), y con él se ve el `ENTITY_REVEALED` de verdad
en el registro.

**Se deja escrita en vez de borrada** porque el error que enseña no es el de reglas: una ficha de
deuda con un barrido citado dentro **envejece igual que el código**, y esta llevaba al menos una
tanda mintiendo con pruebas aparentes.


## ~~P3 · «Dónde se quedó» no viaja en el listado de campañas~~ — CERRADA (2026-09-05, plan 03 · D-OP-17)


> **Cerrada con una consulta, que es lo que el plan 02 hizo posible.** `listForUser`
> (`apps/api/src/campaigns/campaigns.service.ts:41-110`) trae la última sesión `CLOSED` de cada
> campaña con `take: 1` —una consulta, no N— y filtra su crónica por **`recapVisibility`**, que es
> columna desde el plan 02. La pantalla la pinta
> (`apps/web/src/features/campaigns/Cronicas.tsx:160-175`) y cae en la descripción cuando no viaja.
>
> **La última cerrada, y si esa no se ve el campo NO viaja: no se busca una anterior.** Enseñar una
> crónica más vieja bajo el rótulo «dónde se quedó» diría que la partida se quedó donde no se quedó.
> Y **«no hay» y «hay y no la ves» se pintan igual** a propósito: distinguirlas contaría que existe
> algo escondido.
>
> Probado con los tres casos, **incluido el que se olvida** —una campaña sin ninguna sesión
> cerrada—, y por mutación: sin `canView`, la crónica `DM_ONLY` se le cuela al jugador y el e2e se
> pone rojo. Texto original abajo.



La pantalla de crónicas quiere decir, por cada campaña, **la crónica de su última sesión cerrada**
— es lo que la convierte en «partidas guardadas» y no en una lista de proyectos.

`campaigns.service.ts#listForUser` devuelve el papel del espectador y el número de miembros, y nada
más. Pedirla por campaña serían **N peticiones en la pantalla de entrada**, que es exactamente
donde no se pueden pagar.

**El arreglo es del carril del motor y es pequeño**: incluir en el listado el `recap` de la última
sesión `CLOSED` de cada campaña, **filtrado por su visibilidad** —una crónica puede ser `DM_ONLY` y
entonces el jugador no la ve—. Mientras tanto la pantalla enseña la descripción de la campaña y
dice qué se leerá ahí cuando exista, en vez de inventarse un resumen.

> **DESBLOQUEADA el 2026-09-05 (plan 02).** Ya no hace falta leer un Json ni filtrar en memoria:
> `Session.recap` y `Session.recapVisibility` son **columnas**
> (`apps/api/prisma/schema.prisma:288-303`, migración
> `apps/api/prisma/migrations/20260905030000_session_recap_column/`), así que esto es una consulta.
> **La ficha sigue abierta**: lo que falta es el `campaigns.service.ts#listForUser`, y lo cierra el
> **plan 03**.


## ~~P2 · El ataque es un oráculo sobre la CA, y se acepta con esas palabras~~ — CERRADA A MEDIAS (2026-09-05, plan 03 · D-OP-11)


> **Lo que se cierra: apuntar a lo que no ves ni tienes delante.** El objetivo tiene que pasar
> `canView` para quien ataca **o** ser combatiente de un encuentro **activo** de esta campaña
> (`CharacterSheetService.sePuedeApuntar`, `apps/api/src/characters/character-sheet.service.ts:246-280`).
> Si no, **404 idéntico byte a byte** al de un identificador que nadie ha creado nunca — comparado
> con `JSON.stringify` en `apps/api/test/ataque-comparado-en-el-servidor.e2e-spec.ts`. Un 403 habría
> confirmado que el personaje existe.
>
> **Y el criterio de cierre del spec de 2.5.3 sigue vivo entero:** un jugador ataca a un PNJ
> `DM_ONLY` y recibe su veredicto. Lo que hace falta ahora es que el PNJ esté **en la mesa**, que es
> exactamente cuando alguien puede apuntarle en la ficción. El comentario del servicio que decía
> «por qué no exige `canView`» está reescrito, no dejado mintiendo.
>
> **Lo que NO se cierra, y se sigue aceptando con las mismas palabras:** contra un objetivo que sí
> puedes ver, atacarlo repetidamente sigue dando su CA. Es lo que pasa en una mesa, y el SRD lo
> respalda. Texto original abajo.



**El §4 del alcance de la fase 2.5 dice «la CA de un PNJ no sale del servidor», y no sale: no
está en la respuesta, ni en el `payload` de ningún suceso, ni en la traza, ni en un 400.** La
revisión de cierre lo siguió campo a campo y el frente está limpio.

**Lo que sí se puede es deducirla.** Viajan el total de la tirada y el veredicto, así que cada
ataque es una comparación exacta `total >= CA` con el total conocido: con veinte o treinta
peticiones se tiene el número. El atacante conoce su propio bono, así que ni siquiera necesita
suerte.

**Y esto se acepta, con dos matices que lo hacen soportable y que antes no existían:**

1. **Queda rastro.** Desde la revisión, cada ataque escribe un `ATTACK_RESOLVED` con el objetivo y
   el veredicto, a la visibilidad del objetivo. El DM ve quién tiró contra qué; sondear ya no es
   invisible.
2. **El comentario que lo justificaba era falso y se corrigió.** Decía que acotar la CA «pasa
   igual en una mesa de verdad, cuando el DM dice "no, no le das" en voz alta». Eso es cierto para
   un objetivo que está en la mesa y **falso justo para el caso que D-2.5-5 habilita**: sobre un
   PNJ que el jugador no sabe que existe, en una mesa de verdad no hay tirada que hacer.

**El arreglo bueno, para cuando exista la pantalla del encuentro:** exigir que el objetivo sea
combatiente del encuentro activo de la sesión —que es lo que «está en la mesa» significa en este
dominio, y 2.5.2 ya lo modela— o pase `canView`. No se hace ahora porque obligaría a abrir un
encuentro para atacar, y la mesa no siempre lo hace.

**Y una ampliación de C2C-9**, que la revisión midió mejor de lo que estaba escrito: del agotamiento
se implementaban **los niveles 2, 4 y 5**. Faltaban el 1 y el 3 (desventaja, que necesita que el
motor componga ventaja por su cuenta —hoy la elige quien tira—) y **el 6, la muerte**, que no hacía
nada: la condición se guardaba y el personaje seguía vivo con la mitad de PG.

> **Cerrado en el servidor el 2026-09-04** (tarea 2.5.5): los seis niveles calculan. El 1 y el 3
> salen como **sugerencia** —el motor no impone el modo, lo propone con su porqué— y el 6 mata
> derivando `deathSaves.status`. Lo que sigue abierto es la pantalla, y por eso la ficha C2C-9 de
> arriba no está tachada.


## ~~P2 · Un `GameEvent` no tiene concesiones nominales, así que `SPECIFIC_PLAYERS` no llega a nadie~~ — CERRADA (2026-09-05, plan 03 · D-OP-12)


> **Cerrada con la columna, no con la tabla hermana.** `GameEvent.grantedUserIds` es un `String[]`
> (`apps/api/prisma/schema.prisma:456-470`, migración
> `apps/api/prisma/migrations/20260905040000_game_event_granted_users/`), y `canSee` se la pasa a
> `canView` en vez del array vacío (`apps/api/src/game-events/game-events.service.ts:181`). Se
> eligió columna y no tabla de unión por tres motivos medidos: el filtrado **ya ocurre en memoria**
> tras el `findMany`, así que una tabla obligaría a un `include` para nada; el esquema ya usa
> `String[]`; y lo que se pierde —integridad referencial— es inofensivo, porque `canView` solo
> pregunta si el espectador está en la lista.
>
> **Y el parche de `EntitiesService` está retirado**, con su comentario reescrito en vez de dejado
> mintiendo (`apps/api/src/entities/entities.service.ts:220-241`). Probado por mutación: al volver a
> `grantedUserIds: []`, el e2e del jugador nombrado se pone rojo.
>
> Texto original abajo.



**Encontrado por la revisión de cierre de `ENTITY_REVEALED`.** `GameEventsService.canSee` evalúa
`canView` con `grantedUserIds: []` fijo — un suceso no tiene concesiones propias en el modelo—, así
que **una fila marcada `SPECIFIC_PLAYERS` no la ve nadie salvo el DM**, ni siquiera el jugador al
que se acaba de conceder la ficha.

Mientras eso sea así, `EntitiesService.update` guarda ese caso como `DM_ONLY`, que es lo que de
verdad ocurre. **Es una etiqueta honesta, no un arreglo**: la revelación dirigida a un jugador
sigue sin llegarle, y su cabecera de escena no se enciende en ese caso.

**El arreglo de verdad** es que `GameEvent` tenga sus propias concesiones —una tabla hermana de
`EntityVisibilityGrant`— o que `canSee` sepa resolver las de la entidad a la que apunta. Lo
segundo es más barato y más frágil: ata el filtro de sucesos al modelo de entidades.

No bloquea nada hoy: el caso normal de la mesa es revelar a `PLAYERS`, y ese funciona.


## ~~P3 · El suceso de archivar puede no llegar a su dueño~~ — CERRADA (2026-09-05, plan 03 · D-OP-12)


> **Y el arreglo no fue el que la ficha suponía.** No hacía falta que «el modelo de sucesos sepa de
> dueños ajenos»: hacía falta **traducir el nivel del personaje al par (visibilidad, nombrados) que
> produce su misma audiencia**. `OWNER_DM` sobre una cosa significa «su dueño y el DM», y nombrar al
> dueño en `SPECIFIC_PLAYERS` da **exactamente ese conjunto**, porque el DM lo ve todo siempre.
>
> La traducción vive en `audienciaDeSuceso` (`apps/api/src/common/visibility.ts:104-135`), **junto a
> `canView`**, porque es un trozo de la misma matriz y la regla que no se negocia dice que nadie la
> reimplementa por su cuenta. La usan el archivar (`characters.service.ts:157-178`) y el revelar
> (`entities.service.ts:232-241`). Probado por mutación: al copiar la visibilidad tal cual, el e2e
> del dueño se pone rojo.
>
> Texto original abajo.



`CHARACTER_ARCHIVED` hereda la visibilidad del personaje, pero `game-events.service.ts` resuelve
`OWNER_DM` contra el **actor** del suceso, no contra el dueño del personaje. Si el DM archiva un
personaje `OWNER_DM` de un jugador, **el jugador no ve que le archivaron el suyo**.

Va de menos a menos —no es una fuga— pero contradice «cada uno deja su rastro en la línea de
tiempo». Misma familia que la P2 de arriba: el modelo de sucesos no sabe de dueños ajenos.


| ~~**I5**~~ **CERRADA (2026-09-05)**: `ITEM_MOVED` lleva `from`/`to` con `EQUIPPED`/`CARRIED`/`STORED`, más `slot` y `attuned` (`game-event.schema.ts:350`), y lo escribe `inventory.service.ts:413`. Texto original: | ~~**Equipar y desequipar no dejan rastro en la línea de tiempo**~~ | El dinero sí (`MONEY_CHANGED`, tipo propio desde 2B). Ponerse un objeto que sube la CA en mitad de una sesión es exactamente el tipo de cambio que el DM querría ver en el log al repasar. Es un tipo de suceso nuevo y una llamada; barato, y no entró por alcance |
| ~~**L3**~~ **CERRADA (2026-09-05, plan 03 · D-OP-13).** `blinded` calcula sus **dos** mitades: la desventaja de quien la tiene desde 2.5.5 (`apps/api/src/character-state/roll-mode/suggested-roll-mode.ts:81`) y **la ventaja de quien le ataca** desde hoy (`apps/api/src/character-state/roll-mode/modo-contra-objetivo.ts`), aplicada en el camino del ataque. Texto original: | ~~**`blinded` no calcula nada.** Se guarda y se enseña, como los rasgos raciales sin efecto numérico~~ | ~~**2C**, con el resto de la automatización de condiciones~~ |
| ~~**U1**~~ | **CERRADA (2026-09-05)**, plan 14. `apps/web/src/pages/SessionDetailPage.tsx`, en `/campaigns/:id/sesiones/:sessionId`, enlazada desde la lista de sesiones sin sustituir la fila —quien la abre para corregir la fecha sigue queriendo el formulario—. **La crónica se filtra en el servidor** (`conCronica`, que borra las dos columnas y no solo el texto) y la página no reimplementa nada; su nivel se enseña **aparte** del de la sesión, porque pueden no coincidir. Medido con dos navegadores en `apps/web/e2e/leer-una-sesion.spec.ts`. |
| ~~**U2**~~ | **CERRADA (2026-09-05) por REMEDICIÓN**, plan 14. `apps/web/e2e/navegar-en-estrecho.spec.ts:35` mide a **375 px**: hay **7 destinos alcanzables sin escribir una URL** —Resumen · El mundo · Sesiones · Reglas · Dados · Tablas · Ajustes—, **todos visibles, dentro de la ventana y con tamaño**, y pulsar uno cambia de pantalla. **El problema que describía la ficha ya no existe**: lo arregló el reseño, que sustituyó la columna de secciones por esta navegación. Texto original: ~~la columna de secciones desaparece por debajo de 768 px y nada la sustituye~~ |
| ~~**U3**~~ | **CERRADA (2026-09-05)**, plan 14. `GET /campaigns/:id/entities?q=` busca **en el nombre y en el cuerpo**, y lo hace el servidor (`apps/api/src/entities/entities.service.ts`). **El orden de los dos filtros es la seguridad**: primero `canView`, después el texto — al revés, una palabra que solo aparece en una ficha `DM_ONLY` la delataría, que es el mismo defecto que el plan 03 cerró en el ataque. El e2e comprueba **que NO encuentra** (`apps/api/test/buscar-en-el-cuerpo.e2e-spec.ts`), y con el `canView` quitado se pone rojo. `features/entities/filter.ts` deja de comparar el nombre: dos filtros para lo mismo, con el del navegador ignorando el cuerpo, habrían discrepado y habría ganado el que menos sabe. Texto original: Buscar dentro del texto exige hacerlo **en el servidor**: el filtro de pantalla opera sobre lo que `canView` ya dejó pasar, y ampliarlo sería confundir *esconder* con *no mandar*. Ver [04-convenciones](./04-convenciones.md) |
| ~~**U8**~~ | ~~**Cerrar un diálogo con cambios sin guardar no avisa**~~ | **CERRADA (2026-09-05)**, plan 14. `apps/web/src/ui/Dialog.tsx` acepta `hayCambiosSinGuardar` y **las tres salidas pasan por la misma puerta** —`Escape`, el velo y el aspa—: si una sola se la saltara, bastaría con rozarla para perder lo escrito, y sería justo la que nadie prueba. El aviso **nombra lo que se pierde** y nunca dice «seguro». Lo monta `features/entities/EntityEditor.tsx`, comparando **valores** contra lo guardado y no una bandera de «he tecleado»: la plantilla de una ficha nueva **no cuenta como cambio**, así que cerrar una ficha intacta no pregunta nada. Texto original: ~~`Escape`, el clic fuera y «Cancelar» descartan lo escrito sin preguntar~~ |
| ~~**U9**~~ | ~~**`Guardar` deshabilitado en vez de `aria-disabled`**~~ | **CERRADA (2026-09-05)**, plan 14. `apps/web/src/ui/Button.tsx` pone `aria-disabled` y **no** `disabled`, así que el botón **sigue en el recorrido de teclado** y su motivo se puede leer; como `aria-disabled` no impide pulsar, el `onClick` se ignora ahí mismo, en un solo sitio. Los dos botones crudos que también apagaban con motivo —«Quitar» de `features/links/LinksPanel.tsx` y «Borrar» de `features/comments/CommentThread.tsx`— van igual. **Los campos de formulario conservan `disabled` de verdad**, y es deliberado: un `<input>` apagado no tiene motivo que leer al tabular, y `aria-disabled` no impediría escribir en él. Texto original: ~~un botón `disabled` sale del recorrido de teclado…~~ |
| ~~**U7**~~ | **CERRADA (2026-09-05)**, plan 14. Interruptor en la cuenta (`apps/web/src/features/auth/AjusteDeOrnamento.tsx`), **dos radios con su frase** y no una casilla, guardado en este navegador como el tema y **estampado en `<html>` antes del primer pintado** (`apps/web/src/ui/ornamento.ts`) para que no parpadee justo a quien pidió no verlo. La cuadrícula y el horizonte **dejan de pintarse**, no se esconden: un adorno que sigue en el DOM sigue costando. Medido en `apps/web/e2e/ornamento.spec.ts`, **incluido que sobrevive a recargar**. Queda listo para D-OP-24, que necesitará este mismo interruptor. |
| ~~**H1**~~ **CERRADA por 2B**, verificado el 2026-09-03 contra `apps/api/prisma/schema.prisma` (`EquipSlot` y `requiresAttunement` existen) | ~~Ranuras de equipo, y el estado de un objeto como tres (llevado / equipado / sintonizado, con tope de 3), no como un booleano~~ | Toca la fórmula de CA, que **no es una suma**: la armadura sustituye la fórmula y limita la Destreza |
| ~~**H2**~~ **CERRADA por 2A/2C**, verificado contra `apps/api/src/character-state/rest/` (módulo completo, con dados de golpe y las reglas de tiempo de 2C) | ~~El descanso está a medias: hay gatillo, pero nada restaura los PG y los dados de golpe no existen~~ | Es el bucle más frecuente de una sesión; sin él la mesa corrige PG a mano y deja de fiarse de la pantalla |
| ~~**H3**~~ **CERRADA por 2A**, verificado contra `character-sheet.service.ts` (`tempHp` en diez sitios; se gastan primero y no se suman a los actuales) | ~~PG temporales: el daño los atraviesa tal como está escrito~~ | Error silencioso dentro de un registro que se declara inmutable |
| ~~**H4**~~ **CERRADA por 2A**, verificado contra `packages/shared/src/rules/trace.schema.ts` (los cuatro estados existen, y un comentario explica que un booleano no puede representar la pericia) | ~~Pericia (competencia doble): el modificador solo conoce competencia como booleano~~ | La hoja del pícaro dirá +5 donde la regla dice +7 |
| ~~**D3**~~ | ~~**La API no tiene endpoint de salud**~~ **CERRADA (2026-09-05, plan 15).** `GET /health` existe (`apps/api/src/health/health.controller.ts`), hace un `SELECT 1` y devuelve **503** si la base no contesta; sin autenticación y **sin contar nada** —ni versión, ni conteos, ni el nombre de la base—, porque quien sondea desde fuera no es el orquestador. El `healthcheck` de `docker-compose.prod.yml:79-92` apunta ahí **y mira el código de estado**, no solo que la petición no explote. Probado con la base caída, que es lo único que distingue un endpoint de salud de una constante. **Ojo al desplegar:** cambiar el compose recompila la imagen en Coolify. Texto original: | ~~No hay `@Controller("health")` ni controlador raíz: `GET /` responde 404. La comprobación del compose acepta ese 404 como señal de vida, así que **detecta un proceso caído pero no una base de datos caída**~~ |
| ~~E4~~ | ~~**Las etiquetas duplicadas se siguen persistiendo**~~ **CERRADA (2026-09-05, plan 15)**: el esquema compartido las normaliza al guardar (`packages/shared/src/entity.schema.ts:14-32`), conservando el orden de la primera aparición. La fila ya no necesita dedupar al pintar, aunque sigue haciéndolo y no estorba | — | ~~no impone unicidad y `parseTags` tampoco~~ |
## ~~P1 · Las resistencias al daño no se cobran desde la mesa~~ — CERRADA (2026-09-05, ficha C6-5)


> **Comprobado contra el código, no recordado:** `apps/web/src/features/sessions/elenco/PonerDano.tsx:125`
> manda `damageType`. **El dragón resistente al fuego ya reduce el daño desde la mesa.** Se deja el
> texto porque explica el escenario que la cerró.

`changeHp` acepta `damageType` desde 2.5.1 y la **hoja** ya lo manda. Pero
`features/sessions/elenco/FichaDeElenco.tsx` sigue mandando `{ delta }` a secas, y **ese ±5 es la
ruta que un DM usa en combate** — abrir la hoja de otro es el gesto largo. Así que el escenario
insignia de 2.5.1, el dragón resistente al fuego, **todavía no ocurre jugando**.

Cierra enchufando `SelectorDeTipoDeDano` —que exporta `AplicarDano`, en
`apps/web/src/features/character-sheet/`, autónomo y sin consultas dentro— en la ranura
`ranuraTipoDeDano` de `apps/web/src/features/sessions/elenco/PonerDano.tsx`, y su valor en
`tipoDeDano`. **Las dos props ya existen en `main`; el selector llega con `carril/c6`.**


## ~~I16 · Cambiar el tipo de una ficha la reclasifica sin preguntar y sin dejar rastro~~ — CERRADA (2026-09-05, plan 07)


> **Y la ficha señalaba el sitio equivocado, lo cual importa.** Decía «en el editor»: `EntityEditor`
> recibe `type` como **prop** y no lo cambia nunca —sus dos consumidores le pasan `entity.type` al
> editar—, así que ahí el gesto **no existe**. El único sitio de la aplicación donde se reclasifica
> una ficha ya escrita son **los chips de tipo del taller del DM**
> (`apps/web/src/features/sessions/taller/EscribirFicha.tsx:243-247`). Medido antes de tocar nada;
> la confirmación llegó a escribirse en el editor y hubo que moverla.
>
> **Las dos piezas, que son norma general del proyecto:**
> - **La confirmación dice la consecuencia, no el riesgo**: nombra los dos tipos con su rótulo real,
>   **de dónde sale y dónde aparece**, que quien la busque donde estaba no la encontrará, **lo que
>   NO se pierde** —cuerpo, etiquetas, enlaces y comentarios— y, solo si era un PNJ, que su
>   statblock deja de tener sentido. **Ni una vez «¿estás seguro?»**, y hay una prueba que lo
>   comprueba.
> - **El cambio deja rastro**: `ENTITY_RETYPED` (`apps/api/src/entities/entities.service.ts:184-215`,
>   migración `apps/api/prisma/migrations/20260906010000_entity_retyped_event/`), con **los dos
>   tipos** —«ahora es un Documento» no dice qué se perdió— y heredando la audiencia de la ficha.
>
> **Solo pregunta al editar una que ya existe.** Escribiendo una nueva, el chip elige de qué tipo va
> a ser y no reclasifica nada: una confirmación que salta cuando no hace falta se aprende a ignorar
> en dos días, y entonces tampoco protege el caso que importa.
>
> Probado por mutación en las dos mitades: sin el diálogo, cuatro pruebas de pantalla se ponen
> rojas; sin el suceso, el e2e del rastro.


## ~~P2 · Setenta y seis iconos dibujados en ocho ficheros, con conceptos duplicados~~ — CERRADA (2026-09-05, plan 07)


> **Cerrada con una prueba, no con una limpieza.** Limpiar hoy solo compraba tiempo: el siguiente
> que necesitara un escudo y no encontrara el de `ui` dibujaría otro. Lo que la cierra es
> `apps/web/src/ui/__tests__/iconos-sin-duplicados.test.ts`, que barre **todos** los ficheros de
> iconos de `features/` y se pone roja si uno redefine un nombre que `ui/Iconos.tsx` ya exporta.
> **La prueba encontró tres que la lectura a ojo se había dejado** —`campaign-items/IconoEscudo`,
> `campaigns/IconoMas` e `inventory/IconoMochila`—, que es exactamente su trabajo.
>
> **Lo consolidado:** el escudo de `bestiario`, y el sol, la luna, la mochila y la lupa de
> `sessions`, que ahora vienen de `ui/Iconos.tsx`. **El tamaño se conservó a mano** donde el
> consumidor se apoyaba en el `h-5 w-5` por defecto de `sessions`, porque `ui/Marco` mide en `1em`
> — es la trampa que esta misma ficha avisaba.
>
> **Y lo que NO se fusionó, con su motivo:**
> - `inventory`, `rules` y `level-up` dibujan en **rejilla de 16**, no de 24. Moverlos sería
>   **redibujar**, no consolidar, y el plan separa esas dos cosas a propósito.
> - `IconoObjeto` vive en tres módulos y son **tres dibujos para tres significados** —un cofre, el
>   glifo del tipo `ITEM` y una caja pequeña—; `IconoLugar`, dos. Un icono que solo usa su módulo
>   **se queda en su módulo**: `ui/` no es un cajón, y subirlo todo es tan malo como duplicarlo.
> - El escudo del catálogo de objetos **conserva su dibujo** —lleva marca de verificación y el
>   lienzo de sus hermanos— y **deja de exportarse**: nadie lo importaba, su puerta pública es
>   `IconoDeObjeto({ kind })`, y meter el de `ui` mezclaría dos grosores en la misma fila.
> - `inventory/IconoMochila` pasó a llamarse **`IconoLlevado`**, que es como se llaman sus dos
>   hermanas (`IconoEquipado`, `IconoGuardado`): se nombraba por su dibujo y era la rara.
>
> Probado por mutación: una cuarta copia del escudo en `apps/web/src/features/sessions/iconos.tsx` pone la prueba roja al
> instante. Y los iconos movidos se miraron **en el navegador** —los recorridos de `armazon`,
> `sesion` e `inventario`—, porque `jsdom` no maqueta. Texto original abajo.



La auditoría contaba «4 iconos» porque solo miró `ui/Iconos.tsx`. **La aplicación tiene ~76
repartidos en 7 ficheros de `features/`.** Al traer los 23 de la maqueta a `ui/`, ahora hay **dos
escudos, dos mochilas, dos soles, dos lunas y tres lupas**, más los provisionales de cada carril
(`hilo/`, `elenco/`, `dm/`, `taller/`), tres de ellos **idénticos carácter a carácter**.

Ningún carril podía consolidarlo: todos tenían `features/**` prohibido. Todos los ficheros
provisionales lo declaran en su cabecera. **Al deduplicar, ojo con el tamaño**: los de `ui/` usan
`1em` con `align-[-0.125em]`; algunos de carril usan `h-4 w-4`.


## ~~P2 · Tres pantallas revelan la misma ficha, cada una con su copia del predicado~~ — CERRADA (la cerró la Ola 2; comprobada el 2026-09-05, plan 06)


El `RevelarAlgo` de `apps/web/src/features/sessions/dm/` (en `main`), el botón por fila de
`PrepararSesion` en `apps/web/src/features/sessions/taller/` (`carril/c4`) y el `BotonRevelar` de
`apps/web/src/features/entities/` (`carril/c6`). Los tres acaban en el mismo
`PATCH { visibility: "PLAYERS" }`
y los tres reimplementan el mismo predicado de «se puede revelar», que es **matiz de visibilidad**
— justo lo que `CLAUDE.md` obliga a escribir una sola vez. **Debe mandar el de
`apps/web/src/features/entities/`** (dueño del dominio, ya exportado); los otros dos conservan su
cajón y le pasan los props.

**Ya manda, y hay exactamente un predicado.** Medido el 2026-09-05 con
`grep -rn "sePuedeRevelar|BotonRevelar" apps/web/src`:
`features/entities/BotonRevelar.tsx:54` es la única definición de `sePuedeRevelar`, y **la importan
dos consumidores**: `features/sessions/dm/RevelarAlgo.tsx:4` y
`features/sessions/taller/PrepararSesion.tsx:8`. El tercero, `pages/EntityDetailPage.tsx:6`, importa
**solo `BotonRevelar`** y nombra el predicado en un comentario (`:135`), no lo llama. Cero copias del
predicado y cero mutaciones sueltas.

> **La cita se corrigió al fusionar** (2026-09-05): decía «sus **tres** consumidores la importan», y
> el tercero no la importa. La **conclusión** —una definición, cero copias— era y sigue siendo
> cierta; la evidencia citada no lo era. Es exactamente el género de mentira que `check:docs` no
> caza, porque la frase está impecable. **La ficha se tacha sin tocar una línea de código**: la Ola 2
la había cerrado y el maestro no se había enterado — el plan 06 avisaba de ello para que nadie
duplicara el trabajo, y así fue.


## ~~La suite e2e de API entera no se podía correr en esta máquina~~ — CERRADA el mismo día que se encontró (2026-09-05)


**Cómo se encontró, y por eso se escribe:** al ensamblar los cinco carriles de la noche se corrieron
los e2e de API **todos juntos**, cosa que no se hacía nunca —se corrían por fichero—. Resultado:
**una docena de suites no arrancaban** y arrastraban decenas de pruebas en rojo, con un mensaje que
manda a mirar donde no es:

```
PrismaClientInitializationError: Authentication failed against database server at `localhost`,
the provided database credentials for `dnd` are not valid.
```

Las credenciales estaban bien. Lo que decía Postgres por debajo era
`FATAL: sorry, too many clients already`.

**La causa:** `PrismaService` implementaba `OnModuleInit` y **no `OnModuleDestroy`**, así que
`$disconnect()` no se llamaba nunca. La suite monta y cierra **una aplicación por fichero**, y cada
`app.close()` dejaba su pool abierto: 37 ficheros contra `max_connections = 100`.

**El arreglo** es el patrón canónico de Nest + Prisma —`onModuleDestroy` con `$disconnect()`,
`apps/api/src/prisma/prisma.service.ts:22-36`— y también es correcto en producción, donde hace un
apagado ordenado.

**Medido:** antes, una docena de suites muertas y las conexiones clavadas en el tope. Después, **la
suite entera en verde** —los conteos, en [08-pruebas.md](./08-pruebas.md), que es su fuente única—,
con las conexiones oscilando en 40 durante la tanda y bajando a 6 al terminar.

**Por qué no se había visto:** por fichero nunca aparece, y **CI tampoco lo ve** porque allí cada
worker de Jest es un proceso que muere y libera sus conexiones. Es un defecto que solo enseña la
cara cuando se corre la suite entera en una sola máquina.


## ~~P2 · Los tres aceleradores de la mesa están impresos y NO están cableados~~ — CERRADA (2026-09-04)


`RailDePaneles` pinta `N`, `I` y `M` debajo de sus rótulos desde B1.3, y la §5 de la auditoría los
declara: *«Atajos: `N` hoja · `I` bolsa · `M` mundo — ignorados mientras se escribe. Siempre además
del rail.»* **Ninguna de las letras hace nada.** `grep` de `keydown` en `apps/web/src` devuelve solo
`ui/Dialog` (Escape), `ui/Tabs` (flechas) y tres manejadores locales.

O sea que la pantalla **enseña un acelerador que no existe**, que es la regla vinculante de
`docs/04-convenciones.md` al revés: si el texto promete algo que el código no cumple, miente el
texto. **O se cablean —con la regla de que se ignoran mientras se escribe, que la maqueta ya
implementa— o se retiran los rótulos.** El cuarto, `D` de dados, es un invento sobre la maqueta y
hereda la misma decisión.

**CERRADA: se cablearon**, en `MesaDeSesion.tsx`, con tres guardas y dos de ellas **no están en la
maqueta**: se ignoran mientras se escribe —incluido `isContentEditable`, porque el editor del
mundo es TipTap y su cuerpo no es `input` ni `textarea`—, no hacen nada con un modificador pulsado
—`Ctrl+N` abre una ventana del navegador—, y no abren lo que su botón se niega a abrir. La ficha se
deja escrita en vez de borrada: el patrón que enseña —una pantalla que promete un atajo que no
existe— es el mismo que P1 y el que esta ronda entera vino a cazar.


| ~~**M14**~~ | **CERRADA el 2026-09-04**, y en dos mitades: **2.5.2** puso el orden de iniciativa, los turnos y los asaltos en el servidor —con el agrupamiento del SRD para criaturas idénticas— y **2.5.6** los puso en la mesa, como una tira encima del elenco. La parte que arrastraba a las condiciones ya venía pagada por una decisión vieja: el reloj de campaña está en segundos porque un asalto son seis (D-2C-1), así que `advanceTurn` avanza el mismo contador y una condición de dos asaltos se apaga sola al segundo. **Lo escrito aquí durante unas horas decía que «no existe ningún `advanceTurn`»**: era verdad en la base de la que salió esa tanda y falso en `main`, y es el precio de que un worktree se ramifique de `origin/main` sin actualizar (ver la ficha de infraestructura, abajo) | Cerrada |
| ~~**M15**~~ | **CERRADA el 2026-09-04 (2.5.4)**: `changeHp` acepta `rollEventId` opcional, comprobado contra la base (uno inventado o de otra campaña es 400) y guardado en `HP_CHANGED`. «¿De qué murió Elara?» ya responde tipo **y** tirada | Cerrada |
| ~~**M16**~~ | **CERRADA el 2026-09-04 (2.5.5 en servidor, su pantalla el mismo día).** El panel de tirada pinta el aviso —«Desventaja sugerida: Envenenado», con todas las causas y el agotamiento con su nivel— como `role="status"`, **preselecciona el modo y no lo impone**: los tres radios siguen enteros al lado, que es D-2.5-6 dicha en la interfaz. Con fallo automático no preselecciona nada, porque el modo no describe lo que va a pasar. La hoja pasa una sugerencia **por característica** en las salvaciones y una sola para las dieciocho habilidades. Historia previa: | El hermano de `effective-speed.ts` existe —`apps/api/src/character-state/roll-mode/suggested-roll-mode.ts`, puro, con las quince condiciones del SRD y sus citas— y `GET …/sheet` devuelve `rollSuggestions` con el ataque, la prueba y las seis salvaciones, cada una con sus causas. **Lo que falta es el consumidor**: ningún componente de `apps/web` lee ese campo, así que en la mesa el aviso no aparece. Mismo patrón que M17 y que `ENTITY_REVEALED`. Cierra cuando la hoja y el panel de dados lo pinten, con el modo preseleccionado y **todavía editable** — sugiere, no impone |
| ~~**M17**~~ | **CERRADA el 2026-09-04, esta vez con pantalla.** El selector de condiciones ofrece «Concentración» —en un `optgroup` aparte, «De la mesa, no del manual», porque **no es una de las quince del SRD**— con el conjuro en un campo de texto: la clave se guarda normalizada (`concentrating-bendicion`) y el nombre tal cual en `note`, que es el campo del servidor para el texto. La fila dice «Concentración en Bendición» y **lo que el servidor de verdad hace**: al recibir daño, salvación de Constitución con CD 10 o la mitad. Recorrido de navegador de punta a punta: marcar, encajar 25, y ver la petición con CD 12 donde el jugador la sondea. Historia previa: **REABIERTA el 2026-09-04**, y se cerró sin mirar la pantalla. El servidor está hecho: `changeHp` pide la salvación de siempre (2C.5, `RollRequest`) cuando un personaje con una condición `concentrating-*` **toma** daño —antes de los PG temporales, y no si cae a 0: *«you lose concentration … if you are incapacitated»*—, CD `max(10, floor(daño/2))`, una por golpe sin deduplicar (SRD 5.1, "Casting a Spell"). **Pero `grep -rn "concentrat" apps/web` no devuelve nada**: el selector de condiciones solo ofrece las quince claves del SRD, así que ninguna pantalla puede marcar a nadie como concentrado y la regla no se dispara jamás en una mesa real. Mismo patrón que `ENTITY_REVEALED` (ficha P1). **Cerró cuando** una pantalla pudo escribir `concentrating-*`, y eso fue el mismo día | Cerrada |
| ~~**M18**~~ | **CERRADA el 2026-09-04 (2.5.1)**, y llevaba dos tandas diciendo lo contrario. `damageType` es **una columna real e indexada** de `GameEvent` —promocionada antes de escribir mil sucesos, como manda la convención— y las resistencias, vulnerabilidades e inmunidades reducen de verdad, encadenándose en el orden del SRD (*«Resistance and then vulnerability are applied…»*, el matiz que la traducción española pierde). El registro publica el daño **aplicado**, no el bruto, para no filtrar por la línea de tiempo una resistencia secreta | Cerrada |
## ~~L1~~ — CERRADA el 2026-09-04 (2.5.6): la unión de tipos de suceso está cerrada


**Eran catorce, no doce**, y ese detalle es la ficha entera: cuando se recontó de siete a doce, el
número volvió a quedarse corto en un día, porque 2.5.3 añadió `ATTACK_RESOLVED` después. **Cada
tanda del carril del motor añade tipos y ninguna puede tocar `apps/web`**, que es donde vive la
traducción, así que la deuda no se quedaba quieta: crecía sola con la frontera de carriles puesta.

Se escribieron las catorce frases —`MONEY_CHANGED`, `ITEM_ADDED`, `ITEM_MOVED`, `ITEM_REMOVED`,
`CLOCK_ADVANCED`, `CONDITION_EXPIRED`, `TABLE_ROLLED`, `ENCOUNTER_STARTED`, `TURN_ADVANCED`,
`ROUND_ADVANCED`, `ENCOUNTER_ENDED`, `ATTACK_RESOLVED`, `CHARACTER_ARCHIVED`,
`CHARACTER_RESTORED`— **y se quitó el `default`**, que es lo que la propia ficha decía que había
que hacer «en vez de escribir doce frases y esperar a la trece». Sin `default`, un `switch` sobre
una unión discriminada es exhaustivo: **el tipo quince rompe el build del gráfico**, en este
fichero y en ninguno más.

Lo que sigue sin traducirse, y a propósito: las claves de `FLAG_SET`, `SIGNAL_RAISED` y
`SET_CHANGED`, que **las escribe el DM** al montar sus reglas. No son enumeraciones; se citan
literalmente entre comillas.



## Las dos del plan 12, archivadas el 2026-09-05 al integrarlas

**Las cerró la sesión que ejecutó el plan 12**; se tacharon y se archivaron en el mismo gesto, que
es lo que resuelve la tensión entre las dos reglas del proyecto: *«lo tachado sale»* de
`docs/06-pendientes.md` y *«lo tachado no se borra»* de las convenciones. Sale del documento vivo,
no del proyecto — con su prueba y su commit dentro.

| Ficha | Cómo se cerró |
|---|---|
| ~~**N1**~~ **CERRADA (2026-09-05, plan 12 · `98fa00b`).** Los dos avisos tienen emisor: `SESSION_SCHEDULED` en `apps/api/src/sessions/sessions.service.ts:148` —en `create`, y en `update` **solo si la fecha cambia**— y `COMMENT_ADDED` en `apps/api/src/comments/comments.service.ts:78`, **fuera de la transacción** para no anunciar un comentario que aún podría deshacerse. Los oyentes están en `apps/api/src/notifications/notifications.service.ts:176` y `:236`. **El aviso pasa por `canView` y el cuerpo del comentario no viaja**: «han comentado esta ficha» ya confirma que la ficha existe, que es justo lo que esconde `DM_ONLY`. Mutación probada: sin `canView`, se pone roja **una sola** de las 17, la de «no llega a quien no puede ver la ficha». Texto original: | ~~**N1** | **Dos tipos de aviso existen en el contrato y nada los emite**: `SESSION_SCHEDULED` y `COMMENT_ADDED` | Eran cinco. Los otros tres se cerraron el 2026-09-02: `SESSION_STARTED` (`sessions.service.ts`), y `RULE_PROPOSAL` y `ENTITY_REVEALED` (`rules-engine.service.ts`) |~~
| ~~**A1-avisos**~~ **CERRADA (2026-09-05, plan 12 · `e2dc957`).** La bandeja existe por fuera: `apps/web/src/features/notifications/`, montada en `apps/web/src/ui/AppShell.tsx:121` y en `apps/web/src/features/sessions/BandaDeMesa.tsx:108`. **Sin avisos no hay distintivo** —un cero con globo es ruido—, marca uno y marca todo, cada aviso lleva a su sitio, y **no borra**: un aviso leído se apaga y el historial se queda. Texto original: | ~~**A1-avisos** | **La bandeja de notificaciones está construida por dentro y no existe por fuera.** La mitad hecha: `apps/api/src/notifications/` tiene tabla `Notification`, servicio, y controlador con `GET /notifications` y `POST /notifications/read`, alimentado por los eventos de dominio. La mitad que falta: **ningún fichero de `apps/web/src` llama a esos endpoints** —comprobado por búsqueda, cero coincidencias—, así que no hay bandeja en la cabecera ni en ninguna parte | La aplicación **sí** registra lo que pasa, y **no se lo enseña a nadie**: quien recibe una invitación o un comentario no se entera si no va a mirar. Cerrarlo es trabajo solo de pantalla, no de API. **Esta ficha decía «hoy la aplicación no le cuenta nada a nadie»**, y esa media verdad hizo creer más de una vez que faltaba el módulo entero |~~
