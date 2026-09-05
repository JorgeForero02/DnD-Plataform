# Historial

Qué se entregó, por qué, y cómo revertirlo. Fechas absolutas. El detalle por tarea —commit,
número de pruebas, resultado de la revisión— vive en el ledger
`.superpowers/sdd/progress.md`; aquí van los hitos.

> ## Este fichero tiene un tope de 1000 líneas, y lo comprueba una máquina
>
> `pnpm check:historial` falla si se pasa (ver `scripts/check-historial.mjs`, enganchado en
> `pnpm verify` junto a `check:estado`). No es pulcritud: el consumidor principal de esta
> documentación es un agente sin memoria que la relee entera en cada sesión, y **lo que no le
> cabe en contexto lo rellena inventando**. Un historial de 2192 líneas —lo que llegó a medir
> este— no se lee: se hojea, y hojear un registro es peor que no tenerlo.
>
> **Qué se queda y qué se archiva.** Se queda **un hito por entrega**: el cierre de una fase,
> su despliegue, la revisión que lo cerró. Se archiva **el detalle por tarea**, que es lo que
> el ledger ya cuenta a más resolución. Ninguna entrada se reescribe ni se resume al
> archivarla — se mueve entera, y el archivo es tan cierto como era el día que se escribió.
>
> | Dónde | Qué hay |
> |---|---|
> | [`_archivo/historial-hasta-2026-09-01.md`](./_archivo/historial-hasta-2026-09-01.md) | Desde el arranque del proyecto (2026-07-02) hasta el cierre de la fase 1 y el reseño visual |
> | [`_archivo/historial-hasta-2026-09-02.md`](./_archivo/historial-hasta-2026-09-02.md) | Todo el 2026-09-02 —la fase 2A entera, la ronda de interfaz, la primera puesta en producción— y **las entradas por tarea del 2026-09-03** (2B, 2C y 2D, tarea a tarea) |
> | [`_archivo/historial-2026-09-04-por-tarea.md`](./_archivo/historial-2026-09-04-por-tarea.md) | **El 2026-09-04 se cerraron ocho tandas con sus ocho revisiones**, y sus entradas por tarea no caben aquí. Tres de ellas viven ahí: 2.5.2, B1.2 y la de `ENTITY_REVEALED` + archivar |
> | [`_archivo/historial-2026-09-04-tandas.md`](./_archivo/historial-2026-09-04-tandas.md) | Las tandas por tarea del 2026-09-03 y 04 —2.5.3, 2.5.4, 2.5.5, 2.5.6, B4 y B5—, movidas enteras el 2026-09-05 |
> | [`_archivo/historial-2026-09-04-reseno-de-la-mesa.md`](./_archivo/historial-2026-09-04-reseno-de-la-mesa.md) | **El reseño de la mesa del 2026-09-04** —la cabina y las mecánicas que no tenían pantalla—, movido entero el 2026-09-05 (tercer corte de la noche) |
> | [`_archivo/historial-2026-09-03-y-04-sueltas.md`](./_archivo/historial-2026-09-03-y-04-sueltas.md) | **La comprobación en producción de 2D** y **la auditoría de la documentación del 2026-09-04**, movidas enteras el 2026-09-05 (segundo corte de la noche: las cinco entradas del plan 03 dejaron el fichero en 413 de 400) |
> | [`_archivo/historial-2026-09-05-por-tarea.md`](./_archivo/historial-2026-09-05-por-tarea.md) | **El detalle por tarea de los planes 03 y 15**, nueve entradas movidas enteras el 2026-09-06 cuando el fichero llegó a 997 de 1000. Su hito se queda arriba |
>
> **El corte del 2026-09-05 se hizo por lo segundo**: el fichero estaba en 399 de 400 y no cabía
> la entrada del día. Se archivaron las seis tandas por tarea y se quedaron los tres hitos.
>
> **Y esa misma noche el tope pasó de 400 a 1000** —decisión del autor, declarada en
> [04-convenciones.md](./04-convenciones.md)—, porque con 400 el control saltó **siete veces** en
> una madrugada y el archivo estaba haciendo de válvula de presión. **Las cuatro entradas del
> 2026-09-05 que habían salido solo por el tope volvieron aquí**, enteras: las tres columnas, el
> hilo como conversación, las tres baratas y la Ola 3. Las dos de días anteriores se quedan
> archivadas, que es para lo que está el archivo.

---

## Los planes 03 y 15, ficha a ficha (2026-09-05) — archivadas

**Nueve entradas por tarea**, movidas enteras a
[`_archivo/historial-2026-09-05-por-tarea.md`](./_archivo/historial-2026-09-05-por-tarea.md) el
2026-09-06, cuando este fichero llegó a 997 de sus 1000 líneas. Lo que cerraron, en una línea cada
uno:

- **Plan 03 · el carril del motor** — el oráculo de la CA se cerró **por la puerta que importaba**
  (D-OP-11); el daño de una tirada se cobra **una vez, y lo impide la base** (D-OP-15); atacar a un
  ciego da ventaja (D-OP-13); «dónde se quedó» dejó de ser una promesa (D-OP-17); y los sucesos
  aprendieron a nombrar a quién ven (D-OP-12).
- **Plan 15 · el crítico y lo pequeño** — el crítico **dejó de declararse** desde el cuerpo de la
  petición (C2.5-2); quién ve una criatura **viaja con ella** (C6-2); la API dice si está sana
  mirando la base (D3); y las etiquetas se normalizan **al guardar** (E4).

