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

  // Reseño 2026-09-02 (audit C4): the dashboard listed campaigns as bare name + description,
  // so it could not say a single useful thing about any of them. This adds the two facts that
  // are safe to add — the viewer's OWN role, and how many people are at the table — plus the
  // campaign's own timestamps, which the client already had a right to.
  //
  // What it deliberately does NOT add is a count of entities, sessions or characters, and the
  // reason is the whole point of this product: those objects carry five visibility levels, and
  // "12 lugares" told to a player who may only see 4 of them leaks the existence of the other
  // 8. Counting them correctly means applying the visibility matrix, and
  // common/visibility.ts's canView is its single owner — a Prisma where-clause that
  // re-derives it here would be exactly the duplication CLAUDE.md forbids. A per-viewer count
  // is its own task, built on canView, not a side effect of a dashboard tidy-up.
  // Recorded in docs/06-pendientes.md.
  listForUser(userId: string) {
    return this.prisma.campaign.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: "desc" },
      include: {
        members: { where: { userId }, select: { role: true } },
        _count: { select: { members: true } },
      },
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
