import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "../../../App";
import { useAuthStore } from "../../../store/auth.store";
import { ApiError } from "../../../lib/api";
import * as authApi from "../api";
import * as campaignsApi from "../../campaigns/api";

// Mounts the real topology (App.tsx, BrowserRouter + AuthGate + Routes), not AuthGate in
// isolation: AuthGate.tsx used to be rendered *outside* <Routes> in production, a wiring that
// no MemoryRouter-wrapped-around-AuthGate test can ever reproduce — see docs/06-pendientes.md
// (arreglo 2 de la tarea 1.15-fix) for the bug that topology hid.
function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>,
  );
}

describe("AuthGate — real app topology", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ token: null, user: null });
    vi.restoreAllMocks();
    window.history.pushState({}, "", "/");
  });

  it("renders the protected screen while the token has not been checked yet — no flicker to login", () => {
    useAuthStore.setState({ token: "tok", user: null });
    vi.spyOn(authApi, "fetchMe").mockReturnValue(new Promise(() => {})); // never resolves
    vi.spyOn(campaignsApi, "fetchCampaigns").mockResolvedValue([]);
    renderApp();
    expect(screen.getByRole("heading", { name: "Tus crónicas" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Entrar" })).not.toBeInTheDocument();
  });

  // The Critical this reproduces: AuthGate used to return <Navigate> INSTEAD OF its children,
  // mounted OUTSIDE <Routes> — so /login (which lives inside <Routes>) never rendered, and the
  // screen went permanently blank on an expired token. Fixed by having AuthGate always render
  // its children and letting ProtectedRoute (which already redirects when there's no token)
  // do the redirecting once logout() clears the token — see AuthGate.tsx.
  it("shows the login form once an expired token is discovered, instead of a permanent blank screen", async () => {
    useAuthStore.setState({ token: "tok-caducado", user: null });
    vi.spyOn(authApi, "fetchMe").mockRejectedValue(new ApiError("Unauthorized", 401));
    renderApp();
    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    // Not just present in the DOM somewhere: it's what the screen actually shows.
    expect(screen.queryByRole("heading", { name: "Tus crónicas" })).not.toBeInTheDocument();
  });

  // Revisión final de `ficha/tanda-2-a-5`, Medium #3: el caso real de producción para el
  // `flash` de auth.store.ts — un token invalidado en OTRA pestaña (típicamente porque un
  // admin reinició la contraseña de este usuario) — mostrado en /login por la topología real,
  // no un store puesto a mano.
  it("un 401 real (token invalidado en otro sitio) deja el aviso en /login, no una pantalla muda", async () => {
    useAuthStore.setState({ token: "tok-invalidado", user: null });
    vi.spyOn(authApi, "fetchMe").mockRejectedValue(new ApiError("Unauthorized", 401));
    renderApp();
    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Tu sesión caducó o tu contraseña fue cambiada. Entra de nuevo.",
    );
  });
});
