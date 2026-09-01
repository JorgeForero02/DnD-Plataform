import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CampaignDetailPage } from "../CampaignDetailPage";
import * as campaignsApi from "../../features/campaigns/api";
import * as entitiesApi from "../../features/entities/api";
import * as sessionsApi from "../../features/sessions/api";
import * as charactersApi from "../../features/characters/api";
import * as membersApi from "../../features/campaigns/members";
import * as linksApi from "../../features/links/api";
import * as commentsApi from "../../features/comments/api";
import { useAuthStore } from "../../store/auth.store";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/campaigns/c1"]}>
        <Routes>
          <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CampaignDetailPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue({
      id: "c1",
      name: "Curse of Strahd",
      description: "spooky",
      ownerId: "u1",
      createdAt: "2026-01-01",
    });
    vi.spyOn(entitiesApi, "fetchEntities").mockImplementation(async (_cid, type) =>
      type === "NPC"
        ? [
            {
              id: "e1",
              campaignId: "c1",
              type: "NPC",
              name: "Strahd von Zarovich",
              tags: [],
              visibility: "PLAYERS",
              createdById: "u1",
              createdAt: "x",
            },
          ]
        : [],
    );
    vi.spyOn(sessionsApi, "fetchSessions").mockResolvedValue([
      {
        id: "s1",
        campaignId: "c1",
        title: "Session Zero",
        scheduledAt: null,
        notes: null,
        visibility: "PLAYERS",
        createdAt: "x",
      },
    ]);
  });

  it("renders campaign name and switches tabs to show the right list", async () => {
    renderPage();
    expect(await screen.findByText("Curse of Strahd")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "NPCs" }));
    expect(await screen.findByText("Strahd von Zarovich")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sesiones" }));
    expect(await screen.findByText("Session Zero")).toBeInTheDocument();
  });
});

