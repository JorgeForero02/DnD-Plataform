import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { useAccionesDeMesa } from "../AccionesDeMesa";
import * as bestiarioApi from "../../../bestiario/api";
import * as encountersApi from "../../../encounters/api";

vi.mock("../../../bestiario/api");
vi.mock("../../../encounters/api");

const envoltorio = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);
const base = {
  campaignId: "c1",
  characterId: "g1",
  nombre: "Bandido",
  sessionId: "s1",
  encounterId: "e1",
  combatanteId: "cb1",
  enCombate: true,
  esDm: true,
};

describe("useAccionesDeMesa", () => {
  it("con un PNJ oculto ofrece «Revelar a la mesa» y «Sacar del combate»; con uno visible, «Ocultar»", () => {
    const oculto = renderHook(() => useAccionesDeMesa({ ...base, visibility: "DM_ONLY" }), {
      wrapper: envoltorio,
    });
    expect(oculto.result.current.acciones.map((a) => a.rotulo)).toEqual([
      "Revelar a la mesa",
      "Sacar del combate",
    ]);
    const visible = renderHook(() => useAccionesDeMesa({ ...base, visibility: "PLAYERS" }), {
      wrapper: envoltorio,
    });
    expect(visible.result.current.acciones.map((a) => a.rotulo)).toEqual([
      "Ocultar",
      "Sacar del combate",
    ]);
  });

  it("sin visibility (un personaje jugador) solo ofrece sacar; sin encuentro no ofrece sacar", () => {
    const pj = renderHook(() => useAccionesDeMesa({ ...base, visibility: undefined }), {
      wrapper: envoltorio,
    });
    expect(pj.result.current.acciones.map((a) => a.rotulo)).toEqual(["Sacar del combate"]);
    const fuera = renderHook(
      () =>
        useAccionesDeMesa({
          ...base,
          visibility: "DM_ONLY",
          enCombate: false,
          encounterId: undefined,
          combatanteId: undefined,
        }),
      { wrapper: envoltorio },
    );
    expect(fuera.result.current.acciones.map((a) => a.rotulo)).toEqual(["Revelar a la mesa"]);
  });

  it("quien no es DM no recibe ninguna", () => {
    const r = renderHook(() => useAccionesDeMesa({ ...base, esDm: false, visibility: "DM_ONLY" }), {
      wrapper: envoltorio,
    });
    expect(r.result.current.acciones).toEqual([]);
  });

  it("«Revelar a la mesa» llama a reveal; «Sacar del combate» llama a DELETE con el combatante", async () => {
    vi.mocked(bestiarioApi.revealNpc).mockResolvedValue({
      id: "g1",
      name: "Bandido",
      visibility: "PLAYERS",
      entityId: null,
      revealed: { character: true, entity: false, template: false },
    });
    vi.mocked(encountersApi.removeCombatant).mockResolvedValue({} as any);
    const r = renderHook(() => useAccionesDeMesa({ ...base, visibility: "DM_ONLY" }), {
      wrapper: envoltorio,
    });
    await act(async () => r.result.current.acciones[0].onSelect());
    expect(bestiarioApi.revealNpc).toHaveBeenCalledWith("c1", "g1");
    await act(async () => r.result.current.acciones[1].onSelect());
    expect(encountersApi.removeCombatant).toHaveBeenCalledWith("c1", "s1", "e1", "cb1");
  });

  it("el rechazo del servidor se devuelve en `error`, no se traga", async () => {
    vi.mocked(bestiarioApi.hideNpc).mockRejectedValue(new Error("Solo el DM"));
    const r = renderHook(() => useAccionesDeMesa({ ...base, visibility: "PLAYERS" }), {
      wrapper: envoltorio,
    });
    act(() => r.result.current.acciones[0].onSelect());
    await waitFor(() => expect(r.result.current.error).toBe("Solo el DM"));
  });
});
