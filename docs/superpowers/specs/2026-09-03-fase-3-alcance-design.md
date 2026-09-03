# Fase 3 — alcance: los ficheros, el mapa del mundo y el tablero de la mesa

> Escrito el 2026-09-03, al cerrar la fase 2C y desplegarla. **Manda sobre el plan maestro** en
> todo lo que se refiere a la fase 3, igual que hicieron
> [el alcance de la fase 2](./2026-09-01-fase-2-alcance-design.md) y
> [el de 2C](./2026-09-03-fase-2C-alcance-design.md) con las suyas.
>
> **Qué es esto.** Hasta dónde llega la fase 3, qué trae, qué **no** trae, y qué decisiones son del
> autor. No es un plan de tareas: el plan se escribe cuando esto esté firmado.
>
> **Sobre qué se apoya, para no repetirlo.** El trabajo duro de investigación ya está hecho en dos
> documentos y este los da por leídos:
> [el estudio de mesas virtuales](./2026-09-02-mesas-virtuales-estudio.md) —niebla, movimiento,
> formatos y móvil— y [la decisión sobre editores y assets](./2026-09-01-fase-3-assets-y-editores-design.md).

## 1 · El plan maestro dice una cosa y el autor pidió otra

El plan maestro define la fase 3 en una línea:

> **3 — Maps 2D**: subir mapa, marcas ligadas a entidades, niebla simple, capas DM/jugador.
> *Criterio de salida: usado en una sesión real con al menos un mapa.*

Y el 2026-09-02 el autor pidió, textualmente, otra cosa:

> *«yo no quiero un juego plano; quiero que los jugadores tengan una interfaz donde vean el mapa, su
> hoja, sus tiradas y demás dentro de una misma pantalla, con objetos interactivos renderizados y
> tiles, como las plataformas clásicas de D&D».*

**Las dos frases describen productos distintos.** La del plan es un documento con chinchetas: una
imagen del reino con pines que abren fichas del mundo. La del autor es una **mesa virtual**: una
pantalla de partida donde se juega. La primera se usa **entre sesiones**; la segunda, **durante**.

Este documento no elige una y descarta la otra, porque **las dos son útiles y no compiten**: son dos
artefactos con dos usos, y meterlas en la misma línea del plan es lo que ha tenido la fase 3 sin
poder empezar. Lo que hace es separarlas, ponerles precio y ordenarlas.

### Una aclaración de vocabulario que ahorra semanas

**«Tiles» no es lo que hacen las plataformas clásicas de D&D.** Roll20, Foundry y Fantasy Grounds
pintan **una imagen de fondo con una rejilla encima**; no componen el suelo con azulejos de un
conjunto. El estudio de mesas virtuales lo dice con todas las letras: *«un mapa de batalla no es un
tablero de tiles»*.

Eso importa porque un motor de tiles de verdad —conjuntos de azulejos, capas, autotiling, un editor
o un importador de Tiled— es **un producto entero**, y no es el que da la sensación que el autor
describe. Lo que la da es: **fondo, rejilla, fichas que se arrastran, y la hoja al lado**. Si tras
usarlo se echa de menos el suelo compuesto, entonces se importa Tiled JSON, que es la puerta barata
y está estudiada.

> **Decidido por el autor el 2026-09-03:** los azulejos **sí** se quieren, y **por la puerta
> barata**. Es decir: **importar Tiled JSON, no escribir un editor.** Tiled es gratuito, lo usa
> quien dibuja mapas de azulejos, y su fichero trae el conjunto y la rejilla ya resueltos — el
> trabajo que costaría un editor propio ya está hecho, mantenido y probado por otro.
>
> **Qué significa «barato», con precisión, para que nadie lo reinterprete luego:** el tablero lee
> un `.tmj`/`.json` de Tiled y **lo pinta**; el mapa es un dato que entra, no un dato que se edita
> aquí. **No** entra un lienzo de dibujo, **ni** paleta de azulejos, **ni** autotiling, **ni**
> capas editables, **ni** guardar de vuelta al formato de Tiled. Colocar el azulejo es trabajo de
> Tiled; colocar la **ficha** encima es trabajo de esta plataforma, y ahí sí manda la niebla del
> servidor.
>
> **Y no va en la primera versión de 3.C.** El fondo de imagen con `.uvtt` es el camino corto y el
> que ya usan las mesas que pusiste de ejemplo; el importador de Tiled entra **detrás**, como una
> segunda fuente de fondo, cuando el tablero ya se haya jugado. Si entra antes, se paga el doble:
> el formato y la pantalla a la vez.

