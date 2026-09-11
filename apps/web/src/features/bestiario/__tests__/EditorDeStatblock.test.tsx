import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Statblock } from "@dnd/shared";
import { EditorDeStatblock } from "../EditorDeStatblock";

// **Paso 1, tarea 12 — el editor de criaturas deja de mentir al editar.**
//
// El selector de visibilidad ya existía y ya se pintaba al CREAR. Al editar, la otra rama del
// ternario pintaba un párrafo que decía *«Quién la ve no se toca desde aquí: el servidor no manda
// ese dato al leer la criatura»*, y **el servidor sí lo manda**. Dos consecuencias: el texto
// incumplía la regla vinculante —si la interfaz explica una regla del servidor y discrepan, miente
// el texto— y **no había forma de cambiar quién ve una criatura propia ya creada**.

const OGRO: Statblock & { visibility?: "DM_ONLY" | "PUBLIC" } = {
  ref: "CAMPAIGN:og1",
  source: "CAMPAIGN",
  name: "Ogro de la charca",
  size: "LARGE",
  type: "GIANT",
  ac: 11,
  hitDiceCount: 7,
  abilities: { str: 19, dex: 8, con: 16, int: 5, wis: 7, cha: 7 },
  saveProficiencies: [],
  skillProficiencies: {},
  damageResistances: [],
  damageImmunities: [],
  damageVulnerabilities: [],
  conditionImmunities: [],
  otherSenses: [],
  speeds: { walk: 40 },
  cr: 2,
  traits: [],
  actions: [],
  reactions: [],
  legendaryActions: [],
} as never;

function montar(statblock?: typeof OGRO, onGuardar = vi.fn()) {
  return {
    onGuardar,
    ...render(
      <EditorDeStatblock
        abierto
        statblock={statblock}
        guardando={false}
        onGuardar={onGuardar}
        onCerrar={vi.fn()}
      />,
    ),
  };
}

describe("el editor de criaturas y quién la ve (paso 1, tarea 12)", () => {
  it("editar una criatura enseña su visibilidad actual, marcada", () => {
    montar({ ...OGRO, visibility: "PUBLIC" });
    expect(screen.getByRole("radio", { name: /Público/ })).toBeChecked();
  });

  it("y ya no dice que el servidor no manda ese dato", () => {
    montar(OGRO);
    expect(screen.queryByText(/no manda ese dato/i)).not.toBeInTheDocument();
  });

  it("cambiarla la manda al guardar: es lo que no se podía hacer", () => {
    const { onGuardar } = montar({ ...OGRO, visibility: "DM_ONLY" });

    fireEvent.click(screen.getByRole("radio", { name: /Público/ }));
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(onGuardar).toHaveBeenCalledWith(expect.objectContaining({ visibility: "PUBLIC" }));
  });

  it("al CREAR sigue naciendo escondida: preparar la mazmorra no puede ser filtrarla", () => {
    montar(undefined);
    expect(screen.getByRole("radio", { name: /Solo el DM/ })).toBeChecked();
  });
});

// Tarea 25 (cerrar fichas, tanda 2026-09-11) — `OWNER_DM` vuelve a ofrecerse: el servidor ya
// compara con el `createdById` real de la fila en vez de `""`, así que «DM y creador» deja de
// mentir.
describe("OWNER_DM vuelve a la lista (tarea 25)", () => {
  it("se ofrece «DM y creador», con su frase", () => {
    montar(undefined);
    expect(screen.getByRole("radio", { name: /DM y creador/ })).toBeInTheDocument();
    expect(screen.getByText(/Tú y quien lo creó/)).toBeInTheDocument();
  });

  it("elegirlo lo manda al guardar", () => {
    const { onGuardar } = montar({ ...OGRO, visibility: "DM_ONLY" });

    fireEvent.click(screen.getByRole("radio", { name: /DM y creador/ }));
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(onGuardar).toHaveBeenCalledWith(expect.objectContaining({ visibility: "OWNER_DM" }));
  });
});
