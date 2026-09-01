import { describe, it, expect, vi, afterEach } from "vitest";
import { apiFetch } from "../api";

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
