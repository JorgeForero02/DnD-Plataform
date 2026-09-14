import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { NpcVisibilityController } from "./npc-visibility.controller";
import { NpcsController } from "./npcs.controller";
import { NpcsService } from "./npcs.service";
import { StatblocksController } from "./statblocks.controller";
import { StatblocksService } from "./statblocks.service";

@Module({
  // `GameEventsModule` entra en Task 1: `reveal`/`hide` escriben NPC_REVEALED/NPC_HIDDEN (y
  // `reveal`, ENTITY_REVEALED) en la misma transacción que suben las tres columnas.
  imports: [CampaignsModule, GameEventsModule],
  controllers: [StatblocksController, NpcsController, NpcVisibilityController],
  providers: [StatblocksService, NpcsService],
  // Lo exporta porque 2D.4 lo necesita para resolver un `ref` al instanciar un PNJ a la mesa.
  // No hay ciclo: `statblocks` no importa a quien lo usa.
  exports: [StatblocksService, NpcsService],
})
export class StatblocksModule {}
