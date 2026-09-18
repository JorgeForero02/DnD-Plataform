import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ResolvedItem } from "@dnd/shared";
import type { InventoryRow } from "../api";
import { datoDeObjeto, FilaObjeto } from "../FilaObjeto";

// HP-8 (2026-09-12, opción C del autor) — la pantalla 20 del prototipo (09-06) pone el ESTADO
// «sintonizado» junto al nombre del objeto; la fila solo lo decía en un botón al final. Ahora el
// estado es un distintivo junto al nombre —el mismo patrón que la marca «Sin identificar» de
// esta fila— y el botón dice lo que hace («Desintonizar»). El orden de las acciones no cambia:
// la principal sigue primero (`accionesDeObjeto.ts`).

const anillo = {
  ref: "CAMPAIGN:anillo-1",
  source: "CAMPAIGN",
  kind: "OTHER",
  name: "Anillo de protección",
  weightOz: 0,
  effects: [{ kind: "ac", amount: 1 }],
  requiresAttunement: true,
} as unknown as ResolvedItem;

function fila(overrides: Partial<InventoryRow>): InventoryRow {
  return {
    id: "row-1",
    quantity: 1,
    location: "EQUIPPED",
    slot: "RING_1",
    attuned: false,
    storedAt: null,
    note: null,
    item: anillo,
    ...overrides,
  };
}

function montar(row: InventoryRow) {
  return render(
    <ul>
      <FilaObjeto
        row={row}
        onAccionPrincipal={vi.fn()}
        onSoltar={vi.fn()}
        onSintonizar={vi.fn()}
        esDM={false}
        ocupado={false}
      />
    </ul>,
  );
}

describe("FilaObjeto — el estado de sintonización (HP-8)", () => {
  it("sintonizado: distintivo «Sintonizado» junto al nombre y botón «Desintonizar», pulsado", () => {
    montar(fila({ attuned: true }));
    const item = screen.getByRole("listitem");
    // El distintivo vive en el mismo párrafo que el nombre, no en la zona de botones.
    const nombre = within(item).getByText("Anillo de protección");
    expect(within(nombre).getByText("Sintonizado")).toBeInTheDocument();
    const boton = within(item).getByRole("button", { name: "Desintonizar Anillo de protección" });
    expect(boton).toHaveTextContent("Desintonizar");
    // Sin `aria-pressed` (ronda 2): el conmutador de la APG lleva rótulo fijo + estado en
    // `pressed`; el nuestro es el patrón contrario, y el estado lo dice el par de rótulos.
    expect(boton).not.toHaveAttribute("aria-pressed");
    // El estado se dice una vez: el distintivo. El botón ya no lo repite.
    expect(within(item).getAllByText(/sintonizado/i)).toHaveLength(1);
  });

  it("sin sintonizar: ningún distintivo y botón «Sintonizar»", () => {
    montar(fila({ attuned: false }));
    const item = screen.getByRole("listitem");
    expect(within(item).queryByText("Sintonizado")).toBeNull();
    const boton = within(item).getByRole("button", { name: "Sintonizar con Anillo de protección" });
    expect(boton).toHaveTextContent("Sintonizar");
    expect(boton).not.toHaveAttribute("aria-pressed");
  });

  it("el orden de las acciones no cambia: principal primero, sintonizar después", () => {
    montar(fila({ attuned: true }));
    const botones = within(screen.getByRole("listitem"))
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(botones).toEqual(["Quitar", "Desintonizar", "Soltar"]);
  });
});

