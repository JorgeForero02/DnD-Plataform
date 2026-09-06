import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { StatblocksModule } from "../statblocks/statblocks.module";
import { ConditionsController, HelpController } from "./conditions/conditions.controller";
import { ConditionsService } from "./conditions/conditions.service";
import { ResourcesController } from "./resources/resources.controller";
import { ResourcesService } from "./resources/resources.service";
import { RestController } from "./rest/rest.controller";
import { RestService } from "./rest/rest.service";
import { TemporaryModifiersController } from "./temporary-modifiers/temporary-modifiers.controller";
import { TemporaryModifiersService } from "./temporary-modifiers/temporary-modifiers.service";

// Tareas 2A.8 y 2A.12 — recursos, descansos y condiciones de personaje.
//
// `ResourcesService` se exporta porque `seedResourcesFor` lo necesita quien cree o suba de
// nivel un personaje (`characters/`, fuera de esta frontera): así ese módulo importa
// `CharacterStateModule` en vez de reimplementar la siembra de dados de golpe y espacios de
// conjuro.
@Module({
  // `StatblocksModule` entra por la tarea 2 del paso 1: aplicar una condicion tiene que poder
  // preguntar a que es inmune el statblock del que salio el personaje. No hay ciclo — statblocks
  // no importa a quien lo usa — y `ConditionsService` lo recibe `@Optional()`, asi que un e2e que
  // monte este modulo solo sigue funcionando.
  imports: [CampaignsModule, GameEventsModule, StatblocksModule],
  controllers: [
    ResourcesController,
    RestController,
    ConditionsController,
    HelpController,
    TemporaryModifiersController,
  ],
  providers: [ResourcesService, RestService, ConditionsService, TemporaryModifiersService],
  exports: [ResourcesService],
})
export class CharacterStateModule {}
