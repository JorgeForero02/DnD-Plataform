# Paso 2 · La actividad y la economía de acciones — plan de implementación

> **Para quien lo ejecute:** SUB-SKILL OBLIGATORIA: `superpowers:subagent-driven-development`
> (recomendada) o `superpowers:executing-plans`, tarea a tarea.

**Objetivo:** construir **dónde se gastan las cosas** (la economía de acciones, que hoy no existe) y
**el molde de lo que una cosa hace** (la actividad, cinco tipos), para que el catálogo del paso 3
sea un mapeo y no un remodelado.

**Arquitectura:** una tabla que ya existe gana columnas (`Combatant` cuenta acciones); un vocabulario
nuevo vive **una sola vez** en `packages/shared/src`; y la ejecución **reutiliza la maquinaria que ya
está construida y probada** — recursos, peticiones de tirada, condiciones con caducidad, `changeHp`
y la traza. **Lo que falta es el pegamento y el vocabulario, no la maquinaria.**

**Stack:** NestJS + Prisma + Zod compartido · React + React Query + Vitest/RTL · Playwright.

**Spec:** [`docs/superpowers/specs/2026-09-05-paso-2-actividad-design.md`](../specs/2026-09-05-paso-2-actividad-design.md)

> **Y su precursor, que NO es un modelo rival:**
> [`2026-09-05-conjuros-design.md`](../specs/2026-09-05-conjuros-design.md) es el documento que unió
> conjuros y aptitudes en un solo problema —«los dos son algo que un personaje puede hacer, que
> gasta un recurso, que elige objetivo, que tira o pide una tirada»— y que **dejó a propósito sin
> decidir cuántas actividades entran**, porque eso tocaba después de auditar. La spec de arriba es
> quien lo contesta: **cinco**. Si los dos documentos parecen decir cosas distintas, manda la del
> paso 2; el otro se lee para saber por qué el problema tiene esta forma.

---

## Lo que hay que tener claro antes de la primera línea

**1 · No hay ni un conjuro, y este plan no los añade.** Los 320 del SRD son el paso 3. Aquí se
construye el molde y se demuestra **con lo único que hay: las aptitudes de clase**. Un mago seguirá
sin hechizos al terminar este plan, y eso es correcto: sin el molde no habría dónde meterlos.

**2 · Las dos decisiones del autor, tomadas el 2026-09-06:**
- **Cinco actividades, separadas.** `prueba` y `salvación` **no se funden**, aunque las dos sean
  «alguien tira contra una CD»: el SRD las distingue y **fundir vocabulario cerrado es difícil de
  deshacer**.
- **El servidor cuenta y avisa; no impide.** Si alguien gasta dos acciones, la pantalla lo dice y
  **el DM decide**. Bloquear sería el servidor arbitrando la mesa, que es lo que este proyecto ya se
  negó a hacer con el bando y con el fin del combate.

**3 · Depende del paso 1.** La tarea 10 del paso 1 —crear un recurso desde la aplicación— es la
puerta de `uses`. **Sin ella, una fila «Furia» no puede existir** y la tarea 9 de aquí no se puede
demostrar. Si el paso 1 no está, empieza igual por las tareas 1 a 8: no la tocan.

**4 · Se diseña con el YAML de Foundry abierto al lado** (`Mine/referencia-foundry-dnd5e`,
**carpetas SIN sufijo `24`** — las de `24` son las reglas de 2024 y este proyecto es SRD 5.1).
Donde un campo nuestro haga lo mismo que uno suyo, **se llama igual**: `activation`, `consumption`,
`target`, `range`, `duration`, `uses`, `effects`. Cuesta cero y hace del paso 3 un mapeo.

**5 · Nada de fórmulas en texto.** Una fórmula evaluada **no deja pasos**, y la traza es lo mejor que
tiene este proyecto. Su propio `simplifyBonus` (`module/utils.mjs:561-572`) **devuelve 0 en
silencio** cuando algo no evalúa — y con el `catch` roto encima. Un fallo de evaluación convertido en
un número creíble es exactamente lo que aquí no puede pasar.

---

## Tarea 0 · Los diez conjuros, antes de fijar el molde · aprobada el 2026-09-06

**No estaba en la spec: la propuso la sesión de acompañamiento y el autor la aprobó.** Va **antes**
de escribir el esquema definitivo de la actividad (tareas 5 y 6), y es media jornada.

**No importa ningún conjuro.** No toca el catálogo, no añade nada al proyecto y no adelanta el
paso 3: es un mapeo **a mano, sobre papel**, para comprobar que la forma aguanta antes de fijarla.
Al terminar, el proyecto sigue teniendo **cero hechizos**, que es lo correcto.

**Qué se coge**, de `Mine/referencia-foundry-dnd5e/packs/_source/spells/` —**carpeta SIN sufijo
`24`**, que las de `24` son las reglas de 2024—: diez conjuros elegidos para que duelan.

| Cuántos | Cuáles, y qué ponen a prueba |
|---|---|
| 5 | uno de cada actividad: `ataque` · `salvación` · `dados` · `utilidad` · `prueba` |
| 1 | con **concentración** — que la duración y el efecto que deja caben |
| 1 | que **escala con el nivel de espacio** — el origen `escala` de la tarea 4 |
| 1 | de los **21 que caen fuera** de las cinco actividades — que se importa con su texto y no rompe nada |
| 1 | con **usos propios** — que `uses` es `CharacterResource` y no una tabla nueva |
| 1 | con **materiales con coste** — el campo que nadie recuerda hasta que falta |

**El criterio de éxito y el de fracaso, escritos antes de empezar:**

- **Si los diez entran sin inventar campos**, la forma aguanta y los 320 del paso 3 entrarán.
- **Si dos no entran, PARA.** Escribe qué no encajó, corrige el esquema, y solo entonces sigue.
  Descubrirlo aquí cuesta media jornada; descubrirlo en el paso 3 cuesta una migración del catálogo
  entero.

- [ ] **Paso 1** · Elige los diez y anótalos con su ruta de fichero.
- [ ] **Paso 2** · Mapea cada uno contra el borrador, campo a campo, en el bloque «Avance».
- [ ] **Paso 3** · Escribe el veredicto: cuántos entraron tal cual, cuáles obligaron a cambiar el
      esquema y qué se cambió.
- [ ] **Paso 4 · Commit** — solo documentación, **ni una línea de código**.

```bash
git add docs
git commit -m "docs(plans): ten spells mapped by hand before the activity shape is fixed"
```

> **No commitees YAML de Foundry.** Vive fuera del repositorio a propósito, su código no se ejecuta
> nunca, y lo que se conserva aquí es **lo aprendido**, no sus ficheros.

