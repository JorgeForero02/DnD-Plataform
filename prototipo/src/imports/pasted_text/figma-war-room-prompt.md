# Prompt para Figma Make — la mesa de «Sala de Guerra»

---

## 0 · Qué estás construyendo, y qué NO

No estás construyendo una aplicación web. **Estás construyendo la interfaz de un juego de rol que se
juega en el navegador.**

La diferencia no es estética, es estructural. Una aplicación web se **navega**: vas a una sección,
haces algo, vuelves. Un juego tiene **un sitio donde estás**, y todo lo demás se abre encima sin
sacarte de ahí. Si al terminar esto un jugador tiene que preguntarse «¿en qué pantalla estoy?»,
está mal hecho.

**Antes de diseñar nada, busca referencias visuales y de interacción** de los juegos y herramientas
que se citan más abajo. Si no puedes buscar, usa las descripciones detalladas que te doy: están
escritas precisamente para que puedas ejecutarlas sin verlas.

---

## 1 · El producto

**«Sala de Guerra»** es una plataforma para jugar partidas de Dungeons & Dragons 5.ª edición por
internet, con amigos.

- **Un DM** (director de juego) narra, controla a los monstruos y decide qué sabe cada jugador.
- **De dos a cinco jugadores**, y **cada uno maneja un solo personaje**. Esto es importante y lo
  repetiré: no es un juego de un jugador controlando un grupo.
- **Las sesiones son largas y en directo**: quedan una tarde y juegan tres o cuatro horas seguidas.
  **Pero alguien puede irse a la mitad y volver**, así que reincorporarse tiene que ser gratis.
- Entre sesiones se sigue jugando **por mensajes**, a ratos, durante la semana. Es un modo
  secundario pero **tiene que estar visible**, no escondido.
- **No hay mapa ni tablero todavía.** Se está construyendo. Diseña como si esa pieza fuera a llegar
  después, dejándole su sitio (ver §7).

---

## 2 · El error que NO debes cometer — anti-referencias

Esto es lo primero porque es lo que sale por defecto y **arruinaría el encargo**.

**NO hagas nada que se parezca a:**

- **Un panel de administración.** Nada de barra lateral con secciones, migas de pan, tablas con
  filtros, ni un «Dashboard» con tarjetas de métricas.
- **Notion, Linear, Jira, Confluence o cualquier herramienta de productividad.** Ese lenguaje
  visual —tipografía neutra, mucho blanco, iconos de línea finos, todo gris— es exactamente lo
  contrario de lo que se pide.
- **Una rejilla de tarjetas.** «Tarjetas iguales en una cuadrícula» es la respuesta perezosa a
  cualquier lista y aquí está prohibida salvo que lo pida explícitamente abajo.
- **Un formulario con etiquetas encima de campos.** Crear un personaje no puede parecer darse de
  alta en un banco.
- **Una pestaña por tipo de dato.** Esto es el error concreto que tiene la versión actual del
  producto y que este rediseño existe para corregir: hoy hay dieciséis pestañas —PNJ, Lugares,
  Misiones, Facciones, Objetos, Sucesos, Documentos, Sesiones, Personajes…— que son literalmente
  la lista de tablas de la base de datos convertida en menú. **No reproduzcas eso.**

**El olor que hay que evitar, dicho en una frase:** que parezca que estás rellenando fichas en una
oficina en vez de jugando con tus amigos.

---

## 3 · Referencias, descritas para que puedas ejecutarlas

### 3.1 · Baldur's Gate 3 — la arquitectura (referencia principal)

Es la referencia número uno **de estructura**, no de estilo (es un juego 3D de fantasía oscura;
nosotros no).

Lo que hay que copiar, y está verificado en su documentación de controles:

- **La pantalla del juego nunca se sustituye.** Siempre estás «en el juego».
- **Abajo, una barra de acciones** (hotbar) con lo que puedes hacer ahora: ataques, conjuros,
  objetos. Ocupa el ancho, está siempre.
- **Abajo a la izquierda, los retratos del grupo** con su vida y sus estados. Siempre.
- **Diez paneles con tecla de alternar**: hoja de personaje (N), inventario (I), vista de grupo
  (Tab), libro de conjuros (K), reacciones (L), diario (J), mapa (M), inspiración (P). **Se abren
  ENCIMA del juego y al cerrarlos vuelves exactamente donde estabas.**
