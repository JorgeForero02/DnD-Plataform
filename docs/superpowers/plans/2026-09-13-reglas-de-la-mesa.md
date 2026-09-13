# Reglas de la mesa — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El DM fija por campaña cómo nacen los personajes —características (libre / matriz / puntos / dados del DM con N intentos), nivel inicial, PG de los niveles 2..N, razas/clases/subclases permitidas y oro inicial— y **el servidor lo hace cumplir**: tira él, escribe cada intento, fija lo elegido y rechaza lo que la regla no permite.

**Architecture:** Una columna `Campaign.tableRules Json` validada por `tableRulesSchema` (`@dnd/shared`), con `LIBRE`/`MEDIA`/`EQUIPO` por defecto para que ninguna campaña existente cambie. La regla se aplica en **`PATCH …/sheet`** (donde de verdad llegan características, raza y clase — no en el `POST` de crear, que hoy solo lleva nombre, nivel, bio y visibilidad) y en el `POST` de crear para el nivel. Los dados de característica los tira el servidor en un endpoint propio (`POST …/ability-rolls`) que escribe seis `ABILITY_ROLL` + una fila `AbilityRollAttempt` en una transacción; el `PATCH …/sheet` con `attemptId` fija. Los PG de los niveles 2..N al nacer se **guardan** como `Character.hitPointsPerLevel` (lo decidido: la tirada o el máximo) y entran en el motor como un paso de traza — `maxHp` sigue sin guardarse. La pantalla pinta solo lo que la regla permite y bloquea la edición manual de las seis casillas cuando el método no es `LIBRE`.

**Tech Stack:** NestJS + Prisma 5 (Postgres 16) · Zod en `packages/shared` · React 18 + TanStack Query + Tailwind · Vitest/RTL · Jest (unit y e2e API) · Playwright.

**Spec:** [docs/superpowers/specs/2026-09-12-reglas-de-la-mesa-design.md](../specs/2026-09-12-reglas-de-la-mesa-design.md) (D-CF-53, aprobada). Proceso: **D-CF-65** (`docs/decisiones.md`, `docs/04-convenciones.md`).

## Global Constraints

Copiadas de la spec, de `CLAUDE.md` y de `docs/04-convenciones.md`; toda tarea las incluye:

- **La autorización se comprueba en el servidor.** Cambiar `tableRules` exige DM (`requireDM`); tirar y fijar características exige dueño o DM (`requireEditable`); todo listado filtra por `canView`.
- **`canView` es el dueño único de «quién ve qué».** Las tiradas de característica nacen `OWNER_DM` (audiencia DM + dueño); nada reimplementa la matriz.
- **Validación de entrada: Zod desde `@dnd/shared` vía `ZodValidationPipe`.** Ningún DTO a mano. La forma de los datos vive una sola vez en `packages/shared/src`.
- **Código en inglés en la API y en shared; identificadores de la spec en español donde la spec los nombra** (`metodo`, `nivelInicial`, `pgNivelesSiguientes`, `permitidos`, `oroInicial`, `intentos`, `asignacionLibre`, `expresion`, `cantidadPo`) porque son el contrato. Interfaz y documentación en español. **Ningún valor de enumeración llega a la pantalla**: la forma legible se escribe una vez por dominio (`apps/web/src/features/campaigns/reglas.ts`).
- **Regla de interfaz vinculante:** opciones con significado son **radios con su frase**, no `<select>`; un valor guardado que ya no se ofrece se muestra **marcado y no seleccionable** (mecanismo `huerfano` de `EdicionEnSitio.tsx`); si el texto explica una regla del servidor y discrepan, **miente el texto**; los botones de guardar **nunca se deshabilitan** (`04-convenciones.md`, «el botón de guardar nunca se deshabilita»): con la entrada mal se escribe el error en línea y no se manda la petición.
- **La gramática de dados vive solo en `apps/api/src/dice/dice.ts`.** La web no valida expresiones (`expresion.ts`, `bandeja.ts` lo declaran); el servidor rechaza con 400 y su mensaje, y la web lo pinta en línea.
- **Cita del SRD 5.1 en inglés** en el código donde se aplica la regla, y en el commit de la tarea que la implementa (memoria «Investigar no es opcional»). Fuentes: SRD 5.1, *Determine Ability Scores* (4d6 keep 3; standard array 15,14,13,12,10,8; variant «Customizing Ability Scores»: 27 points, 8–15, cost 0/1/2/3/4/5/7/9), *Beyond 1st Level* («roll the Hit Die … or use the fixed value» = media redondeada arriba), *Starting Wealth by Class*.
- **Migraciones a mano** (`apps/api/prisma/migrations/<timestamp>_<nombre>/migration.sql`, con comentario «Revertir:»), y se aplican con `pnpm --filter @dnd/api exec prisma migrate deploy` — **nunca `migrate dev`** (resetea la base).
- **Proceso por tarea (D-CF-65):** unitarias + **una mutación anotada en el informe** + `pnpm verify` limpio (en primer plano, `timeout: 600000` como parámetro de la herramienta) + un commit. **Sin Playwright ni revisión Opus por tarea.** Si se renombra o retira un rótulo visible, `grep` en `apps/web/e2e` y ajustar el spec en el mismo commit.
- **Frontera de herramientas de todo encargo** (`04-convenciones.md`, § *La frontera del encargo es de ficheros y de herramientas*): no desplegar, no correr Playwright ni e2e de API, no dejar `dev:api` arrancado, no commitear ni empujar (el orquestador commitea tras leer el informe), no lanzar agentes, no desactivar pruebas ni bajar umbrales, no rediseñar lo decidido.
- **No entra (spec §9):** equipo de clase del SRD (paso 3), cambiar reglas a personajes ya creados, dotes/multiclase/trasfondos, dados 3D.

## Decisiones de ejecución tomadas al escribir el plan (E-RM-*)

Lo que la spec dice y el código medido el 2026-09-13 (`main` = `27304e1`) no permite hacer tal cual. Van a `docs/decisiones.md` al cerrar la tanda; se listan aquí para que cada implementador las lea.

| | Decisión | Por qué |
|---|---|---|
| E-RM-1 | **La regla de características, razas y clases se aplica en `PATCH …/sheet`, no en `POST …/characters`.** El `POST` solo lleva `name`/`level`/`bio`/`visibility`/`color` (`createCharacterSchema`); raza, clase y las seis llegan por el `PATCH` (así lo hace el propio `CharacterEditor.tsx`, «dos peticiones, una regla»). Con `MATRIZ`/`PUNTOS`/`DADOS`, el `PATCH` **exige las seis a la vez** (400 «Con esta regla las seis características se fijan juntas»); con `LIBRE` sigue admitiendo una a una | La spec §5 daba por hecho que las características viajaban al crear; el fichero medido dice que no |
| E-RM-2 | **PG de los niveles 2..N y oro inicial se resuelven cuando la clase se fija por primera vez** (`classKey` pasa de `null` a un valor en `PATCH …/sheet`), en esa misma transacción, **una sola vez**; un cambio de clase posterior **no los recalcula** (el DM arbitra con `overrides` y con la bolsa) | Al crear no hay clase, y sin clase no hay dado de golpe ni fila de la tabla de oro |
| E-RM-3 | **`Character.hitPointsPerLevel Json?`** (entero por nivel, del 2 al N, **sin** Constitución) guarda lo decidido; el motor lo lee como paso de traza `maxHp.perLevelAtCreation` en lugar de `(N−1)·media` para esos niveles, y sigue usando la media para los niveles que se suban después. **`MEDIA` no escribe nada** (es lo que el motor ya hace) | `maxHp` **no se guarda** (`docs/05-datos.md`, `max-hp.ts`); la spec decía «siembra `maxHp` como `level-up`», y `level-up` no siembra `maxHp` — siembra recursos |
| E-RM-4 | **La expresión de dados de `abilities.expresion` la valida el servidor en `PATCH /campaigns/:id`** con `rollExpression` (tirador fijo, resultado descartado) → 400 con el mensaje del evaluador; la web pinta el error en línea. La spec decía «validada al vuelo con `dice/`»: al vuelo es al guardar | Regla ya declarada: la gramática vive solo en la API |
| E-RM-5 | **No se crea `tiradaOFijoSchema`** (spec §3): `tableRulesSchema` (§4) no lo usa | YAGNI |
| E-RM-6 | **`PATCH …/sheet` con `level` y `PATCH …/characters/:id` con `level` siguen como hoy** (dueño o DM). El nivel inicial manda al **nacer**; subir después va por `level-up`. Se abre ficha en `06-pendientes.md` para que el autor decida si el dueño pierde el nivel a mano | Cambiarlo altera campañas existentes, que la spec promete no tocar |
| E-RM-7 | **El campo «Nivel» desaparece del diálogo «Nuevo personaje»**; en su lugar, una frase: «Nivel N — lo fija la mesa» | El servidor lo ignora (spec §5); un campo que se ignora es texto que miente |
| E-RM-8 | **`permitidos` se comprueba sobre lo que cambia en ESTA petición**; un valor ya guardado que deja de permitirse no revienta la hoja y se ve marcado y no seleccionable | Spec §5 («un personaje que ya existe no se toca») + regla de interfaz del huérfano |
| E-RM-9 | **`ORO_TABLA` y `ORO_FIJO` escriben solo `gp`** (+ `MONEY_CHANGED` con `gp`); la tabla del SRD está en po (el monje, 5d4 po sin ×10) | La bolsa tiene cinco columnas; la regla habla de oro |
| E-RM-10 | **Con `asignacionLibre: false` los seis valores van en el orden en que salieron: FUE, DES, CON, INT, SAB, CAR** | Spec §3, «en orden FUE→CAR» |
| E-RM-11 | **`RollsService.roll` NO se reutiliza para las seis tiradas de característica**: abre su propia transacción y no admite una externa. Se hace como `level-up.service.ts`: `rollExpression` + `events.record(…, tx)` + la fila del intento, **una sola transacción** | Seis sucesos sin su fila de intento darían un intento gratis si el proceso cayera a medias |
| E-RM-12 | **La pantalla de características bajo regla vive en `character-sheet/AsignarCaracteristicas.tsx`**, montada por `Caracteristicas` (`IdentidadEditable.tsx`), no en `CharacterEditor.tsx` | Las seis casillas están en la hoja (spec §2), no en el diálogo de crear |

## Mapa de ficheros

| Fichero | Responsabilidad | Tarea |
|---|---|---|
| `packages/shared/src/table-rules.schema.ts` **(nuevo)** | `tableRulesSchema`, `TableRules`, `MATRIZ_ESTANDAR`, `COSTE_POR_PUNTUACION`, `costeDePuntos`, `esPermutacionDe`, `abilityRollAttemptSchema`, `AbilityRollAttemptDto` | T1 |
| `packages/shared/src/__tests__/table-rules.schema.test.ts` **(nuevo)** | Defaults, unión, coste, permutación | T1 |
| `packages/shared/src/campaign.schema.ts` | `updateCampaignSchema` gana `tableRules` | T1 |
| `packages/shared/src/character-sheet.schema.ts` | `updateCharacterSheetSchema` gana `attemptId` | T1 |
| `packages/shared/src/character-build.schema.ts` | `characterBuildSchema` gana `hitPointsPerLevel` | T2 |
| `packages/shared/src/label-keys.ts` | `maxHp.perLevelAtCreation` | T2 |
| `apps/api/prisma/schema.prisma` + `apps/api/prisma/migrations/20260913100000_table_rules/migration.sql` **(nuevo)** | `Campaign.tableRules`, `AbilityRollAttempt`, `Character.hitPointsPerLevel` | T1 |
| `apps/api/src/campaigns/campaigns.service.ts` (+ `.spec.ts`) | Escribe `tableRules`; valida la expresión | T1 |
| `apps/api/src/rules/catalog/types.ts`, `classes.ts`, `catalog.spec.ts` | `startingGold` por clase | T2 |
| `apps/api/src/rules/engine.ts` (+ `engine.spec.ts`) | `EngineInput.hitPointsPerLevel` en `calcularPgMaximos` | T2 |
| `apps/api/src/rules/catalog/resolve.ts` | Pasa `build.hitPointsPerLevel` al motor | T2 |
| `apps/api/src/characters/character-sheet.service.ts`, `apps/api/src/level-up/level-up.service.ts`, `apps/api/src/character-state/common/max-hp.ts` | Las tres construcciones del build pasan `hitPointsPerLevel` | T2 |
| `apps/web/src/features/character-sheet/vocabulario.ts` | Traducción de la nueva `labelKey` | T2 |
| `apps/api/src/rules/table-rules.ts` **(nuevo)** (+ `table-rules.spec.ts`) | Puras: `validarCaracteristicas`, `comprobarPermitido`, `pgDeLosNivelesSiguientes`, `oroInicialDe` | T2 |
| `apps/api/src/characters/ability-rolls.service.ts` **(nuevo)** (+ `.spec.ts`), `ability-rolls.controller.ts` **(nuevo)**, `characters.module.ts` | `POST`/`GET …/ability-rolls` | T3 |
| `apps/api/src/characters/character-sheet.service.ts` (+ `.spec.ts`) | `updateSheet` obedece: seis juntas, matriz, puntos, dados+`attemptId`, fijación, permitidos, PG y oro al fijar clase | T4 |
| `apps/api/src/characters/characters.service.ts` (+ `.spec.ts`) | `create`: `level := nivelInicial` | T4 |
| `apps/api/test/reglas-de-la-mesa.e2e-spec.ts` **(nuevo)** | Los e2e de la spec §7 y §8 | T4 (lo corre el orquestador) |
| `apps/web/src/features/campaigns/api.ts`, `reglas.ts` **(nuevo)**, `ReglasDeLaMesa.tsx` **(nuevo)**, `CampaignSettings.tsx`, `__tests__/ReglasDeLaMesa.test.tsx` **(nuevo)** | El bloque «Reglas de la mesa» | T5 |
| `apps/web/src/features/characters/CharacterEditor.tsx`, `apps/web/src/features/character-sheet/opcionesDeCatalogo.ts`, `IdentidadEditable.tsx`, `AsignarCaracteristicas.tsx` **(nuevo)**, `api.ts`, `hooks.ts`, tests | Creación y hoja obedecen | T6 |
| `apps/web/e2e/reglas-de-la-mesa.spec.ts` **(nuevo)**, `docs/05-datos.md`, `docs/08-pruebas.md`, `docs/01-arquitectura.md` | Recorrido de navegador + documentación de datos | T7 |

---

### Task 1: El contrato, la columna y el endpoint del DM

**Files:**
- Create: `packages/shared/src/table-rules.schema.ts`
- Create: `packages/shared/src/__tests__/table-rules.schema.test.ts`
- Modify: `packages/shared/src/index.ts` (añadir `export * from "./table-rules.schema";`)
- Modify: `packages/shared/src/campaign.schema.ts` (`updateCampaignSchema`)
- Modify: `packages/shared/src/character-sheet.schema.ts` (`updateCharacterSheetSchema.attemptId`)
- Modify: `apps/api/prisma/schema.prisma` (`Campaign.tableRules`, `Character.hitPointsPerLevel`, `model AbilityRollAttempt`)
- Create: `apps/api/prisma/migrations/20260913100000_table_rules/migration.sql`
- Modify: `apps/api/src/campaigns/campaigns.service.ts` (`update`)
- Modify: `apps/api/src/campaigns/campaigns.service.spec.ts`
- Modify: `apps/api/test/campaigns.e2e-spec.ts` (dos casos; **no lo corre el implementador**)

