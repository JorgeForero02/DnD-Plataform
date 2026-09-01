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
  createEntitySchema,
  updateEntitySchema,
  CreateEntityInput,
  UpdateEntityInput,
  EntityType,
} from "@dnd/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { EntitiesService } from "./entities.service";

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/entities")
export class EntitiesController {
  constructor(private readonly entities: EntitiesService) {}

  @Post()
  create(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(createEntitySchema)) body: CreateEntityInput,
  ) {
    return this.entities.create(req.user.id, campaignId, body);
  }

  @Get()
  list(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Query("type") type?: EntityType,
  ) {
    return this.entities.list(req.user.id, campaignId, type);
  }

  @Get(":entityId")
  get(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("entityId") entityId: string,
  ) {
    return this.entities.get(req.user.id, campaignId, entityId);
  }

  @Patch(":entityId")
  update(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("entityId") entityId: string,
    @Body(new ZodValidationPipe(updateEntitySchema)) body: UpdateEntityInput,
  ) {
    return this.entities.update(req.user.id, campaignId, entityId, body);
  }

  @Delete(":entityId")
  remove(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("entityId") entityId: string,
  ) {
    return this.entities.remove(req.user.id, campaignId, entityId);
  }
}
