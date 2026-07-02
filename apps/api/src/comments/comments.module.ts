import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { CommentsService } from "./comments.service";
import { CommentsController } from "./comments.controller";

@Module({
  imports: [CampaignsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
