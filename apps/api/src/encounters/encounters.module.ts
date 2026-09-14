import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { CharactersModule } from "../characters/characters.module";
import { RollsModule } from "../rolls/rolls.module";
import { GameClockModule } from "../game-clock/game-clock.module";
import { StatblocksModule } from "../statblocks/statblocks.module";
import { EncountersController } from "./encounters.controller";
import { EncountersService } from "./encounters.service";

@Module({
  // `CharactersModule` entra por `CharacterSheetService.getInitiativeModifier`: la iniciativa
  // reutiliza el mismo camino de derivación que la hoja, no una segunda fórmula.
  // `RollsModule` entra porque el azar es del servidor, con el mismo tirador inyectable de 2C.
  // `GameClockModule` entra porque subir de asalto avanza el mismo reloj (D-2C-1).
  // `StatblocksModule` entra en la puerta de efectos §5 bis: `end()` resuelve el VD de cada
  // `ENEMY` con statblock para proponer el reparto de XP. No hay ciclo: `statblocks` solo importa
  // `CampaignsModule`.
  imports: [
    CampaignsModule,
    GameEventsModule,
    CharactersModule,
    RollsModule,
    GameClockModule,
    StatblocksModule,
  ],
  controllers: [EncountersController],
  providers: [EncountersService],
  // Tarea 3 (2026-09-05): `RollRequestsService.answer` necesita `aplicarIniciativaDePeticion`
  // para escribir la iniciativa que acaba de tirar un `ajeno`. No hay ciclo — `encounters` no
  // importa `roll-requests` — y no debe haberlo: la dirección es acíclica a propósito.
  exports: [EncountersService],
})
export class EncountersModule {}
