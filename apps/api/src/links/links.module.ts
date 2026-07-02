import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { LinksService } from "./links.service";
import { LinksController } from "./links.controller";

@Module({
  imports: [CampaignsModule],
  controllers: [LinksController],
  providers: [LinksService],
})
export class LinksModule {}
