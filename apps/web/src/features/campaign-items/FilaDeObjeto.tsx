import { IconoDeObjeto } from "./iconos";
import { NOMBRE_PROCEDENCIA, subtituloDeObjeto, type ProcedenciaDeObjeto } from "./vocabulario";
import type { CampaignItem } from "./api";

// Carril B2 — la fila del catálogo, calcada de la maqueta (pantalla 22): icono dibujado,
// nombre, subtítulo en tipografía de cifras y, a la derecha, la marca de procedencia. La
// visibilidad NO se pinta aquí — a diferencia de `FilaDeEntidad`, un objeto de campaña solo lo
// ve quien puede verlo (la lista ya llega filtrada por `canView`), así que no hay nada que
// distinguir dentro de la fila; y un jugador ni ve DM_ONLY para empezar.
export function FilaDeObjeto({
  item,
  procedencia,
  onSelect,
}: {
  item: CampaignItem;
  /** «catálogo» o «de la campaña» — el SRD todavía no viaja por este endpoint (ver informe del
   * carril), así que hoy siempre llega CAMPAIGN, pero el componente ya sabe pintar las dos. */
  procedencia: ProcedenciaDeObjeto;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-center gap-s3 border-b border-muted px-s4 py-s3 text-left transition-colors last:border-b-0 hover:bg-surface focus-visible:bg-surface focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span className="text-chrome-lg text-copper-text">
        <IconoDeObjeto kind={item.kind} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-chrome text-chrome-md font-semibold text-text group-hover:text-accent-text group-hover:underline">
          {item.name}
        </span>
        <span className="mt-0.5 block font-data text-chrome-sm text-muted">
          {subtituloDeObjeto(item)}
        </span>
      </span>
      <span
        className={[
          "shrink-0 rounded-radius-sm border px-2 py-0.5 font-chrome text-chrome-xs",
          procedencia === "CAMPAIGN" ? "border-copper text-copper-text" : "border-muted text-muted",
        ].join(" ")}
      >
        {NOMBRE_PROCEDENCIA[procedencia]}
      </span>
    </button>
  );
}
