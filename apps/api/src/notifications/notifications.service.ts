import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  type ListNotificationsInput,
  type MarkReadInput,
  type NotificationType,
} from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { canView, type Viewer } from "../common/visibility";

// Tarea 2A.14 — la bandeja de notificaciones.
//
// `notify` es interno: lo llaman otros servicios (o los oyentes de este mismo fichero) cuando
// pasa algo que alguien más debe saber. **El payload lleva datos, nunca la frase** — la
// compone la pantalla, igual que `labelKey` en el motor de reglas.

interface NotifyInput {
  type: NotificationType;
  campaignId?: string;
  payload: Record<string, unknown>;
  subjectType?: string;
  subjectId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
  ) {}

  /** Escribe una notificación para `userId`. No comprueba nada: quien llama ya decidió que
   * esa persona debe enterarse. */
  async notify(userId: string, input: NotifyInput) {
    return this.prisma.notification.create({
      data: {
        userId,
        campaignId: input.campaignId ?? null,
        type: input.type,
        payload: input.payload as object,
        subjectType: input.subjectType ?? null,
        subjectId: input.subjectId ?? null,
      },
    });
  }

  /** Las del usuario autenticado, más recientes primero. Un usuario NUNCA ve las de otro:
   * `userId` va en el `where` de la consulta, no en una comprobación posterior. */
  async list(userId: string, query: ListNotificationsInput) {
    const where = {
      userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };
    const rows = await this.prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
      take: query.limit,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const unreadCount = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return {
      notifications: rows,
      nextCursor: rows.length === query.limit ? rows[rows.length - 1].id : null,
      unreadCount,
    };
  }

  /** Sin `ids`, marca todas las suyas; con `ids`, solo esas — y solo si son suyas: `userId`
   * está en el `where`, así que un identificador ajeno en la lista simplemente no coincide con
   * ninguna fila y no falla ni avisa a nadie. */
  async markRead(userId: string, input: MarkReadInput) {
    const where = {
      userId,
      ...(input.ids && input.ids.length > 0 ? { id: { in: input.ids } } : {}),
    };
    const result = await this.prisma.notification.updateMany({
      where,
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  // --- Oyentes de eventos de dominio que ya se emiten y nadie escuchaba ---
  //
  // De los seis `emit()` que hay hoy en `apps/api/src` (grep de la tarea), solo estos dos
  // llevan datos suficientes para avisar sin inventar nada:
  //
  // - `campaign.member_joined` ({campaignId, userId}) → CAMPAIGN_MEMBER_JOINED al dueño.
  // - `entity.created` ({campaignId, entityId, type}) → ENTITY_CREATED a quien pueda verla.
  //
  // Los otros cuatro (`campaign.created`, `campaign.updated`, `campaign.deleted`,
  // `campaign.member.removed`) no tienen un `NotificationType` correspondiente en
  // `@dnd/shared` — ese fichero está fuera de esta frontera de tarea, así que se quedan sin
  // oyente y se reportan como tales, no se les inventa un tipo.

  @OnEvent("campaign.member_joined")
  async onMemberJoined({ campaignId, userId }: { campaignId: string; userId: string }) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { ownerId: true },
    });
    if (!campaign || campaign.ownerId === userId) return; // el propio dueño no se avisa a sí mismo
    await this.notify(campaign.ownerId, {
      type: "CAMPAIGN_MEMBER_JOINED",
      campaignId,
      payload: { userId },
      subjectType: "campaignMember",
      subjectId: userId,
    });
  }

  @OnEvent("entity.created")
  async onEntityCreated({ campaignId, entityId }: { campaignId: string; entityId: string }) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      include: { grants: true },
    });
    if (!entity) return;

    const members = await this.membership.listMembers(campaignId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: members.map((m) => m.userId) } },
      select: { id: true, isAdmin: true },
    });
    const isAdminById = new Map(users.map((u) => [u.id, u.isAdmin]));
    const grantedUserIds = entity.grants.map((g) => g.userId);

    for (const member of members) {
      if (member.userId === entity.createdById) continue; // quien la creó ya lo sabe
      const viewer: Viewer = {
        userId: member.userId,
        role: member.role,
        isAdmin: isAdminById.get(member.userId) ?? false,
      };
      const puedeVer = canView(viewer, {
        visibility: entity.visibility,
        createdById: entity.createdById,
        grantedUserIds,
      });
      // Notificar sin filtrar por visibilidad delataría la existencia de una entidad DM_ONLY
      // a quien no puede verla, aunque el contenido no viaje en el payload.
      if (!puedeVer) continue;
      await this.notify(member.userId, {
        type: "ENTITY_CREATED",
        campaignId,
        payload: { entityId: entity.id, entityType: entity.type, entityName: entity.name },
        subjectType: "entity",
        subjectId: entity.id,
      });
    }
  }
}