// Arreglo 1 (1.15-fix), Crítico: a row is the ONLY detail view this app has — the editor is
// the only consumer of useEntity, and LinksPanel/CommentThread only ever render inside it
// (EntityEditor.tsx). Disabling the row (the pre-fix behaviour) left a player who *can* view
// an entity by canView (apps/api/src/common/visibility.ts) unable to read its description,
// tags, links or comments at all. The fix: the row always opens; what changes with permission
// is whether the editor inside opens read-only.
//
// Arreglo 4 (1.15-fix), Importante: a single failed GET /campaigns/:id/members (retry: false,
// lib/queryClient.ts) used to leave role === undefined indistinguishable from "confirmed not
// a member" — a legitimate DM got told "Solo el DM puede..." on their own campaign. Now
// isError is checked explicitly and never treated as "no permission".
describe("CampaignDetailPage — row opens for anyone who can view, editor honesty for who can edit", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ token: "tok", user: null });
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue({
      id: "c1",
      name: "Curse of Strahd",
      description: "spooky",
      ownerId: "u1",
      createdAt: "2026-01-01",
    });
    vi.spyOn(entitiesApi, "fetchEntities").mockImplementation(async (_cid, type) =>
      type === "NPC"
        ? [
            {
              id: "e1",
              campaignId: "c1",
              type: "NPC",
              name: "Strahd von Zarovich",
              tags: [],
              visibility: "PLAYERS",
              createdById: "dm1",
              createdAt: "x",
            },
          ]
        : [],
    );
    vi.spyOn(sessionsApi, "fetchSessions").mockResolvedValue([
      {
        id: "s1",
        campaignId: "c1",
        title: "Session Zero",
        scheduledAt: null,
        notes: null,
        visibility: "PLAYERS",
        createdAt: "x",
      },
    ]);
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([
      {
        id: "ch1",
        campaignId: "c1",
        ownerId: "dm1",
        name: "Strahd",
        race: null,
        class: null,
        level: 10,
        bio: null,
        visibility: "PLAYERS",
        createdAt: "x",
      },
    ]);
  });

  function asPlayer() {
    useAuthStore.setState({ user: { id: "p1", email: "p@b.com", displayName: "P" } });
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "dm1", displayName: "DM", role: "DM" },
      { userId: "p1", displayName: "P", role: "PLAYER" },
    ]);
  }

  function asDM() {
    useAuthStore.setState({ user: { id: "dm1", email: "dm@b.com", displayName: "DM" } });
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "dm1", displayName: "DM", role: "DM" },
      { userId: "p1", displayName: "P", role: "PLAYER" },
    ]);
  }

  it("lets a player open a session they can view but not manage, in a read-only editor", async () => {
    asPlayer();
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Sesiones" }));

    const newButton = await screen.findByRole("button", { name: "Nuevo" });
    await waitFor(() => expect(newButton).toBeDisabled());

    // The row itself is never disabled: it's the only detail view. Clicking it opens the
    // editor.
    const row = screen.getByRole("button", { name: /Session Zero/ });
    await waitFor(() => expect(row).not.toBeDisabled());
    fireEvent.click(row);

    expect(await screen.findByRole("heading", { name: "Editar sesión" })).toBeInTheDocument();
    // But it opens read-only: fields are disabled and Guardar can't be pressed.
    expect(screen.getByLabelText("Título")).toBeDisabled();
    const saveButton = screen.getByRole("button", { name: "Guardar" });
    expect(saveButton).toBeDisabled();
    expect(screen.getAllByText("Solo el DM puede crear o editar sesiones.").length).toBeGreaterThan(
      0,
    );
  });

  it("lets the DM open and edit a session normally", async () => {
    asDM();
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Sesiones" }));

    const newButton = await screen.findByRole("button", { name: "Nuevo" });
    await waitFor(() => expect(newButton).not.toBeDisabled());

    const row = await screen.findByRole("button", { name: /Session Zero/ });
    fireEvent.click(row);
    expect(await screen.findByRole("heading", { name: "Editar sesión" })).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardar" })).not.toBeDisabled();
  });

  it("lets a player open an entity created by someone else and read it, but not save changes", async () => {
    asPlayer();
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "NPCs" }));

    const newButton = await screen.findByRole("button", { name: "Nuevo" });
    // Any campaign member can create an entity (entities.service.ts requireMember) — only
    // editing someone else's is gated.
    await waitFor(() => expect(newButton).not.toBeDisabled());

    const row = await screen.findByRole("button", { name: /Strahd von Zarovich/ });
    await waitFor(() => expect(row).not.toBeDisabled());
    fireEvent.click(row);

    expect(await screen.findByRole("heading", { name: "Editar NPC" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    expect(
      screen.getAllByText("Solo el DM o quien lo creó puede editarlo.").length,
    ).toBeGreaterThan(0);
  });

  it("lets a player edit an entity they created themselves", async () => {
    useAuthStore.setState({ user: { id: "creator1", email: "c@b.com", displayName: "C" } });
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "dm1", displayName: "DM", role: "DM" },
      { userId: "creator1", displayName: "C", role: "PLAYER" },
    ]);
    vi.spyOn(entitiesApi, "fetchEntities").mockImplementation(async (_cid, type) =>
      type === "NPC"
        ? [
            {
              id: "e2",
              campaignId: "c1",
              type: "NPC",
              name: "Mi propio NPC",
              tags: [],
              visibility: "PLAYERS",
              createdById: "creator1",
              createdAt: "x",
            },
          ]
        : [],
    );
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "NPCs" }));

    const row = await screen.findByRole("button", { name: /Mi propio NPC/ });
    await waitFor(() => expect(row).not.toBeDisabled());
    fireEvent.click(row);
    expect(await screen.findByRole("heading", { name: "Editar NPC" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardar" })).not.toBeDisabled();
  });

  it("lets a player open another player's character and read it, but not save changes", async () => {
    asPlayer();
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Personajes" }));

    const newButton = await screen.findByRole("button", { name: "Nuevo" });
    await waitFor(() => expect(newButton).not.toBeDisabled());

    const row = await screen.findByRole("button", { name: /Strahd/ });
    await waitFor(() => expect(row).not.toBeDisabled());
    fireEvent.click(row);

    expect(await screen.findByRole("heading", { name: "Editar personaje" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    expect(
      screen.getAllByText("Solo el dueño o el DM puede editar este personaje.").length,
    ).toBeGreaterThan(0);
  });

  it("lets the owner edit their own character", async () => {
    useAuthStore.setState({ user: { id: "owner1", email: "o@b.com", displayName: "O" } });
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "dm1", displayName: "DM", role: "DM" },
      { userId: "owner1", displayName: "O", role: "PLAYER" },
    ]);
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([
      {
        id: "ch2",
        campaignId: "c1",
        ownerId: "owner1",
        name: "Mi propio personaje",
        race: null,
        class: null,
        level: 1,
        bio: null,
        visibility: "PLAYERS",
        createdAt: "x",
      },
    ]);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Personajes" }));

    const row = await screen.findByRole("button", { name: /Mi propio personaje/ });
    await waitFor(() => expect(row).not.toBeDisabled());
    fireEvent.click(row);
    expect(await screen.findByRole("heading", { name: "Editar personaje" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardar" })).not.toBeDisabled();
  });

  // Arreglo 4: a failed members fetch must read as "still don't know", never as "not a
  // member" / "no permission" — and must offer a way out. Exercised on the Resumen tab
  // (InvitePanel), which is what's mounted by default — switching to another tab first would
  // let that tab's own useMyRole trigger a second, successful fetch on the same query key
  // (staleTime 0) before the assertions below run, hiding exactly the error state under test.
  it("treats a failed members fetch as 'still checking', not 'no permission', and offers a retry", async () => {
    useAuthStore.setState({ user: { id: "dm1", email: "dm@b.com", displayName: "DM" } });
    const fetchMembers = vi
      .spyOn(membersApi, "fetchMembers")
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce([
        { userId: "dm1", displayName: "DM", role: "DM" },
        { userId: "p1", displayName: "P", role: "PLAYER" },
      ]);

    renderPage();

    const generateButton = await screen.findByRole("button", { name: "Generar invitación" });
    await waitFor(() => expect(generateButton).toBeDisabled());
    // Never the "no permission" message — the legitimate DM must not be told they aren't one.
    expect(screen.getByText("Comprobando permisos…")).toBeInTheDocument();
    expect(
      screen.queryByText("Solo el DM de la campaña puede generar invitaciones."),
    ).not.toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: "Reintentar" });
    fireEvent.click(retryButton);

    await waitFor(() => expect(generateButton).not.toBeDisabled());
    expect(fetchMembers).toHaveBeenCalledTimes(2);
  });
});

