import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { MembersController } from "./members.controller";
import { MembersService } from "./members.service";

// Ver la cabecera de `members.service.ts`: existe para que el cambio de papel pueda escribir su
// suceso sin crear un ciclo entre `campaigns` y `game-events`.
@Module({
  imports: [CampaignsModule, GameEventsModule],
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}
