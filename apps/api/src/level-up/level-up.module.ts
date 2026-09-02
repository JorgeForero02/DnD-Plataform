import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { CharacterStateModule } from "../character-state/character-state.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { LevelUpController } from "./level-up.controller";
import { LevelUpService } from "./level-up.service";

// Tarea 2A.9. `CharactersModule` no se importa: no exporta `CharactersService`, y
// `LevelUpService` no lo necesita — lee y bloquea la fila de `Character` directamente con
// `PrismaService`, igual que `CharacterSheetService`.
@Module({
  imports: [CampaignsModule, GameEventsModule, CharacterStateModule],
  controllers: [LevelUpController],
  providers: [LevelUpService],
})
export class LevelUpModule {}
