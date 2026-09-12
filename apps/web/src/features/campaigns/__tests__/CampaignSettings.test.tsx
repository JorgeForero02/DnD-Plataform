import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { CampaignSettings } from "../CampaignSettings";
import * as campaignsApi from "../api";
import * as members from "../members";
import { useAuthStore } from "../../../store/auth.store";

// Migración 6 (D-CF-16, tickets I4/M2B-5) — la variante de sobrecarga (SRD 5.1, Variant:
// Encumbrance), interruptor por campaña, apagada por defecto.
//
// **Va aquí, en `CampaignSettings`, y no en `PanelDeTablas`** (`InterruptorDeLaCasa`): el brief
// proponía esa pantalla porque es "donde vive la regla de la casa del DM", pero esa regla se
// escribe con el `PUT` propio de `dm-tables.service.ts`, y la sobrecarga se escribe con
// `PATCH /campaigns/:id` (`updateCampaignSchema`) — el mismo endpoint que ya usan el nombre y la
// descripción de esta pantalla. Ver el informe de la migración para el porqué completo.

const YO = "u1";

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CampaignSettings campaignId="c1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const campana = (over: Record<string, unknown> = {}) => ({
  id: "c1",
  name: "La costa de la espada",
  description: "Una campaña de piratas",
  ownerId: YO,
  createdAt: "2026-09-01",
  encumbranceVariant: false,
  ...over,
});

describe("CampaignSettings — la variante de sobrecarga (migración 6)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ user: { id: YO, email: "dm@b.com", displayName: "DM" } } as never);
  });

  it("el DM ve el interruptor, apagado por defecto", async () => {
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue(campana());
    vi.spyOn(members, "fetchMembers").mockResolvedValue([
      { userId: YO, displayName: "DM", role: "DM" },
    ]);

    montar();

    const apagada = await screen.findByRole("radio", { name: /apagada/i });
    const encendida = screen.getByRole("radio", { name: /encendida/i });
    expect(apagada).toBeChecked();
    expect(encendida).not.toBeChecked();
    expect(apagada).not.toBeDisabled();
  });

  it("un jugador (no DM) ve el interruptor deshabilitado", async () => {
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue(campana());
    vi.spyOn(members, "fetchMembers").mockResolvedValue([
      { userId: YO, displayName: "Jugador", role: "PLAYER" },
    ]);

    montar();

    const apagada = await screen.findByRole("radio", { name: /apagada/i });
    expect(apagada).toBeDisabled();
    expect(screen.getByRole("radio", { name: /encendida/i })).toBeDisabled();
  });

  it("el DM la enciende: llama al PATCH de la campaña, no a un endpoint de tablas", async () => {
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue(campana());
    vi.spyOn(members, "fetchMembers").mockResolvedValue([
      { userId: YO, displayName: "DM", role: "DM" },
    ]);
    const update = vi
      .spyOn(campaignsApi, "updateCampaign")
      .mockResolvedValue(campana({ encumbranceVariant: true }));

    montar();

    const encendida = await screen.findByRole("radio", { name: /encendida/i });
    fireEvent.click(encendida);

    await waitFor(() => expect(update).toHaveBeenCalledWith("c1", { encumbranceVariant: true }));
    await waitFor(() => expect(encendida).toBeChecked());
  });
});

// Pulido 2026-09-12, C1 bis (spec del tablero § 2 ter): la partida de PlanarAlly que la mesa
// enmarca, guardada con el mismo `PATCH /campaigns/:id`.
describe("CampaignSettings — la Sala del tablero (pulido, C1 bis)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ user: { id: YO, email: "dm@b.com", displayName: "DM" } } as never);
  });

  it("el DM ve “Sala del tablero”, pulsa Guardar y el PATCH lleva boardRoomUrl", async () => {
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue(campana({ boardRoomUrl: null }));
    vi.spyOn(members, "fetchMembers").mockResolvedValue([
      { userId: YO, displayName: "DM", role: "DM" },
    ]);
    const update = vi
      .spyOn(campaignsApi, "updateCampaign")
      .mockResolvedValue(campana({ boardRoomUrl: "https://tablero.supportive.pro/game/abc" }));

    montar();

    expect(await screen.findByText("Sala del tablero")).toBeInTheDocument();
    const input = screen.getByLabelText("Dirección de la sala");
    fireEvent.change(input, { target: { value: "https://tablero.supportive.pro/game/abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar la sala" }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith("c1", {
        boardRoomUrl: "https://tablero.supportive.pro/game/abc",
      }),
    );
  });

  it("con sala guardada aparece “Quitar la sala” y manda null", async () => {
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue(
      campana({ boardRoomUrl: "https://tablero.supportive.pro/game/abc" }),
    );
    vi.spyOn(members, "fetchMembers").mockResolvedValue([
      { userId: YO, displayName: "DM", role: "DM" },
    ]);
    const update = vi
      .spyOn(campaignsApi, "updateCampaign")
      .mockResolvedValue(campana({ boardRoomUrl: null }));

    montar();

    const quitar = await screen.findByRole("button", { name: "Quitar la sala" });
    fireEvent.click(quitar);

    await waitFor(() => expect(update).toHaveBeenCalledWith("c1", { boardRoomUrl: null }));
  });
});
