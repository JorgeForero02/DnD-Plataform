import type {
  SetCharacterSpellInput,
  SetSpellResponse,
  SpellbookEntry,
  SpellbookResponse,
} from "@dnd/shared";
import { apiFetch } from "../../lib/api";

// Tarea 6 de 3A.2 — el cliente HTTP del libro de conjuros. `apiFetch` es el único que habla
// HTTP (docs/04-convenciones.md); este fichero es la única puerta de esta feature hacia
// `apps/api/src/spellbook/`. Mismo patrón que `features/inventory/api.ts`.

export function fetchSpellbook(
  campaignId: string,
  characterId: string,
): Promise<SpellbookResponse> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/spellbook`);
}

/**
 * El detalle de UN conjuro, con su prosa del SRD. Solo se pide cuando la fila lo despliega
 * (`<details>` de `FilaDeConjuro`) — `list()` ya no trae `textEs`/`textEn`/`higherLevels*`
 * (ronda de arreglo 1 de la Task 3): una lista de hasta 204 conjuros con su prosa pesaba ~460 KB
 * para una pantalla que solo abre el texto de uno a la vez.
 */
export function fetchSpellDetail(
  campaignId: string,
  characterId: string,
  spellKey: string,
): Promise<SpellbookEntry> {
  return apiFetch(
    `/campaigns/${campaignId}/characters/${characterId}/spellbook/${encodeURIComponent(spellKey)}`,
  );
}

export function setSpellState(
  campaignId: string,
  characterId: string,
  spellKey: string,
  input: SetCharacterSpellInput,
): Promise<SetSpellResponse> {
  return apiFetch(
    `/campaigns/${campaignId}/characters/${characterId}/spellbook/${encodeURIComponent(spellKey)}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}