**Interfaces:**
- Produces (shared):
  ```ts
  export const MATRIZ_ESTANDAR: readonly [15, 14, 13, 12, 10, 8];
  export const COSTE_POR_PUNTUACION: Readonly<Record<8|9|10|11|12|13|14|15, number>>; // 0,1,2,3,4,5,7,9
  export function costeDePuntos(valores: readonly number[]): number; // lanza RangeError si un valor no está en 8..15
  export function esPermutacionDe(valores: readonly number[], patron: readonly number[]): boolean;
  export const tableRulesSchema: z.ZodType<TableRules>;  // ver §4 de la spec, con .default en todo
  export type TableRules = z.infer<typeof tableRulesSchema>;
  export type AbilitiesRule = TableRules["abilities"];
  export const ORDEN_DE_CARACTERISTICAS = ["str","dex","con","int","wis","cha"] as const;
  export const abilityRollAttemptSchema; export type AbilityRollAttemptDto = {
    id: string; values: number[]; chosen: boolean; attempt: number; of: number; createdAt: string;
    rolls: { expression: string; rolls: number[]; kept: number[]; dropped: number[]; dice?: DieRolled[]; modifier: number; total: number; natural: "NONE"|"ONE"|"TWENTY"; outcome: "NO_DC"|"SUCCESS"|"FAILURE"; eventId: string }[]
  };
  ```
- Produces (Prisma): `Campaign.tableRules Json @default("{}")`, `Character.hitPointsPerLevel Json?`, `AbilityRollAttempt { id, characterId, values Json, rollEventIds Json, chosen Boolean @default(false), createdAt }` con `@@index([characterId, createdAt])` y `onDelete: Cascade` desde `Character`.
- Produces (API): `PATCH /campaigns/:id` acepta `{ tableRules }` (DM; 400 si la expresión de `DADOS` no la acepta `rollExpression`); `GET /campaigns/:id` devuelve la fila con `tableRules`.

- [ ] **Step 1: Prueba de shared, en rojo**

`packages/shared/src/__tests__/table-rules.schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  COSTE_POR_PUNTUACION,
  MATRIZ_ESTANDAR,
  costeDePuntos,
  esPermutacionDe,
  tableRulesSchema,
  updateCampaignSchema,
  updateCharacterSheetSchema,
} from "../index";

describe("tableRulesSchema", () => {
  it("un objeto vacío da las reglas de siempre: libre, nivel 1, media, todo permitido, equipo", () => {
    const r = tableRulesSchema.parse({});
    expect(r).toEqual({
      abilities: { metodo: "LIBRE" },
      nivelInicial: 1,
      pgNivelesSiguientes: "MEDIA",
      permitidos: { razas: [], clases: [], subclases: [] },
      oroInicial: { modo: "EQUIPO" },
    });
  });

  it("DADOS rellena expresión, intentos y asignación libre por defecto", () => {
    const r = tableRulesSchema.parse({ abilities: { metodo: "DADOS" } });
    expect(r.abilities).toEqual({
      metodo: "DADOS",
      expresion: "4d6kh3",
      intentos: 1,
      asignacionLibre: true,
    });
  });

  it("PUNTOS vale 27 por defecto y acota 15..40", () => {
    expect(tableRulesSchema.parse({ abilities: { metodo: "PUNTOS" } }).abilities).toEqual({
      metodo: "PUNTOS",
      puntos: 27,
    });
    expect(tableRulesSchema.safeParse({ abilities: { metodo: "PUNTOS", puntos: 14 } }).success).toBe(false);
  });

  it("rechaza intentos fuera de 1..10, nivel fuera de 1..20, oro fijo negativo y un método desconocido", () => {
    expect(tableRulesSchema.safeParse({ abilities: { metodo: "DADOS", intentos: 0 } }).success).toBe(false);
    expect(tableRulesSchema.safeParse({ abilities: { metodo: "DADOS", intentos: 11 } }).success).toBe(false);
    expect(tableRulesSchema.safeParse({ nivelInicial: 21 }).success).toBe(false);
    expect(tableRulesSchema.safeParse({ oroInicial: { modo: "ORO_FIJO", cantidadPo: -1 } }).success).toBe(false);
    expect(tableRulesSchema.safeParse({ abilities: { metodo: "ALEATORIO" } }).success).toBe(false);
  });

  it("viaja dentro de updateCampaignSchema y attemptId dentro de updateCharacterSheetSchema", () => {
    expect(updateCampaignSchema.parse({ tableRules: { nivelInicial: 3 } }).tableRules?.nivelInicial).toBe(3);
    expect(updateCharacterSheetSchema.parse({ attemptId: "abc" }).attemptId).toBe("abc");
  });
});

describe("compra por puntos (SRD 5.1, Customizing Ability Scores)", () => {
  it("la tabla es 8→0 … 15→9", () => {
    expect(COSTE_POR_PUNTUACION).toEqual({ 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 });
  });
  it("15,15,15,8,8,8 cuesta 27 y 15,14,13,12,10,8 cuesta 27", () => {
    expect(costeDePuntos([15, 15, 15, 8, 8, 8])).toBe(27);
    expect(costeDePuntos([15, 14, 13, 12, 10, 8])).toBe(27);
  });
  it("un valor fuera de 8..15 lanza RangeError", () => {
    expect(() => costeDePuntos([16, 8, 8, 8, 8, 8])).toThrow(RangeError);
    expect(() => costeDePuntos([7, 8, 8, 8, 8, 8])).toThrow(RangeError);
  });
});

describe("la matriz estándar", () => {
  it("es 15 14 13 12 10 8 y una permutación exacta pasa; una repetición o un valor de más, no", () => {
    expect([...MATRIZ_ESTANDAR]).toEqual([15, 14, 13, 12, 10, 8]);
    expect(esPermutacionDe([8, 10, 12, 13, 14, 15], MATRIZ_ESTANDAR)).toBe(true);
    expect(esPermutacionDe([15, 15, 13, 12, 10, 8], MATRIZ_ESTANDAR)).toBe(false);
    expect(esPermutacionDe([15, 14, 13, 12, 10], MATRIZ_ESTANDAR)).toBe(false);
    expect(esPermutacionDe([15, 14, 13, 12, 10, 8, 8], MATRIZ_ESTANDAR)).toBe(false);
  });
});
```

- [ ] **Step 2: Correr y ver el rojo**

Run: `pnpm --filter @dnd/shared test -- table-rules` (Vitest; ver cómo corren las demás pruebas de `packages/shared/src/__tests__/`).
Expected: FAIL — `tableRulesSchema` no existe.

- [ ] **Step 3: Escribir el esquema**

`packages/shared/src/table-rules.schema.ts`:

```ts
import { z } from "zod";

// Reglas de la mesa (spec 2026-09-12, D-CF-53): lo que el DM decide antes de que nadie haga su
// hoja. **`LIBRE`, `MEDIA` y `EQUIPO` por defecto en todo**: una campaña que ya existe no cambia
// de comportamiento porque esta columna aparezca.
//
// SRD 5.1, *Determine Ability Scores*: «You generate your character's six ability scores randomly.
// Roll four 6-sided dice and record the total of the highest three dice on a piece of scratch
// paper. Do this five more times […] If you want to save time or don't like the idea of randomly
// determining ability scores, you can use the following scores instead: 15, 14, 13, 12, 10, 8.»
// Variant *Customizing Ability Scores*: «you have 27 points to spend on your ability scores. The
// cost of each score is shown on the Ability Score Point Cost table […] you can't have a score
// lower than 8 or higher than 15 before applying racial increases.»

/** La expresión de dados. **No se valida aquí**: la gramática vive en `apps/api/src/dice/dice.ts`
 * y la API rechaza con 400 al guardar la regla (E-RM-4). Mismo rango que `createRollSchema`. */
const expresionDeDados = z.string().min(1).max(120);

export const ORDEN_DE_CARACTERISTICAS = ["str", "dex", "con", "int", "wis", "cha"] as const;

export const MATRIZ_ESTANDAR = [15, 14, 13, 12, 10, 8] as const;

/** Ability Score Point Cost, SRD 5.1. */
export const COSTE_POR_PUNTUACION: Readonly<Record<8 | 9 | 10 | 11 | 12 | 13 | 14 | 15, number>> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};

export function costeDePuntos(valores: readonly number[]): number {
  let total = 0;
  for (const v of valores) {
    if (!(v in COSTE_POR_PUNTUACION)) throw new RangeError(`La puntuación ${v} está fuera de 8..15.`);
    total += COSTE_POR_PUNTUACION[v as keyof typeof COSTE_POR_PUNTUACION];
  }
  return total;
}

/** Los mismos valores, cada uno tantas veces como en el patrón, sin ninguno de más ni de menos. */
export function esPermutacionDe(valores: readonly number[], patron: readonly number[]): boolean {
  if (valores.length !== patron.length) return false;
  const a = [...valores].sort((x, y) => x - y);
  const b = [...patron].sort((x, y) => x - y);
  return a.every((v, i) => v === b[i]);
}

export const abilitiesRuleSchema = z.discriminatedUnion("metodo", [
  z.object({ metodo: z.literal("LIBRE") }),
  z.object({ metodo: z.literal("MATRIZ") }),
  z.object({ metodo: z.literal("PUNTOS"), puntos: z.number().int().min(15).max(40).default(27) }),
  z.object({
    metodo: z.literal("DADOS"),
    expresion: expresionDeDados.default("4d6kh3"),
    intentos: z.number().int().min(1).max(10).default(1),
    /** `false` = en el orden en que salieron: FUE DES CON INT SAB CAR (E-RM-10). */
    asignacionLibre: z.boolean().default(true),
  }),
]);
export type AbilitiesRule = z.infer<typeof abilitiesRuleSchema>;

export const pgNivelesSiguientesSchema = z.enum(["MAXIMO", "MEDIA", "TIRADA"]);
export type PgNivelesSiguientes = z.infer<typeof pgNivelesSiguientesSchema>;

export const oroInicialSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("EQUIPO") }),
  z.object({ modo: z.literal("ORO_TABLA") }),
  z.object({ modo: z.literal("ORO_FIJO"), cantidadPo: z.number().int().min(0).max(100000) }),
]);
export type OroInicial = z.infer<typeof oroInicialSchema>;

export const tableRulesSchema = z.object({
  abilities: abilitiesRuleSchema.default({ metodo: "LIBRE" }),
  nivelInicial: z.number().int().min(1).max(20).default(1),
  pgNivelesSiguientes: pgNivelesSiguientesSchema.default("MEDIA"),
  permitidos: z
    .object({
      razas: z.array(z.string().min(1).max(60)).max(60).default([]),
      clases: z.array(z.string().min(1).max(60)).max(60).default([]),
      subclases: z.array(z.string().min(1).max(60)).max(60).default([]),
    })
    .default({}),
  oroInicial: oroInicialSchema.default({ modo: "EQUIPO" }),
});
export type TableRules = z.infer<typeof tableRulesSchema>;

/** La respuesta de `POST`/`GET …/ability-rolls` (Task 3). Cada una de las seis tiradas viaja con el
 * mismo desglose que `rollResultSchema` revelado, para que la pantalla reutilice `ResultadoDeTirada`. */
export const abilityRollAttemptSchema = z.object({
  id: z.string(),
  values: z.array(z.number().int()).length(6),
  chosen: z.boolean(),
  attempt: z.number().int().min(1),
  of: z.number().int().min(1),
  createdAt: z.string(),
  rolls: z
    .array(
      z.object({
        eventId: z.string(),
        expression: z.string(),
        rolls: z.array(z.number().int()),
        kept: z.array(z.number().int()),
        dropped: z.array(z.number().int()),
        dice: z.array(z.object({ sides: z.number().int(), value: z.number().int(), kept: z.boolean() })).optional(),
        modifier: z.number().int(),
        total: z.number().int(),
        natural: z.enum(["NONE", "ONE", "TWENTY"]),
        outcome: z.enum(["NO_DC", "SUCCESS", "FAILURE"]),
      }),
    )
    .length(6),
});
export type AbilityRollAttemptDto = z.infer<typeof abilityRollAttemptSchema>;
```

**Comprueba la forma real de `dieRolledSchema`** en `packages/shared/src/roll.schema.ts` (grep `dieRolledSchema`) y **reutilízalo** en `dice` en vez de redeclararlo si sus campos no son exactamente `sides/value/kept`.

En `campaign.schema.ts`:

```ts
import { tableRulesSchema } from "./table-rules.schema";
// …
/** Reglas de la mesa (D-CF-53). Solo por `PATCH`: al crear la campaña se dejan las de siempre. */
export const updateCampaignSchema = createCampaignSchema
  .partial()
  .extend({ tableRules: tableRulesSchema.optional() });
```

En `character-sheet.schema.ts`, dentro de `updateCharacterSheetSchema`:

```ts
  /**
   * Reglas de la mesa (D-CF-53): con `abilities.metodo === "DADOS"`, el intento
   * (`AbilityRollAttempt.id`) del que salen las seis. El servidor comprueba que los valores son
   * exactamente los del intento y **a partir de ahí las fija**.
   */
  attemptId: z.string().min(1).max(60).optional(),
```

Y en `index.ts`: `export * from "./table-rules.schema";`.

- [ ] **Step 4: Verde en shared**

Run: `pnpm --filter @dnd/shared build && pnpm --filter @dnd/shared test`
Expected: PASS, incluidos los nuevos.

- [ ] **Step 5: Prisma — esquema y migración a mano**

`apps/api/prisma/schema.prisma`, en `model Campaign` (debajo de `boardRoomUrl`):

```prisma
  // Reglas de la mesa (D-CF-53, 2026-09-13): cómo nacen los personajes de esta campaña. Json
  // validado por `tableRulesSchema` (`@dnd/shared`); `{}` = las reglas de siempre (libre, nivel
  // 1, media, todo permitido, equipo), así que ninguna campaña existente cambia.
  tableRules Json @default("{}")
  abilityRollAttempts AbilityRollAttempt[]
```

(Si Prisma se queja de la relación desde `Campaign`, quítala: el intento cuelga de `Character`, no de `Campaign`.)

En `model Character` (debajo de `overrides`):

```prisma
  /// Reglas de la mesa (E-RM-3): los PG **decididos** para los niveles 2..N al nacer a nivel N —
  /// la tirada del dado de golpe o su máximo, uno por nivel y SIN Constitución—, cuando la regla
  /// no es la media. `null` = la media de siempre. `maxHp` sigue sin guardarse: el motor suma
  /// estos en vez de `(N−1)·media` y lo enseña en la traza (`maxHp.perLevelAtCreation`).
  hitPointsPerLevel Json?
  abilityRollAttempts AbilityRollAttempt[]
```

Modelo nuevo (junto a `CharacterResource`):

```prisma
/// Reglas de la mesa (D-CF-53): un intento de tirar las seis características en el servidor.
/// Existe para que el azar quede escrito y **no se pueda repetir a escondidas**: el servicio
/// cuenta filas contra `abilities.intentos` y rechaza el N+1 con 409.
model AbilityRollAttempt {
  id           String    @id @default(cuid())
  characterId  String
  /// Los seis totales, en el orden en que salieron.
  values       Json
  /// Los seis `GameEvent.id` (`ABILITY_ROLL`) que los produjeron, para la traza.
  rollEventIds Json
  chosen       Boolean   @default(false)
  createdAt    DateTime  @default(now())
  character    Character @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@index([characterId, createdAt])
}
```

`apps/api/prisma/migrations/20260913100000_table_rules/migration.sql`:

