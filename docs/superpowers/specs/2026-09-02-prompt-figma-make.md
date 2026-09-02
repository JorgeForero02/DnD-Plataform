# Prompt para Figma Make — todas las ventanas de la plataforma

> **Qué es esto.** El texto que va del `---` de abajo hasta el final del documento está escrito
> para pegarlo en Figma Make. No es documentación del proyecto: es un encargo a una herramienta
> externa. Se guarda en el repositorio para que la siguiente persona sepa **qué se le pidió** y
> pueda comparar lo que volvió con lo que hay.
>
> **Cómo usarlo.** Figma Make trabaja mejor por tandas que de un tirón. El prompt está partido en
> **seis entregas numeradas**; pega la entrega 1, deja que construya, y solo entonces pega la 2.
> La entrega 1 fija el sistema de diseño y **todo lo demás se apoya en ella**: si la saltas,
> cada pantalla se inventará sus propios colores.
>
> **Las entregas 1 a 5 son lo que existe o está a medio construir; la 6 es el futuro** —
> inventario, dados, combate, mapas, tiempo real — y va en el mismo encargo a propósito: un
> inventario diseñado dentro de dos meses sale pegado con cinta a una interfaz que no lo
> esperaba. Las cuarenta pantallas están numeradas de corrido.
>
> **Qué manda cuando discrepen.** Lo que vuelva de Figma Make es material de partida, no
> autoridad. Las reglas vinculantes de [04-convenciones.md](../../04-convenciones.md) siguen
> mandando, y `canView` sigue siendo el dueño único de quién ve qué. Si una maqueta bonita
> propone enseñar algo que el servidor no manda, **la maqueta está equivocada**.

---

# ENTREGA 1 — El sistema de diseño

Vas a diseñar una aplicación web para dirigir partidas de **Dungeons & Dragons 5.ª edición**.
No es un juego: es la herramienta de trabajo del **Dungeon Master** y de sus jugadores. Se usa
**en la mesa, con la partida en marcha**, y también sola, entre semana, para escribir el mundo.

Toda la interfaz va **en español**. El público es hispanohablante y no técnico.

Antes de dibujar ninguna pantalla, construye el sistema de diseño completo y enséñamelo en una
página de muestrario.

## La idea que gobierna todo: dos pieles

La aplicación tiene **dos superficies con dos personalidades**, y la línea entre ellas significa
algo:

- **Cromado** (`chrome`) — **lo que se opera.** Navegación, formularios, botones, listas,
  paneles de control, la barra de sesión. Es un **instrumento**: oscuro, denso, sobrio, de
  tipografía sin gracias y tamaño pequeño. Piensa en la consola de una sala de máquinas o en
  una mesa de mezclas, no en una web de marketing.
- **Vitela** (`vellum`) — **lo que se lee.** El cuerpo de un documento del mundo, la
  descripción de un lugar, la carta que encuentran los jugadores, el texto de la ficha. Es
  **papel**: cálido, con serifas, línea más larga, interlineado generoso, medida corta.

La misma línea separa dos formas de usar la aplicación: **operar** y **leer**. Nunca las mezcles
en la misma superficie. Un botón no se pinta sobre vitela; un párrafo de novela no se pinta
sobre cromado.

El nombre interno de la identidad es **«sala de guerra»**: pizarra naval y cobre. Mapas sobre
una mesa larga, luz baja, instrumentos de latón. **No** es fantasía de dragones dorados, no es
pergamino quemado con bordes rotos, no es una taberna de piedra. Sobriedad militar con un solo
metal cálido.

## La paleta, exacta

Son **doce tokens** y **dos temas**. El oscuro es el que sale por defecto; el claro no es un
añadido, es el **modo lectura**. Usa estos valores literales, no aproximes.

### Tema oscuro (por defecto)

| Token | Valor | Para qué |
|---|---|---|
| `--bg` | `#10171C` | Fondo de la aplicación. Pizarra naval. |
| `--surface` | `#1A2329` | Tarjetas y paneles sobre el fondo. |
| `--vellum` | `#2A2419` | **La superficie de lectura.** Papel en penumbra, no gris. |
| `--text` | `#DCE3E6` | Texto normal. |
| `--muted` | `#8B99A1` | Texto secundario, rótulos, metadatos. |
| `--accent` | `#4A9BB8` | Rellenos, bordes e iconos de acento. Azul acero. |
| `--accent-text` | `#6FB6CE` | **El mismo azul, aclarado, para lo que ES texto legible.** |
| `--copper` | `#C97D46` | El único metal cálido. Rellenos, bordes, ornamento. |
| `--copper-text` | `#DD9663` | Cobre para texto. |
| `--danger` | `#C4564B` | Peligro: rellenos, bordes, iconos. |
| `--danger-text` | `#E08076` | Peligro para texto. |
| `--warning` | `#E0A83C` | Aviso. «Oropimente». Un solo valor, sirve para texto y para relleno. |

### Tema claro (modo lectura)

| Token | Valor |
|---|---|
| `--bg` | `#DFE5E9` |
| `--surface` | `#EDF1F3` |
| `--vellum` | `#F4EFE2` |
| `--text` | `#16232B` |
| `--muted` | `#4C5D66` |
| `--accent` / `--accent-text` | `#1F5C73` |
| `--copper` / `--copper-text` | `#8F5228` |
| `--danger` / `--danger-text` | `#9B3A31` |
| `--warning` / `--warning-text` | `#7A5310` |

**Tres cosas de la paleta que no son opcionales:**

