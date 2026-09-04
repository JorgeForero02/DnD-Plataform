import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { WorldStateModule } from "../world-state/world-state.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { EntitiesService } from "./entities.service";
import { EntitiesController } from "./entities.controller";

@Module({
  imports: [CampaignsModule, WorldStateModule, GameEventsModule],
  controllers: [EntitiesController],
  providers: [EntitiesService],
  exports: [EntitiesService],
})
export class EntitiesModule {}
