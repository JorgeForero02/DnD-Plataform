import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { CharactersModule } from "../characters/characters.module";
import { RollsModule } from "../rolls/rolls.module";
import { GameClockModule } from "../game-clock/game-clock.module";
import { EncountersController } from "./encounters.controller";
import { EncountersService } from "./encounters.service";

@Module({
  // `CharactersModule` entra por `CharacterSheetService.getInitiativeModifier`: la iniciativa
  // reutiliza el mismo camino de derivación que la hoja, no una segunda fórmula.
  // `RollsModule` entra porque el azar es del servidor, con el mismo tirador inyectable de 2C.
  // `GameClockModule` entra porque subir de asalto avanza el mismo reloj (D-2C-1).
  imports: [CampaignsModule, GameEventsModule, CharactersModule, RollsModule, GameClockModule],
  controllers: [EncountersController],
  providers: [EncountersService],
})
export class EncountersModule {}
