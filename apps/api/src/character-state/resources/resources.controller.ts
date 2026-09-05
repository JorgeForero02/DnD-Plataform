import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import {
  giveResourceSchema,
  spendResourceSchema,
  upsertResourceSchema,
  type GiveResourceInput,
  type SpendResourceInput,
  type UpsertResourceInput,
} from "@dnd/shared";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { ResourcesService } from "./resources.service";

// `key` en la URL identifica el recurso; el cuerpo del PUT no repite ese campo. Mismo patrón
// que `world-state.controller.ts` con las marcas de campaña.
const upsertResourceBodySchema = upsertResourceSchema.omit({ key: true });

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/characters/:characterId/resources")
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Get()
  list(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
  ) {
    return this.resources.list(req.user.id, campaignId, characterId);
  }

  @Put(":key")
  upsert(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Param("key") key: string,
    @Body(new ZodValidationPipe(upsertResourceBodySchema)) body: Omit<UpsertResourceInput, "key">,
  ) {
    return this.resources.upsert(req.user.id, campaignId, characterId, { ...body, key });
  }

  @Post(":key/spend")
  spend(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Param("key") key: string,
    @Body(new ZodValidationPipe(spendResourceSchema)) body: SpendResourceInput,
  ) {
    return this.resources.spend(req.user.id, campaignId, characterId, key, body);
  }

  /**
   * **Regalar**, que es un gesto del SRD y no dos peticiones. Va como `POST` sobre la clave del
   * recurso —igual que gastar y reponer— porque es una operacion sobre esa fila, no un recurso
   * nuevo con su propia URL.
   */
  @Post(":key/give")
  give(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Param("key") key: string,
    @Body(new ZodValidationPipe(giveResourceSchema)) body: GiveResourceInput,
  ) {
    return this.resources.give(req.user.id, campaignId, characterId, key, body);
  }

  @Post(":key/restore")
  restore(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Param("key") key: string,
    @Body(new ZodValidationPipe(spendResourceSchema)) body: SpendResourceInput,
  ) {
    return this.resources.restore(req.user.id, campaignId, characterId, key, body);
  }
}
