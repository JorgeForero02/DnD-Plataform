import { Body, Controller, Get, HttpCode, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  registerSchema,
  loginSchema,
  updateDisplayNameSchema,
  changePasswordSchema,
  RegisterInput,
  LoginInput,
  UpdateDisplayNameInput,
  ChangePasswordInput,
  AuthUser,
} from "@dnd/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AUTH_RATE_LIMIT, RATE_LIMIT_WINDOW_MS } from "../common/rate-limit.constants";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { UsersService } from "../users/users.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  // Strict per-IP limit (hallazgo 3): brute force against passwords.
  @Throttle({ default: { limit: AUTH_RATE_LIMIT, ttl: RATE_LIMIT_WINDOW_MS } })
  @Post("register")
  register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterInput) {
    return this.auth.register(body);
  }

  @Throttle({ default: { limit: AUTH_RATE_LIMIT, ttl: RATE_LIMIT_WINDOW_MS } })
  @Post("login")
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    return this.auth.login(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@Req() req: { user: AuthUser }): AuthUser {
    // The JWT only carries { sub, email } — displayName is mutable and doesn't belong in the
    // token — but JwtStrategy.validate already loads the row on every request (it must, to
    // invalidate tokens after a password change) and rejects a deleted user with 401. So the
    // user is read from there: a second lookup here was a repeated query with an unreachable
    // 404 behind it (ficha 1.18a, cerrada el 2026-09-10).
    const { id, email, displayName, isAdmin } = req.user;
    return { id, email, displayName, isAdmin };
  }

  // Display name only — email and id are immutable through this endpoint. The user comes
  // from the JWT (never from the body), so a caller can only ever rename themselves.
  @UseGuards(JwtAuthGuard)
  @Patch("me")
  async updateDisplayName(
    @Req() req: { user: AuthUser },
    @Body(new ZodValidationPipe(updateDisplayNameSchema)) body: UpdateDisplayNameInput,
  ): Promise<AuthUser> {
    const user = await this.users.updateDisplayName(req.user.id, body.displayName);
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isAdmin: req.user.isAdmin,
    };
  }

  // Password CHANGE (requires the current password, verified server-side) — not recovery.
  // Forgotten-password recovery is explicitly out of scope: it needs an email service that
  // doesn't exist, and no route for it exists here.
  //
  // Strict per-IP limit (hallazgo 3), same as login/register: this route runs argon2.verify
  // PLUS argon2.hash on every call, so under the loose default limit it would be a cheap
  // CPU/memory exhaustion vector (argon2's default cost is 64 MiB per call) and a
  // current-password guessing oracle for anyone holding a stolen token.
  @Throttle({ default: { limit: AUTH_RATE_LIMIT, ttl: RATE_LIMIT_WINDOW_MS } })
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Patch("password")
  async changePassword(
    @Req() req: { user: { id: string; email: string } },
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
  ): Promise<{ success: true }> {
    await this.auth.changePassword(req.user.id, body);
    return { success: true };
  }
}
