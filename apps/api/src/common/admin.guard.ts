import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";

/**
 * Solo pasa quien tiene `User.isAdmin` — el permiso que se concede a mano en Postgres (D-CF-7) y
 * que hasta el 2026-09-11 solo servía para leerlo todo. Va **detrás** de `JwtAuthGuard`: lee el
 * usuario que `JwtStrategy.validate` cargó de la base en esta misma petición, así que quitarle
 * el permiso a alguien surte efecto en su siguiente llamada, sin esperar a que caduque el token.
 *
 * Es 403 y no 404 a propósito: la ruta no esconde nada que no se sepa (existe un administrador),
 * y quien la llama sin serlo ya está identificado.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: { isAdmin?: boolean } }>();
    if (req.user?.isAdmin !== true) {
      throw new ForbiddenException("Solo un administrador puede hacer esto.");
    }
    return true;
  }
}
