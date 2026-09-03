import { apiFetch } from "../../lib/api";
import type { AdvanceClockInput, AdvanceClockResult, ClockState } from "@dnd/shared";

// Tarea 2C.3 en la pantalla (ficha C2C-3).
//
// **El reloj se avanza, nunca se fija.** No hay un `PATCH` con la hora nueva a propósito: dos
// avances a la vez perderían uno de los dos, y retroceder el tiempo haría que algo caducara dos
// veces. El servidor solo ofrece `advance`, y esta capa no inventa nada más.

export function fetchClock(campaignId: string): Promise<ClockState> {
  return apiFetch<ClockState>(`/campaigns/${campaignId}/clock`);
}

export function advanceClock(
  campaignId: string,
  input: AdvanceClockInput,
): Promise<AdvanceClockResult> {
  return apiFetch<AdvanceClockResult>(`/campaigns/${campaignId}/clock/advance`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