1. **Hay dos azules y dos rojos por un motivo medido.** El tono de relleno no pasa el contraste
   4,5:1 como texto normal sobre nuestras superficies oscuras. Usa `--accent` y `--danger` para
   **rellenos, bordes e iconos**; usa `--accent-text` y `--danger-text` para **cualquier cosa
   que sea texto que hay que leer**. En el tema claro coinciden, y está bien: no hay un segundo
   valor claro que mantener sincronizado.
2. **No hay verde de «éxito».** Un segundo color que aprender no compensa. El acierto se dice
   con `--accent-text`, un icono de comprobación **dibujado** y **una palabra explícita**.
3. **Todo texto tiene que llegar a 4,5:1 contra su fondo real en los dos temas.** Si una
   combinación no llega, no la uses; corrígela. Esto se mide, no se estima.

## Las cuatro voces tipográficas

Una por oficio. No las mezcles y no añadas una quinta.

| Voz | Familia | Dónde |
|---|---|---|
| **Título** | `Marcellus` (romana lapidaria) | Títulos de pantalla, nombres propios del mundo, la marca. |
| **Cromado** | `Public Sans` | Toda la interfaz operativa: botones, rótulos, campos, tablas, navegación. |
| **Mundo** | `EB Garamond` | El cuerpo de lo que se lee sobre vitela. |
| **Datos** | `IBM Plex Mono` | Números que se comparan en columna: puntuaciones, modificadores, dados, trazas. |

**Escala de cromado** (denso, de instrumento): 12px · 13px · **14px (base)** · 16px · 19px ·
24px · 30px.

**Escala de mundo** (manual, más aire): 17px base · 22px · 28px. **Medida máxima de línea: 66
caracteres.** Un párrafo de vitela nunca se estira a lo ancho de la pantalla.

**Trampa que ya nos costó un despliegue:** cualquier control en el que se escriba —campo de
texto, área de texto, desplegable— tiene que quedar en **16px o más**, o Safari en iPhone hace
zoom solo al enfocarlo y descoloca la pantalla. Los 14px de base son para leer, no para teclear.

## Espaciado, esquinas, ornamento

- Rejilla de **4px**: 4 · 8 · 12 · 16 · 24 · 32 · 48.
- Esquinas **pequeñas**: 4px y 6px. Es un instrumento, no un cartel. Nada de píldoras ni de
  tarjetas muy redondeadas.
- **El ornamento informa o enmarca; nunca compite.** Se permite lo que haría un grabado y podría
  imprimirse: filete, versalita, capitular, cuadrícula tenue, dibujo a medio trazo. Se prohíbe
  la textura que estorba la lectura y el adorno que no dice nada. Y nada de esto puede romper el
  contraste: si dibujas una cuadrícula de fondo, va al 5 % de opacidad.
- **La cabecera es el marco, no una tarjeta más.** Va sobre un fondo **más oscuro** que las
  superficies que enmarca, y con un filete distinto. La primera versión de este proyecto tenía
  la cabecera del mismo color y del mismo grosor que las tarjetas, y el autor lo describió así:
  «casi no se nota».

## Los iconos se dibujan

**Prohibido usar glifos de fuente o emoji como icono.** Nada de `☾`, `☀`, `✓`, `⚔️`, `🎲`. Un
glifo se pinta a todo color en unos sistemas, como un cuadrado vacío en otros, y nunca se parece
al resto de la interfaz.

Todos los iconos son **SVG de trazo**, heredando el color del texto, de peso homogéneo, en una
sola caja cuadrada. Un icono que vive **dentro de una línea de texto** se dimensiona en `1em`
para que escale con ella; los de botón, en píxeles.

Dibuja al menos este juego: dado de veinte caras, corazón/puntos de golpe, escudo/clase de
armadura, bota/velocidad, ojo/visibilidad, candado, llave, persona, grupo de personas, mapa,
marcador de lugar, pergamino/documento, estandarte/facción, saco/objeto, rayo/suceso,
comprobación, aviso triangular, cruz de cerrar, chevron, más, lápiz, papelera, enlace de
cadena, engranaje, reloj de arena, hoguera/descanso.

**Única excepción declarada:** cinco glifos geométricos que distinguen los niveles de
visibilidad —`○ ◐ ◈ ◆ ●`—, porque son geometría pura, se alinean con el texto y son la señal que
los diferencia **sin depender del color**. Esos sí, y solo esos.

## Los componentes del sistema

Constrúyelos como componentes reutilizables con sus variantes y sus estados (reposo, foco,
sobre, pulsado, deshabilitado, cargando, error):

1. **Botón** — primario, secundario, terciario/plano, peligro. Con icono a la izquierda, solo
   icono, y con texto de carga. **Un botón de guardar no se deshabilita nunca** (ver reglas).
2. **Campo** — rótulo encima, pista debajo, error debajo en `--danger-text` con **icono de aviso
   dibujado** al lado. Variantes: texto, número, área de texto, desplegable, contraseña con
   interruptor de ver.
3. **Radios explicados** — cada opción con su **frase de qué hace** debajo del rótulo, todas
   visibles a la vez. Este es el patrón de las decisiones con significado; no es un desplegable.
4. **Distintivo de visibilidad** — los cinco, con su glifo, su rótulo y su tono.
5. **Etiqueta / chip** — para las etiquetas libres del mundo. Con y sin botón de quitar.
6. **Panel** — en cromado y en vitela, con cabecera opcional y filete.
7. **Pestañas** — en tira horizontal y **en barra lateral vertical agrupada por secciones**.
8. **Diálogo modal** — con capa oscurecida detrás, título, cuerpo y pie de acciones. Que se note
   que es una **capa** sobre la pantalla y no una tarjeta más.
9. **Estado vacío** — dibujo a medio trazo, una frase que explica qué va aquí, y **el botón que
   lo crea**. Nunca un «no hay datos» a secas.
