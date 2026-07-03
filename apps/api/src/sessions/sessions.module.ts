import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { SessionsService } from "./sessions.service";
import { SessionsController } from "./sessions.controller";

@Module({
  imports: [CampaignsModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
