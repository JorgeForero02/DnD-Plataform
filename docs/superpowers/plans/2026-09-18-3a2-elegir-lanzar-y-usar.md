# 3A.2 · Elegir, lanzar y usar — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que un mago y un clérigo de nivel 3 elijan sus conjuros en la pestaña Conjuros y los lancen
desde ella (gastando espacio, escribiendo en el hilo, y llegando al daño por la bandeja del DM, a la
salvación por la puerta de efectos, o al ataque de conjuro contra la CA), y que el resto de clases vea
sus aptitudes con nombre, texto y usos.

**Architecture:** una tabla nueva (`CharacterSpell`) dice qué conjuros son de quién; el catálogo
generado de 3A.1 ya trae los 319 conjuros con su `Actividad`; **lanzar es `ActivitiesService.usar`**
con la actividad del conjuro (clave `spell:<key>`), al que se le añade lo que faltaba: el espacio se
paga por nivel (y se elige uno superior, T18), el `escalado` se aplica, el daño directo a otro va a la
bandeja del DM, y el `ataque` se resuelve contra la CA con la pieza extraída de `resolveAttack` (T19).
Todo tope (preparados, trucos, libro) **se deriva y no se guarda**; todo exceso o fuera de regla
**cuenta y avisa, nunca rechaza**.

**Tech Stack:** NestJS + Prisma (Postgres 16) · Zod en `@dnd/shared` · React + TanStack Query +
Tailwind por tokens · jest (API unitaria y e2e con Postgres real) · vitest + RTL · Playwright.

**Spec:** `docs/superpowers/specs/2026-09-07-los-conjuros-del-personaje-design.md` (con el bloque
«Decidido el 2026-09-18 sin el autor»: D-CF-125..127), el bloque 3A.2 de
`docs/superpowers/plans/2026-09-14-paso-3-en-cinco-tandas.md`, y T10/T11/T15/T18/T19 + «daño extra
al impactar» de `docs/superpowers/plans/2026-09-08-paso-3-el-catalogo-y-los-conjuros-del-personaje.md`.

## Global Constraints

- **SRD 5.1 en inglés manda**; la cita va en el commit. Foundry (`~/Desktop/Trabajo/Mine/referencia-foundry-dnd5e/packs/_source`, sin sufijo `24`) solo como segunda fuente. Tablas ya leídas en `.superpowers/sdd/2026-09-18-noche-3a/tablas-srd-conjuros.md`.
- **Autorización en el servidor, siempre**; `canView` (`apps/api/src/common/visibility.ts`) es el único dueño de «quién ve qué»; `requireVisibleCharacter`/`requireOwnerOrDM` (`apps/api/src/common/character-viewer.ts`) para actor y objetivos.
- **Validación de entrada con Zod desde `@dnd/shared`** vía `ZodValidationPipe`; ningún DTO a mano.
- **Ningún valor de enumeración llega a la pantalla**: la forma legible se escribe una vez por dominio (`apps/web/src/dominio/`, `features/*/vocabulario.ts`) y todo lo demás la importa. Iconos dibujados (SVG), nunca glifos.
- **Cuenta y avisa; no impide** (doctrina del paso 2, D-CF-126): pasarse del tope, preparar en combate, lanzar sin espacio → se hace lo que se pueda y se dice; **nunca un botón que el servidor rechace** salvo por autorización o por dato inválido (un conjuro que no es de tu clase = 400).
- **Lo derivado no se guarda** (topes, cuántos trucos, si se pasó).
- **Un número derivado nunca es una cadena evaluable** (`Origen`, `resolverOrigen`).
- **Migraciones: una por commit, con su nombre** (`pnpm --filter @dnd/api exec prisma migrate dev --name <nombre>`), probadas con `migrate deploy` en la base del slot. Un valor de enum de Postgres **se añade, nunca se borra**.
- **Un `Json` no se consulta por dentro** salvo el patrón ya declarado de `pendingDamage.appliedEventId` (`jsonb_set … WHERE … IS NULL`, E-PE-4).
- **Transacciones con `PrismaService.transaction`**, nunca `$transaction`.
- **Todo suceso nuevo**: valor en `enum GameEventType` (migración), payload en `packages/shared/src/game-event.schema.ts`, frase en `apps/web/src/features/sessions/linea-de-log.ts` (la unión es cerrada: sin `case` no compila).
- **TDD por tarea**: test rojo → código → verde → `pnpm verify` (primer plano, `timeout: 600000`) → commit. Sin revisión Opus por tarea (D-CF-65 acotado para esta tanda); una revisión de la rama entera al cierre.
- **Rótulo visible renombrado → `grep` en `apps/web/e2e` y `apps/web/src/**/__tests__` en el mismo commit.** Los que esta tanda toca seguro: «Los conjuros llegan con el paso 3» (`hoja-pestanas.spec.ts`), «Sin traducir:» (`furia.spec.ts`, `combate.spec.ts`), «Espacios de conjuro».
- **Playwright por fichero, solo el orquestador**: `WORKTREE_SLOT=1 pnpm --filter @dnd/web exec playwright test e2e/<fichero>.spec.ts`. Los implementadores **escriben** el e2e y no lo corren.
- **Worktree**: `3a2/elegir-lanzar-y-usar` (`../dnd-3a2-elegir-lanzar-y-usar`). Puerto 3000 ocupado → `WORKTREE_SLOT=1`, no matar nada.
- **Prohibido**: desplegar, `--no-verify`, desactivar pruebas, bajar umbrales, tocar 3B (invocar, transformar, condiciones desde conjuros, reacciones, innatos, acciones de combate).

---

## Lo medido antes de escribir (2026-09-18, `main` `2414743`)

| Pieza | Qué hay | Qué le falta para 3A.2 |
|---|---|---|
| `apps/api/src/rules/catalog/generado/spells-srd.json` + `index.ts` | 319 conjuros con `key`, `nameEs`, `level`, `school`, `classes[]`, `castingTime`, `range`, `duration`, `concentration`, `ritual`, `textEs/En`, `higherLevels*`, `actividades[]` (con `dados.escalado {por: "espacio" \| "nivelDePersonaje", n, caras}`), `fueraDeA[]`. `SRD_SPELL_POR_KEY`. Las actividades de conjuro **no llevan `consumption`** (el espacio no está declarado). | Un cargador `spell:<key>` en `actividadCatalogada`; el consumo del espacio derivado del nivel del conjuro. |
| `apps/api/src/activities/activities.service.ts` `usar()` | Consume `consumption` con `FOR UPDATE`, `RESOURCE_SPENT`, `salvacion` → `RollRequestsService.createFromEffect` con `pendingEffect` (una tirada para todos), `dados` → `changeHpFromEffect` directo a cada destinatario, `ataque` → solo traza del bono, `effects[]`, `gastarActivacion`. `contextoDeDerivacion` trae `cdDeConjuro` pero **no `ataqueDeConjuro`** (cualquier conjuro `ataque` lanza hoy). `tirarDados` **ignora `escalado`**. `nivelDeEspacioConsumido` lee `spell-slot-N` de lo gastado. | `ataqueDeConjuro`; `escalado`; elegir espacio (T18); daño directo de signo −1 a otro → bandeja; `ataque` contra CA (T19); suceso `ACTIVITY_USED`; comprobar que el conjuro es del personaje. |
| `apps/api/src/activities/activities.module.ts` `actividadCatalogada` | Busca solo `grant.actividad` de los rasgos de clase/subclase. | Los conjuros. |
| `apps/api/src/character-state/resources/resources.service.ts:423` | Siembra `spell-slot-<N>` (`label`, `max`, `resetOn`) desde `spellSlotsFor`. | Nada. |
| `apps/api/src/characters/character-sheet.service.ts:1121-1160` | E-RM-2: al fijar la clase por primera vez, en la misma transacción, PG y oro con `sucesosDeNacimiento`. | Sembrar el libro/conocidos ahí (D-CF-125). |
| `character-sheet.service.ts:2951` `resolveAttack` | Tira `1d20+bono` con `rolls.roll` (`attackRef`), veredicto por natural/CA (`caDelObjetivo`, `sePuedeApuntar`, `modoContraObjetivo`, `ayudaViva`), escribe `ATTACK_RESOLVED` (sujeto = objetivo, visibilidad del objetivo). `rollAttack` (DAMAGE) escribe `pendingDamage` con `attackResolvedEventId`. `applyPendingDamage`/`damagePreview` (`damage-tray.controller.ts`). | Extraer «tirar contra la CA» a una pieza con bono y objetivo (T19). `pendingDamage` con `attackResolvedEventId` opcional y `reason`. |
| `apps/api/src/rolls/rolls.service.ts` `roll()` | Abre su propia transacción; `interno.pendingDamage` (sin `amount`, lo pone el total). | Un `interno.reason` para el daño de un conjuro. |
| `packages/shared/src/activity.schema.ts` | `usarActividadSchema { objetivos?, nivelDeEspacio? }`; `CharacterSheetActivity = Actividad & { key, usos? }`. | `name`/`description` en la actividad de la hoja. |
| `apps/api/src/rules/catalog/resolve.ts:421-460` `concederActividadDe` | Empuja `{...actividad, key: feature.key, usos}` — sin nombre. `ResolvedFeature { sourceKey, labelKey, name }` — sin texto. | `name` en la actividad; `textEs` en el rasgo. |
| `apps/web/src/features/character-sheet/pestanas/Conjuros.tsx` | Tarjeta «Espacios de conjuro» + `EmptyState` «Los conjuros llegan con el paso 3» (lo fija `e2e/hoja-pestanas.spec.ts`). | La pestaña entera (T11). |
| `apps/web/src/features/character-sheet/Actividades.tsx` + `vocabulario.ts:315` | `NOMBRE_ACTIVIDAD = { rage: "Furia" }` → **hoy toda aptitud convertida por 3A.1 se pinta «Sin traducir: second-wind»** en la pestaña Recursos. Botón «Usar» sin `objetivos` ni `nivelDeEspacio`. | Nombre del servidor; objetivos y espacio (para conjuros). |
| `apps/web/src/features/character-sheet/TirarAtaqueBoton.tsx:70-360` | Selector de objetivos desde `useCombatientesDelEncuentro` (bando contrario primero), `PanelFlotante`. | Reutilizar el patrón para «Lanzar». |
| `apps/web/src/features/sessions/hilo/BandejaDeDano.tsx`, `MensajeDelHilo.tsx`, `linea-de-log.ts` | La tarjeta de un `ABILITY_ROLL` con `pendingDamage` pinta preview y «Aplicar» (DM/dueño). Frase por tipo de suceso, unión cerrada. | Frases de `ACTIVITY_USED` y `SPELLBOOK_CHANGED`; la tarjeta sigue igual para el daño de un conjuro. |
| `TemporaryModifier` (`schema.prisma:772`, `TEMPORARY_MODIFIER_TARGETS` en `character-state.schema.ts:325`) + `efectosActivos` (`rules/items.ts:45`) | Objetivos cerrados: seis características, CA, velocidades. `efectosActivos(item)` filtra por sintonización. | Un objetivo sobre un objeto del inventario (T15). |

