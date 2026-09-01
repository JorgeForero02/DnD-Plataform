import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";

describe("AuthController", () => {
  let controller: AuthController;
  const authService = { register: jest.fn(), login: jest.fn() };
  const usersService = { findById: jest.fn() };

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
});