---

## Restricciones globales

- **La forma de los datos vive una sola vez**, en `packages/shared/src`.
- **La validación es Zod desde `@dnd/shared`** vía `ZodValidationPipe`. Ningún DTO a mano.
- **La autorización se comprueba en el servidor.** `canView` es el dueño único de «quién ve qué».
- **Ningún valor de enumeración llega a la pantalla.**
- **Un valor de enum de PostgreSQL se añade, nunca se edita ni se borra.**
- **Una transacción se abre con `PrismaService.transaction`, nunca con `$transaction`.**
- **Código en inglés; interfaz y documentación en español.**
- **Un commit por tarea**, mensaje en inglés (Conventional Commits).
- **La cita del SRD en inglés va en el commit** de toda tarea que decida una regla.
- **Verificación por mutación obligatoria** en cada tarea.
- **Si tocas una pantalla, abres el navegador.** `jsdom` no maqueta.
- **Una sola tanda de Playwright en esta máquina**, y no compiles la API mientras corre.
- **NO se abren fichas nuevas** sin recorrer los cuatro pasos: ¿cambio rápido y duradero? →
  ¿cumple el SRD y el código que ya hay? → ¿lo contesta la fuente en internet? → **solo entonces**
  ficha. Y no se pregunta al autor lo que las reglas o el código ya contestan.

---

---

## Lo que compartes con la otra sesión, medido fichero a fichero

**El plan del botín (`2026-09-06-botin-y-reparto-plan.md`) corre a la vez que este.** Se comprobó
extrayendo las rutas de los dos planes y cruzándolas: **coincidís en exactamente dos ficheros de
código**, y en los tres documentos que se generan solos.

| Fichero | Tú escribes | La otra sesión escribe | Cómo se resuelve |
|---|---|---|---|
| `apps/api/prisma/schema.prisma` | columnas en `model Combatant` | un campo en `model DmTableEntry` | Modelos distintos y lejanos en el fichero: git los fusiona. **Cada uno crea SU migración**; el orden lo dan las marcas de tiempo y no chocan |
| `packages/shared/src/game-event.schema.ts` | el suceso de gastar | el del reparto | **Un enum solo CRECE: añade al final y no reordenes.** Si hay conflicto es de una línea |
| `docs/00-INDEX.md` · `docs/08-pruebas.md` | los genera `pnpm update:estado` | ídem | **Van a chocar seguro**: llevan el hash del commit dentro. **No se resuelven a mano**: al fusionar se acepta cualquiera de los dos y se ejecuta `pnpm update:estado` otra vez |
| `docs/06-pendientes.md` · `07-historial.md` · `decisiones.md` | añades al final | ídem | Conflicto de añadido, trivial |

**Lo que NO compartes**: `src/activities`, `rules/catalog`, `origen`/`activity`/`action-economy`,
`web/character-sheet` y `web/encounters` son solo tuyos; `dm-tables`, `inventory`,
`web/features/inventory` y `web/sessions/elenco` son solo suyos.

**Y dos cosas de máquina que sí os pisan aunque los ficheros no:**

- **Una sola tanda de Playwright en toda la máquina.** Avisa antes de lanzarla y espera si la otra
  sesión está corriendo. Dos a la vez dieron **82 fallos falsos**.
- **La memoria.** El gancho de pre-commit corre `pnpm verify` **entero** —compila los tres paquetes—
  y dos a la vez con sendos servidores de desarrollo levantados **han tumbado un commit por falta de
  memoria** en esta misma máquina, el 2026-09-06. Si vas a commitear y sabes que la otra sesión está
  compilando, **espera treinta segundos**; es más barato que repetir el commit.

## Los ficheros, y de qué responde cada uno

| Fichero | Qué responde |
|---|---|
| `apps/api/prisma/schema.prisma` (`model Combatant`, línea 424) | Las cuatro cuentas del turno. Tarea 1 |
| `packages/shared/src/action-economy.schema.ts` **(nuevo)** | El vocabulario de lo que se gasta. Tarea 1 |
| `apps/api/src/encounters/encounters.service.ts` | Reponer al empezar el turno, y gastar. Tareas 1 y 2 |
| `apps/web/src/features/encounters/EconomiaDeAcciones.tsx` **(nuevo)** | Qué te queda, y el aviso. Tarea 3 |
| `packages/shared/src/origen.schema.ts` **(nuevo)** | De dónde sale un número. Tarea 4 |
| `packages/shared/src/activity.schema.ts` **(nuevo)** | La forma común y los cinco tipos. Tareas 5 y 6 |
| `apps/api/src/activities/activities.service.ts` **(nuevo)** | Ejecutar una actividad. Tarea 7 |
| `apps/api/src/rules/catalog/types.ts` y `resolve.ts` | `subclassKey`, conceder y escalar. Tareas 8, 9, 10 |
| `apps/api/src/rules/catalog/classes.ts` | La Furia, con sus usos y su escala. Tarea 11 |

## Orden

```
1 → 2 → 3        la economía: modelo, servicio, pantalla
4 → 5 → 6 → 7    la actividad: origen, forma, cinco tipos, ejecución
8 → 9 → 10       las mejoras de nivel (8 arregla un fallo real y va antes)
11               la Furia de punta a punta, que es la prueba de que todo encaja
12               documentación y cierre
```

**Las tareas 1-3 y 4-7 no comparten un solo fichero** y pueden ir en paralelo. **La 8 arregla un
fallo vivo** —hoy un bárbaro de nivel 3 tiene los rasgos de todos los caminos a la vez— así que si
solo da tiempo a una del bloque tercero, es esa.

---

## Tarea 1 · El combatiente cuenta lo que gasta

`model Combatant` (`apps/api/prisma/schema.prisma:424-435`) tiene `id`, `encounterId`,
`characterId`, `initiative`, `groupKey`, `position`, `side`. **Nada que cuente acciones.**

**Esto reordena el diagnóstico entero:** que las aptitudes de clase sean decorativas no es el
problema; el problema es que **no hay dónde gastarlas**. «Acción impetuosa te da una acción extra»
no significa nada si no hay acciones que contar. **Modelar actividades sin esto es construir grifos
sin tubería.**

**La reacción es el caso que se hace mal**, y hay que escribirlo bien a la primera: se repone **al
empezar TU turno**, no al final del turno anterior. Entre medias **no tienes**. Si se repone en el
sitio equivocado, un guerrero ataca de oportunidad dos veces por asalto.

