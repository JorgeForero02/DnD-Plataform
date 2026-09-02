import { create } from "zustand";
import type { AuthResponse } from "@dnd/shared";
import { clearPendingInvite } from "../features/invites/api";
import { queryClient } from "../lib/queryClient";

interface AuthState {
  token: string | null;
  user: AuthResponse["user"] | null;
  // Fix round 1 (post-1.18b review), Critical 1 fix-of-the-fix: a one-shot message for the NEXT
  // unauthenticated screen to show — LoginPage.tsx reads it. Started life as react-router
  // navigation state (`navigate("/login", { state: { flash } })`), which broke in the real
  // browser (caught by cuenta.spec.ts, the one the brief calls out as needing a real journey,
  // not a mock): ProtectedRoute's OWN bare `<Navigate to="/login" replace/>` — mounted the same
  // render as AccountPage.tsx's explicit navigate(), because logout() dropping the token and
  // that explicit navigate() are two updates from two different sources (zustand's store and
  // React Router's history) that do not always land in a single batched commit — fires its own
  // `history.replaceState` a moment later with NO state, silently overwriting the flash before
  // LoginPage ever read it (confirmed with a throwaway debug spec: three navigations to
  // /login, the last carrying `usr: null`). A field on this store is immune to that race
  // entirely: it does not live in router history, so nothing router-driven can overwrite it.
  flash: string | null;
  setAuth: (r: AuthResponse) => void;
  setUser: (user: AuthResponse["user"]) => void;
  setFlash: (message: string) => void;
  clearFlash: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("dnd_token"),
  user: null,
  flash: null,
  setAuth: (r) => {
    localStorage.setItem("dnd_token", r.token);
    set({ token: r.token, user: r.user });
  },
  // Used by rehydration (features/auth/hooks.ts) after fetching /auth/me on page load: fills
  // in the user the store lost on reload. The token is already in localStorage from the
  // original login/register — this never touches it.
  setUser: (user) => set({ user }),
  setFlash: (message) => set({ flash: message }),
  clearFlash: () => set({ flash: null }),
  logout: () => {
    localStorage.removeItem("dnd_token");
    // A pending invite (JoinPage.tsx) left over from a visit that never logged in shouldn't
    // outlive the session that's now ending on this browser — otherwise the next person to log
    // in here inherits it. It also expires on its own (features/invites/api.ts); this closes
    // the gap for as long as the session that saved it is still open.
    clearPendingInvite();
    // Fix round 1 (post-1.18b review), Critical 2: without this, react-query's cache
    // (staleTime 30s, lib/queryClient.ts) outlives the session that populated it. The exact
    // scenario the review named — a password change forces THIS tab back to /login seconds
    // later — is precisely when the next login is most likely to be a DIFFERENT account on a
    // shared machine; without clearing the cache, the dashboard would paint the previous
    // user's campaigns from cache before any request the new session made ever resolved.
    queryClient.clear();
    set({ token: null, user: null });
  },
}));
