import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  SetFlagInput,
  CreateSetInput,
  ChangeSetMemberInput,
  RaiseSignalInput,
} from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";

// Tarea 2A.15 — marcas, conjuntos y sucesos del mundo.
//
// Nada de esto decide quién ve qué: eso lo sigue haciendo `canView` sobre el evento que cada
// mutación escribe. Este servicio solo guarda el estado y deja constancia de que cambió.

@Injectable()
export class WorldStateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
  ) {}

  // --- Marcas ---

  async setFlag(dmUserId: string, campaignId: string, input: SetFlagInput) {
    await this.membership.requireDM(campaignId, dmUserId);
    const flag = await this.prisma.campaignFlag.upsert({
      where: { campaignId_key: { campaignId, key: input.key } },
      create: { campaignId, key: input.key, value: input.value, setById: dmUserId },
      update: { value: input.value, setById: dmUserId },
    });
    await this.events.record(dmUserId, campaignId, {
      subjectType: "campaign",
      subjectId: campaignId,
      visibility: "PLAYERS",
      payload: { type: "FLAG_SET", key: input.key, value: input.value },
    });
    return flag;
  }

  async listFlags(userId: string, campaignId: string) {
    await this.membership.requireMember(campaignId, userId);
    return this.prisma.campaignFlag.findMany({ where: { campaignId }, orderBy: { key: "asc" } });
  }

  // --- Conjuntos ---

  async createSet(dmUserId: string, campaignId: string, input: CreateSetInput) {
    await this.membership.requireDM(campaignId, dmUserId);
    return this.prisma.campaignSet.upsert({
      where: { campaignId_key: { campaignId, key: input.key } },
      create: { campaignId, key: input.key, label: input.label },
      update: { label: input.label },
    });
  }

  async listSets(userId: string, campaignId: string) {
    await this.membership.requireMember(campaignId, userId);
    return this.prisma.campaignSet.findMany({
      where: { campaignId },
      include: { members: true },
      orderBy: { key: "asc" },
    });
  }

  private async requireSet(campaignId: string, key: string) {
    const set = await this.prisma.campaignSet.findUnique({
      where: { campaignId_key: { campaignId, key } },
    });
    if (!set) throw new NotFoundException("Set not found");
    return set;
  }

  /**
   * Añadir dos veces el mismo miembro **no lo duplica**: `upsert` sobre el índice único
   * (`setId, memberType, memberId`) hace que la segunda llamada sea un no-op sobre la fila, y
   * comprobar si ya existía antes de escribir evita además duplicar el `SET_CHANGED` en el
   * registro — pedir el mismo efecto dos veces no son dos sucesos.
   */
  async addMember(dmUserId: string, campaignId: string, key: string, input: ChangeSetMemberInput) {
    await this.membership.requireDM(campaignId, dmUserId);
    const set = await this.requireSet(campaignId, key);

    const existing = await this.prisma.campaignSetMember.findUnique({
      where: {
        setId_memberType_memberId: {
          setId: set.id,
          memberType: input.memberType,
          memberId: input.memberId,
        },
      },
    });
    await this.prisma.campaignSetMember.upsert({
      where: {
        setId_memberType_memberId: {
          setId: set.id,
          memberType: input.memberType,
          memberId: input.memberId,
        },
      },
      create: {
        setId: set.id,
        memberType: input.memberType,
        memberId: input.memberId,
        addedById: dmUserId,
      },
      update: {},
    });

    if (!existing) {
      await this.events.record(dmUserId, campaignId, {
        subjectType: "campaign",
        subjectId: campaignId,
        visibility: "PLAYERS",
        payload: {
          type: "SET_CHANGED",
          setKey: key,
          action: "ADDED",
          memberType: input.memberType,
          memberId: input.memberId,
        },
      });
    }
    return { added: true };
  }

  async removeMember(
    dmUserId: string,
    campaignId: string,
    key: string,
    memberType: string,
    memberId: string,
  ) {
    await this.membership.requireDM(campaignId, dmUserId);
    const set = await this.requireSet(campaignId, key);

    const result = await this.prisma.campaignSetMember.deleteMany({
      where: { setId: set.id, memberType, memberId },
    });

    if (result.count > 0) {
      await this.events.record(dmUserId, campaignId, {
        subjectType: "campaign",
        subjectId: campaignId,
        visibility: "PLAYERS",
        payload: { type: "SET_CHANGED", setKey: key, action: "REMOVED", memberType, memberId },
      });
    }
    return { removed: true };
  }

  // --- Señales ---

  /** Una marca que el DM levanta a mano, sin cambiar nada del mundo: solo dispara reglas. Por
   * eso el evento es `DM_ONLY` — no es un hecho del mundo, es una palanca de mesa. */
  async raiseSignal(dmUserId: string, campaignId: string, input: RaiseSignalInput) {
    await this.membership.requireDM(campaignId, dmUserId);
    await this.events.record(dmUserId, campaignId, {
      subjectType: "campaign",
      subjectId: campaignId,
      visibility: "DM_ONLY",
      payload: { type: "SIGNAL_RAISED", key: input.key, reason: input.reason },
    });
    return { raised: true };
  }

  /**
   * Interno: escribe el suceso de que alguien abrió una ficha, siempre `DM_ONLY` — es un dato
   * de comportamiento de mesa, no del mundo, y no le corresponde al jugador saber que se mira.
   * **No está enganchado a `entities`** (esa carpeta no es de esta tarea): queda listo para que
   * quien la toque lo llame.
   */
  async recordEntityOpened(
    userId: string,
    campaignId: string,
    entityId: string,
    entityType: string,
    entityName?: string,
  ) {
    return this.events.record(userId, campaignId, {
      subjectType: "campaign",
      subjectId: entityId,
      visibility: "DM_ONLY",
      payload: { type: "ENTITY_OPENED", entityType, entityName },
    });
  }
}