**Ficheros:**
- Crear: `packages/shared/src/action-economy.schema.ts`
- Modificar: `apps/api/prisma/schema.prisma` (`model Combatant`)
- Crear: `apps/api/prisma/migrations/<timestamp>_combatant_action_economy/migration.sql`
- Modificar: `apps/api/src/encounters/encounters.service.ts` (`advanceTurn`)
- Prueba: `apps/api/src/encounters/encounters.service.spec.ts`

**Interfaces · produce:**
```ts
export const COSTES = ["ACTION", "BONUS", "REACTION", "MOVEMENT", "FREE"] as const;
export type Coste = (typeof COSTES)[number];

export interface EconomiaDelTurno {
  actionUsed: boolean;
  bonusUsed: boolean;
  reactionUsed: boolean;
  /** En pies, gastados de su velocidad. */
  movementUsed: number;
}
```
Las tareas 2, 3 y 7 la consumen.

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("al empezar su turno, el combatiente recupera acción, adicional y movimiento", async () => {
  await gastar(combatanteId, "ACTION");
  await gastar(combatanteId, "BONUS");
  await service.advanceTurn(dmId, campaignId, sessionId, encounterId); // le toca a él
  const c = await leerCombatiente(combatanteId);
  expect(c.actionUsed).toBe(false);
  expect(c.bonusUsed).toBe(false);
  expect(c.movementUsed).toBe(0);
});

it("la reacción se repone al empezar SU turno, no al final del turno anterior", async () => {
  await gastar(combatanteId, "REACTION");        // reacciona en el turno de otro
  await service.advanceTurn(dmId, campaignId, sessionId, encounterId); // turno del siguiente
  expect((await leerCombatiente(combatanteId)).reactionUsed).toBe(true); // SIGUE gastada

  await pasarTurnosHasta(combatanteId);          // vuelve a tocarle
  expect((await leerCombatiente(combatanteId)).reactionUsed).toBe(false);
});
```

**La segunda es la que importa.** Si la escribes al revés, el fallo se ve un mes después en una mesa
real y parece magia.

- [ ] **Paso 2 · Córrelas** — fallan: las columnas no existen.

- [ ] **Paso 3 · El modelo**

```prisma
  /// **La economía de acciones del turno en curso** (paso 2). Se repone al EMPEZAR el turno de
  /// este combatiente, no al terminar el anterior: entre medias no tienes reacción, y por eso
  /// puedes reaccionar una sola vez por asalto. Ponerlo en el sitio equivocado deja a un
  /// guerrero atacando de oportunidad dos veces.
  actionUsed   Boolean @default(false)
  bonusUsed    Boolean @default(false)
  reactionUsed Boolean @default(false)
  /// En pies. `0` = no se ha movido.
  movementUsed Int     @default(0)
```

- [ ] **Paso 4 · Reponer**, en `advanceTurn`, **dentro de la transacción que ya existe** y sobre el
      combatiente que **empieza**, no sobre el que termina.

- [ ] **Paso 5 · Córrelas** — pasan.
- [ ] **Paso 6 · Mutación** — repón la reacción al terminar el turno anterior: la segunda prueba se
      pone **roja**. Deshaz.
- [ ] **Paso 7 · Commit** — con la cita del SRD («Reactions»: *«you regain your reaction at the
      start of your turn»*).

```bash
git add packages/shared apps/api
git commit -m "feat(api): a combatant counts its action economy, and the reaction returns on its own turn"
```

---

## Tarea 2 · Gastar, y que el servidor lo cuente sin impedirlo

**La doctrina, ya impresa en las Herramientas del DM:** *«El sistema propone; tú decides.»* Si un
jugador usa dos acciones, **se registra, se avisa y se deja pasar** — hay decenas de rasgos que
regalan acciones y ninguno estará modelado el primer día.

**Ficheros:**
- Modificar: `apps/api/src/encounters/encounters.controller.ts` (la ruta)
- Modificar: `apps/api/src/encounters/encounters.service.ts` (el método)
- Modificar: `packages/shared/src/game-event.schema.ts` (el suceso)
- Modificar: `apps/web/src/features/sessions/hilo/tipo-de-mensaje.ts` y `linea-de-log.ts`
  **(su línea legible en español)**
- Prueba: `apps/api/src/encounters/encounters.service.spec.ts` y su e2e

**Interfaces · produce:**
```ts
/** `excedido` es TRUE cuando ya estaba gastado: se escribe igualmente. */
gastar(userId, campaignId, sessionId, encounterId, combatantId, { coste: Coste, cantidad?: number })
  : Promise<{ economia: EconomiaDelTurno; excedido: boolean }>;
```

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("gastar la acción la marca", async () => {
  const r = await service.gastar(jugadoraId, campaignId, sessionId, encId, cId, { coste: "ACTION" });
  expect(r.economia.actionUsed).toBe(true);
  expect(r.excedido).toBe(false);
});

it("gastarla dos veces AVISA pero no impide", async () => {
  await service.gastar(jugadoraId, campaignId, sessionId, encId, cId, { coste: "ACTION" });
  const r = await service.gastar(jugadoraId, campaignId, sessionId, encId, cId, { coste: "ACTION" });
  expect(r.excedido).toBe(true);              // avisa
  expect(r.economia.actionUsed).toBe(true);   // y no revienta
});

it("el movimiento se acumula y avisa al pasarse de su velocidad", async () => {
  await service.gastar(jugadoraId, campaignId, sessionId, encId, cId, { coste: "MOVEMENT", cantidad: 20 });
  const r = await service.gastar(jugadoraId, campaignId, sessionId, encId, cId, { coste: "MOVEMENT", cantidad: 20 });
  expect(r.economia.movementUsed).toBe(40);
  expect(r.excedido).toBe(true); // velocidad 30
});

it("un jugador no gasta por el combatiente de otro", async () => {
  await expect(
    service.gastar(jugadoraId, campaignId, sessionId, encId, combatanteDeOtro, { coste: "ACTION" }),
  ).rejects.toThrow(ForbiddenException);
});
```

**La segunda y la cuarta son las que definen la tarea:** avisa pero no impide, **y aun así autoriza**.
Que el servidor no arbitre las reglas no significa que no controle quién escribe.

- [ ] **Paso 2 · Córrelas** — fallan.
- [ ] **Paso 3 · La implementación.** La velocidad sale de la hoja derivada, que ya la calcula con su
      traza — **no la recalcules aquí**. El suceso se escribe **en la misma transacción**.

      > **Y su línea en español entra en ESTE commit, no después.** Un tipo de suceso nuevo sin su
      > forma legible es un valor de enumeración llegando a la pantalla, que es el fallo que este
      > proyecto vio **tres veces en una sola mañana** (`(LOCATION)`, `PUBLIC`, `Nuevo LOCATION`).
      > `tipo-de-mensaje.ts` decide de qué tipo es la línea del hilo y `linea-de-log.ts` la escribe;
      > las dos tienen prueba, y añadir un tipo sin tocarlas las pone rojas. **Esa es la red.**
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · Mutación** — haz que el segundo gasto lance en vez de avisar: la segunda prueba se
      pone **roja**. Deshaz. *(Esa mutación demuestra la decisión del autor, no solo el código.)*
