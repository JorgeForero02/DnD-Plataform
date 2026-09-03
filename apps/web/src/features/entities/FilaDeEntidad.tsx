import { Link } from "react-router-dom";
import type { EntityType, Visibility } from "@dnd/shared";
import { Badge } from "../../ui/Badge";
import { IconoDeTipo } from "./iconos";
import { CHECKING_PERMISSIONS } from "../campaigns/PermissionStatus";

// **Una fila de la lista del mundo, con la densidad de la maqueta.**
//
// Antes cada fila era una tarjeta con su propio borde y su propio hueco alrededor, así que
// nueve PNJ ocupaban una pantalla entera y ninguno se leía junto a los demás. La maqueta las
// mete en **un solo marco con filetes entre medias** y les pone el icono del tipo en la
// canaleta izquierda. Se lee como una lista y no como nueve cajas.
//
// Tres cosas que no se tocan al cambiar la maquetación:
//
// - **`display` no puede ser `inline`.** Cuando estas filas pasaron de `<button>` a `<a>`
//   heredaron `display: inline` y el borde se dibujó partido, con toda la suite unitaria en
//   verde. `e2e/campana.spec.ts` lee el `display` calculado; `flex` lo satisface, `inline` no.
// - **El texto de la fila es exactamente el nombre y sus marcas.** Una fila sin etiquetas y
//   sin cuerpo dice «Nombre» + su distintivo de visibilidad y **nada más**: ni un guion, ni un
//   «sin etiquetas». Por eso el icono es `aria-hidden` y no lleva rótulo.
// - **El motivo por el que no puedes editarla** conserva su registro: `--muted` mientras se
//   comprueba el permiso, `--warning-text` cuando ya es un «no puedes».
export function FilaDeEntidad({
  to,
  type,
  name,
  summary,
  visibility,
  tags,
  reason,
}: {
  to: string;
  type: EntityType;
  name: string;
  summary?: string;
  visibility: Visibility;
  tags: string[];
  reason?: string;
}) {
  return (
    <Link
      to={to}
      title={reason}
      className="group flex gap-s3 px-s4 py-s3 text-left font-chrome text-chrome-sm text-text hover:bg-bg focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span className="mt-0.5 text-chrome-lg text-copper-text">
        <IconoDeTipo type={type} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-s2 gap-y-1">
          {/* Maqueta 2026-09-03: el nombre de una fila va en la voz de la interfaz, no en la
              de los títulos. Marcellus es para los titulares de pantalla; treinta filas
              seguidas en versal romana se leen despacio y hacen que la lista pese tanto como
              el título que la encabeza. Semibold basta para que el nombre mande dentro de su
              fila. */}
          <span className="font-chrome text-chrome-md font-semibold text-text group-hover:text-accent-text group-hover:underline">
            {name}
          </span>
          <Badge visibility={visibility} />
        </span>
        {summary && (
          <span className="mt-1 line-clamp-2 block max-w-[80ch] font-world text-chrome-base leading-snug text-muted">
            {summary}
          </span>
        )}
        {tags.length > 0 && (
          <span className="mt-s2 flex flex-wrap items-center gap-s2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-radius-sm border border-muted px-1.5 py-0.5 font-chrome text-chrome-xs text-muted"
              >
                {tag}
              </span>
            ))}
          </span>
        )}
        {reason && (
          <span
            className={`mt-1 block text-chrome-xs ${
              reason === CHECKING_PERMISSIONS ? "text-muted" : "text-warning-text"
            }`}
          >
            {reason}
          </span>
        )}
      </span>
    </Link>
  );
}
