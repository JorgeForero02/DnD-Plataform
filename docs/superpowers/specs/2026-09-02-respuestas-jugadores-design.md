# Respuestas de los jugadores — y lo que cambian

**Fecha:** 2026-09-02. **Estado:** respuestas recogidas, decisiones pendientes de plan.
**Origen:** el autor pasó a los jugadores la presentación *"Delante de la pantalla"* con ocho
preguntas. Este documento recoge lo que contestaron y, sobre todo, **qué cambia** — que es lo
que importa. Tres cambian el diseño de verdad y una **contradice una exclusión** de la spec de
alcance de la fase 2.

> La spec `2026-09-01-fase-2-alcance-design.md` es un **registro fechado y no se reescribe**. Las
> contradicciones se declaran aquí y se resuelven en el plan de la fase que las ejecute.

---

## 1 · Ver las tiradas de los demás en el momento — NO hace falta

**Respuesta:** *"sí está bien"* — les vale como está: se cantan en voz alta.

**Qué cambia:** nada, y eso es una confirmación valiosa. El sondeo periódico sigue siendo
suficiente y **no se paga por tiempo real** hasta que se juegue a distancia. Coincide con lo que
ya decidía la spec.

---

## 2 · El DM edita sin avisar — SÍ, y con las dos opciones

**Respuesta:** *"opción de DM: que notifique o haga cosas secretas"*, con un ejemplo concreto que
el autor pidió investigar: **la hidra falsa**.

**Qué es la hidra falsa.** Un monstruo casero de Arnold K. (*Goblin Punch*, 2014), probablemente
el más famoso del homebrew de 5e. Canta, y todo el que la oye **deja de percibirla** aunque la
tenga delante; a quien devora, **lo olvidan todos**: desaparece de la memoria de la gente, no
solo del mundo. Cuando muere, las memorias vuelven de golpe.

**Qué cambia, y es más de lo que parece.** Hasta ahora el modelo de visibilidad solo sabía
**enseñar**. Esto pide lo contrario: **poder retirar algo que un jugador ya vio**, sin aviso.

Lo que hay que construir, en orden de dificultad:

1. **Revocar una concesión de visibilidad.** Hoy `EntityVisibilityGrant` se puede crear; hay que
   poder quitarla, y que la pantalla del jugador deje de tenerlo — no ocultarlo, no enviárselo.
2. **Edición silenciosa contra edición anunciada.** Un interruptor por acción, del DM: *"que se
   entere"* o *"que no se entere"*. Es el mismo principio de las tiradas ocultas, aplicado a
   escribir en vez de a tirar.
3. **Y una regla que hay que acertar, porque es la que hace que funcione en la mesa:** las
   **notas y comentarios que escribió el jugador NO se borran**. En la mesa real, el terror de la
   hidra falsa nace justo de eso — tus propios apuntes contradicen tu memoria. Una herramienta
   que limpiara también las notas del jugador **mataría el truco** en vez de servirlo.
4. **Cuidado con el registro inmutable.** El log de tiradas de 2C no se edita nunca; si una
   tirada menciona lo borrado (*"percepción para ver al posadero"*), hay una fuga. Decidir si el
   log se filtra por visibilidad al mostrarse — probablemente sí, con la misma matriz.

**Dónde va:** revocar la concesión y la edición silenciosa son **de la fase 1 ampliada**, no
necesitan el motor. La filtración del log va con 2C.

---

## 3 · Saber que algo es solo tuyo — SÍ, y además poder compartirlo

**Respuesta:** *"está bien así, si la quiero o no compartir la información"*.

**Qué cambia:** aparece una capacidad que no estaba en ningún documento — **que el jugador
reparta lo que sabe**. Hoy la visibilidad la decide siempre el DM; esto añade que quien recibe un
secreto pueda pasárselo a otro jugador dentro de la herramienta.

**Decisión que hay que tomar:** si compartir crea una concesión nueva (y entonces el DM la ve, y
puede revocarla — coherente con el punto 2) o si es solo un gesto social fuera del sistema. La
primera es más trabajo y mucho más interesante: convierte la información en algo que **circula**,
que es lo que pasa en una mesa.

---

## 4 · Lo que hoy se lleva a mano y molesta — la lista más útil de todas

**Respuesta, literal:** *"inventario de hechizos, subida o bajada de atributos temporales,
cambios de items de inventarios y todas las cosas que se hacen manuales molestas"*.

Tres cosas, y **una contradice la spec**:

