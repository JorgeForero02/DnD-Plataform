# Hoja de personaje de 5.ª edición — especificación · 2026-09-02

> **Qué es esto.** El estudio que sostiene la forma de la hoja implementada en
> `apps/web/src/features/characters/HojaCincoE.tsx` y el motor que la rellenará en la
> **fase 2A**. Se escribió investigando la hoja oficial, el SRD 5.1 y cómo lo resuelven en
> digital D&D Beyond, Roll20 y Foundry/Tidy5e.
>
> **Lo que hay hoy en la aplicación es solo la disposición**, con todas las casillas a su
> tamaño real y vacías, y diciéndolo. Decisión del autor el 2026-09-02: *"entra pero no su
> funcionalidad completa, no quiero dejar tareas de la fase 2 aca"*. Las fórmulas de aquí
> **no están implementadas**; están escritas para que la fase 2A no tenga que investigarlas
> otra vez.
>
> Todo el contenido de reglas es **SRD 5.1 / OGL**: mecánica, nunca texto propietario.

---

> Fuentes: hoja oficial de Wizards of the Coast (estructura de 2-3 páginas), SRD 5.1 / d20srd.org / 5thsrd.org
> para las fórmulas, y observación de cómo lo resuelven D&D Beyond, Roll20 y Foundry VTT (dnd5e core + Tidy5e).
> Todo el contenido de reglas aquí es mecánica de juego (SRD 5.1, licencia OGL) — no se copia texto propietario
> de manuales.

---

## 0. Resumen ejecutivo

La hoja actual del proyecto (`packages/shared/src/character.schema.ts`) tiene: `name`, `race`, `class`, `level`,
`bio`, `visibility`. Es un formulario de ficha narrativa, no una hoja de personaje jugable: no hay
características, no hay CA, no hay puntos de golpe, no hay competencias, no hay inventario con casillas de
equipo, no hay conjuros. El autor tiene razón: esto no es "el formato de la 5ª edición", es un campo de texto
libre con metadatos.

La hoja real de 5e tiene tres bloques que **siempre** están visibles durante una partida (identidad + combate +
características/habilidades) y dos que se consultan con menos frecuencia (equipo detallado, conjuros). Esa
distinción — qué se mira en cada turno de combate frente a qué se mira al preparar una sesión — es la que debe
gobernar el diseño de pantalla, no la lista de secciones del PDF.

---

## 1. Anatomía de la hoja

### 1.1 Identidad
Página 1, cabecera. Puramente descriptivo, nada se calcula.

| Campo | Tipo | Notas |
|---|---|---|
| Nombre del personaje | texto | ya existe |
| Clase y nivel | texto + número | ya existe pero como campos sueltos; en 5e multiclase es una lista (`Clase Nivel`, `Clase Nivel`) |
| Trasfondo (*background*) | texto | no existe hoy — determina 2 competencias en habilidades y a veces herramientas/idiomas |
| Raza | texto | ya existe |
| Alineamiento | texto/enum | no existe hoy — puramente narrativo, sin efecto mecánico en SRD 5.1 |
| Puntos de experiencia | número | opcional; muchas mesas (y la hoja de Beyond) usan solo nivel manual |

### 1.2 Las seis características y sus modificadores
Bloque más reconocible de la hoja: seis casillas grandes (Fuerza, Destreza, Constitución, Inteligencia,
Sabiduría, Carisma), cada una con la **puntuación** (campo editable, 1–30 normalmente 3–20) y debajo el
**modificador** en un círculo.

- Se **escribe**: la puntuación de característica (`score`).
- Se **calcula**: el modificador, con la fórmula de §2.1. Nunca se escribe a mano el modificador.

### 1.3 Competencia y bonificador de competencia
No es un bloque propio en el papel — es un número (`+2` a `+6`) que aparece impreso en una sola casilla y que
alimenta salvaciones, habilidades, ataques y CD de conjuro.

- Se **calcula** siempre a partir del nivel de personaje total (§2.2). En multiclase se usa el nivel de
  personaje sumado, no el de cada clase.
