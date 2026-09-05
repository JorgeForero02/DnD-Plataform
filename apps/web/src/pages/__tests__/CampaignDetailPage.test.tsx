import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CampaignDetailPage } from "../CampaignDetailPage";
import { EntityDetailPage } from "../EntityDetailPage";
import { CharacterDetailPage } from "../CharacterDetailPage";
import { CampaignList } from "../../features/campaigns/CampaignList";
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
          {/* Reseño 2026-09-02 — las filas de fichas son enlaces a la página de lectura, así
              que sin esta ruta el clic navegaría a ninguna parte y la prueba mediría un vacío. */}
          <Route path="/campaigns/:id/entidades/:entityId" element={<EntityDetailPage />} />
          <Route path="/campaigns/:id/personajes/:characterId" element={<CharacterDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// Same as renderPage, plus a "/" route with a marker heading — 1.17d's delete-campaign and
// leave-campaign flows navigate to "/" with react-router's useNavigate (never
// window.location), and this is how a test can tell that actually happened instead of just
// trusting the mutation resolved.
function renderPageWithHome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/campaigns/c1"]}>
        <Routes>
          <Route path="/" element={<h1>Tus crónicas</h1>} />
          <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// Same shape as renderPage, but "/" renders the real CampaignList (not a marker heading) and
// starts there — so campaignsKey gets a real fetch-and-cache before anything navigates into
// the campaign. staleTime is set to match production (lib/queryClient.ts) instead of the 0
// vitest would otherwise default to: with staleTime 0, a remount always refetches on its own
// regardless of any invalidateQueries call, which would make a missing invalidation
// invisible to this exact kind of test — see CRITICAL 1 in task-4-report.md, "Fix round 1".
function renderPageWithRealHome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<CampaignList />} />
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
        status: "PLANNED" as const,
        startedAt: null,
        endedAt: null,
        attendance: null,
      },
    ]);
  });

  it("renders campaign name and switches tabs to show the right list", async () => {
    renderPage();
    expect(await screen.findByText("Curse of Strahd")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "El mundo" }));
    fireEvent.click(screen.getByRole("button", { name: /^PNJ/ }));
    expect(await screen.findByText("Strahd von Zarovich")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Sesiones" }));
    expect(await screen.findByText("Session Zero")).toBeInTheDocument();
  });

  // Fix round 1 (post-1.18b review), Important 12: /campaigns/:id matches any segment, so a
  // stale link or a mistyped id never reaches App.tsx's wildcard 404 route (specificity ranks
  // it last) — it lands here instead. Before this fix, a failed useCampaign() rendered an
  // empty <h1> and a tab strip of panels each failing on their own; revert the isError branch
  // in CampaignDetailPage.tsx and this fails, with an empty heading in its place.
  it("says the campaign doesn't exist instead of an empty title when useCampaign fails", async () => {
    vi.spyOn(campaignsApi, "fetchCampaign").mockRejectedValue(new Error("Not found"));
    renderPage();

    expect(
      // Reseño 2026-09-02: same statement, now the title of an EmptyState instead of a loose
      // red paragraph — and still deliberately refusing to say WHICH of the three cases it is
      // (deleted / never existed / you are not a member), because telling them apart would
      // leak exactly what canView exists to protect.
      await screen.findByText("Esta campaña no existe o no tienes acceso"),
    ).toBeInTheDocument();
    // Reseño 2026-09-02: the failure screen now HAS a heading — "Campaña no disponible" — and
    // that is the improvement, not a regression: the original bug was an EMPTY <h1>, not the
    // existence of one. What still must not appear is a heading carrying no text, and the
    // tab list of panels that each used to fail separately.
    const encabezados = screen.queryAllByRole("heading");
    expect(encabezados.length).toBeGreaterThan(0);
    for (const h of encabezados) expect(h.textContent?.trim()).not.toBe("");
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
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
        status: "PLANNED" as const,
        startedAt: null,
        endedAt: null,
        attendance: null,
      },
    ]);
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([
      {
        id: "ch1",
        campaignId: "c1",
        ownerId: "dm1",
        name: "Strahd",
        // **Las claves del catálogo, y el texto libre heredado vacío**, que es exactamente la
        // forma que tiene un personaje montado desde la hoja: es el caso que la lista pintaba
        // en blanco hasta el 2026-09-02.
        race: null,
        raceKey: "human",
        subraceKey: null,
        classKey: "wizard",
        class: null,
        level: 10,
        bio: null,
        visibility: "PLAYERS",
        createdAt: "x",
        archivedAt: null,

        color: null,
      },
    ]);
    // Reseño 2026-09-02: la fila lleva a EntityDetailPage, que pide la ficha por su id. Sin
    // este doble, la página pintaría su pantalla de "no disponible" y la prueba mediría eso.
    vi.spyOn(entitiesApi, "fetchEntity").mockImplementation(async (_cid, entityId) => {
      const lista = await entitiesApi.fetchEntities("c1", "NPC");
      const encontrada = lista.find((e) => e.id === entityId) ?? lista[0];
      return { ...encontrada, grants: [] };
    });
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
    fireEvent.click(await screen.findByRole("tab", { name: "Sesiones" }));

    const newButton = await screen.findByRole("button", { name: "Nueva sesión" });
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
    fireEvent.click(await screen.findByRole("tab", { name: "Sesiones" }));

    const newButton = await screen.findByRole("button", { name: "Nueva sesión" });
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
    fireEvent.click(await screen.findByRole("tab", { name: "El mundo" }));
    fireEvent.click(await screen.findByRole("button", { name: /^PNJ/ }));

    // **A un jugador ya no se le ofrece crear mundo.** Lo señaló el DM probando con un jugador
    // dentro: podía crear PNJ, lugares y misiones, y con ello veía el andamiaje entero de
    // construir mundo. Ahora el servidor exige DM (`entities.service.ts`, `requireDM`) y la
    // pantalla deja de ofrecer lo que iba a dar 403.
    expect(screen.queryByRole("button", { name: "Nuevo PNJ" })).not.toBeInTheDocument();

    const row = await screen.findByRole("link", { name: /Strahd von Zarovich/ });
    await waitFor(() => expect(row).not.toBeDisabled());
    fireEvent.click(row);

    // La fila lleva a la página de lectura; el editor se abre desde ahí, que es la diferencia
    // entre consultar una ficha en mitad de una partida y modificarla.
    fireEvent.click(
      await screen.findByRole("button", {
        name: /Editar|Ver el texto completo/,
      }),
    );
    expect(await screen.findByRole("heading", { name: "Editar PNJ" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    expect(
      screen.getAllByText("Solo el DM o quien lo creó puede editarlo.").length,
    ).toBeGreaterThan(0);
    // Task 1.18b: the per-row reason (inside the row button, next to the tag chips) used to be
    // --muted — the same colour as those chips, so it read as one more piece of metadata
    // instead of the permission notice it is. Revert the class in CampaignDetailPage.tsx back
    // to text-muted and this fails even though the sentence itself is unchanged.
    const rowReason = within(row).getByText("Solo el DM o quien lo creó puede editarlo.");
    expect(rowReason).toHaveClass("text-warning-text");
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
    fireEvent.click(await screen.findByRole("tab", { name: "El mundo" }));
    fireEvent.click(await screen.findByRole("button", { name: /^PNJ/ }));

    const row = await screen.findByRole("link", { name: /Mi propio NPC/ });
    await waitFor(() => expect(row).not.toBeDisabled());
    fireEvent.click(row);
    // Reseño 2026-09-02: la fila lleva a la página de lectura; el editor se abre desde ella,
    // que es justo la diferencia entre leer una ficha y editarla.
    fireEvent.click(
      await screen.findByRole("button", {
        name: /Editar|Ver el texto completo/,
      }),
    );
    expect(await screen.findByRole("heading", { name: "Editar PNJ" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardar" })).not.toBeDisabled();
  });

  it("la fila de un personaje dice su raza y su clase aunque solo tenga las claves de la hoja", async () => {
    // La regresión, fijada donde se veía: la hoja escribe `raceKey`/`classKey` y esta fila leía
    // solo el texto libre heredado, así que un personaje montado desde la hoja salía sin raza y
    // sin clase mientras su propia hoja decía «Humano · Mago».
    asPlayer();
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Personajes" }));

    const row = await screen.findByRole("link", { name: /Strahd/ });
    expect(row).toHaveTextContent("Humano · Mago");
    // Y ninguna clave cruda llega a la pantalla.
    expect(row).not.toHaveTextContent("human");
    expect(row).not.toHaveTextContent("wizard");
  });

  it("lets a player open another player's character and read it, but not save changes", async () => {
    asPlayer();
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Personajes" }));

    const newButton = await screen.findByRole("button", { name: "Nuevo personaje" });
    await waitFor(() => expect(newButton).not.toBeDisabled());

    const row = await screen.findByRole("link", { name: /Strahd/ });
    await waitFor(() => expect(row).not.toBeDisabled());
    fireEvent.click(row);

    // **Ya no hay diálogo de edición**: la hoja se toca donde se lee. Lo que se comprueba es que
    // a quien no puede editar no se le ofrece — ni el botón de ajustes, ni los campos en el
    // sitio, y el motivo se lee al pasar el ratón.
    // El nombre accesible del control ES el nombre del personaje: si fuera «Editar…», el
    // encabezado de la página dejaría de llamarse como el personaje.
    const nombre = await screen.findByRole("button", { name: "Strahd" });
    expect(nombre).toBeDisabled();
    expect(nombre).toHaveAttribute("title", "Solo el dueño o el DM puede editar este personaje.");
    // H6: tampoco queda el botón «Ajustes y borrado» que abría el segundo camino de edición.
    // La visibilidad y el borrado viven ahora en la propia página, deshabilitados con su motivo
    // — lo comprueba pages/__tests__/CharacterDetailPage.test.tsx.
    expect(screen.queryByRole("button", { name: "Ajustes y borrado" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Borrar" })).toBeDisabled();
    // Fix round 1 (post-1.18b review), Important 9: this row-shape (a muted "Nivel N" chip
    // followed by the reason) was left on --muted while EntityTab's identical shape was fixed
    // — the same sentence read as two different things in two tabs of one screen. Revert the
    // class here back to text-muted and this fails even though the sentence is unchanged.
    const rowReason = within(row).getByText("Solo el dueño o el DM puede editar este personaje.");
    expect(rowReason).toHaveClass("text-warning-text");
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
        raceKey: null,
        subraceKey: null,
        classKey: null,
        class: null,
        level: 1,
        bio: null,
        visibility: "PLAYERS",
        createdAt: "x",
        archivedAt: null,

        color: null,
      },
    ]);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Personajes" }));

    const row = await screen.findByRole("link", { name: /Mi propio personaje/ });
    await waitFor(() => expect(row).not.toBeDisabled());
    fireEvent.click(row);

    // El dueño edita donde lee: el nombre y la historia son campos, no un diálogo.
    expect(await screen.findByRole("button", { name: "Mi propio personaje" })).not.toBeDisabled();
    expect(screen.getByTitle("Editar Historia del personaje")).not.toBeDisabled();
    // H6: la visibilidad se elige aquí mismo, en radios, sin abrir nada.
    expect(
      screen.getByRole("radio", { name: /Todos los que se sientan a esta mesa/ }),
    ).toBeChecked();
    expect(screen.getByRole("button", { name: "Borrar" })).not.toBeDisabled();
  });

  // Arreglo 4: a failed members fetch must read as "still don't know", never as "not a
  // member" / "no permission" — and must offer a way out. Exercised on the Resumen tab
  // (InvitePanel), which is what's mounted by default — switching to another tab first would
  // let that tab's own useMyRole trigger a second, successful fetch on the same query key
  // (staleTime 0) before the assertions below run, hiding exactly the error state under test.
  it("treats a failed members fetch as 'still checking', not 'no permission', and offers a retry", async () => {
    useAuthStore.setState({ user: { id: "dm1", email: "dm@b.com", displayName: "DM" } });
    // **Falla mientras se le diga que falle, no «la primera vez».** Con `mockRejectedValueOnce`
    // esta prueba dependía de **cuántos observadores** montaran la consulta de miembros, y B5 lo
    // rompió al pedirlos también en el resumen: la primera petición se la comía el tablero, y
    // TanStack reintenta al montar un observador nuevo sobre una consulta en error, así que el
    // botón salía habilitado sin que nadie pulsara «Reintentar». Lo que la prueba defiende —que
    // un fallo se lee como «comprobando» y nunca como «no eres el DM»— no cambió; lo que era
    // frágil era atarlo a un número de llamadas.
    let falla = true;
    const fetchMembers = vi.spyOn(membersApi, "fetchMembers").mockImplementation(async () => {
      if (falla) throw new Error("network error");
      return [
        { userId: "dm1", displayName: "DM", role: "DM" },
        { userId: "p1", displayName: "P", role: "PLAYER" },
      ];
    });

    renderPage();

    fireEvent.click(await screen.findByRole("tab", { name: "Ajustes" }));
    const generateButton = await screen.findByRole("button", { name: "Generar invitación" });
    // 1.17d mounts CampaignSettings and MembersPanel in the same tab, and both show their own
    // "Comprobando permisos…"/"Reintentar" while their own useMyRole is unresolved — scoped to
    // InvitePanel's own container so this stays about InvitePanel specifically, not whichever
    // of the three happens to settle first.
    const invitePanel = generateButton.closest("div") as HTMLElement;
    await waitFor(() => expect(generateButton).toBeDisabled());
    // Never the "no permission" message — the legitimate DM must not be told they aren't one.
    expect(within(invitePanel).getByText("Comprobando permisos…")).toBeInTheDocument();
    expect(
      within(invitePanel).queryByText("Solo el DM de la campaña puede generar invitaciones."),
    ).not.toBeInTheDocument();

    const retryButton = within(invitePanel).getByRole("button", { name: "Reintentar" });
    const llamadasAntes = fetchMembers.mock.calls.length;
    falla = false;
    fireEvent.click(retryButton);

    await waitFor(() => expect(generateButton).not.toBeDisabled());
    // Que el reintento **pide de verdad**, sin fijar cuántas veces se pidió antes.
    expect(fetchMembers.mock.calls.length).toBeGreaterThan(llamadasAntes);
  });

  // Fix round 1 (post-1.18b review), Important 8: CHECKING_PERMISSIONS ("Comprobando
  // permisos…") is a transient loading placeholder, not a real "you can't edit this" — it must
  // not paint in the same loud register as the real reason. Revert the guard in
  // CampaignDetailPage.tsx (drop the `reason === CHECKING_PERMISSIONS` check) and this fails
  // even though the placeholder text itself is unchanged.
  it("the 'still checking' placeholder on a row stays muted, not warning", async () => {
    useAuthStore.setState({ user: { id: "dm1", email: "dm@b.com", displayName: "DM" } });
    vi.spyOn(membersApi, "fetchMembers").mockReturnValue(new Promise(() => {}));

    renderPage();
    fireEvent.click(await screen.findByRole("tab", { name: "El mundo" }));
    fireEvent.click(await screen.findByRole("button", { name: /^PNJ/ }));

    const row = await screen.findByRole("link", { name: /Strahd von Zarovich/ });
    const placeholder = within(row).getByText("Comprobando permisos…");
    expect(placeholder).toHaveClass("text-muted");
    expect(placeholder).not.toHaveClass("text-warning-text");
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
    fireEvent.click(await screen.findByRole("tab", { name: "El mundo" }));
    fireEvent.click(await screen.findByRole("button", { name: /^PNJ/ }));
    await screen.findByRole("link", { name: /Strahd/ });

    fireEvent.click(screen.getByRole("link", { name: /Strahd/ }));
    fireEvent.click(
      await screen.findByRole("button", {
        name: /Editar|Ver el texto completo/,
      }),
    );
    expect(await screen.findByRole("heading", { name: "Editar PNJ" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, borrar definitivamente" }));
    deleted = true;

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith("c1", "e2");
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Editar PNJ" })).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.queryByRole("link", { name: /Strahd/ })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: /Ireena/ })).toBeInTheDocument();
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
      status: "PLANNED" as const,
      startedAt: null,
      endedAt: null,
      attendance: null,
    };
    const second = { ...first, id: "s2", title: "Sesión Uno" };
    let deleted = false;
    vi.spyOn(sessionsApi, "fetchSessions").mockImplementation(async () =>
      deleted ? [first] : [first, second],
    );
    const spy = vi.spyOn(sessionsApi, "deleteSession").mockResolvedValue({ deleted: true });

    renderPage();
    fireEvent.click(await screen.findByRole("tab", { name: "Sesiones" }));
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
      raceKey: null,
      subraceKey: null,
      classKey: null,
      class: null,
      level: 1,
      bio: null,
      visibility: "PLAYERS" as const,
      createdAt: "x",
      archivedAt: null,

      color: null,
    };
    const second = { ...first, id: "ch2", name: "Elara" };
    let deleted = false;
    vi.spyOn(charactersApi, "fetchCharacters").mockImplementation(async () =>
      deleted ? [first] : [first, second],
    );
    // **El doble tiene que borrar de verdad, y esto lo cazó `lint`.** `deleted` se declaraba y
    // no lo ponía nadie a `true`, así que el listado devolvía los dos personajes antes y después
    // de confirmar: la prueba pasaba igual con el borrado roto. Es el mismo defecto de «pruebas
    // que no distinguen» que la ronda de mutación encontró seis veces.
    const borrar = vi.spyOn(charactersApi, "deleteCharacter").mockImplementation(async () => {
      deleted = true;
      return { deleted: true };
    });

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Personajes" }));
    await screen.findByRole("link", { name: /Elara/ });

    fireEvent.click(screen.getByRole("link", { name: /Elara/ }));
    // H6: ya no se abre ningún diálogo. Borrar está en la propia página del personaje, detrás
    // de su botón y su confirmación, que es lo único irreversible que queda tras un clic.
    fireEvent.click(await screen.findByRole("button", { name: "Borrar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, borrar definitivamente" }));

    // **El cajón no sobrevive a navegar, y eso es correcto.** Pulsar un personaje abre su ficha,
    // que es otra pantalla: el cajón se cerró al irse, como se cierra cualquier superpuesto. Al
    // volver a la campaña hay que abrirlo otra vez para ver la lista — igual que en la mesa.
    await waitFor(() => expect(borrar).toHaveBeenCalledWith("c1", "ch2"));

    fireEvent.click(await screen.findByRole("button", { name: "Personajes" }));
    await screen.findByRole("link", { name: /Kaelith/ });
    // Y Elara ya no está: es lo que la prueba decía comprobar y no comprobaba.
    expect(screen.queryByRole("link", { name: /Elara/ })).not.toBeInTheDocument();
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
    fireEvent.click(await screen.findByRole("tab", { name: "El mundo" }));
    fireEvent.click(await screen.findByRole("button", { name: /^PNJ/ }));

    const strahdRow = await screen.findByRole("link", { name: /Strahd von Zarovich/ });
    expect(strahdRow).toHaveTextContent("Barovia");
    expect(strahdRow).toHaveTextContent("villano");

    const untaggedRow = screen.getByRole("link", { name: /NPC vacío/ });
    // Exact match, not a substring: a regression that "improves" the empty state with a
    // placeholder (e.g. a dash after the tags block) would still CONTAIN the name and the
    // visibility badge and pass a substring check silently. Anchored so the row's whole text
    // is exactly the name and the visibility badge (task 1.19: icon + Spanish label, not the
    // raw "PLAYERS" enum value), nothing tag-related tacked on — no dash, no placeholder, no
    // "sin etiquetas" text.
    expect(untaggedRow).toHaveTextContent(/^NPC vacío◐Jugadores$/);
  });

  it("escribir en el buscador reduce las filas", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("tab", { name: "El mundo" }));
    fireEvent.click(await screen.findByRole("button", { name: /^PNJ/ }));
    await screen.findByRole("link", { name: /Strahd von Zarovich/ });

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "strahd" } });

    expect(screen.getByRole("link", { name: /Strahd von Zarovich/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Ismark/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Zariel/ })).not.toBeInTheDocument();
  });

  it("pulsar una etiqueta reduce las filas", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("tab", { name: "El mundo" }));
    fireEvent.click(await screen.findByRole("button", { name: /^PNJ/ }));
    await screen.findByRole("link", { name: /Strahd von Zarovich/ });

    const avernusTag = screen.getByRole("button", { name: "Avernus", pressed: false });
    fireEvent.click(avernusTag);

    expect(screen.getByRole("link", { name: /Zariel/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Strahd von Zarovich/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Ismark/ })).not.toBeInTheDocument();
  });

  it("dos etiquetas seleccionadas exigen las dos: una ficha con solo una de ellas desaparece", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("tab", { name: "El mundo" }));
    fireEvent.click(await screen.findByRole("button", { name: /^PNJ/ }));
    await screen.findByRole("link", { name: /Strahd von Zarovich/ });

    fireEvent.click(screen.getByRole("button", { name: "Barovia", pressed: false }));
    // Both Strahd and Ismark carry "Barovia" alone.
    expect(screen.getByRole("link", { name: /Strahd von Zarovich/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Ismark/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "villano", pressed: false }));
    // Only Strahd carries both — Ismark, which carries only "Barovia", must disappear.
    expect(screen.getByRole("link", { name: /Strahd von Zarovich/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Ismark/ })).not.toBeInTheDocument();
    expect(screen.getByText("1 de 4")).toBeInTheDocument();
  });

  it('"Quitar filtros" restaura la lista completa', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("tab", { name: "El mundo" }));
    fireEvent.click(await screen.findByRole("button", { name: /^PNJ/ }));
    await screen.findByRole("link", { name: /Strahd von Zarovich/ });

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "strahd" } });
    expect(screen.queryByRole("link", { name: /^Zariel/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Quitar filtros" }));

    expect(screen.getByRole("link", { name: /Strahd von Zarovich/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Ismark/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Zariel/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /NPC vacío/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quitar filtros" })).not.toBeInTheDocument();
  });

  it("con filtro activo y cero resultados sale el mensaje de filtro, no el de sección vacía", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("tab", { name: "El mundo" }));
    fireEvent.click(await screen.findByRole("button", { name: /^PNJ/ }));
    await screen.findByRole("link", { name: /Strahd von Zarovich/ });

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "no existe nadie así" } });

    expect(screen.getByText("Nada coincide con el filtro")).toBeInTheDocument();
    // Reseño 2026-09-02: ambos mensajes son ahora estados vacíos con nombre propio. Lo que se
    // comprueba sigue siendo lo mismo: "no hay nada aquí" y "tu filtro no encuentra nada" son
    // dos situaciones distintas y no pueden decir lo mismo.
    expect(screen.queryByText("Ningún personaje del mundo todavía")).not.toBeInTheDocument();
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
    fireEvent.click(await screen.findByRole("tab", { name: "El mundo" }));
    fireEvent.click(await screen.findByRole("button", { name: /^PNJ/ }));
    await screen.findByRole("link", { name: /Strahd von Zarovich/ });

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "strahd" } });
    expect(screen.queryByRole("link", { name: /^Ismark/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Lugares/ }));
    const barovia = await screen.findByRole("link", { name: /Barovia/ });
    expect(barovia).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar")).toHaveValue("");
  });
});

