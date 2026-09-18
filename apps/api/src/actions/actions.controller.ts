import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ActionsService } from "./actions.service";

// Tarea 1 del plan 3A.3 (T21). Una sola ruta, solo lectura: la escritura sigue yendo por las
// puertas de siempre (`activities/:key/use`, `attacks/:key/roll`, `inventory/:rowId/consume`…).
@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/characters/:characterId/actions")
export class ActionsController {
  constructor(private readonly actions: ActionsService) {}

  @Get()
  list(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
  ) {
    return this.actions.list(req.user.id, campaignId, characterId);
  }
}
