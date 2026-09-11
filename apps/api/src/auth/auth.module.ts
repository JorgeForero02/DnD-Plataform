import { Module } from "@nestjs/common";
import { JwtModule, JwtSignOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { UsersModule } from "../users/users.module";
import { requireJwtSecret } from "../common/jwt-secret";
import { AuthService } from "./auth.service";
import { AdminController } from "./admin.controller";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // registerAsync (not register): the @Module decorator's imports array is evaluated at
    // import time, before ConfigModule.forRoot() (app.module.ts) has loaded apps/api/.env.
    // Deferring the read of JWT_SECRET to instantiation keeps the signing secret in sync
    // with the verifying secret in jwt.strategy.ts, which reads it in its constructor.
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: requireJwtSecret(),
        // @nestjs/jwt@11's SignOptions (from jsonwebtoken) types expiresIn as a template-literal
        // union ("7d", "10h", ...) or a number of seconds, not a plain string — an env var reads
        // as `string` no matter its actual value, so the cast is required, not a type-safety hole.
        signOptions: {
          expiresIn: (process.env.JWT_EXPIRES_IN ?? "7d") as JwtSignOptions["expiresIn"],
        },
      }),
    }),
  ],
  controllers: [AuthController, AdminController],
  providers: [AuthService, JwtStrategy],
  // `JwtModule` sale para que el guard global del límite de peticiones pueda verificar el token
  // y clavar el cubo al usuario (ficha R1): el mismo secreto que firma es el que verifica.
  exports: [JwtModule],
})
export class AuthModule {}