## File Structure

**Crear**
- `apps/api/src/rules/catalog/spell-knowledge.ts` (+ `spell-knowledge.spec.ts`): las tablas del SRD (modelo de preparación, trucos conocidos, conjuros conocidos, tope de preparados, tamaño del libro) como funciones puras.
- `apps/api/src/rules/catalog/spell-starters.ts` (+ `spell-starters.spec.ts`): el arranque curado por clase (D-CF-125).
- `apps/api/src/rules/catalog/spell-activities.ts` (+ spec): `actividadDeLanzamiento(spell)`, `claveDeConjuro`, `parsearClaveDeActividad`, `consumoDeEspacio(spell, nivelDeEspacio?)`, `dadosEscalados(expresion, {nivelBase, nivelDeEspacio, nivelDePersonaje})`.
- `apps/api/prisma/migrations/<ts>_character_spells/`, `<ts>_activity_events/`, `<ts>_temporary_modifier_item/`.
- `packages/shared/src/spellbook.schema.ts` (+ test): estados, modelo, entrada de la pestaña, respuesta, `setCharacterSpellSchema`.
- `apps/api/src/spellbook/spellbook.service.ts`, `spellbook.controller.ts`, `spellbook.module.ts`, `spellbook.service.spec.ts`; `apps/api/test/libro-de-conjuros.e2e-spec.ts`; `apps/api/test/lanzar-conjuros.e2e-spec.ts`; `apps/api/test/ataque-de-conjuro.e2e-spec.ts`; `apps/api/test/dano-extra.e2e-spec.ts`; `apps/api/test/encantar.e2e-spec.ts`.
- `apps/web/src/dominio/conjuros.ts` (+ test): escuelas, estados, modelos, frases de tope, en español.
- `apps/web/src/features/spellbook/api.ts`, `hooks.ts`, `LibroDeConjuros.tsx`, `FilaDeConjuro.tsx`, `LanzarConjuro.tsx`, `__tests__/…`; `apps/web/e2e/conjuros.spec.ts`; `apps/web/e2e/lanzar.spec.ts`.
- `apps/web/src/features/sessions/hilo/DanoExtra.tsx` (+ test).

**Modificar**
- `apps/api/prisma/schema.prisma`; `apps/api/src/app.module.ts` (importar `SpellbookModule`).
- `packages/shared/src/game-event.schema.ts` (`ACTIVITY_USED`, `SPELLBOOK_CHANGED`, `pendingDamage`), `activity.schema.ts` (`CharacterSheetActivity.name/description`, `usarActividadSchema.danoExtra`), `character-state.schema.ts` (`TEMPORARY_MODIFIER_TARGETS` + `inventoryItemId`), `index.ts`.
- `apps/api/src/activities/activities.module.ts`, `activities.service.ts`, `activities.service.spec.ts`.
- `apps/api/src/characters/character-sheet.service.ts` (siembra E-RM-2; `resolverAtaqueContraCa`; `applyPendingDamage` con `reason`; `danoExtra`), `damage-tray.controller.ts`.
- `apps/api/src/rolls/rolls.service.ts` (`interno.reason`).
- `apps/api/src/rules/catalog/resolve.ts` (`name` en la actividad, `textEs` en el rasgo), `rules/items.ts` (`efectosActivos` con temporales), `character-state/temporary-modifiers/*` (objetivo sobre objeto).
- `apps/web/src/features/character-sheet/pestanas/Conjuros.tsx`, `Actividades.tsx`, `BloquesDelPie.tsx`, `vocabulario.ts`, `api.ts`, `hooks.ts`; `apps/web/src/features/sessions/linea-de-log.ts`, `hilo/MensajeDelHilo.tsx`; e2e tocados: `hoja-pestanas.spec.ts`, `furia.spec.ts`, `combate.spec.ts`.
- Docs (en el mismo commit que la tarea que lo cambia): `docs/05-datos.md` (tabla nueva, enum), `docs/08-pruebas.md` (suites nuevas), `docs/09-jugar.md` (cómo se eligen y lanzan), `docs/decisiones.md` (D-CF-128..), `docs/06-pendientes.md`, `docs/07-historial.md` al cierre.

## Cómo se mide en el navegador contra el prototipo

El prototipo (`prototipo/mesa/2026-09-18-prototipo-mesa.html`, capturas en
`.superpowers/sdd/2026-09-18-noche-3a/prototipo-1280.png` y `-390.png`) no dibuja la pestaña Conjuros
de la hoja: dibuja el menú «Conjuros 6 [2]» de la barra de acciones (3A.3). Lo que 3A.2 compara:
**(a)** la fila de conjuro de la pestaña usa la misma densidad de lista que el elenco del prototipo
(una línea: nombre · nivel/escuela a la derecha en `text-muted`, acción a la derecha), sin rejilla
de iconos (spec §5); **(b)** al «Lanzar» con espacio superior, los radios «Nivel 1 (3 dardos) · Nivel
2 (4 dardos)» se pintan como el resto de radios de la casa (`GrupoDeRadios`), no un `<select>`;
**(c)** el daño de un conjuro aparece en el hilo como la tarjeta con «Aplicar» que el prototipo
llama «Bandeja del DM» — la bandeja lateral propia es de 3A.3. El orquestador saca captura de la
pestaña a 1280×800 y 390 con `e2e/conjuros.spec.ts` (`page.screenshot` a
`apps/web/e2e-resultados/conjuros-*.png`) y las pone al lado de las del prototipo en el informe.

---

### Task 1: Las tablas del SRD y el arranque por clase (catálogo puro)

**Files:**
- Create: `apps/api/src/rules/catalog/spell-knowledge.ts`, `apps/api/src/rules/catalog/spell-knowledge.spec.ts`
- Create: `apps/api/src/rules/catalog/spell-starters.ts`, `apps/api/src/rules/catalog/spell-starters.spec.ts`
- Modify: `apps/api/src/rules/catalog/index.ts` (exportar los dos)

**Interfaces:**
- Produces:
  ```ts
  export type ModeloDePreparacion = "PREPARA_DE_LISTA" | "LIBRO" | "CONOCIDOS" | "NINGUNO";
  export function modeloDePreparacion(classKey: string | undefined): ModeloDePreparacion;
  /** Columna «Cantrips Known» del SRD 5.1; 0 para quien no tiene. */
  export function trucosConocidos(classKey: string, level: number): number;
  /** Columna «Spells Known» (bardo, hechicero, brujo, explorador); `null` si la clase no la tiene. */
  export function conjurosConocidos(classKey: string, level: number): number | null;
  /** `modificador + nivel` (clérigo, druida, mago); `modificador + floor(nivel/2)` (paladín); mínimo 1; `null` si la clase no prepara. */
  export function topeDePreparados(classKey: string, level: number, spellcastingMod: number): number | null;
  /** Mago: 6 + 2·(nivel − 1). `null` para el resto. */
  export function tamanoDelLibro(classKey: string, level: number): number | null;
  /** D-CF-125: claves del catálogo con las que nace la lista, por clase; nivel mínimo para sembrar. */
  export const ARRANQUE_POR_CLASE: Readonly<Record<string, { desdeNivel: number; conjuros: readonly string[] }>>;
  export function arranqueDe(classKey: string, level: number): readonly string[];
  ```

- [ ] **Step 1: Escribir las pruebas que fallan** en `spell-knowledge.spec.ts`:

```ts
import {
  modeloDePreparacion, trucosConocidos, conjurosConocidos, topeDePreparados, tamanoDelLibro,
} from "./spell-knowledge";

describe("spell-knowledge — tablas del SRD 5.1", () => {
  it("modelo por clase", () => {
    expect(modeloDePreparacion("cleric")).toBe("PREPARA_DE_LISTA");
    expect(modeloDePreparacion("druid")).toBe("PREPARA_DE_LISTA");
    expect(modeloDePreparacion("paladin")).toBe("PREPARA_DE_LISTA");
    expect(modeloDePreparacion("wizard")).toBe("LIBRO");
    for (const c of ["bard", "sorcerer", "warlock", "ranger"]) expect(modeloDePreparacion(c)).toBe("CONOCIDOS");
    for (const c of ["fighter", "barbarian", "rogue", "monk", undefined]) expect(modeloDePreparacion(c)).toBe("NINGUNO");
  });
  it("trucos conocidos: 1.º/4.º/10.º", () => {
    expect(trucosConocidos("wizard", 1)).toBe(3);
    expect(trucosConocidos("wizard", 4)).toBe(4);
    expect(trucosConocidos("wizard", 10)).toBe(5);
    expect(trucosConocidos("sorcerer", 3)).toBe(4);
    expect(trucosConocidos("bard", 20)).toBe(4);
    expect(trucosConocidos("paladin", 5)).toBe(0);
    expect(trucosConocidos("fighter", 5)).toBe(0);
  });
  it("conjuros conocidos de tabla", () => {
    expect(conjurosConocidos("sorcerer", 1)).toBe(2);
    expect(conjurosConocidos("sorcerer", 3)).toBe(4);
    expect(conjurosConocidos("bard", 3)).toBe(6);
    expect(conjurosConocidos("warlock", 20)).toBe(15);
    expect(conjurosConocidos("ranger", 1)).toBe(0);
    expect(conjurosConocidos("ranger", 2)).toBe(2);
    expect(conjurosConocidos("wizard", 3)).toBeNull();
  });
  it("tope de preparados: el paladín es MEDIO nivel", () => {
    expect(topeDePreparados("cleric", 3, 3)).toBe(6);
    expect(topeDePreparados("wizard", 3, 3)).toBe(6);
    expect(topeDePreparados("paladin", 5, 2)).toBe(4);
    expect(topeDePreparados("paladin", 3, 2)).toBe(3);
    expect(topeDePreparados("cleric", 1, -2)).toBe(1); // mínimo de uno
    expect(topeDePreparados("sorcerer", 3, 3)).toBeNull();
  });
  it("tamaño del libro del mago: 6 + 2 por nivel", () => {
    expect(tamanoDelLibro("wizard", 1)).toBe(6);
    expect(tamanoDelLibro("wizard", 3)).toBe(10);
    expect(tamanoDelLibro("cleric", 3)).toBeNull();
  });
});
```

