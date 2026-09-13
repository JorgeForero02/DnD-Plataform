import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HiloDeSesion } from "../HiloDeSesion";
import type { GameEventRow } from "../../log-api";
import * as charactersApi from "../../../characters/api";
import * as membersApi from "../../../campaigns/members";
import type { NpcEnLaMesa } from "../../../bestiario/api";

// Ronda de revisión (tarea 11, C4 #15). **El defecto que encontró el revisor**: la tabla que
// resuelve la cabecera (`personajePorId`, en `HiloDeSesion.tsx`) solo se construía con
// `useCharacters` — los PNJ (`pnjs`, ya recibidos por prop) no entraban. Un `HP_CHANGED` SOBRE un
// PNJ («Klarg pierde 5 PG») no encontraba a Klarg en el punto 1 de `vozDe`, caía al punto 3 (la
// huella del actor) y la cabecera acababa enseñando el nombre de quien actuó —aquí, el DM—, nunca
// el del PNJ. Esto monta `HiloDeSesion` de verdad, con un PNJ que SOLO existe en `pnjs` (no en la
// lista de `useCharacters`), y comprueba que la cabecera dice «Klarg» y no «Ada» — no por
// subcadena (las dos podrían convivir en la tarjeta, una en la cabecera y otra en la firma), sino
// mirando el nodo exacto que pinta la cabecera.

const KLARG: NpcEnLaMesa = {
  id: "npc-klarg",
  name: "Klarg",
  statblockRef: "SRD:goblin",
  currentHp: 5,
  visibility: "PLAYERS",
  ownerId: "u-dm",
};

const EVENTO: GameEventRow = {
  id: "e1",
  campaignId: "c1",
  sessionId: "s1",
  actorUserId: "u-dm",
  type: "HP_CHANGED",
  subjectType: "character",
  subjectId: "npc-klarg",
  payload: { type: "HP_CHANGED", delta: -5, from: 10, to: 5 },
  visibility: "PLAYERS",
  createdAt: "2026-09-13T21:14:00.000Z",
};

function montar(eventos: GameEventRow[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <HiloDeSesion campaignId="c1" eventos={eventos} esDm={false} comoUsuario="" pnjs={[KLARG]} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  // Sin PJ del DM: si `vozDe` cayera a la huella de quien actuó (el defecto), no habría un
  // personaje suyo con el que confundirse — la cabecera enseñaría directamente su nombre de
  // usuario, que es justo la forma más simple de reproducir el defecto que vio el revisor.
  vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([]);
  vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
    { userId: "u-dm", displayName: "Ada", role: "DM" },
  ]);
});

describe("HiloDeSesion — un suceso sobre un PNJ nombra al PNJ, no a quien actuó", () => {
  it("la cabecera dice «Klarg», no «Ada»", async () => {
    montar([EVENTO]);

    const lista = await screen.findByRole("list", { name: "Sucesos de la sesión" });
    await waitFor(() => expect(lista.querySelector('[data-suceso="e1"]')).toBeTruthy());

    const li = lista.querySelector('[data-suceso="e1"]') as HTMLElement;
    // La cabecera es el primer `<span>` de la línea de personaje (`MensajeDelHilo.tsx`).
    const cabecera = li.querySelector("span");
    expect(cabecera?.textContent).toBe("Klarg");

    // Y la frase no repite el nombre: la cabecera ya lo dijo.
    const parrafo = li.querySelector("p");
    expect(parrafo?.textContent).toBe("Klarg pierde 5 PG");
  });
});
