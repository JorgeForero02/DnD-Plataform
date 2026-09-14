import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { HerramientasDeNarracion } from "../HerramientasDeNarracion";
import * as campaignsApi from "../../../campaigns/api";
import type { Campaign } from "../../../campaigns/api";

// Puerta de efectos §5 bis (E-PE-8) — «Dar XP» solo aparece cuando la mesa juega en modo XP
// (D-CF-53, `tableRules.progresion`). En HITO, la hoja no cuenta experiencia y ofrecer el botón
// sería ofrecer algo que no significa nada.

function campana(progresion: "HITO" | "XP"): Campaign {
  return {
    id: "c1",
    name: "La mina",
    description: null,
    ownerId: "u1",
    createdAt: "2026-01-01",
    tableRules: {
      abilities: { metodo: "LIBRE" },
      nivelInicial: 1,
      pgNivelesSiguientes: "MEDIA",
      permitidos: { razas: [], clases: [], subclases: [] },
      oroInicial: { modo: "EQUIPO" },
      progresion,
    } as never,
  };
}

function pintar(progresion: "HITO" | "XP") {
  const fetchCampaign = vi
    .spyOn(campaignsApi, "fetchCampaign")
    .mockResolvedValue(campana(progresion));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <HerramientasDeNarracion campaignId="c1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { fetchCampaign, qc };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("HerramientasDeNarracion — «Dar XP»", () => {
  it("con la campaña en modo XP hay un botón «Dar XP»", async () => {
    pintar("XP");
    expect(await screen.findByRole("button", { name: /Dar XP/ })).toBeInTheDocument();
  });

  it("con la campaña en modo HITO no lo hay", async () => {
    const { fetchCampaign, qc } = pintar("HITO");
    // Se espera a que la campaña haya LLEGADO —no solo a que se haya pedido— antes de afirmar la
    // ausencia: el título se pinta en el primer render, antes de que `useCampaign` resuelva, y
    // afirmar ahí pasaba por carrera, no por la regla (Minor de la revisión).
    await screen.findByText("Herramientas del DM");
    await waitFor(() => expect(fetchCampaign).toHaveBeenCalled());
    await waitFor(() => expect(qc.isFetching()).toBe(0));
    expect(screen.queryByRole("button", { name: /Dar XP/ })).not.toBeInTheDocument();
  });
});
