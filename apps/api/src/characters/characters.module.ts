import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { CharacterStateModule } from "../character-state/character-state.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { CharactersService } from "./characters.service";
import { CharactersController } from "./characters.controller";
import { CharacterSheetService } from "./character-sheet.service";
import { CharacterSheetController } from "./character-sheet.controller";

@Module({
  // `GameEventsModule` entra por 2A.7: los PG mutables y las salvaciones de muerte escriben
  // su `GameEvent` en la misma transacción que el cambio.
  // `CharacterStateModule` entra para sembrar dados de golpe y espacios de conjuro al
  // completar la ficha. No hay ciclo: `character-state` no importa `characters`.
  imports: [CampaignsModule, GameEventsModule, CharacterStateModule],
  controllers: [CharactersController, CharacterSheetController],
  providers: [CharactersService, CharacterSheetService],
})
export class CharactersModule {}
