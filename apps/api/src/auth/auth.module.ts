import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { UsersModule } from "../users/users.module";
import { requireJwtSecret } from "../common/jwt-secret";
import { AuthService } from "./auth.service";
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
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
