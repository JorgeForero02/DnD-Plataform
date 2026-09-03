import type { Visibility } from "@dnd/shared";
import { Badge } from "../../ui";
import type { AplicacionDeEfecto } from "./api";
import { IconoCadena } from "./iconos";
import {
  describirDisparador,
  describirEfecto,
  visibilidadDeEfecto,
  type NombreDeFicha,
} from "./vocabulario";

// Tarea 2A.17 — la lista de efectos de un disparo, con su antes y su después.
//
// Se usa en los tres sitios que enseñan efectos (ensayo en seco, propuestas y traza), y por eso
// vive aparte: la frase que describe un efecto se escribe una sola vez.
//
// El nombre legible de un nivel de visibilidad lo pone `ui/Badge.tsx`, que es su único dueño en
// toda la aplicación; aquí se acompaña la frase con la insignia en vez de copiar sus cinco
// etiquetas a un diccionario propio.

function comoTexto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "boolean") return valor ? "puesta" : "quitada";
  if (typeof valor === "string" || typeof valor === "number") return String(valor);
  return JSON.stringify(valor);
}

export function ResumenDeEfectos({
  efectos,
  nombreFicha,
  vacio,
}: {
  efectos: AplicacionDeEfecto[];
  nombreFicha: NombreDeFicha;
  vacio: string;
}) {
  if (efectos.length === 0) {
    return <p className="mt-s2 font-chrome text-chrome-xs text-muted">{vacio}</p>;
  }
  return (
    <ul className="mt-s2 space-y-s2">
      {efectos.map((aplicacion, i) => {
        const antes = comoTexto(aplicacion.before);
        const despues = comoTexto(aplicacion.after);
        const visibilidad = visibilidadDeEfecto(aplicacion.effect);
        return (
          <li key={i} className="border-l-2 border-copper pl-s2">
            <p className="flex flex-wrap items-baseline gap-s2 font-chrome text-chrome-sm text-text">
              <span>{describirEfecto(aplicacion.effect, nombreFicha)}</span>
              {visibilidad && <Badge visibility={visibilidad as Visibility} />}
            </p>
            {antes !== null && despues !== null && (
              <p className="font-data text-chrome-xs text-muted">
                antes: {antes} · después: {despues}
              </p>
            )}
            {aplicacion.chainEvent && (
              <p className="flex items-center gap-1 font-chrome text-chrome-xs text-muted">
                <IconoCadena />
                Encadena: {describirDisparador(aplicacion.chainEvent, nombreFicha)}
              </p>
            )}
            {aplicacion.canView?.applicable && (
              <p className="font-chrome text-chrome-xs text-muted">
                Comprobado con la matriz de visibilidad del servidor: quien lo disparó{" "}
                {aplicacion.canView.result ? "sí" : "no"} podría verlo.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
