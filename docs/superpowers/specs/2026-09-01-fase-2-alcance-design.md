# Fase 2 — decisión de alcance: objetos, dados y condiciones

**Fecha:** 2026-09-01. **Estado:** decidido con el autor, pendiente de convertirse en plan.
**Manda sobre el plan maestro** en lo que se refiere al alcance de la fase 2.

Este documento existe porque el plan maestro define la fase 2 como *"ficha de personaje +
motor de reglas mínimo"* y **no menciona objetos, inventario, equipar ni tiradas**, mientras
que el documento fuente del producto sí los pide explícitamente:

> *"para los jugadores… consulta de hoja, progreso, **inventario**, recursos, hechizos y acceso
> a la información relevante **sin depender siempre del DM**"*
>
> Capas del motor: *"**fuentes de modificación permanentes**, por ejemplo raza, clase, feats o
> **items**"* · *"**fuentes de modificación temporales**: buffs, heridas, condiciones o efectos
> mágicos"*

Era un hueco entre el documento fuente y el plan. Se cierra aquí.

## Los dos principios que gobiernan todo lo de abajo

**1 · La máquina ejecuta, el DM arbitra.**
El sistema **no** decide cuándo hay ventaja o desventaja, ni si una condición aplica. Eso
depende de estar tumbado, cegado, flanqueado, a distancia larga, agarrando al enemigo, de un
hechizo de hace tres turnos… Automatizarlo es intentar interpretar el reglamento entero, y es
donde estos proyectos se hunden. **El DM lo marca; el sistema lo aplica y lo explica.**

**2 · El azar vive fuera del motor de reglas.**
El motor es determinista: esa es su razón de ser y lo que permite probarlo a fondo. Los dados
son lo contrario. Por tanto:

- El **motor** calcula **qué** hay que tirar: `2d20 quédate el peor + 7`, daño `1d8 + 4`.
- Un **tirador** aparte lo ejecuta, con generador aleatorio **inyectable**, para que las
  pruebas fijen la semilla y el resultado sea reproducible.

Si el azar entra en el motor, el motor deja de ser comprobable y pierde lo único que lo hacía
fiable.

## El corte, en cuatro entregas

| | Qué entra |
|---|---|
| **2A** | Motor de reglas + hoja de personaje. Modificadores manuales. **Traza de derivación por valor** |
| **2B** | Objetos con datos, inventario, equipar y desequipar → alimentan el motor como fuentes de modificación |
| **2C** | Tirador de dados con ventaja/desventaja marcada por el DM, condiciones **indefinidas** que el DM pone y quita, y registro de tiradas de la sesión |
| *(2D, opcional)* | Statblocks de NPC reusando el mismo motor. Solo si 2A–2C salieron limpias |

Cada una recibe su propio plan TDD cuando se llegue, siguiendo el patrón de la fase 1.

### 2A — el motor y la hoja

Lo que ya decía el plan maestro: modificadores de característica, bonificador de competencia,
CA (base + Destreza + anulaciones manuales), PG máximos por clase/nivel/CON, CD de salvación,
bonos de ataque. Datos del SRD 5.1 sembrados.

**La traza de derivación no es un adorno: es la funcionalidad.** Que el jugador vea

```
CA 18 = 14 cota de malla + 2 escudo + 2 Destreza
```

es lo que hace que **deje de preguntarle al DM de dónde sale el número** — que es el objetivo
declarado del autor. Sin traza, un inventario que cambia cifras solo cambia el motivo de la
pregunta: de *"¿cuánta CA tengo?"* a *"¿por qué tengo esa?"*.

### 2B — objetos e inventario

**Sí hacen falta datos estructurados.** Un objeto que solo es texto no puede alimentar el
motor ni tirar dados. Como mínimo: tipo (arma / armadura / escudo / consumible / otro), sus
efectos, y para las armas el dado de daño, el tipo de daño y la característica de ataque.

Dos orígenes: **catálogo SRD 5.1 sembrado** y **objetos propios del DM por campaña** (eso es
el *homebrew override* que el documento fuente ya pedía).

**Lista cerrada de efectos, y esto es una regla dura:**

| Se automatiza | Se queda como texto |
|---|---|
| Bono a la CA | *"prende fuego a los no-muertos los martes"* |
| Puntuación de característica (fija o sumada) | Cualquier efecto condicional o narrativo |
| Bono a salvaciones | Reacciones, activaciones, cargas |
| PG máximos, velocidad, competencia | Todo lo que no sea un número |

Con esa lista quedan cubiertos armadura, escudo, capa de protección, cinturón de fuerza y
anillos de bonos: **la inmensa mayoría de lo que una mesa toca de verdad**. Todo lo demás lo
lee el jugador y lo aplica a mano. El plan maestro ya avisaba: *"sin interpretación automática
de dotes y hechizos todavía"* — aquí pasa de aspiración a regla.

**Legal:** armaduras, escudos y armas del SRD 5.1 son OGL. Los objetos mágicos del SRD son un
subconjunto limitado; lo llamativo **no está** y no se copia.

### 2C — dados y condiciones

**Tirar:** "atacar con esta arma" produce `1d20 + bonificador` y su daño. Ventaja y desventaja
las **marca el DM** (`2d20` quedándose el mejor o el peor). Se muestra el desglose, no solo el
número.