- Nunca se sobrescribe salvo por un rasgo específico que lo cambie (raro en SRD 5.1 base).

### 1.4 Salvaciones (*saving throws*)
Seis filas, una por característica: casilla de competencia (checkbox) + modificador total.

- Se **marca**: si hay competencia (la determina la clase, no es libre).
- Se **calcula**: el modificador total (§2.4).
- Hueco de anulación: rasgos como *Jack of All Trades* o efectos temporales de un conjuro/objeto que dan
  bonificador a salvaciones concretas — necesitan un ajuste manual aparte del cálculo base.

### 1.5 Habilidades (18 habilidades)
Lista fija — no configurable por el usuario — de las 18 habilidades del SRD, cada una ligada a una
característica:

| Característica | Habilidades |
|---|---|
| Fuerza | Atletismo |
| Destreza | Acrobacias, Juego de Manos, Sigilo |
| Inteligencia | Arcanos, Historia, Investigación, Naturaleza, Religión |
| Sabiduría | Trato con Animales, Perspicacia, Medicina, Percepción, Supervivencia |
| Carisma | Engaño, Intimidación, Interpretación, Persuasión |

Cada fila: checkbox de competencia (y, en algunas clases, un segundo estado de **pericia**), nombre, y
modificador total calculado. La hoja oficial deja hueco para anotar la característica junto al nombre porque
algunos rasgos permiten calcular una habilidad con otra característica (p.ej. *Perspicacia* con Sabiduría por
defecto, pero un rasgo puede permitir usarla con Carisma).

- Se **marca**: competencia (0/1) y pericia (0/1, solo válida si ya hay competencia).
- Se **calcula**: el modificador total (§2.5).
- **Percepción pasiva** se calcula aparte y vive en el bloque de combate/exploración, no en la lista de
  habilidades (§2.6), porque se consulta constantemente sin tirar dados.

### 1.6 CA, iniciativa y velocidad
Tres casillas pequeñas, muy visibles, arriba del bloque de combate.

- **CA**: normalmente se **calcula** desde armadura + escudo + Destreza (§2.3), pero la hoja real incluye una
  casilla de anulación porque hay demasiadas excepciones (armadura natural, *Mage Armor*, *Unarmored Defense*
  del bárbaro/monje, etc.).
- **Iniciativa**: se **calcula** (§2.7); rara vez se anula (algún rasgo da bonificador fijo).
- **Velocidad**: dato de la raza, se **escribe** una vez (no hay fórmula), pero se necesita casilla de
  modificador situacional (armadura pesada sin fuerza suficiente, hechizos, agarrado).

### 1.7 Puntos de golpe, temporales y dados de golpe
Bloque crítico que la hoja actual del proyecto no tiene en absoluto.

| Campo | Tipo | Cálculo/uso |
|---|---|---|
| PG máximos | número | se calcula al subir de nivel (dado de golpe + mod. Constitución), pero se **guarda como valor**, no se recalcula en cada carga — ver §3 |
| PG actuales | número | se escribe/decrementa en juego; nunca supera el máximo salvo por efectos especiales |
| PG temporales | número | **no se suman** a los actuales; se llevan en un campo aparte, no se acumulan (dos fuentes de PG temporales no se suman, se queda el mayor) y se gastan/desaparecen antes que los PG reales |
| Dado de golpe (tipo) | texto/enum | d6/d8/d10/d12 según clase; en multiclase hay uno por clase |
| Dados de golpe (total / gastados) | número/número | total = nivel de esa clase; se gastan en descanso corto, se recuperan (mitad del máximo, redondeando arriba, mínimo 1) en descanso largo |
| Tiradas de muerte (*death saves*) | 3 éxitos / 3 fracasos | checkboxes, no numérico |

### 1.8 Ataques y conjuros de combate (bloque de acción)
Tabla en la hoja oficial: Nombre, bonificador de ataque (o CD), Daño/Tipo. Alimentada por armas equipadas y
conjuros de combate.

