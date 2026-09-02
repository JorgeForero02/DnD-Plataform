# Distancias, movimiento y alcances — diseño · 2026-09-02

El autor lo pidió así: *«no creo que configuráramos el sistema de distancias: cuánto se puede
mover una persona, cuánto si está limitado (caído, herido…), cuánto es el alcance y radio de
este hechizo»*. Tenía razón — no está modelado en ninguna parte.

## Las decisiones, antes del material

**1 · Se guarda en pies, se enseña en metros.** El SRD 5.1 está en pies y todas sus cifras son
múltiplos de 5; guardar en metros obligaría a arrastrar decimales y a redondear en cada cuenta.
Pero las mesas hispanohablantes juegan en metros (1 casilla ≈ 1,5 m), así que **la conversión es
una capa de presentación**, con la unidad elegida por persona y guardada en su cuenta. Un dato
en la base nunca es ambiguo: **es pies, siempre**.

**2 · Sin mapa no hay posiciones, y eso parte el problema en dos.** Los mapas son la fase 3.
Hasta entonces:

| Se puede hacer **hoy** | Necesita posiciones — **fase 3** |
|---|---|
| Guardar y mostrar la velocidad de un personaje, por tipo de movimiento | «¿Llego hasta allí?» |
| **Calcular la velocidad efectiva ahora mismo** y decir por qué: *«15 pies: estás derribado y en terreno difícil»* | «¿A quién alcanza esta bola de fuego?» |
| Guardar el alcance de un arma (normal y largo) y el de un conjuro | Dibujar un cono o una esfera sobre un tablero |
| Guardar la **forma y el tamaño** del área de un conjuro y describirla | Medir la distancia entre dos criaturas |

Lo de la izquierda **ya es la mitad del valor** y no cuesta un tablero: un jugador derribado en
terreno difícil que ve *«tu velocidad ahora: 7,5 pies»* tiene resuelto el 90 % de las discusiones
de mesa. Lo de la derecha **no se promete** hasta que haya mapa.

**3 · La velocidad efectiva se calcula, nunca se guarda.** Es la misma regla que el resto de la
hoja (plan de 2A, §1.2, pieza 4): se guardan las decisiones —velocidad base, condiciones
activas—, y lo derivado se calcula al leer, **con su traza**. Guardar «velocidad = 15» significa
que el día que se corrija una fórmula habrá mil filas mintiendo.

**4 · Dónde encaja.** Las velocidades y las condiciones que las modifican son **2A** (la hoja de
personaje y su motor). Los alcances y las áreas de conjuros son **2B**, con el catálogo de
conjuros. Ninguna de las dos necesita mapa.

> Todo lo que sigue es el estudio del SRD 5.1 que sostiene esas decisiones: cifras exactas,
> condiciones, saltos, alcances y áreas, y cómo lo resuelven las herramientas del mercado con
> mapa y sin él. Contenido **SRD 5.1 / OGL**: mecánica, nunca texto propietario.

---

> Investigación para modelar en la plataforma de gestión de campañas. **Toda la mecánica y
> las cifras citadas provienen del SRD 5.1 (licencia OGL)**, no de manuales propietarios.

## Premisa que condiciona todo el documento

**La plataforma hoy no tiene mapa, tablero, rejilla ni posiciones.** Los mapas son fase 3.
Esto separa el contenido de este informe en dos categorías con implicaciones de producto
muy distintas:

- **Datos que se guardan y se muestran** — la velocidad de una criatura, el alcance de un
  arma o conjuro, el tamaño de un área de efecto. Son números fijos que existen en la ficha
  o en la descripción de la regla, independientes de dónde esté nadie. **Se pueden modelar
  y mostrar ya, sin mapa.**
- **Cálculos que exigen saber dónde está cada uno** — ¿el pícaro llega hasta el orco?, ¿la
  bola de fuego alcanza a los tres enemigos?, ¿el arquero tiene desventaja por distancia?
  Todos requieren una posición de origen y una de destino y, casi siempre, una rejilla o
  coordenadas. **No se pueden calcular sin mapa**, y no se debe fingir que sí.

Cada sección de reglas más abajo indica, al final, en cuál de las dos categorías cae.

---

## 1. Velocidad

La velocidad base de una criatura depende de su **raza** (jugadores) o de su tipo (bestiario)
y se mide en pies por asalto. En el SRD 5.1, ejemplos de velocidad base humanoide: humano,
elfo, semielfo, tiefling 30 pies; enano, gnomo, mediano 25 pies; ninguna raza del SRD baja de
25 ni sube de 30 salvo capacidades especiales (algunos monstruos llegan a 40+).

