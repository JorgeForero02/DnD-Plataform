import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  COIN_KEYS,
  COIN_WEIGHT_OZ,
  MAX_ATTUNED_ITEMS,
  WEIGHT_OZ_PER_LB,
  type AddInventoryItemInput,
  type ChangeMoneyInput,
  type CoinKey,
  type EquipSlot,
  type ItemLocation,
  type ResolvedItem,
  type UpdateInventoryItemInput,
} from "@dnd/shared";
import { Prisma, type Character, type InventoryItem } from "@prisma/client";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";
import { canView } from "../common/visibility";
import {
  requireOwnerOrDM,
  requireVisibleCharacter,
  viewerFor,
  viewerForCharacterOwner,
} from "../common/character-viewer";
import { resolveContentRef, resolveInventoryRowItem } from "./common/resolve-item";

// Carril A4 — el inventario de un personaje, equipar, sintonizar y la bolsa (hueco H1).
//
// **El núcleo es "una ranura, un objeto" más "una mano a dos manos deja la otra inutilizable"**:
// eso no es aritmética de columnas, es una regla de negocio que la base solo puede garantizar a
// medias (el índice único parcial de la migración cubre la primera parte; la segunda —que una
// mano a dos manos bloquee la otra— la decide este servicio, porque no hay forma de expresarla
// como una restricción SQL sin modelar "ocupación derivada", que sería guardar lo calculado).

interface PlacementInput {
  location?: ItemLocation;
  slot?: EquipSlot | null;
  attuned?: boolean;
}

interface PlacementCurrent {
  location: ItemLocation;
  slot: EquipSlot | null;
  attuned: boolean;
}

interface Placement {
  location: ItemLocation;
  slot: EquipSlot | null;
  attuned: boolean;
}

/**
 * La parte pura de "qué significa esta mutación": a qué sitio va, qué ranura le queda y si sigue
 * sintonizado. **No toca la base** —no puede saber si esa ranura está libre—, así que solo
 * decide la forma final y las contradicciones que se ven sin consultar nada más (sintonizar sin
 * estar equipado, sintonizar un objeto que no lo pide, equipar algo sin ranura).
 */
