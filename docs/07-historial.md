# Historial

Qué se entregó, por qué, y cómo revertirlo. Fechas absolutas. El detalle por tarea —commit,
número de pruebas, resultado de la revisión— vive en el ledger
`.superpowers/sdd/progress.md`; aquí van los hitos.

---

> **Las entradas anteriores al 2026-09-02 están congeladas** en
> [`_archivo/historial-hasta-2026-09-01.md`](./_archivo/historial-hasta-2026-09-01.md), porque
> este fichero pasó de las 600 líneas que fija el protocolo. Ahí vive el proyecto desde su
> arranque hasta el cierre de la fase 1 y el reseño visual.
>
> **El siguiente corte toca cuando el 2026-09-02 deje de ser el presente.** Ese día concentra la
> fase 2A entera y la ronda de interfaz, así que por sí solo ya está por encima del umbral; se
> deja junto a propósito mientras sea el trabajo en curso, que es lo que se consulta.

## 2026-09-03 (tarde) — 2C.4 (pantalla): la duración al aplicar, la vencida marcada, y la mitad explicada

**Qué.** La otra mitad de 2C.4. La hoja ofrece **cuánto dura** una condición al aplicarla —las
nueve duraciones del SRD más «indefinida», que es lo que había y sigue siendo el valor por
defecto—, pinta la vencida **marcada y en su sitio** con sus dos botones (quitarla o renovarla),
dice lo que le queda a una viva («Vence en 1 h 2 min») y **explica los PG máximos partidos** en vez
de dejar que el número cambie sin más.

**Lo que la tabla de duraciones no ofrece, y por qué:** «hasta el próximo descanso largo» y
«mientras te concentres» **no son duraciones, son sucesos**. Modelarlas como un número sería
mentir, así que no están y queda dicho en el propio módulo.

**Renovar lleva su propio selector**, y esa fue una decisión del carril que merece constar: un
botón «Renovar» a secas tendría que inventarse la duración original, porque **el servidor no la
guarda** —guarda el instante en que vence—, y renovar en silencio con una duración adivinada es
justo la clase de mentira que el resto de la fase evita.

> **Y aquí apareció el defecto que la regla de integración anuncia.** El recorrido de navegador
> encontró que aplicar una condición invalidaba **solo su propia lista**, no la hoja: desde 2A.12
> una condición cambia la velocidad efectiva, y desde 2C.4 **los puntos de golpe máximos**, así que
> la pantalla seguía enseñando 14 donde el servidor ya decía 7 hasta que alguien recargara.
> **Ninguna unitaria podía verlo**: con la caché simulada, las dos consultas se rehacen siempre.
> Arreglado en `useApplyCondition` y `useRemoveCondition`.

**Probado.** 721 unitarias de web y **73 recorridos de navegador en 17 especificaciones**, en verde.
Cinco mutaciones del carril de pantalla, cada una en rojo sobre su prueba, incluida la que borra la
traducción del paso `maxHp.exhaustion.half` y tumba tres pruebas a la vez.

**Cómo revertir.** `git revert` del commit. Solo toca la web; el servidor ya sabía hacer todo esto.

## 2026-09-03 (noche) — **La fase 2C está en producción**

**Qué.** Desplegada la tanda entera de 2C en `dnd.supportive.pro`, lanzada por la API de Coolify
desde dentro de la VPS, con **volcado previo de la base** porque la tanda trae cuatro migraciones.

**Comprobado con evidencia, no con el «queued»**: el commit desplegado es el que se empujó
(`b0d6a6d`), los tres contenedores vuelven sanos, **las cuatro migraciones se aplican solas**, el
índice único parcial de las tablas del DM existe en producción, la SPA da 200, la API exige sesión
y el certificado es el del dominio. La tabla está en [03-despliegue.md](./03-despliegue.md).

**Lo que no se hizo, por decisión del autor:** la partida de prueba con dos cuentas de jugador, que
pasa **a después de la fase 2D**. El despliegue queda en pie para cuando toque.

## 2026-09-03 (noche) — La fase 2D: los PNJ tienen números y bajan a la mesa

**Qué.** El autor eligió el alcance grande de 2D: no solo la ficha del PNJ, sino el PNJ jugable —
que recibe daño, coge condiciones y aparece en el registro. Cuatro bloques hasta ahora.

**La decisión que hace que el alcance grande no cueste el doble:** un PNJ en la mesa **es una fila
de `Character`**. `Character` ya trae, probado y desplegado, todo lo que un combatiente necesita
—PG, condiciones con vencimiento, versión optimista, salvaciones de muerte, inventario, su sitio en
el registro—, y reescribir eso para PNJ habría sido duplicar el sistema más revisado del proyecto
para desincronizarlo el primer día que alguien arregle un fallo en una sola de las dos copias.

**Tres invariantes verificadas contra los quince statblocks del SRD ANTES de escribirlas**, no
después: los PG son la media de los dados **más la Constitución por cada dado** (el ogro es
«59 (7d10 + 21)», y 21 es su +3 siete veces), el dado de golpe sale del **tamaño** de la criatura, y
el bonificador de competencia sale del **valor de desafío**. Quince de quince cada una.

**Dos nombres que habrían salido mal por criterio.** La traducción oficial dice **«Goblin»** y no
«trasgo» —trasgo es el colectivo de los goblinoides— y **«Tumulario»** y no «Espectro», que es el
*specter*; se confirmó por CA 14 y PG 45 (6d8+18) exactos. Se bajó el PDF oficial en español y se
comprobaron los quince uno a uno.

> **Un fallo de diseño propio, encontrado al enganchar la hoja.** Había **dos** caminos que
> construían una hoja de personaje —el de leer (`buildResponse`) y el de mutar
> (`construirODenegar`)— y cada uno derivaba por su cuenta. Al añadir la rama de PNJ se parcheó
> uno, y el otro siguió intentando construir un personaje sin raza ni clase: la pantalla devolvía
> un 200 con la hoja vacía. **Es exactamente lo que la revisión de 2C llamó «la mitad del sistema
> sin arreglar»**, y la respuesta no fue añadir la rama dos veces sino que exista un solo sitio
> donde añadirla: `hojaOMotivo`. El agotamiento se aplica ahí, para que leer y mutar recorten
> contra el mismo máximo.

**Una mutación que sobrevivió y no era un hueco de prueba**: `Math.ceil` → `Math.floor` sobre el
valor de desafío es una **mutación equivalente**, porque los VD fraccionarios del SRD solo existen
por debajo de 1 y caen todos en la misma banda. Queda anotada en `06-pendientes.md` para que el
próximo que mida cobertura no escriba una prueba que no puede fallar. Y una que **no se contó**:
un `return` temprano que dejaba el resto inalcanzable, con lo que la suite no compiló y no midió
nada. Una mutación que no compila no es una medición.

**Probado.** Unitarias de motor, de catálogo, de servicio y de instanciación; y un e2e contra
Postgres real que recorre el bucle entero —instanciar, derivar del statblock, recibir daño, una
anulación del DM en la traza, y **el agotamiento partiéndole los PG máximos a un ogro sin que se
escribiera una línea de agotamiento para PNJ**. Esa última es la que justifica la decisión de
diseño de la fase entera. Siete mutaciones comprobadas en rojo.

**La cascada de borrar una campaña cuenta la tabla nueva**, que es la lección que 2C dejó escrita:
un huérfano no avisa, la operación devuelve 200 igual.

**Cómo revertir.** `git revert` de los commits de 2D y quitar las dos tablas
(`CampaignStatblock` y la columna `Character.statblockRef`). El camino del personaje jugador no se
tocó, y hay una prueba que lo dice.

## 2026-09-03 (noche) — El cierre de la fase 2C: cuatro fichas, una revisión de dos frentes y once arreglos

**Qué.** El autor pidió cerrar todo lo que se pudiera antes de 2D. Esto es lo que se cerró.

**Las cuatro fichas que quedaban de 2C**: pedir las salvaciones de marcha forzada (**C2C-4**),
pintar la tabla de la casa en la tirada que la disparó (**C2C-5**), editar una tabla (**C2C-6**) y
«solo las mías» en el registro (**C2C-7**). Y **C2C-1 contestada por el autor**: no, un jugador no
puede esconderle una tirada al DM — se cierra con tres modos.

**Y una revisión del diff entero, en dos frentes de solo lectura**, que es lo que esta sesión se
había saltado. Trece hallazgos; **once arreglados el mismo día**, cada uno con su prueba y su
mutación comprobada. Los cuatro que más importan:

> **1 · Seguro. El texto de una tabla `DM_ONLY` volvía al jugador en la respuesta del `POST`.**
> Es el agujero de la tirada a ciegas otra vez, un método más abajo, **y en la configuración por
> defecto**: una tabla nace `DM_ONLY`, su suceso se escribía bien —el registro la escondía— y la
> respuesta la cantaba entera. Un jugador que sacara un 1 leía la tabla de pifias del DM. Ahora se
> tira igual (el DM la necesita) y lo que se decide es si el texto viaja, y lo decide `canView`.
>
> **2 · Seguro. La condición vencida de un PNJ `DM_ONLY` se anunciaba a toda la mesa.** El suceso
> se escribía con `PLAYERS` fijo, así que filtraba que ese PNJ existe y qué le pasaba. El argumento
> de que la caducidad se ve —para no dejar al jugador con el «qué» y sin el «por qué»— vale para el
> personaje de un jugador; escrito fijo, se aplicaba también a los del DM.
>
> **3 · Regla. Curar no respetaba los PG máximos partidos por agotamiento.** `changeHp` —el camino
> principal de curación de la mesa— derivaba «pelado»: sin las anulaciones del DM y sin las
> condiciones. Un personaje con agotamiento 4 se curaba hasta el máximo entero y la hoja se lo
> enseñaba recortado con el aviso de «superan el máximo». **Es exactamente el fallo que 2C.4 decía
> haber arreglado, con la mitad del sistema sin arreglar.**
>
> **4 · Regla. El descanso largo devolvía dados de golpe redondeando hacia ARRIBA.** El SRD dice
> «half of», y la 5.ª edición **redondea hacia abajo incluso con un medio exacto**; la propia
> cláusula del «mínimo de un dado» lo demuestra, porque con redondeo hacia arriba sobraría. Nivel 5
> devuelve 2, no 3. **Y la prueba consagraba el error**: se llamaba «MUTACIÓN CLAVE» y afirmaba
> «2,5 → 3 hacia arriba». Se corrigieron las dos, la unitaria y la e2e.

Los otros siete: una carrera que permitía responder dos veces la misma petición de tirada (ahora la
condición va **dentro del `where`**, que es la base garantizando lo que un `if` no puede); la tirada
y la tabla que dispara **compartiendo transacción**, que un comentario prometía y nadie cumplía;
`mine` pisando en silencio a `characterId`; un 403 donde el resto de la fase eligió 404; la ventaja
**descartada en silencio** al pedirla sobre un `1d20r1` (la suerte del mediano); el mínimo de cero
de un dado de golpe, que es **por dado** y no por descanso; y un agotamiento ya vencido que un
descanso «gastaba» igual.

**Tres pruebas que no probaban**, también corregidas: una cuyo nombre prometía el caso contrario al
que ejecutaba, una que defendía el modo y la audiencia de una petición **sin comprobarlos nunca**, y
un e2e del tope de curación que **pasaba por casualidad** porque los dados reales casi nunca llegaban
al borde.

**Y dos cosas que no eran de esta tanda y estaban mintiendo**: la fila de `01-arquitectura.md` que
decía «solo DM» de `world-state` cuando **un jugador ya escribe ahí** al abrir una ficha (ficha A2,
que predijo exactamente esto), y `09-primera-partida.md`, que describía la herramienta de la fase 1
y llamaba imposible seguir un enlace **que lleva funcionando desde el reseño**.

**La cascada de borrar una campaña pasa de contar ocho tablas a diecisiete** (ficha A1), y se cerró
justo antes de desplegar por un motivo concreto: un huérfano en una tabla nueva **no avisa**, la
operación devuelve 200 igual.

**Probado.** 1203 unitarias de API · 769 de web · 43 de esquemas · **186 e2e de API en 29 suites** ·
**79 recorridos de navegador en 20 especificaciones**. Todo en verde y mirado. Ocho mutaciones
comprobadas sobre los arreglos de la revisión, cada una en rojo sobre su prueba.

**Cómo revertir.** `git revert` del commit. Dos cambios de comportamiento que conviene conocer antes
de revertir: responder la petición de otro pasa a **404** (era 403), y el descanso largo devuelve
**menos** dados de golpe que antes, que es lo que dice la fuente.

## 2026-09-03 (tarde) — El reloj tiene mando (ficha C2C-3), y con él la fase 2C queda usable

**Qué.** El endpoint del reloj llevaba media tarde existiendo y **ninguna pantalla lo llamaba**: el
DM solo podía avanzar el tiempo por API. Eso dejaba a 2C.4 **sin el gesto que la enciende** —una
condición que dura una hora no vence nunca si nadie puede hacer que pase esa hora— y habría dejado
la fase 2 cerrada con un agujero justo en el guion de la partida de prueba, que pide avanzar el
reloj.

Se cierra con un panel en la pestaña «Dados»: la hora en palabras («Día 2, 06:00», **no una fecha**
—el contador no es un calendario—), cinco saltos, y el viaje con sus tres ritmos y sus cifras del
SRD. **La hora la lee cualquiera y la mueve el DM**, por el mismo motivo que el suceso del reloj es
visible para la mesa: un jugador que viera caducar su condición sin saber que ha pasado la noche se
quedaría con el «qué» y sin el «por qué».

**Y las salvaciones de marcha forzada se enseñan con su CD**, una por hora pasada de ocho, en vez de
esconderse en un aviso. El servidor ya las devolvía calculadas; encadenarlas con la petición de
tirada de 2C.5 queda como ficha C2C-4.

**Dos detalles que la pantalla arregló y no eran de esta tarea:** el mismo número aparecía con dos
signos menos distintos —`-5` en el resultado y `−5` en la etiqueta del ritmo—, y el recorrido de las
condiciones avanzaba el reloj **por API**; ahora lo avanza pulsando el botón, que es lo que de
verdad se quería probar.

**Probado.** 748 unitarias de web y los 78 recorridos de navegador, en verde. Dos mutaciones: los
controles del DM enseñados a todo el mundo, y el salto mandando un número fijo en vez del elegido.

**Cómo revertir.** `git revert` del commit. Solo toca la web; el endpoint queda intacto.

## 2026-09-03 (tarde) — 2C.6 (pantalla): las tablas del DM, y el interruptor que se podía escribir y no leer

**Qué.** La pantalla de las tablas, en su propia pestaña de «La mesa». **Lo primero que se lee es
qué son**: el SRD no trae ninguna tabla de críticos ni de pifias, lo único oficial es que un
crítico duplica los dados y no los modificadores, y estas las pone la mesa. Esa frase va arriba y
sin adornos porque es la regla del proyecto de que la pantalla no mienta sobre lo que hace el
servidor.

**El interruptor va como dos radios con su frase**, no como una casilla: la posición «Apagada»
lleva la frase que importa —«un crítico sigue duplicando dados y nada más»— y una casilla no tiene
dónde ponerla.

> **Y el carril de pantalla encontró un hueco del servidor, que se cerró en el servidor.** El
> interruptor **se podía escribir y no leer**: ningún `GET` devolvía `houseTablesEnabled`, así que
> al entrar la pantalla no sabía en qué posición estaba. El carril lo resolvió como debía —diciendo
> en pantalla que no le constaba, en vez de marcar «Apagada» por defecto, que habría sido la
> interfaz afirmando un estado del servidor que no conoce—, y al integrar se arregló donde tocaba:
> el estado viaja ahora **con la lista de tablas**, porque nadie necesita lo uno sin lo otro. **Y lo
> ve la mesa entera, no solo el DM**: si una campaña juega con tabla de pifias, sus jugadores tienen
> derecho a saberlo antes de sacar un 1.

**Probado.** 740 unitarias de web, 1183 de API, 181 e2e de API y **78 recorridos de navegador en 19
especificaciones**, en verde. Seis mutaciones del carril de pantalla —incluida la que cambia la
frase de «el SRD no trae estas tablas» por una neutra— y una más en el servidor.

**Cómo revertir.** `git revert` del commit. La lectura del interruptor es aditiva: revertirla
devuelve la pantalla al estado en que lo decía en vez de saberlo.

## 2026-09-03 (tarde) — 2C.5 (pantalla): el DM pide, a la jugadora le aparece sin recargar

**Qué.** La otra mitad de 2C.5, y el recorrido que la cierra: **dos navegadores**, el DM pide desde
su pantalla de dados, a la jugadora le aparece **sin recargar** —sondeo cada quince segundos, más
corto que los treinta del inventario porque esto es una pregunta que espera respuesta—, tira desde
ahí, y el DM ve el resultado en el registro.

**La guía de CD rellena, no sustituye.** Seis botones con su número que escriben en el campo, y el
campo acepta cualquier otro: el SRD la da como guía —«the DM sets the DC»— y obligar a elegir una
de las seis convertiría una ayuda en una jaula.

> **Dos cosas salieron de mirar la pantalla montada, y ninguna la habría visto una unitaria.**
>
> - **Dos campos distintos compartían el rótulo «Qué se tira»** —el de la petición y el de la
>   expresión libre— en la misma pantalla. Quien navega con lector de pantalla oía dos veces lo
>   mismo para dos controles que no son lo mismo. El de la petición pasa a ser **«Qué le pides»**.
> - **La pantalla del DM enseñaba dos veces seguidas el mismo par de bloques de radios** —ventaja
>   y audiencia, uno por tarjeta— y se leía como una repetición, no como dos herramientas. Ahora
>   van en **dos columnas** cuando hay sitio: a la izquierda lo que le pides a la mesa, a la
>   derecha lo que tiras tú. **No se escondió ninguna opción para arreglarlo** —los radios con su
>   frase son regla vinculante—: se cambió dónde caen.

**Probado.** 740 unitarias de web y el recorrido de dos navegadores, en verde. Ocho mutaciones del
carril de pantalla, cada una en rojo sobre su prueba.

**Cómo revertir.** `git revert` del commit. Solo toca la web.

## 2026-09-03 (tarde) — 2C.6 (servidor): las tablas del DM, apagadas por defecto