// Task 1.16, comportamiento 2 del brief: "si la lista tiene una sola fila, la prueba pasa
// por construcción — pon dos y borra la segunda". Wired through the real list -> row click ->
// editor flow (not the editor in isolation, which only ever knows about the one entity/session/
// character it was opened with), so a bug that deleted "whatever is first" or "whatever is
// cached" instead of the row that was actually opened would show up here.
describe("CampaignDetailPage — borrar desde la lista, con dos filas", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ user: { id: "dm1", email: "dm@b.com", displayName: "DM" } });
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "dm1", displayName: "DM", role: "DM" },
    ]);
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue({
      id: "c1",
      name: "Curse of Strahd",
      description: "spooky",
      ownerId: "dm1",
      createdAt: "2026-01-01",
    });
    vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([]);
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
    vi.spyOn(commentsApi, "fetchComments").mockResolvedValue([]);
  });

  it("borra la segunda entidad de dos, no la primera, y la lista queda con solo la primera", async () => {
    const first = {
      id: "e1",
      campaignId: "c1",
      type: "NPC" as const,
      name: "Ireena",
      tags: [],
      visibility: "PLAYERS" as const,
      createdById: "dm1",
      createdAt: "x",
    };
    const second = { ...first, id: "e2", name: "Strahd" };
    // Toggled right after the confirm click (before any microtask from mutateAsync runs), so
    // the refetch the invalidation triggers sees the post-delete list — same shape as the real
    // server, whose GET after a successful DELETE simply no longer includes the row.
    let deleted = false;
    vi.spyOn(entitiesApi, "fetchEntities").mockImplementation(async (_cid, type) =>
      type === "NPC" ? (deleted ? [first] : [first, second]) : [],
    );
    vi.spyOn(entitiesApi, "fetchEntity").mockResolvedValue({ ...second, grants: [] });
    const spy = vi.spyOn(entitiesApi, "deleteEntity").mockResolvedValue({ deleted: true });

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "NPCs" }));
    await screen.findByRole("button", { name: /Strahd/ });

    fireEvent.click(screen.getByRole("button", { name: /Strahd/ }));
    expect(await screen.findByRole("heading", { name: "Editar NPC" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, borrar definitivamente" }));
    deleted = true;

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith("c1", "e2");
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Editar NPC" })).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Strahd/ })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /Ireena/ })).toBeInTheDocument();
  });

  it("borra la segunda sesión de dos, no la primera", async () => {
    const first = {
      id: "s1",
      campaignId: "c1",
      title: "Sesión Cero",
      scheduledAt: null,
      notes: null,
      visibility: "PLAYERS" as const,
      createdAt: "x",
    };
    const second = { ...first, id: "s2", title: "Sesión Uno" };
    let deleted = false;
    vi.spyOn(sessionsApi, "fetchSessions").mockImplementation(async () =>
      deleted ? [first] : [first, second],
    );
    const spy = vi.spyOn(sessionsApi, "deleteSession").mockResolvedValue({ deleted: true });

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Sesiones" }));
    await screen.findByRole("button", { name: /Sesión Uno/ });

    fireEvent.click(screen.getByRole("button", { name: /Sesión Uno/ }));
    expect(await screen.findByRole("heading", { name: "Editar sesión" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, borrar definitivamente" }));
    deleted = true;

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith("c1", "s2");
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Sesión Uno/ })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /Sesión Cero/ })).toBeInTheDocument();
  });

  it("borra el segundo personaje de dos, no el primero", async () => {
    const first = {
      id: "ch1",
      campaignId: "c1",
      ownerId: "dm1",
      name: "Kaelith",
      race: null,
      class: null,
      level: 1,
      bio: null,
      visibility: "PLAYERS" as const,
      createdAt: "x",
    };
    const second = { ...first, id: "ch2", name: "Elara" };
    let deleted = false;
    vi.spyOn(charactersApi, "fetchCharacters").mockImplementation(async () =>
      deleted ? [first] : [first, second],
    );
    const spy = vi.spyOn(charactersApi, "deleteCharacter").mockResolvedValue({ deleted: true });

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Personajes" }));
    await screen.findByRole("button", { name: /Elara/ });

    fireEvent.click(screen.getByRole("button", { name: /Elara/ }));
    expect(await screen.findByRole("heading", { name: "Editar personaje" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, borrar definitivamente" }));
    deleted = true;

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith("c1", "ch2");
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Elara/ })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /Kaelith/ })).toBeInTheDocument();
  });
});