## 2 · La fase 3 son tres cosas, y cada una tiene su propio «terminado»

| | Qué es | Cuándo se usa | Sin ella, qué falta |
|---|---|---|---|
| **3.A · El almacén de ficheros** | Subir imágenes y adjuntos, organizados por campaña, **con visibilidad** | Siempre | **Es la base de las otras dos**: sin almacenamiento no hay mapa que subir ni retrato que pintar |
| **3.B · El mapa del mundo con marcas** | Una imagen del reino con pines que abren fichas de mundo | Entre sesiones, y al presentar un lugar | La wiki tiene lugares y **no tiene dónde están** |
| **3.C · El tablero de la mesa** | Fondo con rejilla, fichas que se arrastran, niebla filtrada en el servidor, y la hoja al lado | Durante la partida | Es la pantalla que el autor pidió |

**El orden no es negociable y sale del propio material**: 3.A primero porque las otras dos cuelgan
de ella; 3.B antes que 3.C porque es **cinco veces más barata** y porque enseña dónde falla el
almacén con datos reales antes de construir lo caro encima.

## 3 · La columna vertebral: la niebla se filtra en el servidor

Es la conclusión del estudio de mesas virtuales y la única regla de esta fase que **no admite
excepción temporal**:

> **No se encontró ninguna plataforma, entre las verificables con fuente primaria, que filtre la
> posición de una ficha en el servidor.** Foundry decide la visibilidad **en el navegador** —su
> propia API lo dice—, y MapTool acumula fallos de la misma forma: el dato ya estaba en el cliente y
> la interfaz lo enseñó por descuido.

Lo que para este proyecto ya es doctrina —*«si no se debe saber, no se envía»*— resulta ser, aquí,
**la única ventaja de diseño real frente a plataformas con diez años de ventaja**. No es una
restricción que cueste: es la característica.

**En una frase:** el servidor no envía un tablero y una máscara; **envía el tablero que ese
espectador puede ver**. Dos jugadores que piden el mismo tablero reciben dos respuestas distintas,
con distinto número de fichas. La máscara negra que pinta el cliente es decoración, y si alguien la
borra con la consola **no aparece nada debajo, porque debajo no hay nada**.

Y una consecuencia que hay que aceptar de antemano: **si filtrar en el servidor resulta caro en una
tarea concreta, la salida es entregar menos funcionalidad, no entregarla con cortina.** Una versión
que envía todo y tapa se queda para siempre, porque nadie reescribe algo que ya se ve bien.

## 4 · Qué trae cada bloque, y qué lo cierra

### 3.A · El almacén de ficheros

Lo que la fase 1 aplazó y todo lo demás necesita: **subir una imagen y que sobreviva a un
redespliegue**.

- Almacenamiento de objetos (**MinIO en desarrollo, S3 o compatible en producción**), no ficheros en
  el disco del contenedor: el contenedor se recrea en cada despliegue y se llevaría las imágenes.
- **Un fichero es un objeto del mundo con visibilidad**, como todo lo demás: se sube a una campaña,
  tiene nivel de visibilidad y **lo sirve el servidor**, nunca una URL pública adivinable. Un retrato
  de un PNJ `DM_ONLY` no puede leerse por saber su identificador.
- **Retratos** de personaje y de PNJ, y **adjuntos** en una ficha del mundo — las dos cosas que la
  fase 1 dejó anotadas como diferidas.
- Límites declarados: tipos aceptados, tamaño máximo, y qué pasa al superarlo (un 400 que se lee).

**Cierra con:** un retrato subido por el DM se ve en la ficha, **sobrevive a un redespliegue**, y el
de una ficha `DM_ONLY` **devuelve 404 a un jugador** aunque tenga el enlace exacto — comprobado sobre
la respuesta, no sobre la pantalla.

### 3.B · El mapa del mundo con marcas

El «mapa 2D con pines» del plan maestro, que sigue siendo útil y ahora es barato.