```sql
-- Reglas de la mesa (D-CF-53, 2026-09-13): lo que el DM decide antes de que nadie haga su hoja.
-- Revertir:
--   DROP TABLE "AbilityRollAttempt";
--   ALTER TABLE "Character" DROP COLUMN "hitPointsPerLevel";
--   ALTER TABLE "Campaign" DROP COLUMN "tableRules";
ALTER TABLE "Campaign" ADD COLUMN "tableRules" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "Character" ADD COLUMN "hitPointsPerLevel" JSONB;

CREATE TABLE "AbilityRollAttempt" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "rollEventIds" JSONB NOT NULL,
    "chosen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AbilityRollAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AbilityRollAttempt_characterId_createdAt_idx" ON "AbilityRollAttempt"("characterId", "createdAt");

ALTER TABLE "AbilityRollAttempt" ADD CONSTRAINT "AbilityRollAttempt_characterId_fkey"
    FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Run: `pnpm --filter @dnd/api exec prisma generate` y después `pnpm --filter @dnd/api exec prisma migrate deploy` (Postgres de `docker compose up -d` en marcha; si no está, arráncalo).
Expected: `prisma generate` sin error; `migrate deploy` aplica `20260913100000_table_rules` y termina con «All migrations have been successfully applied». Después `pnpm --filter @dnd/api exec prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --exit-code` debe dar **0** (esquema y base iguales): si difieren, la migración a mano está mal — arregla el SQL, **no** uses `migrate dev`.

- [ ] **Step 6: Unitaria del servicio de campañas, en rojo**

En `apps/api/src/campaigns/campaigns.service.spec.ts` (mira cómo construye el servicio y sus dobles la prueba de `encumbranceVariant`/`boardRoomUrl` y copia la forma):

```ts
  it("update escribe tableRules cuando viaja y no la toca cuando no", async () => {
    const reglas = { abilities: { metodo: "MATRIZ" }, nivelInicial: 3 };
    await service.update("dm", "c1", { tableRules: reglas as never });
    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tableRules: reglas }) }),
    );
    (prisma.campaign.update as jest.Mock).mockClear();
    await service.update("dm", "c1", { name: "Otra" });
    const data = (prisma.campaign.update as jest.Mock).mock.calls[0][0].data;
    expect("tableRules" in data).toBe(false);
  });

  it("update rechaza con 400 una expresión de dados que el evaluador no acepta, y acepta 3d6", async () => {
    await expect(
      service.update("dm", "c1", {
        tableRules: { abilities: { metodo: "DADOS", expresion: "4d", intentos: 1, asignacionLibre: true } } as never,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.campaign.update).not.toHaveBeenCalled();
    await expect(
      service.update("dm", "c1", {
        tableRules: { abilities: { metodo: "DADOS", expresion: "3d6", intentos: 2, asignacionLibre: false } } as never,
      }),
    ).resolves.toBeDefined();
  });
```

Run: `pnpm --filter @dnd/api test -- campaigns.service`
Expected: FAIL (la primera: `tableRules` no llega a `data`; la segunda: no lanza).

- [ ] **Step 7: Implementar `update`**

En `campaigns.service.ts`, importar `rollExpression, DiceExpressionError` de `../dice/dice` y `BadRequestException`; dentro de `update`, tras `boardRoomUrl`:

```ts
    // Reglas de la mesa (D-CF-53). Zod ya dio forma y defaults; lo único que Zod no sabe es si la
    // expresión de dados existe, porque la gramática vive en `dice.ts` (E-RM-4): se evalúa una vez
    // con un tirador fijo y se tira el resultado — aquí solo interesa si se acepta.
    if (input.tableRules !== undefined) {
      if (input.tableRules.abilities.metodo === "DADOS") {
        try {
          rollExpression(input.tableRules.abilities.expresion, () => 1);
        } catch (error) {
          if (error instanceof DiceExpressionError)
            throw new BadRequestException({ code: error.code, message: error.message });
          throw error;
        }
      }
      data.tableRules = input.tableRules;
    }
```

- [ ] **Step 8: Verde en la API**

Run: `pnpm --filter @dnd/api test -- campaigns.service`
Expected: PASS.

**Mutación obligatoria** (anótala en el informe): comenta `data.tableRules = input.tableRules;` → la primera prueba debe ponerse roja. Restaura.

- [ ] **Step 9: e2e de API (escribir, no correr)**

En `apps/api/test/campaigns.e2e-spec.ts`, junto a los casos de `boardRoomUrl`:

```ts
  it("reglas de la mesa: el jugador no puede cambiarlas (403), el DM sí, y GET las devuelve con defaults rellenos", async () => {
    const s = app.getHttpServer();
    const comoJugador = await request(s)
      .patch(`/campaigns/${campaignId}`)
      .set("Authorization", `Bearer ${tokenPL}`)
      .send({ tableRules: { nivelInicial: 3 } });
    expect(comoJugador.status).toBe(403);

    const comoDM = await request(s)
      .patch(`/campaigns/${campaignId}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ tableRules: { abilities: { metodo: "DADOS", expresion: "3d6", intentos: 2 }, nivelInicial: 3 } });
    expect(comoDM.status).toBe(200);
    expect(comoDM.body.tableRules.abilities).toEqual({
      metodo: "DADOS", expresion: "3d6", intentos: 2, asignacionLibre: true,
    });
    expect(comoDM.body.tableRules.pgNivelesSiguientes).toBe("MEDIA");

    const leida = await request(s).get(`/campaigns/${campaignId}`).set("Authorization", `Bearer ${tokenPL}`);
    expect(leida.body.tableRules.nivelInicial).toBe(3);
  });

  it("reglas de la mesa: una expresión que el evaluador no acepta es 400 con su código", async () => {
    const s = app.getHttpServer();
    const r = await request(s)
      .patch(`/campaigns/${campaignId}`)
      .set("Authorization", `Bearer ${tokenDM}`)
      .send({ tableRules: { abilities: { metodo: "DADOS", expresion: "4d" } } });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("SINTAXIS");
  });
```

Adapta los nombres de `tokenPL`/`tokenDM`/`campaignId` a los que ya usa ese fichero; si no hay jugador invitado en ese spec, añade uno como hace `level-up.e2e-spec.ts`. **Comprueba** la forma exacta con la que `configure-app.ts` serializa un `BadRequestException({code, message})` (grep `code` en `apps/api/test/rolls.e2e-spec.ts`) y ajusta la aserción del `code`.

- [ ] **Step 10: `pnpm verify` y el informe**

Run: `pnpm verify` (primer plano, `timeout: 600000`).
Expected: exit 0. Si `check:estado` falla por conteos, corre `pnpm update:estado` y vuelve a verificar (el bloque generado de `00-INDEX.md` y `08-pruebas.md` cambia porque hay ficheros de prueba nuevos: es correcto).

Commit (lo hace el orquestador): `feat(table-rules): tableRules column, shared schema and the DM's PATCH — SRD 5.1 Determine Ability Scores`.

---

### Task 2: Catálogo y motor — oro por clase, y los PG por nivel que se guardan

**Files:**
- Modify: `apps/api/src/rules/catalog/types.ts` (`SrdClass.startingGold`)
- Modify: `apps/api/src/rules/catalog/classes.ts` (doce clases)
- Modify: `apps/api/src/rules/catalog/catalog.spec.ts`
- Modify: `packages/shared/src/character-build.schema.ts` (`hitPointsPerLevel`)
- Modify: `packages/shared/src/label-keys.ts` (`"maxHp.perLevelAtCreation"`)
- Modify: `apps/api/src/rules/engine.ts` (`EngineInput.hitPointsPerLevel`, `calcularPgMaximos`)
- Modify: `apps/api/src/rules/engine.spec.ts`
- Modify: `apps/api/src/rules/catalog/resolve.ts` (pasar `hitPointsPerLevel` al `input`)
- Modify: `apps/api/src/characters/character-sheet.service.ts` (`construirBuild`), `apps/api/src/level-up/level-up.service.ts` (`buildFor`), `apps/api/src/character-state/common/max-hp.ts` (las tres construcciones del build)
- Modify: `apps/web/src/features/character-sheet/vocabulario.ts` (traducción de la clave nueva; su prueba `__tests__/vocabulario.test.ts` recorre `LABEL_KEYS` y se pondrá roja sola)
- Create: `apps/api/src/rules/table-rules.ts`, `apps/api/src/rules/table-rules.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  // types.ts
  interface SrdClass { /* … */ startingGold: string; } // expresión en po: "5d4*10" NO existe en la gramática → se guarda como { dice: "5d4", times: 10 }
  ```
  **Ojo:** la gramática de `dice.ts` no tiene `*`. Por eso `startingGold` es `{ dice: string; times: number }` (`{ dice: "5d4", times: 10 }`; monje `{ dice: "5d4", times: 1 }`), y `oroInicialDe` tira `dice` y multiplica.
  ```ts
  // engine.ts
  interface EngineInput { /* … */ hitPointsPerLevel?: number[]; } // niveles 2..(1+length), sin CON
  // shared character-build.schema.ts
  hitPointsPerLevel: z.array(z.number().int().min(1).max(12)).max(19).optional()
  // rules/table-rules.ts (puras, sin Prisma)
  export function validarCaracteristicas(regla: AbilitiesRule, seis: Record<AbilityKey, number>, intento?: { values: number[] }): void; // lanza BadRequestException con el motivo
  export function comprobarPermitido(permitidos: string[], key: string, nombre: string, que: "raza" | "clase" | "subclase"): void; // lanza BadRequestException si la lista no está vacía y no lo contiene
  export function pgDeLosNivelesSiguientes(hitDie: number, nivel: number, modo: PgNivelesSiguientes, roller?: Roller): { valores: number[]; tiradas: DiceRollResult[] } | null; // null con MEDIA o nivel 1
  export function oroInicialDe(regla: OroInicial, clase: SrdClass, roller?: Roller): { gp: number; tirada?: DiceRollResult } | null; // null con EQUIPO
  ```

- [ ] **Step 1: Pruebas del catálogo, en rojo**

En `apps/api/src/rules/catalog/catalog.spec.ts`:

```ts
  it("startingGold sigue la tabla Starting Wealth by Class del SRD 5.1, en po", () => {
    // SRD 5.1, «Starting Wealth by Class»: Barbarian 2d4×10, Bard 5d4×10, Cleric 5d4×10, Druid
    // 2d4×10, Fighter 5d4×10, Monk 5d4, Paladin 5d4×10, Ranger 5d4×10, Rogue 4d4×10, Sorcerer
    // 3d4×10, Warlock 4d4×10, Wizard 4d4×10.
    const esperado: Record<string, { dice: string; times: number }> = {
      barbarian: { dice: "2d4", times: 10 }, bard: { dice: "5d4", times: 10 },
      cleric: { dice: "5d4", times: 10 }, druid: { dice: "2d4", times: 10 },
      fighter: { dice: "5d4", times: 10 }, monk: { dice: "5d4", times: 1 },
      paladin: { dice: "5d4", times: 10 }, ranger: { dice: "5d4", times: 10 },
      rogue: { dice: "4d4", times: 10 }, sorcerer: { dice: "3d4", times: 10 },
      warlock: { dice: "4d4", times: 10 }, wizard: { dice: "4d4", times: 10 },
    };
    for (const clase of CLASSES) expect(clase.startingGold).toEqual(esperado[clase.key]);
    expect(Object.keys(esperado)).toHaveLength(CLASSES.length);
  });
```

(Usa el nombre real del array exportado en `classes.ts` — grep `export const`.)

- [ ] **Step 2: Rojo**

Run: `pnpm --filter @dnd/api test -- catalog.spec`
Expected: FAIL por tipo/valor `startingGold` indefinido.

- [ ] **Step 3: `startingGold` en tipos y doce clases**

`types.ts`, en `SrdClass`:

```ts
  /**
   * Reglas de la mesa (D-CF-53). SRD 5.1, «Starting Wealth by Class»: la tirada en po con la que
   * nace quien no coge el equipo de clase. `times` porque la gramática de `dice.ts` no tiene
   * multiplicación y `5d4×10` es «tira 5d4 y multiplica»; el monje va sin ×10 en la tabla.
   */
  startingGold: { dice: string; times: number };
```

Y en cada clase de `classes.ts` la fila de la tabla de arriba.

- [ ] **Step 4: Verde del catálogo**

Run: `pnpm --filter @dnd/api test -- catalog.spec`
Expected: PASS.

- [ ] **Step 5: Prueba del motor, en rojo**

En `apps/api/src/rules/engine.spec.ts` (mira cómo otras pruebas montan un `EngineInput` mínimo — copia la fixture de PG máximos que ya exista):

```ts
  describe("PG máximos con hitPointsPerLevel (reglas de la mesa, E-RM-3)", () => {
    it("usa los valores guardados en vez de la media para los niveles que cubren, y la media para el resto", () => {
      // Guerrero d10, CON 14 (+2), nivel 4, con [10, 3] guardados para los niveles 2 y 3.
      // Nivel 1: 10+2 · nivel 2: 10+2 · nivel 3: 3+2 · nivel 4 (media 6): 6+2 → 35.
      const hoja = derive({ ...base, level: 4, hitDieSize: 10, hitPointsPerLevel: [10, 3] });
      expect(hoja.derived.maxHp.total).toBe(35);
      const pasos = hoja.derived.maxHp.steps.map((p) => p.labelKey);
      expect(pasos).toContain("maxHp.perLevelAtCreation");
      expect(pasos).toContain("maxHp.perLevel"); // la media del nivel 4
    });
    it("sin hitPointsPerLevel el número es el de siempre", () => {
      const hoja = derive({ ...base, level: 4, hitDieSize: 10 });
      expect(hoja.derived.maxHp.total).toBe(10 + 2 + 3 * (6 + 2));
      expect(hoja.derived.maxHp.steps.map((p) => p.labelKey)).not.toContain("maxHp.perLevelAtCreation");
    });
  });
```

Run: `pnpm --filter @dnd/api test -- engine.spec`
Expected: FAIL.

- [ ] **Step 6: Motor**

`engine.ts`, en `EngineInput`:

```ts
  /**
   * Reglas de la mesa (E-RM-3): los PG **decididos** para los niveles 2..(1+length) al nacer — la
   * tirada o el máximo del dado, sin Constitución. Sustituyen a la media solo en esos niveles;
   * los niveles por encima (subidos después con `level-up`) siguen con la media.
   */
  hitPointsPerLevel?: number[];
```

`calcularPgMaximos`:

```ts
  const primerNivel = input.hitDieSize + mods.con;
  const media = averageHitDie(input.hitDieSize);
  const fijados = (input.hitPointsPerLevel ?? []).slice(0, Math.max(0, input.level - 1));
  const nivelesConMedia = input.level - 1 - fijados.length;
  const sumaFijada = fijados.reduce((s, v) => s + v, 0);
  const siguientes = sumaFijada + nivelesConMedia * media + (input.level - 1) * mods.con;

  const steps: TraceStep[] = [
    paso("base", input.hitDieSize, "class", "hit-die", "maxHp.firstLevel"),
    paso("add", mods.con, "ability", "con", "abilityMod.con"),
  ];
  if (fijados.length > 0) {
    steps.push(paso("add", sumaFijada, "level", "creation", "maxHp.perLevelAtCreation"));
  }
  if (nivelesConMedia > 0) {
    steps.push(paso("add", nivelesConMedia * media, "level", String(input.level), "maxHp.perLevel"));
  }
  if (input.level > 1) {
    steps.push(paso("add", (input.level - 1) * mods.con, "ability", "con", "maxHp.conPerLevel"));
  }
```

(El resto —suelo de 1 PG por nivel y `aplicar`— igual que hoy.)

`packages/shared/src/label-keys.ts`: añade `"maxHp.perLevelAtCreation",` junto a `"maxHp.perLevel"`.

`packages/shared/src/character-build.schema.ts`, en `characterBuildSchema`:

```ts
  /** Reglas de la mesa (E-RM-3): PG por nivel fijados al nacer, del 2 en adelante, sin CON. */
  hitPointsPerLevel: z.array(z.number().int().min(1).max(12)).max(19).optional(),
```

`resolve.ts`, en el `input` que devuelve `resolveBuild`: `hitPointsPerLevel: build.hitPointsPerLevel,`.

Las **tres construcciones** del build desde la fila pasan `hitPointsPerLevel: (character.hitPointsPerLevel as number[] | null) ?? undefined` — `construirBuild` (`character-sheet.service.ts`), `buildFor` (`level-up.service.ts`), `maxHpDe` (`max-hp.ts`). Los comentarios de esos tres sitios ya avisan de que las tres tienen que ir a la par: añade una línea a cada uno diciendo que este campo es el cuarto motivo.

`apps/web/src/features/character-sheet/vocabulario.ts`: junto a `"maxHp.perLevel"`: `"maxHp.perLevelAtCreation": "PG por nivel fijados al nacer (regla de la mesa)",`.

- [ ] **Step 7: Verde del motor, shared y web**

Run: `pnpm --filter @dnd/shared build && pnpm --filter @dnd/api test -- engine.spec && pnpm --filter @dnd/web test -- vocabulario`
Expected: PASS.

- [ ] **Step 8: Las puras de reglas de la mesa, en rojo**

`apps/api/src/rules/table-rules.spec.ts`:

```ts
import { BadRequestException } from "@nestjs/common";
import { findClass } from "./catalog";
import {
  comprobarPermitido,
  oroInicialDe,
  pgDeLosNivelesSiguientes,
  validarCaracteristicas,
} from "./table-rules";

const seis = (v: number[]) => ({ str: v[0], dex: v[1], con: v[2], int: v[3], wis: v[4], cha: v[5] });
const fijo = (n: number) => () => n;

describe("validarCaracteristicas", () => {
  it("LIBRE acepta cualquier cosa dentro del rango del esquema", () => {
    expect(() => validarCaracteristicas({ metodo: "LIBRE" }, seis([3, 18, 30, 1, 10, 10]))).not.toThrow();
  });
  it("MATRIZ exige una permutación exacta de 15 14 13 12 10 8", () => {
    expect(() => validarCaracteristicas({ metodo: "MATRIZ" }, seis([8, 10, 12, 13, 14, 15]))).not.toThrow();
    expect(() => validarCaracteristicas({ metodo: "MATRIZ" }, seis([15, 15, 13, 12, 10, 8]))).toThrow(BadRequestException);
  });
  it("PUNTOS: 8..15 y coste ≤ puntos; el mensaje trae el coste calculado", () => {
    expect(() => validarCaracteristicas({ metodo: "PUNTOS", puntos: 27 }, seis([15, 15, 15, 8, 8, 8]))).not.toThrow();
    expect(() => validarCaracteristicas({ metodo: "PUNTOS", puntos: 27 }, seis([15, 15, 15, 9, 8, 8]))).toThrow(/28/);
    expect(() => validarCaracteristicas({ metodo: "PUNTOS", puntos: 27 }, seis([16, 8, 8, 8, 8, 8]))).toThrow(BadRequestException);
  });
  it("DADOS con asignación libre: los seis son una permutación del intento; sin ella, el orden exacto", () => {
    const regla = { metodo: "DADOS" as const, expresion: "4d6kh3", intentos: 1, asignacionLibre: true };
    expect(() => validarCaracteristicas(regla, seis([12, 9, 15, 10, 14, 11]), { values: [15, 14, 12, 11, 10, 9] })).not.toThrow();
    expect(() => validarCaracteristicas(regla, seis([18, 9, 15, 10, 14, 11]), { values: [15, 14, 12, 11, 10, 9] })).toThrow(BadRequestException);
    const enOrden = { ...regla, asignacionLibre: false };
    expect(() => validarCaracteristicas(enOrden, seis([15, 14, 12, 11, 10, 9]), { values: [15, 14, 12, 11, 10, 9] })).not.toThrow();
    expect(() => validarCaracteristicas(enOrden, seis([14, 15, 12, 11, 10, 9]), { values: [15, 14, 12, 11, 10, 9] })).toThrow(BadRequestException);
  });
  it("DADOS sin intento es 400", () => {
    expect(() =>
      validarCaracteristicas({ metodo: "DADOS", expresion: "4d6kh3", intentos: 1, asignacionLibre: true }, seis([15, 14, 12, 11, 10, 9])),
    ).toThrow(BadRequestException);
  });
});

describe("comprobarPermitido", () => {
  it("lista vacía = todo; lista con la clave pasa; sin ella, 400 con el nombre legible", () => {
    expect(() => comprobarPermitido([], "wizard", "Mago", "clase")).not.toThrow();
    expect(() => comprobarPermitido(["wizard"], "wizard", "Mago", "clase")).not.toThrow();
    expect(() => comprobarPermitido(["fighter"], "wizard", "Mago", "clase")).toThrow(/Mago/);
  });
});

describe("pgDeLosNivelesSiguientes (SRD 5.1, Beyond 1st Level)", () => {
  it("MEDIA o nivel 1 → null (el motor ya hace la media)", () => {
    expect(pgDeLosNivelesSiguientes(10, 5, "MEDIA")).toBeNull();
    expect(pgDeLosNivelesSiguientes(10, 1, "MAXIMO")).toBeNull();
  });
  it("MAXIMO da el dado entero en cada nivel del 2 al N", () => {
    expect(pgDeLosNivelesSiguientes(10, 4, "MAXIMO")).toEqual({ valores: [10, 10, 10], tiradas: [] });
  });
  it("TIRADA tira 1dX por nivel con el tirador dado y devuelve las tiradas para escribirlas", () => {
    const r = pgDeLosNivelesSiguientes(8, 3, "TIRADA", fijo(5));
    expect(r?.valores).toEqual([5, 5]);
    expect(r?.tiradas).toHaveLength(2);
    expect(r?.tiradas[0].expression).toBe("1d8");
  });
});

describe("oroInicialDe (SRD 5.1, Starting Wealth by Class)", () => {
  it("EQUIPO → null; ORO_FIJO → la cantidad; ORO_TABLA → dados de la clase × times", () => {
    const guerrero = findClass({ source: "SRD", key: "fighter" });
    const monje = findClass({ source: "SRD", key: "monk" });
    expect(oroInicialDe({ modo: "EQUIPO" }, guerrero)).toBeNull();
    expect(oroInicialDe({ modo: "ORO_FIJO", cantidadPo: 150 }, guerrero)).toEqual({ gp: 150 });
    expect(oroInicialDe({ modo: "ORO_TABLA" }, guerrero, fijo(4))?.gp).toBe(5 * 4 * 10);
    expect(oroInicialDe({ modo: "ORO_TABLA" }, monje, fijo(4))?.gp).toBe(5 * 4);
    expect(oroInicialDe({ modo: "ORO_TABLA" }, guerrero, fijo(4))?.tirada?.expression).toBe("5d4");
  });
});
```

Run: `pnpm --filter @dnd/api test -- table-rules.spec`
Expected: FAIL (módulo inexistente).

- [ ] **Step 9: Implementar `rules/table-rules.ts`**

```ts
import { BadRequestException } from "@nestjs/common";
import {
  costeDePuntos,
  esPermutacionDe,
  MATRIZ_ESTANDAR,
  ORDEN_DE_CARACTERISTICAS,
  type AbilitiesRule,
  type AbilityKey,
  type OroInicial,
  type PgNivelesSiguientes,
} from "@dnd/shared";
import { rollExpression, type DiceRollResult, type Roller } from "../dice/dice";
import type { SrdClass } from "./catalog/types";

// Reglas de la mesa (D-CF-53): las comprobaciones puras que `character-sheet.service.ts` y
// `ability-rolls.service.ts` llaman. Sin Prisma, para que se prueben solas.
//
// SRD 5.1, *Determine Ability Scores*: «Roll four 6-sided dice and record the total of the highest
// three dice […] you can use the following scores instead: 15, 14, 13, 12, 10, 8.» Variant
// *Customizing Ability Scores*: «you have 27 points to spend […] you can't have a score lower than 8
// or higher than 15 before applying racial increases.»
// SRD 5.1, *Beyond 1st Level*: «roll the Hit Die for your class […] or use the fixed value shown in
// your class entry, which is the average result of the die roll rounded up.»

const NOMBRE_METODO: Record<AbilitiesRule["metodo"], string> = {
  LIBRE: "libres",
  MATRIZ: "la matriz estándar",
  PUNTOS: "compra por puntos",
  DADOS: "dados",
};

export function validarCaracteristicas(
  regla: AbilitiesRule,
  seis: Record<AbilityKey, number>,
  intento?: { values: number[] },
): void {
  const valores = ORDEN_DE_CARACTERISTICAS.map((k) => seis[k]);
  switch (regla.metodo) {
    case "LIBRE":
      return;
    case "MATRIZ":
      if (!esPermutacionDe(valores, MATRIZ_ESTANDAR)) {
        throw new BadRequestException(
          `Con ${NOMBRE_METODO.MATRIZ} las seis características tienen que ser 15, 14, 13, 12, 10 y 8, cada una una vez.`,
        );
      }
      return;
    case "PUNTOS": {
      let coste: number;
      try {
        coste = costeDePuntos(valores);
      } catch {
        throw new BadRequestException(`Con ${NOMBRE_METODO.PUNTOS} cada característica va de 8 a 15.`);
      }
      if (coste > regla.puntos) {
        throw new BadRequestException(
          `Esas características cuestan ${coste} puntos y la mesa da ${regla.puntos}.`,
        );
      }
      return;
    }
    case "DADOS": {
      if (!intento) {
        throw new BadRequestException(
          "Con dados, las características salen de un intento tirado por el servidor: manda attemptId.",
        );
      }
      const encaja = regla.asignacionLibre
        ? esPermutacionDe(valores, intento.values)
        : valores.every((v, i) => v === intento.values[i]);
      if (!encaja) {
        throw new BadRequestException(
          regla.asignacionLibre
            ? "Las seis características tienen que ser exactamente los seis valores del intento, repartidos como quieras."
            : "Con esta regla los seis valores van en el orden en que salieron: Fuerza, Destreza, Constitución, Inteligencia, Sabiduría, Carisma.",
        );
      }
      return;
    }
  }
}

export function comprobarPermitido(
  permitidos: string[],
  key: string,
  nombre: string,
  que: "raza" | "clase" | "subclase",
): void {
  if (permitidos.length === 0 || permitidos.includes(key)) return;
  throw new BadRequestException(`La ${que} «${nombre}» no está permitida en esta mesa.`);
}

export function pgDeLosNivelesSiguientes(
  hitDie: number,
  nivel: number,
  modo: PgNivelesSiguientes,
  roller?: Roller,
): { valores: number[]; tiradas: DiceRollResult[] } | null {
  if (modo === "MEDIA" || nivel <= 1) return null;
  const cuantos = nivel - 1;
  if (modo === "MAXIMO") return { valores: Array.from({ length: cuantos }, () => hitDie), tiradas: [] };
  const tiradas = Array.from({ length: cuantos }, () => rollExpression(`1d${hitDie}`, roller));
  return { valores: tiradas.map((t) => t.total), tiradas };
}

export function oroInicialDe(
  regla: OroInicial,
  clase: SrdClass,
  roller?: Roller,
): { gp: number; tirada?: DiceRollResult } | null {
  switch (regla.modo) {
    case "EQUIPO":
      return null;
    case "ORO_FIJO":
      return { gp: regla.cantidadPo };
    case "ORO_TABLA": {
      const tirada = rollExpression(clase.startingGold.dice, roller);
      return { gp: tirada.total * clase.startingGold.times, tirada };
    }
  }
}
```

Comprueba que `AbilityKey` se exporta de `@dnd/shared` (grep); si vive en `rules/trace.schema.ts` bajo otro nombre, usa ese.

- [ ] **Step 10: Verde**

Run: `pnpm --filter @dnd/api test -- table-rules.spec`
Expected: PASS.

**Mutación obligatoria:** en `validarCaracteristicas`, caso `PUNTOS`, cambia `coste > regla.puntos` por `coste >= regla.puntos` → la prueba de 27 exactos debe ponerse roja. Restaura y anótalo.

- [ ] **Step 11: `pnpm verify`**

Run: `pnpm verify` (primer plano, `timeout: 600000`). Expected: exit 0.

Commit: `feat(rules): startingGold per class and hitPointsPerLevel in the engine — SRD 5.1 Starting Wealth, Beyond 1st Level`.

---

### Task 3: Tirar las características en el servidor — `POST`/`GET …/ability-rolls`

**Files:**
- Create: `apps/api/src/characters/ability-rolls.service.ts`
- Create: `apps/api/src/characters/ability-rolls.service.spec.ts`
- Create: `apps/api/src/characters/ability-rolls.controller.ts`
- Modify: `apps/api/src/characters/characters.module.ts` (registrar controlador y servicio; **exportar `CharactersService`** no hace falta: el servicio nuevo vive en el mismo módulo)

**Interfaces:**
- Consumes: `tableRulesSchema` (T1), `AbilityRollAttempt` (T1), `rollExpression`/`dadosTirados` (`dice.ts`), `GameEventsService.record(userId, campaignId, {…}, tx)` (ver `level-up.service.ts:339`), `CharactersService.requireEditable`, `DICE_ROLLER` (`rolls.service.ts`).
- Produces:
  ```ts
  // POST /campaigns/:campaignId/characters/:characterId/ability-rolls  → 201 AbilityRollAttemptDto
  //   400 si abilities.metodo !== "DADOS" · 409 { code: "NO_MORE_ATTEMPTS" } si ya hay `intentos` filas · 409 { code: "ABILITIES_FIXED" } si ya hay un intento `chosen`
  // GET  /campaigns/:campaignId/characters/:characterId/ability-rolls  → 200 AbilityRollAttemptDto[] (dueño o DM), del más viejo al más nuevo
  export class AbilityRollsService {
    roll(userId, campaignId, characterId): Promise<AbilityRollAttemptDto>;
    list(userId, campaignId, characterId): Promise<AbilityRollAttemptDto[]>;
    /** Para Task 4: la fila cruda, o 404 si no es de este personaje. */
    requireAttempt(characterId: string, attemptId: string, tx?): Promise<AbilityRollAttempt>;
  }
  ```

- [ ] **Step 1: Unitaria, en rojo**

`ability-rolls.service.spec.ts` — dobles de Prisma como en `level-up.service.spec.ts` (copia su forma de `prisma.transaction` que ejecuta el callback con el propio doble):

```ts
describe("AbilityRollsService", () => {
  // fixture: campaña con tableRules DADOS 3d6, intentos 2, asignacionLibre true; personaje del
  // dueño "pl"; roller fijo que devuelve 4 → cada 3d6 = 12.
  it("tira seis veces con la expresión del DM, escribe seis ABILITY_ROLL OWNER_DM y la fila del intento en la misma transacción", async () => {
    const r = await service.roll("pl", "c1", "ch1");
    expect(r.values).toEqual([12, 12, 12, 12, 12, 12]);
    expect(r.attempt).toBe(1);
    expect(r.of).toBe(2);
    expect(events.record).toHaveBeenCalledTimes(6);
    expect(events.record).toHaveBeenCalledWith(
      "pl", "c1",
      expect.objectContaining({ visibility: "OWNER_DM", subjectType: "character", subjectId: "ch1",
        payload: expect.objectContaining({ type: "ABILITY_ROLL", expression: "3d6", reason: "Característica" }) }),
      expect.anything(), // tx
    );
    expect(prisma.abilityRollAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ characterId: "ch1", values: [12, 12, 12, 12, 12, 12], chosen: false }) }),
    );
  });
  it("el intento N+1 es 409 NO_MORE_ATTEMPTS y no tira nada", async () => {
    prisma.abilityRollAttempt.count.mockResolvedValue(2);
    await expect(service.roll("pl", "c1", "ch1")).rejects.toMatchObject({ response: expect.objectContaining({ code: "NO_MORE_ATTEMPTS" }) });
    expect(events.record).not.toHaveBeenCalled();
  });
  it("con un intento ya elegido es 409 ABILITIES_FIXED", async () => {
    prisma.abilityRollAttempt.findFirst.mockResolvedValue({ id: "a1", chosen: true });
    await expect(service.roll("pl", "c1", "ch1")).rejects.toMatchObject({ response: expect.objectContaining({ code: "ABILITIES_FIXED" }) });
  });
  it("si la regla no es DADOS es 400", async () => {
    prisma.campaign.findUnique.mockResolvedValue({ id: "c1", tableRules: {} });
    await expect(service.roll("pl", "c1", "ch1")).rejects.toBeInstanceOf(BadRequestException);
  });
  it("otro jugador que no es dueño ni DM no puede tirar (requireEditable → 403)", async () => {
    characters.requireEditable.mockRejectedValue(new ForbiddenException());
    await expect(service.roll("otro", "c1", "ch1")).rejects.toBeInstanceOf(ForbiddenException);
  });
});
```

Run: `pnpm --filter @dnd/api test -- ability-rolls`
Expected: FAIL.

- [ ] **Step 2: Servicio**

```ts
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import type { AbilityRollAttempt } from "@prisma/client";
import { tableRulesSchema, type AbilityRollAttemptDto } from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { CharactersService } from "./characters.service";
import { dadosTirados, rollExpression, type DiceRollResult, type Roller } from "../dice/dice";
import { DICE_ROLLER } from "../rolls/rolls.service";

// Reglas de la mesa (D-CF-53): las seis características se tiran EN EL SERVIDOR, con la expresión
// que el DM fijó, tantas veces como intentos dio. Cada intento queda escrito —seis `ABILITY_ROLL`
// para DM y dueño, y una fila `AbilityRollAttempt`— para que no se pueda repetir a escondidas.
//
// SRD 5.1, *Determine Ability Scores*: «Roll four 6-sided dice and record the total of the highest
// three dice on a piece of scratch paper. Do this five more times, so that you have six numbers.»
// El DM puede cambiar el dado (`4d6kh3`, `3d6`, `1d20`…): eso es la regla de la casa.
//
// **No se llama a `RollsService.roll`** (E-RM-11): abre su propia transacción y no admite una
// externa, y aquí seis tiradas sin su fila de intento serían un intento gratis si el proceso
// cayera a medias. Se hace como `level-up.service.ts`: evaluar, `events.record(…, tx)`, fila.

@Injectable()
export class AbilityRollsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly characters: CharactersService,
    private readonly events: GameEventsService,
    @Optional() @Inject(DICE_ROLLER) private readonly roller?: Roller,
  ) {}

  private async reglaDe(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId }, select: { tableRules: true } });
    if (!campaign) throw new NotFoundException("Campaign not found");
    return tableRulesSchema.parse(campaign.tableRules ?? {});
  }

  async roll(userId: string, campaignId: string, characterId: string): Promise<AbilityRollAttemptDto> {
    await this.membership.requireMember(campaignId, userId);
    const character = await this.characters.requireEditable(userId, campaignId, characterId);
    const regla = await this.reglaDe(campaignId);
    if (regla.abilities.metodo !== "DADOS") {
      throw new BadRequestException("En esta mesa las características no se tiran con dados.");
    }
    const { expresion, intentos } = regla.abilities;

    return this.prisma.transaction(async (tx) => {
      const elegido = await tx.abilityRollAttempt.findFirst({ where: { characterId, chosen: true } });
      if (elegido) {
        throw new ConflictException({ code: "ABILITIES_FIXED", message: "Las características ya se fijaron con dados." });
      }
      const hechos = await tx.abilityRollAttempt.count({ where: { characterId } });
      if (hechos >= intentos) {
        throw new ConflictException({ code: "NO_MORE_ATTEMPTS", message: `La mesa da ${intentos} intento(s) y ya se usaron.` });
      }

      const tiradas: DiceRollResult[] = [];
      const rolls: AbilityRollAttemptDto["rolls"] = [];
      for (let i = 0; i < 6; i++) {
        const resultado = rollExpression(expresion, this.roller);
        const desglose = this.desglosar(resultado);
        const evento = await this.events.record(
          userId, campaignId,
          {
            subjectType: "character", subjectId: characterId,
            // DM + dueño (spec §5): nadie más tiene por qué ver cómo nació la hoja de otro.
            visibility: "OWNER_DM",
            payload: { type: "ABILITY_ROLL", ...desglose, natural: "NONE", outcome: "NO_DC", reason: "Característica" },
          },
          tx,
        );
        tiradas.push(resultado);
        rolls.push({ eventId: evento.id, ...desglose, natural: "NONE", outcome: "NO_DC" });
      }
      const values = tiradas.map((t) => t.total);
      const fila = await tx.abilityRollAttempt.create({
        data: { characterId, values, rollEventIds: rolls.map((r) => r.eventId), chosen: false },
      });
      return { id: fila.id, values, chosen: false, attempt: hechos + 1, of: intentos, createdAt: fila.createdAt.toISOString(), rolls };
    });
  }

  private desglosar(resultado: DiceRollResult) {
    return {
      expression: resultado.expression,
      rolls: resultado.terms.flatMap((t) => t.rolled),
      kept: resultado.terms.flatMap((t) => (t.sides > 0 ? t.kept : [])),
      dropped: resultado.terms.flatMap((t) => t.dropped),
      dice: dadosTirados(resultado.terms),
      modifier: resultado.terms.filter((t) => t.sides === 0).reduce((s, t) => s + t.sign * t.value, 0),
      total: resultado.total,
    };
  }

  async list(userId: string, campaignId: string, characterId: string): Promise<AbilityRollAttemptDto[]> {
    await this.membership.requireMember(campaignId, userId);
    await this.characters.requireEditable(userId, campaignId, characterId);
    const regla = await this.reglaDe(campaignId);
    const of = regla.abilities.metodo === "DADOS" ? regla.abilities.intentos : 0;
    const filas = await this.prisma.abilityRollAttempt.findMany({ where: { characterId }, orderBy: { createdAt: "asc" } });
    // Los sucesos de las seis tiradas se releen para devolver el mismo desglose que el POST.
    const eventos = await this.prisma.gameEvent.findMany({ where: { id: { in: filas.flatMap((f) => f.rollEventIds as string[]) } } });
    const porId = new Map(eventos.map((e) => [e.id, e]));
    return filas.map((f, i) => ({
      id: f.id, values: f.values as number[], chosen: f.chosen, attempt: i + 1, of,
      createdAt: f.createdAt.toISOString(),
      rolls: (f.rollEventIds as string[]).map((id) => {
        const p = porId.get(id)?.payload as Record<string, unknown>;
        return { eventId: id, expression: String(p.expression), rolls: p.rolls as number[], kept: p.kept as number[], dropped: p.dropped as number[], dice: p.dice as AbilityRollAttemptDto["rolls"][number]["dice"], modifier: Number(p.modifier), total: Number(p.total), natural: "NONE" as const, outcome: "NO_DC" as const };
      }),
    }));
  }

  async requireAttempt(characterId: string, attemptId: string, tx?: Parameters<Parameters<PrismaService["transaction"]>[0]>[0]): Promise<AbilityRollAttempt> {
    const cliente = tx ?? this.prisma;
    const fila = await cliente.abilityRollAttempt.findFirst({ where: { id: attemptId, characterId } });
    if (!fila) throw new NotFoundException("Ese intento no es de este personaje.");
    return fila;
  }
}
```

Comprueba el tipo real que `PrismaService.transaction` pasa al callback (grep `transaction(` en `apps/api/src/prisma/prisma.service.ts`) y usa ese tipo para `tx` en `requireAttempt`. **`requireEditable` en `list`**: el dueño o el DM ven los intentos; un compañero de mesa, no (las tiradas son `OWNER_DM`).

Controlador `ability-rolls.controller.ts`:

```ts
@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/characters/:characterId/ability-rolls")
export class AbilityRollsController {
  constructor(private readonly abilityRolls: AbilityRollsService) {}
  @Post()
  roll(@Req() req: { user: { id: string } }, @Param("campaignId") campaignId: string, @Param("characterId") characterId: string) {
    return this.abilityRolls.roll(req.user.id, campaignId, characterId);
  }
  @Get()
  list(@Req() req: { user: { id: string } }, @Param("campaignId") campaignId: string, @Param("characterId") characterId: string) {
    return this.abilityRolls.list(req.user.id, campaignId, characterId);
  }
}
```

`characters.module.ts`: añade `AbilityRollsController` a `controllers` y `AbilityRollsService` a `providers` **y a `exports`** (Task 4 lo inyecta en `CharacterSheetService`, mismo módulo — el export es por si otro módulo lo necesita después; si prefieres no exportarlo, dilo en el informe).

- [ ] **Step 3: Verde**

Run: `pnpm --filter @dnd/api test -- ability-rolls`
Expected: PASS.

**Mutación obligatoria:** cambia `hechos >= intentos` por `hechos > intentos` → la prueba del 409 debe ponerse roja. Restaura y anótalo.

- [ ] **Step 4: `pnpm verify`**

Run: `pnpm verify` (primer plano, `timeout: 600000`). Expected: exit 0.

Commit: `feat(characters): POST/GET ability-rolls — the server rolls the DM's dice, writes every attempt, caps them`.

---

### Task 4: La hoja obedece — seis juntas, matriz, puntos, dados fijados, permitidos, nivel, PG y oro

**Files:**
- Modify: `apps/api/src/characters/character-sheet.service.ts` (`updateSheet`)
- Modify: `apps/api/src/characters/character-sheet.service.spec.ts`
- Modify: `apps/api/src/characters/characters.service.ts` (`create`)
- Modify: `apps/api/src/characters/characters.service.spec.ts`
- Create: `apps/api/test/reglas-de-la-mesa.e2e-spec.ts` (**escribir; lo corre el orquestador**)

**Interfaces:**
- Consumes: `validarCaracteristicas`, `comprobarPermitido`, `pgDeLosNivelesSiguientes`, `oroInicialDe` (T2); `AbilityRollsService.requireAttempt` (T3); `tableRulesSchema` (T1); `findRace/findClass/findSubrace` (catálogo, ya importados en el servicio).
- Produces: comportamiento de `PATCH …/sheet` y `POST …/characters` de la spec §5 y §7.

- [ ] **Step 1: Unitarias de `updateSheet`, en rojo**

En `character-sheet.service.spec.ts` (usa la fixture existente de `updateSheet`; añade a los dobles `prisma.campaign.findUnique` que devuelve `{ tableRules }`, `prisma.abilityRollAttempt.findFirst/update`, y un doble `abilityRolls.requireAttempt`; comprueba cómo se construye el servicio para añadir el parámetro nuevo del constructor):

```ts
describe("updateSheet bajo las reglas de la mesa", () => {
  const conRegla = (tableRules: unknown) => prisma.campaign.findUnique.mockResolvedValue({ id: "c1", tableRules });
  const personajeSinNumeros = { ...personajeBase, str: null, dex: null, con: null, int: null, wis: null, cha: null, classKey: null };

  it("LIBRE (por defecto) sigue admitiendo una característica a la vez", async () => {
    conRegla({});
    await expect(service.updateSheet("pl", "c1", "ch1", { abilities: { str: 16 } })).resolves.toBeDefined();
  });
  it("MATRIZ: cinco de seis es 400 «se fijan juntas»; una permutación de la matriz pasa; una repetición es 400", async () => {
    conRegla({ abilities: { metodo: "MATRIZ" } });
    await expect(service.updateSheet("pl", "c1", "ch1", { abilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10 } })).rejects.toThrow(/juntas/);
    await expect(service.updateSheet("pl", "c1", "ch1", { abilities: { str: 8, dex: 10, con: 12, int: 13, wis: 14, cha: 15 } })).resolves.toBeDefined();
    await expect(service.updateSheet("pl", "c1", "ch1", { abilities: { str: 15, dex: 15, con: 13, int: 12, wis: 10, cha: 8 } })).rejects.toBeInstanceOf(BadRequestException);
  });
  it("PUNTOS: 28 puntos es 400 con el coste en el mensaje", async () => {
    conRegla({ abilities: { metodo: "PUNTOS", puntos: 27 } });
    await expect(service.updateSheet("pl", "c1", "ch1", { abilities: { str: 15, dex: 15, con: 15, int: 9, wis: 8, cha: 8 } })).rejects.toThrow(/28/);
  });
  it("DADOS: con attemptId cuyos valores encajan, guarda y marca chosen; sin attemptId es 400", async () => {
    conRegla({ abilities: { metodo: "DADOS", expresion: "3d6", intentos: 2, asignacionLibre: true } });
    abilityRolls.requireAttempt.mockResolvedValue({ id: "a1", characterId: "ch1", values: [12, 9, 15, 10, 14, 11], chosen: false });
    await expect(service.updateSheet("pl", "c1", "ch1", { abilities: { str: 15, dex: 14, con: 12, int: 11, wis: 10, cha: 9 }, attemptId: "a1" })).resolves.toBeDefined();
    expect(prisma.abilityRollAttempt.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "a1" }, data: { chosen: true } }));
    await expect(service.updateSheet("pl", "c1", "ch1", { abilities: { str: 15, dex: 14, con: 12, int: 11, wis: 10, cha: 9 } })).rejects.toBeInstanceOf(BadRequestException);
  });
  it("DADOS: con un intento ya elegido, cambiar una característica sin attemptId es 400 «se fijaron con dados»", async () => {
    conRegla({ abilities: { metodo: "DADOS", expresion: "3d6", intentos: 1, asignacionLibre: true } });
    prisma.abilityRollAttempt.findFirst.mockResolvedValue({ id: "a1", chosen: true });
    await expect(service.updateSheet("pl", "c1", "ch1", { abilities: { str: 18, dex: 14, con: 12, int: 11, wis: 10, cha: 9 } })).rejects.toThrow(/fijaron con dados/);
    // Y la raza sí se puede seguir cambiando: la fijación es de las seis, no de la hoja.
    await expect(service.updateSheet("pl", "c1", "ch1", { race: { source: "SRD", key: "elf" } })).resolves.toBeDefined();
  });
  it("permitidos: una clase fuera de la lista es 400 con su nombre legible; la lista vacía deja todo", async () => {
    conRegla({ permitidos: { clases: ["fighter"] } });
    await expect(service.updateSheet("pl", "c1", "ch1", { class: { source: "SRD", key: "wizard" } })).rejects.toThrow(/Mago/);
    await expect(service.updateSheet("pl", "c1", "ch1", { class: { source: "SRD", key: "fighter" } })).resolves.toBeDefined();
  });
  it("al fijar la clase por primera vez con nivel 3, MAXIMO escribe hitPointsPerLevel [10,10] y ORO_TABLA suma gp y escribe MONEY_CHANGED", async () => {
    conRegla({ pgNivelesSiguientes: "MAXIMO", oroInicial: { modo: "ORO_TABLA" } });
    prisma.character.findFirst.mockResolvedValue({ ...personajeSinNumeros, level: 3 });
    await service.updateSheet("pl", "c1", "ch1", { class: { source: "SRD", key: "fighter" } });
    const data = (prisma.character.update as jest.Mock).mock.calls[0][0].data;
    expect(data.hitPointsPerLevel).toEqual([10, 10]);
    expect(data.gp).toEqual({ increment: expect.any(Number) });
    expect(events.record).toHaveBeenCalledWith("pl", "c1", expect.objectContaining({ payload: expect.objectContaining({ type: "MONEY_CHANGED" }) }), expect.anything());
  });
  it("cambiar de clase después NO vuelve a tirar ni a dar oro", async () => {
    conRegla({ pgNivelesSiguientes: "TIRADA", oroInicial: { modo: "ORO_TABLA" } });
    prisma.character.findFirst.mockResolvedValue({ ...personajeBase, level: 3, classKey: "fighter", hitPointsPerLevel: [7, 3] });
    await service.updateSheet("pl", "c1", "ch1", { class: { source: "SRD", key: "rogue" } });
    const data = (prisma.character.update as jest.Mock).mock.calls[0][0].data;
    expect("hitPointsPerLevel" in data).toBe(false);
    expect("gp" in data).toBe(false);
  });
});
```

Y en `characters.service.spec.ts`:

```ts
  it("create ignora el level del cuerpo y pone el nivelInicial de la mesa", async () => {
    prisma.campaign.findUnique.mockResolvedValue({ id: "c1", tableRules: { nivelInicial: 5 } });
    await service.create("pl", "c1", { name: "X", level: 1, visibility: "PLAYERS" });
    expect(prisma.character.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ level: 5 }) }));
  });
```

Run: `pnpm --filter @dnd/api test -- character-sheet.service characters.service`
Expected: FAIL.

- [ ] **Step 2: `characters.service.create`**

```ts
    // Reglas de la mesa (D-CF-53): el nivel lo fija la mesa, no el cuerpo de la petición. El
    // esquema sigue admitiendo `level` para no romper a ningún cliente, y se ignora a propósito.
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId }, select: { tableRules: true } });
    const regla = tableRulesSchema.parse(campaign?.tableRules ?? {});
    // … en data: level: regla.nivelInicial,
```

- [ ] **Step 3: `updateSheet`**

Inyecta `AbilityRollsService` en el constructor de `CharacterSheetService` (`private readonly abilityRolls: AbilityRollsService`; si hay ciclo de inyección con `CharactersService`, usa `@Optional()` **no** — el módulo es el mismo y `AbilityRollsService` depende de `CharactersService`, no de `CharacterSheetService`, así que no hay ciclo). Después de `requireEditable`, lee la regla:

```ts
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId }, select: { tableRules: true } });
    const regla = tableRulesSchema.parse(campaign?.tableRules ?? {});
```

**Características.** Sustituye el bloque `if (input.abilities) { for … }` por:

```ts
    let intentoAFijar: string | null = null;
    if (input.abilities) {
      const seisEnviadas = ORDEN_DE_CARACTERISTICAS.filter((k) => input.abilities![k] !== undefined);
      if (regla.abilities.metodo !== "LIBRE") {
        // Con dados y un intento ya elegido, las seis están fijadas: solo `overrides` del DM las mueve.
        if (regla.abilities.metodo === "DADOS" && !input.attemptId) {
          const elegido = await this.prisma.abilityRollAttempt.findFirst({ where: { characterId, chosen: true } });
          if (elegido) throw new BadRequestException("Las características se fijaron con dados; el DM puede anularlas desde la hoja.");
        }
        if (seisEnviadas.length !== 6) {
          throw new BadRequestException("Con esta regla las seis características se fijan juntas: manda las seis a la vez.");
        }
        const seis = Object.fromEntries(ORDEN_DE_CARACTERISTICAS.map((k) => [k, input.abilities![k]!])) as Record<AbilityKey, number>;
        const intento = input.attemptId ? await this.abilityRolls.requireAttempt(characterId, input.attemptId) : undefined;
        if (intento?.chosen) throw new BadRequestException("Ese intento ya se eligió.");
        validarCaracteristicas(regla.abilities, seis, intento ? { values: intento.values as number[] } : undefined);
        if (intento) intentoAFijar = intento.id;
      }
      for (const clave of ORDEN_DE_CARACTERISTICAS) {
        const valor = input.abilities[clave];
        if (valor !== undefined) data[clave] = valor;
      }
    }
```

**Permitidos.** Dentro del `try` existente, justo después de cada `findRace`/`findClass`/`findSubrace`:

```ts
        comprobarPermitido(regla.permitidos.razas, raceKey, findRace(input.race).name, "raza");
        // …
        comprobarPermitido(regla.permitidos.clases, classKey, findClass(input.class).name, "clase");
        // …
        comprobarPermitido(regla.permitidos.subclases, subclassKey, clase.subclasses.find((s) => s.key === subclassKey)!.name, "subclase");
```

**PG y oro al fijar la clase por primera vez** (E-RM-2), después de la validación prospectiva y antes de escribir:

```ts
    // Reglas de la mesa (E-RM-2): la primera vez que el personaje tiene clase se resuelven los PG
    // de los niveles 2..N y el oro inicial, una sola vez. Un cambio de clase posterior no los toca.
    let sucesosDeNacimiento: Array<Parameters<GameEventsService["record"]>[2]> = [];
    if (character.classKey === null && typeof data.classKey === "string") {
      const clase = findClass({ source: "SRD", key: data.classKey });
      const nivel = (data.level as number | undefined) ?? character.level;
      const pg = pgDeLosNivelesSiguientes(clase.hitDie, nivel, regla.pgNivelesSiguientes, this.roller);
      if (pg) {
        data.hitPointsPerLevel = pg.valores;
        sucesosDeNacimiento.push(...pg.tiradas.map((t) => this.sucesoDeTirada(characterId, character.visibility, t, "Puntos de golpe al nacer")));
      }
      const oro = oroInicialDe(regla.oroInicial, clase, this.roller);
      if (oro) {
        data.gp = { increment: oro.gp };
        if (oro.tirada) sucesosDeNacimiento.push(this.sucesoDeTirada(characterId, character.visibility, oro.tirada, "Oro inicial"));
        sucesosDeNacimiento.push({ subjectType: "character", subjectId: characterId, visibility: character.visibility,
          payload: { type: "MONEY_CHANGED", gp: oro.gp, reason: regla.oroInicial.modo === "ORO_TABLA" ? "Oro inicial (tabla del SRD)" : "Oro inicial (fijado por el DM)" } });
      }
    }
```

`sucesoDeTirada` es un método privado nuevo que devuelve el objeto `{ subjectType, subjectId, visibility, payload: { type: "ABILITY_ROLL", …desglose, natural: "NONE", outcome: "NO_DC", reason } }` — el mismo desglose que `AbilityRollsService.desglosar`; **muévelo a `rules/table-rules.ts` como `desgloseDeTirada(resultado)` exportado** y úsalo en los dos servicios, no lo copies. Comprueba que `MONEY_CHANGED` admite `reason` en `game-event.schema.ts` (el `reason` común de los payloads); si no, omite `reason`.

**La escritura pasa a una transacción** (hoy `prisma.character.update` va suelto):

```ts
    const actualizado = await this.prisma.transaction(async (tx) => {
      const fila = await tx.character.update({ where: { id: characterId }, data });
      if (intentoAFijar) await tx.abilityRollAttempt.update({ where: { id: intentoAFijar }, data: { chosen: true } });
      for (const suceso of sucesosDeNacimiento) await this.events.record(userId, campaignId, suceso, tx);
      return fila;
    });
```

`this.roller`: comprueba si `CharacterSheetService` ya inyecta `DICE_ROLLER` (grep `DICE_ROLLER` en el fichero — `rollAttack` tira, así que casi seguro sí) y reutilízalo; `this.events`: confirma el nombre del `GameEventsService` inyectado.

- [ ] **Step 4: Verde**

Run: `pnpm --filter @dnd/api test -- character-sheet.service characters.service`
Expected: PASS, incluidas las viejas (si alguna vieja de `updateSheet` se rompe porque ahora se lee `campaign.findUnique`, añade el doble con `tableRules: {}` a su fixture — eso no es aflojar, es la dependencia nueva).

**Mutación obligatoria:** quita la condición `character.classKey === null &&` → la prueba «cambiar de clase después NO vuelve a tirar» debe ponerse roja. Restaura y anótalo.

- [ ] **Step 5: e2e de API (escribir; lo corre el orquestador)**

`apps/api/test/reglas-de-la-mesa.e2e-spec.ts`, con el andamio de `level-up.e2e-spec.ts` (DM + jugador invitado; `afterAll` borra la campaña y los usuarios) y un `DICE_ROLLER` **no** fijado (se comprueban rangos y conteos, no valores):

```ts
describe("Reglas de la mesa (e2e)", () => {
  // helpers: fijarReglas(tableRules) como DM; crearPersonaje(nombre) como jugador → id.

  it("el nivel del cuerpo se ignora: nace con nivelInicial", async () => {
    await fijarReglas({ nivelInicial: 3 });
    const r = await request(s).post(`/campaigns/${campaignId}/characters`).set(auth(tokenPL)).send({ name: "N", level: 1 });
    expect(r.status).toBe(201);
    expect(r.body.level).toBe(3);
  });

  it("clase fuera de permitidos → 400 con el nombre aunque el cliente la mande; dentro → 200", async () => {
    await fijarReglas({ permitidos: { clases: ["fighter"] } });
    const id = await crearPersonaje("P");
    const mal = await request(s).patch(`/campaigns/${campaignId}/characters/${id}/sheet`).set(auth(tokenPL)).send({ class: { source: "SRD", key: "wizard" } });
    expect(mal.status).toBe(400);
    expect(mal.body.message).toMatch(/Mago/);
    const bien = await request(s).patch(`/campaigns/${campaignId}/characters/${id}/sheet`).set(auth(tokenPL)).send({ class: { source: "SRD", key: "fighter" } });
    expect(bien.status).toBe(200);
  });

  it("MATRIZ: cinco valores → 400; repetido → 400; permutación → 200", async () => { /* como la unitaria, por HTTP */ });
  it("PUNTOS: 28 → 400 con el coste; 27 → 200", async () => { /* … */ });

  it("DADOS 4d6kh3 con 2 intentos: dos intentos devuelven seis valores 3..18, el tercero 409, valores ajenos 400, fijar con el segundo y después PATCH abilities → 400", async () => {
    await fijarReglas({ abilities: { metodo: "DADOS", expresion: "4d6kh3", intentos: 2 } });
    const id = await crearPersonaje("D");
    const a1 = await request(s).post(`/campaigns/${campaignId}/characters/${id}/ability-rolls`).set(auth(tokenPL));
    expect(a1.status).toBe(201);
    expect(a1.body.values).toHaveLength(6);
    for (const v of a1.body.values) { expect(v).toBeGreaterThanOrEqual(3); expect(v).toBeLessThanOrEqual(18); }
    expect(a1.body.rolls[0].rolls).toHaveLength(4);
    expect(a1.body.rolls[0].kept).toHaveLength(3);
    expect(a1.body).toMatchObject({ attempt: 1, of: 2 });
    const a2 = await request(s).post(`/campaigns/${campaignId}/characters/${id}/ability-rolls`).set(auth(tokenPL));
    expect(a2.status).toBe(201);
    expect(a2.body.attempt).toBe(2);
    const a3 = await request(s).post(`/campaigns/${campaignId}/characters/${id}/ability-rolls`).set(auth(tokenPL));
    expect(a3.status).toBe(409);
    expect(a3.body.code).toBe("NO_MORE_ATTEMPTS");

    const ajenos = await request(s).patch(`/campaigns/${campaignId}/characters/${id}/sheet`).set(auth(tokenPL))
      .send({ attemptId: a2.body.id, abilities: { str: 18, dex: 18, con: 18, int: 18, wis: 18, cha: 18 } });
    expect(ajenos.status).toBe(400);

    const [str, dex, con, int, wis, cha] = [...a2.body.values].sort((x: number, y: number) => y - x);
    const fijar = await request(s).patch(`/campaigns/${campaignId}/characters/${id}/sheet`).set(auth(tokenPL))
      .send({ attemptId: a2.body.id, abilities: { str, dex, con, int, wis, cha } });
    expect(fijar.status).toBe(200);
    expect(fijar.body.character.str).toBe(str);

    const despues = await request(s).patch(`/campaigns/${campaignId}/characters/${id}/sheet`).set(auth(tokenPL))
      .send({ abilities: { str: 8, dex, con, int, wis, cha } });
    expect(despues.status).toBe(400);
    expect(despues.body.message).toMatch(/fijaron con dados/);

    // El DM sigue pudiendo anular (la puerta que ya existe).
    const anula = await request(s).put(`/campaigns/${campaignId}/characters/${id}/sheet/overrides/ability.str`).set(auth(tokenDM)).send({ value: 20, reason: "Bendición" });
    expect([200, 201]).toContain(anula.status);

    // Los intentos se listan para dueño y DM, y el elegido va marcado.
    const lista = await request(s).get(`/campaigns/${campaignId}/characters/${id}/ability-rolls`).set(auth(tokenDM));
    expect(lista.status).toBe(200);
    expect(lista.body.map((a: { chosen: boolean }) => a.chosen)).toEqual([false, true]);

    // Y las seis tiradas del intento quedaron en el registro, para DM y dueño.
    const registro = await request(s).get(`/campaigns/${campaignId}/rolls?characterId=${id}`).set(auth(tokenDM));
    expect(registro.body.filter((e: { payload: { reason?: string } }) => e.payload.reason === "Característica").length).toBeGreaterThanOrEqual(12);
  });

  it("nivel 3 con TIRADA y ORO_TABLA: al fijar la clase, hitPointsPerLevel tiene 2 valores, la bolsa tiene oro y maxHp de la hoja lo refleja", async () => {
    await fijarReglas({ nivelInicial: 3, pgNivelesSiguientes: "TIRADA", oroInicial: { modo: "ORO_TABLA" } });
    const id = await crearPersonaje("T");
    const r = await request(s).patch(`/campaigns/${campaignId}/characters/${id}/sheet`).set(auth(tokenPL))
      .send({ abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 }, race: { source: "SRD", key: "human" }, class: { source: "SRD", key: "fighter" } });
    expect(r.status).toBe(200);
    const fila = await prisma.character.findUnique({ where: { id } });
    expect((fila!.hitPointsPerLevel as number[]).length).toBe(2);
    expect(fila!.gp).toBeGreaterThanOrEqual(50); // 5d4×10, mínimo 50
    expect(fila!.gp).toBeLessThanOrEqual(200);
    const hoja = await request(s).get(`/campaigns/${campaignId}/characters/${id}/sheet`).set(auth(tokenPL));
    const pasos = hoja.body.sheet.derived.maxHp.steps.map((p: { labelKey: string }) => p.labelKey);
    expect(pasos).toContain("maxHp.perLevelAtCreation");
  });
});
```

**Comprueba la ruta real de `overrides`** (grep `overrides` en `apps/api/src/characters/character-sheet.controller.ts`) y ajusta `anula`. Y la forma de `hoja.body` (`sheet.derived.maxHp`) contra `character-sheet.e2e-spec.ts`.

- [ ] **Step 6: `pnpm verify`**

Run: `pnpm verify` (primer plano, `timeout: 600000`). Expected: exit 0 (regenera estado si hace falta).

Commit: `feat(characters): the sheet obeys the table rules — six at once, matrix, points, fixed dice, allowed lists, birth HP and gold`.

---

### Task 5: Ajustes de campaña — el bloque «Reglas de la mesa»

**Files:**
- Modify: `apps/web/src/features/campaigns/api.ts` (`Campaign.tableRules?: TableRules`)
- Create: `apps/web/src/features/campaigns/reglas.ts` (vocabulario legible por dominio)
- Create: `apps/web/src/features/campaigns/ReglasDeLaMesa.tsx`
- Modify: `apps/web/src/features/campaigns/CampaignSettings.tsx` (montar debajo de `SalaDelTablero`)
- Create: `apps/web/src/features/campaigns/__tests__/ReglasDeLaMesa.test.tsx`

**Interfaces:**
- Consumes: `TableRules`, `tableRulesSchema`, `abilitiesRuleSchema` (T1); `useUpdateCampaign(campaignId)`; `useCatalog()` (`features/character-sheet/hooks.ts`) para los nombres de razas/clases/subclases.
- Produces:
  ```ts
  // reglas.ts
  export const NOMBRE_METODO: Record<AbilitiesRule["metodo"], { etiqueta: string; frase: string }>;
  export const NOMBRE_PG: Record<PgNivelesSiguientes, { etiqueta: string; frase: string }>;
  export const NOMBRE_ORO: Record<OroInicial["modo"], { etiqueta: string; frase: string }>;
  export const AVISO_NO_RETROACTIVO = "Estas reglas valen para los personajes que se creen a partir de ahora.";
  export function reglasCompletas(parcial: unknown): TableRules; // tableRulesSchema.parse(parcial ?? {})
  ```
  Rótulos exactos (los usa el e2e de T7): título `Reglas de la mesa`; grupos `Características`, `Nivel inicial`, `Puntos de golpe de los niveles siguientes`, `Razas permitidas`, `Clases permitidas`, `Caminos permitidos`, `Oro inicial`; botón `Guardar las reglas`; radios: `Libres`, `Matriz estándar`, `Compra por puntos`, `Con dados`; `Máximo del dado`, `Media del dado`, `Tirada por nivel`; `Equipo de clase`, `Oro de la tabla`, `Oro fijo`; campos `Expresión de dados`, `Intentos`, `Reparten libremente los seis valores` (casilla), `Puntos a repartir`, `Oro inicial (po)`.

- [ ] **Step 1: RTL, en rojo**

```tsx
// ReglasDeLaMesa.test.tsx — monta con QueryClientProvider como CampaignSettings.test.tsx; mockea
// useUpdateCampaign (mutate espía) y useCatalog (dos razas, dos clases con una subclase cada una).
it("pinta las reglas actuales: radios marcados y listas con nombres legibles, nunca claves", () => {
  render(<ReglasDeLaMesa campaignId="c1" reglas={reglasCompletas({ abilities: { metodo: "PUNTOS" }, permitidos: { clases: ["fighter"] } })} disabled={false} />);
  expect(screen.getByRole("radio", { name: /Compra por puntos/ })).toBeChecked();
  expect(screen.getByLabelText("Puntos a repartir")).toHaveValue(27);
  expect(screen.getByRole("checkbox", { name: "Guerrero" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Mago" })).not.toBeChecked();
  expect(screen.queryByText(/PUNTOS|fighter|MEDIA/)).toBeNull();
  expect(screen.getByText(AVISO_NO_RETROACTIVO)).toBeVisible();
});
it("con dados enseña expresión, intentos y la casilla de asignación; con oro fijo, la cantidad", async () => {
  render(<ReglasDeLaMesa campaignId="c1" reglas={reglasCompletas({})} disabled={false} />);
  expect(screen.queryByLabelText("Expresión de dados")).toBeNull();
  await user.click(screen.getByRole("radio", { name: /Con dados/ }));
  expect(screen.getByLabelText("Expresión de dados")).toHaveValue("4d6kh3");
  expect(screen.getByLabelText("Intentos")).toHaveValue(1);
  expect(screen.getByRole("checkbox", { name: "Reparten libremente los seis valores" })).toBeChecked();
  await user.click(screen.getByRole("radio", { name: /Oro fijo/ }));
  expect(screen.getByLabelText("Oro inicial (po)")).toBeVisible();
});
it("Guardar manda el objeto entero por PATCH { tableRules } y pinta el error del servidor en línea", async () => {
  mutate.mockImplementation((_v, opts) => opts?.onError?.(new Error("La expresión «4d» no tiene número de caras.")));
  render(<ReglasDeLaMesa campaignId="c1" reglas={reglasCompletas({})} disabled={false} />);
  await user.click(screen.getByRole("radio", { name: /Con dados/ }));
  await user.clear(screen.getByLabelText("Expresión de dados"));
  await user.type(screen.getByLabelText("Expresión de dados"), "4d");
  await user.click(screen.getByRole("button", { name: "Guardar las reglas" }));
  expect(mutate).toHaveBeenCalledWith({ tableRules: expect.objectContaining({ abilities: { metodo: "DADOS", expresion: "4d", intentos: 1, asignacionLibre: true }, nivelInicial: 1 }) }, expect.anything());
  expect(await screen.findByRole("alert")).toHaveTextContent("4d");
});
it("el botón de guardar no se deshabilita para un jugador: los controles sí, con el motivo a la vista", () => {
  render(<ReglasDeLaMesa campaignId="c1" reglas={reglasCompletas({})} disabled motivo="Solo el DM puede editar la campaña." />);
  expect(screen.getByRole("radio", { name: /Libres/ })).toBeDisabled();
  expect(screen.getByText("Solo el DM puede editar la campaña.")).toBeVisible();
});
```

Run: `pnpm --filter @dnd/web test -- ReglasDeLaMesa`
Expected: FAIL.

- [ ] **Step 2: `reglas.ts`**

```ts
import { tableRulesSchema, type AbilitiesRule, type OroInicial, type PgNivelesSiguientes, type TableRules } from "@dnd/shared";

// Reglas de la mesa (D-CF-53) — **la forma legible, una vez por dominio**. Ningún `metodo`, `modo`
// ni `pgNivelesSiguientes` llega a la pantalla: se pasa por aquí.
// Si una frase explica una regla del servidor y discrepan, miente la frase (04-convenciones.md).

export const NOMBRE_METODO: Record<AbilitiesRule["metodo"], { etiqueta: string; frase: string }> = {
  LIBRE: { etiqueta: "Libres", frase: "Cada jugador escribe sus seis números, de 1 a 30, uno a uno." },
  MATRIZ: { etiqueta: "Matriz estándar", frase: "15, 14, 13, 12, 10 y 8, repartidos como cada jugador quiera (SRD 5.1)." },
  PUNTOS: { etiqueta: "Compra por puntos", frase: "Puntos a repartir entre 8 y 15 por característica; cada valor tiene su coste (SRD 5.1, variante)." },
  DADOS: { etiqueta: "Con dados", frase: "El servidor tira la expresión seis veces, tantos intentos como digas; cada jugador se queda con uno y sus seis números quedan fijados." },
};
export const NOMBRE_PG: Record<PgNivelesSiguientes, { etiqueta: string; frase: string }> = {
  MAXIMO: { etiqueta: "Máximo del dado", frase: "Cada nivel del 2 en adelante da el dado de golpe entero, más Constitución." },
  MEDIA: { etiqueta: "Media del dado", frase: "La media redondeada arriba (d6→4, d8→5, d10→6, d12→7), más Constitución. Es lo de siempre." },
  TIRADA: { etiqueta: "Tirada por nivel", frase: "El servidor tira el dado de golpe una vez por nivel y lo escribe en el hilo." },
};
export const NOMBRE_ORO: Record<OroInicial["modo"], { etiqueta: string; frase: string }> = {
  EQUIPO: { etiqueta: "Equipo de clase", frase: "Sin oro: el DM da el equipo a mano, como hasta ahora." },
  ORO_TABLA: { etiqueta: "Oro de la tabla", frase: "El servidor tira la riqueza inicial de la clase (SRD 5.1: guerrero 5d4×10 po, mago 4d4×10 po…) al fijar la clase." },
  ORO_FIJO: { etiqueta: "Oro fijo", frase: "Todos nacen con la misma cantidad de piezas de oro." },
};
export const AVISO_NO_RETROACTIVO = "Estas reglas valen para los personajes que se creen a partir de ahora.";

/** Rellena defaults sobre lo que llegue (una respuesta vieja sin `tableRules`, `{}`, o un parcial). */
export function reglasCompletas(parcial: unknown): TableRules {
  return tableRulesSchema.parse(parcial ?? {});
}
```

- [ ] **Step 3: `ReglasDeLaMesa.tsx`**

Estructura (copia el patrón de radios de `InterruptorDeSobrecarga` y el de Guardar/error de `SalaDelTablero`):

```tsx
export function ReglasDeLaMesa({ campaignId, reglas, disabled, motivo }: {
  campaignId: string; reglas: TableRules; disabled: boolean; motivo?: string;
}) {
  const update = useUpdateCampaign(campaignId);
  const { data: catalogo } = useCatalog();
  const [borrador, setBorrador] = useState<TableRules>(reglas);
  const [error, setError] = useState<string | null>(null);
  // Re-sembrar si la campaña cambia de id (mismo patrón seededId que CampaignSettings).

  const onGuardar = () => {
    setError(null);
    update.mutate({ tableRules: borrador }, { onError: (e) => setError((e as Error).message) });
  };
  // …
  return (
    <section aria-label="Reglas de la mesa" className="mt-s5 border-t border-muted pt-s4">
      <h3 className="font-title text-chrome-md text-text">Reglas de la mesa</h3>
      <p className="mt-1 font-chrome text-chrome-xs text-muted">{AVISO_NO_RETROACTIVO}</p>
      {motivo && <p className="text-chrome-xs text-muted">{motivo}</p>}
      <GrupoDeRadios legend="Características" name="reglas-caracteristicas" opciones={NOMBRE_METODO} valor={borrador.abilities.metodo} onChange={(metodo) => setBorrador({ ...borrador, abilities: abilitiesRuleSchema.parse({ metodo }) })} disabled={disabled} />
      {borrador.abilities.metodo === "PUNTOS" && <Field label="Puntos a repartir"><input type="number" min={15} max={40} … /></Field>}
      {borrador.abilities.metodo === "DADOS" && (<>
        <Field label="Expresión de dados" hint="4d6kh3 · 3d6 · 1d20…"><input … /></Field>
        <Field label="Intentos"><input type="number" min={1} max={10} … /></Field>
        <label><input type="checkbox" checked={borrador.abilities.asignacionLibre} … /> Reparten libremente los seis valores</label>
      </>)}
      <Field label="Nivel inicial"><input type="number" min={1} max={20} … /></Field>
      <GrupoDeRadios legend="Puntos de golpe de los niveles siguientes" … opciones={NOMBRE_PG} … />
      <ListaDePermitidos legend="Razas permitidas" opciones={opcionesDeRaza(catalogo)} valor={borrador.permitidos.razas} … />
      <ListaDePermitidos legend="Clases permitidas" opciones={opcionesDeClase(catalogo)} … />
      <ListaDePermitidos legend="Caminos permitidos" opciones={/* todas las subclases de todas las clases: catalogo.classes.flatMap(c => c.subclasses.map(s => ({ valor: s.key, texto: `${s.name} (${c.name})` })))*/} … />
      <GrupoDeRadios legend="Oro inicial" … opciones={NOMBRE_ORO} … />
      {borrador.oroInicial.modo === "ORO_FIJO" && <Field label="Oro inicial (po)"><input type="number" min={0} … /></Field>}
      {error && <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">{error}</p>}
      <Button type="button" onClick={onGuardar}>Guardar las reglas</Button>
    </section>
  );
}
```

`GrupoDeRadios` y `ListaDePermitidos` son componentes locales del fichero (radios con etiqueta+frase; casillas con el nombre legible, «vacío = todas» dicho en una línea de ayuda). **Cada control tiene su `<label>` asociado** (los tests usan `getByLabelText`). Al cambiar de método con `abilitiesRuleSchema.parse({ metodo })` se rellenan los defaults del método nuevo.

En `CampaignSettings.tsx`, debajo de `<SalaDelTablero …/>`:

```tsx
      <ReglasDeLaMesa
        campaignId={campaignId}
        reglas={reglasCompletas(campaign.tableRules)}
        disabled={roleUnresolved || !isDM}
        motivo={disabledReason}
      />
```

`api.ts`: `tableRules?: TableRules;` con su comentario (opcional como `encumbranceVariant`: una respuesta vieja en caché no la trae; `reglasCompletas` la rellena).

- [ ] **Step 4: Verde**

Run: `pnpm --filter @dnd/web test -- ReglasDeLaMesa CampaignSettings`
Expected: PASS (si `CampaignSettings.test.tsx` no mockea `useCatalog`, añade el mock: el bloque nuevo lo llama).

**Mutación obligatoria:** en `onGuardar`, manda `{ tableRules: reglas }` (las de entrada) en vez de `borrador` → la prueba de Guardar debe ponerse roja. Restaura y anótalo.

- [ ] **Step 5: `pnpm verify`**

Run: `pnpm verify` (primer plano, `timeout: 600000`). Expected: exit 0.

Commit: `feat(web): "Reglas de la mesa" block in campaign settings — radios with their sentence, allowed lists, explicit save`.

---

### Task 6: Crear y la hoja obedecen — sin nivel a mano, catálogo filtrado, y las seis bajo regla

**Files:**
- Modify: `apps/web/src/features/characters/CharacterEditor.tsx`
- Modify: `apps/web/src/features/characters/__tests__/CharacterEditor.test.tsx` (existe; grep)
- Modify: `apps/web/src/features/character-sheet/opcionesDeCatalogo.ts` (parámetro `permitidos`)
- Modify: `apps/web/src/features/character-sheet/api.ts` (`rollAbilities`, `fetchAbilityRolls`, `updateSheet` ya admite `attemptId` por tipo)
- Modify: `apps/web/src/features/character-sheet/hooks.ts` (`useAbilityRolls`, `useRollAbilities`)
- Create: `apps/web/src/features/character-sheet/AsignarCaracteristicas.tsx`
- Create: `apps/web/src/features/character-sheet/__tests__/AsignarCaracteristicas.test.tsx`
- Modify: `apps/web/src/features/character-sheet/IdentidadEditable.tsx` (`Caracteristicas` monta el bloque y bloquea las casillas; `FichaEditable` filtra por permitidos)
- Modify: `apps/web/e2e/crear-personaje.spec.ts` **solo si** asevera el campo «Nivel» del diálogo (grep `Nivel` en `apps/web/e2e/*.spec.ts` y ajusta lo que dependa del campo retirado — **guarda de D-CF-65**)

**Interfaces:**
- Consumes: `Campaign.tableRules` vía `useCampaign(campaignId)` + `reglasCompletas` (T5); `AbilityRollAttemptDto`, `COSTE_POR_PUNTUACION`, `MATRIZ_ESTANDAR`, `ORDEN_DE_CARACTERISTICAS` (T1); `ResultadoDeTirada` (`features/rolls/ResultadoDeTirada.tsx`) para pintar cada una de las seis tiradas con sus dados; `NOMBRE_CARACTERISTICA` (`vocabulario.ts`).
- Produces:
  ```ts
  // api.ts
  export function rollAbilities(campaignId: string, characterId: string): Promise<AbilityRollAttemptDto>;   // POST …/ability-rolls
  export function fetchAbilityRolls(campaignId: string, characterId: string): Promise<AbilityRollAttemptDto[]>; // GET
  // opcionesDeCatalogo.ts — la lista vacía deja todo (misma semántica que el servidor)
  export function opcionesDeRaza(catalogo, permitidos?: string[]): OpcionDeCatalogo[];
  export function opcionesDeSubraza(catalogo, raceKey, /* sin filtro: las subrazas no tienen lista */): OpcionDeCatalogo[];
  export function opcionesDeClase(catalogo, permitidos?: string[]): OpcionDeCatalogo[];
  ```
  Rótulos exactos (T7 los usa): botón `Tirar características`; texto `Intento k de N`; botón `Quedarme con este`; botón `Fijar características` (matriz y puntos); contador `Te quedan X de Y puntos`; frase de bloqueo `Las características las fija la regla de la mesa` (matriz/puntos sin fijar), `Fijadas con dados` (después de elegir); en el diálogo de crear: `Nivel N — lo fija la mesa`.

- [ ] **Step 1: RTL de `AsignarCaracteristicas`, en rojo**

```tsx
// Monta con QueryClientProvider; mockea useCampaign → { tableRules }, useAbilityRolls → lista,
// useRollAbilities → mutate espía, useUpdateSheet → mutateAsync espía.
it("MATRIZ: seis desplegables que se agotan y Fijar manda las seis juntas", async () => {
  // regla MATRIZ; elegir 15 para Fuerza → el 15 desaparece de los otros cinco; con las seis puestas,
  // «Fijar características» llama a updateSheet con { abilities: { str: 15, … } } (sin attemptId).
});
it("PUNTOS: el contador baja con el coste de cada valor y con 28 gastados dice que sobran 1", async () => {
  // regla PUNTOS 27; seis entradas 8..15 (steppers o selects); poner 15,15,15,9,8,8 → «Te quedan -1 de 27 puntos»
  // y Fijar escribe el error en línea SIN llamar a updateSheet (botón nunca deshabilitado).
});
it("DADOS: «Tirar características» pide al servidor, enseña seis tiradas con sus dados e «Intento 1 de 2»; «Quedarme con este» manda attemptId y las seis", async () => {
  // regla DADOS 3d6, intentos 2, asignacionLibre true; mutate devuelve un AbilityRollAttemptDto de
  // prueba con values [12,9,15,10,14,11] → aparecen 6 ResultadoDeTirada (role status) y el texto;
  // seis selects de asignación con esos valores; elegir → updateSheet({ attemptId: "a1", abilities: {…} }).
});
it("DADOS sin asignación libre: no hay selects, los seis van en orden, y la fila dice a qué característica va cada uno", async () => {});
it("con un intento ya elegido enseña «Fijadas con dados» y no hay botón de tirar", async () => {});
```

Escribe las cinco con aserciones concretas (los valores de arriba). Run: `pnpm --filter @dnd/web test -- AsignarCaracteristicas` → FAIL.

- [ ] **Step 2: API y hooks**

`api.ts`:

```ts
export function rollAbilities(campaignId: string, characterId: string): Promise<AbilityRollAttemptDto> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/ability-rolls`, { method: "POST" });
}
export function fetchAbilityRolls(campaignId: string, characterId: string): Promise<AbilityRollAttemptDto[]> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/ability-rolls`);
}
```

(Mira cómo hace `apiFetch` los `POST` sin cuerpo en este fichero — `rollDeathSave` es el modelo.)

`hooks.ts`: `abilityRollsKey(campaignId, characterId)`, `useAbilityRolls(campaignId, characterId, { enabled })`, `useRollAbilities(campaignId, characterId)` que en `onSuccess` invalida `abilityRollsKey`. `useUpdateSheet` ya existe; su `onSuccess` invalida la hoja — añade también la invalidación de `abilityRollsKey` (para que «elegido» se refresque).

- [ ] **Step 3: `AsignarCaracteristicas.tsx`**

```tsx
export function AsignarCaracteristicas({ campaignId, characterId, regla, puedeEditar }: {
  campaignId: string; characterId: string; regla: Exclude<AbilitiesRule, { metodo: "LIBRE" }>; puedeEditar: boolean;
}) { /* tres ramas por regla.metodo; estado local de las seis; error en línea; botones nunca deshabilitados salvo !puedeEditar */ }
```

- `MATRIZ`: seis `<select>` (uno por característica, `aria-label` = nombre) con las opciones de `MATRIZ_ESTANDAR` **menos las ya usadas en otro**; «Fijar características» → si falta alguna, error en línea; si no, `updateSheet({ abilities })`.
  > Un `<select>` aquí **sí** es legítimo: no son opciones con significado distinto, son seis números idénticos en naturaleza que se agotan (la regla de radios habla de opciones con significado). Dilo en un comentario.
- `PUNTOS`: seis `<input type="number" min=8 max=15>` con `aria-label`, al lado de cada uno «coste N» (`COSTE_POR_PUNTUACION`), y el contador `Te quedan {puntos − gastados} de {puntos} puntos`; «Fijar características» con gasto > puntos → error en línea sin petición.
- `DADOS`: lee `useAbilityRolls`; si hay un `chosen` → `<p>Fijadas con dados</p>` y nada más; si no: botón «Tirar características» (deshabilitado solo por `!puedeEditar`; con `attempts.length >= of`, al pulsar escribe el error en línea «Ya usaste los N intentos» sin petición); por cada intento, `Intento k de N` y seis `ResultadoDeTirada` con `etiqueta` = nombre de la característica (o `Valor k` si `asignacionLibre`); debajo, con `asignacionLibre` seis `<select>` que reparten los seis valores (agotándose, como la matriz); sin ella, la lista fija «Fuerza 15 · Destreza 14 · …» en el orden en que salieron; «Quedarme con este» → `updateSheet({ attemptId, abilities })`.

`Caracteristicas` (`IdentidadEditable.tsx`): lee `useCampaign(campaignId)` → `reglasCompletas(campaign?.tableRules).abilities`; si `metodo !== "LIBRE"`, los seis `NumeroEditable` van `disabled` con `motivoDeshabilitado="Las características las fija la regla de la mesa"` y debajo de la rejilla se monta `<AsignarCaracteristicas …/>`. Con `LIBRE`, todo igual que hoy.

`FichaEditable`: `opcionesDeRaza(catalogo, permitidos.razas)`, `opcionesDeClase(catalogo, permitidos.clases)`, y para caminos filtra `caminosDeLaClase` por `permitidos.subclases` si la lista no está vacía. Un valor guardado que no esté en la lista lo enseña el mecanismo `huerfano` que ya tienen `SelectorEditable`/`RadiosEditables` — no añadas nada más.

`CharacterEditor.tsx`: quita el `<Field label="Nivel">` y el estado `level`; el `payload` ya no manda `level` (el esquema le pone `default(1)` y el servidor lo ignora); en su lugar `<p className="font-chrome text-chrome-xs text-muted">Nivel {reglas.nivelInicial} — lo fija la mesa</p>` (lee `useCampaign(campaignId)`); `razas`/`clases` con `permitidos`. Actualiza su prueba RTL y **grep en `apps/web/e2e`** de `character-level`, `"Nivel"` dentro del diálogo de crear, y ajusta.

- [ ] **Step 4: Verde**

Run: `pnpm --filter @dnd/web test`
Expected: PASS (todas: `CharacterEditor.test.tsx`, `IdentidadEditable`/`HojaCincoE` si mockean `useCampaign` — añade el mock donde falte).

**Mutación obligatoria:** en la rama `DADOS`, manda `updateSheet({ abilities })` **sin** `attemptId` → la prueba «Quedarme con este» debe ponerse roja. Restaura y anótalo.

- [ ] **Step 5: `pnpm verify`**

Run: `pnpm verify` (primer plano, `timeout: 600000`). Expected: exit 0.

Commit: `feat(web): creation and sheet obey the table rules — no manual level, filtered catalog, six scores by matrix, points or the server's dice`.

---

### Task 7: El recorrido de navegador y la documentación de datos y pruebas

**Files:**
- Create: `apps/web/e2e/reglas-de-la-mesa.spec.ts` (**escribir; lo corre el orquestador al cerrar**)
- Modify: `docs/05-datos.md` (`Campaign.tableRules`, `Character.hitPointsPerLevel`, `AbilityRollAttempt`, la migración `20260913100000_table_rules`)
- Modify: `docs/08-pruebas.md` (qué demuestra `reglas-de-la-mesa.e2e-spec.ts` y `reglas-de-la-mesa.spec.ts`; el bloque generado lo regenera `pnpm update:estado`)
- Modify: `docs/01-arquitectura.md` (una línea: `rules/table-rules.ts` y `characters/ability-rolls.*`, si el documento lista módulos)

- [ ] **Step 1: El spec de Playwright**

Con los ayudantes de `sobrecarga.spec.ts` (registro, campaña, personaje, «Ajustes»), dos cuentas (DM y jugador vía invitación — copia el flujo de `invitacion.spec.ts`):

```ts
test("el DM fija «dados, 3d6, 2 intentos»; el jugador tira, ve seis dados con sus caras, elige el segundo, la hoja deriva y no deja editarlas", async ({ browser }) => {
  // DM: crear campaña, Ajustes → sección «Reglas de la mesa» → radio «Con dados», Expresión «3d6»,
  // Intentos 2 → «Guardar las reglas» → sin alert; recargar y ver el radio marcado.
  // DM: crear invitación (pestaña Miembros) y copiar el enlace como hace invitacion.spec.ts.
  // Jugador (segundo contexto): aceptar, Personajes → «Nuevo personaje» → ver «Nivel 1 — lo fija la mesa»
  // y NO ver spinbutton «Nivel»; guardar; abrir la hoja; elegir raza y clase.
  // Las seis casillas: expect(page.getByLabel("Fuerza", { exact: true })).toBeDisabled() y el motivo visible.
  // «Tirar características» → expect(page.getByText("Intento 1 de 2")); dentro de la sección hay 6
  // role="status" y cada uno 3 [data-dado] (3d6) y 3 [data-icono="d6"].
  // «Tirar características» → «Intento 2 de 2». Repartir con los seis selects (o en orden) y
  // «Quedarme con este» → la casilla de Fuerza enseña el valor elegido; «Fijadas con dados» visible;
  // «Tirar características» ya no existe; los seis siguen deshabilitados.
  // La hoja deriva: expect(page.getByText("Salvaciones", { exact: true })).toBeVisible().
});
test("clase fuera de permitidos no se ofrece al crear, y un valor guardado que deja de permitirse se ve marcado y no seleccionable", async ({ page }) => {
  // Crear personaje mago; DM: «Clases permitidas» → solo Guerrero → Guardar. Nuevo personaje: el
  // select Clase no tiene «Mago». Hoja del mago: el select de Clase enseña «Mago — guardado, ya no
  // disponible» deshabilitado (mecanismo huerfano).
});
```

Escribe los dos tests completos con selectores por rol. **No lo corras.**

- [ ] **Step 2: Documentación de datos y pruebas**

`docs/05-datos.md`: tabla/entrada por columna nueva con su semántica (E-RM-2/3), el modelo `AbilityRollAttempt` («no se pueda repetir a escondidas»), y la migración en la lista de migraciones si el documento las lista. `docs/08-pruebas.md`: qué demuestra cada suite nueva (API: §7 de la spec + «4d6kh3 con 2 intentos»; navegador: el recorrido DM→jugador), y que **el spec de navegador lo corre el orquestador al cerrar la tanda (D-CF-65)**. Corre `pnpm update:estado` para los bloques generados.

- [ ] **Step 3: `pnpm verify`**

Run: `pnpm verify` (primer plano, `timeout: 600000`). Expected: exit 0 (`check:docs` comprueba que las rutas citadas existen).

Commit: `test(e2e): table rules browser journey; docs(data,tests): tableRules, hitPointsPerLevel, AbilityRollAttempt`.

---

## Cierre de la tanda (orquestador, D-CF-65)

1. **API e2e** de los ficheros tocados/nuevos: `reglas-de-la-mesa`, `campaigns`, `character-sheet`, `characters`, `level-up`, `rolls` (Postgres arriba; `pnpm --filter @dnd/api test:e2e -- <fichero>`; verifica que el filtro por nombre funciona con Jest — sí lo hace).
2. **Revisión Opus de la rama entera** (`16446d8..HEAD`): seguridad (403/409/400 del §7), la transacción de `updateSheet`, la fijación, `canView` de las tiradas, las tres construcciones del build, textos que expliquen reglas del servidor.
3. **Playwright**: `reglas-de-la-mesa.spec.ts`, `crear-personaje.spec.ts`, `hoja.spec.ts`, `hoja-pestanas.spec.ts`, `campana.spec.ts`, `sobrecarga.spec.ts`, `subir-nivel.spec.ts`, `elegir-camino.spec.ts`, `ficha-lectura.spec.ts`, `no-puedes-editar.spec.ts` uno a uno (`pnpm --filter @dnd/web exec playwright test e2e/<fichero>.spec.ts`), y después **la suite entera una vez** (`pnpm --filter @dnd/web e2e`, `timeout: 600000` — dura ~19 min, puede necesitar dos llamadas o `run_in_background` **solo aquí, por el orquestador**).
4. **Olas de arreglo** con Opus fresco, tope cinco, re-revisión acotada tras cada una.
5. **Docs**: `07-historial.md` (entrada de la tanda), `06-pendientes.md` (ficha E-RM-6 «¿pierde el dueño el nivel a mano?», la ficha del `timeout` se cierra si la tanda no repitió el patrón), `como-seguir.md` §0, `decisiones.md` (E-RM-1..12 + lo que la ejecución añada), `00-INDEX.md` generado. Tabla de observabilidad en el ledger.
6. `git push -u origin reglas-de-la-mesa/antes-del-paso-3`; avisar a `d-d-plataform-b8` y al autor. **La fusión la decide el autor. No se despliega.**

## Autorrevisión del plan contra la spec

- §3/§4 (esquema, defaults, cinco reglas) → T1. §3 «tabla de oro por clase» → T2. §5 nivel → T4 (`create`); permitidos → T4; `MATRIZ`/`PUNTOS`/`DADOS` + fijación + `overrides` sigue → T3/T4; PG al crear a nivel N → T2 (motor) + T4 (escritura), con E-RM-2/3 declaradas; oro → T2 + T4; «todo lo tirado deja su suceso» → T3 (`ABILITY_ROLL` ×6) y T4 (PG y oro). §6 pantalla de ajustes → T5; creación y hoja → T6, con E-RM-7/12. §7 tabla de seguridad → e2e de T1 (403) y T4 (409/400/fijación/permitidos). §8 unitarias → T1/T2/T3/T4; e2e API → T1/T4; navegador → T7. §9 fuera → respetado.
- Sin marcadores de posición: cada paso trae código o aserciones concretas; donde el implementador tiene que **comprobar** algo del código real (forma de `dieRolledSchema`, ruta de `overrides`, tipo del `tx`), se dice qué buscar y con qué comando.
- Nombres consistentes entre tareas: `tableRulesSchema`/`TableRules`/`AbilitiesRule`/`OroInicial`/`PgNivelesSiguientes`/`ORDEN_DE_CARACTERISTICAS`/`MATRIZ_ESTANDAR`/`COSTE_POR_PUNTUACION`/`costeDePuntos`/`esPermutacionDe`/`AbilityRollAttemptDto` (T1) → usados en T2–T6; `validarCaracteristicas`/`comprobarPermitido`/`pgDeLosNivelesSiguientes`/`oroInicialDe`/`desgloseDeTirada` (T2) → T3/T4; `AbilityRollsService.roll/list/requireAttempt` (T3) → T4/T6; `hitPointsPerLevel` y `maxHp.perLevelAtCreation` (T2) → T4/T7; `startingGold: { dice, times }` (T2) → T2 `oroInicialDe`; rótulos de T5/T6 → T7.
