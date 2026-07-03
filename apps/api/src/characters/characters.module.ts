import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { CharactersService } from "./characters.service";
import { CharactersController } from "./characters.controller";

@Module({
  imports: [CampaignsModule],
  controllers: [CharactersController],
  providers: [CharactersService],
})
export class CharactersModule {}
