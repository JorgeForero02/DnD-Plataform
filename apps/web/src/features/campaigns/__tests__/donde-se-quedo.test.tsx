import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Cronicas } from "../Cronicas";
import * as api from "../api";
import * as sessionsApi from "../../sessions/api";

// D-OP-17 — «dónde se quedó» deja de ser una promesa.
//
// Hasta hoy esta tarjeta pintaba la **descripción** de la campaña y, si no la había, una frase que
// decía dónde se leerá la crónica cuando exista. El servidor ya manda `lastRecap`, **ya filtrada
// por la visibilidad propia de la crónica**, así que aquí solo se comprueba que se prefiere lo
// real a la promesa — y que cuando no viaja **no se inventa nada**.

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Cronicas onCrear={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const campana = (over: Record<string, unknown> = {}) => ({
  id: "c1",
  name: "La costa de la espada",
  description: "Una campaña de piratas",
  ownerId: "u1",
  createdAt: "2026-09-01",
  ...over,
});

describe("«dónde se quedó» (D-OP-17)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(null);
  });

  it("**pinta la crónica de la última sesión cerrada, no la descripción**", async () => {
    vi.spyOn(api, "fetchCampaigns").mockResolvedValue([
      campana({
        lastRecap: {
          text: "Huyeron del puerto con el cofre",
          sessionTitle: "La noche del puerto",
          endedAt: "2026-09-04T22:00:00.000Z",
        },
      }),
    ] as never);

    montar();

    expect(await screen.findByText(/Huyeron del puerto con el cofre/)).toBeInTheDocument();
    // La descripción deja de pintarse: la crónica es más reciente y más cierta.
    expect(screen.queryByText("Una campaña de piratas")).not.toBeInTheDocument();
    // Y se dice de qué sesión sale, porque «dónde se quedó» sin sesión es un texto suelto.
    expect(screen.getByText(/La noche del puerto/)).toBeInTheDocument();
  });

  it("sin crónica, cae en la descripción — el comportamiento de antes", async () => {
    vi.spyOn(api, "fetchCampaigns").mockResolvedValue([campana()] as never);
    montar();
    expect(await screen.findByText("Una campaña de piratas")).toBeInTheDocument();
  });

  it("**sin crónica y sin descripción NO se inventa un resumen**", async () => {
    vi.spyOn(api, "fetchCampaigns").mockResolvedValue([campana({ description: null })] as never);
    montar();
    expect(await screen.findByText(/este es el sitio donde se leerá/)).toBeInTheDocument();
  });

  it("una crónica que el servidor no manda se pinta igual que si no hubiera ninguna", async () => {
    // El servidor omite el campo cuando el espectador no puede leerla, así que **no hay forma de
    // distinguir «no hay crónica» de «hay una y no la ves»** — y eso es deliberado: distinguirlas
    // contaría que existe algo escondido.
    vi.spyOn(api, "fetchCampaigns").mockResolvedValue([campana({ description: null })] as never);
    montar();
    expect(await screen.findByText(/este es el sitio donde se leerá/)).toBeInTheDocument();
    expect(screen.queryByText(/no puedes/i)).not.toBeInTheDocument();
  });
});