Y en `spell-starters.spec.ts`:

```ts
import { ARRANQUE_POR_CLASE, arranqueDe } from "./spell-starters";
import { SRD_SPELL_POR_KEY } from "./generado";
import { modeloDePreparacion, tamanoDelLibro, conjurosConocidos } from "./spell-knowledge";

describe("spell-starters (D-CF-125)", () => {
  it("cada clave existe en el catálogo, es de la clase y de nivel 1", () => {
    for (const [clase, { conjuros }] of Object.entries(ARRANQUE_POR_CLASE)) {
      for (const key of conjuros) {
        const spell = SRD_SPELL_POR_KEY.get(key);
        expect(spell).toBeDefined();
        expect(spell!.classes).toContain(clase);
        expect(spell!.level).toBe(1);
      }
    }
  });
  it("el arranque cabe en el tope del nivel en que se siembra", () => {
    expect(arranqueDe("wizard", 1)).toHaveLength(tamanoDelLibro("wizard", 1)!);
    expect(arranqueDe("sorcerer", 1)).toHaveLength(conjurosConocidos("sorcerer", 1)!);
    expect(arranqueDe("bard", 1)).toHaveLength(conjurosConocidos("bard", 1)!);
    expect(arranqueDe("warlock", 1)).toHaveLength(conjurosConocidos("warlock", 1)!);
    expect(arranqueDe("ranger", 1)).toEqual([]);
    expect(arranqueDe("ranger", 2)).toHaveLength(conjurosConocidos("ranger", 2)!);
  });
  it("las clases que preparan de lista no siembran nada", () => {
    for (const c of ["cleric", "druid", "paladin", "fighter"]) {
      expect(modeloDePreparacion(c) === "PREPARA_DE_LISTA" || modeloDePreparacion(c) === "NINGUNO").toBe(true);
      expect(arranqueDe(c, 3)).toEqual([]);
    }
  });
});
```

- [ ] **Step 2: Correr y ver el rojo**: `pnpm --filter @dnd/api exec jest src/rules/catalog/spell-knowledge.spec.ts src/rules/catalog/spell-starters.spec.ts` → falla por módulo inexistente.

- [ ] **Step 3: Implementar** `spell-knowledge.ts` con las tablas literales (comentario de cabecera con la fuente: SRD 5.1, tablas de clase «Cantrips Known» / «Spells Known», y las frases de *Preparing and Casting Spells*; verificadas contra el `ScaleValue` de `classes/*.yml` de Foundry, rules 2014):

```ts
const TRUCOS: Record<string, [number, number, number]> = {
  bard: [2, 3, 4], cleric: [3, 4, 5], druid: [2, 3, 4], sorcerer: [4, 5, 6], warlock: [2, 3, 4], wizard: [3, 4, 5],
};
export function trucosConocidos(classKey: string, level: number): number {
  const fila = TRUCOS[classKey];
  if (!fila || level < 1) return 0;
  return level >= 10 ? fila[2] : level >= 4 ? fila[1] : fila[0];
}
const CONOCIDOS: Record<string, Array<[number, number]>> = { // [nivel, conocidos], tramos hacia arriba
  bard: [[1,4],[2,5],[3,6],[4,7],[5,8],[6,9],[7,10],[8,11],[9,12],[10,14],[11,15],[13,16],[14,18],[15,19],[17,20],[18,22]],
  sorcerer: [[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[13,13],[15,14],[17,15]],
  warlock: [[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[11,11],[13,12],[15,13],[17,14],[19,15]],
  ranger: [[2,2],[3,3],[5,4],[7,5],[9,6],[11,7],[13,8],[15,9],[17,10],[19,11]],
};
export function conjurosConocidos(classKey: string, level: number): number | null {
  const tramos = CONOCIDOS[classKey];
  if (!tramos) return null;
  let n = 0;
  for (const [desde, valor] of tramos) if (level >= desde) n = valor;
  return n;
}
export function topeDePreparados(classKey: string, level: number, spellcastingMod: number): number | null {
  if (classKey === "cleric" || classKey === "druid" || classKey === "wizard") return Math.max(1, spellcastingMod + level);
  if (classKey === "paladin") return Math.max(1, spellcastingMod + Math.floor(level / 2)); // «half your paladin level, rounded down»
  return null;
}
export function tamanoDelLibro(classKey: string, level: number): number | null {
  return classKey === "wizard" ? 6 + 2 * Math.max(0, level - 1) : null;
}
```

`spell-starters.ts`:

```ts
export const ARRANQUE_POR_CLASE = {
  wizard:   { desdeNivel: 1, conjuros: ["magic-missile", "shield", "mage-armor", "burning-hands", "detect-magic", "sleep"] },
  sorcerer: { desdeNivel: 1, conjuros: ["magic-missile", "shield"] },
  bard:     { desdeNivel: 1, conjuros: ["cure-wounds", "healing-word", "thunderwave", "charm-person"] },
  warlock:  { desdeNivel: 1, conjuros: ["hellish-rebuke", "charm-person"] },
  ranger:   { desdeNivel: 2, conjuros: ["hunters-mark", "cure-wounds"] },
} as const satisfies Record<string, { desdeNivel: number; conjuros: readonly string[] }>;
export function arranqueDe(classKey: string, level: number): readonly string[] {
  const fila = (ARRANQUE_POR_CLASE as Record<string, { desdeNivel: number; conjuros: readonly string[] }>)[classKey];
  return fila && level >= fila.desdeNivel ? fila.conjuros : [];
}
```

- [ ] **Step 4: Verde** en los dos spec. **Mutación**: cambia el paladín a `spellcastingMod + level` → el spec del paladín se pone rojo; devuélvelo.
- [ ] **Step 5: `pnpm verify` y commit** `feat(api): SRD spell knowledge tables and per-class starter lists (D-CF-125, D-CF-127)` — cuerpo con las citas: *«choose a number of paladin spells equal to your Charisma modifier + half your paladin level, rounded down (minimum of one spell)»*, *«At 1st level, you know three cantrips of your choice from the wizard spell list»*.

---

### Task 2: `CharacterSpell` — migración, esquema compartido y dos sucesos nuevos

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: migraciones `character_spells` y `activity_events` (dos commits)
- Create: `packages/shared/src/spellbook.schema.ts`, `packages/shared/src/spellbook.schema.test.ts`
- Modify: `packages/shared/src/game-event.schema.ts`, `packages/shared/src/index.ts`
- Modify: `apps/web/src/features/sessions/linea-de-log.ts` (+ su test en `apps/web/src/features/sessions/__tests__/`)
- Modify: `docs/05-datos.md`

**Interfaces (Produces):**

```prisma
enum CharacterSpellState { EN_EL_LIBRO PREPARADO CONOCIDO }
model CharacterSpell {
  id          String              @id @default(cuid())
  characterId String
  /// Clave del catálogo generado (`"fireball"`); el prefijo `SRD:` lo pone el servidor al exponerla. Nunca clave foránea.
  spellKey    String
  estado      CharacterSpellState
  createdAt   DateTime            @default(now())
  character   Character           @relation(fields: [characterId], references: [id], onDelete: Cascade)
  @@unique([characterId, spellKey])
}
// GameEventType: + ACTIVITY_USED, SPELLBOOK_CHANGED
```

```ts
// packages/shared/src/spellbook.schema.ts
export const CHARACTER_SPELL_STATES = ["EN_EL_LIBRO", "PREPARADO", "CONOCIDO"] as const;
export const characterSpellStateSchema = z.enum(CHARACTER_SPELL_STATES);
export type CharacterSpellState = z.infer<typeof characterSpellStateSchema>;
export const MODELOS_DE_PREPARACION = ["PREPARA_DE_LISTA", "LIBRO", "CONOCIDOS", "NINGUNO"] as const;
export type ModeloDePreparacion = (typeof MODELOS_DE_PREPARACION)[number];
/** `PUT …/spellbook/:spellKey` — `null` = quitar de la lista. */
export const setCharacterSpellSchema = z.object({ estado: characterSpellStateSchema.nullable() });
export type SetCharacterSpellInput = z.infer<typeof setCharacterSpellSchema>;
export type MecanicaDeConjuro = "ataque" | "salvacion" | "dados" | "utilidad" | "prueba" | "texto";
export interface SpellbookEntry {
  key: string; nameEs: string; nameEn: string; level: number; school: SpellSchool;
  castingTime: Activacion; range: Rango; concentration: boolean; ritual: boolean;
  estado: CharacterSpellState | null;
  /** Se puede lanzar ahora: PREPARADO, o CONOCIDO (incluye trucos). Un EN_EL_LIBRO no. */
  lanzable: boolean;
  mecanica: MecanicaDeConjuro;
  /** Cuántos objetivos pide la actividad de lanzamiento: "ninguno" | "uno" | "varios". */
  objetivos: "ninguno" | "uno" | "varios";
  /** Tiene `escalado.por === "espacio"` (se ofrece elegir espacio). */
  escalaPorEspacio: boolean;
  textEs: string | null; textEn: string; higherLevelsEs?: string; higherLevelsEn?: string;
}
export interface SpellbookTope { max: number; actual: number; }
export interface SpellbookResponse {
  modelo: ModeloDePreparacion;
  entradas: SpellbookEntry[];
  topes: { preparados?: SpellbookTope; trucos?: SpellbookTope; libro?: SpellbookTope; conocidos?: SpellbookTope };
  /** Avisos derivados («7 de 6 preparados»); frases en español las compone la pantalla desde `topes`, aquí solo códigos. */
  avisos: Array<"PREPARADOS_DE_MAS" | "TRUCOS_DE_MAS" | "LIBRO_DE_MAS" | "CONOCIDOS_DE_MAS">;
  /** Espacios por nivel, para pintar «nivel 2 · 1/2» sin una segunda consulta. */
  espacios: Array<{ nivel: number; actual: number; max: number }>;
}
```