## Una sesión se puede leer, no solo editar (2026-09-06, plan 14 · U1)

**Qué.** Las fichas del mundo y los personajes tienen su página de lectura desde el reseño; una
sesión se seguía abriendo en **su formulario**, que es la pantalla de editarla. Y una sesión es justo
lo que la mesa repasa entre partidas: cuándo fue, quién vino y **la crónica**. Con `Session.recap`
como columna (plan 02) hay algo real que leer.

**Cómo.** `/campaigns/:id/sesiones/:sessionId`, con el mismo patrón que las otras dos páginas de
lectura: la prosa en vitela con su medida, el estado y la fecha en la cabecera, y quién vino al lado.

**Lo que decide la pantalla, y no es cosmética:**

- **La crónica se filtra en el servidor**, que ya borra *las dos* columnas —el texto y su nivel—
  cuando quien mira no puede verla: borrar solo el texto habría dicho «hay una crónica que no puedes
  leer», que ya es información. La página **no reimplementa nada**: pinta lo que le llega.
- **Su nivel se enseña aparte del de la sesión**, porque pueden no coincidir: saber a quién se le
  está contando algo importa antes de contarlo.
- **«No existe» y «no puedes verla» dicen lo mismo**, igual que en las fichas del mundo.
- **`null` y «nadie» son dos cosas distintas** en la asistencia, y se dicen distinto: sin asistencia
  declarada nadie la anotó; con lista vacía, se anotó que no vino nadie.
- **El enlace se añade junto a los controles, sin sustituir la fila**: quien la abre para corregir la
  fecha sigue queriendo el formulario.

**Medido en el navegador** con dos contextos (`apps/web/e2e/leer-una-sesion.spec.ts`): el DM llega a
la página desde la lista, y el jugador abre **la misma URL** y no ve ninguna crónica que no sea suya.

**Cómo revertirlo.** `git revert` del commit. No hay datos que tocar.

## El ornamento se apaga, un PNJ recibe temporales, y U2 se cierra midiendo (2026-09-06, plan 14 · U7, C6-4, U2)

**U7 — el ornamento tiene interruptor.** La cuadrícula y el horizonte se pintaban **siempre**. No se
mueven, así que `prefers-reduced-motion` no aplica, y no había ninguna preferencia del sistema que
signifique «menos adorno estático»: usar la del movimiento habría apagado el adorno a quien pidió
otra cosa y habría dejado sin opción a quien lo necesita. Es una decisión de la persona, así que se
le pregunta y se recuerda — **en este navegador, como el tema**, porque quien lo necesita lo necesita
en el dispositivo donde le molesta.

**Se deja de pintar, no se esconde**: un adorno que sigue en el DOM sigue costando y sigue pudiendo
salir en una captura o en un lector. Y el atributo se estampa en `<html>` **antes del primer
pintado**, para que no haya un parpadeo con el adorno puesto justo delante de quien pidió no verlo.

> **Y eso obligó a algo que el tema no necesita**: el tema lo resuelve el CSS, así que nadie
> repinta; esto deja de dibujarse, que es una decisión de React. Con una lectura suelta del
> atributo, apagarlo lo cambiaba y **la cuadrícula seguía en pantalla** hasta la siguiente
> navegación. Lo cazó el recorrido de navegador, no `jsdom`.

**C6-4 — un PNJ puede recibir PG temporales.** El campo se pintaba desde la auditoría del §8.5 y
**nunca se había visto con datos**: faltaba el gesto. Y las reglas decidieron la pantalla entera —
SRD 5.1: *«they can't be added together. If you have temporary hit points and receive more of them,
you decide whether to keep the ones you have or to gain the new ones»*. Así que **no suma**: si ya
tiene, pregunta cuál se queda con los dos números delante.

Para poder cumplir esa regla hizo falta que **la decisión viajara**. El servidor se quedaba con el
mayor **por su cuenta**: acierta casi siempre y **quita la elección que el SRD le da a quien los
recibe** — hay efectos que interesa cambiar por otros más pequeños porque duran más. Sin el campo
nuevo se conserva el comportamiento de siempre, para que ninguna pantalla que ya llamaba cambie de
significado sin pedirlo.

**U2 se cierra midiendo, no arreglando.** El plan lo exigía: *«vuelve a medirlo; puede que el
problema sea otro»*. A **375 px** hay **siete destinos alcanzables sin escribir una URL**, todos
visibles, dentro de la ventana y con tamaño, y pulsar uno cambia de pantalla. El problema que la
ficha describía —una columna de secciones que desaparecía y nada la sustituía— **lo arregló el
reseño**; la ficha hablaba de una pantalla que ya no existe.

**Cómo revertirlo.** `git revert` del commit. El ajuste guardado en `localStorage` queda inerte.

## Buscar mira dentro del cuerpo, y pasa por `canView` primero (2026-09-06, plan 14 · U3)

**Qué.** El buscador era del navegador y solo miraba el **nombre**: una ficha que dice «la puerta de
sal» en su tercer párrafo era inencontrable. Y el navegador no puede arreglarlo, porque el cuerpo
hay que buscarlo donde está.

