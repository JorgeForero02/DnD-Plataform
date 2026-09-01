import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { CampaignList } from "../CampaignList";
import * as api from "../api";

function renderList() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CampaignList />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CampaignList", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders campaigns returned by the API", async () => {
    vi.spyOn(api, "fetchCampaigns").mockResolvedValue([
      {
        id: "c1",
        name: "Curse of Strahd",
        description: null,
        ownerId: "u1",
        createdAt: "2026-01-01",
      },
      {
        id: "c2",
        name: "Lost Mine",
        description: "starter",
        ownerId: "u1",
        createdAt: "2026-01-02",
      },
    ]);
    renderList();
    expect(await screen.findByText("Curse of Strahd")).toBeInTheDocument();
    expect(await screen.findByText("Lost Mine")).toBeInTheDocument();
  });

  it("shows empty state when there are no campaigns", async () => {
    vi.spyOn(api, "fetchCampaigns").mockResolvedValue([]);
    renderList();
    expect(await screen.findByText("Aún no tienes campañas.")).toBeInTheDocument();
  });
});
