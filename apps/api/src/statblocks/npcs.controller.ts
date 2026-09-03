import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { instantiateNpcSchema, type InstantiateNpcInput } from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { NpcsService } from "./npcs.service";

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/npcs")
export class NpcsController {
  constructor(private readonly npcs: NpcsService) {}

  @Get()
  list(@Req() req: { user: { id: string } }, @Param("campaignId") campaignId: string) {
    return this.npcs.list(req.user.id, campaignId);
  }

  @Post()
  instanciar(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(instantiateNpcSchema)) body: InstantiateNpcInput,
  ) {
    return this.npcs.instanciar(req.user.id, campaignId, body);
  }
}
