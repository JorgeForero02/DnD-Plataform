import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { AppShell, AppHeader } from "../ui/AppShell";

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
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // C5 (2026-09-04) — la segunda de las tres pantallas huérfanas del armazón. Perderse **dentro**
  // de la aplicación y quedarse además sin cabecera es perderse dos veces: el logotipo y la
  // navegación son justo lo que hace falta cuando lo que se buscaba no está. El botón de vuelta
  // se queda como estaba, porque decide su destino según haya sesión o no; la cabecera añade la
  // otra salida, la de siempre — y `AppHeader` ya sabe que a un anónimo no se le ofrece «Cuenta».
  // El título pasa a `font-title`, la voz de todo título estructural, en vez del `font-bold` del
  // sistema.
  return (
    <AppShell
      header={<AppHeader userName={user?.displayName} onLogout={token ? logout : undefined} />}
    >
      <div className="flex justify-center py-s8">
        <Panel tone="chrome" className="w-full max-w-md text-center">
          <h1 className="font-title text-chrome-xl text-text">Esta página no existe</h1>
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
    </AppShell>
  );
}
