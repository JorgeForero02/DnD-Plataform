import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { LoginPage } from "../LoginPage";
import * as api from "../../lib/api";
import * as invitesApi from "../../features/invites/api";
import { useAuthStore } from "../../store/auth.store";

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/join/:token" element={<p>Página de invitación</p>} />
        <Route path="/" element={<p>Mis campañas</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    useAuthStore.setState({ token: null, user: null });
  });

  it("resumes a pending invitation instead of landing on the dashboard", async () => {
    invitesApi.savePendingInvite("tok-guardado");
    vi.spyOn(api, "login").mockResolvedValue({
      token: "jwt",
      user: { id: "u1", email: "a@a.com", displayName: "A" },
    });
    renderLogin();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@a.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(screen.getByText("Página de invitación")).toBeInTheDocument());
  });

  // The regression this change could introduce: peekPendingInvite() now expires
  // (features/invites/api.ts), but before this test nothing asserted the plain case — a login
  // with no pending invite must land on the dashboard, not get redirected to /join/... by a
  // stale value read wrong.
  it("with no pending invitation, navigates to the dashboard", async () => {
    vi.spyOn(api, "login").mockResolvedValue({
      token: "jwt",
      user: { id: "u1", email: "a@a.com", displayName: "A" },
    });
    renderLogin();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@a.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(screen.getByText("Mis campañas")).toBeInTheDocument());
  });
});
