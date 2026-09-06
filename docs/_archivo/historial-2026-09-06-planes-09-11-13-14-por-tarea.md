# Historial — el detalle por tarea de los planes 09, 11, 13 y 14 (2026-09-05)

**Congelado. Nada de aquí se edita.** Seis entradas por tarea movidas **enteras** el 2026-09-06,
cuando `docs/07-historial.md` llegó a 968 de 1000 ejecutando el paso 1 «las goteras». Se mueven,
no se resumen: un registro fechado es tan cierto como el día que se escribió.

**Qué se movió y por qué estas:** son detalle **por tarea**, que es exactamente lo que el 07
declara archivable — el ledger las cuenta a más resolución y sus hitos se quedan arriba. Ninguna
entrada de hito salió.

Continúa a [`historial-2026-09-05-por-tarea.md`](./historial-2026-09-05-por-tarea.md).

---

## Una sesión se puede leer, no solo editar (2026-09-05, plan 14 · U1)

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

## El ornamento se apaga, un PNJ recibe temporales, y U2 se cierra midiendo (2026-09-05, plan 14 · U7, C6-4, U2)

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

## Buscar mira dentro del cuerpo, y pasa por `canView` primero (2026-09-05, plan 14 · U3)

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

## Cerrar sin guardar pregunta, y un botón apagado sigue alcanzable (2026-09-05, plan 14 · U8, U9)

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

## «+2 a Fuerza durante una hora»: modificadores temporales (2026-09-05, plan 13 · M8)

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

## La mesa se puede administrar: papeles que cambian e invitaciones que se ven (2026-09-05, plan 11 · D2, D3b, A3)

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

## La batuta: el DM prepara en frío y en la mesa solo pulsa (2026-09-05, plan 09 · I19 e I20)

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