- **Y el detalle que revela toda la arquitectura**: la barra de acciones y los retratos **no tienen
  tecla de alternar**. Un panel tiene tecla porque **se quita**; la barra y los retratos no la
  tienen **porque nunca se quitan**. Esa es la línea que separa lo permanente de lo superpuesto, y
  quiero que la respetes.
- **La vista de grupo (Tab) y la hoja de personaje (N) son dos superficies distintas**, no la misma
  con un selector. Ver a los cinco de un vistazo y ver a uno en profundidad son dos cosas.

**Cómo enseña sin manual** — esto es lo que hace que «bastante información» no agobie:

- Cada acción lleva **su coste escrito debajo del nombre**, en el mismo sitio donde la pulsas. No
  en un tooltip, no en otra pantalla.
- Las reacciones que van a interrumpirte llevan **un bocadillo de diálogo dibujado sobre el icono**.
  El estado de la configuración se ve **sobre el objeto configurado**, nunca en un menú de ajustes.
- Se llega a cada panel **por dos caminos**: pulsando el objeto en pantalla **y** por la tecla.
  Nunca solo por la tecla.

**El momento de la tirada de dados** (a copiar en espíritu):

- **Antes** de tirar aparece una franja abajo que ofrece **añadir bonificadores** — tú o tus
  compañeros podéis intervenir en la tirada que viene.
- El dado sale **grande y en el centro**, y los modificadores se van **apilando junto a él con su
  origen escrito** («Destreza +3», «Competencia +2», «Ventaja por flanqueo»).
- **Después de un fracaso**, y esto es lo mejor: se ofrece **repetir** gastando un recurso, con el
  recurso contado en el propio botón — «Usar inspiración (2)». **El momento no termina cuando el
  dado se para: termina cuando decides si aceptas el resultado.**

### 3.2 · Divinity: Original Sin 2 — el mismo esqueleto, más artesanal

Mismo reparto que BG3 —barra de acciones abajo, retratos, paneles superpuestos— con una
personalidad más de manuscrito: marcos ornamentados, texturas de pergamino y metal, y un uso muy
claro del dorado y el ámbar para separar lo interactivo de lo decorativo. **Tómalo como referencia
de acabado**: el nuestro tiene que sentirse un objeto, no una hoja de cálculo.

### 3.3 · Disco Elysium — el hilo COMO juego (referencia crítica)

**Esta es la referencia más importante para nosotros**, porque nosotros no tenemos mundo 3D que
mirar: tenemos texto.

En Disco Elysium **la conversación es el juego**. Y funciona porque:

- El texto ocupa una columna **cómoda de leer**, con una tipografía con personalidad, no la de un
  formulario.
- **Cada voz tiene su color y su tipografía**: el narrador, los personajes, y las tiradas de
  habilidad se distinguen **de un vistazo, sin leer**.
- **Las tiradas aparecen dentro del propio hilo**, como un momento tipográfico distinto —no en un
  cuadro aparte— y se ven la dificultad, los modificadores y el resultado.
- **La cabecera dice dónde estás.** Aunque no veas nada, sabes que estás en el vestíbulo del hostal.
- El registro se puede **releer** y sigue teniendo sentido días después.

**Nuestro hilo de sesión tiene que sentirse así**: literario, con jerarquía tipográfica, con las
tiradas incrustadas como momentos, y con una cabecera que te dice dónde está la escena.

### 3.4 · Discord — el gesto de escribir

Para el modo por mensajes entre sesiones: el campo de escritura abajo, siempre accesible, que
crece con el texto; los mensajes agrupados por autor; y la marca de **«no leído desde aquí»**, que
para nosotros es esencial porque la gente entra y sale a mitad de sesión.

**Pero no copies su aspecto.** Discord es una aplicación de chat gris; nosotros somos una mesa de
juego.

### 3.5 · La ficha de personaje de D&D en papel

Para la hoja: una hoja de personaje real de 5.ª edición tiene **bloques con jerarquía** —las seis
características en cajas grandes arriba, las habilidades en una columna larga, el combate a la
derecha— y eso funciona porque llevas cuarenta años mirándola. **Respeta esa disposición conocida**
en vez de inventarte una nueva.

---

## 4 · La arquitectura: tres estratos

Todo lo que diseñes pertenece **exactamente a uno** de estos tres estratos, y quiero que en la
entrega digas de cuál es cada cosa.

