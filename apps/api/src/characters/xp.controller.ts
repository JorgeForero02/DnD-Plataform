import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import { awardXpSchema, type AwardXpInput } from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { XpService } from "./xp.service";

// Puerta de efectos §5 bis (D-CF-68/D-CF-69, 2026-09-13). Única puerta HTTP para «Dar XP»: solo
// el DM, y `XpService.award` es quien decide el 400 de un PNJ de statblock.

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/xp")
export class XpController {
  constructor(private readonly xp: XpService) {}

  @Post()
  award(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(awardXpSchema)) body: AwardXpInput,
  ) {
    return this.xp.award(req.user.id, campaignId, body);
  }
}