function resolvePlacement(
  current: PlacementCurrent,
  input: PlacementInput,
  itemDef: ResolvedItem,
): Placement {
  const location = input.location ?? current.location;

  let slot: EquipSlot | null;
  if (location === "EQUIPPED") {
    slot =
      input.slot !== undefined ? input.slot : current.location === "EQUIPPED" ? current.slot : null;
    if (!slot) slot = itemDef.slot ?? null;
    if (!slot) {
      throw new BadRequestException(
        `"${itemDef.name}" no tiene una ranura de equipo: no se puede llevar puesto.`,
      );
    }
  } else {
    // Pasar a CARRIED o STORED libera la ranura (regla 5) — sin ranura no hay nada que ocupar.
    slot = null;
  }

  if (input.attuned === true) {
    if (location !== "EQUIPPED") {
      throw new BadRequestException("Para sintonizar un objeto, primero hay que llevarlo puesto.");
    }
    if (!itemDef.requiresAttunement) {
      throw new BadRequestException(
        `"${itemDef.name}" no es un objeto que requiera sintonización.`,
      );
    }
  }

  let attuned = input.attuned ?? current.attuned;
  // Desequipar quita la sintonización (regla 4), tanto si el `PATCH` lo pide como si es un
  // efecto colateral de mover el objeto a la mochila o al cofre.
  if (location !== "EQUIPPED") attuned = false;

  return { location, slot, attuned };
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
  ) {}

  async list(userId: string, campaignId: string, characterId: string) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    const viewer = await viewerFor(this.prisma, this.membership, userId, campaignId);

    const rows = await this.prisma.inventoryItem.findMany({
      where: { characterId },
      orderBy: { createdAt: "asc" },
    });

    const resolvedRows = await Promise.all(
      rows.map(async (row) => {
        if (row.srdKey) {
          return { row, resolved: await resolveInventoryRowItem(this.prisma, campaignId, row) };
        }
        const { resolved, campaignItem } = await resolveContentRef(this.prisma, campaignId, {
          source: "CAMPAIGN",
          id: row.campaignItemId as string,
        });
        return { row, resolved, campaignItem };
      }),
    );

    // Lo que no se puede ver no se envía (regla del servidor): un `CampaignItem` cuya
    // visibilidad ya no alcanza a quien pregunta —aunque el objeto siga en la mochila— no sale
    // ni en la fila, ni en el peso total, ni de ninguna otra forma.
    const visibleRows = resolvedRows.filter(({ campaignItem }) => {
      if (!campaignItem) return true;
      return canView(viewer, {
        visibility: campaignItem.visibility,
        createdById: campaignItem.createdById,
        grantedUserIds: campaignItem.grantedUserIds,
      });
    });

    const items = visibleRows.map(({ row, resolved }) => ({
      id: row.id,
      quantity: row.quantity,
      location: row.location,
      slot: row.slot,
      attuned: row.attuned,
      storedAt: row.storedAt,
      note: row.note,
      item: resolved,
    }));

    const totalWeightOz = this.carriedWeightOz(visibleRows, character);
    const purse = {
      cp: character.cp,
      sp: character.sp,
      ep: character.ep,
      gp: character.gp,
      pp: character.pp,
    };
    // Fuerza × 15 libras, en onzas para no mezclar unidades con `totalWeightOz` (SRD 5.1,
    // capacidad de carga). `null` si el personaje no tiene Fuerza asignada todavía —una hoja a
    // medio hacer no inventa una capacidad—; NO se deriva de la hoja completa (`rules/catalog`)
    // porque `str` ya es una columna cruda de `Character` y leerla no es acoplarse al motor.
    const carryCapacityOz = character.str != null ? character.str * 15 * WEIGHT_OZ_PER_LB : null;

    return { items, purse, totalWeightOz, carryCapacityOz };
  }

  private carriedWeightOz(
    rows: { row: InventoryItem; resolved: ResolvedItem }[],
    character: Character,
  ): number {
    const itemsWeight = rows.reduce(
      (sum, { row, resolved }) =>
        row.location === "STORED" ? sum : sum + resolved.weightOz * row.quantity,
      0,
    );
    const coinCount = character.cp + character.sp + character.ep + character.gp + character.pp;
    const coinsWeight = Math.round(coinCount * COIN_WEIGHT_OZ);
    return itemsWeight + coinsWeight;
  }

  async add(userId: string, campaignId: string, characterId: string, input: AddInventoryItemInput) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    await requireOwnerOrDM(this.membership, campaignId, userId, character);

    const { resolved, campaignItem } = await resolveContentRef(this.prisma, campaignId, input.ref);

    // Regla 6: un objeto DM_ONLY de la campaña no se le puede dar a un personaje cuyo dueño no
    // puede verlo. Se mira por los ojos del DUEÑO del personaje, no de quien hace el `POST`
    // —puede ser el DM entregándolo—, porque la pregunta es si ese objeto le va a aparecer en
    // su propia mochila sin que él pueda verlo.
    if (campaignItem) {
      const ownerViewer = await viewerForCharacterOwner(
        this.prisma,
        this.membership,
        campaignId,
        character,
      );
      if (
        !canView(ownerViewer, {
          visibility: campaignItem.visibility,
          createdById: campaignItem.createdById,
          grantedUserIds: campaignItem.grantedUserIds,
        })
      ) {
        throw new BadRequestException(
          `El dueño del personaje no puede ver "${resolved.name}" todavía: súbele la visibilidad al objeto antes de dárselo.`,
        );
      }
    }

    const placement = resolvePlacement(
      { location: "CARRIED", slot: null, attuned: false },
      { location: input.location, slot: input.slot, attuned: undefined },
      resolved,
    );
    if (placement.location === "EQUIPPED") {
      await this.ensureSlotAllowed(characterId, campaignId, resolved, placement.slot as EquipSlot);
    }

    try {
      return await this.prisma.inventoryItem.create({
        data: {
          characterId,
          srdKey: input.ref.source === "SRD" ? input.ref.key : null,
          campaignItemId: input.ref.source === "CAMPAIGN" ? input.ref.id : null,
          quantity: input.quantity,
          location: placement.location,
          slot: placement.slot,
          attuned: false,
          storedAt: input.storedAt ?? null,
          note: input.note ?? null,
        },
      });
    } catch (error) {
      throw this.translateSlotConflict(error);
    }
  }

  async update(
    userId: string,
    campaignId: string,
    characterId: string,
    rowId: string,
    input: UpdateInventoryItemInput,
  ) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    await requireOwnerOrDM(this.membership, campaignId, userId, character);

    const row = await this.prisma.inventoryItem.findFirst({ where: { id: rowId, characterId } });
    if (!row) throw new NotFoundException("Ese objeto no está en el inventario.");

    const itemDef = await resolveInventoryRowItem(this.prisma, campaignId, row);

    const placement = resolvePlacement(
      { location: row.location, slot: row.slot, attuned: row.attuned },
      { location: input.location, slot: input.slot, attuned: input.attuned },
      itemDef,
    );

    if (placement.location === "EQUIPPED") {
      await this.ensureSlotAllowed(
        characterId,
        campaignId,
        itemDef,
        placement.slot as EquipSlot,
        rowId,
      );
    }
    if (placement.attuned && !row.attuned) {
      // **Sintonizar se serializa por personaje.** Contar las sintonizadas y escribir después es
      // una carrera: dos peticiones simultáneas pasan las dos el tope y dejan cuatro objetos
      // sintonizados, que es justo lo que el SRD prohíbe. A diferencia de la ranura, esto no lo
      // puede garantizar un índice —el tope es sobre un conteo, no sobre una fila—, así que se
      // bloquea la fila del personaje, que es lo que ordena todas las sintonizaciones suyas.
      // Lo encontró la revisión de 2B.
      return this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Character" WHERE id = ${characterId} FOR UPDATE`;
        await this.ensureAttunementAllowed(characterId, campaignId, rowId, tx);
        return this.escribirColocacion(tx, rowId, placement, input);
      });
    }

    return this.escribirColocacion(this.prisma, rowId, placement, input);
  }

  /** La escritura, compartida por el camino normal y por el que se serializa para sintonizar. */
  private async escribirColocacion(
    client: PrismaService | Prisma.TransactionClient,
    rowId: string,
    placement: Placement,
    input: UpdateInventoryItemInput,
  ) {
    const data: Prisma.InventoryItemUpdateInput = {
      location: placement.location,
      slot: placement.slot,
      attuned: placement.attuned,
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.storedAt !== undefined ? { storedAt: input.storedAt } : {}),
      ...(input.note !== undefined ? { note: input.note } : {}),
    };

    try {
      return await client.inventoryItem.update({ where: { id: rowId }, data });
    } catch (error) {
      throw this.translateSlotConflict(error);
    }
  }

  async remove(userId: string, campaignId: string, characterId: string, rowId: string) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    await requireOwnerOrDM(this.membership, campaignId, userId, character);

    const row = await this.prisma.inventoryItem.findFirst({ where: { id: rowId, characterId } });
    if (!row) throw new NotFoundException("Ese objeto no está en el inventario.");

    await this.prisma.inventoryItem.delete({ where: { id: rowId } });
    return { deleted: true };
  }

  /**
   * Mueve monedas por delta (regla H6). **Todo o nada por transacción**: si un solo tipo de
   * moneda se quedaría en negativo, no se toca ninguno —"cambiar 3 po por plata" es una decisión
   * de la mesa, no algo que el servidor resuelve solo.
   */
  async changeMoney(
    userId: string,
    campaignId: string,
    characterId: string,
    input: ChangeMoneyInput,
  ) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    await requireOwnerOrDM(this.membership, campaignId, userId, character);

    const deltas: Partial<Record<CoinKey, number>> = {};
    for (const key of COIN_KEYS) {
      const delta = input[key];
      if (delta !== undefined && delta !== 0) deltas[key] = delta;
    }

    return this.prisma.$transaction(async (tx) => {
      // **La fila se bloquea antes de mirar el saldo.** La primera versión comprobaba el saldo
      // sobre una lectura de fuera de la transacción y escribía con `increment`: con 30 de oro,
      // dos peticiones de −20 a la vez pasaban las dos la comprobación y la bolsa acababa en
      // −10, rompiendo el mínimo que el propio esquema declara. Es el mismo `FOR UPDATE` que
      // usan los puntos de golpe, y por el mismo motivo. Lo encontró la revisión de 2B.
      const filas = await tx.$queryRaw<
        Character[]
      >`SELECT * FROM "Character" WHERE id = ${characterId} AND "campaignId" = ${campaignId} FOR UPDATE`;
      const bloqueado = filas[0];
      if (!bloqueado) throw new NotFoundException("Character not found");

      for (const key of COIN_KEYS) {
        const delta = deltas[key];
        if (delta === undefined) continue;
        const remaining = bloqueado[key] + delta;
        if (remaining < 0) {
          throw new BadRequestException(
            `No hay suficiente ${key.toUpperCase()} en la bolsa: quedarían ${remaining}.`,
          );
        }
      }

      const data: Prisma.CharacterUpdateInput = {};
      for (const key of Object.keys(deltas) as CoinKey[]) {
        data[key] = { increment: deltas[key] };
      }
      const updated = await tx.character.update({ where: { id: characterId }, data });

      await this.events.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          subjectId: characterId,
          visibility: character.visibility,
          // `MONEY_CHANGED` con sus deltas por denominación. El carril que escribió esto no podía
          // tocar `packages/shared`, así que lo dejó como una señal genérica con el detalle en
          // prosa y lo declaró; al integrar, el tipo se añadió de verdad — un movimiento de
          // dinero guardado como texto libre no se puede sumar ni filtrar después.
          payload: { type: "MONEY_CHANGED", ...deltas, reason: input.reason },
        },
        tx,
      );

      return {
        cp: updated.cp,
        sp: updated.sp,
        ep: updated.ep,
        gp: updated.gp,
        pp: updated.pp,
      };
    });
  }

  /**
   * Comprueba las reglas de manos (regla 2) y, para cualquier otra ranura, que esté libre (regla
   * 1). Se comprueba ANTES de escribir para dar un 409 con un mensaje legible; el índice único
   * parcial de la migración es la red de seguridad para la carrera entre dos peticiones
   * simultáneas, no la primera línea de defensa.
   */
  private async ensureSlotAllowed(
    characterId: string,
    campaignId: string,
    itemDef: ResolvedItem,
    slot: EquipSlot,
    excludeRowId?: string,
  ): Promise<void> {
    const isTwoHanded = itemDef.weapon?.properties.includes("TWO_HANDED") ?? false;

    if (slot === "MAIN_HAND" && isTwoHanded) {
      const offHand = await this.findEquippedInSlot(characterId, "OFF_HAND", excludeRowId);
      if (offHand) {
        const offHandItem = await resolveInventoryRowItem(this.prisma, campaignId, offHand);
        throw new ConflictException(
          `La mano izquierda ya lleva "${offHandItem.name}"; un arma a dos manos necesita las dos manos libres.`,
        );
      }
    }

    if (slot === "OFF_HAND") {
      const mainHand = await this.findEquippedInSlot(characterId, "MAIN_HAND", excludeRowId);
      if (mainHand) {
        const mainHandItem = await resolveInventoryRowItem(this.prisma, campaignId, mainHand);
        if (mainHandItem.weapon?.properties.includes("TWO_HANDED")) {
          throw new ConflictException(
            `La mano principal lleva "${mainHandItem.name}", un arma a dos manos: no queda hueco para la mano izquierda.`,
          );
        }
      }
    }

    const occupant = await this.findEquippedInSlot(characterId, slot, excludeRowId);
    if (occupant) {
      const occupantItem = await resolveInventoryRowItem(this.prisma, campaignId, occupant);
      throw new ConflictException(`La ranura ya la ocupa "${occupantItem.name}".`);
    }
  }

  private findEquippedInSlot(characterId: string, slot: EquipSlot, excludeRowId?: string) {
    return this.prisma.inventoryItem.findFirst({
      where: {
        characterId,
        slot,
        location: "EQUIPPED",
        ...(excludeRowId ? { id: { not: excludeRowId } } : {}),
      },
    });
  }

  /** Regla 3: como mucho `MAX_ATTUNED_ITEMS` (tres) objetos sintonizados por personaje. */
  private async ensureAttunementAllowed(
    characterId: string,
    campaignId: string,
    excludeRowId?: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    const attunedRows = await client.inventoryItem.findMany({
      where: {
        characterId,
        attuned: true,
        ...(excludeRowId ? { id: { not: excludeRowId } } : {}),
      },
    });
    if (attunedRows.length >= MAX_ATTUNED_ITEMS) {
      const names = await Promise.all(
        attunedRows.map((r) =>
          resolveInventoryRowItem(this.prisma, campaignId, r).then((i) => i.name),
        ),
      );
      throw new BadRequestException(
        `Ya hay ${MAX_ATTUNED_ITEMS} objetos sintonizados: ${names.join(", ")}. Hay que desintonizar uno antes de sintonizar otro.`,
      );
    }
  }

  /** P2002 solo puede venir del índice único parcial de la migración: dos "equipar" a la vez. */
  private translateSlotConflict(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return new ConflictException("Esa ranura ya está ocupada por otro objeto.");
    }
    return error;
  }
}