**Condiciones: solo indefinidas, hasta que el DM las quite.** Y esto es una decisión de diseño
con motivo, no una simplificación perezosa:

> **Un turno no existe en el sistema.** Contar "tres turnos" exige iniciativa, orden y alguien
> que declare el comienzo de cada turno — es decir, un **rastreador de combate**, que es una
> funcionalidad entera de la fase 3–4.

La condición indefinida cubre el caso real que planteó el autor —*"le dio debilidad… y cuando
se cure se lo quito"*— **sin necesitar reloj alguno**. La duración en turnos entra cuando
exista la iniciativa, y entonces es casi gratis, porque la condición ya estará modelada.

## Los dados son un pilar, no un accesorio

Ampliado el 2026-09-01 a petición del autor: *"las tiradas de los jugadores las ven todos; las
del DM, decide él si se ven"*.

### Qué dados y qué notación

Los siete: **d4, d6, d8, d10, d12, d20 y d100**. Y una **expresión**, no un botón por dado,
porque lo que se tira de verdad casi nunca es un dado suelto:

| Expresión | Para qué |
|---|---|
| `2d6+3` | daño de un arma con modificador |
| `2d20kh1` | ventaja (quédate el más alto) |
| `2d20kl1` | desventaja (quédate el más bajo) |
| `4d6kh3` | **generar una característica** al crear personaje |
| `1d100` | tablas porcentuales |
| relanzar 1 y 2 | estilo de combate con arma a dos manos |

**Ojo con `4d6kh3`: eso hace falta en 2A**, no en 2C. Crear un personaje ya pide tirar
características, así que el **evaluador de expresiones entra con la hoja**, y 2C solo le añade
la pantalla, el registro y las condiciones.

**El desglose se muestra siempre, nunca solo el total:**

```
Ataque con espada larga (ventaja)
2d20kh1 + 7  →  [14, 8]  →  14 + 7 = 21
```

Es la misma idea que la traza de derivación de la hoja: un número sin explicación genera la
siguiente pregunta al DM.

### Las tiradas se ejecutan en el servidor. No es negociable

Si el dado se tira en el navegador, **el jugador puede repetir hasta que salga bien** y nadie se
entera. Eso convierte un tirador compartido en un adorno.

Por tanto:

- **El servidor tira, persiste y devuelve.** El cliente solo **anima un resultado que ya
  existe**.
- **El registro es inmutable**: una tirada no se edita ni se borra. Repetir es **una entrada
  nueva**, no un reemplazo. Eso es exactamente lo que la hace fiable.
- **El generador aleatorio es inyectable**, para fijar la semilla en las pruebas — coherente con
  el principio de que el azar vive fuera del motor de reglas.

### La visibilidad ya está construida y probada

Esta es la parte buena: **una tirada es un recurso más con su nivel de visibilidad**, y la
matriz de cinco niveles con su `canView` ya existe, con la matriz completa probada y filtrando
en todos los listados **de recursos con visibilidad** desde la fase 1 (entidades, sesiones,
personajes, enlaces, comentarios). **No cubre `GET /campaigns` ni `/campaigns/:id/members`**,
que no tienen campo `visibility` — se filtran por membresía, no por `canView`. Si una tirada
se modela como recurso con visibilidad de verdad, hereda la matriz sin más; no hace falta
tocar esos dos listados.

- **Tirada de jugador → `PLAYERS`** (o `PUBLIC`): la ve toda la mesa. Por defecto.
- **Tirada del DM → la decide él, tirada a tirada**: `PLAYERS` si quiere enseñarla, `DM_ONLY` si
  es secreta.

**Y "secreta" tiene que significar secreta de verdad:** el servidor **no envía** al jugador la
tirada oculta, igual que hoy no le envía una entidad `DM_ONLY`. No se esconde en el cliente —
eso no es ocultar nada. Ya hay un recorrido de navegador que comprueba ese principio sobre el
DOM real, y el de las tiradas debe seguir el mismo patrón.

Consecuencia práctica: **el pilar cuesta bastante menos de lo que parece**, porque la parte
difícil —quién ve qué, comprobado en el servidor— ya está hecha y probada.

### Ver las tiradas de los demás: sondeo ahora, tiempo real después

Que todos vean la tirada al instante suena a WebSockets, que son la fase 4. **No hacen falta
todavía**: el registro de tiradas es un recurso normal y un sondeo periódico da una latencia de
segundos con cero infraestructura. Y de momento se juega **presencialmente**, donde además se
dice en voz alta.

El modelo no cambia cuando llegue el tiempo real: se sustituye el sondeo por un empujón. Por eso
**no se paga por tiempo real ahora**.

### Lo que NO se construye

- **Dados en 3D.** Es animación, no funcionalidad, y compite con los dados de verdad que ya hay
  en la mesa. Una animación breve basta.
- **Comparar la tirada contra la CA y aplicar daño**: eso es combate, y sigue fuera (ver el
  apartado correspondiente).
- **Que el DM tire por un jugador.** Complica los permisos sin resolver nada real.

### El listón de calidad, ya que es un pilar

Una tirada guardada dice **qué se tiró, por qué, quién y cuándo**: expresión, resultado de cada
dado, total, el motivo (*"ataque con espada larga"*, *"salvación de Destreza"*), el autor y la
marca de tiempo. Sin el motivo, el registro es una lista de números y no sirve para nada al
repasar la sesión.

