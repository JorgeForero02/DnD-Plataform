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
> | [`_archivo/historial-2026-09-05-por-tarea.md`](./_archivo/historial-2026-09-05-por-tarea.md) | **El detalle por tarea de los planes 03 y 15**, nueve entradas movidas enteras el 2026-09-05 cuando el fichero llegó a 997 de 1000, **y una segunda remesa** con el detalle por tarea de los planes 05, 07 y 08, movida cuando volvió a llenarse. Sus hitos se quedan arriba
> | [`_archivo/historial-2026-09-06-planes-09-11-13-14-por-tarea.md`](./_archivo/historial-2026-09-06-planes-09-11-13-14-por-tarea.md) | **El detalle por tarea de los planes 09, 11, 13 y 14**, seis entradas movidas enteras el 2026-09-06 al llegar el fichero a 968 de 1000 ejecutando el paso 1. Sus hitos se quedan arriba
> | [`_archivo/historial-2026-09-05-y-06-iniciativa-y-bando-por-tarea.md`](./_archivo/historial-2026-09-05-y-06-iniciativa-y-bando-por-tarea.md) | **El detalle por tarea de las tareas 5 y 14 del plan `iniciativa-y-bando`**, movidas enteras el 2026-09-06 al escribir el hito de la tanda completa. Su hito se queda arriba
> | [`_archivo/historial-2026-09-05-ola-3.md`](./_archivo/historial-2026-09-05-ola-3.md) | **La Ola 3, las 21 decisiones y la auditoría de la cola larga**, movida entera el 2026-09-07: insertar las dos entradas del paso 2 y el botín dejó el fichero por encima de su tope de 1000 líneas, y esta fue la más antigua. Su hito se queda arriba
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

## La mesa a 390 px: demostrada, no arreglada (2026-09-07, ficha P2 de estrecho)

`e2e/mesa-en-estrecho.spec.ts` mide lo que era sospecha desde el paseo del 2026-09-05: el borde
derecho de las «Herramientas del DM» cae en **550 px dentro de una ventana de 390**, y **la página
no lo delata** —ni barra horizontal ni vertical—, que es por lo que nada lo cazaba. **No se arregla
aquí, y esa es la entrega**: el apilado evidente mete el panel dentro y **gira el corte 90°** —el
elenco queda en 16 px de alto con cabecera de 36—, así que se revirtió y la medida 6 impide que ese
arreglo falso vuelva a colar. Falta una **decisión del autor** entre tres salidas, en
[06-pendientes.md](./06-pendientes.md). **Revertir**: borrar la prueba; no hay código que deshacer.

---

## El DM escribe el botín, y de paso deja de borrarlo (2026-09-07, ficha P2-2)

**Qué.** El formulario de una tabla de la casa gana el campo que le faltaba, en tres commits.
`entregaSchema` valida objetos y monedas al escribir y el servidor los resuelve al tirar desde que
existe la columna, pero **no había forma de redactarlos desde la pantalla**: la única era un `curl`,
y sobre una tabla sembrada así se declaró terminado el plan del botín.

- **La entrega se edita en un panel propio por fila**, no en línea: la fila ya lleva tres campos y
  una entrega es una lista de objetos con cantidad más cinco monedas, que a 390 px no cabe. El
  botón dice **sin abrirse** si esa fila entrega algo, que es lo que impide que un editor
  secundario esconda nada. Objetos y monedas conviven, porque el `.refine` del esquema solo prohíbe
  que la entrega esté vacía.
- **Y antes que eso, un borrado que nadie había visto.** `DmTableEntry` no declaraba `entrega` en
  la web; el servidor sí la manda, y editar **reemplaza las filas enteras** (`deleteMany` y las
  vuelve a crear). Abrir el formulario de la tabla sembrada y pulsar «Guardar cambios» se llevaba
  el botín por delante. Fue el primer commit, con su prueba en rojo antes.

**Lo que esto enseña, y es la razón de la entrada.** Construir una funcionalidad por los dos
extremos esconde lo que falta en medio: las dos mitades estaban probadas por separado y el único
gesto que las tocaba a la vez las rompía. **Sembrar por `curl` es justo lo que impide descubrirlo.**

**Cómo se verificó.** `pnpm verify` en verde en cada commit y **una sola tanda de navegador**, con
el filtro de fichero comprobado con `--list` antes de lanzarla. Mutado por los dos lados: quitar la
línea que transporta la entrega tumba las dos pruebas de componente **y** el recorrido de
navegador; quitar el campo del tipo no tumba ninguna de las dos y solo rompe `pnpm build` — el tipo
lo defiende el type-check, el comportamiento lo defienden las líneas que lo llevan.

**Dos cosas dichas aquí en vez de en una ficha nueva.** (1) El trozo de «elegir un objeto del
catálogo» existe ahora **en dos sitios**: `apps/web/src/features/inventory/SelectorDeObjeto.tsx` y el panel nuevo.
`SelectorDeObjeto` no se pudo reutilizar porque no es un selector —es un formulario de «añadir al
inventario»: exige `characterId`, muta al confirmar y no devuelve nada—, así que se reutilizó su
capa de datos y se escribió solo el elegir-y-devolver. Extraer un selector de verdad reutilizable
es mejor ingeniería y toca dos pantallas más; si algún día alguien abre los tres, que lo encuentre
escrito. (2) `pnpm db:slot` **está roto en esta máquina** (`Command "prisma" not found`); la base
del slot se creó y migró a mano con `prisma migrate deploy`.

**Cómo revertir.** Los tres commits son independientes. Revertir el primero devuelve el borrado;
revertir el segundo deja el formulario sin el campo pero **sin volver a borrar nada**, que es
mejor estado que el de partida.

---

## Tanda B — tres arreglos de API, y una ficha que se equivocaba de tamaño (2026-09-07)

**Qué.** Las tres fichas que la tanda corta dejó abiertas, en tres commits, cada una con su
mutación pieza a pieza:

- **P2-8** — `buildResponse` cierra el camino feliz de `changeHp` y hablaba con `this.prisma`
  aunque `equipoEquipado` y `viewerFor` ya sabían aceptar un cliente. Acepta el `tx?` y se lo
  reenvía; se lo pasan los **cuatro** llamadores que corren dentro de una transacción —uno más de
  los tres contados, y el que faltaba era el de `changeHpEnTransaccion`, que es el que la ficha
  nombra—. Su prueba se mide sobre un `changeHp` que **termina**: la de P2-0b no podía.
- **P2-1** — la red que exige que toda clave de condición que el motor lee esté en
  `esClaveReservada`, con la opción (c) de la ficha. Mira **las tres formas** —comparación
  literal, pertenencia a un conjunto y consulta a la base—, y cazarla solo por literales habría
  perdido los siete `Set` y con ellos la única lectura de `helped`.
- **P2-10** — la ficha se quedaba corta **en el tamaño**, y es la razón de escribir esta entrada
  aparte. Decía «dos pruebas lentas»; medido, son **veintitrés suites y 204 pruebas**, casi todas
  cayendo en el `beforeAll` que monta la aplicación y registra cuentas con `argon2`. **Arreglar
  las dos que nombraba habría dejado veintiuna suites igual de frágiles y la ficha tachada.** Se
  mide antes de arreglar, aunque la ficha diga que ya midió.

