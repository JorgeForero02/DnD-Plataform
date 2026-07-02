import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { InvitesService } from "./invites.service";
import { InvitesController } from "./invites.controller";

@Module({
  imports: [CampaignsModule],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}
