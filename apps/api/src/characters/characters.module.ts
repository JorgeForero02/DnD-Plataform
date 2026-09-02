import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { CharactersService } from "./characters.service";
import { CharactersController } from "./characters.controller";
import { CharacterSheetService } from "./character-sheet.service";
import { CharacterSheetController } from "./character-sheet.controller";

@Module({
  // `GameEventsModule` entra por 2A.7: los PG mutables y las salvaciones de muerte escriben
  // su `GameEvent` en la misma transacción que el cambio.
  imports: [CampaignsModule, GameEventsModule],
  controllers: [CharactersController, CharacterSheetController],
  providers: [CharactersService, CharacterSheetService],
})
export class CharactersModule {}
