import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { Cabecera } from "../Cabecera";
import * as characterSheetApi from "../api";
import * as members from "../../campaigns/members";
import type { CalculatedSheet, CharacterRow, ConditionRow, SheetResponse } from "../api";
import type { Disposicion } from "../pestanas/tipos";

// Tarea 3 (spec 2026-09-11) — la cabecera fija, ahora componente propio. Las dos primeras
// pruebas del bloque «reúne los cinco números…» y «no trae control de daño…» vienen de
// `HojaCalculada.test.tsx` (describe «H3 — la cabecera fija y las dos columnas», que se queda
// con las otras dos `it`s de esa suite para tareas posteriores): mismas aserciones, solo cambia
// el render, que ahora monta `Cabecera` directamente en vez de la hoja entera.

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
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

const sheet: CalculatedSheet = {
  derived: {
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
  warnings: [],
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

const sheetResponse: SheetResponse & { sheet: CalculatedSheet } = {
  character,
  sheet,
  attacks: [],
  money: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
  hp: { current: 15, max: 22, temp: 0, version: 2, exceedsMax: false },
  deathSaves: { successes: 0, failures: 0, status: "alive" },
};

// La única condición activa de esta suite: envenenado, sin vencer (`expired` queda `undefined`,
// que la tarjeta trata como falso). Sirve para comprobar que la cabecera pinta el chip, no la
// tarjeta completa de "Condiciones activas" (esa la sigue montando el cuerpo de la hoja).
const conditions: ConditionRow[] = [
  {
    id: "cond-poisoned",
    characterId: "ch1",
    key: "poisoned",
    level: null,
    note: null,
    appliedById: "dm1",
    createdAt: "2026-09-11T00:00:00.000Z",
  },
];

function renderCabecera({
  disposicion,
  puedeEditar = false,
}: {
  disposicion: Disposicion;
  puedeEditar?: boolean;
}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <Cabecera
      campaignId="c1"
      characterId="ch1"
      data={sheetResponse}
      puedeEditar={puedeEditar}
      disposicion={disposicion}
    />,
    { wrapper: wrapper(qc) },
  );
}

describe("Cabecera — lo que cambia el turno, siempre a la vista", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(characterSheetApi, "fetchConditions").mockResolvedValue(conditions);
    // `AvisoDeDm` cuelga de `useMyRole`; sin mockearlo se queda en `isLoading` (no pinta nada),
    // que es un estado válido pero distinto en cada corrida. Se fija a "PLAYER" para que la
    // tira no dependa de una consulta real.
    vi.spyOn(members, "useMyRole").mockReturnValue({
      role: "PLAYER",
      isLoading: false,
      isError: false,
      retry: () => {},
    });
  });

  it("reúne los cinco números, las condiciones como chips y el aviso de elección pendiente", async () => {
    renderCabecera({ disposicion: "pagina" });
    const resumen = await screen.findByRole("region", { name: "resumen de combate" });
    for (const etiqueta of ["CA", "Inic.", "Vel. (pies)", "PG", "Comp."]) {
      expect(within(resumen).getByText(etiqueta)).toBeInTheDocument();
    }
    // Los chips cuelgan de `useConditions`, una consulta propia (igual que en el resto de la
    // hoja): hay que esperar a que asiente antes de buscarlos, o la sección aún no ha pintado
    // nada donde antes había una lista de condiciones.
    expect(
      await within(resumen).findByRole("list", { name: "condiciones activas" }),
    ).toHaveTextContent("Envenenado");
    // Desviación del brief: el texto visible de la tarjeta es "Elecciones por hacer (N)", no
    // "elección pendiente" — esa frase solo vive en comentarios y descripciones de prueba. Se
    // comprueba por la región nombrada, como hace `HojaCalculada.test.tsx`.
    expect(
      within(resumen).getByRole("region", { name: "elecciones pendientes" }),
    ).toBeInTheDocument();
  });

  it("no trae control de daño: los PG son solo lectura", async () => {
    renderCabecera({ disposicion: "pagina" });
    const resumen = await screen.findByRole("region", { name: "resumen de combate" });
    expect(within(resumen).queryByRole("button", { name: /daño|curar|aplicar/i })).toBeNull();
  });

  it("en la mesa lleva el nombre y la clase; en la página no, porque ya los pinta la cabecera de la página", async () => {
    renderCabecera({ disposicion: "mesa" });
    expect(await screen.findByText("Elowen")).toBeInTheDocument();
    cleanup();
    renderCabecera({ disposicion: "pagina" });
    await screen.findByRole("region", { name: "resumen de combate" });
    expect(screen.queryByText("Elowen")).toBeNull();
  });

  // --- Las dos `it`s movidas de `HojaCalculada.test.tsx` («H3 — la cabecera fija y las dos
  // columnas», L286-316), tal cual — solo cambia el render, que ahora monta `Cabecera` sola.

  it("la cabecera reúne los cinco números que se consultan en mitad de un turno", async () => {
    renderCabecera({ disposicion: "pagina" });
    const cabecera = await screen.findByRole("region", { name: "resumen de combate" });
    const texto = cabecera.textContent ?? "";

    // **La tira compacta de la maqueta**: los rótulos van abreviados para que cinco casillas
    // quepan en una fila, y el nombre entero viaja en un `sr-only` hermano — abreviar en
    // pantalla sin decir el nombre completo en alguna parte sería cambiar densidad por
    // accesibilidad. Se comprueban los dos, o la abreviatura podría quedarse sola.
    for (const rotulo of ["CA", "Inic.", "Vel. (pies)", "PG", "Comp."]) {
      expect(texto.includes(rotulo), `«${rotulo}» tiene que estar en la cabecera`).toBe(true);
    }
    for (const largo of ["Iniciativa", "Velocidad efectiva en pies", "Competencia"]) {
      expect(texto.includes(largo), `«${largo}» tiene que anunciarse entero`).toBe(true);
    }
    // Y sus valores, no solo los rótulos: la CA (12) y la velocidad (30) se despliegan desde
    // aquí, y los PG se leen enteros.
    const dentro = within(cabecera);
    expect(dentro.getByRole("button", { name: "12" })).toBeInTheDocument();
    expect(dentro.getByRole("button", { name: "30" })).toBeInTheDocument();
    expect(texto).toContain("15 / 22");
  });

  it("los PG de la cabecera no traen el control de daño: la acción vive en su bloque", async () => {
    // Fix round 1 (revisión de la Tarea 3) — la original comprobaba esto con `puedeEditar={true}`,
    // el único caso donde el control de daño podría llegar a existir; con `false` la prueba no
    // demostraba nada. También cambia la aserción: `querySelector('input[type="number"]')`
    // adivinaba el tipo del control — se comprueba por el nombre accesible real del campo
    // (`PuntosDeGolpe.tsx`), que además sigue vacío aquí porque `Cabecera` no monta esa tarjeta.
    renderCabecera({ disposicion: "pagina", puedeEditar: true });
    const cabecera = await screen.findByRole("region", { name: "resumen de combate" });
    expect(within(cabecera).queryByLabelText("Cambio de puntos de golpe")).toBeNull();
  });

  it("el botón de subir de nivel solo aparece cuando puedeEditar es verdadero", async () => {
    renderCabecera({ disposicion: "pagina", puedeEditar: true });
    const resumen = await screen.findByRole("region", { name: "resumen de combate" });
    expect(
      await within(resumen).findByRole("button", { name: /subir a nivel/i }),
    ).toBeInTheDocument();

    cleanup();

    renderCabecera({ disposicion: "pagina", puedeEditar: false });
    await screen.findByRole("region", { name: "resumen de combate" });
    expect(screen.queryByRole("button", { name: /subir a nivel/i })).toBeNull();
  });
});