- [ ] **Paso 6 · Commit**

```bash
git add packages/shared apps/api
git commit -m "feat(api): spending an action is counted and announced, never refused"
```

---

## Tarea 3 · La mesa enseña lo que te queda

**Ficheros:**
- Crear: `apps/web/src/features/encounters/EconomiaDeAcciones.tsx`
- Modificar: el panel de combate de la mesa que ya existe
- Crear: `apps/web/src/features/encounters/__tests__/EconomiaDeAcciones.test.tsx`
- Prueba de navegador: en la tanda del final

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```tsx
it("enseña acción, adicional, reacción y movimiento con su estado", () => {
  render(<EconomiaDeAcciones economia={{ actionUsed: true, bonusUsed: false, reactionUsed: false, movementUsed: 10 }} velocidad={30} />);
  expect(screen.getByText(/acción/i)).toBeInTheDocument();
  expect(screen.getByText("20 pies")).toBeInTheDocument();   // lo que le queda
});

it("cuando te pasas, lo dice y no bloquea nada", () => {
  render(<EconomiaDeAcciones economia={{ ...gastada, actionUsed: true }} velocidad={30} excedido />);
  expect(screen.getByText(/ya has usado tu acción/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /atacar/i })).toBeEnabled();
});
```

**La segunda es la regla del autor hecha prueba:** avisa, y el botón sigue vivo.

- [ ] **Paso 2 · Córrelas** — fallan.
- [ ] **Paso 3 · La implementación.** Los nombres legibles salen del **vocabulario del dominio**
      —ningún valor de enum llega a la pantalla— y **los iconos se dibujan**: SVG en trazo heredando
      `currentColor`, a `1em` si van dentro de una línea de texto. Nada de glifos ni emoji.
      **El color no significa estado por sí solo:** `--success` no existe y no se añade (D-OP-7);
      lo gastado se dice **con palabra**, y `--warning` como mucho refuerza.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · El navegador**, en la tanda del final: **atacar y ver bajar la acción a 390 px y a
      1280**, con `boundingBox` comprobando que la fila no se sale del ancho. `jsdom` no maqueta, y
      esta pantalla es una fila de cuatro cosas: es exactamente donde se rompe.
- [ ] **Paso 6 · Commit**

```bash
git add apps/web
git commit -m "feat(web): the table shows what is left of your turn, and says when you overspend"
```

---

## Tarea 4 · De dónde sale un número — el tipo `Origen`

**Aquí es donde nos separamos de Foundry, y conviene entender por qué antes de escribirlo.** Ellos
construyen las partes de un ataque **con nombre** —`mod`, `prof`, `weaponMagic`, `ammoMagic`
(`module/data/activity/attack-data.mjs:284-292`)— y luego **las tiran con un `.join(" + ")`**
(`:226`). **Están a una línea de tener nuestra traza y no la tienen.**

Donde ellos ponen `@mod` o `@prof`, nosotros ponemos **de dónde sale el número**:

```
fijo           un entero
modificador    de una característica
competencia    el bono de competencia
escala         una tabla por nivel     ← su ScaleValue, que sí merece copiarse
```

**Sale con nombre en la traza sin trabajo extra**, porque el motor ya sabe explicar cada uno.

**Ficheros:**
- Crear: `packages/shared/src/origen.schema.ts`
- Modificar: `apps/api/src/rules/engine.ts` (resolver un `Origen` a un `TraceStep`)
- Prueba: `apps/api/src/rules/engine.spec.ts`

**Interfaces · produce:**
```ts
export const origenSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("fijo"), valor: z.number().int() }),
  z.object({ tipo: z.literal("modificador"), ability: abilityKeySchema }),
  z.object({ tipo: z.literal("competencia") }),
  z.object({ tipo: z.literal("escala"), clave: z.string().min(1).max(60) }),
]);
export type Origen = z.infer<typeof origenSchema>;

/** Resuelve el origen y **deja su paso en la traza**. Nunca devuelve un número pelado. */
export function resolverOrigen(origen: Origen, ctx: ContextoDeDerivacion): { valor: number; paso: TraceStep };
```

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("un modificador sale con su nombre en la traza", () => {
  const { valor, paso } = resolverOrigen({ tipo: "modificador", ability: "str" }, ctx({ str: 16 }));
  expect(valor).toBe(3);
  expect(paso.labelKey).toBe("abilityMod.str");
});

it("la competencia sale del nivel, no de un número escrito a mano", () => {
  const { valor } = resolverOrigen({ tipo: "competencia" }, ctx({ level: 5 }));
  expect(valor).toBe(3);
});

it("una escala lee la tabla por nivel", () => {
  const { valor } = resolverOrigen({ tipo: "escala", clave: "rage-damage" }, ctx({ level: 9 }));
  expect(valor).toBe(3);
});

it("un origen desconocido NO devuelve cero en silencio", () => {
  expect(() => resolverOrigen({ tipo: "escala", clave: "no-existe" } as Origen, ctx({}))).toThrow();
});
```

**La cuarta es la lección de su `simplifyBonus`**, que devuelve 0 cuando algo no evalúa. **Un fallo
convertido en un número creíble es peor que una excepción.**

- [ ] **Paso 2 · Córrelas** — fallan.
- [ ] **Paso 3 · La implementación**, reutilizando los `TraceStep` que el motor ya emite.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · Mutación** — devuelve `0` en vez de lanzar cuando la escala no existe: la cuarta se
      pone **roja**. Deshaz.
- [ ] **Paso 6 · Commit**

```bash
git add packages/shared apps/api
git commit -m "feat: a number knows where it came from, and says so in the trace"
```

---

## Tarea 5 · La forma común de una actividad

`module/data/activity/base-activity.mjs:50-100` — **toda** actividad suya comparte lo mismo, y
nosotros usamos **sus nombres** (regla 6bis de la spec: cuesta cero y hace del paso 3 un mapeo):

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

**Y `uses` no se construye**: es `CharacterResource` (`schema.prisma:639-651`), que ya tiene
`current`, `max`, `resetOn` y `grantedBy`. **Es el `uses` de Foundry, ya construido y probado.**

**Ficheros:**
- Crear: `packages/shared/src/activity.schema.ts`
- Prueba: `packages/shared/src/__tests__/activity.schema.test.ts`

**Interfaces · produce:** `actividadBaseSchema` con esos ocho campos, `activation` apuntando a
`Coste` de la tarea 1 y `consumption` a la clave de un `CharacterResource`.

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("una actividad declara qué cuesta y qué gasta", () => {
  const a = actividadBaseSchema.parse({
    activation: { coste: "BONUS" },
    consumption: [{ recurso: "rage", cantidad: 1 }],
    description: "Entras en furia.",
  });
  expect(a.activation.coste).toBe("BONUS");
});

it("una actividad sin descripción NI mecánica se rechaza", () => {
  expect(() => actividadBaseSchema.parse({ activation: { coste: "ACTION" } })).toThrow();
});
```

