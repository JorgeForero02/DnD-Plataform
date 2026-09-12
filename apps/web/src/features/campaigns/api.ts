import type { CampaignEntityCount, CreateCampaignInput, UpdateCampaignInput } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  // Reseño 2026-09-02 — only present on the LIST endpoint (campaigns.service.ts#listForUser),
  // which is why both are optional: /campaigns/:id returns the campaign on its own. `members`
  // holds the VIEWER's membership row and nobody else's, so it says what you are at this
  // table without listing who else is at it.
  //
  // Entity counts (see `entityCount` below) DO travel now (U4, tarea 33) — the comment that used
  // to sit here said they never would, on the grounds that counting objects with five visibility
  // levels leaks the existence of the ones you cannot see. That is still true of a raw `_count`;
  // the fix is that `entityCount` is never a raw count — `campaigns.service.ts#listForUser` runs
  // every entity through `canView` for THIS viewer before counting it, so the number is already
  // scoped to what this viewer alone can see.
  members?: { role: string }[];
  _count?: { members: number };
  /**
   * **Cuánto mundo puede ver QUIEN PREGUNTA** (U4, tarea 33). Ya viene contado con `canView` en
   * el servidor — dos personas en la misma mesa pueden traer un número distinto para la misma
   * campaña, y es así a propósito. Opcional solo por si una respuesta antigua en caché no lo
   * trae todavía.
   */
  entityCount?: CampaignEntityCount;
  /**
   * **Dónde se quedó la partida** (D-OP-17): la crónica de la última sesión cerrada, **ya filtrada
   * por el servidor** con la visibilidad propia de la crónica.
   *
   * **Ausente y `null` no son lo mismo, y por eso esto es opcional y nunca `null`.** Ausente
   * significa «no hay nada que enseñarte»: o la campaña no ha cerrado ninguna sesión, o su última
   * crónica no la puedes leer. Las dos se pintan igual —no se dice cuál de las dos es—, porque
   * distinguirlas contaría que hay una crónica escondida.
   */
  lastRecap?: { text: string; sessionTitle: string; endedAt: string | null };
  /**
   * Migración 6 (D-CF-16): la variante de sobrecarga del SRD 5.1, apagada por defecto. La
   * escribe el DM con `PATCH /campaigns/:id` (`updateCampaignSchema`), igual que el nombre o la
   * descripción — a diferencia de `houseTablesEnabled`, que vive en su propio endpoint de
   * `dm-tables`. Opcional como `entityCount`: el servidor siempre la manda, pero una respuesta
   * antigua en caché (o un mock de prueba que no la incluye) no la trae todavía — quien lo lee
   * lo trata como "apagada" (`?? false`), nunca como un error.
   */
  encumbranceVariant?: boolean;
  /**
   * Pulido 2026-09-12 (C1 bis): la partida de PlanarAlly (`tablero.supportive.pro/game/<nombre>`)
   * que la mesa enmarca. La escribe el DM con `PATCH /campaigns/:id`, igual que
   * `encumbranceVariant`. `null` significa "sin sala"; ausente, una respuesta vieja en caché.
   */
  boardRoomUrl?: string | null;
}

export function fetchCampaigns(): Promise<Campaign[]> {
  return apiFetch<Campaign[]>("/campaigns");
}

export function fetchCampaign(id: string): Promise<Campaign> {
  return apiFetch<Campaign>(`/campaigns/${id}`);
}

export function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  return apiFetch<Campaign>("/campaigns", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCampaign(id: string, input: UpdateCampaignInput): Promise<Campaign> {
  return apiFetch<Campaign>(`/campaigns/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteCampaign(id: string): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/campaigns/${id}`, {
    method: "DELETE",
  });
}
