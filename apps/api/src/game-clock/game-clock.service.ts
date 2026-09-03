import { Injectable, NotFoundException } from "@nestjs/common";
import {
  RITMO_DE_VIAJE,
  salvacionesDeMarchaForzada,
  SEGUNDOS_POR_HORA,
  type AdvanceClockInput,
  type AdvanceClockResult,
  type ClockState,
} from "@dnd/shared";
import { MembershipService } from "../campaigns/membership.service";
import { vencidasEnElTramo } from "../character-state/conditions/vencimiento";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";

// Tarea 2C.3 — **el reloj de la campaña**.
//
// **Quién lo mueve: el DM y nadie más.** El tiempo de juego es una decisión de arbitraje —«pasan
// dos horas», «descansáis ocho»— y un jugador que pudiera adelantarlo apagaría solo las
// condiciones que le estorban. Leerlo lo puede cualquier miembro: saber qué hora es en el mundo
// no es información privilegiada.
//
// **El reloj no aplica efectos: los hace posibles.** Avanzarlo escribe su suceso y devuelve lo que
// haya que arbitrar (las salvaciones de una marcha forzada). Quien caduca condiciones al pasar el
// tiempo es 2C.4, leyendo este contador.

@Injectable()
export class GameClockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: GameEventsService,
  ) {}

  /** Qué hora es en el mundo. Cualquier miembro puede mirar el reloj. */
  async read(userId: string, campaignId: string): Promise<ClockState> {
    await this.membership.requireMember(campaignId, userId);
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException("Campaign not found");
    return { seconds: campaign.clockSeconds };
  }

  async advance(
    userId: string,
    campaignId: string,
    input: AdvanceClockInput,
  ): Promise<AdvanceClockResult> {
    await this.membership.requireDM(campaignId, userId);

    const segundos = input.kind === "TIME" ? input.seconds : input.hours * SEGUNDOS_POR_HORA;
    const ritmo = input.kind === "TRAVEL" ? RITMO_DE_VIAJE[input.pace] : null;
    const millas = ritmo && input.kind === "TRAVEL" ? ritmo.milesPerHour * input.hours : undefined;

    return this.prisma.transaction(async (tx) => {
      // **La lectura y la escritura van dentro de la transacción**, y el `increment` es del motor
      // de base de datos y no un `to = from + n` calculado aquí: dos avances a la vez —el DM en
      // dos pestañas, o una regla que dispare otro— perderían uno de los dos si el número se
      // compusiera en memoria.
      const antes = await tx.campaign.findUnique({ where: { id: campaignId } });
      if (!antes) throw new NotFoundException("Campaign not found");
      const despues = await tx.campaign.update({
        where: { id: campaignId },
        data: { clockSeconds: { increment: segundos } },
      });

      const evento = await this.events.record(
        userId,
        campaignId,
        {
          subjectType: "campaign",
          subjectId: campaignId,
          // **El reloj es público dentro de la campaña.** Que el tiempo pase no es un secreto del
          // DM: si lo fuera, un jugador vería caducar sus condiciones sin saber por qué, que es
          // exactamente lo que 2C.4 existe para evitar.
          visibility: "PLAYERS",
          payload: {
            type: "CLOCK_ADVANCED",
            seconds: segundos,
            from: antes.clockSeconds,
            to: despues.clockSeconds,
            ...(input.kind === "TRAVEL" ? { pace: input.pace } : {}),
            ...(millas !== undefined ? { miles: millas } : {}),
            ...(input.reason ? { reason: input.reason } : {}),
          },
        },
        tx,
      );

      // **Las condiciones que acaban de vencer se anuncian** (2C.4). No se borran ni se marcan en
      // la base —si están vencidas es una resta contra el reloj, y guardarlo sería una segunda
      // verdad—; lo que se escribe es el suceso, que es lo que hace que el jugador vea **por qué**
      // dejó de estar envenenado en vez de encontrarse un número distinto.
      //
      // El tramo es abierto por la izquierda y cerrado por la derecha, así que un avance no
      // vuelve a anunciar lo que el anterior ya anunció.
      const candidatas = await tx.characterCondition.findMany({
        where: {
          expiresAtClock: { gt: antes.clockSeconds, lte: despues.clockSeconds },
          character: { campaignId },
        },
        select: {
          key: true,
          level: true,
          expiresAtClock: true,
          characterId: true,
          // **La visibilidad del personaje viaja con la condición**, y la revisión de seguridad
          // explicó por qué: el suceso se escribía siempre `PLAYERS`, así que la condición vencida
          // de un PNJ `DM_ONLY` anunciaba a toda la mesa que ese PNJ existe y qué le pasaba.
          character: { select: { visibility: true } },
        },
      });
      for (const vencida of vencidasEnElTramo(
        candidatas,
        antes.clockSeconds,
        despues.clockSeconds,
      )) {
        await this.events.record(
          userId,
          campaignId,
          {
            subjectType: "character",
            subjectId: vencida.characterId,
            // **La misma visibilidad que el personaje**, igual que hacen aplicar y quitar una
            // condición (`conditions.service.ts`). El argumento de que la caducidad se ve —para no
            // dejar al jugador con el «qué» y sin el «por qué»— vale para el personaje de un
            // jugador, que es `PLAYERS`; escrito fijo, se aplicaba también a los PNJ del DM.
            visibility: vencida.character.visibility,
            payload: {
              type: "CONDITION_EXPIRED",
              key: vencida.key,
              ...(vencida.level !== null ? { level: vencida.level } : {}),
              expiredAtClock: vencida.expiresAtClock!,
            },
          },
          tx,
        );
      }

      return {
        from: antes.clockSeconds,
        to: despues.clockSeconds,
        seconds: segundos,
        eventId: evento.id,
        ...(input.kind === "TRAVEL" ? { pace: input.pace } : {}),
        ...(millas !== undefined ? { miles: millas } : {}),
        ...(ritmo && ritmo.passivePerception !== 0
          ? { passivePerception: ritmo.passivePerception }
          : {}),
        // **Las tiradas que hay que pedir, no las tiradas.** El SRD manda una salvación de
        // Constitución por cada hora pasada de ocho, con CD 10 + 1 por hora extra; quién tira y
        // qué pasa después es de la mesa.
        forcedMarchSaves: input.kind === "TRAVEL" ? salvacionesDeMarchaForzada(input.hours) : [],
      };
    });
  }
}
