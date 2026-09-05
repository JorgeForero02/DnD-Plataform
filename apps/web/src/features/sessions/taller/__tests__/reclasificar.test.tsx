import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { EscribirFicha } from "../EscribirFicha";
import type { Entity } from "../../../entities/api";
import * as entitiesApi from "../../../entities/api";
import * as linksApi from "../../../links/api";

// Ficha I16 — **reclasificar dice lo que cuesta, y deja rastro.**
//
// Los chips de tipo de este panel son el **único** sitio de la aplicación donde se cambia el tipo
// de una ficha ya escrita: `EntityEditor` recibe `type` como prop y no lo toca. Medido el
// 2026-09-06, y la ficha original decía «en el editor» — no era ahí.
//
// Hasta hoy bastaba **un clic**: un PNJ con statblock, enlaces y comentarios se volvía «Documento»
// y no quedaba constancia. El rastro lo escribe el servidor (`ENTITY_RETYPED`); lo que se prueba
// aquí es la otra mitad, la que evita el clic accidental.

const ficha: Entity = {
  id: "e1",
  campaignId: "c1",
  type: "NPC",
  name: "Maestre Kellan",
  tags: ["puerto"],
  visibility: "PLAYERS",
  createdById: "u1",
  createdAt: "x",
};

function montar(entidad: Entity | null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <EscribirFicha campaignId="c1" ficha={entidad} onGuardada={() => {}} onBorrada={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("reclasificar una ficha (I16)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(entitiesApi, "fetchEntity").mockResolvedValue({ ...ficha, grants: [] } as never);
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
    vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([]);
  });

  it("**un clic en otro tipo ya NO reclasifica**: primero dice qué pasa", async () => {
    montar(ficha);
    fireEvent.click(await screen.findByRole("button", { name: "Documento" }));

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    // Y el chip de PNJ sigue siendo el activo: no se ha cambiado nada todavía.
    expect(screen.getByRole("button", { name: "PNJ" })).toHaveAttribute("aria-pressed", "true");
  });

  it("**nombra la consecuencia**: de dónde sale, dónde aparece, y qué NO se pierde", async () => {
    montar(ficha);
    fireEvent.click(await screen.findByRole("button", { name: "Documento" }));
    const aviso = await screen.findByRole("alertdialog");

    // Los dos tipos con su rótulo real: ningún valor de enumeración llega a la pantalla.
    expect(aviso).toHaveTextContent(/pasa de PNJ a Documento/);
    expect(aviso).toHaveTextContent(/Sale de .* y aparece en /);
    expect(aviso).toHaveTextContent(/no la va a encontrar/);
    // Lo que se conserva, dicho: si no se dice, se supone lo peor y el gesto deja de usarse.
    expect(aviso).toHaveTextContent(/no se tocan/);
    // El caso que de verdad rompe, y solo cuando aplica.
    expect(aviso).toHaveTextContent(/statblock/);
    // Que queda rastro, que es lo que lo hace reversible en la práctica.
    expect(aviso).toHaveTextContent(/registro de la campaña/);

    // **Y en ningún caso «¿estás seguro?»**: se pulsa sin leer y encima tranquiliza.
    expect(aviso.textContent ?? "").not.toMatch(/seguro/i);
  });

  it("«Dejarla como está» no cambia el tipo", async () => {
    montar(ficha);
    fireEvent.click(await screen.findByRole("button", { name: "Documento" }));
    fireEvent.click(await screen.findByRole("button", { name: "Dejarla como está" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PNJ" })).toHaveAttribute("aria-pressed", "true");
  });

  it("aceptar sí lo cambia", async () => {
    montar(ficha);
    fireEvent.click(await screen.findByRole("button", { name: "Documento" }));
    fireEvent.click(await screen.findByRole("button", { name: /Sí, pasarla a Documento/ }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Documento" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("**escribiendo una ficha NUEVA no pregunta nada**: ahí el chip elige, no reclasifica", async () => {
    // Una confirmación que salta cuando no hace falta se aprende a ignorar en dos días, y entonces
    // tampoco protege el caso en que sí importa.
    montar(null);
    fireEvent.click(await screen.findByRole("button", { name: "Documento" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Documento" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
