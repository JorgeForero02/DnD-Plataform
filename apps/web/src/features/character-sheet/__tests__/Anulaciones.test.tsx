import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Overrides } from "@dnd/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Anulaciones } from "../Anulaciones";
import * as api from "../api";
import * as members from "../../campaigns/members";

// Lo que importa de este panel: que **solo lo vea el DM** —el servidor lo impone, pero enseñar
// un control que va a dar 403 es una mentira de interfaz—, que el valor viaje tal cual, y que
// la clave anulada se pinte traducida y nunca como `ac` a pelo.

function montar(overrides: Overrides | null = null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Anulaciones campaignId="c1" characterId="ch1" overrides={overrides} />
    </QueryClientProvider>,
  );
}

describe("Anulaciones del DM", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(members, "useMyRole").mockReturnValue({
      role: "DM",
      isLoading: false,
      isError: false,
      retry: () => {},
    });
  });

  it("un jugador no ve el panel siquiera", () => {
    vi.spyOn(members, "useMyRole").mockReturnValue({
      role: "PLAYER",
      isLoading: false,
      isError: false,
      retry: () => {},
    });

    const { container } = montar();

    expect(container).toBeEmptyDOMElement();
  });

  it("mientras el papel no se sabe, tampoco: no se adivina un permiso", () => {
    vi.spyOn(members, "useMyRole").mockReturnValue({
      role: undefined,
      isLoading: true,
      isError: false,
      retry: () => {},
    });

    const { container } = montar();

    expect(container).toBeEmptyDOMElement();
  });

  it("manda el valor y el motivo tal y como se escriben", async () => {
    const espia = vi.spyOn(api, "setOverride").mockResolvedValue({} as never);
    montar();

    fireEvent.change(screen.getByLabelText("Valor a anular"), { target: { value: "ac" } });
    fireEvent.change(screen.getByLabelText("Nuevo valor"), { target: { value: "18" } });
    fireEvent.change(screen.getByLabelText("Motivo de la anulación"), {
      target: { value: "Anillo de protección" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Anular" }));

    await waitFor(() =>
      expect(espia).toHaveBeenCalledWith("c1", "ch1", "ac", 18, "Anillo de protección"),
    );
  });

  it("una anulación puesta se ve con su nombre en español, nunca con la clave", () => {
    montar({ ac: 18 });

    expect(screen.getByText("Clase de armadura: fijada a 18")).toBeInTheDocument();
    expect(screen.queryByText(/^ac:/)).not.toBeInTheDocument();
  });

  // Ticket J7 (2026-09-11) — el motivo ya no se pierde: se guarda junto al valor
  // (`{ value, reason }`, unión sin migración) y este panel lo enseña, a través del único sitio
  // que sabe leer las dos formas (`normalizeOverride`, `@dnd/shared`).
  it("ticket J7 — una anulación con motivo lo enseña tras un guion largo", () => {
    montar({ ac: { value: 18, reason: "El DM lo dice" } });

    expect(screen.getByText("Clase de armadura: fijada a 18 — El DM lo dice")).toBeInTheDocument();
  });

  it("ticket J7 — una fila legada (un número a secas) no enseña ningún motivo", () => {
    montar({ ac: 18 });

    expect(screen.getByText("Clase de armadura: fijada a 18")).toBeInTheDocument();
    expect(screen.queryByText(/—/)).not.toBeInTheDocument();
  });

  it("quitarla llama al borrado con esa clave", async () => {
    const espia = vi.spyOn(api, "clearOverride").mockResolvedValue({} as never);
    montar({ ac: 18 });

    fireEvent.click(
      screen.getByRole("button", { name: "Quitar la anulación de Clase de armadura" }),
    );

    await waitFor(() => expect(espia).toHaveBeenCalledWith("c1", "ch1", "ac"));
  });
});
