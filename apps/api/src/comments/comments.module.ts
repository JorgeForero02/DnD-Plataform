import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { CommentsService } from "./comments.service";
import { CommentsController } from "./comments.controller";

@Module({
  imports: [CampaignsModule, GameEventsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