```ts
// game-event.schema.ts — dos payloads nuevos en la unión discriminada
z.object({
  type: z.literal("ACTIVITY_USED"),
  actividadKey: z.string().min(1),        // "spell:magic-missile" o "second-wind"
  name: z.string().min(1),                // nameEs de catálogo (ya en español, nunca enum)
  kind: z.enum(["SPELL", "FEATURE"]),
  spellLevel: z.number().int().min(0).max(9).optional(),
  nivelDeEspacio: z.number().int().min(1).max(9).optional(),
  targetCharacterIds: z.array(z.string().min(1)).max(12).optional(),
  fueraDeRegla: z.array(z.enum(["SIN_ESPACIO", "NO_PREPARADO"])).optional(),
}),
z.object({
  type: z.literal("SPELLBOOK_CHANGED"),
  spellKey: z.string().min(1),
  name: z.string().min(1),
  cambio: z.enum(["PREPARADO", "DESPREPARADO", "APRENDIDO", "OLVIDADO", "SEMBRADO"]),
  estado: characterSpellStateSchema.nullable(),
  fueraDeRegla: z.array(z.enum(["EN_COMBATE", "SOBRE_EL_TOPE"])).optional(),
}),
```

- [ ] **Step 1: Test rojo** `packages/shared/src/spellbook.schema.test.ts`: `setCharacterSpellSchema.parse({estado:"PREPARADO"})` ok, `{estado:null}` ok, `{estado:"LISTO"}` lanza; y en `game-event.schema.test.ts` un `ACTIVITY_USED` válido pasa y uno con `kind: "OTRO"` falla; un `SPELLBOOK_CHANGED` con `cambio: "SEMBRADO"` pasa.
- [ ] **Step 2: Rojo** — `pnpm --filter @dnd/shared test`.
- [ ] **Step 3: Migración 1** — añadir el enum y el modelo a `schema.prisma` (con la relación `spells CharacterSpell[]` en `Character`), `pnpm --filter @dnd/api exec prisma migrate dev --name character_spells` (en la base del worktree), comprobar el SQL generado (`CREATE TYPE "CharacterSpellState"`, `CREATE TABLE "CharacterSpell"`, índice único). `pnpm --filter @dnd/api prisma:generate`. Añadir la tabla a la cascada que cuenta `apps/api/test/campaigns.e2e-spec.ts` (borrar campaña se lleva `CharacterSpell`: contar filas). **Commit** `feat(api): CharacterSpell table and state enum (migration character_spells)` con `docs/05-datos.md` actualizado (fila en la tabla de modelos: qué es, por qué cadena y no FK, D-CF-125).
- [ ] **Step 4: Migración 2** — `ACTIVITY_USED` y `SPELLBOOK_CHANGED` en `enum GameEventType` (comentario: «un valor se añade, nunca se borra»), `prisma migrate dev --name activity_events`. Esquemas en `game-event.schema.ts` + `GAME_EVENT_TYPES` (la lista donde está `XP_AWARDED`, línea ~147). `linea-de-log.ts`: dos `case` nuevos con la forma de `XP_AWARDED`:
  - `ACTIVITY_USED`: `kind === "SPELL"` → «lanza Proyectil mágico» + ` (espacio de nivel N)` si `nivelDeEspacio` y ` — sin espacio` si `fueraDeRegla` incluye `SIN_ESPACIO` y ` — sin tenerlo preparado` si `NO_PREPARADO`; `FEATURE` → «usa Segundo aliento». Con `ctx.sujeto` como `XP_AWARDED` (sujeto en cabecera).
  - `SPELLBOOK_CHANGED`: «prepara Bola de fuego» / «deja de preparar X» / «aprende X» / «olvida X» / «recibe su libro de conjuros» (`SEMBRADO`); si `fueraDeRegla` trae `EN_COMBATE`: ` · fuera de regla: en combate`; `SOBRE_EL_TOPE`: ` · por encima del tope`.
  Test RTL/vitest de `linea-de-log` con esos casos (el fichero de test existente de `linea-de-log`). `tipo-de-mensaje.ts` del hilo: clasificar los dos como «Números»/«Relato» según lo que haga `RESOURCE_SPENT` (mirar el fichero y seguir su criterio).
- [ ] **Step 5: Verde**, `pnpm verify`, **commit** `feat: ACTIVITY_USED and SPELLBOOK_CHANGED events (migration activity_events) with their thread lines`.

---

### Task 3: `SpellbookService` — listar, cambiar estado, sembrar (T10)

**Files:**
- Create: `apps/api/src/spellbook/spellbook.module.ts`, `spellbook.controller.ts`, `spellbook.service.ts`, `spellbook.service.spec.ts`
- Create: `apps/api/src/rules/catalog/spell-activities.ts`, `spell-activities.spec.ts`
- Modify: `apps/api/src/app.module.ts`, `apps/api/src/characters/character-sheet.service.ts:1121-1160` (siembra), `apps/api/src/characters/characters.module.ts` (exportar lo que haga falta o importar `SpellbookModule` — sin ciclo: `SpellbookModule` importa `CampaignsModule`, `GameEventsModule`, `CharactersModule`; **la siembra la hace una función pura + escritura directa con `tx`, no el servicio**, para que `CharacterSheetService` no importe `SpellbookService`)
- Create: `apps/api/test/libro-de-conjuros.e2e-spec.ts`
- Modify: `docs/08-pruebas.md` (fila de la suite), `docs/09-jugar.md` (§ jugador: «Tus conjuros»)

**Interfaces:**
- Consumes: Task 1 (`modeloDePreparacion`, `trucosConocidos`, `conjurosConocidos`, `topeDePreparados`, `tamanoDelLibro`, `arranqueDe`), Task 2 (modelo, esquemas, sucesos).
- Produces:
  ```ts
  // spell-activities.ts
  export function claveDeConjuro(spellKey: string, indice = 0): string; // "spell:fireball" | "spell:fireball@1"
  export function parsearClaveDeActividad(key: string): { tipo: "spell"; spellKey: string; indice: number } | { tipo: "feature"; key: string };
  /** La actividad con la que se LANZA: la primera cuya `activation` coincide con `castingTime`, si no la [0]; `undefined` si no tiene ninguna. */
  export function actividadDeLanzamiento(spell: SrdSpell): Actividad | undefined;
  export function mecanicaDe(spell: SrdSpell): MecanicaDeConjuro;
  export function objetivosDe(spell: SrdSpell): "ninguno" | "uno" | "varios";
  // spellbook.service.ts
  export class SpellbookService {
    list(userId, campaignId, characterId): Promise<SpellbookResponse>;
    setEstado(userId, campaignId, characterId, spellKey, input: SetCharacterSpellInput): Promise<SpellbookResponse>;
    /** ¿Puede lanzarlo ahora? PREPARADO o CONOCIDO. Devuelve el motivo si no. */
    lanzable(tx | prisma, characterId, spellKey): Promise<{ ok: true } | { ok: false; motivo: "NO_PREPARADO" | "NO_ES_SUYO" }>;
  }
  /** Pura + escritura con `tx`: filas del arranque (D-CF-125) y su SPELLBOOK_CHANGED SEMBRADO. */
  export async function sembrarLibro(tx: Prisma.TransactionClient, events: GameEventsService, userId: string, campaignId: string, character: { id: string; visibility: Visibility }, classKey: string, level: number): Promise<number>;
  ```
- Rutas (`campaigns/:campaignId/characters/:characterId/spellbook`): `GET` → `list`; `PUT :spellKey` (body `setCharacterSpellSchema`) → `setEstado`. Ambas con `JwtAuthGuard`; `GET` para quien puede **ver** el personaje (`requireVisibleCharacter`); `PUT` dueño o DM (`requireOwnerOrDM`).

- [ ] **Step 1: Tests rojos.** `spell-activities.spec.ts`: `actividadDeLanzamiento(hunters-mark)` es la `utilidad` con `activation.coste === "BONUS"` (no la `dados` FREE); `magic-missile` → la única; `magic-weapon` (0 actividades) → `undefined`; `parsearClaveDeActividad("spell:fireball@1")` → `{tipo:"spell", spellKey:"fireball", indice:1}`; `"second-wind"` → feature. `spellbook.service.spec.ts` con Prisma simulado (mismo patrón que `activities.service.spec.ts`):
  - `list` de un mago nivel 3 INT 16 con 2 `PREPARADO`, 4 `EN_EL_LIBRO`, 1 truco `CONOCIDO`: `modelo: "LIBRO"`, `topes.preparados = {max: 6, actual: 2}`, `topes.trucos = {max: 3, actual: 1}`, `topes.libro = {max: 10, actual: 6}`; las entradas son **todos los conjuros de `classes` con `wizard`**, y solo las del libro/preparadas llevan `estado`; `lanzable` true solo en PREPARADO/CONOCIDO.
  - `list` de un clérigo: `modelo: "PREPARA_DE_LISTA"`, sin `topes.libro`; todas las entradas de la lista de clérigo con `estado: null` salvo las preparadas.
  - `list` de un hechicero: `topes.conocidos`; un guerrero: `modelo: "NINGUNO"`, `entradas: []`.
  - `setEstado` de un conjuro que **no es de la clase** → `BadRequestException` con el nombre («Curar heridas no está en la lista del mago»); de un truco a `PREPARADO` → 400 («un truco se conoce, no se prepara»); a `EN_EL_LIBRO` en un clérigo → 400 (solo el mago tiene libro).
  - `setEstado` a `PREPARADO` con el tope lleno → **se escribe igual** y el suceso lleva `fueraDeRegla: ["SOBRE_EL_TOPE"]`; con el personaje combatiente de un encuentro `ACTIVE` → `["EN_COMBATE"]` (D-CF-126); `estado: null` borra la fila y escribe `OLVIDADO`/`DESPREPARADO` (mago: pasar de PREPARADO a EN_EL_LIBRO es `DESPREPARADO`; borrar del libro es `OLVIDADO`).
  - `sembrarLibro(tx, …, "wizard", 3)` crea 6 filas `EN_EL_LIBRO` y un `SPELLBOOK_CHANGED` `SEMBRADO` por fila; `"cleric"` crea 0; `"ranger", 1` crea 0 y `"ranger", 2` crea 2 `CONOCIDO`.
