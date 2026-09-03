import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import {
  createRollSchema,
  listRollsSchema,
  type CreateRollInput,
  type ListRollsInput,
} from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { RollsService } from "./rolls.service";

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/rolls")
export class RollsController {
  constructor(private readonly rolls: RollsService) {}

  /**
   * El registro de tiradas (2C.1).
   *
   * Aquí ponía «solo POST: una tirada es un `GameEvent` y el log ya se lee por
   * `GET /campaigns/:id/events`». El razonamiento era bueno y la conclusión, corta: **la mesa
   * pregunta «¿qué se tiró en esta sesión?»** y responder eso leyendo el log entero a mano no es
   * responderlo. Lo que sigue en pie es el motivo de fondo —no puede haber dos matrices de
   * visibilidad—, y por eso este `GET` **no lee la base**: llama a `GameEventsService.list`
   * acotado a los tipos de tirada. Un camino más, la misma puerta.
   */
  @Get()
  list(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Query(new ZodValidationPipe(listRollsSchema)) query: ListRollsInput,
  ) {
    return this.rolls.list(req.user.id, campaignId, query);
  }

  @Post()
  roll(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(createRollSchema)) body: CreateRollInput,
  ) {
    return this.rolls.roll(req.user.id, campaignId, body);
  }
}