**1 · PERMANENTE.** Nunca se sustituye, **no tiene botón de cerrar**, está en todas las pantallas de
la mesa. Aquí van: la cabecera de escena, el hilo, los retratos y la barra de acciones.

**2 · SUPERPUESTO.** Se abre **encima** del permanente, lo tapa parcialmente, tiene botón de cerrar,
se cierra con Escape, y **al cerrarlo vuelves exactamente donde estabas**. Aquí van: la hoja de
personaje, el inventario, la consulta del mundo, el bestiario, la ficha de una entidad. **Solo uno
abierto a la vez.**

**3 · CONTEXTUAL.** **No se abre: aparece** porque ha pasado algo, y se va solo o con un gesto.
Aquí van: el momento de la tirada, «el DM te pide una tirada», «es tu turno», «te perdiste esto».

---

## 5 · Los tres estados de la mesa

La mesa es **una sola pantalla** que cambia según lo que está pasando. No son tres pantallas
distintas: son tres estados de la misma.

**Estado A · EN REPOSO** (no hay sesión abierta). Es la pantalla de aterrizaje de la campaña.
El hilo con lo último que pasó, quién es el grupo, cuándo se juega, y para el DM el botón de
**empezar la sesión**. Se puede escribir en el hilo: es el modo por mensajes.

**Estado B · EN SESIÓN** (hay una sesión abierta). Lo mismo, más: el tiempo que lleva la sesión, los
retratos con vida y estados **en vivo**, la barra de acciones completa, y los dados.

**Estado C · EN COMBATE** (hay un encuentro). Lo mismo, más una **capa de combate**: el orden de
turnos como una tira sobre los retratos, de quién es el turno ahora, y en la barra de acciones lo
que te queda por gastar este turno (acción, acción adicional, reacción).

**El paso de un estado a otro tiene que verse.** Empezar una sesión y entrar en combate son momentos,
no cambios de configuración.

---

## 6 · Dos disposiciones: jugador y DM

**Esta es la diferencia más importante con Baldur's Gate 3 y quiero que la entiendas bien.**

En BG3, **un jugador maneja a cuatro personajes**, así que los retratos del grupo son **mandos**:
pulsas uno y pasas a controlarlo.

**Aquí somos varios manejando uno cada uno.** El personaje de otro jugador **no es tuyo y no lo
mueves**. Por lo tanto:

### La mesa del JUGADOR

- **Su personaje delante y con detalle**: su vida, sus estados, sus acciones a mano. Es el
  protagonista de su pantalla.
- **Los demás en segundo plano**: se ven, con lo justo —vida, estados— y **qué están haciendo**
  (sacado del hilo). **Sobre el retrato de otro NO hay botones**, porque no puedes hacerle nada.
- Puedes **abrir** a otro para mirarlo en detalle, pero es un gesto deliberado, no lo que ves por
  defecto.

### La mesa del DM

- **Él sí está en la situación de Baldur's Gate**: maneja a muchos. Su disposición es **la parrilla
  de todos** —jugadores y monstruos— **con mandos en cada uno**: aplicar daño, poner una condición,
  abrir su ficha.
- Y tiene sus **herramientas de narración**: revelar algo a la mesa, pedir una tirada a alguien,
  avanzar el reloj, sacar una criatura.

**Es la misma pantalla con dos disposiciones**, no dos pantallas distintas. Y el DM **ve más cosas
que un jugador** en todas ellas.

---

## 7 · El escenario cuando no hay mapa

El problema a resolver: en BG3 el escenario es el mundo 3D. Nosotros no lo tenemos todavía.

**La solución que quiero:** el sitio donde irá el tablero lo ocupa desde ya **una cabecera de escena
viva**, y no un cuadro vacío que diga «en construcción».

La cabecera de escena muestra, siempre:

- **Dónde está la escena** («El Puerto Viejo, almacén cuatro»), con una línea de ambientación.
- **Qué hora es en el mundo del juego** y qué día llevan.
- **Quién está presente.**

Y **cambia sola con lo que pasa**: cuando el DM revela un lugar, la cabecera pasa a ese lugar;
cuando avanza el reloj, cambia la hora; cuando cae la noche, **el tratamiento visual acompaña**.

**Diséñalo dejando claro dónde encajará el mapa más adelante**, de forma que cuando llegue no
sustituya a la cabecera sino que **la acompañe**: la cabecera pasa a ser la banda superior del
tablero.

---

## 8 · Fuera de la sesión, tampoco puede ser un trámite

