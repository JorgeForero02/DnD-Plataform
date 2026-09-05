# Pendientes

**Solo fichas abiertas.** Las cerradas se archivan: las de antes del 2026-09-02 en
[`_archivo/pendientes-cerrados-hasta-2026-09-02.md`](./_archivo/pendientes-cerrados-hasta-2026-09-02.md)
y las que este documento seguía arrastrando tachadas en
[`_archivo/pendientes-cerrados-hasta-2026-09-03.md`](./_archivo/pendientes-cerrados-hasta-2026-09-03.md).
**La regla es mecánica y no la decide nadie: lo tachado sale, lo abierto se queda.** Se archivan
en vez de borrarse porque varias explican una afirmación que resultó ser falsa, y ese registro
es lo que evita volver a creérsela.

> **Cómo se nombra una ficha, y por qué algunas llevan sufijo.** Este documento fue creciendo
> por tandas, y cada tanda repartió identificadores de una letra y un número (`S7`, `U6`, `A1`)
> **sin mirar los que ya existían**. El 2026-09-03 había **siete colisiones** —`A1`, `A3`, `N3`,
> `S10`, `U6`, `U7` y `U8`, cada uno usado dos veces en mitades distintas del fichero—, así que
> «la ficha U6» no señalaba a nada: nombraba dos problemas sin relación. El criterio que las
> deshace, y que se aplica a cualquier colisión futura:
>
> - **Manda la aparición más temprana**, que se queda con el identificador desnudo. No por
>   mérito, sino porque es a la que ya apuntan los enlaces escritos: `07-historial.md` cita
>   `S10` y hay que respetarlo.
> - **La segunda toma un sufijo que dice de qué va**, no un número: `U6-visibilidad`,
>   `A1-avisos`, `N3-notify`. Un `U6b` habría resuelto la ambigüedad para el script y no para
>   quien lee.
> - **Un identificador no se recicla** cuando su ficha se cierra o se archiva. Reutilizarlo
>   rompe las citas de los documentos que ya lo nombraban.

> ## La copia de la base está rota — **y el autor decide que puede esperar**
>
> **Decisión del autor, 2026-09-02:** *«no hace falta la copia de seguridad en este proyecto…
> de momento no hay datos que guardar, solo datos de prueba»*. Se acata y se anota **con su
> fecha de caducidad**: la semana que viene hay pruebas de juego con el DM, y a partir de ahí
> deja de haber solo datos de prueba.
>
> **Lo que se encontró, para que no haya que volver a investigarlo:** el bloque de D&D de
> `vps1new:/root/scripts/backup-coolify.sh` perdió las **comillas simples**, así que
> `$POSTGRES_PASSWORD` y `$POSTGRES_USER` se expanden en el *host* —a vacío— en vez de dentro
> del contenedor. `sh -c PGPASSWORD=` ejecuta una asignación, **sale con código 0**, y el `if`
> lo da por bueno: registraría `dnd-pg OK` con `FAILED=0` sobre un fichero vacío.
>
> **Medido contra el contenedor real:** la forma rota produce **20 bytes** (gzip de la nada) y
> la correcta **6305**.
>
> **El arreglo, para cuando toque** (una línea, y hay que hacerlo en el servidor porque este
> equipo tiene bloqueada la edición de ficheros de producción por SSH):
>
> ```bash
> # /root/scripts/backup-coolify.sh, bloque "3c. D&D Platform postgres":
> docker exec "$DND" sh -c 'PGPASSWORD=$POSTGRES_PASSWORD pg_dumpall -U $POSTGRES_USER' 2>>"$LOG" | gzip > "$DEST/dnd-pg.sql.gz"
> bash -n /root/scripts/backup-coolify.sh && /root/scripts/backup-coolify.sh
> ```
>
> Copia previa del script en `/root/scripts/backup-coolify.sh.bak.antes-dnd`. **Y lo que de
> verdad lo cierra no es el arreglo, es una restauración probada** en un contenedor desechable
> comparando conteos de filas — ojo con la trampa documentada: `pg_dumpall` no crea la base por
> defecto ni actualiza la contraseña de un rol que ya existe.
>
> **Antes de la primera partida real, esto tiene que estar hecho y probado** — y «real» se aclaró
> el 2026-09-03: **no es la partida de prueba con agentes** que cierra la fase 2, que corre sobre un
> despliegue de desarrollo con datos desechables. Es el día que la mesa del autor juegue de verdad,
> que el propio autor sitúa **cuando haya tiempo real** (fase 4). Hasta entonces esto no bloquea
> nada; a partir de ahí, sí.
>
> **Aviso del 2026-09-03 (noche), y va contra la premisa de la decisión:** la premisa era *«no hay
> datos que guardar, solo datos de prueba»*, y al desplegar la fase 2D se contaron en producción
> **una campaña, tres personajes y dos usuarios** que llevaban allí desde el 2 de septiembre. Son
> pocos y probablemente desechables, pero **ya no son cero**, y la decisión se tomó sobre un cero.
> Sigue sin bloquear nada por decisión del autor; lo que cambia es que ahora se sabe que hay algo
> que perder.
>
> **Y una trampa nueva, medida el 2026-09-03 al hacer el volcado previo del despliegue de 2D**, que
> es exactamente la misma familia del fallo de arriba: `pg_dumpall -U postgres` **falla** porque el
> usuario de esta base es `dnd` (`POSTGRES_USER`), y deja un fichero de **20 bytes** — el mismo
> tamaño delator. Y `docker ps --filter name=dnd` **no encuentra nada**: los contenedores de
> Coolify se llaman por el UUID de la aplicación. Las dos están en
> [03-despliegue.md](./03-despliegue.md).

> ## Alineado con el código el 2026-09-05, y lo que eso enseñó
>
> Las 55 secciones se leyeron y se contrastaron **contra el árbol**, no de memoria
> ([la auditoría entera](./superpowers/specs/2026-09-05-auditoria-cola-larga.md)). **Siete fichas
> afirmaban que faltaba algo que ya estaba hecho**, y una —M10— era falsa en su primera mitad y
> cierta en la segunda, así que se ha partido en dos.
>
> **Y todas tenían su evidencia escrita, que era cierta el día que se escribió.** Esa es la lección
> que se lleva a la forma de este documento: **una ficha con un barrido citado dentro envejece igual
> que el código**. Desde ahora, lo que se tacha lleva **la prueba de cuándo** —fecha y
> `fichero:línea`—, no solo la prueba de qué.
>
> **Lo que queda vivo está planificado**, uno por fichero y con su trazabilidad ficha → plan, en
> [`superpowers/plans/2026-09-05-planes/`](./superpowers/plans/2026-09-05-planes/00-INDICE.md).
> Lo que **ningún plan cubre y por qué** también está dicho allí.

Deuda conocida y decisiones abiertas. Cada línea: qué, por qué importa, y la evidencia de
que existe. **Subir de nivel de verificación o pagar deuda es una tarea con su ficha, nunca
un efecto colateral de la siguiente funcionalidad.**

Última revisión: **2026-09-04** (las tandas del día: **B0** —tokens por canales y el tercer
tema—, **2.5.1** —tipos de daño y resistencias—, **B1.1** —la mesa en la navegación—,
**2.5.2** —iniciativa y orden de turnos— y **2.5.3** —el ataque comparado en el servidor—; y
antes, el cierre de la fase **2D**). Las secciones
van de lo más reciente a lo más viejo dentro de cada bloque, y **la fecha de
esta línea se actualiza al añadir una sección** — se quedó en el 2026-09-02 con tres secciones del
día siguiente ya escritas debajo, y lo cazó una auditoría.

## C2.5-2 · El crítico de la DAMAGE de `rollAttack`, atado a la tirada A MEDIAS (2026-09-04, 2.5.4)

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

## Deuda del carril C6 — las mecánicas sin pantalla (2026-09-04)

| Ficha | Qué | Por qué queda abierta |
|---|---|---|
| ~~**C6-1**~~ **CERRADA (2026-09-05)** — dos de los cuatro existen ahora como suceso y su gesto los escribe (`ENTITY_COMMENTED` en `comments.service.ts`, `MEMBER_JOINED` en `invites.service.ts`), con su `case` en `game-event-triggers.ts`. Los otros dos siguen retirados **con su motivo escrito**: `DM_EXECUTED` no tiene gesto en ninguna pantalla y `ENTITY_ATTACKED` apunta a una ficha del mundo cuando aquí se ataca a un `Character`. **Y la lista duplicada ya no lo está**: vive en `packages/shared/src/rules-engine.schema.ts`. Texto original: | ~~**Los cuatro disparadores del motor siguen sin `case`**: `ENTITY_COMMENTED`, `DM_EXECUTED`, `ENTITY_ATTACKED`, `MEMBER_JOINED` (`apps/api/src/rules-engine/game-event-triggers.ts:29-75`) | Se han **retirado de lo que el editor ofrece** (`DISPARADORES_SIN_MOTOR`, en `features/rules/vocabulario.ts`) porque una regla armada sobre ellos se guarda y no se dispara jamás, y la interfaz no puede prometer lo que el motor no cumple. Implementarlos es servidor. **Cierra cuando** el `switch` los traduzca: entonces esa lista se vacía y la paleta los recupera sola. Y **es una segunda copia** de `UNREACHABLE_TRIGGER_KINDS` (`apps/api/src/rules-engine/trace-payload.ts:109`) **por una frontera de trabajo, no por una imposibilidad**: son cuatro literales de `RuleTrigger["kind"]` y caben en `packages/shared/src`, que es donde este proyecto guarda la forma de los datos una sola vez; el carril que las escribió no tocaba ese paquete. **La mudanza a `@dnd/shared` es el cierre de esta ficha**, y hasta entonces las dos no pueden divergir en silencio sobre una regla guardada, porque el aviso de `ListaDeReglas` lo manda el servidor |
| **C6-2** | **`GET .../statblocks` no devuelve `visibility`** (`aStatblock()`, `statblocks.service.ts:184`) | El editor de criaturas propias (`apps/web/src/features/bestiario/EditorDeStatblock.tsx`) **no puede enseñar quién la ve al editarla**, porque no lo sabe, así que **omite el campo** en el `PUT` para no pisar una criatura que el DM ya había enseñado a la mesa. Se dice en pantalla en vez de esconderlo. **Cierra cuando** el servidor incluya el campo en la lectura: son dos líneas y el formulario ya tiene el selector escrito |
| **C6-3** | **El vocabulario de tipos de daño sigue triplicado** y las tres copias **no dicen lo mismo**: `character-sheet` y `campaign-items` traducen `LIGHTNING` como «relámpago»; `inventory` abrevia y dice «rayo» | La decisión D-OP-14 (un módulo con `nombreTipoDano` y `nombreTipoDanoCorto`) **no se aplicó a ciegas**: el corto existe para que la fila de inventario quepa, y unificar sin más rompería ese ancho. El selector de daño nuevo usa el largo de `character-sheet` y lo dice en su comentario. **Cierra cuando** el módulo único exponga las dos formas y las tres features importen de él |
| ~~**C6-5**~~ **CERRADA, comprobada el 2026-09-05**: `apps/web/src/features/sessions/elenco/PonerDano.tsx:125` manda `...(tipoDeDano ? { damageType: tipoDeDano } : {})`. Texto original: | ~~**Solo una de las dos pantallas que cambian PG manda el tipo de daño.** La hoja sí; el ±5 del elenco (`apps/web/src/features/sessions/elenco/FichaDeElenco.tsx`) sigue mandando `{ delta }` | Y **es la ruta que un DM usa en combate** —el gesto rápido sobre el retrato, no abrir la hoja entera—, así que la mecánica insignia de 2.5.1 sigue sin poder ocurrir en mitad de una partida. No es un olvido: ese fichero es de otro carril. La pieza que falta **ya está escrita y exportada**, `SelectorDeTipoDeDano` (`apps/web/src/features/character-sheet/AplicarDano.tsx`), autónoma y sin consultas dentro. **Cierra cuando** el cajón del elenco la monte en su ranura `ranuraTipoDeDano` y pase su valor a `tipoDeDano` |
| **C6-4** | **`NpcEnLaMesa.tempHp` se pinta pero no se ha podido ver con datos** | Ninguna pantalla da PG temporales a un PNJ todavía, así que el campo siempre llega a 0. El código está (`apps/web/src/features/bestiario/PanelDeBestiario.tsx`, «+N temporales», aparte y nunca sumado). **Cierra cuando** exista el gesto que los concede |

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

## P3 · «Dónde se quedó» no viaja en el listado de campañas (2026-09-04, B3)

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

## P1 · La vitela de «Lectura» no es un pliego claro, y el prototipo la quiere así (2026-09-04, B0)

**Divergencia deliberada, medida.** El tema de lectura del prototipo pone un pliego de vitela
**claro** (`#efe3c8`) sobre una mesa oscura. Se adoptó tal cual y se midió en el navegador:
**1.02:1** el texto del panel de vitela y de la atribución del SRD, **1.51:1** un enlace dentro
de él. El motivo no es el color del pliego, es que **sobre él la aplicación sigue imprimiendo
con los tokens del chrome**, que en ese tema son claros.

**Lo que haría falta**: una paleta de hoja completa —tinta, apagado, acento, código y filete—
que se active dentro de `Panel tone="vellum"`. No es una línea; es una tanda con su medición.

**Lo que ya está hecho para que sea barato**: `--vellum-ink` y `--vellum-muted` existen en
`ui/tokens.css` y `ui/Panel.tsx` ya imprime a través de ellos. Hoy son alias de `--text` y
`--muted` en los tres temas, así que no cambian nada; el día que se decida, el pliego claro
entra redefiniéndolos en `[data-theme="reading"]` y añadiendo los que falten.

Mientras tanto la vitela de Lectura es oscura y los tres temas pasan las 19 mediciones de
`e2e/tokens-contrast.spec.ts`. Declarado también en [04-convenciones.md](./04-convenciones.md).

## P3 · El tema Claro del prototipo es papel cálido; el nuestro es gris frío (2026-09-04, B0)

`prototipo/src/index.css` da al tema claro `#e6e1d4` (papel), y aquí vale `#dfe5e9` (gris
azulado). No se tocó en B0 **porque el nuestro está medido** y cambiar la paleta obliga a
volver a medir las 19 comprobaciones de contraste en esa mitad. Es una decisión de identidad,
no un defecto: si la mesa nueva se ve fría al lado de la maqueta, esta es la ficha.

## La pantalla de juego con mapa — alcance nuevo, sin decidir (2026-09-02)

**Lo que el autor quiere, en sus palabras:** *«yo no quiero un juego plano; quiero que los
jugadores tengan una interfaz donde vean el mapa, su hoja, sus tiradas y demás dentro de una
misma pantalla, con objetos interactivos renderizados y tiles, como las plataformas clásicas de
D&D»*.

**Por qué esto es una decisión y no una tarea.** El plan maestro dice hoy «Mapas 2D: imagen
subida, pines que enlazan a fichas, interruptor de niebla, capa del DM y capa del jugador». Eso
es un **documento con chinchetas**. Lo que se pide es otra cosa: un **tablero** con rejilla,
fichas que se mueven, objetos con los que se interactúa, y la hoja y las tiradas **en la misma
pantalla**. Es una mesa virtual, y arrastra tres cosas que hoy están en fases distintas o en
ninguna:

- **Tiempo real (fase 4).** Una ficha que se mueve y solo la ve quien la movió no sirve de nada.
- **Almacenamiento de objetos (fase 3).** Tiles, sprites y mapas son ficheros.
- **Posiciones**, que hoy **no existen en el modelo**. Un personaje no tiene coordenadas, y la
  fase 2A dejó las distancias resueltas «sin posiciones» a propósito.

**Lo que hay que decidir antes de dibujar nada:** si esto sustituye a la fase 3 o va después de
ella; si el tablero es rejilla cuadrada o libre; y **qué pasa con la visibilidad**, que es la
pregunta grande — la niebla de guerra es `canView` aplicado a coordenadas, y hoy `canView` no
sabe nada de coordenadas. **La posición de una ficha enemiga es información igual que su CA:
si no se debe saber, no se envía.**

Mientras tanto: **no se dibuja la pantalla de juego a ciegas**. La maqueta de Figma Make no la
trae, y el hueco está declarado en
[la revisión de lo que volvió](./superpowers/specs/2026-09-02-figma-make-revision.md).

## Dejado por la segunda tanda de la ronda de interfaz (2026-09-02, madrugada)

- **El arrastre del editor de reglas no está probado en un navegador, y puede que no funcione.**
  Es lo más serio de esta lista. En la página del editor **no se dispara ni un `dragstart`**.
  Descartado ya: `dragTo` frente a ratón paso a paso, `<button>` frente a `<div draggable>`,
  con y sin `clip-path`, con y sin `user-select: none`. El dato que apunta a dónde mirar: un
  `<div draggable>` **trivial** inyectado *dentro del diálogo* tampoco arrastra, y uno inyectado
  *fuera* sí — así que **es del contexto, no de la pieza**. Sospechas sin comprobar: el atrapa-
  foco del diálogo, o algo del apilado. Mientras esto siga abierto, **la ruta de teclado y
  pulsación es la única que se puede afirmar**, y esa sí está probada. Si al final resulta que el
  arrastre no funciona para una persona, R1 no está terminada.
- ~~**`BarraDeSesion` y la cabecera se pelean por la misma banda.**~~ **CERRADA (2026-09-05):**
  `features/sessions/BarraDeSesion.tsx:45` define `PEGADA_BAJO_LA_CABECERA` y el `sticky` lo lleva
  el envoltorio; además la mesa ya no vive dentro de `AppShell`. Texto original: ~~Las dos son
  `sticky top-0`; la barra va a `z-30` y la cabecera también es fija. Con una sesión en curso se
  solapan. Es previo a esta tanda y no lo tocó nadie. La cabecera de combate de la hoja va a
  `top-16` y quedará por debajo de la barra, no encima, así que el defecto se ve más ahora.
- **El diálogo de creación de personaje todavía pide raza y clase como texto libre.** Desde que
  `descriptor.ts` prefiere las claves del catálogo, un personaje creado ahí nace con las columnas
  heredadas y **sin clave**, que es el caso menos bueno de los dos. Debería ofrecer los
  desplegables del catálogo. Y su botón de guardar sigue con `disabled` mientras envía, que roza
  la regla de que un botón de guardar no se deshabilita.
- **Las columnas `race`/`class` se pueden retirar en cuanto el autor confirme** que no queda
  ningún personaje escrito a mano antes del catálogo. Hoy siguen ahí a propósito.
- **`@testing-library/user-event` no está instalado**, así que las pruebas de componente que
  querrían simular teclado real usan `fireEvent`. No es falso —se comprueba que el control es
  activable y que su activación coloca— pero es menos fiel.
- ~~**`ui/Iconos.tsx` no tiene icono de inventario.**~~ **CERRADA (2026-09-05)**, y hoy el problema
  es el **contrario**: hay conceptos duplicados entre `ui/Iconos.tsx` y nueve ficheros de
  `features/` (escudo ×3, mochila ×3, sol ×2, luna ×2). Lo cierra el **plan 07**. Texto original:
  ~~La hoja dibuja un `IconoArcon` local; cuando
  2B monte el inventario debería subir a la casa común.

## Dejado por E0, la prueba de ida y vuelta de TipTap (2026-09-02)

- ~~**Las dependencias de TipTap están en `devDependencies`.**~~ **CERRADA (2026-09-05, plan 01):**
  los seis paquetes están ahora en `dependencies` de `apps/web/package.json:19-24`, con las mismas
  versiones (`^3.31.0`) y con el movimiento reflejado en `pnpm-lock.yaml`. No se esperó a que `src/`
  los importara a propósito: la ficha condicionaba el arreglo a un momento futuro que nadie iba a
  vigilar. Texto original: ~~Hoy su único consumidor es
  `scripts/e0-tiptap-roundtrip.mjs`, que no se empaqueta. **E1 tiene que moverlas a
  `dependencies` en cuanto las importe desde `src/`**, o la imagen de producción se
  construirá sin ellas y el editor no existirá allí. Es un fallo que no se ve en local,
  porque en local están instaladas igual.~~
- **TipTap descarta tablas, imágenes y listas de tareas sin decir nada** si no se registran
  `TableKit`, `Image`, `TaskList` y `TaskItem`. No lanza, no avisa: el Markdown entra con la
  tabla y sale sin ella. El script lo demuestra corriéndolo sin `--completo`. Cuando E1
  monte el editor, **esa lista de extensiones es parte del contrato**, no una preferencia,
  y conviene que una prueba la fije.
- **La normalización de Markdown es real aunque sea inofensiva:** `*` pasa a `-`, `_x_` a
  `*x*`, la contrabarra de salto duro a dos espacios. Es estable —el segundo viaje ya no
  cambia nada—, pero significa que **abrir un documento en el editor y guardarlo sin tocar
  nada produce un diff**. Si algún día hay historial de versiones, habrá que decidir si eso
  cuenta como una edición.

## Huecos abiertos de la fase 2A (2026-09-02)

Aparecieron al completar el plan y **no están resueltos**. Los cinco que sí lo están viven en
[la parte 2 del plan, §4](./superpowers/plans/2026-09-02-fase-2A-parte-2-eventos-distancias-y-cierre.md).

| | Qué | Por qué importa |
|---|---|---|
| **H7** | Una regla que apunta a una ficha **borrada** | Queda **rota y marcada**, nunca se descarta en silencio. Falta decidir si se puede seguir armando |
| **H8** | El motor evalúa **dentro de la petición** que escribió el suceso | Con diez saltos y varias reglas, abrir una ficha puede tardar. Propuesta: síncrono con tope y cola si molesta — **hay que medirlo, no suponerlo** |
| **H9** | **Las propuestas caducan.** Una propuesta de hace tres sesiones es ruido | Falta decidir el plazo |
| **H10** | Las formas de área (cono, esfera, línea, cubo, cilindro) las necesitan el motor (2A) y los conjuros (2B) | Propuesta: viven en `@dnd/shared` desde 2A, aunque en 2A todavía no alcancen a nadie |
| **H11** | **Nada ata el texto de la interfaz a `canView`** | Es el mismo U10 de más abajo, visto desde 2A: las frases de visibilidad **ya mintieron una vez** |

## Deuda de las tareas 2A.3 y 2A.4 (catálogo SRD y elecciones) — 2026-09-02

Revisado por dos agentes el mismo día. Las fichas marcadas **[revisión]** las encontró la
revisión, no quien implementó, y varias de ellas son cosas que se **arreglaron** ahí mismo: se
quedan aquí para que no se deshagan sin darse cuenta.

| | Qué | Por qué importa, y qué cuesta cambiarlo |
|---|---|---|
| **S2** | **De cada aptitud de clase se transcribió el nombre y el nivel, no su texto de reglas** | El plan (§4.3) pedía «aptitudes por nivel como texto». La hoja puede decir «al nivel 5 ganas Ataque adicional» —desde el arreglo de la revisión, que metió las aptitudes de clase y subclase en `features`; antes esta ficha **afirmaba que ya lo hacía y era falso**—, pero no puede explicar qué hace cada una. Traducir a mano el texto completo de unas doscientas aptitudes es donde una transcripción se llena de errores que **ningún invariante puede cazar**. Añadirlo después es rellenar un campo, no cambiar una forma |
| **S3** | **El catálogo vive en `apps/api/src/rules/catalog/`, no en un paquete `packages/srd`** | El plan (§4.1) dejaba las dos abiertas. Hoy **solo lo consume el propio borde de la API, dentro de `apps/api`**, y crear un paquete costaría cableado de compilación por cero beneficio. (La justificación anterior decía «un solo consumidor, el motor» y era **al revés**: la dirección real es `catalog → engine`. Corregido tras la revisión.) La web ya los pide por endpoint (`GET /catalog`, `apps/api/src/rules/catalog.controller.ts`, creado el 2026-09-02 al ver que la pantalla los tenía transcritos a mano). La deuda de fondo sigue: el catálogo continúa dentro de `apps/api`. Si aun así conviene el paquete, es un `git mv` |
| **S4** | **Los rasgos raciales sin efecto numérico se listan, pero no hacen nada** (Suertudo, Astucia gnoma, Aguante implacable…) | Salen por `features` para que la hoja los enseñe. Automatizarlos es 2C, igual que las condiciones. Está dicho aquí para que nadie los lea en la hoja y suponga que el motor los aplica |
| **S6** | **La mejora de característica de los niveles de `asiLevels` no se modela todavía como elección** (2A.4) | Es el mismo mecanismo que el «+1 a dos» del semielfo, y el plan (§3) las nombra juntas. No entra aún porque «+2 a una **o** +1 a dos» es una concesión con **dos modos**, y quien decide la forma de la subida de nivel es 2A.9. **Ojo: no son solo 4/8/12/16/19** — el guerrero tiene 4/6/8/12/14/16/19 y el pícaro 4/8/10/12/16/19, y están en `asiLevels`; quien implemente 2A.9 leyendo solo esta línea se dejaría tres niveles. Añadirlo es un `kind` nuevo en `Grant` |
| **S10** | **[revisión] El nivel y el nombre de las ~203 aptitudes de clase no están fijados por ninguna prueba** | `reference.spec.ts` fija dado de golpe, salvaciones, `asiLevels`, número de habilidades, lanzamiento, subclase y su nivel, y todas las cifras de razas y armaduras — **mover una aptitud de nivel, en cambio, no pone nada en rojo** (comprobado: la mutación «evasión del pícaro del 7 al 4» sigue pasando). Fijarlas sería transcribir los mismos datos **dos veces**, y dos copias derivan. Lo que protege esas filas es que el diff se entregó legible y se revisó con el SRD delante |

## Deuda de la fase 2B — objetos, inventario y equipo (2026-09-03)

Lo que quedó abierto al cerrar 2B, con su prioridad y lo que costaría cerrarlo. Las tres primeras
son decisiones tomadas a conciencia, no olvidos.

| | Qué | Por qué importa, y qué cuesta cambiarlo |
|---|---|---|
| **I1** | **Cuatro nombres de arma en español están sin contrastar con el PDF oficial** — «Guja» (glaive), «Almádena» (maul), «Mangual» (flail) y «Lanza de caballería» (lance) | Los nombres del catálogo son los de la traducción oficial de Wizards, no una traducción nuestra, y así lo declara `NOTICE.md`. Quien transcribió la tabla los señaló en su informe como los de menor confianza — **en el código no hay ninguna marca que los distinga del resto**, así que esta ficha es el único rastro. **Prioridad baja y coste mínimo** —cambiar una cadena—, pero si están mal, `NOTICE.md` afirma algo que no es. Se contrasta con el SRD 5.1 en español cuando haya acceso al documento |
| **I2** | **Dos armas del SRD no están: la red y la cerbatana** | Ninguna cabe en la forma: la red no hace daño y la cerbatana hace «1» fijo, no un dado. Modelarlas exige que `damageDice` admita un daño plano o nulo, que es un cambio de forma en `packages/shared`. Declarado en la cabecera de `weapons.ts` para que no parezca un olvido |
| **I3** | **No se modela «lo tengo pero no sé qué hace»** (identificado ≠ visible) | Es visibilidad **por campo**, y el modelo no la hace en ningún sitio: hoy la visibilidad es de la fila entera. Además la traza delataría el número igual —«CA 15 = … +1 anillo»— así que media solución sería peor que ninguna. Lo que sí funciona hoy: el DM crea el objeto `DM_ONLY` mientras prepara y le sube la visibilidad al entregarlo |
| **I4** | **La carga se enseña y no penaliza** | La sobrecarga (Fuerza×5 y Fuerza×10) es una **regla variante** del SRD, y aplicarla sin que la mesa la haya elegido es cambiarle las reglas a alguien. Falta un interruptor por campaña; el dato —peso de cada objeto y capacidad— ya está, que era la parte cara |
| ~~**I5**~~ **CERRADA (2026-09-05)**: `ITEM_MOVED` lleva `from`/`to` con `EQUIPPED`/`CARRIED`/`STORED`, más `slot` y `attuned` (`game-event.schema.ts:350`), y lo escribe `inventory.service.ts:413`. Texto original: | ~~**Equipar y desequipar no dejan rastro en la línea de tiempo**~~ | El dinero sí (`MONEY_CHANGED`, tipo propio desde 2B). Ponerse un objeto que sube la CA en mitad de una sesión es exactamente el tipo de cambio que el DM querría ver en el log al repasar. Es un tipo de suceso nuevo y una llamada; barato, y no entró por alcance |
| **I6** | **Las competencias de armadura no producen aviso todavía** | El catálogo ya las tiene en claves de máquina (`light`, `medium`, `heavy`, `shield`) desde 2B, y el SRD dice que llevar armadura sin competencia da desventaja en todo lo de Fuerza y Destreza y **prohíbe lanzar conjuros**. El motor ya sabe emitir avisos y el de armas ya existe (`attack_not_proficient`): falta el de armadura, que es el mismo mecanismo |
| **I7** | **El tabú del druida se perdió al pasar las competencias a claves** | El SRD dice «ligera, media y escudos, **no metálicos**». Eso no es una competencia menos —un druida *sabe* usar una cota de escamas, pero no quiere— y modelarlo como competencia le negaría una armadura que la regla sí permite. Hoy vive en un comentario de `classes.ts`; su sitio es el texto de la aptitud, cuando exista dónde ponerlo |
| **I9** | **El conteo de unitarias del bloque de estado es una cota inferior, no lo que imprime el corredor** | `scripts/update-estado.mjs` cuenta **declaraciones**, y un bloque `it.each` declara una y ejecuta varias: hay más de cuarenta, así que la cifra va varios cientos por debajo de la real. El comentario del script decía «nada aquí usa `.each`» e **invitaba a comprobarlo con un grep**; el grep lo desmiente. Corregido el texto y ampliada la expresión regular para que al menos cuente el bloque, pero **la cifra sigue sin ser la del corredor**. El arreglo de verdad es leer los informes de `vitest`/`jest` (`--reporter=json`) en vez de contar líneas, y cuesta que `check:estado` deje de ser barato — que es justo por lo que está donde está en `pnpm verify`. Lo encontró la auditoría de documentación de 2B |
| **I10** | **Una tirada de ataque siempre se publica como `PLAYERS`** | El esquema (`rollAttackSchema`) acepta `visibility` y el servidor la respeta, pero la pantalla (`apps/web/src/features/character-sheet/TirarAtaqueBoton.tsx`) no la ofrece. Para un DM que tira con un PNJ es un problema real: la etiqueta de la tirada lleva el nombre del arma, y una tirada suya que no quería enseñar aparece en el registro de la mesa. Es el selector de visibilidad que ya existe en el panel de tiradas general, montado también aquí |
| **I8** | **El nombre legible de una competencia ya no existe en ninguna parte** | Al pasar `weaponProficiencies`/`armorProficiencies` a claves de máquina, las frases en español («Armas marciales») desaparecieron. **Nadie las pintaba**, así que no se rompió nada, pero el día que la hoja quiera enseñar «Competencias e idiomas» hará falta la tabla de traducción — en la pantalla, como con toda clave del catálogo, y no de vuelta en el dato |

