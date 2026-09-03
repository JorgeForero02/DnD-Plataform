import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RollResult } from "@dnd/shared";
import { TirarBoton } from "../TirarBoton";
import * as api from "../api";

// Lo que importa aquí: que **la pantalla pida ventaja por nombre y no monte la expresión**. Si
// el navegador compusiera `2d20kh1`, la regla del juego viviría en dos sitios y el servidor
// tendría que fiarse de lo que le mandan.
//
// Desde F3, además: que ventaja y desventaja sean **una decisión de tres estados visible**, y que
// el resultado enseñe los dos dados con el descartado a la vista.

function tirada(parcial: Partial<RollResult> = {}): RollResult {
  return {
    eventId: "e1",
    expression: "1d20+3",
    rolls: [12],
    kept: [12],
    dropped: [],
    modifier: 3,
    total: 15,
    natural: "NONE",
    outcome: "NO_DC",
    ...parcial,
  };
}

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TirarBoton campaignId="c1" characterId="ch1" etiqueta="Percepción" modificador={3} />
    </QueryClientProvider>,
  );
}

describe("TirarBoton", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("las tres opciones están visibles a la vez, no escondidas en un desplegable", () => {
    montar();
    expect(screen.getByRole("radio", { name: "Normal" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Ventaja" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Desventaja" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("cada estado lleva su frase, y la del elegido se lee sin desplegar nada", () => {
    montar();
    // La frase visible es la del estado elegido; las otras dos existen ocultas, referidas por el
    // `aria-describedby` de su radio, así que se acota la aserción a la que se lee.
    const fraseVisible = () => document.querySelector('[data-frase="elegida"]');
    expect(fraseVisible()).toHaveTextContent("Un solo d20.");
    expect(screen.getByRole("radio", { name: "Ventaja" })).toHaveAccessibleDescription(
      "Dos d20: se queda el alto.",
    );
    expect(screen.getByRole("radio", { name: "Desventaja" })).toHaveAccessibleDescription(
      "Dos d20: se queda el bajo.",
    );

    fireEvent.click(screen.getByRole("radio", { name: "Ventaja" }));
    expect(screen.getByRole("radio", { name: "Ventaja" })).toBeChecked();
    expect(fraseVisible()).toHaveTextContent("Dos d20: se queda el alto.");

    fireEvent.click(screen.getByRole("radio", { name: "Desventaja" }));
    expect(fraseVisible()).toHaveTextContent("Dos d20: se queda el bajo.");
  });

  it("dos filas son dos decisiones: elegir ventaja en una no toca la otra", () => {
    // La hoja monta este control veinticuatro veces. Dos grupos de radios con el mismo `name`
    // son **un solo** grupo: pedir ventaja en Sigilo apagaría la de Percepción sin que nadie lo
    // note, porque cada fila se mira por separado.
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <TirarBoton campaignId="c1" characterId="ch1" etiqueta="Percepción" modificador={3} />
        <TirarBoton campaignId="c1" characterId="ch1" etiqueta="Sigilo" modificador={1} />
      </QueryClientProvider>,
    );

    const [ventajaPercepcion] = screen.getAllByRole("radio", { name: "Ventaja" });
    const [, normalSigilo] = screen.getAllByRole("radio", { name: "Normal" });
    fireEvent.click(ventajaPercepcion);

    expect(ventajaPercepcion).toBeChecked();
    expect(normalSigilo).toBeChecked();
  });

  it("una tirada normal manda la expresión con el modificador y mode NORMAL", async () => {
    const espia = vi.spyOn(api, "createRoll").mockResolvedValue(tirada());
    montar();

    fireEvent.click(screen.getByRole("button", { name: "Tirar Percepción" }));

    await waitFor(() =>
      expect(espia).toHaveBeenCalledWith("c1", expect.objectContaining({ mode: "NORMAL" })),
    );
    expect(espia).toHaveBeenCalledWith("c1", expect.objectContaining({ expression: "1d20+3" }));
  });

  it("con ventaja manda mode ADVANTAGE, NO una expresión de dos dados", async () => {
    const espia = vi
      .spyOn(api, "createRoll")
      .mockResolvedValue(
        tirada({ expression: "2d20kh1+3", rolls: [8, 17], kept: [17], dropped: [8], total: 20 }),
      );
    montar();

    fireEvent.click(screen.getByRole("radio", { name: "Ventaja" }));
    fireEvent.click(screen.getByRole("button", { name: "Tirar Percepción" }));

    await waitFor(() =>
      expect(espia).toHaveBeenCalledWith(
        "c1",
        expect.objectContaining({ mode: "ADVANTAGE", expression: "1d20+3" }),
      ),
    );
  });

  it("con desventaja manda mode DISADVANTAGE", async () => {
    const espia = vi
      .spyOn(api, "createRoll")
      .mockResolvedValue(
        tirada({ expression: "2d20kl1+3", rolls: [8, 17], kept: [8], dropped: [17], total: 11 }),
      );
    montar();

    fireEvent.click(screen.getByRole("radio", { name: "Desventaja" }));
    fireEvent.click(screen.getByRole("button", { name: "Tirar Percepción" }));

    await waitFor(() =>
      expect(espia).toHaveBeenCalledWith("c1", expect.objectContaining({ mode: "DISADVANTAGE" })),
    );
  });

  it("el resultado enseña los dos dados, el descartado y el desglose", async () => {
    vi.spyOn(api, "createRoll").mockResolvedValue(
      tirada({ expression: "2d20kh1+3", rolls: [8, 17], kept: [17], dropped: [8], total: 20 }),
    );
    montar();

    fireEvent.click(screen.getByRole("radio", { name: "Ventaja" }));
    fireEvent.click(screen.getByRole("button", { name: "Tirar Percepción" }));

    await screen.findByRole("status");
    const dados = document.querySelectorAll("[data-dado]");
    expect(dados).toHaveLength(2);
    expect(dados[0]).toHaveAttribute("data-dado", "descartado");
    expect(screen.getByText("se queda el alto")).toBeInTheDocument();
    expect(screen.getByText("20 = 17 dado +3 percepción")).toBeInTheDocument();
  });

  it("un rechazo del servidor se explica en línea y retira el resultado anterior", async () => {
    const espia = vi.spyOn(api, "createRoll").mockResolvedValue(tirada());
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Tirar Percepción" }));
    await screen.findByRole("status");

    espia.mockRejectedValueOnce(
      new Error("Solo el dueño del personaje o el DM pueden tirar por él"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Tirar Percepción" }));

    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent("Solo el dueño del personaje o el DM pueden tirar por él");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