Esto lo pide el autor explícitamente, así que no lo despaches con formularios.

**8.1 · Elegir campaña.** Como la pantalla de partidas guardadas de un RPG, no como una lista de
proyectos. Cada campaña tiene su carácter: su nombre con tipografía de título, dónde se quedó la
historia, cuándo se jugó por última vez, y quién está dentro. Si hay que elegir entre dos, que se
sienta que abres una crónica.

**8.2 · Crear personaje.** Como el creador de personaje de un RPG: **pasos con consecuencias
visibles**. Al elegir una raza, se ve **qué cambia** en los números. Al elegir clase, se ve qué sabes
hacer. Nada de un formulario largo con un botón «Guardar» al final; se construye **viendo cómo se
construye**. Y en cada paso, lo que aún falta por decidir se dice sin regañar.

**8.3 · El mundo (personajes no jugadores, lugares, misiones, facciones, objetos, sucesos,
documentos).** **NO una pestaña por tipo.** Piensa en el **códice de un RPG** —un libro consultable,
con sus entradas enlazadas entre sí—: una sola entrada al mundo, con búsqueda, y las categorías
como filtros dentro, no como secciones del menú. Se entra a **leer**, y se sale volviendo a donde
estabas.

**8.4 · La ficha de una entidad**, cuando la lees: como la página de un libro. Tipografía de lectura,
medida cómoda, y los enlaces a otras entradas integrados en la prosa.

---

## 9 · Las pantallas que quiero, y qué lleva cada una

Entrégalas **navegables entre sí**, no como imágenes sueltas. Se tiene que poder recorrer.

1. **Elegir campaña** (§8.1).
2. **La mesa · jugador · en reposo** (estado A, disposición de jugador).
3. **La mesa · jugador · en sesión** (estado B). **Es la pantalla más importante de todo el
   encargo.** Dedícale el doble de esfuerzo que a cualquier otra.
4. **La mesa · jugador · en combate** (estado C).
5. **La mesa · DM · en sesión** (estado B, disposición de DM, con las herramientas de narración).
6. **La mesa · DM · en combate** (estado C, disposición de DM).
7. **Panel superpuesto: la hoja de personaje**, abierta sobre la mesa. Con sus números, y con la
   posibilidad de **desplegar de dónde sale cada número** (ver §10).
8. **Panel superpuesto: el inventario.**
9. **Panel superpuesto: la consulta del mundo**, con el gesto de **enseñar algo a la mesa**.
10. **Capa contextual: el momento de la tirada**, en sus tres instantes — antes (se puede
    intervenir), durante (el dado y los modificadores) y después (el resultado, y la segunda
    oportunidad si se falló).
11. **Capa contextual: reincorporarse.** Alguien vuelve a mitad de sesión y ve **qué se perdió**.
12. **Crear personaje** (§8.2), al menos dos pasos.

---

## 10 · Reglas del producto que la interfaz tiene que respetar

Estas no son preferencias: son cómo funciona el sistema por debajo.

**10.1 · Cada número enseña de dónde sale.** El motor calcula la ficha y **guarda la explicación**:
`CA 18 = 14 cota de malla + 2 escudo + 2 Destreza`. Eso hay que poder desplegarlo en la hoja y en
las tiradas. **Es la característica que distingue a este producto**, así que dale sitio y hazla
bonita, no la escondas en un tooltip.

**10.2 · Cinco niveles de visibilidad, y el DM decide.** Cada cosa del mundo puede ser pública, para
los jugadores, solo para su dueño, solo para el DM, o para personas concretas. **La interfaz tiene
que decir siempre quién ve lo que estás mirando**, y el gesto de **revelar** algo tiene que ser
rápido y evidente para el DM.

**10.3 · Lo que un jugador no debe saber, no llega a su pantalla.** No lo escondas con un candado:
sencillamente no está. Diseña las pantallas del jugador **sin huecos** donde debería estar lo que no
ve.

**10.4 · El sistema propone, el DM decide.** Nunca digas «has impactado» como un hecho consumado sin
que el DM lo confirme. El lenguaje de la interfaz tiene que dejar claro **quién manda**.

**10.5 · Nada de códigos internos en pantalla.** Ni `DM_ONLY`, ni `poisoned`, ni `LOCATION`. Todo en
castellano y legible: «solo el DM», «envenenado», «Lugar».

---

## 11 · Identidad visual — «Sala de Guerra»

