import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
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
    await this.prisma.$transaction(async (tx) => {
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
