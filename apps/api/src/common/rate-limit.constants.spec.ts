import {
  AUTH_RATE_LIMIT_DEFAULT,
  DEFAULT_RATE_LIMIT_FALLBACK,
  parseAuthRateLimit,
} from "./rate-limit.constants";

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

describe("el límite global también se puede configurar, y con las mismas garantías", () => {
  // Se hizo configurable el 2026-09-03 por el mismo motivo que el de autenticación: la suite de
  // navegador dispara cientos de peticiones legítimas desde una sola IP en un minuto y chocaba
  // con el tope de producción, fallando en un sitio distinto cada vuelta. Lo que NO puede pasar
  // es que un valor mal escrito lo desactive, así que comparte validador y esto lo fija.
  it("un valor válido manda", () => {
    expect(parseAuthRateLimit("5000", DEFAULT_RATE_LIMIT_FALLBACK)).toBe(5000);
  });

  it.each([undefined, "", "abc", "0", "-1", "12.5"])(
    "con %p cae al valor de producción, nunca a «sin límite»",
    (raw) => {
      expect(parseAuthRateLimit(raw as string | undefined, DEFAULT_RATE_LIMIT_FALLBACK)).toBe(
        DEFAULT_RATE_LIMIT_FALLBACK,
      );
    },
  );

  it("el valor de producción sigue siendo 100", () => {
    expect(DEFAULT_RATE_LIMIT_FALLBACK).toBe(100);
  });
});
