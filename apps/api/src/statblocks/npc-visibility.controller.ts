import { Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { NpcsService } from "./npcs.service";

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
