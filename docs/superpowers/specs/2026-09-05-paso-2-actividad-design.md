# Paso 2 · La economía de acciones y lo que una cosa HACE

> Escrito el 2026-09-05. Es el **segundo de tres pasos** que el autor definió ese día: (1) las
> goteras —[su spec](./2026-09-05-paso-1-goteras-design.md)—, (2) esto, (3) el catálogo.
>
> **Es la parte cara, y es una sola.** Aptitudes de clase, conjuros y acciones de PNJ **no son tres
> problemas**: son el mismo con distinto origen. Diseñarlos por separado es cómo se acaba con tres
> motores que hacen lo mismo mal.
>
> **Ancla: `276d59c`** para lo nuestro, `20cea09` para Foundry (`Mine/referencia-foundry-dnd5e`, MIT,
> solo lectura). Todas las cifras de este documento **se contaron en esta sesión**, no se estimaron.

---

## 1 · El dato que cambia el diseño, y que corrige una intuición

> **Corregido el mismo día.** La primera versión de esta sección contó los conjuros de
> `packs/_source/spells24`, que es la **edición de 2024** —`source: rules: '2024'` en sus ficheros—.
> Este proyecto es **SRD 5.1**, cuyos conjuros están en `packs/_source/spells`, **sin sufijo**. Las
> conclusiones no cambiaron; las cifras sí, y se recontaron. Queda escrito porque el error es fácil
> de repetir: **el clon trae las dos ediciones y las carpetas se parecen.**

El autor supuso que **los ataques serían la mayoría**. Contados uno a uno sobre los **320 conjuros de
`packs/_source/spells`**:

| Actividad | Conjuros | |
|---|---|---|
| `utility` | **198** | 62% |
| `save` | **112** | 35% |
| `summon` | 29 | |
| **`attack`** | **18** | **5,6%** |
| `damage` | 16 | |
| `heal` | 16 | |
| `check` | 13 | |
| `enchant` | 10 | |

**Un ataque es el 5,6%.** Diseñar alrededor del ataque sería diseñar para la excepción. **Lo que
manda es `utility`** —«pasa algo que no es una tirada»— con casi dos tercios, y `save` con un tercio.

Y la cobertura de las cinco actividades propuestas, contada igual:

> **299 de 320 conjuros — el 93 % — quedan cubiertos por `ataque`, `salvación`, `dados` y
> `utilidad`** (más `prueba`). Los **21** restantes son casi todos invocaciones y encantamientos de
> objeto.

**Ese 7 % es el que se queda como texto**, y es lo que el autor decidió: *«no hay que mecanizar todo,
pero al menos que algunos se sientan importantes»*.

**Y no es una concesión nuestra.** Foundry, con diez años y trece actividades, tampoco mecaniza
«Ataque adicional» (`activities: {}` en su fichero), ni las condiciones de fin de la Furia (prosa; su
sistema solo sabe «600 segundos»), ni aplica el efecto de Furia solo — es un botón manual
(`module/documents/effect-application.mjs:290-307`).

---

## 2 · La enfermedad: no existe la economía de acciones

`model Combatant` (`apps/api/prisma/schema.prisma:425-435`) tiene `id`, `encounterId`,
`characterId`, `initiative`, `groupKey`, `position`, `side`. **Nada que cuente acciones.**

**Esto reordena todo el diagnóstico.** Que las aptitudes de clase sean decorativas no es el problema:
el problema es que **no hay dónde gastarlas**. «Acción impetuosa te da una acción extra» no significa
nada si no hay acciones que contar. **Modelar actividades sin esto es construir grifos sin tubería.**

### Lo que entra

El combatiente cuenta, y se repone al empezar su turno:

```
acción             1
acción adicional   1     ← "bonus action" del SRD
reacción           1     ← se repone al empezar TU turno, no al final del anterior
movimiento         su velocidad, en pies
interacción libre  1
```

**Y el servidor lleva la cuenta, pero no impide.** Es la doctrina que las Herramientas del DM ya
llevan impresa: *«El sistema propone; tú decides. Nada llega a la mesa hasta que lo confirmas.»* Si
un jugador usa dos acciones, **la pantalla lo dice y el DM decide** — porque hay decenas de rasgos
que regalan acciones y ninguno estará modelado el primer día.

