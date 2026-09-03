import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import {
  createCampaignStatblockSchema,
  updateCampaignStatblockSchema,
  type CreateCampaignStatblockInput,
  type UpdateCampaignStatblockInput,
} from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { StatblocksService } from "./statblocks.service";

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/statblocks")
export class StatblocksController {
  constructor(private readonly statblocks: StatblocksService) {}

  @Get()
  list(@Req() req: { user: { id: string } }, @Param("campaignId") campaignId: string) {
    return this.statblocks.list(req.user.id, campaignId);
  }

  @Post()
  create(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(createCampaignStatblockSchema)) body: CreateCampaignStatblockInput,
  ) {
    return this.statblocks.create(req.user.id, campaignId, body);
  }

  @Put(":statblockId")
  update(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("statblockId") statblockId: string,
    @Body(new ZodValidationPipe(updateCampaignStatblockSchema)) body: UpdateCampaignStatblockInput,
  ) {
    return this.statblocks.update(req.user.id, campaignId, statblockId, body);
  }

  @Delete(":statblockId")
  remove(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("statblockId") statblockId: string,
  ) {
    return this.statblocks.remove(req.user.id, campaignId, statblockId);
  }
}
