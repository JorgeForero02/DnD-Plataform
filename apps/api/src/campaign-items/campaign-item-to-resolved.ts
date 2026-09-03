import { z } from "zod";
import { itemEffectSchema, type ResolvedItem } from "@dnd/shared";
import type { CampaignItem } from "@prisma/client";

// **De fila de la base a objeto resuelto, una sola vez.** El motor, la hoja y el inventario
// consumen `ResolvedItem` (`packages/shared/src/item.schema.ts`) y no pueden saber de dónde salió
// el objeto: esa es toda la gracia de que el catálogo del SRD y el homebrew del DM tengan la
// misma forma.
//
// Los dos carriles de la fase 2B escribieron esta traducción por separado —cada uno dentro de su
// frontera de ficheros, y con razón: importar un módulo que otro agente está reescribiendo es
// acoplarse a un blanco móvil—. Al integrarlas, el orquestador se quedó con una: dos copias de
// esta función discrepan el día que el esquema gane una columna, y la que se olvide devolverá un
// objeto al que le falta un dato **sin que nada falle**.

export const itemEffectsSchema = z.array(itemEffectSchema).max(12);

/**
 * **Los `effects` se validan al leer, no se creen.** Se validan también al escribir; esto es el
 * segundo cinturón, y existe porque una fila puede haber entrado por una migración, por un
 * `psql` a mano o por una versión anterior del esquema. Si una fila guardada ya no encaja en la
 * lista cerrada, es mejor un error ruidoso que un efecto que la pantalla pinta y el motor ignora.
 */
export function campaignItemToResolvedItem(row: CampaignItem): ResolvedItem {
  return {
    ref: `CAMPAIGN:${row.id}`,
    source: "CAMPAIGN",
    name: row.name,
    kind: row.kind,
    description: row.description ?? undefined,
    weightOz: row.weightOz,
    costCp: row.costCp ?? undefined,
    effects: itemEffectsSchema.parse(row.effects ?? []),
    requiresAttunement: row.requiresAttunement,
    slot: row.slot ?? undefined,
    // El bloque de arma solo existe si están sus cuatro columnas obligatorias: media arma no se
    // puede tirar, y devolverla a medias haría que el cuadro de ataques pintara una fila muerta.
    weapon:
      row.weaponCategory && row.weaponRange && row.damageDice && row.damageType
        ? {
            category: row.weaponCategory,
            range: row.weaponRange,
            damageDice: row.damageDice,
            damageType: row.damageType,
            properties: row.weaponProperties,
            versatileDice: row.versatileDice ?? undefined,
            rangeNormalFt: row.rangeNormalFt ?? undefined,
            rangeLongFt: row.rangeLongFt ?? undefined,
          }
        : undefined,
    // **`dexCap: 0` tiene que sobrevivir.** Es la armadura pesada, que no suma nada de Destreza;
    // un `|| undefined` aquí la convertiría en «sin tope» y daría una CA silenciosamente alta.
    armor:
      row.armorCategory && row.baseAc !== null
        ? {
            category: row.armorCategory,
            baseAc: row.baseAc,
            dexCap: row.dexCap ?? undefined,
            strengthRequirement: row.strengthRequirement,
            stealthDisadvantage: row.stealthDisadvantage,
          }
        : undefined,
  };
}
