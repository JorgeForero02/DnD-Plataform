# Sistema de eventos «por cajas» — diseño · 2026-09-02

**Encargo del autor**, textual:

> «hay cosas como el sistema de enlaces, secretos, eventos y demás; me gustaría que se manejara
> como un sistema de programación con cajas… cuando → jugador → revisa con → detalle → se
> desvela → camino secreto… con esto le damos control al DM no solo en partida sino antes de
> esta, de automatizar eventos, incluso haciendo que estén bloqueados hasta que todos los
> jugadores estén presentes y hagan algo, o hasta que ciertas cosas pasen, o por revisar
> algunos secretos»

Y después, dos cosas que cambiaron el diseño:

> **«que se puedan hacer cosas complejas con cosas sencillas»**

> **«quiero una herramienta que sirva de batuta para el DM: si él es el maestro de orquesta, el
> mundo, los personajes y lo demás son sus músicos»**

**La segunda es la estrella polar de todo el documento**, y no es una frase bonita: una batuta
no toca. Marca. De ahí salen tres consecuencias que están escritas más abajo y que no se
negocian —el modo propuesta (§2.8), el ensayo en seco y el deshacer desde la traza (§6)—. Un sistema que actúa por su cuenta mientras el DM mira no es una batuta: es un músico
más, y encima uno que no escucha.

Este documento responde a eso. Su tesis es que la potencia **no viene de tener muchas piezas**,
sino de **ocho decisiones** que hacen que pocas piezas se combinen. Cuatro son mías; tres
salieron del [estudio de sistemas reales](./2026-09-02-cajas-estudio.md) y **corrigieron el
diseño**: los conjuntos con nombre, el orden por especificidad y el antipatrón de las primitivas
disfrazadas.

---

## 0 · Lo que ya está construido y hay que aprovechar

Antes de inventar nada, tres cosas que este proyecto **ya** tiene y que cambian el diseño:

1. **La aplicación es una máquina de visibilidad.** Cinco niveles por objeto, y **todo** —
   listas, páginas, contadores, búsquedas— pasa por `canView`
   (`apps/api/src/common/visibility.ts`). «Se desvela un camino secreto» es, literalmente,
   *subir el nivel de visibilidad de una ficha*. **El efecto más valioso del sistema no hay que
   construirlo: hay que escribir un campo que ya existe.**

2. **La fase 2A ya trae el registro de sucesos.** `GameEvent` —append-only, con `type` de un
   enum, sujeto, actor, sesión, visibilidad y `payload` validado por una unión discriminada de
   Zod— está diseñado en
   [el plan de 2A](../plans/2026-09-01-fase-2A-motor-y-hoja-de-personaje.md), tarea 2A.5.
   **Ese registro es el bus de eventos del motor de reglas.** No hace falta otro. Un suceso que
   una regla puede escuchar es, por definición, una fila de `GameEvent`.

3. **La fase 1 ya emite eventos de dominio en memoria** (`campaign.created`, `entity.created`,
   `campaign.member_joined`…, `@nestjs/event-emitter`) y **nadie los escucha**. Son el puente:
   persistirlos como `GameEvent` es lo que da a la vez el registro, la bandeja de
   notificaciones y los disparadores de las reglas.

> **Consecuencia de diseño:** el sistema de eventos **no es una funcionalidad nueva al lado**,
> es la unión de tres piezas que ya estaban previstas. Eso cambia mucho su coste.

---

## 1 · La forma: una frase de tres partes

```
CUANDO  ⟨un suceso⟩
SI      ⟨se cumplen estas condiciones⟩        (cero o más)
ENTONCES ⟨estos efectos⟩                       (uno o más)
```

Es el patrón **suceso–condición–efecto**. Y **empieza como formulario, no como lienzo**, por una
razón que conviene decir sin rodeos: *lo difícil no es arrastrar cajas, es decidir qué cajas
existen*. Un lienzo sobre un vocabulario sin probar es un juguete que se usa una tarde. La frase
de tres partes se construye en días, se lee en voz alta como la escribió el autor, y —esto es lo
importante— **usa exactamente la misma representación de datos que usará el lienzo el día que
llegue**. El lienzo no es otro sistema: es otra forma de editar lo mismo.

---

## 2 · Las ocho decisiones que dan potencia sin complejidad

