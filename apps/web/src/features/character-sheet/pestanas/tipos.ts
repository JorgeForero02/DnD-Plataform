import type { SheetResponse } from "../api";

// Tarea 3 (spec 2026-09-11, «la hoja a página completa») — el contrato compartido por la
// cabecera y, más adelante, cada pestaña de la hoja: qué necesitan para pintarse y en qué
// disposición viven. `disposicion` distingue la página de personaje ("pagina", donde el nombre
// ya lo pinta `PageHeader`) de la ficha de la mesa ("mesa", donde no hay otra cabecera que lo
// diga).
export type Disposicion = "mesa" | "pagina";

export interface PropsDePestana {
  campaignId: string;
  characterId: string;
  data: SheetResponse & { sheet: NonNullable<SheetResponse["sheet"]> };
  puedeEditar: boolean;
  disposicion: Disposicion;
}
