import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../store/auth.store";

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
});
