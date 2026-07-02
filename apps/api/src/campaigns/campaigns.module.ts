import { Module } from "@nestjs/common";
import { CampaignsService } from "./campaigns.service";
import { MembershipService } from "./membership.service";
import { CampaignsController } from "./campaigns.controller";

@Module({
  controllers: [CampaignsController],
  providers: [CampaignsService, MembershipService],
  exports: [MembershipService],
})
export class CampaignsModule {}
