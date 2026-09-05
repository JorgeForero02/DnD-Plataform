# Historial archivado — el detalle por tarea del 2026-09-05 (planes 03 y 15)

**Movidas enteras el 2026-09-05**, cuando el fichero llegó a 997 de sus 1000 líneas y la entrada del
día no cabía. **Ninguna se ha reescrito ni resumido**: están tal y como se escribieron, que es la
regla del archivo — *«se mueve entera, y el archivo es tan cierto como era el día que se escribió»*.

**Por qué estas nueve y no otras.** La convención dice que en el historial se queda **un hito por
entrega** y se archiva **el detalle por tarea**. Estas son justo eso: una entrada por ficha de los
planes 03 (el carril del motor) y 15 (el crítico y lo pequeño), que se cerraron el 2026-09-05. Su
hito se queda en `docs/07-historial.md`, con el enlace a este fichero.

**No se archivaron las entradas del 2026-09-05** aunque sean más recientes: son de la tanda que
todavía se estaba entregando esa madrugada, y archivar lo que aún se está haciendo deja el historial
contando una noche a la que le faltan capítulos.

---

## Las etiquetas se normalizan al guardar (2026-09-05, plan 15 · E4)

**Qué.** Escribir «lich, lich» persistía `["lich","lich"]`. Las filas dedupaban **al pintar**, que
tapa el síntoma y deja la fila sucia — y quien consulte por etiqueta desde otro sitio cuenta dos.

**Se normaliza y no se rechaza**, que era la recomendación del plan y es la buena: rechazar obliga a
la persona a arreglar algo que la máquina arregla sola, y **un duplicado no expresa ninguna
intención** que la lista sin él no exprese. Se conserva el orden de la **primera** aparición, que es
el que tiene en la cabeza quien escribe.

**Vive en el esquema compartido y no en `parseTags`**: la pantalla no es la única puerta, y una
normalización que solo hace el cliente es una que la API no tiene.

**Y queda fijada la prueba que faltaba:** un `PATCH` **sin `tags`** no las borra. Hoy eso funciona
por la alineación de dos detalles —`.partial()` sobre el `.default([])` y la guarda `!== undefined`
del servicio— y quien quite cualquiera de los dos **borra etiquetas en silencio**.

**Cómo se comprobó.** Mutación: con el `.transform` devolviendo la lista tal cual, tres pruebas se
ponen rojas.

**Cómo revertirlo.** `git revert` del commit: vuelven los duplicados a la fila.

---

## Quién ve una criatura viaja con ella (2026-09-05, plan 15 · C6-2)

**Qué.** `GET .../statblocks` no devolvía `visibility` **aunque el servicio sí filtraba por él**, y
la consecuencia era de las que no se ven: el editor de criaturas no podía enseñar el nivel al
editarlas, así que **borraba el campo del `PUT`** para no volver a esconder una criatura que el DM
ya había enseñado a la mesa. Funcionaba, y era un rodeo.

**No filtra nada nuevo.** Aquí solo llegan las que `puedeVer` ya dejó pasar, y saber el nivel de
algo que ya estás viendo no revela nada — el mismo criterio que el bando de un combatiente.

**Y la decisión hermana que el plan pedía tomar ya estaba tomada, y medida.** Avisaba de que enseñar
el campo podía hacer que el editor ofreciera `OWNER_DM`, un nivel que no hace lo que dice. No pasa:
el editor ya lo excluye desde la Ola 2, junto con `SPECIFIC_PLAYERS`, con el motivo **leído del
servidor y no supuesto**. Y aunque `puedeVer` pasara el creador real en vez de `""`, no cambiaría
nada: `create` exige DM, así que el creador de una criatura es siempre el DM y `OWNER_DM` y
`DM_ONLY` producen el mismo conjunto.

**Cómo se comprobó.** Mutación: devolviendo `DM_ONLY` fijo, dos e2e se ponen rojos. Y hay una prueba
nueva que **protege lo que protegía el rodeo**: editar la CA de una criatura `PLAYERS` la deja en
`PLAYERS`.

**Cómo revertirlo.** `git revert` del commit: vuelve el rodeo, que era honesto.

---

## La API dice si está sana, y para eso mira la base (2026-09-05, plan 15 · D3)