**Bloquear sería el servidor arbitrando la mesa**, que es justo lo que este proyecto ya se negó a
hacer con el bando y con el fin del combate.

### La reacción es el caso que se hace mal

Se repone **al empezar tu turno**, no al final del turno anterior. Entre medias no tienes: por eso
puedes reaccionar una sola vez por ronda **y quedarte sin reacción para el resto del asalto**. Si se
repone en el sitio equivocado, un guerrero ataca de oportunidad dos veces.

---

## 3 · La actividad: lo que una cosa HACE

### 3.1 · La forma, verificada en su código

`module/data/activity/base-activity.mjs:50-100` — toda actividad comparte:

```
activation      qué cuesta usarla: acción · adicional · reacción · minutos
consumption     qué gasta: un espacio, un uso, una carga
target          a quién o a qué alcanza
range           distancia
duration        cuánto dura lo que deja
effects[]       qué estados aplica
uses            sus propios usos, si los tiene
description     el texto
```

Y **cada tipo añade uno solo**. `heal-data.mjs:15-21` es literalmente:

```js
return { ...super.defineSchema(), healing: new DamageField() };
```

**`healing` usa el MISMO campo que el daño.** Fundir daño y curación no es una simplificación
nuestra: **en su código ya son lo mismo.**

### 3.2 · Las cinco nuestras

| Actividad | Añade | Cubre |
|---|---|---|
| **`ataque`** | contra qué CA, con qué bono | 18 conjuros, todas las armas, la cimitarra del goblin |
| **`salvación`** | qué característica, contra qué CD, qué pasa si salva | **112 conjuros** |
| **`dados`** | una expresión con su tipo, positiva o negativa | daño y curación, **fundidas** |
| **`utilidad`** | nada mecánico: deja un efecto o un texto | **198 conjuros** —el bloque grande—, la Furia, el Impulso |
| **`prueba`** | qué característica y contra qué CD | 13 conjuros, forcejeos y empujones |

**Cinco, no trece.** Fuera quedan `summon`, `teleport`, `transform`, `enchant`, `forward`, `order`,
`cast` y `check` — invocar, teletransportar, transformar y encantar **piden tablero o criaturas
nuevas**, que es la fase 3, explícitamente fuera del final temporal.

**Y los 21 conjuros que caen fuera se importan igual**, con su texto, su nivel, su escuela y su
alcance. Se leen y se tiran a mano. **Existir y no automatizarse es infinitamente mejor que no
existir**, que es lo que pasa hoy.

### 3.3 · Sin fórmulas — y esto es donde nos separamos de ellos

**Foundry guarda muchos números como texto evaluable, y nosotros no debemos.** Una fórmula evaluada
**no deja pasos**, y la traza es lo mejor que tiene este proyecto.

**Pero ellos están huyendo de las fórmulas, y en nuestra dirección.** El daño ya no es una cadena:

```
module/data/shared/damage-field.mjs:31-48
  number: NumberField          ← cuántos dados
  denomination: NumberField    ← de cuántas caras
  bonus: FormulaField          ← el plano, todavía fórmula
  types: SetField
  scaling: SchemaField
```

Y **escribieron un migrador con expresiones regulares para convertir sus fórmulas viejas a esa
estructura** (`module/data/activity/base-activity.mjs:392-427`).

**La prueba de lo que se pierde está en su propio código:** en
`module/data/activity/attack-data.mjs:284-292` construyen las partes de un ataque **con nombre**
—`mod`, `prof`, `weaponMagic`, `ammoMagic`— y en `:226` **las tiran con un `.join(" + ")`**. Lo mismo
en `module/documents/applied-rules.mjs:173-175`.

> **Están a una línea de tener nuestra traza, y no la tienen.**

**Nuestra sustitución: un tipo `Origen`.** Donde ellos ponen `@mod` o `@prof`, nosotros ponemos de
dónde sale el número:

