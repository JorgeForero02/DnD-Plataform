import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  changeHpSchema,
  deathSaveSchema,
  overridableKeySchema,
  setHpSchema,
  setOverrideSchema,
  rollAttackSchema,
  updateCharacterSheetSchema,
  type ChangeHpInput,
  type DeathSaveInput,
  type OverridableKey,
  type RollAttackInput,
  type SetHpInput,
  type SetOverrideInput,
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

  // --- Anulaciones manuales (solo DM; el servicio lo impone, no esta capa) ---

  @Put("overrides/:target")
  setOverride(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    // La clave va en la URL porque identifica el recurso; validarla con el mismo enum de
    // `@dnd/shared` evita que un `target` inventado llegue al servicio como texto libre.
    @Param("target", new ZodValidationPipe(overridableKeySchema)) target: OverridableKey,
    @Body(new ZodValidationPipe(setOverrideSchema)) body: SetOverrideInput,
  ) {
    return this.sheets.setOverride(req.user.id, campaignId, characterId, target, body);
  }

  @Delete("overrides/:target")
  clearOverride(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Param("target", new ZodValidationPipe(overridableKeySchema)) target: OverridableKey,
  ) {
    return this.sheets.clearOverride(req.user.id, campaignId, characterId, target);
  }

  /**
   * Tira con un arma equipada. **La expresión la compone el servidor** (2B/2C): aquí solo llega
   * qué ataque y qué mitad —el `1d20` o el daño—.
   */
  @Post("sheet/attacks/:attackKey/roll")
  rollAttack(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Param("attackKey") attackKey: string,
    @Body(new ZodValidationPipe(rollAttackSchema)) body: RollAttackInput,
  ) {
    return this.sheets.rollAttack(req.user.id, campaignId, characterId, attackKey, body);
  }
}
