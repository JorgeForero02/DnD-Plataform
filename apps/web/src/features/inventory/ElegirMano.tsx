import type { EquipSlot } from "@dnd/shared";
import { Button } from "../../ui/Button";
import { NOMBRE_RANURA } from "./vocabulario";

/**
 * **En qué mano va el arma** (paso 1, tarea 11).
 *
 * El servidor acepta `slot` desde 2B (`updateInventoryItemSchema`) y el motor lo usa —
 * `rules/attacks.ts` mira `OFF_HAND` para saber si la mano izquierda está ocupada y para el arma
 * ligera que va en ella—, y **la pantalla no lo ofrecía**: grep de `slot` en `PaginaDeInventario`
 * daba cero. Consecuencia: **un pícaro con dos dagas no existía**.
 *
 * **Son radios y no un desplegable**: dos opciones, cada una quiere decir algo distinto, y es
 * exactamente el caso que `docs/04-convenciones.md` nombra. Y cuando una no está disponible **se
 * escribe el motivo** en vez de dejarlo adivinar: un control que desaparece sin explicación es la
 * peor versión de decir que no.
 */
export function ElegirMano({
  nombre,
  aDosManos,
  valor,
  onElegir,
  onConfirmar,
  onCancelar,
}: {
  nombre: string;
  /** Un arma a dos manos no deja la izquierda libre, así que no se ofrece. */
  aDosManos: boolean;
  valor: EquipSlot;
  onElegir: (slot: EquipSlot) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const manos: EquipSlot[] = aDosManos ? ["MAIN_HAND"] : ["MAIN_HAND", "OFF_HAND"];
  return (
    <div className="mt-s2 rounded-radius-sm border border-muted p-s2">
      <fieldset>
        <legend className="px-1 font-chrome text-chrome-sm text-text">
          ¿En qué mano llevas {nombre}?
        </legend>
        <div className="space-y-1">
          {manos.map((mano) => (
            <label key={mano} className="flex cursor-pointer items-center gap-s2">
              <input
                type="radio"
                name={`mano-${nombre}`}
                checked={valor === mano}
                onChange={() => onElegir(mano)}
                className="accent-[var(--accent)]"
              />
              {/* **Ningún valor de enumeración llega a la pantalla**: el nombre de la ranura se
                  escribe una vez, en el vocabulario del inventario. */}
              <span className="font-chrome text-chrome-sm text-text">{NOMBRE_RANURA[mano]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {aDosManos && (
        <p className="mt-1 font-chrome text-chrome-xs leading-snug text-muted">
          Ocupa las dos manos, así que no deja la izquierda libre.
        </p>
      )}
      <div className="mt-s2 flex gap-s2">
        <Button type="button" onClick={onConfirmar}>
          Confirmar
        </Button>
        <Button type="button" variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
