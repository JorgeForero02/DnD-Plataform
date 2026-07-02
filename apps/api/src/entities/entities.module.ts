import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { EntitiesService } from "./entities.service";
import { EntitiesController } from "./entities.controller";

@Module({
  imports: [CampaignsModule],
  controllers: [EntitiesController],
  providers: [EntitiesService],
  exports: [EntitiesService],
})
export class EntitiesModule {}
