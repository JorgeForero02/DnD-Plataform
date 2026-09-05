import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { LiveModule } from "../live/live.module";
import { GameEventsController } from "./game-events.controller";
import { GameEventsService } from "./game-events.service";

@Module({
  imports: [CampaignsModule, LiveModule],
  controllers: [GameEventsController],
  providers: [GameEventsService],
  // Lo exporta para que los servicios que cambian algo escriban su evento en la misma
  // transacción que el cambio.
  exports: [GameEventsService],
})
export class GameEventsModule {}
