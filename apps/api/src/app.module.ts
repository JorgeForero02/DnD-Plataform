import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { InvitesModule } from "./invites/invites.module";
import { EntitiesModule } from "./entities/entities.module";
import { LinksModule } from "./links/links.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    CampaignsModule,
    InvitesModule,
    EntitiesModule,
    LinksModule,
  ],
})
export class AppModule {}
