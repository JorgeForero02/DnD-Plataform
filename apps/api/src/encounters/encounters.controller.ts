import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  setInitiativeSchema,
  startEncounterSchema,
  type SetInitiativeInput,
  type StartEncounterInput,
} from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { EncountersService } from "./encounters.service";

// Tarea 2.5.2 — cuelga de la sesión, igual que `SessionsController`. Nació sin pantalla a
// propósito (§2.5.2 del spec de fase 2.5); **2.5.6 es la pantalla**, y trajo consigo las dos
// puertas que faltaban para que pudiera existir: `current` y `end`.
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

  /**
   * **Antes que `:encounterId`, y el orden importa.** Nest empareja las rutas en el orden en que
   * se declaran: con `@Get(":encounterId")` arriba, una petición a `.../current` entraría por ahí
   * con `encounterId = "current"` y contestaría un 404 desconcertante.
   */
  @Get("current")
  current(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("sessionId") sessionId: string,
  ) {
    return this.encounters.current(req.user.id, campaignId, sessionId);
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

  @Post(":encounterId/end")
  end(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("sessionId") sessionId: string,
    @Param("encounterId") encounterId: string,
  ) {
    return this.encounters.end(req.user.id, campaignId, sessionId, encounterId);
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

  /**
   * Tarea 4 — el DM empieza sin esperar a quien no ha tirado.
   */
  @Post(":encounterId/force-start")
  forceStart(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("sessionId") sessionId: string,
    @Param("encounterId") encounterId: string,
  ) {
    return this.encounters.forceStart(req.user.id, campaignId, sessionId, encounterId);
  }

  /**
   * Tarea 4 — cancelar un combate que nunca empezó. Solo `PREPARING`; uno `ACTIVE` se termina
   * con `POST .../end`, no se borra.
   */
  @Delete(":encounterId")
  @HttpCode(204)
  cancel(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("sessionId") sessionId: string,
    @Param("encounterId") encounterId: string,
  ) {
    return this.encounters.cancel(req.user.id, campaignId, sessionId, encounterId);
  }
}
