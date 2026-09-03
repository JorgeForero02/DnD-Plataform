import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { CampaignItemsService } from "./campaign-items.service";
import { CampaignItemsController } from "./campaign-items.controller";

@Module({
  imports: [CampaignsModule],
  controllers: [CampaignItemsController],
  providers: [CampaignItemsService],
  exports: [CampaignItemsService],
})
export class CampaignItemsModule {}