**La segunda es la invariante que salva el paso 3:** un conjuro importado sin mecánica **tiene que
traer su texto**, o no queda nada que importar.

- [ ] **Paso 2 · Córrelas** — fallan.
- [ ] **Paso 3 · El esquema.** Con `.refine` para la segunda.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · Commit**

```bash
git add packages/shared
git commit -m "feat(shared): an activity has a shape, and it borrows Foundry's field names"
```

---

## Tarea 6 · Las cinco actividades

**Cinco, y separadas — decisión del autor del 2026-09-06.** Cada tipo **añade un solo campo**, igual
que en su código: `heal-data.mjs:15-21` es literalmente `{ ...super.defineSchema(), healing: new
DamageField() }`. **`healing` usa el MISMO campo que el daño**, así que fundir daño y curación no es
una simplificación nuestra: **en su código ya son lo mismo.**

| Actividad | Añade | Cubre del SRD 5.1 |
|---|---|---|
| **`ataque`** | contra qué CA, con qué bono | 18 conjuros, todas las armas, la cimitarra del goblin |
| **`salvación`** | qué característica, contra qué CD, qué pasa si salva | **112 conjuros** |
| **`dados`** | una expresión con su tipo, positiva o negativa | daño y curación, **fundidas** |
| **`utilidad`** | nada mecánico: deja un efecto o un texto | **198 conjuros**, la Furia, el Impulso |
| **`prueba`** | qué característica y contra qué CD | 13 conjuros, forcejeos y empujones |

**Fuera quedan** `summon`, `teleport`, `transform`, `enchant`, `forward`, `order`, `cast` y `check`:
piden tablero o criaturas nuevas, que es la fase 3.

**Ficheros:** `packages/shared/src/activity.schema.ts` y su test.

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("los cinco tipos, y ninguno más", () => {
  expect(TIPOS_DE_ACTIVIDAD).toEqual(["ataque", "salvacion", "dados", "utilidad", "prueba"]);
});

it("`dados` funde daño y curación con el signo", () => {
  const cura = actividadSchema.parse({ tipo: "dados", ...base, dados: { n: 2, caras: 4, bonus: { tipo: "modificador", ability: "wis" }, signo: 1 } });
  const dano = actividadSchema.parse({ tipo: "dados", ...base, dados: { n: 8, caras: 6, signo: -1, tipoDeDano: "fire" } });
  expect(cura.dados.signo).toBe(1);
  expect(dano.dados.tipoDeDano).toBe("fire");
});

it("el bonus de una expresión es un Origen, NUNCA una cadena", () => {
  expect(() =>
    actividadSchema.parse({ tipo: "dados", ...base, dados: { n: 1, caras: 6, bonus: "@mod + 2" } }),
  ).toThrow();
});
```

**La tercera es la frontera con Foundry, escrita como prueba.** Si un día alguien mete una cadena
evaluable, esa prueba se pone roja y le explica por qué.

- [ ] **Paso 2 · Córrelas** — fallan.
- [ ] **Paso 3 · Los cinco esquemas**, como unión discriminada por `tipo`, cada uno añadiendo **un
      campo** sobre `actividadBaseSchema`.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · Commit**

```bash
git add packages/shared
git commit -m "feat(shared): five activities, and damage and healing are the same field"
```

---

## Tarea 7 · Ejecutar una actividad, reutilizando lo que ya existe

**Esta tarea no construye mecánica nueva: la conecta.** Lo que la actividad necesita ya está:

| Necesita | Ya existe |
|---|---|
| `uses` | `CharacterResource`, con `resetOn` |
| gastar un espacio de conjuro | los espacios **son** recursos |
| `save` con su CD | la **petición de tirada**, con `dc` y clave de hoja |
| la CD de un conjuro | `spellSaveDc`, derivada con traza (`apps/api/src/rules/engine.ts:333`) |
| el bono de ataque mágico | `attack.spell` (`engine.ts:342`) |
| `effects[]` que duran | condiciones con caducidad derivada al leer |
| el daño y la curación | `changeHp`, con su traza y su suceso |

**Ficheros:**
- Crear: `apps/api/src/activities/activities.service.ts`, `.controller.ts`, `.module.ts`
- Prueba: `apps/api/src/activities/activities.service.spec.ts`
- Prueba e2e: `apps/api/test/actividades.e2e-spec.ts`

**Interfaces · consume:** `Coste` (tarea 1), `gastar` (tarea 2), `Origen` y `resolverOrigen`
(tarea 4), los cinco esquemas (tarea 6).

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("usar una actividad gasta su coste y su recurso, en la misma transacción", async () => {
  await service.usar(jugadoraId, campaignId, personajeId, "rage");
  expect((await recurso("rage")).current).toBe(1);           // de 2
  expect((await combatiente()).bonusUsed).toBe(true);
});

it("sin usos, avisa y NO gasta la acción adicional", async () => {
  await vaciarRecurso("rage");
  const r = await service.usar(jugadoraId, campaignId, personajeId, "rage");
  expect(r.aviso).toMatch(/sin usos/i);
  expect((await combatiente()).bonusUsed).toBe(false);
});

it("una actividad de salvación crea la petición de tirada con su CD", async () => {
  const r = await service.usar(dmId, campaignId, pnjId, "aliento-de-fuego", { objetivos: [magaId] });
  const [peticion] = await peticionesDe(magaId);
  expect(peticion.dc).toBe(r.cd);
  expect(peticion.key).toBe("save.dex");
});

it("una actividad de dados con signo positivo CURA, por la puerta de siempre", async () => {
  const antes = await pg(magaId);
  await service.usar(clerigoId, campaignId, clerigoPersonajeId, "curar-heridas", { objetivos: [magaId] });
  expect(await pg(magaId)).toBeGreaterThan(antes);
});
```

