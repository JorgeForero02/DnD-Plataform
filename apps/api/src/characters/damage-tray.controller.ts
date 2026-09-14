import { Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CharacterSheetService } from "./character-sheet.service";

// Tarea 3 de la puerta de efectos (spec §4 bis §4b.4-§4b.7, E-PE-2). **La bandeja de daño**: el
// daño de un ataque RESUELTO —§4b.4 lo llama `pendingDamage`— cuelga de la tirada que lo produjo,
// y este controlador es la única puerta HTTP para mirarlo (`damage-preview`, sin cuerpo) y para
// aplicarlo (`apply-damage`, sin cuerpo tampoco: todo lo que hace falta ya está en la tirada
// citada por la URL). Ninguna de las dos rutas cruza directamente la segunda puerta de efectos
// (el método de `CharacterSheetService` que muta PG sin volver a autorizar, ver su propio
// comentario) — las dos puertas de efecto siguen sin ruta propia
// (`__tests__/puertas-sin-ruta.spec.ts`); lo que este controlador toca es
// `CharacterSheetService.damagePreview`/`applyPendingDamage`, que por dentro sí la cruzan.

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/rolls/:rollEventId")
export class DamageTrayController {
  constructor(private readonly sheets: CharacterSheetService) {}

  @Get("damage-preview")
  damagePreview(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("rollEventId") rollEventId: string,
  ) {
    return this.sheets.damagePreview(req.user.id, campaignId, rollEventId);
  }

  @Post("apply-damage")
  applyDamage(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("rollEventId") rollEventId: string,
  ) {
    return this.sheets.applyPendingDamage(req.user.id, campaignId, rollEventId);
  }
}
