import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { NpcBulkVisibilityController, NpcVisibilityController } from "./npc-visibility.controller";
import { NpcsController } from "./npcs.controller";
import { NpcsService } from "./npcs.service";
import { StatblocksController } from "./statblocks.controller";
import { StatblocksService } from "./statblocks.service";

@Module({
  // `GameEventsModule` entra en Task 1: `reveal`/`hide` escriben NPC_REVEALED/NPC_HIDDEN (y
  // `reveal`, ENTITY_REVEALED) en la misma transacción que suben las tres columnas.
  imports: [CampaignsModule, GameEventsModule],
  // `NpcBulkVisibilityController` (reveal-many) va ANTES que `NpcVisibilityController`
  // (:characterId/reveal) — T3, cierre 2026-09-14: mismo `ojo` que el brief marca sobre el orden
  // de declaración de Nest para rutas que comparten el mismo nivel de segmento.
  controllers: [
    StatblocksController,
    NpcsController,
    NpcBulkVisibilityController,
    NpcVisibilityController,
  ],
  providers: [StatblocksService, NpcsService],
  // Lo exporta porque 2D.4 lo necesita para resolver un `ref` al instanciar un PNJ a la mesa.
  // No hay ciclo: `statblocks` no importa a quien lo usa.
  exports: [StatblocksService, NpcsService],
})
export class StatblocksModule {}
