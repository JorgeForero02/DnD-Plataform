import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../store/auth.store";
import { savePendingInvite, peekPendingInvite } from "../features/invites/api";
import { queryClient } from "../lib/queryClient";

describe("auth store", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
  });

  it("setAuth stores token+user and persists token", () => {
    useAuthStore.getState().setAuth({
      token: "abc",
      user: { id: "1", email: "a@b.com", displayName: "G" },
    });
    expect(useAuthStore.getState().token).toBe("abc");
    expect(useAuthStore.getState().user?.email).toBe("a@b.com");
    expect(localStorage.getItem("dnd_token")).toBe("abc");
  });

  it("logout clears state and storage", () => {
    useAuthStore.getState().setAuth({
      token: "abc",
      user: { id: "1", email: "a@b.com", displayName: "G" },
    });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().token).toBeNull();
    expect(localStorage.getItem("dnd_token")).toBeNull();
  });

  // A pending invite (JoinPage.tsx, features/invites/api.ts) left over from a visit that never
  // logged in must not survive the session that's now ending on this browser — otherwise the
  // next person to log in here inherits it and gets auto-joined to a campaign they never asked
  // for. logout() must clear it exactly like it clears "dnd_token".
  it("logout also clears a pending invite", () => {
    savePendingInvite("tok-pendiente");
    expect(peekPendingInvite()).toBe("tok-pendiente");

    useAuthStore.getState().logout();

    expect(peekPendingInvite()).toBeNull();
  });

  // setUser is what rehydration (features/auth/hooks.ts) calls after fetching /auth/me: it
  // fills in the user the store lost on reload without touching the token that was already
  // there, and without re-writing it to localStorage (setAuth already did that at login).
  it("setUser fills in the user without touching the token", () => {
    localStorage.setItem("dnd_token", "already-there");
    useAuthStore.setState({ token: "already-there", user: null });

    useAuthStore.getState().setUser({ id: "1", email: "a@b.com", displayName: "Gandalf" });

    expect(useAuthStore.getState().user).toEqual({
      id: "1",
      email: "a@b.com",
      displayName: "Gandalf",
    });
    expect(useAuthStore.getState().token).toBe("already-there");
    expect(localStorage.getItem("dnd_token")).toBe("already-there");
  });

  // Fix round 1 (post-1.18b review), Critical 1 fix-of-the-fix: `flash` is what carries
  // AccountPage.tsx's "your session ended" message to LoginPage.tsx across the logout()/
  // navigate() that follows a password change — see the field's own comment for why this
  // replaced react-router navigation state (it broke in the real browser). The one thing that
  // MUST hold for it to do that job: logout() must NOT clear it, since PasswordForm calls
  // setFlash() and logout() back to back, in that order, and the message has to survive.
  it("setFlash sets the message, and logout() does not clear it", () => {
    useAuthStore.getState().setFlash("Contraseña actualizada.");
    expect(useAuthStore.getState().flash).toBe("Contraseña actualizada.");

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().flash).toBe("Contraseña actualizada.");
  });

  // Fix round 2 (post-1.18b review), Critical 2 tripwire: reverting the queryClient.clear()
  // line inside logout() has no tripwire without this — every other test in this file only
  // exercises token/user/flash, never react-query's cache. The scenario this guards is a
  // shared machine: a second account logging in seconds after the first (staleTime 30s,
  // lib/queryClient.ts) must not paint from a cache the first account populated.
  it("logout clears the react-query cache, not just the auth state", () => {
    queryClient.setQueryData(["x"], 1);
    expect(queryClient.getQueryData(["x"])).toBe(1);

    useAuthStore.getState().logout();

    expect(queryClient.getQueryData(["x"])).toBeUndefined();
  });

  it("clearFlash clears the message — what LoginPage.tsx calls once a login actually succeeds", () => {
    useAuthStore.getState().setFlash("Contraseña actualizada.");
    useAuthStore.getState().clearFlash();
    expect(useAuthStore.getState().flash).toBeNull();
  });
});
