import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InvitePanel } from "../InvitePanel";
import * as invitesApi from "../api";
import type { Invite } from "../api";
import * as membersApi from "../../campaigns/members";
import { useAuthStore } from "../../../store/auth.store";

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

function asDM() {
  useAuthStore.setState({ user: { id: "dm1", email: "dm@b.com", displayName: "DM" } });
  vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
    { userId: "dm1", displayName: "DM", role: "DM" },
  ]);
}

describe("InvitePanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ token: "tok", user: null });
  });

  it("generates an invitation and shows the full link on screen, not just the token", async () => {
    asDM();
    const spy = vi.spyOn(invitesApi, "createInvite").mockResolvedValue(invite);
    renderPanel();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Generar invitación" })).not.toBeDisabled(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Generar invitación" }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("c1"));
    const linkField = (await screen.findByLabelText("Enlace de invitación")) as HTMLInputElement;
    expect(linkField.value).toContain("/join/tok123");
    expect(linkField.value).not.toBe("tok123");
  });

  it("keeps the link visible and shows the failure when copying is rejected", async () => {
    asDM();
    vi.spyOn(invitesApi, "createInvite").mockResolvedValue(invite);
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    renderPanel();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Generar invitación" })).not.toBeDisabled(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Generar invitación" }));
    const linkField = (await screen.findByLabelText("Enlace de invitación")) as HTMLInputElement;
    expect(linkField.value).toContain("/join/tok123");

    fireEvent.click(screen.getByRole("button", { name: "Copiar enlace" }));

    expect(await screen.findByText(/No se pudo copiar/)).toBeInTheDocument();
    // The link must stay on screen even though copying failed.
    expect(screen.getByLabelText("Enlace de invitación")).toHaveValue(linkField.value);
  });

  it("warns, only once a link exists, that generating another one does not revoke it", async () => {
    asDM();
    vi.spyOn(invitesApi, "createInvite").mockResolvedValue(invite);
    renderPanel();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Generar invitación" })).not.toBeDisabled(),
    );

    // Depends on state, unlike the removed test that asserted a paragraph rendered on every
    // render regardless of any interaction (InvitePanel.test.tsx, before 1.14-fix) — this text
    // must not exist before a link has been generated.
    expect(screen.queryByText(/no anula/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Generar invitación" }));

    expect(await screen.findByText(/no anula/)).toBeInTheDocument();
  });

  it("shows the DM-only server error translated to Spanish", async () => {
    asDM();
    vi.spyOn(invitesApi, "createInvite").mockRejectedValue(new Error("DM role required"));
    renderPanel();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Generar invitación" })).not.toBeDisabled(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Generar invitación" }));

    expect(
      await screen.findByText("Solo el DM de la campaña puede hacer esto."),
    ).toBeInTheDocument();
  });

  // Interface honesty, not enforcement (docs/06-pendientes.md): the server already rejects a
  // player's POST with 403 (invites.service.ts, requireDM) whether or not this button is
  // disabled. This is only about not offering an action that's certain to fail.
  it("disables generating an invitation for a player, with an explanation", async () => {
    useAuthStore.setState({ user: { id: "p1", email: "p@b.com", displayName: "P" } });
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "dm1", displayName: "DM", role: "DM" },
      { userId: "p1", displayName: "P", role: "PLAYER" },
    ]);
    const createSpy = vi.spyOn(invitesApi, "createInvite");
    renderPanel();

    const button = await screen.findByRole("button", { name: "Generar invitación" });
    await waitFor(() => expect(button).toBeDisabled());
    expect(
      screen.getByText("Solo el DM de la campaña puede generar invitaciones."),
    ).toBeInTheDocument();

    fireEvent.click(button);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("disables generating an invitation while the role is still unknown, without hiding it", () => {
    useAuthStore.setState({ user: { id: "p1", email: "p@b.com", displayName: "P" } });
    vi.spyOn(membersApi, "fetchMembers").mockReturnValue(new Promise(() => {}));
    renderPanel();

    const button = screen.getByRole("button", { name: "Generar invitación" });
    expect(button).toBeDisabled();
    expect(screen.getByText("Comprobando permisos…")).toBeInTheDocument();
  });

  // Arreglo 4 (1.15-fix): a failed members fetch must read exactly like "still don't know",
  // never like "confirmed not the DM" — a legitimate DM must not be told they can't invite
  // players to their own campaign — and there must be a way to retry beyond
  // refetchOnWindowFocus happening to fire.
  it("treats a failed members fetch as 'still checking' rather than 'not the DM', and offers a retry", async () => {
    useAuthStore.setState({ user: { id: "dm1", email: "dm@b.com", displayName: "DM" } });
    const fetchMembers = vi
      .spyOn(membersApi, "fetchMembers")
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce([{ userId: "dm1", displayName: "DM", role: "DM" }]);
    renderPanel();

    const button = await screen.findByRole("button", { name: "Generar invitación" });
    await waitFor(() => expect(button).toBeDisabled());
    expect(screen.getByText("Comprobando permisos…")).toBeInTheDocument();
    expect(
      screen.queryByText("Solo el DM de la campaña puede generar invitaciones."),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(button).not.toBeDisabled());
    expect(fetchMembers).toHaveBeenCalledTimes(2);
  });
});