| Lo que pidieron | Estado en el alcance actual |
|---|---|
| **Inventario de hechizos** | **La spec lo EXCLUYE**: *"sin matemáticas de conjuros… la lista de conjuros es texto"* |
| **Atributos temporales arriba y abajo** | Parcial: hay estados, pero **nada modela un bono temporal a una característica** |
| **Cambios de objetos del inventario** | En 2B, ya en alcance |

**Sobre los conjuros — la contradicción, declarada.** La spec excluye la matemática de conjuros
por su tamaño (espacios por nivel, preparados contra conocidos, trucos que escalan). Pero el
informe de huecos ya argumentaba que **un espacio de conjuro es el mismo mecanismo que la
inspiración** — un contador con máximo que un descanso repone — y el propio principio P5 de la
spec dice eso mismo. Con los jugadores pidiéndolo explícitamente, la recomendación cambia:
**los espacios de conjuro entran como recurso consumible en 2A**, y lo que sigue fuera es la
*interpretación* de cada conjuro. Nueve contadores sobre código que ya se va a escribir.

**Sobre los atributos temporales.** *"+2 a Fuerza durante una hora"* no es un estado con nombre
ni un objeto equipado: es un **modificador con caducidad**. Encaja con el reloj de campaña de 2C
y con el modelo de modificadores de 2A, pero **hoy no está escrito en ninguno de los dos**.
Hueco nuevo, y sale de la mesa, no de la revisión.

---

## 5 · Móvil — sí, aunque hoy sea incómodo

**Respuesta:** *"versión de móvil, aunque es incómodo, pero sería interesante"*.

**Qué cambia:** deja de ser una pregunta abierta. No obliga a una aplicación nativa, pero sí a
que **cada pantalla nueva se decida también en pantalla estrecha**, y no se arregle después.

Ya hay una deuda de esta clase resuelta a medias: los controles de formulario llevan **suelo de
16 px en pantallas táctiles** porque por debajo iOS Safari hace zoom al enfocar
([07-historial.md](../../07-historial.md), tarea 1.19b). Faltan las decisiones de tamaño de
objetivo táctil y de qué pasa con la tira de pestañas del detalle de campaña en un móvil.

---

## 6 · Varios personajes — se guardan como recuerdo, y pueden volver

**Respuesta:** *"que se queden guardados como recuerdos; hay campañas donde te pueden revivir por
items, entonces estaría bueno conservarlo por si acaso"*.

**Qué cambia:** un personaje **no se borra**. Se archiva.

Consecuencias concretas: hace falta un estado (`activo` / `caído` / `retirado`) en vez de un
borrado, la lista de la campaña muestra por defecto los activos, y **resucitar es volver a
activar**, no crear otro. Es barato ahora y molesto después, porque el borrado de hoy es
definitivo. Coincide además con el matiz que dio el DM asesor: *"crear a partir de uno anterior"*
copiando concepto pero **no** características.

---

## 7 · Dados con física — indiferente, pero bienvenido

**Respuesta:** *"da igual, pero sí estaría bien"*.

**Qué cambia:** confirma lo ya decidido — **opción por campaña o por usuario**, sobre el mismo
resultado que ya decidió el servidor. Nadie lo pide con fuerza, así que no adelanta a nada.

---

## 8 · Ranuras de equipo y manos — **"sí, es muy importante"**

**Respuesta:** la más contundente de las ocho.

**Qué cambia:** el hueco **H1** del informe de huecos deja de ser una recomendación y pasa a ser
requisito. Con él vienen sus dos compañeros de decisión: el estado de un objeto es **tres**
(llevado / equipado / **sintonizado**, con tope de 3 en el SRD), no un booleano.

**Y sigue siendo barato solo ahora**: entra con el inventario de 2B, antes de que existan filas
de equipo sin ranura y antes de que la fórmula de CA —que **no es una suma**— se dé por cerrada.

---

## Resumen: qué se mueve

| | Cambio | Dónde |
|---|---|---|
| **8** | Ranuras de equipo y estado triple del objeto | **2B**, requisito |
| **4** | Espacios de conjuro como recurso consumible | **2A**, contradice la exclusión de la spec |
| **4** | Modificadores temporales con caducidad | **2A + 2C**, hueco nuevo |
| **2** | Revocar visibilidad y edición silenciosa | **fase 1 ampliada** |
| **3** | Que un jugador comparta lo que le revelaron | Decidir si crea concesión |
| **6** | Personaje archivado en vez de borrado | Antes de que el borrado tenga datos que perder |
| **5** | Cada pantalla se decide también en móvil | Criterio permanente |
| **1, 7** | Sin cambios; confirman lo decidido | — |
