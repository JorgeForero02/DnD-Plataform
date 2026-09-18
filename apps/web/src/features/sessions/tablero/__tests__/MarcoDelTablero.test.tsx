import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarcoDelTablero } from "../MarcoDelTablero";
import * as entitiesApi from "../../../entities/api";
import * as logApi from "../../log-api";

// Task 5 (3A.3) — `MarcoDelTablero` ganó una cabecera (`CabeceraDelMarco`) que deriva el lugar de
// la escena, así que este componente ya no es puro: pide `campaignId` y hace dos consultas de
// React Query. Mismo patrón que `hilo/__tests__/HiloDeSesion.test.tsx` — `QueryClientProvider` de
// verdad, retry apagado, y las dos puertas de datos mockeadas para no salir a la red.

function montar(url = "https://tablero.example/game/la-mesa") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MarcoDelTablero campaignId="c1" url={url} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
  vi.spyOn(logApi, "fetchGameEvents").mockResolvedValue({ events: [], nextCursor: null });
});

describe("MarcoDelTablero", () => {
  it("enmarca la partida con la política de referrer y los permisos del portapapeles", () => {
    montar("https://tablero.example/game/la-mesa");
    const marco = screen.getByTitle("Sala del tablero");
    expect(marco).toHaveAttribute("src", "https://tablero.example/game/la-mesa");
    expect(marco).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(marco).toHaveAttribute("allow", "clipboard-read; clipboard-write");
    // Cada jugador inicia sesión en PlanarAlly dentro del marco, una vez por navegador: se dice
    // debajo, siempre, en una línea (no es un aviso que se cierra: es cómo funciona).
    expect(screen.getByText(/inicia sesión en el tablero dentro del marco/)).toBeInTheDocument();
  });

  // Task 5 — la cabecera nueva: sin ningún `ENTITY_REVEALED` de tipo `LOCATION` en el registro,
  // no se inventa un lugar (misma regla que `BandaUnica`), y el enlace de «abrir aparte» apunta a
  // la MISMA url que el iframe — es la sala de la partida, no un sitio distinto.
  it("sin lugar revelado, la cabecera lo dice y el enlace de abrir aparte va a la sala", () => {
    montar("https://tablero.example/game/la-mesa");
    expect(screen.getByText("Sin escena revelada")).toBeInTheDocument();
    const enlace = screen.getByRole("link", { name: /Tablero en vivo/ });
    expect(enlace).toHaveAttribute("href", "https://tablero.example/game/la-mesa");
    expect(enlace).toHaveAttribute("target", "_blank");
    expect(enlace).toHaveAttribute("rel", "noreferrer");
  });

  it("con un lugar revelado en el registro, la cabecera dice su nombre", async () => {
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([
      {
        id: "loc-1",
        campaignId: "c1",
        type: "LOCATION",
        name: "El almacén cuatro",
        visibility: "PLAYERS",
        summary: null,
        body: null,
        tags: [],
        createdAt: "2026-09-18T20:00:00.000Z",
        updatedAt: "2026-09-18T20:00:00.000Z",
      } as never,
    ]);
    vi.spyOn(logApi, "fetchGameEvents").mockResolvedValue({
      events: [
        {
          id: "e1",
          campaignId: "c1",
          sessionId: "s1",
          actorUserId: "u-dm",
          type: "ENTITY_REVEALED",
          subjectType: "entity",
          subjectId: "loc-1",
          payload: { type: "ENTITY_REVEALED", entityName: "El almacén cuatro" },
          visibility: "PLAYERS",
          createdAt: "2026-09-18T20:05:00.000Z",
        } as never,
      ],
      nextCursor: null,
    });
    montar();
    expect(await screen.findByText("El almacén cuatro")).toBeInTheDocument();
  });
});