**Cómo.** `GET /campaigns/:id/entities?q=` busca en el nombre y en el cuerpo, en el servidor. **El
orden de los dos filtros es la seguridad**: primero `canView`, después el texto. Al revés, buscar
sería un **oráculo** — una palabra que solo aparece en una ficha `DM_ONLY` la delataría, aunque la
ficha no viajara: bastaría un conteo. Es el mismo defecto que el plan 03 cerró en el ataque, y por
eso **la prueba importante es la que comprueba que NO encuentra**. Con el `canView` quitado, el e2e
se pone rojo en cuatro de sus seis.

**Por qué el texto se compara en el servicio y no en la consulta:** `body` es `Json` —lo que solo se
pinta puede ser Json—, filtrarlo en Prisma pediría SQL crudo y **perdería el `include` de las
concesiones que `canView` necesita**. Esa consulta **ya traía todas las filas de la campaña** para
poder aplicar `canView` en memoria, así que comparar ahí **no añade ni una lectura**.

**Y el filtro del navegador deja de comparar el nombre.** Dejarlo habría dado **dos filtros para lo
mismo**, con el de la pantalla ignorando el cuerpo; el día que discreparan ganaría el que menos
sabe. Las etiquetas se quedan donde estaban: se resuelven sobre lo que ya está pintado.

**Un efecto que había que resolver y no era obvio:** los dos estados vacíos —«aquí no hay nada» y
«tu filtro no encuentra nada»— se decidían por `data.length`, y con el servidor buscando una lista
vacía puede significar las dos cosas. Ahora se deciden por **si hay filtro activo**, que es lo único
que sigue siendo cierto.

**Cómo revertirlo.** `git revert` del commit. No hay datos que tocar.

## Cerrar sin guardar pregunta, y un botón apagado sigue alcanzable (2026-09-06, plan 14 · U8, U9)

**U8 — cerrar con lo escrito sin guardar.** `Escape`, el clic en el velo y el aspa **descartaban
sin decir nada**. Con el cuerpo de una ficha dentro eso es perder trabajo, y las tres salidas son
igual de fáciles de rozar, así que **las tres pasan ahora por la misma puerta**: si una sola se la
saltara sería justo la que nadie prueba.

**Solo avisa si de verdad hay cambios, y eso se compara con VALORES**, no con una bandera de «he
tecleado»: la plantilla de una ficha nueva no cuenta como cambio, y escribir y borrar tampoco. Un
aviso que salta siempre se aprende a descartar sin leer en dos días, y entonces tampoco protege el
día que importa — hay una prueba de la mitad que se olvida: **sin cambios no pregunta**.

Y el aviso **nombra lo que se pierde** en vez de decir «¿estás seguro?», que se pulsa sin leer.

**U9 — `aria-disabled`, no `disabled`.** Este producto deshabilita en vez de esconder y escribe el
motivo, y ahí estaba la otra mitad del problema: con `disabled` de verdad **el botón sale del
recorrido de teclado**, así que quien navega con teclado o con lector no llega a él **ni al motivo**.
El botón informaba a quien mira y ocultaba la información a quien no. Medido el 2026-09-05: **cero
usos de `aria-disabled` en toda la web**.

El arreglo vive en `ui/Button.tsx`, un solo sitio para toda la aplicación, más los dos botones crudos
que también apagan con motivo. **Y la mitad que hay que poner a mano**: `aria-disabled` no impide
pulsar, así que el `onClick` se ignora allí mismo — sin eso, el botón haría exactamente lo que dice
que no puede hacer, que es peor que el problema original.

**Los campos de formulario conservan `disabled`**, y es deliberado: un `<input>` apagado no tiene
motivo que leer al tabular, y `aria-disabled` no impediría escribir en él.

**76 aserciones cambiaron de forma**, y una de ellas destapó algo real: un `waitFor(() =>
expect(boton).not.toBeDisabled())` pasaba al instante porque el atributo ya no existía nunca, y el
clic salía **antes** de que el rol se resolviera. La espera miraba la señal equivocada; ahora mira
`aria-disabled`.

**Cómo revertirlo.** `git revert` del commit. Nada de esto toca datos.

## «+2 a Fuerza durante una hora»: modificadores temporales (2026-09-06, plan 13 · M8)

**Qué.** Lo pidieron **los jugadores, por su nombre** —*«subidas y bajadas de atributos
temporales»*— y **no estaba escrito en ningún plan**: ni en 2A, ni en 2C, ni en 2.5. Era un hueco de
alcance, no una deuda de implementación, y por eso subió de prioridad.

**Cómo, y esto es todo lo que costó:** el motor ya sabía sumar con traza y el reloj ya sabía caducar
cosas. Un modificador temporal es **una fila más y un `Modifier` más**: entra en la derivación como
`op: "add"` con `sourceType: "temporary"`, por la misma puerta que ya usaban las anulaciones
manuales. No hay motor nuevo ni cálculo nuevo.

**Tres cosas que no se negocian y están probadas:**

1. **La columna del personaje no se toca.** Se suma al derivar. Si mutara, al caducar habría que
   restar y cualquier fallo dejaría al personaje cambiado para siempre. Hay una prueba que lee la
   fila cruda y comprueba que sigue diciendo 15 mientras la hoja dice 17.
2. **Al vencer se marca, no desaparece** (D-2C-2). Si se borrara solo, el jugador vería su Fuerza
   bajar dos puntos sin nada que mirar. **Probado por mutación**: haciendo que el vencido siga
   sumando, la prueba se pone roja — es la poción que dura para siempre, el fallo que de verdad
   rompe una partida.
