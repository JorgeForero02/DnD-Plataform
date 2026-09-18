import { Module } from "@nestjs/common";
import { SRD_SPELL_POR_KEY } from "../rules/catalog/generado";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { GameEventsModule } from "../game-events/game-events.module";
import { CharactersModule } from "../characters/characters.module";
import { RollRequestsModule } from "../roll-requests/roll-requests.module";
import { EncountersModule } from "../encounters/encounters.module";
import { CharacterStateModule } from "../character-state/character-state.module";
import { SpellbookModule } from "../spellbook/spellbook.module";
import { RollsModule } from "../rolls/rolls.module";
import { SRD_CLASSES } from "../rules/catalog/classes";
import { actividadDeLanzamiento, parsearClaveDeActividad } from "../rules/catalog/spell-activities";
import { ActivitiesController } from "./activities.controller";
import {
  ActivitiesService,
  ACTIVITY_CATALOG,
  type ActivityCatalog,
  type ActividadCatalogada,
} from "./activities.service";

// Tarea A7 (paso 2). `RollRequestsModule` entra por `RollRequestsService.create` (una salvación
// pide su tirada por esa puerta), `EncountersModule` por `EncountersService.gastar` (la economía
// del turno) y `CharacterStateModule` por `ConditionsService.apply` (vuelta de arreglo 1:
// `effects[]` se aplica en la misma transacción). `SpellbookModule` y `RollsModule` entran en
// Task 4 (3A.2): `SpellbookService.lanzable` decide si un conjuro se puede lanzar, y
// `RollsService.roll` escribe el daño directo a otro en la bandeja del DM. Ninguno de los cinco
// importa este módulo — no hay ciclo.

/**
 * Tarea A11 (paso 2) — **el catálogo, cableado de verdad.** Task 4 (3A.2) lo extiende a
 * `spell:<key>`: la misma puerta que ya buscaba una aptitud de clase por su clave estable ahora
 * también resuelve un conjuro por la suya, y devuelve además `name`/`kind` — lo que
 * `ActivitiesService.usar` necesita para escribir `ACTIVITY_USED` sin volver a mirar de dónde
 * salió la actividad.
 *
 * Antes de A11, `ACTIVITY_CATALOG` se registraba a `undefined` a propósito (vuelta de arreglo 2
 * de la tarea A7, ver el historial de git de este fichero): no había ninguna actividad completa
 * que ofrecer, así que `usar()` respondía 404 para cualquier clave, incluida `"rage"`. A9/A10/A11
 * construyeron la Furia completa; esto es lo único que faltaba para que `usar()` la encontrara.
 *
 * **No reimplementa la búsqueda de `resolve.ts`** (`concederActividadDe`): esa función resuelve
 * además los USOS ya derivados para un personaje concreto (con su nivel, su tabla de escala), que
 * es trabajo de la HOJA, no del catálogo — `usar()` solo necesita la `Actividad` tal cual está
 * declarada, sin resolver, porque sus propios `Origen` (el `bono` de un ataque, la `cd` de una
 * salvación) los resuelve con el contexto de quien la usa (`ActivitiesService.contextoDeDerivacion`).
 * Buscarla aquí y resolver sus usos allí son responsabilidades distintas sobre el mismo dato.
 */
export function actividadCatalogada(key: string): ActividadCatalogada | undefined {
  const clave = parsearClaveDeActividad(key);
  if (clave.tipo === "spell") {
    const spell = SRD_SPELL_POR_KEY.get(clave.spellKey);
    if (!spell) return undefined;
    // Índice 0 = la actividad de lanzamiento (la que decide `actividadDeLanzamiento`, no
    // siempre `[0]` — ver su comentario, `hunters-mark`); un índice mayor es una actividad
    // secundaria del mismo conjuro, tal cual la trae el catálogo.
    const actividad =
      clave.indice === 0 ? actividadDeLanzamiento(spell) : spell.actividades[clave.indice];
    if (!actividad) return undefined;
    return { actividad, name: spell.nameEs ?? spell.nameEn, kind: "SPELL", spell };
  }

  for (const clase of SRD_CLASSES) {
    const propia = clase.features.find((f) => f.key === clave.key);
    if (propia?.grant?.actividad) {
      return { actividad: propia.grant.actividad, name: propia.name, kind: "FEATURE" };
    }
    for (const subclase of clase.subclasses) {
      const deSubclase = subclase.features.find((f) => f.key === clave.key);
      if (deSubclase?.grant?.actividad) {
        return { actividad: deSubclase.grant.actividad, name: deSubclase.name, kind: "FEATURE" };
      }
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
    SpellbookModule,
    RollsModule,
  ],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, { provide: ACTIVITY_CATALOG, useValue: CATALOGO_REAL }],
})
export class ActivitiesModule {}
