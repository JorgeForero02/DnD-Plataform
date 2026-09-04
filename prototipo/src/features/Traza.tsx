// Estrato: SUPERPUESTO (vive dentro de la hoja/tiradas) — LA TRAZA es la
// protagonista del producto: cada número enseña de dónde sale, paso a paso.
// No es un tooltip de depuración: se despliega y es satisfactorio de mirar.
import { useState } from "react";
import { IconFlechaDcha } from "../ui/icons";
import type { Traza as TrazaTipo } from "../datos-de-ejemplo";

export function TrazaDesplegable({
  etiqueta,
  valor,
  traza,
  destacado = false,
  icono,
}: {
  etiqueta: string;
  valor: string;
  traza: TrazaTipo;
  destacado?: boolean;
  icono?: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div
      className={`rounded-radius-md border bg-bg transition-colors ${
        abierto ? "border-copper" : "border-copper/25"
      } ${destacado ? "p-s3" : "p-s2"}`}
    >
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-s2 text-left"
      >
        {icono && <span className="text-copper-text">{icono}</span>}
        <span className="min-w-0 flex-1">
          <span className="block font-chrome text-chrome-xs uppercase tracking-wide text-muted">
            {etiqueta}
          </span>
          <span className={`font-data ${destacado ? "text-chrome-xl" : "text-chrome-md"} text-text`}>
            {valor}
          </span>
        </span>
        <IconFlechaDcha
          className={`size-4 shrink-0 text-muted transition-transform ${abierto ? "rotate-90" : ""}`}
        />
      </button>
      {abierto && (
        <div className="anim-surge mt-s2 border-t border-copper/20 pt-s2">
          <p className="mb-s2 font-data text-chrome-sm text-copper-text">{traza.formula}</p>
          <dl className="space-y-s1">
            {traza.pasos.map((p, i) => (
              <div key={i} className="flex items-baseline justify-between gap-s3 font-data text-chrome-sm">
                <dt className="text-muted">
                  {p.origen}
                  {p.nota && (
                    <span className="ml-s2 font-chrome text-chrome-xs italic text-muted/70">
                      {p.nota}
                    </span>
                  )}
                </dt>
                <dd className="shrink-0 text-text">{p.valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
