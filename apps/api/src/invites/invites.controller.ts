import { Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { InvitesService } from "./invites.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Post("campaigns/:id/invites")
  create(@Req() req: { user: { id: string } }, @Param("id") id: string) {
    return this.invites.create(req.user.id, id);
  }

  @Post("invites/:token/accept")
  accept(@Req() req: { user: { id: string } }, @Param("token") token: string) {
    return this.invites.accept(token, req.user.id);
  }
}
