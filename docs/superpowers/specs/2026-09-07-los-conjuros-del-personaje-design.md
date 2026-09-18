# Paso 3.5 · Los conjuros del personaje — diseño

> Escrito el 2026-09-07. **Va detrás del paso 3 y antes de la primera partida.**
>
> Nace de una pregunta del autor: *«si hacemos el paso 3 y el cambio de interfaces, ¿estaría listo
> para la primera partida?»*. La respuesta medida fue **no, y por una sola pieza**: después del
> paso 3 habrá 320 conjuros en el catálogo y **ningún personaje podrá elegir uno**.
>
> **Todo lo que dice «hoy» se comprobó abriendo el fichero**, el 2026-09-07 sobre `1b2c29d`.

---

## 1 · El hueco, en una frase

**El catálogo es la biblioteca; falta el libro de conjuros del personaje.**

No existe nada que ligue un personaje con un conjuro: ni conocidos, ni preparados, ni una tabla
entre los dos. Comprobado — cero apariciones en `schema.prisma`. Y sin ese eslabón, **el paso 3 deja
un mago con trescientos veinte hechizos que no son suyos**.

**Y la mesa del autor tiene un mago.** Guerrero, bárbaro y mago de nivel 3 es la partida de prueba
declarada, así que esto no es un pulido: es lo que separa «se puede jugar» de «se puede jugar salvo
uno de los tres».

## 1bis · Un conjuro y una aptitud de clase son lo MISMO — y esto no lo cambia

**Pregunta del autor al leer este documento, y merece estar arriba:** *«¿un ataque especial de un
bárbaro no debería entrar aquí también?»*

**Sí, y ya entra — pero por la otra puerta.** Un conjuro y una aptitud son la misma cosa con distinto
origen: las dos son algo que un personaje puede hacer, que gasta un recurso, elige objetivo, tira o
pide una tirada, y a veces deja un efecto con duración. Es la tesis que fundó el paso 2
([`2026-09-05-conjuros-design.md`](./2026-09-05-conjuros-design.md)): *«diseñarlos por separado es
cómo se acaba con dos motores que hacen lo mismo mal»*.

Así que un «ataque circular» de bárbaro sería **una actividad de tipo `ataque`**, igual que *Bola de
fuego* es una de tipo `salvación`. Misma tabla, mismo motor, misma tarjeta —«Actividades»,
`character-sheet/Actividades.tsx`, paso 2 tarea A11—, mismo botón y misma traza.

**Lo único que los separa es cómo llegan al personaje:**

| | Cómo aparece | Quién lo decide |
|---|---|---|
| **Aptitud de clase** | el nivel la **concede** (`ItemGrant`, paso 2 A9), con sus usos ya resueltos | nadie: subir de nivel |
| **Conjuro** | hay que **elegirlo** de entre cientos | el jugador, cada día o al subir |

**Y este documento solo añade esa segunda columna.** No un motor nuevo, no una pantalla de lanzar
aparte: **el mecanismo de elegir**, que es lo único que una aptitud no necesita.

## 2 · Lo que YA existe, y por eso esto es corto

| Pieza | Dónde |
|---|---|
| **Ocho clases con lanzamiento declarado** — característica y progresión | `rules/catalog/classes.ts`: bardo, clérigo, druida, hechicero, mago (`FULL`) · paladín, explorador (`HALF`) · brujo (`PACT`) |
| **Los espacios, derivados** por las tres progresiones | `rules/catalog/spell-slots.ts` — y su cabecera avisa: *«hay tres progresiones y confundirlas es el error obvio»* |
| **La CD de conjuro y el bono de ataque mágico**, con su traza | `rules/engine.ts` — `spellSaveDc`, `attack.spell` |
| **Los espacios como recurso gastable** | son `CharacterResource`, con su reposición por descanso |
| **Lanzar** | paso 2: una actividad con `consumption` de un espacio. **Ya construido y probado** |
| **Los 320 conjuros con su forma** | paso 3 |

