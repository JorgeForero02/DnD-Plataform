import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateEntityLinkInput } from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { canView, Viewer } from "../common/visibility";

@Injectable()
export class LinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
  ) {}

  private async viewerFor(userId: string, campaignId: string): Promise<Viewer> {
    const [member, user] = await Promise.all([
      this.membership.getMembership(campaignId, userId),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    return { userId, role: member?.role ?? null, isAdmin: user?.isAdmin ?? false };
  }

  async create(userId: string, fromEntityId: string, input: CreateEntityLinkInput) {
    const from = await this.prisma.entity.findUnique({ where: { id: fromEntityId } });
    if (!from) throw new NotFoundException("Source entity not found");
    await this.membership.requireMember(from.campaignId, userId);
    if (input.toId === fromEntityId) {
      throw new BadRequestException("An entity cannot link to itself");
    }
    const to = await this.prisma.entity.findUnique({ where: { id: input.toId } });
    if (!to || to.campaignId !== from.campaignId) {
      throw new BadRequestException("Target must be an entity in the same campaign");
    }
    return this.prisma.entityLink.create({
      data: { fromId: fromEntityId, toId: input.toId, label: input.label },
    });
  }

  async listFor(userId: string, entityId: string) {
    const from = await this.prisma.entity.findUnique({ where: { id: entityId } });
    if (!from) throw new NotFoundException("Entity not found");
    await this.membership.requireMember(from.campaignId, userId);
    const viewer = await this.viewerFor(userId, from.campaignId);
    const links = await this.prisma.entityLink.findMany({
      where: { fromId: entityId },
      include: { to: { include: { grants: true } } },
    });
    return links
      .filter((l) =>
        canView(viewer, {
          visibility: l.to.visibility,
          createdById: l.to.createdById,
          grantedUserIds: l.to.grants.map((g) => g.userId),
        }),
      )
      .map((l) => ({
        id: l.id,
        label: l.label,
        to: { id: l.to.id, name: l.to.name, type: l.to.type },
      }));
  }

  async remove(userId: string, linkId: string) {
    const link = await this.prisma.entityLink.findUnique({
      where: { id: linkId },
      include: { from: true },
    });
    if (!link) throw new NotFoundException("Link not found");
    await this.membership.requireMember(link.from.campaignId, userId);
    const member = await this.membership.getMembership(link.from.campaignId, userId);
    if (member?.role !== "DM" && link.from.createdById !== userId) {
      throw new ForbiddenException("Only the DM or the creator can remove this link");
    }
    await this.prisma.entityLink.delete({ where: { id: linkId } });
    return { deleted: true };
  }
}
