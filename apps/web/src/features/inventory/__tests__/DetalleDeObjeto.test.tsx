import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ResolvedItem } from "@dnd/shared";
import type { InventoryRow } from "../api";
import { accionesDeObjeto } from "../accionesDeObjeto";
import { DetalleDeObjeto } from "../DetalleDeObjeto";

// Tarea 9 (spec 2026-09-11, «la hoja a página completa») — el panel de detalle de la pestaña
// Objetos a página. Lo que defiende: que enseña lo que la fila no cabe a enseñar (descripción,
// sintonización, peso unitario), que **ofrece las mismas acciones que la fila** —la lista viene
// de `accionesDeObjeto`, un solo sitio— y que ningún valor de enumeración llega al DOM.

const espadaMagica: ResolvedItem = {
  ref: "CAMPAIGN:espada-larga-1",
  source: "CAMPAIGN",
  kind: "WEAPON",
  name: "Espada larga +1",
  weightOz: 48,
  effects: [],
  requiresAttunement: false,
  attuned: false,
  weapon: {
    category: "MARTIAL",
    range: "MELEE",
    damageDice: "1d8",
    damageType: "SLASHING",
    properties: ["VERSATILE"],
    versatileDice: "1d10",
  },
};

function fila(overrides: Partial<InventoryRow>): InventoryRow {
  return {
    id: "row-1",
    quantity: 1,
    location: "CARRIED",
    slot: null,
    attuned: false,
    storedAt: null,
    note: null,
    item: espadaMagica,
    ...overrides,
  };
}

