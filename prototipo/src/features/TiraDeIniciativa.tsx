// Estrato: PERMANENTE mientras dura el combate — una tira sobre los retratos.
// Entrar en combate es un momento (§5), no un cambio de configuración.
import { iniciativa } from "../datos-de-ejemplo";

export function TiraDeIniciativa() {
  return (
    <div className="rounded-radius-md border border-warning/40 bg-surface px-s3 py-s2">
      <div className="mb-s2 flex items-center gap-s2">
        <span className="font-title text-chrome-sm uppercase tracking-widest text-warning-text">
          Orden de turnos
        </span>
        <span className="h-px flex-1 bg-warning/30" />
      </div>
      <ol className="scroll-quiet flex items-center gap-s1 overflow-x-auto">
        {iniciativa.map((t) => (
          <li
            key={t.id}
            className={`flex shrink-0 flex-col items-center rounded-radius-sm border px-s3 py-s1 ${
              t.actual
                ? "border-warning bg-warning/15"
                : t.tipo === "enemigo"
                  ? "border-danger/40"
                  : "border-muted/25"
            }`}
          >
            <span
              className={`font-chrome text-chrome-sm ${
                t.actual ? "text-warning-text" : t.tipo === "enemigo" ? "text-danger-text" : "text-text"
              }`}
            >
              {t.nombre}
            </span>
            <span className="font-data text-chrome-xs text-muted tabular-nums">{t.valor}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