## Razas, subrazas y clases — dentro de 2A

Añadido el 2026-09-01 a petición del autor. **No es un sistema nuevo:** una raza y una clase
son la misma pieza que un objeto — una fuente de modificación. El documento fuente ya lo dice
(*"fuentes de modificación permanentes, por ejemplo raza, clase, feats o items"*), y el plan
maestro ya preveía sembrar los datos del SRD. Aquí se concreta hasta dónde.

**La misma división de siempre: los números se automatizan, los rasgos son texto.**

| Se calcula (la misma lista cerrada de los objetos) | Se muestra como texto |
|---|---|
| Aumentos de característica de raza y subraza | Suerte, Resistencia Implacable, Ancestro Feérico |
| Velocidad, tamaño, visión en la oscuridad | Furia, Ataque Furtivo, Oleada de Acción, Ki |
| Competencias: salvaciones, armaduras, armas, herramientas, idiomas | Cualquier aptitud con condición o activación |
| Dado de golpe → PG máximos por nivel | |
| Bonificador de competencia por nivel | |

Con eso, un semiorco bárbaro tiene CA, PG, salvaciones y competencias **calculadas solas**, y
sus aptitudes listadas al nivel que corresponde. Eso ya es una ficha útil.

### Lo difícil no son los rasgos: son las elecciones

*"+1 a dos características a tu elección"* (semielfo), *"elige cuatro habilidades de esta
lista"* (pícaro). Eso **no es un modificador estático**: es una decisión pendiente que el
jugador tiene que resolver, y es lo que hace difíciles los creadores de personajes.

**El motor ya tiene el hueco**: su salida incluye *"hoja calculada + **lista de avisos** +
traza de derivación"*. Una elección sin resolver **es un aviso** (*"te faltan 2 puntos de
característica por asignar"*), y una vez resuelta se convierte en un modificador normal,
indistinguible de los demás. Se modela como **modificador con parámetro pendiente**, no como
caso especial de cada raza.

### Tres límites, con su motivo

1. **Sin multiclase.** Multiplica todo —PG mixtos, competencias que no se acumulan igual,
   requisitos de característica, progresión de conjuros combinada— y es el recorte que más
   complejidad ahorra por menos valor perdido. Una clase por personaje.
2. **Sin matemáticas de conjuros.** Espacios por nivel, preparados contra conocidos, trucos que
   escalan: subsistema entero. La lista de conjuros es **texto**; la CD de salvación y el bono
   de ataque de conjuro **sí** se calculan, porque son dos fórmulas.
3. **Sin dotes.** Cada una es un caso especial.

### El SRD solo trae una subclase por clase

**Dato que condiciona la interfaz:** el SRD 5.1 incluye **un solo arquetipo por clase**
(Campeón, Berserker, Dominio de la Vida, Ladrón…). Los demás **no están y no se copian**. Las
subrazas también son un subconjunto (enano de las colinas, elfo alto, mediano piesligeros…).

Por tanto: **la subclase se modela en los datos** —para que quepa el homebrew del DM después—
pero **no se construye pantalla de elección** en la fase 2: sería un menú de una sola opción.

### Sembrar los datos es tedioso, no arriesgado

Las 9 razas y 12 clases del SRD con su progresión son **transcripción**, no ingeniería:
acotada, aburrida y verificable. Va como **tarea propia**, con pruebas sobre casos conocidos
(un enano de las colinas bárbaro de nivel 1 tiene tantos PG). Eso es justo lo que se quiere en
la parte más grande de una fase arriesgada.

## Subidas de nivel — dentro de 2A, y casi gratis

El nivel es **una entrada del motor**, no un proceso aparte: cambia el nivel y los valores
derivados se recalculan solos. Lo que hay que construir no es el cálculo, sino **la pantalla
que acompaña la decisión**.

**El plan ya tiene la pieza clave**: la salida del motor incluye *"**diff** contra la
instantánea anterior"*. Eso **es** el resumen de subida de nivel, sin lógica nueva:

```
Nivel 4 → 5
PG máximos   38 → 45   (+1d8+2)
Competencia  +2 → +3
Nueva aptitud: Ataque Extra
```

**Lo que sí hay que decidir y construir:**

- **PG al subir: tirar o media fija.** Las dos son reglas legítimas. Que el DM lo fije por
  campaña, con la media como opción por defecto — es la que no genera discusiones.
- **Las elecciones que desbloquea el nivel**: mejora de característica en 4, 8, 12, 16 y 19
  (sin dotes, ver límites), subclase al nivel que toque, habilidades nuevas. Se resuelven con
  el mismo mecanismo de "modificador con parámetro pendiente" de arriba.
- **Subir de nivel es una revisión, no un automatismo.** Se propone el diff, el jugador
  resuelve lo que falte, y confirma. Nada cambia a su espalda.

**Fuera de la fase 2:** los puntos de experiencia y sus tablas. El nivel lo fija el DM
(*progresión por hitos*), que es como juega la mayoría de las mesas y no cuesta nada. Los PX
son una capa opcional posterior.

## Contenido con derechos: qué entra y qué no

El autor pidió *"tomar como verdad la guía del jugador y el resto de su documentación"*. Hay
que separar dos cosas, porque **una es libre y la otra no**:

