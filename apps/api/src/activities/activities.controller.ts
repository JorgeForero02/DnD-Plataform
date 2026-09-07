import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import { usarActividadSchema, type UsarActividadInput } from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ActivitiesService } from "./activities.service";

// Tarea A7 (paso 2). Mismo patrón que `resources.controller.ts` y `conditions.controller.ts`:
// la clave de la actividad va en la URL, y el cuerpo solo trae lo que decide quien la usa.

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/characters/:characterId/activities")
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Post(":activityKey/use")
  usar(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Param("activityKey") activityKey: string,
    @Body(new ZodValidationPipe(usarActividadSchema)) body: UsarActividadInput,
  ) {
    return this.activities.usar(req.user.id, campaignId, characterId, activityKey, body);
  }
}