**Lo que la revisión de 2B encontró y se arregló el mismo día** (no queda deuda, se anota porque
la lección sí): la hoja leía el equipo **sin pasar por `canView`**, así que el nombre y el
identificador de un objeto que el inventario escondía salían igual por el cuadro de ataques y por
la traza; la bolsa comprobaba el saldo **fuera** de la transacción y podía quedar en negativo con
dos peticiones a la vez; el tope de sintonizaciones tenía la misma carrera; y dos pruebas de la
regla de manos pasaban **por el motivo equivocado** —el 409 que asertaban lo producía también la
comprobación genérica de ranura ocupada, así que se podía borrar la regla entera sin poner nada
rojo—. Las cuatro tienen ahora su prueba con mutación comprobada.

**Y una deuda que 2B pagó en vez de heredar:** el visor de un personaje (¿puede verlo?, ¿puede
escribir en él?) estaba escrito dos veces y 2B iba a escribir la tercera. Vive ahora en
`apps/api/src/common/character-viewer.ts`. Siguen con su copia propia `entities`, `characters`,
`character-sheet`, `comments`, `links`, `sessions`, `game-events`, `rules-engine` y
`campaign-items`.

## Decisiones del autor sobre 2C y 2D (2026-09-03) — cerradas

Se le presentaron con recomendación y fuente, y las contestó todas. Están en el
[alcance de 2C](./superpowers/specs/2026-09-03-fase-2C-alcance-design.md) §4 y en el
[plan de 2C](./superpowers/plans/2026-09-03-fase-2C-plan.md). Resumen: reloj en segundos ·
condición que caduca sola sin borrarse · tabla de CD sembrada del SRD · petición de tirada dentro
de 2C · los cuatro modos de tirada, cerrando el agujero de la tirada ciega · **tablas de críticos y
pifias opcionales y apagadas por defecto**, porque el DM de esta mesa las usa · statblocks
importados del JSON del SRD publicando lo revisado · y **el despliegue, al cerrar la fase 2, con
una partida de prueba real de dos jugadores**.

**Lo único que quedó anotado para más adelante:** *«opciones de personalización»* de las criaturas
del SRD —poder clonar o editar una dentro de una campaña, como ya se puede con un objeto—. No entra
en 2D; lo que 2D tiene que hacer es **no impedirlo** con la forma de su tabla.

## Lo que dejó abierto la auditoría de mecánica de 2B (2026-09-03, noche)

> **Un intermitente que no era una prueba frágil, y merece constar.** Después de serializar el
> camino de equipar, el e2e de la carrera empezó a fallar **una vez de cada cuatro** con un 500
> en vez del 409 esperado. La tentación era llamarlo flaky y repetir. Medido con el error real
> impreso, era un **abrazo mortal de Postgres (40P01)**: meter un objeto ya equipado y equipar
> otro tomaban los recursos **en orden inverso** —uno el índice único de la ranura, otro la fila
> del personaje—. Se arregló haciendo que todos los escritores del inventario tomen el mismo
> candado primero, y el propio abrazo mortal se traduce ahora a un 409 legible por si alguna vez
> vuelve por un camino nuevo. Seis corridas seguidas en verde después del arreglo.

Dos frentes con su refutador, sobre el camino de una mesa real. El informe entero, con lo que se
arregló el mismo día y lo que el refutador corrigió, está en
[la auditoría de mecánica](./superpowers/specs/2026-09-03-auditoria-de-mecanica-2B.md).

| | Qué falta | Qué cuesta, y qué pasa mientras tanto |
|---|---|---|
| **M2B-4** | **Quedan las cargas** (una varita de siete usos que se repone en el descanso) | La munición del SRD ya está sembrada (flechas, virotes, balas, agujas) y **gastar un consumible existe** (`POST .../inventory/:rowId/consume`, con su rastro en la línea de tiempo y la fila que desaparece al llegar a cero). Lo que falta son las **cargas**: columnas `chargesCurrent`/`chargesMax`/`rechargeOn` en `InventoryItem` y reponerlas dentro de la transacción del descanso. Es una migración, y por eso no entró de madrugada |
| **M2B-14** | **Los objetos mágicos genéricos del SRD se pueden sembrar y no están** | **Arma +1/+2/+3, Armadura +1 y Escudo +1 sí están en el SRD 5.1**, bajo la misma CC BY que el resto: la cabecera del catálogo dice «ningún objeto mágico» y eso es más restrictivo de lo que la licencia pide. Con los efectos `weaponAttack`/`weaponDamage` ya abiertos, sembrarlos es transcribir cinco filas. Es decisión de producto, no arreglo. Comprobado en [el contraste de reglas](./superpowers/specs/2026-09-03-contraste-de-reglas-2B.md) |
| **M2B-15** | **«Lo tengo pero no sé qué hace» — la mitad que falta** | Revisa el motivo de la decisión D-2B-8: **es práctica estándar**, no exótica — Foundry lo trae de serie con una bandera `identified` y hay módulos dedicados. Y **media solución ya está construida**: la redacción de 2B (se tacha el nombre, se conserva el número) es el mismo mecanismo de presentación. Falta el interruptor del DM y un nombre alternativo («una espada de aspecto extraño») |
| **M2B-5** | **La carga se enseña y no penaliza** (ya era I4; la auditoría lo confirma midiendo) | El grupo saquea 400 libras y nada cambia. Falta el interruptor por campaña y derivar la sobrecarga como causa de velocidad |
| **M2B-8** | **`quantity` es absoluto donde el dinero es delta** | Dos personas descontando una flecha a la vez dejan 19 en vez de 18. No rompe ningún invariante —por eso no es urgente— pero es la misma carrera que la bolsa ya tiene resuelta |
| **M2B-11** | **Equipar son tres peticiones desde la pantalla** | `fetchAc` → `PATCH` → `fetchAc`. Si la segunda lectura falla, la mutación se marca como error, no se invalida la caché y la pantalla enseña un estado que el servidor ya cambió. Lo correcto es que el `PATCH` devuelva la CA nueva |
| **M2B-12** | **La hoja lee el inventario por otra conexión dentro de una transacción bloqueada** | El refutador rebajó esto de «incorrección» a **higiene**: lo que se lee está confirmado, pero son N+1 consultas sosteniendo un candado de fila. Se arregla pasando el `tx` hasta `equipoEquipado` |

## Lo que dejó la auditoría de documentación (2026-09-02)

Dos agentes auditaron los ocho documentos numerados **contra el código**, afirmación por
afirmación. **Treinta hallazgos, todos corregidos el mismo día** salvo estos tres, que son
trabajo y no una frase:

| | Qué | Por qué importa |
|---|---|---|
| **A3** | **El censo de controladores caducado también está en `docker-compose.prod.yml`**, en el comentario que justifica la comprobación de salud de la API | Es la misma mentira en dos sitios; se corrigió la del documento y queda la del compose. Cambiar el compose recompila la imagen en Coolify, así que **se hace con el siguiente despliegue, no suelto** |

## Iluminación y visión (pregunta del autor, 2026-09-02)

Razonado en [distancias y movimiento, §12 bis](./superpowers/specs/2026-09-02-distancias-y-movimiento-design.md).
**Cerrado hoy:** los sentidos llegan a la hoja (`senses.darkvision` en pies, derivado y con
traza). Lo demás queda colocado, no olvidado.

| | Qué | Dónde va |
|---|---|---|
| **L1** | **Niveles de luz** (brillante / tenue / oscuridad) y fuentes de luz | **Fase 3**: sin posiciones no hay «qué hay iluminado desde aquí». Se puede escribir la regla, no resolverla |
| **L2** | **Arco y radio de visión**, y que el DM restrinja la visión de alguien | **Fase 3**, por lo mismo: un arco necesita origen y dirección |
| **L3** | **`blinded` no calcula nada.** Se guarda y se enseña, como los rasgos raciales sin efecto numérico | **2C**, con el resto de la automatización de condiciones. Hoy es coherente con la decisión ya tomada, no un olvido |
| **L4** | **La visión NO es `canView`, y esto es una invariante** | `canView` responde «¿este **jugador** puede leer este registro?»; la visión, «¿qué percibe este **personaje** en la ficción?». Confundirlas deja a un personaje cegado sin acceso a sus propias notas, o convierte una ceguera de ficción en un permiso que filtra por el camino que protege los secretos. **Cuando llegue el tablero**, «el jugador no ve esta ficha en el mapa» sí es autorización y va por `canView` sobre la ficha o la escena — un motor de iluminación que solo oscurezca en el navegador algo que el servidor ya mandó **no es niebla de guerra, es un filtro de CSS sobre un secreto** |

## Cabos sueltos de 2A.6, 2A.7, 2A.8 y 2A.12 (2026-09-02)

| | Qué | Por qué importa |
|---|---|---|
| **H1b** | **«Estable» no sobrevive a la petición que lo produce.** Estabilizarse con tres éxitos —o revivir con un 20 natural— pone los contadores de tiradas de muerte a cero, así que un `GET` posterior **no distingue «acaba de estabilizarse» de «acaba de caer a 0 PG»** | La hoja tiene que poder decir si el personaje está estable: es lo primero que pregunta la mesa. El estado correcto sale hoy **solo en la respuesta de la propia tirada**. **Y la solución ya existe sin migración**: `CharacterCondition` acepta **clave libre** desde 2A.12, así que «estable» cabe ahí como condición, que además es lo que es. Cuesta conectar dos módulos y decidirlo; se deja escrito para que 2A.10 no lo improvise |
| **H2b** | **El `PATCH` absoluto de PG del DM no se recorta contra el máximo** (el `POST` de delta sí) | Es deliberado y coherente con «recortar al leer, nunca al recalcular»: **un DM que escribe un número quiere ese número**. Se anota porque parece un olvido y no lo es, y porque si algún día se decide lo contrario hay que decidirlo, no arreglarlo |

## Cabos sueltos de 2A.14 y 2A.15 (2026-09-02)

Los deja la implementacion **a proposito y dichos**, en vez de inventar el enganche.

| | Que | Por que importa |
|---|---|---|
| **N1** | **Dos tipos de aviso existen en el contrato y nada los emite**: `SESSION_SCHEDULED` y `COMMENT_ADDED` | Eran cinco. Los otros tres se cerraron el 2026-09-02: `SESSION_STARTED` (`sessions.service.ts`), y `RULE_PROPOSAL` y `ENTITY_REVEALED` (`rules-engine.service.ts`) |
| **N2** | **`recordEntityOpened` esta implementado y NO esta conectado** al modulo de entidades | Es el suceso `ENTITY_OPENED` que el motor de reglas escucha (hueco **H3**), y ya se escribe con visibilidad `DM_ONLY` como se decidio. Conectarlo toca `entities`, que estaba fuera de la frontera de esa tarea. **Y con el va una obligacion que no se puede olvidar**: la interfaz tiene que avisar al jugador de que abrir una ficha puede disparar reglas — registrar quien abre que es vigilancia si nadie lo dice |
| **N3** | **Los dos e2e nuevos declaran su propio `TestAppModule`** que reproduce la composicion de `app.module.ts` | Es una segunda copia del mismo hecho, y dos copias derivan — el problema exacto que este proyecto lleva todo el dia evitando. Nacio de una frontera de ficheros necesaria (el agente no podia tocar `app.module.ts`), y **se corrige en cuanto los modulos estan cableados**: pasan a importar `AppModule` como el resto |

## Encontrado al escribir 2A.13 (2026-09-02)

| | Qué | Por qué importa |
|---|---|---|
| **R1** | **El límite global de 100 peticiones por minuto y por IP puede quedarse corto en una mesa real.** Lo descubrió una prueba: cien tiradas seguidas empezaban a recibir 429 a mitad de bucle, y la prueba estaba midiendo el limitador en vez de los dados | No es teórico. Una mesa juega **desde la casa de una persona o por una VPN compartida**, así que los cinco jugadores pueden salir por **una sola IP**; y el sondeo del log de la sesión gasta del mismo presupuesto que las tiradas. Un combate largo con la línea de tiempo abierta podría rozarlo. **No se sube el número a ciegas** —eso es aflojar un control de seguridad sin datos—: lo que hace falta es **medir** cuántas peticiones gasta de verdad una sesión con la pantalla del motor abierta (2A.17), y entonces decidir si el reparto correcto es por usuario en vez de por IP para las rutas con sesión iniciada, dejando el límite por IP donde de verdad protege, que es el acceso sin autenticar |

## Huecos de mecánica declarados a mitad de 2A (2026-09-02)

Salieron de un repaso pedido por el autor con 2A.1-2A.5 ya en producción, razonado en
[huecos de mecánica](./superpowers/specs/2026-09-02-huecos-de-mecanica-2A.md). **Cuatro se
cerraron ese mismo día** (media competencia, Ataque Extra, espacios de conjuro e iniciativa) y
**tres están colocados** en 2A.6, 2A.7 y 2A.12. Estos cuatro quedan abiertos.

| | Qué | Dónde va, y por qué no ahora |
|---|---|---|
| **M8** | **Modificadores temporales con caducidad** — *«+2 a Fuerza durante una hora»*. Lo pidieron los jugadores y **no está escrito en ningún plan**: no es un estado con nombre ni un objeto equipado, es un modificador con fecha de fin | Necesita el **reloj de campaña**, que es 2C. El modelo de modificadores de 2A ya sabría aplicarlo; falta quién decide que ha caducado. Meterlo sin reloj sería un campo que nadie limpia |
| **M9** | **El personaje se archiva, no se borra — SERVIDOR HECHO (2.5.8), PANTALLA PENDIENTE.** Existen `POST …/archive`, `POST …/unarchive` y `GET …/characters/archived`, con su columna, sus sucesos y sus e2e. **Lo que NO existe es el gesto**: `grep -rn "archiv" apps/web/src` da cero, así que el único botón sigue siendo el borrado definitivo | El spec §2.5.8 cierra con «lo que cambia es **cuál de los dos gestos es el fácil**», y hoy no cambia ninguno: **la premisa de esta ficha sigue vigente palabra por palabra** con la aplicación en producción. La revisión de cierre del 2026-09-04 la encontró tachada sin estarlo. **Entra con la pantalla de personajes del carril gráfico**, y hasta entonces no se vuelve a dar por cerrada |
| **M10a** | ~~**Revocar una concesión de visibilidad**~~ **— MITAD FALSA, comprobada el 2026-09-05.** `entities.service.ts:171` hace `deleteMany` y reescribe las concesiones al editar: **revocar sí se puede**. La ficha decía lo contrario | **Lo que sigue vivo es M10b** |
| **M10b** | **Editar en silencio** — la hidra falsa (respuesta 2). El DM cambia una ficha ya revelada y nadie se entera. Es un problema distinto del de revocar, y por eso se parten | Sin resolver. Hoy `EntityVisibilityGrant` se crea y no se quita | «Fase 1 ampliada» según el documento de respuestas; no depende del motor. Su regla difícil ya está decidida y no hay que perderla: **las notas del jugador NO se borran**, porque el terror nace de que sus apuntes contradigan su memoria |
| **M11** | **Que un jugador comparta lo que le revelaron** (respuesta 3) | Decisión abierta: o crea una concesión de verdad —que el DM ve y puede revocar, coherente con M10— o es un gesto social fuera del sistema. La primera es más trabajo y mucho más interesante |

