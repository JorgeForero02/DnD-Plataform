import type { ReactNode } from "react";
import type { InventoryRow } from "./api";
import type { AccionDeObjeto } from "./accionesDeObjeto";
import { Button } from "../../ui/Button";
import { EmptyState } from "../../ui/EmptyState";
import { DatoEnCifras, datoDeObjeto } from "./FilaObjeto";
import { IconoSinIdentificar } from "./iconos";
import { formatearKg } from "./peso";
import { efectoInactivoPorSintonizacion, idDeEfectoInactivo } from "./sintonizacion";
import {
  ETIQUETA_EFECTO_INACTIVO,
  ETIQUETA_SIN_IDENTIFICAR,
  ETIQUETA_SINTONIZADO,
  EXPLICACION_EFECTO_INACTIVO,
  NOMBRE_ZONA,
  subtituloDeObjeto,
} from "./vocabulario";

// Tarea 9 (spec 2026-09-11, «la hoja a página completa») — el panel de detalle de la pestaña
// Objetos a página: lo que la fila de una línea no puede enseñar (la descripción, el peso por
// unidad, si pide sintonización) y **las mismas acciones que la fila**. La lista de botones
// llega hecha (`accionesDeObjeto`, un solo sitio) para que el detalle y la fila no puedan
// ofrecer cosas distintas.

type Identificar = (input: { identified?: boolean; unidentifiedName?: string | null }) => void;

export function DetalleDeObjeto({
  row,
  acciones,
  esDM,
  onIdentificar,
  ocupado = false,
  error,
  children,
}: {
  /** La fila seleccionada, o `null` si la lista visible está vacía. */
  row: InventoryRow | null;
  /** Las acciones de esa fila, ya construidas: `accionesDeObjeto(row, manosDe(row))`. */
  acciones: AccionDeObjeto[];
  /** Solo el DM ve el alias real (D-CF-15); la autorización vive en el servidor. */
  esDM: boolean;
  /** Identifica el objeto desde aquí. Ausente si `esDM` es falso. */
  onIdentificar?: Identificar;
  /** La fila tiene una escritura en vuelo: los botones lo anuncian igual que en la lista. */
  ocupado?: boolean;
  /**
   * HP-2 — el rechazo del servidor para esta fila, tal cual llegó. Antes se pintaba solo bajo la
   * fila, y quien pulsaba «Sintonizar» aquí veía cómo el botón volvía a su sitio sin explicación:
   * la respuesta a un botón se lee junto al botón.
   */
  error?: string;
  /**
   * Lo que la acción principal despliega cuando necesita una decisión más —hoy, `ElegirMano`—.
   * A página la pregunta vive aquí y no bajo la fila, en un solo sitio (`PaginaDeInventario`).
   */
  children?: ReactNode;
}) {
  return (
    <aside
      aria-label="detalle del objeto"
      // Anexo #6/#17, medido (`e2e/espacios.spec.ts`): `--tira-fija-top` es el escalón que
      // declara `AppShell` (el alto de SU cabecera), no el de la banda de combate que vive
      // encima de este panel — sumar solo el escalón dejaba el panel 60px metido bajo la banda.
      // `--banda-fija-alto` es el alto REAL de esa banda, medido por `Cabecera.tsx` con
      // `ResizeObserver` y publicado por `HojaCalculada.tsx`.
      className="rounded-radius-sm border border-muted bg-surface p-s4 lg:sticky lg:top-[calc(var(--tira-fija-top,0px)+var(--banda-fija-alto,0px)+var(--space-4))]"
    >
      {row === null ? (
        <EmptyState title="Elige un objeto">
          La lista de la izquierda enseña su detalle aquí.
        </EmptyState>
      ) : (
        <Contenido
          row={row}
          acciones={acciones}
          esDM={esDM}
          onIdentificar={onIdentificar}
          ocupado={ocupado}
          error={error}
        >
          {children}
        </Contenido>
      )}
    </aside>
  );
}

