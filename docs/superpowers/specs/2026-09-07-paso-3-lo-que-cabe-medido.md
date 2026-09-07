# Paso 3 · Qué cabe de verdad, medido sobre los 320 — y tres decisiones del autor que lo cambian

> Escrito el 2026-09-07 por la sesión de acompañamiento, a partir de un censo **de los 320 conjuros
> enteros**, no de una muestra. **Va a la spec del paso 3**
> (`2026-09-05-paso-3-catalogo-design.md`), que es donde decide el conversor.
>
> Nace de la tarea 0 del paso 2 —que midió **diez** conjuros a mano y obligó a nueve cambios de
> esquema— y de una pregunta del autor: *«¿puedes hacer la prueba de la tarea 0 con más cantidad?»*.
> Todos los números de aquí salen de `packs/_source/spells/`, **carpeta sin sufijo `24`**, 320
> ficheros, los 320 con `source.rules: '2014'`.

---

## 1 · El número que faltaba

**Cuántos conjuros ejecutaría ENTEROS el motor**, sin que nadie tenga que leer el texto y arbitrar:

| | Conjuros | % |
|---|---|---|
| **Hoy**, con las cinco actividades y el vocabulario actual | 197 de 320 | **61%** |
| **+ invocar, transformar y encantar** (§3) | 231 | **72%** |
| **+ el vocabulario numérico que falta** (§4) | 261 | **81%** |
| Lo que queda a mano **pase lo que pase** | 59 | 18% |

**Ese 18% final no es deuda nuestra:** son conjuros con activación `special` en los propios datos de
Foundry — el SRD dice «lee el texto» y ellos también se rinden. **Se importan con su prosa y los
arbitra el DM**, que es la decisión del autor del 2026-09-07.

## 2 · El censo, para que nadie lo vuelva a contar

```
320 conjuros · 492 actividades · 108 conjuros con MÁS DE UNA actividad (máximo: 9)

utility 228 · save 150 · summon 29 · damage 19 · attack 18 · heal 16
check 14 · enchant 11 · transform 6 · teleport 1
```

**Las cinco actividades cubren 445 de 492 = 90%**, que confirma lo que la spec del paso 2 predijo
contando a mano.

**Y aparece algo que diez conjuros no podían enseñar: un tercio del catálogo tiene más de una
actividad, y uno llega a nueve.** Si el modelo asume «un conjuro, una actividad», rompe en 108 casos.

**Activaciones:** `action` 375 · `special` **79** · heredada del objeto 30 · `bonus` 7 · `hour` 1.
`special` no está en nuestro vocabulario y **no debe estarlo como coste**: es la marca de «esto no
se automatiza».

## 3 · Las tres decisiones del autor, y por qué ninguna pide tablero

Las tres salieron de leer las reglas, no el código, y **las tres reutilizan piezas construidas**.

### 3.1 · Invocar es un PNJ con dueño

> *«Que la invocación sea un PNJ manejado por el jugador, no por el DM. Reutilizamos las clases y
> solo hay que ponerle una etiqueta de temporal y cambiar el permiso.»*

**Ya está casi todo.** `npcs.service.ts:60` instancia con `ownerId`, y su propio comentario dice por
qué: *«es lo que hace que las comprobaciones de "dueño o DM" que ya existen sigan valiendo tal cual
para un PNJ»*. Desde el paso 1 (tarea 15) el dueño **también lo maneja desde la pantalla**.

Y los datos encajan: los 29 `summon` traen `profiles` con **criatura + cantidad** — que es la firma
de `instanciar`. La mitad traen varios perfiles (uno, quince): eso es **un selector**, no un modelo.

**Lo que falta:** que nazca visible —hoy un PNJ nace `DM_ONLY` a propósito, pero una invocación no
es una emboscada— y la etiqueta temporal de §5.

### 3.2 · Transformar es un `statblockRef` temporal

> *«Transformar no requiere tablero: cambia varias cosas, pero no cómo se maneja.»*

**El SRD lo dice casi con nuestras palabras** (*Polymorph*, SRD 5.1, citado de
`packs/_source/spells/4th-level/polymorph.yml`):

> *«The target's game statistics, including mental Ability Scores, are **replaced by the Statistics
> of the chosen beast**.»* · *«The target **assumes the Hit Points of its new form**. When it
> reverts, the creature returns to the number of hit points it had before.»* · *«The transformation
> lasts for the Duration, **or until the target drops to 0 Hit Points or dies**.»* · *«The target's
> gear **melds into the new form**… can't benefit from any of its Equipment.»*

«Sustituidas por las estadísticas de la bestia» **es lo que este proyecto ya hace**: una fila de
`Character` cuya hoja se deriva de un `statblockRef` (`hojaDeStatblock`, fase 2D). Transformarse es
**poner ese `statblockRef` temporalmente**.

**Y la regla contesta sola qué lo retira**: la duración (reloj de campaña), caer a 0 PG (`changeHp`
ya lo ve) y la concentración (ya existe).

**Dos detalles que hay que guardar y no se adivinan:** los PG **se sustituyen y se devuelven** al
volver —con el daño sobrante pasando a la forma normal—, y **el equipo deja de contar** mientras
dure.

