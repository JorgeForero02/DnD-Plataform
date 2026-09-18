import { Module } from "@nestjs/common";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { CharactersModule } from "../characters/characters.module";
import { SpellbookModule } from "../spellbook/spellbook.module";
import { InventoryModule } from "../inventory/inventory.module";
import { EncountersModule } from "../encounters/encounters.module";
import { ActionsController } from "./actions.controller";
import { ActionsService } from "./actions.service";

// Tarea 1 del plan 3A.3 (T21). `CharactersModule` entra por `CharacterSheetService.getSheet` (el
// cuadro de ataques y `sheet.activities`), `SpellbookModule` por `SpellbookService.list` (el
// libro de conjuros) e `InventoryModule` por `InventoryService.list` (los consumibles). El
// combate se lee directamente de `Combatant`/`Encounter` por `PrismaService` — el mismo patrón
// que ya usa `ActivitiesService.gastarActivacion` — así que `EncountersModule` no aporta un
// provider que este módulo inyecte hoy; se importa igual por si una versión futura necesita
// `EncountersService` (p. ej. para leer el turno por su puerta pública en vez de la fila cruda).
// **Ninguno de los cuatro importa `ActionsModule`: sin ciclo.**
@Module({
  imports: [CampaignsModule, CharactersModule, SpellbookModule, InventoryModule, EncountersModule],
  controllers: [ActionsController],
  providers: [ActionsService],
})
export class ActionsModule {}
