# Plan — Fase 2A: motor de reglas y hoja de personaje (BORRADOR)

**Spec que manda:** `docs/superpowers/specs/2026-09-01-fase-2-alcance-design.md` (vinculante;
sustituye al plan maestro en todo lo que toque el alcance de la fase 2).
**Plan maestro:** `docs/superpowers/plans/2026-07-02-plataforma-dnd.md` (fases 2–5 solo alcance).
**Fecha:** 2026-09-01. **Base:** `70b353c` en `main`.

> **Estado: borrador para revisión del autor.** Este documento contiene **decisiones de
> arquitectura que el autor tiene que firmar** (marcadas como **RECOMENDACIÓN — requiere
> firma**). Ninguna tarea de 2A debe empezar antes de que las preguntas del último apartado
> tengan respuesta.
>
> Nota para quien lo mueva a `docs/`: `scripts/check-docs.mjs` exime por completo
> `docs/superpowers/plans/` y `docs/superpowers/specs/` (ver el comentario `DATED_RECORD_DIRS`
> al principio del script), así que las rutas **propuestas** que aparecen aquí y todavía no
> existen no romperán `pnpm check:docs` si el fichero acaba en cualquiera de esas dos carpetas.
> En cualquier otro sitio, sí lo romperían.

---

> **Este plan tiene una segunda parte, y sin ella está incompleto:**
> [Fase 2A · Parte 2](./2026-09-02-fase-2A-parte-2-eventos-distancias-y-cierre.md) **falla las
> ocho preguntas del §8**, añade seis tareas (eventos, distancias, notificaciones, tiradas) y
> fija **el orden final de las diecisiete**. Lo de aquí sigue vigente; lo que estaba sin decidir,
> allí está decidido.

---

## 0 ter · P1 ya no es una pregunta abierta (2026-09-02)

El autor pidió **un sistema de eventos por cajas**: *"cuando → jugador → revisa con → detalle →
se desvela → camino secreto"*, y reglas que bloqueen cosas hasta que todos estén presentes o
hasta que ciertos secretos se hayan mirado.

Eso necesita exactamente lo mismo que **P1** venía preguntando —**saber qué ha pasado**—, así
que P1 deja de ser una duda y pasa a ser un requisito con dos clientes: el registro de dados de
2C y el motor de reglas del autor. **Se construye una vez, en 2A**, o se construirá dos veces.

Lo que entra en 2A está diseñado en
[el sistema de eventos](../specs/2026-09-02-sistema-de-eventos-design.md): **estado de
campaña/sesión**, **registro de sucesos**, **marcas y conjuntos con nombre**, **señales que el
DM inventa** y **reglas suceso–condición–efecto** con el efecto «revelar» y su **traza**. En un
formulario de tres partes, no en un lienzo: el lienzo de cajas es 2B/2C, cuando el vocabulario
esté probado con una aventura real.

Sus tareas son **2A.12** (marcas, conjuntos y sucesos de mundo), **2A.13** (el motor, con
encadenamiento acotado, orden por especificidad, traza y ensayo en seco) y **2A.14** (la
pantalla). Van después de 2A.5, que es de quien dependen.

**La regla que no se negocia:** un efecto **escribe** `visibility`; **nunca decide** quién ve
qué. `canView` sigue siendo el dueño único, o habría dos matrices y la fuga que este producto
existe para evitar entraría por la puerta de atrás.

---

## 0 quater · Distancias y movimiento (2026-09-02)

El autor señaló un hueco real: **no hay sistema de distancias**. Ni velocidad, ni cuánto se mueve
alguien derribado o agotado, ni alcance de un arma, ni radio de un área.

Decidido en [su especificación](../specs/2026-09-02-distancias-y-movimiento-design.md):

- **Se guarda en pies** (el SRD lo está, y todo son múltiplos de 5) y **se enseña en metros** si
  la persona lo prefiere. La conversión es presentación; el dato nunca es ambiguo.
- **La velocidad efectiva se calcula, nunca se guarda**, con su traza — la misma regla que el
  resto de la hoja (§1.2, pieza 4).
- **Sin mapa hay media mitad del valor, y es la buena**: *«tu velocidad ahora: 7,5 pies, porque
  estás derribado y en terreno difícil»* se puede decir hoy. *«¿llego hasta allí?»* y *«¿a quién
  alcanza esta bola de fuego?»* necesitan posiciones, y las posiciones son la **fase 3**. No se
  prometen antes.

**Qué entra en 2A:** las velocidades del personaje (andar, trepar, nadar, volar, excavar), las
condiciones que las modifican con sus cifras exactas, y la velocidad efectiva derivada.
**Qué es 2B:** alcance y área de los conjuros, con su catálogo.

---

## 0 bis · La forma de la hoja ya está decidida y desplegada (2026-09-02)

El reseño de interfaz del 2026-09-02 entregó **la disposición** de la hoja, no su motor:
`apps/web/src/features/characters/HojaCincoE.tsx` dibuja las casillas de 5.ª edición a su
tamaño real, en el orden de lectura que usa un jugador en la mesa, y **todas dicen «—»**
porque no hay nada que enseñar todavía. La página que la contiene es
`apps/web/src/pages/CharacterDetailPage.tsx`.

Eso significa que **2A no tiene que decidir la disposición ni volver a investigarla**:

- [Especificación de la hoja de 5.ª edición](../specs/2026-09-02-hoja-5e-design.md) — anatomía
  bloque a bloque, **todas las fórmulas del SRD 5.1 en pseudocódigo**, qué se calcula frente a
  qué se anula a mano, rejilla para escritorio/tableta/móvil, y los cuatro huecos que el autor
  detectó (casillas de mano, descansos y dados de golpe, PG temporales, pericia) con su
  impacto en el modelo de datos.
- El patrón recomendado para todo campo calculado es `{ base, override }`, porque 5.ª edición
  rompe sus propias fórmulas a cada rato (Defensa sin Armadura, objetos mágicos, dotes).

**Lo que queda para 2A es exactamente lo que decía este plan**: el esquema, el motor y sus
pruebas. Cuando existan los números, se retira el aviso de «esto es solo la forma» de
`HojaCincoE.tsx` y las casillas empiezan a decir algo.

---

## 0 · Qué entrega 2A, en una frase

Un **motor de reglas puro y determinista** más la **hoja de personaje** que lo enseña: el
personaje deja de ser `{name, race?, class?, level, bio?}` de texto libre
(`apps/api/prisma/schema.prisma:136-148`) y pasa a tener características, raza, subraza, clase,
nivel y **valores derivados calculados con su traza**. Con ello vienen el **evaluador de
expresiones de dados** (porque `4d6kh3` hace falta para crear el personaje), los **recursos
consumibles** (P5), y —esto es lo que decide la arquitectura— el **primer estado mutable de
juego** del proyecto.

