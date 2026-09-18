import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { CharactersModule } from "../characters/characters.module";
import { SpellbookController } from "./spellbook.controller";
import { SpellbookService } from "./spellbook.service";

// Tarea 3A.2 (Task 3, T10). `CharactersModule` entra por `CharacterSheetService.getSheet` (el
// modificador de lanzamiento sale de la hoja derivada). **Sin ciclo**: `characters` no importa
// `spellbook` — la siembra al fijar la primera clase (`sembrarLibro`) es una función libre
// exportada de `spellbook.service.ts`, no un método de `SpellbookService`, y
// `character-sheet.service.ts` la llama importándola directamente.

@Module({
  imports: [CampaignsModule, GameEventsModule, CharactersModule],
  controllers: [SpellbookController],
  providers: [SpellbookService],
  exports: [SpellbookService],
})
export class SpellbookModule {}
