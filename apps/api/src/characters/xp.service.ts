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
      select: { id: true, name: true, visibility: true, statblockRef: true },
    });
    if (personajes.length !== input.characterIds.length) {
      throw new NotFoundException("Alguno de esos personajes no está en esta campaña.");
    }
    // D-CF-69: un PNJ de statblock no tiene nivel al que avanzar (sus números salen del VD).
    const deStatblock = personajes.filter((p) => p.statblockRef);
    if (deStatblock.length > 0) {
      throw new BadRequestException("Un PNJ de statblock no acumula XP: sus números salen del VD.");
    }

    // **Orden fijo, por `id`, no el que mandó el cliente** — mismo criterio que
    // `destinatariosOrdenados` en `ActivitiesService`: cada fila se bloquea con `FOR UPDATE` en
    // este mismo bucle, y dos peticiones concurrentes con los mismos personajes en orden inverso
    // (`["X","Y"]` y `["Y","X"]`) tomarían esos candados cruzados — interbloqueo de Postgres, no
    // solo una carrera.
    const personajesOrdenados = [...personajes].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    );

    return this.prisma.transaction(async (tx) => {
      const awarded: { characterId: string; xp: number }[] = [];
      for (const p of personajesOrdenados) {
        // **La suma la hace la base, en la misma sentencia que escribe** (ola de arreglos 1,
        // Important 2 de la revisión de API). Leer `xp` fuera de la transacción y escribir el
        // absoluto dentro perdía una de dos concesiones concurrentes —el DM confirmando la
        // propuesta del combate en una pestaña y dando un premio a mano en otra— y el `xpTotal`
        // del segundo suceso mentía. `GREATEST(0, …)` es la regla de siempre: XP nunca baja de 0,
        // un premio negativo corrige un error del DM, no lo lleva a deuda. La fila anterior se
        // lee en el mismo `UPDATE` (CTE con `FOR UPDATE`, el patrón de `changeHpEnTransaccion`)
        // para que el `amount` del suceso sea el delta EFECTIVO —igual que `HP_CHANGED` escribe
        // el delta reducido, no el bruto—: con 20 PX y un −50, la crónica dice «pierde 20», no
        // «pierde 50».
        const filas = await tx.$queryRaw<{ xp: number; xpAntes: number }[]>`
          WITH antes AS (
            SELECT xp FROM "Character" WHERE id = ${p.id} AND "campaignId" = ${campaignId} FOR UPDATE
          )
          UPDATE "Character" c
          SET xp = GREATEST(0, c.xp + ${input.amount})
          FROM antes
          WHERE c.id = ${p.id}
          RETURNING c.xp AS xp, antes.xp AS "xpAntes"
        `;
        const fila = filas[0];
        if (!fila)
          throw new NotFoundException("Alguno de esos personajes no está en esta campaña.");
        const xp = fila.xp;
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
              amount: xp - fila.xpAntes,
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
