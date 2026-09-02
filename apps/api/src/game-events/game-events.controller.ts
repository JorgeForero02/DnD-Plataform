import { Controller, Get, Param, Query, Req, UseGuards } from "@nestjs/common";
import { listGameEventsSchema, type ListGameEventsInput } from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { GameEventsService } from "./game-events.service";

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/events")
export class GameEventsController {
  constructor(private readonly events: GameEventsService) {}

  // Solo lectura. **No hay POST**: un evento nace del cambio que lo provoca, nunca suelto —
  // dejar escribir en el log a mano permitiría inventar una historia que no ocurrió.
  @Get()
  list(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Query(new ZodValidationPipe(listGameEventsSchema)) query: ListGameEventsInput,
  ) {
    return this.events.list(req.user.id, campaignId, query);
  }
}
