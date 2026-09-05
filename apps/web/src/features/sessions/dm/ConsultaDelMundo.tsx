import { useState } from "react";
import { Link } from "react-router-dom";
import type { Visibility } from "@dnd/shared";
import { useAllEntities } from "../../entities/hooks";
import { IconoLupa } from "../../../ui/Iconos";
import { fieldControlClass } from "../../../ui/Field";
import { Badge } from "../../../ui/Badge";

// **Ola 0 (2026-09-04): la consulta del mundo, movida sin cambiar de forma.**
//
// Vivía dentro de `MesaDeSesion.tsx`. Es lo que se abre desde el rail con «Mundo» —un cajón, no
// una columna—: *«se entra a leer, se sale volviendo a donde estabas»*. **Va en UN solo sitio**,
// y eso es una regla, no un detalle: montarla a la vez en la columna del DM y en el cajón pinta
// dos buscadores y dos listas del mismo mundo, y una prueba de esta misma casa lo cazó al primer
// intento («Found multiple elements with the role link»).

/**
 * El mundo, aquí, sin cambiar de pantalla.
 *
 * **Este buscador es de cliente y no es control de acceso**: opera sobre una lista que el
 * servidor ya filtró por `canView`, y solo puede quitar de la vista filas que quien mira ya tenía
 * derecho a ver.
 */
export function ConsultaDelMundo({ campaignId, esDm }: { campaignId: string; esDm: boolean }) {
  const { data: entidades } = useAllEntities(campaignId);
  const [busqueda, setBusqueda] = useState("");
  const encontradas = (entidades ?? []).filter((e) =>
    e.name.toLowerCase().includes(busqueda.trim().toLowerCase()),
  );

  return (
    <div className="flex min-h-0 flex-col gap-s3">
      <h2 className="flex shrink-0 items-center gap-s2 font-title text-chrome-md text-text">
        <IconoLupa className="h-4 w-4 text-copper-text" />
        El mundo, sin salir
        <span aria-hidden="true" className="h-px flex-1 bg-copper/40" />
      </h2>

      <input
        aria-label="Buscar en el mundo"
        placeholder="Buscar sin salir…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className={`${fieldControlClass} shrink-0`}
      />
      <ul className="scroll-quiet flex min-h-0 flex-1 flex-col overflow-y-auto">
        {encontradas.slice(0, 12).map((e) => (
          <li
            key={e.id}
            className="flex shrink-0 items-center justify-between gap-s2 border-b border-muted py-1.5 last:border-b-0"
          >
            {/* `Link`, no `<a href>`: un enlace crudo recarga la aplicación entera y se pierde
                el estado de la mesa —lo escrito a medias en el registro, el «ver como», la
                caché— justo en mitad de la partida. */}
            <Link
              to={`/campaigns/${campaignId}/entidades/${e.id}`}
              className="block min-w-0 flex-1 truncate font-chrome text-chrome-sm text-accent-text hover:underline"
            >
              {e.name}
            </Link>
            <Badge visibility={e.visibility as Visibility} />
          </li>
        ))}
        {busqueda && encontradas.length === 0 && (
          <li className="font-chrome text-chrome-xs text-muted">Nada con ese nombre.</li>
        )}
      </ul>
      {esDm && (
        <p className="shrink-0 font-chrome text-chrome-xs text-muted">
          Abre una entrada para revelarla a la mesa desde su propia pantalla.
        </p>
      )}
    </div>
  );
}