## Pedido por el autor el 2026-09-02, colocado — antes de 2A

Razonado en [el análisis de las seis peticiones](./superpowers/specs/2026-09-02-seis-peticiones-analisis.md).
Los puntos 4 (modales) y 5 (líneas del acceso) ya están hechos; el 6 entró en el plan de 2A.

| | Qué | Por qué aquí y no después |
|---|---|---|
| **A1-avisos** | **La bandeja de notificaciones está construida por dentro y no existe por fuera.** La mitad hecha: `apps/api/src/notifications/` tiene tabla `Notification`, servicio, y controlador con `GET /notifications` y `POST /notifications/read`, alimentado por los eventos de dominio. La mitad que falta: **ningún fichero de `apps/web/src` llama a esos endpoints** —comprobado por búsqueda, cero coincidencias—, así que no hay bandeja en la cabecera ni en ninguna parte | La aplicación **sí** registra lo que pasa, y **no se lo enseña a nadie**: quien recibe una invitación o un comentario no se entera si no va a mirar. Cerrarlo es trabajo solo de pantalla, no de API. **Esta ficha decía «hoy la aplicación no le cuenta nada a nadie»**, y esa media verdad hizo creer más de una vez que faltaba el módulo entero |
| **A2** | **Invitar por correo a un usuario que ya tiene cuenta**, sin pegar enlaces. **La respuesta del servidor debe ser idéntica exista o no la cuenta**, o se convierte en un comprobador de padrón | Es lo que el autor pedía de verdad al hablar de «amigos», por una fracción del coste. Un grafo social duplica la pertenencia a campaña, que es la unidad real del producto |
| **A3-invitaciones** | **Invitaciones con usos máximos, caducidad y revocación** | Hoy es un enlace por persona —decisión declarada— y montar una mesa de cuatro exige generar cuatro. **Un enlace eterno no**: acaba circulando por un grupo y la visibilidad se apoya en quién es miembro |

## Reseño de interfaz (2026-09-02) — lo que dejó abierto

Lo entregado está en [07-historial](./07-historial.md) y su porqué en
[la auditoría](./superpowers/specs/2026-09-02-auditoria-interfaz.md). Lo que **no** entró:

| | Qué | Por qué importa |
|---|---|---|
| **U1** | **Las sesiones no tienen página de lectura.** Fichas y personajes sí; una sesión se sigue abriendo en su formulario | Es justo la pantalla que el DM mira **durante** la partida. El patrón ya está construido dos veces, así que sale barato |
| **U2** | **La columna de secciones desaparece por debajo de 768 px** y nada la sustituye | En móvil se llega a una sección por URL pero no se puede navegar a ella. Hace falta un desplegable o una tira horizontal |
| **U3** | **Buscar solo mira el nombre**, no el cuerpo de las fichas | Buscar dentro del texto exige hacerlo **en el servidor**: el filtro de pantalla opera sobre lo que `canView` ya dejó pasar, y ampliarlo sería confundir *esconder* con *no mandar*. Ver [04-convenciones](./04-convenciones.md) |
| **U4** | **El panel de campañas no dice cuánto mundo tiene cada una** | Contar fichas bien exige aplicar la matriz de visibilidad, cuyo dueño único es `canView`. Es una tarea con su ficha, no un efecto colateral: hoy se muestran rol, personas y fecha, que no delatan nada |
| **U6** | **Sin prueba de accesibilidad automática ni de móvil real** | Playwright mide contraste y un tamaño de fuente táctil, pero nadie comprueba el recorrido de teclado ni la lectura con ayudas técnicas. El fallo del nombre accesible («PNJ 12») lo cazó una prueba funcional de rebote, no una de accesibilidad |
| **U8** | **Cerrar un diálogo con cambios sin guardar no avisa** | `Escape`, el clic fuera y «Cancelar» descartan lo escrito sin preguntar. Con un cuerpo de ficha en markdown de varios párrafos, eso es perder trabajo de verdad. Lo recomienda la investigación de formularios ([informe](./superpowers/specs/2026-09-02-formularios-estudio.md)) y no entró por tiempo |
| **U9** | **`Guardar` deshabilitado en vez de `aria-disabled`** | Un botón `disabled` sale del recorrido de teclado, así que quien navegue con teclado o lector de pantalla no puede llegar a él **ni leer por qué** no puede guardar. La aplicación ya pone el motivo en pantalla; falta que el control sea alcanzable |
| **U10** | **El texto que explica la visibilidad no está atado a `canView`** | Las frases de `features/entities/visibilidad.ts` describen la matriz del servidor y **ya mintieron una vez** (prometían que «público» dejaba entrar a quien no fuera miembro). Hoy nada rompe si vuelven a divergir: haría falta una prueba que compare las dos, o aceptar explícitamente que es texto y se revisa a mano |
| **U7** | **El ornamento no se puede apagar.** La cuadrícula y el horizonte se pintan siempre | No se mueven, así que `prefers-reduced-motion` no aplica, pero no hay forma de dejar la pantalla desnuda para quien la prefiera así |

## Lo que dijeron los jugadores (2026-09-02)

Respondieron a las ocho preguntas de la presentación *"Delante de la pantalla"*. El detalle y el
razonamiento están en
[`superpowers/specs/2026-09-02-respuestas-jugadores-design.md`](./superpowers/specs/2026-09-02-respuestas-jugadores-design.md).
Lo que mueve algo:

| | Qué pidieron | Consecuencia |
|---|---|---|
| **Ranuras de equipo** | *"sí, es muy importante"* | El hueco H1 deja de ser recomendación: entra en 2B, con el objeto en **tres** estados (llevado / equipado / sintonizado, tope 3) |
| **Inventario de hechizos** | Es lo primero que nombran al preguntarles qué llevan a mano | **Contradice la exclusión** de la spec de la fase 2. Recomendación: los espacios de conjuro entran como **recurso consumible** en 2A — el mismo contador que la inspiración— y fuera queda solo interpretar cada conjuro |
| **Atributos temporales** | *"subidas y bajadas de atributos temporales"* | Hueco nuevo: un **modificador con caducidad** no está escrito ni en 2A ni en 2C |
| **El DM edita sin avisar** | Con ejemplo: la **hidra falsa** | Hace falta **revocar** una concesión de visibilidad —hoy solo se puede conceder— y un interruptor de edición silenciosa. **Las notas del propio jugador no se borran**: es lo que hace que el truco funcione en la mesa |
| **Compartir lo revelado** | *"si la quiero o no compartir"* | Capacidad nueva: que un jugador pase a otro lo que le contaron. Decidir si crea concesión (y el DM la ve y puede revocarla) |
| **Varios personajes** | *"que se queden guardados como recuerdos… te pueden revivir"* | Un personaje **se archiva, no se borra**. Barato ahora; el borrado de hoy es definitivo |
| **Móvil** | *"aunque es incómodo, sería interesante"* | Cada pantalla nueva se decide también en estrecho. Ya hay medio pago hecho: suelo de 16 px en controles táctiles (1.19b) |

Sin cambios, y confirmado por ellos: no hace falta ver las tiradas ajenas en vivo (el sondeo
basta) y los dados con física siguen siendo una opción, no una prioridad.

## Antes de ejecutar 2A — huecos del alcance, sin decidir (2026-09-01)

Salieron de una pregunta del autor: *"¿hay un sistema de manos? me pongo un escudo que me da más
CA pero llevo un arma en la otra"*. La spec dice que los objetos se **equipan y desequipan** y
**nunca dice dónde**: no hay ranuras. Buscando huecos de esa misma forma —la regla lo exige, la
mesa lo toca pronto, y el alcance no tiene dónde ponerlo— aparecieron **doce**, en
[`superpowers/specs/2026-09-01-huecos-fase-2-design.md`](./superpowers/specs/2026-09-01-huecos-fase-2-design.md),
con 16 preguntas para el autor.

> **Los cuatro de abajo están decididos desde el 2026-09-02**, en ausencia del autor y con su
> permiso expreso: manos **reservadas como columna en 2A y modeladas en 2B**; descansos y dados
> de golpe **en 2A**; PG temporales **en 2A, como columna propia**; pericia **en 2A, como tercer
> estado por habilidad**. El razonamiento, y lo que cuesta si algún fallo está mal, en
> [la parte 2 del plan, §1](./superpowers/plans/2026-09-02-fase-2A-parte-2-eventos-distancias-y-cierre.md).
> Se conserva el planteamiento tal cual porque explica **por qué** había que decidirlos antes de
> la primera migración:
>
**Los cuatro que hay que decidir antes de la primera migración**, porque cambian la **forma** de
una tabla y después salen caros:

| | Hueco | Por qué corre prisa |
|---|---|---|
| ~~**H1**~~ **CERRADA por 2B**, verificado el 2026-09-03 contra `apps/api/prisma/schema.prisma` (`EquipSlot` y `requiresAttunement` existen) | ~~Ranuras de equipo, y el estado de un objeto como tres (llevado / equipado / sintonizado, con tope de 3), no como un booleano~~ | Toca la fórmula de CA, que **no es una suma**: la armadura sustituye la fórmula y limita la Destreza |
| ~~**H2**~~ **CERRADA por 2A/2C**, verificado contra `apps/api/src/character-state/rest/` (módulo completo, con dados de golpe y las reglas de tiempo de 2C) | ~~El descanso está a medias: hay gatillo, pero nada restaura los PG y los dados de golpe no existen~~ | Es el bucle más frecuente de una sesión; sin él la mesa corrige PG a mano y deja de fiarse de la pantalla |
| ~~**H3**~~ **CERRADA por 2A**, verificado contra `character-sheet.service.ts` (`tempHp` en diez sitios; se gastan primero y no se suman a los actuales) | ~~PG temporales: el daño los atraviesa tal como está escrito~~ | Error silencioso dentro de un registro que se declara inmutable |
| ~~**H4**~~ **CERRADA por 2A**, verificado contra `packages/shared/src/rules/trace.schema.ts` (los cuatro estados existen, y un comentario explica que un booleano no puede representar la pericia) | ~~Pericia (competencia doble): el modificador solo conoce competencia como booleano~~ | La hoja del pícaro dirá +5 donde la regla dice +7 |

**Y dos ausencias completas**, no decisiones: **el dinero** no aparece ni una vez en las 805
líneas de la spec, y **un objeto del inventario no tiene visibilidad** — el DM prepara la
mazmorra el jueves y la mesa le ve el botín el viernes.

**Esto no se decide de pasada.** La spec de alcance es un registro fechado y no se reescribe:
las decisiones que salgan de aquí entran en el plan de 2A, con su firma.

## Despliegue — abierto tras escribir la pila (2026-09-02)

Hay servidor (`vps1new`), dominio (`dnd.supportive.pro`) y autorización, y existe
`docker-compose.prod.yml` con su procedimiento en [03-despliegue.md](./03-despliegue.md).
**Ejecutado contra el servidor el 2026-09-02**: la plataforma está en producción en
`dnd.supportive.pro`. Con ello se cierran **D1, D2, D4 y D6** (ver
[07-historial.md](./07-historial.md)). Lo que sigue abierto:

| | Qué | Por qué importa |
|---|---|---|
| **D3** | **La API no tiene endpoint de salud** | No hay `@Controller("health")` ni controlador raíz: `GET /` responde 404. La comprobación del compose acepta ese 404 como señal de vida, así que **detecta un proceso caído pero no una base de datos caída**. Un `/health` que haga un `SELECT 1` es un cambio de código con su propia ficha, no un efecto colateral |
| **D5** | **Nadie ha restaurado nunca una copia de *esta* base** — ahora con más motivo: ya existen copias diarias reales que nadie ha probado a restaurar | Una copia sin restauración probada es una hipótesis. Requisitos reales de la restauración en [03-despliegue.md](./03-despliegue.md) |
| **D7** | **Corregir `TRUST_PROXY` en Coolify sale caro** | Ahí las variables de entorno son argumentos de construcción: cambiar una **recompila la imagen**. Por eso el valor vive en el compose y no en la UI |
| **D8** | **Recuperar la contraseña olvidada sigue bloqueada: no hay servicio de correo** | Era "se decide junto al despliegue", y el despliegue ya está aquí. Hoy, un usuario que olvide su contraseña **no tiene salida**: el DM no puede reiniciarla y no hay correo que mandar. Hace falta decidir proveedor (y sus variables) o aceptar explícitamente que la primera mesa vive sin recuperación |

## Antes de desplegar — seguridad

**Auditoría hecha el 2026-09-01 sobre el commit `4a3fe43`, con todos los hallazgos verificados
en el código.** El detalle, la evidencia y el orden de arreglo están en
**[`superpowers/specs/2026-09-01-endurecimiento-seguridad-design.md`](./superpowers/specs/2026-09-01-endurecimiento-seguridad-design.md)**
— ahí está todo, para no tener que auditar otra vez.

Lo que **sí** está cubierto (comprobado, no supuesto): inyección SQL, XSS, validación de
entrada, contraseñas con argon2, autorización en el servidor y ausencia de secretos en el
código.

Lo que falta, y va como **tarea 1.18**:

| | Hallazgo | Gravedad |
|---|---|---|
| 7 | El token vive en `localStorage` — compromiso conocido, no urgencia | Bajo |
| 8 | **HECHO a medias** (1.18a, mitad de servidor): ya se puede cambiar el nombre visible y la contraseña por API —exigiendo la actual, verificada con argon2—, y cambiarla **invalida los tokens anteriores**. Falta la **pantalla** (va en 1.18b). **Recuperarla si se olvida sigue BLOQUEADO**: necesita servicio de correo, que no existe; se decide junto al despliegue | web |

### Deuda de la capa visual, tras 1.19b (2026-09-01)

Las 19 pantallas están convertidas: cero clases de paleta de Tailwind en `apps/web/src`, el
interruptor de tema vive en el chrome, y el contraste se mide sobre pantallas **reales** en los
dos temas. El defecto que motivó la tarea está cerrado: el distintivo `DM_ONLY` en tema claro
pasó de **1,10:1 a 5,95:1**.

Lo que queda abierto:

- **Faltan `--warning` y `--success`, y tres sitios pagan por ello.** Los usos viejos de `amber`
  y `emerald` se remapearon a los tokens existentes; siete de los once quedaron bien o mejor
  (dos eran avisos mal etiquetados que ahora son rojos de verdad), pero tres perdieron su
  registro: el aviso de que generar otro enlace **no anula los anteriores** (arreglado en
  falso con `--danger-text`, que dice "peligro" donde toca decir "cuidado"), la razón por la
  que no puedes editar una fila —que hoy se lee como metadato, igual que las etiquetas— y el
  "Copiado." del panel de invitaciones, que usa el color de los enlaces. **Está esperando una
  decisión del autor entre dos direcciones de paleta**, con los hexadecimales ya medidos en los
  dos temas. No se inventa un color mientras tanto.
- **La densidad quedó en 14 px de base**, decidida con las pantallas delante y no como efecto
  colateral. Los controles de formulario llevan **suelo de 16 px en pantallas táctiles**
  (`@media (pointer: coarse)`), porque por debajo de eso iOS Safari hace zoom al enfocar — la
  primera versión del arreglo argumentaba que el riesgo no aplicaba "porque cada control lleva
  clase explícita", y lo que dispara el zoom es el tamaño **calculado**.
