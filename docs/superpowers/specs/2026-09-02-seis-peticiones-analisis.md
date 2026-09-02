# Las seis peticiones del autor — análisis y colocación · 2026-09-02

**Qué es esto.** El autor listó seis problemas tras usar la aplicación y pidió opinión sobre
cada uno y **dónde meterlo**. Esto es la respuesta razonada, para que la decisión no viva en
una conversación que se pierde al reiniciar el ordenador.

> Dos ya están hechas y desplegadas (**4** y **5**). Dos son tareas pequeñas e independientes
> (**1** y **3**). Una la **reformulo** en vez de construirla (**2**). Y la sexta es la más
> importante del proyecto desde hace meses, y va **dentro de la fase 2A**, no después.

---

## Resumen de colocación

| | Petición | Veredicto | Dónde |
|---|---|---|---|
| 1 | Bandeja de notificaciones | **Sí**, pero primero el sustrato | **Antes de 2A** · tarea pequeña |
| 2 | Sistema de amigos | **No como amigos.** Reformulado | **Antes de 2A**, en su versión barata |
| 3 | Invitaciones reutilizables | **Sí**, y es barato | **Antes de 2A** · tarea pequeña |
| 4 | Los modales parecen otra pestaña | **Era un defecto real** | ✅ **Hecho el 2026-09-02** |
| 5 | Fuera las líneas del acceso | Decisión del autor | ✅ **Hecho el 2026-09-02** |
| 6 | Sistema de eventos por cajas | **Sí, y es la columna vertebral que falta** | **Dentro de 2A**, solo el modelo. El lienzo, después |

---

## 1 · Bandeja de notificaciones

**De acuerdo, y hace más falta de lo que parece.** Hoy la aplicación no le cuenta nada a nadie:
un jugador no se entera de que le han invitado, de que hay sesión el viernes, de que alguien
comentó su ficha, ni de que el DM reveló algo que antes no veía.

**Lo que la hace barata:** la fase 1 ya emite eventos de dominio (`@nestjs/event-emitter`,
`campaign.created` y compañía). No hay que inventar de dónde salen los avisos; hay que
**guardarlos y enseñarlos**: una tabla `Notification` (destinatario, tipo, objeto, leída),
alimentada por los eventos que ya existen, y una bandeja en la cabecera.

**Lo que la hace importante:** el punto 6 no sirve de nada sin ella. Una regla que revela un
camino secreto tiene que **avisar a alguien**, o el DM se queda mirando la pantalla a ver si
pasó. La bandeja es la salida del motor de eventos.

**Recomendación:** hacerla **antes de 2A**, y a propósito **sin tiempo real** — se pide al
cargar y al cambiar de pantalla. Los WebSockets son la fase 4 y meterlos aquí es cambiar el
despliegue entero por un punto rojo.

---

## 2 · Sistema de amigos — aquí discrepo

**No lo construiría como «amigos», y creo que el autor pide otra cosa.** Un sistema de amigos
es un grafo social: solicitudes, aceptar, rechazar, bloquear, privacidad de perfil, qué ve un
amigo de ti. Es una funcionalidad entera, con sus propias pantallas y sus propios abusos, y
**duplica un concepto que ya existe**: la pertenencia a una campaña, que es la unidad real de
este producto. Nadie quiere «ser amigo» de su DM; quiere **estar en su mesa**.

**Lo que de verdad molesta** es tener que copiar y pegar un enlace por WhatsApp para invitar a
alguien que **ya tiene cuenta**. Eso se resuelve con dos cosas mucho más pequeñas:

1. **Invitar por correo a un usuario existente.** El DM escribe el correo, y si hay cuenta,
   la invitación le llega **dentro de la aplicación**. Sin enlace, sin pegar nada.
2. **La bandeja del punto 1**, que es donde esa invitación aparece y se acepta.

Eso cubre el 90 % del valor por el 10 % del trabajo, y **no cierra la puerta**: si algún día se
juega con desconocidos y hace falta un grafo social de verdad, se construye entonces con datos
reales de cómo se usa, no adivinando ahora.

