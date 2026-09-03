import { Injectable, NotFoundException } from "@nestjs/common";
import type { ApplyConditionInput } from "@dnd/shared";
import { MembershipService } from "../../campaigns/membership.service";
import { GameEventsService } from "../../game-events/game-events.service";
import { PrismaService } from "../../prisma/prisma.service";
import { requireOwnerOrDM, requireVisibleCharacter } from "../../common/character-viewer";

// Tarea 2A.12 — condiciones. **La clave es libre**: las quince del SRD (`SRD_CONDITIONS`,
// `@dnd/shared`) las entiende el motor de velocidad efectiva (`../speed/effective-speed.ts`);
// cualquier otra se guarda y se enseña igual, y no calcula nada. Este servicio no distingue
// las dos — esa distinción es asunto de quien LEE las condiciones para derivar algo, no de
// quien las guarda.

@Injectable()
export class ConditionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
  ) {}

  async list(userId: string, campaignId: string, characterId: string) {
    await requireVisibleCharacter(this.prisma, this.membership, userId, campaignId, characterId);
    return this.prisma.characterCondition.findMany({
      where: { characterId },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Aplicar y quitar: DM o dueño. Aplicar dos veces la misma clave la reemplaza, no la duplica. */
  async apply(userId: string, campaignId: string, characterId: string, input: ApplyConditionInput) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    await requireOwnerOrDM(
      this.membership,
      campaignId,
      userId,
      character,
      "Solo el DM o el dueño puede aplicar una condición.",
    );

    return this.prisma.transaction(async (tx) => {
      const condition = await tx.characterCondition.upsert({
        where: { characterId_key: { characterId, key: input.key } },
        create: {
          characterId,
          key: input.key,
          level: input.level ?? null,
          note: input.note ?? null,
          appliedById: userId,
        },
        update: {
          level: input.level ?? null,
          note: input.note ?? null,
          appliedById: userId,
        },
      });
      await this.events.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          subjectId: characterId,
          visibility: character.visibility,
          payload: {
            type: "CONDITION_APPLIED",
            key: input.key,
            level: input.level,
            reason: input.note,
          },
        },
        tx,
      );
      return condition;
    });
  }

  async remove(userId: string, campaignId: string, characterId: string, key: string) {
    const character = await requireVisibleCharacter(
      this.prisma,
      this.membership,
      userId,
      campaignId,
      characterId,
    );
    await requireOwnerOrDM(
      this.membership,
      campaignId,
      userId,
      character,
      "Solo el DM o el dueño puede quitar una condición.",
    );

    const existing = await this.prisma.characterCondition.findUnique({
      where: { characterId_key: { characterId, key } },
    });
    if (!existing) throw new NotFoundException("Condition not found");

    return this.prisma.transaction(async (tx) => {
      await tx.characterCondition.delete({ where: { id: existing.id } });
      await this.events.record(
        userId,
        campaignId,
        {
          subjectType: "character",
          subjectId: characterId,
          visibility: character.visibility,
          payload: { type: "CONDITION_REMOVED", key },
        },
        tx,
      );
      return { deleted: true };
    });
  }
}
