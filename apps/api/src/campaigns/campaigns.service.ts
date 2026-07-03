import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CreateCampaignInput } from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "./membership.service";

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: EventEmitter2,
  ) {}

  async create(userId: string, input: CreateCampaignInput) {
    const campaign = await this.prisma.campaign.create({
      data: {
        name: input.name,
        description: input.description,
        ownerId: userId,
        members: { create: { userId, role: "DM" } },
      },
    });
    this.events.emit("campaign.created", { campaignId: campaign.id, ownerId: userId });
    return campaign;
  }

  listForUser(userId: string) {
    return this.prisma.campaign.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(userId: string, campaignId: string) {
    await this.membership.requireMember(campaignId, userId);
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException("Campaign not found");
    return campaign;
  }

  async listMembers(userId: string, campaignId: string) {
    await this.membership.requireMember(campaignId, userId);
    return this.membership.listMembers(campaignId);
  }
}
