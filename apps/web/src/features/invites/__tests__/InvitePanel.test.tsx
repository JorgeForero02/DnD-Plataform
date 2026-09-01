import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InvitePanel } from "../InvitePanel";
import * as invitesApi from "../api";
import type { Invite } from "../api";

const invite: Invite = {
  id: "i1",
  campaignId: "c1",
  token: "tok123",
  role: "PLAYER",
  createdAt: "2026-08-31T00:00:00.000Z",
  usedAt: null,
};

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <InvitePanel campaignId="c1" />
    </QueryClientProvider>,
  );
}

describe("InvitePanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("generates an invitation and shows the full link on screen, not just the token", async () => {
    const spy = vi.spyOn(invitesApi, "createInvite").mockResolvedValue(invite);
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Generar invitación" }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("c1"));
    const linkField = (await screen.findByLabelText("Enlace de invitación")) as HTMLInputElement;
    expect(linkField.value).toContain("/join/tok123");
    expect(linkField.value).not.toBe("tok123");
  });

  it("keeps the link visible and shows the failure when copying is rejected", async () => {
    vi.spyOn(invitesApi, "createInvite").mockResolvedValue(invite);
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Generar invitación" }));
    const linkField = (await screen.findByLabelText("Enlace de invitación")) as HTMLInputElement;
    expect(linkField.value).toContain("/join/tok123");

    fireEvent.click(screen.getByRole("button", { name: "Copiar enlace" }));

    expect(await screen.findByText(/No se pudo copiar/)).toBeInTheDocument();
    // The link must stay on screen even though copying failed.
    expect(screen.getByLabelText("Enlace de invitación")).toHaveValue(linkField.value);
  });

  it("warns, only once a link exists, that generating another one does not revoke it", async () => {
    vi.spyOn(invitesApi, "createInvite").mockResolvedValue(invite);
    renderPanel();

    // Depends on state, unlike the removed test that asserted a paragraph rendered on every
    // render regardless of any interaction (InvitePanel.test.tsx, before 1.14-fix) — this text
    // must not exist before a link has been generated.
    expect(screen.queryByText(/no anula/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Generar invitación" }));

    expect(await screen.findByText(/no anula/)).toBeInTheDocument();
  });

  it("shows the DM-only server error translated to Spanish", async () => {
    vi.spyOn(invitesApi, "createInvite").mockRejectedValue(new Error("DM role required"));
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Generar invitación" }));

    expect(
      await screen.findByText("Solo el DM de la campaña puede hacer esto."),
    ).toBeInTheDocument();
  });
});
