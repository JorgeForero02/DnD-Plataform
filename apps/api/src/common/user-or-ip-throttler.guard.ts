import { Injectable, type ExecutionContext } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

/**
 * El cubo del límite de peticiones es **por usuario cuando hay sesión iniciada** y por IP cuando
 * no la hay (ficha R1, decisión D-CF-17, 2026-09-10).
 *
 * **Por qué.** Una mesa juega desde la casa de una persona o por una VPN compartida: cinco
 * jugadores son UNA IP, y con el cubo por IP el sondeo de uno gastaba el presupuesto de todos —
 * un combate largo con la línea de tiempo abierta rozaba los 100 por minuto sin que nadie hiciera
 * nada raro. Con el usuario como clave, cada uno tiene su cubo, y **el límite por IP se queda
 * exactamente donde protege**: login y registro no llevan token, así que siguen contando por IP
 * con su `@Throttle` estrecho. Aceptar una invitación (`POST /invites/:token/accept`) SÍ exige
 * sesión —`JwtAuthGuard` de clase—, así que su `@Throttle` estrecho cuenta por usuario: un
 * atacante con N cuentas tiene N cubos contra tokens de invitación, que son 24 bytes aleatorios,
 * y eso no cambia nada en la práctica.
 *
 * **El cubo de usuario solo se usa en rutas que llevan `JwtAuthGuard`** (revisión final de
 * `ficha/tanda-2-a-5`, High #1, 2026-09-11). Antes de esto, cualquier petición con un Bearer que
 * verificara —aunque la propia ruta no exigiera sesión, como `POST /auth/login`— contaba contra
 * `user:<sub>` en vez de la IP: un atacante con N cuentas propias tenía N cubos independientes de
 * `AUTH_RATE_LIMIT`/min contra el login de su víctima, todos desde la misma IP, multiplicando el
 * límite que hallazgo 3 quiso dejar estrecho. Ahora se mira si el *handler* (o su controlador)
 * tiene `JwtAuthGuard` en `@UseGuards` (vía `GUARDS_METADATA`, no una instancia): si no lo tiene,
 * el Bearer se ignora del todo para el cubo y se usa siempre `super.getTracker(req)` — el cliente
 * honesto en login/registro nunca manda token de todos modos, así que esto no les cambia nada;
 * solo le cierra la puerta a quien sí lo manda a propósito.
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

  // El tipo de la base solo declara `(req)`, pero @nestjs/throttler la llama en runtime como
  // `getTracker(req, context)` (ver ThrottlerGuard.handleRequest) — `context` va opcional para
  // que el override siga siendo asignable al tipo de la base.
  protected async getTracker(
    req: Record<string, unknown>,
    context?: ExecutionContext,
  ): Promise<string> {
    if (!context || !this.rutaLlevaJwtAuthGuard(context)) return super.getTracker(req);

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

  // `@UseGuards(JwtAuthGuard)` deja la CLASE del guard (no una instancia) en GUARDS_METADATA,
  // tanto en el handler como en el controlador — se miran los dos porque el decorador puede
  // ir en cualquiera de los dos niveles (p. ej. AuthController.login no lo lleva, pero
  // AuthController.changePassword sí, ambos en el mismo controlador).
  private rutaLlevaJwtAuthGuard(context: ExecutionContext): boolean {
    const enHandler: unknown[] = Reflect.getMetadata(GUARDS_METADATA, context.getHandler()) ?? [];
    const enClase: unknown[] = Reflect.getMetadata(GUARDS_METADATA, context.getClass()) ?? [];
    return [...enHandler, ...enClase].includes(JwtAuthGuard);
  }
}
