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
})
export class RollRequestsModule {}
