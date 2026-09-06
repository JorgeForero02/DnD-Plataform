import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PanelDeIniciativa } from "../PanelDeIniciativa";
import type { RollRequestRow } from "../api";
import * as characterSheetApi from "../../character-sheet/api";

// Tarea 9 (plan 2026-09-05-iniciativa-y-bando) — lo que se prueba aquí es **lo que puede
// romperse en silencio** en el panel grande, no lo que ya cubre `TiradasPendientes.test.tsx`:
//
//  · que no hay forma de cerrarlo sin tirar — el brief lo pide con estas palabras;
//  · que un modo distinto de NORMAL se dice, porque el DM puede pedir iniciativa con ventaja;
//  · que el botón, al apagarse, dice por qué (`aria-describedby`), no solo se apaga.
//
// **Lo que NO se prueba: un modificador «+3».** El brief de la tarea 8 lo pedía, pero
// `RollRequestRow` (`features/roll-requests/api.ts`) no trae ningún campo de modificador —se
// comprobó leyendo `RollRequestsService.list` y el tipo escrito a mano, no se asumió—, así que
// pintarlo sería inventar un número que el servidor nunca mandó. Detalle completo en el informe
// de esta tarea.

const CAMPANA = "camp-1";

const PETICION: RollRequestRow = {
  id: "req-1",
  campaignId: CAMPANA,
  characterId: "ch-1",
  requestedById: "dm1",
  key: "save.dex",
  label: "Tirad iniciativa",
  dc: null,
  mode: "NORMAL",
  audience: "PUBLIC",
  createdAt: "2026-01-01",
  resolvedAt: null,
  resolvedEventId: null,
  encounterId: "enc-1",
};

function pintar(props: Partial<Parameters<typeof PanelDeIniciativa>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PanelDeIniciativa
        peticion={PETICION}
        campaignId={CAMPANA}
        nombrePersonaje="Brann"
        conInspiracion={false}
        onCambiarInspiracion={() => {}}
        onTirar={() => {}}
        tirando={false}
        {...props}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  // Sin inspiración: el control de `GastarInspiracion` no se pinta y no interfiere con las
  // aserciones de este fichero, que son sobre el panel, no sobre ese control (ya probado en
  // `rolls/panel/__tests__/GastarInspiracion.test.tsx` si existe, o en `TiradasPendientes`).
  vi.spyOn(characterSheetApi, "fetchResources").mockResolvedValue([]);
});

describe("PanelDeIniciativa", () => {
  it("dice que empieza el combate y enseña la frase del DM", () => {
    pintar();

    expect(screen.getByText(/empieza el combate/i)).toBeInTheDocument();
    expect(screen.getByText(/Tirad iniciativa/)).toBeInTheDocument();
  });

  it("no se puede cerrar sin tirar", () => {
    pintar();

    expect(screen.queryByRole("button", { name: /cerrar|cancelar/i })).not.toBeInTheDocument();
  });

  it("si el modo no es normal, lo dice", () => {
    pintar({ peticion: { ...PETICION, mode: "ADVANTAGE" } });

    expect(screen.getByText(/Ventaja/)).toBeInTheDocument();
  });

  it("con el modo normal no dice nada del modo", () => {
    pintar();

    expect(screen.queryByText(/Ventaja|Desventaja/)).not.toBeInTheDocument();
  });

  it("tirando, el botón se apaga y dice por qué", () => {
    pintar({ tirando: true });

    const boton = screen.getByRole("button", { name: /Tirar iniciativa/i });
    expect(boton).toHaveAttribute("aria-disabled", "true");
    const idDelMotivo = boton.getAttribute("aria-describedby");
    expect(idDelMotivo).toBeTruthy();
    expect(document.getElementById(idDelMotivo as string)).toHaveTextContent(/en camino/i);
  });

  it("pulsar «Tirar iniciativa» llama a onTirar", () => {
    const onTirar = vi.fn();
    pintar({ onTirar });

    fireEvent.click(screen.getByRole("button", { name: /Tirar iniciativa/i }));

    expect(onTirar).toHaveBeenCalledTimes(1);
  });
});
