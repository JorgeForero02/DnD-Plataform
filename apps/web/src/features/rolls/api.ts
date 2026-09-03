import type { CreateRollInput, GameEventPayload, ListRollsInput, RollResult } from "@dnd/shared";
import { apiFetch } from "../../lib/api";
import type { GameEventRow } from "../sessions/log-api";

// Tarea 2C.2 — el cliente HTTP de la pantalla de dados. `apiFetch` es el único que habla HTTP
// (docs/04-convenciones.md); este fichero es la única puerta de esta feature hacia
// `apps/api/src/rolls/`. **No se toca la API.**
//
// **`createRoll` está escrito dos veces a sabiendas**: aquí y en `features/character-sheet/api.ts`.
// Son cinco líneas y el mismo endpoint, pero las dos features son fronteras distintas y la hoja
// no depende de esta pantalla ni al revés; importar de la otra feature para ahorrar cinco líneas
// ataría la pantalla de dados a la hoja de personaje. Lo que **no** se duplica es nada que
// pueda separarse sin que se note: la forma de la petición vive una sola vez, en
// `packages/shared/src/roll.schema.ts`, y el compilador cuida de que las dos copias la respeten.

export function createRoll(campaignId: string, input: CreateRollInput): Promise<RollResult> {
  return apiFetch<RollResult>(`/campaigns/${campaignId}/rolls`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Los dos `payload` que puede traer el registro de tiradas.
 *
 * El servidor acota el log a `["ABILITY_ROLL", "DEATH_SAVE"]` (`TIPOS_DE_TIRADA`, en
 * `apps/api/src/rolls/rolls.service.ts`), así que **el tipo del cliente se acota igual**: si
 * alguien añade un tipo de tirada allí y no lo pinta aquí, el `switch` de `RegistroDeTiradas`
 * deja de compilar en vez de dibujar un hueco.
 */
export type PayloadDeTirada = Extract<GameEventPayload, { type: "ABILITY_ROLL" | "DEATH_SAVE" }>;

export interface FilaDeTirada extends Omit<GameEventRow, "type" | "payload"> {
  type: PayloadDeTirada["type"];
  payload: PayloadDeTirada;
}

export interface PaginaDeTiradas {
  events: FilaDeTirada[];
  nextCursor: string | null;
}

/**
 * El registro de tiradas de la campaña.
 *
 * **El servidor ya filtró por `canView`** (`RollsService.list` delega en `GameEventsService.list`,
 * el único sitio donde vive la matriz de visibilidad para los sucesos). Aquí no se esconde nada:
 * lo que no se puede ver, no viaja.
 */
export function fetchRolls(
  campaignId: string,
  query: Partial<
    Pick<ListRollsInput, "sessionId" | "characterId" | "mine" | "limit" | "cursor">
  > = {},
): Promise<PaginaDeTiradas> {
  const p = new URLSearchParams();
  if (query.sessionId) p.set("sessionId", query.sessionId);
  if (query.characterId) p.set("characterId", query.characterId);
  // **Solo cuando es cierto** (ficha C2C-7). El servidor ya lo tiene en `false` por defecto
  // (`listRollsSchema`), así que mandar `mine=false` sería repetir el valor por defecto en la
  // URL; y además `z.coerce.boolean()` convierte **cualquier** cadena no vacía en `true`, así
  // que un `mine=false` escrito a mano diría exactamente lo contrario de lo que parece.
  if (query.mine) p.set("mine", "true");
  if (query.cursor) p.set("cursor", query.cursor);
  p.set("limit", String(query.limit ?? 50));
  return apiFetch<PaginaDeTiradas>(`/campaigns/${campaignId}/rolls?${p.toString()}`);
}
