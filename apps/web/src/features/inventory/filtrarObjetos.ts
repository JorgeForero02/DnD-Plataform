import type { ItemKind, ItemLocation } from "@dnd/shared";
import type { InventoryRow } from "./api";

// Tarea 9 (spec 2026-09-11, «la hoja a página completa») — los cuatro filtros de la pestaña
// Objetos (spec §6): dónde está, qué es, si está sintonizado y un texto libre sobre el nombre.

export interface FiltroDeObjetos {
  /** La zona, o `null` para las tres. */
  donde: ItemLocation | null;
  /** El tipo del catálogo, o `null` para todos. Las fichas lo enseñan por `NOMBRE_TIPO_OBJETO`. */
  que: ItemKind | null;
  /** Solo los sintonizados. */
  sintonizados: boolean;
  /** Texto libre sobre `item.name`, sin distinguir acentos ni mayúsculas. */
  texto: string;
}

export const SIN_FILTRO: FiltroDeObjetos = {
  donde: null,
  que: null,
  sintonizados: false,
  texto: "",
};

/** «Poción» y «pocion» son la misma búsqueda: se quitan las marcas diacríticas y las mayúsculas. */
export function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Recorta la lista según el filtro, conservando el orden.
 *
 * **Un filtro es de cliente y nunca control de acceso.** Lo que entra aquí ya lo decidió el
 * servidor que quien mira lo puede ver (`canView` y el alias de D-CF-15 se aplican allí);
 * esconder una fila con una ficha no la hace privada, y un objeto que el jugador no debería
 * conocer no se arregla filtrándolo en esta función.
 */
export function filtrarObjetos(items: InventoryRow[], f: FiltroDeObjetos): InventoryRow[] {
  const texto = normalizarTexto(f.texto);
  return items.filter((row) => {
    if (f.donde && row.location !== f.donde) return false;
    if (f.que && row.item.kind !== f.que) return false;
    if (f.sintonizados && !row.attuned) return false;
    if (texto && !normalizarTexto(row.item.name).includes(texto)) return false;
    return true;
  });
}