- **Las reglas y las fórmulas no son de nadie.** Que el bonificador de competencia sea +2 hasta
  nivel 4, que la cota de malla dé CA 16, que los PG suban por dado de golpe: eso es mecánica,
  y se implementa sin problema. **Aquí la guía del jugador sirve de referencia y se sigue al
  pie de la letra.**
- **El texto y el contenido sí tienen dueño.** Descripciones, nombres de subclases que no están
  en el SRD, dotes, conjuros del manual: **no se copian al repositorio ni se distribuyen**.

La decisión del proyecto **no cambia**: lo que el producto trae de serie es **solo SRD**. Nota
útil: desde 2023 el **SRD 5.1 está publicado bajo Creative Commons (CC BY 4.0)**, no solo bajo
la OGL — contenido libre de verdad, con atribución.

**La salida limpia para lo demás ya está en el diseño:** el DM crea su propio contenido por
campaña (el *homebrew* que el documento fuente ya pedía). Que el autor teclee en su mesa una
subclase de su manual es igual que escribirla en un cuaderno: uso privado. Lo que no puede
hacer el **producto** es venir con ella dentro.

Si esto llega a SaaS, esa línea es la diferencia entre un proyecto y un problema legal — por
eso queda escrita aquí y no en la memoria de una conversación.

## Ataques y combate — partidos en dos, y el segundo tiene bloque propio

Añadido el 2026-09-01. El autor pidió un cuadro de ataques estilo RPG que compare contra la CA
del objetivo y aplique daño. **Eso cruza la línea que este mismo documento dibujó** más abajo
("fuera de la fase 2: comparar contra la CA, aplicar daño"), así que se parte en dos: lo barato
entra en 2C, y lo que arrastra un sistema entero recibe **su propio bloque**.

### En 2C — el cuadro de ataques, sin objetivo

La ficha muestra los ataques disponibles como en cualquier RPG:

```
Espada larga        +7 al ataque      1d8+4 cortante
Arco corto          +5 al ataque      1d6+2 perforante
Rayo de fuego       CD 14 Destreza    2d6 fuego
```

Pulsas, **el servidor tira**, y la pantalla enseña el desglose. **El jugador canta el número y
el DM dice si entra.** Eso da la mayor parte de la sensación por una fracción del trabajo, y no
necesita nada que no esté ya diseñado en 2C.

### Bloque propio: **Encuentros** — entre la fase 2 y la 3

Lo demás no son funcionalidades sueltas: es **la semilla del control de combate**, y todas sus
piezas se necesitan entre sí. Nombrarlo aparte evita que la fase 2 —ya la más arriesgada, ya
crecida dos veces— se convierta en un año de trabajo.

Lo que va junto:

- **Statblocks de NPC con PG vivos.** No basta el dato: los PG tienen que bajar.
- **El encuentro**: quién participa. Sin eso, "el objetivo" no significa nada.
- **Iniciativa y orden de turnos.**
- **Ataque contra un objetivo**, con las dos reglas de abajo.
- **Aplicar daño**, decisión del DM.
- **Condiciones con duración en turnos** — aplazadas hasta aquí precisamente porque *"un turno
  no existe en el sistema"*. **Aquí es donde nacen.**

### Dos reglas de diseño que hay que fijar antes de construirlo

**1 · La comparación ocurre en el servidor, y la CA no viaja.**
Si el navegador del jugador compara, **tiene que conocer la CA del enemigo** — y eso es metajuego
servido en bandeja: cuenta los fallos y deduce el número. El servidor compara y devuelve
**"impacto" o "fallo"**, nunca la cifra. Es exactamente el mismo principio que ya impide que un
jugador reciba una entidad `DM_ONLY`: **la pieza ya está construida y probada**.

**2 · El sistema propone; el DM confirma o cambia.**
Si la máquina sentencia *"fallo"* delante de toda la mesa, **el DM pierde la capacidad de
perdonar una vida o de dejar entrar un golpe porque la escena lo pide**, que es una herramienta
de dirección, no un capricho. La pantalla dice *"21 contra CA 15 → impacto"* y el DM acepta o
corrige. Es el principio rector de la fase aplicado aquí: **la máquina ejecuta, el DM arbitra**.

### "Tirad iniciativa" necesita tiempo real para no caerse

El autor quiere que ese momento sea un aviso que aparece a la vez en la pantalla de todos.
**Eso es la fase 4.** Sin actualización en vivo el momento se deshace: el DM lo dice en voz alta
y cada jugador recarga su pantalla. **No se construye el aviso hasta que la infraestructura lo
sostenga** — y cuando llegue, el modelo no cambia: se sustituye el sondeo por un empujón.

## Respuestas del DM asesor (2026-09-01) — y lo que cambian

Se le pasó al DM que asesora al autor la presentación del producto con siete preguntas. Sus
respuestas están abajo **con lo que cambian del diseño**, porque tres de ellas lo cambian de
verdad y una **corrige un error de este documento**.

### A · El personaje pertenece a la campaña — CONFIRMADO, y con mejor razón que la nuestra

Su argumento, que no se nos había ocurrido: **las características se tiran con dados**. Dos
personajes del mismo concepto en dos campañas **no son el mismo personaje**, porque su fuerza,
su constitución y su carisma salieron de tiradas distintas. La portabilidad no es que sea cara:
**es que no tiene sentido en las reglas**.

