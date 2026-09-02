# Lo que volvió de Figma Make, y qué se hace con ello

Publicado en `https://sunny-glaze-58905833.figma.site`, a partir del encargo de
[2026-09-02-prompt-figma-make.md](./2026-09-02-prompt-figma-make.md).

**Cómo se revisó.** El sitio es una aplicación de cliente, así que un descargador de páginas solo
ve el cascarón: se abrió con el Chromium de Playwright que ya está instalado, se recorrieron las
veintisiete secciones de su barra lateral y se guardaron sus capturas y su texto. Lo que sigue
está medido, no supuesto.

## Lo que hizo bien, y que conviene decir

**Respetó la paleta y las voces al pie de la letra.** Medido en el navegador: los fondos son
`rgb(16,23,28)` = `#10171C` y `rgb(26,35,41)` = `#1A2329`; el texto `rgb(220,227,230)` =
`#DCE3E6` y el apagado `rgb(139,153,161)` = `#8B99A1`; el cobre `rgb(201,125,70)` = `#C97D46` y
su variante de texto `rgb(221,150,99)` = `#DD9663`; el acento `rgb(74,155,184)` = `#4A9BB8`. Las
familias cargadas son `Marcellus`, `Public Sans` e `IBM Plex Mono`. **Dar los valores exactos en
vez de describir la paleta fue lo que más rindió del encargo.**

**Entendió las dos pieles y el registro.** El cromado es denso y de instrumento; los rótulos van
en versalita con letra espaciada; los números de la ficha en monoespaciada. La cabecera va sobre
fondo más oscuro que lo que enmarca, que era la corrección concreta que se le pidió.

**Construyó un prototipo navegable de verdad**, no una lámina por pantalla: barra lateral con las
cinco secciones —El mundo · La mesa · Herramientas · En compañía · La campaña—, una barra de «En
juego» persistente con el tiempo transcurrido y su «Ir a la mesa», y un **conmutador DM/Jugador**
que no estaba pedido y es exactamente la herramienta que hace falta para juzgar la visibilidad.

## Lo que hay que copiar, y por qué

1. **La regla leída como frase, bajo los carriles.** «*Cuando* Cae a 0 puntos de golpe, *si* Es
   un personaje jugador, *entonces* Marca «inconsciente».», con cada conector coloreado según su
   parte. **Esto nos falta**: nuestro editor *habla* de la frase —«una regla es una frase de tres
   partes»— y no la **pinta**. Es la mejor respuesta posible al «no entendió nada» del DM: si la
   regla no se puede leer en voz alta, el editor ha fallado, y con la frase delante se lee sola.
2. **Los carriles en horizontal, uno junto a otro**, con su rótulo y su glosa debajo —«pasa algo
   (un suceso)», «se cumple (un estado)», «haz esto (un efecto)»—. La frase se lee de izquierda a
   derecha porque **está dispuesta como se lee**.
3. **El aviso que propone el arreglo, con su enlace de acción**: «Nadie deshace esta marca.
   ¿Añades una regla que la quite al acabar el combate? **Añadir reversión**». Es R2 y está mejor
   resuelto de lo que lo teníamos pensado: el aviso no señala, **ofrece**.
4. **La burbuja contextual como una línea de pie**, no como un globo que tapa: «Arrastra una
   pieza de Efectos a la ranura ENTONCES para terminar la regla». Es R3 sin estorbar.
5. **Los dos dados con el descartado a la vista y el rótulo «se queda el alto»**, más el
   desglose `17 = 12 dado +3 destreza +2 competencia`. Es la ventaja explicada sin sintaxis.
6. **La lista de condiciones con su efecto escrito en una línea** debajo del nombre —«Apresado ·
   Velocidad 0. No se beneficia de bonos a la velocidad.»—. En la mesa eso se consulta cada dos
   minutos y ahorra abrir el manual.
7. **La barra inferior de la vista de jugador en el móvil**: Ficha · Tirar · Objetos · Conjuros ·
   Registro. Cinco, para el pulgar, y ninguna es del DM.
8. **El conmutador «Ver como (demo)» DM/Jugador**, abajo del todo en la barra lateral. En
   producción no puede ser un juguete de maqueta —el servidor manda—, pero **la idea de poder
   mirar la misma pantalla desde la otra silla vale para el producto**, y ya la tenemos empezada
   en «ver el registro como» de la mesa.

## Lo que NO se copia

- **Los pines del mapa son gotas rellenas de cobre sin dibujo dentro.** Pasan por icono
  dibujado, pero no dicen qué marcan. Un pin tiene que decir si es un lugar, un peligro o una
  entrada.
- **La barra lateral llega a veinticinco entradas** porque están todas las fases a la vez. Es
  correcto en un muestrario y sería malo en producción: hay que decidir qué aparece cuando la
  fase no existe. Hoy la nuestra tiene once y es la buena.
- **El conmutador DM/Jugador de la maqueta cambia lo que se pinta.** En producción **eso lo
  decide `canView` en el servidor**, y la pantalla solo enseña lo que le llega. Se copia el
  gesto, nunca el mecanismo.
- Las capturas usan `1 h 47 min` de sesión y datos fijos; el contenido de ejemplo es bueno y se
  puede reaprovechar, pero es contenido, no diseño.

## El hueco: **no hay pantalla de juego**

«Mapas» (pantalla 30) es **una comparación documental**: dos rectángulos, capa del DM y capa del
jugador, con tres pines y un polígono de niebla, para explicar la diferencia entre lo que ve uno
y lo que ve el otro. Está bien como explicación **y no es una mesa de juego**. No hay tablero, ni
rejilla, ni fichas que se muevan, ni la hoja al lado, ni las tiradas dentro.

Lo pidió el autor con estas palabras: *«yo no quiero un juego plano; quiero que los jugadores
tengan una interfaz donde vean el mapa, su hoja, sus tiradas y demás dentro de una misma
pantalla, con objetos interactivos renderizados y tiles, como las plataformas clásicas de D&D»*.

**Eso no estaba en el encargo a Figma Make** —el encargo pedía el mapa de la fase 3, que es una
imagen con pines— así que no es un fallo suyo: es alcance nuevo, y **más grande que la fase 3 tal
como está escrita hoy**. Un tablero con rejilla, fichas movibles y objetos interactivos es una
mesa virtual, y arrastra consigo tiempo real (fase 4) para que dos personas vean la misma ficha
moverse. Queda anotado en [06-pendientes.md](../../06-pendientes.md) y hay que decidir dónde
entra antes de dibujarlo; **el plan maestro todavía dice «mapa 2D con pines», y eso ya no es lo
que se quiere**.
