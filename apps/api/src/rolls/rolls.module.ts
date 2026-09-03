import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { DmTablesModule } from "../dm-tables/dm-tables.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { RollsController } from "./rolls.controller";
import { RollsService } from "./rolls.service";

@Module({
  imports: [CampaignsModule, GameEventsModule, DmTablesModule],
  controllers: [RollsController],
  providers: [RollsService],
  exports: [RollsService],
})
export class RollsModule {}
