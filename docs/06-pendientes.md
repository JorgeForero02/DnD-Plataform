# Pendientes

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


Deuda conocida y decisiones abiertas. Cada línea: qué, por qué importa, y la evidencia de
que existe. **Subir de nivel de verificación o pagar deuda es una tarea con su ficha, nunca
un efecto colateral de la siguiente funcionalidad.**

Última revisión: **2026-09-03** (cierre de la fase **2C**: dados, reloj, condiciones con duración,
petición de tirada y tablas del DM). Las secciones van de lo más reciente a lo más viejo dentro de cada bloque, y **la fecha de
esta línea se actualiza al añadir una sección** — se quedó en el 2026-09-02 con tres secciones del
día siguiente ya escritas debajo, y lo cazó una auditoría.

## Lo que deja abierto la fase 2C (2026-09-03)

Nada de esto rompe nada hoy. Cada línea dice qué falta, por qué no entró y qué evidencia hay.

| | Qué | Por qué importa, y qué cuesta |
|---|---|---|
| **C2C-3** | **El reloj no tiene mando en la pantalla.** `POST /campaigns/:id/clock/advance` existe y está probado de punta a punta, pero **ninguna pantalla lo llama**: hoy el DM solo puede avanzar el tiempo por API. Las condiciones con duración dependen de él, así que la mitad visible de 2C.4 **se queda sin el gesto que la enciende** | Es la pieza que más cerca está de dejar 2C a medias de cara a la mesa. Un control con los presets que el plan ya nombra —«una hora», «ocho horas», «un día»— y el ritmo de viaje con sus salvaciones de marcha forzada. Va en la pantalla de sesión o en la de dados, y es media tarde |
| **C2C-4** | **La marcha forzada devuelve las tiradas que hay que pedir y nadie las pide.** El servidor calcula `forcedMarchSaves` con su CD por hora; encadenarlas con la petición de tirada de 2C.5 es lo que las convierte en juego | Con 2C.5 dentro, es cablear una cosa a la otra: por cada salvación, una petición a cada personaje que viajó |
| **C2C-5** | **El disparo automático de una tabla no se ve en la pantalla de la tirada.** `RollResult` trae `houseTable` cuando un natural la dispara, y la pantalla de dados **no lo pinta**: el resultado queda solo en la línea de tiempo | Es una rama de pintado en `ResultadoDeTirada`. Sin ella, la regla de la casa ocurre y quien tiró no la ve |
| **C2C-6** | **Una tabla no se puede editar, solo crear y borrar** | Deliberado: el alcance pedía la primitiva. Editar una tabla de cien filas sin poder editarla es rehacerla |
| **C2C-7** | **`GET /campaigns/:id/rolls` no filtra por «solo las mías»** | El registro trae las de la mesa. Con una sesión larga, un jugador que quiera repasar las suyas tiene que buscarlas. El hook de la web ya acepta el filtro por personaje; falta ofrecerlo |
| **C2C-8** | **El vencimiento de una condición no entiende «hasta el próximo descanso largo»** | Y es a propósito: **eso no es una duración, es un suceso**, y modelarlo como un número sería mentir. Está declarado en `character-state.schema.ts` y en la tabla de duraciones de la pantalla. Cuando entre, entra como disparador, no como segundos |
| **C2C-9** | **El agotamiento solo llega al motor por dos de sus seis efectos.** Velocidad (niveles 2 y 5) y PG máximos (nivel 4). Los otros cuatro —desventaja en pruebas, en ataques y salvaciones, y la muerte del nivel 6— **no calculan nada** | La desventaja necesita que el motor sepa componer ventaja/desventaja automáticamente, que hoy elige quien tira. Es Encuentros o una decisión aparte; **anotarlo es lo que impide creer que el agotamiento ya está entero** |

## C2C-1 · El cuarto modo de tirada («Propia») **no cabe en el modelo**, y es decisión del autor (2026-09-03)

**Es un hallazgo de 2C.1, y contradice una premisa del alcance.** El alcance de 2C decía que
«nuestro modelo ya expresa tres de los cuatro [modos de Foundry] con la visibilidad que existe» y
que *«lo que falta para la ciega no es el modelo, es el endpoint»*. Lo segundo era cierto y ya
está arreglado. Lo primero se quedó corto, y se vio al ir a escribirlo.

