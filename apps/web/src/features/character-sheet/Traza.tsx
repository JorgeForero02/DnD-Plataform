import { useId, useState } from "react";
import type { ReactNode } from "react";
import type { DerivedValue, TraceStep } from "@dnd/shared";
import { NOMBRE_OPERACION_TRAZA, traducirLabelKey } from "./vocabulario";

// Tarea 2A.10 — la traza es la funcionalidad, no un adorno (docs/superpowers/specs/
// 2026-09-02-hoja-5e-design.md, §3). Cada valor calculado se pinta ya resuelto, con un
// desplegable que enseña de dónde sale cada punto: «CA 18 = 14 cota de malla + 2 escudo +
// 2 Destreza».

function signoDe(paso: TraceStep): string {
  if (paso.op === "base") return "";
  return paso.amount >= 0 ? "+" : "−";
}

function PasoDeTraza({ paso }: { paso: TraceStep }) {
  const { texto, conocida } = traducirLabelKey(paso.labelKey);
  return (
    <li className="flex items-baseline justify-between gap-s2 py-0.5">
      <span
        className={[
          "font-chrome text-chrome-xs",
          conocida ? "text-muted" : "text-danger-text",
        ].join(" ")}
        data-untranslated={conocida ? undefined : "true"}
      >
        <span aria-hidden="true" className="mr-1 text-[0.85em] uppercase tracking-wide">
          {NOMBRE_OPERACION_TRAZA[paso.op]}
        </span>
        <span>{texto}</span>
      </span>
      <span className="font-data text-chrome-xs text-text">
        {signoDe(paso)}
        {Math.abs(paso.amount)}
      </span>
    </li>
  );
}

export interface ValorDerivadoProps {
  /** El rótulo en español que ve la mesa: «CA», «Salvación de Destreza». */
  etiqueta: string;
  valor: DerivedValue;
  /** Botón de acción extra (por ejemplo, "Tirar") pegado a la cabecera. */
  accion?: ReactNode;
  /** Compacto = una fila de lista (salvación/habilidad); si no, la casilla grande de combate. */
  variante?: "casilla" | "fila";
}

/**
 * Un valor derivado con su traza desplegable. **`ninguna clave de enumeración llega a
 * pantalla`**: `traducirLabelKey` decide el texto, nunca se imprime `paso.labelKey` a secas
 * fuera de esta función.
 */
export function ValorDerivado({
  etiqueta,
  valor,
  accion,
  variante = "casilla",
}: ValorDerivadoProps) {
  const [abierta, setAbierta] = useState(false);
  const listId = useId();

  if (variante === "fila") {
    return (
      <div className="border-b border-muted/25 py-s2">
        <div className="flex items-center justify-between gap-s2">
          <button
            type="button"
            onClick={() => setAbierta((v) => !v)}
            aria-expanded={abierta}
            aria-controls={listId}
            className="flex flex-1 items-center gap-s2 text-left font-chrome text-chrome-sm text-text hover:text-accent-text"
          >
            <span aria-hidden="true" className="text-muted">
              {abierta ? "▾" : "▸"}
            </span>
            {etiqueta}
          </button>
          <span className="font-data text-chrome-md text-text">
            {valor.total >= 0 ? "+" : ""}
            {valor.total}
          </span>
          {accion}
        </div>
        {abierta && (
          <ul id={listId} className="ml-s5 mt-1 border-l border-muted/40 pl-s3">
            {valor.steps.map((paso, i) => (
              <PasoDeTraza key={i} paso={paso} />
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-radius-sm border border-muted/50 bg-surface px-s3 py-s3 text-center">
      <p className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
        {etiqueta}
      </p>
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        aria-controls={listId}
        className="mt-1 w-full font-data text-chrome-xl leading-none text-text hover:text-accent-text"
      >
        {valor.total}
      </button>
      {accion}
      {abierta && (
        <ul id={listId} className="mt-s2 border-t border-muted/40 pt-s2 text-left">
          {valor.steps.map((paso, i) => (
            <PasoDeTraza key={i} paso={paso} />
          ))}
        </ul>
      )}
    </div>
  );
}
