import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { createCommentSchema } from "@dnd/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CommentsService } from "./comments.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Post("entities/:entityId/comments")
  create(
    @Req() req: { user: { id: string } },
    @Param("entityId") entityId: string,
    @Body(new ZodValidationPipe(createCommentSchema)) body: any,
  ) {
    return this.comments.create(req.user.id, entityId, body);
  }

  @Get("entities/:entityId/comments")
  list(@Req() req: { user: { id: string } }, @Param("entityId") entityId: string) {
    return this.comments.listFor(req.user.id, entityId);
  }

  @Delete("comments/:commentId")
  remove(@Req() req: { user: { id: string } }, @Param("commentId") commentId: string) {
    return this.comments.remove(req.user.id, commentId);
  }
}
