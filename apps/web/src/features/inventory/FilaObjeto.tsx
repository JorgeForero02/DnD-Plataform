import { NOMBRE_SIN_IDENTIFICAR, type ResolvedItem } from "@dnd/shared";
import { useState, type ReactNode } from "react";
import type { InventoryRow } from "./api";
import { accionesDeObjeto } from "./accionesDeObjeto";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";
import { IconoObjeto, IconoSinIdentificar } from "./iconos";
import {
  danioCorto,
  ETIQUETA_SIN_IDENTIFICAR,
  EXPLICACION_SIN_IDENTIFICAR,
  subtituloDeObjeto,
} from "./vocabulario";
import { formatearKg } from "./peso";

// Carril B1 — la fila de una línea: nombre + subtítulo tenue, dato en cifras, peso, acción.
// Pantalla 20 del prototipo: "nombre + subtítulo; a la derecha, dato en tipografía de cifras
// (1d8 perf., +11 CA), peso, y la acción".

/** El dato en cifras a la derecha del nombre — lo único que se sabe sin recalcular la hoja. */
export function datoDeObjeto(item: ResolvedItem): string | null {
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
  onGastar,
  onSintonizar,
  esDM,
  onIdentificar,
  ocupado,
  error,
  seleccionada,
  onSeleccionar,
  children,
}: {
  row: InventoryRow;
  /**
   * El botón de la derecha: equipar, quitar o traer, según la zona en la que vive la fila.
   * **Sin manos, sin botones** (spec 2026-09-11 §7): quien mira un personaje ajeno recibe la fila
   * sin `onAccionPrincipal` ni `onSoltar`, y la fila no pinta ninguna acción — no un botón que
   * el servidor rechazaría. Van las dos juntas o ninguna.
   */
  onAccionPrincipal?: () => void;
  /** Soltar el objeto — siempre detrás de una confirmación en pantalla, nunca aquí mismo. */
  onSoltar?: () => void;
  /**
   * Gastar una unidad. **Solo donde tiene sentido**: un consumible, o una pila de varios. Sin
   * esto, beber la segunda poción de tres y beber la última eran dos gestos distintos —cambiar
   * la cantidad y borrar la fila— y ninguno dejaba constancia.
   */
  onGastar?: () => void;
  /**
   * Sintonizar o desintonizar. **Faltaba entero** (auditoría de la mesa, §8.2): el servidor
   * comprueba el tope de tres desde la fase 2B y esta fila no tenía ningún control, así que un
   * objeto que exige sintonización **no se podía sintonizar desde ninguna pantalla**.
   *
   * Quien la monta decide si la ofrece: el servidor solo la acepta sobre un objeto **equipado**
   * que de verdad la pida (`inventory.service.ts:136-145`), y ofrecerla donde no se puede sería
   * ofrecer un 400.
   */
  onSintonizar?: () => void;
  /**
   * **Solo el DM identifica** (D-CF-15): la autorización real vive en el servidor
   * (`inventory.service.ts`, 403 a quien no sea el DM), y esta prop es la mitad de pantalla —
   * ofrecer el control solo a quien de verdad puede usarlo, nunca esconderlo como si eso fuera
   * el control de acceso.
   */
  esDM: boolean;
  /** Cambia `identified` y/o `unidentifiedName` de esta fila. Ausente si `esDM` es falso. */
  onIdentificar?: (input: { identified?: boolean; unidentifiedName?: string | null }) => void;
  ocupado: boolean;
  /** El rechazo del servidor para esta fila, en español tal cual llegó — nunca en un flotante. */
  error?: string;
  /**
   * Tarea 9 (spec 2026-09-11) — la fila es seleccionable **solo a página**, donde hay un panel
   * de detalle que enseña la seleccionada. Las dos props van juntas: si faltan, la fila se pinta
   * exactamente como en la mesa —sin botón sobre el nombre y sin `aria-selected`—, porque un
   * `aria-selected="false"` en una lista sin selección anunciaría un control que no existe.
   */
  seleccionada?: boolean;
  /** El nombre es un botón («Ver detalle de X»), no la fila entera: dentro ya hay otros botones. */
  onSeleccionar?: () => void;
  /**
   * Lo que la fila despliega debajo cuando la acción principal necesita una decisión más — hoy,
   * **en qué mano va un arma** (paso 1, tarea 11). Va aquí dentro y no en un diálogo: se toca
   * donde se lee, y la mano es una propiedad de esta fila.
   */
  children?: ReactNode;
}) {
  const { item } = row;
  const dato = datoDeObjeto(item);
  const pesoTotalOz = item.weightOz * row.quantity;
  // "x2", no "×2": el signo de multiplicación está en la lista de glifos prohibidos
  // (`ui/__tests__/Iconos.test.tsx`) porque hacía de icono en otra pantalla — aquí es solo
  // texto de cantidad, pero la prueba barre el fichero entero y no distingue el contexto.
  const cantidad = row.quantity > 1 ? ` x${row.quantity}` : "";
  // D-CF-15: `identified` llega `undefined` en cualquier fila anterior a la migración 7 que no
  // se haya vuelto a leer — se trata igual que el `true` explícito de la columna (nace
  // identificado), nunca como «sin identificar».
  const sinIdentificar = item.identified === false;
  // El campo de texto del DM es un borrador local: solo se manda al soltar el foco, para no
  // disparar un `PATCH` por cada letra tecleada de un alias que la mesa todavía está pensando.
  const [alias, setAlias] = useState(item.unidentifiedName ?? "");

  const seleccionable = seleccionada !== undefined && onSeleccionar !== undefined;
  const acciones =
    onAccionPrincipal && onSoltar
      ? accionesDeObjeto(row, { onAccionPrincipal, onSoltar, onGastar, onSintonizar })
      : [];

  return (
    <li
      aria-selected={seleccionable ? seleccionada : undefined}
      className={[
        "border-b border-[color:var(--copper-rule)] py-s2 last:border-b-0",
        // La seleccionada se marca con el tinte del acento y un filo a la izquierda: se ve cuál
        // es la que enseña el panel sin leer el panel.
        seleccionable && seleccionada
          ? "-ml-s2 border-l-2 border-l-accent bg-[color:var(--accent-tint)] pl-s2"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-wrap items-center gap-s2 sm:gap-s3">
        <IconoObjeto className="shrink-0 text-muted" />
        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate font-chrome text-chrome-sm text-text">
            {seleccionable ? (
              <button
                type="button"
                aria-label={`Ver detalle de ${item.name}`}
                onClick={onSeleccionar}
                className="max-w-full truncate rounded-radius-sm text-left align-baseline hover:text-accent-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {item.name}
              </button>
            ) : (
              item.name
            )}
            {cantidad}
            {/* El jugador ve la etiqueta dibujada junto al alias que ya le mandó el servidor
                (`item.name` ya viene sustituido); el DM la ve además del nombre real, porque el
                interruptor de abajo ya se lo dice — no hace falta repetirla dos veces para él. */}
            {sinIdentificar && !esDM && (
              <span className="ml-2 inline-flex items-center gap-1 align-middle font-chrome text-chrome-xs text-muted">
                <IconoSinIdentificar />
                {ETIQUETA_SIN_IDENTIFICAR}
              </span>
            )}
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
        {acciones.map((a) => (
          <Button
            key={a.id}
            type="button"
            variant={a.variant}
            aria-busy={ocupado}
            aria-pressed={a.pressed}
            aria-label={a.ariaLabel}
            onClick={a.ejecutar}
          >
            {a.rotulo}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-1 pl-s6 font-chrome text-chrome-xs text-danger-text">
          {error}
        </p>
      )}
      {esDM && onIdentificar && (
        <div className="mt-1 pl-s6">
          <label className="flex items-center gap-2 font-chrome text-chrome-xs text-text">
            <input
              type="checkbox"
              checked={sinIdentificar}
              aria-busy={ocupado}
              onChange={(e) => onIdentificar({ identified: !e.target.checked })}
              className="accent-[var(--accent)]"
            />
            Sin identificar
          </label>
          <p className="pl-6 font-chrome text-chrome-xs text-muted">
            {EXPLICACION_SIN_IDENTIFICAR}
          </p>
          {sinIdentificar && (
            <input
              type="text"
              value={alias}
              placeholder={NOMBRE_SIN_IDENTIFICAR}
              aria-label={`Alias de ${item.name} mientras no está identificado`}
              onChange={(e) => setAlias(e.target.value)}
              onBlur={() => {
                // Fix round 1 (B10) — **sin cambios, sin `PATCH`.** Tabular por el campo sin
                // haber tocado nada disparaba igualmente la escritura (y con ella el recálculo
                // de CA y el parpadeo de `aria-busy`): comparar contra el alias que ya trae la
                // fila es lo que distingue «salió del campo» de «lo cambió y salió».
                const normalizado = alias.trim() === "" ? null : alias.trim();
                if (normalizado === (item.unidentifiedName ?? null)) return;
                onIdentificar({ unidentifiedName: normalizado });
              }}
              className={`mt-1 ml-6 ${fieldControlClass}`}
            />
          )}
        </div>
      )}
      {children}
    </li>
  );
}