**Qué.** No había endpoint de salud, y el `healthcheck` de producción sondeaba `GET /`, que responde
**404**. Un 404 resuelve el `fetch` igual que un 200, así que **el contenedor se declaraba sano con
Postgres caído**: detectaba un proceso muerto y nada más.

**`GET /health` hace un `SELECT 1`** y devuelve **503** si la base no contesta. Una API que responde
con la base caída está mintiendo sobre su salud, y el único que se entera es el jugador.

**Lo que NO dice es la mitad del diseño.** No lleva autenticación —un comprobador de salud no puede
tener credenciales— y por eso **no cuenta nada**: ni versión, ni número de campañas, ni el nombre de
la base. Y cuando está enfermo **tampoco dice por qué**: el detalle va a los registros del servidor,
no a la respuesta.

**El compose apunta ahí y mira el código de estado**, no solo que la petición no explote — un 503 es
exactamente lo que este sondeo tiene que leer como enfermo.

**Cómo se comprobó.** Cinco pruebas, y la que importa es la de **la base caída**: un `/health` que
solo devuelve `{ status: "ok" }` pasa siempre, y escribir eso es escribir un endpoint que nunca dice
que no. Mutación: quitando el `SELECT 1`, esa prueba recibe **200** donde espera 503.

**Al desplegar:** cambiar el compose **recompila la imagen en Coolify**, así que esto viaja con el
siguiente despliegue, no suelto.

**Cómo revertirlo.** `git revert` del commit y devolver el `healthcheck` a `GET /`.

---

## El crítico deja de declararse (2026-09-05, plan 15 · C2.5-2 cerrada entera)

**Qué.** Había un `critical: boolean` en el cuerpo de la petición de daño, y una casilla «Crítico»
en el panel de ataque que el jugador marcaba a mano. El servidor se la creía: **cualquiera podía
pedir el daño duplicado sin haber sacado un 20**. El campo ya no existe.

**Ahora el daño cita la tirada que cobra.** La pantalla manda el `eventId` de la tirada de ataque
hecha en ese mismo panel, y el servidor lee el `natural` que quedó escrito en su suceso —del mismo
personaje, la misma campaña y **el mismo ataque**—. Sin tirada citada **no hay crítico**: pedir daño
suelto es legítimo y va sin duplicar.

**Y la casilla no se sustituyó por otra casilla: se sustituyó por una frase.** «Fue un 20 natural»,
«No fue un 20 natural», o «tira primero el ataque». Enseñar lo que pasó, en vez de ofrecer
declararlo.

**Es la misma regla que `resolveAttackSchema` ya aplicaba** desde la ficha R2C-2 —*«eso lo decide la
tirada, no quien la pide»*—, así que ahora las dos puertas de ataque dicen lo mismo.

**El orden importaba.** Primero la web mandó el campo, **después** se quitó `critical`: al revés hay
una ventana en la que el crítico no funciona. Son dos commits por eso.

**Con esto C2.5-2 cierra entera**: su otra condición —que una tirada cobrada no se pueda cobrar dos
veces— la puso el plan 03 con el índice único, y el navegador recorre las dos de punta a punta.

**Cómo se comprobó.** Mutación: si `esCriticoDesdeLaTirada` vuelve a creerse el cuerpo, dos pruebas
se ponen rojas. Y en el navegador, el segundo cobro de la misma tirada es un 409 con su frase.

**Cómo revertirlo.** `git revert` de los dos commits, en orden inverso.

---

## Los sucesos aprenden a nombrar (2026-09-05, plan 03 · D-OP-12)

**Qué.** `GameEvent` tiene concesiones nominales, y con eso caen **dos fichas y un parche**.

**El defecto.** `GameEventsService.canSee` evaluaba `canView` con `grantedUserIds: []` **fijo**,
así que un suceso `SPECIFIC_PLAYERS` **no lo veía nadie** salvo el DM — ni siquiera el jugador al
que se le acababa de conceder la ficha. `EntitiesService` lo sabía y guardaba `DM_ONLY` en su lugar,
con un comentario que lo llamaba parche honesto a la espera de esto. **El parche está retirado y su
comentario reescrito**, no dejado mintiendo.

