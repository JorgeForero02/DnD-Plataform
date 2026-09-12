# Reglas de la mesa — lo que el DM decide antes de que nadie haga su hoja

> Escrito el 2026-09-12 con el autor, al revisar producción (`6d2b2ca`): «faltan ajustes del DM
> antes de que cada jugador haga su hoja de personaje». Pedido explícito y repetido: **el DM decide
> si los puntos de característica se reparten a mano o se tiran con dados, qué dados y cuántos
> intentos**, y lo mismo para lo demás que en el manual se puede tirar (oro, puntos de golpe).
> Es **mecánica**, no pulido: entra con la cita del SRD 5.1 y sus e2e.
>
> Lo que dice «hoy» se comprobó abriendo los ficheros el 2026-09-12 sobre `main` (`f5b22e3`).

---

## 1 · Qué se pide, en una frase

Un bloque **«Reglas de la mesa»** en los ajustes de la campaña donde el DM fija, **antes de crear
personajes**, cómo se determinan las características, el nivel y los puntos de golpe iniciales, qué
razas, clases y subclases se permiten, y el oro o equipo inicial — con la opción, en cada cosa que
el manual permite tirar, de **dejarlo fijo o tirarlo con los dados que el DM diga y los intentos que
permita**; y una creación de personaje que **obedece esas reglas en el servidor**, con el azar
tirado por el servidor y **el resultado fijado** una vez elegido.

## 2 · Lo que hay hoy, medido

| Pieza | Estado real |
|---|---|
| **Características** | El dueño teclea seis números libres entre 1 y 30 (`abilityScoresSchema`, `character-build.schema.ts:9-16`; `PATCH …/sheet` con `abilities`; `Caracteristicas` en `IdentidadEditable.tsx`). Ninguna regla de reparto, ningún dado |
| **Nivel inicial** | `createCharacterSchema.level` 1..20 libre (`character.schema.ts:36`) |
| **PG por nivel** | Al subir de nivel el jugador tira o toma la media (`level-up`); al **crear** a nivel N no hay regla escrita para los niveles intermedios |
| **Razas/clases/subclases** | Todo el SRD ofrecido a todos (`useCatalog`, `CharacterEditor.tsx`) |
| **Oro y equipo inicial** | Bolsa a cero; el DM da objetos y monedas a mano (`inventory`, `changeMoney`) |
| **Ajustes de campaña** | `CampaignSettings.tsx` con `encumbranceVariant`, `rulesEnabled`, `houseTablesEnabled`; `updateCampaignSchema` en `campaign.schema.ts`. **El sitio ya existe** |
| **El azar** | `rolls.service` tira y escribe antes de devolver; `dice/` evalúa expresiones (`4d6kh3` ya vale) |

## 3 · Las reglas del manual, y qué opción da cada una

Todo del SRD 5.1, cap. *Beyond 1st Level* y *Equipment*, más la sección *Determine Ability Scores*
de la creación de personaje. Cita verificada en inglés; va en el commit.

| Regla | Lo que el SRD dice | Opciones que el DM elige |
|---|---|---|
| **Características** | *«Roll four 6-sided dice and record the total of the highest three dice»* seis veces, **o** la matriz estándar *15, 14, 13, 12, 10, 8*, **o** la variante *Customizing Ability Scores*: **27 puntos**, valores 8–15 con coste 0/1/2/3/4/5/7/9 | `LIBRE` (como hoy) · `MATRIZ` · `PUNTOS` (27) · `DADOS` con expresión (por defecto `4d6kh3`, el DM puede poner `3d6`, `1d20`, `2d10`…), **N intentos** (1 por defecto), y si los seis valores se **asignan libremente** o van en orden FUE→CAR |
| **Nivel inicial** | Implícito: la campaña empieza donde diga el DM | Nivel 1..20; los personajes nuevos nacen a ese nivel con sus elecciones pendientes |
| **PG iniciales** | Nivel 1: máximo del dado + CON. Niveles siguientes: *«roll the Hit Die… or use the fixed value»* (la media redondeada arriba) | Para niveles 2..N al crear: `MAXIMO` · `MEDIA` · `TIRADA` (el servidor tira por nivel y lo escribe) |
| **Razas / clases / subclases** | El DM decide qué existe en su mundo | Lista permitida por tipo; vacía = todo el SRD |
| **Oro inicial** | *Starting Wealth by Class*: bárbaro 2d4×10, bardo 5d4×10, clérigo 5d4×10, druida 2d4×10, guerrero 5d4×10, monje 5d4, paladín 5d4×10, explorador 5d4×10, pícaro 4d4×10, hechicero 3d4×10, brujo 4d4×10, mago 4d4×10 | `EQUIPO` (nada de oro; el DM da el equipo de clase a mano, como hoy) · `ORO_TABLA` (el servidor tira la expresión de la clase) · `ORO_FIJO` (cantidad que el DM escribe) |