- [ ] **Step 2: Rojo** (`pnpm --filter @dnd/api exec jest src/spellbook src/rules/catalog/spell-activities.spec.ts`).
- [ ] **Step 3: Implementar.** Reglas del servicio, en este orden:
  1. `list`: `requireVisibleCharacter`; clase del personaje (`findClass`, si `classKey`); `modelo`; conjuros de la clase = `SRD_SPELLS.filter(s => s.classes.includes(classKey))`; filas `CharacterSpell` del personaje; **un mago solo lista los del libro + trucos + (para «añadir al libro») el resto de su lista** — la pantalla los separa por `estado`, el servidor manda todo con `estado`; el modificador de lanzamiento sale de `getSheet` (`sheet.derived` → el modificador de `spellcastingAbility`; usar `Math.floor((abilities[ab] - 10) / 2)` sobre la hoja derivada, no sobre la fila cruda: las anulaciones y los temporales cuentan). Espacios: `CharacterResource` `spell-slot-N` del personaje.
  2. `setEstado`: `requireOwnerOrDM`; el conjuro existe (`SRD_SPELL_POR_KEY`) y está en la lista de la clase (si no, 400 con `nameEs`); reglas de estado por modelo (truco → solo `CONOCIDO`/null; `LIBRO`: `EN_EL_LIBRO`/`PREPARADO`/null; `PREPARA_DE_LISTA`: `PREPARADO`/null; `CONOCIDOS`: `CONOCIDO`/null; `NINGUNO`: 400 «esta clase no lanza»); en una transacción: `upsert`/`delete` + `SPELLBOOK_CHANGED` con `fueraDeRegla` calculado (`EN_COMBATE` si `prisma.combatant.findFirst({ where: { characterId, encounter: { status: "ACTIVE", session: { campaignId } } } })`; `SOBRE_EL_TOPE` si tras el cambio `actual > max` del tope que toca). Devuelve `list`.
  3. `sembrarLibro`: `arranqueDe(classKey, level)` → `createMany` con estado `EN_EL_LIBRO` si `modelo === "LIBRO"`, `CONOCIDO` si `CONOCIDOS`; un `SPELLBOOK_CHANGED { cambio: "SEMBRADO" }` por conjuro, visibilidad del personaje.
  4. En `character-sheet.service.ts`, dentro del bloque `if (character.classKey === null && typeof data.classKey === "string")`, **después** de `tx.character.update` en la transacción, llamar a `sembrarLibro(tx, this.events, userId, campaignId, {id, visibility}, data.classKey, nivel)`.
  5. Controlador + módulo; `app.module.ts` importa `SpellbookModule`.
- [ ] **Step 4: e2e** `apps/api/test/libro-de-conjuros.e2e-spec.ts` (patrón de cabecera de `puerta-de-efectos.e2e-spec.ts`: DM + jugador, campaña, invitación): el jugador crea un personaje y fija clase `wizard` por `PATCH …/sheet` (mirar cómo lo hace `character-state.e2e-spec.ts` con el brujo) → `GET spellbook` trae `modelo LIBRO`, 6 entradas `EN_EL_LIBRO` y `topes.libro {max: 6, actual: 6}`; `PUT magic-missile {estado: PREPARADO}` → `topes.preparados.actual 1`; `PUT cure-wounds {estado: PREPARADO}` → 400; `PUT fire-bolt {estado: CONOCIDO}` → truco, `topes.trucos.actual 1`; otro jugador → 403 en el `PUT`, 404 en el `GET` de un personaje `DM_ONLY`; el registro (`GET /campaigns/:id/events`) trae `SPELLBOOK_CHANGED` con `cambio: "PREPARADO"`. Segundo bloque: un clérigo fija clase → `GET` trae 0 filas y `modelo PREPARA_DE_LISTA`; preparar 7 con SAB 16 nivel 3 (tope 6) → los 7 escritos y el séptimo suceso con `fueraDeRegla: ["SOBRE_EL_TOPE"]`. Correrlo: `pnpm --filter @dnd/api exec jest --config test/jest-e2e.json test/libro-de-conjuros.e2e-spec.ts` (con la base del worktree arriba).
- [ ] **Step 5: `pnpm verify`, commit** `feat(api): spellbook — list, set state, seed on first class (T10, D-CF-125/126/127)` con las citas del SRD (*Wizard → Spellbook*, *Cleric → Preparing and Casting Spells*, *Cantrips*).

---

### Task 4: Lanzar — el conjuro entra en `usar()` (espacio por nivel, T18, escalado, bandeja, `ACTIVITY_USED`)

**Files:**
- Modify: `apps/api/src/activities/activities.module.ts` (`actividadCatalogada` → `spell:`), `activities.service.ts`, `activities.service.spec.ts`
- Modify: `apps/api/src/rules/catalog/spell-activities.ts` (+spec): `consumoDeEspacio`, `dadosEscalados`
- Modify: `packages/shared/src/game-event.schema.ts` (`pendingDamage.attackResolvedEventId` opcional + `reason`), `apps/api/src/rolls/rolls.service.ts` (`interno.pendingDamage.reason`, `attackResolvedEventId?`), `apps/api/src/characters/character-sheet.service.ts` (`applyPendingDamage`: `reason` del payload, y solo si falta busca el `ATTACK_RESOLVED`; `pendingDamageDeLaTirada` igual)
- Modify: `apps/api/src/activities/activities.module.ts` (importar `SpellbookModule`, `RollsModule`)
- Create: `apps/api/test/lanzar-conjuros.e2e-spec.ts`
- Modify: `docs/08-pruebas.md`, `docs/decisiones.md` (D-CF-128: daño directo a otro va a la bandeja)

**Interfaces:**
- Consumes: Task 3 (`SpellbookService.lanzable`, `parsearClaveDeActividad`, `actividadDeLanzamiento`).
- Produces:
  ```ts
  // spell-activities.ts
  /** Nivel 0 → []; nivel N → [{recurso: `spell-slot-${nivelElegido ?? N}`, cantidad: 1}]; nivelElegido < N → lanza BadRequest. */
  export function consumoDeEspacio(spell: SrdSpell, nivelDeEspacio?: number): Consumo[];
  /** Copia de la expresión con los dados extra: por espacio → +(nivelDeEspacio − nivelBase)·n d caras; por nivel de personaje → +1 al 5.º, +2 al 11.º, +3 al 17.º. */
  export function dadosEscalados(expresion: ExpresionDeDados, ctx: { nivelBase: number; nivelDeEspacio?: number; nivelDePersonaje: number }): { n?: number; caras?: number; bonus?: Origen; signo: 1 | -1; tipoDeDano?: DamageType };
  // rolls.service.ts
  interno.pendingDamage?: { targetCharacterId: string; damageType: DamageType; reason: string; attackResolvedEventId?: string }
  // game-event.schema.ts
  pendingDamage: { targetCharacterId, damageType, amount, reason: z.string().min(1).max(200).optional(), attackResolvedEventId: z.string().min(1).optional(), appliedEventId? }
  // usar() devuelve además:
  { aviso?, cd?, traza?, rollEventIds?: string[], fueraDeRegla?: Array<"SIN_ESPACIO"|"NO_PREPARADO"> }
  ```

Reglas de `usar()` para `spell:<key>`:
1. Resolver `spell` + actividad (`actividadDeLanzamiento` o la del índice); 404 si no existe o no tiene actividad.
2. `SpellbookService.lanzable(actor, spellKey)`: si `NO_ES_SUYO` → **400** («Bola de fuego no es de este personaje»); si `NO_PREPARADO` (está en el libro sin preparar) → **se lanza igual** con `fueraDeRegla: ["NO_PREPARADO"]` (cuenta y avisa; el DM decide).
3. Consumo: `consumoDeEspacio(spell, opciones?.nivelDeEspacio)`; **un espacio a 0 no rechaza**: `consumir` devuelve `{ok:false}` → hoy `usar` devuelve `aviso` y **no aplica nada**; para conjuros se mantiene igual (sin espacio no hay conjuro), con `fueraDeRegla: ["SIN_ESPACIO"]` en la respuesta y **sin** suceso. (Un truco no consume.)
4. `ctx.ataqueDeConjuro = hoja.sheet?.derived["attack.spell"]?.total` en `contextoDeDerivacion` (junto a `cdDeConjuro`).
5. `tirarDados(expresion, ctx, nivelBase)` aplica `dadosEscalados` antes de tirar (para conjuros; una aptitud no tiene nivel base → sin escalado por espacio, sí por nivel de personaje si lo declara).
6. Caso `dados` con `signo === -1` y destinatarios ≠ actor: **no** `changeHpFromEffect`; **una tirada por destinatario** con `RollsService.roll(userId, campaignId, { expression: "<n>d<caras>+<bonus>", label: "Daño de <nameEs>", characterId: actor.id, mode: "NORMAL", audience }, { pendingDamage: { targetCharacterId, damageType: tipoDeDano ?? "FORCE", reason: "Conjuro: <nameEs>" } })` — **fuera de la transacción del consumo** (abre la suya) y **después** de ella; `rollEventIds` en la respuesta. Curación (`signo 1`) y daño al propio actor siguen por `changeHpFromEffect` dentro de la transacción como hoy. *Ruling D-CF-128 — SRD 5.1 «Damage Rolls»: «roll the damage once for all of them» se respeta tirando UNA expresión y escribiendo N tiradas idénticas no: se tira por destinatario porque la bandeja aplica por tirada; el DM ve N tarjetas. Coste si está mal: N tiradas donde el SRD dice una — se anota en 06.*
   > **Corrección al escribir el plan**: para respetar la cita, se tira **una vez** con `rollExpression` y se escriben N `ABILITY_ROLL` con **los mismos dados** — `RollsService` gana `interno.resultadoFijo?: DiceRollResult` (lo que solo pone el servidor) y, si viene, no vuelve a tirar. Así N tarjetas, un solo azar. Es lo que se implementa; el párrafo anterior queda como el camino descartado.
7. Suceso `ACTIVITY_USED` dentro de la transacción (tras el consumo): `{ actividadKey, name: nameEs, kind: "SPELL", spellLevel, nivelDeEspacio, targetCharacterIds, fueraDeRegla }`, sujeto el actor, visibilidad del actor. Para una aptitud (`kind: "FEATURE"`, `name` = `feature.name`) **también se escribe**, así toda actividad deja línea.
8. `gastarActivacion` como hoy.

