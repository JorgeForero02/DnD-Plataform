import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { LinksService } from "./links.service";
import { LinksController } from "./links.controller";

@Module({
  imports: [CampaignsModule, GameEventsModule],
  controllers: [LinksController],
  providers: [LinksService],
})
export class LinksModule {}
