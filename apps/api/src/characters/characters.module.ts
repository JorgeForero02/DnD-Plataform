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
import { AbilityRollsService } from "./ability-rolls.service";
import { AbilityRollsController } from "./ability-rolls.controller";
import { DamageTrayController } from "./damage-tray.controller";
import { XpService } from "./xp.service";
import { XpController } from "./xp.controller";

@Module({
  // `GameEventsModule` entra por 2A.7: los PG mutables y las salvaciones de muerte escriben
  // su `GameEvent` en la misma transacción que el cambio.
  // `CharacterStateModule` entra para sembrar dados de golpe y espacios de conjuro al
  // completar la ficha. No hay ciclo: `character-state` no importa `characters`.
  // `RollsModule` entra en 2B: tirar con un arma equipada compone la expresion en el servidor y
  // la ejecuta el mismo tirador que todo lo demas. No hay ciclo: `rolls` no importa `characters`.
  imports: [CampaignsModule, GameEventsModule, CharacterStateModule, RollsModule, StatblocksModule],
  controllers: [
    CharactersController,
    CharacterSheetController,
    AbilityRollsController,
    DamageTrayController,
    XpController,
  ],
  providers: [CharactersService, CharacterSheetService, AbilityRollsService, XpService],
  // 2C.5: la peticion de tirada deriva la hoja de quien tira **en el momento de tirar**, para que
  // el modificador sea el de ahora y no el de cuando el DM la pidio.
  // Reglas de la mesa (Tarea 3): `AbilityRollsService` sale exportado porque la Tarea 4
  // (`CharacterSheetService`, mismo módulo) lo inyecta para validar un intento elegido.
  exports: [CharacterSheetService, AbilityRollsService],
})
export class CharactersModule {}