- Se **calcula**: bonificador de ataque con arma (característica + competencia si procede, §2.8) y con conjuro
  (§2.9-2.10).
- Se **escribe**: el daño base del arma/conjuro (dado + tipo), porque depende del objeto exacto, no hay tabla
  cerrada en el modelo de datos salvo que se modele el equipo con su propio dado de daño.

### 1.9 Equipo
Dos capas en la hoja real, que en digital suelen separarse en pestañas:
1. **Equipo llevado (inventario)**: lista con cantidad, peso, si está equipado.
2. **Casillas de mano/equipado**: qué ocupa cada mano (arma principal, arma secundaria, escudo, arma a dos
   manos) y qué armadura se lleva puesta — esto es lo que alimenta el cálculo de CA y de ataques, y es exactamente
   el hueco que el proyecto tiene detectado (ver §5).

También: moneda (po/pp/pe/pc/pb), carga total y capacidad de carga (§2.11).

### 1.10 Rasgos y dotes
Lista de texto: rasgos de raza, de clase, dotes (*feats*), rasgos de trasfondo. En la hoja oficial es texto
libre con un cuadro por página adicional para el detalle; en digital (Beyond/Foundry) cada rasgo es una
entidad con su propia descripción larga colapsable.

### 1.11 Trasfondo / personalidad
Bloque narrativo puro, sin cálculo: rasgos de personalidad, ideales, vínculos, defectos, alianzas y organizaciones,
tesoros, apariencia física, historia. Este es el único bloque que la hoja actual del proyecto ya cubre bien
(`bio`), aunque de forma no estructurada — la hoja real lo divide en 4-6 campos cortos en vez de un solo
párrafo libre.

### 1.12 Conjuros
Bloque aparte (página 3 en el PDF oficial, pestaña separada en todo el software digital), solo para clases
lanzadoras. Estructura:

- Característica de lanzamiento (Inteligencia/Sabiduría/Carisma según clase) — se **escribe** una vez por clase.
- CD de salvación de conjuro y bonificador de ataque de conjuro — se **calculan** (§2.9, §2.10).
- Espacios de conjuro por nivel (1º a 9º): total y gastados — el total lo determina la tabla de la clase por
  nivel (dato de reglas, no libre), los gastados se marcan en juego.
- Lista de conjuros conocidos/preparados, agrupados por nivel, con: nombre, ¿preparado?, componentes
  (V/S/M), si concentran, si son rituales.

---

## 2. Fórmulas (SRD 5.1)