> **Cuidado con la privacidad:** «invitar por correo» permite comprobar si un correo tiene
> cuenta, que es una fuga de padrón clásica. La respuesta del servidor debe ser **la misma**
> exista la cuenta o no («si hay una cuenta con ese correo, recibirá la invitación»).

---

## 3 · Una invitación por enlace

**Tiene razón y es barato.** Hoy es una decisión declarada —un enlace, una persona— y para
invitar a cuatro jugadores hay que generar cuatro enlaces. Para una mesa que se forma de golpe,
es fricción pura.

**Lo que yo haría:** que la invitación lleve **usos máximos** (1 por defecto, o «los que hagan
falta»), **caducidad** y **revocación**. No un código de campaña permanente: un enlace eterno
que circula por un grupo de WhatsApp acaba en la mesa de alguien que no invitaste, y **la
visibilidad de este producto se apoya en quién es miembro**.

**Coste:** dos columnas, una comprobación y una pantalla que ya existe. Cabe antes de 2A.

---

## 4 · Los modales parecían otra pestaña — ✅ hecho

**Era un defecto, no una impresión.** El velo era `bg-bg`, **opaco**: pintaba la pantalla entera
del color de la página, así que el diálogo no se leía como una capa sino como otro sitio.
Corregido el 2026-09-02: velo translúcido con desenfoque, borde de cobre y sombra.

**Lo que dejo anotado para más adelante:** varios de esos diálogos quieren ser **páginas**. Editar
una ficha larga con markdown en una caja centrada nunca va a ser cómodo, y las páginas de
lectura ya existen. Es un cambio de forma, no de fondo, y no urge.

---

## 5 · Las líneas del acceso — ✅ hecho

Fuera. Se probaron dos versiones y ninguna convenció; el componente queda en el repositorio sin
que nadie lo use, por si vuelve. La cuadrícula se queda: enmarca sin dibujar nada.

---

## 6 · «Un sistema de programación con cajas» — la petición grande

> *«cuando → jugador → revisa con → detalle → se desvela → camino secreto … darle control al DM
> no solo en partida sino antes de esta, automatizar eventos, incluso bloqueados hasta que todos
> los jugadores estén presentes y hagan algo»*

**Mi opinión, sin adornos: es la mejor idea que ha tenido este proyecto, y a la vez el mayor
riesgo de alcance que tiene.** Merece hacerse. No merece hacerse como el autor la imagina —
todavía.

### Por qué es buena

1. **La aplicación ya es una máquina de visibilidad.** «Se desvela un camino secreto» es, en
   este modelo, *subir la visibilidad de una ficha*. El efecto más valioso del sistema **ya
   está construido**: todo —listas, páginas, contadores— pasa por `canView`, así que cambiar un
   nivel se propaga solo. Eso es una ventaja enorme y no la tiene ninguna herramienta parecida.
2. **Resuelve un vacío que ya estaba anotado.** El plan de 2A abre con **P1: no existe «sesión
   en curso»**, y por eso el registro de dados de 2C no tiene de dónde colgar. Un motor de
   reglas necesita exactamente lo mismo: **saber qué ha pasado**. Son la misma columna
   vertebral. Construirlas por separado es construirla dos veces.
3. **Le da al DM trabajo que puede hacer entre semana**, que es cuando de verdad prepara. Hoy la
   plataforma solo sirve para escribir; con esto sirve para **preparar**.

### Por qué no como se imagina, todavía

**El lienzo de cajas es lo último, no lo primero.** Lo difícil no es arrastrar bloques: es
decidir **qué bloques existen**. Un lienzo sobre un vocabulario sin probar es un juguete que
nadie usa dos veces. El vocabulario se descubre usándolo, y para usarlo basta una frase
rellenable — que además es literalmente como lo dijo el autor:

