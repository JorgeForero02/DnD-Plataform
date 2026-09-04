// Estrato: PERMANENTE (vive dentro del hilo) — no es un cuadro aparte.
// La tirada aparece como un momento tipográfico dentro del propio hilo,
// con el desglise desplegable (regla 10.1: cada número enseña de dónde sale).
import { useState } from "react";
import { IconD20, IconFlechaDcha } from "../ui/icons";
import type { MensajeHilo } from "../datos-de-ejemplo";

export function TiradaIncrustada({ t }: { t: NonNullable<MensajeHilo["tirada"]> }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="my-s2 border-y border-copper/25 py-s3">
      <div className="flex items-center gap-s3">
        <span className={t.exito ? "text-accent-text" : "text-danger-text"}>
          <IconD20 className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-chrome text-chrome-xs uppercase tracking-wide text-muted">
            {t.quien} · {t.prueba}
            {t.dificultad != null && ` · dificultad ${t.dificultad}`}
          </div>
          <div className="flex items-baseline gap-s2">
            <span
              className={`font-data text-chrome-xl ${t.exito ? "text-accent-text" : "text-danger-text"}`}
            >
              {t.resultado}
            </span>
            <span
              className={`font-title text-chrome-md ${t.exito ? "text-accent-text" : "text-danger-text"}`}
            >
              {t.exito ? "Éxito" : "Fallo"}
            </span>
          </div>
        </div>
        <button
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          className="inline-flex items-center gap-s1 rounded-radius-sm border border-muted/30 px-s2 py-s1 font-chrome text-chrome-xs text-muted hover:text-text"
        >
          <IconFlechaDcha className={`size-3.5 transition-transform ${abierto ? "rotate-90" : ""}`} />
          De dónde sale
        </button>
      </div>
      {abierto && (
        <dl className="anim-surge mt-s2 grid grid-cols-[1fr_auto] gap-x-s4 gap-y-s1 border-l-2 border-copper/40 pl-s3 font-data text-chrome-sm">
          {t.desglose.map((d, i) => (
            <div key={i} className="col-span-2 grid grid-cols-subgrid">
              <dt className="text-muted">{d.origen}</dt>
              <dd className="text-right text-text">{d.valor}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