Ya existe y hay que respetarla: **pizarra naval y cobre**. Es la mesa de mapas de un cuartel, con
luz de lámpara. Seria, cálida y con ornamento; **no minimalista y no futurista**.

**Estos son los valores exactos. Úsalos como variables CSS, no los reinventes.**

```css
/* Tema oscuro (principal) */
--bg: #10171c;            /* fondo, pizarra profunda */
--surface: #1a2329;       /* superficies elevadas */
--vellum: #2a2419;        /* pergamino, para la lectura del mundo */
--text: #dce3e6;
--muted: #8b99a1;
--accent: #4a9bb8;        /* azul señal: SOLO significa «puedes pulsar esto» */
--accent-text: #6fb6ce;
--copper: #c97d46;        /* cobre: SOLO significa «esto es del mundo» */
--copper-text: #dd9663;
--danger: #c4564b;
--danger-text: #e08076;
--warning: #e0a83c;
--radius-sm: 4px;
--radius-md: 6px;
```

**Tres colores, tres oficios, y no se mezclan:** el azul es acción, el cobre es mundo (reglas,
capitulares, marcas de tipo), el rojo es peligro. Que algo sea cobre **no** significa que se pueda
pulsar.

**Tipografías** (las cuatro tienen un oficio distinto):

```css
--font-title:  Marcellus, "Palatino Linotype", Georgia, serif;   /* títulos */
--font-chrome: "Public Sans", system-ui, sans-serif;             /* interfaz */
--font-world:  "EB Garamond", "Iowan Old Style", Georgia, serif; /* prosa del mundo */
--font-data:   "IBM Plex Mono", ui-monospace, monospace;         /* números y dados */
```

**Escala de espaciado**: 0.25 / 0.5 / 0.75 / 1 / 1.5 / 2 / 3 rem.

**Tema claro obligatorio también**, con los mismos oficios de color. Y **un tercer modo de lectura**
más cálido para leer prosa larga.

**Ornamento: sí.** Reglas de cobre, capitulares en la prosa del mundo, y una textura sutil de
pergamino en las superficies de lectura. Pero **el ornamento no compite con la información**: nunca
sobre números ni sobre controles.

---

## 12 · Restricciones duras

- **Portátil de 1366×768 es el objetivo principal.** Medido sobre la versión actual: dos columnas
  laterales de 18rem se comen 576 px y no queda hilo legible. **Caben tres columnas y ni una más**,
  y las laterales tienen que ser estrechas. Todo lo demás **se superpone**.
- **Iconos dibujados** (SVG en línea), **nunca emoji ni glifos de fuente**: tienen que heredar el
  color del texto y verse igual en todos los sistemas.
- **Contraste real**: texto normal 4.5:1, texto grande 3:1, en los dos temas. Se va a medir.
- **Foco de teclado visible siempre**, y las teclas rápidas como **acelerador, no como único
  camino** — el objeto en pantalla siempre tiene que estar. Cuidado: el hilo tiene un campo de
  escritura, así que las teclas de una letra no valen mientras se escribe.
- **Nada de bibliotecas de componentes** (ni MUI, ni Ant, ni shadcn): componentes propios sobre los
  tokens de arriba.
- **Interfaz en castellano.** Todo el texto visible, en español de España, incluido el texto de
  ayuda.

---

## 13 · Cómo quiero la entrega

- **React + TypeScript + Tailwind CSS**, funcional y navegable.
- **Los colores y tipografías por variables CSS** con los nombres de §11, y las utilidades de
  Tailwind resolviendo a esas variables. Nada de hexadecimales sueltos en el marcado.
- **Un componente por pieza, con nombre descriptivo**, y **un fichero por pantalla**. Componentes
  pequeños: si uno pasa de 200 líneas, pártelo.
- **Di explícitamente, en un comentario en la cabecera de cada componente, a qué estrato pertenece**:
  permanente, superpuesto o contextual.
- **Datos de ejemplo creíbles**: una campaña de fantasía con nombres propios, cinco personajes con
  sus clases y niveles, un hilo de sesión con veinte mensajes de verdad —narración, tiradas,
  sellos— y un combate a medias. **Nada de «Lorem ipsum» ni «Personaje 1».** El realismo de los
  datos es lo que revela si la disposición funciona.
- **Y explica tus decisiones**: al final, un resumen de qué pusiste en cada estrato y por qué,
  y qué descartaste.
