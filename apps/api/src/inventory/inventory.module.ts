import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { InventoryController, MoneyController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

// Carril A4. `app.module.ts` lo cablea el orquestador (fuera de esta frontera).
@Module({
  imports: [CampaignsModule, GameEventsModule],
  controllers: [InventoryController, MoneyController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