**Se queda el modelo actual.** Ficha decidida.

**Pero añade un matiz que sí vale:** *"estaría bien que el trasfondo, el nombre y el rol se
puedan compartir entre campañas"*. Eso **no** es portar un personaje: es **reutilizar el
concepto**. La versión barata es un *"crear a partir de uno anterior"* que copia nombre, raza,
clase y trasfondo — **y no las características**, que se vuelven a tirar. Anotado para 2A.

### B · Las condiciones necesitan un reloj de juego — **esto corrige el documento**

La pregunta que hicimos era si bastaban las condiciones indefinidas o hacía falta contar turnos.
**Su respuesta va por un tercer sitio que no habíamos visto:**

> *"Hay efectos que duran cierto tiempo, por ejemplo de 1 hora. ¿Cómo sé cuándo ha pasado 1
> hora en D&D? El tiempo no pasa igual que en la vida real."*

Tiene razón y **este documento estaba mal planteado**. Las duraciones de D&D se expresan en
**varias escalas** —asaltos de 6 segundos, minutos, horas, días— y **solo la más pequeña
depende de la iniciativa**. Un efecto de una hora no se cuenta en turnos: se cuenta en **tiempo
de juego**, que hoy **el sistema no modela en absoluto** (una sesión tiene fecha del mundo real,
no del mundo).

**Consecuencia para el plan:** hace falta un **reloj de campaña** —tiempo de juego que el DM
avanza: *"pasan dos horas"*, *"descansáis ocho"*— y que **cada condición lleve su contador**
contra ese reloj.

Y lo importante: **eso no depende del combate**. Sirve fuera de él —viajes, antorchas,
duraciones de conjuro, descansos— y **puede entrar antes que la iniciativa**. Cuando llegue el
combate, un asalto son 6 segundos del mismo reloj: **un solo mecanismo, dos escalas**.

**Se mueve a 2C**, junto a los dados, en vez de esperar a Encuentros.

### C · Temporizador de turno, configurable por el DM

> *"A veces los turnos se alargan demasiado y los jugadores están distraídos… que el DM pueda
> definir los tiempos de reacción al inicio de la campaña, de 1 minuto o más."*

Es una funcionalidad que no habíamos considerado, y es **social, no de reglas**: sirve para que
el combate no se eternice. Se configura **por campaña**, y **avisa, no expulsa** — la decisión
de saltar un turno sigue siendo del DM, coherente con el principio rector.

Necesita que exista el orden de turnos, así que **va en Encuentros**.

### D · Los objetos necesitan descripción, no solo números

> *"Me las apañaría [con los números], pero sería conveniente que tuvieran una descripción…
> que se ve oxidado, que huele raro. Los números son lo más importante, pero me gustaría verles
> un poco de personalidad."*

Confirma la lista cerrada de efectos **y añade lo que le faltaba**: un **texto libre** junto a
los números. Es la misma lección que el cuerpo de las fichas del mundo: **los números son la
parte de la máquina, el texto es la parte del humano**, y una herramienta que solo guarda
números convierte un objeto mágico en una fila de una hoja de cálculo.

**Entra en 2B**, y es barato.

### E · Mostrar u ocultar cada tirada del DM — CONFIRMADO

> *"Me gustaría que me dieras la opción de mostrar o no mostrar mis tiradas siendo DM, ya que
> hay algunas que no es necesario mostrar."*

Es exactamente lo diseñado: **elección tirada a tirada**. Sin cambios.

### Extra · Una ayuda para poner la dificultad de las tiradas

> *"Me interesaría un recurso que me apoye con la dificultad de las tiradas, ya sea abrir una
> puerta o persuadir a alguien."*

Pidió algo que no estaba en ninguna de nuestras preguntas: al pedir una tirada, **una guía de
CD** con la escala habitual y ejemplos, para no inventarse el número cada vez.

Es barato y encaja en 2C junto al tirador. **Comprobar antes si la tabla de dificultades típicas
está en el SRD 5.1**; si no lo está, se ofrece la escala como ayuda propia sin copiar texto
ajeno (ver el apartado de derechos de este documento).

Abre además una interacción interesante: **que el DM pida una tirada y le aparezca al jugador
en su pantalla**. Eso ya roza el tiempo real, así que con sondeo primero.

### Lo que NO cambia

Ninguna respuesta contradice los dos principios —**la máquina ejecuta, el DM arbitra** y **el
azar vive fuera del motor**—. Al contrario: la C y la E los refuerzan, porque en las dos pide
**decidir él** en vez de que el sistema decida por él.

## Lo que queda explícitamente fuera de la fase 2

- **Comparar la tirada contra la CA del objetivo**, decidir acierto o fallo, y **aplicar daño a
  los PG de un NPC**. Eso ya es combate: necesita statblocks vivos y alguien llevando la
  cuenta.
- **Iniciativa, orden de turnos y duraciones por turnos.**
- **Ver la tirada del otro en directo.** Eso es tiempo real (fase 4). Como de momento se juega
  presencialmente, se dice en voz alta; un registro de tiradas guardado en la sesión cubre el
  resto **sin WebSockets**. No se paga por tiempo real hasta que se juegue a distancia.
