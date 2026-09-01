import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import {
  createSessionSchema,
  updateSessionSchema,
  CreateSessionInput,
  UpdateSessionInput,
} from "@dnd/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SessionsService } from "./sessions.service";

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/sessions")
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  create(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(createSessionSchema)) body: CreateSessionInput,
  ) {
    return this.sessions.create(req.user.id, campaignId, body);
  }

  @Get()
  list(@Req() req: { user: { id: string } }, @Param("campaignId") campaignId: string) {
    return this.sessions.list(req.user.id, campaignId);
  }

  @Get(":sessionId")
  get(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("sessionId") sessionId: string,
  ) {
    return this.sessions.get(req.user.id, campaignId, sessionId);
  }

  @Patch(":sessionId")
  update(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("sessionId") sessionId: string,
    @Body(new ZodValidationPipe(updateSessionSchema)) body: UpdateSessionInput,
  ) {
    return this.sessions.update(req.user.id, campaignId, sessionId, body);
  }

  @Delete(":sessionId")
  remove(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("sessionId") sessionId: string,
  ) {
    return this.sessions.remove(req.user.id, campaignId, sessionId);
  }
}