**Cómo se verificó.** `pnpm verify` en verde en cada commit. P2-10 no lleva paso 1 —no hay
comportamiento incorrecto que ver fallar— y se demuestra al revés: la misma contención que dejó 23
suites rojas las deja **todas verdes** después, sin bajar el paralelismo ni abaratar `argon2`, que
es una defensa. P2-1 se cazó por mutación cinco veces, incluida la más importante: la propia red
estrechada contra sí misma.

**Cómo revertir.** Los tres commits son independientes. Revertir el de P2-1 solo quita una red;
revertir el de P2-10 devuelve la fragilidad de diagnóstico, no un defecto de producto.

---

## Tanda corta — los seis arreglos que dejó abiertos el paso 2 (2026-09-07)

**Qué.** Seis fichas de [06-pendientes.md](./06-pendientes.md) cerradas en seis commits, cada una
con su prueba escrita **antes** del arreglo, corrida en rojo, y **verificada por mutación**:
revirtiendo el arreglo pieza a pieza y comprobando que la prueba enrojece **por la aserción que
tenía que enrojecer**, no solo que enrojece. Nueve mutaciones en total sobre las seis tareas.

| Ficha | Qué se arregló |
|---|---|
| **P2-0** | `ConditionsService.apply` recibía un `tx` y lo usaba solo para escribir: `requireVisibleCharacter` e `inmunidadesDe` iban por el pool. `viewerFor` / `requireVisibleCharacter(WithViewer)` (`common/character-viewer.ts`) y `StatblocksService.resolver` aceptan ahora el mismo cliente opcional |
| **P2-0b** | Lo mismo un piso más abajo: `construirODenegar` reenviaba el `tx` solo a `hojaOMotivo`. `equipoEquipado` y `viewerFor` no declaraban siquiera el parámetro; ahora lo declaran, y los tres llamadores que ya corrían dentro de una transacción le pasan el suyo |
| **P2-6** | `ActivitiesService.consumir` leía con `findUnique` y escribía con `update`: tres usos simultáneos de la Furia leían los mismos 3 y escribían los mismos 2. Ahora toma `SELECT … FOR UPDATE`, el mismo candado que `changeHp` ya usaba a un metro |
| **A11-usos-sin-tope** | `max: null` («Unlimited» en el SRD) no significaba nada: `RestService` no reponía esas filas y `consumir` las gastaba de un contador finito. Las dos miran ahora `max === null` **antes** que `current`. El marcador se queda —`ResourcesService.adjust` sigue moviendo `current` a mano— y su nota lo dice en vez de afirmar que nadie lee el `null` |
| **P2-7** | Los dos guardianes que no sujetaba nadie: que un `entrega` malformado no rompa la tirada (era `entregaSchema.safeParse`, verificado solo por ejecución), y que `record()` **rechace** una clave que su esquema no conoce en vez de descartarla en silencio, que es lo que hace `.parse()` de Zod |
| **P2-3** | «Dar…» abría el cajón sin destinatarios para quien maneja un PNJ: el selector se construía solo con `fetchCharacters`, que filtra `statblockRef: null` a propósito. Ahora suma la lista de PNJ (`GET /npcs`, filtrada por `canView` en el servidor), con **el mismo filtro para las dos** |

**Cómo se verificó.** `pnpm verify` en verde en cada commit (lo exige el gancho). Además: **toda la suite de e2e de API** entera para el guardián estricto de `record()` —era el cambio que podía
romper a cualquier llamador, y no rompió a ninguno— y **una sola tanda de Playwright**, la de
P2-3, con la API precompilada antes de lanzarla.

**Lo que NO entró, y está anotado en vez de arreglado.** Cuatro fichas nuevas en
[06-pendientes.md](./06-pendientes.md): **P2-8** (`buildResponse` sigue leyendo por el pool dentro
de la transacción de `changeHp` — el mismo defecto que P2-0b, un tramo más abajo), **P2-9** (**no
existe ninguna puerta para ceder un PNJ a un jugador**, así que el caso que P2-3 nombra no se puede
montar usando el producto y su recorrido de navegador mide la otra mitad del mismo carril) y
**P2-10** (dos pruebas que se pasan del tiempo por defecto solo cuando la suite entera corre junta,
y cuyo rojo parece un defecto del cambio recién hecho). La cuarta es la medición que faltaba en el
cuerpo de **P2-0**: tres de las seis consultas de `apply` siguen yendo por el pool porque
`MembershipService` no acepta un cliente.

**Cómo revertir.** Los seis commits son independientes entre sí salvo P2-0b, que se apoya en el
`tx?` que P2-0 añadió a `character-viewer.ts`. Revertir uno solo no deja el árbol roto; revertir
P2-0 sin revertir P2-0b, sí.

---

## Paso 2 — la actividad, sus cinco formas y la economía de la mesa (2026-09-06/07)

**Qué.** Las once tareas del plan [`2026-09-06-paso-2-actividad.md`](./superpowers/plans/2026-09-06-paso-2-actividad.md),
en nueve commits de tarea —dos de ellos juntan dos tareas cada uno (9+10 y 3+11)— más dos commits
de corrección de sus e2e: la economía de acciones del combate (`Combatant.actionUsed/bonusUsed/reactionUsed/movementUsed`,
repuesta al empezar el turno de quien entra); `Origen`, un número que nunca miente sobre su
procedencia; las cinco actividades del SRD (`ataque`, `salvacion`, `dados`, `utilidad`, `prueba`)
con su propio `dados`; usarla gastando por las puertas que ya existían (`changeHp`,
`RollRequestsService.create`, `ConditionsService.apply`, con el patrón `tx?` extendido a los
tres — con un hueco real que quedó abierto en uno de ellos, ver
[06-pendientes.md](./06-pendientes.md)); una subclase por personaje y no todas a la vez; conceder
una actividad desde el catálogo con sus usos y sus escalas; y la Furia de punta a punta, con la
economía visible en la mesa.

**Por qué.** Un mago sigue sin hechizos hasta el paso 3, y este paso existía para que quepan: la
tarea 0 mapeó diez conjuros a mano contra el borrador del plan y ocho no cabían, así que el esquema
se corrigió antes de escribir código (D-P2-1 a D-P2-6 en [decisiones.md](./decisiones.md)).

**Cómo se comprobó.** Trece de trece tareas de la tanda con implementador —contando también el
plan botín, más abajo, y sin contar la tarea 0, que fue papel sin implementador— mordieron algo
real en su primera revisión con contexto limpio; ninguno de los hallazgos lo vio quien implementó. Los tres más graves de este plan: una fuga por 403 en `gastar` sobre un PNJ
escondido; `raging` interpretada por el servidor sin estar en la lista de claves reservadas —un
jugador se llevaba +2 de daño permanente gratis—, reincidencia exacta del agujero que se cerró para
`helped`; y un interbloqueo real en el orden de los candados de `changeHp`. Detalle completo, tarea
a tarea, en el bloque «Avance» del plan y en `.superpowers/sdd/2026-09-06-tanda-paso2-y-botin/progress.md`
(local, no viaja con el clon).

