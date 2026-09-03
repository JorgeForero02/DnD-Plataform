import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RollResultRevealed } from "@dnd/shared";
import { TirarBoton } from "../TirarBoton";
import * as api from "../api";

// Lo que importa aquí: que **la pantalla pida ventaja por nombre y no monte la expresión**. Si
// el navegador compusiera `2d20kh1`, la regla del juego viviría en dos sitios y el servidor
// tendría que fiarse de lo que le mandan.
//
// Desde F3, además: que ventaja y desventaja sean **una decisión de tres estados visible**, y que
// el resultado enseñe los dos dados con el descartado a la vista.
//
// **Desde la adopción de la maqueta (2026-09-03) hay un paso más, y es el punto de todo esto**:
// la fila de la hoja lleva solo un dado, y la decisión aparece al pulsarlo. Cada prueba abre el
// panel primero, igual que hace una persona. La regla vinculante —«una opción con significado va
// visible, con la frase que explica qué hace»— se cumple **dentro** de ese panel, y con las tres
// frases a la vez, que es más de lo que se pintaba antes: repetir el control en las veinticuatro
// filas obligaba a enseñar solo la del estado elegido.

function tirada(parcial: Partial<RollResultRevealed> = {}): RollResultRevealed {
  return {
    // 2C.1: el resultado es una unión discriminada, y estas pruebas miran el desglose.
    revealed: true,
    audience: "PUBLIC",
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
  const r = render(
    <QueryClientProvider client={qc}>
      <TirarBoton campaignId="c1" characterId="ch1" etiqueta="Percepción" modificador={3} />
    </QueryClientProvider>,
  );
  abrir("Percepción");
  return r;
}

/** Pulsa el dado de una fila, que es lo que abre el panel donde se decide y se tira. */
function abrir(etiqueta: string) {
  fireEvent.click(screen.getByRole("button", { name: `Tirada de ${etiqueta}` }));
}

describe("TirarBoton", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("la fila solo lleva el dado: la decisión no se pinta veinticuatro veces", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <TirarBoton campaignId="c1" characterId="ch1" etiqueta="Percepción" modificador={3} />
      </QueryClientProvider>,
    );

    // Cerrado no hay ni un radio en el DOM. Es la mitad del arreglo: la otra mitad —que sí están
    // al abrir— es la prueba de debajo, y sin las dos juntas «esconder la opción» pasaría en
    // verde, que es justo lo que la regla prohíbe.
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tirada de Percepción" })).toBeInTheDocument();
  });

  it("las tres opciones están visibles a la vez, no escondidas en un desplegable", () => {
    montar();
    expect(screen.getByRole("radio", { name: "Normal" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Ventaja" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Desventaja" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("cada opción lleva su frase AL LADO, las tres a la vez y no solo la elegida", () => {
    montar();
    // Las tres se leen sin tocar nada — es lo que pide la regla vinculante — y además cada una
    // es la **descripción** de su radio, no parte de su nombre: dentro del `<label>` un lector
    // de pantalla anunciaría «Ventaja Dos d20: se queda el alto» como si fuera cómo se llama el
    // control.
    expect(screen.getByText("Un solo d20.")).toBeVisible();
    expect(screen.getByText("Dos d20: se queda el alto.")).toBeVisible();
    expect(screen.getByText("Dos d20: se queda el bajo.")).toBeVisible();

    expect(screen.getByRole("radio", { name: "Normal" })).toHaveAccessibleDescription(
      "Un solo d20.",
    );
    expect(screen.getByRole("radio", { name: "Ventaja" })).toHaveAccessibleDescription(
      "Dos d20: se queda el alto.",
    );
    expect(screen.getByRole("radio", { name: "Desventaja" })).toHaveAccessibleDescription(
      "Dos d20: se queda el bajo.",
    );

    fireEvent.click(screen.getByRole("radio", { name: "Ventaja" }));
    expect(screen.getByRole("radio", { name: "Ventaja" })).toBeChecked();
  });

  it("dos filas son dos decisiones: elegir ventaja en una no toca la otra", () => {
    // Dos paneles abiertos a la vez son dos decisiones. Dos grupos de radios con el mismo `name`
    // serían **un solo** grupo: pedir ventaja en Sigilo apagaría la de Percepción sin que nadie
    // lo note, porque cada fila se mira por separado. El `useId` de `SelectorDeVentaja` es lo que
    // lo impide, y esto es lo que lo vigila.
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <TirarBoton campaignId="c1" characterId="ch1" etiqueta="Percepción" modificador={3} />
        <TirarBoton campaignId="c1" characterId="ch1" etiqueta="Sigilo" modificador={1} />
      </QueryClientProvider>,
    );

    abrir("Percepción");
    abrir("Sigilo");

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