**Qué.** El último bloque de 2C, y el que más cuidado pedía porque **no es una regla del juego**.

**Lo que dice la fuente:** el SRD **no trae ninguna tabla de críticos ni de pifias**. Lo único
oficial es que un crítico duplica los dados y no los modificadores, que es lo que 2B ya hace. Todas
las tablas que circulan son caseras. El autor las quiere porque **el DM de esta mesa las usa**, y
esa es una razón perfectamente válida — pero entonces entran como lo que son:

1. **Interruptor por campaña, apagado por defecto** (`Campaign.houseTablesEnabled`). Con él
   apagado, un crítico sigue duplicando dados y nada más.
2. **A la vista.** Cada consulta deja su `TABLE_ROLLED` en la línea de tiempo, con la visibilidad
   de la tabla. Una tabla que se dispara sin dejar constancia convierte una partida de 5.ª edición
   en otra cosa sin que los jugadores se enteren.
3. **Como primitiva, no como «funcionalidad de pifias».** Tirar sobre una tabla con sus resultados
   y su visibilidad sirve igual para **botín, rumores y encuentros aleatorios**: una pieza, cuatro
   usos, que es lo que el alcance de la fase 2 ya sospechaba.

**El esquema hace de corrector de tablas.** Los rangos no se pueden solapar —dos filas que cubran
el 7 darían dos resultados distintos para la misma tirada, un fallo que solo aparece cuando alguien
saca justo ese 7— ni dejar huecos, ni empezar en otro sitio que el 1: «no sale nada» no es una
entrada de ninguna tabla, es un olvido. Y **el dado sale de la tabla**: tantas caras como su
resultado más alto, así que una de veinte filas se tira con un d20 y una de cien con un d100 sin
que nadie tenga que decirlo.

**Una sola tabla de críticos y una de pifias por campaña, y lo garantiza la base**: un índice único
**parcial** de Postgres sobre `trigger <> 'NONE'` —las tablas sin disparador son muchas—, escrito a
mano en la migración porque Prisma no sabe expresarlo. En la base y no en un `if` del servicio por
el motivo de siempre: la comprobación en el servicio es una carrera esperando a ocurrir en cuanto
alguien tenga dos pestañas abiertas.

> **Y el recorrido encontró un defecto que no era de esta tarea.** La tabla rechazaba un hueco con
> un mensaje escrito a propósito —«Falta el resultado 6: la tabla no puede tener huecos»— y la
> respuesta llegaba diciendo «El campo «entries» no tiene un valor válido»: el traductor de errores
> de validación mandaba **todos** los `custom` de Zod a una frase genérica. Eso choca con la regla
> del propio proyecto —*un 400 se escribe para que una persona lo lea y sepa qué arreglar*—, porque
> la regla que comprueba un `superRefine` no la puede adivinar esa capa: la sabe quien escribió el
> esquema. Ahora **el mensaje del esquema gana**, salvo el «Invalid input» por defecto de Zod, que
> está en inglés y no dice nada.

**Lo que no se prueba en e2e, dicho:** el disparo automático de un crítico o una pifia necesita que
el d20 saque un 20 o un 1 a voluntad, y el tirador solo se fija inyectándolo. Lo cubren las
unitarias con sus cuatro ramas; un recorrido que tirara cuarenta veces esperando un natural sería
una prueba que a veces no prueba nada.

**Probado.** 1182 unitarias y **181 e2e en 29 suites**, en verde. Tres mutaciones: el interruptor
ignorado, la consulta de tabla hecha en toda tirada en vez de solo con un natural, y el mensaje
propio del esquema descartado.

**Cómo revertir.** `git revert` del commit y deshacer la migración `tablas_del_dm`, que añade dos
tablas, una columna con valor por defecto y un valor al enum de sucesos.

## 2026-09-03 (tarde) — 2C.5 (servidor): la guía de CD y la petición de tirada

**Qué.** Las dos las pidió el DM asesor.

