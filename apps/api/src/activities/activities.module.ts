import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { CharactersModule } from "../characters/characters.module";
import { RollRequestsModule } from "../roll-requests/roll-requests.module";
import { EncountersModule } from "../encounters/encounters.module";
import { CharacterStateModule } from "../character-state/character-state.module";
import { ActivitiesController } from "./activities.controller";
import { ActivitiesService, ACTIVITY_CATALOG } from "./activities.service";

// Tarea A7 (paso 2). `RollRequestsModule` entra por `RollRequestsService.create` (una salvación
// pide su tirada por esa puerta), `EncountersModule` por `EncountersService.gastar` (la economía
// del turno) y `CharacterStateModule` por `ConditionsService.apply` (vuelta de arreglo 1:
// `effects[]` se aplica en la misma transacción). Ninguno de los tres importa este módulo — no
// hay ciclo.
//
// **`ACTIVITY_CATALOG` se registra explícitamente a `undefined` (vuelta de arreglo 2).** Todavía
// no hay catálogo (eso es A9/A11): con `@Optional()` a secas en el constructor y ningún binding
// aquí, el token nunca es un provider real de este módulo, y `overrideProvider(ACTIVITY_CATALOG)`
// de un test no tiene nada que sustituir. Con este binding, el comportamiento en producción no
// cambia — sigue siendo `undefined`, y `usar()` sigue respondiendo 404 para cualquier clave—, pero
// un e2e sí puede anularlo para probar el camino feliz contra Postgres real.
@Module({
  imports: [
    CampaignsModule,
    GameEventsModule,
    CharactersModule,
    RollRequestsModule,
    EncountersModule,
    CharacterStateModule,
  ],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, { provide: ACTIVITY_CATALOG, useValue: undefined }],
})
export class ActivitiesModule {}