**Cómo revertir.** Once commits independientes de `2bd7769` a `2228341`/`8d4de37`
(`git log --oneline 7e7f92b..HEAD`); revertir uno deshace su tarea. Dos llevan migración:
`combatant_action_economy` (las cuatro columnas de `Combatant`) y `character_subclass`
(`Character.subclassKey`) — revertir el código deja las columnas sin escritor, sin dato que
perder. **`character_subclass` tiene efecto sobre datos ya en producción**: un personaje de nivel
≥ `chosenAtLevel` pierde los rasgos de su camino hasta que alguien elija uno, que es el arreglo y no
una regresión — ver [05-datos.md](./05-datos.md). Nueve fichas de deuda quedaron abiertas en
[06-pendientes.md](./06-pendientes.md), la más urgente antes del paso 3 siendo la autorización de
`changeHp` y de `RollRequestsService.create` sobre actividades de otro personaje.

## Botín y reparto — una tabla entrega, y decir quién dio (2026-09-06)

**Qué.** Cinco tareas del plan [`2026-09-06-botin-y-reparto-plan.md`](./superpowers/plans/2026-09-06-botin-y-reparto-plan.md),
en tres commits: una fila de `DmTable` puede llevar `entrega` (objetos por `ContentRef` y las cinco
monedas), y tirarla devuelve esos objetos ya resueltos por nombre; dar un objeto o dinero dice
**quién** lo dio, con un campo opcional `de` sobre los sucesos que ya existían; y «Dar…» se hace
desde la mesa y desde el resultado de una tirada, sin abrir la ficha de quien recibe.

**Por qué.** La premisa del plan —«hoy un objeto aparece en una bolsa y nadie sabe de dónde
salió»— era falsa: el rastro (`ITEM_ADDED`, `MONEY_CHANGED`) ya existía, y no hacía falta un tipo
de suceso nuevo (D-P2-7). Y lo que la mesa decide, la mesa decide: no hay «dar a todos», ni
repartir oro a partes iguales, ni comercio — las dos primeras las cubre una prueba de ausencia;
el comercio no se construyó, así que no hay pantalla de la que medir su ausencia.

**Cómo se comprobó.** Un `catch` que tragaba cualquier fallo de Postgres y lo presentaba como «ese
objeto ya no existe» dentro de la transacción del disparo automático, borrando la pista del error
real. Nueve mutaciones de aflojamiento sobre el campo `entrega`, las nueve en verde antes del
arreglo. Y una clave de catálogo inventada (`shortsword`, que no existe — es `short-sword`) citada
tres veces por un encargo del orquestador y corregida las tres contra el catálogo real.

**Cómo revertir.** Tres commits (`eaa333e`, `cbbfebf`, `c36a099`), independientes entre sí y del
paso 2. `eaa333e` lleva la migración `dm_table_entry_loot` (columna `entrega Json?`); revertir el
código deja la columna sin escritores, sin fila sembrada fuera de las pruebas que la use. Dos
fichas quedaron abiertas: el formulario de crear tablas no tiene campo para redactar `entrega`, y
un jugador con un PNJ cedido ve la lista de destinatarios vacía al abrir «Dar…».

---

## Poda del tablero, y una página que dice por dónde entrar (2026-09-06)

**Qué:** las **tres fichas que llevaban «Cerrado» en su propio título** salen de
[06-pendientes.md](./06-pendientes.md) a
[`_archivo/pendientes-cerrados-2026-09-06-poda.md`](./_archivo/pendientes-cerrados-2026-09-06-poda.md),
**enteras y sin tocar una coma**. Y se añade [como-seguir.md](./como-seguir.md), que dice qué
andamiaje ya está puesto —para que nadie lo vuelva a montar—, qué sigue y en qué orden, y qué no
decide un agente.

**Por qué solo tres:** la regla del tablero es mecánica —lo cerrado sale, lo abierto se queda— y
solo tres cumplían el criterio de forma comprobable. Quedan dos docenas de secciones fechadas
antes del 2026-09-04 y varias **sin fecha en el título**, pero saber cuál sigue viva **no se
deduce del código**: es del autor, y forzarlo habría sido enterrar deuda en vez de podarla. El
criterio y las candidatas están en el punto 1 de `como-seguir.md`.

**Dos de las tres archivadas explican un error de medición** —una ficha afirmaba que nadie podía
curar a nadie, y el grep que lo hizo creer— y por eso se archivan en vez de borrarse: ese registro
es lo que evita volver a creérsela.

**Cómo revertir:** devolver las tres secciones del fichero de archivo a `06-pendientes.md` y
borrar `docs/como-seguir.md` con sus dos punteros.


## `CLAUDE.md` deja de narrar el estado (2026-09-06)

**Qué:** el fichero que se manda leer primero pierde sus ~40 líneas de prosa de estado —qué trae
cada fase, qué imagen sirve producción, qué separa `main` del despliegue— y las sustituye por una
tabla que dice **dónde vive cada dato de verdad**: el bloque generado de
[00-INDEX.md](./00-INDEX.md) para estado y conteos, este fichero para lo entregado,
[06-pendientes.md](./06-pendientes.md) para lo abierto, y **una medición** —`git diff` contra la
imagen desplegada— para saber qué falta por desplegar. Se queda lo que sigue siendo cierto
mañana: qué es el producto, qué no es, y las reglas.

**Por qué:** ese fichero **caducó tres veces en cinco días**, y las tres se anotaron dentro de él.
Una de ellas lo dice con todas las letras: *«es el mismo fallo de siempre: prosa de estado escrita
a mano en el fichero que se manda leer primero»*. El repositorio ya tenía la solución a medias
—`update-estado.mjs` genera el bloque de `00-INDEX` y `check:estado` falla si alguien lo edita—
pero `CLAUDE.md` estaba fuera de su alcance, así que ahí el estado se seguía tecleando.

**Los tres avisos no se borran.** Se mueven **enteros y sin reescribir** a una sección al final,
como justificación de la regla: un registro fechado no se resume. Y `D-OP-3` —la partida de
prueba que cierra la fase 2— no se pierde: vive en [00-INDEX.md](./00-INDEX.md) y en
[decisiones.md](./decisiones.md), que son sus sitios.

**Cómo revertir:** `git show` del commit anterior a este sobre `CLAUDE.md`. No toca código.


## El cero de tipos comodín deja de depender de la costumbre (2026-09-06)

**Qué:** `no-explicit-any` pasa de **aviso heredado** a **error** en `apps/api/src`,
`apps/web/src` y `packages/shared/src`. Las pruebas siguen exentas, con el motivo que ya estaba
escrito.

