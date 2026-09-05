import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { InvitesService } from "./invites.service";
import { InvitesController } from "./invites.controller";

@Module({
  imports: [CampaignsModule, GameEventsModule],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}