**Columna `String[]`, no tabla de unión**, con tres motivos medidos: el filtrado ya ocurre **en
memoria** tras el `findMany`, así que una tabla obligaría a un `include` para nada; el esquema ya usa
`String[]`; y lo que se pierde —integridad referencial— es inofensivo, porque `canView` solo
pregunta si el espectador está en la lista.

**Y P3 no se arregló como la ficha suponía.** Decía que hacía falta que «el modelo de sucesos sepa
de dueños ajenos». Lo que hacía falta era traducir: **un suceso no tiene dueño propio** —el servicio
evalúa `canView` con el **actor** como creador—, así que copiar `OWNER_DM` tal cual escribía un
suceso cuyo «dueño» era el DM que archivó, y al jugador al que se llevaban el personaje **no le
llegaba nada**. `audienciaDeSuceso` (`apps/api/src/common/visibility.ts`) traduce el nivel de la
cosa al par (visibilidad, nombrados) que produce **su misma audiencia**: `OWNER_DM` significa «su
dueño y el DM», y nombrar al dueño en `SPECIFIC_PLAYERS` da ese conjunto exacto. Vive junto a
`canView` porque es la misma matriz, y la usan el archivar y el revelar.

**Cómo se comprobó.** Dos mutaciones, las dos rojas: volver `canSee` al array vacío tumba el e2e del
jugador nombrado; copiar la visibilidad tal cual en el archivar tumba el del dueño.

**Cómo revertirlo.** `git revert` del commit y una migración con
`ALTER TABLE "GameEvent" DROP COLUMN "grantedUserIds"`. Vuelve el parche de `DM_ONLY`, que era la
etiqueta honesta de lo que pasaba.

---

## «Dónde se quedó» deja de ser una promesa (2026-09-05, plan 03 · D-OP-17)

**Qué.** La pantalla de entrada pinta, por cada campaña, **la crónica de su última sesión cerrada**
— es lo que la convierte en «partidas guardadas» y no en una lista de proyectos. Hasta hoy ese hueco
enseñaba la descripción de la campaña y una frase que **prometía esto mismo**.

**Es una consulta, y eso lo hizo posible el plan 02.** `Session.recap` y `recapVisibility` son
columnas desde esta misma noche, así que filtrar por visibilidad ya no es leer un `Json` y decidir
en memoria. Va en el listado y no en una petición por campaña porque lo segundo serían **N
peticiones en la pantalla de entrada**, que es donde no se pueden pagar.

**Tres decisiones que se declaran, porque las tres se pueden leer al revés:**

- **La última cerrada, y si esa no se ve, el campo no viaja.** No se busca una crónica anterior:
  enseñarla bajo el rótulo «dónde se quedó» diría que la partida se quedó donde no se quedó.
- **«No hay crónica» y «hay una y no la ves» se pintan igual.** Distinguirlas contaría que existe
  algo escondido.
- **Una crónica `PLAYERS` de una sesión `DM_ONLY` sí viaja.** Publicar lo que pasó en una sesión de
  preparación es legítimo, y es la mitad de para qué sirve que la crónica tenga visibilidad propia.

**Cómo se comprobó.** Los tres casos, **incluido el que se olvida** —una campaña sin ninguna sesión
cerrada, que tiene que salir bien y sin el campo—, en unitaria y en Postgres real; la pantalla en
RTL; y el recorrido entero en navegador: se sella durante la partida, se cierra con la crónica que
sale de esos sellos, y al volver a la entrada la partida dice por dónde iba. Mutación: sin
`canView`, la crónica `DM_ONLY` se le cuela al jugador.

**Cómo revertirlo.** `git revert` del commit: el listado vuelve a traer solo rol y número de
miembros, y la tarjeta a la descripción. No hay migración.

---

## Atacar a un ciego da ventaja, y esa mitad faltaba (2026-09-05, plan 03 · D-OP-13)

**Qué.** El SRD dice de `blinded` una frase con **dos mitades**: *"Attack rolls against the creature
have advantage, and the creature's attack rolls have disadvantage."* 2.5.5 implementó la segunda y
declaró que la primera quedaba fuera **con su motivo**: `suggested-roll-mode.ts` responde «¿cómo
tiro **yo**?», y quien ataca no tiene por qué estar mirando la hoja del atacado. Esa mitad vive
ahora donde sí se conoce al objetivo: **el camino del ataque**.

