import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { GameClockController } from "./game-clock.controller";
import { GameClockService } from "./game-clock.service";

@Module({
  imports: [CampaignsModule, GameEventsModule],
  controllers: [GameClockController],
  providers: [GameClockService],
  // Lo exporta porque el descanso lo lee: «un solo descanso largo por cada 24 horas» se comprueba
  // contra este contador, no contra la hora del servidor.
  exports: [GameClockService],
})
export class GameClockModule {}
