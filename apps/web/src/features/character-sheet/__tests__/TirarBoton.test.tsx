import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TirarBoton } from "../TirarBoton";
import * as api from "../api";

// Lo que importa aquí: que **la pantalla pida ventaja por nombre y no monte la expresión**. Si
// el navegador compusiera `2d20kh1`, la regla del juego viviría en dos sitios y el servidor
// tendría que fiarse de lo que le mandan.

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

  it("una tirada normal manda la expresión con el modificador y mode NORMAL", async () => {
    const espia = vi
      .spyOn(api, "createRoll")
      .mockResolvedValue({ total: 15, rolls: [12] } as never);
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
      .mockResolvedValue({ total: 20, rolls: [8, 17] } as never);
    montar();

    fireEvent.click(screen.getByRole("button", { name: "Tirar Percepción con ventaja" }));

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
      .mockResolvedValue({ total: 11, rolls: [8, 17] } as never);
    montar();

    fireEvent.click(screen.getByRole("button", { name: "Tirar Percepción con desventaja" }));

    await waitFor(() =>
      expect(espia).toHaveBeenCalledWith("c1", expect.objectContaining({ mode: "DISADVANTAGE" })),
    );
  });
});
