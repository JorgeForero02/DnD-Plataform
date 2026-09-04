// Estrato: CONTEXTUAL — no se abre: aparece porque hay que tirar, y se va con
// un gesto. Tres instantes (BG3): antes (se puede intervenir), durante (el dado
// y los modificadores apilados con su origen), después (resultado + segunda
// oportunidad si se falló). El momento no termina cuando el dado se para:
// termina cuando decides si aceptas el resultado.
import { useState } from "react";
import { IconD20, IconRayo, IconCerrar } from "../ui/icons";
import type { Accion } from "../datos-de-ejemplo";

type Momento = "antes" | "durante" | "despues";

const modificadores = [
  { origen: "Dado (d20)", valor: "9", base: true },
  { origen: "Destreza", valor: "+4" },
  { origen: "Competencia", valor: "+3" },
];

export function PanelDeDados({
  accion,
  onCerrar,
}: {
  accion: Accion;
  onCerrar: () => void;
}) {
  const [momento, setMomento] = useState<Momento>("antes");
  const [ventaja, setVentaja] = useState(false);
  const bono = ventaja ? 3 : 0;
  const total = 9 + 4 + 3 + bono;
  const dificultad = 15;
  const exito = total >= dificultad;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-s4 pb-s4 anim-surge">
      <div className="w-full max-w-[46rem] rounded-radius-md border border-copper/40 bg-surface/95 px-s5 py-s4 shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-chrome text-chrome-xs uppercase tracking-widest text-copper-text">
              El DM te pide una tirada
            </div>
            <h3 className="font-title text-chrome-lg text-text">
              {accion.nombre} · dificultad {dificultad}
            </h3>
          </div>
          <button onClick={onCerrar} aria-label="Descartar" className="text-muted hover:text-text">
            <IconCerrar className="size-5" />
          </button>
        </div>

        {momento === "antes" && (
          <div className="mt-s3">
            <p className="font-world text-world-base text-muted">
              Antes de tirar, tú o tus compañeros podéis intervenir en esta tirada.
            </p>
            <div className="mt-s3 flex flex-wrap items-center gap-s2">
              <button
                onClick={() => setVentaja((v) => !v)}
                aria-pressed={ventaja}
                className={`inline-flex items-center gap-s1 rounded-radius-sm border px-s3 py-s2 font-chrome text-chrome-sm ${
                  ventaja ? "border-accent bg-accent/15 text-accent-text" : "border-muted/40 text-muted hover:text-text"
                }`}
              >
                <IconRayo className="size-4" /> Ventaja por flanqueo (+3)
              </button>
              <button className="rounded-radius-sm border border-copper/50 px-s3 py-s2 font-chrome text-chrome-sm text-copper-text hover:bg-copper/15">
                Guía de Mira (+1d4)
              </button>
              <button
                onClick={() => setMomento("durante")}
                className="ml-auto inline-flex items-center gap-s2 rounded-radius-sm bg-accent px-s4 py-s2 font-chrome text-chrome-base text-bg hover:brightness-110"
              >
                <IconD20 className="size-5" /> Tirar el dado
              </button>
            </div>
          </div>
        )}

        {momento !== "antes" && (
          <div className="mt-s3 flex items-center gap-s5">
            <div
              key={momento}
              className={`anim-dado grid size-24 shrink-0 place-items-center rounded-radius-md border-2 font-data text-chrome-2xl ${
                momento === "despues"
                  ? exito
                    ? "border-accent text-accent-text"
                    : "border-danger text-danger-text"
                  : "border-copper text-copper-text"
              }`}
            >
              {total}
            </div>
            {/* Modificadores apilados junto al dado, con su origen escrito. */}
            <dl className="flex-1 space-y-s1 font-data text-chrome-sm">
              {modificadores.map((m) => (
                <div key={m.origen} className="flex justify-between border-b border-muted/15 pb-s1">
                  <dt className="text-muted">{m.origen}</dt>
                  <dd className="text-text">{m.valor}</dd>
                </div>
              ))}
              {ventaja && (
                <div className="flex justify-between border-b border-muted/15 pb-s1">
                  <dt className="text-accent-text">Ventaja por flanqueo</dt>
                  <dd className="text-accent-text">+3</dd>
                </div>
              )}
              <div className="flex justify-between pt-s1 font-semibold">
                <dt className="text-text">Total</dt>
                <dd className="text-text">{total}</dd>
              </div>
            </dl>
          </div>
        )}

        {momento === "durante" && (
          <div className="mt-s3 flex justify-end">
            <button
              onClick={() => setMomento("despues")}
              className="rounded-radius-sm border border-muted/40 px-s4 py-s2 font-chrome text-chrome-sm text-text hover:border-accent"
            >
              Ver resultado
            </button>
          </div>
        )}

        {momento === "despues" && (
          <div className="mt-s3 flex items-center justify-between gap-s4 border-t border-muted/20 pt-s3">
            <p className={`font-title text-chrome-lg ${exito ? "text-accent-text" : "text-danger-text"}`}>
              {exito ? "El sistema propone: éxito" : "El sistema propone: fallo"}
              <span className="ml-s2 font-chrome text-chrome-xs text-muted">
                — el DM confirma el desenlace
              </span>
            </p>
            <div className="flex gap-s2">
              {!exito && (
                // Segunda oportunidad, con el recurso contado en el propio botón.
                <button
                  onClick={() => setMomento("durante")}
                  className="rounded-radius-sm border border-warning px-s4 py-s2 font-chrome text-chrome-sm text-warning-text hover:bg-warning/15"
                >
                  Usar inspiración (2)
                </button>
              )}
              <button
                onClick={onCerrar}
                className="rounded-radius-sm bg-accent px-s4 py-s2 font-chrome text-chrome-sm text-bg hover:brightness-110"
              >
                Aceptar el resultado
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