```
fijo           un entero
modificador    de una característica
competencia    el bono de competencia
escala         una tabla por nivel   ← su ScaleValue, que sí merece copiarse
```

**Sale con nombre en la traza sin trabajo extra**, porque el motor ya sabe explicar cada uno.

### 3.4 · Lo que YA tenemos y no hay que construir

Esto reduce el paso 2 más que ninguna otra cosa:

| Lo que la actividad necesita | Ya existe |
|---|---|
| `uses` — usos con máximo y reposición | **`CharacterResource`** (`schema.prisma:640-650`): `current`, `max`, `resetOn`, `grantedBy`. **Es el `uses` de Foundry, ya construido** |
| `consumption` de un espacio de conjuro | los espacios son recursos, con sus tres progresiones |
| `save` con su CD | **la petición de tirada**, con `dc` y clave de hoja |
| la CD de un conjuro | `spellSaveDc`, derivada con traza (`apps/api/src/rules/engine.ts:333`) |
| el bono de ataque mágico | `attack.spell` (`:342`) |
| `effects[]` que duran | condiciones con caducidad derivada al leer |
| concentración | ya existe, con su CD |
| la traza | **mejor que la suya** |

**Lo que falta es el pegamento y el vocabulario, no la maquinaria.**

Con **una excepción que la spec del paso 1 debe haber resuelto ya**: `PUT resources/:key` existe y
**ninguna pantalla lo llama**, así que hoy una fila «Furia» no puede crearse. Sin eso, `uses` no tiene
puerta.

---

## 4 · Las tres mejoras de nivel que hacen falta

De los nueve tipos de `module/data/advancement/` de Foundry, tres nos sirven:

**`Subclass`** — **arregla un fallo real**: hoy `apps/api/src/rules/catalog/resolve.ts:339` recorre
**todas** las subclases de la clase y aplica sus rasgos por nivel. No existe `subclassKey` en el
servidor, en `shared` ni en Prisma, y `chosenAtLevel` vive en el catálogo **y no lo mira nadie**. Un
bárbaro de nivel 3 tiene hoy los rasgos de **todos** los caminos a la vez.

**`ItemGrant`** — «al nivel 1 ganas la aptitud Furia». Es la que conecta el catálogo con el personaje.

**`ScaleValue`** — «los dados de Furia suben con el nivel», «el Ataque furtivo sube a 2d6». Es la que
evita escribir veinte filas por aptitud.

**Fuera:** `modify-item`, `size`, `trait`, `spell-config`, `ability-score-improvement` —esta última
porque ya la tenemos en `asiLevels`—.

---

## 5 · Lo que NO copiamos de Foundry, y por qué

**Su vencimiento de efectos.** Es un cálculo vivo en el cliente que ejecuta el GM activo. Resuelve
la concurrencia entre navegadores: **un problema que un servidor propio no tiene**. Su precio es que
**sin un GM conectado el sistema se niega a romper concentración**
(`module/documents/active-effect.mjs:793-797`) — una regla de negocio que es puro artefacto de su
arquitectura. Nosotros derivamos al leer, como ya hacemos.

**Sus fórmulas.** Ver 3.3.

**Sus ocho actividades sobrantes**, `override`, `behaviors[]`, `flags`, las ~250 líneas de migración,
y el camino especial del espacio de conjuro.

**Y su `simplifyBonus`** (`module/utils.mjs:561-572`), que **devuelve 0 en silencio** cuando algo no
evalúa — con el `catch` roto, además: escribe `console.error(error)` con la variable ligada como
`err`. Es el ejemplo perfecto de por qué las fórmulas son caras: **un fallo de evaluación se vuelve
un número creíble.**

---

## 6 · Y esto es lo que decide el paso 3

**Diseña la actividad con el YAML de Foundry abierto al lado.**

Si se diseña primero y se convierte después, la conversión será un remodelado y se perderá la mitad.
Si se diseña mirando su forma, **el import es un mapeo** — y de paso se ve qué campos necesitaron de
verdad en diez años y cuáles no usa nadie.

**Es gratis y cambia el coste del paso 3 entero.**

