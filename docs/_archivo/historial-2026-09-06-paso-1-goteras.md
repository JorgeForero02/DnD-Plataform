# Historial — Paso 1 · Las goteras (2026-09-06)

**Entrada de `07-historial.md` movida entera el 2026-09-11**, sexto corte de la sesión de cerrar
fichas: el fichero llegó a 999 de sus 1000 líneas con la ola de arreglos de la revisión final y
esta era la entrada completa más antigua. El avance por tarea sigue en el bloque «Avance» del plan
`superpowers/plans/2026-09-06-paso-1-goteras.md`. No se reescribe.

---

## Paso 1 · Las goteras — los números dejan de mentir (2026-09-06, en curso)

**Qué se entrega.** El plan [`2026-09-06-paso-1-goteras.md`](../superpowers/plans/2026-09-06-paso-1-goteras.md),
tarea a tarea. El avance vivo, con el commit de cada una, está en el bloque «Avance» de ese
plan; aquí solo el hito. **Cómo se revierte:** cada tarea es un commit independiente y ninguna
depende de la anterior salvo las que el plan declara (2, 3 y 4 sobre el fichero de la 1).

- **La tanda de navegador cierra con dos recorridos nuevos y una ficha.** De los cuatro escritos,
  crear un recurso y la medición del botón de la bolsa pasan y se quedan; los de las tareas 11 y 12
  **parpadean** —verde y rojo en pasadas seguidas sobre el mismo código— y no se commitean, con lo
  medido escrito en `docs/06-pendientes.md`. La 12 sí queda probada por el lado del servidor.
  **Y la suite existente no está rota:** en cinco pasadas fallaron ficheros distintos cada vez y
  todos pasaron solos después — el falso rojo por carga que `08-pruebas.md` ya documenta.

- **Tarea 11 · un pícaro con dos dagas no existía.** La pantalla del inventario **no mandaba
  `slot` al equipar** —grep de `slot` en ese fichero: cero—, aunque el servidor lo acepta desde 2B
  y el motor lo usa para la mano ocupada y para el arma ligera de la izquierda. Equipar un arma
  pregunta ahora la mano con **radios**, y cuando una no está disponible —un arma a dos manos— **se
  escribe el motivo** en vez de dejarlo adivinar. Lo que no es un arma se equipa sin preguntar:
  sería un paso que no decide nada. **Cómo se revierte:** el commit.

- **Tarea 10 · no se podía crear un recurso desde la aplicación.** La ruta existía desde 2A y la
  web llamaba a `/spend`, `/give` y `/restore` y **nunca al `PUT`**: se podía gastar, regalar y
  reponer un recurso y no crearlo, y como la siembra solo pone dados de golpe y espacios de
  conjuro, **una fila «Furia» no podía existir** — ni con ella ninguna aptitud con usos, que es la
  única puerta por la que entrarían hoy sin tocar el motor. El formulario pone `resetOn` en
  **radios con su frase** —tres opciones con significado no se esconden en un desplegable— y las
  frases viven una sola vez, en el vocabulario del dominio. **Cómo se revierte:** el commit.

- **Tarea 15 · un PNJ cedido a un jugador no se podía manejar desde su pantalla.** El servidor ya
  lo trataba por dueño —`requireEditable` le deja cambiarle los PG y ponerle condiciones—, y la
  interfaz era más restrictiva **solo porque `ownerId` no viajaba**: no había de dónde leer «es
  tuyo», así que un jugador no podía anotarle el golpe que acababa de recibir sin pedírselo al DM.
  **Esconder el botón no es control de acceso**: la puerta sigue siendo el servidor y esto es
  cortesía en las dos direcciones. **Cómo se revierte:** `9423e80`.

