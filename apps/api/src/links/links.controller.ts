import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { createEntityLinkSchema, CreateEntityLinkInput } from "@dnd/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { LinksService } from "./links.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class LinksController {
  constructor(private readonly links: LinksService) {}

  @Post("entities/:entityId/links")
  create(
    @Req() req: { user: { id: string } },
    @Param("entityId") entityId: string,
    @Body(new ZodValidationPipe(createEntityLinkSchema)) body: CreateEntityLinkInput,
  ) {
    return this.links.create(req.user.id, entityId, body);
  }

  @Get("entities/:entityId/links")
  list(@Req() req: { user: { id: string } }, @Param("entityId") entityId: string) {
    return this.links.listFor(req.user.id, entityId);
  }

  // Task 22: una sola llamada para todos los enlaces de la campaña, en vez de una por ficha.
  @Get("campaigns/:campaignId/links")
  listForCampaign(@Req() req: { user: { id: string } }, @Param("campaignId") campaignId: string) {
    return this.links.listForCampaign(req.user.id, campaignId);
  }

  @Delete("links/:linkId")
  remove(@Req() req: { user: { id: string } }, @Param("linkId") linkId: string) {
    return this.links.remove(req.user.id, linkId);
  }
}
