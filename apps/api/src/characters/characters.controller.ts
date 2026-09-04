import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import {
  createCharacterSchema,
  updateCharacterSchema,
  CreateCharacterInput,
  UpdateCharacterInput,
} from "@dnd/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CharactersService } from "./characters.service";

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/characters")
export class CharactersController {
  constructor(private readonly characters: CharactersService) {}

  @Post()
  create(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(createCharacterSchema)) body: CreateCharacterInput,
  ) {
    return this.characters.create(req.user.id, campaignId, body);
  }

  @Get()
  list(@Req() req: { user: { id: string } }, @Param("campaignId") campaignId: string) {
    return this.characters.list(req.user.id, campaignId);
  }

  // 2.5.8 — el listado de recuerdos: rutas fijas antes de ":characterId" para que Nest no las
  // confunda con un identificador.
  @Get("archived")
  listArchived(@Req() req: { user: { id: string } }, @Param("campaignId") campaignId: string) {
    return this.characters.listArchived(req.user.id, campaignId);
  }

  @Get(":characterId")
  get(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
  ) {
    return this.characters.get(req.user.id, campaignId, characterId);
  }

  @Patch(":characterId")
  update(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Body(new ZodValidationPipe(updateCharacterSchema)) body: UpdateCharacterInput,
  ) {
    return this.characters.update(req.user.id, campaignId, characterId, body);
  }

  @Delete(":characterId")
  remove(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
  ) {
    return this.characters.remove(req.user.id, campaignId, characterId);
  }

  @Post(":characterId/archive")
  archive(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
  ) {
    return this.characters.archive(req.user.id, campaignId, characterId);
  }

  @Post(":characterId/unarchive")
  unarchive(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
  ) {
    return this.characters.unarchive(req.user.id, campaignId, characterId);
  }
}
