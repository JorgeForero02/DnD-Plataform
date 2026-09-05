import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { ConditionsController, HelpController } from "./conditions/conditions.controller";
import { ConditionsService } from "./conditions/conditions.service";
import { ResourcesController } from "./resources/resources.controller";
import { ResourcesService } from "./resources/resources.service";
import { RestController } from "./rest/rest.controller";
import { RestService } from "./rest/rest.service";

// Tareas 2A.8 y 2A.12 — recursos, descansos y condiciones de personaje.
//
// `ResourcesService` se exporta porque `seedResourcesFor` lo necesita quien cree o suba de
// nivel un personaje (`characters/`, fuera de esta frontera): así ese módulo importa
// `CharacterStateModule` en vez de reimplementar la siembra de dados de golpe y espacios de
// conjuro.
@Module({
  imports: [CampaignsModule, GameEventsModule],
  controllers: [ResourcesController, RestController, ConditionsController, HelpController],
  providers: [ResourcesService, RestService, ConditionsService],
  exports: [ResourcesService],
})
export class CharacterStateModule {}
