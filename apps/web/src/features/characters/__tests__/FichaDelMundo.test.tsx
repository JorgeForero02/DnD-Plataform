import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { FichaDelMundo } from "../FichaDelMundo";
import * as charactersApi from "../api";
import * as entitiesApi from "../../entities/api";
import type { Character } from "../api";
import type { Entity, EntityDetail } from "../../entities/api";

// PNJ del mundo y la mesa, Tarea 4, paso 2 — mismo molde que `archivar.test.tsx`: `api.ts` de
// cada feature simulado con `vi.spyOn`, `QueryClient` de verdad para que `useUpdateCharacter` y
// `useEntity`/`useEntities` (dentro del selector) funcionen como en la aplicación.

const garrik: Entity = {
  id: "garrik-id",
  campaignId: "c1",
  type: "NPC",
  name: "Garrik",
  tags: [],
  visibility: "DM_ONLY",
  createdById: "dm1",
  createdAt: "2026-01-01",
};

const garrikDetail: EntityDetail = { ...garrik, grants: [] };

const personajeSinEnlace: Character = {
  id: "ch1",
  campaignId: "c1",
  ownerId: "owner1",
  name: "Kaelith",
  raceKey: null,
  subraceKey: null,
  classKey: null,
  level: 3,
  bio: null,
  visibility: "PLAYERS",
  createdAt: "x",
  archivedAt: null,
  color: null,
  entityId: null,
};

const personajeConEnlace: Character = { ...personajeSinEnlace, entityId: "garrik-id" };

function montar(character: Character, esDm: boolean) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <FichaDelMundo campaignId="c1" character={character} esDm={esDm} />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(entitiesApi, "fetchEntities").mockResolvedValue([garrik]);
  vi.spyOn(entitiesApi, "fetchEntity").mockResolvedValue(garrikDetail);
});

describe("FichaDelMundo", () => {
  it("DM sin enlace: «Enlazar» abre el selector y elegir llama a updateCharacter con entityId", async () => {
    const spy = vi.spyOn(charactersApi, "updateCharacter").mockResolvedValue(personajeConEnlace);
    montar(personajeSinEnlace, true);

    expect(screen.getByText("Sin ficha del mundo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enlazar" }));

    const radio = await screen.findByRole("radio", { name: /Garrik/i });
    fireEvent.click(radio);

    await waitFor(() => expect(spy).toHaveBeenCalledWith("c1", "ch1", { entityId: "garrik-id" }));
  });

  it("DM con enlace: nombre, enlace, «Cambiar» y «Quitar» (que llama con null)", async () => {
    const spy = vi.spyOn(charactersApi, "updateCharacter").mockResolvedValue(personajeSinEnlace);
    montar(personajeConEnlace, true);

    expect(await screen.findByRole("link", { name: "Garrik" })).toHaveAttribute(
      "href",
      "/campaigns/c1/entidades/garrik-id",
    );
    expect(screen.getByRole("button", { name: "Cambiar" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Quitar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("c1", "ch1", { entityId: null }));
  });

  it("jugador con enlace: nombre y enlace, sin botones", async () => {
    montar(personajeConEnlace, false);

    expect(await screen.findByRole("link", { name: "Garrik" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cambiar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quitar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enlazar" })).not.toBeInTheDocument();
  });

  it("jugador sin enlace: no se monta nada", () => {
    const { container } = montar(personajeSinEnlace, false);
    expect(container).toBeEmptyDOMElement();
  });
});