- [ ] **Step 1: Tests rojos** en `spell-activities.spec.ts` (`consumoDeEspacio(fireball)` → `spell-slot-3`; `(fireball, 5)` → `spell-slot-5`; `(fireball, 2)` lanza; `(fire-bolt)` → `[]`; `dadosEscalados(fireball.dados, {nivelBase:3, nivelDeEspacio:5, nivelDePersonaje:5})` → `n: 10`; `dadosEscalados(fire-bolt.dados, {nivelBase:0, nivelDePersonaje:11})` → `n: 3`; nivel 4 → `n: 1`) y en `activities.service.spec.ts` (catálogo simulado con `spell:magic-missile`): lanzarlo contra un objetivo escribe `ACTIVITY_USED` y **no** llama a `changeHpFromEffect`; llama a `rolls.roll` con `pendingDamage.reason "Conjuro: Proyectil mágico"`; `cure-wounds` sobre otro sí llama a `changeHpFromEffect`; un conjuro que `lanzable` dice `NO_ES_SUYO` → 400; `NO_PREPARADO` → se lanza con `fueraDeRegla`; `fire-bolt` no consume nada; `magic-missile` consume `spell-slot-1`, y con `nivelDeEspacio: 2` consume `spell-slot-2`.
- [ ] **Step 2: Rojo.**
- [ ] **Step 3: Implementar** (orden: `spell-activities` → esquema `pendingDamage` + `rolls.service` (`reason`, `resultadoFijo`, `attackResolvedEventId?`) → `applyPendingDamage` (`reason` del payload primero; si no viene, el camino viejo del `ATTACK_RESOLVED`) → `actividadCatalogada` → `usar`). `damagePreview` no cambia.
- [ ] **Step 4: e2e** `apps/api/test/lanzar-conjuros.e2e-spec.ts`: mago nivel 3 con `magic-missile` PREPARADO, `fire-bolt` CONOCIDO, `sleep` EN_EL_LIBRO; DM instancia un goblin `SRD:goblin` y lo revela; sesión + encuentro con los dos. (1) `POST …/activities/spell:magic-missile/use { objetivos: [goblin] }` → 201, `spell-slot-1` baja de 4 a 3 (`GET resources`), el registro tiene `ACTIVITY_USED` (`name: "Proyectil mágico"`) y un `ABILITY_ROLL` con `pendingDamage.targetCharacterId = goblin`, **sin** `HP_CHANGED`; el DM `POST rolls/:id/apply-damage` → 200 y los PG del goblin bajan; el mago hace el mismo `POST` → 403. (2) con `nivelDeEspacio: 2` → baja `spell-slot-2`, `ACTIVITY_USED.nivelDeEspacio 2`. (3) `spell:sleep` → 201 con `fueraDeRegla: ["NO_PREPARADO"]`. (4) `spell:cure-wounds` → 400. (5) gastar los espacios de nivel 1 restantes y lanzar → 201 con `fueraDeRegla: ["SIN_ESPACIO"]` y sin `ACTIVITY_USED` nuevo. (6) `spell:fire-bolt` no toca ningún recurso.
- [ ] **Step 5: `pnpm verify`, commit** `feat(api): cast a spell through usar() — slot by level and chosen level (T18), scaling, direct damage to the DM tray, ACTIVITY_USED` con la cita *«Casting a Spell at a Higher Level: When a spellcaster casts a spell using a slot that is of a higher level than the spell, the spell assumes the higher level for that casting»* y *«Damage Rolls: If a spell or other effect deals damage to more than one target at the same time, roll the damage once for all of them»*.

---

### Task 5: Ataque de conjuro contra la CA (T19)

**Files:**
- Modify: `apps/api/src/characters/character-sheet.service.ts:2951-3100` (extraer `resolverAtaqueContraCa`), `activities.service.ts` (caso `ataque`), `activities.service.spec.ts`, `character-sheet.service.spec.ts` (si prueba `resolveAttack`, ajustar sin aflojar)
- Create: `apps/api/test/ataque-de-conjuro.e2e-spec.ts`

**Interfaces (Produces):**
```ts
// character-sheet.service.ts — público para ActivitiesService, misma mecánica que resolveAttack
async resolverAtaqueContraCa(userId: string, campaignId: string, atacante: FilaPersonaje, target: FilaPersonaje, input: {
  bono: number; label: string; mode: RollMode; spendInspiration?: boolean; audience?: RollAudience; attackRef?: string; attackName: string;
}): Promise<{ roll: RollResult; verdict?: AttackVerdict; attackResolvedEventId?: string }>;
```
`resolveAttack` queda como: buscar el ataque del cuadro + `datosDeMesaParaAtaque` + comprobar objetivo (`sePuedeApuntar`) → `resolverAtaqueContraCa(...)`. **Dentro** de la pieza extraída vive todo lo que hoy va de `caDelObjetivo` a `events.record(ATTACK_RESOLVED)` (condiciones del objetivo, ayuda, audiencia por defecto, veredicto, suceso) — y devuelve el `id` del `ATTACK_RESOLVED` (hoy `record` lo devuelve; si no, capturarlo).

Caso `ataque` en `usar()` (conjuro o aptitud con exactamente **un** objetivo ≠ actor; sin objetivo → solo traza, como hoy): antes de la transacción, `sePuedeApuntar` (404 si no); tras la transacción del consumo: `resolverAtaqueContraCa` con `bono = resolverOrigen(actividad.ataque.bono, ctx).valor`, `label: "Ataque de conjuro: <name>"`, `attackName: name`; si `verdict` es `HIT`/`CRITICAL` y la actividad trae `dados`: tirar el daño (escalado aplicado; **dados dobles si `CRITICAL`**, misma regla que `rollAttack`) con `rolls.roll(..., { pendingDamage: { targetCharacterId, damageType, reason: "Conjuro: <name>", attackResolvedEventId } })`. Respuesta: `{ …, verdict, rollEventIds }`.

- [ ] **Step 1: Tests rojos**: unitaria de `usar` (`spell:fire-bolt` con un objetivo llama a `characterSheet.resolverAtaqueContraCa` y, con `verdict: "HIT"`, a `rolls.roll` con `pendingDamage.attackResolvedEventId`; con `MISS` no tira daño; sin objetivo, solo traza); e2e `ataque-de-conjuro.e2e-spec.ts`: mago con `fire-bolt` conocido contra un goblin al que el DM anula la CA a 1 (`PATCH …/sheet/overrides`, mirar cómo lo hace `puerta-de-efectos.spec.ts`): respuesta con `verdict: "HIT"`, un `ATTACK_RESOLVED` con `attackName: "Rayo de fuego"` cuyo sujeto es el goblin, y un `ABILITY_ROLL` de daño con `pendingDamage` apuntando al goblin; el DM aplica y los PG bajan; **la CA no aparece en ningún cuerpo** (misma comprobación que `ataque-comparado-en-el-servidor.e2e-spec.ts`); con CA anulada a 30 → `MISS` y ningún `pendingDamage`.
- [ ] **Step 2: Rojo.** **Step 3: Implementar** (extraer primero, con `pnpm --filter @dnd/api test -- character-sheet` en verde antes de tocar `usar`). **Step 4: Verde + e2e.**
- [ ] **Step 5: `pnpm verify`, commit** `feat(api): spell attack against AC — one attack mechanic for weapons and activities (T19)` con la cita *«Some spells require the caster to make an attack roll… Your attack bonus with a spell attack equals your spellcasting ability modifier + your proficiency bonus»* (SRD 5.1, *Attack Rolls*).

---

### Task 6: La pestaña «Conjuros» (T11, parte 1: elegir)

**Files:**
- Create: `apps/web/src/dominio/conjuros.ts`, `apps/web/src/dominio/__tests__/conjuros.test.ts`
- Create: `apps/web/src/features/spellbook/api.ts`, `hooks.ts`, `LibroDeConjuros.tsx`, `FilaDeConjuro.tsx`, `__tests__/LibroDeConjuros.test.tsx`, `__tests__/FilaDeConjuro.test.tsx`
- Modify: `apps/web/src/features/character-sheet/pestanas/Conjuros.tsx`, `apps/web/e2e/hoja-pestanas.spec.ts` (el `EmptyState` viejo desaparece: buscar «Los conjuros llegan» y sustituir por la aserción nueva), `apps/web/src/features/character-sheet/__tests__/pestanas/Conjuros.test.tsx`
- Create: `apps/web/e2e/conjuros.spec.ts`
- Modify: `docs/09-jugar.md`, `docs/08-pruebas.md`

**Interfaces:**
- Consumes: `GET/PUT …/spellbook` (Task 3), tipos de `@dnd/shared` (`SpellbookResponse`, `SpellbookEntry`, `CharacterSpellState`, `SetCharacterSpellInput`).
- Produces:
  ```ts
  // dominio/conjuros.ts
  export const NOMBRE_ESCUELA: Record<SpellSchool, string>; // abj Abjuración · con Conjuración · div Adivinación · enc Encantamiento · evo Evocación · ill Ilusión · nec Nigromancia · trs Transmutación
  export const NOMBRE_ESTADO_CONJURO: Record<CharacterSpellState, string>; // En el libro · Preparado · Conocido
  export const NOMBRE_NIVEL_CONJURO: (level: number) => string; // "Truco" | "Nivel N"
  export function fraseDeTope(clave: "preparados"|"trucos"|"libro"|"conocidos", tope: SpellbookTope): string; // "5 de 6 preparados"
  export const NOMBRE_MECANICA: Record<MecanicaDeConjuro, string>; // Ataque · Salvación · Daño o curación · Utilidad · Prueba · Texto
  // features/spellbook/hooks.ts
  export function useSpellbook(campaignId, characterId): UseQueryResult<SpellbookResponse>;
  export function useSetSpellState(campaignId, characterId): UseMutationResult<SpellbookResponse, Error, { spellKey: string; estado: CharacterSpellState | null }>;
  export const spellbookKey = (campaignId, characterId) => ["campaigns", campaignId, "characters", characterId, "spellbook"];
  ```

