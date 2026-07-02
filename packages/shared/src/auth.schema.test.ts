import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "./auth.schema";

describe("registerSchema", () => {
  it("accepts valid input", () => {
    const r = registerSchema.safeParse({
      email: "a@b.com", password: "password123", displayName: "Gandalf"
    });
    expect(r.success).toBe(true);
  });
  it("rejects short password", () => {
    const r = registerSchema.safeParse({
      email: "a@b.com", password: "short", displayName: "Gandalf"
    });
    expect(r.success).toBe(false);
  });
  it("rejects bad email", () => {
    const r = loginSchema.safeParse({ email: "nope", password: "password123" });
    expect(r.success).toBe(false);
  });
});