Aquí está la respuesta a «cosas complejas con cosas sencillas». No son funcionalidades; son
**propiedades del sistema**, y cada una multiplica lo que se puede expresar **sin añadir un
concepto que el DM tenga que aprender**. Esa es la prueba que tiene que pasar cada una: *¿cuánto
más se puede decir con ella, y cuánto más hay que aprender?* Si lo segundo crece tanto como lo
primero, no entra.

### 2.1 · Un efecto también es un suceso — las reglas se encadenan solas

Cuando una regla revela una ficha, eso **escribe una fila en `GameEvent`** (`ENTITY_REVEALED`).
Y como los disparadores escuchan `GameEvent`, **otra regla puede reaccionar a esa revelación**.

Nadie ha tenido que aprender nada nuevo, y de pronto se pueden escribir secuencias:

```
Regla A: CUANDO un jugador abre «Muro agrietado»
         ENTONCES revelar «Camino secreto»

Regla B: CUANDO se revela «Camino secreto»
         ENTONCES avisar al DM  ·  poner la marca «pasadizo conocido»
```

Esto es el `broadcast` de Scratch y las reglas encadenadas de un motor de negocio, y es **la
diferencia entre IFTTT (una regla, un paso, se queda corto enseguida) y algo con el que se puede
preparar una aventura entera**.

**El precio, y hay que pagarlo:** una cadena puede morderse la cola. Se corta con un **límite de
profundidad** (10 saltos) y con efectos **idempotentes** (§2.4). Si se alcanza el límite, la
cadena **se detiene y lo dice en la traza**; no se sigue en silencio.

### 2.2 · Se apunta a conjuntos, no solo a cosas — las etiquetas ya existen

Una regla no tiene por qué nombrar *una* ficha. Puede decir **«cualquier ficha con la etiqueta
`pista`»**. Las etiquetas ya existen en el modelo y ya se usan y filtran.

Eso convierte una regla en cien sin añadir vocabulario:

```
CUANDO un jugador abre  cualquier ficha con la etiqueta «pista»
ENTONCES poner la marca «lleva {n} pistas»
```

Y de aquí sale, casi gratis, el patrón más común de toda aventura: **«cuando tengan tres de las
cinco llaves»**. Que es la decisión siguiente.

### 2.3 · La memoria son marcas **y conjuntos** con nombre

Aquí el [estudio de sistemas reales](./2026-09-02-cajas-estudio.md) mejoró el diseño. La primera
versión solo tenía **banderas** (puesta / no puesta). Los sistemas que llegan lejos tienen
además **conjuntos con nombre**: cajas donde se meten cosas.

| Memoria | Ejemplo | Para qué |
|---|---|---|
| **Marca** (bandera) | «el pasadizo es conocido» | Sí o no. Fases, puertas que se abren una vez |
| **Conjunto** | «llaves encontradas», «quién ha visto el cuerpo» | Acumular cosas y **contarlas** |

Y con eso, la única operación numérica del sistema deja de ser un caso especial: es una
condición sobre un conjunto.

```
SI  el conjunto «llaves encontradas» tiene al menos 3 elementos
SI  «Nyx» está en el conjunto «quién ha visto el cuerpo»
```

Eso da el patrón de media aventura publicada —*«cuando tengan tres de las cinco llaves»*— y
también el que no había previsto: **acumular personas**, no solo cosas. *«Cuando todos los
jugadores hayan leído la carta»* es un conjunto y una comparación, no una funcionalidad nueva.

**No hay** variables, ni sumas, ni expresiones. Hay *pertenecer* y *cuántos*, comparado con una
constante. Es un techo deliberado: en cuanto haya aritmética, esto deja de ser una herramienta
de DM y pasa a ser un lenguaje que hay que depurar — y el DM no ha venido a depurar.

### 2.4 · Señales con nombre: el DM inventa su propio vocabulario

Un efecto puede **lanzar una señal con el nombre que el DM quiera** —«el ritual ha comenzado»—,
y cualquier regla puede escucharla. Es el `broadcast` de Scratch, y es **un solo concepto que
multiplica todo lo demás**: en vez de repetir las mismas condiciones en cinco reglas, una regla
lanza la señal y cinco reaccionan.

