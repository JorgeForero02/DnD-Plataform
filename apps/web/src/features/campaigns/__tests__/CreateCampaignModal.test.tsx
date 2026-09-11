import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateCampaignModal } from "../CreateCampaignModal";
import * as api from "../api";

function renderModal() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CreateCampaignModal onClose={() => {}} />
    </QueryClientProvider>,
  );
}

// **El estado de error es `mutation.error`, no un `useState` duplicado.** Antes de esta prueba
// `onSubmit` capturaba el fallo en un `useState` local y pintaba ese mensaje; el mensaje que se
// ve en pantalla es siempre el de la mutación de TanStack Query, así que la fuente de verdad es
// esa y no una copia que un `reset()` de la mutación no limpiaría a la vez.
describe("CreateCampaignModal", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows the mutation's error message when creating the campaign fails", async () => {
    vi.spyOn(api, "createCampaign").mockRejectedValue(
      new Error("Ya existe una campaña con ese nombre"),
    );
    renderModal();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Curse of Strahd" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear" }));

    expect(await screen.findByText("Ya existe una campaña con ese nombre")).toBeInTheDocument();
  });
});
