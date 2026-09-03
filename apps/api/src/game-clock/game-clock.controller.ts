import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { advanceClockSchema, type AdvanceClockInput } from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { GameClockService } from "./game-clock.service";

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/clock")
export class GameClockController {
  constructor(private readonly clock: GameClockService) {}

  /** Qué hora es en el mundo. Cualquier miembro. */
  @Get()
  read(@Req() req: { user: { id: string } }, @Param("campaignId") campaignId: string) {
    return this.clock.read(req.user.id, campaignId);
  }

  /**
   * Avanzar el reloj. **Solo el DM**, y lo impone el servicio, no esta capa.
   *
   * `POST` y no `PATCH` con el valor nuevo: el reloj **no se fija, se avanza**. Dejar escribir el
   * valor absoluto convertiría dos avances simultáneos en uno perdido, y permitiría retroceder el
   * tiempo — que no es una operación que ninguna mesa quiera de verdad, y sí una forma de que
   * caduque algo dos veces.
   */
  @Post("advance")
  advance(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(advanceClockSchema)) body: AdvanceClockInput,
  ) {
    return this.clock.advance(req.user.id, campaignId, body);
  }
}
