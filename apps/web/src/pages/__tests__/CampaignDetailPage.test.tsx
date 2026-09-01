import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CampaignDetailPage } from "../CampaignDetailPage";
import * as campaignsApi from "../../features/campaigns/api";
import * as entitiesApi from "../../features/entities/api";
import * as sessionsApi from "../../features/sessions/api";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/campaigns/c1"]}>
        <Routes>
          <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CampaignDetailPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue({
      id: "c1",
      name: "Curse of Strahd",
      description: "spooky",
      ownerId: "u1",
      createdAt: "2026-01-01",
    });
    vi.spyOn(entitiesApi, "fetchEntities").mockImplementation(async (_cid, type) =>
      type === "NPC"
        ? [
            {
              id: "e1",
              campaignId: "c1",
              type: "NPC",
              name: "Strahd von Zarovich",
              tags: [],
              visibility: "PLAYERS",
              createdById: "u1",
              createdAt: "x",
            },
          ]
        : [],
    );
    vi.spyOn(sessionsApi, "fetchSessions").mockResolvedValue([
      {
        id: "s1",
        campaignId: "c1",
        title: "Session Zero",
        scheduledAt: null,
        visibility: "PLAYERS",
        createdAt: "x",
      },
    ]);
  });

  it("renders campaign name and switches tabs to show the right list", async () => {
    renderPage();
    expect(await screen.findByText("Curse of Strahd")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "NPCs" }));
    expect(await screen.findByText("Strahd von Zarovich")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sesiones" }));
    expect(await screen.findByText("Session Zero")).toBeInTheDocument();
  });
});