**Por qué:** la medición del día contradijo a la sospecha. Se auditó el repositorio esperando
encontrar la regla apagada y deuda escondida, y lo que hay es **cero** comodines en código de
aplicación: la excepción de `eslint.config.mjs` estaba acotada a las pruebas desde el principio.
Lo que no había era nada que **sostuviera** ese cero — un aviso no frena un commit, y
`pnpm verify` pasa con avisos. Poner en error una regla que hoy da cero cuesta cero y convierte
una costumbre en una propiedad comprobada.

**Verificado por mutación:** se añadió `(x: any) => x` en un fichero de la web, `eslint` lo
rechazó **como error** —no como aviso— y se restauró.

**Cómo revertir:** quitar el bloque de reglas nuevo de `eslint.config.mjs`. No toca ni una línea
de código de aplicación.


## El proceso pasa a medirse, y la frontera del encargo deja de ser solo de ficheros (2026-09-06)

**Qué:** cuatro cosas, todas documentación y ninguna toca comportamiento.

1. **Los cuatro pasos antes de abrir una ficha son regla del repositorio**, en
   [04-convenciones.md](./04-convenciones.md), con **la frontera** de cuatro casos en los que el
   paso 1 no aplica. Hasta hoy vivían solo en los prompts de arranque, fuera del repositorio.
2. **La frontera del encargo pasa a ser también de herramientas**: bloque de prohibiciones
   obligatorio, superficie mínima por rol, y la comprobación de que lo prohibido no ocurrió.
3. **Tabla de observabilidad de la tanda** en el ledger: vueltas por tarea, qué encontró la
   revisión, tiempo perdido y en qué.
4. **[10-banco-de-tareas.md](./10-banco-de-tareas.md)** y **[prompts.md](./prompts.md)**: tres
   tareas fijas que miden si un cambio del proceso mejora o empeora, y los prompts que hasta hoy
   vivían en la carpeta de al lado.

**Por qué:** este repositorio tiene la puerta más completa de los tres del PC —siete pasos en
`verify`, conteos generados, seis reglas de lint de documentación—, pero **el proceso que escribe
ese código se seguía ajustando por intuición**: cada regla nacía de un golpe real y ninguna se
contrastó nunca contra una tarea repetible. Y la frontera del encargo declaraba rutas pero no
herramientas, así que un implementador acotado a `apps/api` seguía pudiendo desplegar, empujar o
lanzar una segunda tanda de Playwright encima de la primera — que es justo lo que ya costó 82
fallos falsos.

**Las tres tareas del banco salen de fallos ya pagados aquí:** la prosa de estado caducada del
fichero que se lee primero, la prueba que hay que ver fallar antes de tocar `normalizar`, y
`jsdom` dando 871 pruebas verdes con la mesa rota.

**Cómo revertir:** quitar las tres secciones nuevas de `04-convenciones.md`, borrar
`docs/10-banco-de-tareas.md` y `docs/prompts.md`, y sus filas en `00-INDEX.md` y `CLAUDE.md`.


## Paso 1 · Las goteras — los números dejan de mentir (2026-09-06, en curso)

**Qué se entrega.** El plan [`2026-09-06-paso-1-goteras.md`](./superpowers/plans/2026-09-06-paso-1-goteras.md),
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
  [`_archivo/pendientes-cerrados-2026-09-06-paso-1.md`](./_archivo/pendientes-cerrados-2026-09-06-paso-1.md),
  que es lo que exige `check:docs`: lo tachado sale del documento vivo, no se queda tachado en él.
  La segunda además **se renombra a `P3b`**, porque había dos fichas distintas llamadas `P3`.

## Cada jugador pide su propia iniciativa, y el DM puede decir de qué bando está cada uno (2026-09-05/06, plan `iniciativa-y-bando`)

**Qué se entregó.** Las quince tareas del plan
[`2026-09-05-iniciativa-y-bando.md`](./superpowers/plans/2026-09-05-iniciativa-y-bando.md),
más una tarea fuera de plan (la X) y una añadida en marcha (la 9b). Detalle por tarea, commit y
revisión en el ledger
(`.superpowers/sdd/2026-09-05-iniciativa-y-bando/progress.md`); aquí el resumen:

- **La iniciativa deja de tirarla el servidor por todo el mundo.** Al empezar un combate, cada
  jugador recibe una petición de tirada (la misma tubería de `roll-requests` que ya sabe pedir,
  resolver contra la hoja, aplicar ventaja y gastar inspiración) y el DM solo tira la de los
  suyos. El encuentro nace `PREPARING` mientras faltan respuestas, y pasa a `ACTIVE` solo cuando
  la última llega — o si el DM fuerza el arranque sin esperar a los rezagados (`force-start`), o
  cancela y el encuentro **se borra entero**, sin dejar suceso: «no es historia, es un clic
  deshecho».
- **El bando ya se elige y se corrige desde pantalla.** El diálogo de empezar combate manda un
  bando por combatiente con una sugerencia rellenada (el grupo propio `ALLY`, los PNJ de la mesa
  `ENEMY`), y se corrige después desde la ficha del elenco y desde la del PNJ por igual, con un
  componente compartido. El vocabulario en español se escribe una sola vez, en
  `apps/web/src/dominio/combate.ts`.
- **Un ataque elige a quién apunta, y el servidor dice si acierta.** El cuadro de ataques (2B)
  llevaba semanas resolviendo contra la CA sin que ninguna pantalla lo llamara; ahora el jugador
  elige objetivo entre los combatientes del encuentro (nunca `useCharacters`, que nunca trae un
  PNJ) y ve el veredicto traducido, con el orden relativo al bando de quien ataca.
  Los PNJ se enseñan en la columna del elenco (tarea 9b), cruzando la lista contra los
  combatientes del encuentro sin duplicar consulta ni tocar el servidor.
- **Curar entra por la misma puerta que el daño.** El gesto rápido de la mesa (`PonerDano`)
  solo mandaba daño; ahora un mismo componente (`Gesto`) expone «Daño» y «Curo», los dos sobre
  `useChangeHp`, que ya trataba el delta positivo desde antes de esta tanda.
- **Un interbloqueo real de Postgres** (40P01), encontrado por la carrera de la tarea 3: tres
  transacciones cruzaban el orden de bloqueo al recolocar el orden de turnos. Se cierra con
  `orderBy: { id: "asc" }` y un `SELECT … FOR UPDATE` sobre la fila del encuentro, dentro de
  `recolocar` — la puerta única de «iniciativa + grupo → orden» — para que serialice también
  `setInitiative` y `start`.
- **`setInitiative` conserva de quién es el turno por identidad**, no por número, cuando se
  corrige el orden con el combate en marcha: sin esto, renumerar podía saltar un asalto y mover
  el reloj seis segundos sin que nadie hubiera pasado de turno.
- **Tres fichas cerradas o reescritas por medición, no por suposición**: el «500 intermitente»
  de `updateSheet` resultó ser una carrera de `supertest` (`app.listen(0)` por petición), no del
  servicio — 900 peticiones HTTP reales concurrentes, cero fallos; «nadie puede curar» era una
  búsqueda del nombre equivocado (`heal` en vez del delta positivo); y el bando sin pantalla,
  cerrado de verdad (ver `docs/06-pendientes.md`).