**La guía de CD resultó no ser una decisión.** Se creía que había que inventar la escala; el
contraste encontró que **la tabla «Typical Difficulty Classes» está en el SRD 5.1**
(<https://5thsrd.org/rules/abilities/ability_checks/>), así que es una transcripción de seis filas
—de CD 5 «muy fácil» a CD 30 «casi imposible»— y va en el catálogo, con su prueba de valor a mano
como las razas y las clases: un invariante de forma caza el copiar y pegar, pero **no el dígito mal
transcrito**. Van la clave y el número; la forma legible la escribe la pantalla, como todo lo demás.

**Y no elige la CD por ti.** El SRD la da como guía —«the DM sets the DC»—, así que se enseña al
lado del campo y el DM escribe el número que quiera. Obligar a elegir una de las seis convertiría
una ayuda en una jaula.

**La petición de tirada** copia la forma que las mesas virtuales ya tienen resuelta (Foundry:
*Requestor*, *Roll Manager*, *Request Roll*): el DM elige **a quién**, **qué** y **con qué CD**; al
jugador le aparece; al tirar, el DM ve el resultado. Con sondeo, que es el criterio de toda la
fase 2.

**La decisión que más cambia: se pide un VALOR de la hoja, no una expresión.** El DM pide
«Percepción», no «1d20+5». Tres motivos, y el tercero la hace obligatoria:

1. **El DM no tiene por qué saberse el modificador de cada jugador.** Pedirle la expresión montada
   es pedirle que consulte cinco hojas antes de decir «tirad percepción».
2. **Si el modificador cambia entre que se pide y se tira** —sube de nivel, se pone una armadura,
   le entra una condición—, la expresión guardada estaría mintiendo. El modificador se lee **al
   tirar**.
3. **Componer la tirada es una regla del juego, y las reglas viven en el servidor.** Es la misma
   línea que hizo que la ventaja se pidiera por nombre y no como `2d20kh1`.

**Una petición por personaje**, aunque el DM pida a cinco a la vez: así cada uno tira con su
modificador y el registro no tiene que desenredar después quién de los cinco falló. Y si uno de los
personajes no es de la campaña **no se escribe ninguna** — con la comprobación dentro del bucle
quedarían cuatro escritas y un error, que es el peor de los dos mundos.

**Tres detalles que son reglas, no acabado:** responderla exige ser el dueño del personaje o el DM
—otro jugador respondiendo sería tirar en nombre ajeno—; se marca respondida **después** de tirar,
para que una tirada fallida no deje el botón desaparecido sin que haya pasado nada; y pedir un valor
que la hoja no deriva es **un 400, no un `1d20+0`**, porque un cero silencioso es un número que la
mesa se cree.

**Y la tirada a ciegas se hereda entera**: el DM puede pedir «percepción a ciegas» y quien tira no
ve su resultado. Es lo que 2C.1 dejó preparado antes de que esto existiera.

**Probado.** 1160 unitarias y **172 e2e en 28 suites**, en verde. El recorrido de la petición corre
con **tres cuentas** —DM, la jugadora y otro jugador de la mesa— porque las tres cosas que hay que
comprobar son de quién ve qué. Tres mutaciones: el filtro de «solo mis personajes» quitado del
listado, la comprobación de campaña desactivada, y marcar la petición como respondida antes de
tirar.

**Cómo revertir.** `git revert` del commit y deshacer la migración `peticion_de_tirada`, que añade
la tabla `RollRequest`. Nada más depende de ella.

## 2026-09-03 (tarde) — 2C.4 (servidor): la condición que caduca sola, y el agotamiento que llega al motor

**Qué.** Con reloj, una condición puede llevar **su vencimiento en tiempo de juego**. Se aplica con
`durationSeconds` y el servidor guarda **el instante en que vence**, no la duración: guardar «dura
una hora» obligaría a guardar también «desde cuándo», y ese segundo dato puede discrepar del
primero; con el instante, «¿sigue viva?» es una resta contra el reloj.

**Vence sola, pero no se borra**, que es la decisión D-2C-2 del autor y coincide con la práctica
—Foundry desactiva el efecto al vencer en vez de borrarlo desde la v11.3—: la condición **sigue en
la hoja, marcada como vencida**, y el DM la retira o la renueva. Si desapareciera sola, el jugador
vería cambiar sus números sin saber por qué y el DM tendría que llevar la cuenta a mano, que es
volver al papel.

**Y el vencimiento se deriva, no se guarda.** No hay ninguna columna `expired` ni ningún barrido
periódico. Dos propiedades que un barrido no puede dar: **no puede quedarse a medias** —si el
barrido falla o nadie lo ejecuta, la condición seguiría frenando a alguien después de su hora— y
**no hay dos verdades** que puedan discrepar. Lo único que sí se escribe es el suceso
`CONDITION_EXPIRED` cuando el reloj deja atrás su hora, y existe para que **el jugador vea por
qué**: un número que cambia sin explicación es la mitad del fallo que esto arregla.

**El agotamiento llega al motor (hueco H-2C-5).** Hasta hoy las condiciones solo alimentaban la
velocidad, y **el nivel 4 parte los Puntos de Golpe máximos por la mitad** (SRD 5.1). Así que una
hoja con agotamiento 4 enseñaba unos PG máximos que la regla dice que ese personaje no tiene **y
curaba hasta ese número equivocado**, porque el tope de la curación sale del mismo cálculo. Es el
mismo fallo que 2B tuvo con el equipo, en la otra mitad del sistema. Se aplica **con su paso en la
traza** —el proyecto entero se apoya en poder responder «¿de dónde sale este número?»— y no se
acumula por nivel: en el 5 y el 6 sigue siendo la mitad, no un cuarto.

**Lo que cuesta, dicho:** derivar la hoja pasa a leer las condiciones y el reloj. Se paga a
sabiendas — calcularlo solo al leer la hoja y no al mutarla dejaría a las mutaciones recortando
contra un máximo que no existe, que es la clase de discrepancia que este servicio evita en todo lo
demás.

**Probado.** 1143 unitarias y **164 e2e en 27 suites**, en verde. Cinco mutaciones comprobadas: la
frontera del vencimiento (`>=` por `>`), el nivel de agotamiento (4 por 5), el `null` que no se
escribe al renovar una condición —que la haría heredar en silencio la caducidad anterior—, el
anuncio del vencimiento suprimido, y el filtro de condiciones vivas quitado de la hoja. **Una de
ellas no midió nada en el primer intento** porque el mutante no compilaba, y se repitió.

**Cómo revertir.** `git revert` del commit y deshacer la migración
`condiciones_con_vencimiento`, que añade una columna (`CharacterCondition.expiresAtClock`) y un
valor al enum de sucesos. La columna admite nulos, así que revertir solo el código no rompe nada.

## 2026-09-03 (tarde) — 2C.3: el reloj de la campaña, el viaje y las tres reglas del descanso

**Qué.** El sistema no modelaba el tiempo de juego **en absoluto**, y esa fue la corrección que
trajo el DM asesor: hay efectos que duran una hora y no había reloj contra el que comprobarlo.
Ahora `Campaign.clockSeconds` es un contador de segundos de juego que solo el DM avanza, con su
suceso en la línea de tiempo, y **viajar es avanzar ese mismo reloj**.

**Segundos y no minutos ni una fecha**, y el porqué es concreto: un asalto son seis segundos, así
que la iniciativa de Encuentros avanzará este mismo contador de seis en seis. Es el mismo mecanismo
a dos escalas, que era la promesa del alcance. Un calendario es una capa encima; al revés no se
puede. Detalle en [05-datos.md](./05-datos.md).

**El ritmo de viaje y la marcha forzada, transcritos del SRD** (huecos H-2C-3 y H-2C-4,
<https://5thsrd.org/adventuring/movement/>): rápido 4 millas/hora y **−5 a la Percepción pasiva**,
normal 3, lento 2. Y pasadas ocho horas de marcha, **una salvación de Constitución por cada hora
extra, con CD 10 + 1 por hora**, cuyo fallo da un nivel de agotamiento. El servidor **devuelve las
tiradas que hay que pedir, con su CD ya calculada**; no las tira. La máquina ejecuta, el DM arbitra.

**Las tres reglas del descanso que el reloj hace comprobables**, y las tres son del SRD
(<https://5thsrd.org/adventuring/resting/>):

1. **Un solo descanso largo por cada 24 horas de juego.** Hasta hoy se podía descansar largo tres
   veces seguidas y curarse entero cada vez — la mesa lo sabía y por eso no usaba el botón.
2. **Hay que empezarlo con al menos 1 punto de golpe.** A cero no se descansa: te estás muriendo.
3. **Si se interrumpe, hay que empezar otra vez.**

> **Y aquí la fuente corrigió a nuestro propio plan, que es exactamente para lo que se buscó.** El
> plan de 2C prometía dos cosas que **no están en el SRD 5.1**: una lista de disparadores de
> interrupción —«iniciativa, un conjuro que no sea truco, daño»— y que *«con una hora hecha, se
> cobran los beneficios de un corto»*. Lo que dice el manual es que interrumpe **una hora de
> actividad agotadora** y que entonces hay que **empezar el descanso otra vez para obtener
> cualquier beneficio**. No hay medio descanso largo. Se implementó lo que dice la fuente: un
> descanso interrumpido **no repone nada**, queda escrito como interrumpido en la línea de tiempo
> —para que nadie tenga que acordarse de que aquella noche no contó— y **no gasta el descanso del
> día**, porque lo que la regla limita es *beneficiarse*, no tumbarse. Un DM que quiera darles el
> corto lo tiene a un botón. La corrección está anotada dentro del propio plan.

**La interrupción la declara el DM**, no la detecta el sistema: no sabe si os atacaron a la tercera
hora. Es la misma línea que gobierna el resto de la fase.

**Probado.** 1118 unitarias de API y **158 e2e en 26 suites**, todos en verde. Cinco mutaciones
comprobadas, cada una en rojo sobre su prueba: la marcha forzada empezando a la octava hora en vez
de la novena, el límite de 24 horas desactivado, la regla del punto de golpe desactivada, el
descanso interrumpido reponiendo como uno normal, y el reloj sumándose en memoria en vez de con
`increment`. **Dos de esas cinco no midieron nada en el primer intento** —una no compilaba y la
otra no llegó a aplicarse por una indentación— y se repitieron: una mutación que no rompe el
código no es una mutación superada, es una medición que no se hizo.

**Cómo revertir.** `git revert` del commit **y** deshacer la migración
`20260903152449_clock_de_campana`, que añade dos columnas (`Campaign.clockSeconds` y
`Character.lastLongRestClock`) y dos valores al enum de sucesos. Las columnas tienen valor por
defecto, así que revertir solo el código deja la base con dos columnas de más y nada roto.

## 2026-09-03 (tarde) — 2C.2: la pantalla de dados, relanzar, y los dos topes que faltaban

**Qué.** El bloque 2 de la fase 2C, en tres piezas.

**1 · La pantalla de dados.** Expresión libre, los siete dados como atajos, ventaja/desventaja,
audiencia, motivo y CD, con el registro de tiradas debajo. La forma sale del prototipo —revisión
obligatoria antes de dibujar una pantalla nueva— y **cuatro cosas se apartan de él a propósito**,
cada una escrita en la cabecera del componente: el campo de expresión libre y los atajos (el
prototipo solo enseña un d20, y «tira 2d6+3 porque lo digo yo» es la mitad de lo que pasa en una
mesa), la audiencia (que el prototipo no tiene y el contrato de 2C.1 sí), y el motivo con la CD. Lo
que el prototipo enseña y **no** se construye son las macros del jugador: ficha **C2C-2**, para que
la ausencia sea una decisión y no un olvido.

**Y el rechazo de una expresión inválida por fin se pinta.** El evaluador lleva desde 2A.1
devolviendo un motivo en español y no lo enseñaba nadie: ahora sale **en línea, junto al campo**, y
retira el resultado anterior — dejarlo puesto al lado de un error es la forma más barata de que
alguien cante un total que no salió de esa tirada.

**2 · Relanzar (hueco H-2C-6).** El evaluador entendía `kh`/`kl` y nada más, así que el estilo de
combate con arma a dos manos —relanzar unos y doses— se hacía a mano. **La sintaxis se copió en vez
de inventarla, y ahí salió una trampa que conviene no heredar:** Foundry usa `r` para «relanza una
vez y quédate el resultado nuevo» (<https://foundryvtt.com/article/dice-modifiers/>); Roll20 escribe
el mismo caso como `2d6ro<2` **porque su motor trata `<` como `<=`**
(<https://help.roll20.net/hc/en-us/articles/360037773133-Dice-Reference>). Se toma la forma de
Foundry y **no** su trampa: aquí `<` es «menor que», y el mismo caso se escribe `2d6r<3`. La
recursión (`rr`) **no entra**: ninguna regla del SRD relanza en cascada, y sería una sintaxis que
nada de este juego usa y un bucle que habría que acotar.

El dado relanzado **se enseña tachado**, en el mismo sitio que el descartado por `kh`/`kl` — para
la mesa son lo mismo, un dado que cayó y no suma, así que relanzar no necesitó tocar la pantalla.

**3 · Los dos topes de la ficha P2**, que estaban prometidos «para 2C»: el término constante de una
expresión (hasta hoy `1d20+999999999` se aceptaba y se escribía en el registro) y la anulación del
DM, que pasa de un ±999 único a **un rango por clave**. El detalle y el porqué de cada número, en
[06-pendientes.md](./06-pendientes.md).

**Cómo se trabajó.** La pantalla la construyó un agente con su frontera de ficheros escrita
(`apps/web/src/features/rolls/**`, sin cablear y sin e2e); el evaluador, los topes, el cableado del
carril, la prueba de navegador y esta documentación, el orquestador. **Al integrar salieron dos
cosas que ningún carril podía ver solo**: la tarjeta iba centrada y en el prototipo va pegada al
filo izquierdo bajo el título —se vio poniendo las dos capturas al lado, no leyendo el código—, y
el recorrido de la tirada a ciegas **medía el caso equivocado**: tiraba con la cuenta del DM, que sí
ve su propia tirada a ciegas, así que pasaba en verde sin comprobar nada. Ahora invita a un jugador
y tira desde su navegador.

**Probado.** 1118 unitarias de API, 703 de web, 43 de esquemas, 146 e2e de API y **71 recorridos de
navegador en 16 especificaciones**, todos en verde. Cuatro mutaciones en el evaluador (quedarse el
mejor de los dos dados en vez del nuevo; `<` como `<=`; ordenar el `kh` sobre los dados relanzados;
quitar el tope de la constante), una en la anulación y siete del agente en la pantalla — cada una
en rojo sobre la prueba que le toca, y **una de ellas cambió una prueba**: el mutante «quédate el
mejor» lo cazaba una prueba distinta de la que llevaba ese nombre, así que la prueba que lo promete
se reescribió para que un dado relanzado salga **peor** y se quede igual.

**Cómo revertir.** `git revert` del commit. No toca el esquema de la base. Sí cambia el contrato de
`PUT overrides/:target`, que ahora rechaza valores que antes aceptaba — si alguna anulación
guardada quedara fuera de rango, se puede volver a fijar tras revertir.

## 2026-09-03 (tarde) — La suite de navegador ya deja el árbol limpio (M2B-13)

**Qué.** `capturas-comparacion.spec.ts` escribía por defecto en `apps/web/capturas/`, que está en
el repositorio, así que **cada `pnpm --filter @dnd/web e2e` dejaba nueve binarios modificados** —
otra cuenta, otras horas, otros identificadores— que no significan nada. Y peor que el ruido era
la salida fácil: limpiarlos con `git checkout` sobre un árbol con trabajo sin commitear, que es el
comando que este proyecto prohíbe.

**Cómo.** El destino por defecto pasa a `apps/web/capturas-salida/`, ignorada. El juego de
referencia de `apps/web/capturas/` —el que se comparó con el prototipo— **solo se reescribe a
propósito**: `SALIDA_CAPTURAS=capturas`. Una foto de referencia se actualiza cuando alguien lo
decide, no como efecto colateral de correr las pruebas.

**Y lo guarda una prueba**, porque esto no lo puede cazar ninguna prueba de comportamiento: el
daño no está en lo que la aplicación hace, está en lo que la suite deja detrás.
`apps/web/src/ui/__tests__/capturas-no-ensucian.test.ts` lee el guion **y el `.gitignore`** — las
dos mitades, porque un destino distinto que nadie ignora no arregla nada.

**Probado.** 690 unitarias de web en verde. Mutación comprobada: devolver el defecto a `capturas`
pone la prueba en rojo. Y medido de verdad, que es lo que cierra la ficha: corrido el guion, las
nueve capturas aparecen en `capturas-salida/` y `git status` solo enseña las ediciones de código.

**Cómo revertir.** `git revert` del commit. Quien tenga capturas viejas en `capturas-salida/` puede
borrar la carpeta: es desechable por definición.

## 2026-09-03 (tarde) — 2C.1: el registro de tiradas, y la tirada a ciegas que no existía

**Qué.** Primer bloque de la fase 2C. Dos cosas, y la segunda es un agujero que estaba abierto y
sin declarar:

- **`GET /campaigns/:id/rolls`**, con filtro por sesión y por personaje. Aquí ponía «solo POST: una
  tirada es un `GameEvent` y el log ya se lee por `GET /events`». El razonamiento era bueno y la
  conclusión corta: la mesa pregunta *«¿qué se tiró en esta sesión?»* y responder eso leyendo el
  log entero a mano no es responderlo. Lo que sigue en pie es el motivo de fondo —**no puede haber
  dos matrices de visibilidad**—, así que el endpoint **no lee la base**: llama a
  `GameEventsService.list` acotado a los tipos de tirada (`ABILITY_ROLL` y `DEATH_SAVE`, que es la
  tirada que la mesa más repasa). Un camino más, la misma puerta. Los filtros son **columnas
  reales**, nunca campos del `payload`.
- **El vocabulario de los modos de tirada, y el agujero cerrado.** Quien tiraba elegía un nivel de
  visibilidad crudo (`PLAYERS`, `OWNER_DM`, `DM_ONLY`) —un valor de enumeración del modelo de datos
  llegando a la pantalla, que es un fallo declarado de este proyecto— y, peor, **la respuesta del
  `POST` devolvía el resultado a quien lo pedía siempre**. Así que una tirada a ciegas quedaba
  escondida en el registro y **visible en el cuerpo de su propia petición**: no existía aunque el
  modelo pareciera expresarla. Ahora se pide una **audiencia** (`PUBLIC` / `DM_PRIVATE` / `BLIND`),
  el nivel se deriva de ella en un solo sitio (`VISIBILIDAD_POR_AUDIENCIA`), y la respuesta es una
  **unión discriminada**: si quien tiró no puede ver su tirada, el desglose no viaja. Es unión y no
  campos opcionales a propósito — con campos opcionales una pantalla que se olvide de comprobar
  pinta `undefined` donde había un total y nadie se entera.

**La fuente, y lo que cambió por ella.** El vocabulario se copia de Foundry, que lleva años con
él ([Basic Dice](https://foundryvtt.com/article/dice/)). Y ahí salió el hallazgo: **el cuarto modo
—`selfroll`— esconde el resultado también del DM**, y `canView` le devuelve `true` al DM antes de
mirar el nivel. O sea que «Propia» no es un nivel que falte, es una **excepción a la regla de que
el DM lo ve todo**. No se finge: entran tres modos, y el cuarto queda como ficha **C2C-1** con su
cita, porque es decisión del autor y no de quien programa. Fingirlo habría sido peor que no
ofrecerlo: una tirada que la pantalla llama «Propia» y que el DM lee en su registro es una promesa
de privacidad incumplida.

**En pantalla.** `TiradaACiegas` dice lo que pasó —«Tirado a ciegas. El DM ve el resultado; tú
no.»— en vez de dejar un hueco. Un silencio ahí es el peor resultado: quien pulsa «Tirar» y no ve
nada supone que la petición falló, vuelve a pulsar, y la mesa acaba con tres tiradas donde había
una.

**Probado.** 1075 unitarias de API, 688 de web, 43 de esquemas, **146 e2e de API** (tres nuevos) y
los 64 recorridos de navegador, todos en verde. Dos mutaciones comprobadas: devolver siempre el
resultado pone en rojo la unitaria y el e2e de la tirada a ciegas; quitar el filtro de tipos del
registro pone en rojo tres pruebas, incluida la que exige que el arranque de una sesión **no**
salga en el registro de tiradas. Restauradas copiando el fichero.

**Cómo revertir.** `git revert` del commit. **Es un cambio de contrato**: `POST /rolls` y
`POST .../attacks/:key/roll` reciben `audience` donde recibían `visibility`, y `RollResult` pasa a
ser una unión. No hay migración: no toca el esquema.

## 2026-09-03 (tarde) — El motor de reglas ya no escribe fuera de la transacción que lo dispara (M2B-3)

**Qué.** Primer trabajo de la fase 2C, y va **antes** de 2C porque 2C mete más sucesos por ese
mismo camino: tiradas, reloj y condiciones. `GameEventsService.record` acepta una transacción para
que el suceso y el cambio que describe aterricen juntos, y **emitía el suceso con la transacción
todavía abierta**. El motor de reglas escucha esa emisión y trabaja con `PrismaService`, es decir
**por otra conexión**: leía el mundo de antes del suceso y sus efectos quedaban fuera de la
transacción — sobrevivían a un cambio deshecho. Y `emit` **no se esperaba**, así que el comentario
que prometía «el motor evalúa dentro de la petición» era falso.

**Cómo.** Un buzón por transacción (`apps/api/src/common/after-commit.ts`, `AsyncLocalStorage`):
mientras hay una transacción abierta, `record` **encola** la emisión; cuando la transacción
confirma, el buzón se vacía y entonces se emite, esperando cada emisión con `emitAsync`. Si la
transacción se deshace, el buzón se descarta con ella. Un buzón anidado se reutiliza, para que
emita el de fuera y no el de dentro.

**Y la garantía no depende de que nadie se olvide.** El buzón lo abre `PrismaService.transaction`,
que pasa a ser **la única puerta a una transacción en este proyecto**; los dieciocho sitios que
llamaban a `$transaction` ahora la usan, y un barrido del código
(`apps/api/src/prisma/no-transaction-suelta.spec.ts`) prohíbe la llamada cruda fuera del módulo de
Prisma. Sin ese barrido, la próxima transacción que alguien escriba reintroduce el fallo sin que
nada avise: ninguna prueba de comportamiento puede fallar por código que todavía no existe.

**Probado.** 1068 unitarias y 143 e2e de API en verde. Cuatro mutaciones comprobadas, cada una en
rojo sobre la prueba que le toca: emitir siempre en el momento, dejar la emisión sin esperar,
quitar la reutilización del buzón anidado, y quitarle el buzón a `PrismaService.transaction`.
Restauradas copiando el fichero, nunca con `git checkout`.

**Cómo revertir.** `git revert` del commit. Es un cambio interno: no toca el esquema, ni un
contrato de `packages/shared`, ni una pantalla.

## 2026-09-03 (mañana) — El contraste con la fuente, y las decisiones de 2C y 2D

**Qué.** El autor señaló que las reglas de 2B se habían **interpretado** en vez de comprobado, y
que eso no se hace: *«si tienes una duda de reglas o de sistemas… investiga con documentos
oficiales; no es opcional»*. Se contrastó todo lo de 2B contra el SRD 5.1 y la práctica de las
mesas virtuales, y después el alcance entero de 2C y 2D **antes** de escribir una línea. La regla
queda escrita en [04-convenciones.md](./04-convenciones.md).

**Lo que el contraste encontró:**

- **De 2B**: ninguna regla estaba mal —armadura pesada, media, versátil, enano, sintonización,
  munición, arma mágica: todas coinciden— pero salieron **tres cosas que no sabíamos**, y una era
  un defecto vivo: dos avisos nuevos salían en pantalla como «Sin traducir». Arreglado, con una
  prueba que recorre los diez códigos y exige que ninguno caiga.
- **De 2C**: **seis huecos** que el alcance no tenía —el descanso largo una vez cada 24 horas, las
  interrupciones del descanso, el ritmo de viaje, la marcha forzada, el agotamiento que no llega al
  motor (el nivel 4 parte los PG máximos) y el evaluador que no sabe relanzar—.
- **De 2D**: la premisa estaba mal planteada («reusar el motor»: un monstruo se declara, no se
  deriva) y **el coste se desploma**, porque el SRD 5.1 existe en JSON bajo CC BY con la misma
  frase de atribución que ya usamos. Con una trampa evitada: la tabla de competencia de los
  monstruos llega a +9 donde un personaje se queda en +6.

**Las decisiones, todas contestadas por el autor**: reloj en segundos · la condición caduca sola y
no se borra · la tabla de CD se siembra del SRD · la petición de tirada entra · los cuatro modos de
tirada, cerrando el agujero de la tirada ciega · **tablas de críticos y pifias opcionales y
apagadas por defecto**, porque el DM de esta mesa las usa · statblocks importados publicando lo
revisado · y **el despliegue al cerrar la fase 2, verificado con una partida de prueba real de dos
jugadores**.

**Cómo revertir.** Son documentos y un arreglo de traducción; `git revert` de los commits del día.

## 2026-09-03 (madrugada) — La auditoría de mecánica de 2B, y nueve reglas que estaban mal

**Qué.** Cerrada 2B, se auditó **la mecánica**, no el código: dos frentes con su refutador
adversario sobre dos caminos concretos —el turno de un guerrero enano de nivel 5, y lo que
sobrevive entre sesiones o hacen dos peticiones a la vez—. Salieron nueve fallos de regla que se
arreglaron el mismo día, cada uno con su prueba y su mutación comprobada, y doce fichas abiertas
(**M2B-1** a **M2B-12** en [06-pendientes.md](./06-pendientes.md)). El informe entero está en
[la auditoría de mecánica](./superpowers/specs/2026-09-03-auditoria-de-mecanica-2B.md).

**Los tres que más se notaban en una mesa:**

- **La armadura pesada restaba la Destreza negativa.** El SRD dice que no te deja *sumarla*; el
  código hacía `Math.min(−1, 0)` y restaba. El enano que baja Destreza para subir Fuerza salía
  con CA 17 donde el manual da 18 — y la traza se lo enseñaba como si fuera correcto, que es
  peor que no explicar nada.
- **El «Entrenamiento de combate enano» era texto sin efecto.** El cuadro de ataques leía solo
  las competencias de la clase, así que el clérigo enano veía «Sin competencia» en rojo sobre su
  propia hacha. Arreglarlo obligó a estrenar un tipo de concesión (`weaponProficiency`), que es
  el mismo cableado que necesitarán las competencias de armadura.
- **Editar un objeto no revalidaba las mochilas**, y bajarle la visibilidad se lo hacía
  desaparecer al jugador en silencio mientras la hoja seguía sumándolo. Ahora cambiar la forma de
  un objeto lo devuelve a la mochila de quien lo lleve, y quitárselo de la vista a quien ya lo
  tiene se rechaza con un 400 que dice a quién.

**Y una decisión que se tomó al revés de lo que pedía el informe:** el auditor proponía que la
fila del arma de la mano izquierda dejara de sumar el modificador al daño (combate con dos
armas). El refutador demostró que **la regla estaba mal citada** —el SRD dice «salvo que el
modificador sea negativo», y quien la levanta es un estilo de combate, no una dote— y, sobre
todo, que **la aplicación no modela el ataque de acción adicional**: la tabla es una fila por
arma, no una secuencia de turno. Se deja el número y se avisa. La máquina ejecuta, el DM arbitra.

**Y dos fichas de la propia auditoría se cerraron a continuación** (M2B-1 y M2B-2): **el arma
mágica ya se puede representar** —`weaponAttack` y `weaponDamage` en la lista cerrada, sumados al
bono y al daño del arma que los lleva, con su paso en la traza; la línea de derechos no se mueve,
porque lo que se abre es la forma y no el contenido— y **el inventario deja rastro en la línea de
tiempo** (`ITEM_ADDED`, `ITEM_MOVED`, `ITEM_REMOVED`, escritos en la misma transacción que el
cambio). De paso, soltar un objeto pasó a ser idempotente: soltar dos veces con mala red daba un
500 sobre una operación que sí había funcionado.

**Y un intermitente que no era una prueba frágil.** Tras serializar el camino de equipar, el
e2e de la carrera empezó a fallar una vez de cada cuatro con un 500 en vez del 409 esperado.
Medido con el error real delante —no adivinado—, era un **abrazo mortal de Postgres (40P01)**:
dos escrituras del inventario tomaban los recursos en orden inverso. Todos los escritores toman
ahora el mismo candado primero, y un abrazo mortal se traduce a un 409 legible por si vuelve por
otro camino. Seis corridas seguidas en verde después.

**Cómo revertir.** `git revert` del commit. La única migración es `inventory_events`, que añade
tres valores a un enum y nada más. Revertir devuelve los nueve fallos, así que si algo de esto molesta, lo que se cambia
es la regla concreta, no el commit entero.

## 2026-09-03 (noche) — Fase 2B: objetos, inventario, equipar, y el cuadro de ataques que faltaba

**Qué.** Un objeto deja de ser texto. Hay catálogo del SRD 5.1 (35 armas, 18 de equipo, las
armaduras con su peso y su precio), objetos propios de cada campaña que escribe el DM,
inventario por personaje con **tres sitios** —equipado, encima, guardado en otro sitio—, ranuras,
manos, sintonización con tope de tres, dinero en las cinco monedas, y peso transportado. Lo
equipado **entra en el motor**: la armadura sustituye la fórmula de CA, el escudo suma plano, y
cada objeto aparece como **un paso más de la traza**. Y con eso se cierra lo que la fase 2C
debía a 2B: el cuadro de ataques con su bono, su daño y su tipo, y el botón que pide al servidor
la tirada de ataque o la de daño.

**Por qué.** La hoja decía «+5 al ataque» y no tenía dónde leer «1d8+3 cortante»: media mecánica
en pantalla, que es peor que ninguna porque parece completa (ficha M19). Y el hueco del
inventario llevaba desde 2A rotulado y vacío, con la CA calculándose sin equipo.

**Cómo se trabajó.** Ocho carriles en dos tandas —cinco y tres— —catálogo, efectos y
motor, objetos de campaña, inventario, ataques; luego inventario en pantalla, catálogo en
pantalla y la hoja—, con la frontera de ficheros escrita en cada encargo. Los contratos de
`packages/shared`, las migraciones, el cableado, las corridas de e2e y esta documentación las
escribió el orquestador. **Prueba de mutación por comportamiento nuevo en los ocho carriles**, y
ninguno la dio por buena sin ver la prueba roja.

### Los dos defectos que solo la integración podía encontrar, los dos silenciosos

- **Las competencias de arma de las clases eran prosa en español** («Armas marciales»), y el
  cuadro de ataques pregunta por claves (`martial`). La comparación **nunca** podía acertar: todo
  guerrero habría perdido su bonificador de competencia **sin que ninguna prueba se pusiera
  roja**, porque las dos mitades estaban bien por separado. Ahora son claves de máquina y el
  español sale en la pantalla, como con todo el catálogo.
- **La traza de la CA no sumaba la CA que explicaba.** El paso de la característica llevaba el
  modificador **ya recortado** y además se añadía el paso del recorte, así que con cota de malla
  y Destreza 12 la hoja decía «CA 16» y su propia explicación sumaba 15. Nadie lo vio en 2A
  porque **nada alimentaba la armadura todavía**; apareció el día que se enchufó el inventario,
  que es exactamente para lo que sirve enchufar cosas.

### Decisiones de mecánica tomadas sin el autor, y su porqué

Están enteras en
[el plan de 2B](./superpowers/plans/2026-09-03-fase-2B-objetos-inventario-y-equipo.md). Las tres
que más cambian la forma de los datos:

- **Sitio del objeto: `EQUIPPED | CARRIED | STORED`, y la sintonización aparte.** El informe de
  huecos proponía meter «sintonizado» como tercer valor del enum, pero un anillo sintonizado
  **está** equipado: un solo enum obliga a elegir cuál de las dos verdades se guarda.
- **Peso en onzas, precio en cobres.** Enteros abajo, kg y monedas en pantalla; el mismo
  principio que los pies de la especificación de distancias.
- **Un objeto `DM_ONLY` no se le puede dar a quien no puede verlo**: 400 que explica cómo
  arreglarlo. Mandárselo igual es un agujero de `canView`; pintarle una fila fantasma es una
  pantalla que miente.

**Lo que se declaró fuera, con motivo**: «lo tengo pero no sé qué hace» (es visibilidad por
campo, y la traza delataría el número igual) y la penalización por sobrecarga (es una regla
variante del SRD y necesita un interruptor por campaña). Fichas I1–I8 de
[06-pendientes.md](./06-pendientes.md).

**Cómo revertir.** `git revert` de los commits de la jornada. Las tres migraciones nuevas
—`items_inventory_and_money`, `inventory_one_item_per_slot`, `money_changed_event`— crean dos
tablas, una de concesiones, un índice y un valor de enumeración que **nada en producción
referencia todavía** (deja de ser cierto en cuanto se despliegue y alguien mueva una moneda).
Revertirlas es `prisma migrate resolve --rolled-back`, dejar caer esas tablas **y quitar de
`Character` las cinco columnas de moneda** (`cp`, `sp`, `ep`, `gp`, `pp`): esa tabla es de la
fase 1 y **sí** cambia de forma — la primera versión de este párrafo decía que no cambiaba
ninguna, y es la frase que alguien lee bajo presión en mitad de un rollback. Ningún dato
existente se reescribe.

## 2026-09-03 — El prototipo, tomado en serio, y un intermitente que era el limitador

**Por qué.** El autor miró lo desplegado y dijo que **el prototipo le gusta más**: *«la verdad no
me gusta como está ahora y en el prototipo está mejor. Plasma todo el diseño del prototipo.»* La
tanda anterior lo había **adaptado** —conservó nuestra disposición y tomó ideas sueltas— y eso no
era lo que pedía. Esta vez manda la forma del prototipo.

**Cómo se hizo distinto, y merece constar:** a cada agente se le dieron **las dos capturas** —la
suya y la nuestra— y el guion para volver a fotografiar. Nada de descripciones mías: describir lo
que uno ha medido mal es como se propagan los errores, y ya había pasado dos veces.

**La hoja** era el problema de verdad: **4400 px** porque cada salvación y cada habilidad
arrastraba tres radios, una frase y un botón — veinticuatro bloques donde el prototipo pone una
línea. Ahora **3272 px con más cosas a la vista**. La ventaja no desapareció: **se mudó a donde
se toma la decisión**. La fila lleva su dado; al pulsarlo, el panel de tirada enseña los tres
estados con sus tres frases, que es *más* de lo que había, porque la versión anterior solo
pintaba la del estado elegido precisamente por repetirse veinticuatro veces.

**La vitela salió de la hoja**, por instrucción del autor y con el motivo compartido: la vitela es
para lo que se lee de corrido, y esa pantalla son cien cifras. Sigue donde le toca —la historia
del personaje y las fichas del mundo.

**Cuatro cosas que el autor pidió por su nombre**, señalando su propia captura: la marca dice
**«Sala de Guerra»** (decía «Plataforma D&D», que es una categoría y no un nombre), el pie se
apoya en el borde inferior en vez de flotar a media pantalla, las tres entradas del carril que
iban sin icono lo tienen, y el espacio se usa.

### Tres defectos que ninguna prueba unitaria podía ver

- **El tablero de reglas se pegaba a 16 px del borde**, o sea **debajo de la cabecera fija de
  64**: el punto de soltado caía sobre la cabecera y no sobre la ranura. Medido con
  `elementFromPoint`.
- **Los avisos quedaban bajo un bloque pegajoso**, así que el navegador informaba de que el
  tablero «intercepta los eventos de puntero» y **el botón «Añadir reversión» no se podía pulsar**.
- **La hoja de vitela era un recorte pardo de 537 px en una columna de 1014**, porque
  `ui/Panel.tsx` aplicaba la medida de 66 caracteres **al papel en vez de al renglón**.

### Y la lección de la jornada: el intermitente no era un defecto

La suite empezó a fallar en sitios distintos cada vuelta —un personaje que no aparecía, un campo
que no guardaba, un `<input>` que «se desprendía del DOM»—. **Cada fallo tenía una explicación
creíble y ninguna era la verdadera.** Se persiguieron dos hipótesis razonables (que la hoja se
remontaba al volverse derivable; que faltaban claves de React) y **las dos eran falsas**.

La causa: un tope global de **100 peticiones por IP y minuto** sobre todas las rutas, contra una
suite que dispara cientos desde `127.0.0.1`. Se resolvió como ya se había resuelto el de
autenticación: configurable, con margen **solo** para esa suite, y con pruebas que fijan que un
valor mal escrito cae al de producción y nunca a «sin límite».

**Y una trampa dentro de la trampa:** el arreglo pareció no funcionar. `reuseExistingServer`
estaba reutilizando un servidor arrancado **antes** del cambio, así que la variable nueva no
llegaba. Matando el proceso viejo: **61 recorridos verdes, dos vueltas seguidas**. Cuando se
toca el entorno del servidor de pruebas hay que matar el que esté levantado, o la medición
miente — y esta vez estuvo a punto de hacer descartar la hipótesis correcta.

**Cómo revertir.** Un commit, sin migración. Revertirlo devuelve la hoja de 4400 px, la marca
vieja y el pie flotando.

---

## 2026-09-03 (04:47) — Despliegue de la adopción, y las pruebas de integración contra producción

**Qué.** Los tres commits de la adopción (`436300f`, `529a526`, `9fb7f0e`) a `dnd.supportive.pro`,
lanzados por la API de Coolify desde dentro de la VPS. **Sin migración**: esta tanda es toda de
pantalla. Volcado previo igualmente en `vps1new:/root/backups/dnd/pre-maqueta-2026-09-03-0447.dump`
(45 KB).

**El commit desplegado se comprobó, no se supuso**: la API de Coolify devuelve
`9fb7f0e515cc210dbd57480d07f0e6fecc22a14f`, que es el `HEAD` local. Los tres contenedores
volvieron sanos.

**Una trampa que conviene recordar:** el nombre del contenedor de la base **cambia en cada
despliegue** (lleva un sufijo de marca de tiempo), así que un volcado con el nombre viejo falla
con `No such container`. Se resuelve siempre con
`docker ps --format '{{.Names}}' | grep '^db-5awvsn1'`, nunca con el nombre escrito a mano.

### Lo comprobado, con su salida

Todo medido **desde dentro del servidor** y por HTTPS con `--resolve`, porque Norton intercepta
el TLS en el PC del autor y porque por HTTP todo devuelve 302.

| Comprobación | Salida |
|---|---|
| La SPA se sirve | `GET /` → **200** |
| La API exige sesión | `GET /api/auth/me` → **401**; `GET /api/catalog` → **401** |
| Certificado real | `CN=dnd.supportive.pro`, Let's Encrypt, hasta el 1 de diciembre de 2026 |
| Migraciones | **8**, la última `20260902185824_session_attendance_and_notes` |
| **Un jugador no ve lo secreto** | La entidad `DM_ONLY` **no aparece** en su listado y el `GET` directo da **404**; el DM la ve con **200** |
| **Un jugador no escribe en el mundo** | `POST` de entidad como jugador → **403** |
| Su personaje sí es suyo | Lo crea, completa su hoja (**200**) y el motor deriva `maxHp=13`, `ac=11`, `modCon=3` |
| **La tirada devuelve el dado descartado** | `2d20kh1+3` → `rolls=[8,6]`, `dropped=[6]`, `total=11` |
| El límite de intentos actúa | `401 401 401 401 401 429` |
| **No se esquiva falsificando `X-Forwarded-For`** | Con la cabecera rotando, **429 desde el primero**: la IP real ya estaba limitada, o sea que Traefik descarta la del cliente |
| **El motor de reglas dispara de verdad** | Entidad nace `DM_ONLY` → regla `SESSION_STARTED → REVEAL_ENTITY` armada → se empieza la sesión → la entidad queda en **`PLAYERS`**, con `ENTITY_REVEALED` en el registro |

### Dos cosas que salieron mal y no eran de la aplicación

**El registro de sucesos «vino vacío»** en la primera pasada. Era el guion de prueba: la respuesta
es `{"events":[…]}` y el campo se llama `type`, no `kind`. La aplicación estaba bien y el que
medía mal era yo — el mismo modo de fallo que ya costó dos diagnósticos falsos del arrastre.

**La regla no se creaba**: `mode: "APPLY"` no existe (son `AUTOMATIC` y `PROPOSAL`) y armar no es
un `POST /arm` sino un `PATCH` con `status`. Otra vez el guion, no el servidor.

### Limpieza

Las pruebas dejaron **seis cuentas en producción con una contraseña conocida**, y eso no se queda:
borradas por dominio (`@t.local`), comprobando antes y después qué se iba y qué no. Producción
queda en **2 usuarios reales, 1 campaña, 9 entidades, 3 personajes**, que es exactamente lo que
había antes de empezar.

**Cómo revertir.** Redesplegar el commit anterior desde Coolify. No hay migración que deshacer.

---

## 2026-09-03 — Se adopta la maqueta, y 49 clases de CSS que nunca pintaron

**Qué y por qué.** El autor encargó una maqueta a Figma Make a partir de nuestro propio prompt,
la miró y dijo que **le gusta más que lo que teníamos**, sobre todo la hoja de personaje. Eligió
adoptarla **como referencia principal**: manda en disposición, densidad y estructura salvo donde
choque con una regla vinculante o con lo que hace el servidor. Cuatro frentes en paralelo, y a
cada uno se le dio **el enlace y el guion para abrir la maqueta él mismo** con Playwright en vez
de una descripción — porque describir lo que uno ha medido mal es como se propagan los errores.

**La hoja** (`529a526`). Lo que más cambia y lo que el autor señaló: la casilla de característica
pone **el modificador grande y la puntuación pequeña debajo**, al revés que la nuestra. La
maqueta tiene razón: en la mesa se usa el modificador, la puntuación es su causa. Con ella entran
la tira compacta de cinco cifras, la CA con su fórmula en línea, la fila de tarjetas y la tabla
de ataques. Las salvaciones de muerte pasan a verse **siempre**: un contador que solo existe
cuando ya estás a 0 PG no se puede consultar antes.

**La campaña, la página de lectura y la mesa**, en el mismo commit. Con una decisión del autor
que gobierna la barra lateral: **solo se enseña lo que existe**. Nada de entradas apagadas ni
candados para las fases futuras — lo que no está hecho no se anuncia.

### Lo que la maqueta se equivocaba, y no se copió

Merece constar, porque adoptar algo «como referencia principal» no es copiarlo:

- **Su conmutador DM/Jugador cambia lo que se pinta.** Aquí lo decide `canView` en el servidor.
  Se copia el gesto; el mecanismo, jamás.
- **Su aviso de DM es falso tres veces**: dice «cualquier número» (son cinco), «tienes que
  escribir el motivo» (es opcional) y «aparece en la traza» (viaja en el suceso). Se escribió el
  honesto, y la lista se **genera** de `OVERRIDABLE_KEYS` para que no se desincronice.
- En su propia vista de jugador **le sigue ofreciendo «Nuevo personaje»** a un jugador.
- Inventa una tarjeta «PENDIENTE 2» sin dato detrás.

### Y el hallazgo que no venía en el encargo: 49 clases que no existían

`tailwind.config.js` declara los colores como `var(--muted)`, sin `<alpha-value>`. Tailwind **no
puede** emitir una variante con opacidad a partir de eso, así que **descarta la utilidad entera y
no avisa**. Contadas en el código: 49. Encontradas en el CSS compilado: cero.

Lo que llevaba meses sin pintarse:

- **la cabecera de la aplicación no tenía fondo** — el contenido pasaba por debajo, solo
  desenfocado;
- **los diálogos no tenían velo**, que es exactamente lo que el reseño creyó arreglar bajo el
  título «un modal que parece una capa»;
- **el relleno del distintivo «Solo DM»**, el único nivel que un DM tiene que localizar de un
  vistazo — y su comentario afirmaba que el tinte «está medido, no supuesto»: la prueba de
  contraste componía un alfa contra un fondo inexistente;
- **el subrayado que distingue lo editable de lo derivado**, que es una regla vinculante.

Arreglado con clases enteras y tokens de color completo por tema, y protegido con **dos redes**
que no se sustituyen: un barrido del código fuente y una medición en el navegador. Detalle en
[08-pruebas.md](./08-pruebas.md).

### Tres defectos más, encontrados de camino

`override.manual` no estaba traducido y se pintaba **«Sin traducir: override.manual»** en la
traza. Tres etiquetas de relación tenían el sujeto equivocado, así que esos enlaces **se leían
del revés**. Y **cambiar los puntos de golpe no invalidaba el registro de la sesión**: el golpe
salía en la hoja al instante y en la mesa solo cuando a la consulta le tocaba refrescar — en una
partida en curso, un registro que va por detrás de lo que pasa. El recorrido tardaba 20 segundos
en pasar; ahora tarda 3,6.

**Cómo revertir.** Dos commits, sin migración. Revertir `436300f` devuelve la cabecera
transparente y los diálogos sin velo; revertir `529a526` devuelve la hoja anterior y con ella
las 47 clases que no pintaban en las pantallas.

---

## 2026-09-02 (cierre de la ronda de interfaz) — Lo que volvió de la maqueta, y tres diagnósticos de los que dos eran falsos

Cinco frentes en paralelo, más el que remató las reglas. **Cierra los tres encargos que el autor
hizo al abrir la ronda**: pantalla de sesión, hoja dinámica y sistema de eventos por bloques
entendible.

**Las condiciones dicen qué hacen** (`003cd70`), y con ellas dos reglas que llevaban escritas sin
que nada las hiciera cumplir: el botón de quitar pintaba `×`, un glifo de fuente haciendo de
icono, y la prueba que protege esa regla ni siquiera llevaba ese carácter en su lista; y
`NOTICE.md` prometía una garantía mecánica de atribución que cubría cinco ficheros de seis.

**Los dos dados, con el descartado a la vista** (`6598ecf`). Lo que más sorprende del arreglo es
que **la API ya devolvía el dado descartado desde 2A.13** y la hoja usaba dos de sus once campos.

**La hoja en vitela** (`1239f6e`), y de camino un fallo que llevaba meses invisible: **ninguna
clase de opacidad de Tailwind compilaba**. 69 en el código, cero en el CSS. El subrayado que
distingue «esto se edita» de «esto lo calculo yo» se pintaba gris claro.

**El editor de reglas: la frase, los avisos con su arreglo, el tutorial y el arrastre**
(`6bab616`).

**Lo que de verdad merece constar de esta tanda no es ninguna de las cuatro: es cómo se
diagnosticó el arrastre.** Tres explicaciones seguidas, las tres apoyadas en mediciones reales,
y **las dos primeras falsas**:

1. *El velo del diálogo lleva `backdrop-filter`.* Plausible, encaja con la literatura. Falso:
   quitándolo en vivo y del fuente con recarga, sigue sin arrancar.
2. *El panel es un contenedor de desplazamiento.* La midió el orquestador con dos `div`
   arrastrables idénticos y la dio por buena. **También falsa**, y llegó a escribirse en
   `06-pendientes.md` y en un mensaje de commit.
3. *La pieza y su carril no están nunca en pantalla a la vez.* La encontró un banco de pruebas
   que compiló el componente con su CSS y bisectó: el culpable era el `max-h-[85vh]`, y la
   medición lo dice sin ambigüedad — pieza en `y = 451`, carril en `y = 891`, ventana de 720.

Y todavía quedaba una capa: con el editor ya arreglado, **el recorrido seguía rojo por un fallo
de la prueba**, no del producto. El ayudante llevaba el carril a la vista, eso empujaba la pieza
a `y = −81`, y `dragTo` acababa agarrando la de al lado — en el carril aterrizaba
`ENTITY_REVEALED` en vez de `SESSION_STARTED`. **El arrastre funcionaba y la prueba decía que
no.**

La lección no es sobre arrastrar: **medir no basta si se mide la cosa equivocada**, y una
explicación que encaja con los datos no es por eso la correcta.

**Los seis fallos que encontró Playwright**, y que ninguna suite unitaria podía ver: el formato
de la tirada había cambiado y su aserción no; «Salvación de Fuerza» pasó a aparecer dos veces;
«Ventaja» casa dentro de «Desventaja»; las descripciones accesibles de los radios contienen las
frases que la prueba buscaba en toda la fila; y la guía del tutorial tenía razón donde su prueba
se equivocaba, porque **una plantilla clonada ya trae nombre**.

**Cómo revertir.** Cuatro commits independientes, sin migración. Avisos: revertir `6bab616`
devuelve el editor al diálogo y con él el arrastre imposible; revertir `1239f6e` devuelve las
clases de opacidad que no compilan y con ellas la afordancia invisible.

---

## 2026-09-02 (madrugada, 2.ª tanda) — Tres frentes más, y dos pruebas de navegador que salvaron la cara

Tres agentes en paralelo con fronteras que no se pisan, y el orquestador corriendo Playwright al
recogerlos, que es la regla. **Las dos cosas que más valen de esta tanda las encontró ese paso**,
y ninguna la habría encontrado la suite unitaria.

**La hoja: cabecera fija y dos columnas** (`54775bb`). CA, Iniciativa, Velocidad, PG y
Competencia arriba, quietos mientras se desplaza. A la izquierda características → salvaciones →
habilidades, seguidas. A la derecha lo accionable. Y el hueco del inventario de 2B **rotulado y
vacío**, no escondido. La traza pasa a ser navegación: un paso lleva el foco a su causa.

> **La cabecera fija falló su primera prueba en `y = -106`, y la prueba tenía razón.** `sticky`
> se pega **dentro de su padre**, y el padre de esa cabecera es la hoja; debajo siguen «Historia»
> y «Ajustes», que son de la página. La prueba decía «hasta el final de la hoja» y desplazaba
> hasta el final de la **página**. Ahora ese límite **se comprueba a propósito**, para que nadie
> envuelva mañana la página entera en el contenedor pegajoso y deje la cabecera de combate
> plantada sobre una biografía.

**Un solo camino de edición, y una fila que dejaba de decir nada** (`cc35e2c`). El modo edición
de `CharacterEditor` se absorbe en la página; queda como diálogo de creación. Y el fallo que
salió de camino: la hoja escribe `raceKey`/`classKey`, pero el subtítulo y la fila de la lista
leían solo el **texto libre heredado**, así que un personaje montado desde la hoja aparecía **sin
raza y sin clase** mientras su propia hoja decía «Enano · Guerrero». El esquema ya declaraba la
regla; dos pantallas no la seguían. Ahora es una función y no dos copias.

**El editor de reglas, en carriles** (`ff40b6c`). Los tres desplegables fuera; las 28 piezas del
vocabulario cerrado visibles a la vez; tres carriles y **la ranura como conexión**, de modo que
la caja que parece puesta y no lo está no puede existir. Cada caja dice si es un **suceso** o un
**estado** —el malentendido nº 1 medido— y nombra la pieza gemela con la que se confunde.

> **Y lo que esta tanda NO puede afirmar, dicho aquí y no escondido: el arrastre no está
> probado.** En esa página no se dispara ni un `dragstart`. Se descartó la herramienta (`dragTo`
> y ratón paso a paso), el elemento (`<button>` y `<div draggable>`), el `clip-path` y el
> `user-select`. Un `div` arrastrable trivial **dentro del diálogo** tampoco arrastra y **fuera**
> sí, así que apunta al contexto. El recorrido se retiró en vez de dejarlo rojo — **y también su
> primera mitad**, que comprobaba que el carril ajeno rechaza la pieza y pasaba en verde igual si
> el arrastre no funcionaba en absoluto. Ficha abierta en [06-pendientes.md](./06-pendientes.md).

**Cómo revertir.** Tres commits independientes, sin migración. Avisos: revertir `cc35e2c`
devuelve el segundo camino de edición **y** el fallo de la fila en blanco; revertir `ff40b6c`
devuelve los tres desplegables que el DM no entendió.

---

## 2026-09-02 (madrugada) — La primera tanda de la ronda de interfaz: cinco frentes en paralelo

**Contexto.** El autor abrió una ronda de interfaz larga y pidió antes que nada *organizarnos*.
Salió [el plan de la ronda](./superpowers/plans/2026-09-02-plan-interfaz-y-contenido.md) —seis
bloques, cada tarea con su frontera de ficheros— y con él la autorización para trabajarlo con
varios agentes a la vez, hasta el techo de cinco que fija [04-convenciones.md](./04-convenciones.md).
Esto es lo que dejó la primera tanda. Un commit por frente.

**El mundo es del DM, y cada tipo de entrada pregunta lo suyo** (`32c595c`). Dos cosas
distintas en el mismo commit porque salen del mismo sitio. La primera es un agujero de
escritura real: crear entidades y enlaces exigía solo `requireMember`, así que **un jugador
podía crear PNJs, lugares, misiones, documentos y enlaces** en la campaña del DM. Ahora
`requireDM`, y la interfaz deja de ofrecer lo que el servidor rechazaría. Detalle en
[05-datos.md](./05-datos.md). La segunda es lo que pidió el autor con mayúsculas —*que dejen de
llamarse fichas y se diferencien por lo que es*—: el formulario de creación era **idéntico para
los siete tipos**, un cuadro de texto vacío que no ayudaba a empezar ninguno. Ahora cada tipo
trae su rótulo, su frase de para-qué, un ejemplo de nombre real, etiquetas sugeridas y un
andamiaje de Markdown que se borra si estorba (`features/entities/plantillas.ts`). **Plantilla y
no campos estructurados** a propósito: partir `Entity.body` en casillas por tipo es una
migración y un cambio de contrato, y sobre todo encierra al DM el día que quiera escribir algo
que no cabe en las casillas que le dimos.

**La hoja pierde sus dos botones de «Editar»** (`397f7f6`). Se toca donde se lee: puntuaciones,
raza, subraza, clase, nivel, nombre e historia. Detrás de un botón queda solo borrar, que es
irreversible. Las reglas de guardado salieron de la investigación y no del gusto, y están
escritas como vinculantes en [04-convenciones.md](./04-convenciones.md) —junto con **la
declaración de que esto contradice la regla anterior**, que decía que leer y editar eran
pantallas distintas—. Lo que más cambia la lectura no es la edición sino **la fórmula de una
línea bajo cada valor derivado** («10 +2 destreza»): sale de la misma traza que el desglose
largo, así que no puede discrepar con él, y hace que casi nadie necesite desplegar nada.

**Los enlaces van en los dos sentidos, llevan a algún sitio y dicen qué relación son**
(`7a6eb70`). El DM enlazó «Maestre Corvin → vive en → Torre Gris» y al abrir la Torre Gris
Corvin no estaba: `listFor` solo consultaba `fromId`. Ahora consulta los dos extremos, cada
fila sabe su dirección, **el filtro de visibilidad se aplica a la entidad del otro extremo**
—un enlace entrante no puede revelar lo que el espectador no puede ver, y `canView` sigue
siendo el dueño único de eso— y `canRemove` lo calcula el servidor por fila, porque ofrecer un
botón que el DELETE va a rechazar es mentir.

**Seis glifos de fuente que rompían la regla de iconos dibujados** (`5ad0fe7`), uno de ellos el
`✓` que la propia regla nombra como prohibido. La lección quedó escrita: la regla no se aplica
sola, hace falta la prueba, y la prueba echa dos redes —el código fuente y el DOM pintado—.

**Un 400 de validación que una persona puede leer** (`7402d5c`). Lo que el DM recibía era
`Invalid enum value. Expected 'ac' | 'maxHp' | ...`: inglés en un producto en español, nombres
internos, y un mensaje que ni siquiera decía qué valores admite. El contrato nuevo, con sus
tres reglas —el campo se cita literal, nunca se devuelve el valor recibido, nunca se puede
deducir si algo existe—, está en [04-convenciones.md](./04-convenciones.md).

**La atribución del SRD es la línea española de Wizards** (`52830e0`), y nuestra modificación
deja de reclamar la traducción, que ya no es nuestra. **Y la prueba de ida y vuelta de TipTap**
(`2fd869c`) dio su veredicto: sí, con condiciones —28 casos, 0 pérdidas con las extensiones
puestas, 4 sin ellas, y TipTap se come tablas, imágenes y listas de tareas **en silencio**—.
Lo que deja pendiente está en [06-pendientes.md](./06-pendientes.md).

**Cómo revertir.** Cada frente es un commit independiente y se revierte solo, con dos avisos:
`397f7f6` **borra** `EditorFicha.tsx`, así que revertirlo lo resucita y devuelve los dos
botones; y revertir `32c595c` **devuelve a los jugadores el permiso de escribir en el mundo**,
que es el fallo que arreglaba. No hay migración en ninguno de los siete.

---

## 2026-09-02 (noche) — La sesión de juego tiene por fin pantalla, y con ella el registro deja de mentir

**Qué.** La API distinguía `PLANNED`, `IN_PROGRESS` y `CLOSED` desde 2A.5, con un índice único
parcial que garantiza una sola sesión en curso por campaña, y **ninguna pantalla los enseñaba**.
La consecuencia no era estética: como nadie empezaba una sesión, todo lo que pasaba se escribía
con `sessionId` nulo y el registro de la partida no se podía reconstruir. Era la ficha **D9**.

**Lo que se construyó**, con la investigación de once VTT y herramientas de mesa detrás:

- **Una barra global de «en juego»**, presente en toda la campaña. El patrón salió sin
  excepciones de la investigación: el estado «se está jugando» se comunica con **un solo elemento
  persistente**, no con un rediseño — la pausa de Foundry, el nombre de escena de Alchemy.
- **Los sellos rápidos** —Combate, PNJ, Decisión, Hallazgo, Objeto, Nota—, la mejor idea que dio
  el estudio. **Escribir en mesa cuesta; pulsar no.** Y como cada sello lleva su clase, la crónica
  sale agrupada en vez de ser un muro de texto. Los puede poner **cualquier miembro**, no solo el
  DM: la crítica más repetida a estas herramientas es que un bloque que solo escribe el DM se
  queda vacío.
- **La mesa** (`/campaigns/:id/sesion`): elenco con asistencia, registro en vivo y consulta del
  mundo, para atacar lo que todos los foros describen — **el DM con quince pestañas abiertas**.
- **Cerrar con la crónica ya escrita**, derivada de los sellos. Ninguno de los once productos
  estudiados deriva la crónica del registro; Shard es el que más se acerca y ni él la convierte
  en prosa.
- **«Ver el registro como» otro jugador.** Solo el DM, y solo sobre un miembro. No relaja nada:
  sigue filtrando `canView` con otro espectador, así que el DM ve *menos*, que es el punto. Todos
  los VTT acabaron construyéndolo y ninguno lo tuvo el primer día — Roll20 lo lanzó en 2026
  porque sus DMs se creaban segundas cuentas para comprobar qué se veía.
- **La asistencia se declara** (`Session.attendance`), porque aquí no hay conexiones en vivo: los
  VTT saben quién está por el socket, y esto no tiene socket.
- **El log se lee en prosa**: `linea-de-log.ts` traduce los veinte tipos de suceso. Hasta hoy el
  registro solo se podía leer con un cliente HTTP.

**Tres fallos que encontraron las pruebas y que conviene que consten.**

1. **La medición de contraste daba 1,03:1 y era mentira mía.** Medía contra `document.body`, cuyo
   fondo es transparente porque el color lo pinta un `div` del armazón: comparaba negro por
   defecto contra negro por defecto y habría dejado pasar cualquier cosa. Con el fondo real, el
   filete da 4,85:1.
2. **Montar la barra en el armazón rompió `/acerca-de`**, que es una pantalla **pública** y se
   monta sin cliente de consultas. Pedir la sesión es una llamada de datos: ahora es `AppShell`
   quien decide, mirando la ruta, y fuera de una campaña la barra ni se monta.
3. **El e2e del motor de reglas afirmaba «Aplicada»** en un ensayo en seco — estaba fijando el
   comportamiento que se corrigió esta misma mañana. Ahora exige «Se aplicaría».

Y una del contrato: empezar una sesión sin declarar asistencia daba **400**, porque Zod no sabe
parsear un cuerpo ausente como objeto. Lo destapó la suite e2e que ya existía. Los esquemas de
empezar y cerrar llevan `.default({})`.

**Verificación.** 699 unitarias de API, 405 de web, 117 e2e de API y 32 recorridos de navegador,
todos verdes. Diez mutaciones aplicadas a mano y comprobadas rojas, cinco de ellas sobre lo que
tiene riesgo: quién puede mirar por los ojos de otro, que `as` no se ignore al filtrar, que
sellar sin sesión falle, que «solo el DM» viaje, y que la crónica no salga en blanco.

**Cómo revertirlo.** Una migración, `20260902185824_session_attendance_and_notes`, que **solo
añade**: un valor al enum de sucesos y una columna anulable. El código viejo convive con ella.

---

## 2026-09-02 (13:00) — Despliegue de los cuatro arreglos de la mesa, sin migración

**Qué.** `5329da6` a producción por la API de Coolify (`deployment 6mwyrpiifuviluwzsro8km5v`,
`finished` en ~2,5 min). Sin migración, así que sin volcado previo.

**Verificado en producción con una partida dirigida a los cuatro arreglos, borrada después:**
matar por daño masivo deja `dead` y **curar a un muerto devuelve 400**; el daño dado dentro de
una sesión abierta aparece en `GET /events?sessionId`; el ensayo en seco devuelve
`simulated: true` con estado **`WOULD_APPLY`, nunca `APPLIED`**, y la ficha sigue oculta después;
y **dos lecturas del DM sobre su propia ficha dejan 0 sucesos `ENTITY_OPENED`**. Producción
vuelve a 1 usuario y 2 campañas.

**Cómo revertirlo.** Redesplegar `adb110c`. No hay esquema que deshacer.

---

## 2026-09-02 (mesa de agentes) — Un DM y un tramposo jugaron contra la API, y encontraron cuatro fallos de corrección

**Qué.** Dos agentes usaron la aplicación como personas: uno dirigió una partida entera contra
una PNJ, otro intentó romper la autorización desde fuera. El tramposo **no encontró ni un hueco
de seguridad** —todo 403/404, `canView` aguantó— y eso también es un resultado. El DM encontró
cuatro fallos de corrección, arreglados el mismo día:

- **Curar a un muerto lo resucitaba.** A 0 PG con tres fracasos, un delta positivo lo devolvía a
  la vida con el contador a cero y sin aviso — un clérigo deshacía una muerte por accidente.
  Ahora es un 400 que dice que hace falta resurrección; bajarle los PG a un cadáver sigue
  permitido.
- **El ensayo en seco decía «Aplicada».** El núcleo marca `APPLIED` la traza que *se aplicaría*,
  porque en un disparo real eso pasa; pero en un ensayo no ha pasado nada, y la palabra que
  sostiene toda la promesa del dry-run era la que mentía. Se reetiqueta a `WOULD_APPLY` y la
  respuesta lleva `simulated: true`. El enum persistido no se toca.
- **`ENTITY_OPENED` se disparaba con las lecturas del propio DM.** Lo enganché esta misma
  mañana, y el DM descubrió el efecto: preparar la sesión abriendo sus fichas le disparaba las
  reglas contra sí mismo y le llenaba la bandeja. El suceso capta que **un jugador** examinó
  algo; ahora no se registra cuando quien mira es el DM o el creador.
- **El combate se grababa fuera de sesión.** `changeHp` y `rollDeathSave` no sabían en qué
  sesión ocurrían, así que `GET /events?sessionId` devolvía dos sucesos de diecinueve. Ahora
  averiguan la sesión en curso y la graban, como ya hacía `RollsService`.

**Por qué importa la forma de encontrarlos.** Ninguno de los cuatro lo veía una prueba unitaria:
tres solo se notan jugando una partida, y el cuarto es un comportamiento emergente entre dos
piezas que por separado estaban bien. Es el argumento entero de haber puesto a un agente a
dirigir de verdad en vez de a leer el código.

**Lo que el DM dejó fichado y no se arregló** (J5–J11 en `docs/06-pendientes.md`): la muerte no
deja evento propio, `ENTITY_REVEALED` viaja vacío, la anulación se ve como delta sin el motivo,
la invitación es de un solo uso sin listar, los errores de Zod salen crudos, la CA llega a 999 y
el modificador de tirada no tiene tope. Y su veredicto: la preparación aguanta una sesión real;
el combate no, por los monstruos sin PG y la falta de iniciativa (M13, M14).

**Cómo revertirlo.** Cuatro cambios independientes de servicio, sin migración; revertir cada
commit por separado.

---

## 2026-09-02 (19:25) — Despliegue de la fase 2A completa a producción, con su migración

**Qué.** `adb110c` en `dnd.supportive.pro`, lanzado a mano por la API de Coolify
(`deployment_uuid f5yrnzktq9xzdehtw3tyqiop`, `finished` en ~2,5 min). Trae la única migración
del día, `20260902163450_character_manual_overrides`, que solo **añade** una columna anulable.

**Volcado previo**, aunque el autor había dicho que en este proyecto no hace falta copia: la
tanda traía migración, cuesta segundos, y la regla de 03 lo pide. 30 826 bytes en
`vps1new:/root/dnd-predespliegue/dnd-2026-09-02-1922.sql`.

**Verificado con evidencia, no con el «finished» del panel.**

- Los tres contenedores `healthy`; `_prisma_migrations` pasó de **5 a 7** filas y la columna
  `Character.overrides` existe. El único usuario de producción seguía ahí antes y después.
- `GET /` → 200, `GET /api/auth/me` sin credenciales → 401, `GET /api/catalog` sin
  credenciales → 401.
- Una partida entera contra producción, con datos de prueba y borrada después: hoja derivada
  (CA 11, PG 13, velocidad 25, visión en la oscuridad 60), **dados de golpe sembrados**
  (`hit-dice-d10 1/1`, el agujero que estuvo abierto desde 2A.8), apresado deja la velocidad
  efectiva en **0 con `restrained` en la traza**, la anulación del DM pone la CA en 18 dejando
  `('override', 7, 'manual')` —la traza sigue sumando—, una tirada con ventaja sale como
  `2d20kh1+3` con `[10, 12]` tirados, `12` conservado y `10` descartado, y el previo de subida
  de nivel da `13 + 9 = 22` con la Constitución **16** del enano: la suma que esta mañana no
  cuadraba.
- **El motor de reglas disparó de verdad**: una regla armada sobre «empieza la sesión» revelando
  una ficha la pasó de `DM_ONLY` a `PLAYERS` al arrancar la sesión, y dejó su `RuleTrace` en
  `APPLIED`. Es el camino completo —escritura del log → emisión → puente → motor → efecto—
  funcionando fuera de las pruebas por primera vez.
- Un usuario ajeno recibe **403** tanto en las trazas como en la ficha revelada de esa campaña.

**Un susto que no lo era:** el listado de trazas volvió vacío en la prueba de humo. Era el
guion, que buscaba `items`; la respuesta es `{traces, nextCursor}`. La fila estaba en la base.

**Limpieza.** La campaña y los tres usuarios de humo, borrados. Producción vuelve a **1 usuario
y 2 campañas**, comprobado por conteo de filas.

**Cómo revertirlo.** Redesplegar `3221bea` desde Coolify. La migración solo añade una columna
anulable, así que el código viejo convive con ella; si aun así se quiere quitar:
`ALTER TABLE "Character" DROP COLUMN "overrides";`.

---

## 2026-09-02 (cierre) — La fase 2A completa: las diecisiete tareas, y lo que tres auditorías encontraron encima

**Qué.** Se cerraron las cuatro tareas que faltaban —2A.9 (subida de nivel), 2A.16 (motor de
reglas), 2A.10 (pantalla de la hoja) y 2A.11 y 2A.17 (sus pantallas)— y, con la fase entera en
pie, tres auditorías cruzaron **toda** la documentación contra el código. Lo que encontraron no
fue documentación desactualizada: fueron **cinco fallos de código que solo se veían por HTTP o
en un navegador**.

**Por qué importa cada uno.**

- **El motor de reglas no estaba enchufado al log.** Ahora `GameEventsService` emite
  `game_event.recorded` y un puente en `rules-engine/` lo escucha. Es un puente y no una llamada
  directa porque el motor **escribe** eventos: llamarle desde el log cerraría un ciclo entre los
  dos módulos que Nest solo tapa con `forwardRef`, que es esconder el ciclo en vez de quitarlo.
  Y el suceso lleva una bandera `fromRulesEngine`: sin ella, cada efecto del motor arrancaría
  una cascada **nueva a profundidad 0**, y el tope de diez saltos no lo vería, porque cuenta
  dentro de una cascada y no entre cascadas.
- **Una tirada puede disparar dos reglas.** Un 20 natural que no llega a la CD es
  `NATURAL_TWENTY` **y** `FAILURE`; el traductor devuelve una lista, no un disparador.
- **`ENTITY_OPENED` era un disparador muerto.** `recordEntityOpened` existía desde 2A.15 con su
  prueba y **no lo llamaba nadie**, así que el ejemplo con el que se definió el sistema entero
  —«cuando un jugador revise esta ficha, se desvela el camino secreto»— era inalcanzable en
  producción. Ahora lo escribe la lectura de una ficha, siempre `DM_ONLY`.
- **Tres funciones con prueba y sin llamador.** La de arriba, `seedResourcesFor` (así que
  **ningún personaje tenía dados de golpe ni espacios de conjuro**) y `assertNoUnknownChoices`
  (así que una clave de concesión inventada se guardaba en silencio). Una prueba unitaria verde
  no dice que la función se use.
- **Un 500 donde tenía que haber un 400.** `InvalidChoiceError` no lo capturaba nadie: mandar dos
  veces la misma habilidad reventaba. Se valida ahora contra la ficha que quedaría, **antes** de
  guardar — y solo lo que llega en esa petición, porque un dato viejo ya guardado no puede dejar
  a un personaje imposible de editar, incluida la edición que lo arreglaría.
- **Una suma que no cuadraba en pantalla.** El previo de subida de nivel decía «13 → 22 (+8)»:
  el destino salía de la hoja derivada y el delta de la columna en bruto, ignorando el +2 de
  Constitución del enano. El comentario del código llegaba a afirmar que los dos caminos daban
  el mismo número «para no calcularlo dos veces»; discrepaban, y nada lo comprobaba. Lo cazó un
  recorrido de navegador, no la suite: las unitarias montaban humanos.

**Lo que se añadió porque faltaba para jugar.**

- **Ventaja y desventaja** como concepto, no como sintaxis. El servidor compone `2d20kh1` o
  `2d20kl1`; el cliente pide el modo por nombre. Estaba declarado fuera del alcance de 2A cuando
  no había pantalla, y con pantalla era insostenible: sale en casi todos los turnos.
- **Anulaciones manuales del DM** (`Character.overrides`, migración
  `20260902163450_character_manual_overrides`). El tipo de suceso `MANUAL_OVERRIDE_SET` existía
  desde 2A.5 **sin columna que lo produjera**. Es la válvula de escape de «se guarda lo decidido,
  se calcula lo derivado»: sin ella, la única salida ante un objeto mágico o una regla de la casa
  era mentirle a la ficha. Se aplica como un `override` del motor, así que **sale en la traza con
  su delta**.
- **`GET /catalog`** y **`effectiveSpeeds` en la hoja**, porque la pantalla estaba duplicando dos
  reglas del servidor: la velocidad efectiva copiada letra por letra, y las nueve razas y doce
  clases transcritas a mano. Una regla del juego vive una vez, igual que la matriz de visibilidad.

**Verificación.** 682 unitarias de API, 393 de web, **116 e2e de API en 22 suites** y **30
recorridos de navegador en 7 especificaciones**, todos en verde. Diecinueve mutaciones aplicadas
a mano y comprobadas rojas; **tres de ellas no se pusieron rojas y destaparon pruebas que pasaban
por el motivo equivocado** —una usaba la etiqueta de una concesión en vez de su identificador,
otra fallaba igual con la comprobación de DM quitada, y la tercera vigilaba código muerto—; las
tres se reescribieron o se borró el código que fingían proteger.

**Cómo revertirlo.** Los commits del día son independientes por tarea. La única migración es
`20260902163450_character_manual_overrides`, que solo **añade** una columna anulable: revertirla
es un `ALTER TABLE "Character" DROP COLUMN "overrides"` y no toca ningún dato existente.

---

## 2026-09-02 (tarde) — Las salvaciones de muerte estaban a medias, y la mitad que faltaba era un fallo vivo

**Que.** Una investigacion de huecos de mecanica —pedida por el autor con el ejemplo de la
iluminacion— encontro que las tiradas de salvacion contra muerte estaban construidas por la
mitad. La parte hecha era la buena; **la que faltaba era la que ocurre en la mesa**.

**Y una de las tres no era un hueco, era un fallo activo sobre codigo ya desplegado:** curar a un
personaje a 0 PG **no borraba sus fracasos**. El clerigo lo levantaba con dos encima y ahi seguian
la sesion siguiente. El descanso largo tampoco los borraba, asi que eran dos caminos con el mismo
defecto.

**Las tres reglas del SRD que ahora si aplica `changeHp`:**

- **Golpear a quien ya esta a 0 PG suma un fracaso**, y **dos si el golpe fue critico**. Es el
  momento mas frecuente del juego —el remate al que esta en el suelo— y no dejaba ningun rastro.
- **Muerte masiva**: si lo que sobra tras llegar a 0 iguala o supera los PG maximos, el personaje
  muere en el acto, sin tiradas. **El sobrante se calcula ANTES de recortar a 0**, porque el
  `clamp` que protegia el minimo era justo el que borraba la evidencia.
- **Recuperar un solo PG desde 0 borra los dos contadores.** No es cortesia: arrastrar fracasos
  de una caida anterior mataria a alguien por algo que ya sobrevivio.

**`ChangeHpInput` gana `critical`, y ahora y no despues.** Sin ese campo la regla del doble
fracaso no se puede aplicar, y anadirlo mañana es migrar el payload del evento **que mas veces se
escribe en una sesion**. `HP_CHANGED` gana ademas `massive`, porque una muerte sin tiradas hay que
poder explicarla en la linea de tiempo o parece un error de la herramienta.

**Mutacion comprobada, cuatro veces.** Quitando el borrado al curar desde 0, cae una prueba;
haciendo que el critico cuente uno, otra; calculando el sobrante despues de recortar, se pierde la
muerte masiva; y quitando el fracaso por golpear a quien esta caido, caen dos. Restauradas, 27
verdes.

**Dos pruebas existentes se aflojaron a proposito**, y merece decirse por que: afirmaban el objeto
`data` **entero** del `update`, asi que anadir dos columnas las rompia sin que el comportamiento
cambiara. Pasan a `objectContaining`: una prueba tiene que fijar **lo que le importa**, no la
forma completa de una llamada.

**Como revertirlo.** Quitar el bloque de salvaciones de `changeHp` y los dos campos de los
esquemas. **Pero eso devuelve el fallo**, no solo la funcionalidad.

---

## 2026-09-02 (tarde) — La copia de seguridad estaba rota, y habria dicho que no

**Que.** El pendiente que llevaba todo el dia abierto —«¿el trabajo de copias de las 04:00 cubre
esta base?»— se comprobo por fin. La respuesta es peor que un no.

**El bloque existe y nunca ha corrido**: se anadio hoy, despues de la corrida de las 04:00, asi
que la copia de esta manana **no contiene la base de D&D en absoluto**.

**Y cuando corra esta noche, no serviria.** Perdio las **comillas simples**, asi que
`$POSTGRES_PASSWORD` y `$POSTGRES_USER` se expanden en el *host* —a vacio— en vez de dentro del
contenedor. `sh -c PGPASSWORD=` ejecuta una asignacion y **sale con codigo 0**, de modo que el
`if` del script lo da por bueno y registra `dnd-pg OK` con `FAILED=0`.

**Medido contra el contenedor real, que es la unica forma que vale:**

```
forma rota (la del script):     20 bytes   <- gzip de la nada
forma correcta (con comillas): 6305 bytes
```

**Por que esto importa mas que cualquier funcionalidad de hoy.** La documentacion de despliegue
ya lo decia con estas palabras: *«una copia que nadie ha verificado que cubra esta base es peor
que saber que no la cubre»*. Este caso es el escalon siguiente — una copia que **afirma** cubrirla.
Sin mirarla, el primer aviso habria sido el dia que hiciera falta restaurar.

**Lo que NO pude hacer, y queda para el autor:** editar el script. Este equipo tiene bloqueada la
modificacion de ficheros de produccion por SSH; se intento tres veces y se paro en vez de buscar
un rodeo. **El arreglo es una linea y esta escrito, con su comando, al principio de
[06-pendientes](./06-pendientes.md)** y en `vps1new:/root/docs/06-pendientes.md`. Copia previa
del script en `/root/scripts/backup-coolify.sh.bak.antes-dnd`.

**Mientras tanto, lo unico que cubre esta base** son los dos volcados manuales que se hicieron
antes de cada despliegue de hoy, en `vps1new:/root/backups/dnd/`. Que existan fue suerte del
procedimiento, no del sistema de copias.

---

## 2026-09-02 (tarde) — Segundo despliegue: la hoja de personaje en produccion

**Que.** Subieron 2A.6, 2A.7, 2A.8, 2A.12, 2A.14, 2A.15, los cuatro huecos de mecanica y la
pantalla legal. Volcado previo en `vps1new:/root/backups/dnd/pre-hoja-<fecha>.dump`.

**Comprobado con salida real, no con configuracion:** los tres contenedores sanos; la segunda
migracion del dia aplicada sola por el `CMD` de la imagen; **las seis tablas nuevas y las
dieciseis columnas de la hoja presentes en la base de produccion**; `/` y `/acerca-de` en 200;
y los cinco endpoints nuevos devolviendo **401** sin sesion.

**Y 26 recorridos de navegador verdes** antes de subir, incluidas las cuatro medidas de
contraste del aviso legal —5,39:1 y 6,17:1 sobre el 4,5:1 exigido—, porque **un aviso legal que
no se puede leer no cumple mejor que no ponerlo**, y eso solo se mide en un navegador.

**Lo que este despliegue NO vuelve a comprobar, y por que:** las dos tandas del limite de
intentos. No cambio la topologia de proxies ni las variables de entorno, que es de lo unico que
depende esa aritmetica.

---

## 2026-09-02 (tarde) — 2A.6, 2A.7, 2A.8 y 2A.12: la hoja deja de ser un formulario

**Que.** Cuatro tareas a la vez, escritas por dos implementadores en paralelo sobre una migracion
y unos contratos que se escribieron **antes** de repartir, precisamente para que nadie se
disputara `schema.prisma`.

**2A.6 — la hoja persistida.** `GET`/`PATCH .../sheet`. Se guardan las seis caracteristicas en
seis columnas, las claves de raza, subraza y clase, y las elecciones resueltas. **Los PG maximos,
la CA y los modificadores no se guardan: se calculan** en cada lectura con `deriveCharacter`.
Guardar lo calculado significa que el dia que se corrija una formula habra mil filas mintiendo
sin forma de saber cuales.

**Y una hoja a medio hacer no es un error.** Sin caracteristicas o sin clase no hay nada que
derivar, y el `GET` devuelve `sheet: null` con su motivo en vez de un 500.

**2A.7 — PG mutables, partidos por intencion.** Un `POST` de **delta** para el caso normal —en la
mesa nadie dice «tengo 12», dice «recibo 5»— aplicado con la fila bloqueada, asi que **dos
jugadores aplicando −5 y −3 aterrizan los dos**; y un `PATCH` **absoluto** con `expectedVersion`
para la correccion del DM, que da **409** si alguien cambio los PG mientras miraba. Un DM que
corrige a mano quiere pisar, pero quiere saber que pisa.

**Los PG temporales se gastan primero y no se acumulan**: dos fuentes no se suman, se queda la
mayor. Es el error clasico y esta probado por mutacion.

**Tiradas de muerte, con sus cuatro resultados.** Un 20 natural devuelve a 1 PG; un 1 natural
cuenta **dos** fracasos. Meterlos en exito/fracaso seria perder justo lo que hace tensa esa
tirada.

**2A.8 — recursos, descansos y dados de golpe.** Inspiracion, furia, ki, dados de golpe y
espacios de conjuro son **el mismo mecanismo**, y por eso son una tabla y no cinco
funcionalidades. El descanso largo recupera **la mitad de los dados de golpe redondeando hacia
arriba, minimo uno** —«todos» es el error clasico— y **el brujo repone sus espacios en descanso
CORTO**, que es lo que distingue la magia de pacto.

**2A.12 — condiciones y velocidad efectiva.** Con la regla que habia que acertar: **la condicion
que deja la velocidad a 0 gana, y dos mitades NO se multiplican.** Derribado y agotado nivel 2 a
la vez sigue siendo la mitad, nunca un cuarto: el SRD no compone reducciones de movimiento, y un
modelo que las multiplicara inventaria una regla que no existe. **La traza nombra todas las
causas**, no solo la primera.

**Dos cosas que encontro mi revision y los informes no traian:**

- **La traza de velocidad no era sumable.** Con dos condiciones a cero, cada paso restaba la base
  entera, asi que sumar los pasos daba un negativo donde la hoja dice 0 — y el motor de
  derivacion **si** mantiene esa invariante (`override` guarda el delta). Ahora la primera causa
  lleva el delta y las demas llevan cero: siguen nombradas y ya no mueven un total que no vuelven
  a mover.
- **La curacion por dados de golpe no se topaba contra los PG maximos.** Lo dejo anotado quien lo
  escribio, porque el maximo no se guarda y su modulo no lo tenia a mano. Ahora lo deriva
  (`character-state/common/max-hp.ts`), y **las dos carpetas cuelgan del mismo calculo y ninguna
  de la otra**, que es lo que evita el ciclo.

**Mutacion comprobada por el orquestador, seis veces y sin fiarme de los informes:** el 409 de
version obsoleta, los PG temporales gastandose primero, el 1 natural contando dos, el candado del
recurso `DM_ONLY`, la mitad de los dados de golpe y el cero ganando sobre la mitad. **Las seis en
rojo**, restauradas, y una septima propia sobre el tope de curacion. 585 unitarias y **90 e2e en
18 suites**, corridos **en serie** al final porque tres agentes compartieron base de datos.

**Tres cabos declarados en 06**, y uno importa mas de lo que parece: **«estable» no sobrevive a la
peticion que lo produce**, porque estabilizarse pone los contadores a cero y un `GET` posterior no
lo distingue de «acaba de caer». La solucion no necesita migracion — `CharacterCondition` acepta
clave libre desde 2A.12, y «estable» es una condicion.

**Como revertirlo.** Borrar `apps/api/src/character-state/`, los ficheros `character-sheet.*` de
`characters/`, sus e2e, y quitar `CharacterStateModule` de `app.module.ts`. Las columnas y las
tablas se quedan sin usar, que no molesta.

---

## 2026-09-02 (tarde) — 2A.14 y 2A.15: la aplicacion empieza a avisar, y el mundo a recordar

**Que.** Dos tareas que el motor de reglas necesita antes de existir. La **bandeja de avisos**
(`GET /notifications`, `POST /notifications/read`) y el **estado del mundo**: marcas con nombre,
conjuntos con nombre y senales, todos con su `GameEvent`.

**Por que estan en 2A y no despues.** El efecto «avisar» del motor **no tiene donde escribir**
sin la bandeja, y sin «avisar» el modo propuesta no puede existir. Y las marcas y los conjuntos
son sobre lo que el motor condiciona: sin ellos, «SI el puente esta caido» no se puede escribir.

**Lo que la bandeja arregla, y llevaba tiempo:** la aplicacion **no le contaba nada a nadie**.
Habia eventos de dominio emitiendose desde la fase 1 —`campaign.member_joined`,
`entity.created`— que **nadie escuchaba**. Ahora los escucha, y con un cuidado que merece
decirse: el aviso de entidad creada **se reparte a traves de `canView`**, no a todos los
miembros. Avisar a ciegas de que existe una ficha `DM_ONLY` filtra su existencia, que es la
mitad del secreto.

**Aislamiento entre usuarios, comprobado donde importa:** `userId` va **en el `where` de la
consulta**, no en una comprobacion posterior; tanto al listar como al marcar leidas. Comprobado
por mutacion: quitandolo de `list()`, los avisos del DM se colaban en la bandeja del jugador.

**Y el payload lleva datos, nunca la frase.** Guardar «Ana te invito a Ceniza» en la base seria
escribir espanol en una columna y perder la posibilidad de cambiarlo. Es la misma regla que
`labelKey` en el motor.

**Idempotencia, que no es un adorno:** anadir dos veces el mismo miembro a un conjunto **no lo
duplica ni falla**, y ademas **no escribe una segunda linea en el log**. Los efectos del motor
se van a encadenar hasta diez saltos; un efecto que no sea idempotente produce basura que crece
sola. Comprobado por mutacion: cambiando el `upsert` por un `create`, la segunda llamada daba
500.

**Lo que NO se enganicho, y se dice en vez de inventarlo.** Cinco tipos de aviso existen en el
contrato y **nada los emite todavia** (`ENTITY_REVEALED`, `SESSION_STARTED`,
`SESSION_SCHEDULED`, `COMMENT_ADDED`, `RULE_PROPOSAL`), y cuatro eventos de dominio que si se
emiten no tienen tipo de aviso que les corresponda. Y `recordEntityOpened` —el suceso que el
motor escuchara, escrito con visibilidad `DM_ONLY` como exige el hueco H3— **esta implementado
y no esta conectado** al modulo de entidades. Va a 06.

**Como revertirlo.** Borrar `apps/api/src/notifications/`, `apps/api/src/world-state/` y sus dos
e2e, y quitar los dos modulos de `app.module.ts`. Las tablas se quedan vacias sin molestar.

---

## 2026-09-02 (tarde) — La atribucion del SRD, vista desde la aplicacion (deuda S1)

**Que.** Un pie en toda pantalla con sesion (`apps/web/src/ui/LegalNotice.tsx`, montado dentro de
`AppShell`) y una pantalla `/acerca-de` con el texto completo de la atribucion CC BY 4.0.

**Por que ahora y no con 2A.10.** La ficha S1 llevaba una condicion de disparo, no una fecha:
*«deja de ser opcional en cuanto una pantalla pinte datos del SRD»*. La hoja de personaje los va
a pintar, y cerrar esto **antes** cuesta lo mismo y quita el riesgo de que se recorte junto con
la tarea que lo arrastraba.

**Tres decisiones que merecen leerse:**

- **El aviso va en ingles y no se traduce.** Es el texto de atribucion que la licencia
  especifica; traducirlo seria modificar justo lo que da fe de la modificacion. Lo que si va en
  espanol es la nota de modificacion, porque describe lo que hicimos nosotros.
- **`/acerca-de` no lleva `ProtectedRoute`.** Una atribucion que exige iniciar sesion no esta en
  la obra distribuida: esta detras de ella.
- **El pie vive en el armazon y no en cada pantalla.** La CC BY la pide en la obra distribuida, y
  el armazon es lo unico que todas las pantallas con sesion comparten; ponerla una por una seria
  una regla que se olvida en la siguiente.

**Un efecto secundario aceptado y dicho:** en `/acerca-de` la atribucion sale dos veces, porque
la pagina vive dentro del armazon que ya lleva el pie. No molesta a nadie y evita una excepcion
—«ocultar el pie en esta ruta»— que habria que recordar en cada rediseno. Las pruebas lo dicen
en vez de romperse por ello.

**Mutacion comprobada.** Quitando la nota de modificacion del pie, la prueba se pone roja. Es la
mitad que se olvida: omitirla incumple igual que omitir el nombre del autor.

**256 pruebas de web verdes**, ocho de ellas nuevas.

**Como revertirlo.** Borrar `LegalNotice.tsx`, `AcercaDePage.tsx` y su prueba, y quitar la ruta y
la llamada al pie. **Pero entonces vuelve el incumplimiento** en cuanto una pantalla ensene datos
del SRD, asi que revertir esto exige quitar tambien esa pantalla.

---

## 2026-09-02 (tarde) — 2A.13: tirar de verdad

**Qué.** `POST /campaigns/:id/rolls`. El servidor tira con el evaluador de 2A.1, escribe un
`GameEvent` de tipo `ABILITY_ROLL` con la expresión, los dados, lo conservado, lo descartado, el
total, la CD si la había y el resultado, y lo devuelve. La visibilidad la elige quien tira.

**Por qué era una tarea y no un detalle.** 2A.1 solo evaluaba; **nadie ejecutaba una tirada**.
De esto dependen tres cosas: las tiradas de creación de personaje (2A.6), el disparador «una
tirada falla» del motor de eventos, y la línea de tiempo de la sesión.

**El azar vive en el servidor y en ningún otro sitio.** Si tirara el cliente, una tirada sería
una afirmación del navegador, y la mesa no tendría forma de distinguir un 20 de un 20 escrito a
mano.

**`natural` y `outcome` son dos campos porque son dos hechos.** Un 20 natural que no llega a la
CD sigue siendo un 20 natural, y un 1 que la supera sigue siendo un 1; en la mesa se cantan los
dos. Y el natural es **el dado que se conserva**, no el que se tira: con desventaja, un 20
descartado no es un 20 natural. Cuando no hay exactamente un d20 con un solo dado conservado
—`3d20`, dos términos de veinte— se dice `NONE` en vez de elegir uno por orden de aparición.

**Dos comodidades que se ganan gratis:** si quien tira no dice la sesión, **se usa la que esté
en curso**; y no tener ninguna abierta no es un error, la tirada queda fuera de sesión, que es
un estado que el log ya sabía representar.

**Una adición a 2A.1:** `DiceTermResult` gana `sides`. Para decir si una tirada es un 20 natural
hay que saber que el dado era de veinte, y la alternativa era volver a analizar la expresión con
una segunda copia del analizador — que es como dos copias del mismo dato acaban discrepando.

**Mutación comprobada, tres veces.** Mirando el dado tirado en vez del conservado: cae la prueba
de la desventaja. Cambiando `>=` por `>` contra la CD: cae la del éxito justo. Invirtiendo la
comprobación de propiedad del personaje: caen dos. Restauradas; 20 unitarias y 8 e2e verdes.

**Un hallazgo que salió de una prueba fallida, y se queda anotado.** La prueba de cien tiradas se
ponía roja sola: no por los dados, sino por el **límite global de 100 peticiones por minuto y por
IP**, que empezaba a devolver 429 a mitad de bucle. La prueba se bajó a treinta —medir el
limitador no era su trabajo— y **la pregunta que abre va a 06 como R1**: una mesa entera puede
salir por una sola IP, y el sondeo del log gasta del mismo presupuesto.

**Cómo revertirlo.** Borrar `apps/api/src/rolls/`, `packages/shared/src/roll.schema.ts` y
`apps/api/test/rolls.e2e-spec.ts`, y quitar `RollsModule` de `app.module.ts`. `sides` en el
evaluador puede quedarse: no molesta a nadie.

---

## 2026-09-02 (tarde) — Once huecos de mecánica, y los cuatro que no podían esperar

**Qué.** El autor pidió un repaso de mecánicas faltantes con 2A.1-2A.5 ya en producción. Salieron
once huecos, en [su propia spec](./superpowers/specs/2026-09-02-huecos-de-mecanica-2A.md): no
repite los informes anteriores, los lee **contra el código que ya existe** y contra lo que
contestaron los jugadores.

**El criterio para cerrar uno ya no es nuevo:** si cerrarlo hoy es cambiar una forma de datos y
cerrarlo mañana es migrar filas escritas, se cierra hoy. Y hay una circunstancia que aprieta —
**la aplicación está en producción**, así que cada hora puede haber filas reales.

**M1 · La media competencia no existía, y dos clases del SRD ya la usaban.** El enum era
`none / proficient / expertise`; la 5.ª edición necesita **cuatro**. «Aprendiz de todo» del bardo
(nivel 2) y «Atleta excepcional» del campeón (nivel 7) suman **la mitad** del bonificador, y las
dos estaban ya transcritas en el catálogo: **la hoja las anunciaba y no las aplicaba**. Es el
mismo argumento con el que la pericia entró siendo un enum de tres en vez de un booleano — se
había cerrado media puerta.

**M2 · Ataque Extra.** El informe de huecos dijo que el dato iba en 2A con el catálogo de
clases; 2A.3 transcribió el catálogo y no lo incluyó. No era un hueco futuro: era una tarea
cerrada a la que le faltaba una columna. Y la corrección que hacía ese informe era buena: Ataque
Extra **no es un rasgo condicional como Ataque Furtivo, es un número**.

**M3 · Los espacios de conjuro, que los jugadores pidieron por su nombre.** El documento de
respuestas ya los había fallado dentro de 2A y **las diecisiete tareas no los nombraban**. Entra
la tabla, no la matemática de conjuros: un espacio es el mismo mecanismo que la inspiración, un
contador con máximo que un descanso repone. Con sus **tres progresiones**, porque confundirlas es
el error obvio: completa, media —que empieza al nivel 2, y por eso su primera fila está vacía a
propósito— y de pacto, que tiene pocos espacios del mismo nivel y **repone en descanso corto**.

**M4 · La iniciativa.** Estaba en la anatomía de la hoja al lado de la CA y la velocidad, y el
motor no la derivaba. Una línea, y evita que 2A.10 tenga que volver a tocar el motor.

**Mutación comprobada, cinco veces.** Media competencia devolviendo el bonificador entero: 12
pruebas en rojo. El guerrero perdiendo su tercer ataque: 2. El paladín lanzando desde el nivel 1:
1. El brujo reponiendo en descanso largo: 1. La iniciativa dejando de derivarse: 4. Todas
restauradas; 322 pruebas verdes en `src/rules`.

**Tres huecos colocados en una tarea concreta**, para que la tarea no los redecida:
`Character.equippedSlots` —que la parte 2 del plan mandaba crear en 2A y sigue sin existir— va en
**2A.6**; las tiradas de salvación contra muerte van en **2A.7**, porque la mecánica empieza justo
cuando los PG llegan a 0; y la **clave libre de condiciones** va en **2A.12** — el informe de
huecos avisó de que un enum cerrado deja fuera la concentración, y la parte 2 del plan escribió
«lista cerrada» pisando el aviso.

**Cuatro declarados en 06**, y uno de ellos con prisa: **el personaje se archiva, no se borra**.
Lo pidieron los jugadores, hoy el borrado es definitivo, y es lo único de esa lista que pierde
datos mientras espera.

**Cómo revertirlo.** Quitar `spell-slots.ts` y `mechanics-gaps.spec.ts`, y devolver el enum a
tres estados. **Ojo con el orden:** si ya hay personajes guardados con `half`, revertir el enum
es una migración de datos, que es exactamente lo que este cambio existía para evitar.

---

## 2026-09-02 (tarde) — Despliegue de la tanda 2A.3-2A.5, con su migracion

**Que.** Subieron a `dnd.supportive.pro` las tareas 2A.3, 2A.4, 2A.5 y el commit de arreglos de
la revision. Lanzado por la API de Coolify desde **dentro** de la VPS, no desde este PC.

**Volcado previo, porque una migracion cambia el esquema y eso no se hace a ciegas:**
`pg_dump --format=custom` en `vps1new:/root/backups/dnd/pre-2A5-<fecha>.dump`. Es una red de
seguridad del despliegue, no el sistema de copias — ese sigue sin verificarse que cubra esta
base, y es el primer pendiente de [03](./03-despliegue.md).

**Comprobado en produccion, con salida real:** los tres contenedores vuelven `healthy`; la
migracion `20260902131046_session_state_and_game_event` se aplica sola por el `CMD` de la
imagen; **el indice unico parcial `session_one_in_progress_per_campaign` existe en la base de
produccion**; `GET /` da 200; `/api/auth/me` y el `/events` nuevo dan 401 sin token; el
certificado es de Let's Encrypt para el dominio, medido **desde dentro** con `openssl s_client`
porque Norton intercepta el TLS en el PC del autor.

**Y las dos tandas del limite de intentos, incluida la que casi nadie hace:** sin cabecera
falsa, `401 401 401 401 401 429`; **falsificando `X-Forwarded-For`, exactamente lo mismo**. Eso
confirma que Traefik sigue descartando la cabecera del cliente y que `TRUST_PROXY=2` alcanza al
cliente real. Si hubiera dado seis 401, el limite no protegeria a nadie.

**Lo que este despliegue NO comprueba, dicho para que nadie lo suponga:** que dos visitantes
distintos tengan cubos separados. La prueba se hizo desde una sola red —la del propio
servidor—, y para eso hacen falta dos origenes reales. Sigue pendiente en 03.

**Y una mentira de documentacion corregida:** `03-despliegue.md` seguia diciendo en su cabecera
«TODAVIA NO SE HA DESPLEGADO NADA», falso desde el primer despliegue del mismo dia. Importa mas
de lo que parece, porque el resto del documento se lee distinto segun si su lista del primer dia
ya se hizo o no. Ahora hay una seccion con lo comprobado y su evidencia, y otra con lo que sigue
sin comprobarse.

**Como revertirlo.** Volver a desplegar el commit anterior desde Coolify. La migracion es
**aditiva** —columnas y una tabla nuevas, ningun borrado—, asi que el esquema viejo convive con
los datos; si hubiera que deshacerla, el volcado de arriba es el punto de partida.

---

## 2026-09-02 (tarde) — La revisión de 2A.3 y 2A.4, y lo que destapó

**Qué.** Dos agentes revisaron el rango `51a0daa..f268a7c` en paralelo, de solo lectura y con
contexto limpio, como manda [04-convenciones](./04-convenciones.md): uno sobre corrección del
SRD y calidad de las pruebas, otro sobre arquitectura, contrato con las tareas siguientes y
seguridad. Entre los dos: ocho hallazgos altos, siete medios y nueve bajos. **Esta entrada
existe porque el proceso se había saltado**: 2A.3 y 2A.4 se cerraron sin revisión, y lo señaló
el autor.

**El hallazgo que más duele, y era mío.** Los invariantes del catálogo **no fijaban ni una cifra
concreta**. El revisor lo demostró de la única forma que vale: mutó las salvaciones del clérigo
a Inteligencia, las mejoras del guerrero a las estándar y la CA de la media placa de 15 a 11, y
**las 210 pruebas siguieron verdes**. Comprobaban la *forma* («dos salvaciones, distintas y
válidas») y no el *valor*. La forma caza el copiar y pegar; el valor caza el dígito mal
transcrito, que es el otro error de una transcripción. El arreglo es `reference.spec.ts`: la
tabla del SRD entera, a mano, comparada con `toEqual`. Las mismas mutaciones ahora ponen en rojo
cuatro pruebas.

**Y lo que sigue sin estar cubierto, dicho en vez de tapado:** el nivel de las ~203 aptitudes de
clase. Fijarlas sería transcribir los mismos datos dos veces, y dos copias derivan. Está como
**S10** en [06](./06-pendientes.md), y la mutación «evasión del pícaro del 7 al 4» sigue pasando.

**Dos errores reales en el código, no en las pruebas.** `spellcastingAbility` se pasaba al motor
sin mirar el nivel, así que un paladín o un explorador de **nivel 1** recibía CD de salvación de
conjuro y bono de ataque de conjuro que el SRD no le da — y `classes.ts` llevaba un comentario
que decía la regla correcta y que el código no aplicaba. Y al explorador le faltaban dos filas de
progresión, las mejoras de los niveles 10 y 14.

**Cuatro trampas puestas para las tareas siguientes, desactivadas ahora que salen gratis:**

- `CharacterBuild` era una interfaz de TypeScript **sin esquema Zod**, contra la norma del
  proyecto. Si a `abilities` le faltaba una característica, el `NaN` se propagaba a **toda** la
  hoja en silencio. Ahora vive en `packages/shared/src/character-build.schema.ts`, con el nivel
  acotado a 1–20 — sin ese tope, el nivel 21 daba competencia +7 y el 0 daba PG negativos.
- Una elección huérfana lanzaba una excepción **al derivar**. En cuanto 2A.6 persista las
  elecciones, cambiar de raza dejaría filas viejas y **el personaje se volvería ilegible por un
  dato caduco**. Ahora derivar avisa (`stale_choice`) y solo escribir es un error.
- `deriveCharacter` —«la puerta de entrada» según 01— **tiraba** los rasgos, las velocidades y
  las claves de raza y clase, así que ni 2A.10 ni 2A.12 podrían haberla usado.
- Dos escudos sumaban **+4** y dos armaduras de cuerpo dejaban la descartada como un aviso que en
  pantalla parece una sugerencia. Ahora es `InvalidEquipmentError`.

**Tres mentiras de documentación, corregidas donde miente el texto y no el código:** «es un 400,
no un 500» (no hay filtro de excepciones; la API devolvería 500, y montarlo es 2A.6 → ficha S7);
«el catálogo tiene un solo consumidor, el motor» (es al revés: la dirección es `catalog →
engine`); y «trece armaduras y el escudo», que son doce.

**Y una prueba que no podía ponerse roja**, anunciada además como control legal: afirmaba
`sourceType !== "manual"` sobre modificadores que **nunca** llevan ese valor. Sustituida por una
lista blanca real de claves del SRD.

**Una postura discrepante, anotada con las dos versiones** como pide 04: el revisor pedía que las
velocidades pasaran ya por el motor; se deja para 2A.12, que es literalmente esa tarea, con la
obligación explícita de convertirlas allí en modificadores. Ficha **S9**.

**Una incidencia de proceso, que también se anota.** Uno de los revisores dejó **cinco
mutaciones sin restaurar** en el árbol de trabajo; se detectaron antes de que entraran en ningún
commit y se restauraron desde git. El encargo ya decía que un revisor que toca el árbol limpia
después; a partir de ahora tiene que exigir además un `git status` limpio como última acción.

**Cómo revertirlo.** Es un commit de arreglos: revertirlo devuelve los defectos de arriba, no
quita funcionalidad.

---

## 2026-09-02 (tarde) — 2A.5: la partida empieza a tener estado

**Qué.** El proyecto guardaba **documentos** y no guardaba **partida**: `Session` no tenía
estado, así que no existía «sesión en curso» y una tirada, unos PG o un descanso no tenían de
dónde colgar. Ahora la sesión tiene `status`, `startedAt` y `endedAt` con sus dos endpoints de
DM, y al lado hay un log append-only, `GameEvent`, con su unión discriminada de Zod y su
lectura paginada y filtrada por `canView`.

**La decisión que da valor a todo esto: el log nunca es la fuente del estado.** El estado se
lee de sus columnas; el log cuenta *qué lo cambió*. Es lo que impide que su `payload Json` sea
la trampa que el proyecto ya pisó con `Entity.body` en 1.17b. La regla queda escrita en
[04-convenciones](./04-convenciones.md), no implícita: **todo lo que haga falta consultar es
una columna real, y un campo del `payload` que haya que consultar se promociona a columna**.

**Una restricción que la base puede garantizar, la garantiza la base.** «Como máximo una sesión
en curso por campaña» es un índice único **parcial** de Postgres dentro de la migración, no un
`if` en el servicio — un `if` ahí es una carrera esperando a ocurrir en cuanto el DM tenga dos
pestañas abiertas. El servicio solo traduce el choque a un 409 legible.

**Mutación comprobada, y esta era la que importaba:** con el índice **borrado de la base**, la
prueba «arrancar una segunda sesión en la misma campaña falla» se pone roja y las otras cinco
siguen verdes. Y quitando el filtro de `canView` de la lectura del log, cae la del evento
`DM_ONLY`. Restaurados los dos: 51 e2e de API en 13 suites, verdes.

**Un detalle de paginación dicho en voz alta en vez de escondido:** el filtro por `canView` va
después de traer la página, así que una página puede volver vacía con log por leer. El cursor
sale de la **última fila traída**, no de la última visible — si saliera de la visible, una
página entera de eventos `DM_ONLY` dejaría al jugador atascado. Filtrar en SQL exigiría
reimplementar la matriz de visibilidad en un `where`, que es justo lo que `canView` existe para
que nadie haga.

**No hay `POST` del log.** Un evento nace del cambio que lo provoca y se escribe en su misma
transacción; dejar escribirlo suelto permitiría inventar una historia que no ocurrió.

**Un fallo propio, anotado:** una prueba nueva pasaba y otra fallaba por `jest.clearAllMocks()`,
que borra las llamadas pero **no las implementaciones** — el rechazo de una prueba se colaba en
la siguiente. Es `resetAllMocks`, y queda dicho en el propio fichero.

**Cómo revertirlo.** `prisma migrate resolve` hacia atrás sobre
`20260902131046_session_state_and_game_event`, borrar `apps/api/src/game-events/`,
`packages/shared/src/game-event.schema.ts`, `apps/api/test/game-state.e2e-spec.ts` y los dos
métodos `start`/`close` de `sessions`. Ninguna pantalla depende de ello todavía.

---

## 2026-09-02 (tarde) — 2A.4: elecciones pendientes y avisos

**Qué.** *«+1 a dos características a tu elección»* y *«elige cuatro habilidades»* dejan de ser
casos especiales por raza y pasan a ser **el mismo mecanismo**: una concesión con `choose`, una
validación en el servidor y un aviso cuando falta. `choices.ts` valida; `resolve.ts` aplica o
apunta; `deriveCharacter` junta los avisos del catálogo con los del motor.

**Las tres reglas, cada una con su prueba.** Sin elección **no se aplica nada** y sale un aviso
`unresolved_choice` que dice cuántas faltan. Una elección **incompleta tampoco aplica nada** —
aplicar la mitad daría una ficha con pinta de terminada y números mal, y un aviso dice más—.
Y una elección **inválida es un error, no un aviso**: elegir de más, repetir, salirse de la
lista o elegir lo que `excluding` prohíbe son `InvalidChoiceError`, que el borde traducirá a
400. Se distingue `EXCLUDED` de `NOT_IN_LIST` a propósito: Carisma **sí** está en la lista del
semielfo, lo prohíbe su +2 fijo, y un mensaje que dijera «no está en la lista» mandaría a
buscar el error donde no está.

**Dos comprobaciones que no pedía el plan y salieron escribiéndolo.** Una elección cuya
concesión esta ficha no tiene es un error (`UNKNOWN_GRANT`) y no un silencio: sin eso, una clave
mal escrita haría desaparecer un bono sin explicación. Y elegir una habilidad que ya se tiene
por otra vía —el elfo ya trae Percepción— **no es un error sino un aviso**
(`duplicate_skill_choice`), porque este resolutor no ve todas las fuentes de una mesa real.

**Y lo que hace útil el mecanismo:** una elección resuelta es **indistinguible de un bono fijo**
en la traza — mismo `op`, mismo `sourceType`, misma pinta—, y hay una prueba que lo compara paso
a paso contra el +2 de Carisma. Eso es lo que evita una rama `if (race === "half-elf")` en el
motor y hace que una raza propia en 2B sea añadir datos, no código.

**Mutación comprobada, tres veces.** Forzando `complete: true` en `validatePicks`, caen 10
pruebas, entre ellas «no aplica la mitad». Quitando la comprobación de `excluding`, caen 3.
Quitando `assertNoUnknownChoices`, cae la de la clave desconocida. Restauradas, 210 pruebas
verdes en `src/rules`.

**Lo que no entra, y por qué:** la mejora de característica de los niveles 4, 8, 12, 16 y 19.
Es el mismo mecanismo, pero «+2 a una **o** +1 a dos» es una concesión con dos modos, y quien
decide la forma de la subida de nivel es 2A.9. Anotado como **S6** en 06.

**Cómo revertirlo.** Borrar `choices.ts` y `choices.spec.ts`, y devolver `resolve.ts` a su
versión de `ce4140b`. Nada persiste todavía: las elecciones se pasan en memoria.

---

## 2026-09-02 (tarde) — 2A.3: el catálogo SRD 5.1, y las tres capas que lo verifican

**Qué.** Nueve razas con sus cuatro subrazas, doce clases con su progresión y su única subclase
del SRD, doce armaduras y el escudo, la tabla de bonificador de competencia, `ContentRef`, el
resolutor que traduce una ficha declarada a la entrada del motor de 2A.2, y `NOTICE.md` con la
atribución CC BY 4.0 y su nota de modificación. En `apps/api/src/rules/catalog/`.

**Lo que lo hace fiable no son los datos, son las tres capas de verificación.** Los invariantes
(una prueba, todo el catálogo) cazan el error de copiar y pegar: una clave duplicada, una clase
con tres competencias de salvación, una velocidad a cero, un tope de Destreza que no cuadra con
la categoría de la armadura. Los cinco casos de mesa conocidos —enano de las colinas bárbaro a
nivel 1 y a nivel 5, elfo alto mago, guerrero con cota de malla y escudo, semielfo sin
elecciones— cazan el otro error, que es peor: una cifra transcrita mal o **un rasgo modelado
como suma única cuando el SRD lo da por nivel**. Y el control legal es una prueba, no una
intención: falla si `NOTICE.md` pierde la atribución o la nota de modificación, o si un fichero
de datos pierde su cabecera.

**Mutación comprobada, tres veces.** Cambiando `grant.amount * build.level` por `grant.amount`
en el resolutor, el caso 2 falla (`60` pasa a `55`) — y el caso 1 **no**, porque a nivel 1 el
producto es el mismo, que es exactamente por qué el plan pedía los dos niveles. Poniendo el tope
de Destreza de la cota de malla a `2`, la CA sube a 20 y caen tres pruebas, una de ellas el
invariante de categoría. Cambiando «Modificaciones:» por «Cambios:» en `NOTICE.md`, cae el
control legal. Restaurados los tres, 184 pruebas verdes en `src/rules`.

**Decisiones tomadas en ausencia del autor**, las tres en 06 con su coste de revertir: el
catálogo vive en `apps/api` y no en un paquete (S3), de cada aptitud se transcribió el nombre y
el nivel y no su texto de reglas (S2), y **la atribución todavía no se ve en ninguna pantalla**
(S1) — no hay incumplimiento porque el catálogo aún no se publica, pero deja de ser cierto en
cuanto 2A.10 pinte una hoja.

**Una contradicción del plan, resuelta y dicha:** su §4.4 pone el caso del semielfo («dos avisos
`unresolved_choice`») en 2A.3 y su §5.4 lo pone en 2A.4. Se hace lo que 2A.3 permite sin tocar
el motor: el resolutor devuelve las elecciones pendientes y **no altera ninguna característica**;
convertirlas en avisos del motor y validar una elección propuesta sigue siendo 2A.4.

**Cómo revertirlo.** Borrar `apps/api/src/rules/catalog/` y `NOTICE.md`. Nada más depende de
ellos: el motor no los importa, no hay tabla nueva, no hay migración y no hay endpoint.

---

## 2026-09-02 (mediodía) — El plan de 2A, completo; y su primera tarea

**Qué.** El plan de la fase 2A estaba a medias: once tareas y **ocho preguntas sin responder**,
esperando al autor. El autor pidió además tres cosas nuevas —el sistema de eventos «por cajas»,
las distancias y una bandeja de notificaciones— y se fue a la universidad dejando la fase en
marcha. Así que el plan se cierra: [parte 2](./superpowers/plans/2026-09-02-fase-2A-parte-2-eventos-distancias-y-cierre.md).

**Las ocho preguntas, falladas** en ausencia del autor y con su permiso expreso, cada una con su
motivo y **lo que cuesta si el fallo está mal**. Y los cuatro huecos de forma que llevaban desde
el 2026-09-01 sin decidir —manos, descansos y dados de golpe, PG temporales, pericia— también,
porque cambian la forma de una tabla y decidirlos después de la primera migración sale caro.

**Seis tareas nuevas**, hasta diecisiete: tirar de verdad (endpoint y registro), velocidades y
condiciones, bandeja de notificaciones, marcas y conjuntos, el motor de reglas y su pantalla.
Con su orden final y su punto de corte declarado por si no da tiempo: **el bloque del motor no
se parte por la mitad**, porque un motor sin pantalla no lo usa nadie y una pantalla sin motor
es una mentira.

**Once huecos** aparecieron al juntarlo todo. Cinco resueltos ahí mismo —las condiciones
bajaron de 2C a 2A porque la velocidad efectiva las necesita; nada ejecutaba una tirada; el
efecto «avisar» no tenía dónde escribir; deshacer exige guardar el antes y el después—. **Seis
siguen abiertos** y están en 06, y uno de ellos importa más que el resto: **con qué autoridad
escribe una regla**. Si un jugador abre una ficha y eso revela algo, la escritura la hace
alguien que no podía hacerla. La propuesta es que se aplique con la autoridad del DM que armó la
regla, pero **eso necesita su propia revisión de seguridad antes de construir el motor**.

**Y la primera tarea, hecha:** el evaluador de expresiones de dados (2A.1), con 27 pruebas y sus
dos mutaciones comprobadas.

**Un error propio, anotado para no repetirlo:** un `git add -A` metió el evaluador **sin sus
pruebas** dentro de un commit de documentación. No se reescribió historia ya empujada; la tarea
se cerró en el commit siguiente y quedó dicho. `add -A` no se usa con trabajo a medias en el
árbol.

**Revertir.** Todo esto es documentación salvo `apps/api/src/dice/`, que es puro y no lo importa
nadie todavía.

---

## 2026-09-02 (tarde) — Segunda pasada del reseño: lo que el autor señaló al verlo

**Qué.** El autor miró la interfaz desplegada y mandó dos capturas con tres cosas: el logotipo
parecía un emoji, la cabecera «casi no se nota», y las insignias de visibilidad eran cajas que
pesaban más que el nombre al que acompañaban. Pidió además mejorar los formularios.

| Señalado | Qué era en realidad |
|---|---|
| «que el logo no sea un emoji» | **Había dos.** La pestaña **no tenía icono ninguno**, así que el navegador ponía el suyo genérico; y el conmutador de tema era el carácter `☾`/`☀`, que se pinta como emoji a color en unos sistemas y como cuadrado vacío en otros |
| «el header casi no se nota» | 48 px de alto, **del mismo color que las tarjetas** que debía enmarcar y separado por el mismo filete gris. Era una tarjeta más |
| Las insignias | Borde de **3 px**: pesaban más que el nombre de la ficha |
| El horizonte del acceso | Un zigzag de rectas. Se leía como un **gráfico de líneas**, no como terreno |

**Lo entregado.** Marca dibujada (rosa de los vientos + regla, en trazo, heredando el color)
con su `favicon.svg`, iconos de sol y luna dibujados, cabecera de 64 px sobre fondo **más
oscuro** que las superficies y con filete de cobre, insignias de 1 px —donde la señal que
distingue los cinco niveles es el **glifo**, no el grosor—, y un horizonte de curvas
irregulares con cumbres, abetos de escala y una torre en ruinas **apoyada** en la loma.

**Lo que apareció tirando del hilo, que es lo interesante:**

1. **El mismo defecto tres veces en una mañana: un valor de enumeración llegando a la
   pantalla.** `Ciudad Ceniza (LOCATION)` en los enlaces; `PUBLIC`, `DM_ONLY` como opciones del
   selector de visibilidad; y `Nuevo LOCATION` como título de diálogo. Se arreglaron los tres y
   **se escribió la regla** en [04-convenciones](./04-convenciones.md), porque un fallo que
   reaparece tres veces en una mañana volverá una cuarta.

2. **La visibilidad pasó de desplegable a radios con explicación.** Es el rasgo que distingue
   este producto de una wiki cualquiera y estaba pidiendo elegir entre cinco palabras en inglés
   sin decir qué hacía ninguna. Ahora cada nivel lleva su insignia y una frase.

3. **Y esa frase mintió.** La primera versión prometía que «público» dejaba ver a quien no
   estuviera en la campaña. Es falso: `canView` rechaza al no miembro **antes** de mirar el
   nivel, así que `PUBLIC` y `PLAYERS` producen hoy el mismo conjunto de espectadores —y
   [05-datos.md](./05-datos.md) **ya lo decía bien**. Se corrigió el texto, no el documento.
   De ahí sale la regla: si la interfaz explica una regla del servidor y discrepan, **miente la
   interfaz**.

4. **Las filas dibujaban el borde partido**, y eso era un defecto de verdad, no un gusto. Al
   pasar de `<button>` a `<a>` heredaron `display: inline`, y un borde sobre un elemento en
   línea que ocupa varias líneas se dibuja a trozos. **Nada podía cazarlo**: `jsdom` no
   maqueta, ninguna aserción de texto lo nota, y sobrevivió a la suite entera en verde y a un
   despliegue. Ahora la suite de navegador lee el `display` **calculado** de la fila.

**Alineación de la documentación**, revisada a propósito en esta pasada: dos afirmaciones vivas
habían quedado desfasadas y se corrigieron —[01-arquitectura](./01-arquitectura.md) decía que
el editor era «la única vista de detalle que existe», y el hallazgo **E2** de
[06-pendientes](./06-pendientes.md) daba por hecho que los enlaces solo se pintaban dentro de
él—. Los registros fechados **no se reescribieron**: donde su premisa cambió, se anotó al
margen.

**Revertir.** Cada arreglo es su propio commit. El logotipo, el favicon y los iconos viven en
`apps/web/src/ui/Logo.tsx` y `apps/web/public/favicon.svg`; las reglas de interfaz, en
`04-convenciones`.

---

## 2026-09-02 — Reseño completo de la interfaz

**Qué.** La identidad, la navegación y todas las pantallas. El autor entró en producción por
primera vez y dijo, con razón, que la interfaz *"se ve terrible"* y que *"cada cosa es super
incomoda de usar"*.

**Cómo se decidió qué arreglar.** No leyendo el código: se sembró una campaña real en
producción —nueve fichas de los siete tipos, cuatro enlaces, dos sesiones, tres personajes— y
se fotografió cada pantalla en escritorio y en móvil. Los hallazgos y su evidencia están en
[la auditoría](./superpowers/specs/2026-09-02-auditoria-interfaz.md), que es un registro
fechado y no se reescribe.

**Lo entregado, en cinco commits:**

| | Qué |
|---|---|
| Identidad | Paleta «Sala de guerra» (pizarra naval y cobre) y cuatro voces tipográficas: Marcellus, Public Sans, EB Garamond, IBM Plex Mono. Medievo por cartografía y grabado, no por pergamino |
| Esqueleto | Cabecera global, migas de pan, y las diez secciones agrupadas en una columna: el mundo por un lado, la mesa por otro |
| Listas | Cada fila con su resumen —el texto ya venía en la respuesta y nadie lo pintaba—, una sola barra de herramientas, botones que dicen qué crean, estados vacíos que invitan |
| Lectura | Página propia para cada ficha y para cada personaje. Leer un PNJ ya no exige abrir un formulario |
| Hoja 5.ª ed. | La **forma** de la hoja real, con todas las casillas a su tamaño y vacías, diciendo que lo están. El motor es la fase 2A |

**Por qué la interfaz cuenta lo que cuenta.** Los contadores por tipo se calculan **en el
cliente** sobre listas que el servidor ya filtró por `canView`, así que significan «lo que tú
puedes ver». `listForUser` añadió el rol del visitante y cuántas personas hay en la mesa, y
**no** cuenta fichas: «12 lugares» dicho a quien solo ve 4 delata los otros 8.

**Tres fallos que solo aparecieron al ejecutar, no al mirar:**

1. El conmutador de tema, fijo en la esquina, **tapaba «Cuenta» y «Salir»** de la cabecera
   nueva; los clics no llegaban.
2. Un contador en una pestaña se colaba en su **nombre accesible** («PNJ 12»), de modo que un
   lector de pantalla anunciaba un número como parte del nombre de la sección.
3. Las migas decidían enlace-o-texto **por posición**, y convertían «Mis campañas» en texto
   muerto cuando era la única. Una miga es enlace cuando tiene destino.

**Revertir.** Cada tanda es un commit propio y se puede revertir por separado; la capa de
tokens (`apps/web/src/ui/tokens.css`) es el único punto por el que pasa el color, así que
volver a la paleta anterior es cambiar un bloque de valores, no repintar pantallas.

---

## 2026-09-02 — Primera puesta en producción: dnd.supportive.pro

**Qué.** La plataforma corre en el servidor dedicado (`vps1new`) tras Coolify 4.3.10 + Traefik,
desde `docker-compose.prod.yml`: `db` (postgres:16, volumen `dnd_pgdata_prod`), `api` (aplica
las migraciones de Prisma al arrancar) y `web` (nginx, sirve la SPA y hace de proxy de `/api`).
**Ningún puerto publicado**: el único que entra es Traefik, y solo contra `web`.

**Por qué.** El autor va a enseñar la plataforma a sus jugadores, y una demostración en local
no es una demostración.

**Lo que costó, para que no vuelva a costar:**

- **El primer despliegue falló** con `Permission denied (publickey)`: la clave de Coolify no
  estaba autorizada en el repositorio. Se arregló añadiendo su pública como **deploy key de
  solo lectura** en GitHub.
- **Coolify rechaza el dominio hasta haber leído el compose del repositorio**
  (`Cannot set docker_compose_domains without docker_compose_raw`). El orden obligatorio es:
  desplegar → poner el dominio → redesplegar. No se puede hacer en un solo paso.

**Verificado desde fuera, con evidencia y no con configuración:**

| Comprobación | Resultado |
|---|---|
| Los tres contenedores | `healthy` |
| Migraciones de Prisma | las **tres** aplicadas en el arranque |
| Certificado | Let's Encrypt para `dnd.supportive.pro`, hasta 2026-12-01 |
| `GET /` | 200, con `<title>Plataforma D&D</title>` |
| `GET /api/auth/me` sin token | 401 |
| `POST /api/auth/register` | 201 — escritura real contra Postgres |
| Sexto login fallido | **429** |
| Sexto login **con `X-Forwarded-For` falsificado y rotando** | **429** |

**La última fila es la que vale.** Prueba que **Traefik descarta la cabecera que manda el
cliente** (corre sin `forwardedHeaders.trustedIPs`), y que ahí — no en el número 2 de
`TRUST_PROXY` — está la protección. Si algún día la API sale a un dominio propio, se mete otro
proxy delante, o alguien configura `trustedIPs`, **este razonamiento deja de valer** y hay que
recontar los saltos. Ver `docs/03-despliegue.md`.

**Además.** La base entró en el respaldo diario del servidor (`dnd-pg.sql.gz`), con el volcado
verificado por contenido —11 tablas y la cuenta dentro—, no por tamaño de fichero.
**El restore no se ha probado todavía**: un volcado que nunca se restauró no es un respaldo, y
así queda anotado en el 06 del servidor.

**Revertir.** Borrar la aplicación desde el panel de Coolify. El volumen `dnd_pgdata_prod`
**sobrevive al borrado**; eliminarlo aparte solo si se quieren tirar los datos.

---
