import { Module } from "@nestjs/common";
import { StatblocksModule } from "../statblocks/statblocks.module";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { CharacterStateModule } from "../character-state/character-state.module";
import { RollsModule } from "../rolls/rolls.module";
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
  // `RollsModule` entra en 2B: tirar con un arma equipada compone la expresion en el servidor y
  // la ejecuta el mismo tirador que todo lo demas. No hay ciclo: `rolls` no importa `characters`.
  imports: [CampaignsModule, GameEventsModule, CharacterStateModule, RollsModule, StatblocksModule],
  controllers: [CharactersController, CharacterSheetController],
  providers: [CharactersService, CharacterSheetService],
  // 2C.5: la peticion de tirada deriva la hoja de quien tira **en el momento de tirar**, para que
  // el modificador sea el de ahora y no el de cuando el DM la pidio.
  exports: [CharacterSheetService],
})
export class CharactersModule {}
