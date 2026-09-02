import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { InvitesModule } from "./invites/invites.module";
import { EntitiesModule } from "./entities/entities.module";
import { LinksModule } from "./links/links.module";
import { CommentsModule } from "./comments/comments.module";
import { SessionsModule } from "./sessions/sessions.module";
import { CharactersModule } from "./characters/characters.module";
import { GameEventsModule } from "./game-events/game-events.module";
import { RollsModule } from "./rolls/rolls.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { WorldStateModule } from "./world-state/world-state.module";
import { CharacterStateModule } from "./character-state/character-state.module";
import { LevelUpModule } from "./level-up/level-up.module";
import { RulesEngineModule } from "./rules-engine/rules-engine.module";
import { UsersModule } from "./users/users.module";
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
    RollsModule,
    NotificationsModule,
    WorldStateModule,
    CharacterStateModule,
    LevelUpModule,
    RulesEngineModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
