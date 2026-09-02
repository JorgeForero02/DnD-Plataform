import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";

describe("AuthController", () => {
  let controller: AuthController;
  const authService = { register: jest.fn(), login: jest.fn(), changePassword: jest.fn() };
  const usersService = { findById: jest.fn(), updateDisplayName: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();
    controller = moduleRef.get(AuthController);
    jest.clearAllMocks();
  });

  it("me() looks the user up and returns id, email and displayName", async () => {
    usersService.findById.mockResolvedValue({
      id: "1",
      email: "a@b.com",
      displayName: "Gandalf",
      passwordHash: "should-not-leak",
    });
    const result = await controller.me({ user: { id: "1", email: "a@b.com" } });
    expect(usersService.findById).toHaveBeenCalledWith("1");
    expect(result).toEqual({ id: "1", email: "a@b.com", displayName: "Gandalf" });
  });

  it("me() throws NotFoundException if the token's user no longer exists", async () => {
    usersService.findById.mockResolvedValue(null);
    await expect(controller.me({ user: { id: "1", email: "a@b.com" } })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("updateDisplayName() renames the caller taken from the JWT, not the body", async () => {
    usersService.updateDisplayName.mockResolvedValue({
      id: "1",
      email: "a@b.com",
      displayName: "New Name",
      passwordHash: "should-not-leak",
    });
    const result = await controller.updateDisplayName(
      { user: { id: "1", email: "a@b.com" } },
      { displayName: "New Name" },
    );
    expect(usersService.updateDisplayName).toHaveBeenCalledWith("1", "New Name");
    expect(result).toEqual({ id: "1", email: "a@b.com", displayName: "New Name" });
  });

  it("changePassword() delegates to AuthService with the caller's id from the JWT, never the body", async () => {
    authService.changePassword.mockResolvedValue(undefined);
    const result = await controller.changePassword(
      { user: { id: "1", email: "a@b.com" } },
      { currentPassword: "old-pass", newPassword: "new-password" },
    );
    expect(authService.changePassword).toHaveBeenCalledWith("1", {
      currentPassword: "old-pass",
      newPassword: "new-password",
    });
    expect(result).toEqual({ success: true });
  });
});
