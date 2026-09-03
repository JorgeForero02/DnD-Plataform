import { IconoCarga } from "./iconos";
import { ozAKg } from "./peso";

// Carril B1 — "Carga: cifra grande + barra sobria + Sin sobrecarga" (pantalla 20 del prototipo).

export function PanelCarga({
  totalWeightOz,
  carryCapacityOz,
}: {
  totalWeightOz: number;
  carryCapacityOz: number | null;
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
    </div>
  );
}