**La tabla, verificada en inglés contra `dnd5eapi.co` el 2026-09-05.** Dan ventaja a quien ataca
`blinded`, `paralyzed`, `petrified`, `restrained`, `stunned` y `unconscious`; da **desventaja**
`invisible`.

**Y dos reglas se dejan fuera, dichas:** `prone` da ventaja *"if the attacker is within 5 feet…
Otherwise, disadvantage"*, y el crítico automático de `paralyzed`/`unconscious` tiene la misma
condición. **Dependen de la distancia y hasta la fase 3 no hay tablero**: elegir una de las dos
mitades sería inventarse la mitad de las veces. Es el mismo criterio con el que 2.5.5 dejó fuera el
fallo automático de pruebas que requieren vista.

**Se combina con la regla del SRD, no sumando.** *"If circumstances cause a roll to have both
advantage and disadvantage, you are considered to have neither of them."* Dos causas del mismo signo
siguen siendo una; una de cada signo da **normal**. Contar causas inventaría una regla de mayorías
que la 5.ª edición no tiene.

**Cierra L3**, que decía que `blinded` no calculaba nada.

**Cómo se comprobó.** Doce pruebas de la función pura y cinco del camino del ataque —incluida una
condición **ya vencida**, que no cambia nada—. Mutación: al anular la rama de ventaja, **siete**
pruebas se ponen rojas.

**Cómo revertirlo.** `git revert` del commit: el modo vuelve a ser el que pide quien tira. No hay
migración ni dato nuevo.

---

## El daño de una tirada se cobra una vez, y lo impide la base (2026-09-05, plan 03 · D-OP-15)

**Qué.** `attackRollEventId` existía como **entrada y nada más**: `rollAttack` lo leía para saber si
el golpe fue crítico y **no lo guardaba**, así que nada impedía pedir el daño de la misma tirada dos
veces, tres, las que hicieran falta. Ahora es una columna de `GameEvent` **con índice único**.

**Índice único y no una comprobación en el servicio**, por lo mismo que «como mucho una sesión en
curso por campaña»: comprobarlo en código es una carrera esperando a ocurrir con dos pestañas
abiertas. Y el registro es de **solo añadir**, así que la alternativa —mutar la fila de la tirada
para marcarla cobrada— es algo que aquí no se hace. El servicio solo traduce el `P2002` a un 409
legible.

**PostgreSQL trata dos nulos como distintos**, así que los miles de sucesos que no cobran ninguna
tirada no chocan entre sí: basta un índice único normal, sin parcial.

**El campo viaja por un parámetro interno de `RollsService.roll`, no por `createRollSchema`.** Si el
cliente pudiera mandarlo, podría **quemar el identificador de la tirada de otro** y dejarla
incobrable — que es la puerta de al lado del problema que esto cierra.

**Cierra la mitad de C2.5-2.** La otra —que la web mande el campo y que `critical` suelto se pueda
borrar del esquema— es del plan 15, y el orden importa: primero la web manda, después se quita.

**Cómo se comprobó.** Mutación: al borrar el índice único, el e2e recibe **201** donde esperaba 409.

**Cómo revertirlo.** `git revert` del commit y una migración con
`DROP INDEX "GameEvent_attackRollEventId_key"` + `ALTER TABLE "GameEvent" DROP COLUMN
"attackRollEventId"`.

---

## El oráculo de la CA se cierra por la puerta que importaba (2026-09-05, plan 03 · D-OP-11)

**Qué.** `resolveAttack` buscaba el objetivo **sin consultar `canView`**, y cada ataque es una
comparación exacta `total >= CA` con el total conocido: veinte o treinta peticiones contra un
identificador cualquiera daban la CA de **cualquier** personaje de la campaña, sin necesidad de
suerte porque el atacante conoce su propio bono.

**La regla:** el objetivo pasa `canView` para quien ataca **o** es combatiente de un encuentro
**activo** de esta campaña. Las dos mitades hacen falta: `canView` sola dejaría fuera al PNJ
`DM_ONLY` que el DM acaba de bajar a la mesa —que es justo lo que el spec de 2.5.3 pide poder
atacar—, y el encuentro solo dejaría fuera al objetivo visible al que se ataca fuera de combate,
que es legal.

