import { AUTH_RATE_LIMIT_DEFAULT, parseAuthRateLimit } from "./rate-limit.constants";

describe("parseAuthRateLimit", () => {
  it("falls back to the default when the raw value is undefined (env var unset)", () => {
    expect(parseAuthRateLimit(undefined)).toBe(AUTH_RATE_LIMIT_DEFAULT);
  });

  it("falls back to the default when the raw value is not a number", () => {
    expect(parseAuthRateLimit("abc")).toBe(AUTH_RATE_LIMIT_DEFAULT);
  });

  it("falls back to the default when the raw value is an empty string", () => {
    expect(parseAuthRateLimit("")).toBe(AUTH_RATE_LIMIT_DEFAULT);
  });

  it("falls back to the default when the raw value is zero", () => {
    expect(parseAuthRateLimit("0")).toBe(AUTH_RATE_LIMIT_DEFAULT);
  });

  it("falls back to the default when the raw value is negative", () => {
    expect(parseAuthRateLimit("-5")).toBe(AUTH_RATE_LIMIT_DEFAULT);
  });

  it("falls back to the default when the raw value is not a whole number", () => {
    expect(parseAuthRateLimit("5.5")).toBe(AUTH_RATE_LIMIT_DEFAULT);
  });

  it("falls back to the default when the raw value is Infinity", () => {
    expect(parseAuthRateLimit("Infinity")).toBe(AUTH_RATE_LIMIT_DEFAULT);
  });

  it("never disables the limit — a garbage value must never parse as unlimited", () => {
    expect(parseAuthRateLimit("not-a-number")).toBe(AUTH_RATE_LIMIT_DEFAULT);
    expect(Number.isFinite(parseAuthRateLimit("not-a-number"))).toBe(true);
  });

  it("accepts a valid positive integer override", () => {
    expect(parseAuthRateLimit("1000")).toBe(1000);
  });

  it("accepts the smallest valid override, 1", () => {
    expect(parseAuthRateLimit("1")).toBe(1);
  });

  it("uses the explicit fallback argument when given one, instead of the module default", () => {
    expect(parseAuthRateLimit("abc", 42)).toBe(42);
    expect(parseAuthRateLimit(undefined, 42)).toBe(42);
  });
});
