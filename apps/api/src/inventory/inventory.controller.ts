import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import {
  addInventoryItemSchema,
  changeMoneySchema,
  updateInventoryItemSchema,
  type AddInventoryItemInput,
  type ChangeMoneyInput,
  type UpdateInventoryItemInput,
} from "@dnd/shared";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { InventoryService } from "./inventory.service";

// Carril A4 — endpoints bajo /campaigns/:campaignId/characters/:characterId/inventory (+ /money).

@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/characters/:characterId/inventory")
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  list(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
  ) {
    return this.inventory.list(req.user.id, campaignId, characterId);
  }

  @Post()
  add(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Body(new ZodValidationPipe(addInventoryItemSchema)) body: AddInventoryItemInput,
  ) {
    return this.inventory.add(req.user.id, campaignId, characterId, body);
  }

  @Patch(":rowId")
  update(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Param("rowId") rowId: string,
    @Body(new ZodValidationPipe(updateInventoryItemSchema)) body: UpdateInventoryItemInput,
  ) {
    return this.inventory.update(req.user.id, campaignId, characterId, rowId, body);
  }

  @Delete(":rowId")
  remove(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Param("rowId") rowId: string,
  ) {
    return this.inventory.remove(req.user.id, campaignId, characterId, rowId);
  }
}

// La bolsa vive en un controlador propio, y no bajo `.../inventory`, porque Nest arma su ruta
// concatenando el prefijo de clase con el del método — no hay forma de "subir un nivel" desde
// dentro de `InventoryController` (`.../inventory/../money` no es una ruta que Nest entienda).
// `PATCH /campaigns/:campaignId/characters/:characterId/money` es su propio recurso hermano.
@UseGuards(JwtAuthGuard)
@Controller("campaigns/:campaignId/characters/:characterId/money")
export class MoneyController {
  constructor(private readonly inventory: InventoryService) {}

  @Patch()
  changeMoney(
    @Req() req: { user: { id: string } },
    @Param("campaignId") campaignId: string,
    @Param("characterId") characterId: string,
    @Body(new ZodValidationPipe(changeMoneySchema)) body: ChangeMoneyInput,
  ) {
    return this.inventory.changeMoney(req.user.id, campaignId, characterId, body);
  }
}