**Principio general del autor:** «todo lo que se puede decidir con dados, el DM puede dar esa
opción, escoger qué dados y cuánto, o dejarlo fijo». El esquema lo recoge como una forma única:

```ts
// packages/shared/src/table-rules.schema.ts
export const tiradaOFijoSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("FIJO"), valor: z.number().int().min(0) }),
  z.object({ modo: z.literal("DADOS"), expresion: diceExpressionSchema, intentos: z.number().int().min(1).max(10).default(1) }),
]);
```

## 4 · El dato

Columna nueva en `Campaign`: **`tableRules Json`** con default `{}`, validada por
`tableRulesSchema` en `@dnd/shared`:

```ts
export const tableRulesSchema = z.object({
  abilities: z.discriminatedUnion("metodo", [
    z.object({ metodo: z.literal("LIBRE") }),
    z.object({ metodo: z.literal("MATRIZ") }),                 // 15 14 13 12 10 8
    z.object({ metodo: z.literal("PUNTOS"), puntos: z.number().int().min(15).max(40).default(27) }),
    z.object({
      metodo: z.literal("DADOS"),
      expresion: diceExpressionSchema.default("4d6kh3"),      // el DM elige el dado
      intentos: z.number().int().min(1).max(10).default(1),   // «los que permita el DM»
      asignacionLibre: z.boolean().default(true),             // false = en orden FUE DES CON INT SAB CAR
    }),
  ]).default({ metodo: "LIBRE" }),
  nivelInicial: z.number().int().min(1).max(20).default(1),
  pgNivelesSiguientes: z.enum(["MAXIMO", "MEDIA", "TIRADA"]).default("MEDIA"),
  permitidos: z.object({
    razas: z.array(z.string()).default([]),      // vacío = todas
    clases: z.array(z.string()).default([]),
    subclases: z.array(z.string()).default([]),
  }).default({}),
  oroInicial: z.discriminatedUnion("modo", [
    z.object({ modo: z.literal("EQUIPO") }),
    z.object({ modo: z.literal("ORO_TABLA") }),               // la expresión la da la clase (SRD)
    z.object({ modo: z.literal("ORO_FIJO"), cantidadPo: z.number().int().min(0) }),
  ]).default({ modo: "EQUIPO" }),
});
```

`LIBRE` por defecto en todo: **las campañas que existen no cambian de comportamiento**. Sin
migración de datos: una columna Json con default.

Y una tabla nueva para que el azar quede escrito y **no se pueda repetir a escondidas**:

```
model AbilityRollAttempt {
  id           String   @id @default(cuid())
  characterId  String
  values       Json     // los seis totales, en el orden en que salieron
  rollEventIds Json     // las seis tiradas del servidor (ABILITY_ROLL), para la traza
  chosen       Boolean  @default(false)
  createdAt    DateTime @default(now())
}
```

## 5 · La creación de personaje obedece en el servidor

- **`POST /campaigns/:id/characters`**: `level` **se ignora y se pone `nivelInicial`**; `raceKey`,
  `classKey`, `subclassKey` fuera de `permitidos` → 400 con el nombre legible de lo que no se
  permite. Un personaje que ya existe no se toca si el DM cambia la regla después (la regla es
  para los que nacen; lo dice el texto del ajuste).
- **Características**, según `abilities.metodo`:
  - `LIBRE`: como hoy.
  - `MATRIZ`: los seis valores enviados deben ser **una permutación exacta** de 15/14/13/12/10/8
    → si no, 400.
  - `PUNTOS`: cada valor 8..15 y `Σ coste(valor) ≤ puntos` con la tabla del SRD → si no, 400 con el
    coste calculado.
  - `DADOS`: **`POST …/characters/:id/ability-rolls`** tira `expresion` seis veces en el servidor
    (seis `ABILITY_ROLL` con `label: "Característica"`, audiencia DM + dueño), guarda el
    `AbilityRollAttempt`, y devuelve los seis; **rechaza con 409 el intento N+1**. Después el
    dueño manda `PATCH …/sheet` con `abilities` **y `attemptId`**: el servidor comprueba que los
    seis valores son exactamente los del intento (permutación si `asignacionLibre`, orden fijo si
    no), marca `chosen` y **a partir de ahí las características quedan fijadas**: un `PATCH` sin
    `attemptId` que las cambie → 400 «las características se fijaron con dados». El DM sí puede
    anularlas (`overrides`, con motivo), que es la puerta que ya existe para arbitrar.
- **PG al crear a nivel N > 1**: el servidor calcula nivel 1 al máximo y los N−1 restantes según
  `pgNivelesSiguientes` (`TIRADA` = N−1 tiradas del dado de golpe, escritas), y siembra
  `maxHp`/recursos como ya hace `level-up` en su transacción — **se reutiliza esa siembra**, no se
  copia.