**La segunda distingue dos cosas que se confunden:** *avisar de que te pasaste de acciones* (sí se
deja pasar, tarea 2) no es lo mismo que *gastar un recurso que no tienes* (eso no se inventa: no hay
Furia que gastar). **Contar acciones es arbitrar; un contador vacío es aritmética.**

- [ ] **Paso 2 · Córrelas** — fallan.
- [ ] **Paso 3 · La implementación.** Todo lo que una actividad haga va **en una sola transacción**:
      gastar el uso, gastar el coste, aplicar el efecto y escribir el suceso. A medias no se queda.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · Mutación** — saca el gasto del recurso fuera de la transacción y haz fallar el
      efecto: la primera se pone **roja** con el recurso ya gastado. Deshaz.
- [ ] **Paso 6 · Commit**

```bash
git add apps/api
git commit -m "feat(api): an activity can be used, and it spends through the doors that already exist"
```

---

## Tarea 8 · `subclassKey` — un bárbaro deja de tener todos los caminos a la vez

**Arregla un fallo real y vivo.** Hoy `apps/api/src/rules/catalog/resolve.ts:339` recorre **todas**
las subclases de la clase y aplica sus rasgos por nivel. **No existe `subclassKey`** en el servidor,
ni en `shared`, ni en Prisma, y `chosenAtLevel` vive en el catálogo **y no lo mira nadie**.

**Un bárbaro de nivel 3 tiene hoy los rasgos de todos los caminos a la vez.**

**Ficheros:**
- Modificar: `apps/api/prisma/schema.prisma` (`Character.subclassKey`)
- Crear: la migración
- Modificar: `packages/shared/src/character.schema.ts` y `character-sheet.schema.ts`
- Modificar: `apps/api/src/rules/catalog/resolve.ts:339`
- Modificar: `apps/web` — el selector de subclase al nivel que toque
- Prueba: `apps/api/src/rules/catalog/resolve.spec.ts` + su test de web

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("un bárbaro Berserker de nivel 3 NO tiene los rasgos del Tótem", () => {
  const hoja = derivar({ classKey: "barbarian", subclassKey: "berserker", level: 3 });
  const claves = hoja.features.map((f) => f.key);
  expect(claves).toContain("frenzy");
  expect(claves).not.toContain("totem-spirit");
});

it("sin subclase elegida, no se aplica ninguna", () => {
  const hoja = derivar({ classKey: "barbarian", subclassKey: null, level: 3 });
  expect(hoja.features.map((f) => f.key)).not.toContain("frenzy");
});

it("y la hoja avisa de que falta elegir camino", () => {
  const hoja = derivar({ classKey: "barbarian", subclassKey: null, level: 3 });
  expect(hoja.warnings.map((w) => w.code)).toContain("subclass_not_chosen");
});
```

- [ ] **Paso 2 · Córrelas** — la primera **falla hoy en producción**.
- [ ] **Paso 3 · La columna, el esquema y el filtro** en `resolve.ts`, que pasa a mirar
      `subclassKey` y `chosenAtLevel` — **que ya está en el catálogo esperando a que alguien lo lea**.
- [ ] **Paso 4 · La pantalla:** elegir camino al nivel que toque. **Radios con explicación, no un
      desplegable** (`docs/04-convenciones.md`): son opciones con significado. **Un valor guardado
      que el selector no ofrezca se muestra marcado y no seleccionable.**
- [ ] **Paso 5 · Córrelas** — pasan.
- [ ] **Paso 6 · El navegador:** elegir camino y ver aparecer su rasgo en la hoja.
- [ ] **Paso 7 · Mutación** — quita el filtro por `subclassKey`: la primera se pone **roja**. Deshaz.
- [ ] **Paso 8 · Commit** — con la cita del SRD («Path of the Berserker», nivel 3).

```bash
git add apps/api apps/web packages/shared
git commit -m "fix: a character has one subclass, not all of them at once"
```

---

## Tarea 9 · `ItemGrant` — al nivel 1 ganas la Furia

**Es la que conecta el catálogo con el personaje.** Hoy una aptitud de clase es un `name` y un
`labelKey`: no concede nada.

**Ficheros:**
- Modificar: `apps/api/src/rules/catalog/types.ts` (el `kind` nuevo)
- Modificar: `apps/api/src/rules/catalog/resolve.ts`
- Prueba: `apps/api/src/rules/catalog/resolve.spec.ts`

**Interfaces · consume:** las actividades de la tarea 6.
**Produce:** una concesión `{ kind: "grant", actividad: Actividad, usos?: { max: Origen, resetOn } }`.

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("un bárbaro de nivel 1 recibe la Furia como actividad usable", () => {
  const hoja = derivar({ classKey: "barbarian", subclassKey: null, level: 1 });
  const furia = hoja.activities.find((a) => a.key === "rage");
  expect(furia?.activation.coste).toBe("BONUS");
});

it("y con sus usos por descanso largo", () => {
  const hoja = derivar({ classKey: "barbarian", subclassKey: null, level: 1 });
  expect(hoja.activities.find((a) => a.key === "rage")?.usos).toMatchObject({ max: 2, resetOn: "LONG_REST" });
});

it("un mago de nivel 1 NO recibe la Furia", () => {
  const hoja = derivar({ classKey: "wizard", subclassKey: null, level: 1 });
  expect(hoja.activities.find((a) => a.key === "rage")).toBeUndefined();
});
```

- [ ] **Paso 2 · Córrelas** — fallan.
- [ ] **Paso 3 · La implementación**, y **la siembra**: cuando una concesión trae usos, el recurso se
      crea por la misma puerta que la tarea 10 del paso 1 —`upsert` de `CharacterResource`—, no por
      una segunda.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · Mutación** — no siembres el recurso: la segunda se pone **roja**. Deshaz.
- [ ] **Paso 6 · Commit** — con la cita del SRD («Rage», bárbaro nivel 1: *bonus action*, 2 usos).

```bash
git add apps/api
git commit -m "feat(api): a class level can grant an activity, with its uses"
```

---

## Tarea 10 · `ScaleValue` — los números que suben con el nivel

**Evita escribir veinte filas por aptitud.** Es la tabla que resuelve el origen `escala` de la
tarea 4: «el daño de Furia sube con el nivel», «el Ataque furtivo sube a 2d6».

**Ficheros:**
- Modificar: `apps/api/src/rules/catalog/types.ts` y `classes.ts`
- Modificar: `apps/api/src/rules/engine.ts` (`resolverOrigen`, caso `escala`)
- Prueba: `apps/api/src/rules/engine.spec.ts`

- [ ] **Paso 1 · Escribe las pruebas que fallan**

