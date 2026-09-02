import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CharacterEditor } from "../CharacterEditor";
import * as charactersApi from "../api";
import type { Character } from "../api";

function renderEditor() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CharacterEditor campaignId="c1" onClose={() => {}} />
    </QueryClientProvider>,
  );
}

const existingCharacter: Character = {
  id: "ch1",
  campaignId: "c1",
  ownerId: "u1",
  name: "Elara",
  race: "Elfa",
  class: "Maga",
  level: 4,
  bio: "Buscadora de conocimiento arcano",
  visibility: "PLAYERS",
  createdAt: "x",
};

function renderEditEditor(
  character: Character,
  props: { onClose?: () => void; readOnly?: boolean; readOnlyReason?: string } = {},
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CharacterEditor
        campaignId="c1"
        character={character}
        onClose={props.onClose ?? (() => {})}
        readOnly={props.readOnly}
        readOnlyReason={props.readOnlyReason}
      />
    </QueryClientProvider>,
  );
}

describe("CharacterEditor (create)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends level as a number, not a string (the schema 400s on a string)", async () => {
    const spy = vi.spyOn(charactersApi, "createCharacter").mockResolvedValue(existingCharacter);
    renderEditor();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Tordek" } });
    fireEvent.change(screen.getByLabelText("Nivel"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const [, input] = spy.mock.calls[0];
    expect(input.level).toBe(5);
    expect(typeof input.level).toBe("number");
  });
});

describe("CharacterEditor (edit)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("preloads name, race, class, level, bio, and visibility", () => {
    renderEditEditor(existingCharacter);

    expect(screen.getByLabelText("Nombre")).toHaveValue("Elara");
    expect(screen.getByLabelText("Raza")).toHaveValue("Elfa");
    expect(screen.getByLabelText("Clase")).toHaveValue("Maga");
    expect(screen.getByLabelText("Nivel")).toHaveValue(4);
    expect(screen.getByLabelText("Biografía")).toHaveValue("Buscadora de conocimiento arcano");
    expect(
      screen.getByRole("radio", { name: /Todos los que se sientan a esta mesa/ }),
    ).toBeChecked();
  });

  it("shows the server error instead of failing silently", async () => {
    vi.spyOn(charactersApi, "updateCharacter").mockRejectedValue(
      new Error("Only the DM or the owner can modify this"),
    );
    renderEditEditor(existingCharacter);

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Only the DM or the owner can modify this")).toBeInTheDocument();
  });

  it("submits the full payload on edit, including the fields left untouched", async () => {
    const spy = vi.spyOn(charactersApi, "updateCharacter").mockResolvedValue(existingCharacter);
    renderEditEditor(existingCharacter);

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Elara, la Errante" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith("c1", "ch1", {
      name: "Elara, la Errante",
      level: 4,
      visibility: "PLAYERS",
      race: "Elfa",
      class: "Maga",
      bio: "Buscadora de conocimiento arcano",
    });
  });

  it("sends empty strings for race, class, and bio when the user clears them, instead of omitting them", async () => {
    const spy = vi.spyOn(charactersApi, "updateCharacter").mockResolvedValue(existingCharacter);
    renderEditEditor(existingCharacter);

    fireEvent.change(screen.getByLabelText("Raza"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Clase"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Biografía"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const [, , input] = spy.mock.calls[0];
    expect(input).toHaveProperty("race", "");
    expect(input).toHaveProperty("class", "");
    expect(input).toHaveProperty("bio", "");
  });

  it("shows a saved visibility that the selector doesn't offer, instead of a blank select", () => {
    // SPECIFIC_PLAYERS is not in this editor's own list (docs/05-datos.md), but the API
    // schema still accepts it, so a character can arrive with it.
    const character: Character = { ...existingCharacter, visibility: "SPECIFIC_PLAYERS" };
    renderEditEditor(character);

    const guardada = screen.getByRole("radio", { name: /Jugadores concretos/ });
    expect(guardada).toBeChecked();
    expect(guardada).toBeDisabled();
  });
});

// Task 1.16: Borrar reuses the same readOnly/readOnlyReason the editor already gets from
// CampaignDetailPage.tsx — characters.service.ts gates both update and delete with
// requireEditable (DM or owner), so there's no separate permission to compute here.
describe("CharacterEditor (delete)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("no muestra Borrar al crear, solo al editar", () => {
    renderEditor();
    expect(screen.queryByRole("button", { name: "Borrar" })).not.toBeInTheDocument();
  });

  it("pide confirmación: el primer clic no llama a la mutación (comportamiento 1)", () => {
    const spy = vi.spyOn(charactersApi, "deleteCharacter");
    renderEditEditor(existingCharacter);

    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));

    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByText('Vas a borrar a "Elara". No se puede deshacer.')).toBeInTheDocument();
  });

  it("confirmar borra, con el identificador correcto, y cierra el editor (comportamiento 2)", async () => {
    const spy = vi.spyOn(charactersApi, "deleteCharacter").mockResolvedValue({ deleted: true });
    const onClose = vi.fn();
    renderEditEditor(existingCharacter, { onClose });

    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar definitivamente" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith("c1", "ch1");
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("cancelar no borra y deja el editor abierto (comportamiento 3)", () => {
    const spy = vi.spyOn(charactersApi, "deleteCharacter");
    const onClose = vi.fn();
    renderEditEditor(existingCharacter, { onClose });

    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    fireEvent.click(screen.getByRole("button", { name: "No, cancelar" }));

    expect(spy).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Editar personaje" })).toBeInTheDocument();
  });

  it("quien no puede editar tampoco puede borrar: deshabilitado con su motivo, el clic no llama a nada (comportamiento 4)", () => {
    const spy = vi.spyOn(charactersApi, "deleteCharacter");
    renderEditEditor(existingCharacter, {
      readOnly: true,
      readOnlyReason: "Solo el dueño o el DM puede editar este personaje.",
    });

    const deleteButton = screen.getByRole("button", { name: "Borrar" });
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute(
      "title",
      "Solo el dueño o el DM puede editar este personaje.",
    );
    fireEvent.click(deleteButton);
    expect(spy).not.toHaveBeenCalled();
  });

  it("quien sí puede editar, sí puede borrar (comportamiento 5)", () => {
    renderEditEditor(existingCharacter, { readOnly: false });
    expect(screen.getByRole("button", { name: "Borrar" })).not.toBeDisabled();
  });

  it("el fallo del servidor al borrar se ve (comportamiento 6)", async () => {
    vi.spyOn(charactersApi, "deleteCharacter").mockRejectedValue(
      new Error("Only the DM or the owner can modify this"),
    );
    renderEditEditor(existingCharacter);

    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar definitivamente" }));

    expect(await screen.findByText("Only the DM or the owner can modify this")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Editar personaje" })).toBeInTheDocument();
  });
});
