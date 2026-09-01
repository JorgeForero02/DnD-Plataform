import { Body, Controller, Get, NotFoundException, Post, Req, UseGuards } from "@nestjs/common";
import { registerSchema, loginSchema, RegisterInput, LoginInput } from "@dnd/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { UsersService } from "../users/users.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Post("register")
  register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterInput) {
    return this.auth.register(body);
  }

  @Post("login")
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    return this.auth.login(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@Req() req: { user: { id: string; email: string } }) {
    // The JWT only carries { sub, email } (jwt.strategy.ts) — displayName is mutable and
    // doesn't belong in the token — so it's looked up fresh on every call instead.
    const user = await this.users.findById(req.user.id);
    if (!user) throw new NotFoundException("User not found");
    return { id: user.id, email: user.email, displayName: user.displayName };
  }
}