- Una imagen por campaña (o varias: el reino, la ciudad, la mazmorra en limpio) con **marcas
  colocadas encima**, cada una enlazada a una entidad del mundo.
- La marca hereda la visibilidad **de su entidad**: si el jugador no puede ver esa ficha, **la marca
  no viaja**. No hay un segundo modelo de permisos que mantener.
- Pulsar una marca abre la ficha. Es la misma navegación que ya tiene la wiki, con otra puerta.

**Cierra con:** un jugador abre el mapa del reino, ve seis marcas de las nueve que el DM colocó, y
las tres que faltan **no están en la respuesta**.

### 3.C · El tablero de la mesa

La pantalla que el autor pidió. El estudio la tiene dimensionada en **dos semanas** con este alcance
exacto, y el alcance es exacto a propósito.

- **Un tablero por sesión**, con imagen de fondo y **un solo número al subirla: los píxeles por
  casilla**. Rejilla cuadrada encima, con desplazar y acercar.
- **Fichas que se arrastran y se ajustan a la casilla**, con el retrato. Una ficha de tablero **no es
  un personaje**: es una pieza colocada, con coordenadas en casillas y un enlace **opcional** a una
  entidad. Eso permite que un mismo personaje esté en dos tableros, que un monstruo genérico tenga
  seis fichas sin seis entidades, y —lo importante— que **la posición se filtre sin tocar el modelo
  de personaje**.
- **Niebla revelada a mano por el DM**: marca las regiones reveladas y el servidor **filtra las
  fichas contra esa región**. Es niebla de verdad, filtrada en el servidor, **sin muros ni trazado de
  rayos**, que es la parte cara. Y es lo que un DM hace de todas formas: enseñar la sala donde están.
- **La hoja al lado y la tirada dentro**, en la misma pantalla. Es literalmente lo que se pidió, y es
  la mitad del valor del bloque.
- **Sin tiempo real: se sondea.** Un refresco cada dos o tres segundos es indistinguible del tiempo
  real en una mesa presencial donde la gente se está mirando a la cara. **No compromete la fase 4**:
  el día que haya WebSocket cambia *qué dispara el refresco*, no la forma de la respuesta.
- **Se pinta con SVG y DOM dentro de React**, no con un motor de juego. Unas decenas de fichas y una
  rejilla de mil casillas las mueve el navegador sin despeinarse, y a cambio se conserva lo que ya
  funciona: los tokens de color, el foco de teclado, las pruebas de RTL, el contraste medido. Si un
  día no aguanta, **PixiJS entra como un componente hoja**, ocupando el rectángulo del lienzo y nada
  más.
- **Importación de mapas en Universal VTT** (`.uvtt` / `.dd2vtt` / `.df2vtt`): imagen y metadatos
  —incluidas las líneas de visión— en un solo fichero. Es el formato que se ha impuesto, y lo generan
  los programas con los que la gente ya dibuja. Los muros se **guardan** aunque la primera versión no
  los use para ver: guardar un dato que no se pinta es barato.

**Cierra con:** una sesión jugada de verdad sobre un tablero, y **la prueba que demuestra que la
niebla funciona, que no es visual**: dos peticiones al mismo tablero con dos sesiones distintas
devuelven **distinto número de fichas**, y la del jugador **no contiene** las coordenadas de lo que
no ha visto.

## 5 · Lo que la fase 3 NO hace, dicho antes y no después

- **Ningún editor de arte, de mapas ni de muros.** Decisión ya tomada y aquí confirmada con un
  argumento nuevo: el Universal VTT **ya trae los muros dibujados**, así que el editor que habría que
  escribir es uno cuyo trabajo ya hizo otro programa mejor.
- **Ni editor de azulejos, ni autotiling, ni paleta, ni capas editables, ni exportar a Tiled.**
  Los azulejos entran **importando Tiled JSON**, que es la decisión del autor del 2026-09-03 (§1), y
  entran **después** de que el tablero con fondo de imagen se haya jugado. Escribir el editor sigue
  fuera de la fase 3, y probablemente fuera de todas.
- **Ni visión dinámica por personaje, ni muros que tapen, ni iluminación.** Radio de visión y trazado
  de rayos son la diferencia entre dos semanas y dos meses. El diseño de la niebla los admite después
  **sin cambiar de forma**: cambia qué alimenta la visión activa, no el filtro.
