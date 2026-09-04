import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import {
  setInitiativeSchema,
  startEncounterSchema,
  type SetInitiativeInput,
  type StartEncounterInput,
} from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { EncountersService } from "./encounters.service";

// Tarea 2.5.2 — sin pantalla a propósito (§2.5.2 del spec de fase 2.5): esto lo consumirá la
// mesa de combate cuando exista (§2.5.6). Cuelga de la sesión, igual que `SessionsController`.
@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/sessions/:sessionId/encounters")
export class EncountersController {
  constructor(private readonly encounters: EncountersService) {}

  @Post()
  start(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("sessionId") sessionId: string,
    @Body(new ZodValidationPipe(startEncounterSchema)) body: StartEncounterInput,
  ) {
    return this.encounters.start(req.user.id, campaignId, sessionId, body);
  }

  @Get(":encounterId")
  get(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("sessionId") sessionId: string,
    @Param("encounterId") encounterId: string,
  ) {
    return this.encounters.get(req.user.id, campaignId, sessionId, encounterId);
  }

  @Patch(":encounterId/combatants/:combatantId")
  setInitiative(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("sessionId") sessionId: string,
    @Param("encounterId") encounterId: string,
    @Param("combatantId") combatantId: string,
    @Body(new ZodValidationPipe(setInitiativeSchema)) body: SetInitiativeInput,
  ) {
    return this.encounters.setInitiative(
      req.user.id,
      campaignId,
      sessionId,
      encounterId,
      combatantId,
      body,
    );
  }

  @Post(":encounterId/advance-turn")
  advanceTurn(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("sessionId") sessionId: string,
    @Param("encounterId") encounterId: string,
  ) {
    return this.encounters.advanceTurn(req.user.id, campaignId, sessionId, encounterId);
  }
}