Pantalla (spec §5; regla de casa: lista, no rejilla de iconos; `FilterChip` de `ui/Collection`; radios con explicación; se toca donde se lee):
- **Cabecera de la tarjeta**: contador «5 de 6 preparados · 2 de 3 trucos» (`fraseDeTope`) y, si `avisos` trae algo, una línea `role="status"` en `text-warning-text`: «Por encima del tope: el DM decide».
- **Zona 1 «Listos para lanzar»**: entradas con `lanzable`, ordenadas por nivel y nombre; cada fila (`FilaDeConjuro`): nombre (`nameEs`), a la derecha `NOMBRE_NIVEL_CONJURO · NOMBRE_ESCUELA` en `text-muted`, chips «Concentración»/«Ritual» si aplica; acción secundaria «Quitar»/«Dejar de preparar» (`puedeEditar`); el botón **«Lanzar»** lo añade la Task 7 (aquí se deja el hueco: la fila acepta `accionPrincipal?: ReactNode`).
- **Zona 2 «Disponibles»** (`modelo !== "NINGUNO"`): buscador (`<input type="search">` con `aria-label="Buscar conjuro"`), `FilterChip` por nivel (Truco, 1…9 solo los que existan en la lista) y por escuela; la lista filtrada de las entradas **no lanzables** (mago: `EN_EL_LIBRO` + las que no están en el libro, marcadas «Fuera del libro»); acción por fila según modelo: `PREPARA_DE_LISTA` → «Preparar»; `LIBRO` → «Añadir al libro» si no está, «Preparar» si está; `CONOCIDOS` → «Aprender»; truco → «Conocer». **Ningún botón se deshabilita por tope** (cuenta y avisa); si `EN_COMBATE` es posible no se sabe en la pantalla: el aviso llega en el suceso del hilo y en la respuesta.
- **Detalle**: pulsar el nombre despliega `textEs ?? textEn` (y `higherLevelsEs` bajo «A niveles superiores») en un `<details>`; nunca HTML.
- `modelo === "NINGUNO"` → `EmptyState` «Esta clase no lanza conjuros» (solo se monta la pestaña si `lanzaConjuros`, así que casi nunca).
- La tarjeta «Espacios de conjuro» existente se conserva arriba, pintando ahora `actual/max` desde `espacios` («Nivel 1: 3 / 4»).

- [ ] **Step 1: Tests rojos** (RTL, `api.ts` simulado, `QueryClientProvider` + `MemoryRouter`, patrón de `Actividades.test.tsx`): pinta el contador desde `topes`; «Preparar» manda `{spellKey, estado: "PREPARADO"}`; para un mago una entrada fuera del libro ofrece «Añadir al libro» → `EN_EL_LIBRO`; el buscador filtra por `nameEs` sin acentos (reusar `normalizar` de `wikilinks` si existe exportada; si no, `toLowerCase` + `normalize("NFD")`); el chip «Nivel 1» deja solo nivel 1; con `avisos: ["PREPARADOS_DE_MAS"]` sale el `status`; **ningún enum en el DOM** (`expect(screen.queryByText(/PREPARADO|abj|LIBRO/)).toBeNull()`).
- [ ] **Step 2: Rojo. Step 3: Implementar. Step 4: Verde.**
- [ ] **Step 5: e2e** `apps/web/e2e/conjuros.spec.ts` (helpers de `puerta-de-efectos.spec.ts`; el personaje se hace mago con la API como `combate.spec.ts` para no montar el diálogo): abrir la hoja a página, pestaña «Conjuros»; ver «6 de 6 en el libro», preparar «Proyectil mágico» y «Escudo» → «2 de 6 preparados»; conocer «Rayo de fuego» → «1 de 3 trucos»; buscar «bola» → una fila «Bola de fuego» marcada «Fuera del libro»; **captura** a 1280×800 y a 390×844 (`apps/web/e2e-resultados/conjuros-1280.png`, `-390.png`). `hoja-pestanas.spec.ts`: cambiar la aserción del `EmptyState` viejo por «Listos para lanzar». Escrito, no corrido.
- [ ] **Step 6: `pnpm verify`, commit** `feat(web): Spells tab — ready list, available list with search and filters, counters (T11)`.

---

### Task 7: Lanzar desde la pestaña (T11, parte 2) y las aptitudes con nombre, texto y usos

**Files:**
- Create: `apps/web/src/features/spellbook/LanzarConjuro.tsx`, `__tests__/LanzarConjuro.test.tsx`
- Modify: `apps/web/src/features/spellbook/FilaDeConjuro.tsx`, `LibroDeConjuros.tsx`
- Modify: `packages/shared/src/activity.schema.ts` (`CharacterSheetActivity.name: string; description?: string`), `apps/api/src/rules/catalog/resolve.ts` (`name: feature.name`; `ResolvedFeature.textEs?: string | null` desde `feature.textEs ?? feature.description`), `apps/api/src/rules/catalog/types.ts` si hace falta
- Modify: `apps/web/src/features/character-sheet/Actividades.tsx` (usa `actividad.name`; borra `NOMBRE_ACTIVIDAD`/`nombreActividad` de `vocabulario.ts` y sus tests), `BloquesDelPie.tsx` (`RasgosYAptitudes` con `<details>` por rasgo cuando hay `textEs`), `api.ts` (`ResolvedFeatureDto.textEs?`), tests RTL afectados, `apps/web/e2e/furia.spec.ts` y `combate.spec.ts` (grep «Sin traducir» y «Usar Furia» → siguen igual porque `name` de la Furia es «Furia»; comprobar)
- Create: `apps/web/e2e/lanzar.spec.ts`

**Interfaces:**
- Consumes: `usarActividad(campaignId, characterId, "spell:<key>", { objetivos?, nivelDeEspacio? })` (Task 4/5), `useCombatientesDelEncuentro` (hooks de character-sheet), `GrupoDeRadios` (`ui/`), `PanelFlotante` (`ui/`), `useSpellbook` (Task 6).
- Produces: `LanzarConjuro({ campaignId, characterId, entrada: SpellbookEntry, espacios })` — botón «Lanzar» que, según `entrada`: **sin objetivos** (`objetivos: "ninguno"`) y sin espacio superior posible → lanza al pulsar; **con objetivos** → abre `PanelFlotante` con la lista de combatientes (bando contrario primero; `objetivos: "uno"` = elegir uno y lanzar; `"varios"` = casillas y botón «Lanzar sobre N»); **fuera de combate** con objetivos → la lista sale de `useCharacters` + PNJ visibles (mirar `useCombatientesDelEncuentro`: si no hay encuentro, ofrecer al propio personaje y a los personajes de la mesa); **con espacio superior posible** (`escalaPorEspacio || level >= 1`, y hay `espacios` de nivel > `level` con `actual > 0`) → `GrupoDeRadios` «¿Con qué espacio?» con una opción por nivel disponible: «Nivel 1 · 3 dardos (quedan 3)» — la explicación la compone la pantalla desde `escalaPorEspacio` y `nivelDeEspacio` (si no escala: «Nivel 3 · igual que a nivel 1»); por defecto el nivel del conjuro. Tras la respuesta: `aviso`/`fueraDeRegla` en línea (`role="alert"` si es un rechazo; `text-warning-text` si es aviso), `verdict` («impacta»/«falla»/«crítico») si viene; invalidar `spellbookKey`, `resourcesKey`, `sheetKey`, `encountersKey`, y el hilo (`logKey` que use `HiloDeSesion`).

- [ ] **Step 1: Tests rojos**: `LanzarConjuro.test.tsx` — un truco sin objetivos lanza con `{}`; `magic-missile` con encuentro abre la lista, elegir «Goblin» y pulsar manda `{ objetivos: [id] }`; con espacios de nivel 2 disponibles aparece el grupo de radios y elegir «Nivel 2» manda `nivelDeEspacio: 2`; la respuesta `{ fueraDeRegla: ["SIN_ESPACIO"] }` pinta «Sin espacios de nivel 1 — no se lanzó»; `Actividades.test.tsx` — pinta `actividad.name`, nunca «Sin traducir»; `RasgosYAptitudes` con `textEs` pinta un `<details>` con el texto.
- [ ] **Step 2: Rojo. Step 3: Implementar** (API primero: `name`/`textEs`; `pnpm --filter @dnd/api test -- resolve` en verde; luego web). **Step 4: Verde.**
- [ ] **Step 5: e2e** `apps/web/e2e/lanzar.spec.ts` (dos contextos, DM y jugadora maga; goblin instanciado y revelado con CA anulada a 1; sesión y encuentro como `combate.spec.ts`): la maga abre su hoja (cajón «Tu hoja» de la mesa, pestaña Conjuros), pulsa «Lanzar» en «Proyectil mágico», elige «Goblin» y «Nivel 1»; en su hilo aparece «lanza Proyectil mágico» y una tarjeta de daño «Daño pendiente»; los espacios dicen «Nivel 1: 3 / 4»; **en el navegador del DM** la tarjeta trae «Aplicar»; el DM aplica y los PG del goblin bajan en su elenco; luego la maga lanza «Rayo de fuego» → en su hilo «impacta» y otra tarjeta pendiente. Escrito, no corrido.
- [ ] **Step 6: `pnpm verify`, commit** `feat(web): cast from the Spells tab — targets, slot level, warnings; features show name, text and uses (T11)`.

---

### Task 8: Daño extra al impactar — Ataque furtivo y Castigo divino en la bandeja

**Files:**
- Modify: `packages/shared/src/game-event.schema.ts` (`pendingDamage.extras?: Array<{ key: "sneak-attack" | "divine-smite"; label: string; amount: number; rollEventId: string }>`), `packages/shared/src/roll.schema.ts` o nuevo `packages/shared/src/damage-extra.schema.ts` (`addDamageExtraSchema = z.object({ key: z.enum(["sneak-attack","divine-smite"]), nivelDeEspacio: z.number().int().min(1).max(5).optional() })`)
- Modify: `apps/api/src/characters/character-sheet.service.ts` (`addDamageExtra`, y `applyPendingDamage` suma `extras`), `damage-tray.controller.ts` (`POST rolls/:rollEventId/damage-extra`), `damagePreview` (devuelve `extras` y `amount` total)
- Create: `apps/api/test/dano-extra.e2e-spec.ts`
- Create: `apps/web/src/features/sessions/hilo/DanoExtra.tsx` (+ test); Modify `BandejaDeDano.tsx`, `MensajeDelHilo.tsx`
- Modify: `docs/08-pruebas.md`, `docs/decisiones.md` (D-CF-129: el extra lo marca el jugador sobre su tirada de daño pendiente y el DM lo confirma al aplicar; Marca del cazador queda en 3B con ficha)

