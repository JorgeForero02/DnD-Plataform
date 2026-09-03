import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { CharactersModule } from "../characters/characters.module";
import { RollsModule } from "../rolls/rolls.module";
import { RollRequestsController } from "./roll-requests.controller";
import { RollRequestsService } from "./roll-requests.service";

@Module({
  imports: [CampaignsModule, RollsModule, CharactersModule],
  controllers: [RollRequestsController],
  providers: [RollRequestsService],
})
export class RollRequestsModule {}