- **Modelos 3D o imágenes de objetos**: fase 5.

## El riesgo que asume esta decisión

El plan maestro ya avisaba de que **la fase 2 era el mayor riesgo del proyecto** (*"el motor es
el diferenciador y el mayor riesgo"*). Esta decisión **la hace más grande**: añade inventario,
tiradas y condiciones. Partirla en 2A–2C es la mitigación.

La otra mitigación, **recomendada y no aceptada todavía**: el autor decidió no jugar hasta la
fase 3 (ver `docs/06-pendientes.md`). Eso significa que 2B y 2C se construirían **encima de una
hoja de personaje que nadie ha usado nunca**. La recomendación es que, al terminar 2A, el autor
monte su propio personaje real y lo mire diez minutos — no es jugar una partida, es abrir la
ficha. Si la hoja está mal pensada, es infinitamente más barato descubrirlo ahí que después de
construir el inventario encima.

---

## Preguntas abiertas que decide el plan de 2A (planteadas por el autor, 2026-09-01)

Ninguna está decidida. Se dejan escritas **antes** de escribir el plan de 2A para que se
decidan a propósito y no de pasada.

### P1 · El estado de la partida tiene que sobrevivir a que todos se vayan

El autor lo planteó así: *"mi personaje quedó en esta casilla, el DM ejecutó tantos eventos"* —
y que cerrar la sesión declarando descanso se tome como **suspenso**, no como pérdida.

**Estado de hoy, comprobado en el código, no supuesto:** la plataforma sobrevive a un corte de
luz por accidente, no por diseño. Guarda **documentos** (fichas, enlaces, comentarios,
personajes, notas), cada uno escrito en el momento en que se edita. No guarda **partida**: no
existe el concepto de sesión en curso. `Session` es
`{ id, campaignId, title, scheduledAt?, notes?, visibility, createdAt }` y nada más — sin
estado, sin duración, sin relación con lo que ocurrió durante ella. Si el DM no lo teclea en
`notes`, la partida del sábado no dejó rastro.

**Por qué esto choca de frente con 2C:** el registro de tiradas es un log inmutable, y para
escribir una tirada hay que saber **a qué sesión pertenece**. Con el modelo actual esa pregunta
no tiene respuesta. En cuanto además existan PG, condiciones con duración y —en la fase 3— una
posición en un tablero, aparece **estado mutable de juego** por primera vez en el proyecto.

**El principio que hay que fijar en el plan, porque decide la arquitectura:** si cada cambio de
estado se escribe **en el momento en que ocurre** —igual que ya se hace con las entidades—,
entonces suspender y reanudar **no cuestan nada, porque no hay nada que guardar**. Un botón de
"guardar partida" sería la señal de que el estado vivía en memoria, que es justo lo que hay que
evitar. "El DM declara un descanso" pasa a ser **una etiqueta en la línea de tiempo**, no una
operación de guardado.

Lo que el plan de 2A tiene que decidir, con su motivo:

1. **Si una sesión gana estado** (planificada / en curso / cerrada) y quién lo cambia. Sin eso
   no hay dónde colgar el log de tiradas.
2. **Estado actual almacenado, o derivado del log.** El registro inmutable de tiradas empuja
   hacia el log; pero el principio *la máquina ejecuta, el DM arbitra* exige que el DM pueda
   corregir cualquier valor a mano, y un log puro no admite correcciones arbitrarias sin
   volverse retorcido. La opción probablemente correcta es **las dos cosas**: filas con el
   estado actual (PG, condiciones) **más** un log append-only de qué lo cambió — que además es
   gratis el resumen de "qué pasó la última vez" que el DM quiere, y encaja con el
   "diff contra la instantánea anterior" que ya se usa para las subidas de nivel.
3. **Dinámico en el *cuándo*, nunca en la *forma*.** Escribir cada cambio en el instante en que
   ocurre es lo correcto. Guardar "el estado" como un JSON libre **no**: se pierde poder
   consultar ("¿qué personajes están envenenados?"), se pierde poder migrar cuando la forma
   cambie, y se pierde poder **diferenciar** — y la subida de nivel ya está diseñada como
   *diff contra la instantánea anterior*, que sobre un blob no se puede hacer. Este proyecto ya
   pisó esa trampa: `Entity.body` era `z.unknown()` y hubo que sustituirlo por una forma
   explícita en 1.17b. Columnas y filas con tipo; el log append-only al lado.
4. **Guardar lo *decidido*, derivar lo *calculado*.** PG actuales, condiciones activas,
   elecciones de subida de nivel y —en la fase 3— la posición son **decisiones**: se guardan.
   La CA, los modificadores que vienen de raza y clase y el bono de competencia se **calculan**,
   y se recalculan cada vez. Guardar lo calculado significa que el día que se corrija una
   fórmula habrá mil filas mintiendo sin forma de saber cuáles.
5. **Escrituras concurrentes.** Con sondeo en vez de tiempo real, dos jugadores tocando los PG
   del mismo personaje a la vez acaban en "gana el último que escribe". Hay que decidirlo, no
   descubrirlo en la mesa.
6. **El log crece.** Una campaña larga son muchas filas. Barato en Postgres, pero hay que
   decidir qué se enseña, con qué visibilidad y hasta cuándo.
7. **La casilla es de la fase 3**, no de esta. Lo que 2A debe garantizar es que añadir una
   posición más adelante sea **añadir filas, no rehacer la arquitectura**.

Recordatorio de que son **dos relojes distintos** y no hay que mezclarlos: el tiempo real de la
mesa (empezamos a las 20:00, cenamos, seguimos) y el tiempo de ficción (el reloj de campaña de
la respuesta B del DM asesor). Tres horas de sobremesa pueden ser diez minutos de ficción.
Esta pregunta va del primero; el reloj de campaña ya está recogido para 2C.

### P2 · Notificaciones de próximas sesiones — decidir **cuándo**, no si

Planteado por el autor pensando en gente que se conoció **a través del sistema**, que es
precisamente cuando nadie puede avisar por el grupo de siempre.

**Estado de hoy:** no hay servicio de correo. Se aplazó a propósito desde la fase 0, y por eso
las invitaciones son un enlace que se copia y se pega a mano.

Lo que habría que decidir, con lo que cuesta cada cosa:

- **Avisos dentro de la aplicación** (tabla + sondeo): lo más barato, y encaja con la decisión
  ya tomada de sondear en vez de usar WebSockets. Pero solo avisa a quien ya tiene la
  aplicación abierta, que es cuando no hace falta.
- **Correo**: es lo que de verdad resuelve "la sesión es mañana". Necesita un proveedor
  transaccional, aceptar que los datos salen a un tercero, y consentimiento y baja en cuanto
  haya gente que no sea el autor. De paso arregla las invitaciones.
- **Push del navegador**: lo más cómodo, con una trampa que hay que saber antes de ilusionarse
  — en escritorio y Android funciona, pero **en iPhone solo si el usuario añade la web a la
  pantalla de inicio**. Para una mesa donde la mitad lleva iPhone, la mitad no recibe el aviso.
- **Algo tiene que mirar el reloj** para saber que faltan 24 horas. Sin romper la regla de
  minimalismo (nada de Redis ni colas hasta que una fase lo pida), basta una tarea programada
  dentro de la propia API que busque recordatorios vencidos.

**Y una pieza que se pasa por alto y luego duele: no hay zona horaria por usuario.**
`scheduledAt` se guarda en UTC, pero el formulario usa `datetime-local`, que toma la hora del
navegador del DM. Mientras la mesa sea presencial da igual; con gente en husos distintos,
"la sesión es a las 21:00" deja de significar lo mismo para todos. Hay que decidirlo **antes**
de mandar el primer recordatorio.

**Recomendación, no decisión:** las notificaciones encajan mejor **justo después del
despliegue** —que es cuando dejan de ser un adorno, con el DM asesor usando la plataforma sin
estar sentado al lado—, y no dentro de 2A.

### P3 · Permisos por campo en la hoja de personaje

Planteado por el autor al preguntar si el DM puede asignar **puntos de inspiración**.

**Estado de hoy, comprobado en el código:** el DM ya ve y edita todas las hojas de su campaña.
`canView` corta en seco con `if (viewer.role === "DM") return true;`
(`apps/api/src/common/visibility.ts:17`), antes de mirar la visibilidad; y modificar exige ser
DM **o** dueño (`characters.service.ts:70`). Así que un campo nuevo tipo inspiración es una
columna más y **el permiso para que el DM lo asigne ya existe**.

**Lo que el autor pidió (2026-09-01), y es mejor que como estaba planteado aquí:** que **el DM
decida, tras la creación del personaje, qué campos puede tocar el jugador y cuáles no** — un
mecanismo configurable, en vez de reglas fijas cableadas una a una en el sistema. Su caso real:
*"que yo tenga 50 de daño haciendo solo 20"*. Encaja con *el DM arbitra* y con el principio P0
de abajo (preparar una vez).

Dos cosas que hay que hacer bien: **el bloqueo es autorización, así que se comprueba en el
servidor** — si vive solo en la interfaz no bloquea nada, cualquiera manda el `PATCH` a mano; y
se monta afinando el permiso que ya existe (DM o dueño, `characters.service.ts:70`): el dueño
toca todo **menos** lo que el DM haya cerrado.

**Lo que no está decidido:** el permiso es hoy **de hoja entera**, no por campo. La inspiración es
conceptualmente **solo del DM** — un jugador no debería poder concedérsela a sí mismo — y en
cuanto la hoja crezca aparecerán más casos iguales (PG máximos, competencias concedidas,
objetos mágicos sintonizados). Hay que decidir en 2A si se pasa a permisos por campo o si se
acepta que el jugador puede tocarlo y el DM lo ve. **No hay que reimplementar la matriz de
visibilidad para esto**: `canView` sigue siendo el dueño único de "quién ve qué"; esto es
"quién puede escribir qué campo", que es otra pregunta.

### P4 · Contenedores y botín — son tres cosas distintas, no una

Planteado por el autor: *"abro este cofre, ejecuta un combate porque era una trampa de un
mímico, o me da estos objetos de una pool aleatoria, o un objeto fijo"*.

Se descompone, y cada pieza ya tiene sitio:

1. **Cofre con contenido fijo** → inventario puro. **2B**, ya en alcance.
2. **Botín de tabla aleatoria** → **es una tirada, no una función de inventario**. Encaja con
   el pilar de dados de **2C**: se ejecuta en el servidor, queda en el log inmutable y hereda
   la visibilidad tirada a tirada, así que el DM puede tirar el botín en oculto y decidir si lo
   enseña. Es literalmente el principio ya escrito: *el azar vive fuera del motor de reglas* —
   la tabla es datos, el dado es el mecanismo.
3. **"Era un mímico y hay combate"** → **no es botín**: es el DM lanzando un encuentro. Va al
   bloque **Encuentros**, entre la fase 2 y la 3.

**El riesgo que hay que nombrar antes de diseñarlo:** un cofre que *ejecuta* cosas al abrirse es
un **sistema de disparadores** — condiciones, eventos encadenados, estado del mundo. Eso es
autoría de aventuras, un producto entero, no una funcionalidad; y choca de frente con
*el DM arbitra*: si el cofre decide solo, el DM deja de decidir.

La versión barata y correcta, y la que se recomienda: el contenedor tiene su contenido y su
tabla, el DM pulsa **resolver**, el sistema tira y reparte, y si era un mímico **el DM lanza el
encuentro porque quiere**. La máquina ejecuta lo tedioso; la sorpresa la decide él.

### P0 (principio, no pregunta) · Preparar una vez, usar muchas en la mesa

Formulado por el autor el 2026-09-01: *"bajar las tareas tediosas, o que se hagan una vez y las
haga el DM armando la campaña"*. **No es una funcionalidad: es un criterio de diseño**, al mismo
nivel que *la máquina ejecuta, el DM arbitra* y *el azar vive fuera del motor de reglas*.

Zanja discusiones por sí solo. Ante dos formas de construir algo, gana la que traslada el
trabajo del momento de la partida al momento de la preparación. En la mesa, el DM pulsa; en casa,
el DM prepara.

### P5 · Recursos consumibles — no construir "inspiración"

El autor pidió que **un punto de inspiración se gaste al usarlo** y aplique la ventaja que digan
las reglas.

**La palanca está en no construir la inspiración.** Un punto de inspiración, un espacio de
conjuro, un dado de golpe, un uso por descanso, la furia y el ki son **el mismo mecanismo**: un
contador con máximo, algo que lo gasta, y un descanso que lo repone. Construir **recursos
consumibles** una vez entrega los seis; construir "inspiración" entrega uno. Es el principio P0
aplicado al propio código.

La inspiración es entonces el **primer caso de uso**, no el objetivo. Y su efecto cae limpio en
el pilar de dados: la ventaja es un **parámetro de la tirada** (2d20, se queda el mejor),
ejecutada en el servidor y registrada en el log. No rompe *el azar vive fuera del motor*: el
motor decide **que hay ventaja**, el dado sigue siendo un dado.

Va a **2A** (el recurso y su gasto), con el efecto aterrizando en **2C** (la tirada).

### P6 · Mecánica de inspección — datos ocultos que una tirada revela

Pedida por el autor: *"elementos que el DM decide colocar y que con ciertos atributos y
lanzamientos muestran cosas — por ejemplo, que un cofre es un mímico antes de abrirlo"*.

**Es la que más entrega por lo que cuesta, porque el sustrato ya está construido y probado.** Un
dato oculto que se revela a **una persona concreta** es exactamente `SPECIFIC_PLAYERS` más una
concesión de visibilidad: `EntityVisibilityGrant`, con la matriz `canView` probada al completo
desde la fase 1. No hay que inventar un modelo nuevo.

La mecánica se reduce a: el DM cuelga un dato oculto de algo, con su característica y su
dificultad; el jugador tira; si supera, **el servidor añade la concesión** y el dato aparece en
su pantalla y solo en la suya. Una acción que escribe una fila que el proyecto ya sabe escribir.

**Y resuelve el mímico sin ningún motor de disparadores**: el mímico es un dato oculto con su
dificultad de Percepción. Quien la supera lo sabe antes de abrir; el DM sigue decidiendo si lanza
el encuentro. Enlaza con la ayuda para fijar la dificultad (respuesta Extra del DM asesor).

Depende de la tirada, así que va **después de 2C**. Decidir entonces si es bloque propio o entra
con Encuentros.

### P4-bis · La raya en los cofres, tras la aclaración del autor (2026-09-01)

El autor confirmó que quiere el motor de cofres, y explicó su motivación: **reducir lo tedioso y
que el DM lo prepare una vez**. Esa motivación **no necesita el motor**, y conviene dejarlo
escrito antes de planificar 2B:

- cofre con su contenido, preparado al armar la campaña → inventario (**2B**);
- tabla de botín que se resuelve tirando, en oculto si el DM quiere → **2C**;
- "era un mímico" → dato oculto de inspección (**P6**);
- el encuentro lo lanza el DM porque quiere.

Con eso el DM prepara la mazmorra una tarde y en la mesa solo pulsa *resolver* — que es
literalmente lo que pidió. **La parte automática —que el cofre se dispare solo— es el 10% más
caro y el que menos compra**, y es la que arrastra condiciones, eventos encadenados y estado del
mundo, o sea autoría de aventuras.

**Recomendación registrada:** los disparadores automáticos se deciden **aparte y explícitamente**,
con su coste sobre la mesa, y no se cuelan dentro del alcance de 2B. La decisión es del autor;
esto solo la deja separada para que se tome a propósito.