**Lo único que falta es decir cuáles son míos.** Todo lo demás está.

## 3 · Tres modelos de preparación, no dos — y el SRD los distingue

Esta es la parte que hay que acertar, porque **una clase no elige sus conjuros como otra**:

| Modelo | Clases | Cómo funciona (SRD 5.1) |
|---|---|---|
| **Lista completa, prepara cada día** | clérigo, druida, paladín | Puede preparar **cualquier conjuro de su clase**; el número es `modificador + nivel` (paladín: `modificador + medio nivel`). Cambia tras un descanso largo |
| **Libro propio, prepara del libro** | mago | Aprende conjuros **a su libro** (dos por nivel, más los que copie); prepara `modificador + nivel` **de los del libro**, no de la lista entera |
| **Conocidos fijos, sin preparar** | bardo, hechicero, explorador, brujo | Conoce un número fijo por nivel, **de tabla**; los tiene siempre listos y **cambia uno al subir de nivel** |

**Y los trucos van aparte de los tres**: se conocen siempre, **no se preparan y no gastan espacio**.
Su número también sale de tabla por clase y nivel.

> **La cita va en el commit, y en inglés.** Es regla vinculante de este proyecto: cada uno de estos
> números se verifica contra el SRD 5.1 antes de escribirlo. «Modificador + nivel» es correcto para
> mago y clérigo; **el paladín es medio nivel**, y ese es justo el que se copia mal.

## 4 · El modelo de datos

**Una tabla, y un enum de tres valores.** La forma la manda el SRD, no la comodidad:

```
CharacterSpell
  characterId   a quién
  spellRef      ContentRef — `SRD:fireball`, la misma cadena de 2B, nunca clave foránea
  estado        EN_EL_LIBRO | PREPARADO | CONOCIDO
```

- **`CONOCIDO`** — bardo, hechicero, explorador, brujo. Y los trucos de todas las clases.
- **`EN_EL_LIBRO`** — solo el mago: lo tiene escrito y **no** lo lleva preparado hoy.
- **`PREPARADO`** — listo para lanzar. Para el mago sale de su libro; para clérigo, druida y
  paladín, de la lista entera de su clase.

**Lo que el servidor deriva y NO se guarda**: cuántos puede preparar (`modificador + nivel`), cuántos
trucos le tocan, y **si se ha pasado**. Guardar el tope sería una segunda verdad que se desincroniza
al subir de nivel — el mismo error que este proyecto ya evitó con la carga y con los espacios.

**Y cuenta y avisa; no impide** — la misma decisión del autor que gobierna la economía de acciones
(D-A del 2026-09-06). Si un clérigo prepara siete con seis de tope, **la pantalla lo dice y el DM
decide**: hay rasgos y objetos que regalan preparaciones, y ninguno estará modelado el primer día.

## 5 · La pantalla

**Va en la pestaña «Conjuros» de la hoja** (`2026-09-06-la-hoja-en-la-mesa-design.md`), no en una
página aparte: preparar conjuros es algo que se hace mirando los espacios que tienes.

Tres zonas, y **ninguna es una rejilla de iconos** — decisión del autor: no hay arte de objetos ni
de conjuros, la referencia es la lista de *Final Fantasy*:

- **Preparados** — los que puedes lanzar ahora. Cada fila: nombre, nivel, escuela, y su acción.
- **Disponibles** — la lista de la clase (o el libro, si es mago), con **buscador y filtros por
  nivel y escuela**, reutilizando `FilterChip`, que ya filtra el bestiario.
- **El contador**: «5 de 6 preparados · 4 trucos». Deriva del servidor, con su traza como todo lo
  demás.

**Y lanzar no es un botón nuevo**: es la actividad del paso 2, con su `consumption` de espacio. Un
conjuro preparado enseña **la misma fila** que un ataque del cuadro — porque por debajo es lo mismo.

## 6 · Lo que este paso NO hace