> **Cuando** `⟨algo ocurre⟩` · **si** `⟨se cumple⟩` · **entonces** `⟨esto pasa⟩`

Eso es un formulario de tres desplegables. Se construye en días, no en semanas, y **cuando el
vocabulario esté probado, el lienzo es solo otra forma de editar lo mismo**.

### La forma que propongo

Es el patrón **suceso–condición–efecto** (ECA), el mismo de Foundry, de los disparadores de
Twine y de las cajas de «lee esto en voz alta cuando…» de cualquier módulo publicado.

| Pieza | Vocabulario inicial, **cerrado a propósito** |
|---|---|
| **Cuando** (suceso) | empieza una sesión · un jugador abre una ficha · alguien comenta · el DM pulsa un botón · una tirada supera una CD *(esto último, cuando 2A tenga dados)* |
| **Si** (condición) | están todos los jugadores presentes · tal ficha ya se reveló · tal marca de campaña está puesta · es la sesión número N |
| **Entonces** (efecto) | **revelar una ficha** (subir su visibilidad) · poner una marca de campaña · avisar (punto 1) · desbloquear otra regla |

**Sin bucles, sin variables, sin aritmética.** La única memoria son **marcas de campaña**
(banderas con nombre). Ese techo es deliberado: en cuanto haya bucles y variables esto deja de
ser una herramienta de DM y pasa a ser un lenguaje de programación que hay que depurar.

### Las cuatro cosas que hay que hacer bien o no hacerlo

1. **Una regla nunca decide quién ve qué; cambia el dato y `canView` decide.** Si el motor
   calculase visibilidad, habría **dos matrices**, y la fuga que todo el producto evita entraría
   por la puerta de atrás. Un efecto escribe `visibility = PLAYERS`; nada más.
2. **Traza obligatoria.** El DM tiene que poder preguntar **«¿por qué se reveló esto?»** y
   obtener: qué regla, cuándo, y qué suceso la disparó. Un sistema de automatización sin
   registro es magia, y la magia asusta y se desactiva.
3. **Efectos declarativos e idempotentes.** «La visibilidad **queda en** jugadores», no «sube un
   nivel». Una regla que se dispara dos veces no puede hacer daño.
4. **Ensayo en seco.** Poder simular «empieza la sesión 3 con todos presentes» y ver qué se
   dispararía, **sin** que se dispare. Es lo que separa una herramienta de preparación de una
   ruleta.

### Sobre reutilizarlo en la fase 2 («efectos de cosas»)

**Parcialmente de acuerdo, y con un aviso.** Compartir el **formato** de un efecto entre lo
narrativo y las reglas de juego es razonable —«otorgar objeto», «aplicar condición» son la
misma forma—. Pero **el combate de 5.ª edición y los disparadores narrativos son dominios
distintos**: duraciones, concentración, orden de iniciativa y pilas de condiciones no se parecen
a «revelar un lugar cuando alguien lo investigue». Si se fuerza un motor único, se acaba con un
motor que hace mal las dos cosas. **Formato compartido, motores separados**, y se unen el día
que se demuestre que es lo mismo.

### Colocación concreta

- **Dentro de 2A**, junto al estado de campaña/sesión que el plan ya necesitaba (P1): el
  **registro de sucesos**, las **marcas de campaña** y las **reglas con efecto «revelar»**, con
  su traza y su formulario de tres partes.
- **2B/2C:** el lienzo de cajas, ya sobre un vocabulario probado; los efectos de combate, si
  resultan ser lo mismo.
- **Nunca:** bucles, variables, aritmética, o una regla que decida permisos.

---

## Lo que esto cambia en el plan de 2A

2A entra con **una decisión más tomada y una menos pendiente**: P1 deja de ser «no sabemos si
hace falta estado de sesión» y pasa a ser «hace falta, y además lo pide el sistema de eventos».
Lo demás del plan no se toca: el motor de reglas de 5.ª edición sigue siendo su cuerpo
principal, y esto se apoya en el mismo estado.
