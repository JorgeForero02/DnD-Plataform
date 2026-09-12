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
import { UsersService } from "../users/users.service";

const TTL_SELLO_MS = 60_000;
/**
 * Tope del caché de sellos (HP-6, 2026-09-12). Antes el `Map` no evictaba nunca: una entrada por
 * usuario que hubiera pedido algo desde el arranque, sin límite. Al alcanzar este tamaño se barren
 * las entradas vencidas antes de escribir la siguiente. Diez mil es cien veces la mesa más grande
 * que este servidor va a ver (D-CF-17: una mesa son cinco jugadores y un DM) y unos cientos de KB de memoria en el peor
 * caso; no es un límite duro —dentro de la ventana de 60 s todas pueden estar vigentes y el mapa
 * crece igual—, es el umbral a partir del cual cada escritura paga un barrido lineal.
 */
const TOPE_SELLOS = 10_000;

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
 * **Un token revocado por cambio de contraseña tampoco cuenta como su dueño** (ficha P3,
 * 2026-09-11). Verificar solo la firma no bastaba: un token robado sigue firmado aunque la
 * víctima ya haya cambiado la contraseña para invalidarlo — `JwtStrategy` lo rechazará con 401,
 * pero si aquí contara contra `user:<sub>`, quien lo robó podría agotar el cubo de la víctima con
 * peticiones que nunca llegan a entrar. Se compara `iat` con `passwordChangedAt`, con la misma
 * regla de empate que `jwt.strategy.ts` (`iat <= sello` es viejo), y el sello se cachea un
 * minuto por usuario para no sumar una consulta a cada petición — la ventana del caché es del
 * mismo tamaño que el cubo.
 *
 * La IP la sigue poniendo Fastify según `TRUST_PROXY` (ver `configure-app.ts`); aquí no se toca.
 */
@Injectable()
export class UserOrIpThrottlerGuard extends ThrottlerGuard {
  // Sello de cambio de contraseña por usuario, en segundos epoch (o `null` si nunca cambió),
  // cacheado un minuto. Es la salida medida en la ficha: una consulta por usuario y minuto en
  // vez de una por petición, y la ventana de un minuto es el mismo tamaño que el cubo.
  // Coste aceptado (D-CF-36): un token robado antes de un cambio de contraseña puede seguir
  // gastando el cubo de su dueño hasta 60 s después del cambio — una ventana de cubo, no más.
  // Con tope: al llegar a `TOPE_SELLOS` entradas se barren las vencidas (`barrerVencidos`).
  private readonly sellos = new Map<string, { sello: number | null; hasta: number }>();

  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
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
    if (!auth?.startsWith("Bearer ")) return super.getTracker(req);

    // Tres salidas y tres motivos distintos (HP-6, 2026-09-12): antes las dos primeras y el fallo
    // de la base compartían un `catch` rotulado «firma inválida», y la salida era la misma pero
    // el motivo escrito era falso. La conducta no cambia; cada `catch` dice ahora lo suyo.
    let sub: string | undefined;
    let iat: number | undefined;
    try {
      ({ sub, iat } = await this.jwt.verifyAsync<{ sub?: string; iat?: number }>(
        auth.slice("Bearer ".length),
      ));
    } catch {
      // Firma inválida o caducado: es una petición anónima a efectos de cuota.
      return super.getTracker(req);
    }
    if (typeof sub !== "string" || !sub) return super.getTracker(req);

    // **Un token revocado por cambio de contraseña no es el usuario.** `JwtStrategy` lo rechazará
    // después con 401; si aquí contara contra `user:<sub>`, quien robó el token podría agotar el
    // cubo de la víctima con peticiones que nunca entran. La regla del empate es la misma que en
    // jwt.strategy.ts: `iat <= sello` es viejo.
    let sello: number | null;
    try {
      sello = await this.selloDeCambio(sub);
    } catch {
      // La base no respondió y no se sabe si el token está revocado. Se cuenta por IP —la misma
      // salida que un token que no verifica— y NO se lanza: la cuota no es quien decide si la
      // petición entra; `JwtStrategy` la juzgará después contra la misma base y fallará solo.
      return super.getTracker(req);
    }
    if (sello === null || iat === undefined || iat > sello) return `user:${sub}`;
    return super.getTracker(req);
  }

  private async selloDeCambio(sub: string): Promise<number | null> {
    const ahora = Date.now();
    const cacheado = this.sellos.get(sub);
    if (cacheado && cacheado.hasta > ahora) return cacheado.sello;
    const user = await this.users.findById(sub);
    const sello = user?.passwordChangedAt
      ? Math.floor(user.passwordChangedAt.getTime() / 1000)
      : null;
    if (this.sellos.size >= TOPE_SELLOS) this.barrerVencidos(ahora);
    this.sellos.set(sub, { sello, hasta: ahora + TTL_SELLO_MS });
    return sello;
  }

  /** Quita del caché los sellos cuya ventana ya pasó. Lineal; solo se paga al tocar el tope. */
  private barrerVencidos(ahora: number): void {
    for (const [sub, { hasta }] of this.sellos) {
      if (hasta <= ahora) this.sellos.delete(sub);
    }
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
