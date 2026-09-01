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
en todos los listados desde la fase 1.

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