- **Tarea 14 · el panel de dados ya estaba montado, y nada lo sujetaba.** La ficha decía que
  `grep` devolvía solo su declaración; el 2026-09-06 devuelve cuatro apariciones y `MesaDeSesion`
  lo monta **fuera del `<main>`**, con estado propio para que abrir la hoja no lo cierre. Lo que
  faltaba era la prueba que impide que se desmonte otra vez — que es justo como llegó a estar
  escrito y sin usar. **Cómo se revierte:** el commit.

- **Tarea 12 · el editor de criaturas mentía al editar.** El selector de visibilidad ya existía y
  ya se pintaba al **crear**; al editar, la otra rama del ternario decía *«el servidor no manda ese
  dato al leer la criatura»* y **sí lo manda**. Además de incumplir la regla vinculante —si el
  texto explica una regla del servidor y discrepan, miente el texto—, dejaba sin **ninguna** forma
  de cambiar quién ve una criatura propia ya creada. **Cómo se revierte:** el commit.

- **Tarea 19 · cancelar un combate no avisaba a quien estaba esperando** (D-A-3). `cancel` borraba
  el encuentro y sus peticiones **sin escribir nada**, a propósito —«no es historia, es un clic
  deshecho»—, y el coste era que a quien tenía una petición pendiente **le desaparecía la entrada
  de la bandeja sin explicación**. El autor revisó esa decisión. El sujeto del suceso es la
  **sesión** y no el encuentro, que ya no existe para serlo, y no lleva `encounterId`: sería una
  referencia a una fila borrada. **E-IB-18 se tacha en `decisiones.md` y se dice quién la revisó**,
  no se borra. **Cómo se revierte:** el commit.

- **Tarea 16 · corregir el bando no viajaba por el canal en vivo.** `setSide` cambiaba el lado
  **sin escribir ningún suceso**, y el reajuste de `activePosition` que hace `setInitiative`
  cambiaba de combatiente el turno activo sin decir nada: una segunda pestaña seguía señalando a
  quien ya no le toca hasta refrescar. Dos tipos nuevos en el vocabulario cerrado, su `record`
  dentro de la misma transacción que la escritura, y su línea en español con el nombre del bando
  saliendo del vocabulario del dominio. **Cómo se revierte:** el commit; el enum de PostgreSQL solo
  crece, así que revertirlo no rompe filas escritas.

- **Tarea 9 · un descanso avanza el reloj de campaña** (D-A-1: largo 8 h, corto 1 h). Hasta hoy
  `rest.service` **leía** el reloj y no lo movía nunca, y su propio 409 mandaba «avanza el reloj de
  la campaña» a mano: ocho horas de descanso no caducaban nada y la regla de un descanso largo por
  24 h bloqueaba de más. Ahora se cumple sola y todo lo que caduca por reloj caduca al descansar.
  El avance va **dentro de la misma transacción** que el descanso. **Cómo se revierte:** el commit.

- **Tarea 8b · y `changeHp` las aplica.** La condición exigía `statblockRef`, y un PJ nunca lo
  tiene. Ahora hay **dos fuentes con una sola forma**: la del statblock para un PNJ y la de los
  rasgos para un jugador. Un enano recibe 5 de 10 de veneno **con la traza diciendo «Resistencia
  enana»**, y 10 de 10 de cortante. **Cómo se revierte:** el commit.

- **Tarea 8a · de dónde salen las resistencias al daño de un personaje jugador.** La maquinaria
  existía y estaba probada, pero los rasgos de raza eran **puro texto**, así que un enano recibía
  el veneno entero y un tiefling ardía con el fuego entero, con la traza convincente al lado. Hay
  un `kind` de concesión nuevo con **la misma forma** que `statblock.damageModifiers` —no un
  segundo esquema, o `changeHp` tendría que saber de los dos—, el enano y el tiefling lo declaran
  con su cita del SRD, y `resolve.ts` lo agrega. **El dracónido se queda como texto a propósito**:
  su resistencia depende de un linaje que es una elección que el catálogo no modela. Se prueba
  **sin tocar un punto de golpe**; aplicarlo es 8b. **Cómo se revierte:** el commit.