- **No mecaniza los rituales.** El SRD deja lanzar algunos sin gastar espacio si tienes el rasgo;
  entra como **etiqueta del conjuro y texto**, no como camino aparte.
- **No modela copiar conjuros al libro** con su coste en oro y horas. El mago **añade a su libro** y
  el DM arbitra el precio: es una conversación de mesa, no una transacción.
- **No toca la recuperación de espacios del brujo** más allá de lo que `spell-slots.ts` ya hace.
- **No inventa conjuros**: solo se puede preparar lo que el catálogo del paso 3 trajo.
- **No decide por la mesa**: ni impide pasarse del tope, ni obliga a preparar tras un descanso.

## 7 · Lo que puede salir mal

| Riesgo | Señal | Qué hacer |
|---|---|---|
| **Confundir los tres modelos** | un hechicero al que la pantalla le pide «preparar» | El modelo sale de la clase, y hay una prueba por cada uno de los tres |
| **El paladín con `modificador + nivel`** | prepara el doble de lo que le toca | Es `medio nivel`, verificado en el SRD, con la cita en el commit |
| **Guardar el tope** | al subir de nivel, el número no cambia | Se deriva, nunca se guarda |
| **Trucos gastando espacio** | un mago se queda sin espacios lanzando *Rayo de fuego* | Los trucos van aparte y no consumen |
| **Preparar algo que no es de tu clase** | un mago con *Curar heridas* | La lista disponible sale de la clase; el servidor lo comprueba, no la pantalla |

## 8 · Qué decide el autor

1. **¿El mago empieza con su libro sembrado?** El SRD da seis conjuros de nivel 1 al empezar y dos
   por nivel. Recomendado: **sembrarlos al crear el personaje**, como ya se siembran los espacios y
   los dados de golpe — llegar a la mesa con el libro vacío es una tarea administrativa antes de
   jugar.
2. **¿Se puede preparar en mitad del combate?** El SRD lo prohíbe —hace falta un descanso— pero este
   proyecto **cuenta y avisa, no impide**. Recomendado: **avisar y dejar**, coherente con todo lo
   demás.
3. **¿Los trucos se eligen o se siembran?** Recomendado: **se eligen**, con su contador aparte: son
   la mitad de lo que hace un mago de nivel bajo y elegirlos es parte del personaje.

## Definición de terminado del diseño

Está terminado cuando el autor apruebe **los tres modelos de preparación**, la tabla con su enum de
tres, y la regla de que **el tope se deriva y no se guarda**. Su plan por tareas se escribe cuando el
paso 3 haya traído el catálogo: sin conjuros que elegir, esta pantalla no se puede probar.

## Decidido el 2026-09-18 sin el autor

Las tres preguntas del §8 se contestaron la noche del 2026-09-18 por los cuatro pasos de
`04-convenciones.md` (cambio rápido y duradero → cumple las reglas → lo contesta el SRD 5.1 en
inglés, después Foundry), sin el autor, con la autorización escrita en el prompt de esa noche.
Las filas son **D-CF-125, D-CF-126 y D-CF-127** en [decisiones.md](../../decisiones.md), y esto es
solo el resumen: **(1) sí se siembra** —libro del mago y conocidos de las clases de lista fija— en
el momento en que la clase se fija por primera vez, con un arranque curado por clase y editable
desde la pestaña; clérigo, druida y paladín no guardan nada porque su lista conocida es la de su
clase entera; **(2) preparar en combate se permite, cuenta y avisa** (suceso marcado
`fueraDeRegla`, línea en el hilo, aviso en pantalla; nunca un rechazo); **(3) los trucos se
eligen**, con el tope de la columna «Cantrips Known» del SRD derivado por clase y nivel, no
gastan espacio y escalan por nivel de personaje con la forma que `Actividad` ya tiene. Las citas
del SRD 5.1 (Foundry `classfeatures/*/spellcasting.yml` y `classes/*.yml`, `rules: '2014'`) van en
el commit de cada tarea que las aplique.
