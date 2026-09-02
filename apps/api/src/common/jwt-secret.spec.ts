import { JWT_SECRET_MIN_LENGTH, requireJwtSecret } from "./jwt-secret";

describe("requireJwtSecret", () => {
  it("throws when JWT_SECRET is unset", () => {
    const env = {} as NodeJS.ProcessEnv;
    expect(() => requireJwtSecret(env)).toThrow(/JWT_SECRET/);
  });

  it("throws when JWT_SECRET is an empty string", () => {
    const env = { JWT_SECRET: "" } as NodeJS.ProcessEnv;
    expect(() => requireJwtSecret(env)).toThrow(/JWT_SECRET/);
  });

  it("throws when JWT_SECRET is one character short of the minimum length", () => {
    const secret = "a".repeat(JWT_SECRET_MIN_LENGTH - 1);
    const env = { JWT_SECRET: secret } as NodeJS.ProcessEnv;
    expect(() => requireJwtSecret(env)).toThrow(new RegExp(`${JWT_SECRET_MIN_LENGTH}`));
  });

  it("returns the value unchanged when it is exactly the minimum length", () => {
    const secret = "a".repeat(JWT_SECRET_MIN_LENGTH);
    const env = { JWT_SECRET: secret } as NodeJS.ProcessEnv;
    expect(requireJwtSecret(env)).toBe(secret);
  });

  it("throws when JWT_SECRET is whitespace-only, even if 32+ characters long", () => {
    const env = { JWT_SECRET: " ".repeat(JWT_SECRET_MIN_LENGTH) } as NodeJS.ProcessEnv;
    expect(() => requireJwtSecret(env)).toThrow(/JWT_SECRET/);
  });

  it("trims surrounding whitespace before measuring length and returning the value", () => {
    const secret = "a".repeat(JWT_SECRET_MIN_LENGTH);
    const env = { JWT_SECRET: `  ${secret}  ` } as NodeJS.ProcessEnv;
    expect(requireJwtSecret(env)).toBe(secret);
  });

  it("never includes the offending value in the thrown message", () => {
    const secret = "too-short-secret-value";
    const env = { JWT_SECRET: secret } as NodeJS.ProcessEnv;
    try {
      requireJwtSecret(env);
      throw new Error("expected requireJwtSecret to throw");
    } catch (error) {
      expect((error as Error).message).not.toContain(secret);
    }
  });
});
