import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import {
  createDmTableSchema,
  setHouseTablesSchema,
  updateDmTableSchema,
  type CreateDmTableInput,
  type SetHouseTablesInput,
} from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { DmTablesService } from "./dm-tables.service";

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/tables")
export class DmTablesController {
  constructor(private readonly tables: DmTablesService) {}

  @Get()
  list(@Req() req: { user: { id: string } }, @Param("campaignId") campaignId: string) {
    return this.tables.list(req.user.id, campaignId);
  }

  @Post()
  create(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(createDmTableSchema)) body: CreateDmTableInput,
  ) {
    return this.tables.create(req.user.id, campaignId, body);
  }

  @Put(":tableId")
  update(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("tableId") tableId: string,
    @Body(new ZodValidationPipe(updateDmTableSchema)) body: CreateDmTableInput,
  ) {
    return this.tables.update(req.user.id, campaignId, tableId, body);
  }

  @Delete(":tableId")
  remove(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("tableId") tableId: string,
  ) {
    return this.tables.remove(req.user.id, campaignId, tableId);
  }

  @Post(":tableId/roll")
  roll(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("tableId") tableId: string,
  ) {
    return this.tables.roll(req.user.id, campaignId, tableId);
  }

  /**
   * El interruptor de la casa. **`PUT` sobre un recurso propio** y no un campo suelto de la
   * campaña: es una regla que se enciende o se apaga, y tiene su propia pantalla que lo dice.
   */
  @Put("house-rule")
  setHouseTables(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Body(new ZodValidationPipe(setHouseTablesSchema)) body: SetHouseTablesInput,
  ) {
    return this.tables.setHouseTables(req.user.id, campaignId, body);
  }
}