### Los principios heredados, que no se renegocian dentro de 2A

1. **La máquina ejecuta, el DM arbitra.** El motor calcula; no decide ventaja, ni si una
   condición aplica, ni si un golpe entra.
2. **El azar vive fuera del motor.** El motor dice *qué* hay que tirar; un tirador con
   generador **inyectable** lo ejecuta. Si el azar entra en el motor, el motor deja de ser
   comprobable.
3. **P0 — preparar una vez, usar muchas en la mesa.** Ante dos formas de construir algo, gana
   la que mueve el trabajo del momento de la partida al de la preparación.
4. Y las del proyecto (`CLAUDE.md`, `docs/04-convenciones.md`): autorización **en el
   servidor**, `canView` (`apps/api/src/common/visibility.ts:15`) como dueño único de "quién ve
   qué", Zod desde `@dnd/shared` como única validación de entrada, la forma de los datos una
   sola vez, código en inglés e interfaz en español, un commit por tarea, y ninguna tarea
   cerrada sin prueba real en verde.

---

## 1 · A · P1 — el estado de la partida: propuesta concreta

> **RECOMENDACIÓN — requiere firma del autor.** Es la decisión más cara de revertir de toda la
> fase 2, porque 2B, 2C y el tablero de la fase 3 se construyen encima. Se presenta con su
> coste y su riesgo; la decisión es del autor.

### 1.1 · El problema, comprobado en el código

`Session` es hoy `{ id, campaignId, title, scheduledAt?, notes?, visibility, createdAt }`
(`apps/api/prisma/schema.prisma:125-134`) y **no tiene estado**: no existe "sesión en curso".
`Character` tampoco tiene nada mutable de juego (`schema.prisma:136-148`: nombre, raza y clase
como texto libre, nivel y bio). El proyecto guarda **documentos**, cada uno escrito en el
momento en que se edita; no guarda **partida**.

Eso rompe tres cosas a la vez:

- **2C no tiene de dónde colgar el log de tiradas.** Una tirada pertenece a una sesión, y hoy
  la pregunta "¿a qué sesión?" no tiene respuesta.
- **2A introduce PG actuales y recursos gastados**, que son estado mutable de verdad.
- **La fase 3 introducirá una posición en un tablero**, que es más de lo mismo.

### 1.2 · La propuesta, en cuatro piezas

**Pieza 1 — la sesión gana estado, y solo el DM lo cambia.**

```
enum SessionStatus { PLANNED IN_PROGRESS CLOSED }

model Session {
  ... lo de hoy ...
  status     SessionStatus @default(PLANNED)
  startedAt  DateTime?
  endedAt    DateTime?
}
```

- `POST /campaigns/:id/sessions/:sessionId/start` y `.../close`, **solo DM**
  (`sessions.service.ts` ya exige `requireDM` en sus tres mutaciones: líneas 31, 66 y 78).
