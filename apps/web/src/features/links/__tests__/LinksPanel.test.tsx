import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LinksPanel } from "../LinksPanel";
import * as linksApi from "../api";
import * as entitiesApi from "../../entities/api";
import * as membersApi from "../../campaigns/members";
import { useAuthStore } from "../../../store/auth.store";
import type { Entity } from "../../entities/api";
import type { EntityLink } from "../api";

function renderPanel(entityCreatedById = "u1") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      {/* Las rutas de verdad, no un `MemoryRouter` pelado: el bloque L exige que el enlace
       **lleve a alguna parte**, y eso solo se demuestra navegando. */}
      <MemoryRouter initialEntries={["/campaigns/c1/entidades/e1"]}>
        <Routes>
          <Route
            path="/campaigns/:id/entidades/:entityId"
            element={
              <LinksPanel campaignId="c1" entityId="e1" entityCreatedById={entityCreatedById} />
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const baseEntity: Entity = {
  id: "e1",
  campaignId: "c1",
  type: "NPC",
  name: "Self",
  tags: [],
  visibility: "OWNER_DM",
  createdById: "u1",
  createdAt: "x",
};

/** Una fila saliente, que es la forma que devolvía el servidor antes del bloque L. */
function saliente(over: Partial<EntityLink> = {}): EntityLink {
  return {
    id: "link-1",
    label: null,
    direction: "OUTGOING",
    canRemove: true,
    to: { id: "e2", name: "Waterdeep", type: "LOCATION" },
    ...over,
  };
}

describe("LinksPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Task 1.16: the panel now looks up the viewer's identity/role before letting them
    // remove a link. Defaults every test to a DM (the widest permission) so the pre-existing
    // add/remove/error tests below keep exercising what they always did; the dedicated
    // "permiso" describe block below overrides this per test.
    useAuthStore.setState({ user: { id: "dm1", email: "dm@b.com", displayName: "DM" } });
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "dm1", displayName: "DM", role: "DM" },
      { userId: "u1", displayName: "Creator", role: "PLAYER" },
    ]);
  });

  it("adding a link calls the mutation with the chosen toId", async () => {
    vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([]);
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([
      baseEntity,
      { ...baseEntity, id: "e2", name: "Waterdeep", type: "LOCATION" },
    ]);
    const spy = vi.spyOn(linksApi, "createLink").mockResolvedValue({
      id: "l1",
      fromId: "e1",
      toId: "e2",
      label: undefined,
    });
    renderPanel();

    // Wait for the target list to actually load before selecting: the <select> itself
    // renders immediately, but its <option>s only appear once useAllEntities resolves.
    await screen.findByRole("option", { name: /Waterdeep/ });
    // fix 4 (semi-empty test): the entity being edited must never be a candidate for its
    // own link — this used to go unasserted, so deleting the filter kept it green.
    expect(screen.queryByRole("option", { name: /^Self/ })).not.toBeInTheDocument();
    const select = screen.getByLabelText("Entidad destino");
    fireEvent.change(select, { target: { value: "e2" } });
    fireEvent.click(screen.getByRole("button", { name: "Añadir enlace" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith("e1", { toId: "e2", label: undefined });
  });

  it("removing a link calls delete with that row's linkId, not another's", async () => {
    const rows: EntityLink[] = [
      saliente(),
      saliente({ id: "link-2", to: { id: "e3", name: "Baldur", type: "LOCATION" } }),
    ];
    vi.spyOn(linksApi, "fetchLinks").mockResolvedValue(rows);
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
    const spy = vi.spyOn(linksApi, "deleteLink").mockResolvedValue({ deleted: true });
    renderPanel();

    await screen.findByText("Baldur", { exact: false });
    const removeButtons = await screen.findAllByRole("button", { name: "Quitar" });
    expect(removeButtons).toHaveLength(2);
    await waitFor(() => expect(removeButtons[1]).not.toBeDisabled());
    fireEvent.click(removeButtons[1]);

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith("link-2");
  });

  it("a rejected delete shows the error instead of failing silently (fix 1)", async () => {
    vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([saliente()]);
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
    vi.spyOn(linksApi, "deleteLink").mockRejectedValue(
      new Error("Only the DM or the creator can remove this link"),
    );
    renderPanel();

    await screen.findByText("Waterdeep", { exact: false });
    const removeButton = screen.getByRole("button", { name: "Quitar" });
    await waitFor(() => expect(removeButton).not.toBeDisabled());
    fireEvent.click(removeButton);

    expect(
      await screen.findByText("Only the DM or the creator can remove this link"),
    ).toBeInTheDocument();
  });

  it("excludes the entity's own name and already-linked targets from the picker (fix 4)", async () => {
    vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([saliente()]);
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([
      baseEntity,
      { ...baseEntity, id: "e2", name: "Waterdeep", type: "LOCATION" },
      { ...baseEntity, id: "e3", name: "Baldur", type: "LOCATION" },
    ]);
    renderPanel();

    await screen.findByRole("option", { name: /Baldur/ });
    expect(screen.queryByRole("option", { name: /^Self/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Waterdeep/ })).not.toBeInTheDocument();
  });

  // Bloque L1 · el fallo que lo motivó: «Corvin vive en la Torre Gris» se guarda una vez, desde
  // Corvin, y al abrir la Torre no aparecía nada.
  describe("retroenlaces", () => {
    const entrante: EntityLink = {
      id: "link-back",
      label: "vive en",
      direction: "INCOMING",
      canRemove: true,
      to: { id: "corvin", name: "Maestre Corvin", type: "NPC" },
    };

    it("separa los que salen de los que llegan, y no los mezcla", async () => {
      vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([
        saliente({ label: "ocurrió en", to: { id: "e2", name: "Waterdeep", type: "LOCATION" } }),
        entrante,
      ]);
      vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
      renderPanel();

      const salen = (await screen.findByRole("heading", { name: /Salen de aquí/ }))
        .nextElementSibling as HTMLElement;
      const llegan = (await screen.findByRole("heading", { name: /Llegan aquí/ }))
        .nextElementSibling as HTMLElement;
      expect(within(salen).getByText("Waterdeep")).toBeInTheDocument();
      expect(within(salen).queryByText("Maestre Corvin")).not.toBeInTheDocument();
      expect(within(llegan).getByText("Maestre Corvin")).toBeInTheDocument();
    });

    it("lee la etiqueta al revés: «vive en» se muestra como «vive aquí»", async () => {
      vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([entrante]);
      vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
      renderPanel();

      // La lectura recta —"Maestre Corvin — vive en"— diría que la Torre vive en Corvin.
      expect(await screen.findByText(/vive aquí/)).toBeInTheDocument();
      expect(screen.queryByText(/— vive en/)).not.toBeInTheDocument();
    });

    it("traduce el tipo de ficha en vez de pintar la clave del enumerado", async () => {
      vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([entrante]);
      vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
      renderPanel();

      expect(await screen.findByText("(PNJ)")).toBeInTheDocument();
      expect(screen.queryByText(/NPC/)).not.toBeInTheDocument();
    });

    it("un retroenlace tampoco se puede quitar si el servidor dice que no", async () => {
      vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([{ ...entrante, canRemove: false }]);
      vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
      const spy = vi.spyOn(linksApi, "deleteLink");
      renderPanel();

      const boton = await screen.findByRole("button", { name: "Quitar" });
      expect(boton).toBeDisabled();
      // El motivo, visible: `title` no lo revela en táctil ni lo anuncia un lector.
      expect(
        screen.getByText(
          "Solo el DM o quien creó la ficha de la que sale el enlace puede quitarlo.",
        ),
      ).toBeInTheDocument();
      fireEvent.click(boton);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  // Bloque L2 · el panel de enlaces era el único sitio de la aplicación donde un enlace no
  // llevaba a ninguna parte.
  describe("el enlace navega", () => {
    it("cada fila apunta a la ficha del otro extremo y al pulsarla se llega", async () => {
      vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([saliente()]);
      vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      render(
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={["/campaigns/c1/entidades/e1"]}>
            <Routes>
              <Route
                path="/campaigns/:id/entidades/e1"
                element={<LinksPanel campaignId="c1" entityId="e1" />}
              />
              <Route path="/campaigns/:id/entidades/e2" element={<p>Ficha de Waterdeep</p>} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );

      const enlace = await screen.findByRole("link", { name: "Waterdeep" });
      expect(enlace).toHaveAttribute("href", "/campaigns/c1/entidades/e2");
      fireEvent.click(enlace);
      expect(await screen.findByText("Ficha de Waterdeep")).toBeInTheDocument();
    });
  });

  // Bloque L3 · la etiqueta era texto libre y salía siempre en blanco.
  describe("relaciones sugeridas", () => {
    beforeEach(() => {
      vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([]);
      vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([
        baseEntity, // e1, un PNJ: es la ficha desde la que se enlaza
        { ...baseEntity, id: "e2", name: "Torre Gris", type: "LOCATION" },
        { ...baseEntity, id: "e3", name: "Los Cuervos", type: "FACTION" },
      ]);
    });

    it("no sugiere nada hasta saber el destino, y entonces sugiere según el par de tipos", async () => {
      renderPanel();
      await screen.findByRole("option", { name: /Torre Gris/ });
      expect(screen.queryByRole("button", { name: "vive en" })).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("Entidad destino"), { target: { value: "e2" } });
      expect(await screen.findByRole("button", { name: "vive en" })).toBeInTheDocument();
      // "pertenece a" es de PNJ a facción, no de PNJ a lugar.
      expect(screen.queryByRole("button", { name: "pertenece a" })).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("Entidad destino"), { target: { value: "e3" } });
      expect(await screen.findByRole("button", { name: "pertenece a" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "vive en" })).not.toBeInTheDocument();
    });

    it("pulsar una sugerencia la guarda como etiqueta del enlace", async () => {
      const spy = vi
        .spyOn(linksApi, "createLink")
        .mockResolvedValue({ id: "l1", fromId: "e1", toId: "e2", label: "vive en" });
      renderPanel();
      await screen.findByRole("option", { name: /Torre Gris/ });
      fireEvent.change(screen.getByLabelText("Entidad destino"), { target: { value: "e2" } });
      fireEvent.click(await screen.findByRole("button", { name: "vive en" }));

      expect(screen.getByLabelText("Etiqueta del enlace")).toHaveValue("vive en");
      fireEvent.click(screen.getByRole("button", { name: "Añadir enlace" }));
      await waitFor(() => expect(spy).toHaveBeenCalledWith("e1", { toId: "e2", label: "vive en" }));
    });

    it("una relación escrita a mano se envía igual: la sugerencia no es una jaula", async () => {
      const spy = vi
        .spyOn(linksApi, "createLink")
        .mockResolvedValue({ id: "l1", fromId: "e1", toId: "e2", label: "le debe dinero a" });
      renderPanel();
      await screen.findByRole("option", { name: /Torre Gris/ });
      fireEvent.change(screen.getByLabelText("Entidad destino"), { target: { value: "e2" } });
      fireEvent.change(screen.getByLabelText("Etiqueta del enlace"), {
        target: { value: "le debe dinero a" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Añadir enlace" }));

      await waitFor(() =>
        expect(spy).toHaveBeenCalledWith("e1", { toId: "e2", label: "le debe dinero a" }),
      );
    });
  });

  // Task 1.16: closes the gap 1.15 left declared — LinksPanel used to paint "Quitar"
  // regardless of who was looking, which the server (links.service.ts) would reject for
  // anyone but the DM or the creator of the entity the link hangs off. Desde el bloque L esa
  // decisión la manda resuelta el servidor en `canRemove`, en vez de recalcularla aquí.
  describe("permiso para quitar enlaces", () => {
    it("deshabilita Quitar, con el motivo, cuando el servidor dice que no", async () => {
      useAuthStore.setState({ user: { id: "p1", email: "p@b.com", displayName: "P" } });
      vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
        { userId: "dm1", displayName: "DM", role: "DM" },
        { userId: "p1", displayName: "P", role: "PLAYER" },
      ]);
      vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([saliente({ canRemove: false })]);
      vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
      const spy = vi.spyOn(linksApi, "deleteLink");
      renderPanel("u1");

      const removeButton = await screen.findByRole("button", { name: "Quitar" });
      await waitFor(() => expect(removeButton).toBeDisabled());
      expect(
        await screen.findByText(
          "Solo el DM o quien creó la ficha de la que sale el enlace puede quitarlo.",
        ),
      ).toBeInTheDocument();
      fireEvent.click(removeButton);
      expect(spy).not.toHaveBeenCalled();

      // Y quien no es DM tampoco puede enlazar: el servidor exige `requireDM`.
      expect(screen.getByText("Los enlaces entre fichas los pone el DM.")).toBeInTheDocument();
      expect(screen.queryByLabelText("Entidad destino")).not.toBeInTheDocument();
    });

    it("deja Quitar habilitado cuando el servidor dice que sí, aunque no sea DM", async () => {
      useAuthStore.setState({ user: { id: "creator1", email: "c@b.com", displayName: "C" } });
      vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
        { userId: "dm1", displayName: "DM", role: "DM" },
        { userId: "creator1", displayName: "C", role: "PLAYER" },
      ]);
      vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([saliente({ canRemove: true })]);
      vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
      renderPanel("creator1");

      const removeButton = await screen.findByRole("button", { name: "Quitar" });
      await waitFor(() => expect(removeButton).not.toBeDisabled());
    });
  });
});
