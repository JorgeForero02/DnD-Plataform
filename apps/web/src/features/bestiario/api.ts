import type {
  CreateCampaignStatblockInput,
  InstantiateNpcInput,
  Statblock,
  UpdateCampaignStatblockInput,
} from "@dnd/shared";
import { apiFetch } from "../../lib/api";

// Fase 2D — la puerta de datos del bestiario.
//
// El servidor ya filtra por `canView` (`apps/api/src/statblocks/statblocks.service.ts`): un
// statblock `DM_ONLY` y un PNJ que el DM aún no ha enseñado **no viajan**. Aquí no se esconde
// nada — lo que llega, se pinta. Es la misma división de trabajo de todo el proyecto: la
// autorización se comprueba en el servidor, siempre.

export interface StatblocksResponse {
  /** Los quince del SRD 5.1. No son de nadie: los ve cualquiera que juegue. */
  srd: Statblock[];
  /** Los propios del DM que quien mira puede ver. */
  campaign: Statblock[];
}

/** Un PNJ ya instanciado, tal y como lo devuelve el servidor. */
export interface NpcEnLaMesa {
  id: string;
  name: string;
  statblockRef: string | null;
  currentHp: number | null;
  tempHp?: number;
  visibility: string;
  /**
   * **De quién es este PNJ** (paso 1, tarea 15). Sin este dato la pantalla no podía leer «es
   * tuyo», así que un jugador con un PNJ cedido no tenía mandos **aunque el servidor se los
   * permitiera** — no podía anotarle el golpe que acababa de recibir sin pedírselo al DM.
   */
  ownerId: string;
  /**
   * Las condiciones **vivas**, ya filtradas por el servidor contra el reloj de campaña: una
   * vencida sigue en la ficha, marcada, pero no viaja aquí.
   *
   * **No viene `maxHp`, y es deliberado**: derivarlo en dos sitios discreparía en cuanto hubiera
   * agotamiento. El máximo vive en la hoja, que es su fuente única.
   */
  conditions?: { key: string; level: number | null }[];
  /**
   * **La ficha del mundo de la que este cuerpo es** (PNJ del mundo y la mesa, spec §3.1). `null`
   * si no tiene o si quien mira no puede ver la ficha — el servidor la redacta (spec §4).
   */
  entityId?: string | null;
}

export function fetchStatblocks(campaignId: string): Promise<StatblocksResponse> {
  return apiFetch<StatblocksResponse>(`/campaigns/${campaignId}/statblocks`);
}

export function createStatblock(
  campaignId: string,
  input: CreateCampaignStatblockInput,
): Promise<Statblock> {
  return apiFetch<Statblock>(`/campaigns/${campaignId}/statblocks`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Editar un statblock propio del DM.
 *
 * **No existía función en la web** (auditoría de la mesa, §8.5): `PUT .../statblocks/:id` estaba
 * en el controlador y en el servicio, y no había ni un `apiFetch` que lo llamara. Un DM que se
 * equivocaba en la CA de su criatura tenía que borrarla y volver a escribirla entera.
 */
export function updateStatblock(
  campaignId: string,
  statblockId: string,
  input: UpdateCampaignStatblockInput,
): Promise<Statblock> {
  return apiFetch<Statblock>(`/campaigns/${campaignId}/statblocks/${statblockId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteStatblock(campaignId: string, statblockId: string): Promise<unknown> {
  return apiFetch(`/campaigns/${campaignId}/statblocks/${statblockId}`, {
    method: "DELETE",
  });
}

export function fetchNpcs(campaignId: string): Promise<NpcEnLaMesa[]> {
  return apiFetch<NpcEnLaMesa[]>(`/campaigns/${campaignId}/npcs`);
}

export function instantiateNpc(
  campaignId: string,
  input: InstantiateNpcInput,
): Promise<NpcEnLaMesa[]> {
  return apiFetch<NpcEnLaMesa[]>(`/campaigns/${campaignId}/npcs`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
