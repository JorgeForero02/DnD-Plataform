import type { ReactNode } from "react";
import { vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import * as characterSheetApi from "../../api";
import type {
  CalculatedSheet,
  CharacterRow,
  ConditionRow,
  ResourceRow,
  SheetResponse,
} from "../../api";
import type { Disposicion, PropsDePestana } from "../../pestanas/tipos";

// Tarea 4 (spec 2026-09-11, «la hoja a página completa») — la armadura de la hoja de personaje
// («Elowen», nivel 3, semielfa maga) que `Cabecera.test.tsx` y `HojaCalculada.test.tsx`
// mantenían cada uno por su cuenta, palabra por palabra: mismo personaje, misma hoja calculada,
// mismos ayudantes `paso`/`valor`/`wrapper`. Vivía dos veces, y una prueba nueva de pestaña
// (`Numeros.test.tsx`, `Ataques.test.tsx`, `Rasgos.test.tsx`) habría sido la tercera copia.
//
// No es un fichero `.test.tsx` a propósito — no tiene ningún `it` — así que Vitest no lo recoge
// como suite (`vite.config.ts` filtra por `*.{test,spec}.{ts,tsx}`); de llamarse así, fallaría
// por no tener ninguna prueba dentro.

export function paso(labelKey: string, amount = 1, op: "base" | "add" = "add") {
  return { op, amount, sourceType: "manual" as const, sourceKey: "x", labelKey };
}

export function valor(total: number, labelKey: string) {
  return { key: labelKey, total, steps: [paso(labelKey, total, "base")] };
}

export const character: CharacterRow = {
  id: "ch1",
  campaignId: "c1",
  ownerId: "u1",
  name: "Elowen",
  level: 3,
  archivedAt: null,
  color: null,
  bio: null,
  visibility: "PLAYERS",
  str: 10,
  dex: 14,
  con: 12,
  int: 16,
  wis: 10,
  cha: 18,
  raceKey: "half-elf",
  subraceKey: null,
  classKey: "wizard",
  subclassKey: null,
  choices: { "half-elf-skills": ["stealth", "perception"] },
  currentHp: 15,
  tempHp: 0,
  version: 2,
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  overrides: null,
};

export const sheet: CalculatedSheet = {
  derived: {
    // La CA lleva dos pasos a propósito: uno **sin** causa editable (la armadura llega en 2B) y
    // otro que sí la tiene (el modificador de Destreza). Es lo que H5 tiene que distinguir.
    ac: {
      key: "ac",
      total: 12,
      steps: [paso("ac.unarmored", 10, "base"), paso("abilityMod.dex", 2)],
    },
    initiative: valor(2, "abilityMod.dex"),
    passivePerception: valor(10, "passive.base"),
    "abilityMod.str": valor(0, "abilityMod.str"),
    "abilityMod.dex": valor(2, "abilityMod.dex"),
    "abilityMod.con": valor(1, "abilityMod.con"),
    "abilityMod.int": valor(3, "abilityMod.int"),
    "abilityMod.wis": valor(0, "abilityMod.wis"),
    "abilityMod.cha": valor(4, "abilityMod.cha"),
    "save.str": valor(0, "abilityMod.str"),
    "save.dex": valor(2, "abilityMod.dex"),
    "save.con": valor(1, "abilityMod.con"),
    "save.int": valor(5, "abilityMod.int"),
    "save.wis": valor(2, "abilityMod.wis"),
    "save.cha": valor(4, "abilityMod.cha"),
    "skill.acrobatics": valor(2, "abilityMod.dex"),
    "skill.animal-handling": valor(0, "abilityMod.wis"),
    "skill.arcana": valor(5, "abilityMod.int"),
    "skill.athletics": valor(0, "abilityMod.str"),
    "skill.deception": valor(4, "abilityMod.cha"),
    "skill.history": valor(3, "abilityMod.int"),
    "skill.insight": valor(0, "abilityMod.wis"),
    "skill.intimidation": valor(4, "abilityMod.cha"),
    "skill.investigation": valor(3, "abilityMod.int"),
    "skill.medicine": valor(0, "abilityMod.wis"),
    "skill.nature": valor(3, "abilityMod.int"),
    "skill.perception": valor(2, "skill.perception"),
    "skill.performance": valor(4, "abilityMod.cha"),
    "skill.persuasion": valor(4, "abilityMod.cha"),
    "skill.religion": valor(3, "abilityMod.int"),
    "skill.sleight-of-hand": valor(4, "abilityMod.dex"),
    "skill.stealth": valor(4, "abilityMod.dex"),
    "skill.survival": valor(0, "abilityMod.wis"),
    "senses.darkvision": valor(60, "senses.darkvision"),
    "attack.melee": valor(2, "abilityMod.str"),
    "attack.ranged": valor(4, "abilityMod.dex"),
    "attack.spell": valor(5, "abilityMod.int"),
    spellSaveDc: valor(13, "spellSaveDc.base"),
    proficiencyBonus: valor(2, "proficiencyBonus"),
  },
  warnings: [
    { code: "unresolved_choice", key: "human-language", data: { needed: 1, picked: 0 } },
    {
      code: "ac_formula_discarded",
      key: "ac",
      data: { formula: "leather", labelKey: "armor.leather", total: 13 },
    },
  ],
  pendingChoices: [
    {
      grantId: "human-language",
      labelKey: "race.human.language",
      kind: "skillChoice",
      choose: 1,
      from: ["stealth"],
    },
  ],
  features: [
    { sourceKey: "wizard", labelKey: "class.wizard.spellcasting", name: "Lanzamiento de conjuros" },
  ],
  speeds: { walk: 30 },
  raceKey: "half-elf",
  subraceKey: undefined,
  classKey: "wizard",
  attacksPerAction: 1,
  weaponProficiencies: ["simple"],
  spellSlots: [{ spellLevel: 1, slots: 4 }],
  spellSlotResetOn: "LONG_REST",
};

export const sheetResponse: SheetResponse & { sheet: CalculatedSheet } = {
  character,
  sheet,
  attacks: [],
  money: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
  hp: { current: 15, max: 22, temp: 0, version: 2, exceedsMax: false },
  deathSaves: { successes: 0, failures: 0, status: "alive" },
};

export function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    // `LegalNotice` (ui/) usa `<Link>` de react-router: hace falta un Router alrededor aunque el
    // componente bajo prueba no navegue por sí mismo.
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

/**
 * Monta una pestaña de la hoja (`PropsDePestana`) con la armadura de arriba. `overrides` sustituye
 * campos sueltos de `sheetResponse` (p. ej. `attacks` para `Ataques.test.tsx`) sin tener que
 * reconstruir el objeto entero en cada prueba.
 *
 * Tarea 5 — `Recursos` y `Estado` cuelgan de consultas propias (`useResources`/`useConditions`,
 * como ya hacía `HojaCalculada.test.tsx`), no del `data` de `GET .../sheet`. `resources` y
 * `conditions` en `overrides` mockean esas dos por su espacio de nombres (`characterSheetApi.
 * fetchResources`/`fetchConditions`) — la misma trampa documentada en `hooks.ts`— y no llegan al
 * objeto `data` que reciben las pestañas. Sin ellas, ambas responden `[]`.
 */
export function renderPestana(
  Componente: (props: PropsDePestana) => ReactNode,
  { disposicion, puedeEditar = false }: { disposicion: Disposicion; puedeEditar?: boolean },
  overrides?: Partial<SheetResponse & { sheet: CalculatedSheet }> & {
    resources?: ResourceRow[];
    conditions?: ConditionRow[];
  },
): ReturnType<typeof render> {
  const { resources, conditions, ...datosDeLaHoja } = overrides ?? {};
  vi.spyOn(characterSheetApi, "fetchResources").mockResolvedValue(resources ?? []);
  vi.spyOn(characterSheetApi, "fetchConditions").mockResolvedValue(conditions ?? []);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const data: SheetResponse & { sheet: CalculatedSheet } = { ...sheetResponse, ...datosDeLaHoja };
  return render(
    <Componente
      campaignId="c1"
      characterId="ch1"
      data={data}
      puedeEditar={puedeEditar}
      disposicion={disposicion}
    />,
    { wrapper: wrapper(qc) },
  );
}
