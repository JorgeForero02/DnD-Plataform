import { useState, type ReactNode } from "react";
import { IconoFlechaIzquierda } from "../../../ui/Iconos";

// El registro en vivo, como un cajón inferior plegable tipo chat, con contador de líneas nuevas.
// `eventos` llega más reciente primero (reincorporarse.ts): «nuevas desde que plegué» es la
// posición, en la lista de AHORA, del id que estaba arriba cuando se plegó — o `eventos.length`
// si ese id ya no aparece (paginado o descartado).
export function CajonDelRegistro({
  eventos,
  children,
}: {
  eventos: { id: string }[];
  children: ReactNode;
}) {
  const [plegado, setPlegado] = useState(false);
  const [idAlPlegar, setIdAlPlegar] = useState<string | null>(null);
  const nuevas =
    plegado && idAlPlegar !== null
      ? (() => {
          const i = eventos.findIndex((e) => e.id === idAlPlegar);
          return i === -1 ? eventos.length : i;
        })()
      : 0;

  const alPulsar = () => {
    if (plegado) {
      setPlegado(false);
      setIdAlPlegar(null);
    } else {
      setPlegado(true);
      setIdAlPlegar(eventos[0]?.id ?? null);
    }
  };

  return (
    <section
      aria-label="Registro en vivo"
      className={["flex min-h-0 flex-col", plegado ? "" : "min-h-[14rem]"].join(" ")}
    >
      <button
        type="button"
        aria-expanded={!plegado}
        aria-label={plegado ? "Desplegar el registro" : "Plegar el registro"}
        onClick={alPulsar}
        className="flex items-center gap-s2 border-t border-muted bg-surface px-s3 py-s1 font-chrome text-chrome-xs text-muted hover:text-text"
      >
        <IconoFlechaIzquierda
          className={["h-4 w-4 transition-transform", plegado ? "-rotate-90" : "rotate-90"].join(
            " ",
          )}
        />
        Registro
        {nuevas > 0 && (
          <span
            className="rounded-full bg-accent px-1.5 font-data text-bg"
            aria-label={`${nuevas} líneas nuevas`}
          >
            {nuevas}
          </span>
        )}
      </button>
      {!plegado && <div className="min-h-0 flex-1">{children}</div>}
    </section>
  );
}
