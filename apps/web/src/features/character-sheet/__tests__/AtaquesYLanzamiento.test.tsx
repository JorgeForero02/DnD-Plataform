import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { RollResult } from "@dnd/shared";
import { AtaquesYLanzamiento } from "../AtaquesYLanzamiento";
import type { AttackDto, CalculatedSheet } from "../api";
import * as api from "../api";

// Carril B3 (fase 2B/2C) — el cuadro de ataques de verdad. Lo que importa aquí:
//
//  · la tabla pinta el arma con su bono, su daño y su tipo, y **ninguna clave de enumeración
//    cruda** («PIERCING», «FINESSE», «VERSATILE»…) llega al DOM;
//  · pulsar el dado abre el panel, y «Tirar ataque» manda `part: "ATTACK"` con el modo elegido
//    y **nunca una expresión**: la compone el servidor;
//  · el daño a dos manos manda `versatile: true`, y el crítico manda `critical: true`;
//  · un arma sin competencia lo dice en su propia fila;
//  · sin ninguna arma equipada, la hoja dice qué hacer, no deja un hueco.

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function paso(labelKey: string, amount = 1, op: "base" | "add" = "add") {
  return { op, amount, sourceType: "ability" as const, sourceKey: "dex", labelKey };
}

const sheet: CalculatedSheet = {
  derived: {},
  warnings: [],
  pendingChoices: [],
  features: [],
  speeds: { walk: 30 },
  raceKey: "human",
  classKey: "rogue",
  attacksPerAction: 1,
  spellSlots: [],
  spellSlotResetOn: "NONE",
};

const estoque: AttackDto = {
  key: "SRD:rapier",
  name: "Estoque",
  ref: "SRD:rapier",
  ability: "dex",
  attackBonus: {
    key: "attack.SRD:rapier",
    total: 5,
    steps: [paso("abilityMod.dex", 3, "base"), paso("proficiencyBonus", 2)],
  },
  damage: { expression: "1d8+3", dice: "1d8", modifier: 3, type: "PIERCING" },
  properties: ["FINESSE"],
  rangeNormalFt: undefined,
  rangeLongFt: undefined,
  proficient: true,
};

const bastonSinCompetencia: AttackDto = {
  key: "SRD:quarterstaff",
  name: "Bastón",
  ref: "SRD:quarterstaff",
  ability: "str",
  attackBonus: {
    key: "attack.SRD:quarterstaff",
    total: 0,
    steps: [paso("abilityMod.str", 0, "base")],
  },
  damage: { expression: "1d6", dice: "1d6", modifier: 0, type: "BLUDGEONING" },
  versatileDamage: { expression: "1d8", dice: "1d8", modifier: 0, type: "BLUDGEONING" },
  properties: ["VERSATILE"],
  proficient: false,
};

const dagaArrojadiza: AttackDto = {
  key: "SRD:dagger",
  name: "Daga",
  ref: "SRD:dagger",
  ability: "dex",
  attackBonus: { key: "attack.SRD:dagger", total: 5, steps: [paso("abilityMod.dex", 5, "base")] },
  damage: { expression: "1d4+3", dice: "1d4", modifier: 3, type: "PIERCING" },
  properties: ["FINESSE", "THROWN", "LIGHT"],
  rangeNormalFt: 20,
  rangeLongFt: 60,
  proficient: true,
};

function tirada(parcial: Partial<RollResult> = {}): RollResult {
  return {
    eventId: "e1",
    expression: "1d20+5",
    rolls: [12],
    kept: [12],
    dropped: [],
    modifier: 5,
    total: 17,
    natural: "NONE",
    outcome: "NO_DC",
    ...parcial,
  };
}

function montar(attacks: AttackDto[]) {
  return render(
    <AtaquesYLanzamiento campaignId="c1" characterId="ch1" sheet={sheet} attacks={attacks} />,
    { wrapper: wrapper() },
  );
}

