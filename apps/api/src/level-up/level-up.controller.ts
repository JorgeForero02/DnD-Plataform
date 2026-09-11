import { Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { LevelUpService } from "./level-up.service";
import { levelUpPreviewQuerySchema, type LevelUpPreviewQuery } from "@dnd/shared";

// Tarea 2A.9 — cuelga de un personaje ya existente, igual que `CharacterSheetController`
// (2A.6/2A.7): son endpoints de un personaje, no del CRUD de `CharactersController`.

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/characters/:characterId/level-up")
export class LevelUpController {
  constructor(private readonly levelUp: LevelUpService) {}

  @Get("preview")
  preview(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Query(new ZodValidationPipe(levelUpPreviewQuerySchema)) query: LevelUpPreviewQuery,
  ) {
    return this.levelUp.preview(req.user.id, campaignId, characterId, query.roll ?? false);
  }

  @Post()
  apply(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
  ) {
    return this.levelUp.apply(req.user.id, campaignId, characterId);
  }
}
