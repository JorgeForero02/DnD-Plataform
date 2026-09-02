import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { HojaCalculada } from "../HojaCalculada";
import * as characterSheetApi from "../api";
import type {
  CalculatedSheet,
  CharacterRow,
  ConditionRow,
  ResourceRow,
  SheetResponse,
} from "../api";

// Tarea 2A.10 — "ninguna clave de enumeración aparece en pantalla": la hoja completa, con datos
// que a propósito incluyen claves crudas del motor (`half-elf`, `wizard`, `LONG_REST`,
// `exhaustion`, `stealth`…), no debe imprimir ninguna de ellas — todo pasa por `vocabulario.ts`.

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    // `LegalNotice` (ui/) usa `<Link>` de react-router: hace falta un Router alrededor aunque
    // este componente no navegue por sí mismo.
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

function paso(labelKey: string, amount = 1, op: "base" | "add" = "add") {
  return { op, amount, sourceType: "manual" as const, sourceKey: "x", labelKey };
}

function valor(total: number, labelKey: string) {
  return { key: labelKey, total, steps: [paso(labelKey, total, "base")] };
}

const character: CharacterRow = {
  id: "ch1",
  campaignId: "c1",
  ownerId: "u1",
  name: "Elowen",
  race: null,
  class: null,
  level: 3,
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
  choices: { "half-elf-skills": ["stealth", "perception"] },
  currentHp: 15,
  tempHp: 0,
  version: 2,
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  overrides: null,
};

const sheet: CalculatedSheet = {
  derived: {
    ac: valor(12, "ac.unarmored"),
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
  spellSlots: [{ spellLevel: 1, slots: 4 }],
  spellSlotResetOn: "LONG_REST",
};

const sheetResponse: SheetResponse = {
  character,
  sheet,
  hp: { current: 15, max: 22, temp: 0, version: 2, exceedsMax: false },
  deathSaves: { successes: 0, failures: 0, status: "alive" },
};

const resources: ResourceRow[] = [
  {
    id: "r1",
    characterId: "ch1",
    key: "spell-slot-1",
    label: "Espacios de conjuro de nivel 1",
    current: 4,
    max: 4,
    resetOn: "LONG_REST",
    grantedBy: "OWNER",
  },
];

const conditions: ConditionRow[] = [
  {
    id: "cond1",
    characterId: "ch1",
    key: "exhaustion",
    level: 2,
    note: null,
    appliedById: "dm1",
    createdAt: "x",
  },
];

describe("HojaCalculada — ninguna clave de enumeración llega a pantalla", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(characterSheetApi, "fetchSheet").mockResolvedValue(sheetResponse);
    vi.spyOn(characterSheetApi, "fetchResources").mockResolvedValue(resources);
    vi.spyOn(characterSheetApi, "fetchConditions").mockResolvedValue(conditions);
  });

  it("traduce raza, subclase, clase, reposición de recursos y condiciones", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<HojaCalculada campaignId="c1" characterId="ch1" puedeEditar={false} />, {
      wrapper: wrapper(qc),
    });

    await waitFor(() => expect(screen.getByText(/Semielfo/)).toBeInTheDocument());

    // Nombres traducidos presentes. Recursos y condiciones cuelgan de sus propias consultas
    // (`useResources`/`useConditions`), independientes de la de la hoja: cada una espera su
    // propio asentamiento en vez de asumir que ya resolvió porque la hoja lo hizo.
    expect(screen.getByText(/Mago/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Agotamiento (nivel 2)")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/descanso largo/)).toBeInTheDocument());

    const cuerpo = document.body.textContent ?? "";
    // Ninguna clave cruda del motor, ni de la base de datos, llega al texto de la pantalla.
    for (const clave of [
      "half-elf",
      "wizard",
      "LONG_REST",
      "SHORT_REST",
      "exhaustion",
      "PLAYERS",
    ]) {
      expect(cuerpo.includes(clave), `«${clave}» no debería aparecer en pantalla`).toBe(false);
    }
  });

  it("muestra el aviso de elección pendiente como tarea, y el de fórmula de CA descartada", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<HojaCalculada campaignId="c1" characterId="ch1" puedeEditar={false} />, {
      wrapper: wrapper(qc),
    });

    await waitFor(() =>
      expect(screen.getByRole("region", { name: "elecciones pendientes" })).toBeInTheDocument(),
    );
    expect(screen.getByRole("region", { name: "elecciones pendientes" }).textContent).toMatch(
      /Elige 1 habilidad/,
    );
    expect(screen.getByText(/Con De cuero tendrías CA 13/)).toBeInTheDocument();
  });
});
