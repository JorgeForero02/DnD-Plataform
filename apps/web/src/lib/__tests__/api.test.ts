import { describe, it, expect, vi, afterEach } from "vitest";
import { apiFetch, ApiError } from "../api";

describe("apiFetch error messages (fix 4: server errors are not shown as raw JSON)", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("turns a Zod fieldErrors body into a readable message", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          statusCode: 400,
          message: {
            formErrors: [],
            fieldErrors: { name: ["String must contain at least 1 character(s)"] },
          },
          error: "Bad Request",
        }),
    }) as unknown as typeof fetch;

    let caught: Error | null = null;
    try {
      await apiFetch("/campaigns/c1/entities");
    } catch (e) {
      caught = e as Error;
    }

    expect(caught).not.toBeNull();
    expect(caught!.message).toContain("String must contain at least 1 character(s)");
    // the raw JSON envelope must not leak to the user
    expect(caught!.message).not.toContain("statusCode");
    expect(caught!.message).not.toContain("fieldErrors");
  });

  it("turns a plain-string message body into that message", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () =>
        JSON.stringify({
          statusCode: 403,
          message: "Only the DM or the creator can modify this",
          error: "Forbidden",
        }),
    }) as unknown as typeof fetch;

    await expect(apiFetch("/campaigns/c1/entities/e1")).rejects.toThrow(
      "Only the DM or the creator can modify this",
    );
  });

  it("leaves a non-JSON error body untouched", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    }) as unknown as typeof fetch;

    await expect(apiFetch("/campaigns/c1/entities")).rejects.toThrow("Internal Server Error");
  });
});

// Fix 3 of 1.15-fix: hooks.ts's rehydration used to treat every apiFetch failure alike — a
// 500, a 502 from Vite's dev proxy, and a network failure all threw the same generic Error,
// so a caller couldn't tell "this token is invalid" from "the request failed for some other
// reason" without inspecting the message string. This is what lets a caller (features/auth/
// hooks.ts) tell them apart without parsing text.
describe("apiFetch propagates the HTTP status (fix 3: only a 401 should ever mean 'log out')", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("throws an ApiError carrying the real status for a 401", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ message: "Unauthorized" }),
    }) as unknown as typeof fetch;

    let caught: unknown = null;
    try {
      await apiFetch("/auth/me");
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(401);
    // The readable message from 1.14 must not be lost while adding status.
    expect((caught as ApiError).message).toBe("Unauthorized");
  });

  it("throws an ApiError carrying the real status for a 500, distinct from a 401", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    }) as unknown as typeof fetch;

    let caught: unknown = null;
    try {
      await apiFetch("/campaigns/c1/entities");
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(500);
  });
});