```ts
it("el daño de Furia es +2 a nivel 1 y +3 a nivel 9", () => {
  expect(escala("rage-damage", 1)).toBe(2);
  expect(escala("rage-damage", 9)).toBe(3);
});

it("una escala se define por TRAMOS, no por veinte filas", () => {
  expect(TABLAS.get("rage-damage")).toHaveLength(3); // 1, 9, 16
});

it("pedir un nivel por debajo del primer tramo es un error, no un cero", () => {
  expect(() => escala("rage-damage", 0)).toThrow();
});
```

- [ ] **Paso 2 · Córrelas** — fallan.
- [ ] **Paso 3 · La implementación:** tramos `{ desde: nivel, valor }`, y se toma el mayor `desde`
      que no pase del nivel. **Y sale con su paso en la traza**, como todo origen.
- [ ] **Paso 4 · Córrelas** — pasan.
- [ ] **Paso 5 · Mutación** — devuelve `0` fuera de rango: la tercera se pone **roja**. Deshaz.
- [ ] **Paso 6 · Commit** — con la cita del SRD (tabla del bárbaro).

```bash
git add apps/api
git commit -m "feat(api): a value can scale with level, in bands and with its trace"
```

---

## Tarea 11 · La Furia, de punta a punta — la prueba de que todo encaja

**Esta es la tarea que demuestra el paso 2**, y se hace **sin un solo conjuro**: la Furia es
`utilidad` + `uses` + `escala` + una condición que dura, o sea las cuatro piezas a la vez.

**Lo que tiene que pasar en la mesa:** un bárbaro de nivel 3 pulsa **Furia**, se le gasta la acción
adicional y un uso, aparece su estado, **su daño cuerpo a cuerpo sube +2 con esa razón en la traza**,
y al descansar largo recupera los usos.

**Ficheros:**
- Modificar: `apps/api/src/rules/catalog/classes.ts` (la Furia, completa)
- Modificar: `apps/web/src/features/character-sheet/` (el botón de usar una actividad)
- Prueba e2e: `apps/api/test/furia.e2e-spec.ts`
- Prueba de navegador: `apps/web/e2e/furia.spec.ts`

- [ ] **Paso 1 · El recorrido completo, en e2e de API**

```ts
it("la Furia: se usa, gasta, suma daño con su traza y se repone al descansar", async () => {
  await usar(barbaroId, "rage");
  expect((await recurso(barbaroId, "rage")).current).toBe(1);
  expect((await combatiente(barbaroId)).bonusUsed).toBe(true);

  const golpe = await resolverAtaque(barbaroId, { attackKey: "greataxe", targetCharacterId: goblinId });
  expect(golpe.damage.total).toBe(baseSinFuria + 2);
  expect(JSON.stringify(golpe.damage.trace)).toMatch(/rage/);

  await descansoLargo(barbaroId);
  expect((await recurso(barbaroId, "rage")).current).toBe(2);
});
```

- [ ] **Paso 2 · Córrelo** — falla.
- [ ] **Paso 3 · Completa la Furia en el catálogo** con lo construido en las tareas 4 a 10.
      **Verifica cada número en el SRD en inglés** («Rage») y **pon la cita en el commit**: dura un
      minuto, se acaba si no atacas ni recibes daño en un asalto, no funciona con armadura pesada.
      **Lo que no puedas modelar, escríbelo en la descripción** — existir sin automatizarse es
      infinitamente mejor que no existir.
- [ ] **Paso 4 · Córrelo** — pasa.
- [ ] **Paso 5 · El botón**, en la hoja: usar la actividad, ver el uso bajar y el estado aparecer.
- [ ] **Paso 6 · El navegador**, en la tanda del final: el recorrido entero con dos pestañas — el
      bárbaro entra en furia y **el DM lo ve sin recargar**.
- [ ] **Paso 7 · Mutación** — quita el `+2` de la escala: la primera se pone **roja** en la línea del
      daño, no en la del recurso. Deshaz.
- [ ] **Paso 8 · Commit**

```bash
git add apps/api apps/web
git commit -m "feat: a barbarian can rage — the first feature that is not just a name"
```

---

## Tarea 12 · Documentación y cierre

- [ ] **Paso 1** · `docs/05-datos.md`: las cuatro columnas de `Combatant`, `subclassKey`, y que
      `uses` **es** `CharacterResource` y no una tabla nueva.
- [ ] **Paso 2** · `docs/01-arquitectura.md`: el módulo de actividades y por dónde entra.
- [ ] **Paso 3** · `docs/04-convenciones.md`: **las dos decisiones del autor** —cinco actividades
      separadas; el servidor cuenta y avisa pero no impide— y **la regla de que un número nunca es
      una cadena evaluable**, con el ejemplo de `simplifyBonus` para que no se reabra.
- [ ] **Paso 4** · `docs/06-pendientes.md`: tacha lo que esto cierre —empezando por «un bárbaro tiene
      todos los caminos a la vez»— y **abre ficha solo de lo que quedó fuera tras recorrer los cuatro
      pasos**.
- [ ] **Paso 5** · `docs/decisiones.md`: una línea por decisión, con enlace.
- [ ] **Paso 6** · `docs/07-historial.md`: la entrada. **Mira el tope de 1000 líneas antes.**
- [ ] **Paso 7** · `pnpm verify` en verde y el gancho corriendo.
- [ ] **Paso 8 · Commit**

```bash
git add docs
git commit -m "docs: the action economy exists, and an activity is a shape"
```

---

## Definición de terminado

`pnpm verify` en verde · **la tanda de Playwright corrida y mirada**, con la economía medida a 390 px
· **una mutación por tarea**, probada y deshecha · **las citas del SRD en inglés** en los commits de
las tareas 1, 8, 9, 10 y 11 · y **un bárbaro de nivel 3 que entra en furia en `dnd.supportive.pro`**,
que es la única prueba que le importa a la mesa.

## Lo que este plan NO hace

- **No añade ni un conjuro.** Son 320 y son el paso 3. Un mago sigue sin hechizos al terminar.
- **No mecaniza los 21 conjuros que caerán fuera de las cinco actividades**: se importarán con su
  texto y se leerán a mano.
- **No impide gastar de más.** Cuenta y avisa; decide el DM.
- **No toca el tablero.** `summon`, `teleport` y `transform` son la fase 3.
- **No copia el vencimiento de efectos de Foundry**, que es un cálculo vivo en el cliente del GM
  activo y resuelve una concurrencia entre navegadores **que un servidor no tiene** — su precio es
  que sin un GM conectado su sistema **se niega a romper concentración**
  (`module/documents/active-effect.mjs:793-797`). Nosotros derivamos al leer, como ya hacemos.

