import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { GameClockModule } from "../game-clock/game-clock.module";
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
//
// `ConditionsService` se exporta desde la vuelta de arreglo 1 de la tarea A7 (paso 2): usar una
// actividad aplica sus `effects[]` en la misma transacción que gasta el recurso, y
// `ActivitiesModule` necesita inyectar el servicio para llamar a `apply(..., tx)` — el mismo
// motivo por el que `RollRequestsModule` exporta `RollRequestsService`.
@Module({
  // `StatblocksModule` entra por la tarea 2 del paso 1: aplicar una condicion tiene que poder
  // preguntar a que es inmune el statblock del que salio el personaje. No hay ciclo — statblocks
  // no importa a quien lo usa — y `ConditionsService` lo recibe `@Optional()`, asi que un e2e que
  // monte este modulo solo sigue funcionando.
  imports: [CampaignsModule, GameEventsModule, StatblocksModule, GameClockModule],
  controllers: [
    ResourcesController,
    RestController,
    ConditionsController,
    HelpController,
    TemporaryModifiersController,
  ],
  providers: [ResourcesService, RestService, ConditionsService, TemporaryModifiersService],
  // T15 (3A.2) — `TemporaryModifiersService` se exporta por el mismo motivo que `ConditionsService`
  // (comentario de arriba): `ActivitiesService.usar` (`caso "encantar"`) necesita
  // `grantFromActivity(tx, ...)` para dejar *Arma mágica* dentro de la MISMA transacción que gasta
  // el espacio de conjuro.
  exports: [ResourcesService, ConditionsService, TemporaryModifiersService],
})
export class CharacterStateModule {}
