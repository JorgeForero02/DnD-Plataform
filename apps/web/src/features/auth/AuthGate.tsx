import type { ReactNode } from "react";
import { useAuthRehydration } from "./hooks";

// Wraps the whole router (App.tsx), not just the protected routes: a token that turns out to
// be invalid can be discovered while sitting on any screen, not only a protected one.
//
// While the check is still in flight it renders children unconditionally — the same "token
// alone is enough" rule ProtectedRoute already used. Blocking on the user here (e.g. a
// spinner, or hiding children until fetchMe resolves) would make every reload of a protected
// screen flicker; showing children immediately does not, because nothing downstream *requires*
// `user` to render — DashboardPage's `user?.displayName` (and every permission check added in
// this task) already tolerates it being briefly null.
//
// It never redirects itself. An earlier version returned <Navigate to="/login"> here instead
// of children — but AuthGate is mounted OUTSIDE <Routes> (App.tsx), and <Navigate> only
// changes the URL; it doesn't render anything on its own. With AuthGate itself replaced by
// <Navigate>, <Routes> — which is what actually renders /login — never rendered at all: the
// screen went blank forever once a token expired (invalidToken never resets to false either),
// discoverable by anyone who kept a tab open past the JWT's 7-day life (auth.module.ts).
// useAuthRehydration's logout() already clears the token when fetchMe fails, and
// ProtectedRoute already redirects to /login whenever there's no token — so AuthGate doesn't
// need to redirect at all; it only needs to trigger the rehydration check and get out of the
// way. See docs/07-historial.md (tarea 1.15-fix) for the topology this replaced.
export function AuthGate({ children }: { children: ReactNode }) {
  useAuthRehydration();
  return <>{children}</>;
}