---

# Avance

Lo escribe el orquestador **al cerrar cada tarea**, no al final. Si una compactación se lleva la
sesión, se relee este bloque y `git log`, y se sigue por donde diga aquí.

## Tarea 0 · Los diez conjuros — HECHA (2026-09-06). **El esquema borrador NO aguantó.**

**Ocho de los diez obligaron a cambiar el esquema. Dos entraron tal cual.** El plan decía «si dos no
entran, para y corrige el esquema antes de escribir una línea de código», y eso es lo que se hizo:
las tareas 4, 5 y 6 se escriben ya contra el esquema corregido de abajo. **Descubrirlo aquí costó
una hora; descubrirlo en el paso 3 habría costado migrar el catálogo entero.**

### Los diez, con su ruta

| # | Qué ponía a prueba | Fichero (`Mine/referencia-foundry-dnd5e/packs/_source/`) | ¿Entró? |
|---|---|---|---|
| 1 | `ataque` | `spells/cantrip/fire-bolt.yml` | No — escalado de truco |
| 2 | `salvación` | `spells/3rd-level/fireball.yml` | No — escalado por espacio, CD de lanzamiento |
| 3 | `dados` (curación) | `spells/1st-level/cure-wounds.yml` | No — `bonus: '@mod'` |
| 4 | `utilidad` | `spells/1st-level/shield.yml` | No — falta la condición de la reacción |
| 5 | `prueba` | `spells/3rd-level/counterspell.yml` | No — `ability: spellcasting`, CD no derivable |
| 6 | concentración | `spells/1st-level/bless.yml` | No — duración y concentración; objetivos `@item.level + 2` |
| 7 | escala con nivel de espacio | `spells/1st-level/magic-missile.yml` | No — **ni Foundry lo modela** |
| 8 | fuera de las cinco | `spells/3rd-level/conjure-animals.yml` (`summon`) | **Sí** — entra como `utilidad` + texto |
| 9 | usos propios | `classfeatures/barbarian/barbarian-features/rage.yml` | **Sí** |
| 10 | materiales con coste | `spells/3rd-level/revivify.yml` | No — falta `materiales`; y su curación es fija |

> **El caso 9 no es un conjuro, y eso ya es un hallazgo.** Se buscó un conjuro del SRD con `uses`
> propios y **no existe ninguno**: en los 320 ficheros `uses.max` está vacío, porque lo que un
> conjuro gasta es un **espacio** (`consumption.spellSlot: true`), no un contador suyo. Los usos
> propios viven en las aptitudes, y por eso el caso se tomó de la Furia — que además es la tarea 11.
> **Confirma la decisión de la spec:** `uses` **es** `CharacterResource`, y la Furia lo demuestra sin
> un solo conjuro.

### Los nueve cambios al esquema, cada uno con el fichero que lo obligó

1. **`Origen` gana `lanzamiento`.** `cure-wounds` pone `healing.bonus: '@mod'` y `counterspell` pone
   `check.ability: spellcasting`: **un conjuro no puede nombrar una característica concreta**, porque
   depende de la clase de quien lo lanza. El borrador solo tenía `modificador` con `abilityKey`.
2. **`Origen` gana `nivelDeEspacio`.** `bless` declara sus objetivos como `'@item.level + 2'`.
3. **`Origen` gana `cdDeConjuro`.** `fireball` pone `save.dc.calculation: spellcasting`; ya existe
   `spellSaveDc` derivada con traza, y esto es su puerta desde una actividad.
4. **`dados` admite CERO dados.** `revivify` cura exactamente 1 punto:
   `healing: { number: null, denomination: null, custom: { formula: '1' } }`. Con `n` y `caras`
   obligatorios no cabe. Pasan a ser opcionales, y **una expresión sin dados es solo su `bonus`**.
5. **`dados` gana `escalado`.** `fireball` lleva `scaling: { mode: whole, number: 1 }` (+1d6 por
   espacio por encima del 3.º) y `fire-bolt` escala **por nivel de personaje**, que es otra cosa. Son
   dos ejes y hay que distinguirlos: `{ por: "espacio" | "nivelDePersonaje", n, caras }`.
6. **`activation` deja de ser solo un `Coste`.** `activation.type` de Foundry admite `minute` y
   `hour` con su `value`. **`Coste` (cinco valores) es la economía del turno y no se toca**; la
   activación de una actividad es una unión: `{ coste: Coste }` o `{ tiempo: { valor, unidad } }`.
   El propio plan ya lo anticipaba en la tarea 5 («acción · adicional · reacción · **minutos**»).
7. **`activation` gana `condicion`.** `shield` y `counterspell` son reacciones con su disparador
   escrito: *«which you take when you are hit by an attack»*. Una reacción sin su condición no se
   puede usar en la mesa.
8. **`duration` es `{ valor, unidad, concentracion }`.** En `bless`, la concentración vive en
   `properties: [concentration]` del objeto y la duración en `duration: { value: '1', units: minute }`
   — **no** en `duration.concentration` de la actividad, que ahí vale `false`. Copiar el sitio
   equivocado habría dado un `bless` sin concentración.
9. **La forma común gana `materiales?: { texto, consumido, costeCp }`.** `revivify` lo trae:
   `{ value: 'Diamonds worth 300gp…', consumed: true, cost: 100 }`.

### Tres cosas que se aprendieron y no son cambios de esquema

- **`activation` está en DOS niveles en sus datos y se contradicen.** En `shield`, el objeto dice
  `reaction` y la actividad dice `action` — con `override: false`, que significa «hereda del
  objeto». **La actividad manda solo si `override` es verdadero.** Nosotros lo ponemos en **un solo
  sitio**; copiar los dos habría dado un `shield` que cuesta una acción.
- **`magic-missile` no escala ni en Foundry.** Sus datos declaran **un** dardo
  (`number: 1, denomination: 4, bonus: '1'`) y `scaling.mode: ''`. Los tres dardos y el cuarto por
  espacio son **prosa**. No es un hueco nuestro: es que ese conjuro se tira a mano en todas partes.
- **Sus propios datos discrepan de su propio texto.** `revivify` dice «Diamonds worth 300gp» y
  declara `cost: 100`. Es el argumento entero de por qué se copian los **nombres** y no los valores.

### Veredicto

**La forma aguanta; el borrador no.** Ninguno de los nueve cambios es estructural: son campos que
faltaban, no un modelo distinto. Las cinco actividades siguen cubriendo lo que la spec contó, el
`summon` entra con su texto sin romper nada, y `uses` sigue siendo `CharacterResource`. **Con el
esquema corregido, los 320 del paso 3 entran.**