**Lo que dice la fuente**, comprobado en la documentación de Foundry
([Basic Dice](https://foundryvtt.com/article/dice/)): un *self roll* es *«a private dice roll
which is only visible to the user who rolled it»*, y *«whether a GM or Player uses a self roll,
only the user who made the roll can choose to reveal it»*. O sea: **esconde el resultado también
del DM**.

**Por qué eso no cabe aquí.** `canView` (`apps/api/src/common/visibility.ts`) devuelve `true` al
DM **antes** de mirar el nivel de visibilidad, y eso no es un detalle de esta pantalla: es la
regla del proyecto. Así que «Propia» no es un nivel que falte en el enum, es una **excepción a
esa regla**. Y hay dos maneras de hacerla, las dos malas sin que el autor lo decida:

- **Tocar `canView`** afecta a todos los recursos del producto —fichas, sesiones, objetos,
  sucesos—, y convierte «el DM lo ve todo» en «el DM lo ve todo menos…». Es una decisión de
  producto con consecuencias en cada pantalla.
- **Filtrar solo las tiradas** sería reimplementar la matriz de visibilidad a mano en un
  servicio, que es exactamente lo que `CLAUDE.md` prohíbe: *«`canView` es el dueño único de quién
  ve qué»*.

**Lo que se hizo mientras tanto:** entran **tres** modos con el vocabulario de la industria
—Pública, Privada del DM, Ciega del DM— y el cuarto no se finge. Fingirlo era la peor opción:
una tirada que la pantalla llama «Propia» y que el DM lee en su registro es una promesa de
privacidad incumplida, que es peor que no ofrecerla.

**La pregunta para el autor, en una línea:** ¿quieres que un jugador pueda esconderte una tirada?
En una herramienta donde el DM arbitra, la respuesta por defecto razonable es «no», y entonces
esta ficha se cierra declarando tres modos. Si la respuesta es «sí», es un nivel de visibilidad
nuevo con su migración y su repaso de todas las pantallas.

## ~~P2~~ · Los topes de la tirada y de la anulación — **CERRADA el 2026-09-03 (2C.2)**

Los dos entraron con la pantalla de dados, que es donde estaban prometidos.

- **El término constante ya tiene tope**: `DICE_LIMITS.maxConstant` = 1000
  (`apps/api/src/dice/dice.ts`). `1d20+999999999` es ahora un 400 con su motivo, en vez de una
  cifra sin sentido escrita en el registro de la partida. **Mil sale de «qué cifra ya no puede ser
  un error de tecleo»**, no del rango de la 5.ª edición: el modificador más alto de una hoja
  legítima no llega a 30.
- **La anulación del DM tiene un rango por clave**, no uno solo para las cinco
  (`RANGO_DE_ANULACION`, `packages/shared/src/character-sheet.schema.ts`): CA 0–50, PG máximos
  1–2000, iniciativa −20–50, velocidad 0–1000 pies, Percepción pasiva 0–50. Una CA de −999 se
  rechaza; una CA de 30 por una regla de la casa **sigue entrando**, que era el riesgo que la
  ficha avisaba — apretar el tope al rango del manual habría inutilizado la válvula de escape.
  Los negativos se admiten **solo donde significan algo**: un modificador de iniciativa puede ser
  negativo; unos PG máximos o una velocidad, no.

**Dónde vive la comprobación del rango, y por qué no está en el esquema:** el tope depende de QUÉ
se anula, y eso viaja en la URL (`PUT overrides/:target`), así que ningún esquema del cuerpo puede
expresarlo. La tabla vive en `@dnd/shared` —una sola vez— y el servicio la aplica, igual que aplica
«solo el DM». El esquema conserva un bordillo de ±2000 para cortar lo que no es un entero antes de
tocar la base.

## C2C-2 · Las «tiradas propias guardadas» del prototipo, fuera de 2C (2026-09-03)

El prototipo enseña, bajo la tarjeta de dados, una tira de macros del jugador: «Ataque con
estoque», «Salvación de Constitución con ventaja», «Sigilo». **No se construyó, y es una decisión,
no un olvido**: son persistencia propia —una tabla, sus permisos, su pantalla de edición— y el
alcance de 2C no las tiene. Hoy la ausencia solo está escrita en el comentario de cabecera de
`apps/web/src/features/rolls/PanelDeDados.tsx`; esta ficha existe para que se pueda encontrar sin
leer el código.

**Lo que sí las hace baratas cuando toquen:** el contrato de una tirada ya es un objeto pequeño y
cerrado (`createRollSchema`), así que una macro es ese objeto con un nombre.

## P2 · Los topes de la tirada y de la anulación, medidos (2026-09-02)

Es la ficha **Q7** del plan de la ronda de interfaz, con la evidencia que le faltaba.

**El término constante de una expresión de dados no tiene tope.** `DICE_LIMITS`
(`apps/api/src/dice/dice.ts`) declara tres límites —100 dados por término, 1000 caras, 10
términos— y **ninguno cubre las constantes**: la rama de `evaluarTermino` que reconoce un número
hace `Number(...)` y lo devuelve sin comprobar nada. Lo único que lo acota de rebote es el
`max(120)` de `expression` en `createRollSchema`. Así que `1d20+999999999` se acepta, se guarda y
se escribe en el registro de la partida. No tumba nada —el evaluador ya está protegido contra
`9999d9999`, que era el riesgo real— pero deja pasar una cifra sin sentido a un registro que se
lee después.

**La anulación del DM admite de −999 a 999** (`setOverrideSchema`, `packages/shared`). Para una
Clase de Armadura, cuyo rango real de juego va de 5 a 30 largos, tres cifras es mucho margen. Aquí
hay que tener cuidado con el remedio: **la anulación es la válvula de escape del catálogo**, y
apretarla demasiado la inutiliza para lo que existe — un objeto mágico raro, una regla de la casa,
un PNJ que el DM decide y punto. El tope no puede salir del rango de la 5.ª edición, tiene que
salir de «qué cifra ya no puede ser un error de tecleo».

**Por qué no se arregló en la ronda:** las dos son cambios de contrato en `packages/shared` y en
el evaluador, y el valor del tope es una decisión de producto, no una constante obvia. Entrarían
con la fase 2C, que es la que se ocupa de las tiradas.

## P1 · La fidelidad visual con el prototipo, pendiente y pedida (2026-09-03)

**Lo que dijo el autor tras ver la ronda desplegada**, y conviene citarlo entero porque marca el
listón: *«me gusta más; igual me gustaría que en estilo visual sea mucho más similar al
prototipo, porque evidentemente hay demasiadas diferencias visuales que de verdad me interesa que
parezca demasiado al prototipo. Pero eso lo dejaremos para después.»*

O sea: **la estructura ya es la del prototipo y el estilo todavía no.** La ronda del 2026-09-03
cerró la forma —tarjetas, dos columnas, carril, densidad, una línea por habilidad— y el autor lo
da por bueno. Lo que queda es el acabado, y **no está medido todavía**: nadie ha puesto las dos
capturas una al lado de otra pixel a pixel para enumerar en qué se diferencian los tonos, los
grosores de filete, los tamaños exactos, los espaciados y los pesos tipográficos.

**Antes de abrir esta ronda hay que hacer ese inventario**, y hay herramienta para ello: el
guion `apps/web/e2e/capturas-comparacion.spec.ts` fotografía nuestras pantallas en tema oscuro
con contenido de ejemplo, y el prototipo está vivo en `https://sunny-glaze-58905833.figma.site`
y se recorre con el Chromium de Playwright que ya está instalado. **Sin ese inventario, la ronda
sería una sucesión de retoques a ojo**, que es exactamente lo que produjo la primera tanda —la
que «adaptó» en vez de plasmar— y hubo que rehacer.

**Cuatro diferencias ya conocidas** están justo debajo, en la ficha de la ronda anterior. Y hay
**siete que son deliberadas y no se cierran**: están en
[la revisión de lo que volvió](./superpowers/specs/2026-09-02-figma-make-revision.md), y seis de
las siete existen porque copiarlas literalmente haría que la aplicación mienta o incumpla una
regla nuestra — el conmutador DM/Jugador que cambia lo que se pinta en vez de lo que se envía, el
aviso de DM que es falso tres veces, el botón que se le ofrece a un jugador y el servidor
rechaza, la tarjeta inventada sin dato detrás.

## Dejado al plasmar el prototipo (2026-09-03)

- **P3 · La tira de cifras sigue en su propia banda, no junto al nombre.** En el prototipo CA,
  Iniciativa, Velocidad, PG y Competencia van a la derecha del nombre, en la misma línea. Aquí
  quedan justo debajo: subirla del todo exige pasarla por el `actions` de `PageHeader` en
  `apps/web/src/pages/CharacterDetailPage.tsx`, y con un margen negativo mayor se solaparía con
  un nombre largo.
- **P3 · Falta un token de filete tenue.** El prototipo usa una línea más suave que `--muted`
  para separar dentro de una tarjeta; aquí se usa `--muted` entero, que cumple el 3:1 y pinta
  más marcado que la maqueta.
- **P3 · Las salvaciones no llevan punto de competencia.** El prototipo marca con un glifo `●`
  cuáles son competentes. Aquí los glifos como icono están prohibidos, y además **el motor no
  expone hoy ese dato por salvación**: primero habría que derivarlo.
- **P2 · El nombre del tema no tiene tercer estado.** El prototipo ofrece Oscuro / Lectura /
  Sistema; el interruptor alterna dos. Añadir «Sistema» exige tocar `ui/theme.ts`, que guarda la
  elección, y hay una copia de su clave escrita a mano en `apps/web/index.html`.

## Dejado por la adopción de la maqueta (2026-09-03)

Lo que las cuatro tandas propusieron y no se hizo, con su motivo. Nada de esto es un fallo: son
datos que la pantalla querría y el servidor todavía no da.

- **P2 · La hoja pide cuatro datos que el motor no deriva.** «Perspicacia 11 · Investigación 12»
  necesita `passiveInsight` y `passiveInvestigation` —una línea cada una junto a
  `passivePerception` en `engine.ts`—; «Competencias e idiomas» necesita que el DTO de la hoja
  exponga las `weaponProficiencies` que **ya están en el catálogo**; e «Inspiración» necesita
  sembrarse como recurso 0/1. Se pintaron los huecos y **no se calculó nada en el navegador**,
  que es la regla: una regla del juego en el cliente es el error que `VelocidadYSentidos.tsx`
  documenta haber tenido que deshacer.
- **P3 · Rasgo · Ideal · Vínculo · Defecto.** La maqueta los pinta como cuatro campos; el modelo
  tiene una `bio`. Se pinta la bio en vez de trocearla a ojo.
- **P2 · La pestaña «Personajes» debería ser «La mesa entera».** El componente ya existe hecho
  —`FichaDeElenco`, dentro de `MesaDeSesion.tsx`— y bastaría extraerlo a `features/characters/`
  para que la pestaña lo consuma sin duplicar nada.
- **P3 · La vista de jugador en el móvil no se hizo.** Cruza `character-sheet`, `rolls` y
  `sessions`, y con tres agentes trabajando ahí a la vez no se tocó a medias.
- **P2 · El desgarro de `ui/Panel.tsx` se deforma con la altura.** Recorta en **porcentajes de
  caja**, así que el mordisco es invisible en una ficha larga y gigante en un cuerpo de tres
  líneas. La silueta buena —cúbicas irregulares, dibujada como máscara y no como recorte del
  contenedor— existió en un `Vitela.tsx` de la hoja de personaje y **se borró el 2026-09-03** al pasar la
  hoja a cromado; si se rehace, está en el historial de ese fichero. La vitela sigue viva donde
  toca: la historia del personaje y las fichas del mundo.
- **P3 · El tema no tiene tercer estado «Sistema».** Hoy el interruptor alterna dos. Añadirlo
  exige tocar `ui/theme.ts`, y hay una copia sincronizada a mano de su clave en `index.html`.
- **P3 · `Markdown.tsx` no separa sus párrafos.** Su `space-y-2` cae sobre el `Panel`, cuyo único
  hijo es el relleno del borde, así que nunca llega a los `<p>`. Está tapado desde la página de
  lectura; la causa sigue ahí.
- **P3 · «Eventos» o «Sucesos».** La maqueta dice «Sucesos» y `plantillas.ts` dice «suceso» en
  singular, pero `ROTULO_PLURAL`, `ETIQUETA_DE_TIPO` y `TITULO_NUEVO` dicen «Eventos». Si se
  cambia, se cambian los tres a la vez.

## P2 · Los tokens de Tailwind siguen sin admitir opacidad (2026-09-03)

**El daño está reparado; la causa sigue ahí.** Los colores se declaran en `tailwind.config.js`
como `var(--muted)`, sin `<alpha-value>`, así que Tailwind **no puede** emitir una variante con
opacidad: descarta la utilidad entera y no avisa. Llegó a haber **49 sitios** apoyados en eso, y
ninguno pintaba — entre ellos el fondo de la cabecera, el velo de los diálogos, el relleno del
distintivo «Solo DM» y el subrayado que distingue lo editable de lo derivado.

Los 49 están arreglados con clases enteras y con **tokens de color completo por tema**
(`--accent-tint`, `--danger-tint`, `--copper-tint`, `--warning-tint`, `--muted-tint`, `--veil`),
que sí compilan porque un `bg-[color:var(--x)]` es un valor arbitrario. Y hay **dos redes** para
que no vuelva en silencio: `src/ui/__tests__/clases-de-opacidad.test.ts` barre el código fuente,
y `e2e/clases-que-si-pintan.spec.ts` comprueba en el navegador que la utilidad llega al CSS y
pinta.

**Lo que queda abierto** es poder volver a usar `/NN`, que es más cómodo que inventar un token
por cada tinte. Exige declarar los tokens por canales —`--copper: 201 125 70`— y enseñar a
`tailwind.config.js` `rgb(var(--copper) / <alpha-value>)`. **Rompe** los `var(--copper)` directos
de los SVG de `ui/Ornament.tsx`, que esperan un color y recibirían tres números, y obliga a
**volver a medir el contraste de todas las pantallas**. Baja a P2 porque ya no hay nada roto:
es comodidad, no corrección.

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
- **`BarraDeSesion` y la cabecera de la aplicación se pelean por la misma banda.** Las dos son
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
- **`ui/Iconos.tsx` no tiene icono de inventario.** La hoja dibuja un `IconoArcon` local; cuando
  2B monte el inventario debería subir a la casa común.

## Dejado por E0, la prueba de ida y vuelta de TipTap (2026-09-02)

- **Las dependencias de TipTap están en `devDependencies`.** Hoy su único consumidor es
  `scripts/e0-tiptap-roundtrip.mjs`, que no se empaqueta. **E1 tiene que moverlas a
  `dependencies` en cuanto las importe desde `src/`**, o la imagen de producción se
  construirá sin ellas y el editor no existirá allí. Es un fallo que no se ve en local,
  porque en local están instaladas igual.
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
| ~~**H6**~~ | ~~**¿Con qué autoridad escribe una regla?**~~ **CERRADO el 2026-09-02** — es un diputado confundido, y su fallo en siete puntos está en [autoridad de las reglas](./superpowers/specs/2026-09-02-autoridad-de-las-reglas-design.md). Lo esencial: el objetivo se fija **al armar**, no al disparar, y los objetivos dinámicos por etiqueta **salen de la v1**. Lo de abajo se conserva porque explica el riesgo: Un jugador abre una ficha, eso dispara una regla, y la regla revela algo **que ese jugador no podría haber revelado** | Propuesta: se aplica con la autoridad **del DM que armó la regla**, y la traza lo dice. **Necesita su propia revisión de seguridad antes de 2A.16** — es el único hueco de esta lista que puede convertirse en una fuga |
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
| ~~**S1**~~ | ~~**La atribución CC BY no se ve todavía en la aplicación**~~ **CERRADA el 2026-09-02**: hay pie en toda pantalla con sesión (`apps/web/src/ui/LegalNotice.tsx`, montado en `AppShell`) y pantalla `/acerca-de` con el texto completo, **sin exigir sesión** — una atribución detrás del acceso no está en la obra distribuida. | Se cerró **antes** de que 2A.10 pintara una hoja, que era la condición de disparo. Ocho pruebas RTL la sostienen, y la que importa es la de la **nota de modificación**: traducir al español ES una modificación y omitirla incumple igual que omitir el autor — comprobado quitándola, la prueba se pone roja |
| **S2** | **De cada aptitud de clase se transcribió el nombre y el nivel, no su texto de reglas** | El plan (§4.3) pedía «aptitudes por nivel como texto». La hoja puede decir «al nivel 5 ganas Ataque adicional» —desde el arreglo de la revisión, que metió las aptitudes de clase y subclase en `features`; antes esta ficha **afirmaba que ya lo hacía y era falso**—, pero no puede explicar qué hace cada una. Traducir a mano el texto completo de unas doscientas aptitudes es donde una transcripción se llena de errores que **ningún invariante puede cazar**. Añadirlo después es rellenar un campo, no cambiar una forma |
| **S3** | **El catálogo vive en `apps/api/src/rules/catalog/`, no en un paquete `packages/srd`** | El plan (§4.1) dejaba las dos abiertas. Hoy **solo lo consume el propio borde de la API, dentro de `apps/api`**, y crear un paquete costaría cableado de compilación por cero beneficio. (La justificación anterior decía «un solo consumidor, el motor» y era **al revés**: la dirección real es `catalog → engine`. Corregido tras la revisión.) La web ya los pide por endpoint (`GET /catalog`, `apps/api/src/rules/catalog.controller.ts`, creado el 2026-09-02 al ver que la pantalla los tenía transcritos a mano). La deuda de fondo sigue: el catálogo continúa dentro de `apps/api`. Si aun así conviene el paquete, es un `git mv` |
| **S4** | **Los rasgos raciales sin efecto numérico se listan, pero no hacen nada** (Suertudo, Astucia gnoma, Aguante implacable…) | Salen por `features` para que la hoja los enseñe. Automatizarlos es 2C, igual que las condiciones. Está dicho aquí para que nadie los lea en la hoja y suponga que el motor los aplica |
| ~~**S5**~~ | **CERRADO en 2A.10**, a medias declaradas. La tabla existe: `apps/web/src/features/character-sheet/vocabulario.ts`, y una `labelKey` sin traducir se pinta como «Sin traducir: <clave>», visible y no silenciosa. **Lo que sigue sin existir es la prueba que falle cuando el catálogo estrene una `labelKey` nueva**: hoy la lista de la prueba se escribe a mano, así que comprueba lo que alguien recordó, no lo que el catálogo emite | Abierto (la prueba) |
| **S6** | **La mejora de característica de los niveles de `asiLevels` no se modela todavía como elección** (2A.4) | Es el mismo mecanismo que el «+1 a dos» del semielfo, y el plan (§3) las nombra juntas. No entra aún porque «+2 a una **o** +1 a dos» es una concesión con **dos modos**, y quien decide la forma de la subida de nivel es 2A.9. **Ojo: no son solo 4/8/12/16/19** — el guerrero tiene 4/6/8/12/14/16/19 y el pícaro 4/8/10/12/16/19, y están en `asiLevels`; quien implemente 2A.9 leyendo solo esta línea se dejaría tres niveles. Añadirlo es un `kind` nuevo en `Grant` |
| **S7** | **[revisión] Ningún filtro traduce `UnknownContentError`, `InvalidChoiceError` ni `InvalidEquipmentError` a un 400** | Los comentarios afirmaban «es un 400, no un 500» y **era mentira**: la API no registra `useGlobalFilters` y Nest devolvería 500. Los comentarios ya dicen «deberá traducirse»; el filtro con su e2e lo monta **2A.6**, que es quien crea el primer endpoint que puede producirlas. Hoy no hay camino que las provoque por HTTP |
| ~~**S8**~~ | **CERRADO en 2B, y por el camino que la ficha pedía: no se escribió el `else`.** El equipo llega al resolutor **ya resuelto** (`CharacterBuild.items: ResolvedItem[]`), no por referencia, así que no hay ninguna rama donde un identificador de otra campaña pueda colarse. Quien traduce un `ContentRef` de campaña a un objeto es la API, siempre con el `campaignId` en el `where` (`campaign-items.service.ts`, `inventory/common/resolve-item.ts`) | `findRace`/`findClass`/`findArmor` reciben solo la referencia. Cuando 2B rellene la rama `CAMPAIGN`, la firma **no tiene por dónde comprobar que ese identificador pertenece a la campaña del personaje**: es un IDOR entre campañas esperando a que alguien implemente el `else`. Hoy esa rama lanza `UnknownContentError`, así que no hay agujero; el arreglo es meter el `campaignId` en la firma **antes** de escribir ese `else`, no después |
| ~~**S9**~~ | **CERRADO en 2A.12.** `GET .../sheet` devuelve `effectiveSpeeds`: la velocidad ya afectada por las condiciones, con la traza que nombra **todas** las causas. Y con una lección: la primera versión de la pantalla la recalculaba en el navegador copiando la función del servidor letra por letra, porque no había endpoint. Dos copias de una regla del juego se separan en cuanto se toca una | Cerrado |
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
| **I5** | **Equipar y desequipar no dejan rastro en la línea de tiempo** | El dinero sí (`MONEY_CHANGED`, tipo propio desde 2B). Ponerse un objeto que sube la CA en mitad de una sesión es exactamente el tipo de cambio que el DM querría ver en el log al repasar. Es un tipo de suceso nuevo y una llamada; barato, y no entró por alcance |
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
| ~~**M2B-1**~~ | **CERRADA el 2026-09-03**: `weaponAttack` y `weaponDamage` entran en la lista cerrada, `attacks.ts` los suma al bono **y al daño del arma que los lleva**, y el paso sale en la traza. La línea de derechos no se mueve: se abre la **forma**, y los objetos mágicos del SRD siguen sin copiarse. Lo que queda fuera es un objeto que suba **todos** los ataques (un anillo), que no está en el SRD | Cerrada |
| ~~**M2B-1 (texto original)**~~ | **Un arma mágica no se puede representar.** Ni `+1` al ataque ni al daño: la lista cerrada de efectos no los tiene, `buildAttacks` no lee `effects`, y `OVERRIDABLE_KEYS` tampoco incluye `attack.*` | **Es el que más rápido devuelve la mesa al papel**: el DM entrega la primera espada +1 y el cuadro de ataques miente en cada tirada. Son dos `kind` nuevos en `itemEffectSchema` (`weaponAttack`, `weaponDamage`) y consumirlos en `attacks.ts`. Ojo con la línea de derechos: los objetos mágicos del SRD **no** se copian; lo que se abre es la forma para que el DM escriba los suyos |
| ~~**M2B-2**~~ | **CERRADA el 2026-09-03**: `ITEM_ADDED`, `ITEM_MOVED` e `ITEM_REMOVED`, escritos **en la misma transacción** que el cambio. Y soltar pasó a ser idempotente (`deleteMany`), que era el otro fallo de la misma línea: soltar dos veces con mala red daba un 500 sobre una operación que sí había funcionado | Cerrada |
| ~~**M2B-2 (texto original)**~~ | **Ninguna mutación de inventario deja rastro en la línea de tiempo** | El dinero sí (`MONEY_CHANGED`). Una semana después nadie puede responder «¿quién cogió la gema?». Tres tipos de suceso y un `events.record` dentro de cada transacción |
| ~~**M2B-3**~~ | **CERRADA el 2026-09-03**: los sucesos registrados dentro de una transacción se **encolan** y se emiten tras el *commit*, esperando cada emisión (`apps/api/src/common/after-commit.ts`). Si la transacción se deshace, el buzón se descarta y no se emite nada. Y la promesa del comentario ya es verdad: `emitAsync` **se espera**, así que el motor evalúa dentro de la petición. La garantía no depende de que nadie se olvide: la única puerta a una transacción es `PrismaService.transaction`, y un barrido del código prohíbe la llamada cruda (`apps/api/src/prisma/no-transaction-suelta.spec.ts`) | Cerrada |
| ~~**M2B-3 (texto original)**~~ | **El motor de reglas se dispara dentro de la transacción del llamante y escribe fuera de ella** | Sus efectos sobreviven a un cambio que se deshace, y lee el mundo anterior al suceso. Hoy la única puerta real es arrancar o cerrar sesión —las tiradas y el mundo registran sin `tx`—, pero **el comentario de `game-events.service.ts` afirma que la evaluación ocurre «dentro de la petición» y no es cierto**: `emit` no se espera. Se arregla encolando los sucesos y emitiéndolos tras el *commit* |
| **M2B-4** | **Quedan las cargas** (una varita de siete usos que se repone en el descanso) | La munición del SRD ya está sembrada (flechas, virotes, balas, agujas) y **gastar un consumible existe** (`POST .../inventory/:rowId/consume`, con su rastro en la línea de tiempo y la fila que desaparece al llegar a cero). Lo que falta son las **cargas**: columnas `chargesCurrent`/`chargesMax`/`rechargeOn` en `InventoryItem` y reponerlas dentro de la transacción del descanso. Es una migración, y por eso no entró de madrugada |
| ~~**M2B-4 (texto original)**~~ | **No hay munición, ni cargas, ni forma de gastar un consumible** | La propiedad `AMMUNITION` se pinta y no la consume nadie; `quantity` no puede bajar a 0 (la última poción se «bebe» borrando la fila); un descanso no repone cargas porque no existen. El explorador dispara indefinidamente |
| **M2B-14** | **Los objetos mágicos genéricos del SRD se pueden sembrar y no están** | **Arma +1/+2/+3, Armadura +1 y Escudo +1 sí están en el SRD 5.1**, bajo la misma CC BY que el resto: la cabecera del catálogo dice «ningún objeto mágico» y eso es más restrictivo de lo que la licencia pide. Con los efectos `weaponAttack`/`weaponDamage` ya abiertos, sembrarlos es transcribir cinco filas. Es decisión de producto, no arreglo. Comprobado en [el contraste de reglas](./superpowers/specs/2026-09-03-contraste-de-reglas-2B.md) |
| **M2B-15** | **«Lo tengo pero no sé qué hace» — la mitad que falta** | Revisa el motivo de la decisión D-2B-8: **es práctica estándar**, no exótica — Foundry lo trae de serie con una bandera `identified` y hay módulos dedicados. Y **media solución ya está construida**: la redacción de 2B (se tacha el nombre, se conserva el número) es el mismo mecanismo de presentación. Falta el interruptor del DM y un nombre alternativo («una espada de aspecto extraño») |
| ~~**M2B-13**~~ | **CERRADA el 2026-09-03**: el destino por defecto de las capturas es `apps/web/capturas-salida/`, **ignorada por git**, y el juego de referencia de `apps/web/capturas/` solo se reescribe a propósito con `SALIDA_CAPTURAS=capturas`. Una foto de referencia se actualiza cuando alguien lo decide, no como efecto colateral de correr las pruebas. **Y lo guarda una prueba** (`apps/web/src/ui/__tests__/capturas-no-ensucian.test.ts`) que lee el guion y el `.gitignore`: ninguna prueba de comportamiento puede fallar por lo que una suite deja detrás. Medido: tras correr el guion, `git status` solo enseña las ediciones de código | Cerrada |
| ~~**M2B-13 (texto original)**~~ | **La suite de navegador nunca deja el árbol limpio** | `capturas-comparacion.spec.ts` reescribe los nueve PNG de `apps/web/capturas/` en cada corrida —cada una con otra cuenta, otras horas y otros identificadores—, y los ficheros están seguidos por git. Así que después de cada `pnpm --filter @dnd/web e2e` hay nueve binarios modificados que no significan nada. Se arregla escribiendo a una carpeta ignorada por defecto y dejando `SALIDA_CAPTURAS` para cuando se quieran guardar de verdad. **Ojo con la comodidad de `git checkout` para limpiarlos**: es el comando que este proyecto prohíbe usar sobre un árbol con cambios sin commitear |
| **M2B-5** | **La carga se enseña y no penaliza** (ya era I4; la auditoría lo confirma midiendo) | El grupo saquea 400 libras y nada cambia. Falta el interruptor por campaña y derivar la sobrecarga como causa de velocidad |
| ~~**M2B-6**~~ | **CERRADA el 2026-09-03**: un arma va en una mano, una armadura en el cuerpo, un escudo en la izquierda; lo demás se rechaza con un 400 que dice dónde va. `OTHER` y `CONSUMABLE` siguen sin acotar a propósito: son el cajón de lo que el SRD no nombra | Cerrada |
| ~~**M2B-6 (texto original)**~~ | **La ranura no comprueba qué clase de objeto acepta** | Una cota de malla equipada en «CABEZA» sigue dando su CA, y un segundo escudo colocado a propósito en otra ranura **apaga la hoja entera** (`InvalidEquipmentError` → `sheet: null`). Hace falta atar `kind` ↔ `slot` |
| ~~**M2B-7**~~ | **CERRADA el 2026-09-03**: el tope de Destreza **lo determina la categoría** (`TOPE_DE_DESTREZA_POR_CATEGORIA`), el esquema rechaza la incoherencia y la pantalla ya no ofrece dos controles que puedan discrepar | Cerrada |
| ~~**M2B-7 (texto original)**~~ | **`armor.category` es un rótulo decorativo** | Nadie la consume salvo para distinguir el escudo: el tope de Destreza lo fija `dexCap` a mano, así que un DM puede marcar «Pesada» y que sume toda la Destreza. Lo suyo es derivar el tope de la categoría, o atarlos en el esquema |
| **M2B-8** | **`quantity` es absoluto donde el dinero es delta** | Dos personas descontando una flecha a la vez dejan 19 en vez de 18. No rompe ningún invariante —por eso no es urgente— pero es la misma carrera que la bolsa ya tiene resuelta |
| ~~**M2B-9**~~ | **CERRADA el 2026-09-03**: el previo y la aplicación derivan con el equipo equipado, así que las dos pantallas del mismo personaje dicen el mismo número | Cerrada |
| ~~**M2B-9 (texto original)**~~ | **La subida de nivel deriva la hoja sin el equipo puesto** | El previo enseña unos PG que no coinciden con la hoja si hay un objeto con efecto `maxHp`. Hoy no corrompe nada porque los PG no se persisten, pero `apply` siembra recursos con esa hoja incompleta: es una segunda boca del mismo error |
| ~~**M2B-10**~~ | **CERRADA el 2026-09-03**: el inventario sondea cada treinta segundos, igual que la sesión en curso. Sigue sin ser tiempo real, que es la fase 4 | Cerrada |
| ~~**M2B-10 (texto original)**~~ | **Nada refresca el inventario cuando lo cambia otra persona** | El DM entrega el botín y los jugadores no lo ven hasta volver a la pestaña (el refutador matizó que `refetchOnWindowFocus` sí lo recarga al volver, así que no es «hasta recargar»). Las sesiones ya sondean; falta el mismo `refetchInterval` |
| **M2B-11** | **Equipar son tres peticiones desde la pantalla** | `fetchAc` → `PATCH` → `fetchAc`. Si la segunda lectura falla, la mutación se marca como error, no se invalida la caché y la pantalla enseña un estado que el servidor ya cambió. Lo correcto es que el `PATCH` devuelva la CA nueva |
| **M2B-12** | **La hoja lee el inventario por otra conexión dentro de una transacción bloqueada** | El refutador rebajó esto de «incorrección» a **higiene**: lo que se lee está confirmado, pero son N+1 consultas sosteniendo un candado de fila. Se arregla pasando el `tx` hasta `equipoEquipado` |

## Lo que dejó la auditoría de documentación (2026-09-02)

Dos agentes auditaron los ocho documentos numerados **contra el código**, afirmación por
afirmación. **Treinta hallazgos, todos corregidos el mismo día** salvo estos tres, que son
trabajo y no una frase:

| | Qué | Por qué importa |
|---|---|---|
| **A1** | **El borrado en cascada de una campaña no está probado sobre las cuatro tablas nuevas**: `gameEvent`, `campaignFlag`, `campaignSet` y `rule`. La prueba cuenta ocho tablas y esas quedaron fuera | Borrar una campaña es la operación más destructiva del producto, y su prueba **cuenta filas de verdad** en vez de fiarse del código de estado. Cuatro tablas sin contar es justo por donde volvería a colarse un huérfano |
| **A2** | **`recordEntityOpened` escribe un `GameEvent` sin comprobar membresía**, y `world-state.module.ts` lo exporta a propósito | Hoy **no lo llama nadie**, así que no es explotable. Sigue el mismo patrón que `GameEventsService.record` («quien llama ya decidió»), y por eso no se cambió. **Pero la fila de 01 dice «solo DM» de ese módulo, y dejará de ser verdad en cuanto `entities` lo enganche** — que es lo que su propio comentario anuncia |
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
| ~~**H3b**~~ | **CERRADO el 2026-09-02.** `seedResourcesFor` ya lo llaman `CharacterSheetService` al completar la ficha y `LevelUpService` dentro de la transacción de subida de nivel, con prueba del caso negativo (ficha a medias no siembra). Estuvo abierto desde 2A.8 —función con prueba y sin llamador—, así que **ningún personaje tenía dados de golpe ni espacios de conjuro** y el panel de recursos salía vacío para todos. Lo encontró la revisión de la pantalla, no la suite | Cerrado |

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
| **M9** | **El personaje se archiva, no se borra.** Respuesta 6 de los jugadores: *«que se queden guardados como recuerdos; hay campañas donde te pueden revivir por items»*. Hoy el borrado es **definitivo** | Toca `characters`, que es de la fase 1, así que no es de 2A. **Pero el reloj corre**: la aplicación está en producción y cada personaje borrado ya no vuelve. Es lo más barato de esta tabla y **lo único que pierde datos mientras espera** |
| **M10** | **Revocar una concesión de visibilidad y editar en silencio** — la hidra falsa (respuesta 2). Hoy `EntityVisibilityGrant` se crea y no se quita | «Fase 1 ampliada» según el documento de respuestas; no depende del motor. Su regla difícil ya está decidida y no hay que perderla: **las notas del jugador NO se borran**, porque el terror nace de que sus apuntes contradigan su memoria |
| **M11** | **Que un jugador comparta lo que le revelaron** (respuesta 3) | Decisión abierta: o crea una concesión de verdad —que el DM ve y puede revocar, coherente con M10— o es un gesto social fuera del sistema. La primera es más trabajo y mucho más interesante |

## Pedido por el autor el 2026-09-02, colocado — antes de 2A

Razonado en [el análisis de las seis peticiones](./superpowers/specs/2026-09-02-seis-peticiones-analisis.md).
Los puntos 4 (modales) y 5 (líneas del acceso) ya están hechos; el 6 entró en el plan de 2A.

| | Qué | Por qué aquí y no después |
|---|---|---|
| **A1** | **Bandeja de notificaciones.** Tabla `Notification` alimentada por los eventos de dominio que ya se emiten, y una bandeja en la cabecera. **Sin tiempo real**: se pide al cargar | Hoy la aplicación no le cuenta nada a nadie: ni invitaciones, ni sesión el viernes, ni comentarios. Y **el motor de reglas de 2A no tiene dónde avisar** sin esto |
| **A2** | **Invitar por correo a un usuario que ya tiene cuenta**, sin pegar enlaces. **La respuesta del servidor debe ser idéntica exista o no la cuenta**, o se convierte en un comprobador de padrón | Es lo que el autor pedía de verdad al hablar de «amigos», por una fracción del coste. Un grafo social duplica la pertenencia a campaña, que es la unidad real del producto |
| **A3** | **Invitaciones con usos máximos, caducidad y revocación** | Hoy es un enlace por persona —decisión declarada— y montar una mesa de cuatro exige generar cuatro. **Un enlace eterno no**: acaba circulando por un grupo y la visibilidad se apoya en quién es miembro |

## Reseño de interfaz (2026-09-02) — lo que dejó abierto

Lo entregado está en [07-historial](./07-historial.md) y su porqué en
[la auditoría](./superpowers/specs/2026-09-02-auditoria-interfaz.md). Lo que **no** entró:

| | Qué | Por qué importa |
|---|---|---|
| **U1** | **Las sesiones no tienen página de lectura.** Fichas y personajes sí; una sesión se sigue abriendo en su formulario | Es justo la pantalla que el DM mira **durante** la partida. El patrón ya está construido dos veces, así que sale barato |
| **U2** | **La columna de secciones desaparece por debajo de 768 px** y nada la sustituye | En móvil se llega a una sección por URL pero no se puede navegar a ella. Hace falta un desplegable o una tira horizontal |
| **U3** | **Buscar solo mira el nombre**, no el cuerpo de las fichas | Buscar dentro del texto exige hacerlo **en el servidor**: el filtro de pantalla opera sobre lo que `canView` ya dejó pasar, y ampliarlo sería confundir *esconder* con *no mandar*. Ver [04-convenciones](./04-convenciones.md) |
| **U4** | **El panel de campañas no dice cuánto mundo tiene cada una** | Contar fichas bien exige aplicar la matriz de visibilidad, cuyo dueño único es `canView`. Es una tarea con su ficha, no un efecto colateral: hoy se muestran rol, personas y fecha, que no delatan nada |
| ~~**U5**~~ | **CERRADO en 2A.10.** `HojaCalculada.tsx` pinta los valores del motor con su traza desplegable, los PG con deltas, recursos, descansos, condiciones, tirar y las anulaciones del DM. El «—» que queda en `HojaCincoE.tsx` es solo lo que 2B alimentará (equipo, conjuros) | Cerrado |
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
| **H1** | **Ranuras de equipo**, y el estado de un objeto como **tres** (llevado / equipado / **sintonizado**, con tope de 3), no como un booleano | Toca la fórmula de CA, que **no es una suma**: la armadura sustituye la fórmula y limita la Destreza |
| **H2** | El **descanso** está a medias: hay gatillo, pero nada restaura los PG y los **dados de golpe no existen** en ningún documento | Es el bucle más frecuente de una sesión; sin él la mesa corrige PG a mano y deja de fiarse de la pantalla |
| **H3** | **PG temporales**: el daño los atraviesa tal como está escrito | Error silencioso dentro de un registro que se declara inmutable |
| **H4** | **Pericia** (competencia doble): el modificador solo conoce competencia como booleano | La hoja del pícaro dirá +5 donde la regla dice +7 |

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
| **D1** | ~~`02-entorno.md` decía `TRUST_PROXY=1`~~ | **Cerrado.** El documento ya dice que en producción son **dos** saltos y por qué |
| **D2** | ~~`00-INDEX.md` anunciaba "no desplegado"~~ | **Cerrado el 2026-09-02**, junto con la misma afirmación en `CLAUDE.md` |
| **D3** | **La API no tiene endpoint de salud** | No hay `@Controller("health")` ni controlador raíz: `GET /` responde 404. La comprobación del compose acepta ese 404 como señal de vida, así que **detecta un proceso caído pero no una base de datos caída**. Un `/health` que haga un `SELECT 1` es un cambio de código con su propia ficha, no un efecto colateral |
| **D4** | ~~¿Descubre el respaldo diario los contenedores nuevos?~~ | **Cerrado: no los descubre.** El trabajo de las 04:00 lleva **una lista escrita a mano**. Se le añadió un bloque para esta base (`dnd-pg.sql.gz`), resolviendo el contenedor por prefijo de uuid porque su nombre cambia en cada despliegue. Volcado verificado por contenido: 11 tablas y la cuenta del autor dentro |
| **D5** | **Nadie ha restaurado nunca una copia de *esta* base** — ahora con más motivo: ya existen copias diarias reales que nadie ha probado a restaurar | Una copia sin restauración probada es una hipótesis. Requisitos reales de la restauración en [03-despliegue.md](./03-despliegue.md) |
| **D6** | ~~`TRUST_PROXY` sin verificar contra el sistema real~~ | **Cerrado el 2026-09-02 con la prueba de las dos tandas.** Seis logins fallidos → 429; seis **con `X-Forwarded-For` falsificado y rotando** → **también 429**. Traefik descarta la cabecera del cliente, que es de donde viene la protección |
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
| 1 | ~~**`JWT_SECRET` tiene un valor por defecto en el código**, en dos sitios~~ — **HECHO** (2026-09-01, ver [07-historial.md](./07-historial.md)): no hay valor por defecto, la variable es obligatoria y de 32 caracteres mínimo, y la API se niega a arrancar sin ella | ~~**Crítico**~~ |
| 2 | ~~**29 vulnerabilidades en dependencias de producción**~~ — **HECHO** (1.18a): Nest y Fastify subidos a 11.x, `fast-uri` a 3.1.6; quedan **4 moderadas** (`@opentelemetry/core` vía Sentry v8, 3 de `react-router` en web). CI audita con `--audit-level=high` | ~~Alto~~ |
| 3 | ~~**Sin límite de peticiones**~~ — **HECHO** (1.18a): límite por IP en login, registro, aceptar invitación y cambiar contraseña. **Exige el `TRUST_PROXY` correcto en producción, que en `vps1new` es `2`, no `1`** (Traefik **y** nginx son dos proxies), ver [03-despliegue.md](./03-despliegue.md) | ~~Alto~~ |
| 4 | ~~**Sin cabeceras de seguridad**~~ — **HECHO** (1.18a): `@fastify/helmet` con política revisada, fijada por `apps/api/test/security-headers.e2e-spec.ts` | ~~Medio~~ |
| 5 | ~~**CORS abierto**~~ — **HECHO** (1.18a): apagado por defecto; `CORS_ORIGIN` es la única forma de encenderlo | ~~Medio~~ |
| 6 | ~~**Sin pantalla de 404 ni `ErrorBoundary`**~~ — **HECHO** (1.18b): ruta comodín, red de errores con salida que funciona, y un comentario que declara lo que una red de React **no** atrapa | ~~Medio~~ |
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
- **La interfaz sigue mezclando idiomas**: la pantalla de entrar dice *Email*, *Password* y
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
| A2 | ~~Las etiquetas se guardan y no se ven en ninguna parte ni se puede filtrar por ellas~~ — **CERRADO en 1.17c**: se pintan en la fila y `EntityFilterBar` filtra por ellas (Y lógico) | — |
| B1 | ~~Una campaña no se puede editar ni borrar~~ — **CERRADO en 1.17d**: `CampaignSettings.tsx` (pestaña Resumen) consume el `PATCH`/`DELETE` que 1.17a ya tenía probados | — |
| B2 | ~~No se puede expulsar a un jugador ni salirse~~ — **CERRADO en 1.17d**: `MembersPanel.tsx` (pestaña Resumen) consume el `DELETE /campaigns/:id/members/:userId` de 1.17a | — |
| B3 | **No se puede cambiar el nombre visible ni la contraseña**, ni recuperarla si se olvida — va con la **tarea 1.18** (seguridad), no con 1.17 | API + web |
| C1 | ~~No hay búsqueda ni filtro en ninguna pantalla~~ — **cerrado en 1.17c para las siete pestañas de entidades**; **Sesiones y Personajes se quedan sin buscador, ver la nota debajo de la tabla** | Solo web |

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
  [09-primera-partida.md](./09-primera-partida.md) llama *"el valor real de la herramienta"*.
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
[09-primera-partida.md](./09-primera-partida.md) para el guion de esa sesión cuando llegue).
La única carencia que quedaba de la lista original —no se podía borrar casi nada desde la
interfaz— se cerró como tarea 1.16 (ver "Cerrados"). Queda esta:

**No hay despliegue.** Sin VPS, la partida se juega en local y los jugadores tienen que
estar en la misma red. Si se quiere que entren desde sus casas, esto **sí** es bloqueante.
Decisión aparte, no configuración. Ver [03-despliegue.md](./03-despliegue.md).

## P1 — Huecos de verificación

**No hay prueba de accesibilidad, responsive ni rendimiento.** Ninguna herramienta lo mira
hoy.

**CI nunca ejecuta `pnpm build`.** `.github/workflows/ci.yml` corre `lint`, `format:check`,
`check:docs`, `check:estado`, `test` y `test:e2e` en el job `test`, pero no llama a `pnpm
build` en ningún paso — el type-check completo de `tsc`/`nest build`/`vite build` de `pnpm
verify` no corre en CI. Detectado durante la revisión de la tarea antideriva (2026-09-01);
decisión explícita del revisor no arreglarlo en esa tarea (fuera de su alcance), dejarlo
anotado aquí en su lugar.

**~~`invites.e2e-spec.ts` y `members.e2e-spec.ts` podían colisionar de correo entre workers de
Jest~~ — CERRADO el 2026-09-01 (tarea 1.15-fix, Menor).** Ambas suites construían sus correos
como `dm${Date.now()}@b.com` / `pl${Date.now()}@b.com` — resolución de milisegundo. Dos
workers de Jest que arrancaran en el mismo milisegundo generaban correos idénticos: el
segundo `register()` fallaba con 400 (email duplicado) y el `afterAll` de un worker borraba
el usuario que el otro seguía usando, produciendo fallos intermitentes sin relación con el
código bajo prueba. Detectado y explicado durante la revisión de 1.15 (explicación verificada
por el revisor), no corregido en su momento porque quedaba fuera del arreglo que se estaba
revisando. **Arreglado** añadiendo un sufijo aleatorio a `Date.now()` en los dos ficheros
(`${Date.now()}${Math.floor(Math.random() * 1e6)}`). **El mismo patrón de correo
(`Date.now()` a secas) existe también en `auth.e2e-spec.ts`, `campaigns.e2e-spec.ts`,
`characters.e2e-spec.ts`, `comments.e2e-spec.ts`, `entities.e2e-spec.ts`,
`links.e2e-spec.ts` y `sessions.e2e-spec.ts`** — comparten el mismo riesgo teórico, pero no
fueron los que la revisión de 1.15 vio fallar y el brief de 1.15-fix pedía arreglar
específicamente los dos de arriba; se deja anotado aquí en vez de corregido en silencio.

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
- ~~No hay botón de borrar sesión o personaje en la interfaz~~ — CERRADO, tarea 1.16 (ver
  "Cerrados").
- ~~Los botones "Quitar" (`LinksPanel.tsx`) y "Borrar" (`CommentThread.tsx`) se pintan en
  todas las filas, sin mirar si el usuario es DM o autor~~ — CERRADO, tarea 1.16 (ver
  "Cerrados").
- **Falta `key` en `EntityTab` al cambiar de pestaña** (`CampaignDetailPage.tsx:313`): hoy es
  inofensivo porque `EntityTab` es la única instancia en esa posición del árbol, pero es un
  riesgo latente si el modal deja de comportarse como modal (p. ej. dos `EntityTab` a la vez).
  Observación del revisor de 1.12a, no arreglado.
- **El modal del editor de entidades no tiene `role="dialog"` ni se cierra con Escape**
  (`EntityEditor.tsx`). Observación del revisor de 1.12a, no arreglado.

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

- **Sin VPS asignado**: el despliegue en Coolify está preparado y **diferido**. La parte de
  despliegue de la tarea 1.14 no se ejecuta; solo se construye la interfaz de invitación.
- **Sin sistema de diseño** para el MVP: decisión explícita, no olvido.
- **Fases 2–5** (reglas, mapas, tiempo real, 3D/IA) solo tienen alcance, no plan. Cada una
  recibe el suyo al llegar, y **no se empieza la siguiente hasta usar la anterior en una
  sesión real**.

## P5 — Dejado fuera a propósito de la tarea antideriva (2026-09-01)

- **`lychee` 0.24.2 queda instalado en la máquina del autor, sin enganchar a nada.** Se
  engancha en un commit aparte. **No sustituye a `scripts/check-docs.mjs`** — se afirmó eso
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
| **S10** | **La lista de `labelKey` de `vocabulario.ts` se escribe a mano.** Nada falla si el catálogo estrena una clave nueva | Es la mitad que quedó de S5. La prueba que hace falta compara el conjunto de `labelKey` que el catálogo puede emitir contra las claves del diccionario |
| **S11** | **Los tipos de respuesta del motor y del previo de nivel viven dos veces**: en `apps/api/src/rules-engine/engine/types.ts` y `level-up.service.ts`, y calcados a mano en `apps/web/src/features/rules/api.ts` y `features/level-up/api.ts` | Si el servidor cambia esa forma, **nada lo detecta**. Es el mismo patrón que ya se aceptó para la hoja, pero con más superficie. Candidato claro a `@dnd/shared` |
| **S12** | **`listTracesQuerySchema` y `levelUpPreviewQuerySchema` viven fuera de `@dnd/shared`** | `docs/01-arquitectura.md` dice que la forma de los datos vive en un solo sitio y **eso ya tiene dos excepciones**. O se declara la excepción (los esquemas de consulta locales a un endpoint pueden vivir junto al controlador) o se mueven |
| **U6** | **`VISIBILITY_CONFIG` no se exporta desde `ui/Badge.tsx`** | La pantalla del motor no puede nombrar un nivel de visibilidad dentro de una frase sin duplicar las cinco etiquetas, así que parte la frase y pinta una insignia al lado |
| **U7** | **La pantalla de subida de nivel no tiene medición de contraste en navegador** | El resto de pantallas sí. Los tokens que usa están medidos, pero **en otros contextos**, y la regla del proyecto es que lo que solo se ve maquetado se mide donde se maqueta |
| **U8** | **Seis glifos de fuente incumplen la regla de iconos dibujados**, incluido el `✓` que la propia regla pone como ejemplo prohibido | En `InvitePanel`, `AccountPage`, `LoginPage`, `Field`, `Traza` y `Ornament`. O se dibujan como el resto, o `docs/04-convenciones.md` amplía la excepción por escrito — que es lo que la regla exige. Lo que no puede quedarse es la regla conviviendo con su propio contraejemplo |
| **N3** | **`NOTIFY` del motor de reglas no llega a la bandeja** | No hay tipo de aviso equivalente. La pantalla lo dice en vez de prometerlo, que es lo correcto, pero el efecto está a medias |
| **N4** | **El listado de propuestas no trae el nombre de la regla**, solo su identificador | La pantalla lo cruza con la lista y, si no está, pinta «regla borrada». Es un dato que la API debería dar |
| **D9** | **Cinco módulos de la API no tienen pantalla**: log de partida, listado de tiradas, avisos, marcas y conjuntos del mundo, y el estado de sesión (empezar y cerrar) | `docs/01-arquitectura.md` los describe como si el producto los ofreciera; hoy se usan **solo con un cliente HTTP**. Para la partida de la semana que viene lo que más se echa en falta es **empezar y cerrar sesión desde la pantalla**: sin eso, todos los sucesos se escriben fuera de sesión |
| **X1** | **`RestKind` es un enum muerto en la base**: no lo usa ningún modelo ni campo | O se borra con su migración, o se declara por qué se deja. Hoy no está escrito ninguna de las dos cosas |

### Huecos de mecánica — lo que falta para jugar de verdad

Ordenados por lo que duele en la mesa. **Ninguno es de la fase 3**: todos caben en lo que ya
existe, y por eso están aquí y no en un plan futuro.

| # | Mecánica | Qué se rompe hoy | Dónde encaja |
|---|---|---|---|
| **M13** | **Los PNJ y los monstruos no tienen puntos de golpe, ni CA, ni condiciones** | El hueco más caro: el DM hace daño a un monstruo en el minuto diez. Hoy, para llevar los PG de tres goblins hay que crear tres «personajes» a su nombre, que salen en el listado junto a los de los jugadores | Una tabla de estado de combate colgando de la ficha del mundo, y que el endpoint de PG acepte un objetivo en vez de estar clavado en la ruta de personaje |
| **M14** | **No hay orden de iniciativa, ni turnos, ni rondas** | El motor deriva el **modificador** de iniciativa y ahí acaba: el primer combate se lleva en papel. Y arrastra a las condiciones — sin turnos **no caducan**, así que media hora de combate deja la ficha llena de condiciones que ya no aplican, y el motor de reglas las sigue leyendo como verdaderas | La sesión ya es el estado mutable de la partida y ya tiene índice único de «una activa por campaña»: el orden cabe ahí, más dos tipos de suceso que el puente del motor ya sabría recoger |
| **M15** | **Una tirada no puede hacer daño a nadie** | La tirada y el cambio de PG son dos operaciones manuales y dos hechos **sin relación** en el log, así que «¿de qué murió Elara?» no se puede responder desde el registro | Un objetivo opcional en la tirada, y que el suceso de daño lleve el identificador de la tirada como causa |
| **M16** | **Las condiciones no afectan a ninguna tirada** | Las condiciones tienen **un solo consumidor**: el cálculo de velocidad. Un personaje apresado, envenenado o con agotamiento 3 tira **normal** | Un hermano de `effective-speed.ts` que, dadas las condiciones activas, **sugiera** ventaja o desventaja con su traza. Mismo patrón, mismo sitio, coste bajo — y ahora que el modo de tirada existe, ya hay dónde enchufarlo |
| **M17** | **La concentración se guarda y nadie la comprueba** | La clave libre existe justo para «concentrándose en Bendición», y recibir daño no pide la salvación de Constitución. Es el mismo fallo que tenían las salvaciones de muerte esta mañana: la mitad hecha es la que no ocurre en la mesa | El mismo bloque de daño donde ya viven las salvaciones de muerte. Basta con **avisar**: no hace falta calcular nada para dejar de olvidarlo |
| **M18** | **Sin tipos de daño, resistencias ni inmunidades** | El cambio de PG es un entero pelado, y el log guarda un número que no dice de qué era | Un tipo de daño en el detalle del suceso, decidido **antes** de escribir mil eventos: la convención obliga a promocionar a columna cualquier campo por el que haya que filtrar |
| ~~**M19**~~ | **CERRADO en 2B (2026-09-03): objetos con datos, inventario, equipo, dinero y el cuadro de ataques con su daño.** Lo que queda de esa ficha es lo que 2B declaró fuera: la carga no penaliza (I4) y el botín sigue sin tabla propia | ~~pendiente~~ |
| ~~**M19 (texto original)**~~ | **Ni objetos, ni inventario, ni dinero** | La hoja enseña «+5 al ataque» y no tiene dónde leer «1d8+3 cortante». **Media mecánica de ataque en pantalla es peor que ninguna, porque parece completa.** Y el botín de la sesión se apunta fuera | La fase 2B lo modela entero. Para la semana que viene bastaría un texto libre por personaje y una columna de dinero: no es 2B, es un cuaderno, pero evita tener dos sitios donde mirar |
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
| ~~**J1**~~ | **Curar a un muerto lo resucitaba**: a 0 PG con tres fracasos, echarle diez puntos lo devolvía a la vida con el contador a cero y sin aviso | **CERRADO**: `changeHp` lo rechaza con un 400 que dice que hace falta resurrección; bajarle los PG a un cadáver sigue permitido |
| ~~**J2**~~ | **El ensayo en seco decía `status: "APPLIED"`**, la palabra que sostiene toda la promesa del dry-run | **CERRADO**: el ensayo reetiqueta a `WOULD_APPLY`/`WOULD_PROPOSE` y devuelve `simulated: true`; el enum persistido de `RuleTrace` no se toca |
| ~~**J3**~~ | **`ENTITY_OPENED` se disparaba con las lecturas del propio DM**: preparar la sesión le llenaba la bandeja de propuestas disparadas por sí mismo | **CERRADO**: no se registra cuando quien mira es el DM o el creador; el suceso capta que **un jugador** examinó algo, que es su razón de ser |
| ~~**J4**~~ | **El combate se grababa fuera de sesión**: `GET /events?sessionId` devolvía 2 de 19 sucesos aunque la sesión estuviera abierta | **CERRADO** para el daño y las salvaciones de muerte: `changeHp` y `rollDeathSave` averiguan la sesión en curso y la graban, como ya hacía `RollsService` |
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
