# Sistema de eventos «por cajas» — diseño · 2026-09-02

**Encargo del autor**, textual:

> «hay cosas como el sistema de enlaces, secretos, eventos y demás; me gustaría que se manejara
> como un sistema de programación con cajas… cuando → jugador → revisa con → detalle → se
> desvela → camino secreto… con esto le damos control al DM no solo en partida sino antes de
> esta, de automatizar eventos, incluso haciendo que estén bloqueados hasta que todos los
> jugadores estén presentes y hagan algo, o hasta que ciertas cosas pasen, o por revisar
> algunos secretos»

Y después: **«que se puedan hacer cosas complejas con cosas sencillas»**.

Este documento responde a eso. Su tesis es que la potencia **no viene de tener muchas piezas**,
sino de **cuatro decisiones** que hacen que pocas piezas se combinen.

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

## 2 · Las cuatro decisiones que dan potencia sin complejidad

Aquí está la respuesta a «cosas complejas con cosas sencillas». No son cuatro funcionalidades;
son cuatro propiedades del sistema, y cada una multiplica lo que se puede expresar **sin añadir
un concepto que el DM tenga que aprender**.

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

### 2.3 · Contar es la única aritmética que se permite

Prohibir la aritmética entera cuesta demasiado: *«cuando se hayan revelado 3 fichas con la
etiqueta pista»* es el patrón de la mitad de las aventuras publicadas. Así que la única
operación numérica del sistema es **contar un conjunto y compararlo con un número**:

```
SI  se han revelado  ≥ 3  fichas con la etiqueta «pista»
```

**No hay** variables, ni sumas, ni expresiones. Hay *«cuántas cosas de este tipo cumplen esto»*,
comparado con una constante. Es un techo deliberado: en cuanto haya variables y expresiones,
esto deja de ser una herramienta de DM y pasa a ser un lenguaje que hay que depurar — y el DM
no ha venido a depurar.

### 2.4 · Estado: solo marcas con nombre, y efectos declarativos

La única memoria del sistema son **marcas de campaña**: banderas con nombre, puestas o quitadas
(`CampaignFlag`). No hay números guardados, no hay cadenas, no hay estructuras.

Con marcas + encadenamiento se consigue lo que normalmente pide una máquina de estados:
fases de la aventura, puertas que se abren una sola vez, condiciones que dependen de lo que pasó
tres sesiones atrás.

Y **todo efecto es declarativo**: se dice *en qué queda* algo, no *cuánto cambia*.

| Sí | No |
|---|---|
| «la visibilidad **queda en** Jugadores» | «sube un nivel la visibilidad» |
| «la marca **queda** puesta» | «alterna la marca» |

Motivo: una regla que se dispara dos veces **no puede hacer daño**. Con efectos incrementales,
un doble disparo —que va a ocurrir, porque hay encadenamiento y reintentos— rompe la partida en
silencio.

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
| **El DM pulsa un botón** | la regla manual: el DM decide cuándo, la automatización hace el resto |
| Un jugador se une a la campaña | `campaign.member_joined`, que ya se emite |
| *(cuando 2A tenga dados)* una tirada supera una CD | `ABILITY_ROLL` |

### Condiciones — «SI…»

| Condición |
|---|
| La marca ⟨X⟩ está puesta / no está puesta |
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
| **Avisar** (a los jugadores, o solo al DM) — sale por la bandeja de notificaciones |
| Añadir una nota a la sesión en curso |
| **Armar / desarmar** otra regla |

Siete efectos, nueve sucesos, seis condiciones. **Con eso y el encadenamiento se escribe una
aventura entera**, y cabe en una pantalla de ayuda.

---

## 4 · El ejemplo del autor, escrito con esto

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

## 5 · Las cuatro cosas que hay que hacer bien, o no hacerlo

1. **Una regla escribe un dato; nunca decide un permiso.** Un efecto pone
   `entity.visibility = PLAYERS`, y a partir de ahí **decide `canView`, como siempre**. Si el
   motor calculara visibilidad, habría **dos matrices** — y la fuga que este producto existe
   para evitar entraría por la puerta de atrás. Es la regla que no se negocia.

2. **Traza obligatoria.** El DM tiene que poder preguntar **«¿por qué se reveló esto?»** y
   recibir: *qué regla, qué suceso la disparó, qué condiciones se evaluaron y con qué resultado,
   y qué efectos se aplicaron*. Una automatización sin registro es magia, y **la magia asusta y
   se desactiva**. La traza es una tabla propia, no un campo del `payload`: se consulta por
   regla y por ficha, y la regla del plan de 2A es explícita — *si hace falta consultar por un
   campo, ese campo es una columna*.

3. **Ensayo en seco.** Poder simular «empieza la sesión 3 con todos presentes» y ver **qué se
   dispararía**, sin que se dispare. Es lo que separa una herramienta de preparación de una
   ruleta, y es lo que hace que un DM se atreva a usarla la primera vez.

4. **Nunca sobre la partida sin permiso.** Una regla que revela algo **cuando el DM no está
   mirando** es un desastre. Dos frenos: las reglas solo se disparan **si hay una sesión en
   curso** o si el DM las arma explícitamente para fuera de sesión, y todo efecto es
   **reversible desde la traza** («deshacer esta revelación»).

---

## 6 · Encaje en la fase 2A

No es una fase nueva. Son **tres tareas** que se apoyan en 2A.5:

| Tarea | Entrega | Depende de |
|---|---|---|
| **2A.12 · Marcas y sucesos de mundo** | `CampaignFlag`; persistir como `GameEvent` los sucesos que hoy solo viven en memoria (`entity.created`, `member_joined`) y los nuevos (`ENTITY_OPENED`, `ENTITY_REVEALED`, `FLAG_SET`) | 2A.5 |
| **2A.13 · El motor** | Modelo `Rule` (suceso + condiciones + efectos, en JSON validado por Zod discriminado), evaluación al escribir un `GameEvent`, encadenamiento con tope de profundidad, tabla de traza, y el ensayo en seco | 2A.12 |
| **2A.14 · La pantalla** | La frase de tres partes, la lista de reglas de la campaña, la traza («por qué pasó esto») y el botón de deshacer | 2A.13 |

**El lienzo de cajas es 2B o 2C**, sobre el mismo modelo, cuando el vocabulario esté probado con
una aventura real.

---

## 7 · Lo que este sistema **no** va a hacer

Dicho para no prometerlo:

- **Nada que dependa de dónde está alguien.** «Cuando un jugador se acerque a la puerta» exige
  posiciones, y las posiciones son la fase 3. Ver
  [la especificación de distancias](./2026-09-02-distancias-y-movimiento-design.md).
- **Bucles, variables y aritmética.** Contar un conjunto y compararlo, y nada más (§2.3).
- **Efectos de combate.** «Aplicar veneno durante 3 turnos» comparte *el formato* de un efecto,
  pero no el motor: concentración, duraciones e iniciativa no se parecen a revelar un lugar. Se
  unirán el día que se demuestre que son lo mismo, y no antes.
- **Reglas que decidan permisos.** Ver §5.1.
