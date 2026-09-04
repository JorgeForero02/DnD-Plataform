// Estrato: PERMANENTE — los retratos no tienen botón de cerrar: nunca se quitan.
// Jugador: sobre el retrato de OTRO no hay botones (no puedes hacerle nada).
// DM: cada ficha lleva mandos (daño, condición, abrir).
import { Badge } from "../ui/Badge";
import { IconEspada, IconGarra, IconOjo, IconCorazon, IconEscudo } from "../ui/icons";
import type { Estado } from "../datos-de-ejemplo";

function BarraVida({ pv, pvMax }: { pv: number; pvMax: number }) {
  const pct = Math.max(0, Math.min(100, (pv / pvMax) * 100));
  const tono = pct <= 25 ? "bg-danger" : pct <= 55 ? "bg-warning" : "bg-accent";
  return (
    <div className="flex items-center gap-s1">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg">
        <div className={`h-full ${tono}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-data text-chrome-xs text-muted tabular-nums">
        {pv}/{pvMax}
      </span>
    </div>
  );
}

function Estados({ estados }: { estados: Estado[] }) {
  if (estados.length === 0) return null;
  // En el retrato de la mesa se ve cuánto le queda a cada condición.
  return (
    <div className="flex flex-wrap gap-s1">
      {estados.map((e) => (
        <Badge key={e.nombre} tono={e.vencida ? "muted" : e.tono}>
          <span className={e.vencida ? "line-through" : ""}>{e.nombre}</span>
          {e.restante && !e.vencida && (
            <span className="ml-s1 font-data text-muted">· {e.restante}</span>
          )}
        </Badge>
      ))}
    </div>
  );
}

type Base = {
  nombre: string;
  subtitulo?: string;
  pv: number;
  pvMax: number;
  ca?: number;
  estados: Estado[];
  retrato: string;
  haciendo?: string;
};

export function FichaDeElenco({
  p,
  variante,
  turnoActual,
  onAbrir,
  onDano,
  onCondicion,
}: {
  p: Base;
  variante: "yo" | "companero" | "dm-aliado" | "dm-enemigo";
  turnoActual?: boolean;
  onAbrir?: () => void;
  onDano?: () => void;
  onCondicion?: () => void;
}) {
  const esYo = variante === "yo";
  const esEnemigo = variante === "dm-enemigo";
  const conMandos = variante === "dm-aliado" || esEnemigo;

  return (
    <article
      className={`relative rounded-radius-md border bg-surface transition-colors ${
        esYo ? "border-accent/60 p-s3" : "border-muted/20 p-s2"
      } ${turnoActual ? "ring-2 ring-warning" : ""} ${esEnemigo ? "border-danger/40" : ""}`}
    >
      {turnoActual && (
        <span className="absolute -top-s2 left-s3 rounded-radius-sm bg-warning px-s2 py-[1px] font-chrome text-chrome-xs font-semibold text-bg">
          Su turno
        </span>
      )}
      <div className="flex items-start gap-s2">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-radius-sm font-title text-chrome-md text-bg"
          style={{ backgroundColor: p.retrato }}
        >
          {p.nombre[0]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-s1">
            <h4 className={`truncate font-title ${esYo ? "text-chrome-md" : "text-chrome-sm"} text-text`}>
              {p.nombre}
            </h4>
            {esEnemigo && <IconGarra className="size-3.5 shrink-0 text-danger-text" />}
          </div>
          {p.subtitulo && (
            <p className="truncate font-chrome text-chrome-xs text-muted">{p.subtitulo}</p>
          )}
        </div>
        {p.ca != null && (
          <span className="flex items-center gap-s1 font-data text-chrome-xs text-muted">
            <IconEscudo className="size-3.5" />
            {p.ca}
          </span>
        )}
      </div>

      <div className="mt-s2 space-y-s1">
        <BarraVida pv={p.pv} pvMax={p.pvMax} />
        <Estados estados={p.estados} />
      </div>

      {/* Compañero: lo que está haciendo (sacado del hilo), sin botones. */}
      {variante === "companero" && p.haciendo && (
        <p className="mt-s2 flex items-center gap-s1 font-world text-chrome-sm italic text-muted">
          {p.haciendo}
        </p>
      )}

      {/* DM: mandos sobre cada ficha. */}
      {conMandos && (
        <div className="mt-s2 flex items-center gap-s1">
          <button
            onClick={onDano}
            className="inline-flex flex-1 items-center justify-center gap-s1 rounded-radius-sm border border-danger/50 px-s1 py-s1 font-chrome text-chrome-xs text-danger-text hover:bg-danger/15"
          >
            <IconEspada className="size-3.5" /> Daño
          </button>
          <button
            onClick={onCondicion}
            className="inline-flex flex-1 items-center justify-center gap-s1 rounded-radius-sm border border-warning/50 px-s1 py-s1 font-chrome text-chrome-xs text-warning-text hover:bg-warning/15"
          >
            Condición
          </button>
          <button
            onClick={onAbrir}
            aria-label={`Abrir ficha de ${p.nombre}`}
            className="rounded-radius-sm border border-muted/40 p-s1 text-muted hover:text-text"
          >
            <IconOjo className="size-4" />
          </button>
        </div>
      )}

      {/* Compañero: abrir para mirar en detalle (gesto deliberado). */}
      {variante === "companero" && onAbrir && (
        <button
          onClick={onAbrir}
          className="mt-s2 inline-flex items-center gap-s1 font-chrome text-chrome-xs text-accent-text hover:underline"
        >
          <IconOjo className="size-3.5" /> Mirar en detalle
        </button>
      )}
    </article>
  );
}

export { BarraVida };