**Qué la modifica:**
- **Armadura pesada sin la Fuerza requerida**: si la Fuerza del personaje es inferior a la
  puntuación mínima que exige la armadura pesada, su velocidad se reduce en 10 pies.
- **Carga (regla de variante, no siempre en juego)**: la regla opcional de carga excesiva
  (variante *encumbrance*) reduce la velocidad en 10 o 20 pies según cuánto peso se exceda
  del umbral (Fuerza × 5 y Fuerza × 10 respectivamente); no es una regla base del SRD, es
  variante.
- **Tamaño**: el SRD no liga tamaño y velocidad de forma automática (un gigante no es rápido
  por ser Grande); la velocidad la fija la entrada de la criatura, no una fórmula de tamaño.
- Efectos de conjuros/condiciones (ver sección 5).

**Qué significa el "movimiento" de un turno:** cada criatura dispone, en su turno, de una
cantidad de movimiento en pies igual a su velocidad. Puede fraccionarlo (moverse, actuar,
moverse el resto), y puede mezclarlo con su acción y su acción adicional según orden libre,
siempre que no exceda el total. Moverse a través del espacio de una criatura hostil no está
permitido (salvo excepciones); moverse a través del espacio de un aliado sí, tratándolo como
terreno difícil solo si termina ahí.

**Categoría:** dato guardado y mostrado (velocidad base + modificadores conocidos).

---

## 2. Formas de moverse

El SRD define velocidades de movimiento por tipo, cada una un valor separado que la criatura
tiene o no tiene:

- **Caminar** (velocidad base): la que casi todo el mundo tiene.
- **Trepar (climb)**: si la criatura no tiene velocidad de trepar propia, trepar cuesta
  **1 pie extra por cada pie trepado** (es decir, el doble de movimiento).
- **Nadar (swim)**: igual que trepar — sin velocidad de nadar propia, nadar cuesta el doble
  de movimiento por pie.
- **Excavar (burrow)**: solo algunas criaturas la tienen; les permite moverse a través de
  tierra, arena, etc. (no roca sólida salvo que se indique). No tiene coste doble porque es
  una velocidad dedicada.
- **Volar (fly)**: solo criaturas con esta velocidad; algunas exigen no quedarse "flotando"
  (hover) o caen si quedan incapacitadas en pleno vuelo.
- **Arrastrarse (crawl)**: moverse a cuatro patas o tumbado cuesta 1 pie extra por cada pie
  arrastrado (el mismo coste doble que trepar/nadar sin velocidad propia). Es el único
  movimiento disponible para una criatura postrada (ver sección 5).

**Categoría:** dato guardado y mostrado (qué velocidades tiene la criatura); el coste doble
es una regla de cálculo aplicable sin mapa a la velocidad *efectiva* (ver sección 12), pero
no dice si el trayecto real está cubierto de agua o no — eso sí exige mapa/narración.

---

## 3. Terreno difícil

Cada pie de terreno difícil cuesta **1 pie extra de movimiento** (o sea, moverse por terreno
difícil cuesta el doble). **Los costes múltiples no se acumulan entre sí para el mismo pie**:
el SRD indica explícitamente que, aunque una casilla sea difícil por varias razones a la vez,
sigue constando solo el doble, nunca el triple o más. Sí se acumula con el coste doble de
trepar/nadar sin velocidad propia si ambas condiciones aplican al mismo tramo (ambas reglas
son independientes, pero el terreno difícil en sí no se multiplica por sí mismo).

**Categoría:** cálculo que exige mapa para saber *dónde* hay terreno difícil, pero la regla
de coste (doble, sin acumulación) es un dato de mecánica que se puede documentar y aplicar a
un movimiento "declarado" narrativamente sin rejilla.

---

## 4. Acciones que cambian el movimiento

- **Correr (Dash)**: como acción, la criatura gana movimiento adicional igual a su velocidad
  para ese turno (efectivamente dobla el movimiento disponible en el turno).
- **Retirarse (Disengage)**: como acción, el movimiento de la criatura durante el resto del
  turno no provoca ataques de oportunidad.
- (Relacionadas pero no pedidas explícitamente: Esquivar, Ayudar, etc., no afectan movimiento).

**Categoría:** dato de regla fijo (cuánto añade Dash, qué evita Disengage) — se puede mostrar
como texto de referencia sin mapa; su efecto real en una persecución sí exige posiciones.