10. **Fila de lista** — clicable entera, con título, subtítulo, distintivo de visibilidad,
    etiquetas y metadatos a la derecha.
11. **Valor editable en el sitio** — número, desplegable y texto. Ver las reglas de edición.
12. **Valor derivado** — el número, su rótulo, **su fórmula de una línea** debajo, y un chevron
    para desplegar la traza completa.
13. **Aviso** — informativo, de aviso y de error, en línea (no flotante).
14. **Barra de sesión en juego** — franja persistente, presente en toda la campaña mientras hay
    una sesión en marcha.

## Reglas de interfaz que no se negocian

Cada una nació de un fallo real de este proyecto. No las reinterpretes.

1. **Ningún valor de enumeración llega nunca a la pantalla.** Nunca `LOCATION`, `PUBLIC`,
   `DM_ONLY`, `NPC`. Siempre su forma en español. Y si hace falta concordar en género, se
   escribe la frase entera: «Nueva misión», nunca «Nuevo misión».
2. **Los iconos se dibujan.** Ya está arriba, y se repite porque se incumplió seis veces.
3. **Una opción con significado no se esconde en un desplegable.** Si son pocas y cada una
   quiere decir algo distinto, van como radios visibles a la vez, **cada una con su frase**.
   Equivocarse en el control de visibilidad enseña a los jugadores algo que no debían ver.
4. **Se toca donde se lee.** No hay botón de «Editar» que abra un formulario aparte para
   cambiar un valor que estás mirando. El valor se edita **en su sitio**, con la forma que
   tiene al leerse.
5. **Lo irreversible sigue detrás de un botón.** Borrar no se pone a un clic de lo que se lee.
6. **La afordancia es información de dominio, no decoración.** Un valor **editable** lleva un
   subrayado tenue; un valor **derivado** no lleva ninguno, y esa ausencia significa «esto lo
   calculo yo, edita su causa». No pongas subrayado a lo que la persona no puede cambiar.
7. **Cómo se guarda depende del gesto, y no se mezclan dos patrones en el mismo formulario.**
   Automático donde el gesto **es** la acción entera (elegir en un desplegable, marcar una
   casilla). Explícito, con Guardar y Cancelar, donde escribir es un proceso (un texto).
8. **El botón de guardar nunca se deshabilita.** Deshabilitado no recibe foco de teclado y tiene
   mal contraste: quien no ve el formulario no se entera de que existe.
9. **Un rechazo conserva lo tecleado y explica el motivo en línea, nunca en un aviso flotante.**
   Un aviso flotante se ha ido antes de que un lector de pantalla llegue a él.
10. **Un valor guardado que un selector no ofrece se muestra, marcado y no seleccionable.**
    Nunca desaparece: una opción invisible es un dato que se pierde en el siguiente guardado sin
    que nadie se entere.
11. **Esconder un botón no es control de acceso.** Puedes ocultar lo que el servidor va a
    rechazar —ofrecerlo sería mentir—, pero eso es honestidad de interfaz, no seguridad.

---

# ENTREGA 2 — El vocabulario y las pantallas públicas

Antes de las pantallas, aprende el vocabulario. **Toda la interfaz usa estas palabras exactas.**

## Los cinco niveles de visibilidad

Cada objeto del mundo tiene uno. Es el concepto central del producto: sirve para que el DM
escriba secretos y los revele cuando toca.

| Glifo | Nombre en pantalla | Tono | La frase que va debajo |
|---|---|---|---|
| `○` | **Público** | apagado | Todo el que esté en la campaña. Hoy es lo mismo que «Jugadores»: nadie de fuera entra todavía. |
| `◐` | **Jugadores** | acento | Todos los que se sientan a esta mesa. Lo normal para el mundo que ya han visto. |
| `◈` | **Jugadores concretos** | cobre | Solo quienes elijas abajo. Para el secreto que uno sabe y los demás no. |
| `◆` | **DM y creador** | texto | Tú y quien lo creó. Nadie más de la mesa. |
| `●` | **Solo DM** | peligro | Solo el DM. Lo que todavía no ha pasado. |

## Los siete tipos de cosa del mundo

Y aquí va un encargo explícito del autor, en sus palabras: **«que dejen de llamarse fichas y se
diferencien por lo que es»**. Hoy los siete comparten el mismo formulario vacío y son
indistinguibles. **Cada uno tiene que verse distinto y preguntar lo suyo.**

| Tipo | Cómo se llama | Para qué sirve (va bajo el título del diálogo) | Ejemplo de nombre |
|---|---|---|---|
| PNJ | **personaje del mundo** | Alguien a quien la mesa puede mirar a la cara. Lo que dice, lo que quiere y lo que esconde. | Maestre Kellan |
| Lugar | **lugar** | Un sitio al que se llega. Qué se ve, qué se oye y qué puede salir mal. | El puerto de Sarnath |
| Misión | **misión** | Algo que hay que hacer. Quién lo pide, qué se gana y qué pasa si nadie lo hace. | El cargamento que no llegó |
| Facción | **facción** | Un grupo con intereses propios. Qué persigue, con quién se lleva mal y qué puede hacer por ti. | La Hermandad Gris |
| Objeto | **objeto** | Una cosa que se puede tener en la mano. Qué es, qué hace y de dónde salió. | El sello de cera de la Casa Vhael |
| Suceso | **suceso** | Algo que pasó o va a pasar. Cuándo, a quién le afecta y qué deja detrás. | El incendio del puerto |
| Documento | **documento** | Un texto que la mesa puede leer: una carta, un contrato, una página arrancada. | La carta sin firmar |

