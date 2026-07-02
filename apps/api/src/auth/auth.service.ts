import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { RegisterInput, LoginInput, AuthResponse } from "@dnd/shared";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new ConflictException("Email already registered");
    const passwordHash = await argon2.hash(input.password);
    const user = await this.users.create(
      input.email,
      passwordHash,
      input.displayName,
    );
    return this.buildResponse(user);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.users.findByEmail(input.email);
    if (!user) throw new UnauthorizedException("Invalid credentials");
    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    return this.buildResponse(user);
  }

  private async buildResponse(user: {
    id: string;
    email: string;
    displayName: string;
  }): Promise<AuthResponse> {
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return {
      token,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    };
  }
}