function Contenido({
  row,
  acciones,
  esDM,
  onIdentificar,
  ocupado,
  error,
  children,
}: {
  row: InventoryRow;
  acciones: AccionDeObjeto[];
  esDM: boolean;
  onIdentificar?: Identificar;
  ocupado: boolean;
  error?: string;
  children?: ReactNode;
}) {
  const { item } = row;
  const dato = datoDeObjeto(item);
  const hayDato = dato.mundano !== null || dato.magico !== null;
  // HP-9a: mismo predicado que la fila (`sintonizacion.ts`); aquí además cabe la frase entera.
  const efectoInactivo = efectoInactivoPorSintonizacion(row);
  // Distinto del `id` de la fila (`detalle-`): las dos pueden estar en la misma página.
  const idExplicacion = idDeEfectoInactivo(`detalle-${row.id}`);
  // D-CF-15: `undefined` cuenta como identificado, igual que en la fila.
  const sinIdentificar = item.identified === false;
  // "x2", no "×2": el signo de multiplicación está en la lista de glifos prohibidos
  // (`ui/__tests__/Iconos.test.tsx`).
  const cantidad = row.quantity > 1 ? ` x${row.quantity}` : "";

  return (
    <div className="flex flex-col gap-s3">
      <header>
        <h3 className="font-title text-chrome-lg text-text">
          {item.name}
          {cantidad}
          {/* HP-8: el mismo distintivo que la fila, junto al nombre. */}
          {row.attuned && (
            <span className="ml-2 inline-flex items-center align-middle font-chrome text-chrome-xs text-accent-text">
              {ETIQUETA_SINTONIZADO}
            </span>
          )}
        </h3>
        <p className="font-chrome text-chrome-xs text-muted">
          {subtituloDeObjeto(
            item.kind,
            row.location === "EQUIPPED" ? (row.slot ?? undefined) : undefined,
          )}
          {" · "}
          {NOMBRE_ZONA[row.location]}
          {row.storedAt ? ` · ${row.storedAt}` : ""}
        </p>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-s3 gap-y-s1 font-chrome text-chrome-sm">
        {hayDato && (
          <>
            <dt className="text-muted">Dato</dt>
            <dd className="inline-flex min-w-0 flex-wrap items-baseline gap-1 font-data text-accent-text">
              <DatoEnCifras dato={dato} inactivo={efectoInactivo} explicacionId={idExplicacion} />
            </dd>
          </>
        )}
        <dt className="text-muted">Peso</dt>
        <dd className="font-data text-text">
          <span>{formatearKg(item.weightOz)}</span>
          {row.quantity > 1 && (
            <span className="text-muted">
              {" por unidad · "}
              <span className="text-text">{formatearKg(item.weightOz * row.quantity)}</span>
              {" en total"}
            </span>
          )}
        </dd>
      </dl>

      {/* HP-9a: por qué el número de arriba va tachado — la misma verdad que el aviso
          `item_not_attuned` de la hoja, dicha donde está el botón «Sintonizar». */}
      {efectoInactivo && (
        <p id={idExplicacion} className="font-chrome text-chrome-xs text-muted">
          <span className="text-text">{ETIQUETA_EFECTO_INACTIVO}</span>
          {". "}
          {EXPLICACION_EFECTO_INACTIVO}
        </p>
      )}

      {/* HP-8: el estado ya lo dice el distintivo del título; aquí solo queda el requisito. */}
      {item.requiresAttunement && (
        <p className="font-chrome text-chrome-xs text-text">Requiere sintonización</p>
      )}

      {sinIdentificar && (
        <p className="inline-flex items-center gap-1 font-chrome text-chrome-xs text-muted">
          <IconoSinIdentificar />
          {esDM && item.unidentifiedName
            ? `${ETIQUETA_SIN_IDENTIFICAR} · el jugador lo ve como «${item.unidentifiedName}»`
            : ETIQUETA_SIN_IDENTIFICAR}
        </p>
      )}

      {item.description && <p className="font-world text-text">{item.description}</p>}

      <div className="flex flex-wrap gap-s2">
        {acciones.map((a) => (
          <Button
            key={a.id}
            type="button"
            variant={a.variant}
            aria-busy={ocupado}
            aria-label={a.ariaLabel}
            onClick={a.ejecutar}
          >
            {a.rotulo}
          </Button>
        ))}
        {/* El DM identifica desde donde lee la descripción. Es la misma mutación que la casilla
            de la fila, no una segunda regla; el servidor sigue siendo quien dice que no (403). */}
        {esDM && onIdentificar && sinIdentificar && (
          <Button
            type="button"
            variant="ghost"
            aria-busy={ocupado}
            aria-label={`Identificar ${item.name}`}
            onClick={() => onIdentificar({ identified: true })}
          >
            Identificar
          </Button>
        )}
      </div>
      {/* El mismo `role="alert"` y el mismo texto que bajo la fila (`FilaObjeto.tsx`). */}
      {error && (
        <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
          {error}
        </p>
      )}
      {children}
    </div>
  );
}
