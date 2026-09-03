import { Injectable, NotFoundException } from "@nestjs/common";
import type { ApplyConditionInput } from "@dnd/shared";
import { condicionVencida } from "./vencimiento";
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

  /**
   * Las condiciones del personaje, **cada una diciendo si ya venció** (2C.4).
   *
   * `expired` se calcula contra el reloj de la campaña y **no se guarda**: guardarlo sería una
   * segunda verdad que puede discrepar de la primera, y obligaría a un barrido periódico que, si
   * no corre, dejaría una condición frenando a alguien después de su hora.
   *
   * **Y la vencida sigue en la lista.** Es la decisión D-2C-2 del autor: vence sola, pero no
   * desaparece — queda marcada, y el DM la retira o la renueva. Si se borrara, el jugador vería
   * cambiar sus números sin saber por qué.
   */
  async list(userId: string, campaignId: string, characterId: string) {
    await requireVisibleCharacter(this.prisma, this.membership, userId, campaignId, characterId);
    const [filas, campana] = await Promise.all([
      this.prisma.characterCondition.findMany({
        where: { characterId },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } }),
    ]);
    return filas.map((fila) => ({
      ...fila,
      expired: condicionVencida(fila, campana.clockSeconds),
    }));
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
      // **El vencimiento se guarda absoluto, no como una duración.** Guardar «dura una hora»
      // obligaría a saber desde cuándo, y ese «desde cuándo» es otra columna que puede
      // discrepar; con el instante en que vence, la pregunta «¿sigue viva?» es una resta contra
      // el reloj y no hay dos datos que mantener de acuerdo. Se calcula **al aplicarla**, con el
      // reloj de ese momento: renovar una condición es volver a aplicarla, que es lo que hace un
      // DM en la mesa.
      const campana = await tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });
      const expiresAtClock =
        input.durationSeconds === undefined ? null : campana.clockSeconds + input.durationSeconds;

      const condition = await tx.characterCondition.upsert({
        where: { characterId_key: { characterId, key: input.key } },
        create: {
          characterId,
          key: input.key,
          level: input.level ?? null,
          note: input.note ?? null,
          appliedById: userId,
          expiresAtClock,
        },
        update: {
          level: input.level ?? null,
          note: input.note ?? null,
          appliedById: userId,
          // **Se escribe siempre, también cuando es `null`.** Volver a aplicar una condición sin
          // duración tiene que dejarla indefinida: si el `null` no se escribiera, heredaría en
          // silencio la caducidad de la vez anterior y se apagaría sola sin que nadie lo pidiera.
          expiresAtClock,
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