**404 y no 403, comparado byte a byte.** Un «prohibido» ya confirma que el personaje existe, así que
la respuesta es indistinguible de la de un id inventado, y hay un e2e que compara los dos cuerpos
serializados. La prueba usa el **caso difícil** —un id válido de un personaje real que no se puede
ver—, no un id con formato inválido, que daría 404 aunque no hubiera ninguna comprobación.

**Lo que se acepta y se declara:** contra un objetivo visible, la CA **sigue siendo deducible**
atacándolo, igual que en una mesa. El SRD lo respalda —*«the GM typically just says the attack
missed»*— y no prohíbe atacar a ciegas.

**Y el comentario del servicio se reescribió.** Decía, con todas las letras, «por qué no exige
`canView` sobre el objetivo». Dejarlo habría sido una mentira semántica con la sintaxis en regla,
que es justo la clase que ningún script caza.

**Cómo se comprobó.** Mutación: al quitar la comprobación, el e2e del 404 idéntico devuelve **201**
y se pone rojo.

**Cómo revertirlo.** `git revert` del commit. Vuelve el oráculo.
 Vuelve el parche de `DM_ONLY`, que era la
etiqueta honesta de lo que pasaba.

---


---

## Segunda remesa, movida el 2026-09-05: el detalle por tarea de los planes 05, 07 y 08

**Seis entradas más, enteras y sin reescribir**, cuando el fichero vivo llegó a 1018 de sus 1000
líneas. Mismo criterio que la primera remesa: se queda **un hito por entrega** en
`docs/07-historial.md` y se archiva **el detalle por tarea**.

## Ayudar da ventaja y caduca cuando el SRD dice (2026-09-05, plan 08 · I8)

**Qué.** La acción **Ayudar** existe en el SRD y la maqueta la pintaba como «Ayuda de Mira **+1d4**».
Ese +1d4 es **`Bless`**, que es un conjuro; el d6 es Inspiración Bárdica, que es un rasgo de bardo.
Ayudar da **ventaja**. Las reglas mandan sobre la maqueta y el rótulo se corrige.

**Cómo.** Es una condición con vencimiento —`CharacterCondition` con `key: "helped"`—, no una tabla
nueva: tiene exactamente la misma forma, una clave sobre un personaje con origen y con caducidad, y
ese sistema existe desde 2C.4. **No es una condición del SRD** y aun así el motor la entiende a
propósito: entra en la sugerencia de ventaja del ataque, para que nadie tenga que acordarse.

Los tres límites del SRD, uno por uno:

1. **Una sola tirada.** Se cumple: la consume **el primer ataque**, y el segundo ya tira un dado.
   Se consume **después** de tirar, para que una tirada rechazada no la gaste.
2. **El enemigo a cinco pies de quien ayuda.** **No se comprueba, y no se finge.** Son distancias y
   este producto no tiene tablero. La pantalla lo dice: *«la cercanía la juzgas tú»*, con su prueba.
3. **Caduca al principio del turno siguiente del ayudante.** Se cumple sin inventar un reloj: un
   asalto **son seis segundos** del reloj de campaña (D-2C-1), así que es un asalto exacto.
   **Probado por mutación**: quitándole el vencimiento, el e2e se pone rojo en dos sitios.

**Y el flanqueo NO se ha construido**, dicho aquí para que no parezca un olvido: es **opcional del
DMG**, no del SRD, da **ventaja** y no un `+3` —ese +2 es de 3.ª edición y de Pathfinder—, y
necesitaría saber quién está adyacente a quién, o sea el tablero de la fase 3. Si algún día entra,
será **interruptor por campaña** y dando ventaja.

**Dónde se usa.** En **tu** tarjeta del elenco, no en la del otro: la regla de la mesa es que sobre
el personaje de otro jugador no van mandos, y ayudar es una acción tuya con un parámetro.

**Cómo revertirlo.** `git revert` del commit. Las filas `helped` que queden son inertes: sin la
entrada en `VENTAJA_EN_ATAQUE` no calculan nada, y vencen solas.

## La inspiración existe: la concede el DM, se gasta y se regala (2026-09-05, plan 08 · I8)

