import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CampaignMember, Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  getMembership(campaignId: string, userId: string): Promise<CampaignMember | null> {
    return this.prisma.campaignMember.findUnique({
      where: { campaignId_userId: { campaignId, userId } },
    });
  }

  async requireMember(campaignId: string, userId: string): Promise<CampaignMember> {
    const member = await this.getMembership(campaignId, userId);
    if (!member) throw new ForbiddenException("Not a member of this campaign");
    return member;
  }

  async requireDM(campaignId: string, userId: string): Promise<CampaignMember> {
    const member = await this.requireMember(campaignId, userId);
    if (member.role !== "DM") throw new ForbiddenException("DM role required");
    return member;
  }

  async listMembers(
    campaignId: string,
  ): Promise<{ userId: string; displayName: string; role: Role }[]> {
    const members = await this.prisma.campaignMember.findMany({
      where: { campaignId },
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: members.map((m) => m.userId) } },
      select: { id: true, displayName: true },
    });
    const nameById = new Map(users.map((u) => [u.id, u.displayName]));
    return members.map((m) => ({
      userId: m.userId,
      displayName: nameById.get(m.userId) ?? "",
      role: m.role,
    }));
  }

  // Covers both kicking a member out (targetUserId !== actorId) and leaving on your own
  // (targetUserId === actorId): the API has a single route for both, see campaigns.controller.ts.
  /**
   * **Cambiar el papel de un miembro** (plan 11, ficha D2).
   *
   * Hasta hoy el rol era **inmutable de por vida**: para ascender a alguien había que expulsarlo y
   * reinvitarlo, y eso **pierde su vínculo con sus personajes** —`removeMember` borra la
   * membresía—, así que no es equivalente ni de lejos.
   *
   * **La mesa no puede quedarse sin ningún DM**, y eso es un **409**, no un 403: no es que no
   * tengas permiso, es que el resultado dejaría la campaña huérfana y nadie podría recuperarla.
   * Se comprueba contando los DM que quedarían, **no** mirando si eres el creador: el creador
   * puede haber ascendido a otro y querer bajarse, y eso es legítimo.
   *
   * **Nadie se asciende a sí mismo**: lo impide exigir DM para llamar aquí.
   */
  async changeRole(
    campaignId: string,
    actorId: string,
    targetUserId: string,
    role: Role,
  ): Promise<{ userId: string; from: Role; to: Role }> {
    await this.requireDM(campaignId, actorId);
    const target = await this.getMembership(campaignId, targetUserId);
    if (!target) throw new NotFoundException("Member not found");

    const from = target.role as Role;
    // Idempotente y sin ruido: repetir el gesto no escribe un suceso que no cuenta nada.
    if (from === role) return { userId: targetUserId, from, to: role };

    if (from === "DM" && role !== "DM") {
      // **Se cuenta lo que quedaría, no quién eres.** Da igual que sea el creador o que se lo
      // haga a otro: lo que no puede pasar es que no quede ninguno.
      const cuantosDm = await this.prisma.campaignMember.count({
        where: { campaignId, role: "DM" },
      });
      if (cuantosDm <= 1) {
        throw new ConflictException({
          code: "LAST_DM",
          message: "Esta mesa se quedaría sin ningún DM. Asciende a alguien antes de bajar a este.",
        });
      }
    }

    const actualizado = await this.prisma.campaignMember.update({
      where: { campaignId_userId: { campaignId, userId: targetUserId } },
      data: { role },
    });
    return { userId: targetUserId, from, to: actualizado.role as Role };
  }

  async removeMember(
    campaignId: string,
    actorId: string,
    targetUserId: string,
  ): Promise<{ removed: true }> {
    await this.requireMember(campaignId, actorId);
    const target = await this.getMembership(campaignId, targetUserId);
    if (!target) throw new NotFoundException("Member not found");

    if (targetUserId === actorId) {
      if (target.role === "DM") {
        throw new ForbiddenException("The DM cannot leave their own campaign; delete it instead");
      }
    } else {
      await this.requireDM(campaignId, actorId);
      if (target.role === "DM") {
        throw new ForbiddenException("A DM cannot be removed");
      }
    }

    // The membership goes; deliberately NOT deleted: characters this person owns and
    // entities they created stay in the campaign (see docs/05-datos.md).
    await this.prisma.transaction(async (tx) => {
      await tx.entityVisibilityGrant.deleteMany({
        where: { userId: targetUserId, entity: { campaignId } },
      });
      await tx.campaignMember.delete({
        where: { campaignId_userId: { campaignId, userId: targetUserId } },
      });
    });

    return { removed: true };
  }
}
