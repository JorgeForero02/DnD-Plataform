import { create } from "zustand";
import type { AuthResponse } from "@dnd/shared";
import { clearPendingInvite } from "../features/invites/api";

interface AuthState {
  token: string | null;
  user: AuthResponse["user"] | null;
  setAuth: (r: AuthResponse) => void;
  setUser: (user: AuthResponse["user"]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("dnd_token"),
  user: null,
  setAuth: (r) => {
    localStorage.setItem("dnd_token", r.token);
    set({ token: r.token, user: r.user });
  },
  // Used by rehydration (features/auth/hooks.ts) after fetching /auth/me on page load: fills
  // in the user the store lost on reload. The token is already in localStorage from the
  // original login/register — this never touches it.
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem("dnd_token");
    // A pending invite (JoinPage.tsx) left over from a visit that never logged in shouldn't
    // outlive the session that's now ending on this browser — otherwise the next person to log
    // in here inherits it. It also expires on its own (features/invites/api.ts); this closes
    // the gap for as long as the session that saved it is still open.
    clearPendingInvite();
    set({ token: null, user: null });
  },
}));
