import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as rollsApi from "../api";
import type { PaginaDeTiradas } from "../api";
import { RegistroDeTiradas } from "../RegistroDeTiradas";

// Ficha C2C-7 — **«solo las mías» en el registro de tiradas.**
//
// Lo que puede romperse en silencio no es que el radio se pinte: es **qué se le pide al
// servidor**. `mine` existe además de `characterId` porque un jugador puede llevar varios
// personajes, así que resolverlo en el cliente sería mandar N peticiones para una pregunta; si
// esta pantalla dejara de mandar la bandera, el registro seguiría enseñando algo —las de la
// mesa— y nadie notaría que el control no hace nada.

const CAMPANA = "camp-1";
const REGISTRO_VACIO: PaginaDeTiradas = { events: [], nextCursor: null };

function pintar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RegistroDeTiradas campaignId={CAMPANA} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("RegistroDeTiradas — el ámbito (C2C-7)", () => {
  it("empieza en «todas las de la mesa», y **sin mandar `mine`**", async () => {
    const leer = vi.spyOn(rollsApi, "fetchRolls").mockResolvedValue({ ...REGISTRO_VACIO });
    pintar();

    await waitFor(() => expect(leer).toHaveBeenCalledWith(CAMPANA, {}));
    expect(screen.getByRole("radio", { name: /Todas las de la mesa/ })).toBeChecked();
  });

  it("elegir «Solo las mías» vuelve a pedir el registro con `mine: true`", async () => {
    const leer = vi.spyOn(rollsApi, "fetchRolls").mockResolvedValue({ ...REGISTRO_VACIO });
    pintar();
    await waitFor(() => expect(leer).toHaveBeenCalledWith(CAMPANA, {}));

    fireEvent.click(screen.getByRole("radio", { name: /Solo las mías/ }));

    await waitFor(() => expect(leer).toHaveBeenCalledWith(CAMPANA, { mine: true }));
    expect(screen.getByRole("radio", { name: /Solo las mías/ })).toBeChecked();
  });

  it("son **radios con su frase**, no un desplegable: dos opciones con significado distinto", async () => {
    vi.spyOn(rollsApi, "fetchRolls").mockResolvedValue({ ...REGISTRO_VACIO });
    pintar();

    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      screen.getByText("Las de tus personajes. Son todos: un jugador puede llevar más de uno."),
    ).toBeInTheDocument();
  });

  it("conserva el filtro que le llega por propiedad y le suma el ámbito", async () => {
    const leer = vi.spyOn(rollsApi, "fetchRolls").mockResolvedValue({ ...REGISTRO_VACIO });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <RegistroDeTiradas campaignId={CAMPANA} filtro={{ sessionId: "s1" }} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(leer).toHaveBeenCalledWith(CAMPANA, { sessionId: "s1" }));

    fireEvent.click(screen.getByRole("radio", { name: /Solo las mías/ }));

    await waitFor(() =>
      expect(leer).toHaveBeenCalledWith(CAMPANA, { sessionId: "s1", mine: true }),
    );
  });
});
