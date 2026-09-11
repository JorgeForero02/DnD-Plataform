import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PanelDeDados } from "../../rolls/PanelDeDados";
import * as rollsApi from "../../rolls/api";
import * as rollRequestsApi from "../api";
import * as charactersApi from "../../characters/api";
import * as membersApi from "../../campaigns/members";
import { useAuthStore } from "../../../store/auth.store";

// Tarea 2C.5 — **el formulario de pedir solo se le ofrece al DM.**
//
// Esto **no es control de acceso**: quien lo impone es `requireDM` en el servidor
// (`roll-requests.service.ts`), y un jugador que llegara al endpoint recibiría un 403 con o sin
// esta prueba. Lo que se comprueba aquí es que la pantalla no **miente**: ofrecer un botón que
// el servidor va a rechazar es la infracción que `docs/04-convenciones.md` nombra con todas sus
// letras, y el prototipo la comete tres veces.

const CAMPANA = "camp-1";

function pintar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PanelDeDados campaignId={CAMPANA} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(rollsApi, "fetchRolls").mockResolvedValue({ events: [], nextCursor: null });
  vi.spyOn(rollRequestsApi, "fetchRollRequests").mockResolvedValue([]);
  vi.spyOn(rollRequestsApi, "fetchDifficultyClasses").mockResolvedValue([
    { key: "medium", dc: 15 },
  ]);
  vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([]);
  vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
    { userId: "dm1", displayName: "DM", role: "DM" },
    { userId: "p1", displayName: "Alice", role: "PLAYER" },
  ]);
});

describe("PanelDeDados — quién puede pedir", () => {
  it("un jugador no ve el formulario de pedir", async () => {
    useAuthStore.setState({
      user: { id: "p1", email: "p@b.com", displayName: "Alice", isAdmin: false },
    });

    pintar();

    // Se espera a que la pantalla esté montada de verdad antes de afirmar una ausencia: sin
    // esto, la prueba pasaría igual con el formulario puesto, solo por llegar antes que él.
    expect(await screen.findByRole("button", { name: "Tirar" })).toBeInTheDocument();
    await waitFor(() => expect(membersApi.fetchMembers).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Pedir la tirada" })).not.toBeInTheDocument();
  });

  it("el DM sí lo ve", async () => {
    useAuthStore.setState({
      user: { id: "dm1", email: "dm@b.com", displayName: "DM", isAdmin: false },
    });

    pintar();

    expect(await screen.findByRole("button", { name: "Pedir la tirada" })).toBeInTheDocument();
  });
});