> **`36ab260` contiene además dos arreglos de maquetación que no son suyos**, escritos por otra
> sesión en el mismo árbol y recogidos por un `git add -A`: la tira fija de `HojaCalculada` dentro
> de un cajón (se solapaba 72 px con su cuerpo) y el botón «Aplicar» de `PanelMonedas` (se salía
> 24,5 px de su tarjeta). Cuatro clases, dos `import type` y dos objetos `style`, sin lógica. Se
> dice aquí en vez de reescribir la historia a mitad de plan. **La regla que lo evita ya estaba
> escrita**: un implementador por árbol.

- **Tarea 18 · un PNJ revelado entregaba las seis características de un statblock `DM_ONLY`.** La
  misma respuesta decía que sus números no eran públicos y traía seis de ellos, con los que se
  reconstruyen los seis modificadores de salvación, los dieciocho de habilidad y la iniciativa. No
  era un descuido: `npcs.service.ts` copia las características a la fila de `Character` al
  instanciar (D-2D-2) y `getSheet` devolvía esa fila — **las dos piezas eran correctas por
  separado**. Se aplica la decisión del autor (**D-A-2**): se ocultan, **menos los puntos de golpe
  actuales**, porque saber que un enemigo está malherido se ve en la ficción. La frase que
  acompaña la respuesta se corrige con ella. **Cómo se revierte:** el commit.

- **Tarea 17 · la sala de espera podía leer «todos han tirado» sin que nadie tirara.** La lista de
  peticiones pendientes salía con `take: 50` por fecha descendente y **sin filtro por encuentro**,
  así que una campaña con más de cincuenta pendientes de otro tipo empujaba fuera de la página las
  de iniciativa del combate recién abierto — y el `[]` de la página cincuenta es indistinguible de
  «cero pendientes de verdad». Se cierra por las **dos** mitades: el servidor acepta `encounterId`
  —**sin subir el tope**, que solo movería el problema— y la pantalla lo **manda** en vez de
  filtrar en el cliente, que no puede recuperar lo que el servidor ya recortó. **Cómo se
  revierte:** el commit.

- **Tarea 7 · beberse una poción solo la borraba del inventario.** `consume` resolvía la
  definición del objeto y **nunca miraba sus efectos** —grep de `effects` en `inventory.service.ts`:
  cero—, que solo se leían al derivar la hoja y **desde lo equipado**. Ahora aplica los que el
  objeto ya declara, con la maquinaria de los modificadores temporales (M8) y sin duración, y el
  suceso dice **cuáles se aplicaron y cuáles no**: de los nueve efectos de objeto solo tres caben
  en ese vocabulario, y los otros seis se nombran en vez de descartarse en silencio. **No inventa
  un efecto de curación**: eso es el paso 2. **Cómo se revierte:** el commit.

- **Tarea 6 · un goblin no era competente ni con su propia cimitarra.** `deriveNpc` dejaba
  `weaponProficiencies` vacía, así que atacaba a **+2 donde el SRD da +4**, con el aviso
  `attack_not_proficient` al lado —el motor sabiéndolo y sin poder hacer nada—. Un PNJ es
  competente con lo que maneja: las dos categorías enteras, no una lista transcrita arma por arma.
  **Un PJ sin competencia sigue recibiendo su aviso y sin sumar el bono**, y hay prueba de eso.
  **Cómo se revierte:** una línea.

- **Tarea 4 · la acción Ayudar caducaba antes de tiempo para media mesa.** El reloj solo sube al
  **cerrar** un asalto, así que la marca a `reloj + 6s` vencía al **empezar** el siguiente, antes
  del turno de nadie: quien actuaba antes que su ayudante llegaba a su turno sin ventaja, y eso es
  determinista en la mitad de los órdenes de iniciativa. Una condición puede ahora cortarse en un
  **borde de turno** (`expiryEdge`, vocabulario cerrado de cuatro tomado de Foundry) en vez de en
  el reloj, y quien lo cruza es `advanceTurn`. Fuera de combate no hay borde y manda el reloj de
  siempre. **Las dos pantallas que ya prometían esto no se tocan: hoy dicen la verdad.** **Cómo se
  revierte:** el commit; las dos columnas nacen `NULL` y sin ellas todo caduca como antes.

