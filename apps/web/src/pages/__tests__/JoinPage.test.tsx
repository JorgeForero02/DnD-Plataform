import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { JoinPage } from "../JoinPage";
import * as invitesApi from "../../features/invites/api";
import { useAuthStore } from "../../store/auth.store";

function renderJoin(initialPath: string, { strict = false } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/join/:token" element={<JoinPage />} />
          <Route path="/campaigns/:campaignId" element={<p>Página de campaña</p>} />
          <Route path="/" element={<p>Tus crónicas</p>} />
          <Route path="/login" element={<p>Página de inicio de sesión</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
}

describe("JoinPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    useAuthStore.setState({ token: null, user: null });
  });

  it("with an active session, shows a confirmation and does not accept until the user clicks", async () => {
    useAuthStore.setState({
      token: "jwt-abc",
      user: { id: "u1", displayName: "DM", email: "dm@x.com" },
    });
    const spy = vi
      .spyOn(invitesApi, "acceptInvite")
      .mockResolvedValue({ campaignId: "c9", role: "PLAYER" });

    renderJoin("/join/tok-real");

    expect(
      await screen.findByText("Estás a punto de unirte a una campaña con esta invitación."),
    ).toBeInTheDocument();
    // The warning from arreglo 2: accepting consumes the link.
    expect(screen.getByText(/consume el enlace/)).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("accepts the token from the URL only after the explicit click, and navigates to the campaign the server returned", async () => {
    useAuthStore.setState({
      token: "jwt-abc",
      user: { id: "u1", displayName: "DM", email: "dm@x.com" },
    });
    const spy = vi
      .spyOn(invitesApi, "acceptInvite")
      .mockResolvedValue({ campaignId: "c9", role: "PLAYER" });

    renderJoin("/join/tok-real");

    fireEvent.click(await screen.findByRole("button", { name: "Unirse a la campaña" }));

    expect(await screen.findByText("Página de campaña")).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith("tok-real");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("does not accept twice from a rapid double click, even under React.StrictMode", async () => {
    useAuthStore.setState({
      token: "jwt-abc",
      user: { id: "u1", displayName: "DM", email: "dm@x.com" },
    });
    const spy = vi
      .spyOn(invitesApi, "acceptInvite")
      .mockResolvedValue({ campaignId: "c9", role: "PLAYER" });

    renderJoin("/join/tok-real", { strict: true });

    const button = await screen.findByRole("button", { name: "Unirse a la campaña" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(await screen.findByText("Página de campaña")).toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("shows the server's error, in Spanish, for an invalid or already-used token, with a way out", async () => {
    useAuthStore.setState({
      token: "jwt-abc",
      user: { id: "u1", displayName: "DM", email: "dm@x.com" },
    });
    vi.spyOn(invitesApi, "acceptInvite").mockRejectedValue(
      new Error("Invalid or already-used invite"),
    );

    renderJoin("/join/tok-usado");
    fireEvent.click(await screen.findByRole("button", { name: "Unirse a la campaña" }));

    expect(
      await screen.findByText("La invitación no es válida o ya se ha usado."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Volver a mis campañas/ })).toBeInTheDocument();
  });

  it("clears the pending invite once an accept attempt starts, whether it succeeds or fails", async () => {
    useAuthStore.setState({
      token: "jwt-abc",
      user: { id: "u1", displayName: "DM", email: "dm@x.com" },
    });
    invitesApi.savePendingInvite("tok-real");
    vi.spyOn(invitesApi, "acceptInvite").mockRejectedValue(new Error("boom"));

    renderJoin("/join/tok-real");
    fireEvent.click(await screen.findByRole("button", { name: "Unirse a la campaña" }));

    await screen.findByText("boom");
    expect(invitesApi.peekPendingInvite()).toBeNull();
  });

  it("without a session, does not call accept and keeps the token saved for later", async () => {
    const spy = vi.spyOn(invitesApi, "acceptInvite");

    renderJoin("/join/tok-pendiente");

    expect(await screen.findByRole("link", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Crear cuenta" })).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
    expect(invitesApi.peekPendingInvite()).toBe("tok-pendiente");
  });
});