Cada tipo tiene además su icono dibujado propio, sus etiquetas sugeridas y un andamiaje de
encabezados en el cuadro de texto. Por ejemplo, un PNJ arranca con **Qué se ve · Qué quiere ·
Qué esconde · Cómo habla**; un lugar con **Al llegar · Qué hay dentro · Quién anda por aquí ·
Lo que no se ve a simple vista**.

## Los dos papeles

- **DM** — escribe el mundo, dirige la partida, decide qué se revela.
- **Jugador** — tiene **su** personaje y ve lo que el DM le ha dejado ver. Un jugador **no**
  crea lugares, misiones ni PNJs: el mundo es del DM. Diseña la interfaz de jugador **sin esos
  botones**, no con esos botones deshabilitados.

## Las pantallas de esta entrega

Diséñalas en los dos temas y para escritorio, tableta y móvil.

### 1 · Entrar (`/login`)

Pantalla pública, centrada, sin navegación de aplicación. La marca arriba (logotipo **dibujado**,
nunca una fuente decorativa haciendo de logo). Correo y contraseña, botón de entrar, enlace a
crear cuenta.

Estados que tienes que dibujar: reposo · error de credenciales **en línea, conservando el
correo tecleado** · demasiados intentos (hay un límite por IP y la pantalla lo dice con una
frase humana, no con un código) · aviso de «contraseña cambiada, vuelve a entrar».

**No dibujes «¿Olvidaste tu contraseña?».** No existe: no hay servicio de correo, y ofrecer un
enlace que no lleva a ninguna parte es exactamente la clase de mentira que este producto no se
permite.

### 2 · Crear cuenta (`/register`)

Igual de sobria. Nombre, correo, contraseña con su pista de requisitos **visible antes de
escribir**, no como error después.

### 3 · Unirse a una campaña (`/join/:token`)

Se llega por un enlace de invitación. Enseña **de qué campaña se trata** antes de aceptar, y el
botón de unirse. Estados: invitación válida · caducada · ya usada · ya eres miembro · hay que
entrar primero.

### 4 · Acerca de (`/acerca-de`)

Pública. Lleva la atribución legal del **SRD 5.1** de Wizards of the Coast bajo licencia
Creative Commons. Es texto legal que se reproduce literal: diséñalo **para que se lea**, en
vitela, no escondido en un pie diminuto.

### 5 · Página no encontrada

Un dibujo a medio trazo, la ruta que se intentó, y la vuelta al inicio. Con carácter, sin
chiste.

---

# ENTREGA 3 — La aplicación: campañas, mundo y lectura

### 6 · Marco de la aplicación

Cabecera fija, sobre fondo más oscuro que lo que enmarca: marca a la izquierda, campaña actual,
interruptor de tema (claro/oscuro/sistema) y menú de cuenta a la derecha. **Y, si hay una sesión
en marcha, la barra de «en juego» justo debajo, persistente en toda la campaña.**

### 7 · Mis campañas (`/`)

La primera pantalla tras entrar. Rejilla o lista de campañas, cada una con su nombre, su papel
(«Diriges» / «Juegas»), cuántos miembros y cuándo fue la última sesión. Botón de crear campaña.
**Estado vacío con dibujo y una frase que invita**, porque es lo primero que ve alguien nuevo.

### 8 · Campaña (`/campaigns/:id`)

La pantalla más grande. **Barra lateral de secciones agrupada en tres**, porque una lista plana
de once no dice cuál es el mundo y cuál es la mesa:

- **(sin grupo)** — Resumen
- **El mundo** — PNJ · Lugares · Misiones · Facciones · Objetos · Sucesos · Documentos
- **La mesa** — Sesiones · Personajes · Reglas
- **La campaña** — Ajustes

**Resumen:** qué pasó la última sesión, quién está en la mesa, qué hay pendiente, accesos
rápidos. Es el tablero, no una portada vacía.

**Una sección del mundo** (las siete se parecen pero **no son iguales**): barra de herramientas
con buscador, filtro por etiquetas y el botón de crear —que dice **qué crea**: «Nuevo lugar»,
«Nueva misión», nunca «Nuevo»—. Lista de filas con nombre, distintivo de visibilidad, etiquetas
y un extracto. **Diferencia visualmente los siete tipos**: icono propio, y la lista de un tipo
puede enseñar lo que a ese tipo le importa (un lugar, dónde está; una misión, si está abierta o
cerrada; un documento, la primera línea de su texto).

**Sesiones:** las pasadas con su crónica, la que viene, y el botón de empezar.

**Personajes:** los de la mesa. El DM los ve todos; un jugador ve el suyo.

**Reglas:** el panel del motor de reglas. **Solo el DM lo ve**; para un jugador esta sección no
existe (ver entrega 5).

**Ajustes:** nombre y descripción de la campaña, miembros con su papel, invitaciones, y la zona
de peligro (borrar) claramente apartada al final.

### 9 · Leer una cosa del mundo (`/campaigns/:id/entidades/:entityId`)

**La pantalla de vitela por excelencia.** Aquí el diseño se luce.

- Cabecera en cromado: nombre en voz de título, tipo, distintivo de visibilidad, etiquetas,
  acciones.
- Cuerpo en **vitela**: el texto del mundo, en voz de mundo, con medida corta y buen
  interlineado. Capitular en el primer párrafo si queda bien. Que dé ganas de leerlo en voz alta
  en la mesa.
- **Panel de enlaces**, y aquí hay encargo concreto del autor —los enlaces tienen que ser **más
  entendibles**—: cada enlace dice **la relación en palabras** («vive en», «custodia»,
  «encarga»), **va en los dos sentidos** (si Corvin vive en la Torre Gris, al abrir la Torre
  Gris está Corvin), la relación entrante se lee invertida («vive aquí»), y **el destino es un
  enlace de verdad al que se puede ir**. Diséñalo como un pequeño mapa de vecindario, no como
  una lista de identificadores.
