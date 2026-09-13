import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { CampaignLinkRow, EntityType } from "@dnd/shared";
import { DetalleDeFicha } from "../DetalleDeFicha";
import type { Entity } from "../../../../entities/api";
import * as linksApi from "../../../../links/api";

// Qué defiende este fichero (Task 14 bis, D-CF-64): **la mitad derecha del mundo** — que el
// anillo pinta un botón por vecino con su frase, que la lista de hilos no enseña ningún valor de
// enumeración, que «Añadir hilo» manda `{ toId, label }` con lo elegido en los dos desplegables,
// que un rechazo del servidor se lee en línea, y que sin ficha elegida el hueco dice qué hacer.

function ent(id: string, name: string, type: EntityType, extra: Partial<Entity> = {}): Entity {
  return {
    id,
    campaignId: "c1",
    type,
    name,
    tags: [],
    visibility: "PLAYERS",
    createdById: "u-dm",
    createdAt: "2026-09-12T00:00:00.000Z",
    ...extra,
  };
}

function hilo(from: Entity, to: Entity, label: string | null): CampaignLinkRow {
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
const corvin = ent("n1", "Corvin", "NPC", {
  body: { format: "markdown", text: "Un **guardián** viejo que no duerme." },
});
const gremio = ent("f1", "Gremio", "FACTION");
const errante = ent("n2", "Errante", "NPC");
const TODAS = [torre, corvin, gremio, errante];

function montar(ficha: Entity | null, hilos: CampaignLinkRow[], onSeleccion = vi.fn()) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DetalleDeFicha
          campaignId="c1"
          ficha={ficha}
          entidades={TODAS}
          hilos={hilos}
          onSeleccion={onSeleccion}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { onSeleccion };
}