**Qué.** De los tres botones de intervención que pinta la maqueta, **dos son falsos** y uno era una
promesa vacía. Ahora ese uno funciona de punta a punta.

- «Ventaja por flanqueo **+3**»: el flanqueo es **opcional del DMG**, no del SRD, y da **ventaja**,
  no un número —el +2 es de 3.ª y de Pathfinder—. Además necesitaría saber quién está adyacente a
  quién, o sea el tablero. **No se construye, y el commit lo dice para que no parezca un olvido.**
- «Ayuda de Mira **+1d4**»: **Ayudar** existe y da **ventaja**; el +1d4 es `Bless`. Va en 8.2.
- «Usar inspiración»: correcto, y es lo que se ha construido.

**Cómo, y aquí está la decisión.** **No hay `Character.inspired`.** El plan pedía un booleano, pero
`CharacterResource` ya es *«un contador con máximo»* y `schema.prisma` la nombra desde 2A.8 como
«recursos consumibles: **inspiracion**, furia, ki…»: era literalmente el primer ejemplo con el que
esa tabla se escribió. Una columna nueva habría sido **una segunda verdad sobre el mismo hecho**. La
fila es `key: "inspiration"`, `max: 1` —*«you either have inspiration or you don't»*—, `NONE` y
`DM_ONLY`, y **se siembra al crear el personaje**, no al terminar la ficha: no viene de la clase.

**Dos agujeros que aparecieron al sembrarla, y valen para todos los recursos:**

1. **Gastar lo que no hay devolvía 200.** El recorte de abajo se tragaba el exceso, así que pedir un
   espacio de conjuro con cero respondía **exactamente igual** que gastarlo. Ahora es **409**.
2. **Reponer no pasaba por el candado de `grantedBy`.** El candado vivía solo en `upsert`. Con la
   inspiración sembrada, un jugador se la habría concedido a sí mismo pulsando «+1» en su propia
   hoja. Ahora reponer un `DM_ONLY` exige ser DM. **Probado por mutación**: quitando el candado, el
   e2e se pone rojo con 201 donde esperaba 403.

**Gastar y tirar son un solo gesto.** `spendInspiration` viaja **en la petición de la tirada** —del
panel de la mesa, de la hoja, del ataque y de una petición del DM—, y el servidor gasta y tira en la
misma transacción. Por separado había dos formas de romperlo: gastarla y que la tirada falle
—perdida sin tirar—, o tirar y que el gasto falle —ventaja gratis—. Y **con desventaja declarada se
rechaza con 400** en vez de quemarla para nada: se anularían.

**Regalar** (`POST .../resources/:key/give`) mueve las dos filas en una transacción y deja **un
solo** suceso `RESOURCE_GIVEN` con los dos nombres. Es SRD: *«you can give it to another player»*.

**Cómo revertirlo.** `git revert` del commit y `ALTER TYPE` no se puede deshacer sin recrear el
enum; el valor `RESOURCE_GIVEN` puede quedarse sin usar sin romper nada. Las filas sembradas de
inspiración son inertes si nadie las lee.

## Cada personaje tiene su color, y es el mismo en el hilo y en el elenco (2026-09-05, plan 05 · D3)

**Qué.** Hasta hoy la voz de una intervención en el hilo era una **huella del `actorUserId` sobre
cuatro tonos**, y el retrato del elenco era **cobre para todos**. Dos defectos y un solo arreglo:
con cinco personas en la mesa dos compartían color y **nadie podía cambiarlo**, y los dos personajes
de un mismo jugador salían idénticos porque la huella era del usuario, no del personaje.

**Cómo.** `Character.color`, nulable y sin valor por defecto en la base (migración
`20260906020000_character_color`). Guarda una **clave** de una lista cerrada de ocho
(`CHARACTER_COLORS`, en `packages/shared`), nunca un hexadecimal: el mismo color tiene que verse en
los tres temas y una clave se puede medir de contraste una vez. `null` significa «no he elegido», y
entonces manda una huella **del `id` del personaje** — el mismo personaje, el mismo color, siempre.
Una clave escrita no se pisa nunca.

**Un solo sitio decide el color de alguien:** `vozDePersonaje` (`apps/web/src/dominio/voces.ts`).
Lo llaman la voz del hilo y el retrato del elenco, que antes eran dos cálculos distintos.

