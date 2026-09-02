import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import { createRollSchema, type CreateRollInput } from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { RollsService } from "./rolls.service";

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/rolls")
export class RollsController {
  constructor(private readonly rolls: RollsService) {}

  // **Solo POST.** No hay `GET /rolls`: una tirada es un `GameEvent`, y el log ya se lee por
  // `GET /campaigns/:id/events`, filtrado por `canView`. Un segundo camino de lectura sería una
  // segunda matriz de visibilidad que mantener.
  @Post()
  roll(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(createRollSchema)) body: CreateRollInput,
  ) {
    return this.rolls.roll(req.user.id, campaignId, body);
  }
}