```
// 2.1 Modificador de característica
modifier(score) = floor((score - 10) / 2)

// 2.2 Bonificador de competencia por nivel de personaje (suma de niveles de todas las clases)
proficiencyBonus(characterLevel) = 2 + floor((characterLevel - 1) / 4)
// 1-4 -> +2 · 5-8 -> +3 · 9-12 -> +4 · 13-16 -> +5 · 17-20 -> +6

// 2.3 Clase de Armadura (CA)
baseAC =
  if wearingArmor:
    armor.baseAC + min(modifier(DEX), armor.maxDexBonus)   // maxDexBonus: liviana=∞, media=2, pesada=0
  else:
    10 + modifier(DEX)   // "Sin Armadura" — puede ser sustituido por un rasgo (ver §3)
finalAC = baseAC + (hasShield ? 2 : 0) + otherBonuses (objetos mágicos, conjuros como Shield, anulación manual)

// 2.4 Salvación de característica
savingThrow(ability) = modifier(ability) + (proficientInSave(ability) ? proficiencyBonus : 0)

// 2.5 Habilidad
skillCheck(skill) =
  modifier(skill.ability) +
  (expertise(skill) ? 2 * proficiencyBonus :
   proficient(skill)  ? proficiencyBonus : 0)

// 2.6 Percepción pasiva (y cualquier "pasivo": Investigación pasiva, Perspicacia pasiva…)
passiveScore(skill) = 10 + skillCheck(skill)   // + ventaja(+5)/desventaja(-5) si aplica de forma permanente

// 2.7 Iniciativa
initiative = modifier(DEX) + otherBonuses   // p.ej. Alerta (+5), Jack of All Trades (mitad comp., redondeo abajo)

// 2.8 Bonificador de ataque con arma
attackBonus(weapon) =
  modifier(weapon.finesse ? max(STR, DEX) : (weapon.ranged ? DEX : STR)) +
  (proficientWithWeapon ? proficiencyBonus : 0) +
  magicBonus

// 2.9 CD de salvación de conjuro
spellSaveDC = 8 + proficiencyBonus + modifier(spellcastingAbility)

// 2.10 Bonificador de ataque de conjuro
spellAttackBonus = proficiencyBonus + modifier(spellcastingAbility)

// 2.11 Capacidad de carga (regla básica)
carryingCapacity = STR_score * 15   // libras
// Variante opcional de carga (no siempre implementada, ver §3):
encumbered        if totalWeight > STR_score * 5   -> velocidad -10 ft
heavilyEncumbered if totalWeight > STR_score * 10  -> velocidad -20 ft, desventaja en pruebas/ataques/salv. de FUE/DES/CON

// 2.12 Dados de golpe
hitDiceMax(class, classLevel) = classLevel   // uno por nivel en esa clase
onLevelUp: maxHP += rollHitDie(class) + modifier(CON)   // (o el valor fijo medio, si la mesa usa esa variante)
onShortRest: for each hitDie spent -> currentHP += roll(hitDie) + modifier(CON); hitDiceRemaining -= 1
onLongRest: hitDiceRemaining = min(hitDiceMax, hitDiceRemaining + max(1, floor(hitDiceMax / 2)))
onLongRest: currentHP = maxHP; tempHP = 0
```

Nota sobre PG temporales: **no se suman** a `currentHP`; se restan primero cuando el personaje recibe daño, y
si dos efectos dan PG temporales no se acumulan — se queda el valor más alto de los dos.

---

## 3. Qué se calcula y qué se anula a mano

La hoja de papel resuelve esto con casillas superpuestas (un número impreso pequeño de "referencia" y una
casilla más grande para escribir el valor real). En digital eso se traduce en: **todo campo derivado se
muestra ya calculado, pero con un botón/casilla de "anular" que lo convierte en editable y memoriza el valor
manual hasta que el usuario lo quite.** Ejemplos concretos donde 5e rompe su propia fórmula:

| Campo | Por qué no basta la fórmula | Ejemplo real |
|---|---|---|
| CA | El bárbaro y el monje reemplazan `10 + DEX` por su propia fórmula de "Defensa sin Armadura" (`10 + DEX + CON` o `10 + DEX + SAB`); objetos mágicos fijan una CA absoluta (una armadura *+1* no es "base + 1" sino que primero suma su bono base) | Anillo de protección (+1 a CA general, se suma al final), Defensa sin Armadura del bárbaro |
| PG máximos | Al subir de nivel se tira el dado (o se usa la media fija); algunas mesas homebrew o el don Duro cambian el total; hay que **guardar** el máximo como dato, no recalcularlo cada vez desde "nivel × dado promedio" porque la tirada real varía por personaje | Un dado de golpe puede subir varias veces por encima o debajo de la media |
| Velocidad | Base racial, pero armadura pesada sin fuerza mínima la reduce, y hay conjuros/rasgos que la cambian temporalmente | *Longstrider*, armadura pesada con FUE insuficiente |
| Modificador de habilidad | Un rasgo puntual puede permitir sustituir la característica de una habilidad | *Observador* cambia Perspicacia a otra característica en un caso concreto; magos con *Perspicacia* usando Inteligencia por rasgo de subclase |
| Iniciativa | *Alerta* da +5 fijo; *Jack of All Trades* del bardo añade medio bonificador de competencia (redondeado hacia abajo) a cualquier prueba sin competencia, incluida iniciativa en algunas lecturas | — |
| Bonificador de ataque | Objetos mágicos (arma *+1*), *Bendición*, ventajas de maniobra | — |
| Capacidad de carga | Dotes (*Powerful Build*, tamaño grande) la duplican | — |

