import { Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AbilityRollsService } from "./ability-rolls.service";

// Reglas de la mesa (D-CF-53, Tarea 3): `POST` tira las seis características con la expresión y
// el número de intentos que fijó el DM; `GET` lista los intentos ya tirados de un personaje.
@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/characters/:characterId/ability-rolls")
export class AbilityRollsController {
  constructor(private readonly abilityRolls: AbilityRollsService) {}

  @Post()
  roll(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
  ) {
    return this.abilityRolls.roll(req.user.id, campaignId, characterId);
  }

  @Get()
  list(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
  ) {
    return this.abilityRolls.list(req.user.id, campaignId, characterId);
  }
}