- **Bloque secreto:** dentro del texto puede haber un tramo marcado como **solo para el DM**.
  Al DM se le pinta distinto —filete, fondo, marca al margen— y a los jugadores **no les llega
  nunca**. Dibuja las dos vistas.

### 10 · Cuenta (`/account`)

Cambiar nombre y contraseña. Sobria, corta, con confirmación clara de que se guardó.

---

# ENTREGA 4 — La ficha de personaje y la mesa de juego

### 11 · Ficha de personaje (`/campaigns/:id/personajes/:characterId`)

**La pantalla más importante del producto.** El autor pidió dos cosas: que siga la forma de la
**hoja de papel clásica de 5.ª edición**, y que sea **dinámica** —se toca donde se lee, sin
botones de editar—.

Maqueta elegida: **cabecera fija más dos columnas.**

- **Cabecera fija**, visible siempre al desplazar: **Clase de Armadura · Iniciativa ·
  Velocidad · Puntos de Golpe · Bonificador de Competencia**, más nombre, raza, clase y nivel.
  Es el instrumento: cromado.
- **Columna izquierda — la cadena que se explica sola.** Las seis características
  (Fuerza, Destreza, Constitución, Inteligencia, Sabiduría, Carisma), luego las salvaciones,
  luego las habilidades, **en ese orden y pegadas**, porque **una alimenta a la siguiente y esa
  contigüidad es la explicación**. En papel se dibuja así por un motivo, no por costumbre.
- **Columna derecha — lo accionable.** Puntos de golpe y daño, descansos, recursos gastables,
  condiciones activas, tirar dados, salvaciones de muerte, elecciones pendientes.
- **Deja un hueco rotulado para el inventario**, que llega en la fase siguiente y se enchufa
  ahí.

**Lo que hace especial a esta pantalla, y que ninguna hoja de papel puede hacer:** cada número
calculado enseña **de dónde sale**.

- Bajo cada valor derivado, **su fórmula en una línea**, siempre visible: `10 +2 destreza`,
  `14 = 11 cuero tachonado +2 destreza +1 anillo`.
- Un chevron **dibujado** despliega la **traza completa**: cada paso con su origen —la raza, la
  clase, el objeto, la anulación que escribió el DM y **el motivo que escribió con ella**—.
- **Cada paso de la traza lleva a su causa editable.** Pulsar «+2 por Destreza» lleva el foco a
  la casilla de Destreza. La explicación **es** la navegación.
- Y la regla de la afordancia manda: la puntuación lleva subrayado tenue porque se edita; **el
  modificador no lleva ninguno**, y esa ausencia dice «edita mi causa».

Diseña la ficha **en vitela para el cuerpo y cromado para la cabecera**: la misma línea separa
las dos pieles, los dos patrones de guardado y las dos formas de usar la hoja.

**Vista de jugador y vista de DM.** El jugador edita el suyo; el DM puede además anular un
número y **tiene que escribir el motivo**. Dibuja las dos.

### 12 · Subir de nivel

Un diálogo que enseña **el antes y el después lado a lado** —qué sube, cuánto, y por qué—, con
las elecciones que toca hacer, y confirma. No es un formulario: es un resumen que se acepta.

### 13 · La barra de «en juego»

Franja persistente mientras hay sesión en marcha, en toda la campaña. Dice que se está jugando,
cuánto llevan, y lleva a la mesa de un clic. **Un solo elemento persistente**, no un rediseño de
la aplicación entera.

### 14 · Empezar sesión

Diálogo con **la asistencia**: quién se sienta hoy. Aquí no hay conexiones en vivo, así que la
asistencia **se declara**.

### 15 · La mesa (`/campaigns/:id/sesion`)

La pantalla de la partida en marcha, pensada contra el problema que describen todos los foros:
**el DM con quince pestañas abiertas.** Tres paneles:

- **Elenco** — quién está, sus personajes, sus puntos de golpe y sus condiciones de un vistazo.
- **Registro en vivo** — lo que va pasando, en prosa legible, no en volcado técnico. Y arriba,
  **los sellos rápidos**: **Combate · PNJ · Decisión · Hallazgo · Objeto · Nota**. Escribir en
  mesa cuesta, pulsar no; y como cada sello lleva su clase, la crónica sale agrupada en vez de
  ser un muro. **Los pone cualquiera de la mesa, no solo el DM.**
- **Consulta del mundo** — buscar y leer sin salir de la mesa.

Y una herramienta que solo tiene el DM: **«ver el registro como» otro jugador**, para comprobar
qué se ve desde su silla. No relaja nada: el DM ve **menos**, que es justo el punto.

### 16 · Cerrar sesión de juego

Diálogo con **la crónica ya escrita**, derivada de los sellos que se fueron poniendo. Se repasa,
se corrige y se cierra. No se empieza en blanco.

---

# ENTREGA 5 — Lo difícil: reglas, línea de tiempo y documentos

Estas tres son las que de verdad deciden si el producto es bueno. Tómate más espacio con ellas.

### 17 · El editor de reglas

**El problema, en palabras del autor, después de probarlo con su DM delante:** *«no sé por qué
es un error con cajas, pero me gustaría una mezcla; es demasiado confuso, el DM dijo que no
entendió nada»*.

Una regla es una frase: **CUANDO** pasa algo, **SI** se cumple una condición, **ENTONCES** haz
esto. El vocabulario es **cerrado** —doce disparadores, ocho condiciones, ocho efectos—, lo que
hace viable un editor visual: no hay que soportar lo arbitrario.

La solución decidida es **cajas que se arrastran a carriles fijos**:

