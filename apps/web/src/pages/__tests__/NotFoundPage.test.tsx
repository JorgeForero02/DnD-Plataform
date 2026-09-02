import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { NotFoundPage } from "../NotFoundPage";
import { useAuthStore } from "../../store/auth.store";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>Pantalla de login</p>} />
        <Route path="/" element={<p>Mis campañas</p>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NotFoundPage", () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null });
  });

  // Revert App.tsx's wildcard route (App.tsx) and this whole file stops mounting anything —
  // the direct check that the catch-all this task adds actually exists.
  it("says which path doesn't exist, not a generic message", () => {
    renderAt("/una-ruta-inventada");
    expect(screen.getByRole("heading", { name: "Esta página no existe" })).toBeInTheDocument();
    // Revert this to a hardcoded string (or drop useLocation()) and this assertion fails even
    // though the heading still renders — the point is the SCREEN says WHERE the user is.
    expect(screen.getByText("/una-ruta-inventada", { exact: false })).toBeInTheDocument();
  });

  it("sends a logged-out visitor to log in, not to a page ProtectedRoute would bounce them off", () => {
    renderAt("/una-ruta-inventada");
    fireEvent.click(screen.getByRole("button", { name: "Ir a iniciar sesión" }));
    expect(screen.getByText("Pantalla de login")).toBeInTheDocument();
  });

  it("sends a logged-in visitor back to the campaign list", () => {
    useAuthStore.setState({ token: "tok", user: { id: "u1", email: "a@a.com", displayName: "A" } });
    renderAt("/una-ruta-inventada");
    fireEvent.click(screen.getByRole("button", { name: "Volver a mis campañas" }));
    expect(screen.getByText("Mis campañas")).toBeInTheDocument();
  });
});