// HP-9a (2026-09-12) — «Sintonizar cuenta»: el servidor ya no aplica los `effects` de un objeto
// que exige sintonización hasta que la fila está sintonizada (`rules/items.ts`,
// `efectosActivos`). La fila pintaba «+1 CA» igual en los dos casos, así que mentía sobre el
// número. Ahora lo mundano (`CA base N`, el dado) se queda y lo mágico se tacha, con la marca
// «Efecto inactivo: requiere sintonización» al lado — el mismo patrón que «Sin identificar».
describe("FilaObjeto — el efecto de un objeto sin sintonizar se enseña inactivo (HP-9a)", () => {
  const armaduraMasUno = {
    ref: "CAMPAIGN:cota-1",
    source: "CAMPAIGN",
    kind: "ARMOR",
    name: "Cota de malla +1",
    weightOz: 880,
    effects: [{ kind: "ac", amount: 1 }],
    requiresAttunement: true,
    attuned: false,
    armor: { category: "HEAVY", baseAc: 16, stealthDisadvantage: true, strengthRequirement: 13 },
  } as unknown as ResolvedItem;
  const MARCA = "Efecto inactivo: requiere sintonización";

  it("sin sintonizar: la CA base sigue, el «+1 CA» va tachado y la marca está al lado", () => {
    montar(fila({ item: armaduraMasUno, slot: "ARMOR", attuned: false }));
    const item = screen.getByRole("listitem");
    expect(within(item).getByText("CA base 16").tagName).not.toBe("S");
    const bono = within(item).getByText("+1 CA");
    expect(bono.tagName).toBe("S");
    expect(bono).toHaveAttribute("data-efecto", "inactivo");
    const marca = within(item).getByText(MARCA);
    // T3: el tachado no lo anuncia un lector de pantalla; el bono apunta a su explicación.
    expect(marca).toHaveAttribute("id", "efecto-inactivo-row-1");
    expect(bono).toHaveAccessibleDescription(MARCA);
  });

  it("sintonizado: «+1 CA» en limpio y sin marca", () => {
    montar(fila({ item: armaduraMasUno, slot: "ARMOR", attuned: true }));
    const item = screen.getByRole("listitem");
    const bono = within(item).getByText("+1 CA");
    expect(bono.tagName).not.toBe("S");
    expect(bono).not.toHaveAttribute("data-efecto");
    expect(within(item).queryByText(MARCA)).toBeNull();
  });

  it("un +1 que no exige sintonización: en limpio y sin marca", () => {
    montar(
      fila({
        item: { ...armaduraMasUno, requiresAttunement: false },
        slot: "ARMOR",
        attuned: false,
      }),
    );
    const item = screen.getByRole("listitem");
    expect(within(item).getByText("+1 CA").tagName).not.toBe("S");
    expect(within(item).queryByText(MARCA)).toBeNull();
  });

  it("exige sintonización pero no tiene efectos: nada que tachar, sin marca", () => {
    montar(fila({ item: { ...armaduraMasUno, effects: [] }, slot: "ARMOR", attuned: false }));
    const item = screen.getByRole("listitem");
    expect(within(item).getByText("CA base 16")).toBeInTheDocument();
    expect(within(item).queryByText("+1 CA")).toBeNull();
    expect(within(item).queryByText(MARCA)).toBeNull();
  });
});

// HP-10 (2026-09-12) — la fila ponía cifra solo al efecto `ac`; para los otros ocho tipos de
// `itemEffectSchema` la marca «Efecto inactivo» salía sin nada tachado. Ahora `datoDeObjeto.magico`
// resume TODOS los efectos con `resumirEfecto` (campaign-items/vocabulario.ts), y `DatoEnCifras`
// tacha la cadena entera igual que tachaba el «+N CA».
describe("FilaObjeto — todos los tipos de efecto llevan cifra (HP-10)", () => {
  const MARCA = "Efecto inactivo: requiere sintonización";
  const espadaMasUno = {
    ref: "CAMPAIGN:espada-1",
    source: "CAMPAIGN",
    kind: "WEAPON",
    name: "Espada larga +1",
    weightOz: 48,
    effects: [
      { kind: "weaponAttack", amount: 1 },
      { kind: "weaponDamage", amount: 1 },
    ],
    requiresAttunement: true,
    attuned: false,
    weapon: {
      category: "MARTIAL",
      range: "MELEE",
      damageDice: "1d8",
      damageType: "SLASHING",
      properties: [],
    },
  } as unknown as ResolvedItem;
  const cinturon = {
    ref: "CAMPAIGN:cinturon-1",
    source: "CAMPAIGN",
    kind: "OTHER",
    name: "Cinturón de fuerza",
    weightOz: 16,
    effects: [{ kind: "abilityScore", ability: "str", mode: "set", amount: 19 }],
    requiresAttunement: true,
    attuned: false,
  } as unknown as ResolvedItem;

  it("una espada +1 sin sintonizar: el dado en limpio, «+1 atq · +1 dñ» tachado y la marca", () => {
    montar(fila({ item: espadaMasUno, slot: "MAIN_HAND", attuned: false }));
    const item = screen.getByRole("listitem");
    expect(within(item).getByText("1d8 cort.").tagName).not.toBe("S");
    const bono = within(item).getByText("+1 atq · +1 dñ");
    expect(bono.tagName).toBe("S");
    expect(bono).toHaveAttribute("data-efecto", "inactivo");
    expect(bono).toHaveAccessibleDescription(MARCA);
    expect(within(item).getByText(MARCA)).toBeInTheDocument();
  });

  it("la misma espada sintonizada: «+1 atq · +1 dñ» en limpio y sin marca", () => {
    montar(fila({ item: espadaMasUno, slot: "MAIN_HAND", attuned: true }));
    const item = screen.getByRole("listitem");
    const bono = within(item).getByText("+1 atq · +1 dñ");
    expect(bono.tagName).not.toBe("S");
    expect(bono).not.toHaveAttribute("data-efecto");
    expect(within(item).queryByText(MARCA)).toBeNull();
  });

  it("un cinturón que fija FUE a 19 sin sintonizar: «FUE 19» tachado y la marca", () => {
    montar(fila({ item: cinturon, slot: "OTHER", attuned: false }));
    const item = screen.getByRole("listitem");
    const bono = within(item).getByText("FUE 19");
    expect(bono.tagName).toBe("S");
    expect(bono).toHaveAttribute("data-efecto", "inactivo");
    expect(within(item).getByText(MARCA)).toBeInTheDocument();
  });
});