3. **Sale en la traza con su motivo.** Un `+2` sin origen es exactamente lo que la traza existe para
   impedir, así que el motivo es obligatorio y viaja dentro de la clave del paso — el motor no
   devuelve prosa en español, y esa regla no se rompe por esto.

**El vocabulario es cerrado**: las seis características, la CA y las cinco velocidades, con **las
mismas claves que usa la traza**. Ni una más: un modificador a algo que la hoja no calcula sería un
número decorativo.

**Quién puede: el DM o el dueño.** El plan pedía decidirlo y escribirlo. La mayoría de estos efectos
salen de algo que el jugador hace —beberse una poción que ya tiene—, y obligar a que el DM los teclee
convertiría una acción de un turno en una petición. Es la misma autoridad que gastar un recurso.

**Y el reloj puede ir hacia atrás.** Si el DM lo corrige, un modificador vencido revive. Se deja así
**a propósito**: la caducidad es una resta contra el reloj, no un estado guardado, y lo mismo le pasa
ya a una condición. Guardar «ya venció» sería la segunda verdad que 2C.4 rechazó.

**Mirado en el navegador**, como pedía la definición de terminado: se pone la poción, la Fuerza sube,
la traza lo dice, el DM avanza el reloj un minuto desde el cajón de dados, y al volver a la hoja el
modificador sigue ahí — **marcado como vencido**, con la palabra escrita y no solo tachado.

**Cómo revertirlo.** `git revert` del commit y `DROP TABLE "TemporaryModifier"`. Los dos valores del
enum de sucesos se quedan sin usar, que no rompe nada.

## La mesa se puede administrar: papeles que cambian e invitaciones que se ven (2026-09-06, plan 11 · D2, D3b, A3)

**Qué.** Dos cosas que hacían doler una mesa real:

- **El rol era inmutable de por vida.** No había ruta para cambiarlo, así que ascender a alguien
  obligaba a **expulsarlo y reinvitarlo** — y `removeMember` borra la membresía, con lo que se
  **pierde su vínculo con sus personajes**. No era equivalente ni de lejos.
- **Las invitaciones se generaban a ciegas y valían para siempre.** Nadie sabía cuántos enlaces
  vivos había ni podía matar uno filtrado. El propio panel lo decía en un aviso, **y ese aviso
  existía porque no se podía revocar**.

**Cómo.** `PATCH /campaigns/:id/members/:userId`, solo DM, con una regla que no es opcional: **la
mesa no puede quedarse sin ningún DM**, y eso es **409 con su código**, no 403 — no es que no
puedas, es que dejaría la campaña huérfana. Se cuenta **cuántos DM quedarían**, no si eres el
creador: el creador puede haber ascendido a otro y querer bajarse. El cambio deja su suceso
(`MEMBER_ROLE_CHANGED`, `PLAYERS`) porque **es un cambio de permisos**.

Y las invitaciones ganan tres columnas nulables: `expiresAt` (**`null` = no caduca**, para no matar
los ya repartidos), `revokedAt` —**que no es `usedAt`**: gastado y revocado son dos hechos
distintos— y `usedById`, porque un listado que no puede decir **quién** entró no sirve para
administrar. El estado se **deriva**, como el vencimiento de una condición (2C.4).

**Lo que no se ve y es la mitad del valor:** un token inventado, uno gastado, uno revocado y uno
caducado dan **exactamente la misma respuesta**, con un solo `if` y un solo mensaje. Si difirieran,
el mensaje diría si un token existió alguna vez y en qué estado acabó. Y el listado **no devuelve el
token entero**: es una pantalla que un DM abre en una mesa con gente al lado.

**El aviso del panel se reescribió**, que era un punto explícito de la guía de revisión: decía que
generar otro enlace no anula los anteriores «hasta que alguien los use», y eso pasaba a estar
incompleto en cuanto revocar existió. Ahora apunta a la lista de abajo en vez de ser un callejón.

**Trampa de arquitectura:** el suceso no podía escribirse desde `CampaignsService` porque
`GameEventsModule` **importa `CampaignsModule`** — habría hecho falta un `forwardRef`, que este
proyecto ya declaró que es esconder el ciclo. Vive en un módulo propio, `apps/api/src/members/`, y
el grafo se queda dirigido.

**Las dos mutaciones que pedía el plan, probadas**: sin la comprobación del último DM y sin la de
caducidad en `accept`, el e2e se pone rojo en siete de sus nueve pruebas.

**Cómo revertirlo.** `git revert` del commit y `ALTER TABLE "Invite" DROP COLUMN` de las tres. Las
columnas son nulables y nada más las lee, así que dejarlas puestas tampoco rompe nada.

## La batuta: el DM prepara en frío y en la mesa solo pulsa (2026-09-06, plan 09 · I19 e I20)

**Qué.** *«El DM lee el diálogo en voz alta, pulsa, y pasa lo que tenía que pasar.»* El disparador
`DM_EXECUTED` estaba en el vocabulario del motor de reglas **desde el principio** y **no existía el
gesto en ninguna pantalla**, así que nadie escribía el suceso y estaba retirado de la oferta. Era una
función que faltaba, no un cable suelto.

