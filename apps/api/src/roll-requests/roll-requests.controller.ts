import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import {
  createRollRequestSchema,
  listRollRequestsSchema,
  type CreateRollRequestInput,
  type ListRollRequestsInput,
} from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { RollRequestsService } from "./roll-requests.service";

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/roll-requests")
export class RollRequestsController {
  constructor(private readonly requests: RollRequestsService) {}

  /**
   * Lo que te han pedido. **Esto es lo que sondea la pantalla del jugador**: sin tiempo real, que
   * es la fase 4, y con el mismo criterio que ya usan el inventario y la sesión en curso.
   */
  @Get()
  list(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Query(new ZodValidationPipe(listRollRequestsSchema)) query: ListRollRequestsInput,
  ) {
    return this.requests.list(req.user.id, campaignId, query);
  }

  /** Pedir. Solo el DM, y lo impone el servicio. */
  @Post()
  create(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(createRollRequestSchema)) body: CreateRollRequestInput,
  ) {
    return this.requests.create(req.user.id, campaignId, body);
  }

  /**
   * Responderla tirando. **Sin cuerpo**: qué se tira, con qué CD y quién lo ve ya lo dijo el DM al
   * pedirla, y dejar que quien responde lo cambiara convertiría la petición en una sugerencia.
   */
  @Post(":requestId/roll")
  answer(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("requestId") requestId: string,
  ) {
    return this.requests.answer(req.user.id, campaignId, requestId);
  }
}
