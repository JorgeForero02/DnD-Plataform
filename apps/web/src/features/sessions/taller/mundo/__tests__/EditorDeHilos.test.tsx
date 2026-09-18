import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { EditorDeHilos } from "../EditorDeHilos";
import type { Entity } from "../../../../entities/api";

// Revisión final del pulido (2026-09-13) — **un rótulo libre de más de 80 caracteres no se
// validaba en el cliente** (el servidor sí lo corta, `CreateEntityLinkInput.label` en
// `@dnd/shared`). El campo topa a 80 con `maxLength` y explica por qué al llegar al límite —
// nunca deja escribir de más para que el servidor lo recorte en silencio.

function ficha(over: Partial<Entity> = {}): Entity {
  return {
    id: "f1",
    campaignId: "c1",
    type: "NPC",
    name: "Klarg",
    tags: [],
    visibility: "PLAYERS",
    createdById: "u1",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <EditorDeHilos
        campaignId="c1"
        ficha={ficha()}
        entidades={[ficha({ id: "f2", name: "Otra ficha" })]}
        vecinos={[]}
      />
    </QueryClientProvider>,
  );
}

describe("EditorDeHilos — rótulo libre topado a 80 caracteres", () => {
  it("teclear 81 caracteres deja el valor en 80", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Añadir hilo" }));
    fireEvent.click(screen.getByRole("button", { name: /^Rótulo/ }));

    const campo = screen.getByLabelText("Buscar o escribir un rótulo");
    fireEvent.change(campo, { target: { value: "a".repeat(81) } });

    expect((campo as HTMLInputElement).value).toHaveLength(80);
  });

  it("al llegar a 80 caracteres, explica que el servidor corta ahí", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Añadir hilo" }));
    fireEvent.click(screen.getByRole("button", { name: /^Rótulo/ }));

    const campo = screen.getByLabelText("Buscar o escribir un rótulo");
    fireEvent.change(campo, { target: { value: "a".repeat(80) } });

    expect(
      screen.getByText("Como mucho 80 caracteres; el servidor corta ahí."),
    ).toBeInTheDocument();
  });
});