**Por qué importa más de lo que parece.** Hasta hoy el motor reaccionaba a cosas que ocurren solas
—se abre una ficha, se pone una marca, se tira—. Con la batuta, el DM **ata por adelantado** lo que
pasa al abrir el cofre o al entrar en la cripta, y en la mesa solo pulsa. Es lo que convierte el
motor en algo que se usa **preparando la sesión**.

**Cómo.** Suceso nuevo con su migración; `entityId` en el **payload** y no en el sujeto —ejecutar no
es algo que le pase a la ficha—; ruta `POST /campaigns/:id/entities/:entityId/execute` **solo DM**;
visibilidad **`DM_ONLY`**, porque lo que la mesa ve son los **efectos**, cada uno con la suya. Y
**ejecutar no edita**: escribe el suceso y nada más.

**Y el botón no finge.** Cuenta cuántas reglas **armadas** escuchan a esa ficha y lo dice; con cero
se apaga con su motivo. No es control de acceso —el servidor acepta igual, y así debe ser—: es no
ofrecer un gesto que no va a hacer nada. Se cuenta en la pantalla porque la lista de reglas ya está
pedida; un endpoint para contar sería una segunda verdad.

**`ENTITY_ATTACKED` se retira, y se queda en el esquema para siempre.** Se atacan **criaturas**: un
lugar no se ataca, y aquí se ataca a un `Character`. **Medido antes de decidir: 244 reglas guardadas,
ninguna lo usa** — pero quitarlo del esquema haría que una regla vieja **dejara de poder leerse**, y
la regla de interfaz dice que un valor guardado que el selector no ofrece se enseña marcado. Lo que
sí sirve es **`CHARACTER_ATTACKED`**, y **no necesita suceso nuevo**: lo alimenta `ATTACK_RESOLVED`,
que se escribe desde 2.5.3 y cuyo sujeto es el objetivo.

**El fallo que esto destapó, y que no era de este plan:** `matchesTrigger` tenía un
`default: return false`, así que **un disparador nuevo sin su `case` no coincidía nunca, en
silencio**. Le pasó a `CHARACTER_ATTACKED` en su primera pasada: el vocabulario lo admitía, el editor
lo ofrecía, el motor lo recibía, y no pasaba nada. Ahora ese `default` lleva un `never` y el olvido
es un error de compilación.

**Mutación probada**: quitando el `case` de `DM_EXECUTED` del puente, el e2e del camino entero se
pone rojo y los otros cinco siguen verdes — que es exactamente lo que el plan pedía demostrar.

**Cómo revertirlo.** `git revert` del commit. El valor del enum se queda en la base sin usar, que no
rompe nada; una regla guardada con `DM_EXECUTED` volvería a pintarse marcada y no seleccionable.

## Ayudar da ventaja y caduca cuando el SRD dice (2026-09-06, plan 08 · I8)

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

## La inspiración existe: la concede el DM, se gasta y se regala (2026-09-06, plan 08 · I8)

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

## Cada personaje tiene su color, y es el mismo en el hilo y en el elenco (2026-09-06, plan 05 · D3)

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

## Reclasificar una ficha dice lo que cuesta, y deja rastro (2026-09-06, plan 07 · I16)

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

## Un vocabulario del daño con dos formas, y la diferencia es la decisión (2026-09-06, plan 07 · D-OP-14)

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

## Un concepto, un icono — y una prueba que lo sostiene (2026-09-06, plan 07)

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

## La suite e2e de API entera vuelve a poder correrse (2026-09-05)

**Encontrado al ensamblar.** Con los cinco carriles de la noche en `main` se corrieron los e2e de
API **todos juntos** —algo que no se hacía: se corrían por fichero—, y **una docena de suites no
arrancaban**, arrastrando decenas de pruebas en rojo. El mensaje mandaba a mirar las credenciales, que estaban bien; lo que
Postgres decía por debajo era `FATAL: sorry, too many clients already`.

**`PrismaService` no se desconectaba nunca.** Implementaba `OnModuleInit` y no `OnModuleDestroy`,
así que cada `app.close()` de cada fichero de prueba dejaba su pool abierto: 37 ficheros contra
`max_connections = 100`. El arreglo es el patrón canónico de Nest + Prisma, y en producción además
hace un apagado ordenado.

**Medido antes y después:** de una docena de suites muertas a **la suite entera en verde** —los
conteos viven en [08-pruebas.md](./08-pruebas.md)—, con las conexiones estables en 40 durante la
tanda y en 6 al acabar.

**Por qué llevaba tiempo escondido:** por fichero no se ve, y **CI tampoco lo ve**, porque allí cada
worker de Jest es un proceso que muere y libera lo suyo. Solo enseña la cara al correr la suite
entera en una máquina. Es el argumento de por qué ensamblar y probar el árbol junto no es papeleo.

**Cómo revertirlo.** `git revert` del commit: vuelve el pool sin cerrar.

---

## Un personaje se archiva, y vuelve (2026-09-05, plan 06)

**Ficha M9, abierta desde 2.5.8 y tachada en falso una vez.** El servidor sabía archivar —`POST
…/archive`, `POST …/unarchive`, `GET …/characters/archived`, con su columna, sus sucesos y sus
e2e— y **la web no llamaba a ninguna de las tres**: el único `archiv` de `apps/web/src` era la
traducción de la línea del registro. Es el patrón que este proyecto ha cerrado en falso cuatro
veces: servidor hecho, nadie que lo use.

