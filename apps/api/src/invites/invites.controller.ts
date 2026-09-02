import { Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AUTH_RATE_LIMIT, RATE_LIMIT_WINDOW_MS } from "../common/rate-limit.constants";
import { InvitesService } from "./invites.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Post("campaigns/:id/invites")
  create(@Req() req: { user: { id: string } }, @Param("id") id: string) {
    return this.invites.create(req.user.id, id);
  }

  // Strict per-IP limit (hallazgo 3): brute force against invite tokens.
  @Throttle({ default: { limit: AUTH_RATE_LIMIT, ttl: RATE_LIMIT_WINDOW_MS } })
  @Post("invites/:token/accept")
  accept(@Req() req: { user: { id: string } }, @Param("token") token: string) {
    return this.invites.accept(token, req.user.id);
  }
}
