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
  /**
   * Reglas de la mesa (Task 6, D-CF-53) — solo la pestaña `Numeros` la usa hoy (`Caracteristicas`,
   * E-RM-13), pero vive en el contrato compartido igual que `puedeEditar` para que un caller no
   * tenga que acordarse de pasarla a una pestaña nueva que la necesite mañana. `false` por
   * defecto en quien la omite (`HojaCalculada`).
   */
  esDM?: boolean;
}

// Tarea 7 (spec 2026-09-11) — las pestañas de la hoja, en el orden de la spec. El `id` es lo que
// viaja en la URL (`?pestana=objetos`, sin acentos a propósito) y el `label` lo que lee quien
// mira la pantalla: la forma legible se escribe aquí UNA vez y `HojaCalculada` la importa, que
// es la regla de «ningún valor de enumeración llega a la pantalla».
export const PESTANAS_DE_LA_HOJA = [
  { id: "numeros", label: "Números" },
  { id: "objetos", label: "Objetos" },
  { id: "ataques", label: "Ataques" },
  { id: "recursos", label: "Recursos" },
  { id: "estado", label: "Estado" },
  { id: "rasgos", label: "Rasgos" },
  { id: "conjuros", label: "Conjuros" },
] as const satisfies readonly { id: string; label: string }[];

export type PestanaId = (typeof PESTANAS_DE_LA_HOJA)[number]["id"];