**Lo que entra, en un commit:** las tres llamadas y sus hooks
(`features/characters/api.ts`, `hooks.ts`), el gesto (`features/characters/BotonArchivar.tsx`,
montado en `AjustesDePersonaje.tsx`) y **la puerta de salida**
(`features/characters/ArchivoDePersonajes.tsx`, en la lista de personajes). Las dos mitades
juntas a propósito: un archivo sin listado es un borrado con otro nombre.

**Por qué archivar cuesta menos que borrar, y se ve.** Botón `secondary` frente al filete de
peligro; la confirmación **dice la consecuencia y que se recupera** en vez de preguntar si estás
seguro; y el borrado ahora **nombra archivar** como la salida barata. Si los dos gestos cuestan lo
mismo, la gente borra.

**Y una ficha nueva, medida al escribir el recorrido:** el suceso de archivar se guarda **sin
sesión**, y el hilo de la mesa filtra por la sesión abierta, así que la línea no se lee mientras
se juega. Queda en `06-pendientes.md` con las dos salidas y lo descartado; arreglarla es
`apps/api` o una decisión de producto, ninguna de las dos de este plan.

**De paso se tachó** la ficha «tres pantallas revelan la misma ficha»: la Ola 2 la había cerrado
y el maestro no se había enterado. **Cero líneas de código**, solo el barrido que lo demuestra.

**Revertir:** un commit. Sin migraciones y sin tocar la API — quitarlo devuelve el borrado como
único gesto, que es exactamente el estado que la ficha describía.

**Y lo que encontró su revisión, que entró al fusionar.** Nada bloqueaba —el revisor corrió él mismo
el recorrido de navegador y la suite RTL, y verificó que `deLaLista !== undefined` **falla cerrado**,
nunca abierto—, pero dejó cinco cosas y las cinco se arreglaron aquí:

- **La hoja de un personaje ARCHIVADO se pintaba idéntica a la de uno vivo, con su botón de borrar
  puesto.** Su ruta sigue viva —`getSheet` no mira `archivedAt`— y el archivo **no enlaza a la
  hoja**, así que la única puerta era una URL vieja: exactamente el caso peligroso. Un DM lo borraba
  creyéndolo en juego, que es la pérdida que archivar existe para impedir. Ahora la hoja **lo dice**,
  ofrece **devolverlo**, y **no ofrece borrar** hasta que esté de vuelta. No es control de acceso —el
  servidor sigue aceptando el borrado—: es no poner el gesto caro delante de quien no sabe dónde
  está.
- **`archivedAt` ya viajaba y el tipo no lo declaraba.** El servidor manda la fila entera desde
  2.5.8; solo faltaba escribirlo en `Character` y en `CharacterRow`. Al declararlo, el compilador
  encontró **nueve fixtures** que lo daban por inexistente.
- **El archivo no tenía estado de error**: un fallo de red dejaba una campaña con todo archivado
  leyéndose «Ningún personaje todavía» —la trampa que el plan nombra, entrando por la puerta de al
  lado—.
- **El cableado `puedeArchivar={deLaLista !== undefined}` no lo cubría ninguna prueba**: cambiarlo a
  `true` habría ofrecido «Archivar» en un PNJ, con 404 al pulsarlo, sin que nada se pusiera rojo.
  Ahora hay una prueba por cada lado.
- **Dos frases quedaban mintiendo**: `decisiones.md` decía que de `D-OP-8` «queda archivar», y la
  ficha tachada citaba **tres** consumidores de `sePuedeRevelar` cuando el tercero solo importa el
  botón. La conclusión de esa ficha era correcta; **la evidencia no**, y es justo el género que
  `check:docs` no caza.

---

## Las tres columnas: el bando, dónde abre la escena y la crónica fuera del Json (2026-09-05)

**Qué.** Plan 02 de [los planes del 2026-09-05](./superpowers/plans/2026-09-05-planes/02-tres-columnas.md).
Tres campos pequeños que arreglan una mentira y desbloquean «dónde se quedó» y la línea de tiempo.
El principio que gobierna las tres: **lo que se filtra es columna; lo que solo se pinta puede ser
Json**.

**`Combatant.side`, el bando (migración `20260905010000_combatant_side`).** `CombatantSide` con
`ALLY`, `ENEMY` y `NEUTRAL`, en el **encuentro** y no en `Character`: «enemigo» es una relación en
un momento, no una propiedad de una criatura. Por defecto `NEUTRAL` —«no se ha dicho»—, lo dice el
DM al empezar (`startEncounterSchema.sides`) y el servidor no lo adivina.

**Un hallazgo real de la prueba, y cambió dónde vive el código.** La comprobación de «me has dado el
bando de alguien que no combate» estaba en `EncountersService.start`, **después** del 409 de «ya hay
un encuentro activo»: contra una sesión que ya combatía, la misma petición mal construida devolvía
409 en vez de 400. Se movió al esquema de `@dnd/shared` (`superRefine`), donde el `ZodValidationPipe`
la aplica antes de que el servicio mire ningún estado — que además es lo que la convención del
proyecto manda.

**Cómo se comprobó.** Dos mutaciones. Con el valor por defecto en `ENEMY`, el e2e contra Postgres
que afirma que el personaje sin clasificar llega `NEUTRAL` se pone rojo (`Expected: "NEUTRAL" ·
Received: "ENEMY"`). Con el `superRefine` anulado, la prueba del esquema que rechaza un bando
sobrante se pone roja. Las dos deshechas.

