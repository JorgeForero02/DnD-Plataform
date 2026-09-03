import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { EntityDetailPage } from "../EntityDetailPage";
import * as campaignsApi from "../../features/campaigns/api";
import * as membersApi from "../../features/campaigns/members";
import * as entitiesApi from "../../features/entities/api";
import * as linksApi from "../../features/links/api";
import * as commentsApi from "../../features/comments/api";
import type { EntityDetail } from "../../features/entities/api";
import { useAuthStore } from "../../store/auth.store";

// Reseño 2026-09-03 — la página de lectura de una ficha del mundo.
//
// Lo que estas pruebas vigilan es lo que la tarea arregló y lo que la maqueta pedía. Dos de
// ellas cazan defectos que estaban en producción y que ninguna prueba miraba: la hoja de vitela
// se pintaba DOS veces (la página envolvía en `Panel tone="vellum"` un `Markdown` que ya trae
// el suyo), y el panel de enlaces no sabía el nombre de la ficha abierta, así que no podía
// componer la frase. Lo que NO se prueba aquí es el aspecto: la capitular, el filete y la
// medida son maquetación, y para eso está `apps/web/e2e/ficha-lectura.spec.ts` — jsdom no
// maqueta.

const ficha: EntityDetail = {
  id: "e1",
  campaignId: "c1",
  type: "NPC",
  name: "Corvin Vhael",
  body: { format: "markdown", text: "Al llegar al puerto de Sarnath, lo primero es el olor." },
  tags: ["puerto", "puerto"],
  visibility: "PLAYERS",
  createdById: "dm1",
  createdAt: "x",
  grants: [],
};

function montar() {
  vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue({
    id: "c1",
    name: "Las Mareas de Sarnath",
    description: null,
    ownerId: "dm1",
    createdAt: "x",
  });
  vi.spyOn(entitiesApi, "fetchEntity").mockResolvedValue(ficha);
  vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
  vi.spyOn(commentsApi, "fetchComments").mockResolvedValue([]);

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/campaigns/c1/entidades/e1"]}>
        <Routes>
          <Route path="/campaigns/:id" element={<h1>Página de la campaña</h1>} />
          <Route path="/campaigns/:id/entidades/:entityId" element={<EntityDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("EntityDetailPage — la pantalla donde se lee el mundo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ user: { id: "dm1", email: "dm@b.com", displayName: "DM" } });
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "dm1", displayName: "DM", role: "DM" },
    ]);
  });

  it("pinta UNA hoja de vitela, no dos", async () => {
    // El defecto: `Markdown.tsx` ya envuelve su texto en `Panel tone="vellum"`, y esta página
    // lo envolvía otra vez. Resultado en pantalla: dos bordes, dos siluetas rasgadas y dos
    // medidas de 66 caracteres anidadas, la de dentro más estrecha que la que el diseño quería.
    // Ninguna prueba de texto lo notaba porque el texto salía igual de bien.
    vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([]);
    const { container } = montar();

    expect(await screen.findByRole("heading", { name: "Corvin Vhael" })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-tone="vellum"]')).toHaveLength(1);
  });

  it("le pasa al panel de enlaces el nombre de la ficha, que es el sujeto de cada frase", async () => {
    vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([
      {
        id: "l1",
        label: "vive en",
        direction: "OUTGOING",
        canRemove: true,
        to: { id: "e2", name: "La Torre Gris", type: "LOCATION" },
      },
    ]);
    montar();

    const enlace = await screen.findByRole("link", { name: "La Torre Gris" });
    const tarjeta = enlace.closest("article");
    // Sin el `entityName`, el panel se queda sin sujeto y la frase vuelve a ser una lista de
    // nombres. Quita la propiedad en EntityDetailPage.tsx y esta comprobación se pone roja.
    expect(tarjeta).toHaveTextContent(/Corvin Vhael\s+vive en/);
    expect(tarjeta).toHaveTextContent("Lugar");
  });

  it("no repite una etiqueta duplicada ni pinta el valor del enumerado", async () => {
    vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([]);
    montar();

    expect(await screen.findAllByText("puerto")).toHaveLength(1);
    // La forma legible del tipo, nunca la clave: «PNJ», jamás «NPC».
    expect(screen.getAllByText("PNJ").length).toBeGreaterThan(0);
    expect(screen.queryByText(/\bNPC\b/)).not.toBeInTheDocument();
  });
});
