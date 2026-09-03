import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateCampaignItemInput, UpdateCampaignItemInput, ResolvedItem } from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { canView, Viewer } from "../common/visibility";
import { campaignItemToResolvedItem, itemEffectsSchema } from "./campaign-item-to-resolved";

/**
 * Los objetos propios de la campaña — el *homebrew* del DM. Modelado sobre `EntitiesService`:
 * misma forma de `Viewer`, mismo `canView`, mismos `Grant`.
 */
@Injectable()
export class CampaignItemsService {
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

  /** Columnas planas de arma/armadura desde el cuerpo común del esquema. */
  private weaponColumns(input: { weapon?: CreateCampaignItemInput["weapon"] }) {
    const w = input.weapon;
    return {
      weaponCategory: w?.category ?? null,
      weaponRange: w?.range ?? null,
      damageDice: w?.damageDice ?? null,
      damageType: w?.damageType ?? null,
      weaponProperties: w?.properties ?? [],
      versatileDice: w?.versatileDice ?? null,
      rangeNormalFt: w?.rangeNormalFt ?? null,
      rangeLongFt: w?.rangeLongFt ?? null,
    };
  }

  private armorColumns(input: { armor?: CreateCampaignItemInput["armor"] }) {
    const a = input.armor;
    return {
      armorCategory: a?.category ?? null,
      baseAc: a?.baseAc ?? null,
      dexCap: a?.dexCap ?? null,
      strengthRequirement: a?.strengthRequirement ?? 0,
      stealthDisadvantage: a?.stealthDisadvantage ?? false,
    };
  }

  /**
   * Los `effects` se validan **al escribir**, con la unión discriminada de Zod, y no por
   * confianza en quien llama: este servicio también lo invocan otros carriles, no solo el
   * controlador (que ya pasó por `ZodValidationPipe`).
   */
  private validateEffects(effects: unknown): CreateCampaignItemInput["effects"] {
    return itemEffectsSchema.parse(effects ?? []);
  }

  async create(userId: string, campaignId: string, input: CreateCampaignItemInput) {
    await this.membership.requireDM(campaignId, userId);
    const { specificPlayerIds, effects, weapon, armor, ...rest } = input;
    const validEffects = this.validateEffects(effects);
    const item = await this.prisma.campaignItem.create({
      data: {
        campaignId,
        name: rest.name,
        kind: rest.kind,
        description: rest.description,
        weightOz: rest.weightOz,
        costCp: rest.costCp,
        effects: validEffects as object,
        requiresAttunement: rest.requiresAttunement,
        slot: rest.slot,
        ...this.weaponColumns({ weapon }),
        ...this.armorColumns({ armor }),
        visibility: rest.visibility,
        createdById: userId,
        grants:
          rest.visibility === "SPECIFIC_PLAYERS" && specificPlayerIds?.length
            ? { create: specificPlayerIds.map((uid) => ({ userId: uid })) }
            : undefined,
      },
      include: { grants: true },
    });
    return item;
  }

