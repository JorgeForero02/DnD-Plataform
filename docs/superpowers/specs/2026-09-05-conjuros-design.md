# Lo que una cosa HACE — conjuros y aptitudes son el mismo problema

> **Este documento se reescribió el 2026-09-05, el mismo día.** Su primera versión se llamaba «Los
> conjuros» y trataba los hechizos como una fase y los rasgos de clase como otra. **Eso era el
> error**, y el autor lo señaló con una pregunta: *«¿esto de conjuros incluye ataques de otras
> clases? Un bárbaro tiene ataques aparte de atacar con la espada, ¿no?»*
>
> **No los incluía, y debería.** Un conjuro y una aptitud de clase comparten casi todo: los dos son
> algo que un personaje puede hacer, que gasta un recurso, que elige objetivo, que tira o pide una
> tirada, y que a veces deja un efecto con duración. Diseñarlos por separado es cómo se acaba con
> dos motores que hacen lo mismo mal.
>
> **Y es la quinta vez que este proyecto declara el mismo patrón** —construido por dentro, sin
> pantalla que lo use—. Por eso este documento **no es un plan**: es la mitad de diseño de un
> trabajo que el autor partió en tres, y el paso que va antes es **auditar**.

---

## 1 · El encargo del autor, en sus tres partes

El 2026-09-05, después de encontrar cinco huecos usando la aplicación:

1. **Arreglar la iniciativa y el bando** —
   [su plan](../plans/2026-09-05-iniciativa-y-bando.md), quince tareas, se ejecuta aparte.
2. **Auditar TODO** el sistema de ataques, aptitudes y lo relacionado con las hojas de personaje y
   los PNJ enemigos.
3. **Planificar lo que falte**, con la auditoría delante.

**Este documento sirve al 3, y no puede escribirse entero hasta que exista el 2.** Lo que trae ya es
el modelo, que es lo que la auditoría necesita para saber qué buscar.

> *«Es un poco humillante que haya muchas cosas y no se puedan usar porque no está bien
> planeado.»* — el autor, 2026-09-05. Tiene razón, y la causa es identificable: **se ha planificado
> por capas** —el motor, la hoja, los objetos, los sucesos— **en vez de por «¿se puede jugar una
> sesión?»**. Cada capa se cerró en verde y ninguna se usó.

---

## 2 · Lo medido: qué hay y qué no

**Construido, y es más de lo que parecía:**

| Pieza | Dónde |
|---|---|
| Espacios de conjuro por nivel, tres progresiones (`FULL`/`HALF`/`PACT`) | `apps/api/src/rules/catalog/spell-slots.ts:25` |
| Gastarlos y reponerlos; el brujo en descanso **corto** | `apps/api/src/character-state/resources/resources.service.ts:408` |
| **CD de salvación de conjuro**, derivada con traza | `apps/api/src/rules/engine.ts:333` |
| **Ataque mágico**, derivado con traza | `apps/api/src/rules/engine.ts:342` |
| Concentración y su CD (10 o la mitad del daño) | `apps/api/src/character-state/concentration/concentration.ts:61` |
| Pedir una salvación con CD a varios a la vez | `apps/api/src/roll-requests/` |
| Condiciones que caducan solas | fase 2C |
| Ataques derivados del arma equipada, con traza y competencia | `apps/api/src/rules/attacks.ts` |
| Motor de reglas suceso–condición–efecto, de vocabulario cerrado | `apps/api/src/rules-engine/` |

**Lo que falta:**

| Hueco | Medida |
|---|---|
| **Ningún conjuro existe** | cero en `apps/api/src` y `packages/shared/src` |
| **Las aptitudes de clase son solo un nombre** | `f(1, "rage", "Furia")` en `catalog/classes.ts:60`; **cero usos** de `"rage"` o `"extra-attack"` en todo el árbol |
| **Nada que un personaje pueda «hacer»** más allá de pegar con lo equipado | — |

El alcance de las aptitudes **está declarado** en la cabecera de `classes.ts`: *«se transcribe el
NOMBRE de cada aptitud y el nivel al que llega, no su texto de reglas»*. No está roto: está sin
hacer, y desde la mesa no se distingue.

**Lo que eso significa jugando:** un guerrero y un bárbaro de nivel 5 juegan **exactamente igual** —
los dos pegan una vez con su arma—, y un mago no puede lanzar nada.

---

## 3 · La idea que lo une, y de dónde sale

**Foundry VTT, sistema `dnd5e`** (MIT, clonado en `Mine/referencia-foundry-dnd5e`, FUERA del repositorio y solo
para leer) **no modela «conjuros» y «aptitudes» por separado**. Modela **lo que una cosa hace**, con
un vocabulario cerrado de actividades (`module/data/activity/`):

```
attack · save · check · damage · heal · cast · summon
enchant · forward · order · teleport · transform · utility
```

Y entonces:

| Lo que en la mesa se llama | Es |
|---|---|
| Bola de fuego | un conjuro con actividad **`save`** y daño |
| Curar heridas | un conjuro con **`heal`** |
| Un ataque con hacha | un objeto con **`attack`** |
| **Furia** | una aptitud con **`utility`** y un efecto con duración |
| **Ataque adicional** | una aptitud que **modifica** cuántas veces se ataca |
| Aliento de dragón | un statblock con **`save`** — el mismo mecanismo del PNJ |

**Un conjuro deja de ser especial.** Y las tres cosas que este proyecto trata por separado —ataques
de arma, conjuros y aptitudes— pasan a ser **la misma estructura con distinto origen**.

**Y esto no es adoptar Foundry: es reconocer que ya vamos por ahí.** El motor de reglas de este
proyecto es suceso–condición–efecto de vocabulario cerrado, que es la misma familia de idea. Lo que
falta es **aplicarla a lo que un personaje puede hacer**, no solo a lo que el DM automatiza.

---

## 4 · El modelo que propone este diseño

```
Actividad     lo que algo HACE, de un vocabulario CERRADO
              (el de Foundry es una buena base; el nuestro puede ser menor)

Aptitud       algo que un personaje PUEDE hacer, con:
              · de dónde viene (clase, raza, objeto, conjuro)
              · qué consume (espacio, uso, nada)
              · sus actividades
```

**Tres consecuencias que hacen que valga la pena:**

**Un catálogo, no tres.** Conjuros del SRD, aptitudes de clase y acciones de statblock caben en la
misma tabla con distinto origen. Hoy los statblocks ya guardan `actions[].desc` como **texto libre**
— el seed lo descubrió el 2026-09-05 — y eso es la misma información sin estructura.

**Una pantalla, no tres.** «Qué puedo hacer en mi turno» es una lista: ataques, conjuros preparados,
aptitudes con usos. Hoy los ataques tienen su cuadro y lo demás no tiene sitio.

**Y el vocabulario cerrado es lo que impide la deriva.** Si `save` significa una cosa, la significa
para un conjuro, para una aptitud y para el aliento del dragón. Ese es exactamente el argumento por
el que este proyecto ya tiene cerrado el vocabulario del motor de reglas.

---

## 5 · Lo que este diseño NO decide, porque va después de auditar

**A propósito.** Planificar antes de auditar es el error que trajo hasta aquí.

- **Cuántas actividades** entran. Trece es lo que Foundry necesitó en diez años; nosotros
  probablemente empecemos con cuatro o cinco.
- **Cuántos conjuros del SRD**: los ~300, o de nivel 0 a 3 —que cubren una campaña de niveles 1 a 5,
  más de lo que la partida de prueba va a jugar— y el resto después, que es el mismo fichero con más
  filas.
- **Qué aptitudes entran primero.** Las de las clases que alguien vaya a jugar, no las doscientas.
- **Si los trucos entran ya.** Recomendación: **sí** — un mago de nivel 1 sin trucos no tiene nada
  que hacer en el asalto 2.
- **Cómo se modelan las tres familias de lanzador.** El SRD tiene **tres** y aplanarlas a dos deja al
  mago mal: preparan de la lista completa (clérigo, druida, paladín), conocen un número fijo (bardo,
  hechicero, brujo, explorador), y el mago **prepara de su libro**.

---

## 6 · Lo que la auditoría tiene que contestar

Es el paso 2 del encargo, y este documento existe para decirle qué buscar:

1. **De todo lo construido en hojas, ataques, aptitudes, objetos y statblocks: ¿qué se puede usar
   desde una pantalla, y qué no?** Con su `fichero:línea` en las dos columnas.
2. **¿Qué está a medias** — servidor sin pantalla, o pantalla sin servidor?
3. **¿Qué se guarda como texto libre** que debería tener estructura? `actions[].desc` de los
   statblocks es el caso conocido; probablemente no el único.
4. **¿Qué falta para jugar una sesión entera** con un guerrero, un bárbaro y un mago de nivel 3, sin
   que ninguno tenga que decir «esto lo hacemos de palabra»?

**La cuarta es la que manda.** Las tres primeras miden el código; esa mide el producto, y es la que
no se hizo nunca.

## Atribución

`Mine/referencia-foundry-dnd5e` es el sistema **dnd5e de Foundry VTT**, licencia **MIT**, clonado el
2026-09-05 **solo para estudiar cómo modela** aptitudes y conjuros.

**Vive FUERA del repositorio, y eso es deliberado.** El primer intento lo puso dentro con una entrada
en `.gitignore`, y `pnpm verify` se cayó al instante: **`.gitignore` no excluye nada de ESLint**, que
se puso a analizar 275 MB de código ajeno. Excluirlo habría exigido tocar cuatro configuraciones
—ESLint, Prettier, `tsconfig` y Vitest— y bastaba olvidar una. Un material de referencia no es parte
del proyecto: no debe vivir dentro de él.

Si alguna vez se copiara código suyo, la licencia MIT obliga a conservar su aviso de copyright — y a
decirlo aquí.
