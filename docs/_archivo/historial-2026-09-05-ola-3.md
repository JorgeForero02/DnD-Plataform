# Historial archivado — La Ola 3, las 21 decisiones y la auditoría de la cola larga (2026-09-05)

Movida entera y sin reescribir desde `docs/07-historial.md` el 2026-09-07: insertar las dos
entradas del paso 2 y el botín dejó ese fichero por encima de su tope de 1000 líneas, y esta era
la entrada más antigua en ese momento; su hito se resume en el stub que queda allí.

**Este fichero acumula el corte entero de esa noche y lo que vino después**: a las cuatro entradas
del 2026-09-07 se sumó, ese mismo día, «Un personaje se archiva, y vuelve», cuando `07-historial.md` volvió a rebasar su tope —dos veces esa noche: al cerrar la ficha P4 y al escribir la medición de la mesa a 390 px—. Ninguna se reescribió al moverla.

**Y una sexta el 2026-09-08**: «La suite e2e de API entera vuelve a poder correrse», cuando la
entrada de `start()` devolviendo por `get()` volvió a pasarse del tope. Tampoco se reescribió.

**Y una séptima el 2026-09-08**: «Los dos avisos que nadie emitía», al escribir la entrada de
`advanceTurn()` y `setInitiative()`. Tampoco se reescribió.

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

> **Movida aquí el 2026-09-07**, entera y sin reescribir, al insertar la entrada de la tanda
> corta de las seis fichas: el fichero quedó en 1011 de 1000 y esta era la entrada más antigua que
> seguía completa.

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

> **Movida aqui el 2026-09-07**, entera y sin reescribir, al insertar la entrada de la tanda B:
> el fichero quedo en 1032 de 1000 y esta era la mas antigua que seguia completa.

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

> **Movida aqui el 2026-09-07**, entera y sin reescribir, en el mismo corte que se llevo la del
> hilo: la entrada de la tanda B no cabia y esta era la siguiente mas antigua completa.

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
