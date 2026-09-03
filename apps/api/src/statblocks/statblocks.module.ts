import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { StatblocksController } from "./statblocks.controller";
import { StatblocksService } from "./statblocks.service";

@Module({
  imports: [CampaignsModule],
  controllers: [StatblocksController],
  providers: [StatblocksService],
  // Lo exporta porque 2D.4 lo necesita para resolver un `ref` al instanciar un PNJ a la mesa.
  // No hay ciclo: `statblocks` no importa a quien lo usa.
  exports: [StatblocksService],
})
export class StatblocksModule {}