- **Un crítico de revisión real**: renombrar el botón de atacar rompió un e2e de otra pantalla
  (`inventario.spec.ts`) que nadie corrió porque a ese agente se le había prohibido Playwright.
  Se arregló y se barrió `apps/web/e2e/` entero antes de cerrar la tarea.

**Por qué.** Es el hueco que impedía jugar la partida de prueba con dos cuentas: hasta ayer, un
combate con jugadores de verdad los dejaba sin decir nada y sin saber de qué lado estaban.

**Decisiones tomadas sin el autor**, treinta y cuatro, en
[`docs/decisiones.md`](./decisiones.md) (`E-IB-1` a `E-IB-34`) — varias contra el propio plan:
la transacción que fusiona cerrar la petición y escribir la iniciativa, `end()` sin tocar porque
la salida es el `DELETE`, el vocabulario en `dominio/` y no en `features/encounters/`, y que T14
no construía una puerta nueva porque la mitad ya existía.

**Cómo revertirlo.** No hay un solo commit: son ~40 commits entre `2e3563a` y `8466c82` (ver
`git log --oneline 2e3563a~1..8466c82` contra `main`). Revertir de verdad exige deshacer también
la migración que añade `PREPARING`, `encounterId` y `cancelledAt` a `RollRequest` y el índice
recontado — no es un `git revert` limpio. Lo razonable, si hiciera falta deshacerlo, es un
`git revert` en bloque de todo el rango, de más reciente a más antiguo, y `prisma migrate` para
la reversión del esquema.

---

## La documentación alcanza a la noche del 2026-09-05

**Qué se entregó.** Cuatro unidades de documentación, en cuatro commits, para que el repositorio
deje de ir por detrás de lo que esa noche decidió y desplegó:

1. **Las decisiones de la ejecución** (`7423caf`). Los bloques «Avance» de los planes 05, 07, 08,
   09, 11, 12, 13, 14 y 15 se escribieron **después** de `docs/decisiones.md`, y varios deciden
   **contra su propio plan**: la inspiración no es `Character.inspired Boolean` sino un
   `CharacterResource` con `max: 1`; `ENTITY_ATTACKED` se retira del vocabulario y **se conserva en
   el esquema** —medido: 244 reglas guardadas, ninguna lo usa, pero quitarlo del Zod haría ilegible
   una regla vieja—; el aviso del comentario pasa por `canView`; **el orden de los dos filtros de la
   búsqueda es la seguridad**; el canal en vivo manda avisos y no datos; y `aria-disabled` va en
   botones pero no en campos de formulario. Van como sección propia `E-*`, una línea cada una, más
   la marca de qué `D-OP-*` e `I*` quedaron aplicadas y con qué commit.
2. **La prosa caducada de los dos ficheros que se mandan leer primero** (`c6c0ccb`). `CLAUDE.md` y
   `docs/00-INDEX.md` afirmaban que el reseño de la mesa **no** estaba desplegado y que «local va por
   delante de `dnd.supportive.pro`». **Las dos son falsas desde el 2026-09-05.**
3. **El índice de planes, que se contradecía** (`fc16abb`): daba el 10 y el 12 por sin empezar, y su
   regla 6 seguía prohibiendo tocar `docs/06-pendientes.md` después de que el autor levantara esa
   restricción.
4. **`Mine/pendientes-maestro-2026-09-04.md` pasa a ser resumen** y apunta a `docs/`. Era la <!-- docs-lint-ignore -->
   definición de terminado del plan 10. Vive fuera del repositorio, así que no lleva commit.

**La evidencia, que es el punto de esta entrada.** El estado de producción **se midió en el
servidor**, no se recordó: `docker ps` en `vps1new` sirve hoy
`5awvsn1dnkexhcjzg7kjwom6_api:6eb259008369192543f9323ca928ed252e10ca18`, o sea la etiqueta
**`6eb2590`** — un despliegue **más** de los que contaba el informe de la noche, que se quedó en
`cc64ed7`. Y `git diff --name-only 6eb2590..HEAD` no toca `apps/` ni `packages/`: **lo único que
separa `main` de producción es documentación.**

**Por qué importa.** Es el mismo defecto de siempre, y por tercera vez en el mismo fichero: prosa de
estado escrita a mano en el documento que todo el mundo lee primero. El bloque generado por
`pnpm update:estado` no puede mentir porque lo comprueba `check:estado`; el párrafo de encima, sí.

**Cómo revertirlo.** `git revert` de los cuatro commits, en orden inverso. No tocan código: no hay
migración, ni contrato, ni pantalla. La cabecera de `pendientes-maestro-2026-09-04.md` se revierte a
mano —está fuera del repositorio— y su cuerpo no se tocó.

---

## El paseo de uso contra producción: un panel que se salía de la pantalla (2026-09-05)

**Recorrido visual con dos cuentas y dos anchos (1280 y 390) contra `dnd.supportive.pro`**, ya con
`cc64ed7` desplegado. Encontró **una cosa**, y era de las que el autor llama «que molestan»:

**A 390 px, el panel de la bandeja de avisos se salía por la izquierda.** Colgaba del botón con
`right-0`, y el botón **no está pegado al borde** —lo empujan el conmutador de tema y «Cuenta»—, así
que el borde izquierdo del panel caía **fuera de la pantalla**: se leía «…undren Piedrarroja». El
navegador no da ningún error por pintar fuera del lienzo y `jsdom` no maqueta, así que esto solo se
ve **mirando o midiendo**. Por debajo de `sm` el panel se ancla ahora **a la ventana** con su margen
a cada lado; a partir de ahí vuelve a colgar del botón, que es donde tiene sitio.

**Medido en el navegador** (`apps/web/e2e/bandeja-de-avisos.spec.ts`): a 390 px la caja del panel
empieza en x ≥ 0 y termina dentro de la ventana. **Mutación**: con la clase anterior, x = **−166**.

**Y dos arreglos del seed, encontrados usándolo desde otra sesión:**

- **Decía ser idempotente y solo lo era con la misma contraseña.** Con otra, el login daba 401, caía
  a registrar y el registro chocaba con un `409 Email already registered` que no explicaba nada.
  Ahora lo dice: *«la cuenta existe, pero la contraseña que le estoy dando no es la suya»*.
- **Una sola clave para las tres cuentas** impedía sembrar con una cuenta real como DM y las de
  demostración como jugadores. Cada cuenta puede traer su correo y su contraseña. Y **una cuenta que
  no sea de `@demo.invalid` no se crea nunca**: registrar el correo real de alguien con una
  contraseña que se inventa un script es crear la cuenta de otra persona.

**Lo que el paseo vio y sigue sin arreglar** (ficha en `06-pendientes.md`): **la mesa a 390 px**
reparte sus tres columnas a lo ancho y las «Herramientas del DM» quedan cortadas. No hay
desbordamiento de la página —el contenedor tiene su propio desplazamiento—, pero en un móvil la
mesa no se usa cómodamente. Es maquetación y pide su propia tanda.

