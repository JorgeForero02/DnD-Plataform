import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [CampaignsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  // Exportado para que otros servicios (motor de reglas, etc.) puedan llamar `notify()`
  // directamente, igual que `GameEventsService`.
  exports: [NotificationsService],
})
export class NotificationsModule {}
