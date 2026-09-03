# Mesas virtuales — estudio · 2026-09-02

> **Qué es esto.** La tarea **M0** del
> [plan de adopción de la interfaz](../plans/2026-09-02-plan-adopcion-interfaz.md): el estudio
> previo al bloque M, la mesa de juego. Se escribió para responder **cuatro preguntas** —dónde se
> resuelve la niebla de guerra, cómo se mueven las fichas, qué formato de mapas y de tiles se
> importa, y qué pasa cuando el jugador está en el móvil— y termina eligiendo, no enumerando.
>
> **Qué NO es.** No es un catálogo de productos ni una comparativa de precios. No decide **D4**
> (si la mesa sustituye a la fase 3, va después, o se hace un tablero mínimo antes): la alimenta.
> Y no escribe el contrato de datos, que es **M1**.

---

## Resumen ejecutivo

El hallazgo que justifica todo lo demás es este, y conviene decirlo antes que nada:

**No se encontró ninguna plataforma, entre las que se pudieron verificar con fuente primaria, que
filtre la posición de una ficha en el servidor.** Foundry VTT decide la visibilidad de una ficha
**en el navegador**, con un método del objeto de lienzo cuya descripción oficial empieza
literalmente por *«Determine whether the Token is visible to the calling user's perspective»* —
la perspectiva del usuario que llama, en el cliente que la llama. MapTool acumula un historial de
fallos del mismo tipo, todos con la misma forma: el dato ya estaba en el cliente y la interfaz lo
enseñó por descuido. Ninguno de esos fallos habría sido posible si la posición no se hubiera
enviado.

Es decir: **el error a no copiar es el que cometen todas**. Y eso convierte lo que en el plan
parecía una precaución —«la niebla se resuelve en el servidor»— en la única ventaja de diseño real
que este proyecto puede tener sobre plataformas con diez años de ventaja y cien veces más manos.
No es una restricción que cueste: es la característica.

Las cuatro respuestas, en corto, y desarrolladas cada una en su sección:

1. **La niebla se resuelve en el cliente en todas partes.** Lo que sí se guarda en el servidor es
   la *exploración* —qué ha visto cada usuario—, no el *filtrado*. Foundry tiene un documento de
   exploración por usuario y por escena; pero el que decide si una ficha se dibuja es el
   navegador. Sección 1.
2. **Las fichas se mueven arrastrando sobre una rejilla configurable** (sin rejilla, cuadrada o
   hexagonal en varias orientaciones), con ajuste a la casilla y un tamaño de casilla en píxeles
   declarado por escena. La validación es del cliente que arrastra: en Foundry el gancho previo a
   la actualización *«solo ocurre para el cliente que solicitó la operación»*. Sección 2.
3. **El formato de mapa que se ha impuesto es Universal VTT** (`.uvtt` / `.dd2vtt` / `.df2vtt`):
   imagen más metadatos, entre ellos **las líneas de visión**, en un solo fichero. Para tiles de
   verdad, el estándar es **Tiled** (TMX en XML, y su JSON de primera clase). Sección 3.
4. **En el móvil, la respuesta mayoritaria es que no hay respuesta.** Foundry no menciona los
   dispositivos móviles en sus requisitos y sí dice, textualmente, que el programa *«está diseñado
   para ratón y teclado»*. Sección 4.

Y las elecciones, que es lo que se pedía:

- **Rejilla cuadrada**, con la distancia por casilla y el tipo de rejilla guardados en el tablero
  desde el primer día, para que el hexágono sea un dato nuevo y no una reescritura. Sección 5.
- **Universal VTT** como formato de importación de mapas de batalla, y **Tiled JSON** el día que
  haya tiles de verdad. Ni un editor de arte, que sigue descartado. Sección 5.
- **La visibilidad por coordenadas se filtra en el servidor con un conjunto de casillas visibles
  por espectador**, y la respuesta **no contiene** lo que cae fuera. Sección 6, que es donde este
  documento se moja.
- **El tablero mínimo de dos semanas** es imagen de fondo, rejilla cuadrada, fichas que se
  arrastran, regiones reveladas por el DM y la hoja al lado. Sin visión dinámica, sin iluminación
  y sin WebSocket. Sección 7.
- **Y una lista de lo que no se hace**, que en un bloque de siete tareas bloqueadas vale tanto
  como el resto. Sección 8.

---

## 0 · Cómo se hizo esto, y qué no se pudo verificar

Esta sección va primero a propósito. En este repositorio una afirmación sin respaldo es peor que
un hueco declarado, y este estudio tiene huecos grandes que conviene conocer antes de leer una
sola conclusión.

**El buscador se agotó a mitad del encargo.** La sesión consumió su presupuesto de búsquedas web
antes de que empezara esta tarea, así que **no hubo búsqueda por palabras clave en ningún
momento**. Todo lo que sigue se obtuvo por dos vías: descarga directa de documentación oficial en
URLs conocidas de antemano, y consultas a la API pública de GitHub —que sí respondió— sobre los
repositorios de incidencias de Foundry VTT y de MapTool. Los tres buscadores alternativos que se
intentaron, DuckDuckGo en sus dos versiones y Mojeek, devolvieron CAPTCHA o 403.

