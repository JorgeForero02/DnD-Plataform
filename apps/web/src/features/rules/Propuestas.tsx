import { Button, EmptyState } from "../../ui";
import type { Entity } from "../entities/api";
import { leerPaquete, type RuleTraceRow, type RuleRow } from "./api";
import { useProposals, useResolveProposal } from "./hooks";
import { IconoPropuesta } from "./iconos";
import { ResumenDeEfectos } from "./ResumenDeEfectos";
import { describirCondicion } from "./vocabulario";

// Tarea 2A.17 — la bandeja de propuestas.
//
// **En modo propuesta no ha cambiado nada todavía**, y el texto lo dice en cada tarjeta, no solo
// en la cabecera: es la diferencia entre leer «esto pasó» y «esto pasaría si dices que sí».
// Aplicar manda `{action:"APPLY"}` y rechazar `{action:"REJECT"}` al mismo endpoint
// (`POST traces/:traceId/resolve`), que es quien de verdad decide.

function fechaLegible(iso: string): string {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? iso : fecha.toLocaleString("es-ES");
}

export function Propuestas({
  campaignId,
  entities,
  reglas,
  activo,
}: {
  campaignId: string;
  entities: Entity[];
  reglas: RuleRow[];
  /** Solo se pide cuando la pestaña está a la vista. */
  activo: boolean;
}) {
  const propuestas = useProposals(campaignId, { enabled: activo });
  const resolver = useResolveProposal(campaignId);

  const nombrePorId = new Map(entities.map((e) => [e.id, e.name]));
  const nombreFicha = (id: string) => nombrePorId.get(id) ?? `entrada ${id.slice(-6)}`;
  const nombreDeRegla = (id: string) => reglas.find((r) => r.id === id)?.name ?? "regla borrada";

  if (propuestas.isLoading) {
    return <p className="font-chrome text-chrome-sm text-muted">Cargando propuestas…</p>;
  }
  if (propuestas.isError) {
    return (
      <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
        No se pudieron cargar las propuestas. {(propuestas.error as Error).message}
      </p>
    );
  }

  const filas = propuestas.data ?? [];
  if (filas.length === 0) {
    return (
      <EmptyState title="Nada esperando tu decisión">
        Cuando una regla en modo propuesta se cumpla, aparecerá aquí sin haber cambiado nada
        todavía.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-s3">
      <p className="flex items-start gap-s2 rounded-radius-sm border border-copper bg-[color:var(--copper-tint)] p-s3 font-chrome text-chrome-sm text-text">
        <IconoPropuesta className="mt-0.5 text-copper-text" />
        <span>
          <strong>Nada de esto ha ocurrido todavía.</strong> El motor calculó qué haría y se detuvo.
          Solo cambia el mundo cuando pulses «Aplicar».
        </span>
      </p>
      {filas.map((propuesta: RuleTraceRow) => {
        const paquete = leerPaquete(propuesta.effects);
        return (
          <article key={propuesta.id} className="rounded-radius-sm border border-muted p-s3">
            <header className="flex flex-wrap items-baseline gap-s2">
              <h3 className="font-title text-chrome-md text-text">
                {nombreDeRegla(propuesta.ruleId)}
              </h3>
              <span className="font-data text-chrome-xs text-muted">
                {fechaLegible(propuesta.createdAt)}
              </span>
            </header>

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
              vacio="La propuesta no trae ningún efecto que aplicar."
            />

            {propuesta.reason && (
              <p className="mt-s2 font-chrome text-chrome-xs text-muted">
                Motivo del motor: {propuesta.reason}
              </p>
            )}

            <div className="mt-s3 flex gap-s2">
              <Button
                type="button"
                disabled={resolver.isPending}
                onClick={() =>
                  resolver.mutate({ traceId: propuesta.id, input: { action: "APPLY" } })
                }
              >
                Aplicar
              </Button>
              <Button
                variant="danger"
                type="button"
                disabled={resolver.isPending}
                onClick={() =>
                  resolver.mutate({ traceId: propuesta.id, input: { action: "REJECT" } })
                }
              >
                Rechazar
              </Button>
            </div>
          </article>
        );
      })}
      {resolver.isError && (
        <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
          {(resolver.error as Error).message}
        </p>
      )}
    </div>
  );
}
