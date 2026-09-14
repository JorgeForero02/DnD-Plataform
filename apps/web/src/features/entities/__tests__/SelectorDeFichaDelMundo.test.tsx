import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Entity } from "../api";
import { SelectorDeFichaDelMundo } from "../SelectorDeFichaDelMundo";
import * as entitiesHooks from "../hooks";

// PNJ del mundo y la mesa, Tarea 4, paso 1 — el selector se prueba solo (sin React Query de
// verdad): `useEntities` se simula con una implementación que filtra por `q`, igual que hace el
// servidor de verdad (`entities/hooks.ts`: «q entra en la clave de consulta»), para comprobar
// que el componente de verdad pasa el texto escrito al hook y no reimplementa el filtro.

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

const vela: Entity = {
  id: "vela-id",
  campaignId: "c1",
  type: "NPC",
  name: "Vela",
  tags: [],
  visibility: "PLAYERS",
  createdById: "dm1",
  createdAt: "2026-01-01",
};

function mockearFichas(fichas: Entity[]) {
  vi.spyOn(entitiesHooks, "useEntities").mockImplementation((_campaignId, _type, q) => {
    const texto = q?.trim().toLowerCase();
    const filtradas = texto ? fichas.filter((f) => f.name.toLowerCase().includes(texto)) : fichas;
    return { data: filtradas } as ReturnType<typeof entitiesHooks.useEntities>;
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("SelectorDeFichaDelMundo", () => {
  it("pinta un radio por ficha, con su nombre y su Badge, más «Ninguna»", () => {
    mockearFichas([garrik, vela]);
    render(<SelectorDeFichaDelMundo campaignId="c1" value={null} onChange={() => {}} />);

    expect(screen.getByRole("radio", { name: /Ninguna/i })).toBeChecked();
    expect(screen.getByText("Garrik")).toBeInTheDocument();
    expect(screen.getByText("Vela")).toBeInTheDocument();
  });

  it("escribir en el buscador deja solo lo que coincide", () => {
    mockearFichas([garrik, vela]);
    render(<SelectorDeFichaDelMundo campaignId="c1" value={null} onChange={() => {}} />);

    fireEvent.change(screen.getByLabelText("Buscar una ficha del mundo"), {
      target: { value: "ve" },
    });

    expect(screen.getByText("Vela")).toBeInTheDocument();
    expect(screen.queryByText("Garrik")).not.toBeInTheDocument();
  });

  it("elegir una ficha llama a onChange con su id", () => {
    mockearFichas([garrik, vela]);
    const onChange = vi.fn();
    render(<SelectorDeFichaDelMundo campaignId="c1" value={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: /Vela/i }));

    expect(onChange).toHaveBeenCalledWith("vela-id");
  });

  it("«Ninguna» llama a onChange(null)", () => {
    mockearFichas([garrik, vela]);
    const onChange = vi.fn();
    render(<SelectorDeFichaDelMundo campaignId="c1" value="garrik-id" onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: /Ninguna/i }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("con `value` puesto, ese radio está marcado", () => {
    mockearFichas([garrik, vela]);
    render(<SelectorDeFichaDelMundo campaignId="c1" value="garrik-id" onChange={() => {}} />);

    expect(screen.getByRole("radio", { name: /Garrik/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Ninguna/i })).not.toBeChecked();
  });

  it("sin fichas, lo dice", () => {
    mockearFichas([]);
    render(<SelectorDeFichaDelMundo campaignId="c1" value={null} onChange={() => {}} />);

    expect(screen.getByText("No hay fichas de PNJ en el mundo todavía.")).toBeInTheDocument();
  });

  // m7 (ola de cierre, 2026-09-14): antes `texto` entraba sin retardo en la clave de
  // `useEntities` — una petición al servidor por tecla. `useDeferredValue` no cambia el
  // contrato del componente (el input sigue siendo controlado y responde a cada tecla), así que
  // lo que esta prueba demuestra es que tres teclas seguidas siguen llegando a la búsqueda de
  // verdad — no que se pierda ninguna por el camino.
  it("varias teclas seguidas no pierden ninguna: el filtro final es por el texto completo", () => {
    mockearFichas([garrik, vela]);
    render(<SelectorDeFichaDelMundo campaignId="c1" value={null} onChange={() => {}} />);
    const buscador = screen.getByLabelText("Buscar una ficha del mundo");

    fireEvent.change(buscador, { target: { value: "g" } });
    fireEvent.change(buscador, { target: { value: "ga" } });
    fireEvent.change(buscador, { target: { value: "gar" } });

    expect(buscador).toHaveValue("gar");
    expect(screen.getByText("Garrik")).toBeInTheDocument();
    expect(screen.queryByText("Vela")).not.toBeInTheDocument();
  });

  it("la etiqueta del fieldset se puede sobrescribir", () => {
    mockearFichas([garrik]);
    render(
      <SelectorDeFichaDelMundo
        campaignId="c1"
        value={null}
        onChange={() => {}}
        etiqueta="De qué ficha del mundo es"
      />,
    );

    expect(screen.getByText("De qué ficha del mundo es")).toBeInTheDocument();
  });
});