## El nervio en vivo, medido en producción detrás de nginx y Traefik (2026-09-05)

**Qué se comprobó, y por qué hacía falta el servidor.** El plan 12 dejaba un punto sin cerrar: *«la
comprobación detrás de nginx y Traefik hecha en el servidor, no supuesta»*. **En local no hay
proxies**, así que el canal podía funcionar perfecto aquí y llegar a ráfagas allí — nginx acumula
por defecto, y ese es justo el fallo que `X-Accel-Buffering: no` existe para evitar.

Desplegado `b9d6cce` (a mano, como manda `03-despliegue.md`), medido contra
`https://dnd.supportive.pro` con una cuenta de la campaña de demostración:

| Qué | Resultado |
|---|---|
| Apertura del canal | `200`, `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Transfer-Encoding: chunked`, `Server: nginx/1.31.5` |
| Primer byte | `: abierto` **en el acto**, no al cerrar |
| Tres sucesos provocados con el flujo abierto | llegaron **en el mismo segundo** en que se enviaron (14:17:16, :21, :27) |
| Latido | `:` a los **15 segundos** de abrir |
| Sin billete | `401` |

**`X-Accel-Buffering` no aparece en la respuesta, y eso es lo correcto**: es una directiva **para**
nginx, que la consume en vez de reenviarla. Lo que demuestra que funciona no es la cabecera, es que
los sucesos lleguen sueltos — y llegaron.

**Y lo que viaja por el canal es un aviso, no un dato**: `{"type":"ABILITY_ROLL","campaignId":…,
"subjectType":"campaign","subjectId":…}`. Ni el resultado de la tirada ni su visibilidad: quien lo
recibe recarga por su ruta, donde `canView` sigue mandando.

**Lo que hay en producción y lo que no.** Producción corre **`b9d6cce`**: tiene el nervio, la
bandeja y los dos avisos. **No tiene** `31dd05c` (el seed) ni `cc64ed7` (el PNJ que se llamaba
«Alguien» y «Entrar en combate» sin PNJ que ofrecer), así que **esos dos defectos siguen ahí** hasta
el siguiente despliegue.

## Un PNJ podía pelear, pero la pantalla no sabía su nombre ni sabía meterlo (2026-09-05)

**Qué.** Dos defectos de la capa de combate, encontrados **paseando la aplicación** sobre la
campaña de demostración recién sembrada — no por una prueba:

1. **En el orden de turnos, un PNJ se llamaba «Alguien»**, y se lo llamaba también al DM que
   acababa de sacarlo del bestiario.
2. **El diálogo de «Entrar en combate» no ofrecía ningún PNJ**: solo los personajes de los
   jugadores. Se podía entrar en combate y **no había con quién combatir**; meter al capataz en la
   iniciativa solo se podía por la API.

**Por qué pasaba, y no era un descuido de dos líneas.** Un PNJ **es** una fila de `Character` —esa
decisión es la que hizo barata toda la fase 2D—, pero `GET /characters` **no los lista a
propósito**: esa lista es «quién se sienta a la mesa», y seis goblins mezclados con tres
aventureros convierten la pantalla de personajes en un listado de combate. La mesa leía solo esa
lista, así que para ella los PNJ no existían.

**El arreglo es pasarle la segunda lista**, la del bestiario, que el servidor ya filtra por
visibilidad. Con eso los dos defectos caen juntos, y **un PNJ que el jugador no puede ver sigue
siendo «Alguien» para él**, que es lo correcto: la lista que no le llega no puede nombrárselo.

**Y una molestia de maquetación, del mismo paseo**: el rótulo «Ver el registro como» de la banda de
la mesa se partía en **tres renglones** y empujaba el resto de la fila, a 1280 px y peor a 390. Se
acorta lo visible a «Ver como» y **el nombre accesible se queda entero**.

**Mutación probada**: deshecho el nombre del PNJ, se pone roja **una sola** prueba de las 1093.

**Cómo revertirlo.** `git revert` del commit; los PNJ vuelven a estar en el bestiario y fuera del
combate.

## Una campaña de demostración que se siembra sola (2026-09-05)

**Qué.** `scripts/seed-demo.mjs` deja la aplicación con una mesa dentro: tres cuentas —DM y dos
jugadores—, fichas del mundo con **los cinco niveles de visibilidad**, dos personajes con su color y
su hoja derivada, un objeto propio del DM equipado y sintonizado, dinero, un statblock propio con su
PNJ jugable, **una sesión cerrada con su crónica** y otra en curso con su encuentro e iniciativas,
una regla del motor y avisos de verdad. Encargo del autor.

**Habla por HTTP, no por Prisma**, y esa es la decisión que lo gobierna todo:

- **Se puede correr contra producción** desde cualquier sitio, sin credenciales de Postgres.
- **Prueba de verdad**: si una ruta se rompe, la siembra se para en esa línea y enseña el mensaje de
  la API. Un script de Prisma habría escrito filas perfectas sobre una API rota — y de hecho esta
  siembra encontró seis contratos que la documentación de mi cabeza tenía mal (`body.format`,
  `weapon.damageDice`, `actions[].desc`, el dinero por `PATCH`, la lista de statblocks que trae dos
  catálogos y `effects[].visibility`).
- **No puede inventarse un permiso.** Cada cosa la crea quien la crearía en la mesa: los personajes
  los crean **sus jugadores**, y el comentario que dispara el aviso lo escribe **la jugadora**,
  porque nadie se avisa de lo que acaba de hacer.

**Es idempotente**: cada paso mira primero si su cosa ya existe, por nombre. Y **el 429 se espera,
no se sortea**: las rutas de autenticación están limitadas a cinco por minuto para frenar la fuerza
bruta, así que el script duerme y reintenta en vez de pedir que se afloje el límite — cambiar una
protección por la comodidad de un script es justo lo que este proyecto no hace.

**Cómo revertirlo.** `node scripts/seed-demo.mjs --limpiar` borra las campañas sembradas; el script
se puede borrar sin tocar nada más.

## El nervio en vivo: avisos que llegan solos, y un sondeo que deja de ser el camino (2026-09-05, plan 12 · 12.3, D-OP-22)

**Qué.** Un canal SSE por campaña que manda **avisos, no datos**: «ha cambiado algo en esta mesa».
El navegador **recarga por el endpoint autorizado de siempre**, donde `canView` sigue mandando.

**Esa es la razón de diseño entera**: un canal tonto no filtra, y por lo tanto **no puede filtrar
mal**. Mandar el dato ahorraría una petición y metería la matriz de visibilidad en un segundo
sitio, que es el fallo que este proyecto ya declaró que no repite.

**Las decisiones, una a una:**

- **Billete de un solo uso y vida corta** (30 s). `EventSource` **no manda cabeceras**, y un token
  en la URL **acaba en los registros de los proxies**. El billete se pide por la ruta autenticada
  normal y se canjea al abrir. **Y al canjearlo se vuelve a comprobar quién puede escuchar**: entre
  pedirlo y usarlo caben treinta segundos, y en treinta segundos a alguien se le puede haber echado
  de la mesa.
