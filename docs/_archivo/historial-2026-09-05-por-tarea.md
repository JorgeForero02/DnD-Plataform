# Historial archivado — el detalle por tarea del 2026-09-05 (planes 03 y 15)

**Movidas enteras el 2026-09-06**, cuando el fichero llegó a 997 de sus 1000 líneas y la entrada del
día no cabía. **Ninguna se ha reescrito ni resumido**: están tal y como se escribieron, que es la
regla del archivo — *«se mueve entera, y el archivo es tan cierto como era el día que se escribió»*.

**Por qué estas nueve y no otras.** La convención dice que en el historial se queda **un hito por
entrega** y se archiva **el detalle por tarea**. Estas son justo eso: una entrada por ficha de los
planes 03 (el carril del motor) y 15 (el crítico y lo pequeño), que se cerraron el 2026-09-05. Su
hito se queda en `docs/07-historial.md`, con el enlace a este fichero.

**No se archivaron las entradas del 2026-09-06** aunque sean más recientes: son de la tanda que
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

