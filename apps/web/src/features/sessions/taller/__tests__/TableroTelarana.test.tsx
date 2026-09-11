import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TableroTelarana } from "../TableroTelarana";
import type { Entity } from "../../../entities/api";
import * as linksApi from "../../../links/api";

// Task 22 — **el tablero pedía los enlaces ficha a ficha**: hasta 18 llamadas a
// `GET /entities/:id/links` al abrir, y `refetchOnWindowFocus` las repetía. Desde esta tarea hay
// una sola ruta por campaña (`GET /campaigns/:id/links`, `fetchCampaignLinks`), y el tablero
// construye su mapa de hilos a partir de esa única lista.

function ficha(id: string, type: Entity["type"] = "NPC"): Entity {
  return {
    id,
    campaignId: "c1",
    type,
    name: `Ficha ${id}`,
    tags: [],
    visibility: "PLAYERS",
    createdById: "u1",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function montar(fichas: Entity[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TableroTelarana
        campaignId="c1"
        fichas={fichas}
        seleccion={null}
        onSeleccion={() => {}}
        cargando={false}
        error={null}
      />
    </QueryClientProvider>,
  );
}

describe("TableroTelarana — una sola llamada de enlaces por campaña (Task 22)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("con N fichas hace UNA llamada a fetchCampaignLinks y CERO a fetchLinks", async () => {
    const campaignSpy = vi.spyOn(linksApi, "fetchCampaignLinks").mockResolvedValue([]);
    const perEntitySpy = vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([]);

    const fichas = Array.from({ length: 6 }, (_, i) => ficha(`e${i}`));
    montar(fichas);

    // Espera a que la consulta resuelva antes de contar llamadas.
    await screen.findByText(/hilo tendido|Ninguna de estas fichas/);

    expect(campaignSpy).toHaveBeenCalledTimes(1);
    expect(campaignSpy).toHaveBeenCalledWith("c1");
    expect(perEntitySpy).not.toHaveBeenCalled();
  });

  it("dibuja un hilo entre dos fichas que la lista de campaña enlaza", async () => {
    vi.spyOn(linksApi, "fetchCampaignLinks").mockResolvedValue([
      {
        id: "l1",
        fromId: "e0",
        toId: "e1",
        label: "vive en",
        from: { id: "e0", name: "Ficha e0", type: "NPC" },
        to: { id: "e1", name: "Ficha e1", type: "NPC" },
      },
    ]);
    vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([]);

    montar([ficha("e0"), ficha("e1")]);

    expect(await screen.findByText(/1 hilo tendido entre 2 fichas/)).toBeInTheDocument();
  });
});