**Cuatro tokens de voz NUEVOS** —salvia, ciruela, índigo y arena— en `apps/web/src/ui/tokens.css`,
en los tres temas, **con sus 24 contrastes medidos en el navegador** y anotados en el propio
fichero. Ninguno reutiliza `--warning-text` (el ámbar de «cuidado») ni `--muted` («esto está
apagado»). Las otras cuatro voces sí son tokens que ya existían y que no cambian de oficio. El peor
de los 24 es 4.85:1 sobre 4.5 exigido.

**Y el selector avisa, no prohíbe:** si otro personaje de la mesa ya va de ese color, se dice y se
nombra a quién, y se deja elegir igual. El color no distingue nada que importe — el nombre va
escrito al lado.

**Cómo revertirlo.** `git revert` de los dos commits (`1aba8b2` servidor, el de web) y
`ALTER TABLE "Character" DROP COLUMN "color"`. La columna es nulable y nada más la lee, así que
dejarla puesta tampoco rompe nada.

**Trampa que costó tiempo:** el hilo solo conoce el **usuario** que actuó, no el personaje. Quién
habla se resuelve en `HiloDeSesion.tsx` con tres reglas escritas —el sujeto si el suceso es sobre un
personaje; si no, el único personaje vivo de ese jugador; y si lleva dos o más, ninguno—, porque
elegir por él pintaría a un personaje con el color de su hermano.

## Reclasificar una ficha dice lo que cuesta, y deja rastro (2026-09-05, plan 07 · I16)

**Qué.** Cambiar el tipo de una ficha ya escrita convertía un PNJ con statblock, enlaces y
comentarios en «Documento» **de un clic y sin dejar constancia**. El registro es la auditoría de esta
aplicación: un cambio de naturaleza que no aparece en él **no se puede deshacer**, porque nadie sabe
que pasó.

**Y la ficha señalaba el sitio equivocado.** Decía «en el editor»; `EntityEditor` recibe `type` como
**prop** y no lo cambia nunca, así que ahí el gesto **no existe**. El único sitio donde se
reclasifica son **los chips de tipo del taller del DM**. La confirmación llegó a escribirse en el
editor antes de medirlo, y hubo que moverla — que es el argumento de medir primero.

**Las dos piezas, y son norma general del proyecto.** La confirmación **dice la consecuencia, no el
riesgo**: los dos tipos con su rótulo real, de dónde sale y dónde aparece, que quien la busque donde
estaba no la va a encontrar, **lo que NO se pierde** —cuerpo, etiquetas, enlaces, comentarios— y,
solo si era un PNJ, que su statblock deja de tener sentido. **Ni una vez «¿estás seguro?»**: se pulsa
sin leer y encima tranquiliza, y hay una prueba que lo vigila. Y el cambio **escribe
`ENTITY_RETYPED`**, con **los dos tipos** —«ahora es un Documento» no dice qué se perdió— heredando
la audiencia de la ficha.

**Solo pregunta al editar una que ya existe.** Escribiendo una nueva, el chip elige de qué tipo va a
ser y no reclasifica nada: una confirmación que salta cuando no hace falta se aprende a ignorar en
dos días, y entonces tampoco protege el caso que importa.

**El valor del suceso va en el payload como CLAVE** —`NPC`, `DOCUMENT`— y se traduce al pintar, que
es donde vive el español. Un registro guarda datos, no prosa.

**Cómo se comprobó.** Mutación en las dos mitades: sin el diálogo, cuatro pruebas de pantalla se
ponen rojas; sin el suceso, el e2e del rastro. Y hay una prueba de que **guardar sin cambiar el tipo
no escribe nada**: un suceso en cada guardado es ruido, y el ruido hace que nadie lea el registro.

**Cómo revertirlo.** `git revert` del commit y una migración que quite `ENTITY_RETYPED` del enum
—los valores de un enum de PostgreSQL no se borran en caliente, así que en la práctica se queda
huérfano y no molesta.

---

## Un vocabulario del daño con dos formas, y la diferencia es la decisión (2026-09-05, plan 07 · D-OP-14)

