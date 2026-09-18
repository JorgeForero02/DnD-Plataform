import type { ReactNode } from "react";
import { useState } from "react";
import type { SpellbookEntry } from "@dnd/shared";
import { NOMBRE_ESCUELA, NOMBRE_NIVEL_CONJURO } from "../../dominio/conjuros";
import { Button, type ButtonVariant } from "../../ui/Button";
import { useSpellDetail } from "./hooks";

// Tarea 6 de 3A.2 — la fila de un conjuro, reusada en las dos zonas de la pestaña («Listos para
// lanzar» y «Disponibles»): nombre, nivel · escuela, chips de concentración/ritual, y hasta una
// acción. Mismo patrón que `features/inventory/FilaObjeto.tsx`.
//
// **`<details>`, nunca HTML.** Pulsar el nombre despliega la prosa del SRD — pedida SOLO al
// abrir (`useSpellDetail`, `enabled: abierto`), porque `list()` ya no la trae (ronda de arreglo 1
// de la Task 3: 204 conjuros con su prosa pesaban ~460 KB por petición). El cuerpo se pinta como
// texto plano, nunca `dangerouslySetInnerHTML`.
//
// **La acción vive FUERA del `<summary>`.** Un botón dentro de un `<summary>` recibiría el clic
// del navegador que abre/cierra el desplegable antes de que `stopPropagation` pudiera evitarlo en
// todos los navegadores — más simple y más fiable ponerla al lado, en su propia fila.

export interface AccionDeFila {
  rotulo: string;
  onClick: () => void;
  ocupado?: boolean;
  variant?: ButtonVariant;
}

export function FilaDeConjuro({
  campaignId,
  characterId,
  entrada,
  accion,
  accionPrincipal,
  fueraDelLibro,
  error,
}: {
  campaignId: string;
  characterId: string;
  entrada: SpellbookEntry;
  /** La única acción de esta fila: «Quitar»/«Dejar de preparar» en «Listos», o el verbo de
   *  aprendizaje que toque en «Disponibles» («Preparar», «Añadir al libro», «Aprender», «Conocer»). */
  accion?: AccionDeFila;
  /** El hueco de la Task 7: el botón «Lanzar». Vacío hasta que esa tarea lo llene. */
  accionPrincipal?: ReactNode;
  /** Mago: un conjuro de su lista que no está en su libro. Nunca desaparece — se ve y se marca. */
  fueraDelLibro?: boolean;
  /** El rechazo del servidor para ESTA fila, en español tal cual llegó — nunca en un flotante. */
  error?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const detalle = useSpellDetail(campaignId, characterId, entrada.key, { enabled: abierto });

  return (
    <li className="border-b border-muted py-s2 last:border-b-0">
      <details onToggle={(e) => setAbierto((e.target as HTMLDetailsElement).open)}>
        {/* **Una sola línea a ≥ 1024 px (`lg:`)** (regla vinculante de interfaz,
            `docs/04-convenciones.md` §maquetación) — arreglo previo a la Task 7 (paso 0b): a
            1280 px cada fila envolvía su propio botón a una segunda línea, doblando la altura de
            «Disponibles», y `jsdom` no lo había visto porque una suite sin navegador no maqueta.
            `lg:flex-nowrap` en el `<summary>` para que nada de esto envuelva por su cuenta; el
            nombre lleva `min-w-0 flex-1 truncate` (el `min-w-0` es lo que deja que un hijo `flex`
            se encoja por debajo de su contenido — sin él, `truncate` no tiene nada que recortar,
            y `flex-1` es lo que ya empuja el resto a la derecha, sin un `<span className="flex-1"
            />` de relleno aparte) y los chips llevan `shrink-0 whitespace-nowrap` para no
            partirse a media palabra. A 390 px sí puede envolver (`flex-wrap` por defecto): nadie
            pidió una sola línea en móvil, y forzarla ahí habría exigido recortar el nombre a la
            fuerza. */}
        <summary className="flex flex-wrap cursor-pointer list-none items-baseline gap-x-s3 gap-y-1 lg:flex-nowrap [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1 truncate font-chrome text-chrome-sm text-text hover:text-accent-text hover:underline">
            {entrada.nameEs}
          </span>
          <span className="shrink-0 whitespace-nowrap font-chrome text-chrome-xs text-muted">
            {NOMBRE_NIVEL_CONJURO(entrada.level)} · {NOMBRE_ESCUELA[entrada.school]}
          </span>
          {entrada.concentration && (
            <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-radius-sm border border-muted px-s2 py-0.5 font-chrome text-chrome-xs text-muted">
              Concentración
            </span>
          )}
          {entrada.ritual && (
            <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-radius-sm border border-muted px-s2 py-0.5 font-chrome text-chrome-xs text-muted">
              Ritual
            </span>
          )}
          {fueraDelLibro && (
            <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-radius-sm border border-muted px-s2 py-0.5 font-chrome text-chrome-xs text-muted">
              Fuera del libro
            </span>
          )}
        </summary>
        <div className="mt-s2 max-w-[70ch] font-chrome text-chrome-xs leading-relaxed text-muted">
          {detalle.isLoading && <p>Cargando…</p>}
          {detalle.isError && <p role="alert">No se ha podido leer este conjuro.</p>}
          {detalle.data && (
            <>
              <p>{detalle.data.textEs ?? detalle.data.textEn}</p>
              {detalle.data.higherLevelsEs && (
                <p className="mt-s2">
                  <strong className="text-text">A niveles superiores. </strong>
                  {detalle.data.higherLevelsEs}
                </p>
              )}
            </>
          )}
        </div>
      </details>
      {(accion || accionPrincipal) && (
        <div className="mt-s1 flex justify-end gap-s2">
          {accion && (
            <Button
              type="button"
              variant={accion.variant ?? "secondary"}
              aria-busy={accion.ocupado}
              onClick={accion.onClick}
            >
              {accion.rotulo}
            </Button>
          )}
          {accionPrincipal}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1 font-chrome text-chrome-xs text-danger-text">
          {error}
        </p>
      )}
    </li>
  );
}