describe("DetalleDeObjeto", () => {
  it("enseña nombre, tipo, daño, peso, sintonización y descripción, y las mismas acciones que la fila", () => {
    const manos = { onAccionPrincipal: vi.fn(), onSoltar: vi.fn(), onSintonizar: vi.fn() };
    const row = fila({
      item: { ...espadaMagica, description: "Una hoja que zumba.", requiresAttunement: true },
    });
    render(<DetalleDeObjeto row={row} acciones={accionesDeObjeto(row, manos)} esDM={false} />);
    const panel = screen.getByRole("complementary", { name: "detalle del objeto" });
    expect(within(panel).getByText("Espada larga +1")).toBeInTheDocument();
    expect(within(panel).getByText("Una hoja que zumba.")).toBeInTheDocument();
    expect(within(panel).getByText(/requiere sintonización/i)).toBeInTheDocument();
    expect(
      within(panel)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Equipar", "Sintonizar", "Soltar"]);
    expect(within(panel).queryByText("CARRIED")).toBeNull();
  });

  // HP-8 (2026-09-12, opción C): el ESTADO «Sintonizado» va junto al nombre, como en la pantalla
  // 20 del prototipo; el botón dice lo que hace («Desintonizar») y no repite el estado.
  it("sintonizado: el distintivo va junto al nombre y el botón dice «Desintonizar»", () => {
    const manos = { onAccionPrincipal: vi.fn(), onSoltar: vi.fn(), onSintonizar: vi.fn() };
    const row = fila({
      attuned: true,
      location: "EQUIPPED",
      slot: "MAIN_HAND",
      item: { ...espadaMagica, requiresAttunement: true },
    });
    render(<DetalleDeObjeto row={row} acciones={accionesDeObjeto(row, manos)} esDM={false} />);
    const panel = screen.getByRole("complementary", { name: "detalle del objeto" });
    const titulo = within(panel).getByRole("heading", { level: 3 });
    expect(within(titulo).getByText("Sintonizado")).toBeInTheDocument();
    const boton = within(panel).getByRole("button", { name: "Desintonizar Espada larga +1" });
    // Sin `aria-pressed` (ronda 2): rótulo que cambia + estado en el distintivo, no conmutador APG.
    expect(boton).not.toHaveAttribute("aria-pressed");
    expect(boton).toHaveTextContent("Desintonizar");
    // «Requiere sintonización» sigue, pero sin el « · sintonizado» de antes: lo dice el distintivo.
    expect(within(panel).getByText("Requiere sintonización")).toBeInTheDocument();
    expect(within(panel).getAllByText(/sintonizado/i)).toHaveLength(1);
  });

  it("sin sintonizar no hay distintivo, y el botón dice «Sintonizar»", () => {
    const manos = { onAccionPrincipal: vi.fn(), onSoltar: vi.fn(), onSintonizar: vi.fn() };
    const row = fila({ item: { ...espadaMagica, requiresAttunement: true } });
    render(<DetalleDeObjeto row={row} acciones={accionesDeObjeto(row, manos)} esDM={false} />);
    const panel = screen.getByRole("complementary", { name: "detalle del objeto" });
    expect(within(panel).queryByText("Sintonizado")).toBeNull();
    expect(
      within(panel).getByRole("button", { name: "Sintonizar con Espada larga +1" }),
    ).toHaveTextContent("Sintonizar");
  });

  it("con dos unidades enseña el peso unitario y el total, y el dato en cifras", () => {
    const row = fila({ quantity: 2 });
    render(
      <DetalleDeObjeto
        row={row}
        acciones={accionesDeObjeto(row, { onAccionPrincipal: vi.fn(), onSoltar: vi.fn() })}
        esDM={false}
      />,
    );
    const panel = screen.getByRole("complementary", { name: "detalle del objeto" });
    expect(within(panel).getByText("1d8 cort.")).toBeInTheDocument();
    expect(within(panel).getByText("1.4 kg")).toBeInTheDocument();
    expect(within(panel).getByText("2.7 kg")).toBeInTheDocument();
    expect(within(panel).queryByText(/requiere sintonización/i)).toBeNull();
    expect(within(panel).queryByText("WEAPON")).toBeNull();
  });

  it("sin fila, invita a elegir una", () => {
    render(<DetalleDeObjeto row={null} acciones={[]} esDM={false} />);
    const panel = screen.getByRole("complementary", { name: "detalle del objeto" });
    expect(within(panel).getByText("Elige un objeto")).toBeInTheDocument();
    expect(within(panel).queryAllByRole("button")).toEqual([]);
  });
});

// HP-9a (2026-09-12) — el detalle dice lo mismo que la fila (`FilaObjeto.test.tsx`): lo mundano
// se queda, lo mágico se tacha y una frase entera explica por qué el número no se movió.
describe("DetalleDeObjeto — el efecto de un objeto sin sintonizar se enseña inactivo (HP-9a)", () => {
  const armaduraMasUno: ResolvedItem = {
    ref: "CAMPAIGN:cota-1",
    source: "CAMPAIGN",
    kind: "ARMOR",
    name: "Cota de malla +1",
    weightOz: 880,
    effects: [{ kind: "ac", amount: 1 }],
    requiresAttunement: true,
    attuned: false,
    armor: { category: "HEAVY", baseAc: 16, stealthDisadvantage: true, strengthRequirement: 13 },
  };
  const MARCA = "Efecto inactivo: requiere sintonización";
  const manos = () => ({ onAccionPrincipal: vi.fn(), onSoltar: vi.fn(), onSintonizar: vi.fn() });

  function montar(row: InventoryRow) {
    render(<DetalleDeObjeto row={row} acciones={accionesDeObjeto(row, manos())} esDM={false} />);
    return screen.getByRole("complementary", { name: "detalle del objeto" });
  }

  it("sin sintonizar: CA base en limpio, «+1 CA» tachado y la explicación entera", () => {
    const panel = montar(fila({ item: armaduraMasUno, location: "EQUIPPED", slot: "ARMOR" }));
    expect(within(panel).getByText("CA base 16").tagName).not.toBe("S");
    const bono = within(panel).getByText("+1 CA");
    expect(bono.tagName).toBe("S");
    expect(bono).toHaveAttribute("data-efecto", "inactivo");
    const marca = within(panel).getByText(MARCA);
    expect(marca.closest("p")).toHaveTextContent(/no cuentan hasta que lo sintonices/);
    // T3: el bono tachado apunta a la frase entera para quien no ve el tachado.
    expect(bono).toHaveAccessibleDescription(/no cuentan hasta que lo sintonices/);
    // El requisito fijo sigue diciéndose aparte, como antes.
    expect(within(panel).getByText("Requiere sintonización")).toBeInTheDocument();
  });

  it("sintonizado: «+1 CA» en limpio y sin explicación", () => {
    const panel = montar(
      fila({ item: armaduraMasUno, location: "EQUIPPED", slot: "ARMOR", attuned: true }),
    );
    const bono = within(panel).getByText("+1 CA");
    expect(bono.tagName).not.toBe("S");
    expect(within(panel).queryByText(MARCA)).toBeNull();
  });

  it("un +1 que no exige sintonización: en limpio y sin explicación", () => {
    const panel = montar(fila({ item: { ...armaduraMasUno, requiresAttunement: false } }));
    expect(within(panel).getByText("+1 CA").tagName).not.toBe("S");
    expect(within(panel).queryByText(MARCA)).toBeNull();
  });

  it("exige sintonización pero no tiene efectos: solo el requisito, sin explicación", () => {
    const panel = montar(fila({ item: { ...armaduraMasUno, effects: [] } }));
    expect(within(panel).queryByText("+1 CA")).toBeNull();
    expect(within(panel).queryByText(MARCA)).toBeNull();
    expect(within(panel).getByText("Requiere sintonización")).toBeInTheDocument();
  });
});

// HP-10 (2026-09-12) — el detalle hereda `datoDeObjeto`/`DatoEnCifras` de la fila, así que la
// espada +1 y el cinturón se resumen y se tachan igual aquí (`FilaObjeto.test.tsx`).
describe("DetalleDeObjeto — todos los tipos de efecto llevan cifra (HP-10)", () => {
  const MARCA = "Efecto inactivo: requiere sintonización";
  const manos = () => ({ onAccionPrincipal: vi.fn(), onSoltar: vi.fn(), onSintonizar: vi.fn() });
  const espadaMasUno: ResolvedItem = {
    ...espadaMagica,
    effects: [
      { kind: "weaponAttack", amount: 1 },
      { kind: "weaponDamage", amount: 1 },
    ],
    requiresAttunement: true,
  };
  const cinturon: ResolvedItem = {
    ref: "CAMPAIGN:cinturon-1",
    source: "CAMPAIGN",
    kind: "OTHER",
    name: "Cinturón de fuerza",
    weightOz: 16,
    effects: [{ kind: "abilityScore", ability: "str", mode: "set", amount: 19 }],
    requiresAttunement: true,
    attuned: false,
  };

  function montar(row: InventoryRow) {
    render(<DetalleDeObjeto row={row} acciones={accionesDeObjeto(row, manos())} esDM={false} />);
    return screen.getByRole("complementary", { name: "detalle del objeto" });
  }

  it("una espada +1 sin sintonizar: «+1 atq · +1 dñ» tachado con la explicación", () => {
    const panel = montar(
      fila({ item: espadaMasUno, location: "EQUIPPED", slot: "MAIN_HAND", attuned: false }),
    );
    const bono = within(panel).getByText("+1 atq · +1 dñ");
    expect(bono.tagName).toBe("S");
    expect(bono).toHaveAttribute("data-efecto", "inactivo");
    expect(within(panel).getByText(MARCA)).toBeInTheDocument();
  });

  it("la misma espada sintonizada: en limpio y sin explicación", () => {
    const panel = montar(
      fila({ item: espadaMasUno, location: "EQUIPPED", slot: "MAIN_HAND", attuned: true }),
    );
    expect(within(panel).getByText("+1 atq · +1 dñ").tagName).not.toBe("S");
    expect(within(panel).queryByText(MARCA)).toBeNull();
  });

  it("un cinturón que fija FUE a 19 sin sintonizar: «FUE 19» tachado", () => {
    const panel = montar(fila({ item: cinturon, location: "EQUIPPED", slot: "OTHER" }));
    const bono = within(panel).getByText("FUE 19");
    expect(bono.tagName).toBe("S");
    expect(within(panel).getByText(MARCA)).toBeInTheDocument();
  });
});
