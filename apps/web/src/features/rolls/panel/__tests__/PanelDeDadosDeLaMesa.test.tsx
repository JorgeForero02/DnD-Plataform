import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { PanelDeDadosDeLaMesa } from "../PanelDeDadosDeLaMesa";
import * as rollRequestsApi from "../../../roll-requests/api";

// Round 2 de revisión (anexo #8) — **el cajón compacto tampoco se mueve al escribir.** Mismo
// defecto que se cazó en la pantalla «Dados» —el radio de ventaja se montaba y desmontaba con
// cada tecla— y el brief pide comprobar el cajón por el mismo camino: rendir, escribir una
// expresión que no admite ventaja, y que el radiogroup y el botón «Tirar» sigan los dos en el
// documento (apagado el radio, no ausente).

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function pintar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<PanelDeDadosDeLaMesa campaignId="camp-1" onCerrar={() => {}} />, {
    wrapper: wrapper(qc),
  });
}

describe("PanelDeDadosDeLaMesa — el radio de ventaja no se desmonta al escribir (anexo #8)", () => {
  it("escribir una expresión inválida deja montados el radiogroup y el botón Tirar", () => {
    vi.spyOn(rollRequestsApi, "fetchDifficultyClasses").mockResolvedValue([]);
    pintar();

    // La bandeja empieza con un d20: el radio de ventaja ya está habilitado antes de tocar nada.
    expect(screen.getByRole("radiogroup", { name: /ventaja/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Normal" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Tirar" })).toBeInTheDocument();

    fireEvent.click(screen.getByText("Modo avanzado"));
    fireEvent.change(screen.getByLabelText("Qué se tira"), { target: { value: "4d" } });

    // Sigue montado — apagado, con su motivo — y el botón sigue ahí: nada desaparece del cajón.
    expect(screen.getByRole("radiogroup", { name: /ventaja/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Normal" })).toBeDisabled();
    expect(screen.getByText("Solo con un d20 al principio de la tirada.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tirar" })).toBeInTheDocument();
  });
});