- Una **paleta** a un lado con las piezas disponibles, agrupadas por parte.
- **Tres ranuras fijas**: CUANDO · SI · ENTONCES. Se arrastra una pieza y cae en su ranura.
- **Sin cables y sin posición libre.** La ranura **es** la conexión, así que el «error
  invisible» —una caja que parece conectada y no lo está— **no puede existir**.
- **Forma y color distintos por parte**, que es la lección de los editores de bloques: la forma
  dice dónde encaja algo antes de que lo intentes.
- **Y la caja tiene que distinguir «ocurrió algo» de «algo es verdad»** por su propia forma y
  su propio texto. Es el malentendido número uno medido en la literatura: la gente no separa el
  **suceso** (un instante) del **estado** (algo que se comprueba). Que la forma lo diga.
- **Arrastrar tiene que tener alternativa de teclado.** Un editor que solo funciona con ratón
  excluye a quien no puede usarlo.

Dibuja además:

- **La regla leída como una frase en español**, siempre visible bajo las cajas. Si no se puede
  leer en voz alta y entenderse, el editor ha fallado.
- **Los avisos:** «nadie deshace esta marca» (falta la reversión), «dos reglas tocan lo mismo, y
  en este orden» (conflicto de prioridad) y «esto se muerde la cola» (bucle). Cada aviso
  **propone el arreglo**, no solo señala.
- **El tutorial.** Nada de tour de bienvenida: no se recuerdan y se saltan. **Burbujas
  contextuales que no se pueden cerrar y se cierran solas al hacer la acción.** Es el único
  patrón que funcionó en las herramientas que lo intentaron tres veces.
- **El estado vacío con plantillas clonables**, porque la gente duplica reglas ajenas antes que
  escribir la suya.
- **El modo propuesta:** una regla puede **proponer** en vez de aplicar, y el DM acepta o
  descarta. Esa bandeja de propuestas es una pantalla propia.
- **La traza de una regla que se disparó:** qué la disparó, qué comprobó, qué escribió.

### 18 · La línea de tiempo de la campaña

Encargo del autor, con su dibujo a mano delante: **una línea de tiempo editable y generada
sola, donde se vean las rutas alternativas.** Y su notación, literal:

- **Los cuadrados son lo principal** — la cadena de la misión principal.
- **Los círculos son las secundarias** — cuelgan de la cadena.

Diséñala como un **mapa de rutas**, no como una lista con fechas: la cadena principal
recorriendo el lienzo, las secundarias colgando, las **rutas alternativas** bifurcándose y
volviendo a juntarse, y lo que **no pasó** dibujado como camino que se quedó sin recorrer.

Se genera sola de lo que ya ocurrió en la partida, **y se puede editar y colocar a mano.**
Respeta la visibilidad: un jugador ve **su** versión de la historia, no la del DM.

### 19 · El editor de documentos y el cuaderno del DM

Encargo del autor: **la sección de documentos, más completa. Ya es Markdown, pero con
herramientas de edición como las de un procesador de textos, y dibujos en las hojas.**

- **Barra de herramientas fuera del papel.** El texto se escribe sobre **vitela**, limpio; los
  controles viven en **cromado**, alrededor. No pongas botones encima del papel.
- Negrita, cursiva, encabezados, listas, citas, tablas, enlaces, imágenes.
- **El bloque secreto** como pieza de primera clase: se marca un tramo como «solo DM» y se ve
  marcado al margen mientras se escribe. A los jugadores no les llega.
- **Dibujo incrustado en la hoja**, en el mismo lienzo del documento: bocetos de mapas, planos
  de mazmorra, esquemas de un símbolo. A medio trazo, en la misma paleta.
- Y el **cuaderno del DM**: notas rápidas, ganchos sin colocar, nombres para cuando haga falta
  uno. Es el cajón de sastre, y tiene que verse cómodo, no ordenado a la fuerza.

---

# ENTREGA 6 — Lo que todavía no existe, y hay que diseñar ya

Todo lo anterior está construido o a medio construir. **Esta entrega es el futuro del producto**,
y va en el mismo encargo por un motivo: si el inventario, los dados y el combate se diseñan
dentro de dos meses, saldrán pegados con cinta a una interfaz que no los esperaba. La ficha de
personaje ya tiene **un hueco reservado y rotulado** para el inventario justamente por esto.

Diséñalas con el mismo sistema, la misma paleta y las mismas reglas. Cuando una decisión de
producto todavía no está tomada, **te lo digo explícitamente**: en esas, propón.

## Tres principios que gobiernan todo este bloque

Son decisiones de dominio ya cerradas, y **el diseño no puede contradecirlas**:

1. **La máquina ejecuta, el DM arbitra.** El sistema calcula, propone y avisa; **nunca decide
   por el DM**. Toda pantalla de esta entrega que resuelva algo lo hace **proponiendo**, con el
   DM confirmando o corrigiendo. No hay «resolución automática» a la que uno asista.
2. **El azar vive fuera del motor.** El motor de derivación es **puro y determinista**: dadas
   las mismas entradas da el mismo resultado, siempre. Los dados son otra cosa, y se dibujan
   como otra cosa.
3. **Lo que el jugador no debe saber no llega a su navegador.** No se oculta con CSS: **no se
   envía**. Esto tiene consecuencia de diseño directa, y la más importante está en el combate:
   **la Clase de Armadura de un monstruo nunca viaja al navegador de un jugador**, así que la
   pantalla del jugador **no puede** enseñar «has fallado por 2». Diseña sabiendo eso.

---

## Fase 2B — objetos, inventario y equipo

### 20 · El inventario del personaje

Va en el hueco reservado de la columna derecha de la ficha, y además tiene su propia vista
ampliada.