---

## 5. Movimiento limitado por estado (condiciones del SRD)

Tabla con la cifra exacta de cada condición del SRD 5.1 que afecta al movimiento:

| Condición | Efecto exacto sobre el movimiento |
|---|---|
| **Derribado (Prone)** | Solo puede arrastrarse (crawl), a menos que se levante. **Levantarse cuesta la mitad de la velocidad de la criatura** (gastada como movimiento, no como acción). Moverse a rastras cuesta el doble por pie, como cualquier arrastre. |
| **Agarrado (Grappled)** | Velocidad reducida a **0** y no puede beneficiarse de ningún bonificador a la velocidad. Termina si quien agarra queda incapacitado o si algo separa a las criaturas. |
| **Apresado (Restrained)** | Velocidad reducida a **0** y no puede beneficiarse de ningún bonificador a la velocidad (además, desventaja en ataques, ventaja para que le golpeen, desventaja en salvaciones de Destreza — esto último fuera del alcance de movimiento). |
| **Paralizado (Paralyzed)** | **No puede moverse ni hablar.** Movimiento efectivo: 0. |
| **Inconsciente (Unconscious)** | **No puede moverse ni hablar**, cae postrado si estaba de pie. Movimiento efectivo: 0. |
| **Aturdido (Stunned)** | **No puede moverse.** Movimiento efectivo: 0 (sí puede ser movida por otros). |
| **Incapacitado (Incapacitated)** | No puede realizar acciones ni reacciones; el SRD no fija explícitamente el movimiento en 0 (la incapacidad en sí no impide moverse salvo que otra regla lo diga), pero en la práctica casi siempre coincide con condiciones que sí lo hacen (paralizado, inconsciente, aturdido, petrificado la incluyen). |
| **Petrificado (Petrified)** | **No puede moverse ni hablar** (transformada en sustancia inanimada). Movimiento efectivo: 0. |
| **Ralentizado (Slow)** | No existe como condición nombrada en el SRD 5.1 (sí como efecto de ciertos conjuros/monstruos, cada uno con su propia cifra concreta — no hay una entrada genérica de "ralentizado" en la lista de condiciones estándar). |
| **Agotamiento (Exhaustion) — 6 niveles acumulativos** | Ver tabla siguiente. |

### Agotamiento y velocidad (los 6 niveles del SRD)

El agotamiento se mide en niveles acumulativos (1 a 6); cada nivel añade el efecto de los
anteriores. Efecto sobre velocidad específicamente:

| Nivel | Efecto (resumen SRD) | ¿Afecta velocidad? |
|---|---|---|
| 1 | Desventaja en pruebas de característica | No |
| 2 | **Velocidad reducida a la mitad** | Sí — mitad |
| 3 | Desventaja en tiradas de ataque y salvaciones | No |
| 4 | Los puntos de golpe máximos se reducen a la mitad | No |
| 5 | **Velocidad reducida a 0** | Sí — cero |
| 6 | Muerte | — |

**Categoría:** dato de regla fijo, 100% documentable y calculable sin mapa — es exactamente
el tipo de cálculo que la plataforma puede ofrecer ya (ver sección 12: "velocidad efectiva").

---

## 6. Saltos

- **Salto de longitud (long jump)**: con carrera de al menos 10 pies inmediatamente antes,
  se cubre una distancia en pies **hasta el valor de la puntuación de Fuerza**. Sin carrera
  (salto desde parado), la distancia se reduce a la mitad. Cada pie saltado consume un pie
  de movimiento.
- **Salto de altura (high jump)**: con carrera de al menos 10 pies, se alcanza una altura de
  **3 + modificador de Fuerza** pies. Sin carrera, la mitad de esa cifra, redondeando hacia
  abajo.

**Categoría:** dato de regla fijo, calculable con solo la Fuerza del personaje — no necesita
mapa (aunque saber si "hay sitio para 10 pies de carrera" sí lo necesitaría en una mesa real
con tablero; sin mapa se puede mostrar la cifra teórica).

---

## 7. Alcance de un ataque

- **Cuerpo a cuerpo**: la mayoría de criaturas tiene **5 pies de alcance**. Las armas de
  alcance (p. ej. lanza, alabarda con la propiedad *reach*) lo amplían, típicamente a 10 pies.
- **A distancia (ranged)**: las armas a distancia declaran dos números — **alcance normal /
  alcance largo**. Dentro del alcance normal, tirada normal. Entre el alcance normal y el
  largo, **desventaja**. Más allá del alcance largo, el ataque falla automáticamente.
