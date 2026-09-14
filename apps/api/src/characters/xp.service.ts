import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { AwardXpInput } from "@dnd/shared";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";

// Puerta de efectos §5 bis (D-CF-68/D-CF-69, 2026-09-13). **Dar XP es del DM, siempre, y nunca a
// un PNJ de statblock**: sin `classKey`/`level` (D-2D-2, `schema.prisma:667-669`) no hay nivel al
// que avanzar ni umbral que cruzar, así que acumular XP no significaría nada. El servidor lo
// rechaza con 400 ANTES de escribir nada — ni siquiera a los personajes de verdad que vinieran en
// la misma llamada — porque una petición que reparte a medias no es la que el DM pidió.

@Injectable()
export class XpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
  ) {}

  async award(userId: string, campaignId: string, input: AwardXpInput) {
    await this.membership.requireDM(campaignId, userId);
    const personajes = await this.prisma.character.findMany({
      where: { id: { in: input.characterIds }, campaignId, archivedAt: null },
      select: { id: true, name: true, xp: true, visibility: true, statblockRef: true },
    });
    if (personajes.length !== input.characterIds.length) {
      throw new NotFoundException("Alguno de esos personajes no está en esta campaña.");
    }
    // D-CF-69: un PNJ de statblock no tiene nivel al que avanzar (sus números salen del VD).
    const deStatblock = personajes.filter((p) => p.statblockRef);
    if (deStatblock.length > 0) {
      throw new BadRequestException("Un PNJ de statblock no acumula XP: sus números salen del VD.");
    }

    return this.prisma.transaction(async (tx) => {
      const awarded: { characterId: string; xp: number }[] = [];
      for (const p of personajes) {
        // XP nunca baja de 0: un premio negativo corrige un error del DM, no lo lleva a deuda.
        const xp = Math.max(0, p.xp + input.amount);
        await tx.character.update({ where: { id: p.id }, data: { xp } });
        await this.events.record(
          userId,
          campaignId,
          {
            subjectType: "character",
            subjectId: p.id,
            visibility: p.visibility,
            payload: {
              type: "XP_AWARDED",
              characterId: p.id,
              amount: input.amount,
              xpTotal: xp,
              ...(input.reason ? { reason: input.reason } : {}),
            },
          },
          tx,
        );
        awarded.push({ characterId: p.id, xp });
      }
      return { awarded };
    });
  }
}
