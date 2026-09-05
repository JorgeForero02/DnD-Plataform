import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CreateCommentInput } from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { canView, Viewer } from "../common/visibility";

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly gameEvents: GameEventsService,
    private readonly emitter: EventEmitter2,
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

  /**
   * Comentar una ficha **deja rastro**, y hasta la Ola 3 no lo dejaba: `ENTITY_COMMENTED` estaba
   * en el vocabulario de disparadores y no existia como suceso, asi que una regla armada sobre
   * «cuando alguien comente esta ficha» no se disparaba nunca.
   *
   * **El suceso es `DM_ONLY` y el cuerpo del comentario NO viaja en el.** Quien puede leer la
   * ficha ya ve el hilo de comentarios por su propia puerta, con su propio `canView`; copiar el
   * texto al registro seria una segunda copia del mismo contenido con otras reglas de acceso, y
   * la matriz de visibilidad vive en un solo sitio. Lo que el registro cuenta es **que se
   * comento**, que es lo que el motor necesita para dispararse.
   */
  async create(userId: string, entityId: string, input: CreateCommentInput) {
    const entity = await this.requireViewableEntity(userId, entityId);
    const comentario = await this.prisma.transaction(async (tx) => {
      const comentario = await tx.comment.create({
        data: { entityId, authorId: userId, body: input.body },
      });
      await this.gameEvents.record(
        userId,
        entity.campaignId,
        {
          subjectType: "campaign",
          subjectId: entityId,
          // Sobre por que `DM_ONLY`, ver el comentario de arriba: el hilo ya tiene su propia
          // puerta y este suceso no puede convertirse en una segunda.
          visibility: "DM_ONLY",
          payload: { type: "ENTITY_COMMENTED", entityId, entityName: entity.name },
        },
        tx,
      );
      return comentario;
    });
    // **Fuera de la transaccion, a proposito.** Un aviso escrito dentro se habria guardado aunque
    // el comentario acabase deshecho, y el oyente lee la ficha por su cuenta: dentro de la
    // transaccion leeria filas que todavia nadie ha confirmado.
    this.emitter.emit("comment.added", {
      campaignId: entity.campaignId,
      entityId,
      actorId: userId,
    });
    return comentario;
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