// Task 1.17c · A2 + C1: tags were written and never read anywhere but EntityEditor.tsx's own
// field, and there was no search or tag filter on any screen. This exercises EntityFilterBar
// (features/entities/EntityFilterBar.tsx) wired into EntityTab, and the tags now painted on
// each row.
describe("CampaignDetailPage — EntityTab: etiquetas visibles y filtro por etiqueta/nombre", () => {
  const strahd = {
    id: "e1",
    campaignId: "c1",
    type: "NPC" as const,
    name: "Strahd von Zarovich",
    tags: ["Barovia", "villano"],
    visibility: "PLAYERS" as const,
    createdById: "dm1",
    createdAt: "x",
  };
  const ismark = { ...strahd, id: "e2", name: "Ismark", tags: ["Barovia"] };
  const zariel = { ...strahd, id: "e3", name: "Zariel", tags: ["Avernus"] };
  const sinEtiquetas = { ...strahd, id: "e4", name: "NPC vacío", tags: [] };

  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ user: { id: "dm1", email: "dm@b.com", displayName: "DM" } });
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "dm1", displayName: "DM", role: "DM" },
    ]);
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue({
      id: "c1",
      name: "Curse of Strahd",
      description: "spooky",
      ownerId: "dm1",
      createdAt: "2026-01-01",
    });
    vi.spyOn(entitiesApi, "fetchEntities").mockImplementation(async (_cid, type) =>
      type === "NPC" ? [strahd, ismark, zariel, sinEtiquetas] : [],
    );
  });

  it("pinta las etiquetas en la fila, y una ficha sin etiquetas no pinta nada", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "NPCs" }));

    const strahdRow = await screen.findByRole("button", { name: /Strahd von Zarovich/ });
    expect(strahdRow).toHaveTextContent("Barovia");
    expect(strahdRow).toHaveTextContent("villano");

    const untaggedRow = screen.getByRole("button", { name: /NPC vacío/ });
    // Exact match, not a substring: a regression that "improves" the empty state with a
    // placeholder (e.g. a dash after the tags block) would still CONTAIN "NPC vacíoPLAYERS"
    // and pass a substring check silently. Anchored so the row's whole text is exactly the
    // name and the visibility, nothing tag-related tacked on — no dash, no placeholder, no
    // "sin etiquetas" text.
    expect(untaggedRow).toHaveTextContent(/^NPC vacíoPLAYERS$/);
  });

  it("escribir en el buscador reduce las filas", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "NPCs" }));
    await screen.findByRole("button", { name: /Strahd von Zarovich/ });

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "strahd" } });

    expect(screen.getByRole("button", { name: /Strahd von Zarovich/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Ismark/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Zariel/ })).not.toBeInTheDocument();
  });

  it("pulsar una etiqueta reduce las filas", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "NPCs" }));
    await screen.findByRole("button", { name: /Strahd von Zarovich/ });

    const avernusTag = screen.getByRole("button", { name: "Avernus", pressed: false });
    fireEvent.click(avernusTag);

    expect(screen.getByRole("button", { name: /Zariel/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Strahd von Zarovich/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Ismark/ })).not.toBeInTheDocument();
  });

  it("dos etiquetas seleccionadas exigen las dos: una ficha con solo una de ellas desaparece", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "NPCs" }));
    await screen.findByRole("button", { name: /Strahd von Zarovich/ });

    fireEvent.click(screen.getByRole("button", { name: "Barovia", pressed: false }));
    // Both Strahd and Ismark carry "Barovia" alone.
    expect(screen.getByRole("button", { name: /Strahd von Zarovich/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Ismark/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "villano", pressed: false }));
    // Only Strahd carries both — Ismark, which carries only "Barovia", must disappear.
    expect(screen.getByRole("button", { name: /Strahd von Zarovich/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Ismark/ })).not.toBeInTheDocument();
    expect(screen.getByText("1 de 4")).toBeInTheDocument();
  });

  it('"Quitar filtros" restaura la lista completa', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "NPCs" }));
    await screen.findByRole("button", { name: /Strahd von Zarovich/ });

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "strahd" } });
    expect(screen.queryByRole("button", { name: /^Zariel/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Quitar filtros" }));

    expect(screen.getByRole("button", { name: /Strahd von Zarovich/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Ismark/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Zariel/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /NPC vacío/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quitar filtros" })).not.toBeInTheDocument();
  });

  it('con filtro activo y cero resultados sale el mensaje de filtro, no "Sin elementos."', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "NPCs" }));
    await screen.findByRole("button", { name: /Strahd von Zarovich/ });

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "no existe nadie así" } });

    expect(screen.getByText("Ningún elemento coincide con el filtro.")).toBeInTheDocument();
    expect(screen.queryByText("Sin elementos.")).not.toBeInTheDocument();
  });

  // EntityTab isn't remounted just because `type` changes (same component, same position in
  // the tree) — without `key={tab.type}` on the render call in CampaignDetailPage, a search
  // typed on NPCs would silently keep filtering the Lugares list too, hiding entities that
  // have nothing to do with what was typed. Confirmed as a real bug with a throwaway RTL
  // check before adding the `key`; this test is the permanent guard against it coming back.
  it("el filtro no se cuela de una pestaña de entidad a otra", async () => {
    vi.spyOn(entitiesApi, "fetchEntities").mockImplementation(async (_cid, type) =>
      type === "NPC"
        ? [strahd, ismark, zariel, sinEtiquetas]
        : type === "LOCATION"
          ? [{ ...strahd, id: "e5", type: "LOCATION", name: "Barovia", tags: [] }]
          : [],
    );
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "NPCs" }));
    await screen.findByRole("button", { name: /Strahd von Zarovich/ });

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "strahd" } });
    expect(screen.queryByRole("button", { name: /^Ismark/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Lugares" }));
    const barovia = await screen.findByRole("button", { name: /Barovia/ });
    expect(barovia).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar")).toHaveValue("");
  });
});
