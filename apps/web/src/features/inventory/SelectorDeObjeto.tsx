import { useMemo, useState } from "react";
import { NOMBRE_SIN_IDENTIFICAR, type ContentRefInput, type ItemLocation } from "@dnd/shared";
import { Button, fieldControlClass } from "../../ui";
import { ApiError } from "../../lib/api";
import { useCampaignItems } from "../campaign-items/hooks";
import { useAddInventoryItem, useCatalogItems } from "./hooks";
import { IconoAnadir, IconoBuscar, IconoObjeto } from "./iconos";
import {
  EXPLICACION_SIN_IDENTIFICAR,
  NOMBRE_PROCEDENCIA,
  NOMBRE_ZONA,
  type ProcedenciaObjeto,
} from "./vocabulario";

// Carril B4 — lo que une el catálogo (B2) y el inventario (B1): elegir un objeto y añadirlo.
// Pantalla 22 del prototipo, revisión obligatoria: una sola lista con las dos procedencias
// marcadas, búsqueda de cliente (un filtro de pantalla, nunca control de acceso — la lista ya
// llegó filtrada por `canView` desde el servidor), cantidad y zona, y el botón nunca se
// deshabilita: un rechazo se explica en línea sin borrar lo elegido.

interface FilaDelSelector {
  /** Clave de React y de filtrado — no viaja al servidor. */
  id: string;
  name: string;
  procedencia: ProcedenciaObjeto;
  ref: ContentRefInput;
}

function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Algo ha ido mal. Vuelve a intentarlo.";
}

const ZONAS_ELEGIBLES: ItemLocation[] = ["CARRIED", "EQUIPPED", "STORED"];