// Task 1.17d · B1 + B2: the API existed since 1.17a (PATCH/DELETE campaigns.controller.ts)
// but no screen consumed it. These tests exercise CampaignSettings.tsx and MembersPanel.tsx,
// both mounted in the "Resumen" tab of CampaignDetailPage.tsx (the only section this task
// was allowed to touch).
// Reseño 2026-09-02 — audit B2: these panels used to live in the FIRST tab, so opening your
// own campaign put an editable name field and a "Borrar" button in front of you before it told
// you anything about your table. They moved to a section of their own called "Ajustes", and
// every test below now opens that section first — which is exactly the behaviour change this
// suite should be asserting, rather than being edited into silence.
describe("CampaignDetailPage — Ajustes: campaña y miembros (1.17d)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue({
      id: "c1",
      name: "Curse of Strahd",
      description: "spooky",
      ownerId: "dm1",
      createdAt: "2026-01-01",
    });
    vi.spyOn(entitiesApi, "fetchEntities").mockResolvedValue([]);
    vi.spyOn(sessionsApi, "fetchSessions").mockResolvedValue([]);
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([]);
  });

  // Opens the Ajustes section, then waits for its form to arrive. Every test in this block
  // used to land there by default; now it is one deliberate click, the same one a person makes.
  async function renderAjustes() {
    renderPage();
    fireEvent.click(await screen.findByRole("tab", { name: "Ajustes" }));
  }

  function asPlayer() {
    useAuthStore.setState({ user: { id: "p1", email: "p@b.com", displayName: "Jugadora" } });
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "dm1", displayName: "DM", role: "DM" },
      { userId: "p1", displayName: "Jugadora", role: "PLAYER" },
    ]);
  }

  function asDM() {
    useAuthStore.setState({ user: { id: "dm1", email: "dm@b.com", displayName: "DM" } });
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "dm1", displayName: "DM", role: "DM" },
      { userId: "p1", displayName: "Jugadora", role: "PLAYER" },
    ]);
  }

  it("el formulario de ajustes sale deshabilitado con el motivo para un jugador", async () => {
    asPlayer();
    await renderAjustes();
    expect(await screen.findByDisplayValue("Curse of Strahd")).toBeDisabled();
    expect(screen.getByDisplayValue("spooky")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    expect(screen.getByText("Solo el DM puede editar la campaña.")).toBeInTheDocument();
    // Fix round 2, IMPORTANT B: DeleteButton only ever exposes disabledReason via title=,
    // invisible on touch and to a screen reader — CampaignSettings.tsx has to put the
    // delete-specific wording ("borrar", not "editar") on screen itself for it to satisfy
    // "disabled, never hidden, with the reason visible" for the delete control specifically.
    expect(screen.getByText("Solo el DM puede borrar la campaña.")).toBeInTheDocument();
  });

  it("el formulario de ajustes sale habilitado para el DM", async () => {
    asDM();
    await renderAjustes();
    expect(await screen.findByDisplayValue("Curse of Strahd")).not.toBeDisabled();
    expect(screen.getByDisplayValue("spooky")).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardar" })).not.toBeDisabled();
    expect(screen.queryByText("Solo el DM puede editar la campaña.")).not.toBeInTheDocument();
  });

  // Fix round 2, MINOR D: this prose paragraph has already vanished once without a test
  // catching it (Spec Gap 3 of fix round 1). A paragraph element is not the same node as the
  // <textarea>'s own initial text content, which jsdom also renders as "spooky" — scoped with
  // getByRole("paragraph") so this genuinely checks the prose view, not the form control.
  it("la descripción se ve como texto legible, no solo dentro del campo de edición", async () => {
    asPlayer();
    await renderAjustes();
    await screen.findByDisplayValue("Curse of Strahd");
    // jsdom also renders the controlled <textarea>'s initial value as its own text node, so
    // "spooky" matches more than one element — the paragraph is the one this test actually
    // cares about (Spec Gap 3, fix round 1: it disappeared once without any test noticing).
    const prose = screen.getAllByText("spooky").find((el) => el.tagName === "P");
    expect(prose).toBeInTheDocument();
  });

  it("una campaña sin descripción muestra 'Sin descripción.' en la vista legible", async () => {
    asPlayer();
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue({
      id: "c1",
      name: "Curse of Strahd",
      description: null,
      ownerId: "dm1",
      createdAt: "2026-01-01",
    });
    await renderAjustes();
    await screen.findByDisplayValue("Curse of Strahd");
    expect(await screen.findByText("Sin descripción.")).toBeInTheDocument();
  });

  it("guardar manda el PATCH con el nombre y la descripción actuales", async () => {
    asDM();
    const spy = vi.spyOn(campaignsApi, "updateCampaign").mockResolvedValue({
      id: "c1",
      name: "Curse of Strahd (revisada)",
      description: "spooky",
      ownerId: "dm1",
      createdAt: "2026-01-01",
    });
    await renderAjustes();
    const nameInput = await screen.findByDisplayValue("Curse of Strahd");
    fireEvent.change(nameInput, { target: { value: "Curse of Strahd (revisada)" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith("c1", {
        name: "Curse of Strahd (revisada)",
        description: "spooky",
      }),
    );
  });

  it("vaciar la descripción manda una cadena vacía, no omite la clave", async () => {
    asDM();
    const spy = vi.spyOn(campaignsApi, "updateCampaign").mockResolvedValue({
      id: "c1",
      name: "Curse of Strahd",
      description: "",
      ownerId: "dm1",
      createdAt: "2026-01-01",
    });
    await renderAjustes();
    const descInput = await screen.findByDisplayValue("spooky");
    fireEvent.change(descInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith("c1", { name: "Curse of Strahd", description: "" }),
    );
  });

  it("un error del servidor al guardar se ve en pantalla", async () => {
    asDM();
    vi.spyOn(campaignsApi, "updateCampaign").mockRejectedValue(
      new Error("El nombre es obligatorio"),
    );
    await renderAjustes();
    await screen.findByDisplayValue("Curse of Strahd");
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("El nombre es obligatorio")).toBeInTheDocument();
  });

  it("borrar la campaña, al confirmar, navega a /", async () => {
    asDM();
    vi.spyOn(campaignsApi, "deleteCampaign").mockResolvedValue({ deleted: true });
    renderPageWithHome();
    fireEvent.click(await screen.findByRole("tab", { name: "Ajustes" }));
    await screen.findByDisplayValue("Curse of Strahd");
    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, borrar definitivamente" }));
    expect(await screen.findByRole("heading", { name: "Tus crónicas" })).toBeInTheDocument();
  });

  it("un error del servidor al borrar la campaña se ve en pantalla", async () => {
    asDM();
    vi.spyOn(campaignsApi, "deleteCampaign").mockRejectedValue(new Error("No se pudo borrar"));
    await renderAjustes();
    await screen.findByDisplayValue("Curse of Strahd");
    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, borrar definitivamente" }));
    expect(await screen.findByText("No se pudo borrar")).toBeInTheDocument();
  });

  it('"Expulsar" se ofrece al DM', async () => {
    asDM();
    await renderAjustes();
    // Se busca **dentro de la lista de miembros**: el nombre de quien ha iniciado sesión sale
    // también en la cabecera, así que «Jugadora» a secas es ambiguo. Pasaba por una carrera —los
    // miembros llegaban después de la primera consulta— y B5 la deshizo al pedirlos ya en el
    // resumen.
    const miembros = await screen.findByRole("list", { name: "Miembros de la campaña" });
    await within(miembros).findByText("Jugadora");
    expect(await screen.findByRole("button", { name: "Expulsar" })).toBeInTheDocument();
  });

  it('un jugador no ve "Expulsar", y ve "Salir de la campaña" en su lugar', async () => {
    asPlayer();
    await renderAjustes();
    // Se busca **dentro de la lista de miembros**: el nombre de quien ha iniciado sesión sale
    // también en la cabecera, así que «Jugadora» a secas es ambiguo. Pasaba por una carrera —los
    // miembros llegaban después de la primera consulta— y B5 la deshizo al pedirlos ya en el
    // resumen.
    const miembros = await screen.findByRole("list", { name: "Miembros de la campaña" });
    await within(miembros).findByText("Jugadora");
    expect(screen.queryByRole("button", { name: "Expulsar" })).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Salir de la campaña" })).toBeInTheDocument();
  });

  it('el DM no ve "Salir de la campaña": ve el motivo que da el servidor', async () => {
    asDM();
    await renderAjustes();
    // Se busca **dentro de la lista de miembros**: el nombre de quien ha iniciado sesión sale
    // también en la cabecera, así que «Jugadora» a secas es ambiguo. Pasaba por una carrera —los
    // miembros llegaban después de la primera consulta— y B5 la deshizo al pedirlos ya en el
    // resumen.
    const miembros = await screen.findByRole("list", { name: "Miembros de la campaña" });
    await within(miembros).findByText("Jugadora");
    expect(screen.queryByRole("button", { name: "Salir de la campaña" })).not.toBeInTheDocument();
    expect(
      screen.getByText("El DM no puede salir de su propia campaña; bórrala."),
    ).toBeInTheDocument();
  });

  it("expulsar manda el DELETE con el userId de la jugadora, no el propio", async () => {
    asDM();
    const spy = vi.spyOn(membersApi, "removeMember").mockResolvedValue({ removed: true });
    await renderAjustes();
    fireEvent.click(await screen.findByRole("button", { name: "Expulsar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, expulsar" }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith("c1", "p1"));
  });

  it("un error del servidor al expulsar se ve en pantalla", async () => {
    asDM();
    vi.spyOn(membersApi, "removeMember").mockRejectedValue(new Error("A DM cannot be removed"));
    await renderAjustes();
    fireEvent.click(await screen.findByRole("button", { name: "Expulsar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, expulsar" }));
    expect(await screen.findByText("A DM cannot be removed")).toBeInTheDocument();
  });

  it("salir de la campaña, al confirmar, navega a /", async () => {
    asPlayer();
    vi.spyOn(membersApi, "removeMember").mockResolvedValue({ removed: true });
    renderPageWithHome();
    fireEvent.click(await screen.findByRole("tab", { name: "Ajustes" }));
    // A disabled "Salir de la campaña" renders first, while the role is still unresolved
    // (SPEC GAP 2 of the fix round) — wait for the settled, enabled one before clicking, or
    // the click lands on a button whose onClick a real <button disabled> never fires.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Salir de la campaña" })).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Salir de la campaña" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, salir" }));
    expect(await screen.findByRole("heading", { name: "Tus crónicas" })).toBeInTheDocument();
  });

  // Fix round 1, CRITICAL 1: renderPageWithHome's "/" is a literal <h1> marker with no
  // useCampaigns query at all, so it could never have caught a missing campaignsKey
  // invalidation — removing that branch in useRemoveMember left every test in this file
  // green. renderPageWithRealHome mounts the actual CampaignList (a real useCampaigns query)
  // with a production-like staleTime, so a campaign that's still within that window only
  // drops off the list if something actually invalidated campaignsKey — never because a
  // remount happened to refetch on its own.
  it("salir actualiza la lista de campañas sin recargar — importa la invalidación de campaignsKey dentro del staleTime", async () => {
    asPlayer();
    const fetchCampaigns = vi
      .spyOn(campaignsApi, "fetchCampaigns")
      .mockResolvedValueOnce([
        {
          id: "c1",
          name: "Curse of Strahd",
          description: null,
          ownerId: "dm1",
          createdAt: "2026-01-01",
        },
      ])
      .mockResolvedValueOnce([]);
    vi.spyOn(membersApi, "removeMember").mockResolvedValue({ removed: true });

    renderPageWithRealHome();

    fireEvent.click(await screen.findByRole("link", { name: "Curse of Strahd" }));
    await screen.findByRole("heading", { name: "Curse of Strahd" });
    // Settings live in their own section since the 2026-09-02 redesign, so the click that
    // used to be implicit (they were on the first tab) is explicit now — and it can only
    // happen once we are actually inside the campaign.
    fireEvent.click(await screen.findByRole("tab", { name: "Ajustes" }));

    // Same race as the test above: wait for the disabled-while-checking button to settle
    // into its enabled form before clicking it.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Salir de la campaña" })).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Salir de la campaña" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, salir" }));

    // Fix round 2, IMPORTANT A: a negative query (queryByRole().not.toBeInTheDocument()) is
    // true the instant this callback first runs — we're still on /campaigns/c1 at that exact
    // tick, where a link named "Curse of Strahd" never existed anyway, invalidation or not.
    // waitFor never actually retries, so the one assertion that matters ended up unguarded.
    // Wait on the real signal instead: the second fetchCampaigns call, and then the positive
    // empty-state text CampaignList renders once that response (an empty array) lands.
    await waitFor(() => expect(fetchCampaigns).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Todavía no hay ninguna campaña")).toBeInTheDocument();
  });

  // Fix round 1, CRITICAL 1 (same hole, useUpdateCampaign): renaming the campaign must also
  // reach the list on "/" without a reload, inside the same staleTime window.
  it("guardar el nombre actualiza la lista de campañas sin recargar — invalidación de campaignsKey en useUpdateCampaign", async () => {
    asDM();
    const fetchCampaigns = vi
      .spyOn(campaignsApi, "fetchCampaigns")
      .mockResolvedValueOnce([
        {
          id: "c1",
          name: "Curse of Strahd",
          description: null,
          ownerId: "dm1",
          createdAt: "2026-01-01",
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "c1",
          name: "Curse of Strahd (revisada)",
          description: null,
          ownerId: "dm1",
          createdAt: "2026-01-01",
        },
      ]);
    vi.spyOn(campaignsApi, "updateCampaign").mockResolvedValue({
      id: "c1",
      name: "Curse of Strahd (revisada)",
      description: "spooky",
      ownerId: "dm1",
      createdAt: "2026-01-01",
    });

    renderPageWithRealHome();

    fireEvent.click(await screen.findByRole("link", { name: "Curse of Strahd" }));
    fireEvent.click(await screen.findByRole("tab", { name: "Ajustes" }));
    const nameInput = await screen.findByDisplayValue("Curse of Strahd");
    fireEvent.change(nameInput, { target: { value: "Curse of Strahd (revisada)" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    fireEvent.click(await screen.findByRole("link", { name: /Tus crónicas/ }));

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Curse of Strahd (revisada)" })).toBeInTheDocument(),
    );
    expect(fetchCampaigns).toHaveBeenCalledTimes(2);
  });

  // Fix round 1, IMPORTANT 4: no test exercised the unknown-role window for either new
  // component. This is the regression the reviewer named: swap roleUnresolved for !isDM in
  // CampaignSettings.tsx and a real DM would be told "Solo el DM puede editar/borrar la
  // campaña." while their own members request is still in flight — that's a false "no
  // permission" claim, exactly what arreglo 4 (1.15-fix) exists to prevent everywhere else.
  it("mientras el rol está en vuelo, ambos paneles dicen 'Comprobando permisos…' y nunca afirman que no eres DM", async () => {
    useAuthStore.setState({ user: { id: "dm1", email: "dm@b.com", displayName: "DM" } });
    vi.spyOn(membersApi, "fetchMembers").mockReturnValue(new Promise(() => {}));

    await renderAjustes();

    expect((await screen.findAllByText("Comprobando permisos…")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Solo el DM puede editar la campaña.")).not.toBeInTheDocument();
    expect(screen.queryByText("Solo el DM puede borrar la campaña.")).not.toBeInTheDocument();
    expect(
      screen.queryByText("El DM no puede salir de su propia campaña; bórrala."),
    ).not.toBeInTheDocument();

    const nameInput = await screen.findByDisplayValue("Curse of Strahd");
    expect(nameInput).toBeDisabled();

    // The bottom "Salir de la campaña" slot: disabled and visible, never hidden, while the
    // role — DM or player — isn't known yet (SPEC GAP 2 of the fix round).
    const leaveButton = screen.getByRole("button", { name: "Salir de la campaña" });
    expect(leaveButton).toBeDisabled();
  });

  it("con un fallo al comprobar el rol, ambos paneles siguen diciendo 'Comprobando permisos…', nunca 'no eres DM', y ofrecen Reintentar", async () => {
    useAuthStore.setState({ user: { id: "dm1", email: "dm@b.com", displayName: "DM" } });
    vi.spyOn(membersApi, "fetchMembers").mockRejectedValue(new Error("network error"));

    await renderAjustes();

    // "Comprobando permisos…" is also true DURING the loading window before the rejection
    // even lands, so it's not a safe signal that the query has actually settled into its
    // error state — "Reintentar" only renders once isError is true, so wait on that instead.
    const retryButtons = await screen.findAllByRole("button", { name: "Reintentar" });
    expect(retryButtons.length).toBeGreaterThan(0);
    expect(screen.getAllByText("Comprobando permisos…").length).toBeGreaterThan(0);
    expect(screen.queryByText("Solo el DM puede editar la campaña.")).not.toBeInTheDocument();
    expect(screen.queryByText("Solo el DM puede borrar la campaña.")).not.toBeInTheDocument();
    expect(
      screen.queryByText("El DM no puede salir de su propia campaña; bórrala."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salir de la campaña" })).toBeDisabled();
  });
});

// **La pantalla de campaña adopta la maqueta (2026-09-02).** Tres cosas, y las tres se
// comprueban aquí porque las tres son afirmaciones sobre la pantalla, no sobre el estilo:
// la barra lateral agrupa lo que existe (y solo lo que existe), cada sección del mundo se
// presenta con la frase que ya vivía en `plantillas.ts`, y la fila lleva el icono de su tipo
// sin que eso cambie una coma de lo que la fila dice.
describe("CampaignDetailPage — la maqueta adoptada", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ user: { id: "dm1", email: "dm@b.com", displayName: "DM" } });
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "dm1", displayName: "DM", role: "DM" },
    ]);
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue({
      id: "c1",
      name: "Curse of Strahd",
      description: null,
      ownerId: "dm1",
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
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
    vi.spyOn(sessionsApi, "fetchSessions").mockResolvedValue([]);
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([]);
  });

  it("la barra lateral agrupa El mundo y La mesa, y Ajustes NO lleva rótulo de grupo", async () => {
    renderPage();
    await screen.findByRole("tab", { name: "Resumen" });

    // **«El mundo» ya no es un rótulo de grupo, es una entrada.** Desde B4 los siete tipos de
    // ficha son un filtro dentro de ella y no siete destinos, así que el grupo se quedó con una
    // sola entrada del mismo nombre — la misma redundancia que este proyecto ya rechazó para
    // «Ajustes», y por el mismo motivo.
    expect(screen.getByRole("tab", { name: /El mundo/ })).toBeInTheDocument();
    expect(screen.queryByText("La campaña")).not.toBeInTheDocument();
    expect(screen.getByText("La mesa")).toBeInTheDocument();
    // La maqueta metía «Ajustes» bajo un rótulo «LA CAMPAÑA» que allí acompañaba a media
    // docena de entradas. Aquí sería un grupo de uno: una línea de versalita para repetir en
    // mayúsculas lo que la palabra «Ajustes» ya dice. Se queda sin rótulo, en su propio bloque
    // al final de la columna.
    expect(screen.queryByText("La campaña")).not.toBeInTheDocument();
    // Y ninguno de los grupos vacíos de la maqueta se anuncia: lo que no está hecho no se
    // enseña apagado ni con un candado.
    expect(screen.queryByText("Herramientas")).not.toBeInTheDocument();
    expect(screen.queryByText("En compañía")).not.toBeInTheDocument();
  });

  it("cada sección del mundo se presenta con SU frase, la que ya vivía en plantillas.ts", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("tab", { name: "El mundo" }));

    fireEvent.click(await screen.findByRole("button", { name: /^PNJ/ }));
    expect(await screen.findByRole("heading", { name: "PNJ" })).toBeInTheDocument();
    expect(screen.getByText("El mundo · PNJ")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Alguien a quien la mesa puede mirar a la cara. Lo que dice, lo que quiere y lo que esconde.",
      ),
    ).toBeInTheDocument();

    // Cambiar de sección cambia la explicación: antes las siete daban exactamente la misma
    // pantalla y la única señal de en cuál estabas era el botón resaltado de la barra.
    fireEvent.click(screen.getByRole("button", { name: /^Lugares/ }));
    expect(await screen.findByRole("heading", { name: "Lugares" })).toBeInTheDocument();
    expect(
      screen.getByText("Un sitio al que se llega. Qué se ve, qué se oye y qué puede salir mal."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Alguien a quien la mesa puede mirar a la cara. Lo que dice, lo que quiere y lo que esconde.",
      ),
    ).not.toBeInTheDocument();
  });

  it("la acción que crea vive en la cabecera y dice QUÉ crea, no «Nuevo» a secas", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("tab", { name: "El mundo" }));
    fireEvent.click(await screen.findByRole("button", { name: /^Misiones/ }));

    const boton = await screen.findByRole("button", { name: "Nueva misión" });
    // En la cabecera, no dentro de la barra de filtros: crear no es filtrar.
    const cabecera = screen.getByRole("heading", { name: "Misiones" }).closest("header");
    expect(cabecera).not.toBeNull();
    expect(cabecera).toContainElement(boton);
  });

  it("la fila lleva el icono dibujado de su tipo, y aun así no dice nada más que su nombre y su marca", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("tab", { name: "El mundo" }));
    fireEvent.click(await screen.findByRole("button", { name: /^PNJ/ }));

    const fila = await screen.findByRole("link", { name: /Strahd von Zarovich/ });
    // Dibujado, no un glifo de fuente ni un emoji: un <svg> de verdad dentro de la fila.
    expect(fila.querySelector("svg")).not.toBeNull();
    // Y aria-hidden, porque el nombre accesible de la fila tiene que seguir siendo el nombre
    // de la ficha: un icono anunciado metería la palabra del tipo dentro de él.
    expect(fila.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(fila).toHaveTextContent(/^Strahd von Zarovich◐Jugadores$/);
  });
});