**`Session.openingEntityId`, dónde abre la escena (migración
`20260905020000_session_opening_entity`).** `ON DELETE SET NULL` y no `CASCADE` —borrar un lugar no
borra la sesión que pasó allí, comprobado borrando la entidad de verdad—, y **lo que se devuelve
pasa por `canView`**: si el espectador no puede ver la ficha, el campo llega **ausente**, ni con
nombre ni con id. Dejar el id sería confirmar que la sesión abre en algo escondido. Apuntar a una
ficha de otra campaña es **404**, no 400.

**Y aquí salió el fallo contrario a una fuga.** `SessionsService.canSee` pasa `createdById: ""` y
`grantedUserIds: []`, que para una `Session` vale porque no tiene ni creador ni concesiones — para
una `Entity` **no**. Con ese atajo, una ficha de apertura `OWNER_DM` o `SPECIFIC_PLAYERS` se habría
escondido de quien **sí** tenía derecho a verla, y ninguna prueba de fuga caza eso. La ficha se lee
con sus `grants` y su `createdById` de verdad, y hay una prueba por cada lado.

**Mutación del bando y de la apertura.** Al devolver `openingEntityId` cuando la ficha no es
visible, el e2e se pone rojo con el id filtrado en la salida.

**`Session.recap` y `Session.recapVisibility`, la crónica fuera del Json (migración
`20260905030000_session_recap_column`).** La pantalla ya ofrecía elegir quién ve la crónica, el
esquema ya la aceptaba, y el servicio **publicaba el suceso con la visibilidad de la sesión**: elegir
no hacía absolutamente nada. Ahora son columnas —porque se filtran— y el suceso sale con la
visibilidad de **la crónica**.

**Y salió un segundo fallo que nadie buscaba: `notes` tenía otro dueño.** El motor de reglas escribe
ahí un array de cadenas (`ADD_SESSION_NOTE`), así que una nota puesta por una regla **borraba la
crónica** en silencio — el `Array.isArray` fallaba sobre `{ recap: ... }` y empezaba un array nuevo.
Sacar la crónica del Json no es orden: es dejar de perder datos.

**La pantalla también, porque si no la ficha no cierra.** El diálogo de cierre estrena el selector de
visibilidad que ya existía (`VisibilityChooser`), con los tres niveles que una sesión admite —
`OWNER_DM` y `SPECIFIC_PLAYERS` sobre una crónica no seleccionan a nadie, porque una `Session` no
tiene ni creador ni concesiones—. Servidor arreglado y nadie que lo use es una ficha abierta.

**Cómo revertirlo.** `git revert` de los commits del plan y una migración que haga
`ALTER TABLE "Combatant" DROP COLUMN "side"` + `DROP TYPE "CombatantSide"` y
`ALTER TABLE "Session" DROP COLUMN "openingEntityId"`, `"recap"` y `"recapVisibility"`. **Las
crónicas viejas siguen dentro de `notes`**, que esta migración no tocó, así que revertir no pierde
ninguna.

---

---

## El hilo se lee como una conversación: lo último abajo (2026-09-05)

**Qué.** Plan 04 de [los planes del 2026-09-05](./superpowers/plans/2026-09-05-planes/04-hilo-conversacion.md),
decisión **D1**, en un commit y solo en la web. El registro de la sesión se pinta del más antiguo
al más reciente (`apps/web/src/features/sessions/hilo/HiloDeSesion.tsx:162`), sobre **una copia**
invertida: el servidor sigue mandando el más reciente primero porque de ese orden depende la
paginación por cursor, y `reverse` muta. El scroll se ancla al fondo, pero **solo si el lector ya
estaba ahí** (`:185`); si estaba leyendo más arriba no se mueve nada y sale un aviso pulsable
(`:300`). `loQueTePerdiste` **no se tocó**: su `desde` ya era el más antiguo de los no leídos, y con
el orden nuevo la franja queda con lo no leído por debajo, que es lo que su comentario decía querer.

**Cómo se comprobó.** Tres unitarias nuevas por orden de nodos, no por texto
(`apps/web/src/features/sessions/__tests__/mesa-de-sesion.test.tsx:310`) y tres medidas de
navegador (`apps/web/e2e/mesa-mide.spec.ts:255`), porque en `jsdom` `scrollHeight` vale cero y
**cualquier aserción de anclaje pasa siempre**. Mutación obligatoria: quitar la condición
`alFondoRef.current` deja el `expect(...scrollTop).toBe(arriba)` en rojo; devolver `enOrden` a
`eventos` tumba dos unitarias; sacar la marca de leído del array invertido tumba la tercera. Las
tres deshechas después.

**Lo que encontró su revisión, y por qué importa más que el defecto.** El carril entregó verde y una
revisión con contexto limpio encontró un **bloqueante real**: `apps/web/e2e/sesion.spec.ts` daba por
visto **el último nodo del DOM** —que hasta ese commit era el más antiguo— para comprobar la franja
de «te perdiste». Con el hilo invertido, el último nodo es el **más reciente**: no quedaba nada
perdido y la franja no se pintaba. Se arregló al fusionar (`ids[0]`) y se comprobó **volviendo a
romperlo**: con la línea vieja, ese recorrido cae. La lección no es el diff: **el orden del DOM es
una interfaz compartida**, y voltearlo obligaba a mirar los cuatro recorridos que lo consumen, no
solo el que se estaba editando.

