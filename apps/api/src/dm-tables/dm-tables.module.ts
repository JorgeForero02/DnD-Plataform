import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { DmTablesController } from "./dm-tables.controller";
import { DmTablesService } from "./dm-tables.service";

@Module({
  imports: [CampaignsModule, GameEventsModule],
  controllers: [DmTablesController],
  providers: [DmTablesService],
  // Lo exporta porque `rolls` lo consulta: un 20 natural puede disparar la tabla de criticos **si
  // la casa las tiene encendidas**. No hay ciclo: `dm-tables` no importa `rolls`.
  exports: [DmTablesService],
})
export class DmTablesModule {}
