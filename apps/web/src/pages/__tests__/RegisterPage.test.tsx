import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RegisterPage } from "../RegisterPage";
import * as api from "../../lib/api";
import * as invitesApi from "../../features/invites/api";
import { useAuthStore } from "../../store/auth.store";

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/join/:token" element={<p>Página de invitación</p>} />
        <Route path="/" element={<p>Mis campañas</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    useAuthStore.setState({ token: null, user: null });
  });

  it("resumes a pending invitation instead of landing on the dashboard", async () => {
    invitesApi.savePendingInvite("tok-guardado");
    vi.spyOn(api, "register").mockResolvedValue({
      token: "jwt",
      user: { id: "u1", email: "b@b.com", displayName: "B" },
    });
    renderRegister();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "B" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "b@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => expect(screen.getByText("Página de invitación")).toBeInTheDocument());
  });

  // Same regression risk as LoginPage.test.tsx: peekPendingInvite() now expires, and this is
  // the plain case with none saved.
  it("with no pending invitation, navigates to the dashboard", async () => {
    vi.spyOn(api, "register").mockResolvedValue({
      token: "jwt",
      user: { id: "u1", email: "b@b.com", displayName: "B" },
    });
    renderRegister();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "B" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "b@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => expect(screen.getByText("Mis campañas")).toBeInTheDocument());
  });
});