- **Atacar a distancia con un enemigo adyacente**: si el atacante hace un ataque a distancia
  (arma, conjuro u otro medio) estando a 5 pies o menos de una criatura hostil que puede
  verlo y no está incapacitada, tiene **desventaja** en la tirada de ataque.

**Categoría:** el *dato* (5 pies de alcance, los dos números de un arma a distancia) se
guarda y muestra sin mapa. El *cálculo* de si un enemigo concreto está o no dentro de ese
alcance, o si hay alguien adyacente, exige posiciones.

---

## 8. Alcance de un conjuro

El SRD 5.1 usa estas categorías de alcance en la ficha de cada conjuro:

- **Personal (Self)**: solo afecta al lanzador.
- **Toque (Touch)**: debe tocar al objetivo (o a sí mismo).
- **N pies** (p. ej. 30, 60, 90, 120, 150 pies...): distancia máxima en línea recta desde el
  lanzador hasta el objetivo/punto de origen del efecto.
- **Vista (Sight)**: cualquier objetivo que el lanzador pueda ver, sin límite de distancia
  numérico salvo la propia visión.
- **Ilimitado (Unlimited)**: sin restricción de distancia en absoluto.

**Categoría:** dato guardado y mostrado directamente desde la ficha del conjuro; decidir si
un objetivo concreto está dentro de esos pies exige mapa (salvo Personal/Toque, que no
dependen de distancia numérica sino de adyacencia/identidad).

---

## 9. Áreas de efecto (definición geométrica exacta, SRD 5.1)

Todo área de efecto tiene un **punto de origen**: el lugar del que "brota" el efecto. Cada
forma define cómo se posiciona ese punto y si el propio punto de origen cuenta como parte
del área:

- **Cono (Cone)**: se extiende en línea recta desde el punto de origen en la dirección que
  elija su creador. La anchura del cono en cualquier punto de su longitud es igual a la
  distancia de ese punto al origen. El punto de origen **no** se incluye en el área, salvo
  que su creador decida lo contrario. *Ejemplo SRD*: **Aliento de dragón** simulado por
  *cono de frío/fuego* — el conjuro **Rayo de escarcha (Cono de frío)** usa un cono de 60
  pies.
- **Cubo (Cube)**: se extiende en línea recta desde un punto de origen situado en cualquier
  punto de una de las caras del cubo. El punto de origen no se incluye en el área salvo
  decisión contraria. *Ejemplo SRD*: **Muro de fuego** en su variante de anillo, o conjuros
  como **Onda atronadora** (que en realidad es cubo de 15 pies de lado centrado en el
  lanzador).
- **Cilindro (Cylinder)**: se extiende en línea recta desde un punto de origen situado en el
  centro del círculo superior o inferior del cilindro. El punto de origen **sí** se incluye
  en el área. *Ejemplo SRD*: **Colina de hielo** o efectos como el de **Muro de hielo**
  con radio y altura definidos.
- **Línea (Line)**: se extiende desde su punto de origen en un trayecto recto hasta su
  longitud, cubriendo el área definida por su anchura. El punto de origen **no** se incluye
  salvo decisión contraria. *Ejemplo SRD*: **Rayo relampagueante (Lightning Bolt)**, línea
  de 100 pies de largo por 5 de ancho.
- **Esfera (Sphere)**: se elige un punto de origen y la esfera se extiende hacia fuera desde
  ese punto; su tamaño se expresa como un radio en pies. El punto de origen **sí** se
  incluye en el área. *Ejemplo SRD*: **Bola de fuego (Fireball)**, esfera de 20 pies de
  radio.

**Regla de línea de efecto**: si todas las líneas rectas desde el punto de origen hasta un
punto del área están bloqueadas por cobertura total, ese punto queda excluido del efecto.

**Categoría:** la *definición* de cada forma y su tamaño es un dato fijo de cada conjuro —
se guarda y muestra sin mapa. Saber a **quién** golpea una esfera de 20 pies concreta exige
posiciones reales y, en la práctica, una rejilla o coordenadas.

---

## 10. Unidades: pies, metros, casillas

- El **SRD 5.1 usa pies (feet)** en todas sus cifras; no hay una versión oficial en metros
  en el propio SRD.
- La convención de mesa más extendida en inglés es **1 casilla de rejilla = 5 pies**, así
  que la mayoría de valores del juego son múltiplos de 5 (5, 10, 15, 30, 60, 120...),
  pensados para encajar en una rejilla cuadrada.
