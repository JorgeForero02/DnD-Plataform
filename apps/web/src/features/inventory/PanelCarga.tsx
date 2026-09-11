import type { EncumbranceInfo } from "@dnd/shared";
import { IconoCarga } from "./iconos";
import { ozAKg } from "./peso";

// Carril B1 — "Carga: cifra grande + barra sobria + Sin sobrecarga" (pantalla 20 del prototipo).
//
// Migración 6, fix round 1 (BAJA-1) — SRD 5.1, Variant: Encumbrance. **El estado lo decide el
// servidor, este panel solo lo pinta.** La primera versión dividía `carryCapacityOz` (5x Fuerza
// es 1/3 de la capacidad estándar de 15x Fuerza) y comparaba contra `totalWeightOz` — los dos
// ya filtrados por `canView` para este visor. Eso deja «Sin cargar» en el panel de un jugador
// mientras la hoja (que suma el peso real, sin filtrar) ya dice −10 pies, si hay un objeto de
// campaña que empuja el peso real por encima del umbral y este visor no puede verlo.
// `InventoryService.list()` calcula el estado con el peso SIN filtrar y manda solo el
// resultado — nunca el peso de lo que este visor no puede ver.

/** Traduce el estado del servidor a la frase de la mesa. Las tres son el mismo vocabulario cerrado. */
const FRASE_DE_ESTADO: Record<EncumbranceInfo["state"], string> = {
  none: "Sin cargar: la velocidad no cambia.",
  encumbered: "Cargado: la velocidad baja 10 pies.",
  heavily:
    "Muy cargado: la velocidad baja 20 pies, y hay desventaja en pruebas, ataques y salvaciones de Fuerza, Destreza o Constitución.",
};

export function PanelCarga({
  totalWeightOz,
  carryCapacityOz,
  encumbrance,
}: {
  totalWeightOz: number;
  carryCapacityOz: number | null;
  /**
   * El estado de sobrecarga, ya calculado por el servidor (`InventoryService.list()`).
   * `null` cuando la variante de la campaña está apagada, o el personaje no tiene Fuerza
   * asignada — los mismos dos casos en los que la hoja tampoco calcula nada.
   */
  encumbrance: EncumbranceInfo | null;
}) {
  const totalKg = ozAKg(totalWeightOz);
  const capacidadKg = carryCapacityOz != null ? ozAKg(carryCapacityOz) : null;
  const proporcion = capacidadKg && capacidadKg > 0 ? Math.min(1, totalKg / capacidadKg) : 0;
  const sobrecargado = capacidadKg != null && totalKg > capacidadKg;

  return (
    <div className="rounded-radius-sm border border-muted bg-surface p-s4">
      <h2 className="mb-s2 flex items-center gap-s2 font-chrome text-chrome-sm font-semibold text-text">
        <IconoCarga className="text-accent-text" />
        Carga
      </h2>
      <p className="font-data text-chrome-2xl leading-none text-text">
        {totalKg.toFixed(1)}
        <span className="ml-1 text-chrome-md text-muted">kg</span>
      </p>
      {capacidadKg != null && (
        <p className="mt-1 font-chrome text-chrome-xs text-muted">de {capacidadKg.toFixed(0)} kg</p>
      )}
      <div className="mt-s3 h-2 w-full overflow-hidden rounded-full bg-bg">
        <div
          className={`h-full rounded-full ${sobrecargado ? "bg-danger" : "bg-accent"}`}
          style={{ width: `${Math.round(proporcion * 100)}%` }}
        />
      </div>
      <p
        role={sobrecargado ? "alert" : undefined}
        className={`mt-s2 font-chrome text-chrome-xs ${sobrecargado ? "text-danger-text" : "text-muted"}`}
      >
        {capacidadKg == null
          ? "Sin capacidad de carga: falta la Fuerza del personaje."
          : sobrecargado
            ? `Sobrecargado: pasa de ${capacidadKg.toFixed(0)} kg.`
            : `Sin sobrecarga. Aviso al pasar de ${capacidadKg.toFixed(0)} kg.`}
      </p>
      {encumbrance != null && (
        <div className="mt-s3 border-t border-muted pt-s3">
          <p className="font-chrome text-chrome-xs font-semibold text-text">
            Variante de sobrecarga
          </p>
          <p className="mt-1 font-chrome text-chrome-xs text-muted">
            Cargado desde {ozAKg(encumbrance.encumberedAtOz).toFixed(1)} kg · muy cargado desde{" "}
            {ozAKg(encumbrance.heavilyAtOz).toFixed(1)} kg
          </p>
          <p
            role={encumbrance.state === "heavily" ? "alert" : undefined}
            className={`mt-1 font-chrome text-chrome-xs ${
              encumbrance.state === "heavily" ? "text-danger-text" : "text-muted"
            }`}
          >
            {FRASE_DE_ESTADO[encumbrance.state]}
          </p>
        </div>
      )}
    </div>
  );
}
