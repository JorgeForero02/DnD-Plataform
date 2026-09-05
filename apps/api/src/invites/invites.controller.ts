import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { createInviteSchema, type CreateInviteInput } from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AUTH_RATE_LIMIT, RATE_LIMIT_WINDOW_MS } from "../common/rate-limit.constants";
import { InvitesService } from "./invites.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Post("campaigns/:id/invites")
  create(
    @Req() req: { user: { id: string } },
    @Param("id") id: string,
    @Body(new ZodValidationPipe(createInviteSchema)) body: CreateInviteInput,
  ) {
    return this.invites.create(req.user.id, id, body);
  }

  /**
   * **Los enlaces repartidos** (plan 11, D3b). Solo el DM: es la lista de las llaves de su mesa.
   */
  @Get("campaigns/:id/invites")
  list(@Req() req: { user: { id: string } }, @Param("id") id: string) {
    return this.invites.list(req.user.id, id);
  }

  /**
   * **Revocar** uno. Cuelga de `/invites/:id` y no de la campaña porque el identificador ya la
   * determina, y pedir las dos cosas invitaría a que discreparan.
   */
  @Delete("invites/:id")
  revoke(@Req() req: { user: { id: string } }, @Param("id") id: string) {
    return this.invites.revoke(req.user.id, id);
  }

  // Strict per-IP limit (hallazgo 3): brute force against invite tokens.
  @Throttle({ default: { limit: AUTH_RATE_LIMIT, ttl: RATE_LIMIT_WINDOW_MS } })
  @Post("invites/:token/accept")
  accept(@Req() req: { user: { id: string } }, @Param("token") token: string) {
    return this.invites.accept(token, req.user.id);
  }
}
