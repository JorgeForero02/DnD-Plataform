import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { DamagePreview } from "@dnd/shared";
import { BandejaDeDano } from "../BandejaDeDano";
import * as sessionsApi from "../../api";
import { ApiError } from "../../../../lib/api";

// Tarea 7 de la puerta de efectos (spec §4 bis §4b.5/§4b.6, E-PE-2). Mismo molde que
// `features/dm-tables/__tests__/PanelDeTablas.test.tsx`: `api.ts` simulado con `vi.spyOn`, sin
// tocar `fetch` de verdad.

const PENDING_DAMAGE = {
  targetCharacterId: "espectro-1",
  attackResolvedEventId: "ev-attack",
  damageType: "SLASHING" as const,
  amount: 11,
};

function renderBandeja(
  pendingDamage: typeof PENDING_DAMAGE & { appliedEventId?: string } = PENDING_DAMAGE,
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BandejaDeDano campaignId="c1" rollEventId="roll1" pendingDamage={pendingDamage} />
    </QueryClientProvider>,
  );
}

const PREVIEW_CON_RESISTENCIA: DamagePreview = {
  target: { id: "espectro-1", name: "Espectro" },
  amount: 11,
  damageType: "SLASHING",
  resulting: {
    taken: 5,
    absorbedByTemp: 0,
    modifier: "resistant",
    reason: "de ataques no mágicos",
  },
  canApply: true,
  appliedEventId: null,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("BandejaDeDano — la línea del preview", () => {
  it("preview aplicable: la línea con el tipo y el modificador traducidos, y el botón «Aplicar»", async () => {
    vi.spyOn(sessionsApi, "fetchDamagePreview").mockResolvedValue(PREVIEW_CON_RESISTENCIA);

    renderBandeja();

    const boton = await screen.findByRole("button", { name: "Aplicar el daño a Espectro" });
    expect(boton).toBeInTheDocument();
    // El número reducido va en un `<span>` aparte (`font-data`), así que se lee el texto
    // completo del párrafo en vez de una cadena de un solo nodo.
    expect(boton.parentElement?.previousElementSibling?.textContent).toBe(
      "Espectro: 11 cortante → 5 · resistencia (de ataques no mágicos)",
    );
    // Ningún valor de enumeración crudo.
    expect(screen.queryByText(/SLASHING/)).not.toBeInTheDocument();
    expect(screen.queryByText(/resistant/)).not.toBeInTheDocument();
  });

  it("ya aplicado: dice «Aplicado» y no hay botón", async () => {
    vi.spyOn(sessionsApi, "fetchDamagePreview").mockResolvedValue({
      ...PREVIEW_CON_RESISTENCIA,
      canApply: false,
      appliedEventId: "hp1",
    });

    renderBandeja();

    expect(await screen.findByText(/Aplicado/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Aplicar el daño a Espectro" }),
    ).not.toBeInTheDocument();
  });

  it("404 del preview: no filtra nombre ni cifra, solo «Daño pendiente»", async () => {
    vi.spyOn(sessionsApi, "fetchDamagePreview").mockRejectedValue(
      new ApiError("No encontrado", 404),
    );

    renderBandeja();

    expect(await screen.findByText("Daño pendiente")).toBeInTheDocument();
    expect(screen.queryByText(/Espectro/)).not.toBeInTheDocument();
    expect(screen.queryByText(/11/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  // Ola de arreglos 1 (I1) — el hueco por el que pasó el fallo: tras aplicar con éxito el preview
  // no se invalidaba, `canApply` seguía en `true` y el botón se quedaba. Aquí el segundo
  // `fetchDamagePreview` devuelve el estado real del servidor —ya aplicado— y la bandeja lo dice.
  it("aplicar con éxito: se relee el preview, dice «Aplicado» y el botón se va", async () => {
    const previewSpy = vi
      .spyOn(sessionsApi, "fetchDamagePreview")
      .mockResolvedValueOnce(PREVIEW_CON_RESISTENCIA)
      .mockResolvedValue({ ...PREVIEW_CON_RESISTENCIA, canApply: false, appliedEventId: "hp1" });
    vi.spyOn(sessionsApi, "applyDamage").mockResolvedValue({ hpEventId: "hp1" });

    renderBandeja();

    fireEvent.click(await screen.findByRole("button", { name: "Aplicar el daño a Espectro" }));

    expect(await screen.findByText("Aplicado")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Aplicar el daño a Espectro" }),
    ).not.toBeInTheDocument();
    expect(previewSpy).toHaveBeenCalledTimes(2);
  });

  // Ola de arreglos 1 (I2) — el atacante recibe 404 en el preview SIEMPRE, y aun así tiene que
  // ver que su daño ya se aplicó: el candado viaja en el propio suceso, que el hilo trae a todos.
  it("404 del preview pero `appliedEventId` en el suceso: dice «Aplicado», sin nombre ni cifra", async () => {
    vi.spyOn(sessionsApi, "fetchDamagePreview").mockRejectedValue(
      new ApiError("No encontrado", 404),
    );

    renderBandeja({ ...PENDING_DAMAGE, appliedEventId: "hp1" });

    expect(await screen.findByText("Aplicado")).toBeInTheDocument();
    expect(screen.queryByText("Daño pendiente")).not.toBeInTheDocument();
    expect(screen.queryByText(/Espectro/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("pulsar «Aplicar» llama a applyDamage y, con 409, pinta el aviso del servidor", async () => {
    vi.spyOn(sessionsApi, "fetchDamagePreview").mockResolvedValue(PREVIEW_CON_RESISTENCIA);
    const aplicar = vi
      .spyOn(sessionsApi, "applyDamage")
      .mockRejectedValue(new ApiError("Ese daño ya se aplicó.", 409));

    renderBandeja();

    fireEvent.click(await screen.findByRole("button", { name: "Aplicar el daño a Espectro" }));

    await waitFor(() => expect(aplicar).toHaveBeenCalledWith("c1", "roll1"));
    expect(await screen.findByText("Ese daño ya se aplicó.")).toBeInTheDocument();
  });
});