- **Tres zonas visualmente distintas:** lo que lleva **equipado** (armadura, arma en mano,
  lo que está puesto), lo que lleva **encima** (la mochila), y lo que tiene **guardado en otro
  sitio** (el carro, la posada, el banco de la ciudad).
- **Equipar y desequipar es un gesto, no un formulario.** Y —esto es lo que hace único a este
  producto— **al equipar algo, el número de la ficha cambia delante de ti y la traza gana un
  paso nuevo**: «+1 anillo de protección». Diseña esa conexión para que se vea: el objeto que
  acabas de ponerte y el número que acaba de subir tienen que relacionarse a la vista.
- **Carga.** Cuánto lleva y cuánto aguanta, con el aviso cuando se pasa. Sin dramatizar: una
  barra sobria y una cifra.
- Monedas, agrupadas y legibles.
- **Un objeto puede ser dos cosas a la vez**, y hay que resolverlo visualmente: el «sello de
  cera de la Casa Vhael» es **una cosa del mundo** (tiene historia, enlaces, secretos) y **una
  cosa del inventario** (pesa, se lleva, puede dar un bono). Que la ficha del objeto tenga sus
  dos caras y se pase de una a otra sin salir.

### 21 · La ficha de un objeto con datos

Distinta de la página de lectura de un objeto del mundo: **aquí manda el dato, no la prosa**.
Qué es, cuánto pesa, cuánto vale, si es un arma qué daño hace, si es armadura cuánta CA da, y
**qué efectos numéricos aporta**, tomados de una **lista cerrada** —no texto libre—, porque son
los que el motor sabe sumar. Y debajo, su prosa: qué parece, de dónde salió, quién lo quiere.

### 22 · El catálogo y la biblioteca de objetos

Buscar en el catálogo estándar y **crear objetos propios de la campaña**. Que se distinga de un
vistazo lo que viene del catálogo y lo que escribió el DM: la procedencia importa cuando algo se
comporta raro.

### 23 · Conjuros: el libro y la vista de lanzamiento

- **El libro de conjuros**: filtrable por nivel, escuela, tiempo de lanzamiento, si es de
  concentración. Con lo preparado destacado.
- **Los espacios de conjuro** como recurso que se gasta y se recupera con el descanso.
- **Alcance y área dibujados**, no descritos: cono, esfera, línea, cilindro. Un diagrama pequeño
  a medio trazo vale más que «cono de 15 pies».
- **La concentración es un estado, y solo puede haber uno.** Que se vea qué se está
  concentrando y qué se pierde al lanzar otro.

---

## Fase 2C — los dados

### 24 · El tirador de dados

**Esta pantalla tiene que ser un placer.** Es lo que más se toca durante la partida.

- **Tirar desde donde estás.** Se tira desde la habilidad, desde el arma, desde la salvación:
  el botón está pegado al número, no en una pantalla aparte. La pantalla aparte existe para la
  tirada suelta.
- **Ventaja y desventaja como concepto, no como sintaxis.** El jugador **no escribe `2d20kh1`**:
  marca ventaja. Dibuja el control como lo que es —una decisión de tres estados: normal,
  ventaja, desventaja— y **enseña los dos dados con el descartado tachado y visible**. Ver el
  dado que se cayó es media gracia de tener ventaja.
- **La tirada muestra su suma desglosada**, con la misma lógica que la ficha: `17 = 12 dado
  +3 destreza +2 competencia`. Nunca un número solo.
- **Quien marca la ventaja es el DM**, y eso se ve: hay tiradas que el jugador lanza y tiradas
  que el DM le pide con las condiciones ya puestas.
- **El resultado va al registro de la sesión**, no se lo queda la pantalla.
- El **20 natural y el 1 natural** se marcan, con sobriedad: un filete de cobre y una palabra,
  no una explosión de confeti.
- **Dibuja el dado.** Un d20 de trazo, en la paleta, con una animación corta y **desactivable**.
  Y una **caja de tiradas propias** guardadas: «ataque con la espada larga», «salvación de
  Constitución con ventaja».

### 25 · Las condiciones

Envenenado, apresado, aturdido, cegado, derribado… **Ponerlas y quitarlas tiene que ser de un
gesto**, porque en la mesa se hace cada dos minutos. Cada condición con su icono dibujado, su
nombre y **qué hace exactamente**, escrito corto, ahí mismo. En esta fase **no tienen duración**:
se ponen y se quitan a mano. La duración por turnos llega con la iniciativa, y hasta entonces
la interfaz **no puede insinuar** que hay un temporizador.

---

## Fase «Encuentros» — el combate

Va antes de los mapas. Es lo que más cambia la pantalla del DM.

### 26 · La pantalla de combate del DM

El **orden de iniciativa** como columna viva: quién va, quién sigue, quién ya actuó. Los
enemigos con **sus puntos de golpe reales**, los personajes con los suyos. Turno actual
destacado sin gritar.

### 27 · Resolver un ataque

Y aquí, la regla del tercer principio hecha pantalla: **el servidor compara el ataque contra la
CA y le propone el resultado al DM, que confirma o corrige.** Diseña ese momento: la propuesta,
el margen, y **los dos botones del DM: aceptar o cambiar**. El daño lo aplica el DM.

**Y diseña la misma escena vista por el jugador**, que es distinta y más pobre a propósito: ve
su tirada y ve lo que el DM dice que pasó. **No ve la CA ni si falló por poco.** Que la pantalla
del jugador no tenga un hueco donde debería ir ese dato: que esté pensada sin él.

### 28 · Los statblocks de monstruos y PNJ

Como una ficha de personaje, pero **para leerla de un vistazo en mitad de un turno**. Los
números grandes, los ataques accesibles, las notas del DM aparte. Y un botón para **meterlo al
combate** que sea obvio.