export function SelectorDeObjeto({
  campaignId,
  characterId,
  /**
   * Fix round 2 (M3) — **el botín también puede nacer sin identificar, desde la pantalla**.
   * Hasta este arreglo, el servidor ya aceptaba `identified`/`unidentifiedName` en el `POST`
   * (fix round 1) pero ningún camino de la interfaz los mandaba: el DM entregaba el objeto con
   * su nombre real y solo podía esconderlo DESPUÉS, con un segundo gesto — el `ITEM_ADDED` de
   * la entrega ya había dicho el nombre real. El control solo se ofrece al DM, en las dos
   * pantallas que montan este selector (`PaginaDeInventario.tsx`, `DarObjeto.tsx`); esconderlo
   * no es la autorización real, que sigue en el servidor (`inventory.service.ts`, 403 al
   * dueño).
   */
  esDM,
}: {
  campaignId: string;
  characterId: string;
  esDM: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [elegido, setElegido] = useState<FilaDelSelector | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [ubicacion, setUbicacion] = useState<ItemLocation>("CARRIED");
  const [sinIdentificar, setSinIdentificar] = useState(false);
  const [alias, setAlias] = useState("");

  const catalogo = useCatalogItems({ enabled: abierto });
  // La lista de la campaña ya llega filtrada por `canView` — no se reimplementa ese filtro aquí,
  // solo se pinta lo que el servidor decidió mandar.
  const objetosCampaña = useCampaignItems(campaignId, { enabled: abierto });
  const añadir = useAddInventoryItem(campaignId, characterId);

  const filas = useMemo<FilaDelSelector[]>(() => {
    const delCatalogo: FilaDelSelector[] = (catalogo.data ?? []).map((item) => ({
      id: item.ref,
      name: item.name,
      procedencia: "SRD",
      ref: { source: "SRD", key: item.ref.replace(/^SRD:/, "") },
    }));
    const deLaCampaña: FilaDelSelector[] = (objetosCampaña.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      procedencia: "CAMPAIGN",
      ref: { source: "CAMPAIGN", id: item.id },
    }));
    return [...delCatalogo, ...deLaCampaña].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [catalogo.data, objetosCampaña.data]);

  const filtradas = useMemo(() => {
    const buscado = texto.trim().toLowerCase();
    if (!buscado) return filas;
    return filas.filter((fila) => fila.name.toLowerCase().includes(buscado));
  }, [filas, texto]);

  const cargando = catalogo.isPending || (abierto && objetosCampaña.isPending);

  if (!abierto) {
    return (
      <Button type="button" variant="secondary" onClick={() => setAbierto(true)} className="mb-s4">
        <IconoAnadir /> Añadir objeto
      </Button>
    );
  }

  const confirmarAlta = () => {
    if (!elegido) return;
    añadir.mutate(
      {
        ref: elegido.ref,
        quantity: cantidad,
        location: ubicacion,
        // Fix round 2 (M3) — solo el DM manda estos dos campos, y solo cuando ha marcado la
        // casilla: para cualquier otro caso ninguno de los dos viaja, exactamente como antes de
        // este arreglo (un objeto nace identificado por defecto).
        ...(esDM && sinIdentificar
          ? { identified: false, unidentifiedName: alias.trim() === "" ? null : alias.trim() }
          : {}),
      },
      {
        onSuccess: () => {
          setElegido(null);
          setTexto("");
          setCantidad(1);
          setUbicacion("CARRIED");
          setSinIdentificar(false);
          setAlias("");
        },
      },
    );
  };

  return (
    <section
      aria-label="Añadir objeto"
      className="mb-s4 rounded-radius-sm border border-muted bg-surface p-s4"
    >
      <div className="mb-s3 flex items-center justify-between gap-s2">
        <h3 className="font-chrome text-chrome-sm font-semibold text-text">Añadir objeto</h3>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setAbierto(false);
            setElegido(null);
          }}
        >
          Cerrar
        </Button>
      </div>

      <label className="mb-s3 flex items-center gap-s2 rounded-radius-sm border border-muted px-s2 py-1.5">
        <IconoBuscar className="shrink-0 text-muted" />
        <span className="sr-only">Buscar objeto por nombre</span>
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar objeto por nombre…"
          className="w-full border-none bg-transparent font-chrome text-chrome-sm text-text outline-none"
        />
      </label>

      {cargando ? (
        <p className="font-chrome text-chrome-sm text-muted">Cargando el catálogo…</p>
      ) : filtradas.length === 0 ? (
        <p className="font-chrome text-chrome-sm text-muted">
          Ningún objeto coincide con «{texto}».
        </p>
      ) : (
        <ul className="mb-s3 max-h-64 overflow-y-auto rounded-radius-sm border border-muted">
          {filtradas.map((fila) => {
            const seleccionadaFila =
              elegido?.procedencia === fila.procedencia && elegido?.id === fila.id;
            return (
              <li key={`${fila.procedencia}:${fila.id}`}>
                <button
                  type="button"
                  aria-pressed={seleccionadaFila}
                  onClick={() => setElegido(fila)}
                  className={[
                    "flex w-full items-center gap-s2 border-b border-muted px-s3 py-s2 text-left last:border-b-0",
                    seleccionadaFila
                      ? "bg-[color:var(--accent-tint)]"
                      : "hover:bg-bg focus-visible:bg-bg",
                  ].join(" ")}
                >
                  <IconoObjeto className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate font-chrome text-chrome-sm text-text">
                    {fila.name}
                  </span>
                  <span
                    className={[
                      "shrink-0 rounded-radius-sm border px-1.5 py-px font-chrome text-chrome-xs",
                      fila.procedencia === "CAMPAIGN"
                        ? "border-accent text-accent-text"
                        : "border-muted text-muted",
                    ].join(" ")}
                  >
                    {NOMBRE_PROCEDENCIA[fila.procedencia]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {elegido && (
        <div className="flex flex-col gap-s3 border-t border-muted pt-s3">
          <p className="font-chrome text-chrome-sm text-text">
            Elegido: <strong>{elegido.name}</strong>{" "}
            <span className="text-chrome-xs text-muted">
              ({NOMBRE_PROCEDENCIA[elegido.procedencia]})
            </span>
          </p>

          <div className="flex flex-wrap items-end gap-s3">
            <label className="flex flex-col gap-1">
              <span className="font-chrome text-chrome-xs text-muted">Cantidad</span>
              <input
                type="number"
                min={1}
                max={9999}
                value={cantidad}
                onChange={(e) =>
                  setCantidad(Math.max(1, Math.min(9999, Number(e.target.value) || 1)))
                }
                className={`${fieldControlClass} w-24`}
              />
            </label>

            <fieldset className="rounded-radius-sm border border-muted p-s2">
              <legend className="px-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
                Zona
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {ZONAS_ELEGIBLES.map((zona) => (
                  <label
                    key={zona}
                    className={[
                      "flex cursor-pointer items-center gap-1.5 rounded-radius-sm border px-2 py-1 font-chrome text-chrome-xs transition-colors",
                      ubicacion === zona
                        ? "border-accent bg-[color:var(--accent-tint)] text-text"
                        : "border-transparent text-muted hover:bg-bg",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="zona-selector-objeto"
                      value={zona}
                      checked={ubicacion === zona}
                      onChange={() => setUbicacion(zona)}
                      className="accent-[var(--accent)]"
                    />
                    {NOMBRE_ZONA[zona]}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* **Nunca se deshabilita** (docs/04-convenciones.md, regla del carril): un
                rechazo del servidor conserva lo elegido y se explica debajo, en línea. */}
            <Button type="button" variant="primary" onClick={confirmarAlta}>
              <IconoAnadir /> Añadir
            </Button>
          </div>

          {/* Fix round 2 (M3) — solo el DM ve este control: puede entregar el objeto ya sin
              identificar, en el mismo gesto de dárselo, en vez de un segundo `PATCH` después. */}
          {esDM && (
            <div className="border-t border-muted pt-s3">
              <label className="flex items-center gap-2 font-chrome text-chrome-sm text-text">
                <input
                  type="checkbox"
                  checked={sinIdentificar}
                  onChange={(e) => setSinIdentificar(e.target.checked)}
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
                  aria-label={`Alias de ${elegido.name} mientras no está identificado`}
                  onChange={(e) => setAlias(e.target.value)}
                  className={`mt-1 ml-6 ${fieldControlClass}`}
                />
              )}
            </div>
          )}

          {añadir.isError && (
            <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
              {mensajeDeError(añadir.error)}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