**Reglas (SRD 5.1):** *Sneak Attack*: «Once per turn, you can deal an extra 1d6 damage to one creature you hit with an attack if you have advantage on the attack roll… You don't need advantage… if another enemy of the target is within 5 feet» — el servidor **no** sabe la ventaja ni la adyacencia: **cuenta y avisa**, el DM confirma; los dados por nivel salen de la tabla de escala `rogue-sneak-attack` (`SRD_CLASS_SCALES_GENERADAS.rogue["sneak-attack"]`, `mezclarScales`: el valor de un tramo es el **número de d6**). *Divine Smite*: «when you hit a creature with a melee weapon attack, you can expend one spell slot… 2d8 for a 1st-level spell slot, plus 1d8 for each spell level higher than 1st, to a maximum of 5d8» — consume `spell-slot-N` (409 si no queda, aquí sí: gastar lo que no hay es 409, E-08-3); el +1d8 contra muertos vivientes/infernales queda como texto.

Permiso: **el dueño del personaje que tiró el daño** (o el DM) sobre una tirada con `pendingDamage` **sin aplicar**; una vez por tirada y por clave (409 si se repite). El extra tira sus dados (`rolls.roll` con `label: "Ataque furtivo (2d6)"`, sin `pendingDamage`) y se escribe en `pendingDamage.extras` con `jsonb_set … WHERE appliedEventId IS NULL` (mismo patrón E-PE-4); `applyPendingDamage` aplica `amount + Σ extras.amount` con el mismo `damageType`.

- [ ] **Step 1: Tests rojos**: unitaria de `addDamageExtra` (pícaro nivel 3 → `2d6`; nivel 5 → `3d6`; paladín con `nivelDeEspacio: 2` → `3d8` y consume `spell-slot-2`; segunda vez → 409; sobre una tirada ya aplicada → 409; quien no es dueño ni DM → 403; un guerrero → 400 «no tiene Ataque furtivo»); e2e `dano-extra.e2e-spec.ts` (pícaro con daga contra goblin CA 1: ataque, daño, `POST damage-extra {key:"sneak-attack"}` → `preview.amount` sube y `extras[0].label "Ataque furtivo"`; el DM aplica y el `HP_CHANGED.delta` es la suma); RTL de `DanoExtra`: para el dueño con `extrasDisponibles` (`preview` los trae: `["sneak-attack"]` si la hoja del atacante tiene el rasgo `rogue:sneak-attack`; `["divine-smite"]` si `paladin:divine-smite` y tiene espacios) pinta la casilla «Añadir Ataque furtivo (2d6)»; marcarla manda el `POST`; el DM ve «+ Ataque furtivo 7» en la línea del preview.
- [ ] **Step 2–4: Rojo, implementar, verde.** La lista `extrasDisponibles` la calcula `damagePreview` desde `getSheet` del atacante (`features` por `labelKey`) y `CharacterResource`; y `damagePreview` pasa a responder también **al dueño del atacante** con solo `{ extrasDisponibles, extras }` (sin `resulting` ni resistencias: eso sigue siendo del DM/dueño del objetivo — dos formas en la misma respuesta, tipadas).
- [ ] **Step 5: `pnpm verify`, commit** `feat: extra damage on hit — Sneak Attack and Divine Smite marked by the player, confirmed by the DM in the damage tray` con las dos citas.

---

### Task 9: Encantar — *Arma mágica* como modificador temporal sobre un objeto (T15)

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (`TemporaryModifier.inventoryItemId String?` + índice), migración `temporary_modifier_item`
- Modify: `packages/shared/src/character-state.schema.ts` (`TEMPORARY_MODIFIER_TARGETS` + `"item.weaponAttack"`, `"item.weaponDamage"`; `grantTemporaryModifierSchema.inventoryItemId?: cuid` obligatorio si el `target` empieza por `item.`), `apps/api/src/character-state/temporary-modifiers/temporary-modifiers.service.ts` (validar que el objeto es del personaje y es arma), `apps/api/src/rules/items.ts` (`efectosActivos` suma `item.temporales` como `weaponAttack`/`weaponDamage`), `character-sheet.service.ts` (al resolver el inventario, adjuntar los temporales vivos de cada fila: `temporales: [{ effect, amount, reason }]`), `activities.service.ts` (caso `encantar`)
- Modify: `apps/api/src/rules/catalog/spell-activities.ts` (`ENCANTAMIENTOS: Record<string, { bonoPorNivel: (nivelDeEspacio) => number }>` = `{ "magic-weapon": { bono: n >= 6 ? 3 : n >= 4 ? 2 : 1 } }`, y `actividadDeLanzamiento` devuelve una `utilidad` sintética con `activation` del conjuro para esos)
- Create: `apps/api/test/encantar.e2e-spec.ts`
- Modify: `apps/web/src/features/spellbook/LanzarConjuro.tsx` (objetivo = un **arma del inventario** del propio personaje o de un aliado visible: lista de `InventoryItem` equipados de tipo arma, `usarActividadSchema.itemId?: cuid`), `apps/web/src/features/inventory/FilaObjeto.tsx`/`DetalleDeObjeto.tsx` (chip «+1 (Arma mágica, hasta …)»), tests
- Modify: `packages/shared/src/activity.schema.ts` (`usarActividadSchema.itemId`)

**Regla (SRD 5.1, *Magic Weapon*):** «You touch a nonmagical weapon. Until the spell ends, that weapon becomes a magic weapon with a +1 bonus to attack rolls and damage rolls. At Higher Levels… 4th level or higher, the bonus increases to +2. …6th level or higher, the bonus increases to +3.» Concentración, 1 hora → `expiresAtClock = reloj + 3600` **y** la condición `concentrating-magic-weapon` en el lanzador (mirar cómo `usar` aplica concentración hoy vía `effects`/`duration.concentracion`; si no lo hace, aplicar la condición reservada `concentrating-<key>` como hace la puerta de efectos con las salvaciones — comprobar en `conditions.service.ts` la clave de concentración y usarla). Al perder la concentración, el modificador **no** se borra solo: el DM lo quita (ficha en 06 si no cabe).

- [ ] **Step 1: Tests rojos**: unitaria de `efectosActivos` con `temporales: [{effect: "weaponAttack", amount: 1}]` → el ataque suma +1 con paso de traza `temporary:Arma mágica`; `usar("spell:magic-weapon", { itemId })` crea el `TemporaryModifier` con `inventoryItemId`, `target "item.weaponAttack"` **y** otro `"item.weaponDamage"`, `amount 1` (con `nivelDeEspacio: 4` → 2), `expiresAtClock` = reloj + 3600, consume `spell-slot-2`, escribe `ACTIVITY_USED`; sobre un objeto que no es arma → 400; e2e `encantar.e2e-spec.ts`: un mago con `magic-weapon` preparado encanta la espada del guerrero (aliado visible); el cuadro de ataques del guerrero sube +1 con traza; avanzar el reloj 3601 s lo vence y vuelve al bono base.
- [ ] **Step 2–4: migración (`prisma migrate dev --name temporary_modifier_item`, commit propio con solo esquema+migración+`05-datos`), implementar, verde.**
- [ ] **Step 5: `pnpm verify`, commit** `feat: enchant — Magic Weapon as a temporary modifier on an inventory item read by efectosActivos (T15)` con la cita.

---

### Task 10: Cierre de 3A.2 — documentación, archivo, estado

**Files:** `docs/07-historial.md` (entrada «3A.2 · Elegir, lanzar y usar (2026-09-18/19)» con tareas, commits, cómo revertir), `docs/06-pendientes.md` (la ficha P1 «Un mago no tiene conjuros» **se cierra y se archiva** con su medición a `docs/_archivo/pendientes-cerrados-2026-09-18-3a2.md`; nuevas fichas: Marca del cazador, *Shillelagh*, concentración que no borra el encantamiento, N tarjetas por un daño de área directo si aplica, y lo que la revisión final deje), `docs/decisiones.md` (D-CF-128..N con lo decidido en las tareas), `docs/como-seguir.md` §0, `docs/01-arquitectura.md` (módulo `spellbook`), `docs/09-jugar.md`, `pnpm update:estado`.

- [ ] Leer cada ledger de tarea y copiar sus `Ruling:` a `decisiones.md`.
- [ ] `pnpm update:estado`; `pnpm verify`; commit `docs: close 3A.2 — history, decisions, pending, archive`.
- [ ] Revisión Opus de la rama entera (`git diff main...HEAD`), UNA ola de arreglos, re-revisión acotada; Playwright en `hoja-pestanas`, `conjuros`, `lanzar`, `furia`, `combate`, `puerta-de-efectos`; e2e de API nuevos + `puerta-de-efectos`, `character-sheet`, `campaigns`, `usos-concurrentes`, `concurrencia-puerta`.
- [ ] `git checkout main && git merge --no-ff 3a2/elegir-lanzar-y-usar` (mensaje en inglés), `git push origin main`.

---

## Self-review

- **Spec §3 (tres modelos)**: Task 1 + 3. **§4 (tabla, enum, lo derivado no se guarda, cuenta y avisa)**: Task 2 + 3. **§5 (pantalla: tres zonas, FilterChip, contador, lanzar = misma fila)**: Task 6 + 7. **§6 (no rituales, no copiar con coste, no brujo)**: nada lo contradice — el ritual se pinta como chip, nada más. **§8 / D-CF-125..127**: Task 1, 3, 7. **T18** Task 4; **T19** Task 5; **daño extra** Task 8; **T15** Task 9; «Aptitudes con usos» Task 7; cierre «guerrero, bárbaro, mago y clérigo de nivel 3 juegan con lo suyo» → Tasks 3–7; «pícaro y paladín tienen su daño extra» → Task 8.
- **Placeholders**: ninguna tarea dice «similar a»; cada una lleva sus tests con nombres y sus reglas literales.
- **Tipos**: `SpellbookResponse`/`SpellbookEntry`/`SpellbookTope` (Task 2) se usan igual en 3, 6, 7; `claveDeConjuro`/`parsearClaveDeActividad`/`actividadDeLanzamiento` (Task 3) en 4, 5, 9; `resolverAtaqueContraCa` (Task 5) solo en 5; `pendingDamage.reason/extras` (Tasks 4 y 8) coherentes con `applyPendingDamage`.
