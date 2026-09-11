import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { CharactersModule } from "../characters/characters.module";
import { InventoryController, MoneyController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

// Carril A4. `app.module.ts` lo cablea el orquestador (fuera de esta frontera).
//
// **`CharactersModule` entra por M2B-11**: equipar devuelve la CA calculada, y la fórmula vive
// en `CharacterSheetService` (`CharactersModule` la exporta) — no se reimplementa aquí. No hay
// ciclo: `CharactersModule` no importa `InventoryModule`.
@Module({
  imports: [CampaignsModule, GameEventsModule, CharactersModule],
  controllers: [InventoryController, MoneyController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
