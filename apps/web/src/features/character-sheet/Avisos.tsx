import type { DerivationWarning } from "@dnd/shared";
import { describirAviso } from "./vocabulario";

// Tarea 2A.10 — "los avisos, que no son errores". `derivationWarningSchema` (@dnd/shared) trae
// código y datos, nunca prosa; `describirAviso` (vocabulario.ts) es la única traducción.

export function Avisos({ warnings }: { warnings: DerivationWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <section
      aria-label="advertencia"
      className="rounded-radius-sm border border-warning bg-surface p-s3"
    >
      <p className="mb-s2 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-warning-text">
        Avisos de la hoja
      </p>
      <ul className="flex flex-col gap-1">
        {warnings.map((w, i) => (
          <li key={i} className="font-chrome text-chrome-sm text-warning-text">
            {describirAviso(w)}
          </li>
        ))}
      </ul>
    </section>
  );
}
