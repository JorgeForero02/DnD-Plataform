import { ForbiddenException, Injectable } from "@nestjs/common";
import { CampaignMember } from "@prisma/client";
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
}
