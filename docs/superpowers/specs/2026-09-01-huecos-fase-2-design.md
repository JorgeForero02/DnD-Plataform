# Huecos de la fase 2 — lo que una mesa real necesita y el alcance no modela

**Fecha:** 2026-09-01. **Autor del informe:** agente de investigación (solo lectura).
**No es una decisión ni un plan:** es una lista de huecos con su coste, para que el autor decida
**antes** de ejecutar 2A.

**Documentos base leídos:**
`docs/superpowers/specs/2026-09-01-fase-2-alcance-design.md` (805 líneas, vinculante),
`.superpowers/sdd/briefs/plan-2A-borrador.md` (756 líneas),
`apps/api/prisma/schema.prisma`, `docs/05-datos.md`, `docs/09-primera-partida.md`.

**Semilla del autor** (el arquetipo de lo que se busca): el spec dice que los objetos se
**equipan y desequipan** (línea 43: *"Objetos con datos, inventario, equipar y desequipar"*)
pero **nunca dice dónde**. No hay ranuras de equipo. Por eso el sistema no puede expresar que un
escudo ocupa una mano, que un arma a dos manos las ocupa las dos, ni que un arma versátil hace
1d8 con una y 1d10 con dos. Este informe busca los **otros huecos de esa misma forma**: la regla
lo exige, la mesa lo toca en las primeras sesiones, y el alcance actual **no tiene dónde
ponerlo**.

---

## Cómo leer esto

Cada hueco lleva cinco cosas:

1. **Qué piden las reglas o la mesa.**
2. **Qué cuesta hoy en la mesa** si la herramienta no lo puede expresar — concreto, en una
   sesión real.
3. **Dónde va** (2A / 2B / 2C / Encuentros / después) **y por qué**.
4. **Coste de construirlo ahora.**
5. **Coste de meterlo después** — *este es el número que decide el orden*.

**Escala de coste:** ▁ trivial (una columna, un campo) · ▂ pequeño (una tabla o un cálculo) ·
▃ medio (tabla + endpoints + pantalla) · ▄ grande (subsistema) · ▅ migración de datos ya
escritos o rehacer una decisión firmada.

El orden es **por lo que duele en la mesa**, no por elegancia.

---

# Bloque 1 — Los que hay que decidir ANTES de escribir la primera migración

Estos cuatro comparten una propiedad: **son baratos dentro de su fase y caros fuera**, porque
el retrofit toca filas ya escritas o una fórmula ya firmada.

---

## H1 · Ranuras de equipo, manos, y el estado de un objeto (la semilla, ampliada)

**Rango: el más caro de retrofitear de toda la lista.**

### Qué necesita la regla

