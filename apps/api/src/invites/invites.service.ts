import { BadRequestException, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly events: EventEmitter2,
    private readonly gameEvents: GameEventsService,
  ) {}

  async create(dmUserId: string, campaignId: string) {
    await this.membership.requireDM(campaignId, dmUserId);
    return this.prisma.invite.create({
      data: { campaignId, token: randomBytes(24).toString("hex") },
    });
  }

  async accept(token: string, userId: string) {
    const invite = await this.prisma.invite.findUnique({ where: { token } });
    if (!invite || invite.usedAt) {
      throw new BadRequestException("Invalid or already-used invite");
    }
    const member = await this.prisma.campaignMember.upsert({
      where: { campaignId_userId: { campaignId: invite.campaignId, userId } },
      create: { campaignId: invite.campaignId, userId, role: invite.role },
      update: {},
    });
    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });
    this.events.emit("campaign.member_joined", { campaignId: invite.campaignId, userId });

    // **Y ademas queda en la linea de tiempo.** El emisor de arriba es interno —lo escucha
    // `notifications`— y el motor de reglas no lo oye: escucha `game_event.recorded`. Sin este
    // registro, `MEMBER_JOINED` estaba en el vocabulario del editor y no se disparaba jamas.
    //
    // **`PLAYERS`, no `DM_ONLY`**: que alguien se siente a la mesa no es un secreto del DM, y la
    // pantalla de miembros ya lo ensena a todos. Esconderlo en el registro seria contar dos
    // versiones distintas del mismo hecho.
    const quien = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.gameEvents.record(userId, invite.campaignId, {
      subjectType: "campaign",
      subjectId: invite.campaignId,
      visibility: "PLAYERS",
      payload: {
        type: "MEMBER_JOINED",
        ...(quien?.displayName ? { displayName: quien.displayName } : {}),
        role: member.role,
      },
    });
    return { campaignId: invite.campaignId, role: member.role };
  }
}
