import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  createRuleSchema,
  dryRunRuleSchema,
  listTracesQuerySchema,
  resolveProposalSchema,
  updateRuleSchema,
  type CreateRuleInput,
  type DryRunRuleInput,
  type ListTracesQuery,
  type ResolveProposalInput,
  type UpdateRuleInput,
} from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { RulesEngineService } from "./rules-engine.service";

// Tarea 2A.16 — el controlador. Rutas bajo `campaigns/:campaignId/rules`, todas con el guard de
// sesión; la autorización fina (solo DM) la decide el servicio, nunca aquí.
//
// Tarea 7 (S12): `listTracesQuerySchema` se mudó a `@dnd/shared` — el contrato es suyo, no de
// este controlador.

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/rules")
export class RulesEngineController {
  constructor(private readonly rules: RulesEngineService) {}

  @Post()
  create(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(createRuleSchema)) body: CreateRuleInput,
  ) {
    return this.rules.create(req.user.id, campaignId, body);
  }

  @Get()
  list(@Req() req: { user: { id: string } }, @Param("campaignId") campaignId: string) {
    return this.rules.list(req.user.id, campaignId);
  }

  // --- Rutas específicas antes de ":ruleId" para que Nest no las confunda con un identificador ---

  @Get("traces")
  listTraces(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Query(new ZodValidationPipe(listTracesQuerySchema)) query: ListTracesQuery,
  ) {
    return this.rules.listTraces(req.user.id, campaignId, query);
  }

  @Get("proposals")
  listProposals(@Req() req: { user: { id: string } }, @Param("campaignId") campaignId: string) {
    return this.rules.listProposals(req.user.id, campaignId);
  }

  @Post("traces/:traceId/resolve")
  resolveProposal(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("traceId") traceId: string,
    @Body(new ZodValidationPipe(resolveProposalSchema)) body: ResolveProposalInput,
  ) {
    return this.rules.resolveProposal(req.user.id, campaignId, traceId, body);
  }

  @Get(":ruleId")
  get(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("ruleId") ruleId: string,
  ) {
    return this.rules.get(req.user.id, campaignId, ruleId);
  }

  @Patch(":ruleId")
  update(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("ruleId") ruleId: string,
    @Body(new ZodValidationPipe(updateRuleSchema)) body: UpdateRuleInput,
  ) {
    return this.rules.update(req.user.id, campaignId, ruleId, body);
  }

  @Delete(":ruleId")
  remove(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("ruleId") ruleId: string,
  ) {
    return this.rules.remove(req.user.id, campaignId, ruleId);
  }

  @Post(":ruleId/dry-run")
  dryRun(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("ruleId") ruleId: string,
    @Body(new ZodValidationPipe(dryRunRuleSchema)) body: DryRunRuleInput,
  ) {
    return this.rules.dryRun(req.user.id, campaignId, ruleId, body);
  }
}
