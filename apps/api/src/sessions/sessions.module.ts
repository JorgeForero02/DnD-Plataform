import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { SessionsService } from "./sessions.service";
import { SessionsController } from "./sessions.controller";

@Module({
  imports: [CampaignsModule, GameEventsModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
