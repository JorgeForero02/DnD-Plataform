import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { registerSchema, loginSchema } from "@dnd/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  register(@Body(new ZodValidationPipe(registerSchema)) body: any) {
    return this.auth.register(body);
  }

  @Post("login")
  login(@Body(new ZodValidationPipe(loginSchema)) body: any) {
    return this.auth.login(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@Req() req: { user: { id: string; email: string } }) {
    return req.user;
  }
}
