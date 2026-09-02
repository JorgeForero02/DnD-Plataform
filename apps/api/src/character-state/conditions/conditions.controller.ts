import { Body, Controller, Delete, Get, Param, Put, Req, UseGuards } from "@nestjs/common";
import { applyConditionSchema, type ApplyConditionInput } from "@dnd/shared";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { ConditionsService } from "./conditions.service";

// `key` en la URL identifica la condición; el cuerpo del PUT no repite ese campo. Mismo patrón
// que `resources.controller.ts` y que `world-state.controller.ts`.
const applyConditionBodySchema = applyConditionSchema.omit({ key: true });

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/characters/:characterId/conditions")
export class ConditionsController {
  constructor(private readonly conditions: ConditionsService) {}

  @Get()
  list(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
  ) {
    return this.conditions.list(req.user.id, campaignId, characterId);
  }

  @Put(":key")
  apply(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Param("key") key: string,
    @Body(new ZodValidationPipe(applyConditionBodySchema))
    body: Omit<ApplyConditionInput, "key">,
  ) {
    return this.conditions.apply(req.user.id, campaignId, characterId, { ...body, key });
  }

  @Delete(":key")
  remove(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Param("key") key: string,
  ) {
    return this.conditions.remove(req.user.id, campaignId, characterId, key);
  }
}
