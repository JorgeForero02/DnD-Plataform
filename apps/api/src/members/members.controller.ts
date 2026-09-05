import { Body, Controller, Param, Patch, Req, UseGuards } from "@nestjs/common";
import { changeMemberRoleSchema, type ChangeMemberRoleInput } from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { MembersService } from "./members.service";

// La ruta que faltaba (plan 11, D2). Vive aquí y no en `CampaignsController` por el ciclo de
// módulos que explica `members.service.ts`; la URL es la que le corresponde a un miembro y no
// cambia por eso.
@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/members")
export class MembersController {
  constructor(private readonly members: MembersService) {}

  /**
   * **`PATCH` y no `PUT`**: se cambia el papel, no se reescribe el miembro. Y solo el DM — lo
   * impone `MembershipService.changeRole`, que es el dueño único de esa regla.
   */
  @Patch(":userId")
  changeRole(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("userId") userId: string,
    @Body(new ZodValidationPipe(changeMemberRoleSchema)) body: ChangeMemberRoleInput,
  ) {
    return this.members.changeRole(req.user.id, campaignId, userId, body);
  }
}
