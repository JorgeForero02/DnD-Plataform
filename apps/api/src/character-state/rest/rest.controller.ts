import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import { declareRestSchema, type DeclareRestInput } from "@dnd/shared";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { RestService } from "./rest.service";

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/characters/:characterId/rest")
export class RestController {
  constructor(private readonly rest: RestService) {}

  @Post()
  declare(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Body(new ZodValidationPipe(declareRestSchema)) body: DeclareRestInput,
  ) {
    return this.rest.declare(req.user.id, campaignId, characterId, body);
  }
}