- **La autorización vive en su propio método** (`assertCanJoin`), **fuera del controlador de SSE**,
  para que el WebSocket de la fase 3.C la reutilice tal cual en vez de escribir una segunda copia.
- **El mensaje del bus es agnóstico del transporte** —`{ type, campaignId, subjectType, subjectId }`
  y nada más—: ni `event:` ni `data:` asoman por la capa del bus. La fase 3.C trae fichas que se
  arrastran y llega **antes** que la 4; si el bus tuviera sabor a SSE, habría que rehacerlo.
- **La emisión ocurre SOLO en `GameEventsService.record`**, junto a la emisión interna y por lo
  tanto **después del commit**. Un segundo emisor sería un aviso que llega sin dejar rastro en el
  registro.
- **El latido, cada 15 s.** Un canal ocioso lo corta un proxy: sin `:\n\n` periódico, el navegador
  reconecta cada minuto **sin error visible**, solo reconexiones. Es una línea y ahorra una tarde.
- **`X-Accel-Buffering: no`**, porque nginx acumula por defecto: el canal funcionaría perfecto en
  local y llegaría a ráfagas en producción.
- **La limitación está escrita en el código, no arreglada**: el bus reparte **en memoria**, dentro
  de un proceso. Con varias réplicas, un aviso publicado en la A no llega a la B. Hoy hay **un solo
  contenedor**; el día que haya réplicas —o presencia— entra Redis detrás de esta misma interfaz.

**Y el sondeo deja de ser el camino principal, pero NO se quita.** Un canal que se cae en silencio
con el sondeo quitado es peor que no tener canal. Lo que sí cambió es que **había diez
`refetchInterval` con cuatro valores distintos** en siete módulos, y solo dos salían de una
constante: alargarlo eran once ediciones, y el que se olvidara **no daba error**, daba una pantalla
refrescándose sola. Ahora sale de `apps/web/src/lib/sondeo.ts`, a **60 s**, con **una sola excepción
declarada**: la petición de tirada del DM sigue en 15 s, porque es una pregunta que espera respuesta
en voz alta.

**Medido con dos navegadores** (`apps/web/e2e/nervio-en-vivo.spec.ts`): la jugadora comenta y la
campana del DM se enciende **sin recargar** en menos de 20 s, cuando el sondeo está en 60. **Y con
su control**: el mismo recorrido con el canal apagado no enciende nada en diez segundos, y
recargando sí. Sin ese control, la primera prueba no demostraría que mide el canal.

**Lo que queda sin comprobar, y se dice en voz alta:** `X-Accel-Buffering` **detrás de nginx y
Traefik de verdad**. En local no hay proxies, así que esto está probado contra Vite. La comprobación
en el servidor es lo único del plan 12 que no se puede cerrar sin desplegar.

**Cómo revertirlo.** `git revert` del commit. Con el canal fuera, el sondeo de 60 s sigue trayendo
todo, más despacio.

## La bandeja de avisos: el servidor llevaba desde 2A.14 hablando solo (2026-09-05, plan 12 · 12.2)

**Qué.** `apps/api/src/notifications/` existía **entero** —tabla, servicio y dos rutas— y **ningún
fichero de `apps/web/src` lo mencionaba**: nadie veía un aviso nunca. Es el patrón que este
proyecto ha cerrado en falso cuatro veces —servidor hecho, nadie que lo use—, y ahora tiene
pantalla: `apps/web/src/features/notifications/`, montada en el chrome junto al conmutador de tema.

**Con tres cosas y ninguna más**, que es lo que el plan pedía:

- **Cuántas sin leer, y si son cero no hay distintivo.** Un cero con globo es ruido y además miente
  sobre que haya algo que atender. El número va también en el nombre accesible del botón, porque un
  lector de pantalla no ve un círculo.
- **La lista, cada aviso con su enlace al sitio donde pasó.** Y si a un aviso le falta el sujeto, se
  pinta **sin enlace**: llevar a un 404 es peor que no llevar a ninguna parte.
- **Marcar leído y marcar todo leído.** Abrir un aviso **es** leerlo, y solo se marca si hacía
  falta: una petición por cada clic en algo ya leído es ruido contra el servidor.

**Lo que NO hace: borrar.** Un aviso leído se apaga; el historial se queda.

**Y dos decisiones que no se ven:**

- **La frase de cada aviso se escribe una vez** (`vocabulario.ts`), con un `Record` **exhaustivo**
  por tipo: un tipo nuevo en `@dnd/shared` sin frase aquí **no compila**, en vez de asomar su
  enumeración en la bandeja de alguien. Es la regla que ya falló tres veces en una mañana.
- **La bandeja se monta en dos sitios y es el mismo componente.** La mesa vive fuera de `AppShell`
  y no hereda la cabecera; dos bandejas serían dos contadores, y uno de los dos acabaría mintiendo.

**Medido en el navegador** con dos contextos (`apps/web/e2e/bandeja-de-avisos.spec.ts`), incluido lo
que `jsdom` no puede decir: que el distintivo **no tapa** «Cuenta» y que el panel **cabe en la
ventana**. Y con siete pruebas de pantalla en `features/notifications/__tests__/`.

**Y otro rojo ajeno arreglado por el camino**: `apps/web/e2e/invitacion.spec.ts` exigía
`aria-disabled` en un **campo de formulario**. Lo que U9 cambió fueron los **botones** —un botón
apagado tiene algo que explicar al pulsarlo; un `input` no—, y el barrido dejó ahí una aserción que
ya no describía la pantalla.

**Cómo revertirlo.** `git revert` del commit. Los avisos siguen escribiéndose en el servidor: lo
que desaparece es la puerta para verlos.

## Los dos avisos que nadie emitía, y un POST sin cuerpo que no debía ser un 400 (2026-09-05, plan 12 · 12.1)

**Qué.** `COMMENT_ADDED` y `SESSION_SCHEDULED` llevaban desde la tarea 2A.14 en el contrato de
`@dnd/shared` **sin un solo emisor**: dos tipos de aviso declarados que ningún usuario podía recibir
jamás. Ahora los emiten `CommentsService` y `SessionsService`, y los escucha
`NotificationsService` con el mismo patrón de `@OnEvent` que los otros dos.

**Lo que decide cada aviso, y no es cosmética:**

- **El aviso de un comentario pasa por `canView`.** Decirle a alguien «han comentado esta ficha» le
  confirma que la ficha existe, y esa confirmación es exactamente lo que esconde una visibilidad
  `DM_ONLY`. Va al DM y al autor de la ficha, **y solo si además pueden verla**.
- **El cuerpo del comentario no viaja en el aviso**, por el mismo motivo por el que no viaja en su
  suceso: el hilo tiene su propia puerta, con su propio `canView`, y una segunda copia del texto
  sería una segunda puerta con otras reglas.
- **Nadie se avisa de lo que acaba de hacer.** Un DM que comenta veinte fichas seguidas genera cero
  avisos para sí mismo, y hay una prueba que cuenta esas veinte.
