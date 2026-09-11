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
        <Route path="/" element={<p>Tus crónicas</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    useAuthStore.setState({ token: null, user: null, flash: null });
  });

  it("resumes a pending invitation instead of landing on the dashboard", async () => {
    invitesApi.savePendingInvite("tok-guardado");
    vi.spyOn(api, "login").mockResolvedValue({
      token: "jwt",
      user: { id: "u1", email: "a@a.com", displayName: "A", isAdmin: false },
    });
    renderLogin();

    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "a@a.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(screen.getByText("Página de invitación")).toBeInTheDocument());
  });

  // The regression this change could introduce: peekPendingInvite() now expires
  // (features/invites/api.ts), but before this test nothing asserted the plain case — a login
  // with no pending invite must land on the dashboard, not get redirected to /join/... by a
  // stale value read wrong.
  it("with no pending invitation, navigates to the dashboard", async () => {
    vi.spyOn(api, "login").mockResolvedValue({
      token: "jwt",
      user: { id: "u1", email: "a@a.com", displayName: "A", isAdmin: false },
    });
    renderLogin();

    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "a@a.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(screen.getByText("Tus crónicas")).toBeInTheDocument());
  });

  // Fix round 1 (post-1.19b review): LoginPage.tsx gained role="alert" on the submit-error
  // paragraph as part of the token conversion, but nothing asserted it — an unasserted
  // behaviour change the reviewer flagged. A screen reader announces role="alert" content
  // immediately, unprompted; a plain <p> only gets read if something happens to have focus
  // there already, which nothing does on this screen.
  it("announces a failed login as an alert, not silent text", async () => {
    vi.spyOn(api, "login").mockRejectedValue(new Error("Invalid credentials"));
    renderLogin();

    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "a@a.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    // Reseño 2026-09-02 (audit A1): the API answers in English and this interface is in
    // Spanish. Asserting the translated text is what makes the translation load-bearing —
    // delete traducirErrorDeAcceso and this fails instead of passing on the raw message.
    expect(await screen.findByRole("alert")).toHaveTextContent("Correo o contraseña incorrectos.");
  });

  // Tarea Q1 — el aviso de buenas noticias («Contraseña cambiada», por ejemplo) llevaba un
  // carácter de fuente como icono, que es justo el ejemplo que prohíbe la regla de
  // docs/04-convenciones.md. Ahora se dibuja, y sigue dentro del propio mensaje: es la mitad de
  // la señal que no depende de distinguir el color del texto.
  it("el mensaje de buenas noticias lleva un visto dibujado, no un glifo de fuente", () => {
    useAuthStore.setState({ flash: "Contraseña cambiada. Vuelve a entrar." });
    renderLogin();

    const aviso = screen.getByRole("status");
    expect(aviso.textContent).toBe("Contraseña cambiada. Vuelve a entrar.");
    const icono = aviso.querySelector('svg[data-icono="confirmacion"]');
    expect(icono).not.toBeNull();
    expect(icono!.getAttribute("aria-hidden")).toBe("true");
  });
});
