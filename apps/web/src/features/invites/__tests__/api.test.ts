import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  savePendingInvite,
  peekPendingInvite,
  clearPendingInvite,
  translateInviteError,
  PENDING_INVITE_TTL_MS,
} from "../api";

describe("pending invite expiry", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the saved token while it is fresh", () => {
    savePendingInvite("tok-fresco");
    expect(peekPendingInvite()).toBe("tok-fresco");
  });

  it("expires a token older than the TTL and clears it from storage", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    savePendingInvite("tok-viejo");

    vi.spyOn(Date, "now").mockReturnValue(now + PENDING_INVITE_TTL_MS + 1);

    expect(peekPendingInvite()).toBeNull();
    // Self-cleared, not just hidden: a second read (even without the mock) stays null.
    vi.spyOn(Date, "now").mockRestore();
    expect(peekPendingInvite()).toBeNull();
  });

  it("keeps a token saved just under the TTL", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    savePendingInvite("tok-al-limite");

    vi.spyOn(Date, "now").mockReturnValue(now + PENDING_INVITE_TTL_MS - 1);

    expect(peekPendingInvite()).toBe("tok-al-limite");
  });

  it("treats a legacy bare-string value (no timestamp) as expired", () => {
    localStorage.setItem("dnd_pending_invite_token", "tok-antiguo-sin-formato");
    expect(peekPendingInvite()).toBeNull();
  });

  it("clearPendingInvite removes it outright", () => {
    savePendingInvite("tok-a-borrar");
    clearPendingInvite();
    expect(peekPendingInvite()).toBeNull();
  });
});

describe("translateInviteError", () => {
  it("translates the invalid-or-used-invite message", () => {
    expect(translateInviteError("Invalid or already-used invite")).toBe(
      "La invitación no es válida o ya se ha usado.",
    );
  });

  it("translates the DM-only message", () => {
    expect(translateInviteError("DM role required")).toBe(
      "Solo el DM de la campaña puede hacer esto.",
    );
  });

  it("passes an unrecognized message through unchanged", () => {
    expect(translateInviteError("Some other server error")).toBe("Some other server error");
  });
});
