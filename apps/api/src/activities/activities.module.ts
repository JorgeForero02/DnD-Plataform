import { Module } from "@nestjs/common";
import type { Actividad } from "@dnd/shared";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { CharactersModule } from "../characters/characters.module";
import { RollRequestsModule } from "../roll-requests/roll-requests.module";
import { EncountersModule } from "../encounters/encounters.module";
import { CharacterStateModule } from "../character-state/character-state.module";
import { SRD_CLASSES } from "../rules/catalog/classes";
import { ActivitiesController } from "./activities.controller";
import { ActivitiesService, ACTIVITY_CATALOG, type ActivityCatalog } from "./activities.service";

// Tarea A7 (paso 2). `RollRequestsModule` entra por `RollRequestsService.create` (una salvación
// pide su tirada por esa puerta), `EncountersModule` por `EncountersService.gastar` (la economía
// del turno) y `CharacterStateModule` por `ConditionsService.apply` (vuelta de arreglo 1:
// `effects[]` se aplica en la misma transacción). Ninguno de los tres importa este módulo — no
// hay ciclo.

/**
 * Tarea A11 (paso 2) — **el catálogo, cableado de verdad.**
 *
 * Busca la actividad que un rasgo de clase o de subclase concede, por su clave estable
 * (`ClassFeature.key`; `"rage"` para la Furia). Antes de esta tarea `ACTIVITY_CATALOG` se
 * registraba a `undefined` a propósito (vuelta de arreglo 2 de la tarea A7, ver el historial de
 * git de este fichero): no había ninguna actividad completa que ofrecer, así que `usar()`
 * respondía 404 para cualquier clave, incluida `"rage"`. A9/A10/A11 construyeron la Furia
 * completa; esto es lo único que faltaba para que `usar()` la encontrara.
 *
 * **No reimplementa la búsqueda de `resolve.ts`** (`concederActividadDe`): esa función resuelve
 * además los USOS ya derivados para un personaje concreto (con su nivel, su tabla de escala), que
 * es trabajo de la HOJA, no del catálogo — `usar()` solo necesita la `Actividad` tal cual está
 * declarada, sin resolver, porque sus propios `Origen` (el `bono` de un ataque, la `cd` de una
 * salvación) los resuelve con el contexto de quien la usa (`ActivitiesService.contextoDeDerivacion`).
 * Buscarla aquí y resolver sus usos allí son responsabilidades distintas sobre el mismo dato.
 */
export function actividadCatalogada(key: string): Actividad | undefined {
  for (const clase of SRD_CLASSES) {
    const propia = clase.features.find((f) => f.key === key)?.grant?.actividad;
    if (propia) return propia;
    for (const subclase of clase.subclasses) {
      const deSubclase = subclase.features.find((f) => f.key === key)?.grant?.actividad;
      if (deSubclase) return deSubclase;
    }
  }
  return undefined;
}

const CATALOGO_REAL: ActivityCatalog = { find: actividadCatalogada };

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
  providers: [ActivitiesService, { provide: ACTIVITY_CATALOG, useValue: CATALOGO_REAL }],
})
export class ActivitiesModule {}
