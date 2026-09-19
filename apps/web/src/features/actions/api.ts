import type { AccionesResponse } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

// Task 4 de 3A.3 (T22) — el cliente HTTP de la barra de acciones. `apiFetch` es el único que
// habla HTTP (docs/04-convenciones.md); este fichero es la única puerta de esta feature hacia
// `apps/api/src/actions/` (la Task 1, T21, ya construyó `GET …/actions`).

export function fetchAcciones(campaignId: string, characterId: string): Promise<AccionesResponse> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/actions`);
}
