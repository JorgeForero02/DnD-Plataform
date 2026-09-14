import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Statblock } from "@dnd/shared";
import { ALaMesa } from "../ALaMesa";
import * as bestiarioApi from "../api";
import type { Entity } from "../../entities/api";

// PNJ del mundo y la mesa, Tarea 4, paso 4 — mismo molde que `PanelDeBestiario.test.tsx`:
// `api.ts` simulado con `vi.spyOn`, sin tocar `fetch` de verdad.

const garrik: Entity = {
  id: "garrik-id",
  campaignId: "c1",
  type: "NPC",
  name: "Garrik",
  tags: [],
  visibility: "DM_ONLY",
  createdById: "dm1",
  createdAt: "2026-01-01",
};

const goblin: Statblock = {
  ref: "SRD:goblin",
  source: "SRD",
  name: "Goblin",
  size: "SMALL",
  type: "HUMANOID",
  subtype: "trasgo",
  alignment: "neutral malvado",
  ac: 15,
  acNote: "armadura de cuero, escudo",
  hitDiceCount: 2,
  abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
  saveProficiencies: [],
  skillProficiencies: { stealth: "expertise" },
  damageResistances: [],
  damageImmunities: [],
  damageVulnerabilities: [],
  conditionImmunities: [],
  darkvisionFeet: 60,
  otherSenses: [],
  speeds: { walk: 30 },
  languages: "común, goblin",
  cr: 0.25,
  traits: [],
  actions: [],
  reactions: [],
  legendaryActions: [],
};

function renderALaMesa() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ALaMesa campaignId="c1" entity={garrik} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(bestiarioApi, "fetchStatblocks").mockResolvedValue({ srd: [goblin], campaign: [] });
});

describe("ALaMesa", () => {
  it("solo se puede bajar con una plantilla elegida", async () => {
    renderALaMesa();
    fireEvent.click(screen.getByRole("button", { name: /A la mesa/i }));

    await screen.findByText("Goblin");
    expect(screen.getByRole("button", { name: "Bajar a la mesa" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    fireEvent.click(screen.getByRole("radio", { name: /Goblin/i }));
    expect(screen.getByRole("button", { name: "Bajar a la mesa" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("instantiateNpc recibe el entityId y el nombre de la ficha, y avisa que solo lo ve el DM", async () => {
    const spy = vi.spyOn(bestiarioApi, "instantiateNpc").mockResolvedValue([
      {
        id: "n1",
        name: "Garrik",
        statblockRef: "SRD:goblin",
        currentHp: 7,
        ownerId: "u-dm",
        visibility: "DM_ONLY",
        entityId: "garrik-id",
      },
    ]);
    renderALaMesa();
    fireEvent.click(screen.getByRole("button", { name: /A la mesa/i }));

    fireEvent.click(await screen.findByRole("radio", { name: /Goblin/i }));
    fireEvent.click(screen.getByRole("button", { name: "Bajar a la mesa" }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith("c1", {
      ref: "SRD:goblin",
      count: 1,
      hp: "AVERAGE",
      name: "Garrik",
      entityId: "garrik-id",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Garrik está en la mesa. Solo lo ves tú hasta que lo reveles.",
    );
  });
});
