import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { useState } from "react";
import type { CampaignLinkRow, EntityType } from "@dnd/shared";
import { ElMundo } from "../ElMundo";
import type { Entity } from "../../../../entities/api";
import * as entitiesApi from "../../../../entities/api";
import * as linksApi from "../../../../links/api";

// Qué defiende este fichero (Task 14 bis, D-CF-64): **las dos mitades juntas** — que elegir en
// el desglose pinta el detalle, que el chip «Sin hilos» filtra, que el buscador despliega solo lo
// que encaja, y que el árbol se recorre con teclado como manda el patrón WAI-ARIA de `tree`
// (flechas, Enter), que es el mismo modelo de tabindex rotatorio de `ui/Tabs`.

function ent(id: string, name: string, type: EntityType): Entity {
  return {
    id,
    campaignId: "c1",
    type,
    name,
    tags: [],
    visibility: "DM_ONLY",
    createdById: "u-dm",
    createdAt: "2026-09-12T00:00:00.000Z",
  };
}

function hilo(from: Entity, to: Entity, label: string): CampaignLinkRow {
  return {
    id: `${from.id}->${to.id}`,
    fromId: from.id,
    toId: to.id,
    label,
    from: { id: from.id, name: from.name, type: from.type },
    to: { id: to.id, name: to.name, type: to.type },
  };
}

const torre = ent("l1", "Torre Gris", "LOCATION");
const corvin = ent("n1", "Corvin", "NPC");
const gremio = ent("f1", "Gremio", "FACTION");
const errante = ent("n2", "Errante", "NPC");

function Anfitrion({ onSeleccion }: { onSeleccion: (f: Entity) => void }) {
  const [elegida, setElegida] = useState<Entity | null>(null);
  return (
    <ElMundo
      campaignId="c1"
      seleccionId={elegida?.id ?? null}
      onSeleccion={(f) => {
        setElegida(f);
        onSeleccion(f);
      }}
    />
  );
}

function montar() {
  const onSeleccion = vi.fn();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Anfitrion onSeleccion={onSeleccion} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { onSeleccion };
}

