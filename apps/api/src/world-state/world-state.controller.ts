import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import {
  setFlagSchema,
  createSetSchema,
  changeSetMemberSchema,
  raiseSignalSchema,
  type CreateSetInput,
  type ChangeSetMemberInput,
  type RaiseSignalInput,
} from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { WorldStateService } from "./world-state.service";

// `key` en la URL identifica el recurso REST; el cuerpo solo lleva lo que `setFlagSchema` no
// puede sacar de ahí. `.pick` es composición de Zod sobre el esquema importado, no una copia:
// `@dnd/shared` sigue siendo la única fuente de la forma.
const setFlagBodySchema = setFlagSchema.pick({ value: true });

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId")
export class WorldStateController {
  constructor(private readonly worldState: WorldStateService) {}

  // --- Marcas: solo DM escribe, cualquier miembro lee ---

  @Put("flags/:key")
  setFlag(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("key") key: string,
    @Body(new ZodValidationPipe(setFlagBodySchema)) body: { value: boolean },
  ) {
    return this.worldState.setFlag(req.user.id, campaignId, { key, value: body.value });
  }

  @Get("flags")
  listFlags(@Req() req: { user: { id: string } }, @Param("campaignId") campaignId: string) {
    return this.worldState.listFlags(req.user.id, campaignId);
  }

  // --- Conjuntos: solo DM crea y cambia miembros, cualquier miembro lee ---

  @Post("sets")
  createSet(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(createSetSchema)) body: CreateSetInput,
  ) {
    return this.worldState.createSet(req.user.id, campaignId, body);
  }

  @Get("sets")
  listSets(@Req() req: { user: { id: string } }, @Param("campaignId") campaignId: string) {
    return this.worldState.listSets(req.user.id, campaignId);
  }

  @Post("sets/:key/members")
  addMember(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("key") key: string,
    @Body(new ZodValidationPipe(changeSetMemberSchema)) body: ChangeSetMemberInput,
  ) {
    return this.worldState.addMember(req.user.id, campaignId, key, body);
  }

  @Delete("sets/:key/members/:memberType/:memberId")
  removeMember(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("key") key: string,
    // Los mismos dos campos que el POST, pero puestos por la URL en vez del cuerpo — el mismo
    // esquema los valida en los dos sitios porque `@Param()` sin clave entrega el objeto
    // entero de parámetros y Zod descarta lo que no reconoce (`campaignId`, `key`).
    @Param(new ZodValidationPipe(changeSetMemberSchema)) params: ChangeSetMemberInput,
  ) {
    return this.worldState.removeMember(
      req.user.id,
      campaignId,
      key,
      params.memberType,
      params.memberId,
    );
  }

  // --- Señales: solo DM ---

  @Post("signals")
  raiseSignal(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(raiseSignalSchema)) body: RaiseSignalInput,
  ) {
    return this.worldState.raiseSignal(req.user.id, campaignId, body);
  }
}