// Revisión de HP-10 (2026-09-12) — tres cosas que la primera entrega dejó sin decir:
// (1) la mitad mágica ya no es «+N CA» sino una lista sin tope, así que **envuelve** (el
// `whitespace-nowrap` se queda solo en lo mundano); (2) listar es la verdad —cada efecto es una
// línea que escribió el DM—, no sumar; (3) un efecto de cantidad 0 no se resume: «+0 CA» no
// dice nada y antes tampoco se pintaba.
describe("FilaObjeto — la mitad mágica envuelve, lista y salta los ceros (revisión HP-10)", () => {
  const base = { ...anillo, requiresAttunement: false } as ResolvedItem;

  it("dos efectos `ac` se listan uno a uno, no se suman", () => {
    const item = {
      ...base,
      effects: [
        { kind: "ac", amount: 1 },
        { kind: "ac", amount: 1 },
      ],
    };
    expect(datoDeObjeto(item as ResolvedItem).magico).toBe("+1 CA · +1 CA");
  });

  it("un efecto con cantidad 0 no aparece; si todos son 0, no hay mitad mágica", () => {
    const conCero = {
      ...base,
      effects: [
        { kind: "ac", amount: 0 },
        { kind: "weaponAttack", amount: 1 },
      ],
    };
    expect(datoDeObjeto(conCero as ResolvedItem).magico).toBe("+1 atq");
    const soloCero = { ...base, effects: [{ kind: "maxHp", amount: 0 }] };
    expect(datoDeObjeto(soloCero as ResolvedItem).magico).toBeNull();
  });

  it("lo mundano no parte; lo mágico puede envolver (sin `whitespace-nowrap`)", () => {
    const cota = {
      ...base,
      kind: "ARMOR",
      armor: { category: "HEAVY", baseAc: 16, stealthDisadvantage: true, strengthRequirement: 13 },
      effects: [{ kind: "ac", amount: 1 }],
    } as unknown as ResolvedItem;
    montar(fila({ item: cota, slot: "ARMOR" }));
    const item = screen.getByRole("listitem");
    expect(within(item).getByText("CA base 16").className).toMatch(/\bwhitespace-nowrap\b/);
    expect(within(item).getByText("+1 CA").className).not.toMatch(/\bwhitespace-nowrap\b/);
    // Tampoco el contenedor: si él no parte, da igual lo que digan los hijos.
    expect(within(item).getByText("+1 CA").parentElement?.className).not.toMatch(
      /\bwhitespace-nowrap\b/,
    );
  });
});

// T15 (3A.2) — el chip «+1 · Arma mágica» cuando el objeto trae un `TemporaryModifier` vivo.
describe("FilaObjeto — el chip del encantamiento (T15, 3A.2)", () => {
  const espada = {
    ref: "SRD:long-sword",
    source: "SRD",
    kind: "WEAPON",
    name: "Espada larga",
    weightOz: 48,
    effects: [],
    requiresAttunement: false,
    attuned: false,
    weapon: {
      category: "MARTIAL",
      range: "MELEE",
      damageDice: "1d8",
      damageType: "SLASHING",
      properties: [],
    },
  } as unknown as ResolvedItem;

  it("con un temporal vivo, pinta «+1 · Arma mágica» junto al nombre", () => {
    montar(
      fila({
        item: {
          ...espada,
          temporales: [{ effect: "weaponAttack", amount: 1, reason: "Arma mágica" }],
        },
        slot: "MAIN_HAND",
      }),
    );
    const item = screen.getByRole("listitem");
    const nombre = within(item).getByText("Espada larga");
    expect(within(nombre).getByText("+1 · Arma mágica")).toBeInTheDocument();
  });

  it("weaponAttack y weaponDamage del MISMO lanzamiento pintan un solo chip, no dos", () => {
    montar(
      fila({
        item: {
          ...espada,
          temporales: [
            { effect: "weaponAttack", amount: 1, reason: "Arma mágica" },
            { effect: "weaponDamage", amount: 1, reason: "Arma mágica" },
          ],
        },
        slot: "MAIN_HAND",
      }),
    );
    const item = screen.getByRole("listitem");
    expect(within(item).getAllByText("+1 · Arma mágica")).toHaveLength(1);
  });

  it("sin ningún temporal, no hay chip", () => {
    montar(fila({ item: espada, slot: "MAIN_HAND" }));
    const item = screen.getByRole("listitem");
    expect(within(item).queryByText(/Arma mágica/)).toBeNull();
  });
});
