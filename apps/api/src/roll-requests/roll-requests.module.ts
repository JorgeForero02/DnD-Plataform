import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { CharactersModule } from "../characters/characters.module";
import { EncountersModule } from "../encounters/encounters.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { RollsModule } from "../rolls/rolls.module";
import { RollRequestsController } from "./roll-requests.controller";
import { RollRequestsService } from "./roll-requests.service";

@Module({
  // `EncountersModule` entra por `EncountersService.aplicarIniciativaDePeticion` (tarea 3): al
  // responder, este módulo escribe la iniciativa en el combatiente. Sin ciclo — `encounters` no
  // importa `roll-requests` —, y así se queda. `GameEventsModule` entra porque `answer` escribe
  // `ENCOUNTER_STARTED` cuando esa iniciativa era la última que faltaba.
  imports: [CampaignsModule, RollsModule, CharactersModule, EncountersModule, GameEventsModule],
  controllers: [RollRequestsController],
  providers: [RollRequestsService],
  // Tarea A7 (paso 2): una actividad de salvación pide su tirada por esta misma puerta, en la
  // misma transacción que gasta su recurso. `ActivitiesModule` importa `RollRequestsModule` para
  // inyectar el servicio, así que tiene que salir de aquí — no estaba en la lista de ficheros del
  // encargo, y es la única forma de reusar `create()` en vez de reescribir su lógica.
  exports: [RollRequestsService],
})
export class RollRequestsModule {}
