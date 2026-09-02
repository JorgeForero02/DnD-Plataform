import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CharacterDetailPage } from "../CharacterDetailPage";
import * as campaignsApi from "../../features/campaigns/api";
import * as membersApi from "../../features/campaigns/members";
import * as charactersApi from "../../features/characters/api";
import * as sheetApi from "../../features/character-sheet/api";
import type { Character } from "../../features/characters/api";
import { useAuthStore } from "../../store/auth.store";

// H6 del reseño de interfaz — **un solo camino de edición.**
//
// Lo que estas pruebas vigilan es justo lo que la tarea quitó y lo que conservó: ya no hay
// diálogo («Ajustes y borrado» / «Editar personaje») que vuelva a ofrecer el nombre, la raza, la
// clase, el nivel o la historia; y la visibilidad —lo único que aquel diálogo tenía en
// exclusiva— sigue estando, en radios con su frase, guardándose sola.

const personaje: Character = {
  id: "ch1",
  campaignId: "c1",
  ownerId: "owner1",
  name: "Kaelith",
  race: null,
  raceKey: null,
  subraceKey: null,
  classKey: null,
  class: null,
  level: 3,
  bio: "Pactó con un demonio",
  visibility: "PLAYERS",
  createdAt: "x",
};

function montar(personajes: Character[] = [personaje]) {
  vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue({
    id: "c1",
    name: "Fuera del Abismo",
    description: null,
    ownerId: "dm1",
    createdAt: "x",
  });
  vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue(personajes);
  // La hoja calculada tiene sus propias pruebas; aquí solo hace falta que no estorbe.
  vi.spyOn(sheetApi, "fetchSheet").mockRejectedValue(new Error("sin hoja en esta prueba"));

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/campaigns/c1/personajes/ch1"]}>
        <Routes>
          <Route path="/campaigns/:id" element={<h1>Página de la campaña</h1>} />
          <Route path="/campaigns/:id/personajes/:characterId" element={<CharacterDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function comoDuenio() {
  useAuthStore.setState({ user: { id: "owner1", email: "o@b.com", displayName: "O" } });
  vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
    { userId: "dm1", displayName: "DM", role: "DM" },
    { userId: "owner1", displayName: "O", role: "PLAYER" },
  ]);
}

function comoOtroJugador() {
  useAuthStore.setState({ user: { id: "otro", email: "x@b.com", displayName: "X" } });
  vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
    { userId: "dm1", displayName: "DM", role: "DM" },
    { userId: "otro", displayName: "X", role: "PLAYER" },
  ]);
}

const MOTIVO = "Solo el dueño o el DM puede editar este personaje.";

describe("CharacterDetailPage — un solo camino de edición", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("ya no hay segundo camino: ni diálogo de ajustes ni formulario que repita lo de la hoja", async () => {
    comoDuenio();
    montar();

    expect(await screen.findByRole("button", { name: "Kaelith" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ajustes y borrado" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Editar personaje" })).not.toBeInTheDocument();
    // Los campos que la hoja edita en el sitio no vuelven a ofrecerse por segunda vía.
    expect(screen.queryByLabelText("Raza")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Clase")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Biografía")).not.toBeInTheDocument();
  });

  it("la visibilidad se elige en radios con su frase, y ningún valor del enum llega a la pantalla", async () => {
    comoDuenio();
    montar();

    const guardado = await screen.findByRole("radio", {
      name: /Todos los que se sientan a esta mesa/,
    });
    expect(guardado).toBeChecked();
    // Los cuatro niveles que un personaje admite, visibles a la vez: nada de desplegable.
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.queryByText(/PUBLIC|PLAYERS|OWNER_DM|DM_ONLY/)).not.toBeInTheDocument();
  });

  it("elegir un nivel lo guarda solo, con el PATCH mínimo", async () => {
    comoDuenio();
    const spy = vi
      .spyOn(charactersApi, "updateCharacter")
      .mockResolvedValue({ ...personaje, visibility: "DM_ONLY" });
    montar();

    fireEvent.click(await screen.findByRole("radio", { name: /Solo el DM/ }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith("c1", "ch1", { visibility: "DM_ONLY" });
  });

  it("un rechazo del servidor devuelve el control a lo que de verdad hay y explica el motivo en línea", async () => {
    comoDuenio();
    vi.spyOn(charactersApi, "updateCharacter").mockRejectedValue(
      new Error("Only the DM or the owner can modify this"),
    );
    montar();

    fireEvent.click(await screen.findByRole("radio", { name: /Solo el DM/ }));

    expect(await screen.findByText("Only the DM or the owner can modify this")).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Todos los que se sientan a esta mesa/ }),
    ).toBeChecked();
    expect(screen.getByRole("radio", { name: /Solo el DM/ })).not.toBeChecked();
  });

  it("borrar sigue detrás de un botón: el primer clic solo pide confirmación", async () => {
    comoDuenio();
    const spy = vi.spyOn(charactersApi, "deleteCharacter");
    montar();

    fireEvent.click(await screen.findByRole("button", { name: "Borrar" }));

    expect(spy).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Vas a borrar a "Kaelith"\. No se puede deshacer\./),
    ).toBeInTheDocument();
  });

  it("confirmar borra el personaje correcto y saca al lector de una página que ya no existe", async () => {
    comoDuenio();
    const spy = vi.spyOn(charactersApi, "deleteCharacter").mockResolvedValue({ deleted: true });
    montar();

    fireEvent.click(await screen.findByRole("button", { name: "Borrar" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar definitivamente" }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("c1", "ch1"));
    expect(
      await screen.findByRole("heading", { name: "Página de la campaña" }),
    ).toBeInTheDocument();
  });

  it("el fallo del servidor al borrar se ve, y el personaje sigue en pantalla", async () => {
    comoDuenio();
    vi.spyOn(charactersApi, "deleteCharacter").mockRejectedValue(
      new Error("Only the DM or the owner can modify this"),
    );
    montar();

    fireEvent.click(await screen.findByRole("button", { name: "Borrar" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar definitivamente" }));

    expect(await screen.findByText("Only the DM or the owner can modify this")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kaelith" })).toBeInTheDocument();
  });

  it("a quien no puede editar no se le esconde nada: se le deshabilita con el motivo a la vista", async () => {
    comoOtroJugador();
    const patch = vi.spyOn(charactersApi, "updateCharacter");
    const del = vi.spyOn(charactersApi, "deleteCharacter");
    montar();

    const borrar = await screen.findByRole("button", { name: "Borrar" });
    expect(borrar).toBeDisabled();
    expect(borrar).toHaveAttribute("title", MOTIVO);
    expect(screen.getByRole("radio", { name: /Solo el DM/ })).toBeDisabled();
    expect(screen.getAllByText(MOTIVO).length).toBeGreaterThan(0);

    fireEvent.click(borrar);
    fireEvent.click(screen.getByRole("radio", { name: /Solo el DM/ }));
    expect(patch).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
    // Y aun así, quien manda es el servidor: characters.service.ts exige DM o dueño en el PATCH
    // y en el DELETE. Esconder un control nunca ha sido control de acceso.
  });

  it("un nivel guardado que este selector no ofrece se muestra, marcado y no seleccionable", async () => {
    comoDuenio();
    montar([{ ...personaje, visibility: "SPECIFIC_PLAYERS" }]);

    const guardado = await screen.findByRole("radio", { name: /Jugadores concretos/ });
    expect(guardado).toBeChecked();
    expect(guardado).toBeDisabled();
  });
});