describe("ElMundo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([torre, corvin, gremio, errante]);
    vi.spyOn(linksApi, "fetchCampaignLinks").mockResolvedValue([
      hilo(corvin, torre, "vive en"),
      hilo(corvin, gremio, "es aliado de"),
    ]);
  });

  it("cuelga por jerarquía, y un hilo lateral no mueve nada", async () => {
    montar();
    const arbol = await screen.findByRole("tree", { name: "El mundo" });
    const lugares = within(arbol).getByRole("treeitem", { name: "Lugares" });
    expect(lugares).toHaveTextContent("1");
    // Las raíces de tipo vienen desplegadas; las fichas, plegadas hasta que se abren.
    const torreItem = within(arbol).getByRole("treeitem", { name: "Torre Gris" });
    expect(torreItem).toHaveAttribute("aria-expanded", "false");
    expect(within(arbol).queryByRole("treeitem", { name: "Corvin" })).toBeNull();
    fireEvent.click(within(torreItem).getByRole("button", { name: "Desplegar Torre Gris" }));
    const corvinItem = within(arbol).getByRole("treeitem", { name: "Corvin" });
    expect(corvinItem).toHaveTextContent("vive en");
    // «es aliado de» es lateral: Corvin NO cuelga del Gremio.
    const gremioItem = within(arbol).getByRole("treeitem", { name: "Gremio" });
    expect(gremioItem).not.toHaveAttribute("aria-expanded");
  });

  it("elegir en el desglose pinta el detalle y avisa al taller", async () => {
    const { onSeleccion } = montar();
    const arbol = await screen.findByRole("tree", { name: "El mundo" });
    expect(screen.getByText("Elige una ficha del desglose")).toBeInTheDocument();
    fireEvent.click(within(arbol).getByRole("treeitem", { name: "Errante" }));
    expect(onSeleccion).toHaveBeenCalledWith(expect.objectContaining({ id: "n2" }));
    expect(await screen.findByRole("heading", { name: "Errante" })).toBeInTheDocument();
    expect(within(arbol).getByRole("treeitem", { name: "Errante" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("elegir desde el anillo revela la ficha en el árbol", async () => {
    montar();
    const arbol = await screen.findByRole("tree", { name: "El mundo" });
    fireEvent.click(within(arbol).getByRole("treeitem", { name: "Torre Gris" }));
    const anillo = await screen.findByRole("group", { name: "Vecinos de Torre Gris" });
    fireEvent.click(within(anillo).getByRole("button", { name: "es el hogar de Corvin" }));
    // Corvin cuelga de la Torre: el árbol la despliega para enseñarlo, y queda elegido.
    const corvinItem = await within(arbol).findByRole("treeitem", { name: "Corvin" });
    expect(corvinItem).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByRole("heading", { name: "Corvin" })).toBeInTheDocument();
  });

  it("el chip «Sin hilos» deja solo las fichas sin ningún hilo", async () => {
    montar();
    const arbol = await screen.findByRole("tree", { name: "El mundo" });
    fireEvent.click(screen.getByRole("button", { name: "Sin hilos" }));
    expect(within(arbol).getByRole("treeitem", { name: "Errante" })).toBeVisible();
    expect(within(arbol).queryByRole("treeitem", { name: "Torre Gris" })).toBeNull();
    expect(within(arbol).queryByRole("treeitem", { name: "Gremio" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Sin hilos" }));
    expect(within(arbol).getByRole("treeitem", { name: "Torre Gris" })).toBeVisible();
  });

  it("el buscador filtra y despliega solo lo que encaja, sin distinguir tildes", async () => {
    montar();
    const arbol = await screen.findByRole("tree", { name: "El mundo" });
    fireEvent.change(screen.getByLabelText("Buscar en el mundo"), { target: { value: "corvin" } });
    // Corvin cuelga de la Torre: la Torre se queda como camino, desplegada; el resto se va.
    expect(within(arbol).getByRole("treeitem", { name: "Corvin" })).toBeVisible();
    expect(within(arbol).getByRole("treeitem", { name: "Torre Gris" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(within(arbol).queryByRole("treeitem", { name: "Gremio" })).toBeNull();
    expect(within(arbol).queryByRole("treeitem", { name: "Errante" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Buscar en el mundo"), { target: { value: "xyz" } });
    expect(screen.getByText(/Nada en el mundo encaja con «xyz»/)).toBeInTheDocument();
  });

  it("teclado: flechas mueven, → despliega, ← pliega, Enter elige", async () => {
    const { onSeleccion } = montar();
    const arbol = await screen.findByRole("tree", { name: "El mundo" });
    const lugares = within(arbol).getByRole("treeitem", { name: "Lugares" });
    // Un solo elemento alcanzable con Tab (tabindex rotatorio), y es el primero.
    expect(lugares).toHaveAttribute("tabindex", "0");
    expect(within(arbol).getByRole("treeitem", { name: "Torre Gris" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    lugares.focus();
    fireEvent.keyDown(lugares, { key: "ArrowDown" });
    const torreItem = within(arbol).getByRole("treeitem", { name: "Torre Gris" });
    expect(torreItem).toHaveFocus();
    expect(torreItem).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(torreItem, { key: "ArrowRight" });
    expect(torreItem).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(torreItem, { key: "ArrowRight" });
    const corvinItem = within(arbol).getByRole("treeitem", { name: "Corvin" });
    expect(corvinItem).toHaveFocus();
    fireEvent.keyDown(corvinItem, { key: "ArrowLeft" });
    expect(torreItem).toHaveFocus();
    fireEvent.keyDown(torreItem, { key: "ArrowLeft" });
    expect(torreItem).toHaveAttribute("aria-expanded", "false");
    fireEvent.keyDown(torreItem, { key: "Enter" });
    expect(onSeleccion).toHaveBeenCalledWith(expect.objectContaining({ id: "l1" }));
    fireEvent.keyDown(torreItem, { key: "ArrowUp" });
    expect(lugares).toHaveFocus();
  });

  it("si el mundo no se puede leer, lo dice y no pinta un desglose vacío como si fuera cierto", async () => {
    vi.spyOn(entitiesApi, "fetchAllEntities").mockRejectedValue(new Error("500"));
    montar();
    expect(await screen.findByText(/No se pudo leer el mundo/)).toBeInTheDocument();
    expect(screen.queryByRole("tree")).toBeNull();
  });
});