describe("DetalleDeFicha", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sin ficha elegida dice qué hacer y cuenta por tipo, sin enums", () => {
    montar(null, []);
    expect(screen.getByText("Elige una ficha del desglose")).toBeInTheDocument();
    const contadores = screen.getByRole("list", { name: "Fichas por tipo" });
    expect(contadores).toHaveTextContent("Lugares");
    expect(contadores).toHaveTextContent("PNJ");
    expect(contadores).toHaveTextContent("Facciones");
    expect(contadores).not.toHaveTextContent("LOCATION");
    expect(contadores).not.toHaveTextContent("NPC");
  });

  it("la cabecera lleva nombre, tipo legible, insignia y el enlace a la ficha", () => {
    montar(corvin, []);
    expect(screen.getByRole("heading", { name: "Corvin" })).toBeInTheDocument();
    expect(screen.getByText("PNJ")).toBeInTheDocument();
    expect(screen.getByText("Jugadores")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir ficha" })).toHaveAttribute(
      "href",
      "/campaigns/c1/entidades/n1",
    );
    // El cuerpo se pinta en vitela y se recorta con un «Leer más» que lleva a la ficha.
    expect(screen.getByText("guardián")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Leer más" })).toHaveAttribute(
      "href",
      "/campaigns/c1/entidades/n1",
    );
  });

  it("con 0 hilos el anillo es un hueco que lo dice, y sin cuerpo la vitela también", () => {
    montar(errante, []);
    expect(screen.getByText("Esta ficha no tiene hilos todavía")).toBeInTheDocument();
    expect(screen.getByText("Esta ficha no tiene cuerpo todavía.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Leer más" })).toBeNull();
  });

  it("el anillo pinta N botones con el nombre y la frase de cada vecino, y pulsar uno lo elige", () => {
    const { onSeleccion } = montar(torre, [
      hilo(corvin, torre, "vive en"),
      hilo(torre, gremio, "custodia"),
    ]);
    const anillo = screen.getByRole("group", { name: "Vecinos de Torre Gris" });
    const botones = within(anillo).getAllByRole("button");
    expect(botones).toHaveLength(2);
    // Leídos desde la ficha abierta: el hilo que ENTRA se invierte con la lectura declarada.
    expect(within(anillo).getByRole("button", { name: "es el hogar de Corvin" })).toBeVisible();
    expect(within(anillo).getByRole("button", { name: "custodia Gremio" })).toBeVisible();
    fireEvent.click(within(anillo).getByRole("button", { name: "es el hogar de Corvin" }));
    expect(onSeleccion).toHaveBeenCalledWith("n1");
  });

  it("los hilos se listan con el tipo legible y nunca con el valor de enumeración", () => {
    montar(torre, [hilo(corvin, torre, "vive en")]);
    const lista = screen.getByRole("list", { name: "Hilos de Torre Gris" });
    expect(lista).toHaveTextContent("Corvin");
    expect(lista).toHaveTextContent("es el hogar de");
    expect(lista).toHaveTextContent("PNJ");
    expect(lista).not.toHaveTextContent("NPC");
    expect(lista).not.toHaveTextContent("LOCATION");
  });

  it("«Añadir hilo» abre los dos desplegables y manda { toId, label } con lo elegido", async () => {
    const crear = vi
      .spyOn(linksApi, "createLink")
      .mockResolvedValue({ id: "x", fromId: "n1", toId: "l1", label: "vive en" });
    montar(corvin, []);

    fireEvent.click(screen.getByRole("button", { name: "Añadir hilo" }));

    // Hacia qué ficha: desplegable con buscador. La propia ficha no se ofrece. El nombre
    // accesible de cada opción lleva detrás el tipo legible («Torre Gris Lugar»), por eso el
    // ancla al principio.
    fireEvent.click(screen.getByRole("button", { name: /Hacia qué ficha/ }));
    const fichas = screen.getByRole("list", { name: "Hacia qué ficha" });
    expect(within(fichas).queryByRole("button", { name: /^Corvin/ })).toBeNull();
    fireEvent.change(screen.getByLabelText("Buscar ficha por nombre"), {
      target: { value: "torre" },
    });
    expect(within(fichas).queryByRole("button", { name: /^Gremio/ })).toBeNull();
    fireEvent.click(within(fichas).getByRole("button", { name: /^Torre Gris/ }));

    // Rótulo: primero lo sugerido para el par PNJ → Lugar.
    fireEvent.click(screen.getByRole("button", { name: /^Rótulo/ }));
    const rotulos = screen.getByRole("list", { name: "Rótulo" });
    expect(within(rotulos).getByRole("button", { name: "vive en" })).toBeVisible();
    expect(within(rotulos).queryByRole("button", { name: "pertenece a" })).toBeNull();
    fireEvent.click(within(rotulos).getByRole("button", { name: "vive en" }));

    fireEvent.click(screen.getByRole("button", { name: "Añadir hilo" }));
    await waitFor(() => expect(crear).toHaveBeenCalledWith("n1", { toId: "l1", label: "vive en" }));
  });

  it("el rótulo también puede ser una frase libre", async () => {
    const crear = vi
      .spyOn(linksApi, "createLink")
      .mockResolvedValue({ id: "x", fromId: "n1", toId: "n2", label: "le teme a" });
    montar(corvin, []);
    fireEvent.click(screen.getByRole("button", { name: "Añadir hilo" }));
    fireEvent.click(screen.getByRole("button", { name: /Hacia qué ficha/ }));
    fireEvent.click(
      within(screen.getByRole("list", { name: "Hacia qué ficha" })).getByRole("button", {
        name: /^Errante/,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /^Rótulo/ }));
    fireEvent.change(screen.getByLabelText("Buscar o escribir un rótulo"), {
      target: { value: "le teme a" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Usar «le teme a»" }));
    fireEvent.click(screen.getByRole("button", { name: "Añadir hilo" }));
    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith("n1", { toId: "n2", label: "le teme a" }),
    );
  });

  it("un rechazo del servidor se lee en línea y no borra lo elegido", async () => {
    vi.spyOn(linksApi, "createLink").mockRejectedValue(new Error("Only the DM can link"));
    montar(corvin, []);
    fireEvent.click(screen.getByRole("button", { name: "Añadir hilo" }));
    fireEvent.click(screen.getByRole("button", { name: /Hacia qué ficha/ }));
    fireEvent.click(
      within(screen.getByRole("list", { name: "Hacia qué ficha" })).getByRole("button", {
        name: /^Torre Gris/,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Añadir hilo" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Only the DM can link");
    expect(screen.getByRole("button", { name: /Hacia qué ficha/ })).toHaveTextContent("Torre Gris");
  });

  it("quitar un hilo llama al DELETE con su id", async () => {
    const borrar = vi.spyOn(linksApi, "deleteLink").mockResolvedValue({ deleted: true });
    montar(torre, [hilo(corvin, torre, "vive en")]);
    fireEvent.click(screen.getByRole("button", { name: "Quitar el hilo con Corvin" }));
    await waitFor(() => expect(borrar).toHaveBeenCalledWith("n1->l1"));
  });

  it("cambiar el rótulo de un hilo que sale crea el nuevo ANTES de quitar el viejo", async () => {
    const llamadas: string[] = [];
    vi.spyOn(linksApi, "createLink").mockImplementation(async (from, input) => {
      llamadas.push(`create ${from} ${input.toId} ${input.label}`);
      return { id: "nuevo", fromId: from, toId: input.toId, label: input.label };
    });
    vi.spyOn(linksApi, "deleteLink").mockImplementation(async (id) => {
      llamadas.push(`delete ${id}`);
      return { deleted: true };
    });
    montar(corvin, [hilo(corvin, torre, "vive en")]);
    fireEvent.click(
      screen.getByRole("button", { name: "Cambiar el rótulo del hilo con Torre Gris" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /^Rótulo/ }));
    fireEvent.change(screen.getByLabelText("Buscar o escribir un rótulo"), {
      target: { value: "vigila" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Usar «vigila»" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar el rótulo" }));
    await waitFor(() => expect(llamadas).toEqual(["create n1 l1 vigila", "delete n1->l1"]));
  });

  it("un hilo que entra no ofrece cambiar el rótulo: lo escribió la otra ficha", () => {
    montar(torre, [hilo(corvin, torre, "vive en")]);
    expect(screen.queryByRole("button", { name: /Cambiar el rótulo/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Quitar el hilo con Corvin" })).toBeVisible();
  });
});