describe("AtaquesYLanzamiento", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("pinta la fila con nombre, bono, daño y tipo — y ninguna enumeración cruda", async () => {
    montar([estoque]);
    const tabla = screen.getByRole("table");

    expect(within(tabla).getByRole("rowheader", { name: "Estoque" })).toBeInTheDocument();
    expect(within(tabla).getByText("+5")).toBeInTheDocument();
    expect(within(tabla).getByText(/1d8\+3/)).toBeInTheDocument();
    expect(within(tabla).getByText("perforante")).toBeInTheDocument();
    expect(within(tabla).getByText("Sutil")).toBeInTheDocument();

    // Ninguna clave cruda del SRD llega al DOM.
    for (const cruda of ["PIERCING", "FINESSE", "VERSATILE", "BLUDGEONING", "THROWN"]) {
      expect(screen.queryByText(cruda)).not.toBeInTheDocument();
    }
  });

  it("el alcance se enseña en metros, no en los pies que manda el servidor", () => {
    montar([dagaArrojadiza]);
    // 20 pies ≈ 6 m, 60 pies ≈ 18 m.
    expect(screen.getByText(/Alcance 6\/18 m/)).toBeInTheDocument();
    expect(screen.queryByText(/20/)).not.toBeInTheDocument();
    expect(screen.queryByText(/60/)).not.toBeInTheDocument();
  });

  it("un arma sin competencia lo dice en su propia fila", () => {
    montar([bastonSinCompetencia]);
    expect(screen.getByText("Sin competencia")).toBeInTheDocument();
  });

  it("sin ninguna arma equipada, la hoja dice qué hacer, no deja un hueco", () => {
    montar([]);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText(/Equipa un arma en el inventario/)).toBeInTheDocument();
  });

  it("pulsar el dado y «Tirar ataque» manda part ATTACK con el modo elegido, nunca una expresión", async () => {
    const espia = vi.spyOn(api, "rollAttack").mockResolvedValue(tirada());
    montar([estoque]);

    fireEvent.click(screen.getByRole("button", { name: "Tirada de Estoque" }));
    fireEvent.click(screen.getByRole("radio", { name: "Ventaja" }));
    fireEvent.click(screen.getByRole("button", { name: "Tirar ataque con Estoque" }));

    await waitFor(() => expect(espia).toHaveBeenCalled());
    const [, , attackKey, input] = espia.mock.calls[0];
    expect(attackKey).toBe("SRD:rapier");
    expect(input).toEqual(
      expect.objectContaining({
        part: "ATTACK",
        mode: "ADVANTAGE",
        versatile: false,
        critical: false,
      }),
    );
    expect(input).not.toHaveProperty("expression");
  });

  it("el daño a dos manos manda versatile: true", async () => {
    const espia = vi.spyOn(api, "rollAttack").mockResolvedValue(tirada());
    montar([bastonSinCompetencia]);

    fireEvent.click(screen.getByRole("button", { name: "Tirada de Bastón" }));
    fireEvent.click(screen.getByRole("radio", { name: "A dos manos" }));
    fireEvent.click(screen.getByRole("button", { name: "Tirar daño de Bastón" }));

    await waitFor(() => expect(espia).toHaveBeenCalled());
    const [, , , input] = espia.mock.calls[0];
    expect(input).toEqual(
      expect.objectContaining({ part: "DAMAGE", versatile: true, critical: false }),
    );
  });

  it("el crítico manda critical: true", async () => {
    const espia = vi.spyOn(api, "rollAttack").mockResolvedValue(tirada());
    montar([estoque]);

    fireEvent.click(screen.getByRole("button", { name: "Tirada de Estoque" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Crítico" }));
    fireEvent.click(screen.getByRole("button", { name: "Tirar daño de Estoque" }));

    await waitFor(() => expect(espia).toHaveBeenCalled());
    const [, , , input] = espia.mock.calls[0];
    expect(input).toEqual(expect.objectContaining({ part: "DAMAGE", critical: true }));
  });
});