  async list(userId: string, campaignId: string) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await this.viewerFor(userId, campaignId);
    const items = await this.prisma.campaignItem.findMany({
      where: { campaignId },
      include: { grants: true },
      orderBy: { createdAt: "desc" },
    });
    return items.filter((i) =>
      canView(viewer, {
        visibility: i.visibility,
        createdById: i.createdById,
        grantedUserIds: i.grants.map((g) => g.userId),
      }),
    );
  }

  async get(userId: string, campaignId: string, itemId: string) {
    await this.membership.requireMember(campaignId, userId);
    const viewer = await this.viewerFor(userId, campaignId);
    const item = await this.prisma.campaignItem.findFirst({
      where: { id: itemId, campaignId },
      include: { grants: true },
    });
    if (
      !item ||
      !canView(viewer, {
        visibility: item.visibility,
        createdById: item.createdById,
        grantedUserIds: item.grants.map((g) => g.userId),
      })
    ) {
      // 404 y no 403: no se filtra información sobre qué existe a quien no lo puede ver.
      throw new NotFoundException("Item not found");
    }
    return item;
  }

  private async requireEditable(userId: string, campaignId: string, itemId: string) {
    const item = await this.prisma.campaignItem.findFirst({ where: { id: itemId, campaignId } });
    if (!item) throw new NotFoundException("Item not found");
    // A diferencia de las fichas del mundo, aquí edita solo el DM: un objeto propio de la
    // campaña no tiene "creador jugador" — solo el DM los crea (mira `create()`).
    const member = await this.membership.getMembership(campaignId, userId);
    if (member?.role !== "DM") {
      throw new ForbiddenException("Only the DM can modify campaign items");
    }
    return item;
  }

  async update(userId: string, campaignId: string, itemId: string, input: UpdateCampaignItemInput) {
    await this.membership.requireMember(campaignId, userId);
    await this.requireEditable(userId, campaignId, itemId);
    const { specificPlayerIds, effects, weapon, armor, ...rest } = input;
    const data: Record<string, unknown> = {};
    if (rest.name !== undefined) data.name = rest.name;
    if (rest.kind !== undefined) data.kind = rest.kind;
    if (rest.description !== undefined) data.description = rest.description;
    if (rest.weightOz !== undefined) data.weightOz = rest.weightOz;
    if (rest.costCp !== undefined) data.costCp = rest.costCp;
    if (effects !== undefined) data.effects = this.validateEffects(effects) as object;
    if (rest.requiresAttunement !== undefined) data.requiresAttunement = rest.requiresAttunement;
    if (rest.slot !== undefined) data.slot = rest.slot;
    if (weapon !== undefined) Object.assign(data, this.weaponColumns({ weapon }));
    if (armor !== undefined) Object.assign(data, this.armorColumns({ armor }));
    if (rest.visibility !== undefined) data.visibility = rest.visibility;

    return this.prisma.$transaction(async (tx) => {
      if (specificPlayerIds !== undefined) {
        await tx.campaignItemVisibilityGrant.deleteMany({ where: { itemId } });
        if (specificPlayerIds.length) {
          await tx.campaignItemVisibilityGrant.createMany({
            data: specificPlayerIds.map((uid) => ({ itemId, userId: uid })),
          });
        }
      }
      return tx.campaignItem.update({
        where: { id: itemId },
        data,
        include: { grants: true },
      });
    });
  }

  async remove(userId: string, campaignId: string, itemId: string) {
    await this.membership.requireMember(campaignId, userId);
    await this.requireEditable(userId, campaignId, itemId);

    // El `onDelete: Restrict` de Prisma ya impide borrar en la base si sigue en una mochila,
    // pero el 409 con el conteo se lo damos nosotros: el error crudo de Postgres no dice cuántos
    // personajes lo llevan.
    const carriers = await this.prisma.inventoryItem.count({ where: { campaignItemId: itemId } });
    if (carriers > 0) {
      throw new ConflictException(
        `${carriers} personaje(s) llevan este objeto en su inventario; no se puede borrar.`,
      );
    }

    await this.prisma.campaignItem.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  /**
   * Convierte filas `CampaignItem` en `ResolvedItem` de `@dnd/shared`, para que el motor y la
   * hoja las consuman igual que un objeto del catálogo SRD. **Comprueba siempre que el objeto
   * pertenece a esta campaña** (ficha S8 de `docs/06-pendientes.md`): un identificador de otra
   * campaña no se resuelve nunca, aunque exista en la base.
   */
  async resolveForCharacter(campaignId: string, itemIds: string[]): Promise<ResolvedItem[]> {
    if (itemIds.length === 0) return [];
    const rows = await this.prisma.campaignItem.findMany({
      where: { id: { in: itemIds }, campaignId },
    });
    return rows.map(campaignItemToResolvedItem);
  }
}
