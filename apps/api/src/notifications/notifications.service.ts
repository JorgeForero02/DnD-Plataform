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

  /**
   * **Los visores de la mesa, montados una sola vez.** Un aviso siempre se decide igual —quién
   * está en la campaña, con qué papel, y si es administrador—, así que la consulta vive aquí y no
   * repetida en cada oyente: si mañana un papel nuevo cambia quién ve qué, se cambia en un sitio.
   */
  private async visoresDeLaMesa(campaignId: string): Promise<Viewer[]> {
    const members = await this.membership.listMembers(campaignId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: members.map((m) => m.userId) } },
      select: { id: true, isAdmin: true },
    });
    const isAdminById = new Map(users.map((u) => [u.id, u.isAdmin]));
    return members.map((m) => ({
      userId: m.userId,
      role: m.role,
      isAdmin: isAdminById.get(m.userId) ?? false,
    }));
  }

  @OnEvent("entity.created")
  async onEntityCreated({ campaignId, entityId }: { campaignId: string; entityId: string }) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      include: { grants: true },
    });
    if (!entity) return;

    const visores = await this.visoresDeLaMesa(campaignId);
    const grantedUserIds = entity.grants.map((g) => g.userId);

    for (const viewer of visores) {
      if (viewer.userId === entity.createdById) continue; // quien la creó ya lo sabe
      const puedeVer = canView(viewer, {
        visibility: entity.visibility,
        createdById: entity.createdById,
        grantedUserIds,
      });
      // Notificar sin filtrar por visibilidad delataría la existencia de una entidad DM_ONLY
      // a quien no puede verla, aunque el contenido no viaje en el payload.
      if (!puedeVer) continue;
      await this.notify(viewer.userId, {
        type: "ENTITY_CREATED",
        campaignId,
        payload: { entityId: entity.id, entityType: entity.type, entityName: entity.name },
        subjectType: "entity",
        subjectId: entity.id,
      });
    }
  }

  // --- Plan 12 · los dos avisos que nadie emitía ---
  //
  // `COMMENT_ADDED` y `SESSION_SCHEDULED` estaban en el contrato de `@dnd/shared` desde la tarea
  // 2A.14 y **no los emitía nadie**: dos tipos declarados que ningún usuario podía recibir nunca.

  /**
   * **Comentar una ficha avisa a quien deba saberlo**: el DM siempre, y el autor de la ficha si no
   * es quien comenta.
   *
   * **Nunca a quien no puede ver la ficha.** El aviso pasa por `canView` igual que todo lo demás:
   * decirle a alguien «han comentado esta ficha» le confirma que la ficha existe, y esa
   * confirmación es exactamente lo que esconde una visibilidad `DM_ONLY`. Un DM que no pueda ver
   * una ficha `OWNER_DM` de otra mesa no recibe nada por ser DM.
   *
   * **El cuerpo del comentario no viaja en el aviso**, por el mismo motivo por el que no viaja en
   * su suceso: el hilo tiene su propia puerta, con su propio `canView`, y una segunda copia del
   * texto sería una segunda puerta con otras reglas.
   */
  @OnEvent("comment.added")
  async onCommentAdded({
    campaignId,
    entityId,
    actorId,
  }: {
    campaignId: string;
    entityId: string;
    actorId: string;
  }) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      include: { grants: true },
    });
    if (!entity) return;

    const visores = await this.visoresDeLaMesa(campaignId);
    const grantedUserIds = entity.grants.map((g) => g.userId);
    const destinatarios = visores.filter((v) => v.role === "DM" || v.userId === entity.createdById);

    for (const viewer of destinatarios) {
      // **Nadie se avisa de lo que acaba de hacer.** Un DM que comenta veinte fichas seguidas
      // genera cero avisos para sí mismo.
      if (viewer.userId === actorId) continue;
      const puedeVer = canView(viewer, {
        visibility: entity.visibility,
        createdById: entity.createdById,
        grantedUserIds,
      });
      if (!puedeVer) continue;
      await this.notify(viewer.userId, {
        type: "COMMENT_ADDED",
        campaignId,
        // Datos, nunca la frase, y **nunca el cuerpo del comentario**.
        payload: { entityId: entity.id, entityType: entity.type, entityName: entity.name },
        subjectType: "entity",
        subjectId: entity.id,
      });
    }
  }

  /**
   * **Planificar una sesión avisa a la mesa**, con la visibilidad de la sesión.
   *
   * El atajo de `canView` con `createdById: ""` es el mismo que usa `SessionsService.canSee`, y
   * vale porque una sesión **no tiene** creador propio ni permisos por persona: sus cinco niveles
   * se resuelven solo con el papel. Si algún día los tuviera, este `""` empezaría a esconderla de
   * quien sí tiene derecho.
   */
  @OnEvent("session.scheduled")
  async onSessionScheduled({
    campaignId,
    sessionId,
    actorId,
  }: {
    campaignId: string;
    sessionId: string;
    actorId: string;
  }) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || !session.scheduledAt) return;

    for (const viewer of await this.visoresDeLaMesa(campaignId)) {
      if (viewer.userId === actorId) continue; // quien la planificó ya lo sabe
      const puedeVer = canView(viewer, {
        visibility: session.visibility,
        createdById: "",
        grantedUserIds: [],
      });
      if (!puedeVer) continue;
      await this.notify(viewer.userId, {
        type: "SESSION_SCHEDULED",
        campaignId,
        payload: {
          sessionId: session.id,
          sessionTitle: session.title,
          scheduledAt: session.scheduledAt.toISOString(),
        },
        subjectType: "session",
        subjectId: session.id,
      });
    }
  }
}
