import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateCommentInput } from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { canView, Viewer } from "../common/visibility";

@Injectable()
export class CommentsService {
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

  private async requireViewableEntity(userId: string, entityId: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      include: { grants: true },
    });
    if (!entity) throw new NotFoundException("Entity not found");
    await this.membership.requireMember(entity.campaignId, userId);
    const viewer = await this.viewerFor(userId, entity.campaignId);
    if (
      !canView(viewer, {
        visibility: entity.visibility,
        createdById: entity.createdById,
        grantedUserIds: entity.grants.map((g) => g.userId),
      })
    ) {
      throw new ForbiddenException("You cannot access this entity");
    }
    return entity;
  }

  async create(userId: string, entityId: string, input: CreateCommentInput) {
    await this.requireViewableEntity(userId, entityId);
    return this.prisma.comment.create({
      data: { entityId, authorId: userId, body: input.body },
    });
  }

  async listFor(userId: string, entityId: string) {
    await this.requireViewableEntity(userId, entityId);
    return this.prisma.comment.findMany({
      where: { entityId },
      orderBy: { createdAt: "asc" },
    });
  }

  async remove(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { entity: true },
    });
    if (!comment) throw new NotFoundException("Comment not found");
    await this.membership.requireMember(comment.entity.campaignId, userId);
    const member = await this.membership.getMembership(comment.entity.campaignId, userId);
    if (member?.role !== "DM" && comment.authorId !== userId) {
      throw new ForbiddenException("Only the author or the DM can delete this comment");
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { deleted: true };
  }
}