**Cómo revertirlo.** `git revert` del commit: el hilo vuelve a pintarse del más reciente primero,
sin anclaje ni aviso. No hay migración, ni cambio de API, ni dato guardado nuevo.

---

## Las tres baratas: TipTap empaquetado, `build` en CI y la ficha de `lychee` (2026-09-05)

**Qué.** Plan 01 de [los planes del 2026-09-05](./superpowers/plans/2026-09-05-planes/01-tres-baratas.md),
en un commit y sin comportamiento nuevo.

- **Los seis paquetes de TipTap pasan de `devDependencies` a `dependencies`**
  (`apps/web/package.json:19-24`), con las versiones intactas. Su único consumidor sigue siendo un
  script, así que nada se rompía hoy: se rompería **solo en producción** el día que el editor los
  importara desde `src/` y `pnpm install --prod` los dejara fuera de la imagen.
- **CI ejecuta `pnpm build`** (`.github/workflows/ci.yml:47`), **antes de `lint`**. Hasta hoy un
  error de compilación que ninguna prueba tocara llegaba a `main` en verde.
- **`lychee` se cierra por medición, no por retirada:** el barrido no encuentra **ninguna**
  mención viva fuera de `.superpowers/`, o sea que la integración nunca existió.

**Cómo se comprobó.** Mutación obligatoria: un `const x: number = "cadena"` en
`apps/web/src/main.tsx` hace caer `pnpm build` con `error TS2322` y salida 2 — el paso de CI sirve
de algo. Deshecha después. `pnpm verify` en verde con el gancho.

**Cómo revertirlo.** `git revert` del commit: devuelve los seis paquetes a `devDependencies`,
regenera el lockfile con `pnpm install` y quita el paso de CI. Nada depende de ello en tiempo de
ejecución.

---

## La Ola 3, las 21 decisiones y la auditoría de la cola larga (2026-09-05)

**Qué.** Tres commits de código y el cierre de la deuda de decisión que arrastraba el proyecto.

**Las mecánicas que quedaban sin pantalla.** Se repitió el barrido del §8 de la auditoría de la
mesa sobre el árbol ya ensamblado: **de quince, diez estaban resueltas y ninguna se había caído**
—los dos únicos hooks huérfanos ya lo eran antes de `a1d4a1d`, comprobado con `git grep`—. De las
cinco restantes se cerraron tres:

- **`ENTITY_LINKED`** (`6f3d141`): `LinksService.create` escribía la fila y **no emitía el suceso**,
  así que una regla sobre «cuando se enlacen dos fichas» no se disparaba jamás. Enlace y suceso van
  ahora en la misma transacción, y **la visibilidad del suceso no se hereda de un extremo**: un
  enlace revela que dos cosas tienen que ver aunque no se pueda abrir ninguna, así que sale para
  jugadores **solo si las dos fichas ya las ve la mesa**.
- **`concentrationSave`** (`e3c0d4f`): el servidor lo devolvía desde 2C y **ninguna pantalla lo
  leía**, así que la tirada aparecía en la bandeja del jugador y quien aplicó el golpe no sabía que
  la había provocado. Y `PonerDano` cerraba su cajón sin traza: el aviso se habría pintado y
  destruido en el mismo fotograma.
- **Dos de los cuatro disparadores muertos** (`4c7c3a2`): no les faltaba un `case`, **no existían
  como suceso**. `ENTITY_COMMENTED` y `MEMBER_JOINED` ya los escribe su gesto. Los otros dos siguen
  retirados **con su motivo escrito**: `DM_EXECUTED` no tiene gesto en ninguna pantalla, y
  `ENTITY_ATTACKED` apunta a una ficha del mundo cuando aquí se ataca a un personaje. Cierra de paso
  **C6-1**: la lista de disparadores sin motor vivía dos veces y ahora vive en `@dnd/shared`.

**Las decisiones.** Veintiuna cerradas: cuatro del autor —el hilo se lee como una conversación con
lo último abajo; manda `04-convenciones.md` sobre el cobre; el color lo elige el jugador; **el
tablero telaraña se sustituye por la línea de tiempo**—, nueve por investigación contra el SRD y
siete por recomendación. Con una regla nueva y vinculante: **las reglas de D&D son verdad absoluta,
y la maqueta no es fuente de reglas**.

**La auditoría de la cola larga.** Las 55 secciones de `06-pendientes.md` leídas y contrastadas
contra el código. **Siete fichas afirmaban que faltaba algo que ya estaba hecho** —entre ellas que
el elenco no mandaba el tipo de daño, que `recordEntityOpened` no estaba conectado y que equipar no
dejaba rastro—, y una, `M10`, es falsa en su primera mitad y cierta en la segunda.

**Por qué así.** Las siete fichas caducas tenían **su evidencia escrita, y era cierta el día que se
escribió**. Una ficha con un barrido citado dentro envejece igual que el código: por eso lo que se
tache lleva desde ahora **la prueba de cuándo**, no solo la de qué.

**Cómo revertir.** Los tres commits son independientes y se revierten por separado. `6f3d141` y
`4c7c3a2` llevan migración —una columna de enum cada uno—; los valores de un enum de PostgreSQL **se
añaden y no se quitan**, así que revertir el código deja el valor huérfano en la base, que es
inofensivo.