```
Regla 1: CUANDO se revela «Altar profanado» · ENTONCES lanzar la señal «el ritual ha comenzado»
Regla 2: CUANDO la señal «el ritual ha comenzado» · ENTONCES revelar «Cánticos en la cripta»
Regla 3: CUANDO la señal «el ritual ha comenzado» · ENTONCES avisar al DM
```

El DM **no aprende un concepto nuevo** —es otro «cuando» y otro «entonces»— y gana el poder de
nombrar los momentos de su propia aventura.

### 2.5 · Efectos declarativos: una regla que se repite no hace daño

Todo efecto dice **en qué queda** algo, no *cuánto cambia*.

| Sí | No |
|---|---|
| «la visibilidad **queda en** Jugadores» | «sube un nivel la visibilidad» |
| «la marca **queda** puesta» | «alterna la marca» |
| «añadir «Nyx» al conjunto» *(ya estaba: no pasa nada)* | «incrementar el contador» |

Motivo: con encadenamiento y reintentos, **un efecto se va a aplicar dos veces**. Con efectos
incrementales eso rompe la partida en silencio; con efectos declarativos no se nota.

### 2.6 · Cuando dos reglas se contradicen: gana la más específica

Del patrón de **Inform 7** y de los motores de reglas: las reglas **no se ordenan a mano**. Si
dos se disparan con el mismo suceso, **gana la que tiene más condiciones** —la más específica—,
porque describe un caso más concreto y eso es casi siempre lo que el autor quiso.

Si empatan, **el sistema no adivina**: pide un desempate explícito y, mientras no lo tenga, lo
**marca como conflicto** en el ensayo en seco. Un sistema que resuelve empates en secreto es un
sistema en el que un DM deja de confiar la primera vez que le sorprende.

### 2.7 · El vocabulario es del dominio, nunca primitivas disfrazadas

El fracaso mejor documentado de este tipo de sistemas —**Godot VisualScript**, retirado del
motor— fue ofrecer las primitivas de un lenguaje de programación (variable, bucle, condición)
con aspecto de cajas bonitas. Quien no programa no entiende una variable por mucho color que
tenga, y quien programa prefiere escribir código.

Así que aquí **cada pieza habla del juego**: «un jugador abre una ficha», «revelar», «marca de
campaña», «están todos presentes». Ninguna dice «variable», «bucle» ni «expresión». Si algún día
una pieza necesita esas palabras para explicarse, **esa pieza está mal diseñada**.

---

### 2.8 · El modo propuesta: la batuta marca, no toca

De la metáfora del autor sale una decisión que no estaba en el diseño original: **cada regla
elige cómo actúa**.

| Modo | Qué hace | Para qué |
|---|---|---|
| **Automático** | Aplica los efectos y lo apunta en la traza | Lo que da igual que pase solo: apuntar en la bitácora, avisar, poner una marca |
| **Propuesta** | **No aplica nada.** Avisa al DM: *«"Detalle del muro" se abrió. ¿Revelo el camino secreto?»* con un botón de aplicar y otro de descartar | Todo lo que cambia lo que los jugadores ven |

Por defecto, **cualquier efecto que revele algo nace en modo propuesta**. Un DM que se fía puede
pasarlo a automático regla por regla; un DM al que le revelaron un secreto tres minutos antes de
tiempo **no vuelve a usar el sistema jamás**. El coste de equivocarse es asimétrico, así que el
valor por defecto también.

Esto es, literalmente, la batuta: el sistema **prepara la entrada** y el DM **da la señal**.

---

## 3 · El vocabulario inicial, cerrado a propósito

> Cerrado significa **cerrado**: añadir un suceso, una condición o un efecto es una decisión con
> su ficha, no algo que se hace de paso. Un vocabulario que crece sin freno es exactamente cómo
> estos sistemas se vuelven imposibles de entender.

### Sucesos — «CUANDO…»