El escudo **requiere una mano** y da +2 a la CA; *"you can benefit from only one shield at a
time"*
([SRD, Armor](https://5thsrd.org/adventuring/equipment/armor/)). El arma versátil (espada larga)
hace **1d8 con una mano y 1d10 con dos**
([Versatile Weapons 5e](https://arcaneeye.com/mechanic-overview/versatile-weapons-5e/)). Un arma
*two-handed* no admite escudo. Eso **no es aritmética**: el escudo no resta daño, **elimina la
opción de empuñar a dos manos**. Es un problema de modelado.

Y hay un tercer eje que el spec tampoco nombra: un objeto puede estar **transportado**,
**equipado** o **sintonizado**, y son tres estados distintos, no un booleano. Foundry lo modela
así explícitamente: `PhysicalItemTemplate` para lo que se lleva encima, `EquippableItemTemplate`
para lo que se puede equipar, y `attuned` aparte
([Item Data Models, dnd5e/Foundry](https://deepwiki.com/foundryvtt/dnd5e/2.2-item-data-models)).

### Qué cuesta en la mesa hoy

El jugador equipa espada larga **y** escudo **y** arco largo a la vez. La CA suma +2 del escudo,
el ataque de espada larga aparece con 1d8, y **nada avisa de que eso es imposible**. En la mesa
el DM tiene que hacer de validador manual: *"no, si llevas el escudo no puedes usar el arco"*, y
la traza de derivación —**que es la funcionalidad**, según el spec en la línea 59— **miente**:
`CA 18 = 14 cota de malla + 2 escudo + 2 Destreza` con un personaje que en realidad tiene el arco
en las manos. Un número explicado que está mal es peor que un número sin explicar, porque el
jugador ya no pregunta.

### Dónde va y por qué

**2B**, dentro de la misma tarea que crea la tabla de objetos equipados. El plan de 2A ya prevé
esa tabla (`plan-2A-borrador.md:112`, *"objetos equipados (2B)"* como cardinalidad 0..n → tabla
propia), pero **sin ranura**.

### Coste

| | |
|---|---|
| **Ahora (2B)** | ▂ — un enum `EquipSlot` (`MAIN_HAND`, `OFF_HAND`, `ARMOR`, `SHIELD` si se prefiere separado, `HEAD`, `NECK`, `RING_1`, `RING_2`, `CLOAK`, `BOOTS`, `HANDS`, `OTHER`), un `handsRequired: 1 \| 2` en el arma, una restricción única parcial por `(characterId, slot)`, y una validación en el servidor. La CA y el cuadro de ataques ya se estarían escribiendo en esa tarea. |
| **Después** | ▅ — hay que **migrar cada fila de equipo ya escrita** adivinando a qué ranura pertenece (un anillo, ¿a cuál de los dos?), **rehacer la fórmula de CA** que ya está firmada como *"elige la mayor de las candidatas"* (`plan-2A-borrador.md:305`) para que además valide manos, y **revisar el cuadro de ataques** de 2C, que ya estará mostrando el daño versátil equivocado. |

### Lo que hay que decidir con él, y suele olvidarse

- **Sintonización**: máximo **tres objetos** por criatura, uno por objeto, y *"a creature can't
  attune to more than one copy of an item"*
  ([SRD, Magic Items](https://www.5esrd.com/tools-resources/system-reference-document-5-1-1/magic-items/)).
  Es un contador con tope, exactamente el mecanismo P5 del spec (línea 663). **No es una
  funcionalidad nueva: es un tercer estado del objeto y un tope de 3.** Si el estado del objeto
  ya es un enum `CARRIED | EQUIPPED | ATTUNED` con su ranura, el tope de 3 es una validación de
  una línea. Si el estado es `equipped: boolean`, es otra migración.
- **Requisito de Fuerza y desventaja en Sigilo de la armadura**: cota de malla exige Fuerza 13 o
  la velocidad baja 10 pies; padded, scale mail, half plate, ring mail, chain mail y splint dan
  **desventaja en Destreza (Sigilo)**
  ([SRD, Armor](https://5thsrd.org/adventuring/equipment/armor/)). El primero **es un número**
  (velocidad) y cae limpio en la lista cerrada de efectos del spec (línea 81). El segundo **no**:
  es una desventaja, y el spec dice que la ventaja/desventaja la marca el DM (línea 22). La
  salida honesta y barata: **un aviso**, que es un mecanismo que el motor ya tiene
  (`plan-2A-borrador.md:23`, *"hoja calculada + lista de avisos + traza"*).
- **Armadura sin competencia**: *"disadvantage on any ability check, saving throw, or attack roll
  that involves Strength or Dexterity, and you can't cast spells"*
  ([SRD, Armor](https://5thsrd.org/adventuring/equipment/armor/)). También un aviso.

---

## H2 · El descanso está a medias: existe el gatillo, no existe lo que restaura

**Rango: 2º. Es el hueco que más se nota en la sesión 1, y está a una columna de distancia.**

### Qué necesita la regla

- **Descanso corto**: se gastan **dados de golpe** (hasta el número que tiene el personaje, que
  es igual a su nivel); por cada uno, se tira y se suma el modificador de CON.
- **Descanso largo**: PG a máximo **y se recuperan dados de golpe gastados, hasta la mitad del
  total, mínimo uno**.
  ([SRD, Resting](https://www.dnddeutsch.de/srd/adventuring/resting/))

### El hueco exacto en el plan

El plan de 2A **sí** tiene el gatillo: `REST_DECLARED` en el log (`plan-2A-borrador.md:176`) y
`resetOn: NONE | SHORT_REST | LONG_REST` en `CharacterResource`
(`plan-2A-borrador.md:129`). Lo que **no** tiene es lo que el descanso realmente restaura:

1. **`currentHp` no se toca en un descanso largo.** El plan dice explícitamente que la tarea de
   descansos "repone los `LONG_REST` y no los `NONE`" (`plan-2A-borrador.md:623`) hablando **solo
   de recursos**. Los PG no son un `CharacterResource`: son la columna `currentHp`
   (`plan-2A-borrador.md:117`). Nadie los sube.
2. **Los dados de golpe no están modelados en ninguna parte.** Ni en el spec ni en el plan. El
   `key: "hit-dice-d12"` aparece como ejemplo de recurso (`plan-2A-borrador.md:126`), pero un
   dado de golpe **no es un contador puro**: gastarlo **tira un dado y cura**, y se recupera
   **la mitad**, no todo. Ningún `resetOn` de los tres existentes expresa "la mitad".

### Qué cuesta en la mesa

Es el bucle más frecuente de una sesión de D&D después de atacar. Sin esto: el combate termina, el
grupo descansa una hora, y **cada jugador abre la calculadora del móvil**, tira un d8 físico,
suma su CON, y **teclea a mano el PG resultante** en la hoja — que es exactamente el
*"preguntarle al DM / hacer cuentas fuera de la herramienta"* que el proyecto existe para
eliminar. Y como `currentHp` no se restaura tras un descanso largo, **la mesa se acostumbra a
corregir los PG a mano**, y a partir de ahí ya nadie confía en el número de la pantalla.

### Dónde va

**2A**, en la misma tarea 2A.8 (recursos consumibles). No es una fase distinta: es **terminar** la
que ya está planificada.

### Coste

| | |
|---|---|
| **Ahora (2A.8)** | ▁▂ — un valor más en `ResourceReset` (`HALF_ON_LONG_REST`), un tipo de recurso que al gastarse **tira con el evaluador de 2A.1** y aplica un delta de PG (el endpoint de deltas ya existe en 2A.7), y que el descanso largo ponga `currentHp = null` (que el plan ya define como *"a PG máximos"*, `plan-2A-borrador.md:117`). Es **reusar tres piezas que la fase ya construye**. |
| **Después** | ▃ — hay que volver a abrir el endpoint de descanso, añadir el enum (migración), y sobre todo **desandar la costumbre de la mesa** de corregir PG a mano, que para entonces ya generó filas de `HP_CHANGED` con motivos falsos en el log inmutable. |

---

## H3 · Puntos de golpe temporales: la columna existe, la regla no

**Rango: 3º. Coste casi nulo ahora; error silencioso garantizado si se hace mal.**

### Qué necesita la regla

Los PG temporales **no se suman** entre sí: al recibir una fuente nueva, **se queda el mayor de
los dos**, no la suma; y **no se curan**
([Temporary Hit Points, blackcitadelrpg](https://blackcitadelrpg.com/temporary-hit-points-5e/)).
El daño se resta **primero** de los temporales.

### El hueco

`tempHp Int @default(0)` ya está en la propuesta (`plan-2A-borrador.md:118`) y el evento
`TEMP_HP_SET` en el enum (`plan-2A-borrador.md:177`). Pero **el spec y el plan no dicen en
ninguna parte** que el daño consuma primero los temporales ni que las fuentes no se acumulen. El
endpoint de daño está definido como un delta que *"recorta entre 0 y el máximo"*
(`plan-2A-borrador.md:216`) — **sin mencionar `tempHp`**. Tal como está escrito, un
`{ delta: -5 }` con 8 PG temporales bajaría los PG reales.

### Qué cuesta en la mesa

El clérigo lanza un conjuro que da 10 PG temporales. Llega el aliento de dragón, 12 de daño. La
pantalla dice que el personaje está a 12 PG menos **y sigue teniendo 10 temporales**. En la mesa:
discusión de dos minutos, el DM corrige a mano, y el registro del log queda mintiendo para
siempre (es append-only, `plan-2A-borrador.md:142`). Y es un fallo **silencioso**: nadie lo nota
hasta que alguien muere por él.

### Dónde va

**2A, tarea 2A.7**, en el mismo endpoint de deltas. Es una decisión de diseño de tres líneas.

### Coste

| | |
|---|---|
| **Ahora** | ▁ — el delta negativo consume `tempHp` primero; `TEMP_HP_SET` aplica `max(actual, nuevo)` en vez de asignar; una prueba. El plan de 2A.7 ya pide una prueba de recorte a 0 (`plan-2A-borrador.md:609`); esta va al lado. |
| **Después** | ▂, pero con **datos ya corrompidos**: filas de `HP_CHANGED` escritas con la semántica equivocada que nadie puede recalcular. |

---

## H4 · Competencias que no son "sí o no": expertise, media competencia, herramientas, idiomas

**Rango: 4º. Barato ahora, caro después, porque cambia la forma del modificador.**

### Qué necesita la regla

- **Expertise** (pícaro y bardo desde nivel 1, del SRD): **duplica** el bonificador de
  competencia en dos habilidades. No es un +2 más: es `2×PB`, así que **escala con el nivel**.
- **Media competencia** (Jack of All Trades, bardo): **la mitad del PB, redondeada hacia abajo**,
  en pruebas donde no se es competente.
- **Herramientas** (ladrón, instrumentos, kit de herbolario) e **idiomas**: el spec **sí** los
  nombra (línea 215, *"Competencias: salvaciones, armaduras, armas, herramientas, idiomas"*),
  pero el plan de 2A **no los incluye en el alcance de la transcripción**
  (`plan-2A-borrador.md:413`: razas, subrazas, clases, habilidades, armaduras, tabla de
  competencia — **ni herramientas ni idiomas**).

El `target` del modificador propuesto solo conoce `skillProficiency` como booleano
(`plan-2A-borrador.md:335`). **No hay forma de expresar "expertise en Sigilo"**.

### Qué cuesta en la mesa

El pícaro es el arquetipo del jugador que tira Sigilo cada diez minutos. Con el modelo actual la
hoja dice **+5** donde la regla dice **+7**, y a nivel 17 dice +5 donde dice +11. El jugador
**deja de mirar la hoja** y hace la cuenta de cabeza, que es la derrota completa de la
herramienta. Y con los idiomas: la escena de *"¿alguien habla enano?"* se resuelve mirando la
ficha de papel de alguien.

### Dónde va

**2A**, tareas 2A.3 (catálogo) y 2A.4 (elecciones). **Los idiomas y herramientas son datos
puros**, sin fórmula: es transcripción, la parte de 2A que el plan ya llama *"tediosa, no
arriesgada"* (spec línea 254).

### Coste

| | |
|---|---|
| **Ahora** | ▁▂ — el `target` de competencia pasa de booleano a un nivel: `NONE \| HALF \| PROFICIENT \| EXPERTISE`, y el motor multiplica el PB por 0 / 0,5↓ / 1 / 2. Dos listas más en el catálogo (idiomas, herramientas). La prueba: un pícaro nivel 5 con expertise en Sigilo → **+7**, no +5. |
| **Después** | ▃▅ — cambiar la forma de `Modifier` **después** de que exista `CharacterChoice` con filas escritas (`plan-2A-borrador.md:343`) obliga a migrar las elecciones ya guardadas y a tocar el motor, el catálogo, la traza y la pantalla a la vez. Es exactamente el mismo error que la ranura de equipo, en otro sitio. |

---

# Bloque 2 — Duelen desde la primera sesión, pero se pueden meter en su fase sin drama

---

## H5 · Puntuaciones pasivas y sentidos como número: la Percepción pasiva y la visión en la oscuridad

### Qué necesita la regla

*"To determine a character's total for a passive check, add 10 + all the modifiers that normally
apply to the check"*; con ventaja **+5**, con desventaja **−5**
([SRD, Using Ability Scores](https://dnd-wiki.org/wiki/SRD5:Using_Ability_Scores)). La
**Percepción pasiva** es el número que el DM consulta más veces por sesión sin que nadie tire
nada.

**Y el spec ya tiene la mitad hecha**: *"visión en la oscuridad"* aparece en la lista cerrada de
lo que se calcula (línea 213). Pero **no aparece en el catálogo del plan** ni en la salida del
motor: `DerivedValue.key` da como ejemplos `"ac"`, `"maxHp"`, `"save.dex"`, `"attack.melee"`,
`"spellSaveDc"` (`plan-2A-borrador.md:291`) — **ningún valor pasivo, ningún sentido**.

### Qué cuesta en la mesa

Este es el hueco que **le cuesta al DM, no al jugador**, y por eso se pasa por alto. El DM
prepara una emboscada y necesita la Percepción pasiva de los cuatro personajes **de un vistazo**.
Sin ella, tiene que pedirla en voz alta — *"decidme vuestra percepción pasiva"*— lo que **avisa a
la mesa de que hay algo escondido**. La herramienta acaba de destruir la sorpresa que el DM
preparó. Es el caso más puro de P0 (*preparar una vez, usar muchas en la mesa*, spec línea 647):
el DM debería tener un panel con los cuatro números **antes** de la sesión.

Con la visión en la oscuridad: *"¿tú ves en la oscuridad?"* — *"creo que sí, soy enano"* — y el
DM mirando el manual. Es un **número en pies** (60 o 120), no un rasgo de texto.

### Dónde va

**2A**, tarea 2A.2 (el motor ya calcula habilidades con competencia; el pasivo es `10 + eso`) y
2A.10 (pantalla). El panel del DM con los pasivos de toda la mesa: **2C**, junto a las tablas del
DM y la guía de CD, porque es la misma pantalla de dirección.

### Coste

| | |
|---|---|
| **Ahora** | ▁ — tres claves derivadas más (`passive.perception`, `passive.investigation`, `passive.insight`) y `senses.darkvision` como número. El motor ya tiene todo lo que necesita. |
| **Después** | ▂ — barato de retrofitear, **pero el panel del DM no**: si en 2C no existe una consulta "dame los pasivos de todos los personajes de esta campaña", se acaba pidiendo cuatro hojas completas y filtrando en el cliente. |

---

## H6 · Dinero y compras

### Qué necesita la regla

Cinco monedas —cp, sp, ep, gp, pp— con tipos de cambio fijos (1 gp = 10 sp = 100 cp; 1 pp = 10
gp), y **peso**: *"a coin weighs about a third of an ounce, so fifty coins weigh a pound"*
([SRD, Coins](https://www.dnddeutsch.de/srd/adventuring/equipment/coins/)).

### El hueco

**El dinero no aparece ni una vez en las 805 líneas del spec ni en las 756 del plan.** Ni como
alcance, ni como exclusión. Es una **ausencia**, no una decisión — igual que los críticos (P7,
spec línea 717), que el autor detectó por el mismo procedimiento.

### Qué cuesta en la mesa

El botín es la mitad del ciclo de recompensa de D&D, y 2B lo modela **entero menos el dinero**:
el cofre da objetos (P4, spec línea 623) pero no puede dar 340 monedas de oro. En la mesa, el
reparto del oro vuelve a la libreta de papel, y con él vuelve la discusión de *"¿cuánto teníamos
antes de la posada?"*. Y la compra de equipo —que es **exactamente** una preparación entre
sesiones, o sea P0 puro— no existe: el jugador no puede comprarse una cuerda sin el DM.

### Dónde va

**2B**, con el inventario. Es la misma tarea: un objeto tiene precio, un personaje tiene bolsa.

### Coste

| | |
|---|---|
| **Ahora (2B)** | ▁ — cinco columnas `Int` en `Character` (`cp`, `sp`, `ep`, `gp`, `pp`) o una tabla de monedero, un endpoint de delta (el mismo patrón de 2A.7), y `costCp` en el catálogo, que **hay que transcribir de todos modos** al copiar armas y armaduras. Guardar por denominación y no en un total normalizado es lo correcto: la mesa dice *"tres monedas de plata"*, no *"0,3 po"*. |
| **Después** | ▂ — barato en sí, **pero si se guarda como un solo `gold: Float` para salir del paso, el retrofit a cinco denominaciones es ▄**: hay que decidir qué hacer con 12,37 po ya escritos. |

---

## H7 · Carga y capacidad de transporte

### Qué necesita la regla

Capacidad = **Fuerza × 15** libras. La variante opcional: por encima de Fuerza×5, **sobrecargado**
(velocidad −10); por encima de Fuerza×10, **muy sobrecargado** (velocidad −20 y desventaja en
pruebas, ataques y salvaciones de FUE, DES y CON)
([SRD, Strength](https://5thsrd.org/rules/abilities/strength/)).

### El hueco

El spec no menciona peso en ninguna parte. La lista cerrada de efectos (línea 78) incluye
*"velocidad"*, así que la **consecuencia** encaja; lo que falta es el **dato de entrada** (`weightLb`
en el objeto) y el valor derivado (`carryCapacity`).

### Qué cuesta en la mesa

Menos de lo que parece, y hay que decirlo: la regla base es *"high enough that most characters
don't usually have to worry about it"* (SRD), y muchas mesas la ignoran. **Pero el peso hay que
transcribirlo igual**, porque va en la misma fila del catálogo que el precio y el dado de daño, y
volver a pasar por las 60 filas de equipo un año después para añadir una columna es tonto.

El caso real donde sí duele: el DM que quiere que el saqueo tenga consecuencia. Sin peso, el
grupo se lleva la armadura de placas de los cuatro cadáveres, y el DM tiene que decir que no *"por
sentido común"*, que es justo la clase de arbitraje que el sistema debería poder apoyar con un
número.

### Dónde va

**El dato en 2B** (columna `weightLb` en el catálogo y en el objeto de campaña, junto al precio).
**El cálculo, opcional por campaña, después** — es una regla variante, no la base.

### Coste

| | |
|---|---|
| **Ahora (2B)** | ▁ — una columna más en una tabla que se está creando y una casilla más en la transcripción. Nada de cálculo. |
| **Después** | ▂ para el cálculo, **▃ para el dato**: transcribir el peso de 60 objetos otra vez, y encima con las filas de homebrew del DM ya escritas sin él. |

---

## H8 · Ataques múltiples: la hoja miente al nivel 5

### Qué necesita la regla

**Ataque Extra** (guerrero, bárbaro, paladín, montaraz, monje, pícaro no) al nivel 5: dos ataques
por acción. El propio plan lo usa **como ejemplo del diff de subida de nivel**
(`plan-2A-borrador.md`, spec línea 273: *"Nueva aptitud: Ataque Extra"*), y a la vez lo clasifica
como **texto** — los rasgos con activación no se automatizan (spec línea 214).

### Qué cuesta en la mesa

Aquí la clasificación "es texto" **está mal aplicada**, y merece la pena decirlo. Ataque Extra no
es un rasgo condicional como Ataque Furtivo (que depende de ventaja, de un aliado adyacente, del
tipo de arma). Es **un número: `attacksPerAction: 2`**. Y el cuadro de ataques de 2C (spec línea
325) va a mostrar una sola línea por arma, así que el guerrero de nivel 5 —el personaje más
común de una mesa— pulsa una vez, tira un ataque, y **tiene que acordarse de pulsar otra vez**.
En un combate de seis asaltos son seis olvidos posibles.

### Dónde va

El **dato** (`attacksPerAction`) en **2A**, con el catálogo de clases. El **botón** ("tira los
dos") en **2C**, con el cuadro de ataques.

### Coste

| | |
|---|---|
| **Ahora** | ▁ — un campo en la progresión de la clase, que se está transcribiendo de todas formas en 2A.3. |
| **Después** | ▂ y una transcripción repetida sobre 12 clases. |

---

## H9 · La visibilidad de los objetos: el objeto mágico que el jugador no sabe que es mágico

### Qué necesita la mesa

El DM da una espada. El jugador no sabe que es un +1 hasta que la identifica o la usa. Eso es
**el mismo mecanismo que P6** (datos ocultos, spec línea 676): `SPECIFIC_PLAYERS` +
`EntityVisibilityGrant` (`schema.prisma:107-114`), con la matriz `canView`
(`apps/api/src/common/visibility.ts:15-31`) ya probada.

### El hueco

**El spec no dice que un objeto de inventario tenga `visibility`.** `Character` sí la tiene
(`schema.prisma:145`), `Session` también (`schema.prisma:131`), `Entity` también
(`schema.prisma:86`) — pero la tabla de objetos de 2B se describe solo por sus efectos y su texto
libre (spec líneas 67-74 y 427-438). Sin campo de visibilidad, **el objeto que el DM prepara en
el cofre es visible en cuanto existe**, o no existe hasta que se entrega — y esa segunda opción
mata P0 (el DM no puede prepararlo en casa).

Y hay un caso más sutil: el objeto que el jugador tiene pero cuyos **efectos** no conoce. Eso es
**dos campos con visibilidad distinta en la misma fila**, que es algo que el modelo actual no
hace en ninguna parte — la visibilidad es siempre de la fila entera.

### Qué cuesta en la mesa

Si el objeto no tiene visibilidad: el DM prepara la mazmorra el jueves y **el viernes los
jugadores ya han visto el botín en su pantalla**. La preparación destruye la sorpresa, que es
exactamente lo contrario de lo que la herramienta promete. La alternativa —que el DM lo cree en
vivo, durante la partida— es teclear en la mesa con cuatro personas esperando.

### Dónde va

**2B**, y es prácticamente gratis: *"una tirada es un recurso más con su nivel de visibilidad"*
(spec línea 156) vale igual para un objeto.

### Coste

| | |
|---|---|
| **Ahora (2B)** | ▁ para la fila entera (una columna `visibility` + filtro por `canView`, que ya está construido y probado). ▂ si se quiere el caso "lo tengo pero no sé qué hace", que necesita separar *identificado* de *visible*. |
| **Después** | ▃ — añadir visibilidad a filas ya escritas obliga a elegir un valor por defecto para todas, y el valor seguro (`DM_ONLY`) **haría desaparecer el inventario de todos los jugadores** el día del despliegue de la migración. |

---

## H10 · La hoja no sobrevive entre sesiones porque falta el estado que no es PG

**Este es un matiz sobre P1, no una objeción: la propuesta del plan es buena y va en la dirección
correcta.** Lo que falta es la lista completa de qué es estado.

El plan de 2A modela como estado mutable: `currentHp`, `tempHp`, recursos
(`plan-2A-borrador.md:114-133`). **Lo que una mesa deja a medias entre sesión y sesión, y no está
en esa lista:**

| Estado | Dónde está hoy | Consecuencia de no tenerlo |
|---|---|---|
| **Dados de golpe gastados** | en ninguna parte (H2) | el descanso largo del día siguiente restaura de más |
| **Salvaciones de muerte acumuladas** (2 éxitos, 1 fallo) | en ninguna parte | la sesión termina con el pícaro inconsciente en el suelo; la semana siguiente **nadie recuerda cuántas llevaba** |
| **Sintonización activa** | en ninguna parte (H1) | el tope de 3 no se puede comprobar |
| **Concentración activa** | fuera de la fase 2 (ver H12) | — |
| **Dinero** | en ninguna parte (H6) | — |

**Las salvaciones de muerte merecen su párrafo.** Están **explícitamente aplazadas a Encuentros**
en el plan (`plan-2A-borrador.md:613`) y el spec las nombra como excepción de los naturales (línea
745). El aplazamiento **está bien razonado y no lo discuto**. Pero hay una asimetría que conviene
ver: la regla es *"whenever you start your turn with 0 hit points"* y *"on your third failure, you
die"*, con el 20 natural devolviendo 1 PG y el 1 natural contando doble
([SRD, Dropping to 0 HP](https://www.dandwiki.com/wiki/5e_SRD:Dropping_to_0_Hit_Points)). Eso
necesita el turno, sí — **pero el contador (0-3 éxitos, 0-3 fallos) es estado del personaje, no
del combate**, y sobrevive al final de la sesión. Dos columnas `Int` en `Character` en 2A cuestan
▁ y evitan que Encuentros tenga que migrar la tabla de personajes. **Recomendación: las dos
columnas en 2A, la mecánica en Encuentros.**

---

# Bloque 3 — Exclusiones deliberadas: de acuerdo, con una discutida

El spec excluye a propósito multiclase, dotes, matemáticas de espacios de conjuro, combate,
iniciativa y PX (spec líneas 236-243 y 468-478; plan §6, `plan-2A-borrador.md:686-702`). **Las
razones son correctas y no las re-litigo**, con una excepción y un matiz.

## H11 · Espacios de conjuro — la exclusión es correcta, el corte está en el sitio equivocado

**No discuto excluir la matemática de conjuros.** Preparados contra conocidos, trucos que escalan,
listas por clase: es un subsistema entero, y el spec tiene razón.

**Lo que sí señalo:** el spec ya declara P5 —*"un punto de inspiración, un espacio de conjuro, un
dado de golpe, un uso por descanso, la furia y el ki son el mismo mecanismo"* (línea 663)— y
construye `CharacterResource` con `resetOn: LONG_REST` (`plan-2A-borrador.md:129`). **La tabla de
espacios de conjuro por nivel de clase es exactamente eso: nueve contadores con máximo que se
reponen en descanso largo.** No es la matemática; es la fila del catálogo.

Sin ella, el mago —una de las 12 clases— lleva sus espacios **en un papel al lado del portátil**,
que es la imagen que este proyecto existe para eliminar. Con ella, el mago tiene nueve contadores
que bajan al pulsar y se reponen al descansar, y **la elección de qué conjuro va en el espacio
sigue siendo texto**, como manda el spec.

**Coste ahora:** ▁▂ — una tabla del catálogo (transcripción de la progresión de conjuros, en la
misma tarea 2A.3 donde ya se transcribe la progresión de clase) y **cero código nuevo**, porque el
mecanismo ya se está construyendo para la inspiración.
**Coste después:** ▂, no es caro. Por eso está en el bloque 3 y no en el 1. Pero es la mejor
relación valor/coste de toda la lista.

## H12 · Concentración — de acuerdo con dejarla fuera, con una advertencia

Concentrarse en un conjuro a la vez; al recibir daño, salvación de CON con **CD 10 o la mitad del
daño, la que sea mayor**
([Concentration 5e, DnD Lounge](https://www.dndlounge.com/concentration-5e/)). Es la regla que
**más se olvida en la mesa real**, con diferencia.

Depende del daño, que es combate, y **su sitio es Encuentros**. Estoy de acuerdo.

**La advertencia:** el spec sí trae condiciones indefinidas en 2C (línea 44) y el reloj de campaña
(línea 408). "Concentrándose en Bendición" **es** una condición indefinida que el DM pone y quita.
Si 2C modela las condiciones con un `key` libre, la concentración cabe dentro **sin código nuevo**
y el DM tiene al menos el recordatorio visible. Si 2C modela las condiciones como un enum cerrado
de las 15 del SRD, no cabe, y añadirla en Encuentros es una migración de enum. **Coste de
acertarlo ahora: ▁ (una decisión de forma). Coste de errarlo: ▂.**

## H13 · Bonificadores que se acumulan y los que no

D&D 5e **no tiene un sistema general de tipos de bonificador** (a diferencia de 3.5): la regla es
que casi todo suma, con excepciones nombradas — *"you can benefit from only one shield at a time"*
([SRD, Armor](https://5thsrd.org/adventuring/equipment/armor/)), los PG temporales que no se
apilan (H3), y las fórmulas de CA que **se sustituyen en vez de sumarse**.

**El plan ya lo resolvió bien**, y hay que decirlo: el `op: "base" | "add" | "override" | "cap"`
(`plan-2A-borrador.md:281`) y la elección de la mayor fórmula candidata
(`plan-2A-borrador.md:305`) son exactamente el modelo correcto, y la prueba de la Destreza capada
(`plan-2A-borrador.md:312`) lo protege. **No hay hueco aquí.** Lo menciono porque estaba en la
lista de sitios que se olvidan, y en este proyecto **no** se olvidó.

Lo único que falta es el **tope de una sola fuente por tipo** para el escudo: si el jugador
equipa dos escudos, el modelo aditivo da +4. Se cierra con H1 (una ranura de escudo).

---

# Resumen: los diez huecos por lo que duelen

| # | Hueco | Fase | Construir | Retrofit | Por qué ese orden |
|---|---|---|---|---|---|
| **H1** | **Ranuras, manos, estados del objeto, sintonización** | 2B | ▂ | ▅ | Toca la fórmula de CA ya firmada y filas de equipo ya escritas |
| **H2** | **Qué restaura cada descanso (PG y dados de golpe)** | 2A.8 | ▁▂ | ▃ | El bucle más frecuente de la mesa; el gatillo ya existe sin destino |
| **H3** | **PG temporales: no se apilan, absorben primero** | 2A.7 | ▁ | ▂ + datos malos | Error silencioso en un log inmutable |
| **H4** | **Expertise, media competencia, herramientas, idiomas** | 2A.3/2A.4 | ▁▂ | ▃▅ | Cambia la forma de `Modifier` antes de que haya filas |
| **H5** | **Pasivas y sentidos como número** | 2A + panel en 2C | ▁ | ▂ | Le cuesta al **DM**, y P0 lo exige |
| **H6** | **Dinero (cinco denominaciones)** | 2B | ▁ | ▂ (▄ si se hace mal) | Ausencia total en el spec; media recompensa del juego |
| **H7** | **Peso de los objetos** (dato, no cálculo) | 2B | ▁ | ▃ | Se transcribe con el precio o se transcribe dos veces |
| **H8** | **`attacksPerAction`** | 2A dato / 2C botón | ▁ | ▂ | Clasificado como "texto" siendo un número |
| **H9** | **Visibilidad del objeto** | 2B | ▁ | ▃ | Sin ella, preparar la mazmorra revela el botín |
| **H10** | **Contadores de salvación de muerte como estado** | 2A columnas / Encuentros mecánica | ▁ | ▂ | Sobrevive entre sesiones; el resto no |
| *H11* | *Espacios de conjuro como contadores* | *2A.3 catálogo* | *▁▂* | *▂* | *La mejor relación valor/coste, pero barato después* |
| *H12* | *Concentración como condición con `key` libre* | *forma en 2C, mecánica en Encuentros* | *▁* | *▂* | *Solo hay que no cerrar el enum* |

**Lo mínimo que hay que decidir antes de la primera migración:** H1, H3, H4 y H10. Los cuatro
cambian la **forma** de una tabla o de un tipo, y los cuatro cuestan ▁–▂ ahora.

---

# Preguntas para el autor

Cada una se cierra con un **sí/no** o eligiendo una opción.

1. **H1 · ¿El objeto equipado lleva ranura (`EquipSlot`) y manos requeridas desde la primera
   migración de 2B**, en vez de un `equipped: boolean`? **Sí / No.**
2. **H1 · ¿El estado del objeto es un enum de tres valores (`CARRIED | EQUIPPED | ATTUNED`) con
   el tope de 3 sintonizaciones validado en el servidor**, en vez de dos booleanos?
   **Sí / No.**
3. **H1 · La desventaja en Sigilo de la armadura pesada y la penalización por falta de
   competencia: ¿se emiten como avisos del motor** (no como desventaja automática, que la marca
   el DM)? **Sí / No.**
4. **H2 · ¿Los dados de golpe se modelan en 2A como un recurso que al gastarse tira y cura**, con
   un `resetOn` nuevo que reponga la mitad en descanso largo? **Sí / No.**
5. **H2 · ¿El descanso largo pone `currentHp` a máximo** (es decir, a `null` según la semántica
   ya propuesta)? **Sí / No.**
6. **H3 · ¿El delta de daño consume `tempHp` antes que `currentHp`, y `TEMP_HP_SET` aplica
   `max(actual, nuevo)` en vez de asignar? Sí / No.**
7. **H4 · ¿La competencia se modela como nivel (`NONE | HALF | PROFICIENT | EXPERTISE`)** en vez
   de como booleano? **Sí / No.**
8. **H4 · ¿Entran idiomas y competencias con herramientas en la transcripción de 2A.3?**
   **Sí / No.**
9. **H5 · ¿El motor devuelve las tres puntuaciones pasivas y la visión en la oscuridad en pies
   como valores derivados?** **Sí / No.**
10. **H6 · El dinero: ¿(a) cinco columnas por denominación en 2B / (b) un solo total normalizado
    / (c) fuera de la fase 2?**
11. **H7 · ¿El catálogo de objetos lleva `weightLb` desde el principio**, aunque el cálculo de
    carga quede para después? **Sí / No.**
12. **H8 · ¿`attacksPerAction` entra como dato de la progresión de clase en 2A** (y el botón de
    "tira los dos" en 2C)? **Sí / No.**
13. **H9 · ¿El objeto de inventario lleva su propio campo `visibility` filtrado por `canView`
    desde la primera migración de 2B?** **Sí / No.**
14. **H10 · ¿`deathSaveSuccesses` y `deathSaveFailures` entran como dos columnas en `Character` en
    2A**, aunque la mecánica viva en Encuentros? **Sí / No.**
15. **H11 · ¿Los espacios de conjuro entran en 2A como filas de catálogo sobre el mecanismo de
    recursos que ya se construye** —contador con máximo, repuesto en descanso largo— dejando la
    elección de conjuros como texto? **Sí / No.**
16. **H12 · ¿La clave de condición de 2C es texto libre (o un enum abierto) en vez de un enum
    cerrado de las 15 condiciones del SRD**, para que quepan la concentración y el homebrew?
    **Sí / No.**

---

## Fuentes

- [SRD 5.1 — Armor (categorías, requisito de Fuerza, desventaja en Sigilo, escudo, competencia)](https://5thsrd.org/adventuring/equipment/armor/)
- [SRD 5.1 — Strength / capacidad de transporte y variante de carga](https://5thsrd.org/rules/abilities/strength/)
- [SRD 5.1 — Magic Items / sintonización (máximo tres)](https://www.5esrd.com/tools-resources/system-reference-document-5-1-1/magic-items/)
- [SRD 5.1 — Resting (descanso corto y largo, dados de golpe)](https://www.dnddeutsch.de/srd/adventuring/resting/)
- [SRD 5.1 — Dropping to 0 Hit Points (salvaciones de muerte)](https://www.dandwiki.com/wiki/5e_SRD:Dropping_to_0_Hit_Points)
- [SRD 5.1 — Using Ability Scores (pruebas pasivas: 10 + modificadores, ±5)](https://dnd-wiki.org/wiki/SRD5:Using_Ability_Scores)
- [SRD 5.1 — Coins (cinco denominaciones, cambio, cincuenta monedas por libra)](https://www.dnddeutsch.de/srd/adventuring/equipment/coins/)
- [Puntos de golpe temporales: no se apilan, no se curan](https://blackcitadelrpg.com/temporary-hit-points-5e/)
- [Concentración: una a la vez, CD 10 o la mitad del daño](https://www.dndlounge.com/concentration-5e/)
- [Armas versátiles 1d8 / 1d10 y la elección de la segunda mano](https://arcaneeye.com/mechanic-overview/versatile-weapons-5e/)
- [Foundry VTT dnd5e — modelos de datos de objeto (`PhysicalItemTemplate`, `EquippableItemTemplate`, estados equipado/sintonizado)](https://deepwiki.com/foundryvtt/dnd5e/2.2-item-data-models)
- [Roll20 — Resting (referencia de implementación en VTT)](https://roll20.net/compendium/dnd5e/Resting)

**Nota legal, coherente con el spec (líneas 290-312) y con `plan-2A-borrador.md:445-477`:** este
informe cita **mecánicas y formas de datos**, no texto del SRD ni contenido con derechos. Nada de
lo de arriba debe copiarse literalmente al repositorio; el SRD 5.1 está bajo CC BY 4.0 y su
atribución va donde el plan de 2A ya decidió.
