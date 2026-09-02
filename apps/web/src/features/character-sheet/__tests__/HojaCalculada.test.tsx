import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { HojaCalculada } from "../HojaCalculada";
import * as characterSheetApi from "../api";
import type {
  Catalog,
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
    expect(screen.getByText(/Con Cuero tendrías CA 13/)).toBeInTheDocument();
  });
});

// --- H3 · cabecera fija + dos columnas, y H5 · la traza navega hasta su causa ---------------
//
// Lo que jsdom SÍ puede demostrar aquí es la **estructura**: qué números viven en la cabecera,
// qué va en cada columna y en qué orden, y a dónde lleva el foco un paso de la traza. Lo que NO
// puede es que la cabecera se quede pegada arriba al desplazar —no hay maquetación, ni alto, ni
// `position` calculada—, y por eso eso se mide en `apps/web/e2e/hoja.spec.ts` y no aquí.

const catalogo: Catalog = {
  races: [{ key: "half-elf", name: "Semielfo", subraces: [] }],
  classes: [{ key: "wizard", name: "Mago", hitDie: 6 }],
  armor: [],
};

function pintarHoja(puedeEditar = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<HojaCalculada campaignId="c1" characterId="ch1" puedeEditar={puedeEditar} />, {
    wrapper: wrapper(qc),
  });
}

describe("H3 — la cabecera fija y las dos columnas", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(characterSheetApi, "fetchSheet").mockResolvedValue(sheetResponse);
    vi.spyOn(characterSheetApi, "fetchResources").mockResolvedValue(resources);
    vi.spyOn(characterSheetApi, "fetchConditions").mockResolvedValue(conditions);
    vi.spyOn(characterSheetApi, "fetchCatalog").mockResolvedValue(catalogo);
  });

  it("la cabecera reúne los cinco números que se consultan en mitad de un turno", async () => {
    pintarHoja();
    const cabecera = await screen.findByRole("region", { name: "resumen de combate" });
    const texto = cabecera.textContent ?? "";

    for (const rotulo of ["CA", "Iniciativa", "Velocidad (pies)", "PG", "Competencia"]) {
      expect(texto.includes(rotulo), `«${rotulo}» tiene que estar en la cabecera`).toBe(true);
    }
    // Y sus valores, no solo los rótulos: la CA (12) y la velocidad (30) se despliegan desde
    // aquí, y los PG se leen enteros.
    const dentro = within(cabecera);
    expect(dentro.getByRole("button", { name: "12" })).toBeInTheDocument();
    expect(dentro.getByRole("button", { name: "30" })).toBeInTheDocument();
    expect(texto).toContain("15 / 22");
  });

  it("los PG de la cabecera no traen el control de daño: la acción vive en su bloque", async () => {
    pintarHoja(true);
    const cabecera = await screen.findByRole("region", { name: "resumen de combate" });
    expect(cabecera.querySelector("input")).toBeNull();
    // El control sí existe, pero fuera de la cabecera.
    const campo = await screen.findByLabelText("Cambio de puntos de golpe");
    expect(cabecera.contains(campo)).toBe(false);
  });

  it("características → salvaciones → habilidades bajan seguidas por la misma columna", async () => {
    pintarHoja();
    const caracteristicas = await screen.findByRole("region", { name: "características" });
    const salvaciones = screen.getByRole("region", { name: "salvaciones" });
    const habilidades = screen.getByRole("region", { name: "habilidades" });

    // Las tres en la MISMA columna. Si alguien parte la cadena entre dos columnas, esto se rompe.
    const columna = salvaciones.parentElement!;
    expect(columna.contains(caracteristicas)).toBe(true);
    expect(columna.contains(habilidades)).toBe(true);

    // Y en ese orden: la contigüidad es la explicación, así que el orden es parte del contrato.
    const orden = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(orden(caracteristicas, salvaciones)).toBe(true);
    expect(orden(salvaciones, habilidades)).toBe(true);

    // Nada accionable entre medias: condiciones, descansos y PG viven en la otra columna.
    const condiciones = await screen.findByRole("region", { name: "condiciones" });
    expect(columna.contains(condiciones)).toBe(false);
  });

  it("el hueco del inventario está rotulado y dice cuándo llega", async () => {
    pintarHoja();
    const hueco = await screen.findByRole("region", { name: "inventario" });
    expect(hueco.textContent).toMatch(/2B/);
    // Dibujado, no un glifo de fuente (regla vinculante de iconos).
    expect(hueco.querySelector("svg")).not.toBeNull();
  });
});

describe("H5 — cada paso de la traza lleva a su causa editable", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(characterSheetApi, "fetchSheet").mockResolvedValue(sheetResponse);
    vi.spyOn(characterSheetApi, "fetchResources").mockResolvedValue(resources);
    vi.spyOn(characterSheetApi, "fetchConditions").mockResolvedValue(conditions);
    vi.spyOn(characterSheetApi, "fetchCatalog").mockResolvedValue(catalogo);
  });

  it("«+2 Modificador de Destreza» en la traza de la CA lleva el foco a la casilla de Destreza", async () => {
    pintarHoja(true);
    const cabecera = await screen.findByRole("region", { name: "resumen de combate" });

    // Desplegar la traza de la CA.
    const casillaCA = await screen.findByRole("button", { name: "12" });
    expect(cabecera.contains(casillaCA)).toBe(true);
    fireEvent.click(casillaCA);

    const paso = screen.getByRole("button", { name: /Modificador de Destreza/ });
    fireEvent.click(paso);

    // El foco acaba en la PUNTUACIÓN de Destreza, que es lo editable — no en el modificador,
    // que es otro número derivado.
    expect(document.activeElement).toBe(screen.getByLabelText("Destreza"));
  });

  it("un paso sin causa editable no finge ser navegable", async () => {
    pintarHoja(true);
    const casillaCA = await screen.findByRole("button", { name: "12" });
    fireEvent.click(casillaCA);

    // «Sin armadura» sale de un equipo que todavía no existe (fase 2B): es texto, no un botón.
    const sinArmadura = screen.getAllByText("Sin armadura");
    for (const nodo of sinArmadura) {
      expect(nodo.closest("button")).toBeNull();
    }
  });
});
