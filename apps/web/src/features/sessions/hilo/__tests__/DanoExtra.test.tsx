import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { DamagePreview } from "@dnd/shared";
import { DanoExtra } from "../DanoExtra";
import * as sessionsApi from "../../api";
import { ApiError } from "../../../../lib/api";

// Task 8 de 3A.2 («elegir, lanzar y usar») — el daño extra al impactar. Mismo molde que
// `BandejaDeDano.test.tsx`: `api.ts` simulado con `vi.spyOn`, sin tocar `fetch` de verdad.

const PENDING_DAMAGE = {
  targetCharacterId: "goblin-1",
  attackResolvedEventId: "ev-attack",
  damageType: "SLASHING" as const,
  amount: 7,
};

function renderDanoExtra(
  pendingDamage: typeof PENDING_DAMAGE & { appliedEventId?: string } = PENDING_DAMAGE,
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DanoExtra campaignId="c1" rollEventId="roll1" pendingDamage={pendingDamage} />
    </QueryClientProvider>,
  );
}

const PREVIEW_DEL_DUEÑO_DEL_ATACANTE: DamagePreview = {
  extrasDisponibles: [{ key: "sneak-attack", label: "Ataque furtivo (2d6)" }],
  extras: [],
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("DanoExtra — la casilla del extra que el jugador marca sobre su daño pendiente", () => {
  it("con extrasDisponibles, pinta el botón «Añadir Ataque furtivo (2d6)»", async () => {
    vi.spyOn(sessionsApi, "fetchDamagePreview").mockResolvedValue(PREVIEW_DEL_DUEÑO_DEL_ATACANTE);

    renderDanoExtra();

    expect(
      await screen.findByRole("button", { name: "Añadir Ataque furtivo (2d6)" }),
    ).toBeInTheDocument();
  });

  it("marcarlo llama a addDamageExtra con la clave, y tras invalidar el preview el botón desaparece", async () => {
    const previewSpy = vi
      .spyOn(sessionsApi, "fetchDamagePreview")
      .mockResolvedValueOnce(PREVIEW_DEL_DUEÑO_DEL_ATACANTE)
      .mockResolvedValue({
        extrasDisponibles: [],
        extras: [
          {
            key: "sneak-attack",
            label: "Ataque furtivo (2d6)",
            amount: 7,
            rollEventId: "roll-extra",
          },
        ],
      });
    const marcar = vi.spyOn(sessionsApi, "addDamageExtra").mockResolvedValue({
      key: "sneak-attack",
      label: "Ataque furtivo (2d6)",
      amount: 7,
      rollEventId: "roll-extra",
    });

    renderDanoExtra();

    fireEvent.click(await screen.findByRole("button", { name: "Añadir Ataque furtivo (2d6)" }));

    await waitFor(() =>
      expect(marcar).toHaveBeenCalledWith("c1", "roll1", { key: "sneak-attack" }),
    );
    expect(await screen.findByText("+ Ataque furtivo (2d6) 7")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Añadir Ataque furtivo (2d6)" }),
    ).not.toBeInTheDocument();
    expect(previewSpy).toHaveBeenCalledTimes(2);
  });

  it("el DM ve «+ Ataque furtivo 7» en la línea del preview, sin botón (ya lo marcó el pícaro)", async () => {
    vi.spyOn(sessionsApi, "fetchDamagePreview").mockResolvedValue({
      target: { id: "goblin-1", name: "Goblin" },
      amount: 7,
      damageType: "SLASHING",
      resulting: { taken: 7, absorbedByTemp: 0, modifier: null, reason: null },
      canApply: true,
      appliedEventId: null,
      extrasDisponibles: [],
      extras: [
        {
          key: "sneak-attack",
          label: "Ataque furtivo (2d6)",
          amount: 7,
          rollEventId: "roll-extra",
        },
      ],
    });

    renderDanoExtra();

    expect(await screen.findByText("+ Ataque furtivo (2d6) 7")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("sin extrasDisponibles ni extras marcados, no pinta nada", async () => {
    vi.spyOn(sessionsApi, "fetchDamagePreview").mockResolvedValue({
      extrasDisponibles: [],
      extras: [],
    });

    const { container } = renderDanoExtra();

    await waitFor(() => expect(sessionsApi.fetchDamagePreview).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("ya aplicado: no pinta el botón, aunque el servidor siguiera ofreciendo el extra", async () => {
    vi.spyOn(sessionsApi, "fetchDamagePreview").mockResolvedValue(PREVIEW_DEL_DUEÑO_DEL_ATACANTE);

    renderDanoExtra({ ...PENDING_DAMAGE, appliedEventId: "hp1" });

    await waitFor(() => expect(sessionsApi.fetchDamagePreview).toHaveBeenCalled());
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("404 del preview (nadie con permiso de ver extras): no pinta nada", async () => {
    vi.spyOn(sessionsApi, "fetchDamagePreview").mockRejectedValue(
      new ApiError("No encontrado", 404),
    );

    const { container } = renderDanoExtra();

    await waitFor(() => expect(sessionsApi.fetchDamagePreview).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("marcar con error: pinta el aviso del servidor", async () => {
    vi.spyOn(sessionsApi, "fetchDamagePreview").mockResolvedValue(PREVIEW_DEL_DUEÑO_DEL_ATACANTE);
    vi.spyOn(sessionsApi, "addDamageExtra").mockRejectedValue(
      new ApiError("«Ataque furtivo» ya se marcó en esta tirada.", 409),
    );

    renderDanoExtra();

    fireEvent.click(await screen.findByRole("button", { name: "Añadir Ataque furtivo (2d6)" }));

    expect(
      await screen.findByText("«Ataque furtivo» ya se marcó en esta tirada."),
    ).toBeInTheDocument();
  });
});
