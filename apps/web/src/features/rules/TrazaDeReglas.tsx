import { Button, EmptyState } from "../../ui";
import type { Entity } from "../entities/api";
import { leerPaquete, type RuleRow, type RuleTraceRow } from "./api";
import { useTraces } from "./hooks";
import { ResumenDeEfectos } from "./ResumenDeEfectos";
import { describirCondicion, explicacionEstadoTraza, nombreEstadoTraza } from "./vocabulario";

// Tarea 2A.17 — la traza. Qué regla, qué disparador, qué decidió y por qué.
//
// **Ningún estado llega crudo a la pantalla**: `APPLIED`, `PROPOSED`, `REJECTED`, `STOPPED` y
// `CONFLICT` pasan todos por `vocabulario.ts`, y una clave que ese diccionario no conozca se ve
// como «Sin traducir: X» en vez de colarse en inglés.
//
// La paginación usa el `cursor` que devuelve el propio servidor; la pantalla no calcula ninguna
// ventana por su cuenta.

const TONO_POR_ESTADO: Record<string, string> = {
  APPLIED: "border-accent",
  PROPOSED: "border-copper",
  REJECTED: "border-muted",
  STOPPED: "border-muted",
  CONFLICT: "border-danger",
};

function fechaLegible(iso: string): string {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? iso : fecha.toLocaleString("es-ES");
}

export function TrazaDeReglas({
  campaignId,
  entities,
  reglas,
  activo,
}: {
  campaignId: string;
  entities: Entity[];
  reglas: RuleRow[];
  activo: boolean;
}) {
  const traza = useTraces(campaignId, { enabled: activo });

  const nombrePorId = new Map(entities.map((e) => [e.id, e.name]));
  const nombreFicha = (id: string) => nombrePorId.get(id) ?? `entrada ${id.slice(-6)}`;
  const reglaPorId = new Map(reglas.map((r) => [r.id, r]));

  if (traza.isLoading) {
    return <p className="font-chrome text-chrome-sm text-muted">Cargando la traza…</p>;
  }
  if (traza.isError) {
    return (
      <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
        No se pudo cargar la traza. {(traza.error as Error).message}
      </p>
    );
  }

  const filas: RuleTraceRow[] = (traza.data?.pages ?? []).flatMap((pagina) => pagina.traces);
  if (filas.length === 0) {
    return (
      <EmptyState title="Todavía no se ha disparado nada">
        Cada vez que una regla actúe, quedará aquí escrito qué la disparó, qué decidió y por qué.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-s3">
      {filas.map((fila) => {
        const paquete = leerPaquete(fila.effects);
        const regla = reglaPorId.get(fila.ruleId);
        return (
          <article
            key={fila.id}
            data-estado={fila.status}
            className={[
              "rounded-radius-sm border-l-4 border border-muted p-s3",
              TONO_POR_ESTADO[fila.status] ?? "border-muted",
            ].join(" ")}
          >
            <header className="flex flex-wrap items-baseline gap-s2">
              <span className="font-chrome text-chrome-sm font-semibold text-text">
                {nombreEstadoTraza(fila.status)}
              </span>
              <h3 className="font-title text-chrome-md text-text">
                {regla?.name ?? "Regla borrada"}
              </h3>
              <span className="font-data text-chrome-xs text-muted">
                v{fila.ruleVersion} · salto {fila.depth}
              </span>
              <div className="flex-1" />
              <span className="font-data text-chrome-xs text-muted">
                {fechaLegible(fila.createdAt)}
              </span>
            </header>

            <p className="mt-1 font-chrome text-chrome-xs text-muted">
              {explicacionEstadoTraza(fila.status)}
            </p>

            {fila.reason && (
              <p className="mt-1 font-chrome text-chrome-xs text-muted">Motivo: {fila.reason}</p>
            )}

            {paquete.conditions.length > 0 && (
              <ul className="mt-s2 space-y-0.5">
                {paquete.conditions.map((evaluacion, i) => (
                  <li key={i} className="font-chrome text-chrome-xs text-muted">
                    {evaluacion.result ? "Se cumplió" : "No se cumplió"}:{" "}
                    {describirCondicion(evaluacion.condition)}
                  </li>
                ))}
              </ul>
            )}

            <ResumenDeEfectos
              efectos={paquete.effects}
              nombreFicha={nombreFicha}
              vacio="Sin efectos: el motor se detuvo antes de tocar nada."
            />
          </article>
        );
      })}

      {traza.hasNextPage && (
        <Button
          variant="secondary"
          type="button"
          disabled={traza.isFetchingNextPage}
          onClick={() => traza.fetchNextPage()}
        >
          {traza.isFetchingNextPage ? "Cargando…" : "Ver más"}
        </Button>
      )}
    </div>
  );
}
