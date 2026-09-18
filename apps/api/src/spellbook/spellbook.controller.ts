import { Body, Controller, Get, Param, Put, Req, UseGuards } from "@nestjs/common";
import { setCharacterSpellSchema, type SetCharacterSpellInput } from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { SpellbookService } from "./spellbook.service";

// Tarea 3A.2 (Task 3, T10). Mismo patrón que `activities.controller.ts`: `GET` para quien puede
// VER el personaje, `PUT` (dueño o DM) para cambiar un conjuro — la clave va en la URL, el
// cuerpo solo trae el estado nuevo.

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/characters/:characterId/spellbook")
export class SpellbookController {
  constructor(private readonly spellbook: SpellbookService) {}

  @Get()
  list(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
  ) {
    return this.spellbook.list(req.user.id, campaignId, characterId);
  }

  @Put(":spellKey")
  setEstado(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Param("spellKey") spellKey: string,
    @Body(new ZodValidationPipe(setCharacterSpellSchema)) body: SetCharacterSpellInput,
  ) {
    return this.spellbook.setEstado(req.user.id, campaignId, characterId, spellKey, body);
  }
}
