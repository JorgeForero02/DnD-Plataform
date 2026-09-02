import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { GameEventBridge } from "./game-event-bridge";
import { RulesEngineController } from "./rules-engine.controller";
import { RulesEngineService } from "./rules-engine.service";

// Tarea 2A.16 — el motor de reglas. Ya cableado en `app.module.ts`, y enganchado al log por
// `GameEventBridge`: escucha `game_event.recorded` en vez de que `game-events` le llame, porque
// el motor escribe eventos y la llamada directa cerraría un ciclo entre los dos módulos.

@Module({
  imports: [CampaignsModule, GameEventsModule, NotificationsModule],
  controllers: [RulesEngineController],
  providers: [RulesEngineService, GameEventBridge],
  exports: [RulesEngineService],
})
export class RulesEngineModule {}
