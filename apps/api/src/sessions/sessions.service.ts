import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateSessionInput } from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { canView, Viewer } from "../common/visibility";

type UpdateSessionInput = Partial<CreateSessionInput>;

@Injectable()
export class SessionsService {
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

  private canSee(viewer: Viewer, visibility: string): boolean {
    return canView(viewer, {
      visibility: visibility as any,
      createdById: "",
      grantedUserIds: [],
    });
  }

  async create(userId: string, campaignId: string, input: CreateSessionInput) {
    await this.membership.requireDM(campaignId, userId);
    return this.prisma.session.create({
      data: {
        campaignId,
        title: input.title,
        scheduledAt: input.scheduledAt,
        notes: input.notes === undefined ? undefined : (input.notes as object),
        visibility: input.visibility,
      },
    });
  }

  async list(userId: string, campaignId: string) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await this.viewerFor(userId, campaignId);
    const sessions = await this.prisma.session.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
    });
    return sessions.filter((s) => this.canSee(viewer, s.visibility));
  }

  async get(userId: string, campaignId: string, sessionId: string) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await this.viewerFor(userId, campaignId);
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, campaignId },
    });
    if (!session || !this.canSee(viewer, session.visibility)) {
      throw new NotFoundException("Session not found");
    }
    return session;
  }

  async update(userId: string, campaignId: string, sessionId: string, input: UpdateSessionInput) {
    await this.membership.requireDM(campaignId, userId);
    const existing = await this.prisma.session.findFirst({ where: { id: sessionId, campaignId } });
    if (!existing) throw new NotFoundException("Session not found");
    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.scheduledAt !== undefined) data.scheduledAt = input.scheduledAt;
    if (input.notes !== undefined) data.notes = input.notes as object;
    if (input.visibility !== undefined) data.visibility = input.visibility;
    return this.prisma.session.update({ where: { id: sessionId }, data });
  }

  async remove(userId: string, campaignId: string, sessionId: string) {
    await this.membership.requireDM(campaignId, userId);
    const existing = await this.prisma.session.findFirst({ where: { id: sessionId, campaignId } });
    if (!existing) throw new NotFoundException("Session not found");
    await this.prisma.session.delete({ where: { id: sessionId } });
    return { deleted: true };
  }
}
