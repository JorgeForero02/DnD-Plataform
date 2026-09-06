import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as members from "../../campaigns/members";
import { useAuthStore } from "../../../store/auth.store";
import * as api from "../api";
import { RecursosYDescansos } from "../RecursosYDescansos";

// **Paso 1, tarea 10 — se puede crear un recurso desde la aplicación.**
//
// `PUT /campaigns/:c/characters/:p/resources/:key` existe desde 2A y **la web no lo llamaba
// nunca**: llamaba a `/spend`, `/give` y `/restore`. Así que se podía gastar, regalar y reponer un
// recurso y **no crearlo**, y como `seedResourcesFor` solo siembra dados de golpe y espacios de
// conjuro, una fila «Furia» no podía existir — ni con ella ninguna aptitud con usos.

function montar(rol: "DM" | "PLAYER") {
  useAuthStore.setState({ user: { id: "u-yo", email: "x@y.z", displayName: "Yo" } as never });
  vi.spyOn(members, "useMembers").mockReturnValue({
    data: [{ userId: "u-yo", displayName: "Yo", role: rol }],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RecursosYDescansos campaignId="c1" characterId="ch1" puedeEditar />
    </QueryClientProvider>,
  );
}

describe("crear un recurso desde la hoja (paso 1, tarea 10)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchResources").mockResolvedValue([]);
  });

  it("el DM crea un recurso con nombre y máximo, y nace lleno", async () => {
    const crear = vi.spyOn(api, "upsertResource").mockResolvedValue({} as never);
    montar("DM");

    fireEvent.click(await screen.findByRole("button", { name: /nuevo recurso/i }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Furia" } });
    fireEvent.change(screen.getByLabelText("Máximo"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /^crear$/i }));

    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith(
        "c1",
        "ch1",
        // **Nace lleno**: un recurso recién declarado con cero usos no sirve para nada hasta que
        // alguien lo reponga, y nadie pide eso.
        expect.objectContaining({ label: "Furia", max: 2, current: 2, key: "furia" }),
      ),
    );
  });

  it("la reposición son RADIOS con su frase, no un desplegable", async () => {
    montar("DM");
    fireEvent.click(await screen.findByRole("button", { name: /nuevo recurso/i }));

    // Tres opciones con significado, visibles a la vez (`docs/04-convenciones.md`).
    expect(screen.getByRole("radio", { name: /Descanso largo/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Descanso corto/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /No se repone solo/ })).toBeInTheDocument();
    // Y cada una lleva su frase: el rótulo solo no dice qué hace.
    expect(screen.getByText(/Vuelve al máximo al dormir/)).toBeInTheDocument();
    // **Ningún valor de enumeración llega a la pantalla.**
    expect(screen.queryByText("LONG_REST")).not.toBeInTheDocument();
  });
});

describe("y un jugador no puede crearse uno que solo sube el DM", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchResources").mockResolvedValue([]);
  });

  it("no se le ofrece la opción, y sí puede crearse uno suyo", async () => {
    // **La regla es del servidor y está medida**: `resources.service.upsert` solo rechaza si el
    // recurso es `DM_ONLY` y quien llama no es DM. Un jugador SÍ puede crearse uno `OWNER`.
    // Esconder la opción no es el control: es no ofrecer un botón que va a dar 403.
    montar("PLAYER");

    fireEvent.click(await screen.findByRole("button", { name: /nuevo recurso/i }));
    expect(screen.queryByRole("radio", { name: /solo el dm lo repone/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^crear$/i })).toBeInTheDocument();
  });
});
