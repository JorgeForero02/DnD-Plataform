// Estrato: PERMANENTE — la hotbar no tiene botón de alternar: nunca se quita.
// Cada acción lleva su coste escrito debajo del nombre (BG3), no en un tooltip.
import { IconEspada, IconConjuro, IconPocion, IconRayo } from "../ui/icons";
import type { Accion } from "../datos-de-ejemplo";

const iconoTipo = {
  ataque: IconEspada,
  conjuro: IconConjuro,
  objeto: IconPocion,
  movimiento: IconRayo,
};

function Recurso({ nombre, gastado }: { nombre: string; gastado: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-s1 rounded-radius-sm border px-s2 py-s1 font-chrome text-chrome-xs ${
        gastado
          ? "border-muted/30 text-muted/50 line-through"
          : "border-accent/60 text-accent-text"
      }`}
    >
      <span
        className={`size-2 rounded-full ${gastado ? "bg-muted/40" : "bg-accent"}`}
        aria-hidden="true"
      />
      {nombre}
    </span>
  );
}

export function BarraDeAcciones({
  acciones,
  enCombate,
  recursos,
  onTirar,
}: {
  acciones: Accion[];
  enCombate?: boolean;
  recursos?: { accion: boolean; adicional: boolean; reaccion: boolean };
  onTirar: (a: Accion) => void;
}) {
  return (
    <div className="rounded-radius-md border border-copper/30 bg-surface px-s4 py-s3">
      {enCombate && recursos && (
        <div className="mb-s3 flex items-center gap-s2 border-b border-muted/20 pb-s2">
          <span className="font-chrome text-chrome-xs uppercase tracking-wide text-muted">
            Te queda este turno:
          </span>
          <Recurso nombre="Acción" gastado={recursos.accion} />
          <Recurso nombre="Acción adicional" gastado={recursos.adicional} />
          <Recurso nombre="Reacción" gastado={recursos.reaccion} />
        </div>
      )}
      <div className="scroll-quiet flex items-stretch gap-s2 overflow-x-auto">
        {acciones.map((a) => {
          const Icono = iconoTipo[a.tipo];
          return (
            <button
              key={a.id}
              onClick={() => onTirar(a)}
              title={a.detalle}
              className="group flex w-32 shrink-0 flex-col items-start gap-s1 rounded-radius-sm border border-muted/25 bg-bg px-s2 py-s2 text-left transition-colors hover:border-accent"
            >
              <span className="flex w-full items-center justify-between text-copper-text">
                <Icono className="size-5" />
                {a.usos && (
                  <span className="font-data text-chrome-xs text-muted">{a.usos}</span>
                )}
              </span>
              <span className="font-chrome text-chrome-sm font-medium text-text group-hover:text-accent-text">
                {a.nombre}
              </span>
              {/* El coste, escrito debajo del nombre, en el mismo sitio donde se pulsa. */}
              <span className="font-chrome text-chrome-xs text-muted">{a.coste}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
