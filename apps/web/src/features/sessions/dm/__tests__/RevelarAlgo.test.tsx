import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevelarAlgo } from "../RevelarAlgo";
import * as entitiesHooks from "../../../entities/hooks";
import * as bestiarioHooks from "../../../bestiario/hooks";
import type { Entity } from "../../../entities/api";
import type { NpcEnLaMesa } from "../../../bestiario/api";

// PNJ del mundo y la mesa (spec §3.4) — «Revelar algo» lista, además de las fichas, las
// criaturas que la mesa todavía no ve. Se mockean los HOOKS (`useAllEntities`/`useNpcs`), no las
// funciones de `api.ts`: esta pantalla no hace la petición, la consulta ya resuelta.

const FICHA_OCULTA: Entity = {
  id: "e1",
  campaignId: "c1",
  type: "NPC",
  name: "Acererak",
  tags: [],
  visibility: "DM_ONLY",
  createdById: "u-dm",
  createdAt: "2026-09-01T10:00:00.000Z",
};

const GOBLIN_OCULTO: NpcEnLaMesa = {
  id: "n1",
  name: "Goblin capataz",
  statblockRef: "srd-goblin",
  currentHp: 7,
  ownerId: "u-dm",
  visibility: "DM_ONLY",
};

const GOBLIN_VISIBLE: NpcEnLaMesa = {
  id: "n2",
  name: "Goblin raso",
  statblockRef: "srd-goblin",
  currentHp: 7,
  ownerId: "u-dm",
  visibility: "PLAYERS",
};

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RevelarAlgo campaignId="c1" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

it("pinta una fila por ficha oculta y una fila por criatura oculta, cada una con su etiqueta", async () => {
  vi.spyOn(entitiesHooks, "useAllEntities").mockReturnValue({
    data: [FICHA_OCULTA],
    isLoading: false,
  } as any);
  vi.spyOn(bestiarioHooks, "useNpcs").mockReturnValue({
    data: [GOBLIN_OCULTO, GOBLIN_VISIBLE],
    isLoading: false,
  } as any);

  montar();

  expect(await screen.findByText("Acererak")).toBeInTheDocument();
  expect(await screen.findByText("Goblin capataz")).toBeInTheDocument();
  expect(screen.getByText("Criatura en la mesa")).toBeInTheDocument();
  // El goblin ya visible (`PLAYERS`) no se ofrece: ya no hay nada que revelar.
  expect(screen.queryByText("Goblin raso")).not.toBeInTheDocument();
});

it("confirmar sobre la criatura llama a revealNpc con su id", async () => {
  vi.spyOn(entitiesHooks, "useAllEntities").mockReturnValue({
    data: [],
    isLoading: false,
  } as any);
  vi.spyOn(bestiarioHooks, "useNpcs").mockReturnValue({
    data: [GOBLIN_OCULTO],
    isLoading: false,
  } as any);
  const mutate = vi.fn();
  vi.spyOn(bestiarioHooks, "useRevealNpc").mockReturnValue({
    mutate,
    isPending: false,
    isError: false,
  } as any);

  montar();

  const fila = (await screen.findByText("Goblin capataz")).closest("li")!;
  // Primera pulsación: abre la confirmación en fila («¿Se lo enseñas a la mesa?»).
  fireEvent.click(within(fila).getByRole("button", { name: "Revelar a la mesa" }));
  expect(within(fila).getByText("¿Se lo enseñas a la mesa?")).toBeInTheDocument();
  // Segunda pulsación: el botón del mismo rótulo, ya en modo confirmación, llama al servidor.
  fireEvent.click(within(fila).getByRole("button", { name: "Revelar a la mesa" }));

  await waitFor(() => expect(mutate).toHaveBeenCalledWith("n1"));
});

describe("el vacío distingue fichas y criaturas", () => {
  it("sin nada oculto de ningún tipo, dice que la mesa lo ve todo", async () => {
    vi.spyOn(entitiesHooks, "useAllEntities").mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
    vi.spyOn(bestiarioHooks, "useNpcs").mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    montar();

    expect(
      await screen.findByText(
        "No queda nada oculto en esta campaña: la mesa lo ve todo, fichas y criaturas.",
      ),
    ).toBeInTheDocument();
  });
});
