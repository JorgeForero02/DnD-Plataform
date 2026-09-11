import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  AuthResponse,
  type AdminPasswordResetInput,
} from "@dnd/shared";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new ConflictException("Email already registered");
    const passwordHash = await argon2.hash(input.password);
    const user = await this.users.create(input.email, passwordHash, input.displayName);
    return this.buildResponse(user);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.users.findByEmail(input.email);
    if (!user) throw new UnauthorizedException("Invalid credentials");
    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    return this.buildResponse(user);
  }

  // Password change (not recovery — the caller must already hold the current password).
  // The user id comes from the JWT (controller), never from the request body: a user can
  // only ever change their own password.
  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException("User not found");
    const ok = await argon2.verify(user.passwordHash, input.currentPassword);
    if (!ok) throw new UnauthorizedException("Current password is incorrect");
    const passwordHash = await argon2.hash(input.newPassword);
    await this.users.updatePasswordHash(user.id, passwordHash);
  }

  private async buildResponse(user: {
    id: string;
    email: string;
    displayName: string;
    isAdmin: boolean;
  }): Promise<AuthResponse> {
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
      },
    };
  }

  /**
   * Reinicio por administrador (ficha D8, D-CF-18): pone una contraseña temporal a otra cuenta.
   * Reutiliza `updatePasswordHash`, que sella `passwordChangedAt` y con ello caduca todos los
   * tokens anteriores de esa persona — igual que si la hubiera cambiado ella. Quién puede llamar
   * lo decide `AdminGuard`, no este método.
   */
  async adminResetPassword(input: AdminPasswordResetInput): Promise<void> {
    const user = await this.users.findByEmail(input.email);
    if (!user) throw new NotFoundException("No hay ninguna cuenta con ese correo.");
    const passwordHash = await argon2.hash(input.temporaryPassword);
    await this.users.updatePasswordHash(user.id, passwordHash);
  }
}