**Y hay una decisión del autor ya tomada que aplica aquí:** *«lo nuestro es poco, podríamos
reemplazarlo por lo de Foundry»*. Los catálogos que **no** tenemos —320 conjuros, 235 aptitudes de clase— son ganancia pura. Los que sí —armas, armaduras, monstruos— se reemplazan
**solo si el mapeo demuestra que su forma es mejor**, y eso se sabrá al escribir el conversor, no
antes.

---

## 6bis · Habla su idioma de datos, sin ejecutar su código

**Regla de diseño, y cuesta cero:** donde un campo nuestro haga lo mismo que uno suyo, **se llama
igual**. `activation`, `consumption`, `target`, `range`, `duration`, `uses`, `effects`.

### Por qué NO se puede hacer lo evidente

El autor preguntó lo obvio —*«¿se puede hacer algo que acepte el `dnd5e` y ya?»*— y la respuesta,
medida el 2026-09-05, es **no**:

```
module/          480 ficheros · 100.456 líneas · 326 plantillas Handlebars
  foundry.*      354 usos      su marco de modelos y de aplicaciones
  game.*         341           el estado global de la partida
  Item.*         255           su sistema de documentos
  CONFIG.*       216           su configuración global
  canvas.*        61           el lienzo (PIXI)
  Hooks · ui · Roll · ChatMessage · ActiveEffect · Actor
```

**Más de mil quinientos puntos de llamada a un runtime que no existe fuera de Foundry.** Aceptar su
sistema significaría construir su anfitrión: documentos, modelos, aplicaciones, lienzo y sockets.
Eso **es** Foundry.

### Lo que sí se puede, y es la distinción entera

```
module/           100.456 líneas de código  →  atado a Foundry. Inútil.
packs/_source/      4.579 ficheros YAML     →  datos. Nuestros si los mapeamos.
```

> **Su sistema no es un formato de datos. Pero sus datos sí lo son.**

### Qué compra usar sus nombres

- **El conversor del paso 3 es un mapeo casi directo**, no una traducción.
- **El contenido nuevo que publiquen se reimporta** sin reescribir nada.
- **Y la puerta de exportar hacia ellos queda abierta**, si algún día hace falta.

**Con un límite claro:** se copia el **nombre**, nunca la implementación. Donde su forma sea peor
—las fórmulas en texto, `override`, `behaviors[]`— **se usa la nuestra y se dice por qué**. Un campo
que se llama igual y significa otra cosa es peor que uno que se llama distinto.

**Y el motor es solo de D&D 5.ª, a propósito.** Foundry soporta más de doscientos sistemas, y ese es
exactamente el motivo de su `CONFIG` global y de sus mil quinientos acoplamientos. **Saber que esto
es D&D es una ventaja de diseño, no una limitación.**

---

## 7 · Lo que este paso NO hace

- **No mecaniza los 21 conjuros que caen fuera** de las cinco actividades. Se importan con su texto.
- **No impide gastar de más.** Cuenta y avisa; decide el DM.
- **No toca el tablero.** `summon`, `teleport` y `transform` son fase 3.
- **No importa el catálogo.** Eso es el paso 3, y este paso existe para que quepa.

## 8 · Qué decide el autor

1. **¿Las cinco actividades, o cuatro?** `prueba` cubre **trece** conjuros y algunos forcejeos; podría
   fundirse con `salvación` —las dos son «alguien tira contra una CD»— a cambio de perder la
   distinción del SRD entre prueba y salvación. **Recomiendo mantenerlas separadas**: el SRD las
   distingue y fundir vocabulario cerrado es difícil de deshacer.
2. **¿El servidor cuenta las acciones y avisa, o las impide?** Recomendado: **cuenta y avisa.**
3. **¿Se reemplazan armas, armaduras y monstruos por los de Foundry**, o solo se importa lo que no
   tenemos? Recomendado: **decidirlo al escribir el conversor**, con las dos formas delante.

## Definición de terminado del diseño

Este documento **no es un plan**. Está terminado cuando el autor apruebe la forma de la actividad,
la economía de acciones y las tres mejoras — y entonces se escribe su plan por tareas, que es donde
van las pruebas y las mutaciones.