- **Oro inicial**: en la misma transacción de crear, `ORO_TABLA` tira la expresión de la clase
  (tabla del §3, en `rules/catalog/classes.ts` como `startingGold`) y escribe la bolsa;
  `ORO_FIJO` escribe la cantidad; `EQUIPO` no hace nada (el DM sigue dando objetos a mano —
  sembrar el «equipo de clase» del SRD es paso 3, cuando el catálogo tenga los paquetes).
- **Todo lo tirado deja su suceso** en el hilo de la campaña, visible para DM y dueño: la traza de
  cómo nació un personaje es parte de su historia.

## 6 · Pantalla

**Ajustes de campaña · bloque «Reglas de la mesa»** (solo DM), debajo de la variante de
sobrecarga, con el mismo patrón: cada regla es un grupo de **radios con su frase** (regla de
interfaz: opciones con significado no van en desplegable):

- Características: «Libres — cada jugador escribe sus seis números» · «Matriz estándar — 15, 14,
  13, 12, 10 y 8, repartidos como quieran» · «Compra por puntos — 27 puntos entre 8 y 15» · «Con
  dados — el servidor tira [expresión] [N] veces; los jugadores eligen un intento» con campo de
  expresión (validada al vuelo con `dice/`), intentos, y el interruptor «asignan libremente».
- Nivel inicial (número) · PG de los niveles siguientes (tres radios).
- Permitidos: tres listas de casillas con nombres legibles del catálogo; vacío = todo.
- Oro inicial: tres radios; con `ORO_FIJO` un campo.
- Un aviso fijo: «Estas reglas valen para los personajes que se creen a partir de ahora».

**Creación de personaje** (`CharacterEditor`): lee `tableRules` y pinta **solo lo que la regla
permite**: la matriz como seis desplegables que se agotan; la compra por puntos con el contador
«27 − gastados» y el coste de cada valor al lado (como Fallout/Divinity, en palabras del autor);
los dados con un botón «Tirar características» que enseña los seis dados con su cara (la bandeja
de dados del pulido, #11) y «intento 1 de N», «Quedarme con este»; razas/clases fuera de la lista
**no se ofrecen**, y un valor guardado que ya no se permite se muestra marcado y no seleccionable
(regla de interfaz). Un método que no sea `LIBRE` **bloquea la edición manual** de las seis
casillas de la hoja y lo dice.

## 7 · Seguridad

| Puerta | Quién | Demostración |
|---|---|---|
| Cambiar `tableRules` | DM (`requireDM`) | e2e: jugador → 403 |
| Tirar características | dueño del personaje o DM; **el servidor tira** | e2e: intento N+1 → 409; valores que no son del intento → 400 |
| Fijar tras elegir | servidor | e2e: `PATCH abilities` después de `chosen` → 400; `overrides` del DM sigue funcionando |
| Permitidos | servidor | e2e: crear con clase no permitida → 400 aunque el cliente la mande |

## 8 · Pruebas

Unitarias: `tableRulesSchema` (defaults, unión), coste de puntos (tabla del SRD, 8→0 … 15→9),
permutación de la matriz, PG por nivel en los tres modos, oro por clase. e2e API: los de §7 + «con
`4d6kh3` y 2 intentos, el segundo intento devuelve seis valores distintos y el tercero 409».
Navegador: un recorrido DM fija «dados, 3d6, 2 intentos» → jugador tira, ve seis dados con sus
caras, elige el segundo intento, y la hoja deriva con esos números y **no deja editarlos**.

## 9 · Lo que NO entra

- Sembrar el **equipo de clase** del SRD (paquetes): paso 3, con el catálogo completo.
- Cambiar las reglas a personajes ya creados (retroactivo): se dice en pantalla y no se hace.
- Dotes, multiclase, trasfondos: fuera (decisiones anteriores).
- Los dados 3D: aplazados por el autor; la bandeja 2D del pulido es la que enseña las caras.

## 10 · Decisiones

| Decisión | Elegido | Descartado |
|---|---|---|
| Dónde vive la regla | `Campaign.tableRules` Json con esquema en shared, default `LIBRE` en todo | columnas sueltas (una migración por regla) |
| Quién tira | el servidor, con `AbilityRollAttempt` escrito y tope de intentos | el cliente manda los números «tirados» (no verificable) |
| Fijación | tras elegir un intento, las seis quedan fijadas; el DM arbitra con `overrides` | dejar editar (rompe el sentido de tirar) |
| Alcance | los cinco ajustes del §3 | equipo de clase (paso 3) |

## 11 · Cuándo y tamaño

Después del pulido, antes de la puerta de efectos (D-CF-52, orden del autor). **Modular**: no toca
`character-sheet/pestanas/` ni `inventory/`; toca `campaigns/` (ajustes), `characters/` (crear,
`PATCH abilities`), `rules/catalog/classes.ts` (`startingGold`), `dice/`. Estimado: **6 tareas,
una sesión**. Su plan se escribe con `writing-plans` cuando el autor apruebe esta spec.
