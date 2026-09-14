import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReglasDeLaMesa } from "../ReglasDeLaMesa";
import { reglasCompletas, AVISO_NO_RETROACTIVO } from "../reglas";
import * as hooks from "../hooks";
import * as characterSheetHooks from "../../character-sheet/hooks";

// Task 5 (spec 2026-09-12, D-CF-53) — el bloque «Reglas de la mesa» en los ajustes de campaña.
// Mismo patrón de montaje que CampaignSettings.test.tsx: QueryClientProvider alrededor, y aquí
// además dos mocks propios — useUpdateCampaign (mutate espía) y useCatalog (dos razas, dos
// clases con una subclase cada una) — para no depender de una red real.
//
// `fireEvent`, no `userEvent`: `@testing-library/user-event` no es una dependencia de este
// paquete (ver el mismo aviso en `ui/__tests__/MenuDeAcciones.test.tsx`).

const mutate = vi.fn();

const catalogo = {
  races: [
    { key: "human", name: "Humano", subraces: [] },
    { key: "elf", name: "Elfo", subraces: [] },
  ],
  classes: [
    {
      key: "fighter",
      name: "Guerrero",
      hitDie: 10,
      subclasses: [{ key: "champion", name: "Campeón", chosenAtLevel: 3 }],
    },
    {
      key: "wizard",
      name: "Mago",
      hitDie: 6,
      subclasses: [{ key: "evocation", name: "Evocación", chosenAtLevel: 2 }],
    },
  ],
  armor: [],
};

function montar(props: Parameters<typeof ReglasDeLaMesa>[0]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ReglasDeLaMesa {...props} />
    </QueryClientProvider>,
  );
}

describe("ReglasDeLaMesa", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mutate.mockReset();
    vi.spyOn(hooks, "useUpdateCampaign").mockReturnValue({
      mutate,
      isPending: false,
      isError: false,
    } as never);
    vi.spyOn(characterSheetHooks, "useCatalog").mockReturnValue({
      data: catalogo,
    } as never);
  });

  it("pinta las reglas actuales: radios marcados y listas con nombres legibles, nunca claves", () => {
    montar({
      campaignId: "c1",
      reglas: reglasCompletas({
        abilities: { metodo: "PUNTOS" },
        permitidos: { clases: ["fighter"] },
      }),
      disabled: false,
    });
    expect(screen.getByRole("radio", { name: /Compra por puntos/ })).toBeChecked();
    expect(screen.getByLabelText("Puntos a repartir")).toHaveValue(27);
    expect(screen.getByRole("checkbox", { name: "Guerrero" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Mago" })).not.toBeChecked();
    expect(screen.queryByText(/PUNTOS|fighter|MEDIA/)).toBeNull();
    expect(screen.getByText(AVISO_NO_RETROACTIVO)).toBeVisible();
  });

  it("con dados enseña expresión, intentos y la casilla de asignación; con oro fijo, la cantidad", () => {
    montar({ campaignId: "c1", reglas: reglasCompletas({}), disabled: false });
    expect(screen.queryByLabelText("Expresión de dados")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /Con dados/ }));
    expect(screen.getByLabelText("Expresión de dados")).toHaveValue("4d6kh3");
    expect(screen.getByLabelText("Intentos")).toHaveValue(1);
    expect(
      screen.getByRole("checkbox", { name: "Reparten libremente los seis valores" }),
    ).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: /Oro fijo/ }));
    expect(screen.getByLabelText("Oro inicial (po)")).toBeVisible();
  });

  it("Guardar manda el objeto entero por PATCH { tableRules } y pinta el error del servidor en línea", async () => {
    mutate.mockImplementation((_v, opts) =>
      opts?.onError?.(new Error("La expresión «4d» no tiene número de caras.")),
    );
    montar({ campaignId: "c1", reglas: reglasCompletas({}), disabled: false });
    fireEvent.click(screen.getByRole("radio", { name: /Con dados/ }));
    const expresion = screen.getByLabelText("Expresión de dados");
    fireEvent.change(expresion, { target: { value: "4d" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar las reglas" }));
    expect(mutate).toHaveBeenCalledWith(
      {
        tableRules: expect.objectContaining({
          abilities: { metodo: "DADOS", expresion: "4d", intentos: 1, asignacionLibre: true },
          nivelInicial: 1,
        }),
      },
      expect.anything(),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("4d");
  });

  // Puerta de efectos §5 bis (D-CF-53/D-CF-68) — la regla de progresión.
  it("hay dos radios «Por hito» / «Por experiencia», y guardar manda «progresion»", () => {
    mutate.mockReset();
    montar({ campaignId: "c1", reglas: reglasCompletas({ progresion: "XP" }), disabled: false });

    expect(screen.getByRole("radio", { name: /Por experiencia/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Por hito/ })).not.toBeChecked();

    fireEvent.click(screen.getByRole("radio", { name: /Por hito/ }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar las reglas" }));

    expect(mutate).toHaveBeenCalledWith(
      { tableRules: expect.objectContaining({ progresion: "HITO" }) },
      expect.anything(),
    );
  });

  it("el botón de guardar no se deshabilita para un jugador: los controles sí, con el motivo a la vista", () => {
    montar({
      campaignId: "c1",
      reglas: reglasCompletas({}),
      disabled: true,
      motivo: "Solo el DM puede editar la campaña.",
    });
    expect(screen.getByRole("radio", { name: /Libres/ })).toBeDisabled();
    expect(screen.getByText("Solo el DM puede editar la campaña.")).toBeVisible();
  });
});
