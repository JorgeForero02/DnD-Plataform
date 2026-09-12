import type { InventoryRow } from "./api";
import { NOMBRE_ACCION_ZONA } from "./vocabulario";

// HP-8 (2026-09-12, opción C del autor). La pantalla 20 del prototipo (09-06) ponía la
// sintonización ANTES de la acción principal; lo que quería enseñar era el **estado** del objeto
// junto a su nombre, no un orden de botones. Ese estado lo pinta ahora un distintivo
// «Sintonizado» junto al nombre (`FilaObjeto`, `DetalleDeObjeto`), y **la acción principal sigue
// primero**, que es lo que la mesa usa: principal · sintonizar · gastar · soltar. Para no decir
// «Sintonizado» dos veces, el botón dice lo que hace: «Sintonizar» o «Desintonizar».
//
// Y por eso el botón **no lleva `aria-pressed`** (revisión de la ronda 2): el patrón de botón
// conmutador de la APG es rótulo constante + `pressed` que lleva el estado; el nuestro es el
// contrario —rótulo que cambia y estado en el distintivo—, y mezclar los dos anunciaría
// «Desintonizar, pulsado». Es una acción llana con dos nombres.

export interface AccionDeObjeto {
  id: "principal" | "sintonizar" | "gastar" | "soltar";
  rotulo: string; // lo que se lee en el botón
  ariaLabel?: string; // con el nombre del objeto, como hoy
  variant: "secondary" | "ghost";
  ejecutar: () => void;
}

export interface ManosDeObjeto {
  onAccionPrincipal: () => void;
  onSoltar: () => void;
  onGastar?: () => void;
  onSintonizar?: () => void;
}

/** La lista de acciones de una fila, en el orden en que se pintan. Un solo sitio: la fila y el
 *  panel de detalle la consumen, y una prueba afirma que ofrecen lo mismo. */
export function accionesDeObjeto(row: InventoryRow, manos: ManosDeObjeto): AccionDeObjeto[] {
  const { item } = row;
  const acciones: AccionDeObjeto[] = [
    {
      id: "principal",
      rotulo: NOMBRE_ACCION_ZONA[row.location],
      variant: "secondary",
      ejecutar: manos.onAccionPrincipal,
    },
  ];

  if (manos.onSintonizar) {
    acciones.push({
      id: "sintonizar",
      rotulo: row.attuned ? "Desintonizar" : "Sintonizar",
      ariaLabel: row.attuned ? `Desintonizar ${item.name}` : `Sintonizar con ${item.name}`,
      variant: row.attuned ? "secondary" : "ghost",
      ejecutar: manos.onSintonizar,
    });
  }

  if (manos.onGastar) {
    acciones.push({
      id: "gastar",
      rotulo: "Gastar",
      ariaLabel: `Gastar una unidad de ${item.name}`,
      variant: "ghost",
      ejecutar: manos.onGastar,
    });
  }

  acciones.push({
    id: "soltar",
    rotulo: "Soltar",
    ariaLabel: `Soltar ${item.name}`,
    variant: "ghost",
    ejecutar: manos.onSoltar,
  });

  return acciones;
}
