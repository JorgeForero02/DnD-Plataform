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

/**
 * De qué lado de la flecha está el enlace **visto desde la ficha que se está leyendo**.
 * `OUTGOING` es el que esa ficha escribió («Corvin → vive en → Torre Gris», leído desde
 * Corvin); `INCOMING` es el retroenlace, el mismo registro leído desde la Torre Gris.
 * No hay dos filas en la base: hay una, leída desde sus dos extremos.
 */
export type LinkDirection = "OUTGOING" | "INCOMING";

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
    // Enlazar es escribir el mundo, igual que crear una ficha: solo el DM. Y aquí importaba
    // doblemente, porque un enlace **revela que dos cosas tienen que ver** aunque el jugador no
    // pueda abrir ninguna de las dos.
    await this.membership.requireDM(from.campaignId, userId);
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

  /**
   * Los enlaces de una ficha **por sus dos lados**. Hasta el bloque L esto filtraba solo por
   * `fromId`: quien abría la Torre Gris no veía que Corvin vivía en ella, y para que el enlace
   * se leyera desde los dos extremos había que crearlo dos veces y acordarse de borrar los dos.
   *
   * La respuesta sigue siendo **una lista plana**, no `{ salientes, entrantes }`: cada fila
   * lleva su `direction`. Es lo que deja intacto a quien ya la consumía (`links.e2e-spec.ts`
   * cuenta `body.length` y mapea `l.to.id`) y la pantalla agrupa sola.
   *
   * `to` significa aquí **la ficha del otro extremo**, que en un retroenlace es el `from` del
   * registro. El nombre se conserva por compatibilidad; `other` describiría mejor lo que es.
   */
  async listFor(userId: string, entityId: string) {
    const entity = await this.prisma.entity.findUnique({ where: { id: entityId } });
    if (!entity) throw new NotFoundException("Entity not found");
    await this.membership.requireMember(entity.campaignId, userId);
    const viewer = await this.viewerFor(userId, entity.campaignId);

    const [outgoing, incoming] = await Promise.all([
      this.prisma.entityLink.findMany({
        where: { fromId: entityId },
        include: { to: { include: { grants: true } } },
      }),
      this.prisma.entityLink.findMany({
        where: { toId: entityId },
        include: { from: { include: { grants: true } } },
      }),
    ]);

    // Deliberadamente **sin** `isAdmin`: `remove` solo mira rol DM o creador del origen, y una
    // interfaz que ofrece un botón que el servidor va a rechazar miente.
    const isDM = viewer.role === "DM";
    const rows = [
      ...outgoing.map((l) => ({
        id: l.id,
        label: l.label as string | null,
        direction: "OUTGOING" as LinkDirection,
        // Quitar exige DM o el creador del **origen** (ver `remove`). En un enlace saliente el
        // origen es esta misma ficha; en uno entrante, la de enfrente.
        canRemove: isDM || entity.createdById === viewer.userId,
        other: l.to,
      })),
      ...incoming.map((l) => ({
        id: l.id,
        label: l.label as string | null,
        direction: "INCOMING" as LinkDirection,
        canRemove: isDM || l.from.createdById === viewer.userId,
        other: l.from,
      })),
    ];

    // **El retroenlace no puede revelar una ficha que quien mira no puede ver.** Es la misma
    // `canView` de siempre —el dueño único de «quién ve qué»— aplicada ahora a los dos
    // extremos: sin esto, abrir un lugar público delataría la existencia del culto `DM_ONLY`
    // que lo tiene enlazado.
    return rows
      .filter((r) =>
        canView(viewer, {
          visibility: r.other.visibility,
          createdById: r.other.createdById,
          grantedUserIds: r.other.grants.map((g) => g.userId),
        }),
      )
      .map((r) => ({
        id: r.id,
        label: r.label,
        direction: r.direction,
        canRemove: r.canRemove,
        to: { id: r.other.id, name: r.other.name, type: r.other.type },
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
