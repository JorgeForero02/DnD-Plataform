import { useId } from "react";
import type { RuleMode } from "@dnd/shared";
import { EXPLICACION_MODO, NOMBRE_MODO } from "./vocabulario";

// Tarea 2A.17 — el modo de la regla.
//
// **Una opción con significado no se esconde en un desplegable** (docs/04-convenciones.md).
// Son dos, quieren decir cosas opuestas, y equivocarse aquí es la diferencia entre que el mundo
// cambie solo delante de la mesa y que te pregunten antes. Van como radios, las dos visibles a
// la vez, y cada una lleva la frase que explica qué hace.
//
// Las frases describen lo que hace `rules-engine.service.ts`; no lo definen. Si algún día
// discrepan, el que miente es el texto.

const MODOS: RuleMode[] = ["AUTOMATIC", "PROPOSAL"];

export function ModoDeRegla({
  value,
  onChange,
  disabled = false,
}: {
  value: RuleMode;
  onChange: (modo: RuleMode) => void;
  disabled?: boolean;
}) {
  const grupo = useId();
  return (
    <fieldset className="rounded-radius-sm border border-muted/60 p-s3">
      <legend className="px-1 font-chrome text-chrome-sm text-text">Cómo actúa</legend>
      <div className="space-y-1">
        {MODOS.map((modo) => {
          const elegido = value === modo;
          return (
            <label
              key={modo}
              className={[
                "flex cursor-pointer items-start gap-s2 rounded-radius-sm border px-s2 py-1.5 transition-colors",
                elegido ? "border-accent bg-accent/10" : "border-transparent hover:bg-surface",
                disabled ? "cursor-not-allowed opacity-70" : "",
              ].join(" ")}
            >
              <input
                type="radio"
                name={grupo}
                value={modo}
                checked={elegido}
                disabled={disabled}
                onChange={() => onChange(modo)}
                className="mt-1 accent-[var(--accent)]"
              />
              <span className="min-w-0">
                <span className="block font-chrome text-chrome-sm text-text">
                  {NOMBRE_MODO[modo]}
                </span>
                <span className="mt-0.5 block font-chrome text-chrome-xs leading-snug text-muted">
                  {EXPLICACION_MODO[modo]}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
