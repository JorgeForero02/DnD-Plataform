import { Injectable } from "@nestjs/common";
import type { ChangeMemberRoleInput } from "@dnd/shared";
import { MembershipService } from "../campaigns/membership.service";
import { GameEventsService } from "../game-events/game-events.service";
import { PrismaService } from "../prisma/prisma.service";

// Plan 11, ficha D2 — **el papel de un miembro se puede cambiar, y queda escrito.**
//
// ## Por qué esto es un módulo y no dos líneas en `campaigns`
//
// El cambio de papel tiene que **dejar rastro en el registro**: es un cambio de permisos, y sin
// suceso un DM podría ascender a alguien y nadie lo sabría nunca.
//
// Pero `GameEventsModule` **importa `CampaignsModule`** —su controlador necesita la membresía para
// filtrar—, así que meter `GameEventsService` dentro de `CampaignsService` habría creado un ciclo
// que Nest solo resuelve con `forwardRef`, y este proyecto ya declaró que eso es **esconder el
// ciclo en vez de quitarlo** (`game-events.service.ts`, sobre el motor de reglas).
//
// Con un módulo propio el grafo se queda dirigido: `members` → `campaigns`, y `members` →
// `game-events` → `campaigns`. Nadie apunta hacia atrás.
//
// **La regla de autorización sigue viviendo en `MembershipService`**, que es su dueño único: aquí
// solo se compone el gesto con su rastro.

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
    private readonly gameEvents: GameEventsService,
  ) {}

  async changeRole(
    userId: string,
    campaignId: string,
    targetUserId: string,
    input: ChangeMemberRoleInput,
  ) {
    const cambio = await this.membership.changeRole(campaignId, userId, targetUserId, input.role);

    // Sin cambio real no hay nada que contar: repetir el gesto es idempotente y silencioso, y un
    // registro lleno de «pasó de jugador a jugador» es un registro que nadie lee.
    if (cambio.from !== cambio.to) {
      const quien = await this.prisma.user.findUnique({ where: { id: targetUserId } });
      await this.gameEvents.record(userId, campaignId, {
        subjectType: "campaign",
        subjectId: campaignId,
        // **`PLAYERS`, no `DM_ONLY`**: quién dirige la mesa no es un secreto del DM, y la pantalla
        // de miembros ya lo enseña a todos. Esconderlo en el registro sería contar dos versiones
        // del mismo hecho — el error que ya se corrigió en `MEMBER_JOINED`.
        visibility: "PLAYERS",
        payload: {
          type: "MEMBER_ROLE_CHANGED",
          ...(quien?.displayName ? { displayName: quien.displayName } : {}),
          from: cambio.from,
          to: cambio.to,
        },
      });
    }
    return cambio;
  }
}
