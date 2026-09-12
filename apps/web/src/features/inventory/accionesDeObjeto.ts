import type { InventoryRow } from "./api";
import { NOMBRE_ACCION_ZONA } from "./vocabulario";

export interface AccionDeObjeto {
  id: "principal" | "sintonizar" | "gastar" | "soltar";
  rotulo: string; // lo que se lee en el botón
  ariaLabel?: string; // con el nombre del objeto, como hoy
  variant: "secondary" | "ghost";
  pressed?: boolean; // sintonizado
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
      rotulo: row.attuned ? "Sintonizado" : "Sintonizar",
      ariaLabel: row.attuned ? `Desintonizar ${item.name}` : `Sintonizar con ${item.name}`,
      variant: row.attuned ? "secondary" : "ghost",
      pressed: row.attuned,
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