- **Como máximo una sesión `IN_PROGRESS` por campaña**, y eso se garantiza en la base, no en el
  servicio: un **índice único parcial** de Postgres. Prisma no sabe expresarlo en el esquema, así
  que va como SQL crudo dentro de la migración:

  ```sql
  CREATE UNIQUE INDEX "session_one_in_progress_per_campaign"
    ON "Session" ("campaignId") WHERE "status" = 'IN_PROGRESS';
  ```

  Motivo: una comprobación en el servicio es una carrera esperando a ocurrir en cuanto el DM
  tenga dos pestañas abiertas. Y **esa restricción solo se puede probar contra Postgres real**
  (el Prisma simulado no valida SQL — `docs/08-pruebas.md`, "Lo que las pruebas de hoy NO
  cubren"), así que su prueba es e2e, no unitaria.
- **No hay botón de "guardar partida"**, y su ausencia es la funcionalidad: cada cambio se
  escribe cuando ocurre, así que suspender no cuesta nada. "El DM declara un descanso" es **una
  entrada más en el log**, no una operación de guardado.

**Pieza 2 — el estado actual vive en columnas con tipo, nunca en un blob.**

La regla, y es la que hay que aplicar mecánicamente cada vez que aparezca estado nuevo:

| Cardinalidad | Dónde va | Ejemplos |
|---|---|---|
| **1 por personaje, siempre presente** | **columnas** en `Character` | `currentHp`, `tempHp`, `inspiration` (si se modela aparte de los recursos) |
| **0..n por personaje** | **tabla propia** | recursos consumibles (2A), condiciones (2C), posición en el tablero (fase 3), objetos equipados (2B) |

En 2A eso significa exactamente dos cosas nuevas:

```
model Character {
  ... lo de hoy ...
  currentHp  Int?          // null = "a PG máximos"; se materializa al primer cambio
  tempHp     Int  @default(0)
  version    Int  @default(0)   // ver 1.3, concurrencia
}

model CharacterResource {          // P5 — recursos consumibles
  id           String  @id @default(cuid())
  characterId  String
  key          String              // "inspiration", "rage", "hit-dice-d12", "ki"
  label        String              // texto que ve el jugador (español)
  current      Int
  max          Int?                // null = sin tope conocido
  resetOn      ResourceReset       // NONE | SHORT_REST | LONG_REST
  grantedBy    ResourceGrantor     // DM_ONLY | OWNER   ← quién puede subirlo
  character    Character @relation(fields: [characterId], references: [id], onDelete: Cascade)
  @@unique([characterId, key])
}
```

**Por qué columnas y no un JSON de estado:** el proyecto ya pisó esa trampa —`Entity.body` era
`z.unknown()` y hubo que darle forma explícita en 1.17b (`docs/05-datos.md`, apartado "El cuerpo
de texto de una ficha")—. Con un blob se pierde poder **consultar** ("¿qué personajes están
envenenados?"), **migrar** cuando la forma cambie, y **diferenciar**, que es justo lo que la
subida de nivel necesita.

**Pieza 3 — un log append-only al lado, `GameEvent`.**

```
model GameEvent {
  id           String   @id @default(cuid())
  campaignId   String
  sessionId    String?              // null = ocurrió fuera de una sesión en curso
  actorUserId  String
  type         GameEventType        // enum, no texto libre
  subjectType  String               // "character" | "campaign" | "session"
  subjectId    String
  payload      Json                 // validado por un esquema Zod discriminado por `type`
  visibility   Visibility @default(PLAYERS)
  createdAt    DateTime   @default(now())
  campaign     Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  @@index([campaignId, createdAt])
  @@index([sessionId, createdAt])
  @@index([subjectType, subjectId, createdAt])
}
```

Y **la línea que hace que el `Json` no sea la trampa de antes**: el log **nunca es la fuente del
estado**. El estado se lee de sus columnas; el log cuenta *qué lo cambió*. Todo lo que hay que
poder consultar o filtrar es una **columna real** (campaña, sesión, actor, tipo, sujeto, fecha,
visibilidad); el `payload` solo lleva el detalle que se muestra en una línea de la línea de
tiempo. Además está **validado al escribir** por una unión discriminada de Zod en
`packages/shared/src/game-event.schema.ts`, discriminada por `type` — así que su forma vive una
sola vez, como manda `docs/01-arquitectura.md`.

Regla que hay que escribir en `docs/04-convenciones.md` y no dejar implícita: **si algún día
hace falta consultar por un campo del `payload`, ese campo se promociona a columna**. No se
consulta dentro del JSON.

Tipos de evento que nacen en 2A (el enum arranca corto a propósito):
`SESSION_STARTED`, `SESSION_CLOSED`, `REST_DECLARED`, `HP_CHANGED`, `TEMP_HP_SET`,
`RESOURCE_SPENT`, `RESOURCE_RESTORED`, `LEVEL_CHANGED`, `ABILITY_ROLL`, `MANUAL_OVERRIDE_SET`.
2C añade `DICE_ROLLED`, `CONDITION_APPLIED`, `CONDITION_REMOVED`, `CLOCK_ADVANCED`; la fase 3
añade `TOKEN_MOVED`. **Añadir un tipo es añadir un valor al enum y un miembro a la unión de
Zod: no toca ninguna tabla.** Eso es exactamente lo que P1.7 pide garantizar.

**Pieza 4 — guardar lo decidido, derivar lo calculado.**

- **Se guarda** (son decisiones): características base, raza, subraza, clase, nivel, elecciones
  resueltas de subida de nivel, PG actuales, PG temporales, recursos gastados, anulaciones
  manuales del DM.
- **Se calcula siempre, y nunca se persiste**: modificadores de característica, bonificador de
  competencia, CA, PG **máximos**, CD de salvación, bonos de ataque, competencias heredadas de
  raza y clase.

Motivo, textual del spec: guardar lo calculado significa que el día que se corrija una fórmula
habrá mil filas mintiendo sin forma de saber cuáles.

Una consecuencia práctica que hay que aceptar: **`currentHp` se guarda pero `maxHp` no**, así
que subir CON o subir de nivel **no toca `currentHp`**, y el jugador puede quedarse con
`currentHp > maxHp` si algo baja. Se resuelve **al leer**, sin escribir: la hoja muestra
`min(currentHp, maxHp)` y añade un aviso, en vez de reescribir filas por debajo. Esa asimetría
—clamp al leer, nunca al recalcular— tiene que estar en la prueba, porque es el tipo de detalle
que se implementa al revés sin darse cuenta.

### 1.3 · Escrituras concurrentes (P1.5) — dos mecanismos, según la intención

El producto sondea, no empuja. Dos jugadores tocando los PG del mismo personaje acabarían en
"gana el último" si no se hace nada. La propuesta es **partirlo por intención**, porque las dos
intenciones son distintas de verdad:

**a) Cambios relativos — el caso normal, y no puede perder escrituras.**

```
POST /campaigns/:id/characters/:characterId/hp   { delta: -5, reason: "aliento de dragón" }
POST .../resources/:key/spend                    { amount: 1, reason: "inspiración" }
```

En la mesa nadie dice "tengo 12": dice "recibo 5". El servidor aplica el **delta** dentro de una
transacción con la fila bloqueada (`SELECT … FOR UPDATE`, necesario porque hay que leer para
recortar entre 0 y el máximo), escribe el `GameEvent` en la misma transacción, e incrementa
`version`. Dos jugadores aplicando −5 y −3 **aterrizan los dos**. No hay conflicto que resolver
porque no hay nada que sobrescribir.

**b) Cambios absolutos — corrección del DM, y ahí sí hace falta un conflicto.**

```
PATCH /campaigns/:id/characters/:characterId   { currentHp: 12, expectedVersion: 7 }
```

Concurrencia optimista: si `version` ya no es 7, **409** con el valor actual en el cuerpo, y la
pantalla dice *"alguien cambió los PG mientras mirabas: ahora son 9"* con un botón de volver a
mirar. Es la única forma honesta: un DM corrigiendo a mano **quiere** pisar, pero quiere saber
qué pisa.

**Coste:** una columna `version`, un `expectedVersion` en el esquema de actualización, una rama
de 409 en el cliente, y unos pocos tests más. **Riesgo:** bajo, y acotado — si el 409 molestara
en la práctica, se puede relajar a "gana el último" sin tocar el modelo. Al revés (añadir
concurrencia después) sí sería caro.

**Lo que NO se hace:** bloqueos pesimistas de larga duración, ni tiempo real. El sondeo se
sustituye por un empujón en la fase 4 sin tocar nada de esto.

### 1.4 · El log crece (P1.6)

- **No se borra nada**, y no hace falta política de retención todavía: son filas estrechas en
  Postgres. Pero se decide **ahora** qué se enseña: la pantalla muestra **la sesión en curso**
  por defecto, paginado por cursor sobre `(createdAt, id)`, nunca "toda la campaña" de golpe.
- **Cada evento lleva su `visibility` y se filtra con `canView`**, igual que cualquier otro
  recurso. Un `HP_CHANGED` de un personaje `DM_ONLY` no viaja al jugador. Esto es gratis porque
  la matriz ya está construida y probada desde la fase 1.
- **Se mide antes de optimizar.** Si una campaña larga llegara a molestar, la salida es
  archivar por sesión cerrada, y eso no cambia el modelo.

### 1.5 · Cómo entra la casilla del tablero después (P1.7)

Sin tocar nada de lo anterior: una tabla nueva `TokenPlacement { sceneId, characterId, x, y }`
(cardinalidad 0..n → tabla propia, regla de la pieza 2), un valor nuevo `TOKEN_MOVED` en
`GameEventType`, un miembro nuevo en la unión de Zod, y el mismo endpoint de deltas para mover.
**Añadir filas, no rehacer la arquitectura**, que es literalmente lo que P1.7 exige.

### 1.6 · Lo que esta propuesta cuesta y lo que arriesga