**Regla de diseño recomendada**: cada campo calculado es `{ base: number (derivado), override: number | null }`;
la UI muestra `override ?? base` y deja un icono de lápiz para fijar `override`. Volver a poner `override: null`
restaura el cálculo. Esto cubre los seis casos de la tabla sin necesitar un campo especial por excepción.

---

## 4. Disposición en pantalla

### 4.1 Lo que hacen D&D Beyond, Roll20 y Foundry

- **D&D Beyond**: originalmente diseñó "para móvil primero" y apilaba bloques verticalmente incluso en
  escritorio; lo abandonaron porque desperdiciaba espacio en pantallas grandes. Hoy ofrece tres layouts
  (Mobile, Tablet, Narrow Monitor/Desktop) y en escritorio usa una rejilla de columnas con el bloque de combate
  (CA/iniciativa/velocidad/PG) siempre fijo arriba a la izquierda, características a la izquierda en una
  columna vertical de seis círculos, y pestañas horizontales para Acciones / Rasgos y Rasgos / Inventario /
  Conjuros / Notas / Extras. En móvil eliminaron los colapsables adicionales (ya no esconden descripciones
  bajo un toque extra) porque los jugadores necesitan la info sin fricción en mitad de una partida.
- **Roll20**: sigue más de cerca el papel — layout de dos páginas con pestañas ("Character Sheet" con
  Atributos/Habilidades a la izquierda, Combate en el centro, Rasgos/Ataques a la derecha), y una pestaña
  aparte "Attributes & Abilities" para el usuario avanzado que quiere editar los atributos crudos que alimentan
  las fórmulas. Todo campo calculable es clicable para tirar el dado directamente.
- **Foundry VTT** (core `dnd5e` y el módulo *Tidy5e*): sheet en ventana flotante con pestañas (Features /
  Inventory / Spells / Effects / Biography), bloque de combate fijo en la cabecera de la ventana
  independientemente de la pestaña activa. Tidy5e añade "favoritos" — cualquier rasgo, arma o conjuro se puede
  fijar para que aparezca siempre en una pestaña resumen, sea cual sea su categoría real.

### 4.2 Qué conviene copiar

**Para esta plataforma, la referencia correcta es Foundry/Tidy5e, no D&D Beyond.** Motivo: D&D Beyond invierte
mucho en un sistema de personalización de layout (tres modos) que es coste de ingeniería alto y esta
plataforma no lo necesita en su primera versión; el patrón de "cabecera de combate fija + pestañas para el
resto" de Foundry da el 90% del valor con mucho menos trabajo, y coincide con el criterio de "qué se mira cada
turno" del §0. El sistema de favoritos de Tidy5e es una buena idea a considerar para fases posteriores, no
para la versión mínima.

### 4.3 Propuesta de rejilla

**Escritorio (≥1280px)** — todo visible sin pestañas donde el ancho lo permite, tres columnas:

```
┌─────────────────────────────────────────────────────────────────┐
│ Identidad (nombre · clase/nivel · raza · trasfondo · alineamiento)│  fila fija arriba, siempre visible
├───────────┬──────────────────────────────┬────────────────────────┤
│ Caract.   │  CA · Iniciativa · Velocidad │  PG máx/actual/temp    │
│ (6 casil.)│  (fila de 3 recuadros)       │  Dados de golpe        │
│           ├──────────────────────────────┤  Tiradas de muerte     │
│ Salvac.   │  Ataques y conjuros de combate│                        │
│ (6 filas) │  (tabla)                     │  Competencias e idiomas│
│           │                              │                        │
│ Habilid.  │                              │                        │
│ (18 filas)│                              │                        │
├───────────┴──────────────────────────────┴────────────────────────┤
│ Pestañas: Rasgos y dotes · Equipo/Inventario · Conjuros · Trasfondo│
└─────────────────────────────────────────────────────────────────┘
```
Columna izquierda (características + salvaciones + habilidades) es la más alta — replica el papel — y queda
fija/sticky al hacer scroll porque se consulta constantemente. Columna central es el bloque de combate. Columna
derecha, secundaria.

