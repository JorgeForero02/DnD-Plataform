import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CharacterEditor } from "../CharacterEditor";
import * as charactersApi from "../api";
import type { Character } from "../api";

// H6: este diálogo ya solo crea. Las pruebas de edición y de borrado que vivían aquí se han ido
// con el modo que probaban — lo que hacían ahora lo hace la página del personaje, que edita en el
// sitio (`pages/__tests__/CharacterDetailPage.test.tsx`).

function renderEditor(onClose: () => void = () => {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CharacterEditor campaignId="c1" onClose={onClose} />
    </QueryClientProvider>,
  );
}

const created: Character = {
  id: "ch1",
  campaignId: "c1",
  ownerId: "u1",
  name: "Tordek",
  race: null,
  raceKey: null,
  subraceKey: null,
  classKey: null,
  class: null,
  level: 5,
  bio: null,
  visibility: "PLAYERS",
  createdAt: "x",
  archivedAt: null,
};

describe("CharacterEditor (crear)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends level as a number, not a string (the schema 400s on a string)", async () => {
    const spy = vi.spyOn(charactersApi, "createCharacter").mockResolvedValue(created);
    renderEditor();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Tordek" } });
    fireEvent.change(screen.getByLabelText("Nivel"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const [, input] = spy.mock.calls[0];
    expect(input.level).toBe(5);
    expect(typeof input.level).toBe("number");
  });

  it("elige la visibilidad por su frase, nunca por el valor del enum", async () => {
    const spy = vi.spyOn(charactersApi, "createCharacter").mockResolvedValue(created);
    renderEditor();

    // Ni "PUBLIC" ni "DM_ONLY" pueden leerse en pantalla: la forma legible la escribe
    // features/entities/visibilidad.ts y este diálogo la importa.
    expect(screen.queryByText(/PUBLIC|DM_ONLY|OWNER_DM|PLAYERS/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Tordek" } });
    fireEvent.click(screen.getByRole("radio", { name: /Solo el DM/ }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy.mock.calls[0][1].visibility).toBe("DM_ONLY");
  });

  it("ya no ofrece ni borrar ni edición: crear es lo único que hace", () => {
    renderEditor();
    expect(screen.getByRole("heading", { name: "Nuevo personaje" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Borrar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Editar personaje" })).not.toBeInTheDocument();
  });

  it("shows the server error instead of failing silently", async () => {
    vi.spyOn(charactersApi, "createCharacter").mockRejectedValue(new Error("Not a member"));
    renderEditor();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Tordek" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Not a member")).toBeInTheDocument();
  });
});
