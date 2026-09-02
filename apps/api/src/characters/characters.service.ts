import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateCharacterInput, UpdateCharacterInput, Visibility } from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { canView, Viewer } from "../common/visibility";

@Injectable()
export class CharactersService {
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

  private canSee(viewer: Viewer, ownerId: string, visibility: Visibility): boolean {
    return canView(viewer, { visibility, createdById: ownerId, grantedUserIds: [] });
  }

  async create(userId: string, campaignId: string, input: CreateCharacterInput) {
    await this.membership.requireMember(campaignId, userId);
    return this.prisma.character.create({
      data: {
        campaignId,
        ownerId: userId,
        name: input.name,
        race: input.race,
        class: input.class,
        level: input.level,
        bio: input.bio,
        visibility: input.visibility,
      },
    });
  }

  async list(userId: string, campaignId: string) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await this.viewerFor(userId, campaignId);
    const characters = await this.prisma.character.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
    });
    return characters.filter((c) => this.canSee(viewer, c.ownerId, c.visibility));
  }

  async get(userId: string, campaignId: string, characterId: string) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await this.viewerFor(userId, campaignId);
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, campaignId },
    });
    if (!character || !this.canSee(viewer, character.ownerId, character.visibility)) {
      throw new NotFoundException("Character not found");
    }
    return character;
  }

  /**
   * Pública a propósito: la comparte `CharacterSheetService` (2A.6/2A.7), que necesita el mismo
   * "dueño o DM" para la hoja y los PG en vez de reimplementarlo.
   */
  async requireEditable(userId: string, campaignId: string, characterId: string) {
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, campaignId },
    });
    if (!character) throw new NotFoundException("Character not found");
    const member = await this.membership.getMembership(campaignId, userId);
    if (member?.role !== "DM" && character.ownerId !== userId) {
      throw new ForbiddenException("Only the DM or the owner can modify this");
    }
    return character;
  }

  async update(
    userId: string,
    campaignId: string,
    characterId: string,
    input: UpdateCharacterInput,
  ) {
    await this.membership.requireMember(campaignId, userId);
    await this.requireEditable(userId, campaignId, characterId);
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.race !== undefined) data.race = input.race;
    if (input.class !== undefined) data.class = input.class;
    if (input.level !== undefined) data.level = input.level;
    if (input.bio !== undefined) data.bio = input.bio;
    if (input.visibility !== undefined) data.visibility = input.visibility;
    return this.prisma.character.update({ where: { id: characterId }, data });
  }

  async remove(userId: string, campaignId: string, characterId: string) {
    await this.membership.requireMember(campaignId, userId);
    await this.requireEditable(userId, campaignId, characterId);
    await this.prisma.character.delete({ where: { id: characterId } });
    return { deleted: true };
  }
}