- ~~**La interfaz sigue mezclando idiomas**~~ — **CERRADA (2026-09-05)**: cero coincidencias de
  *Email*, *Password* o *Log in* en `pages/LoginPage.tsx`. Texto original: ~~la pantalla de entrar dice *Email*, *Password* y
  *Log in* en inglés, contra la regla del proyecto (interfaz en español). No se tocó dentro de
  una tarea de color; es tarea propia, y arrastra los localizadores de los recorridos de
  navegador.

### Deuda nueva aceptada en 1.18b (2026-09-01)

- **El mensaje de «se cerró tu sesión» solo se limpia al iniciar sesión con éxito.** Si el
  usuario se va a otra pantalla sin entrar, el mensaje sigue pendiente en memoria y reaparece la
  próxima vez que monte el inicio de sesión en la misma pestaña. Solo en memoria, desaparece al
  recargar.
- **La rama de error del detalle de campaña dice «no existe o no tienes acceso» ante cualquier
  fallo de la consulta**, incluido un 500 pasajero o una conexión caída (no hay reintentos). Un
  mensaje que distinga por código sería más honesto, pero es un cambio más ancho que el hallazgo
  que lo motivó.
- **El aviso «no puedes editar esto» de una fila sigue midiéndose solo en la página de tokens**,
  no en la pantalla de un jugador que no sea el creador — haría falta un segundo contexto de
  navegador en el recorrido. El resto de las mediciones sí son sobre pantallas reales.

### Deuda nueva aceptada en 1.18a (2026-09-01)

Cada línea es un compromiso conocido, no un descuido:

- **`JwtStrategy.validate` consulta la base en CADA petición autenticada**, y carga la fila
  entera del usuario (el hash incluido) para devolver dos campos. Es el precio de invalidar los
  tokens al cambiar la contraseña: el token no lleva ninguna señal de un cambio posterior, así
  que la única forma es preguntar a la fuente de la verdad. Si algún día pesa, la salida es un
  `select` estrecho y, si aún pesa, caché corta.
- **Cerrado el 2026-09-02:** `POST /auth/register` y `POST /invites/:token/accept` llevaban
  límite de intentos **sin ninguna prueba que se pusiera roja si se quitaba el decorador**. Ya la
  tienen, comprobada por mutación. De paso se descubrió que el guardia de Nest indexa por
  `Controlador-manejador-IP`, así que **cada ruta tiene su propio cubo** y no compiten por el
  presupuesto — lo que sí competía era la preparación de la prueba de contraseña, que se
  registraba por HTTP; ahora crea el usuario por dentro.
- **`AUTH_RATE_LIMIT` (5/min) condiciona la suite e2e**: `auth.e2e-spec.ts` gasta 3 de esas 5
  llamadas en la misma ventana. Quien añada un login de más verá un 429 que parece un fallo de
  credenciales. **La respuesta es reestructurar el fichero, nunca subir la constante.**
- **El `NotFoundException` de `GET /auth/me` quedó inalcanzable**: `JwtStrategy` ya rechaza con
  401 al usuario borrado antes de llegar al controlador. Mejor comportamiento, rama muerta.
- **`PATCH /auth/password` no devuelve un token nuevo**, así que cambiar la contraseña y volver
  a entrar dentro del mismo segundo de reloj puede rechazar el token recién emitido (el `iat` de
  JWT tiene precisión de segundos y el empate se trata como caduco, a propósito). Es también la
  razón de la espera de 1,1 s en la e2e. Devolver un token fresco en la respuesta lo cerraría.
- **Sin prueba automática de que `main.ts` llame a `loadBootEnv()`**: la garantía se movió
  dentro de `buildAdapter()`, donde sí la fija una prueba. La llamada de `main.ts` es cinturón
  y tirantes.

## Tarea 1.17 — cierre real de la fase 1

**Contraste sistemático entre lo que el modelo y la API permiten y lo que la pantalla ofrece**,
hecho el 2026-09-01 al preguntar el autor si había un cuaderno para escribir la historia.
Detalle y evidencia en
**[`superpowers/specs/2026-09-01-cierre-fase-1-congruencia-design.md`](./superpowers/specs/2026-09-01-cierre-fase-1-congruencia-design.md)**.
**Las cuatro subtareas (1.17a-d) están hechas y comiteadas en `main`**: 1.17a en
`cafc434`, 1.17b en `ede6d1e`, 1.17c en `64b1a67`, 1.17d en `158e72d`. Lo único que queda para
cerrar la fase 1 de verdad es jugarla — un gate que el autor tiene suspendido a propósito, ver
"Antes de la primera partida" más abajo en este mismo documento.

| | Hallazgo | Dónde falla |
|---|---|---|
| B3 | **No se puede cambiar el nombre visible ni la contraseña**, ni recuperarla si se olvida — va con la **tarea 1.18** (seguridad), no con 1.17 | API + web |

