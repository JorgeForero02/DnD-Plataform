import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Visibility } from "@dnd/shared";
import { CreateCampaignItemInput, UpdateCampaignItemInput, ResolvedItem } from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { canView, Viewer } from "../common/visibility";
import { viewerFor } from "../common/character-viewer";
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
    const item = await this.requireEditable(userId, campaignId, itemId);
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

    // --- Lo que un cambio de definición le hace a quien ya lo lleva encima -------------------
    //
    // Editar el catálogo y editar las mochilas son la misma acción vista desde dos sitios, y
    // hasta la auditoría de mecánica de 2B esta clase solo lo reconocía al **borrar** (el 409
    // de `remove`). Editar dejaba estado corrupto sin decir nada: filas `attuned` de objetos
    // que ya no se sintonizan ocupando plaza del tope de tres, filas equipadas en una ranura
    // que el objeto ya no tiene, y un escudo conviviendo con un arma que acaba de volverse a
    // dos manos.
    const cambiaLaForma =
      (rest.kind !== undefined && rest.kind !== item.kind) ||
      (rest.slot !== undefined && rest.slot !== item.slot) ||
      (rest.requiresAttunement !== undefined &&
        rest.requiresAttunement !== item.requiresAttunement) ||
      weapon !== undefined ||
      armor !== undefined;

    // Y la visibilidad tiene la misma regla que entregar (D-2B-7): **no se le puede quitar de
    // la vista a quien ya lo lleva**. Antes desaparecía de su inventario en silencio —y de su
    // peso total— mientras la hoja lo seguía sumando redactado: dos capas con dos políticas.
    if (rest.visibility !== undefined && rest.visibility !== item.visibility) {
      await this.rechazarSiSeLoQuitaDeLaVista(campaignId, itemId, rest.visibility, {
        ...item,
        visibility: rest.visibility,
        grants: (specificPlayerIds ?? []).map((userId) => ({ userId })),
      });
    }

    return this.prisma.$transaction(async (tx) => {
      if (cambiaLaForma) {
        // **Vuelve a la mochila de quien lo lleve.** Es la regla conservadora y explicable:
        // cambiar la forma de un objeto lo devuelve a la mochila, y quien lo llevaba vuelve a
        // ponérselo si sigue teniendo sentido. Colar la fila en la ranura nueva sería adivinar,
        // y dejarla como estaba es lo que producía la CA inflada.
        await tx.inventoryItem.updateMany({
          where: { campaignItemId: itemId, OR: [{ location: "EQUIPPED" }, { attuned: true }] },
          data: { location: "CARRIED", slot: null, attuned: false },
        });
      }
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
   * Rechaza un cambio de visibilidad que dejaría el objeto fuera de la vista de alguien que ya
   * lo lleva encima. Es la misma regla que impide entregárselo (`InventoryService.add`), y por
   * el mismo motivo: lo que alguien no debe ver **no se le manda**, pero hacerlo desaparecer de
   * su mochila sin avisar tampoco es una respuesta — es una pantalla que miente.
   */
  private async rechazarSiSeLoQuitaDeLaVista(
    campaignId: string,
    itemId: string,
    visibility: Visibility,
    prospectivo: { visibility: Visibility; createdById: string; grants: { userId: string }[] },
  ): Promise<void> {
    const filas = await this.prisma.inventoryItem.findMany({
      where: { campaignItemId: itemId },
      select: { character: { select: { id: true, name: true, ownerId: true } } },
    });
    if (filas.length === 0) return;

    const grantedUserIds = prospectivo.grants.map((g) => g.userId);
    const sinVista: string[] = [];
    for (const fila of filas) {
      const viewer = await viewerFor(
        this.prisma,
        this.membership,
        fila.character.ownerId,
        campaignId,
      );
      const puede = canView(viewer, {
        visibility,
        createdById: prospectivo.createdById,
        grantedUserIds,
      });
      if (!puede && !sinVista.includes(fila.character.name)) sinVista.push(fila.character.name);
    }
    if (sinVista.length > 0) {
      throw new BadRequestException(
        `${sinVista.join(", ")} lleva este objeto encima: bajarle la visibilidad se lo haría desaparecer del inventario. Quítaselo primero, o deja la visibilidad como está.`,
      );
    }
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
