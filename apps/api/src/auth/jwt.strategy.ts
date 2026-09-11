import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { requireJwtSecret } from "../common/jwt-secret";
import { UsersService } from "../users/users.service";

export interface JwtPayload {
  sub: string;
  email: string;
  // Standard JWT claims — set by @nestjs/jwt on sign, read here to invalidate tokens issued
  // before a password change (see the passwordChangedAt check below).
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly users: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    // A DB lookup on every authenticated request (new cost, added deliberately): the token
    // itself carries no signal of a password change that happened after it was issued, so
    // the only way to invalidate it is to check the source of truth on each use.
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException();

    if (user.passwordChangedAt && payload.iat !== undefined) {
      // `iat` is JWT-standard second-granularity (seconds since epoch); passwordChangedAt
      // carries millisecond precision from `new Date()` (users.service.ts). Rounded DOWN with
      // Math.floor and compared with `<=`, not `<`: a token minted in the exact same
      // wall-clock second as the password change cannot be proven older or newer than the
      // change from `iat` alone, and the safer failure mode — the whole point of invalidating
      // tokens after a password change someone made because it was stolen — is to treat that
      // tie as stale and reject it, not to risk letting a compromised token slip through.
      const changedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (payload.iat <= changedAtSeconds) {
        throw new UnauthorizedException("Token was issued before the last password change");
      }
    }

    // El nombre visible va con el usuario de la petición: se lee fresco aquí en cada llamada
    // (nunca del token, que es inmutable), y así `GET /auth/me` no vuelve a preguntar. El hash
    // se queda fuera, como siempre.
    return { id: user.id, email: user.email, displayName: user.displayName, isAdmin: user.isAdmin };
  }
}
