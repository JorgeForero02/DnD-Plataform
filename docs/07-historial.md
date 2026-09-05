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
