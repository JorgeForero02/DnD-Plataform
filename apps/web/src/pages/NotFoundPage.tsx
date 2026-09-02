import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";

// Task 1.18b, hallazgo 6 — App.tsx had no wildcard route: an invented URL (a stale bookmark, a
// typo, a link copied wrong) rendered nothing at all, react-router's own silent default. This
// is the first screen a lost user sees, so it says exactly where they are (the path they
// typed, not a generic "404") and gives them one way back — the campaign list if there's a
// session, /login otherwise, so the button never lands on another dead end behind
// ProtectedRoute.
export function NotFoundPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-8 text-text">
      <Panel tone="chrome" className="w-full max-w-md text-center">
        <h1 className="text-chrome-xl font-bold">Esta página no existe</h1>
        <p className="mt-2 text-chrome-sm text-muted">
          No hay nada en{" "}
          {/* Minor (post-1.18b review): break-all — a long pasted URL with no natural break
              points would otherwise overflow this fixed-width panel instead of wrapping. */}
          <span className="break-all font-data text-text">{location.pathname}</span>.
        </p>
        <Button type="button" className="mt-4" onClick={() => navigate(token ? "/" : "/login")}>
          {token ? "Volver a mis campañas" : "Ir a iniciar sesión"}
        </Button>
      </Panel>
    </div>
  );
}