| Suceso | De dónde sale |
|---|---|
| Empieza una sesión | `SESSION_STARTED` (2A.5) |
| Termina una sesión | `SESSION_CLOSED` |
| Un jugador **abre** una ficha | evento nuevo: la página de lectura ya existe |
| Alguien comenta una ficha | el comentario ya existe; falta persistir el evento |
| **Se revela una ficha** | `ENTITY_REVEALED` — el que permite encadenar (§2.1) |
| Se pone una marca | `FLAG_SET` — encadenar sin revelar nada |
| **Se lanza la señal ⟨nombre⟩** | La señal que inventa el DM (§2.4) |
| **El DM ejecuta esta ficha** | La batuta literal: el DM lee el diálogo en voz alta, pulsa, y pasa lo que tenía que pasar |
| **Se crea un enlace ⟨etiqueta⟩ entre dos fichas** | La llave en la ranura. `EntityLink` ya existe (§5b) |
| **Una tirada de ⟨habilidad⟩ ⟨falla / supera / saca 1 / saca 20⟩** | `ABILITY_ROLL`. **Los cuatro resultados**, no solo el éxito (§5d) |
| **Se ataca esta ficha** | El barril (§5a) |
| Un jugador se une a la campaña | `campaign.member_joined`, que ya se emite |
| *(cuando 2A tenga dados)* una tirada supera una CD | `ABILITY_ROLL` |

### Condiciones — «SI…»

| Condición |
|---|
| La marca ⟨X⟩ está puesta / no está puesta |
| **El conjunto ⟨X⟩ tiene al menos N elementos** |
| **⟨alguien o algo⟩ está en el conjunto ⟨X⟩** |
| **Están todos los jugadores presentes** *(exige sesión en curso — por eso 2A.5 va antes)* |
| La ficha del suceso tiene la etiqueta ⟨X⟩ |
| Se han revelado **≥ N** fichas con la etiqueta ⟨X⟩ |
| Es la sesión número ≥ N |
| **Esta regla no se ha disparado nunca** *(el «once» de Ink: la puerta que se abre una vez)* |

### Efectos — «ENTONCES…»

| Efecto |
|---|
| **Revelar** una ficha: su visibilidad **queda en** ⟨nivel⟩ |
| Revelar **todas** las fichas con la etiqueta ⟨X⟩ |
| **Ocultar** una ficha: su visibilidad queda en ⟨nivel⟩ |
| Poner / quitar la marca ⟨X⟩ |
| **Añadir / quitar ⟨algo⟩ del conjunto ⟨X⟩** |
| **Lanzar la señal ⟨nombre⟩** (§2.4), opcionalmente **con origen y radio** *(el radio solo actúa con mapa — §8)* |
| **Avisar** (a los jugadores, o solo al DM) — sale por la bandeja de notificaciones |
| Añadir una nota a la sesión en curso |
| **Armar / desarmar** otra regla |

Nueve efectos, catorce sucesos, ocho condiciones. **Con eso y el encadenamiento se escribe una
aventura entera**, y cabe en una pantalla de ayuda.

---

## 4 · El primer ejemplo, escrito con esto

> «cuando → jugador → revisa con → detalle → se desvela → camino secreto»

```
CUANDO   un jugador abre  «Muro agrietado del sótano»
SI       están todos los jugadores presentes
ENTONCES revelar «Camino secreto» → Jugadores
         avisar a los jugadores: «Algo cede detrás del muro.»
```

Y el bloqueo que pedía —*hasta que ciertas cosas pasen*— sin ningún concepto nuevo:

```
CUANDO   se revela  cualquier ficha con la etiqueta «pista»
SI       se han revelado ≥ 3 fichas con la etiqueta «pista»
         y la marca «el nombre del culpable» no está puesta
ENTONCES poner la marca «el nombre del culpable»
         revelar «Quién mató al alguacil» → Jugadores
         avisar a los jugadores

CUANDO   empieza una sesión
SI       la marca «el nombre del culpable» está puesta
ENTONCES revelar todas las fichas con la etiqueta «acto 3» → Jugadores
```

Tres frases. Ninguna tiene más de tres partes. Juntas hacen algo que en cualquier otra
herramienta exige escribir código.

---

---

---

## 5 · Los cuatro ejemplos del autor, y qué exige cada uno

El autor puso cuatro casos que estiran el vocabulario. Ninguno rompe el diseño; **tres se pueden
escribir con lo que ya hay**, y el cuarto es el que marca la frontera con el mapa.

### a) El barril de explosivos

> «tengo un barril de explosivos que tiene de evento explota cuando se ataca y genera una
> explosión de tantos pies; si hay más barriles cerca sería interesante que se encadenen»

**Es el caso de encadenamiento perfecto**, y es la mejor defensa de la decisión §2.1: el barril
no sabe nada de los otros barriles. Solo lanza una señal.