**De los seis `transform`, solo tres son esto** (Polimorfar, Formas animales, Cambiaformas). Los
otros tres —Disfrazarse, Apariencia, Metamorfosis verdadera— **son ilusión**: no cambian un número,
y entran como texto con su CD.

### 3.3 · Encantar es un efecto temporal sobre un objeto, con etiquetas

> *«Ver qué objetos se pueden encantar y ponerles el atributo; aplicar el encantamiento de forma
> general, y si depende del objeto, etiquetas que el encantamiento distinga.»*

**Es exactamente lo que declaran sus datos.** Cada `enchant` trae `restrictions`:

```
Arma mágica      type: "weapon"       → solo armas
Cofre secreto    type: "container"    → solo contenedores
Llama continua   type: ""             → cualquier objeto
```

más `properties` y `categories`, vacías en estos once pero **previstas para «solo ligeras», «solo
pesadas»**. **Esa es la etiqueta que el autor propone, y nuestro catálogo ya la tiene**: tipo y
`properties` (`LIGHT`, `FINESSE`, `THROWN`) existen desde 2B.

**Y aplican dos cosas, no una.** *Arma mágica* pone `system.magicalBonus: 1|2|3`, marca el objeto
como mágico y lo renombra; *Llama continua*, *Oscuridad* y *Luz del día* **solo añaden un párrafo**:
el objeto alumbra y lo arbitra el DM.

**Ojo con dos de los once:** *Adivinación* se encanta a sí misma y *Hoja de fuego* usa
`flags.world.*`. Son **apaños del propio Foundry**, no reglas del SRD: se importan con su texto.

**Y `enchant` NO es hechizar a nadie.** Hipnotizar y dominar son actividades de **salvación** que
aplican `charmed`, y ya entran en las cinco. El nombre engaña en español.

## 4 · La otra puerta: los modificadores numéricos

Hallazgo del agente del paso 2, aquí cuantificado. **Lo que el motor tendrá que interpretar no llega
sobre todo por claves de condición: llega por cambios numéricos.**

**72 conjuros de 320 los usan · 316 cambios · 68 claves distintas.** Repartidos:

| | Cuántos | Estado |
|---|---|---|
| ventaja/desventaja (`*.roll.mode`) | 85 (26%) | **ya existe**: modo de tirada sugerido (2.5.5) |
| ruido (luz de antorcha, banderas de módulo, renombrar) | 79 (24%) | se ignora |
| velocidad, CA y características | 44 (14%) | **cubierto**: los doce objetivos de M8 |
| **resistencias al daño** | 39 (12%) | **falta** — y la maquinaria existe (paso 1, tarea 8) |
| **bono a tiradas** (`+1d4` de Bendición y Perdición) | 29 (9%) | **falta**, y es el caro |
| inmunidad a condición · PG temporales · rasgos · sentidos | 40 (13%) | falta, menor |

**Nuestros doce objetivos de modificador temporal cubren el 14% del tráfico numérico.** No es un
fallo de diseño —se hicieron para otra cosa— pero es el número que decide cuánto vocabulario hay
que añadir en el paso 3.

**El único caro es el bono a tiradas**, y por un motivo concreto: `+1d4` **no es un entero**, y los
modificadores temporales de hoy sí lo son. Bendición y Perdición son dos de los conjuros más usados
de la quinta edición, así que ese caso decide solo si merece la pena.

## 5 · La pieza que las tres decisiones comparten

**No son tres funcionalidades: es una.** Una invocación es un PNJ temporal, una transformación es un
statblock temporal, un encantamiento es un efecto temporal sobre un objeto. **Lo mismo con tres
formas: algo que se aplica, dura, y se retira solo.**

Y media pieza ya existe: **las condiciones caducan solas contra el reloj de campaña desde 2C**, y la
concentración sabe terminar lo que sostiene. Lo que falta es que esa caducidad valga también para
una fila de `Character`, una de inventario y un `statblockRef`.

**Diseñarlo una vez y usarlo tres es la diferencia entre esto y tres mecánicas sueltas.**

## 6 · Qué hace el conversor con lo que no cabe

**Lo importa igual, con su prosa.** Un conjuro con activación `special` entra con su nombre, su
nivel, su escuela, su alcance y su texto: se busca, se lee y se lanza. Lo único que no hace el
servidor es tirar por él.

**Decisión del autor, 2026-09-07:** *«el resto se puede dejar en solo texto y que el DM resuelva con
las herramientas o rol»*. Y encaja con lo que la spec del paso 2 ya decía: **existir sin
automatizarse es infinitamente mejor que no existir**.

## 7 · Lo que este documento NO decide

- **No dice cuándo se hace.** Es material para la spec del paso 3, no un plan.
- **No diseña lo temporal**: dice que es una pieza y no tres, y deja las tres formas medidas.
- **No entra en `teleport`** (1 conjuro): ese sí es distancia, y es fase 3.
- **Y no toca el paso 2 en marcha.** Todo lo de aquí se aplica al escribir el conversor.
