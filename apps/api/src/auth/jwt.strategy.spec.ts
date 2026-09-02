import { UnauthorizedException } from "@nestjs/common";
import { JwtStrategy } from "./jwt.strategy";
import { UsersService } from "../users/users.service";

describe("JwtStrategy", () => {
  const ORIGINAL_ENV = process.env;
  const users = { findById: jest.fn() };
  let strategy: JwtStrategy;

  beforeEach(() => {
    // requireJwtSecret() runs in the constructor (jwt.strategy.ts), so a valid JWT_SECRET
    // must exist for `new JwtStrategy(...)` to succeed — isolated per test like
    // auth.module.spec.ts does, so this never leaks into other spec files sharing a worker.
    process.env = { ...ORIGINAL_ENV, JWT_SECRET: "a".repeat(32) };
    strategy = new JwtStrategy(users as unknown as UsersService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("rejects a token for a user that no longer exists", async () => {
    users.findById.mockResolvedValue(null);
    await expect(strategy.validate({ sub: "1", email: "a@b.com" })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("accepts a token when the user never changed their password", async () => {
    users.findById.mockResolvedValue({ id: "1", email: "a@b.com", passwordChangedAt: null });
    const result = await strategy.validate({ sub: "1", email: "a@b.com", iat: 1000 });
    expect(result).toEqual({ id: "1", email: "a@b.com" });
  });

  it("rejects a token issued strictly before the last password change", async () => {
    users.findById.mockResolvedValue({
      id: "1",
      email: "a@b.com",
      passwordChangedAt: new Date(2000 * 1000), // second 2000
    });
    await expect(
      strategy.validate({ sub: "1", email: "a@b.com", iat: 1000 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a token issued in the same second as the password change (tie treated as stale)", async () => {
    users.findById.mockResolvedValue({
      id: "1",
      email: "a@b.com",
      passwordChangedAt: new Date(2000 * 1000 + 500), // 2000.5s, floors to second 2000
    });
    await expect(
      strategy.validate({ sub: "1", email: "a@b.com", iat: 2000 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("accepts a token issued strictly after the last password change", async () => {
    users.findById.mockResolvedValue({
      id: "1",
      email: "a@b.com",
      passwordChangedAt: new Date(2000 * 1000),
    });
    const result = await strategy.validate({ sub: "1", email: "a@b.com", iat: 2001 });
    expect(result).toEqual({ id: "1", email: "a@b.com" });
  });
});