```
CUANDO   se ataca «Barril de aceite»
ENTONCES lanzar la señal «explosión» con origen «Barril de aceite» y radio 20 pies
         aplicar 3d6 de daño de fuego en esa área

CUANDO   la señal «explosión» alcanza a esta ficha
ENTONCES lanzar la señal «explosión» con origen aquí y radio 20 pies
```

Dos reglas y una cadena que se propaga sola por diez barriles. **El tope de profundidad (§2.1)
deja de ser una precaución teórica y pasa a ser una regla del juego**: diez saltos, y la traza
dice dónde se cortó.

**Lo que le falta:** «alcanza» es una pregunta espacial. Necesita **posiciones**, y las
posiciones son la fase 3. Ver §8.

### b) Secretos que se revelan al detallar un objeto o al meterlo en una ranura

> «que los secretos salgan detallando objetos o colocando objetos dentro de ranuras»

**Detallar** ya es un suceso previsto (*un jugador abre una ficha*). **Meter un objeto en una
ranura** es lo interesante, y **no hace falta inventar nada**: la plataforma ya tiene enlaces
entre fichas con etiqueta (`EntityLink`, «vive en», «pertenece a»). Una ranura es una ficha; meter
la llave en ella es **crear un enlace** con la etiqueta «encajado en».

```
CUANDO   se enlaza  «Llave de obsidiana»  →  «Hueco en el altar»   (etiqueta «encajado en»)
ENTONCES revelar «La escalera bajo el altar»
```

Un suceso nuevo —*se crea un enlace*— y el sistema de puzles sale entero de una funcionalidad
que lleva meses construida. Esto es exactamente lo que el autor intuía al meter «el sistema de
enlaces» en la misma frase que los secretos.

### c) «Con este diálogo el NPC hizo tal cosa»

Un suceso *«el DM ejecuta esta ficha»* con un botón en la propia ficha del NPC. El DM lee el
diálogo en voz alta, pulsa, y lo que tenía que pasar pasa: se pone una marca, se revela algo, se
apunta en la bitácora. **Es la batuta en su forma más literal.**

### d) La tirada que falla y desencadena algo

> «que intente persuadir con una tirada a alguien y no funcionó y desencadenó algo»

**Este es el que más me interesa**, porque señala un error que habría cometido: un disparador de
tirada que solo reaccione al éxito **es la mitad del juego**. En una mesa, *fallar* la persuasión
es lo que mueve la historia.

Así que el suceso de tirada no es «supera la CD», es **la tirada con su resultado**:

```
CUANDO   una tirada de Persuasión contra el «Capitán de la guardia»  FALLA
ENTONCES poner la marca «la guardia desconfía»
         avisar al DM: «El capitán se cierra en banda.»

CUANDO   una tirada de Persuasión contra el «Capitán de la guardia»  saca un 1 natural
ENTONCES lanzar la señal «insulto imperdonable»
```

Cuatro resultados posibles y todos disparables: **falla, supera, 1 natural, 20 natural**. Y esto
llega solo cuando 2A tenga dados (`ABILITY_ROLL` ya está en su enum), que es otra razón para que
el motor viva en 2A y no antes.

---

## 6 · Las cuatro cosas que hay que hacer bien, o no hacerlo

1. **Una regla escribe un dato; nunca decide un permiso.** Un efecto pone
   `entity.visibility = PLAYERS`, y a partir de ahí **decide `canView`, como siempre**. Si el
   motor calculara visibilidad, habría **dos matrices** — y la fuga que este producto existe
   para evitar entraría por la puerta de atrás. Es la regla que no se negocia.

2. **Traza obligatoria.** El DM tiene que poder preguntar **«¿por qué se reveló esto?»** y
   recibir: *qué regla, qué suceso la disparó, qué condiciones se evaluaron y con qué resultado,
   y qué efectos se aplicaron*. Una automatización sin registro es magia, y **la magia asusta y
   se desactiva**. La traza es una tabla propia, no un campo del `payload`: se consulta por
   regla y por ficha, y la regla del plan de 2A es explícita — *si hace falta consultar por un
   campo, ese campo es una columna*. **Y es un registro con la causa escrita, no un depurador
   con pasos**: los sistemas que obligan a «ejecutar paso a paso» para entender qué pasó son los
   que la gente abandona.

