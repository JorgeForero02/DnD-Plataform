import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../store/auth.store";
import { savePendingInvite, peekPendingInvite } from "../features/invites/api";

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
});
