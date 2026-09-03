import type { ResolvedItem } from "@dnd/shared";
import type { InventoryRow } from "./api";
import { Button } from "../../ui/Button";
import { IconoObjeto } from "./iconos";
import { danioCorto, NOMBRE_ACCION_ZONA, subtituloDeObjeto } from "./vocabulario";
import { formatearKg } from "./peso";

// Carril B1 — la fila de una línea: nombre + subtítulo tenue, dato en cifras, peso, acción.
// Pantalla 20 del prototipo: "nombre + subtítulo; a la derecha, dato en tipografía de cifras
// (1d8 perf., +11 CA), peso, y la acción".

/** El dato en cifras a la derecha del nombre — lo único que se sabe sin recalcular la hoja. */
function datoDeObjeto(item: ResolvedItem): string | null {
  if (item.weapon) return danioCorto(item.weapon.damageDice, item.weapon.damageType);
  if (item.armor) {
    return item.armor.category === "SHIELD"
      ? `+${item.armor.baseAc} CA`
      : `CA base ${item.armor.baseAc}`;
  }
  const bonoCa = item.effects
    .filter((e) => e.kind === "ac")
    .reduce((suma, e) => suma + e.amount, 0);
  if (bonoCa !== 0) return `${bonoCa > 0 ? "+" : ""}${bonoCa} CA`;
  return null;
}

export function FilaObjeto({
  row,
  onAccionPrincipal,
  onSoltar,
  ocupado,
  error,
}: {
  row: InventoryRow;
  /** El botón de la derecha: equipar, quitar o traer, según la zona en la que vive la fila. */
  onAccionPrincipal: () => void;
  /** Soltar el objeto — siempre detrás de una confirmación en pantalla, nunca aquí mismo. */
  onSoltar: () => void;
  ocupado: boolean;
  /** El rechazo del servidor para esta fila, en español tal cual llegó — nunca en un flotante. */
  error?: string;
}) {
  const { item } = row;
  const dato = datoDeObjeto(item);
  const pesoTotalOz = item.weightOz * row.quantity;
  // "x2", no "×2": el signo de multiplicación está en la lista de glifos prohibidos
  // (`ui/__tests__/Iconos.test.tsx`) porque hacía de icono en otra pantalla — aquí es solo
  // texto de cantidad, pero la prueba barre el fichero entero y no distingue el contexto.
  const cantidad = row.quantity > 1 ? ` x${row.quantity}` : "";

  return (
    <li className="border-b border-[color:var(--copper-rule)] py-s2 last:border-b-0">
      <div className="flex flex-wrap items-center gap-s2 sm:gap-s3">
        <IconoObjeto className="shrink-0 text-muted" />
        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate font-chrome text-chrome-sm text-text">
            {item.name}
            {cantidad}
          </p>
          <p className="truncate font-chrome text-chrome-xs text-muted">
            {subtituloDeObjeto(
              item.kind,
              row.location === "EQUIPPED" ? (row.slot ?? undefined) : undefined,
            )}
            {row.storedAt ? ` · ${row.storedAt}` : ""}
          </p>
        </div>
        {dato && (
          <span className="whitespace-nowrap font-data text-chrome-sm text-accent-text">
            {dato}
          </span>
        )}
        <span className="whitespace-nowrap font-data text-chrome-xs text-muted">
          {formatearKg(pesoTotalOz)}
        </span>
        <Button type="button" variant="secondary" aria-busy={ocupado} onClick={onAccionPrincipal}>
          {NOMBRE_ACCION_ZONA[row.location]}
        </Button>
        <Button
          type="button"
          variant="ghost"
          aria-busy={ocupado}
          onClick={onSoltar}
          aria-label={`Soltar ${item.name}`}
        >
          Soltar
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-1 pl-s6 font-chrome text-chrome-xs text-danger-text">
          {error}
        </p>
      )}
    </li>
  );
}
