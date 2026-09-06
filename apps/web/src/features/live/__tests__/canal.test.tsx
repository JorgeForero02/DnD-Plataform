import { act, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCanalEnVivo } from "../canal";

// Ronda de arreglo 1 (tarea 8, 2026-09-05, iniciativa y bando) — **el encuentro en curso se
// refresca con el aviso, no solo con el sondeo.**
//
// Hasta esta ronda el canal invalidaba `["campaigns", campaignId, …]` y `notificationsKey`, y
// nada más: `currentEncounterKey` (`features/encounters/hooks.ts`) es
// `["encounters", campaignId, sessionId, "current"]`, con «encounters» como raíz y no
// «campaigns», así que el aviso no la tocaba. La sala de espera (tarea 8) se quedaba con «0 de 3»
// hasta el siguiente sondeo de 10 s aunque los tres ya hubieran tirado — la pantalla entera
// existe para lo contrario. Esta prueba sujeta que el aviso SÍ invalida esa consulta, de
// cualquier sesión de la campaña (el aviso no lleva `sessionId`, solo `campaignId`).

vi.mock("../../../lib/api", () => ({
  apiFetch: vi.fn().mockResolvedValue({ ticket: "billete-1" }),
}));

class FuenteFalsa {
  static instancias: FuenteFalsa[] = [];
  onmessage: ((evento: { data: string }) => void) | null = null;
  close = vi.fn();
  constructor(readonly url: string) {
    FuenteFalsa.instancias.push(this);
  }
}

function Sonda({ campaignId }: { campaignId: string }) {
  useCanalEnVivo(campaignId);
  return null;
}

async function montar(qc: QueryClient, campaignId = "c1") {
  const resultado = render(
    <QueryClientProvider client={qc}>
      <Sonda campaignId={campaignId} />
    </QueryClientProvider>,
  );
  // El billete se pide de forma asíncrona antes de abrir el `EventSource`.
  await waitFor(() => expect(FuenteFalsa.instancias.length).toBeGreaterThan(0));
  return resultado;
}

beforeEach(() => {
  // **`clearAllMocks`, no `restoreAllMocks`.** `apiFetch` de arriba es un `vi.fn()` de fábrica,
  // sin implementación «original» a la que restaurar: `restoreAllMocks` lo deja como un mock
  // vacío que resuelve `undefined`, y `pedirBillete` (`canal.ts`) revienta al desestructurar
  // `{ ticket }` de eso — el canal nunca llega a abrir el `EventSource`. `clearAllMocks` limpia
  // las llamadas y conserva el `mockResolvedValue`, que es lo que hace falta entre pruebas.
  vi.clearAllMocks();
  FuenteFalsa.instancias.length = 0;
  (globalThis as unknown as { EventSource: unknown }).EventSource = FuenteFalsa;
  try {
    window.localStorage.removeItem("canal-en-vivo");
  } catch {
    // sin almacenamiento, el canal queda encendido por defecto — nada que limpiar.
  }
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("el canal en vivo invalida el encuentro en curso", () => {
  it("un aviso de la campaña invalida `currentEncounterKey`, sin importar la sesión", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const clave = ["encounters", "c1", "s1", "current"] as const;
    qc.setQueryData(clave, { id: "e1" });
    expect(qc.getQueryState(clave)?.isInvalidated).toBeFalsy();

    await montar(qc, "c1");
    const fuente = FuenteFalsa.instancias[0];
    expect(fuente).toBeDefined();

    act(() => {
      fuente.onmessage?.({ data: JSON.stringify({ type: "X", campaignId: "c1" }) });
    });

    expect(qc.getQueryState(clave)?.isInvalidated).toBe(true);
  });

  it("no invalida el encuentro de otra campaña", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const claveAjena = ["encounters", "c2", "s9", "current"] as const;
    qc.setQueryData(claveAjena, { id: "e2" });

    await montar(qc, "c1");
    const fuente = FuenteFalsa.instancias[0];

    act(() => {
      fuente.onmessage?.({ data: JSON.stringify({ type: "X", campaignId: "c1" }) });
    });

    expect(qc.getQueryState(claveAjena)?.isInvalidated).toBeFalsy();
  });

  it("sigue invalidando lo que ya invalidaba: la campaña y los avisos", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const claveCampana = ["campaigns", "c1", "roll-requests"] as const;
    const claveAvisos = ["notifications"] as const;
    qc.setQueryData(claveCampana, []);
    qc.setQueryData(claveAvisos, []);

    await montar(qc, "c1");
    const fuente = FuenteFalsa.instancias[0];

    act(() => {
      fuente.onmessage?.({ data: JSON.stringify({ type: "X", campaignId: "c1" }) });
    });

    expect(qc.getQueryState(claveCampana)?.isInvalidated).toBe(true);
    expect(qc.getQueryState(claveAvisos)?.isInvalidated).toBe(true);
  });
});
