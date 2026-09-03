import type { DerivationWarning } from "@dnd/shared";
import { describirAviso } from "./vocabulario";

// Tarea 2A.10 — "los avisos, que no son errores". `derivationWarningSchema` (@dnd/shared) trae
// código y datos, nunca prosa; `describirAviso` (vocabulario.ts) es la única traducción.
//
// Tarea H4 — el aviso vive sobre la vitela, así que pierde el relleno de cromado (`bg-surface`)
// y conserva su filete de `--warning`, que es lo que lo distingue. El texto pasa a la voz del
// mundo: un aviso es una frase que se lee, no un rótulo de instrumento.

export function Avisos({ warnings }: { warnings: DerivationWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <section aria-label="advertencia" className="rounded-radius-md border border-warning p-s3">
      <p className="mb-s2 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-warning-text">
        Avisos de la hoja
      </p>
      <ul className="flex flex-col gap-1">
        {warnings.map((w, i) => (
          <li key={i} className="font-chrome text-chrome-xs leading-relaxed text-warning-text">
            {describirAviso(w)}
          </li>
        ))}
      </ul>
    </section>
  );
}
