import { Test } from "@nestjs/testing";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";

describe("AuthService", () => {
  let service: AuthService;
  const users = { findByEmail: jest.fn(), create: jest.fn() };
  const jwt = { signAsync: jest.fn().mockResolvedValue("token123") };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
    jest.clearAllMocks();
  });

  it("register() rejects duplicate email", async () => {
    users.findByEmail.mockResolvedValue({ id: "1" });
    await expect(
      service.register({ email: "a@b.com", password: "password123", displayName: "G" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("register() creates user and returns token", async () => {
    users.findByEmail.mockResolvedValue(null);
    users.create.mockResolvedValue({ id: "1", email: "a@b.com", displayName: "G" });
    const r = await service.register({ email: "a@b.com", password: "password123", displayName: "G" });
    expect(users.create).toHaveBeenCalled();
    expect(r.token).toBe("token123");
    expect(r.user).toEqual({ id: "1", email: "a@b.com", displayName: "G" });
  });

  it("login() rejects wrong password", async () => {
    const hash = await argon2.hash("password123");
    users.findByEmail.mockResolvedValue({ id: "1", email: "a@b.com", displayName: "G", passwordHash: hash });
    await expect(
      service.login({ email: "a@b.com", password: "wrongpass" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("login() succeeds with right password", async () => {
    const hash = await argon2.hash("password123");
    users.findByEmail.mockResolvedValue({ id: "1", email: "a@b.com", displayName: "G", passwordHash: hash });
    const r = await service.login({ email: "a@b.com", password: "password123" });
    expect(r.token).toBe("token123");
  });
});
