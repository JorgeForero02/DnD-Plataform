import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import { revealManySchema, type RevealManyInput } from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { NpcsService } from "./npcs.service";

/**
 * T3 (cierre, 2026-09-14) — «revelar el grupo entero» desde el orden de turnos: una casilla de la
 * tira es un turno, y un turno es un grupo. Vive en **su propio controlador**, con el prefijo de
 * `characters` sin `:characterId`, y **antes** de `NpcVisibilityController` en
 * `StatblocksModule` — con `:characterId/reveal` en el mismo nivel, Nest empareja por orden de
 * declaración, y `reveal-many` no es un identificador de personaje.
 */
@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/characters")
export class NpcBulkVisibilityController {
  constructor(private readonly npcs: NpcsService) {}

  @Post("reveal-many")
  revealMany(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(revealManySchema)) body: RevealManyInput,
  ) {
    return this.npcs.revealMany(req.user.id, campaignId, body);
  }
}

/**
 * PNJ del mundo y la mesa (spec §3.2) — revelar y ocultar una criatura desde la mesa. Cuelga de
 * `characters/:characterId` porque el sujeto es la fila de `Character`; vive en este módulo
 * (E-PM-1) porque es el que sabe subir la plantilla.
 */
@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/characters/:characterId")
export class NpcVisibilityController {
  constructor(private readonly npcs: NpcsService) {}

  @Post("reveal")
  reveal(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
  ) {
    return this.npcs.reveal(req.user.id, campaignId, characterId);
  }

  @Post("hide")
  hide(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
  ) {
    return this.npcs.hide(req.user.id, campaignId, characterId);
  }
}