> **B1 y B2, cerrados del todo en 1.17d (2026-09-01).** La tarea 1.17a (mismo día) había
> entregado los tres endpoints con sus pruebas — ver [05-datos.md](./05-datos.md) y la entrada
> de 1.17a en [07-historial.md](./07-historial.md) — pero ninguna pantalla los consumía.
> `CampaignSettings.tsx` y `MembersPanel.tsx` (nuevos, montados en la pestaña "Resumen" de
> `CampaignDetailPage.tsx`) cierran ese hueco: editar nombre/descripción, borrar la campaña,
> expulsar a un jugador y salirse, los cuatro con el mismo criterio de honestidad del resto de
> la pantalla (deshabilitar con el motivo visible, nunca esconder ni afirmar "no tienes
> permiso" mientras el rol se está comprobando). Detalle completo en la entrada de 1.17d en
> [07-historial.md](./07-historial.md).

> **C1 tampoco se marca cerrado del todo:** la tarea 1.17c (2026-09-01) entregó
> `EntityFilterBar` (`features/entities/EntityFilterBar.tsx`) — buscar por nombre y filtrar
> por etiqueta — pero su brief acotaba el trabajo a `EntityTab` a propósito, para no invadir
> la zona de `overview` que 1.17d editaba en paralelo. `SessionsTab` y `CharactersTab` (mismo
> fichero, `CampaignDetailPage.tsx`) siguen sin buscador ni filtro. Ver la entrada de 1.17c en
> [07-historial.md](./07-historial.md).

> **A1 (las fichas sin cuerpo de texto) no está en esta tabla a propósito**: tiene su propia
> sección, **P0** (abajo), porque va **antes** que el resto de 1.17, no dentro. Las dos
> secciones lo situaban de forma contradictoria — aquí se deja solo la remisión.

**Deuda nueva, aceptada a conciencia al cerrar 1.17c:**

- **Una etiqueta seleccionada puede sobrevivir a su propio botón.** Si se borra la única
  entidad de la pestaña que llevaba una etiqueta mientras esa etiqueta está seleccionada en
  el filtro, `availableTags` se recalcula sin ella (ya no hay ninguna entidad que la lleve) y
  su botón desaparece de `EntityFilterBar`, pero `filter.tags` sigue conteniéndola — la
  lista queda en "Ningún elemento coincide con el filtro." de forma permanente hasta que se
  pulse "Quitar filtros". Es recuperable: "Quitar filtros" sigue visible porque se renderiza
  según `value.tags.length`, no según si esas etiquetas siguen teniendo botón. **Decisión
  deliberada, no un descuido**: reconciliar las etiquetas seleccionadas contra las disponibles
  (quitando en silencio la que ya no exista) haría que el contador "N de M" mintiera sobre
  qué se está filtrando de verdad en ese instante. Si esto molesta en uso real, la tarea es
  mostrar la etiqueta huérfana en el filtro igualmente (con algún indicio de que ya no existe
  en la lista), no borrarla del estado sin decirlo.
- **`entity.schema.ts` no impone unicidad en `tags`**: es `z.array(z.string().min(1).max(40)).max(50)`,
  y `parseTags` (`EntityEditor.tsx`) solo recorta espacios y descarta vacíos — escribir
  "lich, lich" persiste `["lich","lich"]` sin que nada lo impida, ni en el cliente ni en el
  esquema compartido. Los distintivos de la fila (`CampaignDetailPage.tsx`, `EntityTab`)
  dedupan con `Array.from(new Set(e.tags))` solo en el render, para no pintar el mismo
  distintivo dos veces ni emitir el aviso de clave de React duplicada; los botones del filtro
  ya eran seguros porque `availableTags` pasa por un `Set`. **No se tocó `parseTags` ni el
  esquema**: decidir si una etiqueta duplicada debe rechazarse al guardar es una decisión
  aparte de esta tarea, no un efecto colateral de pintar la lista.

**Por qué ninguna prueba lo encontró:** la suite entera (unitarias: bloque generado de
[00-INDEX.md](./00-INDEX.md); e2e: [08-pruebas.md](./08-pruebas.md)) verifica que **lo que
existe** funciona;
ninguna puede gritar por lo que falta. Es el punto ciego estructural de una suite, y por eso
este contraste **se repite al cerrar cada fase**.

## Segunda pasada del contraste modelo/API ↔ pantalla (2026-09-01)

**Contraste hecho a mano sobre el commit `70b353c` de `main`**: los 10 modelos de
`apps/api/prisma/schema.prisma` campo a campo, las 35 rutas de la API una a una, y por cada
una la pregunta *"¿quién la usa desde la pantalla?"*. Es la repetición del contraste de 1.17
—que **se repite al cerrar cada fase**— y encontró doce cosas nuevas, con identificadores que
empiezan en **D** para no chocar con los de la pasada anterior (A1–C1, arriba).

**El informe completo no vive en el repositorio**: se escribió fuera, en el directorio de
trabajo de la sesión que lo produjo, así que **lo que hay que conservar está aquí**. Cada línea
lleva su evidencia comprobada contra el código de este árbol, no contra el del día del
contraste — ver la nota sobre líneas desplazadas al final de la sección.

Lo que **sí** quedó comprobado como congruente, para que la próxima pasada no lo recorra otra
vez: comentarios, campañas (desde 1.17d), miembros, los siete campos de `Entity`, y la matriz
de visibilidad entera —los recortes de `features/sessions/SessionEditor.tsx` y
`features/characters/CharacterEditor.tsx` corresponden con los límites reales del modelo
descritos en [05-datos.md](./05-datos.md), y ninguno de los dos editores miente al usuario.
**El núcleo de la promesa —quién ve qué— está entero.** Lo que falta es casi todo *movimiento*:
navegar, buscar, ordenar y administrar la mesa.

| | Hallazgo | Prioridad | Evidencia |
|---|---|---|---|
| D1 | **Cuenta sin pantalla** — nombre visible y contraseña solo cambiables por API. **Ya asignado a la tarea 1.18b**, no es hueco nuevo | P1 — **asignado** | `auth/auth.controller.ts:63` y `:83` exponen los dos `PATCH`; `grep -rn "auth/me\|auth/password" apps/web/src` solo encuentra el `GET` de `features/auth/api.ts` |
| D2 | **No se puede invitar a un segundo DM, ni ascender a nadie**: el rol de un miembro es inmutable de por vida | P1 | `prisma/schema.prisma:73` declara `role Role @default(PLAYER)` y `invites/invites.service.ts:29` lo respeta al aceptar, pero `invites/invites.service.ts:17-19` crea la invitación **sin `role`**, el controlador no acepta cuerpo, y no existe ningún `PATCH .../members/:userId` |
| D3 | **Una invitación no se puede listar ni revocar**: se generan a ciegas y valen para siempre | P1 | `schema.prisma:74-75` escribe `createdAt`/`usedAt` y ninguna pantalla los lee; `invites/invites.controller.ts` tiene exactamente dos rutas (ni `GET` de lista ni `DELETE`); `features/invites/InvitePanel.tsx` solo muestra el último enlace, y solo hasta que se recargue |
| D4 | **La fecha de una sesión no se ve en la lista ni la ordena** | P1 | `schema.prisma:129` la guarda y `features/sessions/SessionEditor.tsx` la edita, pero la fila (`pages/CampaignDetailPage.tsx:220-224`) pinta título y distintivo y nada más; el servidor ordena por `createdAt: "desc"` (`sessions/sessions.service.ts:48`) |
| D5 | **Raza, clase y biografía se editan y no salen en la lista de personajes** | P2 | `schema.prisma:141-144` los guarda, `features/characters/CharacterEditor.tsx` los edita, y la fila (`pages/CampaignDetailPage.tsx:284-285`) pinta nombre y nivel. Relacionado: `GET .../characters/:id` y `GET .../sessions/:id` no los llama nadie, porque el modal de edición se siembra desde el objeto de la lista — no es un fallo, es no tener vista de detalle |
| D6 | **`User.isAdmin` no tiene ninguna puerta de concesión**: es el permiso más potente del sistema y no lo gobierna nada | P2 | `schema.prisma:38` lo declara y `common/visibility.ts:16` lo respeta de verdad (salta toda la matriz de visibilidad); `grep -rn "isAdmin" apps packages` fuera de esos lectores **no encuentra un solo escritor**: solo un `UPDATE` a mano en Postgres |
| D7 | **`Campaign.ownerId` es una segunda fuente de verdad que nadie consulta** | P3 | Se escribe en `campaigns/campaigns.service.ts:20` y ninguna comprobación de autorización lo lee: todas pasan por `membership.requireDM`, que mira `CampaignMember.role`. La web lo declara en su tipo y tampoco lo usa |
| D8 | **Ninguna pantalla muestra ninguna fecha**, comentarios incluidos | P3 | `grep -rn "createdAt" apps/web/src --include=*.tsx` fuera de comprobaciones: **cero**. `features/comments/CommentThread.tsx` pinta autor y cuerpo, sin marca de tiempo |
| D9 | **Seis emisiones de evento sin un solo oyente** — andamiaje futuro, no afecta al usuario | P3 | `campaigns/campaigns.service.ts`, `entities/entities.service.ts` e `invites/invites.service.ts` emiten por `EventEmitter2`; `grep -rn "OnEvent" apps/api/src`: **cero** |
| E1 | **Sesiones y Personajes siguen sin buscador ni filtro**, y **no hay búsqueda que cruce pestañas** — ya declarado bajo la tabla de 1.17, confirmado abierto | P2 — ya declarado | `features/entities/EntityFilterBar.tsx` se monta solo en `EntityTab` de `pages/CampaignDetailPage.tsx` y filtra la lista ya cargada de **un solo tipo**; `fetchAllEntities` (`features/entities/api.ts`) ya trae todos los tipos y solo lo consume el selector de destino de enlaces |
| E2 | **Los enlaces del mundo no se pueden recorrer, y son de un solo sentido** | P1 | `features/links/LinksPanel.tsx` pinta el destino como **texto plano**, no como enlace, así que ver una relación no lleva a ella; y `links/links.service.ts:49` consulta `where: { fromId: entityId }`, así que **no hay enlaces entrantes** — ninguna ficha sabe quién la menciona. **La tercera parte de este hallazgo se cerró el 2026-09-02**: el panel ya no vive dentro del editor, sino en la página de lectura de la ficha |
| E3 | **Diez campos con límite en el servidor que la pantalla no anuncia**, y el error vuelve crudo y en inglés | P2 | `grep -rn "maxLength" apps/web/src`: **cero**; el único límite en cliente es `min`/`max` del nivel (`features/characters/CharacterEditor.tsx:151-152`). Los límites reales viven en `packages/shared/src` (`campaign.schema.ts`, `entity.schema.ts`, `session.schema.ts`, `character.schema.ts`) |
| E4 | **Las etiquetas duplicadas se siguen persistiendo** — ya declarado como deuda aceptada de 1.17c, confirmado abierto y sin novedad | P3 — ya declarado | `packages/shared/src/entity.schema.ts:14` no impone unicidad y `parseTags` (`features/entities/EntityEditor.tsx`) tampoco; la fila dedupa solo al pintar |

**Lo que estas líneas significan en una mesa real**, ordenado por cuándo duele y no por
dificultad, porque es la pregunta que hizo el autor:

- **Antes de sentarse, el DM no puede tener un co-DM** (D2). Si la mesa tiene dos narradores,
  uno entra como jugador y ve la campaña como jugador, sin camino de vuelta: nadie puede
  ascender a nadie y `campaigns/membership.service.ts` prohíbe al DM salir. Peor: como la
  **recuperación de contraseña está bloqueada** (ver abajo), si esa cuenta se pierde **la
  campaña queda huérfana para siempre**. D2 y D1 juntos son un modo de fallo, no dos molestias.
- **No sabe qué invitaciones ha mandado ni cuáles siguen vivas** (D3). Con cuatro jugadores son
  cuatro enlaces irrevocables y sin registro; si uno se filtra en un chat de grupo, no hay nada
  que pulsar. `InvitePanel.tsx` es honesto y lo dice en pantalla, pero eso documenta el
  problema, no lo resuelve.
- **Preparando el mundo, no puede recorrer los enlaces que acaba de crear** (E2). Es el
  hallazgo más importante de la pasada y es de dirección inversa: la pantalla **ofrece** una
  wiki de entidades enlazadas y **no deja andar por ella**. Es literalmente lo que el paso 2 de
  [09-jugar.md](./09-jugar.md) llama *"el valor de la herramienta"*.
  Y como no hay enlaces entrantes, la ficha del NPC no sabe en qué misiones sale, que es la
  forma en que se pregunta de verdad.
- **Durante la partida, nadie sabe cuándo es la próxima sesión sin abrirlas una a una** (D4), y
  un jugador no ve quién es quién en el grupo más allá del nombre y el nivel (D5).

**La recuperación de contraseña no es un hueco simple y no se cuenta como tal.** Está
**bloqueada por un servicio de correo que no existe**, y así está declarado en el propio código
(`packages/shared/src/auth.schema.ts:18-20`: *"Password RECOVERY (forgotten password) is out of
scope — it needs an email service that doesn't exist"*). Es una **decisión de despliegue**, se
toma junto con el VPS (ver [03-despliegue.md](./03-despliegue.md)), y hasta entonces agrava a
D2 en vez de resolverse por su cuenta. Ya está dicho así en la fila 8 de la tabla de seguridad,
arriba; se repite aquí porque D2 la convierte en algo peor que una molestia.

**Coste declarado, para poder decidir sin volver a mirar el código:** D4 y D5 son triviales
(una línea en la fila, un `orderBy`); D2 es bajo en el servidor —una entrada de cuerpo en
`POST /campaigns/:id/invites` reutilizando el `roleSchema` que ya existe en
`packages/shared/src/visibility.schema.ts`— y medio si además se quiere cambiar el rol de un
miembro ya dentro (hay que decidir qué pasa si el último DM se degrada); D3 es medio-bajo; E3
es bajo si la respuesta es traducir el error de Zod una sola vez en `lib/api.ts`; E2 es el
caro, porque su arreglo de verdad es **una página de detalle de entidad con URL propia**, y los
otros dos puntos —enlace navegable y enlaces entrantes— dependen de ella para no quedarse en
parche. D6 y D7 son **decisión, no código**: o se le da una puerta a `isAdmin` y se declara
cuál de las dos fuentes manda sobre "quién manda aquí", o se escribe que son de mantenimiento
manual — pero D7 se rompe solo en cuanto exista D2.

**Dos cosas que conviene no leer mal:**

- **Ninguna prueba iba a encontrar nada de esto.** La suite (unitarias: bloque generado de
  [00-INDEX.md](./00-INDEX.md); navegador: [08-pruebas.md](./08-pruebas.md)) verifica que **lo
  que existe** funciona. Nada puede ponerse rojo porque un enlace no sea navegable, porque la
  fila de una sesión no pinte su fecha o porque un campo del esquema no tenga escritor. Es el
  mismo punto ciego estructural que motivó el contraste de 1.17.
- **Las citas del informe original apuntaban al commit `70b353c`.** Las de esta tabla están
  reescritas contra el árbol actual, porque la tarea 1.19b (`1bf0351`, capa de tokens)
  reordenó los ficheros de `apps/web/src` y desplazó sus líneas — las de `apps/api` y
  `packages/shared` no se movieron. Si alguien recupera el informe original, sus números de
  línea de web hay que leerlos sobre `70b353c`, no sobre `main`.

## El despliegue de la fase 2, y cómo se verifica (decidido 2026-09-03)

**No se despliega por bloques.** Se despliega **al cerrar la fase 2 entera**, y la verificación
final no es una suite: es **una partida de prueba real**, decidida por el autor.

- Dos cuentas de jugador — **dos, no más** — y la cuenta del autor **como DM**.
- Una campaña de verdad, jugada por agentes: crear personajes, repartir equipo, equipar, atacar,
  tirar, aplicar una condición, descansar, avanzar el reloj.
- **Es integración, no demostración**: lo que se rompa se anota como ficha con su evidencia, y lo
  que no se pueda hacer se anota igual.
- Hay **permiso expreso del autor** para desplegar en esa prueba; hasta entonces, nada sube.

**Y no bloquea nada de datos, por decisión del autor (2026-09-03).** Se le planteó que la partida
de prueba convertiría el despliegue en «datos que perder» —las cuatro migraciones sin revisar y la
copia de seguridad rota— y contestó que no:

> *«Estamos en un despliegue de desarrollo; lo máximo de datos que hay que perder está en GitHub.
> No debes preocuparte por datos que al final del día vamos a eliminar para la versión final, que
> posiblemente reciban cambios de estructura, o que se puedan corromper durante el desarrollo. De
> momento el único usuario soy yo.»*

Así que **la prueba con agentes es una prueba de campo, no la primera partida de la mesa**: los
jugadores de verdad no entran hasta que haya una versión jugable **con tiempo real**, porque
recargar la página para cada acción es incómodo y eso es la fase 4. Lo que esta prueba busca es
que la base aguante.

**Lo que sigue siendo cierto:** la copia de seguridad rota (el bloque que abre este documento)
tiene su fecha de caducidad en el día que existan datos que a alguien le dolería perder, y ese día
llegará con el tiempo real, no con esta prueba.

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
[09-jugar.md](./09-jugar.md) para cómo se monta esa sesión cuando llegue).
La única carencia que quedaba de la lista original —no se podía borrar casi nada desde la
interfaz— se cerró como tarea 1.16 (ver "Cerrados"). Queda esta:

~~**No hay despliegue.** Sin VPS, la partida se juega en local y los jugadores tienen que estar
en la misma red.~~ — **CERRADO el 2026-09-02, y esta frase llevaba un día siendo falsa.** Está
en `dnd.supportive.pro` y los jugadores entran desde sus casas. Ver
[03-despliegue.md](./03-despliegue.md).

> Es **la misma mentira que había en «Decisiones abiertas»**, escrita en otro sitio: la
> auditoría cazó aquella y esta se quedó, porque nada relaciona dos párrafos que dicen lo mismo
> en un documento de mil líneas. Y el aviso de arriba también caducó: la partida ya no espera al
> tablero, espera al tiempo real, por la decisión del autor del 2026-09-03 que está en
> «Decisiones abiertas».

## P1 — Huecos de verificación

**La accesibilidad se mide a medias, no a cero.** `apps/web/e2e/tokens-contrast.spec.ts` mide
**contraste real en los dos temas** sobre cinco pantallas, y comprueba que un control de
formulario no dispare el zoom de iOS Safari. Lo que **no** existe: recorrido de teclado,
lector de pantalla, viewport de teléfono y rendimiento. Es la misma frontera que declara la
ficha **U6** de este documento.

> Esta línea decía «no hay prueba de accesibilidad… ninguna herramienta lo mira hoy», y se
> contradecía con su propia ficha U6 doce secciones más abajo y con un fichero de pruebas que
> lleva meses en verde. **Dos frases del mismo documento que no se leen la una a la otra es la
> forma más barata de mentir.**

~~**CI nunca ejecuta `pnpm build`.**~~ **CERRADA (2026-09-05, plan 01):** el paso está en
`.github/workflows/ci.yml:47`, **antes de `pnpm lint`** — `packages/shared` tiene que estar
construido para que la API compile contra él, y un error de tipos es más barato de leer que
novecientas pruebas rojas por la misma causa. Comprobado por mutación: con un `const x: number =
"cadena"` en `apps/web/src/main.tsx`, `pnpm build` cae con `error TS2322` y salida 2. Texto
original: ~~`.github/workflows/ci.yml` corre `lint`, `format:check`,
`check:docs`, `check:estado`, `test` y `test:e2e` en el job `test`, pero no llama a `pnpm
build` en ningún paso — el type-check completo de `tsc`/`nest build`/`vite build` de `pnpm
verify` no corre en CI. Detectado durante la revisión de la tarea antideriva (2026-09-01);
decisión explícita del revisor no arreglarlo en esa tarea (fuera de su alcance), dejarlo
anotado aquí en su lugar.~~

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
- **Falta `key` en `EntityTab` al cambiar de pestaña** (`CampaignDetailPage.tsx:313`): hoy es
  inofensivo porque `EntityTab` es la única instancia en esa posición del árbol, pero es un
  riesgo latente si el modal deja de comportarse como modal (p. ej. dos `EntityTab` a la vez).
  Observación del revisor de 1.12a, no arreglado.

## P1 · Un worktree de agente se ramifica de `origin/main`, que lleva desde julio sin actualizarse (2026-09-04)

**Encontrado al fusionar 2.5.5, y le costó a esa tanda una tarde de trabajo sobre una base que ya
no existía.** El worktree de la tarea salió de `origin/main`, no de `main` local. Como este
repositorio **nunca se ha empujado**, `origin/main` se quedó en el commit del arranque de la
sesión: el agente trabajó sin B0, sin 2.5.1, sin 2.5.2, sin B1.x, sin 2.5.3 ni 2.5.4. Se notó en
tres sitios y los tres son del mismo tipo:

- **Escribió en su informe que «no existe ningún `advanceTurn`, no hay módulo de encuentros»**, y
  era verdad en su base y falso en `main`. Lo dejó escrito en una ficha de `06-pendientes.md`, que
  es documentación que miente sin que nadie mienta.
- **Numeró su primera decisión `D-2.5-5`**, que ya estaba ocupada por 2.5.3. Se renumeró al fusionar.
- **Midió los recorridos de navegador en 88** —la cifra de la noche anterior— cuando ya eran 104.

**Puesto `worktree.baseRef: head` el mismo día**, en `.claude/settings.local.json`, así que los
worktrees nuevos salen del `HEAD` local. **Pero ese fichero está en `.gitignore`**: es de esta
máquina y no viaja con el clon, igual que `.superpowers/sdd/progress.md`. La otra mitad —empujar
`main` a `origin`, que lleva sin actualizarse desde julio— **no se ha hecho y es del autor**:
empujar es una acción hacia fuera.

Mientras `origin` siga atrasado, **cada informe de agente hay que leerlo contra `main`, no contra
sí mismo**.

**Y una segunda, del mismo día:** `pnpm db:slot` **falla en un worktree** (`Command "prisma" not
found`; el `shell: true` de `scripts/db-slot.mjs` tropieza con el `&` de la ruta
`D&D-Plataform`). El agente creó y migró su base a mano. Es reproducible.

## P1 · Un PNJ revelado entrega las características de un statblock `DM_ONLY` (2026-09-04)

**Encontrado auditando la documentación, y no lo buscaba nadie: salió de un fallo de prueba.** El
recorrido `pnj-en-la-mesa` comprueba que *«los números de un statblock `DM_ONLY` no llegan al
jugador por la hoja del PNJ»*, y comprueba **la CA y la nota del libro**. No comprueba el resto, y
el resto sí llega.

**Lo que ve el jugador**, sobre el cuerpo serializado de su propia petición —esto es de una corrida
real, no una deducción—:

```
GET .../characters/:id/sheet   (como JUGADOR, sobre un PNJ que el DM subió a PLAYERS)
  "str":18,"dex":8,"con":18,"int":6,"wis":12,"cha":5      ← las del statblock DM_ONLY
  "currentHp":85                                          ← los PG exactos que salen de su dado de golpe
  "sheet":null, "hp":{"max":null}
  "reason":"Los números de este PNJ no son públicos: su ficha es del DM."
```

**La misma respuesta dice que sus números no son públicos y trae seis de ellos.** Con las seis
características se reconstruyen los seis modificadores de salvación y los dieciocho de habilidad
—todo menos el bonificador de competencia— y la iniciativa. Queda escondido lo que `hojaDeStatblock`
sí retiene: CA, PG máximos, competencia, la traza y la nota del libro.

**Cómo pasa, y por qué no es un descuido:** `npcs.service.ts:69` **copia** las características del
statblock a las columnas de la fila de `Character` al instanciar, que es la decisión D-2D-2 —«un
PNJ en la mesa es una fila de `Character`»— y `getSheet` devuelve esa fila entera a quien pasa
`canSee`. Las dos piezas son correctas por separado.

**Y por eso incumple una regla vinculante de interfaz**: *si el texto explica una regla del
servidor y discrepan, miente el texto*. Aquí discrepan.

**No se arregla sin el autor**, porque las dos salidas son decisiones suyas y no equivalentes:

1. **Ocultar las columnas** de un personaje con `statblockRef` a quien no sea el DM o su dueño.
   Es coherente con la frase, y **cambia lo que hoy se envía**: hay que decidir qué sigue viendo un
   jugador de un PNJ revelado (¿los PG actuales, para saber si está malherido?).
2. **Cambiar la frase** y aceptar que revelar un PNJ revela sus características. Es más barato y
   deja el bulto donde está: entonces la garantía real es «no verás su CA ni su traza», no «no
   verás sus números».

**Cierra cuando** una de las dos esté tomada y escrita. La prueba que lo destaparía existe a
medias: `pnj-en-la-mesa.e2e-spec.ts` recorre **cada valor** del cuerpo desde el 2026-09-04, así que
añadir `expect(valores).not.toContain(18)` es una línea — hoy se pondría roja.

## P3 · Dieciocho llamadas arrastran un rodeo que ya no hace falta (2026-09-04, 2.5.6)

**`apiFetch` ya no manda `Content-Type` cuando no hay cuerpo**, que era la causa por la que
Fastify rechazaba con 400 todo POST sin cuerpo. Desde la tarea 1.14, dieciocho llamadas de
`apps/web` llevan el rodeo `body: JSON.stringify({})` con su comentario explicando el 400 —y una
unitaria, `features/level-up/__tests__/api.test.ts`, que fija `expect(init.body).toBe("{}")`—.

**Siguen funcionando**, así que no corre prisa; lo que ya no es cierto son sus comentarios, que
describen un `apiFetch` que no existe. Documentación que miente en dieciocho sitios, aunque sea
en comentarios.

**Cierra cuando** se quiten los dieciocho `JSON.stringify({})` y la unitaria que fija la forma
vieja, en una tanda sola y con la suite de navegador en verde detrás — porque **esto solo lo caza
el navegador**: supertest no pone la cabecera si no hay `.send()`.

## P1 · El panel de dados existe y no lo monta nadie (2026-09-04)

`features/rolls/panel/PanelDeDadosDeLaMesa.tsx` y su cubo tridimensional están construidos,
revisados y en `main`. **`grep -rn "PanelDeDadosDeLaMesa" apps/web/src` devuelve solo su
declaración.** La fila ALTA de la auditoría —*«no hay dados en la mesa: `MesaDeSesion.tsx` no
importa nada de `features/rolls`»*— **sigue exactamente igual que antes de construirlo**.

Cierra con dos líneas en el compositor: una entrada `"dados"` en `RailDePaneles` y el panel montado
**fuera del `<main>`**, con `campaignId`, `sessionId`, `characterId` y `onCerrar`. Va a `z-30`
frente al `z-40` de los cajones, que es como la maqueta los hace convivir.

**Es el caso número cinco de «una ficha no se cierra sin pantalla».**

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

## P2 · Setenta y seis iconos dibujados en ocho ficheros, con conceptos duplicados (2026-09-04)

La auditoría contaba «4 iconos» porque solo miró `ui/Iconos.tsx`. **La aplicación tiene ~76
repartidos en 7 ficheros de `features/`.** Al traer los 23 de la maqueta a `ui/`, ahora hay **dos
escudos, dos mochilas, dos soles, dos lunas y tres lupas**, más los provisionales de cada carril
(`hilo/`, `elenco/`, `dm/`, `taller/`), tres de ellos **idénticos carácter a carácter**.

Ningún carril podía consolidarlo: todos tenían `features/**` prohibido. Todos los ficheros
provisionales lo declaran en su cabecera. **Al deduplicar, ojo con el tamaño**: los de `ui/` usan
`1em` con `align-[-0.125em]`; algunos de carril usan `h-4 w-4`.

## P2 · Tres pantallas revelan la misma ficha, cada una con su copia del predicado (2026-09-04)

El `RevelarAlgo` de `apps/web/src/features/sessions/dm/` (en `main`), el botón por fila de
`PrepararSesion` en `apps/web/src/features/sessions/taller/` (`carril/c4`) y el `BotonRevelar` de
`apps/web/src/features/entities/` (`carril/c6`). Los tres acaban en el mismo
`PATCH { visibility: "PLAYERS" }`
y los tres reimplementan el mismo predicado de «se puede revelar», que es **matiz de visibilidad**
— justo lo que `CLAUDE.md` obliga a escribir una sola vez. **Debe mandar el de
`apps/web/src/features/entities/`** (dueño del dominio, ya exportado); los otros dos conservan su
cajón y le pasan los props.

## P2 · Dos fichas de este documento mienten con un barrido citado dentro (2026-09-04)

**P1 de `ENTITY_REVEALED` llevaba al menos una tanda afirmando, con su `grep` citado, algo que el
código desmentía.** Al buscar más casos aparecieron dos:

| Ficha | Afirma | Realidad |
|---|---|---|
| **E3** | «`grep -rn "maxLength" apps/web/src`: cero» | **37 aciertos** en 10+ ficheros |
| **D8** | «Ninguna pantalla muestra ninguna fecha» | Falsa desde `CampaignList`/`Overview`/`Cronicas`, y `ListaDeReglas` pinta «última vez el 4/9/2026» |

**Una ficha con un barrido dentro envejece igual que el código, y encima parece probada.** Las ~30
secciones sin auditar merecen una pasada con esto en mente.

## P2 · `OWNER_DM` en un statblock se comporta como `DM_ONLY` (2026-09-04)

`statblocks.service.ts:163-171` pasa `createdById: ""` a `canView`, y `canView:26-27` resuelve
`OWNER_DM` comparando con el espectador → **siempre falso para un jugador**. El editor lo ofrece, o
sea que la pantalla promete una frontera que el servidor no aplica. La fila **sí** tiene columna
`createdById`; el arreglo es pasarla. Es la misma clase de mentira que ya se retiró con
`SPECIFIC_PLAYERS` para las criaturas.

**Ola 2 (2026-09-04): media ficha cerrada por el lado de la pantalla.** `EditorDeStatblock.tsx`
**ya no ofrece `OWNER_DM`** (`NIVELES_DE_CRIATURA` es `PUBLIC`/`PLAYERS`/`DM_ONLY`), igual que se
hizo con `SPECIFIC_PLAYERS`: una pantalla no puede prometer una frontera que el servidor no
aplica. Las criaturas ya guardadas con ese nivel conservan su valor —`VisibilityChooser` lo pinta
al final, marcado y no seleccionable—. **Lo que sigue abierto es el hueco de servidor**: pasar
`fila.createdById` en vez de `""` en `puedeVer()`. El día que se haga, `OWNER_DM` vuelve a la
lista del editor con una línea.

## P3 · Deuda menor abierta por el reseño de la mesa (2026-09-04)

- **`stampSessionNoteSchema` acepta el sello vacío.** Los dos compositores lo impiden en pantalla;
  `text` sigue siendo `optional()` sin `min(1)`, así que una llamada directa a la API crea el sello
  que dice «Nota». Y los ya escritos siguen en la base, entrando en la crónica de cierre.
- **`changeHp` no comprueba que el `rollEventId` tenga que ver con ese personaje** ni que sea
  reciente. La guarda de signo del cliente es **la única** defensa contra atar una curación a una
  tirada de daño.
- **`houseTablesEnabled` no tiene `GET`**: la pantalla se ve apagada aunque esté encendido.
- **`concentrationSave`** llega en la petición de tirada y ninguna pantalla dice que lo es.
- **`GET .../statblocks` no devuelve `visibility`** (ficha C6-2).
- **`ENTITY_LINKED` no se escribe nunca**: enlazar dos fichas no deja rastro ni dispara una regla.
- **El taller CONVIVE con las listas CRUD de `CampaignDetailPage`.** Nadie ha perdido nada, pero la
  sustitución de la §2 de la auditoría **no está completa** hasta que se decida qué se cae de ahí.
- **`DISPARADORES_SIN_MOTOR` está duplicado** entre web y API. Caben en `packages/shared/src`; se
  duplicaron **por una frontera de trabajo, no por una imposibilidad**.
- **El taller dispara hasta 18 consultas de enlaces al abrir**, y `refetchOnWindowFocus` las repite.
  La respuesta buena es una ruta de enlaces por campaña.

## P3 · Dos acoplamientos no declarados, destapados al escribir sus pruebas (2026-09-04)

Los dos salieron de probar por mutación módulos puros que nadie había probado. Ninguno es un
defecto hoy; los dos rompen en silencio el día que alguien toque lo que no sabe que sostienen.

- **El aviso de `posiciones.ts` apunta al mando equivocado.** Su comentario avisa de «si alguien
  sube un semieje y olvida el tope», pero **el tope se deriva del propio semieje**
  (`50 ± SEMIEJE_X`), así que subirlo sube el tope con él y no apila nada. El mando que **sí**
  dispara el recorte es **el anillo exterior**, que no está atado a nada: con `1.2` en vez de `1`,
  **731 de 3000** fichas quedan pegadas al borde **en silencio**. La prueba nueva lo defiende y su
  comentario lo dice; el del módulo sigue diciendo lo otro. **Corregir el comentario.**
- **«Gana el más reciente» en `wikilinks.ts` es cierto por acoplamiento.** `resolverCitas` es pura
  y se queda con **la primera de la lista**; que esa sea la más reciente depende de que
  `entities.service.ts:77` devuelva `orderBy: { createdAt: "desc" }`. **Nada en el módulo lo dice
  ni lo garantiza**: el día que un llamante le pase una lista ordenada por nombre, el desempate
  cambia sin que falle nada.

## P4 · `[[bahia]]` no encuentra «Bahía» (2026-09-04)

`normalizar` de `wikilinks.ts` hace `trim`, colapsa espacios y baja a minúsculas, pero **no quita
diacríticos**. Para un mundo escrito en español eso muerde: el DM escribe el enlace sin tilde y la
ficha se anuncia como inexistente. **Era una decisión no declarada**; ahora está fijada por una
prueba cuyo comentario dice que cambiarla la rompe **a propósito**. Se cierra con
`.normalize("NFD").replace(/\p{Diacritic}/gu, "")`.

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

> **Las tres que había aquí eran falsas y se corrigieron el 2026-09-03.** Decían «sin VPS
> asignado / despliegue diferido», «sin sistema de diseño para el MVP» y «las fases 2–5 solo
> tienen alcance, no plan». Se quedaron escritas mientras el mundo alrededor cambiaba, que es
> exactamente cómo una sección de decisiones se convierte en una trampa: quien la lee cree que
> sigue habiendo una decisión que tomar. Lo cierto hoy:
>
> - **Hay despliegue**, en `vps1new` con Coolify + Traefik y dominio `dnd.supportive.pro`,
>   desde el 2026-09-02. Ver [03-despliegue.md](./03-despliegue.md).
> - **Hay sistema de diseño**, desde el 2026-09-02: la capa de tokens y las primitivas de
>   `apps/web/src/ui/`. [04-convenciones.md](./04-convenciones.md) ya lo decía —con esa misma
>   corrección escrita al lado— mientras este documento afirmaba lo contrario.
> - **La fase 2 tiene cuatro planes y está entera** (2A, 2B, 2C y 2D), y las fases 2.5 y 3
>   tienen alcance escrito. Lo que sigue siendo cierto de la frase vieja es su última mitad,
>   y se conserva abajo porque es una regla, no un estado.

- **No se empieza la fase siguiente hasta usar la anterior en una sesión real.** Es la única
  parte de esta sección que nunca dejó de ser verdad, y la que decide cuándo arranca 2.5:
  falta la partida de prueba con jugadores de verdad.
  > **Y conste que la regla se ha incumplido dos veces.** 2A se ejecutó entera entre el 1 y el 2
  > de septiembre sin que ninguna sesión ocurriera, y detrás fueron 2B, 2C y 2D. El riesgo que la
  > regla protegía —construir el motor sin realimentación de mesa— **ya se materializó**, así que
  > la prueba de campo no valida una fase: valida cuatro a la vez. Esto vivía en la guía de juego,
  > donde nadie que buscara el estado del proyecto iba a mirarlo.
- **La mesa de verdad no juega hasta que haya tiempo real (fase 4), por decisión del autor
  (2026-09-03).** En sus palabras, *«es incómodo tener que recargar la página para cada acción»*.
  Lo que sí ocurre antes es la **prueba de campo con agentes** que cierra la fase 2 —dos cuentas
  de jugador y el autor como DM—, y **no la sustituye**: es integración, no una partida. Su ficha
  entera está más arriba, en «El despliegue de la fase 2, y cómo se verifica».
- **Las fases 4 y 5** (tiempo real, 3D/IA) siguen sin plan, solo con el alcance del plan
  maestro. Cada una recibe el suyo al llegar.

## P5 — Dejado fuera a propósito de la tarea antideriva (2026-09-01)

- ~~**`lychee` 0.24.2 queda instalado en la máquina del autor, sin enganchar a nada.**~~
  **CERRADA (2026-09-05, plan 01), y la verdad medida no es la que la ficha esperaba: la
  integración nunca llegó a existir.** Un barrido de `*.yml`, `*.yaml`, `*.json`, `*.toml` y
  `*.mjs` del repositorio, excluyendo `node_modules/` y `.superpowers/`, **no devuelve ni una
  mención**: no hay nada que retirar ni nada que enganchar. La ficha se cierra porque no había
  integración, no porque se haya quitado. Lo que sigue siendo cierto —y por eso se conserva— es
  que **no sustituiría a `scripts/check-docs.mjs`**. Texto original: ~~Se
  engancha en un commit aparte.~~ **No sustituye a `scripts/check-docs.mjs`** — se afirmó eso
  antes de comprobarlo, y era falso: `lychee` mira enlaces Markdown `[texto](ruta)` y URLs; el
  lint propio mira rutas citadas en prosa entre comillas invertidas, referencias
  `fichero.ts:NN` con la línea fuera de rango, y conteos de pruebas fuera de su fuente. Una
  ruta escrita como `` `features/entities/hooks.ts` `` no es un enlace Markdown y `lychee` ni
  la ve. Medido en este repo: 128 enlaces, 15 únicos, `--offline` en 15 ms, cero errores — son
  comprobaciones complementarias, no la misma.
- **MADR (4.0.0) se adopta solo hacia adelante, no con migración retroactiva.** Migrar los
  specs existentes a ese formato contradice la regla de que un documento fechado es un
  registro y no se reescribe (ver `scripts/check-docs.mjs` y la regla de revisión en
  [04-convenciones.md](./04-convenciones.md)). Su primer uso previsto es concreto: las
  preguntas abiertas P0–P8 se han ido amontonando dentro de
  `superpowers/specs/2026-09-01-fase-2-alcance-design.md`, que ya funciona como cajón de
  sastre — cada una es en realidad una decisión pendiente con sus alternativas, o sea un ADR.
  Salen a registros MADR numerados con estado cuando se escriba el plan de la fase 2, no
  antes.

## P6 — Node 20 del proyecto, sin migrar (2026-09-01)

- **La tarea 1.20 solo actualizó el runtime en el que corren las *acciones* de
  `.github/workflows/ci.yml`** (`actions/checkout` a v7, `pnpm/action-setup` a v6,
  `actions/setup-node` a v7, `actions/upload-artifact` a v7 — las cuatro corren ya sobre
  Node 24, según su propio `action.yml`), porque GitHub avisaba de que las forzaba a correr
  sobre un runtime distinto del que declaran. **Eso no toca el Node del propio proyecto**, que
  sigue fijado en 20 en tres sitios distintos y ninguno de ellos se tocó:
  `ci.yml` (`node-version: 20` en los dos jobs), `apps/api/package.json` y
  `apps/web/package.json` (`engines.node: ">=20"`), y `apps/api/Dockerfile` /
  `apps/web/Dockerfile` (`FROM node:20-slim`).
- **Importa porque Node 20 deja soporte de mantenimiento (LTS) el 2026-04-30** — para cuando
  se lea esto puede que ya lo haya dejado —, y a partir de ahí no recibe parches de seguridad.
  No es urgente hoy, pero es deuda con fecha de caducidad conocida, no indefinida.
- Migrar el Node del proyecto (probablemente a 22 LTS, o a la LTS vigente en el momento) es
  una tarea aparte, con su propio alcance: subir `engines`, `ci.yml` y ambos Dockerfiles a la
  vez para que no queden desincronizados, y comprobar con pruebas reales (`pnpm verify`,
  `pnpm --filter @dnd/api test:e2e`, `pnpm --filter @dnd/web e2e`, y build de las imágenes
  Docker) que nada se rompe con el cambio de runtime — no basta con que el CI actualizado en
  esta tarea siga en verde, porque eso no ejercita esa migración en absoluto.

## Cierre de la fase 2A — lo que las auditorías del 2026-09-02 encontraron

Tres auditorías cruzaron **toda** la documentación contra el código el día del cierre. Lo que
sigue es lo que **no** se arregló en el mismo commit; lo arreglado está tachado arriba.

Tres patrones se repitieron, y merece la pena nombrarlos porque van a volver:

1. **Función con prueba y sin llamador.** `seedResourcesFor`, `assertNoUnknownChoices` y
   `recordEntityOpened`: las tres existían, las tres tenían prueba unitaria en verde, y a las
   tres **no las llamaba nadie**. Una prueba unitaria verde no dice que la función se use.
2. **Un comentario que afirma una igualdad y nada la comprueba.** El previo de subida de nivel
   decía «se toma de `sheetTo` para no calcular dos veces el mismo número por dos caminos que
   podrían discrepar» — y discrepaban: el destino salía de la hoja derivada y el delta de la
   columna en bruto, así que el enano leía «13 → 22 (+8)». Lo cazó un recorrido de navegador.
3. **La regla del juego copiada en el navegador** porque el servidor no la exponía: la velocidad
   efectiva, y el catálogo de razas y clases.

| # | Qué falta | Por qué importa |
|---|---|---|
| **S10-vocabulario** | **La lista de `labelKey` de `vocabulario.ts` se escribe a mano.** Nada falla si el catálogo estrena una clave nueva | Es la mitad que quedó de S5. La prueba que hace falta compara el conjunto de `labelKey` que el catálogo puede emitir contra las claves del diccionario |
| **S11** | **Los tipos de respuesta del motor y del previo de nivel viven dos veces**: en `apps/api/src/rules-engine/engine/types.ts` y `level-up.service.ts`, y calcados a mano en `apps/web/src/features/rules/api.ts` y `features/level-up/api.ts` | Si el servidor cambia esa forma, **nada lo detecta**. Es el mismo patrón que ya se aceptó para la hoja, pero con más superficie. Candidato claro a `@dnd/shared` |
| **S12** | **`listTracesQuerySchema` y `levelUpPreviewQuerySchema` viven fuera de `@dnd/shared`** | `docs/01-arquitectura.md` dice que la forma de los datos vive en un solo sitio y **eso ya tiene dos excepciones**. O se declara la excepción (los esquemas de consulta locales a un endpoint pueden vivir junto al controlador) o se mueven |
| **U6-visibilidad** | **`VISIBILITY_CONFIG` no se exporta desde `ui/Badge.tsx`** | La pantalla del motor no puede nombrar un nivel de visibilidad dentro de una frase sin duplicar las cinco etiquetas, así que parte la frase y pinta una insignia al lado |
| **U7-contraste** | **La pantalla de subida de nivel no tiene medición de contraste en navegador** | El resto de pantallas sí. Los tokens que usa están medidos, pero **en otros contextos**, y la regla del proyecto es que lo que solo se ve maquetado se mide donde se maqueta |
| **U8-glifos** | **Seis glifos de fuente incumplen la regla de iconos dibujados**, incluido el `✓` que la propia regla pone como ejemplo prohibido | En `InvitePanel`, `AccountPage`, `LoginPage`, `Field`, `Traza` y `Ornament`. O se dibujan como el resto, o `docs/04-convenciones.md` amplía la excepción por escrito — que es lo que la regla exige. Lo que no puede quedarse es la regla conviviendo con su propio contraejemplo |
| **N3-notify** | **`NOTIFY` del motor de reglas no llega a la bandeja** | No hay tipo de aviso equivalente. La pantalla lo dice en vez de prometerlo, que es lo correcto, pero el efecto está a medias |
| **N4** | **El listado de propuestas no trae el nombre de la regla**, solo su identificador | La pantalla lo cruza con la lista y, si no está, pinta «regla borrada». Es un dato que la API debería dar |
| **D9** | **Cinco módulos de la API no tienen pantalla**: log de partida, listado de tiradas, avisos, marcas y conjuntos del mundo, y el estado de sesión (empezar y cerrar) | `docs/01-arquitectura.md` los describe como si el producto los ofreciera; hoy se usan **solo con un cliente HTTP**. Para la partida de la semana que viene lo que más se echa en falta es **empezar y cerrar sesión desde la pantalla**: sin eso, todos los sucesos se escriben fuera de sesión |
| **X1** | **`RestKind` es un enum muerto en la base**: no lo usa ningún modelo ni campo | O se borra con su migración, o se declara por qué se deja. Hoy no está escrito ninguna de las dos cosas |

### Huecos de mecánica — lo que falta para jugar de verdad

Ordenados por lo que duele en la mesa. **Ninguno es de la fase 3**: todos caben en lo que ya
existe, y por eso están aquí y no en un plan futuro.

| # | Mecánica | Qué se rompe hoy | Dónde encaja |
|---|---|---|---|
| ~~**M14**~~ | **CERRADA el 2026-09-04**, y en dos mitades: **2.5.2** puso el orden de iniciativa, los turnos y los asaltos en el servidor —con el agrupamiento del SRD para criaturas idénticas— y **2.5.6** los puso en la mesa, como una tira encima del elenco. La parte que arrastraba a las condiciones ya venía pagada por una decisión vieja: el reloj de campaña está en segundos porque un asalto son seis (D-2C-1), así que `advanceTurn` avanza el mismo contador y una condición de dos asaltos se apaga sola al segundo. **Lo escrito aquí durante unas horas decía que «no existe ningún `advanceTurn`»**: era verdad en la base de la que salió esa tanda y falso en `main`, y es el precio de que un worktree se ramifique de `origin/main` sin actualizar (ver la ficha de infraestructura, abajo) | Cerrada |
| ~~**M15**~~ | **CERRADA el 2026-09-04 (2.5.4)**: `changeHp` acepta `rollEventId` opcional, comprobado contra la base (uno inventado o de otra campaña es 400) y guardado en `HP_CHANGED`. «¿De qué murió Elara?» ya responde tipo **y** tirada | Cerrada |
| ~~**M16**~~ | **CERRADA el 2026-09-04 (2.5.5 en servidor, su pantalla el mismo día).** El panel de tirada pinta el aviso —«Desventaja sugerida: Envenenado», con todas las causas y el agotamiento con su nivel— como `role="status"`, **preselecciona el modo y no lo impone**: los tres radios siguen enteros al lado, que es D-2.5-6 dicha en la interfaz. Con fallo automático no preselecciona nada, porque el modo no describe lo que va a pasar. La hoja pasa una sugerencia **por característica** en las salvaciones y una sola para las dieciocho habilidades. Historia previa: | El hermano de `effective-speed.ts` existe —`apps/api/src/character-state/roll-mode/suggested-roll-mode.ts`, puro, con las quince condiciones del SRD y sus citas— y `GET …/sheet` devuelve `rollSuggestions` con el ataque, la prueba y las seis salvaciones, cada una con sus causas. **Lo que falta es el consumidor**: ningún componente de `apps/web` lee ese campo, así que en la mesa el aviso no aparece. Mismo patrón que M17 y que `ENTITY_REVEALED`. Cierra cuando la hoja y el panel de dados lo pinten, con el modo preseleccionado y **todavía editable** — sugiere, no impone |
| ~~**M17**~~ | **CERRADA el 2026-09-04, esta vez con pantalla.** El selector de condiciones ofrece «Concentración» —en un `optgroup` aparte, «De la mesa, no del manual», porque **no es una de las quince del SRD**— con el conjuro en un campo de texto: la clave se guarda normalizada (`concentrating-bendicion`) y el nombre tal cual en `note`, que es el campo del servidor para el texto. La fila dice «Concentración en Bendición» y **lo que el servidor de verdad hace**: al recibir daño, salvación de Constitución con CD 10 o la mitad. Recorrido de navegador de punta a punta: marcar, encajar 25, y ver la petición con CD 12 donde el jugador la sondea. Historia previa: **REABIERTA el 2026-09-04**, y se cerró sin mirar la pantalla. El servidor está hecho: `changeHp` pide la salvación de siempre (2C.5, `RollRequest`) cuando un personaje con una condición `concentrating-*` **toma** daño —antes de los PG temporales, y no si cae a 0: *«you lose concentration … if you are incapacitated»*—, CD `max(10, floor(daño/2))`, una por golpe sin deduplicar (SRD 5.1, "Casting a Spell"). **Pero `grep -rn "concentrat" apps/web` no devuelve nada**: el selector de condiciones solo ofrece las quince claves del SRD, así que ninguna pantalla puede marcar a nadie como concentrado y la regla no se dispara jamás en una mesa real. Mismo patrón que `ENTITY_REVEALED` (ficha P1). **Cerró cuando** una pantalla pudo escribir `concentrating-*`, y eso fue el mismo día | Cerrada |
| ~~**M18**~~ | **CERRADA el 2026-09-04 (2.5.1)**, y llevaba dos tandas diciendo lo contrario. `damageType` es **una columna real e indexada** de `GameEvent` —promocionada antes de escribir mil sucesos, como manda la convención— y las resistencias, vulnerabilidades e inmunidades reducen de verdad, encadenándose en el orden del SRD (*«Resistance and then vulnerability are applied…»*, el matiz que la traducción española pierde). El registro publica el daño **aplicado**, no el bruto, para no filtrar por la línea de tiempo una resistencia secreta | Cerrada |
| **L5** | **El DM no puede declarar «este personaje no ve»** | Es la mitad barata del hueco de iluminación, y **no necesita mapa**: declarar la restricción cabe en las condiciones de clave libre que ya existen; lo que necesita posiciones es *resolver* el arco. Hoy la única herramienta del DM es cambiar la visibilidad de las fichas a mano, una a una, sin dejar dicho por qué | Vocabulario, chip en la hoja, y —crítico— que quede claro en pantalla que es **ficción, no permiso** |

> **Y el límite que conviene escribir en voz alta, porque no es un hueco sino una frontera:**
> la aplicación **no modela qué ve un personaje; modela qué le está permitido leer.** Son cosas
> distintas, y la matriz de visibilidad solo sabe de la segunda. Confundirlas es cómo se acaba
> metiendo ficción dentro del control de acceso.

### Un riesgo con fecha: la sesión de la semana que viene

La recuperación de contraseña **sigue bloqueada** (no hay servicio de correo) y el DM no puede
reiniciar la de nadie. Con cinco personas y cuentas creadas hace un día, que alguien no pueda
entrar el día de la partida no es improbable. **Mitigación de coste cero:** que cada jugador
compruebe que entra *antes* del día, y que guarde su contraseña donde pueda recuperarla.

### Mesa de agentes del 2026-09-02 — un DM y un tramposo contra la API real

Un agente jugó una partida entera de prueba contra la API y otro intentó romper la
autorización. **El tramposo no encontró ni un hueco de seguridad**: lectura, escritura,
escalada por regla con entidad ajena, tirada por personaje ajeno y superficie de cuenta, todo
403/404. `canView` + `requireMember`/`requireDM` aguantan. El DM, en cambio, encontró cuatro
fallos de corrección que **se arreglaron el mismo día**, y una lista de lo que le impediría
dirigir tres horas de verdad.

| # | Qué encontró el DM | Estado |
|---|---|---|
| **J5** | **Curar deja de registrar la muerte**: no hay evento `DEATH` propio; hay que deducirla de un `HP_CHANGED massive` | Abierto. Un `GameEventType` de muerte cerraría el «¿de qué murió Elara?» que el log no contesta |
| **J6** | **`ENTITY_REVEALED` viaja con la carga vacía** (`{type}`): no dice qué ficha ni a qué visibilidad, y es el momento dramático de la campaña | Abierto. El puente ya sabe el `entityId`; falta enriquecer el payload |
| **J7** | **La anulación del DM sale como «+6» en la traza, sin el motivo** que escribió | Abierto. El motivo sí queda en `GET /events`; la traza podría enseñar «fijada a 18» en vez del delta |
| **J8** | **La invitación es de un solo uso y no se pueden listar ni revocar**: el DM emite códigos a ciegas | Abierto. Un `GET /campaigns/:id/invites` y un estado de la invitación |
| **J9** | **Los errores de Zod salen crudos al usuario** (`fieldErrors {"kind":["Required"]}`, «Required» en inglés) | Abierto. Un filtro que traduzca el error de validación a un mensaje de dominio |
| **J10** | **La CA admite hasta 999 y el modificador de tirada no tiene tope** (`1d20+9999` → 10005) | Abierto, y menor: trampas a ojos vista que el DM vigila a mano, no fallos de seguridad. Un tope razonable las cerraría |
| **J11** | **`POST /rules` no valida al armar que la entidad del efecto sea de tu campaña** | Abierto e inerte: `applyRealEffects` y la auditoría acotan por `campaignId`, así que la regla queda `BROKEN`. Sería más limpio rechazar al armar |

**El veredicto del DM, sin diplomacia:** la fase de **preparación** (wiki, cinco visibilidades,
enlaces, comentarios, y el motor de reglas con su ensayo, propuestas y traza) la usaría el
martes para preparar la partida del sábado. Lo que **no** aguanta el sábado es el combate, y por
tres cosas que ya están fichadas arriba como huecos de mecánica: **no puede llevar los PG de un
monstruo (M13), no hay iniciativa (M14), y el registro no reconstruye la sesión (J4/J5, en
parte cerrado)**. Son la misma lista que las auditorías, vista desde la silla del director.

### ~~L1~~ — CERRADA el 2026-09-04 (2.5.6): la unión de tipos de suceso está cerrada

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

### L2-traza-dano — la traza de resistencia (2.5.1) no tiene pantalla ni vocabulario en español (2026-09-03)

> **Lleva sufijo porque `L2` ya existía** —«arco y radio de visión», más arriba en este mismo
> fichero—, y la regla de nombres de arriba dice que manda la aparición más temprana. Corregido
> en la revisión de cierre del 2026-09-04, junto con los dos errores de abajo.

**Abierto, y a propósito: 2.5.1 es servidor.** `apps/api/src/character-state/damage/apply-damage-modifiers.ts`
devuelve `labelKey`s nuevas (`damage.raw`, `damage.modifier.resist`, `.vulnerable`, `.immune`)
que hoy no tienen traducción en `apps/web/src/features/character-sheet/vocabulario.ts` ni en
ningún otro sitio de la web — si algo las pinta tal cual, sale la clave en inglés. (`.cancelled`
**ya no existe**: la revisión de cierre encontró que resistencia y vulnerabilidad no se cancelan,
se encadenan.)

**Y hay un dato que esta ficha se dejaba, que es el que de verdad importa al arreglarla:** la
traducción de los trece `DamageType` ya existe **tres veces**, las tres con el mismo nombre
`NOMBRE_TIPO_DANO`:

- `apps/web/src/features/campaign-items/vocabulario.ts:81`
- `apps/web/src/features/character-sheet/vocabulario.ts:77`
- `apps/web/src/features/inventory/vocabulario.ts:57`

Eso contradice la regla vinculante de que **la forma legible se escribe una sola vez por
dominio**, así que la tarea no es «añadir una cuarta»: es dejar una y que las otras la importen.
(La revisión de cierre contó dos y se dejó la de `character-sheet`; se comprobó con un barrido
antes de escribir esta línea, que es lo que la regla de «evidencia antes que afirmación» pide
incluso de un hallazgo de revisión.)

La primera versión de esta ficha citaba un símbolo inventado —«`nombreDeTipoDeDaño` o como se
llame en esa capa»—, que es exactamente el registro que `04-convenciones.md` prohíbe: un nombre
con cobertura manda a quien lo lea a buscar algo que no existe.

Entra con la pantalla del daño aplicado (probablemente parte de 2.5.4 o de la pantalla del
encuentro de 2.5.6), no antes.