3. **Ensayo en seco.** Poder simular «empieza la sesión 3 con todos presentes» y ver **qué se
   dispararía**, sin que se dispare. Es lo que separa una herramienta de preparación de una
   ruleta, y es lo que hace que un DM se atreva a usarla la primera vez.

4. **Nunca sobre la partida sin permiso.** Una regla que revela algo **cuando el DM no está
   mirando** es un desastre. Dos frenos: las reglas solo se disparan **si hay una sesión en
   curso** o si el DM las arma explícitamente para fuera de sesión, y todo efecto es
   **reversible desde la traza** («deshacer esta revelación»).

---

## 7 · Encaje en la fase 2A

No es una fase nueva. Son **tres tareas** que se apoyan en 2A.5:

| Tarea | Entrega | Depende de |
|---|---|---|
| **2A.12 · Marcas y sucesos de mundo** | `CampaignFlag`; persistir como `GameEvent` los sucesos que hoy solo viven en memoria (`entity.created`, `member_joined`) y los nuevos (`ENTITY_OPENED`, `ENTITY_REVEALED`, `FLAG_SET`) | 2A.5 |
| **2A.13 · El motor** | Modelo `Rule` (suceso + condiciones + efectos, en JSON validado por Zod discriminado), evaluación al escribir un `GameEvent`, encadenamiento con tope de profundidad, tabla de traza, y el ensayo en seco | 2A.12 |
| **2A.14 · La pantalla** | La frase de tres partes, la lista de reglas de la campaña, la traza («por qué pasó esto») y el botón de deshacer | 2A.13 |

**El lienzo de cajas es 2B o 2C**, sobre el mismo modelo, cuando el vocabulario esté probado con
una aventura real.

---

## 8 · El mapa que aún no existe, y por qué hay que tenerlo en cuenta ahora

El autor lo dijo claro: *«el sistema de eventos con cajas debe ser considerado para el mapa que
aún no llega, pero es importante tenerlo en cuenta»*. Tiene razón, y la forma de tenerlo en
cuenta **no es construirlo**: es **reservarle el sitio** para que la fase 3 encienda una luz en
vez de repintar la casa.

Concretamente, tres decisiones que se toman **hoy** aunque no sirvan hasta la fase 3:

1. **Una señal puede llevar origen y radio.** *«explosión, origen «Barril de aceite», radio 20
   pies»*. Hoy el radio **se guarda y se enseña**, y no alcanza a nadie porque nadie tiene
   posición. El día que haya tablero, la misma regla empieza a alcanzar sin tocarla.
   La forma del área —cono, esfera, línea, cubo, cilindro— y sus medidas ya están definidas en
   [la especificación de distancias](./2026-09-02-distancias-y-movimiento-design.md).
2. **Las distancias se guardan en pies desde el primer día** (misma especificación). Una regla
   escrita hoy con «20 pies» seguirá queriendo decir lo mismo en la fase 3.
3. **Las condiciones espaciales existen en el vocabulario, marcadas como dormidas.** El DM puede
   escribir *«si está a menos de 30 pies»*, y la interfaz se lo dice sin rodeos: **«esta
   condición necesita el tablero; hasta entonces no se cumple nunca»**. Es mejor que ocultarla:
   así el DM entiende el modelo completo desde el principio, y su aventura preparada en enero
   funciona en marzo sin reescribirla.

> **Lo que NO se hace hoy:** calcular quién está cerca de quién. Eso es la fase 3, y prometerlo
> antes sería exactamente la clase de mentira que el resto de esta documentación persigue.

---

## 9 · Lo que este sistema **no** va a hacer

Dicho para no prometerlo:

- **Calcular quién está cerca de quién.** Se puede *escribir* la regla; no se cumple hasta que
  haya tablero (§8).
- **Bucles, variables y aritmética.** Contar un conjunto y compararlo, y nada más (§2.3).
- **Efectos de combate.** «Aplicar veneno durante 3 turnos» comparte *el formato* de un efecto,
  pero no el motor: concentración, duraciones e iniciativa no se parecen a revelar un lugar. Se
  unirán el día que se demuestre que son lo mismo, y no antes.
- **Reglas que decidan permisos.** Ver §6.1 — es la única de esta lista que no se levantará nunca.
