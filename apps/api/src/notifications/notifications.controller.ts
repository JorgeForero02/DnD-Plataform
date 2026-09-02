import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import {
  listNotificationsSchema,
  markReadSchema,
  type ListNotificationsInput,
  type MarkReadInput,
} from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { NotificationsService } from "./notifications.service";

@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @Req() req: { user: { id: string } },
    @Query(new ZodValidationPipe(listNotificationsSchema)) query: ListNotificationsInput,
  ) {
    return this.notifications.list(req.user.id, query);
  }

  @Post("read")
  markRead(
    @Req() req: { user: { id: string } },
    @Body(new ZodValidationPipe(markReadSchema)) body: MarkReadInput,
  ) {
    return this.notifications.markRead(req.user.id, body);
  }
}
