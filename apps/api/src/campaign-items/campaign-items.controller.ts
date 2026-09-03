import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import {
  createCampaignItemSchema,
  updateCampaignItemSchema,
  CreateCampaignItemInput,
  UpdateCampaignItemInput,
} from "@dnd/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CampaignItemsService } from "./campaign-items.service";

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/items")
export class CampaignItemsController {
  constructor(private readonly items: CampaignItemsService) {}

  @Post()
  create(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(createCampaignItemSchema)) body: CreateCampaignItemInput,
  ) {
    return this.items.create(req.user.id, campaignId, body);
  }

  @Get()
  list(@Req() req: { user: { id: string } }, @Param("campaignId") campaignId: string) {
    return this.items.list(req.user.id, campaignId);
  }

  @Get(":itemId")
  get(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("itemId") itemId: string,
  ) {
    return this.items.get(req.user.id, campaignId, itemId);
  }

  @Patch(":itemId")
  update(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("itemId") itemId: string,
    @Body(new ZodValidationPipe(updateCampaignItemSchema)) body: UpdateCampaignItemInput,
  ) {
    return this.items.update(req.user.id, campaignId, itemId, body);
  }

  @Delete(":itemId")
  remove(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("itemId") itemId: string,
  ) {
    return this.items.remove(req.user.id, campaignId, itemId);
  }
}