- **Mesas hispanohablantes**: las traducciones oficiales al español de D&D 5ª edición
  (Manual del Jugador, Guía del Dungeon Master, etc., publicadas por Devir en España) usan
  **metros**, no pies, con la conversión habitual de **1 casilla = 1,5 metros** (redondeo de
  1 casilla de 5 pies). Es la convención dominante en mesas y comunidades en español,
  aunque muchos jugadores que usan hojas de personaje digitales en inglés (D&D Beyond,
  Roll20) siguen viendo pies sin traducir.
- **Herramientas digitales**: D&D Beyond, Roll20 y Foundry VTT trabajan internamente en
  **pies** (o en "unidades de rejilla" configurables, con 5 pies como valor por defecto de
  cada casilla); permiten cambiar la unidad mostrada pero el dato interno casi siempre es
  pies o un múltiplo de la casilla de 5 pies.

**Recomendación para esta plataforma:**
- **Guardar en base de datos siempre en pies (o en una unidad base entera, p. ej. "unidad =
  5 pies")**, como hace el propio SRD y las herramientas de referencia. Esto evita arrastrar
  redondeos de conversión y mantiene coherencia con cualquier contenido SRD importado
  literalmente (conjuros, monstruos).
- **Convertir solo en la capa de presentación** al español: mostrar metros (con la
  conversión 1 pie ≈ 0,3 m, o la convención de mesa 1 casilla de 5 pies = 1,5 m) como opción
  de visualización, dejando el dato crudo en pies para no perder precisión ni compatibilidad
  con contenido SRD.

**Categoría:** decisión de modelo de datos, no depende de mapa.

---

## 11. Qué guardar en el modelo de datos (sin mapa)

Propuesta concreta de campos, coherente con `packages/shared/src` como fuente única de la
forma de los datos (ver `CLAUDE.md` del proyecto):

### Personaje / criatura

```ts
speeds: {
  walk: number;        // pies, velocidad base a pie (obligatorio, ej. 30)
  climb?: number;       // pies, si tiene velocidad de trepar propia
  swim?: number;        // pies, si tiene velocidad de nadar propia
  fly?: number;          // pies, si tiene velocidad de volar propia
  burrow?: number;      // pies, si tiene velocidad de excavar propia
  hover?: boolean;       // si la velocidad de vuelo permite quedarse suspendido
}
```

Más un conjunto de **estados activos** (derribado, agarrado, apresado, agotamiento nivel
0-6, etc.) que ya debería vivir donde el proyecto modele condiciones/efectos de personaje,
para poder derivar la velocidad efectiva (sección 12) sin duplicar la lógica de reglas.

### Arma / objeto

```ts
range?: {
  normal: number;  // pies, alcance normal a distancia
  long?: number;    // pies, alcance largo (si aplica; ausente = sin tirada con desventaja)
}
reach?: number;     // pies, alcance cuerpo a cuerpo si es distinto de 5 (armas reach)
```

### Conjuro

```ts
range:
  | { kind: 'self' }
  | { kind: 'touch' }
  | { kind: 'sight' }
  | { kind: 'unlimited' }
  | { kind: 'distance'; feet: number };

area?: {
  shape: 'cone' | 'cube' | 'cylinder' | 'line' | 'sphere';
  size: {
    // según forma: radius (esfera/cilindro), length + width (línea/cono con SRD),
    // side (cubo), length + radius/height (cilindro)
    [key: string]: number;
  };
}
```

Con esta forma, un conjuro de bola de fuego se guarda como `range: {kind:'distance',
feet:150}` y `area: {shape:'sphere', size:{radius:20}}` — datos exactos del SRD, sin
inventar una unidad distinta.

---

## 12. Qué se puede enseñar y calcular sin posiciones

Ejemplos concretos de frases/valores que la plataforma **sí** puede mostrar hoy, combinando
la ficha del personaje con sus estados activos, sin ningún mapa:

- «Tu velocidad efectiva ahora mismo es **15 pies**, porque estás derribado y en terreno
  difícil (30 pies base ÷ 2 por agotamiento nivel 2, pero como estás agarrado en realidad es
  **0 pies**)» — ejemplo de cálculo compuesto de velocidad efectiva a partir de datos del
  personaje + estados, sin saber dónde está nadie.
- «Este conjuro alcanza **120 pies** y afecta una **esfera de 20 pies de radio**» — lectura
  directa de la ficha del conjuro.
- «Tu arma tiene alcance normal de **80 pies** y alcance largo de **320 pies**; más allá de
  80 tiras con desventaja» — lectura directa del arma.
- «Con tu Fuerza de 16, tu salto de longitud con carrera es de hasta **16 pies**; sin
  carrera, **8 pies**» — cálculo directo desde la característica.
- «Estás en el nivel 2 de agotamiento: tu velocidad está reducida a la mitad» — derivado de
  un estado guardado, sin mapa.
- «Levantarte tras estar derribado te costará **15 pies** de tus 30 de movimiento» — cálculo
  de regla pura.
- «Tu Dash de este turno te da 30 pies adicionales de movimiento» — dato de acción.

## 13. Qué NO se puede hacer sin mapa

Para no prometer de más:

- **No** se puede decir si un personaje concreto llega hasta un objetivo concreto (¿me pongo
  adyacente al orco con mi movimiento?).
- **No** se puede calcular a quién afecta un área de efecto (¿la bola de fuego coge a los
  tres enemigos y también a mi aliado?).
- **No** se puede determinar si un ataque a distancia sufre desventaja por tener un enemigo
  adyacente al atacante, salvo que se declare manualmente.
- **No** se puede saber si un tramo de terreno es difícil, si hay que trepar o nadar, ni
  cuánto mide realmente un desplazamiento — solo se puede calcular el *coste por pie* si se
  declara la distancia.
- **No** hay cobertura, línea de visión ni oclusión — esenciales para "Vista" como alcance de
  conjuro y para la regla de línea de efecto en áreas.
- **No** hay distancia entre dos criaturas, así que ninguna regla que dependa de "está a
  menos de X pies de otra criatura" (agarrar, alcance, atacar adyacente) se puede resolver
  automáticamente; solo se puede mostrar el umbral en pies para que el DM lo aplique de
  palabra.

## 14. Cómo lo resuelven las herramientas de referencia

- **D&D Beyond** (sin mapa: solo ficha de personaje y compendio): muestra velocidad,
  alcance de armas y conjuros, área de efecto y todos los valores de forma estática en la
  ficha/hoja de conjuro, exactamente como datos de referencia — no calcula distancias ni
  quién está en el área, porque no tiene tablero (su integración de mapa es un producto
  aparte, Maps, separado de la hoja de personaje).
- **Roll20** (con mapa/rejilla): posiciona tokens sobre una rejilla y mide distancias en
  vivo; las plantillas de área (cono, cubo, cilindro, línea, esfera) se dibujan sobre el
  mapa y el sistema resalta automáticamente qué tokens quedan dentro; el alcance de
  armas/conjuros se compara contra la distancia real medida en la rejilla.
- **Foundry VTT** (con mapa/rejilla, el más automatizado de los tres): con el sistema dnd5e
  y módulos como Midi-QOL, calcula automáticamente distancia entre tokens, aplica
  desventaja por alcance largo, resalta objetivos dentro de una plantilla de área
  arrastrada sobre el mapa, y puede aplicar snapping de plantillas a la rejilla; sin mapa
  cargado, sigue mostrando los mismos datos estáticos que D&D Beyond (velocidad, alcance,
  área) en la ficha de personaje/objeto/conjuro, pero no calcula nada espacial.

**Conclusión práctica**: las tres herramientas coinciden en que **los datos estáticos
(velocidad, alcance, forma y tamaño de área) viven en la ficha, independientes del mapa**, y
son exactamente lo que esta plataforma puede modelar y mostrar ya. **El cálculo espacial
(alcanza/no alcanza, quién cae en el área, distancia entre dos puntos) depende siempre de
tener un mapa/rejilla**, y ninguna de las tres lo simula sin él.

---

### Fuentes consultadas (SRD 5.1 / OGL)

- SRD 5.1 vía [5esrd.com — Conditions](https://www.5esrd.com/gamemastering/conditions/)
- SRD 5.1 vía [5esrd.com — Combat / ranged attacks, melee reach](https://www.5esrd.com/gamemastering/combat/)
- Reglas de áreas de efecto (punto de origen por forma) — SRD 5.1, sección Casting a Spell /
  Areas of Effect.
- Reglas de salto (long jump / high jump, Fuerza y carrera de 10 pies) — SRD 5.1, sección
  Adventuring / Movement.
- Conocimiento verificado de la mecánica base SRD 5.1 (velocidad, terreno difícil, Dash,
  Disengage, agotamiento) contrastado contra las fuentes anteriores.
