import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../store/auth.store";
import { ApiError } from "../../lib/api";
// Self-import so this calls fetchMe through the module namespace, keeping it spyable in
// tests (same reason api.ts/hooks.ts are split elsewhere — see docs/04-convenciones.md).
import * as authApi from "./api";

// The token survives a page reload in localStorage (auth.store.ts), but the user does not —
// it only ever lived in memory. This is what fills it back in, once, without making
// ProtectedRoute (which only ever checked the token) flicker to the login screen while it
// does: a token with no user yet is still a token, so protected routes keep rendering.
//
// `invalidToken` is the one thing that DOES need reacting to: a token that no longer resolves
// (expired, revoked, or a user that stopped existing) used to leave the app in limbo — the
// token stayed in localStorage, `user` stayed null forever, and nothing ever routed away from
// a protected screen showing no identity. This logs the stale session out and reports it so a
// caller (AuthGate) can redirect to /login.
export function useAuthRehydration(): { invalidToken: boolean } {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const [invalidToken, setInvalidToken] = useState(false);
  // Guards against firing a second request for the same token while the first is still in
  // flight — React 18 StrictMode's double-invoked effects in dev being the concrete case.
  const requestedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!token || user) return;
    if (requestedFor.current === token) return;
    requestedFor.current = token;
    authApi
      .fetchMe()
      .then((fetchedUser) => setUser(fetchedUser))
      .catch((err: unknown) => {
        // Only a 401 means the token itself is bad. A 500, a 502 from Vite's dev proxy while
        // the API restarts, or a network failure (which isn't even an ApiError — fetch itself
        // rejected) are not proof of that: wiping the token on any of those would sign a DM
        // out mid-session over a blip they had nothing to do with. Leaving the token alone
        // means the next natural retry (a reload, a later request) gets a fresh chance —
        // requestedFor resets with a fresh mount, so it doesn't get stuck refusing forever.
        if (err instanceof ApiError && err.status === 401) {
          logout();
          setInvalidToken(true);
        }
      });
  }, [token, user, setUser, logout]);

  return { invalidToken };
}
