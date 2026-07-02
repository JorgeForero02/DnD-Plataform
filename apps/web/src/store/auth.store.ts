import { create } from "zustand";
import type { AuthResponse } from "@dnd/shared";

interface AuthState {
  token: string | null;
  user: AuthResponse["user"] | null;
  setAuth: (r: AuthResponse) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("dnd_token"),
  user: null,
  setAuth: (r) => {
    localStorage.setItem("dnd_token", r.token);
    set({ token: r.token, user: r.user });
  },
  logout: () => {
    localStorage.removeItem("dnd_token");
    set({ token: null, user: null });
  },
}));
