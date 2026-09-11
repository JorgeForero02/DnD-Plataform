import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
// Plan 12 · 12.2 — **el cliente de consultas entra en este montaje** porque la cabecera ya no es
// solo maquetación: lleva la bandeja de avisos, que pregunta al servidor. En la aplicación real
// `QueryClientProvider` envuelve `App` entero (`main.tsx:27`), así que esto acerca la prueba a lo
// que de verdad se monta en vez de alejarla.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { NotFoundPage } from "../NotFoundPage";
import { useAuthStore } from "../../store/auth.store";

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<p>Pantalla de login</p>} />
          <Route path="/" element={<p>Tus crónicas</p>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
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
    useAuthStore.setState({
      token: "tok",
      user: { id: "u1", email: "a@a.com", displayName: "A", isAdmin: false },
    });
    renderAt("/una-ruta-inventada");
    fireEvent.click(screen.getByRole("button", { name: "Volver a mis campañas" }));
    expect(screen.getByText("Tus crónicas")).toBeInTheDocument();
  });
});
