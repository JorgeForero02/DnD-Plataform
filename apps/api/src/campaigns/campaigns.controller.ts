import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { createCampaignSchema, updateCampaignSchema, UpdateCampaignInput } from "@dnd/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CampaignsService } from "./campaigns.service";

@UseGuards(JwtAuthGuard)
@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Post()
  create(
    @Req() req: { user: { id: string } },
    @Body(new ZodValidationPipe(createCampaignSchema)) body: { name: string; description?: string },
  ) {
    return this.campaigns.create(req.user.id, body);
  }

  @Get()
  list(@Req() req: { user: { id: string } }) {
    return this.campaigns.listForUser(req.user.id);
  }

  @Get(":id")
  get(@Req() req: { user: { id: string } }, @Param("id") id: string) {
    return this.campaigns.getById(req.user.id, id);
  }

  @Get(":id/members")
  listMembers(@Req() req: { user: { id: string } }, @Param("id") id: string) {
    return this.campaigns.listMembers(req.user.id, id);
  }

  @Patch(":id")
  update(
    @Req() req: { user: { id: string } },
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateCampaignSchema)) body: UpdateCampaignInput,
  ) {
    return this.campaigns.update(req.user.id, id, body);
  }

  @Delete(":id")
  remove(@Req() req: { user: { id: string } }, @Param("id") id: string) {
    return this.campaigns.remove(req.user.id, id);
  }

  @Delete(":id/members/:userId")
  removeMember(
    @Req() req: { user: { id: string } },
    @Param("id") id: string,
    @Param("userId") userId: string,
  ) {
    return this.campaigns.removeMember(req.user.id, id, userId);
  }
}