- **Una sesión se anuncia cuando GANA fecha**, no cada vez que se guarda: sin fecha no hay nada que
  apuntar en el calendario, y volver a guardar la misma fecha no es una noticia.
- **El aviso se emite FUERA de la transacción del comentario.** Dentro se habría escrito aunque el
  comentario acabase deshecho, y el oyente lee la ficha por su cuenta: dentro leería filas que
  todavía nadie ha confirmado.

**Y un fallo que apareció por el camino, ajeno al plan.** La suite `notifications` de la API estaba
**roja en `main`** y nadie lo había visto: `POST /campaigns/:id/invites` respondía **400 «Falta el
cuerpo de la petición»** a una petición sin cuerpo, aunque su esquema tiene **todos los campos
opcionales**. Fastify entrega `undefined` cuando no hay cuerpo, y `z.object` lo rechaza. Pedir una
invitación sin opciones no es una petición mal formada: es la petición por defecto. `ZodValidationPipe`
prueba ahora `{}` **solo cuando el argumento es el cuerpo y el esquema no exige nada**; si sí exige
campos, el 400 sale igual que antes, con su frase y su detalle.

**Verificación por mutación.** Quitado el `canView` del aviso del comentario, se pone roja **una
sola** prueba —«NO llega a quien no puede ver la ficha, aunque sea el autor»— y las otras dieciséis
siguen verdes. Restaurado, 17 en verde.

**Cómo revertirlo.** `git revert` del commit. Los avisos ya escritos quedan en la bandeja, que es
donde deben quedarse.

## Los planes 03 y 15, ficha a ficha (2026-09-05) — archivadas

**Nueve entradas por tarea**, movidas enteras a
[`_archivo/historial-2026-09-05-por-tarea.md`](./_archivo/historial-2026-09-05-por-tarea.md) el
2026-09-05, cuando este fichero llegó a 997 de sus 1000 líneas. Lo que cerraron, en una línea cada
uno:

- **Plan 03 · el carril del motor** — el oráculo de la CA se cerró **por la puerta que importaba**
  (D-OP-11); el daño de una tirada se cobra **una vez, y lo impide la base** (D-OP-15); atacar a un
  ciego da ventaja (D-OP-13); «dónde se quedó» dejó de ser una promesa (D-OP-17); y los sucesos
  aprendieron a nombrar a quién ven (D-OP-12).
- **Plan 15 · el crítico y lo pequeño** — el crítico **dejó de declararse** desde el cuerpo de la
  petición (C2.5-2); quién ve una criatura **viaja con ella** (C6-2); la API dice si está sana
  mirando la base (D3); y las etiquetas se normalizan **al guardar** (E4).

## Los planes 05, 07 y 08, ficha a ficha (2026-09-05) — archivadas

**Seis entradas por tarea**, movidas enteras a
[`_archivo/historial-2026-09-05-por-tarea.md`](./_archivo/historial-2026-09-05-por-tarea.md) cuando
este fichero llegó a 1018 de sus 1000 líneas. Lo que cerraron:

- **Plan 07 · consolidación** — un concepto, un icono, con su prueba de barrido; el vocabulario del
  daño **una sola vez y con dos formas** deliberadas; y reclasificar una ficha **dice lo que cuesta**
  y deja rastro.
- **Plan 05 · el color de cada personaje** (D3) — el mismo color en el hilo y en el elenco, decidido
  por **una sola función**.
- **Plan 08 · inspiración y Ayudar** (I8) — la inspiración **no** es un booleano nuevo: es un
  `CharacterResource` con `max: 1`; y Ayudar es una condición que **caduca cuando el SRD dice**.

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

## Un personaje se archiva, y vuelve (2026-09-05, plan 06) — archivada

**Movida entera** a [`_archivo/historial-2026-09-05-ola-3.md`](./_archivo/historial-2026-09-05-ola-3.md)
el 2026-09-07, en el mismo corte que se llevó a la Ola 3 y a las otras tres: escribir la entrada de
la mesa a 390 px dejó este fichero en 1003 de sus 1000 líneas, y esta era la más antigua sin
archivar. En una línea: la ficha M9 —servidor hecho desde 2.5.8 y **ninguna** de sus tres llamadas
en la web—, el archivo y su puerta de salida en un commit, y las cinco cosas que encontró su
revisión, entre ellas que la hoja de un personaje archivado ofrecía borrarlo.

---

## Las tres columnas: el bando, dónde abre la escena y la crónica fuera del Json (2026-09-05) — archivada

**Movida entera** a [`_archivo/historial-2026-09-05-ola-3.md`](./_archivo/historial-2026-09-05-ola-3.md)
el 2026-09-07, en el mismo corte que se llevó la del hilo. En una línea: los tres carriles del
plan 03 —el bando de cada combatiente, dónde abre la escena una sesión, y la crónica sacada del
`Json` a su propia columna—, y la lección de que **los defectos aparecen al juntar carriles que
estaban verdes por separado**.

---

## El hilo se lee como una conversación: lo último abajo (2026-09-05) — archivada

**Movida entera** a [`_archivo/historial-2026-09-05-ola-3.md`](./_archivo/historial-2026-09-05-ola-3.md)
el 2026-09-07, al insertar la entrada de la tanda B: el fichero quedó en 1032 de 1000 y esta era la
más antigua que seguía completa. En una línea: el registro de la sesión pasó a pintarse del más
antiguo al más reciente sobre una copia invertida, anclado al fondo **solo si el lector ya estaba
ahí**; y su revisión encontró que voltear el orden del DOM rompía un recorrido que daba por visto
el último nodo — **el orden del DOM es una interfaz compartida**.

---

## Las tres baratas: TipTap empaquetado, `build` en CI y la ficha de `lychee` (2026-09-05) — archivada

**Movida entera** a [`_archivo/historial-2026-09-05-ola-3.md`](./_archivo/historial-2026-09-05-ola-3.md)
el 2026-09-07, al insertar la entrada de la tanda corta de las seis fichas: el fichero quedó en
1011 de 1000 y esta era la más antigua que seguía completa. En una línea: los seis paquetes de
TipTap pasaron a `dependencies`, CI ejecuta `pnpm build` antes de `lint` —comprobado por mutación,
un `TS2322` lo tumba— y `lychee` se cerró por medición: no había ninguna mención viva.

---

## La Ola 3, las 21 decisiones y la auditoría de la cola larga (2026-09-05) — archivada

**Movida entera** a [`_archivo/historial-2026-09-05-ola-3.md`](./_archivo/historial-2026-09-05-ola-3.md)
el 2026-09-07: insertar las dos entradas del paso 2 y el botín dejó este fichero por encima de su
tope de 1000 líneas, y esta era la entrada más antigua. En una línea: tres commits de código (`ENTITY_LINKED` empezó a emitirse,
`concentrationSave` ganó pantalla y dos disparadores muertos se retiraron con su motivo escrito),
veintiuna decisiones cerradas y una auditoría de las 55 fichas de `06-pendientes.md` que encontró
siete caducadas por describir un hueco que ya estaba cerrado.