**Cuatro fuentes que habrían importado quedaron fuera por bloqueo del servidor**, no por no
buscarlas:

| Fuente | Qué habría aportado | Qué pasó |
|---|---|---|
| Centro de ayuda de Roll20 (`help.roll20.net`) | Su documentación de iluminación dinámica y de capas | **HTTP 403** |
| Wiki antigua de Roll20 (`wiki.roll20.net`) | Lo mismo, por otra vía | **HTTP 403** |
| Documentación y web de Owlbear Rodeo | Su modelo de niebla y su soporte móvil, que es su argumento de venta | **HTTP 403** |
| Wiki de MapTool (`wiki.rptools.info`) | La explicación oficial de su modelo de visión | **HTTP 403** |

En consecuencia: **de Roll20 y de Owlbear Rodeo este documento no afirma nada de primera mano**.
Lo poco que se dice de Roll20 viene de una fuente de terceros —Arkenforge, que documenta qué
formatos importa cada programa— y se cita como tal. De Owlbear Rodeo no se dice nada.

**Y una limitación que ninguna documentación puede salvar:** para demostrar que una plataforma
envía al navegador una posición que el jugador no debería conocer, lo que hace falta es abrir la
consola de un cliente de jugador y mirar el tráfico. **Eso no se ha hecho.** Lo que sí hay es
evidencia indirecta muy fuerte —la descripción oficial de un método de visibilidad que corre en el
cliente, y una serie de incidencias públicas cuya única explicación posible es que el dato estaba
ahí— y así se presenta: como inferencia con su premisa a la vista, no como medición.

---

## 1 · La niebla de guerra: dónde se resuelve de verdad

### Foundry VTT decide en el navegador, y lo dice su propia API

La documentación oficial de la clase `Token` —el objeto que Foundry dibuja en el lienzo— describe
así su propiedad `isVisible`:

> «Determine whether the Token is visible to the calling user's perspective. Hidden Tokens are
> only displayed to GM Users. Non-hidden Tokens are always visible if Token Vision is not
> required. Controlled tokens are always visible. All Tokens are visible to a GM user if no Token
> is controlled.»
> — [Foundry VTT API, `Token`](https://foundryvtt.com/api/classes/foundry.canvas.placeables.Token.html)

Hay que leer despacio la segunda frase. No dice *«las fichas ocultas solo se envían a los DM»*:
dice que **solo se les muestran** (*are only displayed*). Mostrar es una decisión de dibujo, y para
tomarla el objeto tiene que existir en el cliente que la toma. La misma documentación confirma que
el modelo de datos es compartido: la clase base del documento se describe como *«Defines the
DataSchema and common behaviors for a Token which are shared between both client and server»*
([Foundry VTT API, `BaseToken`](https://foundryvtt.com/api/classes/foundry.documents.BaseToken.html)).

Esto es **una cortina, no una niebla**, en el sentido exacto que usa el plan: el navegador del
jugador tiene el dato y ha aceptado no dibujarlo.

### Lo que Foundry sí guarda en el servidor es la exploración, que es otra cosa

Conviene no confundir las dos, porque el error de diseño está justo en la costura. Foundry tiene un
documento `FogExploration` con tres campos —`user`, `scene` y `explored`—, es decir, **un registro
por usuario y por escena de qué ha descubierto**
([Foundry VTT API, `FogExploration`](https://foundryvtt.com/api/classes/foundry.documents.FogExploration.html)).
Y su artículo de ayuda confirma que ese registro persiste más allá de la conexión: se puede *«reset
the recorded Fog of War exploration for that scene for all Users. This includes any that are not
currently connected»* ([Foundry VTT, artículo de iluminación](https://foundryvtt.com/article/lighting/)).

O sea: **el servidor sabe perfectamente qué ha explorado cada jugador**. Tiene el dato que haría
falta para filtrar. Simplemente no lo usa para filtrar, lo usa para restaurar la máscara al
reconectar. La pieza que falta no es información: es la decisión de aplicarla antes de enviar.

### Las fugas públicas: el dato estaba en el cliente y la interfaz lo enseñó

Los casos verificables que se encontraron tienen todos la misma anatomía. No son fallos del motor
de niebla: son **otros controles de la interfaz que leyeron el dato que la niebla estaba tapando**.

**Foundry VTT, incidencia 2943** (abierta el 26 de mayo de 2020, cerrada), titulada *«Combat
Tracker tools for Token selection and hovering should not respond for players who do not have
observer rights to the Token or Tokens which are not visible»*. El cuerpo lo dice sin adornos:

> «As a player, I am able to click on an NPC that is on the combat tracker but toggled to hidden on
> the canvas, and my view of the canvas will pan to them.»
> — [foundryvtt/foundryvtt#2943](https://github.com/foundryvtt/foundryvtt/issues/2943)

El jugador no ve la ficha, pero pulsando su fila en el rastreador de combate **la cámara viaja
hasta ella**: la posición que la niebla ocultaba se recupera midiendo adónde se movió la vista. La
misma incidencia reporta un segundo agujero, seleccionar por esa vía fichas que no se poseen para
**mirar a través de su visión**.

**MapTool, incidencia 553** (9 de agosto de 2019, cerrada el 23), *«NPC token names visible over Fog
of War»*: los nombres de las fichas del DM se leían **pasando el ratón por encima**, o directamente
activando «Show Token Names» en el menú de vista, pese a que la niebla las cubría
([RPTools/maptool#553](https://github.com/RPTools/maptool/issues/553)).

**MapTool, incidencia 890** (11 de noviembre de 2019), *«Players can select tokens they own under
hard fog of war»* ([RPTools/maptool#890](https://github.com/RPTools/maptool/issues/890)) — el mismo
patrón sobre fichas propias.

**MapTool, incidencia 5762** (21 de agosto de 2025, cerrada el 18 de septiembre de 2025), *«Visible
over FoW on token does not seem to work as described»*: la propiedad pensada para que puertas y
columnas se vean sobre la niebla *cuando están a la vista de alguna ficha* acababa mostrándolas
**desde cualquier punto del mapa, sin línea de visión y con muros de por medio**
([RPTools/maptool#5762](https://github.com/RPTools/maptool/issues/5762)). Seis años después de la
553, en la versión 1.18.3: no es un fallo que se arregle una vez.

**El patrón, dicho de una vez:** cuando el cliente tiene la verdad completa, la niebla no es una
propiedad del sistema sino una convención que cada control de la interfaz debe recordar respetar
por su cuenta. Hay decenas de controles. Basta con que uno se olvide. Y el que se olvida no es
detectable por una prueba visual —la ficha sigue sin dibujarse—, solo por una prueba que mire lo
que llegó.

**Lo que este proyecto debe copiar de aquí:** nada del mecanismo, y todo del diagnóstico. La regla
del repositorio —lo que alguien no debe saber no se le envía— convierte esos cuatro fallos en
imposibles por construcción, no en imposibles por vigilancia. Un rastreador de combate que no
recibió la ficha no puede desplazar la cámara hasta ella.

**Declarado como no verificado:** que Foundry envíe efectivamente las coordenadas de una ficha
oculta por el socket. Es lo que la descripción de `isVisible` implica y lo que las cuatro
incidencias exigen, pero no se ha inspeccionado el tráfico. Y de Roll20 y de Owlbear Rodeo, por el
403 de sus servidores, **no se afirma nada**.

---

## 2 · Cómo se mueven las fichas

### La rejilla es un dato de la escena, no del producto

Foundry no elige una rejilla: la configura por escena. Su artículo oficial de escenas describe
**sin rejilla** —*«Gridless - No fixed grid is used on this Scene allowing free-form point-to-point
measurement without grid lines»*—, **cuadrada** y **hexagonal en varias orientaciones**. Y hace
explícitos los dos números que gobiernan todo lo demás:

- **Tamaño de casilla en píxeles:** *«The number of pixels which represent a single grid space.
  Foundry's default is 100 pixel squares, and has a minimum of 50px squares.»*
- **Escala de rejilla:** *«determines the unit of measure that each square of space represents in
  this map. For battle maps this may be on the order of feet or meters, for a large region map each
  individual grid space could represent miles or kilometers.»*
  — [Foundry VTT, artículo de escenas](https://foundryvtt.com/article/scenes/)

Esos dos campos —**cuántos píxeles mide una casilla** y **cuánta distancia real representa**— son
el contrato mínimo entre un mapa importado y un sistema de reglas. Son exactamente los mismos dos
que trae el formato Universal VTT (sección 3), lo cual no es casualidad: es el consenso.

### Quién valida el movimiento, y contra qué

Foundry expone `TokenDocument#move()` —*«Move the Token through the given waypoint(s)»*—, un
`movementHistory` con los puntos por los que la ficha ha pasado, y un `measureMovementPath()` para
medir el coste del trayecto
([Foundry VTT API, `TokenDocument`](https://foundryvtt.com/api/classes/foundry.documents.TokenDocument.html)).
La documentación **no declara** si la validación es de cliente o de servidor, y aquí no se va a
inventar. Lo que sí declara, y es revelador, es el alcance de los ganchos previos: *«Pre-operation
events only occur for the client which requested the operation»*. Un control que solo se ejecuta en
el cliente que pidió el movimiento no es una validación, es una comodidad.

Traducido a lo que aquí importa: **el coste del movimiento, el choque con un muro y el «no te queda
velocidad» se calculan donde se dibujan**. Que la mesa funcione depende de que nadie manipule su
cliente; es una decisión razonable para un producto cuyo modelo de amenaza es «mis amigos», y **no
es el modelo de amenaza de este proyecto**, que ya trata la posición como información sensible por
decisión de producto.

### Qué pasa cuando dos personas mueven a la vez

**No verificado.** No se encontró documentación oficial que describa la resolución de conflictos de
dos actualizaciones simultáneas sobre la misma ficha en ninguna de las plataformas consultadas. La
arquitectura de Foundry —documentos actualizados y difundidos por socket— sugiere un **último en
escribir gana**, pero es inferencia, no cita, y se declara como tal. Es una pregunta que este
proyecto tendrá que responder por su cuenta en M1, y la propuesta está en la sección 6.

---

## 3 · Qué formato de tiles y de mapas se importa

La decisión de la fase 3 sigue en pie y este estudio no la toca: **no se construyen editores de
arte**. La pregunta es qué se importa, y hay dos respuestas distintas para dos cosas distintas que
se confunden a menudo.

### Un mapa de batalla no es un tablero de tiles

**Universal VTT** es el formato que se ha impuesto para mapas de batalla. Lo creó Megasploot, el
autor de Wonderdraft y Dungeondraft, y se describe como *«an image with a bunch of extra data
attached to it»*. Existe con tres extensiones —`.uvtt`, `.dd2vtt` y `.df2vtt`— que son
*«functionally identical underneath»*. Lo que lleva dentro:

| Contenido | Qué es |
|---|---|
| **Imagen** | PNG o WEBP codificado en base64 |
| **Resolución** | Origen del mapa, tamaño **en casillas**, y **píxeles por casilla** |
| **Línea de visión** | *«Arrays of coordinates defining vision obstacles»* |
| **Portales** | Posición, límites, rotación y estado abierto o cerrado |
| **Luces** | Posición, alcance, intensidad, color y sombras |
| **Entorno** | Luz ambiente y si la iluminación está precalculada |

Lo exportan Dungeondraft, Dungeon Alchemist, DungeonFog, MapForge y el kit de Arkenforge; lo
importan de forma nativa Roll20 y Fantasy Grounds Unity, MapTool acepta `.dd2vtt`, y Foundry lo hace
mediante un módulo de terceros. Y trae una limitación declarada que es justo la que lo separa del
formato siguiente: *«Maps are flat, single images—no animations or individually selectable tokens»*
([Arkenforge, Universal VTT files](https://arkenforge.com/universal-vtt-files/)).

**Lo que hace a este formato interesante para este proyecto no es la imagen: es el campo de línea de
visión.** Un mapa `.dd2vtt` llega con los muros ya dibujados como coordenadas. Ese es exactamente el
dato de entrada que necesita un cálculo de visibilidad en el servidor (sección 6), y llega gratis,
dibujado por la herramienta de arte, sin que aquí se escriba un editor de muros. Un mapa importado
así **puede tener niebla de verdad el mismo día que se sube**; una imagen PNG suelta, no.

### Si algún día hay tiles de verdad, el estándar es Tiled

Tiled es el editor de mapas por tiles con el que se hace prácticamente todo el 2D independiente, y
su formato **TMX** almacena metadatos del mapa, conjuntos de tiles (como hoja de sprites o como
colección de imágenes), capas de varios tipos —de tiles, de objetos, de imagen y de grupo— y objetos
de forma libre con propiedades. Soporta las orientaciones *«orthogonal, isometric, oblique, staggered
y hexagonal»*, y codifica los datos de una capa en **base64** con compresión opcional, en **CSV**, o
en XML sin codificar, esto último ya obsoleto
([Tiled, formato TMX](https://doc.mapeditor.org/en/stable/reference/tmx-map-format/)).

Y tiene un **JSON de primera clase**, no una exportación de segunda: los mismos campos con nombres
ligeramente distintos —*«The fields found in the JSON format differ slightly from those in the TMX
Map Format, but the meanings should remain the same»*—, exportable desde la interfaz y desde la
línea de órdenes con `--export-map`
([Tiled, formato JSON](https://doc.mapeditor.org/en/stable/reference/json-map-format/)).

**La diferencia práctica**, que es la que decide: un `.uvtt` es una foto con muros; un `.tmj` es una
estructura de casillas donde cada casilla es un dato consultable. Para «un mapa de mazmorra sobre el
que se mueven fichas», lo segundo es peso muerto. Para «objetos interactivos, puertas que se abren y
suelos con propiedades», lo primero se queda corto.

---

## 4 · Qué pasa cuando el jugador está en el móvil

La respuesta corta, para el único caso que se pudo verificar de primera mano, es que **no hay
respuesta**. La página oficial de requisitos de Foundry VTT **no menciona los dispositivos móviles
ni las tabletas en ningún punto**. Lo que sí menciona, sobre el dispositivo de entrada, es esto:

> «A mouse. You can use the software with a touchpad but the current software is designed for mouse
> and keyboard.»
> — [Foundry VTT, requisitos](https://foundryvtt.com/article/requirements/)

Y, sobre el navegador, que Safari no es compatible —*«Safari is not a supported browser at this
time»*—, lo cual en la práctica excluye el navegador por defecto de todo iPhone y todo iPad.

De Roll20 y de Owlbear Rodeo **no se afirma nada aquí**, por el 403 de sus servidores documentado en
la sección 0. Owlbear Rodeo es precisamente la plataforma que se recuerda como la que mejor funciona
en tableta, y no haberlo podido comprobar es el hueco más molesto de este estudio; queda anotado
para que quien retome M1 con buscador disponible lo cierre.

**Lo que sí se puede concluir sin fuente externa**, porque se deduce del propio encargo: la mesa del
autor es **presencial**, y en una mesa presencial el teléfono del jugador **no es donde se mira el
tablero** —el tablero está en la mesa o en la pantalla del DM—, es donde se mira **la propia hoja**.
Eso invierte la pregunta. Diseñar el tablero para que quepa en un móvil es resolver un problema que
la mesa del autor no tiene, y a un coste alto: desplazar, acercar y arrastrar con precisión de
casilla en una pantalla de cinco pulgadas es de las cosas más difíciles que hay en interfaz táctil.
Diseñar **la hoja y las tiradas** para el móvil es barato, ya está medio hecho, y es lo que el
jugador de verdad va a tener en la mano.

---

## 5 · Las elecciones: rejilla y formato

### Rejilla: **cuadrada**, y el tipo guardado en el tablero desde el primer día

Se elige **cuadrada**, con estas razones y en este orden:

1. **Es la rejilla del sistema que se está modelando.** La mecánica del proyecto vive en pies y en
   múltiplos de cinco, y esa decisión ya está escrita y razonada en
   [distancias y movimiento](./2026-09-02-distancias-y-movimiento-design.md): *se guarda en pies, se
   enseña en metros*. Una casilla cuadrada es la unidad en la que esas cifras están expresadas.
2. **Es la rejilla que asumen los mapas que se van a importar.** El Universal VTT declara el tamaño
   del mapa **en casillas** y los **píxeles por casilla**: un modelo cuadrado. Elegir hexágonos
   obligaría a reinterpretar los metadatos de cada mapa importado, que es trabajo inventado para
   resolver un problema que nadie tiene.
3. **Es la más barata en el sitio donde el coste importa**, que no es dibujar: es **calcular
   visibilidad**. Un conjunto de casillas cuadradas se indexa con dos enteros, se compara con
   igualdad y se comprime por filas. Un hexágono exige elegir un sistema de coordenadas —axial,
   cúbico o desplazado— y esa elección se filtra a la API, a las pruebas y a la base.

**Y una cosa que sí se hace desde el primer día aunque no se use:** el tablero guarda **su tipo de
rejilla y su distancia por casilla** como campos, no como constantes en el código. El hexágono no se
implementa, pero el día que se implemente es un valor nuevo en una enumeración y un módulo de
geometría distinto, **no una migración de todas las coordenadas guardadas**. Cuesta dos campos hoy y
ahorra una reescritura después; es la misma lógica con la que
[el estudio de cajas](./2026-09-02-cajas-estudio.md) decidió guardar la condición de una regla como
lista y no como texto, para que el lienzo futuro no tuviera que migrar nada.

**Sobre las diagonales, se declara un hueco.** El SRD 5.1 tiene una regla de movimiento en diagonal
y el manual tiene una variante distinta, y **no se han podido verificar sus textos exactos en esta
sesión**, sin buscador. La recomendación es tratar la diagonal como **un dato de configuración del
tablero**, no como una constante, y confirmar la regla por defecto contra el SRD al escribir M1. Que
la distancia sea un cálculo y no un número guardado ya es doctrina del proyecto —la velocidad
efectiva se calcula al leer, con su traza— y aquí aplica igual.

### Formato: **Universal VTT** para mapas, **Tiled JSON** para tiles, y nada más

**Se elige `.dd2vtt` / `.uvtt` como formato de importación de mapas de batalla.** La razón decisiva
no es que sea popular: es que **trae las líneas de visión dentro**. Este proyecto ha decidido que la
niebla se calcula en el servidor, y un cálculo de visibilidad necesita saber dónde están los muros.
Ese dato, en cualquier otro camino, lo tiene que dibujar alguien a mano en un editor que aquí no se
va a construir. El Universal VTT lo entrega ya hecho, exportado por la herramienta de arte que el DM
prefiera, y por eso **es el formato que hace posible la decisión de diseño que da nombre a este
estudio**. Cualquier otro la encarece.

Con dos caminos de entrada, no uno:

- **El camino bueno:** se sube un `.dd2vtt` y el servidor extrae imagen, píxeles por casilla, tamaño
  en casillas, muros, portales y luces. La niebla dinámica es posible desde el primer día.
- **El camino mínimo:** se sube un PNG o un WEBP suelto y se pregunta **una sola cosa**, cuántos
  píxeles mide una casilla. Sin muros, así que sin visión dinámica: la niebla de ese tablero es la
  que el DM revela a mano (sección 7). Es el camino que hace que la mesa de la semana que viene
  pueda jugarse con el mapa que el autor ya tiene.

**Se elige Tiled JSON (`.tmj`) para el día que haya tiles de verdad**, y ese día no es hoy. Es la
elección obvia por ser el estándar de facto del 2D y por tener un JSON de primera clase que se lee
sin escribir un analizador de XML. Pero **importar un `.tmj` no es lo mismo que soportarlo**: un
mapa de Tiled trae conjuntos de tiles que son ficheros aparte, capas de objetos con propiedades
arbitrarias y hasta cinco orientaciones distintas, y aceptar todo eso es un trabajo grande al
servicio de una funcionalidad —«objetos interactivos y tiles»— que el plan sitúa detrás de otras
cinco tareas.

**Los dos formatos que no se soportan, y por qué:** el JSON de escena de Foundry y los formatos
propietarios de otras plataformas. Son volcados internos de un modelo de datos ajeno; importar uno
es adoptar el modelo entero de otro producto, incluida su forma de resolver la niebla, que es justo
la que este estudio dice que no hay que copiar.

---

## 6 · Cómo se filtra la visibilidad por coordenadas en el servidor

Esta es la parte que más importa y donde el encargo pedía mojarse. Lo que sigue es una propuesta, no
un contrato: el contrato es **M1** y lo escribe el orquestador. Pero es una propuesta con forma, no
un principio.

### La idea en una frase

**El servidor no envía un tablero y una máscara: envía el tablero que ese espectador puede ver.** Dos
jugadores que piden el mismo tablero reciben dos respuestas distintas, con distinto número de fichas
y distinto número de muros, y ninguna de las dos contiene nada que su destinatario no deba saber. La
máscara negra que el cliente pinta encima es **decoración**, y si alguien la borra con la consola no
aparece nada debajo, porque debajo no hay nada.

### Las tres piezas de datos

**Una ficha de tablero no es un personaje.** Es una pieza colocada, con su tablero, sus coordenadas
enteras en casillas, su tamaño en casillas, su retrato, y **un enlace opcional a una entidad del
mundo**. Que sea una cosa aparte resuelve de un plumazo tres problemas: un mismo personaje puede
tener ficha en dos tableros, un monstruo genérico puede tener seis fichas sin seis entidades, y **la
posición se puede filtrar sin tocar el modelo de personaje**, que es lo que
[distancias y movimiento](./2026-09-02-distancias-y-movimiento-design.md) decidió a propósito dejar
sin coordenadas.

**Un tablero tiene una geometría y unos muros.** Tipo de rejilla, casillas de ancho y de alto,
píxeles por casilla, distancia por casilla y unidad. Los muros son segmentos —los que trae el
`.dd2vtt`— y son **información del mundo**, no decorado: la silueta de una mazmorra dice dónde hay
habitaciones.

**Una exploración es por espectador y por tablero.** El conjunto de casillas que esa persona ha
llegado a ver alguna vez. Es el mismo concepto que el `FogExploration` de Foundry, con la diferencia
de que aquí **se usa para filtrar, no solo para restaurar la máscara**.

### El cálculo, en tres capas que se aplican en orden

Ante una petición del estado de un tablero, el servidor resuelve **quién pregunta** —del token de
sesión, jamás de un parámetro— y calcula:

**Capa 1 — Las casillas que ese espectador puede ver ahora mismo.**

```
visibles(espectador) = exploradas(espectador, tablero)  ∪  visión_activa(espectador)
```

`exploradas` es el conjunto persistido. `visión_activa` es la unión, para cada ficha que el
espectador controla, de las casillas alcanzables desde ella dentro de su radio de visión y sin un
muro por medio. Un DM tiene todas las casillas, y eso es lo único que cambia entre un DM y un
jugador: **el mismo endpoint, con otro espectador**, exactamente como pide la tarea F8 para el «Ver
como» de campaña. El DM no llama a otra ruta: llama a la misma y recibe más.

**Capa 2 — Las fichas.** Una ficha entra en la respuesta si y solo si se cumplen **las dos** cosas:

1. **Su casilla está en `visibles`** — el filtro nuevo, por coordenadas.
2. **`canView` la deja pasar** — el filtro de siempre, sobre la entidad del mundo enlazada, si la
   hay. `canView` (`apps/api/src/common/visibility.ts`) sigue siendo el dueño único de «quién ve
   qué» y **aquí no se reimplementa ni se rodea**: la visibilidad por coordenadas es una condición
   **adicional**, nunca sustitutiva.

**Capa 3 — La redacción de lo que sí pasa.** Que una ficha sea visible no significa que se envíe
entera. Lo que va al jugador es lo que se pinta: posición, tamaño, retrato, y el nombre **solo si
`canView` lo permite**. Los puntos de golpe, la Clase de Armadura y las notas del DM no viajan
porque el retrato viaje. Es la misma frontera que el proyecto ya aplica en los listados de
entidades, aplicada a un objeto nuevo.

Y los muros se filtran igual: **solo los segmentos que tocan una casilla explorada**. Enviar el
trazado completo de la mazmorra a quien está en la primera sala es regalar el plano.

### Las cuatro fugas que este diseño tiene que cerrar a propósito

Ninguna es hipotética; las cuatro son la forma que toma este fallo cuando se implementa de prisa.

**La fuga por conteo.** Una respuesta que diga «hay 3 fichas ocultas» es una respuesta que las
reveló. **No se envían huecos.** Si no se ve, no existe en la respuesta, y el cliente no puede
distinguir «no hay nadie» de «no lo veo». Esto tiene un precio honesto: el DM tampoco puede mandar un
«hay algo ahí» sin decir qué, y si algún día quiere ese efecto tendrá que ser **una ficha de
verdad**, colocada por él, cuya visibilidad diga «se ve un bulto».

**La fuga por identificador.** Un identificador estable que aparece y desaparece es un rastreador: si
una ficha estaba en la respuesta hace un turno y ahora no, el enemigo se ha movido. Cuando llegue la
fase 4 y haya eventos, **un evento de movimiento no se emite a quien no ve ni el origen ni el
destino** — y el caso peligroso es justo el intermedio, cuando alguien sale de la vista: lo que se
emite entonces es «desaparece de tu vista», no «se movió a tal sitio».

**La fuga por temporización.** Si el servidor tarda más en responder cuando hay muchas fichas ocultas
cerca, el tiempo de respuesta es un canal. Es un riesgo menor y **no se propone mitigarlo** en la
primera versión; se anota para no descubrirlo con cara de sorpresa.

**La fuga por el propio movimiento.** El servidor valida que quien mueve una ficha la posee, que el
destino está dentro del tablero, y **que el origen estaba en su conjunto visible**. Sin esa tercera
comprobación, arrastrar una ficha a ciegas por el mapa es un sonar: se prueba a moverla y el rechazo
dice si había un muro.

### Dos personas moviendo a la vez

La propuesta es la más simple que no pierde datos: **cada ficha lleva una versión**, quien mueve
manda la versión que leyó, y el servidor rechaza con 409 si ha cambiado. La ficha es la unidad de
conflicto, no el tablero, así que dos jugadores moviendo fichas distintas nunca chocan y dos personas
moviendo la misma sí. Es la misma doctrina que ya rige en el proyecto para las restricciones que
puede garantizar la base: se detecta el choque y se traduce a un código legible, en vez de esperar
que no ocurra.

### Lo derivado se calcula, no se guarda

El conjunto de casillas visibles **no se persiste**. Se calcula al leer, como la velocidad efectiva y
por la misma razón escrita en
[distancias y movimiento](./2026-09-02-distancias-y-movimiento-design.md): guardar un derivado
significa que el día que se corrija la fórmula habrá mil filas mintiendo — y aquí una fila que miente
es una posición filtrada. Lo único que se persiste es la exploración, que no es derivada: es
historia, y la historia sí se acumula.

Si el cálculo resulta caro, la salida **no** es guardarlo: es memorizarlo por tablero, espectador y
versión del tablero, e invalidarlo cuando algo se mueve. Un tablero de 40×30 casillas son 1.200
celdas, y un trazado de rayos sobre unas decenas de segmentos de muro es trabajo de milisegundos;
además, **la primera versión ni siquiera traza rayos** (sección 7).

### La prueba que demuestra que esto funciona no es visual

Está ya escrita como criterio de M4 en el plan y conviene repetirla aquí porque es la única que
cuenta: **una petición hecha como jugador cuya respuesta no contiene la ficha oculta.** Una captura
de pantalla con un rectángulo negro no prueba nada —es exactamente lo que Foundry y MapTool también
enseñarían—, y las cuatro incidencias de la sección 1 son la demostración de que esa captura puede
estar en verde mientras el dato se escapa por otro control.

Dos pruebas más, del mismo tipo, que deberían existir desde el primer día: **la misma petición hecha
por el DM y por un jugador devuelve distinto número de fichas**, y **mover una ficha por una zona no
explorada por un jugador no cambia nada de lo que ese jugador recibe**.

---

## 7 · El tablero mínimo que sirve para jugar

Si hubiera que entregar algo en dos semanas para una mesa **presencial**, esto es lo que entra, y el
criterio para incluir cada pieza ha sido el mismo: *¿se puede jugar sin ella?*

**Entra:**

- **Un tablero por sesión**, con imagen de fondo y un único número pedido al subirla: los píxeles por
  casilla. Rejilla cuadrada dibujada encima, con desplazar y acercar.
- **Fichas que se arrastran y se sueltan ajustadas a la casilla**, con el retrato del personaje. El
  servidor valida propiedad y límites del tablero y guarda coordenadas enteras.
- **Niebla revelada a mano por el DM**: el DM marca las regiones que quedan reveladas, y el servidor
  **filtra las fichas contra esa región** exactamente como describe la sección 6. Es niebla de verdad
  —filtrada en el servidor, no pintada en el cliente— **sin necesidad de muros ni de trazado de
  rayos**, que es la parte cara. Y es lo que un DM hace de todas formas cuando lleva a un grupo por
  una mazmorra: enseñar la sala en la que están.
- **La hoja al lado y la tirada dentro**, en la misma pantalla, sin cambiar de vista. Es literalmente
  lo que se pidió, y es la mitad del valor de todo el bloque.
- **Sin tiempo real: se recarga.** TanStack Query ya está en la pila y un `refetchInterval` de dos o
  tres segundos es indistinguible de tiempo real para una mesa presencial donde la gente ya se está
  mirando a la cara. **No compromete la fase 4**: el día que haya WebSocket, lo que cambia es qué
  dispara el refresco, no la forma de la respuesta.

**Y una decisión de dibujo que evita cambiar de pila:** el tablero mínimo se pinta con **SVG y DOM
dentro de React**, no con un motor de juego. Unas decenas de fichas y una rejilla de mil celdas las
mueve el navegador sin despeinarse, y a cambio se conserva todo lo que ya funciona: los tokens de
color, el foco de teclado, las pruebas de RTL, el contraste medido. Si un día no aguanta, **PixiJS
entra como un componente hoja dentro de React**, ocupando el rectángulo del lienzo y nada más.
Cambiar a un motor de juego para toda la interfaz sería exactamente la recomendación mala que el
encargo advertía.

**No entra, y hay que decirlo antes de empezar y no después:** visión dinámica por personaje, muros,
luces, objetos interactivos, tiles, movimiento medido contra la velocidad, iniciativa sobre el
tablero, plantillas de área, y rejilla hexagonal.

---

## 8 · Qué NO se hace, y por qué

**No se pinta la niebla en el cliente.** Es la conclusión entera de este documento y la única regla
del bloque que no admite excepción «temporal»: una versión que envía todo y tapa se queda, porque
nadie reescribe algo que ya se ve bien. Si en una tarea concreta filtrar en el servidor resulta caro,
la salida es **entregar menos funcionalidad**, no entregarla con cortina.

**No se construye un editor de mapas, de muros ni de arte.** La decisión es de la fase 3 y aquí se
confirma con un argumento nuevo: el Universal VTT ya trae los muros dibujados, así que el editor que
habría que escribir es un editor cuyo trabajo ya hizo otro programa mejor.

**No se hace visión dinámica en la primera versión.** Radio de visión, muros y trazado de rayos son
la diferencia entre dos semanas y dos meses, y la niebla revelada a mano por el DM da la mayor parte
del valor en una mesa presencial. El diseño de la sección 6 la admite sin cambiar de forma: cambia
qué alimenta la visión activa, no el filtro.

**No se hace rejilla hexagonal**, aunque el campo exista. Un hexágono obliga a elegir sistema de
coordenadas, y esa elección se filtra a la API, a las pruebas y a la base de datos. Se paga cuando
alguien lo pida, no antes.

**No se hace un motor de iluminación.** Luces con color, intensidad y sombras suaves son un producto
entero. El `.dd2vtt` las trae y se pueden guardar sin pintarlas: guardar un dato que no se usa es
barato, pintarlo bien no lo es.

**No se valida el movimiento contra la velocidad del personaje** en la primera versión. El servidor
comprueba propiedad, límites y que el origen fuera visible; **no** comprueba si al personaje le
quedaban pies. Esa cuenta ya existe en 2A como cálculo con traza, y conectarla al tablero es una
tarea con nombre propio, no un efecto secundario de arrastrar.

**No se hace tablero para el móvil.** Se hace **hoja** para el móvil. La justificación está en la
sección 4 y se resume en que la mesa del autor es presencial y el teléfono no es donde se mira el
mapa.

**No se cambia de pila.** React, Vite, TanStack Query, Zustand y Tailwind delante; NestJS, Prisma y
PostgreSQL detrás. Un tablero no exige un motor de juego, y lo único que este estudio deja abierto es
que PixiJS entre **como componente**, dentro del árbol de React, el día que el SVG deje de aguantar y
con una medición delante que lo demuestre.

**No se importa el formato de escena de otra plataforma.** Importar un volcado del modelo de datos de
otro producto es adoptar su modelo, y su modelo resuelve la niebla en el cliente.

---

## Fuentes citadas

Todas se consultaron el 2026-09-02 por descarga directa. Las que devolvieron 403 están anotadas en la
sección 0 y **no se han citado como respaldo de ninguna afirmación**.

- [Foundry VTT — API, clase `Token` (`isVisible`)](https://foundryvtt.com/api/classes/foundry.canvas.placeables.Token.html)
- [Foundry VTT — API, clase `BaseToken`](https://foundryvtt.com/api/classes/foundry.documents.BaseToken.html)
- [Foundry VTT — API, clase `TokenDocument` (`move`, `movementHistory`)](https://foundryvtt.com/api/classes/foundry.documents.TokenDocument.html)
- [Foundry VTT — API, clase `FogExploration`](https://foundryvtt.com/api/classes/foundry.documents.FogExploration.html)
- [Foundry VTT — Iluminación y niebla de guerra (artículo oficial)](https://foundryvtt.com/article/lighting/)
- [Foundry VTT — Escenas: rejilla, tamaño de casilla y escala](https://foundryvtt.com/article/scenes/)
- [Foundry VTT — Requisitos del sistema](https://foundryvtt.com/article/requirements/)
- [foundryvtt/foundryvtt#2943 — el rastreador de combate desplaza la vista hasta fichas ocultas](https://github.com/foundryvtt/foundryvtt/issues/2943)
- [RPTools/maptool#553 — nombres de PNJ visibles sobre la niebla](https://github.com/RPTools/maptool/issues/553)
- [RPTools/maptool#890 — los jugadores pueden seleccionar fichas bajo niebla dura](https://github.com/RPTools/maptool/issues/890)
- [RPTools/maptool#5762 — «Visible over FoW» muestra fichas sin línea de visión](https://github.com/RPTools/maptool/issues/5762)
- [Arkenforge — Universal VTT files (`.uvtt` / `.dd2vtt` / `.df2vtt`)](https://arkenforge.com/universal-vtt-files/)
- [Tiled — TMX Map Format](https://doc.mapeditor.org/en/stable/reference/tmx-map-format/)
- [Tiled — JSON Map Format](https://doc.mapeditor.org/en/stable/reference/json-map-format/)
