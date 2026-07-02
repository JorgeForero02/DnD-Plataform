import { BadRequestException, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: EventEmitter2,
  ) {}

  async create(dmUserId: string, campaignId: string) {
    await this.membership.requireDM(campaignId, dmUserId);
    return this.prisma.invite.create({
      data: { campaignId, token: randomBytes(24).toString("hex") },
    });
  }

  async accept(token: string, userId: string) {
    const invite = await this.prisma.invite.findUnique({ where: { token } });
    if (!invite || invite.usedAt) {
      throw new BadRequestException("Invalid or already-used invite");
    }
    const member = await this.prisma.campaignMember.upsert({
      where: { campaignId_userId: { campaignId: invite.campaignId, userId } },
      create: { campaignId: invite.campaignId, userId, role: invite.role },
      update: {},
    });
    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });
    this.events.emit("campaign.member_joined", { campaignId: invite.campaignId, userId });
    return { campaignId: invite.campaignId, role: member.role };
  }
}
