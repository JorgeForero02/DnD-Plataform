import { Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from "@nestjs/throttler";

/**
 * El cubo del límite de peticiones es **por usuario cuando hay sesión iniciada** y por IP cuando
 * no la hay (ficha R1, decisión D-CF-17, 2026-09-10).
 *
 * **Por qué.** Una mesa juega desde la casa de una persona o por una VPN compartida: cinco
 * jugadores son UNA IP, y con el cubo por IP el sondeo de uno gastaba el presupuesto de todos —
 * un combate largo con la línea de tiempo abierta rozaba los 100 por minuto sin que nadie hiciera
 * nada raro. Con el usuario como clave, cada uno tiene su cubo, y **el límite por IP se queda
 * exactamente donde protege**: login, registro y aceptar invitación no llevan token, así que
 * siguen contando por IP con su `@Throttle` estrecho.
 *
 * **El token se VERIFICA, no se decodifica.** Bastaría con leer el `sub` sin comprobar la firma
 * para que un cliente inventara un usuario distinto por petición y se saltara el límite en toda
 * ruta autenticada; con la firma comprobada, un token falso cuenta como su IP. La verificación es
 * un HMAC, más barato que la consulta que `JwtStrategy` hará después de todos modos.
 *
 * La IP la sigue poniendo Fastify según `TRUST_PROXY` (ver `configure-app.ts`); aquí no se toca.
 */
@Injectable()
export class UserOrIpThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwt: JwtService,
  ) {
    super(options, storage, reflector);
  }

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const cabecera = req["headers"] as Record<string, string | undefined> | undefined;
    const auth = cabecera?.["authorization"];
    if (auth?.startsWith("Bearer ")) {
      try {
        const { sub } = await this.jwt.verifyAsync<{ sub?: string }>(auth.slice("Bearer ".length));
        if (typeof sub === "string" && sub) return `user:${sub}`;
      } catch {
        // Firma inválida o caducado: es una petición anónima a efectos de cuota.
      }
    }
    return super.getTracker(req);
  }
}
