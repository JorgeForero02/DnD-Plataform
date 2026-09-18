import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ColumnaDelRegistro } from "../ColumnaDelRegistro";
import type { GameEventRow } from "../../log-api";
import * as charactersApi from "../../../characters/api";
import * as membersApi from "../../../campaigns/members";

// Task 5 (3A.3) — **qué defiende esto, en una frase**: los filtros de verdad filtran lo que se
// pinta, y no desmontan `HiloDeSesion` al cambiar (el brief lo pide explícito: «sin desmontar la
// lista al filtrar»). Lo demás —la forma de cada línea, la franja, el anclaje— ya lo prueban
// `HiloDeSesion.test.tsx` y `mesa-mide.spec.ts`; repetirlo aquí sería la misma prueba dos veces.

// Un sello (SESSION_NOTE) es Relato; un HP_CHANGED es Números — `tipo-de-mensaje.test.ts` ya
// prueba la tabla entera, así que aquí basta uno de cada mitad.
const RELATO: GameEventRow = {
  id: "e-relato",
  campaignId: "c1",
  sessionId: "s1",
  actorUserId: "u-dm",
  type: "SESSION_NOTE",
  subjectType: "session",
  subjectId: "s1",
  payload: { type: "SESSION_NOTE", kind: "NOTE", text: "El puerto arde en el horizonte" },
  visibility: "PLAYERS",
  createdAt: "2026-09-18T21:00:00.000Z",
};

const NUMEROS: GameEventRow = {
  id: "e-numeros",
  campaignId: "c1",
  sessionId: "s1",
  actorUserId: "u-dm",
  type: "HP_CHANGED",
  subjectType: "character",
  subjectId: "p-corvin",
  payload: { type: "HP_CHANGED", delta: -5, from: 10, to: 5 },
  visibility: "PLAYERS",
  createdAt: "2026-09-18T21:05:00.000Z",
};

function montar(eventos: GameEventRow[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ColumnaDelRegistro campaignId="c1" eventos={eventos} esDm={false} comoUsuario="" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([
    {
      id: "p-corvin",
      name: "Corvin",
      ownerId: "u-ana",
      color: null,
      archivedAt: null,
    } as never,
  ]);
  vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
    { userId: "u-dm", displayName: "Ada", role: "DM" },
    { userId: "u-ana", displayName: "Ana", role: "PLAYER" },
  ]);
});

describe("ColumnaDelRegistro", () => {
  // Fix round 1 — los filtros se mudaron a la cabecera del propio `HiloDeSesion`, como un
  // segmento `button role="radio" aria-checked` (el mismo patrón que el conmutador «Con
  // tablero / Sin tablero» de `BandaUnica.tsx`), no un `input type="radio"` con su frase
  // visible debajo. El nombre accesible de cada botón es EXACTO («Todo», no «Todo…frase…»): la
  // frase vive fuera, referenciada por `aria-describedby`, para no colarse en el nombre.
  it("pinta los tres filtros como un segmento de radios, con «Todo» elegido de entrada", async () => {
    montar([RELATO, NUMEROS]);
    await waitFor(() => expect(screen.getByText("El puerto arde en el horizonte")).toBeVisible());

    const grupo = screen.getByRole("radiogroup", { name: "Qué se ve" });
    for (const nombre of ["Todo", "Relato", "Números"]) {
      expect(within(grupo).getByRole("radio", { name: nombre })).toBeInTheDocument();
    }
    expect(within(grupo).getByRole("radio", { name: "Todo" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("con «Números» puesto, el suceso de relato desaparece y el de números se queda", async () => {
    montar([RELATO, NUMEROS]);
    await waitFor(() => expect(screen.getByText("El puerto arde en el horizonte")).toBeVisible());

    fireEvent.click(screen.getByRole("radio", { name: "Números" }));

    expect(screen.queryByText("El puerto arde en el horizonte")).not.toBeInTheDocument();
    // El texto exacto de HP_CHANGED lo prueba `linea-de-log.test.ts`; aquí basta con que el
    // suceso siga en el DOM (`data-suceso`), que es la señal de que no se desmontó la lista.
    await waitFor(() =>
      expect(
        screen
          .getByRole("list", { name: "Sucesos de la sesión" })
          .querySelector('[data-suceso="e-numeros"]'),
      ).toBeTruthy(),
    );
  });

  it("con «Relato» puesto, el suceso de números desaparece y el de relato se queda", async () => {
    montar([RELATO, NUMEROS]);
    await waitFor(() => expect(screen.getByText("El puerto arde en el horizonte")).toBeVisible());

    fireEvent.click(screen.getByRole("radio", { name: "Relato" }));

    expect(
      screen
        .getByRole("list", { name: "Sucesos de la sesión" })
        .querySelector('[data-suceso="e-numeros"]'),
    ).toBeNull();
    expect(screen.getByText("El puerto arde en el horizonte")).toBeVisible();
  });

  // La misma lista, no una nueva: cambiar de filtro no desmonta ni remonta `<ol>`.
  it("el nodo de la lista es el mismo antes y después de cambiar de filtro", async () => {
    montar([RELATO, NUMEROS]);
    const listaAntes = await screen.findByRole("list", { name: "Sucesos de la sesión" });
    fireEvent.click(screen.getByRole("radio", { name: "Números" }));
    const listaDespues = screen.getByRole("list", { name: "Sucesos de la sesión" });
    expect(listaDespues).toBe(listaAntes);
  });
});