| | |
|---|---|
| **Coste** | Una migración con SQL crudo (índice parcial), una tabla nueva, tres columnas nuevas en `Character`, un esquema Zod discriminado, y ~2 de las 11 tareas de 2A dedicadas a fontanería que no se ve en pantalla. |
| **Riesgo asumido** | El enum `GameEventType` y la unión de Zod hay que mantenerlos sincronizados a mano; una prueba debe comprobar que **todo valor del enum tiene su miembro en la unión** (es barata y evita el fallo obvio). |
| **Riesgo evitado** | Descubrir en 2C que el log de tiradas no tiene dónde colgarse, y tener que migrar datos ya escritos. |
| **Lo que NO resuelve** | El **reloj de campaña** (tiempo de ficción, respuesta B del DM asesor) sigue siendo de 2C. Son dos relojes distintos y no se mezclan aquí. |

---

## 2 · La traza de derivación: cómo se representa

La traza **es la funcionalidad**, no un adorno: es lo que hace que el jugador deje de preguntar
de dónde sale el número. Tiene que poder producir, en pantalla:

```
CA 18 = 14 cota de malla + 2 escudo + 2 Destreza
```

**Forma propuesta** (en `packages/shared/src/rules/trace.schema.ts`, porque la web la pinta):

```ts
type TraceStep = {
  op: "base" | "add" | "override" | "cap";  // no todo suma: ver abajo
  amount: number;                            // con signo
  sourceType: "base" | "ability" | "race" | "subrace" | "class" | "level"
            | "item" | "proficiency" | "manual";
  sourceKey: string;        // "chain-mail", "dex", "dwarf-hill", "barbarian"
  labelKey: string;         // clave estable; el español lo pone la web
};

type DerivedValue = {
  key: string;              // "ac", "maxHp", "save.dex", "attack.melee", "spellSaveDc"
  total: number;
  steps: TraceStep[];
};
```

Tres decisiones dentro de esa forma, y cada una tiene motivo:

1. **El motor devuelve claves y números, nunca prosa en español.** Es la regla del proyecto
   (*código en inglés, interfaz en español*, `CLAUDE.md`) y además es lo que permite que la
   misma traza sirva para una interfaz distinta más adelante. El texto sale del catálogo
   (`labelEs`) en la capa de presentación.
