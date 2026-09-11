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

  it("me() returns the user the strategy already loaded — no second lookup, no dead 404", async () => {
    // Ficha 1.18a «el NotFoundException de GET /auth/me quedó inalcanzable»: JwtStrategy ya
    // carga la fila entera en cada petición y rechaza con 401 al usuario borrado, así que
    // volver a buscarlo aquí era una consulta repetida con una rama muerta detrás.
    const result = await controller.me({
      user: { id: "1", email: "a@b.com", displayName: "Gandalf", isAdmin: false },
    });
    expect(usersService.findById).not.toHaveBeenCalled();
    expect(result).toEqual({ id: "1", email: "a@b.com", displayName: "Gandalf", isAdmin: false });
  });

  it("updateDisplayName() renames the caller taken from the JWT, not the body", async () => {
    usersService.updateDisplayName.mockResolvedValue({
      id: "1",
      email: "a@b.com",
      displayName: "New Name",
      passwordHash: "should-not-leak",
    });
    const result = await controller.updateDisplayName(
      { user: { id: "1", email: "a@b.com", displayName: "Old", isAdmin: false } },
      { displayName: "New Name" },
    );
    expect(usersService.updateDisplayName).toHaveBeenCalledWith("1", "New Name");
    expect(result).toEqual({ id: "1", email: "a@b.com", displayName: "New Name", isAdmin: false });
  });

  it("changePassword() delegates to AuthService with the caller's id from the JWT, never the body, and passes its fresh token through", async () => {
    authService.changePassword.mockResolvedValue({ success: true, token: "fresh-token" });
    const result = await controller.changePassword(
      { user: { id: "1", email: "a@b.com" } },
      { currentPassword: "old-pass", newPassword: "new-password" },
    );
    expect(authService.changePassword).toHaveBeenCalledWith("1", {
      currentPassword: "old-pass",
      newPassword: "new-password",
    });
    expect(result).toEqual({ success: true, token: "fresh-token" });
  });
});