---

## Fase 3 — mapas, imágenes y la biblioteca

### 29 · La biblioteca de la campaña

Donde viven las imágenes: mapas, retratos, documentos escaneados, ilustraciones. **Con
visibilidad, como todo lo demás.** Cuadrícula de miniaturas, subir arrastrando, etiquetas,
buscador. **No hay editor de arte y no lo diseñes:** aquí se sube, se organiza y se importa. Lo
que hace especial a esta pantalla es la **curaduría**, no las herramientas.

### 30 · El mapa con pines

Una imagen de mapa con **marcadores que enlazan a las cosas del mundo**. Pulsar un pin abre el
lugar. **Dos capas: la del DM y la del jugador**, y un interruptor de niebla. Diseña **las dos
vistas del mismo mapa, una al lado de la otra**, porque esa diferencia es el producto.

### 31 · Retratos y adjuntos

El retrato en la ficha de personaje y en la fila de la lista; los adjuntos en las cosas del
mundo. Diseña **cómo queda una ficha sin retrato**, que será el caso la mitad de las veces: un
marco a medio trazo con la inicial, no un icono roto.

---

## Fase 4 — en vivo y en compañía

### 32 · Presencia y actualización en vivo

Quién está mirando la campaña ahora mismo. Y **la hoja que cambia sola** cuando el DM aplica
daño: diseña **cómo se anuncia un cambio que tú no hiciste** sin que dé un susto ni pase
inadvertido. Un resalte breve del número que cambió y una línea en el registro.

### 33 · Comentarios

Hilos colgados de una cosa del mundo o de una sesión. Con visibilidad, como todo.

### 34 · Notificaciones y actividad

Una bandeja: qué ha pasado desde la última vez. Agrupada por campaña, con lo importante primero
—«el DM te reveló algo», «te toca elegir en tu subida de nivel»— y lo demás plegado.

---

## Fase 5 — premium

### 35 · El creador de avatar

Una miniatura tridimensional del personaje. **Diseña solo el marco**: el visor, los controles
mínimos, y sobre todo **cómo se comporta cuando aún no hay avatar** y **cómo se anuncia que es
de pago sin volverse un anuncio**. El editor por dentro no es de esta entrega.

### 36 · Suscripción y facturación

Sobria y honesta: qué incluye, qué cuesta, cómo se cancela. Sin cuenta atrás ni urgencia
fabricada.

---

## Y estas cuatro, que no son de ninguna fase pero faltan

### 37 · Crear un personaje, paso a paso

Hoy es un formulario y debería ser **un asistente**: raza → clase → características → detalles,
con **el resumen de lo que llevas construido siempre a la vista** y la posibilidad de volver
atrás sin perder nada. Y **explicando lo que se elige**: quien monta su primer personaje no sabe
qué es un dado de golpe.

### 38 · El menú de personajes

Cómo se pasa de un personaje a otro y cómo se ve la mesa entera de un vistazo: retrato, nombre,
clase y nivel, puntos de golpe, condiciones activas. Para el DM es su panel de control de la
mesa; para el jugador es su cajón. **Diseña las dos versiones.**

### 39 · La vista de jugador en la mesa, en el móvil

El jugador **está en una mesa real con el teléfono en la mano**. Necesita: su ficha, tirar,
sus objetos, sus conjuros y el registro. **Nada más.** Diséñala como pantalla propia y para el
pulgar: lo que más se toca, abajo. Esta no es la versión estrecha de la pantalla de escritorio;
es otra pantalla.

### 40 · Buscar en toda la campaña

Un solo campo que busca en el mundo, en los personajes y en las sesiones, con resultados
agrupados por tipo y **filtrados por lo que quien busca puede ver**. Con atajo de teclado.

---

# QUÉ DEBES ENTREGAR

Para cada pantalla, **los dos temas** (oscuro y claro) y **tres anchos** (escritorio 1440,
tableta 1024, móvil 390). Son **cuarenta pantallas**: si una entrega se te hace larga, pártela
y dime por dónde vas, pero **no recortes la lista**.

Y para cada pantalla, **sus estados reales, no solo el feliz**:

- **Vacío** — con dibujo, frase y el botón que lo llena.
- **Cargando** — esqueletos, no un girador solo.
- **Error** — en línea, con qué pasó y qué hacer.
- **Sin permiso** — y aquí ojo: lo que un jugador no puede hacer **no se le enseña gris, no se
  le enseña**.
- **Lleno de verdad** — una campaña con veinte lugares y ocho sesiones, no con dos filas de
  ejemplo.

**Usa contenido de ejemplo real y en español**, del tono de una campaña de verdad: «El puerto de
Sarnath», «La Hermandad Gris», «El cargamento que no llegó», «Maestre Kellan», «El sello de cera
de la Casa Vhael». **Nunca «Lorem ipsum» ni «Elemento 1».** El contenido de ejemplo es parte del
diseño: enseña de qué va esto.

# QUÉ NO HACER

- Nada de emoji ni de glifos de fuente como icono.
- Nada de valores en inglés o en mayúsculas de código en la pantalla.
- Nada de degradados vistosos, sombras difuminadas grandes, cristal esmerilado ni neón. Esto es
  un instrumento.
- Nada de botones de «Editar» que abran un formulario para cambiar un valor que ya se está
  mirando.
- Nada de avisos flotantes para errores.
- Nada de botones de guardar deshabilitados.
- Nada de «¿Olvidaste tu contraseña?»: esa función no existe todavía.
- Nada de texto por debajo de 4,5:1 de contraste, en ninguno de los dos temas.
- Nada de párrafos de lectura estirados a lo ancho de la pantalla.
- Nada de campos de escritura por debajo de 16px.