// **Ninguna dirección deja la pantalla sin panel**, y esta prueba existe porque tres la dejaban.
//
// Al mover Personajes, Bestiario y Catálogo a cajones (B4), `?seccion=characters` dejó de tener
// pestaña: `Tabs` no encontraba el item, no pintaba ningún `tabpanel` y el carril no marcaba nada
// — cabecera y carril sobre un hueco. Y no era una dirección hipotética de un marcador: **la
// migaja de toda hoja de personaje apuntaba ahí**, y también el destino tras borrar un personaje.
// Dos clics desde una pantalla central. Lo encontró la revisión de cierre de 2.5.6, y el mensaje
// del commit de B4 afirmaba lo contrario.
describe("una sección que ya no existe no deja la pantalla en blanco", () => {
  function conSeccion(seccion: string) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[`/campaigns/c1?seccion=${seccion}`]}>
          <Routes>
            <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it.each([
    // Las tres que B4 convirtió en cajones, y que la aplicación seguía emitiendo.
    "characters",
    "bestiary",
    "items",
    // Y una inventada, que es lo que llega de un marcador viejo o de un enlace mal copiado.
    "inventada",
  ])("?seccion=%s pinta el resumen, no un hueco", async (seccion) => {
    conSeccion(seccion);

    // Exactamente **un** panel, y una pestaña marcada: es lo que no pasaba.
    expect(await screen.findAllByRole("tabpanel")).toHaveLength(1);
    const marcadas = screen
      .getAllByRole("tab")
      .filter((t) => t.getAttribute("aria-selected") === "true");
    expect(marcadas).toHaveLength(1);
    expect(marcadas[0]).toHaveTextContent("Resumen");
  });

  it("y una que SÍ existe sigue abriendo la suya: el control que hace que la de arriba distinga", async () => {
    // Sin este caso, la prueba de arriba pasaría igual con `seccionActiva` fijada a «overview»
    // para todo — que rompería las nueve secciones y no se notaría.
    conSeccion("NPC");

    const marcadas = screen
      .getAllByRole("tab")
      .filter((t) => t.getAttribute("aria-selected") === "true");
    expect(marcadas).toHaveLength(1);
    expect(marcadas[0]).toHaveTextContent("El mundo");
  });
});