**Tableta (768–1279px)**: dos columnas. Identidad arriba; características+salvaciones a la izquierda;
combate+habilidades a la derecha, apiladas; pestañas a ancho completo debajo. Igual que hace D&D Beyond en su
modo "Tablet": ni tan comprimido como el móvil ni tan expandido como escritorio.

**Móvil (<768px)**: una columna, con el bloque de combate (CA/PG/iniciativa) **siempre fijo arriba** (sticky)
porque es lo único que hace falta ver a cada turno sin desplazarse; debajo, un acordeón por bloque
(Características, Salvaciones, Habilidades, Ataques, Equipo, Rasgos, Conjuros, Trasfondo) — colapsado por
defecto salvo Características y Ataques, que abren primero. **No** ocultar la descripción completa de un
rasgo/conjuro tras un segundo toque (el error que D&D Beyond corrigió) — el nombre colapsa/expande el bloque
entero, pero una vez abierto se ve todo.

**Orden de lectura recomendado (todos los tamaños)**: identidad → combate (CA/PG/iniciativa, lo que decide si
el personaje sigue vivo) → características/habilidades (lo que decide si una acción tiene éxito) → acción
(ataques/conjuros) → contexto (equipo, rasgos, trasfondo). Esto es el orden en que un jugador consulta la hoja
durante una partida real, de más a menos urgente.

---

## 5. Huecos ya detectados en el proyecto

### 5.1 Casillas de equipo (manos: arma/escudo/dos manos)
**Hoy**: no existe modelo de equipo en absoluto.
**Hoja real**: cada arma/escudo tiene una propiedad de "manos" (una mano, dos manos, ligera/versátil) y el
personaje tiene un número finito de manos (2, salvo excepciones). Llevar un arma a dos manos impide escudo;
llevar dos armas ligeras habilita ataque bonus (regla de *Two-Weapon Fighting*, aparte).
**Impacto en el modelo de datos**: el ítem de equipo necesita `handsRequired: 1 | 2`, `slot: "mainHand" |
"offHand" | "twoHanded" | "armor" | "worn" | "carried"` y una validación de que la suma de manos ocupadas por
los ítems equipados en `mainHand`/`offHand` no supere 2 (o el máximo del personaje). El campo `equipped:
boolean` no basta — hace falta saber **en qué mano/slot** para poder calcular CA (§2.3) y bonificador de ataque
(§2.8) automáticamente, y para poder listar "lo que llevas puesto" frente a "lo que llevas en la mochila".

### 5.2 Descansos y dados de golpe
**Hoy**: no existe el concepto de descanso ni de dado de golpe.
**Hoja real**: como se detalla en §1.7 y §2.12, el dado de golpe es un recurso independiente de los PG máximos,
con su propio contador de gastados/disponibles, que se recupera parcialmente en descanso largo y se gasta en
descanso corto para curar.
**Impacto en el modelo de datos**: el personaje necesita `hitDice: { die: "d6"|"d8"|"d10"|"d12", total: number,
spent: number }[]` (array porque en multiclase hay un tipo de dado por clase), y dos acciones de dominio
(`shortRest`, `longRest`) que muten `spent`, `currentHP`, `tempHP` y las tiradas de muerte de forma atómica —
no son campos que el jugador edite sueltos, son una transacción con reglas.

### 5.3 Puntos de golpe temporales
**Hoy**: no existe `tempHP` ni `currentHP`/`maxHP` — solo hay `level`, nada de combate.
**Hoja real**: como en §1.7/§2, los PG temporales son un campo aparte que **no se suma** a los actuales, se
gasta primero al recibir daño y no se acumula entre fuentes (se queda el mayor de los dos valores, no la suma).
**Impacto en el modelo de datos**: campo `tempHP: number` independiente de `currentHP`/`maxHP`, con la lógica
de resta-de-daño en el servidor (nunca en el cliente) siguiendo el orden: primero se descuenta de `tempHP`,
el remanente de `currentHP`. Fijar `tempHP` a un valor menor que el actual debe **reemplazar**, no sumar.

