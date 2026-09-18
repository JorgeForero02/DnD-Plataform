import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CampaignLinkRow, EntityType } from "@dnd/shared";
import type { Entity } from "../../../../entities/api";
import { arbolDelMundo } from "../arbolDelMundo";
import { DesgloseDelMundo } from "../DesgloseDelMundo";

// Mundo · menor (2026-09-17): las raíces de tipo sin ninguna ficha colgando nacían desplegadas
// igual que las que sí tienen — abrirlas de más solo enseña la nota «Ninguna todavía»/«Todas
// cuelgan de otra ficha». Se prueba con el árbol real (`arbolDelMundo`), no con una forma inventada.

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

function hilo(fromId: string, toId: string, label: string | null): CampaignLinkRow {
  return {
    id: `${fromId}->${toId}:${label ?? ""}`,
    fromId,
    toId,
    label,
    from: { id: fromId, name: `?${fromId}`, type: "NPC" },
    to: { id: toId, name: `?${toId}`, type: "LOCATION" },
  };
}

function montar(entidades: Entity[], hilos: CampaignLinkRow[]) {
  const arbol = arbolDelMundo(entidades, hilos);
  return render(<DesgloseDelMundo arbol={arbol} seleccionId={null} onSeleccion={vi.fn()} />);
}

describe("DesgloseDelMundo", () => {
  it("una raíz sin hijos nace plegada; una con hijos, abierta", () => {
    // Sin ninguna ficha de tipo QUEST en el mundo, la raíz «Misiones» queda sin hijos.
    const lugar = ent("l1", "Torre Gris", "LOCATION");
    const pnj = ent("n1", "Corvin", "NPC");
    montar([lugar, pnj], [hilo("n1", "l1", "vive en")]);

    expect(screen.getByRole("treeitem", { name: "Misiones" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("treeitem", { name: "Lugares" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});
