import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { grantTemporaryModifierSchema, type GrantTemporaryModifierInput } from "@dnd/shared";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { TemporaryModifiersService } from "./temporary-modifiers.service";

// Plan 13, ficha M8. Mismo patrón que `conditions.controller.ts` y `resources.controller.ts`: la
// ruta cuelga del personaje, porque el modificador es suyo.
@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/characters/:characterId/temporary-modifiers")
export class TemporaryModifiersController {
  constructor(private readonly modifiers: TemporaryModifiersService) {}

  @Get()
  list(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
  ) {
    return this.modifiers.list(req.user.id, campaignId, characterId);
  }

  /**
   * **`POST` y no `PUT` con clave**, a diferencia de las condiciones: dos pociones de fuerza a la
   * vez son **dos** modificadores, no uno que se reemplaza. Una condición sí se reemplaza —no se
   * está envenenado dos veces—, y esa diferencia es la razón de que no compartan tabla.
   */
  @Post()
  grant(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Body(new ZodValidationPipe(grantTemporaryModifierSchema)) body: GrantTemporaryModifierInput,
  ) {
    return this.modifiers.grant(req.user.id, campaignId, characterId, body);
  }

  @Delete(":id")
  remove(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Param("id") id: string,
  ) {
    return this.modifiers.remove(req.user.id, campaignId, characterId, id);
  }
}