### 5.4 Pericia (*expertise*)
**Hoy**: no hay ni siquiera competencia en habilidades, así que pericia no puede modelarse todavía.
**Hoja real**: como en §1.5/§2.5, pericia es un tercer estado por habilidad (ninguna / competente / experto),
válido solo si ya hay competencia, y dobla el bonificador de competencia (no lo suma dos veces con otro
efecto que también doble — la regla de no-stacking de §2.5 hay que respetarla en el cálculo, tomando el máximo
multiplicador aplicable, nunca sumando dobles).
**Impacto en el modelo de datos**: cada fila de habilidad necesita un estado de tres valores (`"none" |
"proficient" | "expertise"`) en vez de un booleano; la validación de negocio debe impedir `expertise` sin
`proficient`, y el cálculo de §2.5 debe tratar cualquier otra fuente de "doble competencia" (dotes, rasgos)
como el mismo multiplicador tope ×2, no acumulable.

---

## 6. Campos mínimos vs. campos que pueden esperar

| Bloque | Campo | Versión mínima (v1 jugable) | Puede esperar |
|---|---|---|---|
| Identidad | nombre, raza, clase, nivel | ✅ ya existe | multiclase (lista de clase+nivel), experiencia, alineamiento |
| Identidad | trasfondo | ✅ (texto libre primero, lista SRD después) | trasfondo como entidad con sus rasgos/competencias automáticas |
| Características | 6 puntuaciones + modificador calculado | ✅ | ninguno — es el núcleo |
| Competencia | bonificador calculado por nivel | ✅ | anulación manual (rasgo raro) |
| Salvaciones | 6, con checkbox de competencia + total calculado | ✅ | bonificadores situacionales anotados |
| Habilidades | 18, con competencia + total calculado | ✅ | pericia (§5.4) — puede ser v1.1, no v1.0, si el time-box aprieta |
| CA/Iniciativa/Velocidad | calculados, con anulación manual | ✅ (anulación es v1, no opcional — sin ella el bárbaro/monje no pueden jugarse) | fórmulas alternativas por clase automatizadas (Defensa sin Armadura) |
| PG | máximos, actuales, **temporales** | ✅ | historial de daño recibido/curado |
| Dados de golpe | tipo, total, gastados, acción de descanso | ✅ mínimo viable (aunque sea un botón simple) | multiclase con varios tipos de dado a la vez |
| Tiradas de muerte | 3 éxitos/3 fracasos | recomendable en v1 (es lo que decide si el personaje muere) | — |
| Equipo | inventario simple con peso | ✅ | **casillas de mano/slot** (§5.1) — necesarias para que CA/ataque se calculen solos, así que en la práctica no puede esperar mucho más que v1.1 |
| Ataques | tabla calculada desde armas equipadas | puede empezar como texto libre en v1 | cálculo automático ligado al equipo (depende de §5.1) |
| Rasgos y dotes | lista de texto con nombre + descripción | ✅ | rasgos como entidades reutilizables entre personajes |
| Trasfondo narrativo | ideales/vínculos/defectos/personalidad | ✅ (son campos de texto cortos, coste bajo) | — |
| Conjuros | — | puede esperar completamente a una fase posterior | espacios por nivel, lista, preparación, CD/ataque de conjuro — bloque grande, solo aplica a un subconjunto de clases |

**Lectura de la tabla**: lo que "puede esperar" con menos coste es todo lo narrativo/opcional (multiclase,
alineamiento, historial). Lo que parece que puede esperar pero en realidad no debería —porque bloquea que CA y
ataques se calculen solos, que es el punto de tener una hoja de 5e y no un formulario— son las casillas de
mano/slot del equipo (§5.1). Conjuros es, con diferencia, el bloque más grande y el más aislable: se puede
lanzar v1 sin lanzadores de conjuros funcionales y añadirlo entero después sin tocar el resto del modelo.
