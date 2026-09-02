import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { WorldStateController } from "./world-state.controller";
import { WorldStateService } from "./world-state.service";

@Module({
  imports: [CampaignsModule, GameEventsModule],
  controllers: [WorldStateController],
  providers: [WorldStateService],
  // Exportado para que `entities` (fuera de esta tarea) pueda llamar `recordEntityOpened`
  // cuando le toque.
  exports: [WorldStateService],
})
export class WorldStateModule {}