2. **`op` existe porque no todo suma.** La CA no es "14 + Destreza": la cota de malla
   **sustituye** la fórmula base y **anula** la aportación de Destreza. Un modelo puramente
   aditivo daría 24 y sería un error silencioso. El motor evalúa las fórmulas candidatas
   (sin armadura, con armadura, anulación manual del DM), **elige la mayor**, y la traza
   registra la elegida; las descartadas se pueden devolver como avisos (*"con armadura de cuero
   tendrías 13"*), que es barato y muy útil en la mesa.
3. **La traza se calcula siempre, junto al valor, y jamás se persiste.** Es una salida del
   motor, no un dato. Si se guardara, el día que cambie una fórmula habría trazas mintiendo.

**La prueba que lo demuestra:** un caso de mesa completo —un personaje con cota de malla, escudo
y Destreza 14— cuyo `DerivedValue` de `ac` tiene `total: 18` y exactamente cuatro pasos, con la
Destreza **capada a 0** (`op: "cap"`) y no sumando 2. Si alguien reimplementa la CA como suma
ingenua, ese test se pone rojo.

---

## 3 · Elecciones sin resolver: "modificador con parámetro pendiente"

*"+1 a dos características a tu elección"* (semielfo), *"elige cuatro habilidades"* (pícaro),
la mejora de característica de los niveles 4, 8, 12, 16 y 19. **No son casos especiales por
raza**: son el mismo mecanismo.

**Forma propuesta**: un modificador tiene siempre la misma pinta, y lo que cambia es si su
parámetro está resuelto:

```ts
type Modifier = {
  id: string;                 // "half-elf-asi-1"
  sourceType: "race" | "subrace" | "class" | "level" | "item" | "manual";
  sourceKey: string;
  target:                     // qué toca
    | { kind: "ability"; ability: AbilityKey | { choose: 1; from: AbilityKey[]; excluding?: AbilityKey[] } }
    | { kind: "skillProficiency"; skill: SkillKey | { choose: number; from: SkillKey[] } }
    | { kind: "speed" | "maxHpPerLevel" | "ac" | "save"; ... };
  amount: number;
};
```

Y la resolución del jugador es **una fila de datos, no código**:

```
model CharacterChoice {
  characterId  String
  modifierId   String       // "half-elf-asi-1"
  picks        String[]     // ["cha", "dex"]  |  ["stealth", "perception", ...]
  @@unique([characterId, modifierId])
}
```

Cómo funciona, y por qué esto es lo correcto:

- El motor recorre los modificadores del catálogo; si el `target` lleva un `choose` y **no hay
  `CharacterChoice`** que lo resuelva, **no aplica nada** y emite un **aviso**
  (`{ code: "unresolved_choice", modifierId, needed: 2, from: [...] }`). El hueco ya estaba
  previsto en el diseño del motor ("hoja calculada + lista de avisos + traza").
- Cuando la elección existe, el modificador se aplica y es **indistinguible** de uno estático:
  la traza lo pinta como `+1 Carisma (semielfo)`, exactamente igual que un `+2` fijo.
- **La validación de la elección vive en el motor y se comprueba en el servidor**: cantidad
  correcta, todas dentro de `from`, sin repetir, y respetando `excluding` (el semielfo no puede
  elegir Carisma, que ya recibe su +2). Un `PATCH` con una elección inválida es **400**.

**Lo que esto evita:** una rama `if (race === "half-elf")` en el motor. Añadir una raza
homebrew en 2B pasa a ser añadir datos, no código — que es P0 aplicado al propio código.

---

## 4 · Los datos del SRD 5.1: cómo se transcriben, cómo se verifican, y dónde va la atribución

### 4.1 · Dónde viven los datos

> **RECOMENDACIÓN.** El spec dice "datos del SRD sembrados" sin decir dónde. Hay dos opciones
> reales y la elección tiene consecuencias.

| | Datos en TypeScript versionado (**recomendado**) | Filas sembradas en Postgres |
|---|---|---|
| El motor sigue puro y sin E/S | **sí** | no: cada cálculo pide datos a la base |
| Se prueba sin Docker | **sí** | no |
| Cambiar una cifra mal transcrita | un commit, revisable en el diff | una migración de datos |
| Homebrew del DM por campaña (2B) | tabla nueva que se **une** al catálogo | misma tabla, más natural |
| Revisión por el autor | diff de git legible | consulta SQL |

**Recomendación: catálogo en TypeScript**, en un paquete propio `packages/srd`
(o `apps/api/src/rules/catalog/` si se prefiere no crear paquete todavía), con una **referencia
de contenido** desde el principio para que el homebrew de 2B no obligue a tocar el motor:

```ts
type ContentRef = { source: "SRD"; key: string } | { source: "CAMPAIGN"; id: string };
```

El motor recibe **el contenido ya resuelto**, no una referencia: quien resuelve `ContentRef` →
datos es el servicio, que en 2A solo sabe mirar el catálogo SRD y en 2B aprenderá a mirar
además la tabla de la campaña. **El motor no cambia** entre 2A y 2B, y eso es el objetivo.

### 4.2 · Cómo se enlaza con el `Character` de hoy

`Character.race` y `Character.class` son hoy **texto libre** (`schema.prisma:141-142`) y el
editor los pinta como dos `<input>` (`apps/web/src/features/characters/CharacterEditor.tsx:32-33`).
Propuesta:

- Columnas nuevas `raceKey`, `subraceKey`, `classKey` (`String?`), que apuntan al catálogo.
- **`race` y `class` se conservan** como texto libre heredado, marcados como obsoletos en
  `docs/05-datos.md`, y la hoja los muestra solo si no hay clave. Motivo: puede haber
  personajes escritos a mano en la mesa del autor; borrarles el texto sería destruir datos por
  una migración de conveniencia. Se retiran cuando el autor confirme que no queda ninguno.
- Características base: seis columnas `Int` (`str`, `dex`, `con`, `int`, `wis`, `cha`), no un
  JSON. Son seis, son fijas, y hay que poder consultarlas.

### 4.3 · Alcance exacto de la transcripción (tarea propia, ver 5.3)

9 razas con sus subrazas del SRD, 12 clases con su progresión por nivel (dado de golpe,
competencias de salvación, competencias de armas y armaduras, aptitudes por nivel como **texto**,
niveles de mejora de característica), la tabla de bonificador de competencia, las 18 habilidades
con su característica, y las armaduras y escudos con su fórmula de CA (que 2B reutilizará).

**Y una sola subclase por clase**, que es lo único que trae el SRD: se **modela en los datos**
para que quepa el homebrew, pero **no se construye pantalla de elección de subclase en 2A** —
sería un menú de una opción.

### 4.4 · Cómo se verifica que la transcripción es correcta

Esto es lo que convierte una tarea aburrida en una tarea fiable. Tres capas:

1. **Invariantes sobre todo el catálogo** (una prueba, cientos de filas cubiertas): toda clase
   tiene dado de golpe de entre d6 y d12; toda clase tiene exactamente **dos** competencias de
   salvación; toda raza tiene velocidad > 0; toda clave referenciada por un modificador existe;
   el bonificador de competencia es +2 en 1–4, +3 en 5–8, +4 en 9–12, +5 en 13–16, +6 en 17–20;
   ninguna clave duplicada. Estas pruebas cazan el error de copiar-pegar, que es el error real
   de una transcripción.
2. **Casos de mesa conocidos, de punta a punta por el motor** — los que pidió el spec:
   - **Enano de las colinas bárbaro, nivel 1, CON 16** → **PG máximos 16** = 12 (dado d12 máximo
     al nivel 1) + 3 (modificador de CON) + 1 (Dureza Enana, +1 PG **por nivel**). Es el caso que
     hay que elegir precisamente porque una fórmula ingenua da 15 y se olvida del rasgo racial.
   - El mismo, **a nivel 5** con media fija → 12 + (4 × 7) + (5 × 3) + (5 × 1) = **60**.
   - **Elfo alto mago nivel 3, INT 16** → CD de salvación de conjuro **13** (8 + 2 competencia
     + 3 INT) y bono de ataque de conjuro **+5**.
   - **Guerrero con cota de malla y escudo, DES 14** → **CA 18**, con la Destreza capada
     (el caso de §2).
   - **Semielfo sin elecciones resueltas** → dos avisos `unresolved_choice`, y **ninguna**
     característica alterada (el caso de §3).
3. **Revisión humana del diff.** La transcripción se entrega en **un commit por bloque**
   (razas, clases, habilidades, armaduras) para que el diff sea revisable por el autor con el
   SRD delante. Un commit de 2.000 líneas de datos no lo revisa nadie.

### 4.5 · Legal: qué entra y dónde va la atribución

**Línea no negociable:** en el repositorio solo entra contenido del **SRD 5.1**, publicado bajo
**CC BY 4.0** desde 2023. Reglas y fórmulas son libres (no son de nadie); **texto, nombres de
subclases que no están en el SRD, dotes y conjuros del manual, no se copian ni se distribuyen**.
Lo que el DM teclee en su mesa como homebrew es uso privado; lo que **el producto trae de serie**
es solo SRD.

**Dónde va la atribución** (CC BY exige atribución en la obra distribuida, no solo en el
repositorio, e **indicar si se han hecho modificaciones** — y traducir al español **es** una
modificación):

1. **`NOTICE.md` en la raíz del repositorio**, con el texto de atribución completo.
2. **Una cabecera de comentario en cada módulo de datos del catálogo**, apuntando al `NOTICE.md`.
   Es donde mira quien edita los datos.
3. **Una pantalla "Acerca de" / pie de página en la aplicación web**, con el mismo texto
   visible para el usuario final. **Este es el que de verdad cumple la licencia**, porque es el
   que viaja con la obra distribuida. Va en la tarea de web (5.10) y es de cinco minutos.

Texto propuesto (en inglés el aviso legal, en español la nota de modificación):

> This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by
> Wizards of the Coast LLC, available at
> https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under
> the Creative Commons Attribution 4.0 International License,
> https://creativecommons.org/licenses/by/4.0/legalcode.
> *Modificaciones:* los nombres y textos de reglas se han traducido al español y reorganizado
> como datos estructurados.

**Y una prueba que lo protege de erosionarse**: un test que falla si existe una clave de
catálogo cuya `source` no sea `"SRD"` sin estar marcada como homebrew de campaña. Barato, y
convierte la regla legal en un control mecánico en vez de una intención — que es exactamente lo
que `scripts/check-docs.mjs` hizo con las reglas de documentación.

---

## 5 · B · Secuencia: las once tareas de la primera mitad

> **Ya no son once en total.** La [parte 2](./2026-09-02-fase-2A-parte-2-eventos-distancias-y-cierre.md)
> añadió seis —eventos, distancias, notificaciones y tiradas— y **el orden final de las
> diecisiete está allí, en su §3**. Lo de aquí es la descripción de estas once; el orden en que
> se ejecutan, no.

Cada tarea termina con `pnpm verify` limpio, sus pruebas en verde, la documentación en el mismo
commit (estado en 01–05, deuda en 06, una línea en 07) y **un commit por tarea**. El orden está
elegido para que **las cuatro primeras no toquen la base de datos ni la red**: el motor y los
dados se pueden probar a fondo antes de que exista un solo endpoint, que es lo que pide el plan
maestro para la parte más arriesgada del proyecto.

> Cada tarea de API entrega, como mínimo: unitarias del servicio con Prisma simulado (caso
> normal + caso sin permiso + filtrado de visibilidad) y **un e2e** con el guion de siempre —
> registrar DM y jugador, invitar, comprobar los dos puntos de vista (`docs/08-pruebas.md`).
> Cada tarea que toque pantalla **extiende un recorrido de Playwright que ejecute el código
> nuevo y falle si se revierte el cambio** (lección de 1.12b).

### 5.1 · Tarea 2A.1 — evaluador de expresiones de dados (puro)

**Entrega.** `packages/dice` (o `apps/api/src/dice/`): analizador y evaluador de
`NdM`, `kh`/`kl`, constantes y suma/resta de términos. `4d6kh3`, `2d20kh1`, `2d20kl1`, `2d6+3`,
`1d100`. **Generador aleatorio inyectable** (`type Roller = (sides: number) => number`).
Salida **estructurada**, no un número: por término, los dados tirados, los conservados, los
descartados, y el total.
Límites duros a la entrada (p. ej. ≤ 100 dados, ≤ 1000 caras, ≤ 10 términos) porque una
expresión llega del usuario y `9999d9999` no puede tumbar el proceso.

**Prueba que lo demuestra.** Con un tirador de guion (`[6,4,3,1] → 4d6kh3 = 13`, con el `1`
en `dropped`); `2d20kh1` con `[20,3]` conserva 20 y `2d20kl1` con los mismos conserva 3
(el detalle que P7 necesitará en 2C); expresiones basura (`d`, `4d`, `4d6kh`, `4d6kh9`,
`1d6+`) se rechazan con un error tipado, no con `NaN`; los límites rechazan con 400.
Con el mismo tirador sembrado, dos ejecuciones dan **exactamente** lo mismo.

**No toca.** Nada de HTTP, nada de Prisma, nada de personaje. **No hay pantalla de tiradas**
(eso es 2C) y **no hay ventaja/desventaja como concepto de juego** — aquí `kh1` es solo
sintaxis.

### 5.2 · Tarea 2A.2 — el motor: núcleo determinista y traza

**Entrega.** `apps/api/src/rules/` (puro: sin Nest, sin Prisma, sin HTTP — como pide el plan
maestro). Entrada: estado base del personaje + lista de modificadores + contenido ya resuelto.
Salida: `{ derived, warnings, trace }`. Cubre modificadores de característica, bonificador de
competencia, CA (con `op` y elección de fórmula, §2), PG máximos, CD de salvación, bonos de
ataque y de ataque de conjuro, salvaciones y habilidades con competencia.
Datos de prueba **inventados a mano** en esta tarea (una raza y una clase de mentira): el
catálogo real es la 2A.3, y mezclarlos haría que un fallo del motor pareciera un fallo de
transcripción.

**Prueba que lo demuestra.** Tabla exhaustiva de modificadores de característica (1 → −5,
10 → 0, 20 → +5); el caso de CA de §2 con la Destreza capada; el motor **es determinista**
(mismo input, mismo output, sin `Math.random` en el módulo — comprobable con una regla de lint
o con un test que sustituye `Math.random` por una función que lanza).

**No toca.** Base de datos, endpoints, pantalla. **No** interpreta rasgos con condición ni
activación: eso es texto.

### 5.3 · Tarea 2A.3 — catálogo SRD 5.1 y su verificación

**Entrega.** Lo del §4: razas, subrazas, clases con progresión, habilidades, armaduras, tabla
de competencia; `ContentRef`; `NOTICE.md`; cabeceras de atribución.

**Prueba que lo demuestra.** Las tres capas del §4.4: invariantes sobre todo el catálogo, los
cinco casos de mesa conocidos ejecutados **a través del motor de 2A.2**, y el test de licencia.

**No toca.** El motor (si hace falta cambiarlo, es que 2A.2 se quedó corta y se arregla ahí, no
aquí). Ninguna tabla nueva. **Nada de dotes, ni conjuros, ni subclases fuera del SRD.**

### 5.4 · Tarea 2A.4 — elecciones pendientes y avisos

**Entrega.** Lo del §3: `choose` en el `target` de un modificador, avisos
`unresolved_choice`, validación de una elección propuesta.

**Prueba que lo demuestra.** Semielfo sin elegir → dos avisos y **ninguna** característica
alterada; semielfo eligiendo Carisma → **rechazado** (`excluding`); eligiendo una sola de las
dos → sigue avisando; eligiendo las dos → los modificadores aparecen en la traza
indistinguibles de uno fijo. Pícaro eligiendo cinco habilidades cuando le tocan cuatro →
rechazado.

**No toca.** Persistencia ni pantalla. **No** introduce dotes como alternativa a la mejora de
característica.

### 5.5 · Tarea 2A.5 — estado de partida: sesión con estado y log `GameEvent`

**Entrega.** Lo del §1, piezas 1 y 3: migración con el enum, las columnas de `Session`, el
índice único parcial en SQL crudo, la tabla `GameEvent`, la unión discriminada de Zod, los dos
endpoints de arrancar y cerrar sesión, `GET` del log paginado por cursor y filtrado por
`canView`.

**Prueba que lo demuestra.**
- **e2e contra Postgres real:** arrancar una segunda sesión en la misma campaña **falla**
  (es el índice el que lo impide, no el servicio — por eso no vale una unitaria).
- Unitaria: un jugador que intenta arrancar una sesión recibe **403**.
- e2e: un evento `DM_ONLY` **no aparece** en el `GET` del jugador (el guion de siempre).
- Unitaria: **todo valor de `GameEventType` tiene su miembro en la unión de Zod** (el riesgo
  declarado en §1.6).

**No toca.** Personajes, PG, recursos. **No** hay pantalla todavía. **No** hay reloj de
campaña (2C).

### 5.6 · Tarea 2A.6 — la hoja persistida: características, raza, clase, y creación con tiradas

**Entrega.** Columnas nuevas de `Character` (§4.2: seis características, `raceKey`,
`subraceKey`, `classKey`), `CharacterChoice`, esquemas en `@dnd/shared`, y
`GET /campaigns/:id/characters/:characterId/sheet` que devuelve **hoja calculada + avisos +
traza** llamando al motor. Y la **tirada de características al crear**:
`POST /campaigns/:id/characters/ability-rolls` que ejecuta `4d6kh3` **en el servidor** seis
veces y escribe seis `ABILITY_ROLL` en el log.

> **RECOMENDACIÓN — requiere firma.** Que la tirada de características la ejecute el servidor y
> quede registrada es lo coherente con *"si el dado se tira en el navegador, el jugador puede
> repetir hasta que salga bien"*, y con el argumento del DM asesor de que **el personaje es de
> la campaña porque sus características salieron de dados concretos**. Cuesta un endpoint
> pequeño en 2A en vez de esperar a 2C. La alternativa —tirar en el cliente y confiar— es más
> barata hoy y contradice el spec.

**Prueba que lo demuestra.** e2e: crear personaje con características y clase → el `GET` de la
hoja devuelve los PG máximos del caso conocido; un jugador **no** ve la hoja de un personaje
`DM_ONLY` ajeno; una elección inválida → **400**. Unitaria: `update` sigue exigiendo DM o dueño
(la regla ya existe, `apps/api/src/characters/characters.service.ts:70`) y ahora también para
los campos nuevos.

**No toca.** PG actuales ni recursos (5.7 y 5.8). **No** hay subida de nivel todavía.

### 5.7 · Tarea 2A.7 — PG mutables: deltas, concurrencia y su rastro

**Entrega.** Lo del §1.2 pieza 2 y §1.3: `currentHp`, `tempHp`, `version`; el endpoint de
delta con transacción y bloqueo de fila; el `PATCH` absoluto con `expectedVersion` y **409**;
un `GameEvent` `HP_CHANGED` por cada cambio, con su motivo.

**Prueba que lo demuestra.** e2e: dos peticiones de delta seguidas (−5 y −3) dejan el valor en
−8, **las dos escritas**; un `PATCH` con `expectedVersion` viejo devuelve **409** y el cuerpo
trae el valor actual; el delta **recorta a 0** y no baja de ahí; `currentHp > maxHp` tras bajar
CON se muestra recortado **sin reescribir la fila** (§1.2 pieza 4).

**No toca.** Condiciones, muerte, tiradas de salvación de muerte, daño calculado (todo eso es
2C o Encuentros).

### 5.8 · Tarea 2A.8 — recursos consumibles (P5)

**Entrega.** `CharacterResource` (§1.2), endpoints de gastar y reponer, `resetOn` aplicado
cuando el DM declara un descanso (`REST_DECLARED` en el log), y **la inspiración como primer
inquilino**, no como funcionalidad propia.

**Prueba que lo demuestra.** Gastar por debajo de 0 → **400**; un recurso con
`grantedBy: DM_ONLY` **no** lo puede subir su dueño (**403**) pero sí gastarlo; un descanso
largo repone los `LONG_REST` y **no** los `NONE`; cada gasto deja su `GameEvent`.

**No toca.** El **efecto** del recurso. Que la inspiración conceda ventaja es una propiedad de
la tirada y vive en **2C**: 2A solo entrega el contador que baja. Nada de espacios de conjuro
(están excluidos, §6).

### 5.9 · Tarea 2A.9 — subida de nivel: diff propuesto, jugador que confirma

**Entrega.** `POST .../characters/:id/level-up/preview` que devuelve el **diff** contra la
instantánea anterior más las elecciones que el nivel desbloquea, y `.../confirm` que las
resuelve y escribe `LEVEL_CHANGED`. **PG al subir: media fija por defecto, configurable por
campaña** (`Campaign.hpOnLevelUp: AVERAGE | ROLL`); si es `ROLL`, la tirada la hace el servidor
con el evaluador de 2A.1 y queda en el log.

**Prueba que lo demuestra.** `preview` de 4 → 5 devuelve el cambio de PG, el cambio de
competencia (+2 → +3) y la aptitud nueva; **`preview` no escribe nada** (comprobar con un `GET`
posterior); `confirm` con una elección sin resolver → **400**, y el nivel **no** sube;
`confirm` dos veces con el mismo cuerpo no sube dos niveles.

**No toca.** Puntos de experiencia (fuera de la fase 2), dotes, multiclase, subclases fuera del
SRD.

### 5.10 · Tarea 2A.10 — la pantalla de la hoja: valores, traza y avisos

**Entrega.** La hoja en la pestaña de personajes de `CampaignDetailPage.tsx` (hoy `Personajes`,
línea 40): características, valores derivados, y **cada número desplegable a su traza**
(`CA 18 = 14 cota de malla + 2 escudo + 2 Destreza`), avisos visibles, PG y recursos con sus
controles. Se construye con las primitivas que ya existen (`apps/web/src/ui/index.ts`:
`Field`, `Panel`, `Badge`, `Button`, `Dialog`, `Tabs`), sin inventar componentes nuevos que no
hagan falta. **Y el aviso de atribución del SRD** (§4.5, punto 3).

**Prueba que lo demuestra.** RTL: la traza de la CA aparece al desplegar y contiene las cuatro
partes; un aviso de elección sin resolver se pinta; deshabilitar-nunca-esconder con el motivo
**visible en pantalla** para quien no puede editar (regla de 1.16: `title=` no vale).
**Playwright:** crear personaje → abrir hoja → ver la CA y su traza; **el recorrido debe fallar
si se revierte el cálculo**.

**No toca.** La pantalla de tiradas, el registro de tiradas y las condiciones (2C).

### 5.11 · Tarea 2A.11 — la pantalla de subida de nivel y el cierre de 2A

**Entrega.** El diff en pantalla con sus elecciones y su confirmación explícita (*nada cambia a
espaldas del jugador*), el arranque y cierre de sesión para el DM, y la línea de tiempo de la
sesión en curso leyendo el log.

**Prueba que lo demuestra.** RTL: confirmar sin resolver una elección está **deshabilitado con
el motivo en pantalla**. **Playwright con dos contextos** (patrón de
`apps/web/e2e/invitacion.spec.ts`): el DM arranca la sesión, el jugador sube de nivel y
confirma, y el DM **ve el evento** en la línea de tiempo tras recargar (sondeo, no tiempo real).

**Al terminar 2A** — y esto es parte de la tarea, no un extra: el autor **monta su propio
personaje real y lo mira diez minutos**. No es jugar una partida: es abrir la ficha. Es la
mitigación que el spec recomienda, y descubrir ahí que la hoja está mal pensada es
infinitamente más barato que descubrirlo con el inventario construido encima.

---

## 6 · C · Lo que 2A NO hace, y dónde va cada cosa

Un plan que no nombra sus exclusiones crece una. Esta es la lista, con destino:

| Excluido de 2A | Dónde va | Motivo |
|---|---|---|
| **Multiclase** | **Fuera de la fase 2 entera.** Necesita su propio spec | PG mixtos, competencias que no se acumulan igual, requisitos de característica, progresión de conjuros combinada. Es el recorte que más complejidad ahorra por menos valor perdido. **Una clase por personaje** |
| **Matemáticas de espacios de conjuro** | Fuera de la fase 2. La **lista de conjuros es texto** | Espacios por nivel, preparados contra conocidos, trucos que escalan: subsistema entero. **Sí** entran la CD de salvación y el bono de ataque de conjuro: son dos fórmulas |
| **Dotes** | Fuera de la fase 2 | Cada una es un caso especial. Los niveles 4/8/12/16/19 dan **solo** mejora de característica |
| **Combate: comparar contra la CA, acierto o fallo, aplicar daño** | Bloque **Encuentros** (entre fase 2 y 3) | Necesita statblocks vivos y alguien llevando la cuenta |
| **Iniciativa y orden de turnos** | **Encuentros** | Sin ellos "un turno no existe en el sistema" |
| **Condiciones con duración en turnos** | **Encuentros** | Nacen donde nace el turno. Las condiciones **indefinidas** son de 2C |
| **Puntos de experiencia y sus tablas** | Capa opcional posterior | El nivel lo fija el DM (progresión por hitos), que es como juega la mayoría y no cuesta nada |
| **Objetos, inventario, equipar** | **2B** | Alimentan el motor como fuentes de modificación, con lista cerrada de efectos |
| **Pantalla de tiradas, registro de tiradas, ventaja/desventaja como concepto, críticos y pifias, tablas del DM, reloj de campaña** | **2C** | 2A solo entrega el **evaluador**; 2C le pone pantalla, log, condiciones y reloj |
| **El efecto de la inspiración (conceder ventaja)** | **2C** | 2A entrega el contador que baja; la ventaja es un parámetro de la tirada |
| **Pantalla de elección de subclase** | Cuando haya homebrew (2B o después) | El SRD trae **una** subclase por clase: sería un menú de una opción. Se modela en los datos, no en la pantalla |
| **Mecánica de inspección / datos ocultos (P6)** | Después de 2C | Depende de la tirada |
| **Notificaciones y correo (P2), zona horaria por usuario** | **Después del despliegue** | Hoy no resuelven nada: la mesa es presencial y no hay servicio de correo |
| **Permisos por campo en la hoja (P3)** | Ver pregunta 6 | 2A entrega solo el caso estrecho: recursos `grantedBy: DM_ONLY` |
| **Dados con física (P8)** | Se evalúa al desplegar, con el diseño de pantallas | Decisión ya registrada del autor; es representación de un resultado que el servidor ya decidió |
| **Tiempo real (ver la tirada del otro en vivo)** | **Fase 4** | El sondeo se sustituye por un empujón sin cambiar el modelo |
| **Statblocks de NPC** | **2D opcional / Encuentros** | Solo si 2A–2C salen limpias |

**Y dos exclusiones dentro del propio motor, que son fáciles de olvidar:**

- **El motor no interpreta rasgos con condición o activación.** Furia, Ataque Furtivo, Oleada
  de Acción, Ki, Suerte, Resistencia Implacable, Ancestro Feérico: **se muestran como texto** al
  nivel que corresponde. Se automatizan **solo** aumentos de característica, velocidad, tamaño,
  visión en la oscuridad, competencias, dado de golpe y bonificador de competencia.
- **El motor no decide ventaja ni desventaja.** Nunca. Eso lo marca el DM, en 2C.

---

## 7 · Riesgos de esta fase, nombrados

1. **2A es grande y su valor solo se ve al final.** Las cuatro primeras tareas no pintan nada en
   pantalla. Mitigación: cada una es commiteable y probada por sí sola, y el orden pone lo
   arriesgado (el motor) antes que lo tedioso (los datos) y que lo visible (la pantalla).
2. **Se construye sobre una hoja que nadie ha usado.** El autor decidió no jugar hasta la fase
   3. Mitigación: la mirada de diez minutos al terminar 2A (§5.11).
3. **La transcripción del SRD es donde se cuela un número mal copiado sin que nada falle.**
   Mitigación: las invariantes de catálogo, y un commit por bloque para que el diff sea
   revisable.
4. **El modelo de estado de P1 es difícil de cambiar después.** Es la razón de pedir firma
   explícita antes de la tarea 5.5, y de que las tareas 5.1–5.4 vayan antes: se puede empezar la
   fase con el motor mientras la decisión de P1 se piensa.

---

## 8 · Lo que el autor tenía que responder — **contestado el 2026-09-02**

> **Las ocho están falladas** en
> [la parte 2, §1](./2026-09-02-fase-2A-parte-2-eventos-distancias-y-cierre.md), con su motivo y
> lo que cuesta si el fallo está mal. El autor autorizó decidir en su ausencia; se dejan aquí
> escritas tal cual se plantearon, porque **una pregunta bien formulada explica su respuesta**.

Ocho preguntas. Cada una se contesta con un **sí/no** o eligiendo una opción.

1. **¿Se aprueba el modelo de estado del §1?** Sesión con estado (`PLANNED`/`IN_PROGRESS`/
   `CLOSED`, **una sola en curso por campaña**, la cambia solo el DM) + estado actual en
   **columnas con tipo** + log `GameEvent` append-only al lado, que **nunca** es la fuente del
   estado. **Sí / No.**
2. **¿Se aprueba el modelo de concurrencia del §1.3?** Daño y curación como **deltas atómicos**
   (imposible perder una escritura) y **solo** las correcciones absolutas del DM con
   `expectedVersion` y **409**. **Sí / No.** *(Si no: se acepta "gana el último que escribe" y
   se anota como deuda.)*
3. **¿Las tiradas de características al crear personaje las ejecuta el servidor y quedan en el
   log, ya en 2A?** **Sí / No.** *(No = se tiran en el cliente y se confía; más barato hoy,
   contradice el spec.)*
4. **¿Dónde vive el catálogo SRD?** **(a) TypeScript versionado** (recomendado: el motor sigue
   puro, el diff es revisable) **/ (b) filas sembradas en Postgres**.
5. **PG al subir de nivel: ¿media fija por defecto, con la opción de tirar configurable por
   campaña?** **Sí / No.**
6. **Permisos por campo (P3): ¿se queda fuera de 2A**, entrando solo el caso estrecho de
   recursos que únicamente concede el DM (`grantedBy: DM_ONLY`), y se decide el mecanismo
   general en 2B? **Sí / No.**
7. **¿Se traducen al español los nombres y textos del SRD?** Es una adaptación permitida por
   CC BY 4.0 **indicando la modificación** en el aviso de atribución. **Sí / No.**
8. **¿Se acepta el compromiso de montar un personaje real y mirarlo diez minutos al terminar
   2A, antes de empezar 2B?** **Sí / No.**
