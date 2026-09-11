import { Body, Controller, HttpCode, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { adminPasswordResetSchema, type AdminPasswordResetInput } from "@dnd/shared";
import { AdminGuard } from "../common/admin.guard";
import { AUTH_RATE_LIMIT, RATE_LIMIT_WINDOW_MS } from "../common/rate-limit.constants";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

/**
 * Lo que solo hace un administrador. Hoy, una cosa: **reiniciar la contraseña de otra cuenta**
 * (ficha D8, D-CF-18). No hay recuperación por correo ni la habrá mientras la mesa sea la del
 * autor; el afectado entra con la temporal y la cambia en su cuenta.
 */
@Controller("admin")
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly auth: AuthService) {}

  // El mismo límite estrecho que `PATCH /auth/password`, por el mismo motivo: corre `argon2.hash`
  // (64 MiB por llamada) y escribe una credencial.
  @Throttle({ default: { limit: AUTH_RATE_LIMIT, ttl: RATE_LIMIT_WINDOW_MS } })
  @HttpCode(200)
  @Post("password-resets")
  async resetPassword(
    @Req() req: { user: { id: string } },
    @Body(new ZodValidationPipe(adminPasswordResetSchema)) body: AdminPasswordResetInput,
  ): Promise<{ success: true }> {
    await this.auth.adminResetPassword(req.user.id, body);
    return { success: true };
  }
}
