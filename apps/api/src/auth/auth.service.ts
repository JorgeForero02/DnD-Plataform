import {
  BadRequestException,
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
  ChangePasswordResponse,
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
  async changePassword(
    userId: string,
    input: ChangePasswordInput,
  ): Promise<ChangePasswordResponse> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException("User not found");
    const ok = await argon2.verify(user.passwordHash, input.currentPassword);
    if (!ok) throw new UnauthorizedException("Current password is incorrect");
    const passwordHash = await argon2.hash(input.newPassword);
    const updated = await this.users.updatePasswordHash(user.id, passwordHash);
    // Task 20 — without this, the token the caller was already holding is dead the instant this
    // resolves (jwt.strategy.ts's `iat <= changedAtSeconds` check), and a change-and-immediately
    // re-enter within the same second would reject even a BRAND NEW login token. The tie-goes-
    // to-reject rule (decided in 1.18a) doesn't loosen: instead this token is minted with an
    // explicit `iat`, one second past `passwordChangedAt`, so it reads as issued strictly AFTER
    // the change without needing the wall clock to actually tick over. `jsonwebtoken` honours an
    // `iat` already present in the payload instead of overwriting it (`payload.iat = payload.iat
    // || Math.floor(Date.now() / 1000)` in its sign()) — no `nbf` is set, since that would only
    // add a second failure mode (a clock-skewed verifier rejecting a technically-valid token),
    // never a security property this system already needs.
    const iat = Math.floor(updated.passwordChangedAt!.getTime() / 1000) + 1;
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email, iat });
    return { success: true, token };
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
  async adminResetPassword(callerId: string, input: AdminPasswordResetInput): Promise<void> {
    const user = await this.users.findByEmail(input.email);
    if (!user) throw new NotFoundException("No hay ninguna cuenta con ese correo.");
    // Low #10, revisión final de `ficha/tanda-2-a-5`: reiniciarse la CONTRASEÑA PROPIA por esta
    // puerta daba 200 y mataba la sesión del propio admin en el acto, sin aviso (esta misma
    // llamada sella `passwordChangedAt`, así que su siguiente petición ya da 401) — un efecto
    // secundario que nadie pidió. El formulario que existe para cambiar la propia contraseña es
    // `PATCH /auth/password`, que además exige la actual.
    if (user.id === callerId) {
      throw new BadRequestException(
        "No puedes reiniciarte tu propia contraseña por aquí: usa el formulario de cambio de contraseña.",
      );
    }
    const passwordHash = await argon2.hash(input.temporaryPassword);
    await this.users.updatePasswordHash(user.id, passwordHash);
  }
}
