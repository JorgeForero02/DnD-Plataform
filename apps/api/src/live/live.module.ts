import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { LiveBus } from "./live-bus";
import { LiveController } from "./live.controller";
import { LiveService } from "./live.service";

// Plan 12 · 12.3 — el nervio en vivo. `LiveBus` se exporta para que `GameEventsService` publique
// desde `record`, que es **el único sitio donde se emite** (regla del plan): un segundo emisor
// sería un aviso que no deja rastro en el registro.
@Module({
  imports: [CampaignsModule],
  controllers: [LiveController],
  providers: [LiveService, LiveBus],
  exports: [LiveBus],
})
export class LiveModule {}
