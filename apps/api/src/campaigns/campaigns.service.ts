import { Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CreateCampaignInput, UpdateCampaignInput } from "@dnd/shared";
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

  async update(userId: string, campaignId: string, input: UpdateCampaignInput) {
    await this.membership.requireDM(campaignId, userId);
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    const campaign = await this.prisma.campaign.update({ where: { id: campaignId }, data });
    this.events.emit("campaign.updated", { campaignId, actorId: userId });
    return campaign;
  }

  async remove(userId: string, campaignId: string): Promise<{ deleted: true }> {
    await this.membership.requireDM(campaignId, userId);
    await this.prisma.campaign.delete({ where: { id: campaignId } });
    this.events.emit("campaign.deleted", { campaignId, actorId: userId });
    return { deleted: true };
  }

  async removeMember(userId: string, campaignId: string, targetUserId: string) {
    const result = await this.membership.removeMember(campaignId, userId, targetUserId);
    this.events.emit("campaign.member.removed", { campaignId, actorId: userId, targetUserId });
    return result;
  }
}
