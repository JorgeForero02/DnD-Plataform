import { ForbiddenException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CreateEntityInput, UpdateEntityInput, EntityType } from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { canView, Viewer } from "../common/visibility";
import { WorldStateService } from "../world-state/world-state.service";

@Injectable()
export class EntitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: EventEmitter2,
    /**
     * Opcional para no romper las unitarias que montan este servicio a mano. En la aplicación
     * real siempre está: `EntitiesModule` importa `WorldStateModule`, que lo exporta.
     */
    @Optional() private readonly worldState?: WorldStateService,
  ) {}

  private async viewerFor(userId: string, campaignId: string): Promise<Viewer> {
    const [member, user] = await Promise.all([
      this.membership.getMembership(campaignId, userId),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    return { userId, role: member?.role ?? null, isAdmin: user?.isAdmin ?? false };
  }

  /**
   * **El mundo lo escribe el DM. Solo el DM.**
   *
   * Esto exigía únicamente ser miembro, y estaba declarado como excepción en
   * `docs/04-convenciones.md`. Era un error, y lo señaló el propio DM al probar la aplicación
   * con un jugador dentro: **un jugador podía crear PNJ, lugares, misiones y documentos**, y con
   * ellos aparecía en su pantalla todo el andamiaje de construir mundo — que es exactamente lo
   * que estropea una partida, porque enseña la forma de lo que aún no debería saber.
   *
   * Lo que el jugador **sigue teniendo** es su voz: comentarios en las fichas que puede ver, su
   * personaje, y el registro de la partida. Escribir el mundo no es su papel.
   */
  async create(userId: string, campaignId: string, input: CreateEntityInput) {
    await this.membership.requireDM(campaignId, userId);
    const { specificPlayerIds, ...rest } = input;
    const entity = await this.prisma.entity.create({
      data: {
        campaignId,
        type: rest.type,
        name: rest.name,
        body: rest.body === undefined ? undefined : (rest.body as object),
        tags: rest.tags,
        visibility: rest.visibility,
        createdById: userId,
        grants:
          rest.visibility === "SPECIFIC_PLAYERS" && specificPlayerIds?.length
            ? { create: specificPlayerIds.map((uid) => ({ userId: uid })) }
            : undefined,
      },
      include: { grants: true },
    });
    this.events.emit("entity.created", {
      campaignId,
      entityId: entity.id,
      type: entity.type,
    });
    return entity;
  }

  async list(userId: string, campaignId: string, type?: EntityType) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await this.viewerFor(userId, campaignId);
    const entities = await this.prisma.entity.findMany({
      where: { campaignId, ...(type ? { type } : {}) },
      include: { grants: true },
      orderBy: { createdAt: "desc" },
    });
    return entities.filter((e) =>
      canView(viewer, {
        visibility: e.visibility,
        createdById: e.createdById,
        grantedUserIds: e.grants.map((g) => g.userId),
      }),
    );
  }

  async get(userId: string, campaignId: string, entityId: string) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await this.viewerFor(userId, campaignId);
    const entity = await this.prisma.entity.findFirst({
      where: { id: entityId, campaignId },
      include: { grants: true },
    });
    if (
      !entity ||
      !canView(viewer, {
        visibility: entity.visibility,
        createdById: entity.createdById,
        grantedUserIds: entity.grants.map((g) => g.userId),
      })
    ) {
      throw new NotFoundException("Entity not found");
    }

    // **Aquí es donde el motor de reglas se entera de que alguien abrió una ficha.**
    //
    // `recordEntityOpened` existía desde 2A.15 con el comentario «queda listo para que quien
    // toque `entities` lo llame», y no lo llamaba nadie: el disparador `ENTITY_OPENED` estaba
    // probado en unitarias y era **inalcanzable en producción**. Y resulta que es el ejemplo con
    // el que se definió el sistema entero —«cuando un jugador revise el detalle, se desvela el
    // camino secreto»—, así que el motor tenía muerto justo el caso que lo justificaba.
    //
    // El suceso se escribe siempre `DM_ONLY` (lo fija `recordEntityOpened`): registrar quién
    // mira qué es vigilancia si no se dice, y por eso el hueco H3 exige además que la interfaz
    // avise al jugador. Las dos mitades, o ninguna.
    //
    // **No se registra cuando quien mira es el DM o el creador de la ficha.** El suceso existe
    // para captar que **un jugador** examinó algo —«cuando un jugador revise el detalle, se
    // desvela el camino secreto»—; el DM preparando la sesión abre sus propias fichas una y otra
    // vez, y sin esta condición cada lectura suya dispararía la regla contra sí mismo y le
    // llenaría la bandeja de propuestas falsas. Lo encontró un DM en una partida de prueba:
    // «leer mis propias notas dispara reglas contra mí». La comprobación de permiso de arriba ya
    // dejó pasar solo a quien puede ver la ficha; esto solo decide si su lectura es un *suceso*.
    const esDelPropioDm = viewer.role === "DM" || entity.createdById === userId;
    if (this.worldState && !esDelPropioDm) {
      // **No se espera a que termine ni se deja caer la petición si falla**: abrir una ficha
      // tiene que funcionar aunque el registro o una regla revienten. El puente ya aísla los
      // fallos de las reglas; este `catch` aísla los del propio registro.
      await this.worldState
        .recordEntityOpened(userId, campaignId, entity.id, entity.type, entity.name)
        .catch(() => undefined);
    }

    return entity;
  }

  private async requireEditable(userId: string, campaignId: string, entityId: string) {
    const entity = await this.prisma.entity.findFirst({
      where: { id: entityId, campaignId },
    });
    if (!entity) throw new NotFoundException("Entity not found");
    const member = await this.membership.getMembership(campaignId, userId);
    if (member?.role !== "DM" && entity.createdById !== userId) {
      throw new ForbiddenException("Only the DM or the creator can modify this");
    }
    return entity;
  }

  async update(userId: string, campaignId: string, entityId: string, input: UpdateEntityInput) {
    await this.membership.requireMember(campaignId, userId);
    await this.requireEditable(userId, campaignId, entityId);
    const { specificPlayerIds, ...rest } = input;
    const data: Record<string, unknown> = {};
    if (rest.type !== undefined) data.type = rest.type;
    if (rest.name !== undefined) data.name = rest.name;
    if (rest.body !== undefined) data.body = rest.body as object;
    if (rest.tags !== undefined) data.tags = rest.tags;
    if (rest.visibility !== undefined) data.visibility = rest.visibility;

    return this.prisma.$transaction(async (tx) => {
      if (specificPlayerIds !== undefined) {
        await tx.entityVisibilityGrant.deleteMany({ where: { entityId } });
        if (specificPlayerIds.length) {
          await tx.entityVisibilityGrant.createMany({
            data: specificPlayerIds.map((uid) => ({ entityId, userId: uid })),
          });
        }
      }
      return tx.entity.update({
        where: { id: entityId },
        data,
        include: { grants: true },
      });
    });
  }

  async remove(userId: string, campaignId: string, entityId: string) {
    await this.membership.requireMember(campaignId, userId);
    await this.requireEditable(userId, campaignId, entityId);
    await this.prisma.entity.delete({ where: { id: entityId } });
    return { deleted: true };
  }
}