**Qué.** La traducción de los tipos de daño estaba **copiada en tres pantallas**. Comparadas entrada
por entrada antes de borrar ninguna: `character-sheet` y `campaign-items` eran **idénticas** en las
trece; `inventory` difiere en **cuatro** —`contund.`, `perf.`, `cort.` y **`rayo`** donde las otras
dicen `relámpago`—.

**Por eso no se fusionan en una tabla sola, y es lo que hay que no deshacer:** la forma corta de
`inventory` **no es un descuido**, es lo que hace que su fila quepa. Unificar a ciegas rompe esa
tabla, y ya se intentó una vez. El módulo expone **las dos formas** y **cada consumidor elige la
suya a propósito**: la hoja, el catálogo, el bestiario y la traza usan la larga —se leen—; la fila
del inventario, la corta —cabe—.

**Las dos tablas son completas y ninguna deriva de la otra.** Con un valor por defecto, añadir un
tipo de daño daría una corta silenciosamente larga y la fila se rompería sin que nada avisara. Así
el compilador obliga a rellenar las dos, y una prueba las cruza contra el esquema de `@dnd/shared`.

**Y nace `apps/web/src/dominio/`, como decisión declarada** en
[01-arquitectura.md](./01-arquitectura.md): la forma **legible en español** de lo que `shared`
declara como dato. No va en `packages/shared` —allí vive la forma de los datos, no su traducción— ni
dentro de un `features/<x>/`, que es exactamente cómo nacieron las tres copias.

**Cómo se comprobó.** Mutación: al «unificar» las dos formas, dos pruebas se ponen rojas — la que
fija las cuatro abreviaturas y la que cuenta cuántas coinciden.

**Cómo revertirlo.** `git revert` del commit: vuelven las tres copias, y con ellas la que dice
«rayo» sin que nadie lo sepa.

---

## Un concepto, un icono — y una prueba que lo sostiene (2026-09-05, plan 07)

**Qué.** Había **diez ficheros de iconos** y conceptos repetidos: escudo con tres definiciones,
mochila con tres, sol y luna con dos. La auditoría original contaba «4 iconos» porque **solo miró
`ui/Iconos.tsx`**; el número real ronda los 76. Y **ningún carril podía arreglarlo**: los seis
tenían `features/**` prohibido, así que las copias se acumularon sin que nadie las viera juntas.

**Lo que de verdad cierra la ficha es la prueba**, no la limpieza. Limpiar hoy solo compraba tiempo:
el siguiente que necesitara un escudo y no encontrara el de `ui` dibujaría otro.
`iconos-sin-duplicados.test.ts` barre todos los ficheros de iconos de `features/` y se pone roja si
uno redefine un nombre que `ui/Iconos.tsx` ya exporta.

**Y la prueba encontró tres que la lectura a ojo se había dejado** —el escudo del catálogo de
objetos, el «más» de las secciones y la mochila del inventario—. Es exactamente su trabajo, y el
argumento de por qué existe.

**Lo que NO se fusionó, dicho:** `inventory`, `rules` y `level-up` dibujan en **rejilla de 16** y
moverlos sería **redibujar**, que es otro commit y otra decisión. `IconoObjeto` vive en tres módulos
y son **tres dibujos para tres significados** —un cofre, el glifo del tipo `ITEM`, una caja—; un
icono que solo usa su módulo se queda en su módulo, porque `ui/` no es un cajón.

**Dos renombrados que son mejoras, no rodeos:** el escudo del catálogo **deja de exportarse** —nadie
lo importaba y su puerta pública es `IconoDeObjeto({ kind })`—, y `inventory/IconoMochila` pasa a
`IconoLlevado`, que es como se llaman sus dos hermanas: se nombraba por su dibujo y era la rara.

**El tamaño se conservó a mano** donde el consumidor se apoyaba en el `h-5 w-5` por defecto de
`sessions`, porque `ui/Marco` mide en `1em`. Es la trampa que la propia ficha avisaba.

**Cómo se comprobó.** Mutación: una cuarta copia del escudo pone la prueba roja al instante. Y los
iconos movidos se miraron **en el navegador** —`armazon`, `sesion` e `inventario`—, porque `jsdom`
no maqueta.

**Cómo revertirlo.** `git revert` del commit: vuelven las copias y la prueba se va con ellas.

---

