import { describe, expect, it } from "vitest";
import type { ResolvedItem } from "@dnd/shared";
import type { InventoryRow } from "../api";
import { filtrarObjetos } from "../filtrarObjetos";

// Tarea 9 (spec 2026-09-11, «la hoja a página completa») — los cuatro filtros de la pestaña
// Objetos, sobre datos ya resueltos. **Un filtro es de cliente y nunca control de acceso**: lo
// que aquí se esconde ya lo decidió el servidor que se podía ver.

function objeto(parcial: Partial<ResolvedItem> & { name: string }): ResolvedItem {
  return {
    ref: `SRD:${parcial.name.toLowerCase().replace(/\s+/g, "-")}`,
    source: "SRD",
    kind: "GEAR",
    weightOz: 16,
    effects: [],
    requiresAttunement: false,
    ...parcial,
  };
}

const arma = objeto({ name: "Arma", kind: "WEAPON" });
const pocion = objeto({ name: "Poción", kind: "CONSUMABLE" });
const anillo = objeto({ name: "Anillo de protección", kind: "OTHER", requiresAttunement: true });

function fila(overrides: Partial<InventoryRow>): InventoryRow {
  return {
    id: "row-1",
    quantity: 1,
    location: "CARRIED",
    slot: null,
    attuned: false,
    storedAt: null,
    note: null,
    item: arma,
    ...overrides,
  };
}

describe("filtrarObjetos", () => {
  it("filtra por dónde, qué, sintonizados y texto sin acentos", () => {
    const items = [
      fila({ id: "a", location: "EQUIPPED", item: { ...arma, name: "Espada larga" } }),
      fila({ id: "b", item: { ...pocion, name: "Poción de curación" } }),
      fila({ id: "c", attuned: true, item: anillo }),
    ];
    expect(
      filtrarObjetos(items, { donde: "EQUIPPED", que: null, sintonizados: false, texto: "" }).map(
        (r) => r.id,
      ),
    ).toEqual(["a"]);
    expect(
      filtrarObjetos(items, { donde: null, que: "CONSUMABLE", sintonizados: false, texto: "" }).map(
        (r) => r.id,
      ),
    ).toEqual(["b"]);
    expect(
      filtrarObjetos(items, { donde: null, que: null, sintonizados: true, texto: "" }).map(
        (r) => r.id,
      ),
    ).toEqual(["c"]);
    expect(
      filtrarObjetos(items, { donde: null, que: null, sintonizados: false, texto: "pocion" }).map(
        (r) => r.id,
      ),
    ).toEqual(["b"]);
  });

  it("sin ningún filtro devuelve la lista entera, en el mismo orden", () => {
    const items = [fila({ id: "a" }), fila({ id: "b", item: pocion })];
    expect(
      filtrarObjetos(items, { donde: null, que: null, sintonizados: false, texto: "  " }),
    ).toEqual(items);
  });
});
