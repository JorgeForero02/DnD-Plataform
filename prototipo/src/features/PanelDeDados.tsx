// Estrato: CONTEXTUAL — no se abre: aparece porque hay que tirar, y se va con
// un gesto. Tres instantes (BG3): antes (se puede intervenir), durante (el dado
// rueda y la traza se compone alrededor), después (el resultado, y la segunda
// oportunidad si se falló). El momento no termina cuando el dado se para:
// termina cuando decides si aceptas el resultado.
import { useEffect, useState } from "react";
import { DadoTridimensional } from "./DadoTridimensional";
import { IconD20, IconRayo, IconCerrar, IconOjoTachado } from "../ui/icons";
import type { Accion } from "../datos-de-ejemplo";

type Momento = "antes" | "durante" | "despues";

// El servidor ya decidió el dado (9). El cliente solo lo representa.
const DADO_SERVIDOR = 9;
const modificadores = [
  { origen: "Dado (d20)", valor: String(DADO_SERVIDOR) },
  { origen: "Destreza", valor: "+4" },
  { origen: "Competencia", valor: "+3" },
];

export function PanelDeDados({
  accion,
  esDM = false,
  onCerrar,
}: {
  accion: Accion;
  esDM?: boolean;
  onCerrar: () => void;
}) {
  const [momento, setMomento] = useState<Momento>("antes");
  const [ventaja, setVentaja] = useState(false);
  const [sinAnimacion, setSinAnimacion] = useState(false);
  const [aCiegas, setACiegas] = useState(false);
  const [rodando, setRodando] = useState(false);

  const bono = ventaja ? 3 : 0;
  const total = DADO_SERVIDOR + 4 + 3 + bono;
  const dificultad = 15;
  const exito = total >= dificultad;
  // A ciegas, el resultado no viaja al jugador que tira: solo lo ve el DM.
  const ocultoParaMi = aCiegas && !esDM;

  function tirar() {
    setMomento("durante");
    setRodando(true);
    const dur = sinAnimacion ? 0 : 1100;
    window.setTimeout(() => {
      setRodando(false);
      setMomento("despues");
    }, dur);
  }

  useEffect(() => {
    setMomento("antes");
  }, [accion]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-s4 pb-s4 anim-surge">
      <div className="w-full max-w-[46rem] rounded-radius-md border border-copper/40 bg-surface/95 px-s5 py-s4 shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-chrome text-chrome-xs uppercase tracking-widest text-copper-text">
              El DM te pide una tirada
            </div>
            <h3 className="font-title text-chrome-lg text-text">
              {accion.nombre} · dificultad media {dificultad}
            </h3>
          </div>
          <div className="flex items-center gap-s3">
            <label className="flex items-center gap-s1 font-chrome text-chrome-xs text-muted">
              <input type="checkbox" checked={sinAnimacion} onChange={(e) => setSinAnimacion(e.target.checked)} />
              Sin animación
            </label>
            {esDM && (
              <label className="flex items-center gap-s1 font-chrome text-chrome-xs text-danger-text">
                <input type="checkbox" checked={aCiegas} onChange={(e) => setACiegas(e.target.checked)} />
                A ciegas
              </label>
            )}
            <button onClick={onCerrar} aria-label="Descartar" className="text-muted hover:text-text">
              <IconCerrar className="size-5" />
            </button>
          </div>
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
                Ayuda de Mira (+1d4)
              </button>
              <button
                onClick={tirar}
                className="ml-auto inline-flex items-center gap-s2 rounded-radius-sm bg-accent px-s4 py-s2 font-chrome text-chrome-base text-bg hover:brightness-110"
              >
                <IconD20 className="size-5" /> Tirar el dado
              </button>
            </div>
          </div>
        )}

        {momento !== "antes" && (
          <div className="mt-s3 flex items-center gap-s5">
            <DadoTridimensional
              valor={total}
              rodando={rodando}
              sinAnimacion={sinAnimacion}
              oculto={ocultoParaMi}
              tono={momento === "despues" ? (exito ? "accent" : "danger") : "copper"}
            />
            {ocultoParaMi ? (
              <div className="flex-1">
                <p className="flex items-center gap-s2 font-title text-chrome-md text-muted">
                  <IconOjoTachado className="size-5" /> Tirada a ciegas
                </p>
                <p className="font-world text-world-base italic text-muted">
                  Has tirado. El resultado solo lo ve el DM.
                </p>
              </div>
            ) : (
              // La traza se compone alrededor del dado mientras cae.
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
                {!rodando && (
                  <div className="flex justify-between pt-s1 font-semibold">
                    <dt className="text-text">Total</dt>
                    <dd className="text-text">{total}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        )}

        {momento === "despues" && (
          <div className="mt-s3 flex items-center justify-between gap-s4 border-t border-muted/20 pt-s3">
            {ocultoParaMi ? (
              <p className="font-world text-world-base italic text-muted">
                Espera a que el DM narre lo que pasa.
              </p>
            ) : (
              <p className={`font-title text-chrome-lg ${exito ? "text-accent-text" : "text-danger-text"}`}>
                {exito ? "El sistema propone: éxito" : "El sistema propone: fallo"}
                <span className="ml-s2 font-chrome text-chrome-xs text-muted">
                  — el DM confirma el desenlace
                </span>
              </p>
            )}
            <div className="flex gap-s2">
              {!exito && !ocultoParaMi && (
                <button
                  onClick={() => { setVentaja(true); tirar(); }}
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
