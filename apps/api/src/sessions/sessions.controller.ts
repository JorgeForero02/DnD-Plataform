import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import {
  closeSessionSchema,
  createSessionSchema,
  stampSessionNoteSchema,
  startSessionSchema,
  updateSessionSchema,
  CreateSessionInput,
  UpdateSessionInput,
  type CloseSessionInput,
  type StampSessionNoteInput,
  type StartSessionInput,
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

  /** La sesión en curso, o `null`. La pide la barra global desde cualquier pantalla. */
  @Get("current")
  current(@Req() req: { user: { id: string } }, @Param("campaignId") campaignId: string) {
    return this.sessions.current(req.user.id, campaignId);
  }

  /**
   * El sello rápido. Cuelga de la colección y no de `:sessionId` **a propósito**: quien sella no
   * tiene por qué saber en qué sesión está — el servidor busca la que esté en curso.
   */
  @Post("notes")
  stampNote(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(stampSessionNoteSchema)) body: StampSessionNoteInput,
  ) {
    return this.sessions.stampNote(req.user.id, campaignId, body);
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

  @Post(":sessionId/start")
  start(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("sessionId") sessionId: string,
    @Body(new ZodValidationPipe(startSessionSchema)) body: StartSessionInput,
  ) {
    return this.sessions.start(req.user.id, campaignId, sessionId, body);
  }

  @Post(":sessionId/close")
  close(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("sessionId") sessionId: string,
    @Body(new ZodValidationPipe(closeSessionSchema)) body: CloseSessionInput,
  ) {
    return this.sessions.close(req.user.id, campaignId, sessionId, body);
  }
}
