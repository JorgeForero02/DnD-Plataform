import { Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CreateCampaignInput, UpdateCampaignInput } from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "./membership.service";
import { canView, Viewer } from "../common/visibility";

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
  /**
   * **«Dónde se quedó»** (D-OP-17, 2026-09-05). Cada campaña trae **la crónica de su última sesión
   * cerrada**, que es lo que convierte esta pantalla en «partidas guardadas» y no en una lista de
   * proyectos.
   *
   * **Va aquí y no en una petición por campaña**: pedirla suelta serían N peticiones en la pantalla
   * de entrada, que es exactamente donde no se pueden pagar.
   *
   * **Se filtra por `recapVisibility`, que es una columna desde el plan 02** — y por eso esto es una
   * consulta y no leer un `Json` y filtrar en memoria. La crónica tiene visibilidad **propia**: una
   * `DM_ONLY` de una sesión `PLAYERS` no viaja, y una `PLAYERS` de una sesión `DM_ONLY` **sí**,
   * porque publicar la crónica de una sesión de preparación es legítimo y es la mitad de para qué
   * sirve.
   *
   * **La última cerrada, y si esa no se ve el campo NO viaja.** No se busca una anterior: enseñar
   * una crónica más vieja bajo el rótulo «dónde se quedó» diría que la partida se quedó donde no se
   * quedó.
   */
  async listForUser(userId: string) {
    const [campanas, user] = await Promise.all([
      this.prisma.campaign.findMany({
        where: { members: { some: { userId } } },
        orderBy: { createdAt: "desc" },
        include: {
          members: { where: { userId }, select: { role: true } },
          _count: { select: { members: true } },
          sessions: {
            where: { status: "CLOSED" },
            orderBy: [{ endedAt: "desc" }, { createdAt: "desc" }],
            take: 1,
            select: { title: true, endedAt: true, recap: true, recapVisibility: true },
          },
        },
      }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);

    return campanas.map((campana) => {
      const { sessions, ...resto } = campana;
      const ultima = sessions[0];
      // El papel del espectador es **por campaña**: se puede ser DM en una mesa y jugador en otra,
      // y `canView` necesita el de esta.
      const viewer: Viewer = {
        userId,
        role: campana.members[0]?.role ?? null,
        isAdmin: user?.isAdmin ?? false,
      };
      // `createdById: ""` y `grantedUserIds: []` valen aquí por lo mismo que en `SessionsService`:
      // una `Session` no tiene ni creador ni concesiones, así que `OWNER_DM` y `SPECIFIC_PLAYERS`
      // sobre una crónica no seleccionan a nadie.
      const seVe =
        ultima?.recap != null &&
        canView(viewer, {
          visibility: ultima.recapVisibility,
          createdById: "",
          grantedUserIds: [],
        });
      if (!seVe) return resto;
      return {
        ...resto,
        lastRecap: {
          text: ultima.recap as string,
          sessionTitle: ultima.title,
          endedAt: ultima.endedAt,
        },
      };
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
