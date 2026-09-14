import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FichaDePnj } from "../FichaDePnj";
import * as sheetApi from "../../../character-sheet/api";
import type { NpcEnLaMesa } from "../../../bestiario/api";

// PNJ del mundo y la mesa (spec §3.2/§3.3) — el menú «…» de un PNJ gana «Revelar a la mesa» /
// «Ocultar» según su `visibility`, y el nombre enlaza a su ficha del mundo cuando llega
// `entityId` (E-PM-12). `HojaCalculada` no se monta aquí (ningún test abre «Su hoja»), así que
// no hace falta el doble que usa `FichaDeElenco.test.tsx`.

const GOBLIN: NpcEnLaMesa = {
  id: "n-goblin",
  name: "Goblin capataz",
  statblockRef: "srd-goblin",
  currentHp: 7,
  ownerId: "u-dm",
  visibility: "DM_ONLY",
  conditions: [],
};

function hoja(): sheetApi.SheetResponse {
  return {
    character: { id: "n-goblin" } as sheetApi.CharacterRow,
    sheet: null,
    hp: { current: 7, max: 12, temp: 0, version: 1, exceedsMax: false },
    deathSaves: {
      successes: 0,
      failures: 0,
      status: "alive",
    } as sheetApi.SheetResponse["deathSaves"],
  };
}

function montar(props: Partial<Parameters<typeof FichaDePnj>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <FichaDePnj campaignId="c1" pnj={GOBLIN} bando="ENEMY" esDm {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(sheetApi, "fetchSheet").mockResolvedValue(hoja());
  vi.spyOn(sheetApi, "fetchConditions").mockResolvedValue([]);
});

describe("el menú del PNJ ofrece revelar/ocultar según su visibilidad", () => {
  it("un PNJ oculto ofrece «Revelar a la mesa»", async () => {
    montar({ pnj: { ...GOBLIN, visibility: "DM_ONLY" } });

    fireEvent.click(
      await screen.findByRole("button", { name: "Más acciones sobre Goblin capataz" }),
    );
    const menu = screen.getByRole("menu", { name: "Más acciones sobre Goblin capataz" });
    expect(within(menu).getByRole("menuitem", { name: "Revelar a la mesa" })).toBeInTheDocument();
    expect(within(menu).queryByRole("menuitem", { name: "Ocultar" })).not.toBeInTheDocument();
  });

  it("un PNJ visible ofrece «Ocultar»", async () => {
    montar({ pnj: { ...GOBLIN, visibility: "PLAYERS" } });

    fireEvent.click(
      await screen.findByRole("button", { name: "Más acciones sobre Goblin capataz" }),
    );
    const menu = screen.getByRole("menu", { name: "Más acciones sobre Goblin capataz" });
    expect(within(menu).getByRole("menuitem", { name: "Ocultar" })).toBeInTheDocument();
    expect(
      within(menu).queryByRole("menuitem", { name: "Revelar a la mesa" }),
    ).not.toBeInTheDocument();
  });
});

describe("el nombre enlaza a la ficha del mundo (E-PM-12)", () => {
  it("con `entityId` el nombre es un enlace a su ficha", async () => {
    montar({ pnj: { ...GOBLIN, entityId: "ent-1" } });

    const enlace = await screen.findByRole("link", { name: "Goblin capataz" });
    expect(enlace).toHaveAttribute("href", "/campaigns/c1/entidades/ent-1");
  });

  it("sin `entityId` el nombre es texto plano", async () => {
    montar({ pnj: { ...GOBLIN, entityId: null } });

    expect(await screen.findByText("Goblin capataz")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Goblin capataz" })).not.toBeInTheDocument();
  });
});
