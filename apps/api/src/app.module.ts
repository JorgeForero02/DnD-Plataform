import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerModule } from "@nestjs/throttler";
import { UserOrIpThrottlerGuard } from "./common/user-or-ip-throttler.guard";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { InvitesModule } from "./invites/invites.module";
import { EntitiesModule } from "./entities/entities.module";
import { LinksModule } from "./links/links.module";
import { CommentsModule } from "./comments/comments.module";
import { SessionsModule } from "./sessions/sessions.module";
import { CharactersModule } from "./characters/characters.module";
import { GameEventsModule } from "./game-events/game-events.module";
import { MembersModule } from "./members/members.module";
import { RollsModule } from "./rolls/rolls.module";
import { GameClockModule } from "./game-clock/game-clock.module";
import { RollRequestsModule } from "./roll-requests/roll-requests.module";
import { DmTablesModule } from "./dm-tables/dm-tables.module";
import { StatblocksModule } from "./statblocks/statblocks.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { WorldStateModule } from "./world-state/world-state.module";
import { CharacterStateModule } from "./character-state/character-state.module";
import { LevelUpModule } from "./level-up/level-up.module";
import { RulesEngineModule } from "./rules-engine/rules-engine.module";
import { CatalogModule } from "./rules/catalog.module";
import { CampaignItemsModule } from "./campaign-items/campaign-items.module";
import { InventoryModule } from "./inventory/inventory.module";
import { EncountersModule } from "./encounters/encounters.module";
import { ActivitiesModule } from "./activities/activities.module";
import { UsersModule } from "./users/users.module";
import { LiveModule } from "./live/live.module";
import { DEFAULT_RATE_LIMIT, RATE_LIMIT_WINDOW_MS } from "./common/rate-limit.constants";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    // Single named profile ("default"): the loose, global limit lives here, and the
    // brute-forceable routes override it per-route with a tighter @Throttle (hallazgo 3),
    // instead of defining a second profile that would also run — and count — on every request.
    ThrottlerModule.forRoot([
      { name: "default", ttl: RATE_LIMIT_WINDOW_MS, limit: DEFAULT_RATE_LIMIT },
    ]),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    CampaignsModule,
    InvitesModule,
    EntitiesModule,
    LinksModule,
    CommentsModule,
    SessionsModule,
    CharactersModule,
    GameEventsModule,
    LiveModule,
    MembersModule,
    RollsModule,
    GameClockModule,
    RollRequestsModule,
    DmTablesModule,
    StatblocksModule,
    NotificationsModule,
    WorldStateModule,
    CharacterStateModule,
    LevelUpModule,
    RulesEngineModule,
    CatalogModule,
    CampaignItemsModule,
    InventoryModule,
    EncountersModule,
    ActivitiesModule,
  ],
  // El cubo es por usuario con sesión y por IP sin ella (ficha R1, D-CF-17); ver el guard.
  providers: [{ provide: APP_GUARD, useClass: UserOrIpThrottlerGuard }],
})
export class AppModule {}