- **Ni rejilla hexagonal.** El campo se guarda desde el primer día para que el hexágono sea un dato
  nuevo y no una reescritura, pero elegir sistema de coordenadas hexagonales se filtra a la API, a
  las pruebas y a la base. Se paga cuando alguien lo pida.
- **Ni iniciativa, ni orden de turnos, ni plantillas de área, ni aplicar daño desde el tablero.** Eso
  es **Encuentros**, y Encuentros no está en el plan maestro: es una fase por escribir. El tablero de
  la fase 3 **coloca y enseña**; no arbitra.
- **Ni validar el movimiento contra la velocidad.** El servidor comprueba propiedad, límites y que el
  origen fuera visible; **no** comprueba si al personaje le quedaban pies. Ese cálculo ya existe en
  2A con su traza, y conectarlo es una tarea con nombre propio.
- **Ni tablero en el móvil.** Se hace **hoja** para el móvil. La mesa del autor es presencial y el
  teléfono no es donde se mira el mapa.
- **Ni importar la escena de otra plataforma.** Importar el volcado del modelo de datos de otro
  producto es adoptar su modelo, y su modelo resuelve la niebla en el cliente.
- **Ni cambiar de pila.** React, Vite, TanStack Query, Zustand y Tailwind delante; NestJS, Prisma y
  PostgreSQL detrás.

## 6 · Lo que esta fase le deja a la 4, y por qué no la compromete

La fase 4 es **tiempo real**: WebSockets, presencia, hoja y sesión en vivo, actividad. La fase 3 se
construye con sondeo **a propósito**, y eso no es deuda escondida sino una frontera declarada:

- La **forma de la respuesta** del tablero es la misma con sondeo que con empuje. Lo que la fase 4
  cambia es **quién avisa**, no **qué se envía** — y «qué se envía» es donde vive el filtrado por
  espectador, que es la parte difícil y la que ya estará hecha.
- El filtrado por espectador **hace más difícil el tiempo real**, y conviene saberlo ahora: no se
  puede emitir un mensaje único a todos los conectados, porque cada uno recibe un tablero distinto.
  La fase 4 tendrá que emitir **por espectador**, o emitir un aviso pelado —«el tablero cambió»— y
  que cada cliente vuelva a pedir lo suyo. **La segunda opción es la barata y la que conserva la
  garantía**, y esta fase la deja preparada gratis.

## 7 · Las decisiones que son del autor

1. **¿Se hacen las tres, o solo el tablero?** El almacén (3.A) es obligatorio para cualquiera de las
   otras dos. Entre el mapa del mundo (3.B) y el tablero (3.C), **el barato es el del mundo** y el
   que se pidió es el tablero. Se pueden hacer los dos, en ese orden, o saltarse el del mundo.
2. **¿Dónde vive el tablero?** ¿Es una pestaña más de la campaña, o es **la pantalla de la sesión en
   curso** —la mesa— con la hoja al lado? La segunda es lo que la petición describe y obliga a
   rediseñar la pantalla de sesión.
3. **La pantalla la diseña el autor**, según dijo. Antes de dibujarla hay que saber si eso sigue en
   pie o si se acepta una primera versión funcional para corregir después.
4. **¿Entra el almacenamiento en producción con coste?** MinIO en el propio servidor no cuesta dinero
   pero sí disco y respaldo; S3 cuesta dinero y quita el problema. Hoy **la copia de seguridad de la
   base está rota y declarada**: meter ficheros sin respaldo es multiplicar lo que se puede perder.

## 8 · El riesgo que esta fase trae, y conviene mirarlo de frente

**La fase 3 es la primera que añade un tipo de dato nuevo que no es texto.** Hasta hoy todo lo que
guarda el sistema son filas y JSON validado; un fichero binario trae consigo tamaño, tipos,
caducidad, respaldo y coste. La ficha de la copia de seguridad rota (`docs/06-pendientes.md`) dejó de
ser teórica el día que hubo datos de verdad; con imágenes lo será el doble.

Y el segundo riesgo es de alcance: **el tablero es la pieza que más se parece a un videojuego**, y
por eso la que más fácil se lleva un mes de más en cosas que no se juegan. La lista del §5 existe
para eso, y la forma de usarla es leerla en voz alta cada vez que alguien diga «ya que estamos».
