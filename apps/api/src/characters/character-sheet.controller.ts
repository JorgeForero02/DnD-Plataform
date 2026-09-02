import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import {
  changeHpSchema,
  deathSaveSchema,
  setHpSchema,
  updateCharacterSheetSchema,
  type ChangeHpInput,
  type DeathSaveInput,
  type SetHpInput,
  type UpdateCharacterSheetInput,
} from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { CharacterSheetService } from "./character-sheet.service";

// Tareas 2A.6 y 2A.7 — la hoja calculada y los PG mutables, en su propio controlador: son
// endpoints que cuelgan de un personaje ya existente y no del CRUD de `CharactersController`.

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/characters/:characterId")
export class CharacterSheetController {
  constructor(private readonly sheets: CharacterSheetService) {}

  @Get("sheet")
  getSheet(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
  ) {
    return this.sheets.getSheet(req.user.id, campaignId, characterId);
  }

  @Patch("sheet")
  updateSheet(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Body(new ZodValidationPipe(updateCharacterSheetSchema)) body: UpdateCharacterSheetInput,
  ) {
    return this.sheets.updateSheet(req.user.id, campaignId, characterId, body);
  }

  @Post("hp")
  changeHp(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Body(new ZodValidationPipe(changeHpSchema)) body: ChangeHpInput,
  ) {
    return this.sheets.changeHp(req.user.id, campaignId, characterId, body);
  }

  @Patch("hp")
  setHp(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Body(new ZodValidationPipe(setHpSchema)) body: SetHpInput,
  ) {
    return this.sheets.setHp(req.user.id, campaignId, characterId, body);
  }

  @Post("death-saves")
  rollDeathSave(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Body(new ZodValidationPipe(deathSaveSchema)) body: DeathSaveInput,
  ) {
    return this.sheets.rollDeathSave(req.user.id, campaignId, characterId, body);
  }
}
