import { Test } from "@nestjs/testing";
import { ConflictException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";

// **El tiempo de espera de este fichero, declarado y explicado** (ficha P2-10).
//
// Los 5 000 ms por defecto de Jest se quedan cortos aquí en cuanto la máquina tiene algo más que
// hacer: **cada** prueba de abajo hashea o verifica con `argon2`, que es caro **a propósito** —es
// la defensa de las contraseñas, no un ajuste de rendimiento, y por eso no se abarata—. Solo, el
// fichero tarda ~5 s en total; con las unitarias de la web corriendo en paralelo, `changePassword`
// se pasó del tope dos veces durante la tanda del 2026-09-07.
//
// El coste no era el rojo, era el diagnóstico: parece un defecto del cambio que acabas de hacer, y
// descartarlo cuesta una vuelta entera. El número se declara aquí en vez de dejarlo implícito.
jest.setTimeout(30_000);

describe("AuthService", () => {
  let service: AuthService;
  const users = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    updatePasswordHash: jest.fn(),
  };
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
    const r = await service.register({
      email: "a@b.com",
      password: "password123",
      displayName: "G",
    });
    expect(users.create).toHaveBeenCalled();
    expect(r.token).toBe("token123");
    expect(r.user).toEqual({ id: "1", email: "a@b.com", displayName: "G" });
  });

  it("login() rejects wrong password", async () => {
    const hash = await argon2.hash("password123");
    users.findByEmail.mockResolvedValue({
      id: "1",
      email: "a@b.com",
      displayName: "G",
      passwordHash: hash,
    });
    await expect(service.login({ email: "a@b.com", password: "wrongpass" })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("login() succeeds with right password", async () => {
    const hash = await argon2.hash("password123");
    users.findByEmail.mockResolvedValue({
      id: "1",
      email: "a@b.com",
      displayName: "G",
      passwordHash: hash,
    });
    const r = await service.login({ email: "a@b.com", password: "password123" });
    expect(r.token).toBe("token123");
  });

  it("changePassword() rejects a wrong current password without touching the stored hash", async () => {
    const hash = await argon2.hash("old-password");
    users.findById.mockResolvedValue({ id: "1", email: "a@b.com", passwordHash: hash });
    await expect(
      service.changePassword("1", { currentPassword: "wrong", newPassword: "new-password" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(users.updatePasswordHash).not.toHaveBeenCalled();
  });

  it("changePassword() throws NotFoundException if the token's user no longer exists", async () => {
    users.findById.mockResolvedValue(null);
    await expect(
      service.changePassword("1", { currentPassword: "old-password", newPassword: "new-password" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("changePassword() verifies the current password and stores a new hash", async () => {
    const hash = await argon2.hash("old-password");
    users.findById.mockResolvedValue({ id: "1", email: "a@b.com", passwordHash: hash });
    users.updatePasswordHash.mockResolvedValue({
      id: "1",
      email: "a@b.com",
      passwordChangedAt: new Date(),
    });
    await service.changePassword("1", {
      currentPassword: "old-password",
      newPassword: "new-password",
    });
    expect(users.updatePasswordHash).toHaveBeenCalledWith("1", expect.any(String));
    const [, newHash] = users.updatePasswordHash.mock.calls[0];
    expect(newHash).not.toBe(hash);
    expect(await argon2.verify(newHash, "new-password")).toBe(true);
  });

  // Task 20 — a fresh token, signed with an explicit `iat` one second past
  // `passwordChangedAt`, so it reads as valid immediately (jwt.strategy.ts's tie-goes-to-reject
  // check) instead of forcing the caller to wait for the clock to tick to a new second.
  it("changePassword() returns a fresh token signed with iat = passwordChangedAt + 1s", async () => {
    const hash = await argon2.hash("old-password");
    users.findById.mockResolvedValue({ id: "1", email: "a@b.com", passwordHash: hash });
    const passwordChangedAt = new Date("2026-01-01T00:00:00.000Z");
    users.updatePasswordHash.mockResolvedValue({ id: "1", email: "a@b.com", passwordChangedAt });

    const result = await service.changePassword("1", {
      currentPassword: "old-password",
      newPassword: "new-password",
    });

    expect(result).toEqual({ success: true, token: "token123" });
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: "1",
      email: "a@b.com",
      iat: Math.floor(passwordChangedAt.getTime() / 1000) + 1,
    });
  });
});