- **Tarea 3 · dos concentraciones a la vez, y una sola salvación.** El `upsert` de condiciones es
  por clave exacta y cada conjuro genera la suya, así que dos convivían; y como `estaConcentrado`
  devuelve un booleano, `changeHp` pedía **una** salvación para las dos. Empezar una concentración
  retira las demás **con su suceso** —perder la Bendición es algo de lo que la mesa se entera—, y
  con eso el segundo defecto desaparece solo. **Cómo se revierte:** quitar el bloque de `apply`.

- **Tarea 2 · se podía envenenar a un esqueleto.** `conditionImmunities` era texto libre entre dos
  vecinas tipadas, así que **nadie podía consumirlo**. Pasa a las quince del SRD, con migración de
  datos que mapea lo conocido y **deja fuera lo que no reconoce sin borrar la fila**, y `apply`
  rechaza con un 400 que dice por qué. Un personaje jugador no tiene statblock: para él la lista
  está vacía y no cambia nada. **Cómo se revierte:** el commit — pero **las etiquetas que la
  migración no supo mapear no vuelven**: revertir no las devuelve.

- **Tarea 5 · una fórmula de CA ya puede sumar más de una característica.** `AcFormula.addAbility`
  admitía **una**, y las dos Defensas sin armadura del SRD 5.1 suman dos —bárbaro DES+CON, monje
  DES+SAB—, así que un bárbaro salía con la CA baja **y la traza convincente al lado**. Pasa a
  `addAbilities`, con el **tope por característica** y no de la fórmula: la armadura media sigue
  topando la Destreza en +2 sin hablar por las demás. `addAbility`/`abilityCap` se retiran **sin
  alias**. No mecaniza la aptitud —eso es el paso 2—: hace que el modelo pueda decirla. **Cómo se
  revierte:** el commit entero; su superficie son tres ficheros y sus dos specs.

- **Tarea 1 · un jugador podía concederse ventaja permanente, y ya no.** `PUT
  …/conditions/helped` sin duración daba **ventaja renovable en todos sus ataques**: la
  autorización era correcta —el personaje es suyo— y el agujero estaba en que **la clave es texto
  libre** y `ayudaViva` la busca **solo por clave**. Ahora `esClaveReservada` (`@dnd/shared`)
  separa lo que el servidor **interpreta** de lo que solo guarda: `helped` no entra por esa puerta
  **para nadie**, una condición del SRD solo la escribe el DM, y una nota propia sigue siendo del
  dueño. **Cómo se revierte:** quitar las dos comprobaciones de `ConditionsService.apply`.

- **Tarea 0 · dos fichas describían como pendiente algo ya entregado.** `P1` (el ataque comparado
  contra la CA sin pantalla que lo llame) y la segunda `P3` (un cuadro de ataques vacío sin
  motivo) las cerraron las tareas 13 y 15 de la tanda de la iniciativa y nadie las tachó. Se
  comprobaron las dos citas abriendo los ficheros antes de tachar
  —`apps/web/src/features/character-sheet/api.ts:563` y
  `apps/web/src/features/character-sheet/hooks.ts:397` para la primera,
  `apps/web/src/features/character-sheet/AtaquesYLanzamiento.tsx:157` para la segunda— y se
  movieron **enteras** a
  [`_archivo/pendientes-cerrados-2026-09-06-paso-1.md`](../_archivo/pendientes-cerrados-2026-09-06-paso-1.md),
  que es lo que exige `check:docs`: lo tachado sale del documento vivo, no se queda tachado en él.
  La segunda además **se renombra a `P3b`**, porque había dos fichas distintas llamadas `P3`.
