import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { User } from "@prisma/client";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(email: string, passwordHash: string, displayName: string): Promise<User> {
    return this.prisma.user.create({
      data: { email, passwordHash, displayName },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // select: the hash never needs to leave this service for a display-name change — returning
  // the full row and relying on the controller to pick fields is how a hash leaks by accident.
  updateDisplayName(
    id: string,
    displayName: string,
  ): Promise<{ id: string; email: string; displayName: string }> {
    return this.prisma.user.update({
      where: { id },
      data: { displayName },
      select: { id: true, email: true, displayName: true },
    });
  }

  // Also stamps passwordChangedAt — JwtStrategy.validate uses it to invalidate every token
  // issued before this change (see the field's comment in schema.prisma).
  updatePasswordHash(id: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
  }
}
